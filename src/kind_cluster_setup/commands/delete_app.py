"""
Command for deleting an application from a cluster.

This module provides the DeleteAppCommand class, which is responsible for
deleting an application from a Kind cluster without deleting the cluster itself.
"""

import os
from typing import Dict, Any, Optional, List
from datetime import datetime

from kind_cluster_setup.commands.base import Command
from kind_cluster_setup.utils.logging import get_logger
from kind_cluster_setup.domain.entities import Application, Task

logger = get_logger(__name__)


class DeleteAppCommand(Command):
    """Command for deleting an application from a cluster."""

    def execute(self, args) -> None:
        """
        Execute the delete-app command.

        Args:
            args: Command-line arguments
        """
        logger.info(f"Deleting application {args.app} from {args.environment} environment")

        # Create a task to track the deletion
        # Convert args to a serializable dict
        args_dict = {}
        for key, value in vars(args).items():
            if not key.startswith('_') and not callable(value):
                args_dict[key] = value

        task = Task(
            name=f"delete-app-{args.app}",
            description=f"Delete application {args.app} from {args.environment} environment",
            command="delete-app",
            args=args_dict
        )
        self._task_repo.save(task)

        try:
            # Find the application
            application = self._app_repo.find_by_name(args.app)
            if not application:
                error_msg = f"Application {args.app} not found"
                logger.error(error_msg)
                self._update_task_status(task, "failed", {"error": error_msg})
                return

            # Find the cluster
            cluster = self._cluster_repo.find_by_id(application.cluster_id)
            if not cluster:
                error_msg = f"Cluster with ID {application.cluster_id} not found"
                logger.error(error_msg)
                self._update_task_status(task, "failed", {"error": error_msg})
                return

            # Check if the cluster is running
            if cluster.status != "running" and not args.force:
                error_msg = f"Cluster {cluster.name} is not running (status: {cluster.status}). Use --force to delete anyway."
                logger.error(error_msg)
                self._update_task_status(task, "failed", {"error": error_msg})
                return

            # Delete the application from the cluster
            if cluster.status == "running":
                try:
                    self._delete_from_cluster(application, cluster.name, args.environment)
                except Exception as e:
                    if not args.force:
                        error_msg = f"Failed to delete application {args.app} from cluster: {str(e)}. Use --force to delete anyway."
                        logger.error(error_msg)
                        self._update_task_status(task, "failed", {"error": error_msg})
                        return
                    else:
                        logger.warning(f"Failed to delete application {args.app} from cluster: {str(e)}. Continuing with force delete.")

            # Update the application status
            application.status = "deleted"
            application.updated_at = datetime.now()
            self._app_repo.save(application)

            # Delete the application configuration file if requested
            if args.delete_config:
                try:
                    self._delete_config_files(args.app, args.environment)
                except Exception as e:
                    logger.warning(f"Failed to delete configuration files for {args.app}: {str(e)}")

            logger.info(f"Successfully deleted application {args.app}")
            self._update_task_status(task, "completed", {"result": "success"})

        except Exception as e:
            error_msg = f"Failed to delete application {args.app}: {str(e)}"
            logger.error(error_msg)
            self._update_task_status(task, "failed", {"error": error_msg})

    def _delete_from_cluster(self, application: Application, cluster_name: str, environment: str) -> None:
        """
        Delete the application from the Kubernetes cluster.

        Args:
            application: Application entity
            cluster_name: Name of the cluster
            environment: Environment name
        """
        from kind_cluster_setup.core.command import SubprocessCommandExecutor
        from kind_cluster_setup.core.kubernetes import KubectlClient

        # Get namespace from application config or use default format
        namespace = application.config.get('namespace', f"{application.name}-{environment}")
        if isinstance(application.config, dict) and 'metadata' in application.config:
            namespace = application.config.get('metadata', {}).get('namespace', namespace)

        # Set up kubectl client
        executor = SubprocessCommandExecutor()
        kubectl_client = KubectlClient(executor)

        # Set kubectl context
        context = f"kind-{cluster_name}"
        if cluster_name.startswith("kind-"):
            context = cluster_name

        # Delete resources based on deployment method
        if application.deployment_method == "kubernetes":
            # Delete all resources with the app label
            logger.info(f"Deleting Kubernetes resources for {application.name} in namespace {namespace}")

            # Try to delete deployment
            try:
                result = kubectl_client.execute(
                    ["delete", "deployment", application.name],
                    context=context,
                    namespace=namespace,
                    check=False
                )
                if result.success:
                    logger.info(f"Deleted deployment {application.name}")
                else:
                    logger.warning(f"Failed to delete deployment {application.name}: {result.stderr}")
            except Exception as e:
                logger.warning(f"Error deleting deployment {application.name}: {str(e)}")

            # Try to delete service
            try:
                result = kubectl_client.execute(
                    ["delete", "service", application.name],
                    context=context,
                    namespace=namespace,
                    check=False
                )
                if result.success:
                    logger.info(f"Deleted service {application.name}")
                else:
                    logger.warning(f"Failed to delete service {application.name}: {result.stderr}")
            except Exception as e:
                logger.warning(f"Error deleting service {application.name}: {str(e)}")

            # Try to delete ingress
            try:
                result = kubectl_client.execute(
                    ["delete", "ingress", application.name],
                    context=context,
                    namespace=namespace,
                    check=False
                )
                if result.success:
                    logger.info(f"Deleted ingress {application.name}")
            except Exception:
                # Ingress might not exist, so we can ignore this error
                pass

            # Delete all resources with the app label as a fallback
            try:
                result = kubectl_client.execute(
                    ["delete", "all", "-l", f"app={application.name}"],
                    context=context,
                    namespace=namespace,
                    check=False
                )
                if result.success:
                    logger.info(f"Deleted all resources with label app={application.name}")
            except Exception as e:
                logger.warning(f"Error deleting resources with label app={application.name}: {str(e)}")

        elif application.deployment_method == "helm":
            # Delete Helm release
            from kind_cluster_setup.core.helm import HelmClient

            helm_client = HelmClient(executor)
            release_name = application.config.get('release_name', f"{application.name}-release")

            logger.info(f"Deleting Helm release {release_name} in namespace {namespace}")
            try:
                result = helm_client.uninstall(
                    release_name=release_name,
                    namespace=namespace,
                    context=context
                )
                logger.info(f"Deleted Helm release {release_name}")
            except Exception as e:
                logger.warning(f"Error deleting Helm release {release_name}: {str(e)}")
                raise

    def _delete_config_files(self, app: str, environment: str) -> None:
        """
        Delete the application configuration files.

        Args:
            app: Application name
            environment: Environment name
        """
        # Check standard paths
        paths = [
            f"applications/{app}/config/{environment}.yaml",
            f"config/apps/{environment}/{app}.yaml",
            f"applications/{app}/kubernetes/{environment}.yaml"
        ]

        deleted = False
        for path in paths:
            if os.path.exists(path):
                try:
                    os.remove(path)
                    logger.info(f"Deleted configuration file: {path}")
                    deleted = True
                except Exception as e:
                    logger.warning(f"Failed to delete configuration file {path}: {str(e)}")

        if not deleted:
            logger.warning(f"No configuration files found for {app} in {environment} environment")

    def _update_task_status(self, task: Task, status: str, result: Dict[str, Any] = None) -> None:
        """
        Update the status and result of a task.

        Args:
            task: Task to update
            status: New status
            result: Task result
        """
        task.status = status
        if result:
            task.result = result
        self._task_repo.save(task)
