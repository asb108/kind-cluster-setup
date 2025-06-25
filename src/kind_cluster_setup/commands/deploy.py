"""
Command to deploy applications to a Kind cluster.

This module defines the DeployCommand class, which is responsible for
deploying applications to a Kind cluster and storing them in the repository.
"""

import argparse
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from kind_cluster_setup.commands.base import Command
from kind_cluster_setup.config.config_loader import (get_environment_config,
                                                     load_app_config)
from kind_cluster_setup.core.command import SubprocessCommandExecutor
from kind_cluster_setup.deployment.helm import HelmDeploymentStrategy
from kind_cluster_setup.deployment.kubernetes import \
    KubernetesDeploymentStrategy
from kind_cluster_setup.domain.entities import Application, Cluster, Task
from kind_cluster_setup.utils.logging import get_logger

logger = get_logger(__name__)


class DeployCommand(Command):
    """
    Command to deploy applications to a Kind cluster.

    This command deploys applications to a Kind cluster and stores them in the repository.
    It also creates tasks to track the deployment process.
    """

    def execute(self, args: argparse.Namespace) -> None:
        """
        Execute the deploy command using command-line arguments.

        Args:
            args: Command-line arguments
        """
        try:
            logger.info(f"Deploying apps to {args.environment} environment")
            env_config = get_environment_config(args.environment)

            # Create command executor
            executor = SubprocessCommandExecutor()

            # Get the cluster name
            cluster_name = (
                args.cluster_name
                if hasattr(args, "cluster_name")
                else f"kind-{args.environment}"
            )

            # Find the cluster in the repository
            cluster = self._find_cluster(cluster_name)

            # Create a task to track the deployment process
            task = self._create_task(
                args.apps, args.deployments, cluster_name, args.environment
            )

            # Deploy each application
            results = []
            for app, deployment_method in zip(args.apps, args.deployments):
                try:
                    logger.info(f"Deploying {app} using {deployment_method}")
                    app_config = load_app_config(app, args.environment)

                    # Create the deployment strategy
                    if deployment_method == "helm":
                        strategy = HelmDeploymentStrategy()
                    elif deployment_method == "kubernetes":
                        strategy = KubernetesDeploymentStrategy()
                    else:
                        raise ValueError(
                            f"Unsupported deployment method: {deployment_method}"
                        )

                    # Deploy the application
                    # Get the cluster name from the cluster entity or use the default
                    actual_cluster_name = cluster.name if cluster else cluster_name

                    # Prepare values for deployment
                    values = {}

                    # Add expose parameters if requested
                    if hasattr(args, "expose") and args.expose:
                        values["expose_service"] = True
                        values["service_type"] = args.service_type
                        values["service_port"] = args.port
                        values["target_port"] = args.target_port

                    # Deploy the application with the correct parameters
                    result = strategy.deploy(
                        app=app,
                        app_config=app_config,
                        env_config=env_config,
                        cluster_name=actual_cluster_name,
                        values=values,
                    )

                    # Create or update the application entity
                    application = self._create_or_update_application(
                        app, deployment_method, app_config, cluster
                    )

                    results.append(
                        {
                            "app": app,
                            "deployment_method": deployment_method,
                            "status": "deployed",
                            "application_id": application.id if application else None,
                        }
                    )
                except Exception as e:
                    logger.error(f"Failed to deploy {app}: {e}")
                    results.append(
                        {
                            "app": app,
                            "deployment_method": deployment_method,
                            "status": "failed",
                            "error": str(e),
                        }
                    )

            # Update the task status
            self._update_task_status(
                task,
                "completed",
                {
                    "results": results,
                    "cluster_name": cluster_name,
                    "environment": args.environment,
                },
            )

            logger.info(f"Deployment completed with results: {results}")
        except Exception as e:
            logger.error(f"Failed to deploy applications: {e}")

            # Update the task status if it exists
            if "task" in locals():
                self._update_task_status(task, "failed", {"error": str(e)})

            raise

    def _create_task(
        self,
        apps: List[str],
        deployment_methods: List[str],
        cluster_name: str,
        environment: str,
    ) -> Optional[Task]:
        """
        Create a task to track the deployment process.

        Args:
            apps: List of applications to deploy.
            deployment_methods: List of deployment methods.
            cluster_name: Name of the cluster.
            environment: Environment name.

        Returns:
            The created task, or None if the task repository is not available.
        """
        if self.task_repository is None:
            logger.warning("Task repository not available, skipping task creation")
            return None

        task = Task(
            name=f"Deploy {', '.join(apps)} to {cluster_name}",
            description=f"Deploy applications to Kind cluster {cluster_name} in {environment} environment",
            status="running",
            command="deploy",
            args={
                "apps": apps,
                "deployment_methods": deployment_methods,
                "cluster_name": cluster_name,
                "environment": environment,
            },
        )

        return self.task_repository.save(task)

    def _find_cluster(self, cluster_name: str) -> Optional[Cluster]:
        """
        Find a cluster in the repository by its name.

        Args:
            cluster_name: The name of the cluster to find.

        Returns:
            The found cluster, or None if the cluster repository is not available
            or the cluster is not found.
        """
        if self.cluster_repository is None:
            logger.warning("Cluster repository not available, skipping cluster lookup")
            return None

        return self.cluster_repository.find_by_name(cluster_name)

    def _create_or_update_application(
        self,
        app_name: str,
        deployment_method: str,
        app_config: Dict[str, Any],
        cluster: Optional[Cluster],
    ) -> Optional[Application]:
        """
        Create or update an application entity in the repository.

        Args:
            app_name: Name of the application.
            deployment_method: Deployment method used.
            app_config: Application configuration.
            cluster: The cluster the application is deployed to.

        Returns:
            The created or updated application, or None if the application repository is not available
            or the cluster is None.
        """
        if self.application_repository is None or cluster is None:
            logger.warning(
                "Application repository not available or cluster is None, skipping application creation"
            )
            return None

        # Check if the application already exists
        existing_app = self.application_repository.find_by_name(app_name)

        if existing_app:
            logger.info(f"Application {app_name} already exists, updating it")
            existing_app.config = app_config
            existing_app.deployment_method = deployment_method
            existing_app.status = "deployed"
            existing_app.updated_at = datetime.now()
            return self.application_repository.save(existing_app)

        # Create a new application entity
        application = Application(
            name=app_name,
            description=f"Application {app_name} deployed using {deployment_method}",
            cluster_id=cluster.id,
            config=app_config,
            status="deployed",
            deployment_method=deployment_method,
        )

        return self.application_repository.save(application)

    def _update_task_status(
        self, task: Optional[Task], status: str, result: Dict[str, Any]
    ) -> Optional[Task]:
        """
        Update the status of a task.

        Args:
            task: The task to update.
            status: The new status.
            result: The result of the task.

        Returns:
            The updated task, or None if the task is None or the task repository is not available.
        """
        if task is None or self.task_repository is None:
            return None

        task.status = status
        task.result = result
        task.updated_at = datetime.now()

        return self.task_repository.save(task)
