"""
API server adapters for integrating new abstractions with the API server.

This module provides adapter classes that bridge between the API server
and the new abstractions, allowing for a smooth transition.
"""

import logging
import os
from typing import Any, Dict, List, Optional, Union

from kind_cluster_setup.core.cluster import ClusterConfig, EnvironmentConfig
from kind_cluster_setup.core.command import SubprocessCommandExecutor
from kind_cluster_setup.core.deployment import DeploymentStrategyFactory
from kind_cluster_setup.core.factory import ClientFactory
from kind_cluster_setup.utils.logging import get_logger

logger = get_logger(__name__)


class ApiServerAdapter:
    """
    Adapter for the API server to use the new abstractions.

    This adapter provides methods that match the interface expected by the API server
    but use the new abstractions internally.
    """

    def __init__(self):
        """Initialize the adapter."""
        self.executor = SubprocessCommandExecutor()
        self.factory = ClientFactory(self.executor)
        self.cluster_manager = self.factory.create_cluster_manager()
        self.deployment_factory = DeploymentStrategyFactory.create_default_factory(
            self.executor
        )

    def create_cluster(
        self,
        cluster_name: str,
        worker_nodes: int,
        apply_resource_limits: bool,
        worker_config: Optional[Dict[str, Any]] = None,
        control_plane_config: Optional[Dict[str, Any]] = None,
        custom_ports: Optional[Dict[str, Any]] = None,
        environment: str = "dev",
    ) -> Dict[str, Any]:
        """
        Create a Kind cluster.

        Args:
            cluster_name: Name of the cluster to create
            worker_nodes: Number of worker nodes
            apply_resource_limits: Whether to apply resource limits
            worker_config: Worker node configuration
            control_plane_config: Control plane node configuration
            custom_ports: Custom port configuration
            environment: Environment name

        Returns:
            Dictionary containing the result of the operation

        Raises:
            Exception: If cluster creation fails
        """
        try:
            logger.info(
                f"Creating cluster {cluster_name} with {worker_nodes} worker nodes"
            )

            # Create cluster configuration
            cluster_config = ClusterConfig(
                name=cluster_name,
                worker_nodes=worker_nodes,
                apply_resource_limits=apply_resource_limits,
            )

            # Update worker configuration if provided
            if worker_config:
                cluster_config.worker_config.cpu = worker_config.get("cpu", "1")
                cluster_config.worker_config.memory = worker_config.get("memory", "2GB")

            # Update control plane configuration if provided
            if control_plane_config:
                cluster_config.control_plane_config.cpu = control_plane_config.get(
                    "cpu", "1"
                )
                cluster_config.control_plane_config.memory = control_plane_config.get(
                    "memory", "2GB"
                )

            # Update custom ports if provided
            if custom_ports:
                if "http_port" in custom_ports and custom_ports["http_port"]:
                    cluster_config.http_port = custom_ports["http_port"]
                if "https_port" in custom_ports and custom_ports["https_port"]:
                    cluster_config.https_port = custom_ports["https_port"]
                if "nodeport_start" in custom_ports and custom_ports["nodeport_start"]:
                    cluster_config.nodeport_start = custom_ports["nodeport_start"]

            # Create environment configuration
            env_config = EnvironmentConfig(environment=environment, namespace="default")

            # Create the cluster
            cluster = self.cluster_manager.create_cluster(cluster_config, env_config)

            # Wait for the cluster to be ready
            is_ready = cluster.wait_for_ready(timeout=120)

            # Get cluster health
            health_info = cluster.check_health()

            # Return the result
            return {
                "success": True,
                "cluster_name": cluster_name,
                "ready": is_ready,
                "health": health_info,
            }
        except Exception as e:
            logger.error(f"Failed to create cluster: {str(e)}")
            raise

    def delete_cluster(self, cluster_name: str) -> Dict[str, Any]:
        """
        Delete a Kind cluster.

        Args:
            cluster_name: Name of the cluster to delete

        Returns:
            Dictionary containing the result of the operation

        Raises:
            Exception: If cluster deletion fails
        """
        try:
            logger.info(f"Deleting cluster {cluster_name}")

            # Delete the cluster
            self.cluster_manager.delete_cluster(cluster_name)

            # Return the result
            return {"success": True, "cluster_name": cluster_name}
        except Exception as e:
            logger.error(f"Failed to delete cluster: {str(e)}")
            raise

    def check_cluster_health(self, cluster_name: str) -> Dict[str, Any]:
        """
        Check the health of a Kind cluster.

        Args:
            cluster_name: Name of the cluster to check

        Returns:
            Dictionary containing the health information

        Raises:
            Exception: If health check fails
        """
        try:
            logger.info(f"Checking health for cluster {cluster_name}")

            # Create a cluster object
            cluster = self.factory.create_cluster(
                name=cluster_name, context=f"kind-{cluster_name}"
            )

            # Check cluster health
            health_info = cluster.check_health()

            # Return the health information
            return health_info
        except Exception as e:
            logger.error(f"Failed to check cluster health: {str(e)}")
            raise

    def get_cluster_info(self, cluster_name: str) -> Dict[str, Any]:
        """
        Get information about a Kind cluster.

        Args:
            cluster_name: Name of the cluster to get information about

        Returns:
            Dictionary containing the cluster information

        Raises:
            Exception: If getting cluster information fails
        """
        try:
            logger.info(f"Getting information for cluster {cluster_name}")

            # Create a cluster object
            cluster = self.factory.create_cluster(
                name=cluster_name, context=f"kind-{cluster_name}"
            )

            # Get cluster information
            info = cluster.get_info()

            # Return the information
            return info
        except Exception as e:
            logger.error(f"Failed to get cluster information: {str(e)}")
            raise

    def deploy_application(
        self,
        cluster_name: str,
        app_name: str,
        namespace: str,
        values: Optional[Dict[str, Any]] = None,
        deployment_method: str = "helm",
        environment: str = "dev",
        version: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Deploy an application to a Kind cluster.

        Args:
            cluster_name: Name of the cluster to deploy to
            app_name: Name of the application to deploy
            namespace: Kubernetes namespace
            values: Custom values for the application
            deployment_method: Deployment method (helm or kubectl)
            environment: Environment name
            version: Application version

        Returns:
            Dictionary containing the result of the operation

        Raises:
            Exception: If application deployment fails
        """
        try:
            logger.info(
                f"Deploying {app_name} to cluster {cluster_name} using {deployment_method}"
            )

            # Create a cluster object
            cluster = self.factory.create_cluster(
                name=cluster_name, context=f"kind-{cluster_name}"
            )

            # Create environment configuration
            env_config = EnvironmentConfig(environment=environment, namespace=namespace)

            # Create application configuration
            app_config = {
                "namespace": namespace,
                "chart": app_name,
                "release_name": f"{app_name}-release",
                "values": values or {},
                "version": version,
            }

            # Create deployment strategy
            strategy = self.deployment_factory.create_strategy(deployment_method)

            # Deploy the application
            success = strategy.deploy(app_name, app_config, env_config, cluster)

            # Check application status
            status = strategy.check_status(app_name, namespace, cluster)

            # Return the result
            return {
                "success": success,
                "app_name": app_name,
                "cluster_name": cluster_name,
                "namespace": namespace,
                "status": status,
            }
        except Exception as e:
            logger.error(f"Failed to deploy application: {str(e)}")
            raise

    def delete_application(
        self,
        cluster_name: str,
        app_name: str,
        namespace: str,
        deployment_method: str = "helm",
    ) -> Dict[str, Any]:
        """
        Delete an application from a Kind cluster.

        Args:
            cluster_name: Name of the cluster to delete from
            app_name: Name of the application to delete
            namespace: Kubernetes namespace
            deployment_method: Deployment method (helm or kubectl)

        Returns:
            Dictionary containing the result of the operation

        Raises:
            Exception: If application deletion fails
        """
        try:
            logger.info(
                f"Deleting {app_name} from cluster {cluster_name} using {deployment_method}"
            )

            # Create a cluster object
            cluster = self.factory.create_cluster(
                name=cluster_name, context=f"kind-{cluster_name}"
            )

            # Create deployment strategy
            strategy = self.deployment_factory.create_strategy(deployment_method)

            # Delete the application
            success = strategy.delete(app_name, namespace, cluster)

            # Return the result
            return {
                "success": success,
                "app_name": app_name,
                "cluster_name": cluster_name,
                "namespace": namespace,
            }
        except Exception as e:
            logger.error(f"Failed to delete application: {str(e)}")
            raise
