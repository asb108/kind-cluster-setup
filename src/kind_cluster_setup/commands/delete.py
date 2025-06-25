"""
Command to delete a Kind cluster.

This module defines the DeleteCommand class, which is responsible for
deleting a Kind cluster and updating the repository.
"""

import argparse
from datetime import datetime
from typing import Dict, Any, Optional, List

from kind_cluster_setup.commands.base import Command
from kind_cluster_setup.cluster.kind_cluster import KindCluster
from kind_cluster_setup.config.config_loader import load_cluster_config, get_environment_config
from kind_cluster_setup.utils.logging import get_logger
from kind_cluster_setup.core.command import SubprocessCommandExecutor
from kind_cluster_setup.domain.entities import Cluster, Task, Application

logger = get_logger(__name__)


class DeleteCommand(Command):
    """
    Command to delete a Kind cluster.

    This command deletes a Kind cluster and updates the repository.
    It also creates a task to track the deletion process.
    """

    def execute(self, args: argparse.Namespace) -> None:
        """
        Execute the delete command using command-line arguments.

        Args:
            args: Command-line arguments
        """
        try:
            logger.info(f"Deleting Kind cluster for environment: {args.environment}")
            env_config = get_environment_config(args.environment)
            cluster_config = load_cluster_config(args.environment)

            # Get the cluster name
            cluster_name = cluster_config.get('name', 'kind-cluster')

            # Create a task to track the deletion process
            task = self._create_task(cluster_name)

            # Find the cluster in the repository
            cluster = self._find_cluster(cluster_name)

            # Create command executor
            executor = SubprocessCommandExecutor()

            # Create and delete the cluster
            kind_cluster = KindCluster(cluster_config, env_config, executor)
            kind_cluster.delete()

            # Update the cluster status in the repository
            if cluster:
                self._update_cluster_status(cluster, "deleted")

            # Delete associated applications
            self._delete_associated_applications(cluster_name)

            # Update the task status
            self._update_task_status(task, "completed", {
                "cluster_name": cluster_name,
                "environment": env_config.get('environment')
            })

            logger.info(f"Successfully deleted cluster: {cluster_name}")
        except Exception as e:
            logger.error(f"Failed to delete cluster: {e}")

            # Update the task status if it exists
            if 'task' in locals():
                self._update_task_status(task, "failed", {"error": str(e)})

            raise

    def execute_with_name(self, name: str) -> None:
        """
        Delete a cluster by its name.

        Args:
            name: Name of the cluster to delete
        """
        logger.info(f"Deleting Kind cluster with name: {name}")
        try:
            # Create a task to track the deletion process
            task = self._create_task(name)

            # Find the cluster in the repository
            cluster = self._find_cluster(name)

            # Create command executor
            executor = SubprocessCommandExecutor()

            # Create and delete the cluster
            kind_cluster = KindCluster({'name': name}, {}, executor)
            kind_cluster.delete()

            # Update the cluster status in the repository
            if cluster:
                self._update_cluster_status(cluster, "deleted")

            # Delete associated applications
            self._delete_associated_applications(name)

            # Update the task status
            self._update_task_status(task, "completed", {
                "cluster_name": name
            })

            logger.info(f"Successfully deleted cluster: {name}")
        except Exception as e:
            logger.error(f"Failed to delete cluster {name}: {e}")

            # Update the task status if it exists
            if 'task' in locals():
                self._update_task_status(task, "failed", {"error": str(e)})

            raise

    def _create_task(self, cluster_name: str) -> Optional[Task]:
        """
        Create a task to track the cluster deletion process.

        Args:
            cluster_name: The name of the cluster to delete.

        Returns:
            The created task, or None if the task repository is not available.
        """
        if self.task_repository is None:
            logger.warning("Task repository not available, skipping task creation")
            return None

        task = Task(
            name=f"Delete cluster {cluster_name}",
            description=f"Delete Kind cluster {cluster_name}",
            status="running",
            command="delete",
            args={
                "cluster_name": cluster_name
            }
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

    def _update_cluster_status(self, cluster: Cluster, status: str) -> Optional[Cluster]:
        """
        Update the status of a cluster in the repository.

        Args:
            cluster: The cluster to update.
            status: The new status.

        Returns:
            The updated cluster, or None if the cluster repository is not available.
        """
        if self.cluster_repository is None:
            logger.warning("Cluster repository not available, skipping cluster status update")
            return None

        cluster.status = status
        cluster.updated_at = datetime.now()

        return self.cluster_repository.save(cluster)

    def _delete_associated_applications(self, cluster_name: str) -> None:
        """
        Delete applications associated with a cluster.

        Args:
            cluster_name: The name of the cluster.
        """
        if self.application_repository is None or self.cluster_repository is None:
            logger.warning("Application or cluster repository not available, skipping application deletion")
            return

        # Find the cluster
        cluster = self.cluster_repository.find_by_name(cluster_name)
        if not cluster:
            logger.warning(f"Cluster {cluster_name} not found, skipping application deletion")
            return

        # Find applications associated with the cluster
        applications = self.application_repository.find_by_cluster_id(cluster.id)

        # Update the status of each application
        for app in applications:
            app.status = "deleted"
            app.updated_at = datetime.now()
            self.application_repository.save(app)

        logger.info(f"Updated status of {len(applications)} applications to 'deleted'")

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
