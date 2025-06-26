"""
Command to create a Kind cluster.

This module defines the CreateCommand class, which is responsible for
creating a Kind cluster and storing it in the repository.
"""

import argparse
import traceback
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Union

from kind_cluster_setup.cluster.kind_cluster import (
    KindCluster,
    DockerNotRunningError,
    KindNotInstalledError,
    ClusterOperationError,
)
from kind_cluster_setup.commands.base import Command
from kind_cluster_setup.config.config_loader import (
    get_environment_config,
    load_cluster_config,
)
from kind_cluster_setup.core.command import SubprocessCommandExecutor
from kind_cluster_setup.domain.entities import Cluster, Task
from kind_cluster_setup.utils.constants import (
    DEFAULT_CLUSTER_CONFIG,
    DEFAULT_ENV_CONFIG,
)
from kind_cluster_setup.utils.logging import get_logger

logger = get_logger(__name__)


class CreateCommand(Command):
    """
    Command to create a Kind cluster.

    This command creates a Kind cluster and stores it in the repository.
    It also creates a task to track the creation process.
    """

    def execute(self, args: argparse.Namespace) -> dict:
        """
        Execute the create command using command-line arguments.

        Args:
            args: The command-line arguments.

        Returns:
            dict: The result of the cluster creation.
        """
        try:
            logger.debug(f"Arguments received in CreateCommand: {vars(args)}")

            # Extract parameters from args
            cluster_name = getattr(args, "name", "kind-cluster")
            environment = getattr(args, "environment", "dev")
            worker_nodes = getattr(args, "worker_nodes", 1)
            apply_resource_limits = getattr(args, "apply_resource_limits", False)
            worker_config = getattr(args, "worker_config", {})
            control_plane_config = getattr(args, "control_plane_config", {})
            custom_ports = getattr(args, "custom_ports", {})

            # Get configurations
            env_config = get_environment_config(environment)
            cluster_config = load_cluster_config(environment)

            # Override with command line args if provided
            if hasattr(args, "name") and args.name:
                cluster_config["name"] = args.name
            if hasattr(args, "worker_nodes") and args.worker_nodes:
                cluster_config["worker_nodes"] = args.worker_nodes
            if hasattr(args, "apply_resource_limits") and args.apply_resource_limits:
                cluster_config["apply_resource_limits"] = args.apply_resource_limits
            if worker_config:
                cluster_config["worker_config"] = worker_config
            if control_plane_config:
                cluster_config["control_plane_config"] = control_plane_config
            if custom_ports:
                cluster_config["custom_ports"] = custom_ports

            logger.info(
                f"Creating Kind cluster with config: {cluster_config} and env: {env_config}"
            )

            # Create a task to track the creation process
            task = self._create_task(cluster_config, env_config)

            # Create command executor
            executor = SubprocessCommandExecutor()

            # Create the cluster
            kind_cluster = KindCluster(cluster_config, env_config, executor)
            try:
                if not kind_cluster.create():
                    raise Exception("Failed to create cluster")
            except (
                DockerNotRunningError,
                KindNotInstalledError,
                ClusterOperationError,
            ):
                # Re-raise specific exceptions without wrapping
                raise

            # Apply resource limits if needed
            if apply_resource_limits and (worker_config or control_plane_config):
                logger.info("Applying resource limits to cluster nodes...")
                resource_result = self.apply_resource_limits(args)
                if resource_result.get("status") != "success":
                    logger.warning(
                        f"Failed to apply resource limits: {resource_result.get('error')}"
                    )

            # Create a cluster entity and save it to the repository
            cluster = self._create_cluster_entity(
                cluster_name, cluster_config, env_config
            )

            # Update the task status
            self._update_task_status(
                task,
                "completed",
                {
                    "cluster_id": cluster.id if cluster else None,
                    "cluster_name": cluster_name,
                    "environment": env_config.get("environment"),
                    "worker_nodes": worker_nodes,
                    "status": "success",
                },
            )

            return {
                "cluster_id": cluster.id if cluster else None,
                "cluster_name": cluster_name,
                "environment": env_config.get("environment"),
                "worker_nodes": worker_nodes,
                "status": "success",
            }

        except (
            DockerNotRunningError,
            KindNotInstalledError,
            ClusterOperationError,
        ) as e:
            # Update task status for specific exceptions before re-raising
            if "task" in locals():
                self._update_task_status(task, "failed", {"error": str(e)})
            # Re-raise specific exceptions without wrapping for tests
            raise
        except Exception as e:
            error_message = str(e)

            # Check for specific error types and provide user-friendly messages
            if (
                "docker has run out of disk space" in error_message.lower()
                or "no space left on device" in error_message.lower()
            ):
                user_friendly_error = (
                    "Docker has run out of disk space. Please free up space by running 'docker system prune -a -f --volumes' "
                    "or increase Docker's disk space allocation in Docker Desktop settings."
                )
            elif (
                "docker storage is full" in error_message.lower()
                or "failed to copy files" in error_message.lower()
            ):
                user_friendly_error = (
                    "Docker storage is full. Please clean up Docker resources by running 'docker system prune -a -f --volumes' "
                    "or increase Docker's storage limit in Docker Desktop."
                )
            elif (
                "port" in error_message.lower()
                and "already in use" in error_message.lower()
            ):
                user_friendly_error = "Required ports are already in use. Please stop other services using ports 80, 443, or 30080."
            else:
                user_friendly_error = f"Failed to create Kind cluster: {error_message}"

            logger.error(user_friendly_error)
            logger.error(traceback.format_exc())

            # Update the task status if it exists
            if "task" in locals():
                self._update_task_status(task, "failed", {"error": user_friendly_error})

            raise Exception(user_friendly_error) from e

    def _create_task(self, cluster_config: dict, env_config: dict) -> Optional[Task]:
        """
        Create a task to track the cluster creation process.

        Args:
            cluster_config: The cluster configuration.
            env_config: The environment configuration.

        Returns:
            The created task, or None if the task repository is not available.
        """
        if not hasattr(self, "task_repository") or not self.task_repository:
            return None

        task = Task(
            id=str(uuid.uuid4()),
            name=f"create-cluster-{cluster_config.get('name', 'unknown')}",
            status="pending",
            created_at=datetime.now(),
            updated_at=datetime.now(),
            metadata={
                "cluster_name": cluster_config.get("name"),
                "environment": env_config.get("environment"),
                "worker_nodes": cluster_config.get("worker_nodes", 1),
            },
        )
        return self.task_repository.save(task)

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
        if not task or not hasattr(self, "task_repository") or not self.task_repository:
            return None

        task.status = status
        task.result = result
        task.updated_at = datetime.now()
        return self.task_repository.save(task)

    def _apply_resource_limits(self, args: argparse.Namespace) -> Dict[str, Any]:
        """
        Apply resource limits to the cluster nodes.

        Args:
            args: The command-line arguments containing:
                - name: Name of the cluster
                - worker_nodes: Number of worker nodes
                - worker_config: Configuration for worker nodes (optional)
                - control_plane_config: Configuration for control plane (optional)
                - apply_resource_limits: Boolean to enable/disable resource limits

        Returns:
            Dict with the result of the operation
        """
        try:
            logger.info(
                f"Applying resource limits to cluster {getattr(args, 'name', 'unknown')}"
            )

            # Get the Docker client
            import docker

            client = docker.from_env()

            def parse_memory(mem_str):
                """Convert memory string (e.g., '2g') to bytes."""
                if not mem_str:
                    return None
                if isinstance(mem_str, (int, float)):
                    return int(mem_str)
                if mem_str.endswith("g") or mem_str.endswith("G"):
                    return int(float(mem_str[:-1]) * 1024 * 1024 * 1024)
                elif mem_str.endswith("m") or mem_str.endswith("M"):
                    return int(float(mem_str[:-1]) * 1024 * 1024)
                elif mem_str.endswith("k") or mem_str.endswith("K"):
                    return int(float(mem_str[:-1]) * 1024)
                return int(mem_str)

            # Apply resource limits to control plane if configured
            if hasattr(args, "control_plane_config") and getattr(
                args, "control_plane_config"
            ):
                control_plane_name = f"{getattr(args, 'name')}-control-plane"
                try:
                    container = client.containers.get(control_plane_name)
                    update_params = {}

                    # Handle CPU quota (in microseconds)
                    if hasattr(args.control_plane_config, "cpu"):
                        update_params["cpu_quota"] = int(
                            float(getattr(args.control_plane_config, "cpu")) * 100000
                        )

                    # Handle memory limits
                    if hasattr(args.control_plane_config, "memory"):
                        update_params["mem_limit"] = (
                            str(
                                parse_memory(
                                    getattr(args.control_plane_config, "memory")
                                )
                            )
                            + "b"
                        )

                    # Handle memory swap (must be set with memory)
                    if hasattr(args.control_plane_config, "memory_swap"):
                        update_params["memswap_limit"] = (
                            str(
                                parse_memory(
                                    getattr(args.control_plane_config, "memory_swap")
                                )
                            )
                            + "b"
                        )

                    if update_params:
                        container.update(**update_params)
                        logger.info(
                            f"Applied resource limits to control plane node {control_plane_name}: {update_params}"
                        )
                    else:
                        logger.warning(
                            "No valid resource limits provided for control plane"
                        )

                except Exception as e:
                    error_msg = (
                        f"Failed to apply resource limits to control plane: {str(e)}"
                    )
                    logger.error(error_msg)
                    logger.error(traceback.format_exc())
                    return {"status": "error", "error": error_msg}

            # Apply resource limits to worker nodes if configured
            if hasattr(args, "worker_config") and getattr(args, "worker_config"):
                worker_nodes = getattr(args, "worker_nodes", 1)
                for i in range(1, worker_nodes + 1):
                    worker_name = (
                        f"{getattr(args, 'name')}-worker"
                        if i == 1
                        else f"{getattr(args, 'name')}-worker{i}"
                    )
                    try:
                        container = client.containers.get(worker_name)
                        update_params = {}

                        # Handle CPU quota (in microseconds)
                        if hasattr(args.worker_config, "cpu"):
                            update_params["cpu_quota"] = int(
                                float(getattr(args.worker_config, "cpu")) * 100000
                            )

                        # Handle memory limits
                        if hasattr(args.worker_config, "memory"):
                            update_params["mem_limit"] = (
                                str(parse_memory(getattr(args.worker_config, "memory")))
                                + "b"
                            )

                        # Handle memory swap (must be set with memory)
                        if hasattr(args.worker_config, "memory_swap"):
                            update_params["memswap_limit"] = (
                                str(
                                    parse_memory(
                                        getattr(args.worker_config, "memory_swap")
                                    )
                                )
                                + "b"
                            )

                        if update_params:
                            container.update(**update_params)
                            logger.info(
                                f"Applied resource limits to worker node {worker_name}: {update_params}"
                            )
                        else:
                            logger.warning(
                                f"No valid resource limits provided for worker node {worker_name}"
                            )

                    except Exception as e:
                        error_msg = f"Failed to apply resource limits to worker node {worker_name}: {str(e)}"
                        logger.error(error_msg)
                        return {"status": "error", "error": error_msg}

            return {
                "status": "success",
                "message": "Resource limits applied successfully",
            }

        except Exception as e:
            error_msg = f"Failed to apply resource limits: {str(e)}"
            logger.error(error_msg)
            logger.error(traceback.format_exc())
            return {"status": "error", "error": error_msg}

    def _create_cluster(
        self,
        cluster_config: Dict[str, Any],
        env_config: Dict[str, Any],
        worker_config: Dict[str, Any],
        control_plane_config: Dict[str, Any],
        cluster_name: str,
        worker_nodes: int,
    ) -> Dict[str, Any]:
        """
        Helper method to create a cluster with the given configuration.

        Args:
            cluster_config: Cluster configuration
            env_config: Environment configuration
            worker_config: Worker node configuration
            control_plane_config: Control plane configuration
            cluster_name: Name of the cluster
            worker_nodes: Number of worker nodes

        Returns:
            dict: Result of the cluster creation
        """
        try:
            # Create a task to track the creation process
            task = self._create_task(cluster_config, env_config)

            # Create command executor
            from kind_cluster_setup.core.command import SubprocessCommandExecutor

            executor = SubprocessCommandExecutor()

            # Create the cluster
            kind_cluster = KindCluster(cluster_config, env_config, executor)
            if not kind_cluster.create():
                raise Exception("Failed to create cluster")

            # Apply resource limits if needed
            if cluster_config.get("apply_resource_limits", False) and (
                worker_config or control_plane_config
            ):
                logger.info("Applying resource limits to cluster nodes...")
                resource_result = self.apply_resource_limits(
                    {
                        "name": cluster_name,
                        "worker_config": worker_config,
                        "control_plane_config": control_plane_config,
                        "worker_nodes": worker_nodes,
                    }
                )
                if resource_result.get("status") != "success":
                    logger.warning(
                        f"Failed to apply resource limits: {resource_result.get('error')}"
                    )

            # Create a cluster entity and save it to the repository
            cluster = self._create_cluster_entity(
                cluster_name, cluster_config, env_config
            )

            # Update the task status
            self._update_task_status(
                task,
                "completed",
                {
                    "cluster_id": cluster.id if cluster else None,
                    "cluster_name": cluster_name,
                    "environment": env_config.get("environment"),
                    "worker_nodes": worker_nodes,
                    "status": "success",
                },
            )
        except Exception as e:
            error_msg = f"Failed to create Kind cluster: {str(e)}"
            logger.error(error_msg)
            logger.error(traceback.format_exc())

            # Update the task status if it exists
            if "task" in locals():
                self._update_task_status(task, "failed", {"error": str(e)})

            raise Exception(error_msg) from e

    def _create_task(self, cluster_config: dict, env_config: dict) -> Optional[Task]:
        """
        Create a task to track the cluster creation process.

        Args:
            cluster_config: The cluster configuration.
            env_config: The environment configuration.

        Returns:
            The created task, or None if the task repository is not available.
        """
        if self.task_repository is None:
            logger.warning("Task repository not available, skipping task creation")
            return None

        cluster_name = cluster_config.get("name", DEFAULT_CLUSTER_CONFIG["name"])
        environment = env_config.get("environment", DEFAULT_ENV_CONFIG["environment"])

        task = Task(
            name=f"Create cluster {cluster_name}",
            description=f"Create Kind cluster {cluster_name} for environment {environment}",
            status="running",
            command="create",
            args={"cluster_config": cluster_config, "env_config": env_config},
        )

        return self.task_repository.save(task)

    def _create_cluster_entity(
        self, cluster_name: str, cluster_config: dict, env_config: dict
    ) -> Optional[Cluster]:
        """
        Create a cluster entity and save it to the repository.

        Args:
            cluster_name: The name of the cluster.
            cluster_config: The cluster configuration.
            env_config: The environment configuration.

        Returns:
            The created cluster entity, or None if the cluster repository is not available.
        """
        if self.cluster_repository is None:
            logger.warning(
                "Cluster repository not available, skipping cluster entity creation"
            )
            return None

        # Check if a cluster with this name already exists
        existing_cluster = self.cluster_repository.find_by_name(cluster_name)
        if existing_cluster:
            logger.info(f"Cluster {cluster_name} already exists, updating it")
            existing_cluster.config = cluster_config
            existing_cluster.environment = env_config.get(
                "environment", DEFAULT_ENV_CONFIG["environment"]
            )
            existing_cluster.status = "running"
            existing_cluster.updated_at = datetime.now()
            return self.cluster_repository.save(existing_cluster)

        # Create a new cluster entity
        cluster = Cluster(
            name=cluster_name,
            config=cluster_config,
            environment=env_config.get(
                "environment", DEFAULT_ENV_CONFIG["environment"]
            ),
            status="running",
        )

        return self.cluster_repository.save(cluster)

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
