"""
Command to check the status of clusters and applications.

This module defines the StatusCommand class, which is responsible for
checking the status of Kind clusters and deployed applications.
"""

import argparse
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple

from kind_cluster_setup.commands.base import Command
from kind_cluster_setup.cluster.kind_cluster import KindCluster
from kind_cluster_setup.deployment.helm import HelmDeploymentStrategy
from kind_cluster_setup.deployment.kubernetes import KubernetesDeploymentStrategy
from kind_cluster_setup.config.config_loader import load_cluster_config, get_environment_config
from kind_cluster_setup.utils.logging import get_logger
from kind_cluster_setup.core.command import SubprocessCommandExecutor
from kind_cluster_setup.core.kind import KindClient
from kind_cluster_setup.domain.entities import Cluster, Task, Application

logger = get_logger(__name__)


class StatusCommand(Command):
    """
    Command to check the status of clusters and applications.

    This command checks the status of Kind clusters and deployed applications,
    and creates a task to track the status check process.
    """

    def execute(self, args: argparse.Namespace) -> Dict[str, Any]:
        """
        Execute the status command using command-line arguments.

        Args:
            args: Command-line arguments

        Returns:
            Dict containing cluster and application status information
        """
        try:
            logger.info(f"Checking status for environment: {args.environment}")
            env_config = get_environment_config(args.environment)
            cluster_config = load_cluster_config(args.environment)

            # Create a task to track the status check process
            task = self._create_task(args.environment, args.apps if hasattr(args, 'apps') else [])

            # Create command executor and clients
            executor = SubprocessCommandExecutor()
            kind_client = KindClient(executor)

            # First try to get info for the configured cluster
            cluster = KindCluster(cluster_config, env_config, executor)
            cluster_info = cluster.get_info()
            logger.info(f"Cluster info from config:\n{cluster_info}")

            # Update the cluster entity in the repository
            self._update_cluster_entities(cluster_info)

            # Now check for all existing clusters using kind client
            try:
                # Get all running kind clusters
                clusters = kind_client.get_clusters()
                logger.info(f"Found {len(clusters)} Kind clusters: {clusters}")

                # Get info for each cluster that wasn't already processed
                all_nodes = cluster_info.get('nodes', [])
                existing_cluster_names = [node['name'].split('-control-plane')[0] for node in all_nodes
                                         if 'control-plane' in node['name']]

                for cluster_name in clusters:
                    # Skip if we already have info for this cluster
                    if cluster_name in existing_cluster_names:
                        logger.info(f"Cluster {cluster_name} already processed, skipping")
                        continue

                    # Create a temporary config for this cluster
                    temp_config = {'name': cluster_name}
                    temp_cluster = KindCluster(temp_config, env_config, executor)

                    try:
                        temp_info = temp_cluster.get_info()
                        if 'nodes' in temp_info:
                            all_nodes.extend(temp_info['nodes'])
                            logger.info(f"Added info for cluster {cluster_name}")

                            # Update the cluster entity in the repository
                            self._update_cluster_entities(temp_info)
                    except Exception as e:
                        logger.warning(f"Failed to get info for cluster {cluster_name}: {e}")

                # Update the cluster_info with all nodes
                cluster_info['nodes'] = all_nodes
            except Exception as e:
                logger.warning(f"Failed to get list of Kind clusters: {e}")

            # Check application status if apps are specified
            app_statuses = []
            if hasattr(args, 'apps') and args.apps:
                for app, deployment_method in zip(args.apps, args.deployments):
                    try:
                        if deployment_method == "helm":
                            strategy = HelmDeploymentStrategy()
                        elif deployment_method == "kubernetes":
                            strategy = KubernetesDeploymentStrategy()
                        else:
                            raise ValueError(f"Unsupported deployment method: {deployment_method}")

                        if deployment_method == "helm":
                            # For Helm strategy, use the new interface
                            namespace = f"{app}-{env_config.get('environment', 'dev')}"
                            app_status = strategy.check_status(app, namespace)
                        else:
                            # For Kubernetes strategy, use the original parameter order
                            app_status = strategy.check_status(app, env_config)

                        logger.info(f"Status for {app} ({deployment_method}):\n{app_status}")

                        # Update the application entity in the repository
                        self._update_application_status(app, app_status)

                        app_statuses.append({
                            "app": app,
                            "deployment_method": deployment_method,
                            "status": app_status
                        })
                    except Exception as e:
                        logger.error(f"Failed to check status for {app}: {e}")
                        app_statuses.append({
                            "app": app,
                            "deployment_method": deployment_method,
                            "status": "error",
                            "error": str(e)
                        })

            # Combine cluster and application status
            status_info = {
                "clusters": cluster_info,
                "applications": app_statuses
            }

            # Update the task status
            self._update_task_status(task, "completed", status_info)

            return status_info
        except Exception as e:
            logger.error(f"Failed to check status: {e}")

            # Update the task status if it exists
            if 'task' in locals():
                self._update_task_status(task, "failed", {"error": str(e)})

            raise

    def _create_task(self, environment: str, apps: List[str]) -> Optional[Task]:
        """
        Create a task to track the status check process.

        Args:
            environment: Environment name.
            apps: List of applications to check.

        Returns:
            The created task, or None if the task repository is not available.
        """
        if self.task_repository is None:
            logger.warning("Task repository not available, skipping task creation")
            return None

        task = Task(
            name=f"Check status for {environment}",
            description=f"Check status of clusters and applications in {environment} environment",
            status="running",
            command="status",
            args={
                "environment": environment,
                "apps": apps
            }
        )

        return self.task_repository.save(task)

    def _update_cluster_entities(self, cluster_info: Dict[str, Any]) -> None:
        """
        Update cluster entities in the repository based on cluster info.

        Args:
            cluster_info: Cluster information from KindCluster.get_info().
        """
        if self.cluster_repository is None:
            logger.warning("Cluster repository not available, skipping cluster entity update")
            return

        # Extract cluster names from nodes
        cluster_names = set()
        for node in cluster_info.get('nodes', []):
            if 'name' in node and '-control-plane' in node['name']:
                cluster_name = node['name'].split('-control-plane')[0]
                cluster_names.add(cluster_name)

        # Update each cluster entity
        for cluster_name in cluster_names:
            # Find the cluster in the repository
            cluster = self.cluster_repository.find_by_name(cluster_name)

            if cluster:
                logger.info(f"Updating status for cluster {cluster_name}")
                cluster.status = "running"
                cluster.updated_at = datetime.now()

                # Extract nodes for this cluster
                cluster_nodes = [
                    node for node in cluster_info.get('nodes', [])
                    if 'name' in node and node['name'].startswith(cluster_name)
                ]

                # Update nodes in the cluster entity
                if cluster_nodes:
                    cluster.nodes = cluster_nodes

                self.cluster_repository.save(cluster)
            else:
                logger.info(f"Cluster {cluster_name} not found in repository, creating it")

                # Create a new cluster entity
                new_cluster = Cluster(
                    name=cluster_name,
                    config={},
                    environment="unknown",
                    status="running",
                    nodes=[
                        node for node in cluster_info.get('nodes', [])
                        if 'name' in node and node['name'].startswith(cluster_name)
                    ]
                )

                self.cluster_repository.save(new_cluster)

    def _update_application_status(self, app_name: str, app_status: Dict[str, Any]) -> None:
        """
        Update application status in the repository.

        Args:
            app_name: Name of the application.
            app_status: Status information for the application.
        """
        if self.application_repository is None:
            logger.warning("Application repository not available, skipping application status update")
            return

        # Find the application in the repository
        application = self.application_repository.find_by_name(app_name)

        if application:
            logger.info(f"Updating status for application {app_name}")

            # Update the application status
            application.status = app_status.get('status', 'unknown')
            application.updated_at = datetime.now()

            self.application_repository.save(application)

    def _update_task_status(self, task: Optional[Task], status: str, result: Dict[str, Any]) -> Optional[Task]:
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
