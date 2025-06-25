"""
Cluster configuration and management abstractions.

This module provides classes for managing cluster configurations and
cluster lifecycle, using the command execution abstractions.
"""

import os
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Union

from kind_cluster_setup.core.command import CommandExecutor
from kind_cluster_setup.core.docker import DockerClient
from kind_cluster_setup.core.kind import KindClient
from kind_cluster_setup.core.kubernetes import KubectlClient
from kind_cluster_setup.utils.yaml_handler import dump_yaml, load_yaml


@dataclass
class NodeConfig:
    """Configuration for a Kubernetes node."""

    cpu: str = "1"
    memory: str = "2GB"


@dataclass
class ClusterConfig:
    """Configuration for a Kind cluster."""

    name: str
    worker_nodes: int = 1
    worker_config: Optional[NodeConfig] = None
    control_plane_config: Optional[NodeConfig] = None
    apply_resource_limits: bool = True
    http_port: int = 80
    https_port: int = 443
    nodeport_start: int = 30000
    custom_ports: Dict[str, int] = field(default_factory=dict)

    def __post_init__(self):
        """Initialize default configurations if not provided."""
        if self.worker_config is None:
            self.worker_config = NodeConfig()

        if self.control_plane_config is None:
            self.control_plane_config = NodeConfig()

        # Override ports with custom ports if provided
        if "http" in self.custom_ports:
            self.http_port = self.custom_ports["http"]

        if "https" in self.custom_ports:
            self.https_port = self.custom_ports["https"]

        if "nodeport" in self.custom_ports:
            self.nodeport_start = self.custom_ports["nodeport"]


@dataclass
class EnvironmentConfig:
    """Configuration for a deployment environment."""

    environment: str = "dev"
    namespace: str = "default"
    kubeconfig: Optional[str] = None


class ClusterManager:
    """
    Manager for Kind cluster lifecycle.

    This class provides methods for creating, deleting, and managing
    Kind clusters using the command execution abstractions.
    """

    def __init__(self, executor: CommandExecutor, config_dir: Optional[str] = None):
        """
        Initialize the cluster manager.

        Args:
            executor: CommandExecutor to use for executing commands
            config_dir: Directory for storing cluster configurations
        """
        self.executor = executor
        self.docker_client = DockerClient(executor)
        self.kind_client = KindClient(executor)
        self.kubectl_client = KubectlClient(executor)
        self.config_dir = config_dir or os.path.expanduser("~/.kind-setup/configs")

        # Create config directory if it doesn't exist
        os.makedirs(self.config_dir, exist_ok=True)

    def create_cluster(
        self, cluster_config: ClusterConfig, env_config: EnvironmentConfig
    ) -> "Cluster":
        """
        Create a Kind cluster.

        Args:
            cluster_config: Cluster configuration
            env_config: Environment configuration

        Returns:
            Cluster object representing the created cluster

        Raises:
            ClusterCreationError: If the cluster creation fails
        """
        # Check if Docker is running
        if not self.docker_client.is_running():
            raise ClusterCreationError("Docker is not running or not accessible")

        # Check if Kind is installed
        if not self.kind_client.is_installed():
            raise ClusterCreationError("Kind CLI is not installed or not in PATH")

        # Check if cluster already exists
        existing_clusters = self.kind_client.get_clusters()
        if cluster_config.name in existing_clusters:
            # Cluster already exists, return a Cluster object for it
            return Cluster(
                name=cluster_config.name,
                context=f"kind-{cluster_config.name}",
                executor=self.executor,
                config=cluster_config,
                env_config=env_config,
            )

        # Create Kind config
        kind_config = self._create_kind_config(cluster_config)

        # Write config to a temporary file
        config_path = os.path.join(self.config_dir, f"{cluster_config.name}.yaml")
        dump_yaml(kind_config, config_path)

        try:
            # Create the cluster
            self.kind_client.create_cluster(
                name=cluster_config.name, config_file=config_path
            )

            # Apply resource limits if requested
            if cluster_config.apply_resource_limits:
                self._apply_resource_limits(cluster_config)

            # Create and return a Cluster object
            return Cluster(
                name=cluster_config.name,
                context=f"kind-{cluster_config.name}",
                executor=self.executor,
                config=cluster_config,
                env_config=env_config,
            )
        except Exception as e:
            # Clean up if an error occurred
            try:
                self.kind_client.delete_cluster(cluster_config.name)
            except Exception:
                pass

            raise ClusterCreationError(f"Failed to create cluster: {str(e)}") from e

    def delete_cluster(self, cluster_name: str) -> None:
        """
        Delete a Kind cluster.

        Args:
            cluster_name: Name of the cluster to delete

        Raises:
            ClusterDeletionError: If the cluster deletion fails
        """
        try:
            # Delete the cluster
            self.kind_client.delete_cluster(cluster_name)

            # Delete the config file if it exists
            config_path = os.path.join(self.config_dir, f"{cluster_name}.yaml")
            if os.path.exists(config_path):
                os.remove(config_path)
        except Exception as e:
            raise ClusterDeletionError(f"Failed to delete cluster: {str(e)}") from e

    def get_clusters(self) -> List[str]:
        """
        Get the list of Kind clusters.

        Returns:
            List of cluster names
        """
        return self.kind_client.get_clusters()

    def _create_kind_config(self, cluster_config: ClusterConfig) -> Dict[str, Any]:
        """
        Create a Kind cluster configuration.

        Args:
            cluster_config: Cluster configuration

        Returns:
            Kind configuration dictionary
        """
        # Create the control-plane node
        control_plane_node = {
            "role": "control-plane",
            "extraMounts": [
                {
                    "hostPath": "/var/run/docker.sock",
                    "containerPath": "/var/run/docker.sock",
                }
            ],
            "kubeadmConfigPatches": [
                "kind: InitConfiguration\n"
                + "nodeRegistration:\n"
                + "  kubeletExtraArgs:\n"
                + '    node-labels: "ingress-ready=true"\n'
            ],
            "extraPortMappings": [
                {
                    "containerPort": 80,
                    "hostPort": cluster_config.http_port,
                    "protocol": "TCP",
                },
                {
                    "containerPort": 443,
                    "hostPort": cluster_config.https_port,
                    "protocol": "TCP",
                },
                {
                    "containerPort": 30080,
                    "hostPort": cluster_config.nodeport_start,
                    "protocol": "TCP",
                },
            ],
        }

        # Create worker nodes
        worker_nodes = []
        for i in range(cluster_config.worker_nodes):
            worker_node = {
                "role": "worker",
                "extraMounts": [
                    {
                        "hostPath": "/var/run/docker.sock",
                        "containerPath": "/var/run/docker.sock",
                    }
                ],
                "kubeadmConfigPatches": [
                    "kind: JoinConfiguration\n"
                    + "nodeRegistration:\n"
                    + "  kubeletExtraArgs:\n"
                    + '    node-labels: "kind.x-k8s.io/worker=true"'
                ],
            }
            worker_nodes.append(worker_node)

        # Create complete Kind config
        return {
            "kind": "Cluster",
            "apiVersion": "kind.x-k8s.io/v1alpha4",
            "nodes": [control_plane_node] + worker_nodes,
        }

    def _apply_resource_limits(self, cluster_config: ClusterConfig) -> None:
        """
        Apply resource limits to cluster nodes.

        Args:
            cluster_config: Cluster configuration
        """
        # Apply limits to control plane
        cp_memory = cluster_config.control_plane_config.memory
        cp_memory_bytes = int(cp_memory.replace("GB", "")) * 1024 * 1024 * 1024
        cp_memory_swap = cp_memory_bytes * 2
        cp_cpus = cluster_config.control_plane_config.cpu
        cp_container = f"{cluster_config.name}-control-plane"

        self.docker_client.update_container(
            container_id=cp_container,
            cpu_limit=cp_cpus,
            memory_limit=str(cp_memory_bytes),
            memory_swap=str(cp_memory_swap),
        )

        # Apply limits to worker nodes
        worker_memory = cluster_config.worker_config.memory
        worker_memory_bytes = int(worker_memory.replace("GB", "")) * 1024 * 1024 * 1024
        worker_memory_swap = worker_memory_bytes * 2
        worker_cpus = cluster_config.worker_config.cpu

        for i in range(cluster_config.worker_nodes):
            worker_suffix = "" if i == 0 else str(i + 1)
            worker_container = f"{cluster_config.name}-worker{worker_suffix}"

            # Check if container exists
            containers = self.docker_client.get_containers(
                all_containers=True, filter_expr=f"name={worker_container}"
            )

            if containers:
                self.docker_client.update_container(
                    container_id=worker_container,
                    cpu_limit=worker_cpus,
                    memory_limit=str(worker_memory_bytes),
                    memory_swap=str(worker_memory_swap),
                )


class Cluster:
    """
    Representation of a Kind cluster.

    This class provides methods for interacting with a Kind cluster,
    such as installing ingress, checking health, and getting information.
    """

    def __init__(
        self,
        name: str,
        context: str,
        executor: CommandExecutor,
        config: Optional[ClusterConfig] = None,
        env_config: Optional[EnvironmentConfig] = None,
    ):
        """
        Initialize the cluster.

        Args:
            name: Cluster name
            context: Kubernetes context
            executor: CommandExecutor to use for executing commands
            config: Cluster configuration
            env_config: Environment configuration
        """
        self.name = name
        self.context = context
        self.executor = executor
        self.config = config
        self.env_config = env_config or EnvironmentConfig()

        # Create clients
        self.docker_client = DockerClient(executor)
        self.kind_client = KindClient(executor)
        self.kubectl_client = KubectlClient(executor)

    def install_ingress(self, ingress_type: str = "nginx") -> None:
        """
        Install an ingress controller in the cluster.

        Args:
            ingress_type: Type of ingress controller to install

        Raises:
            IngressInstallationError: If the ingress installation fails
        """
        try:
            if ingress_type.lower() == "nginx":
                # Apply the NGINX ingress manifest
                self.kubectl_client.execute(
                    args=[
                        "apply",
                        "-f",
                        "https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml",
                    ],
                    context=self.context,
                )

                # Wait for ingress controller to be ready
                self.kubectl_client.wait_for_condition(
                    resource_type="pod",
                    selector="app.kubernetes.io/component=controller",
                    condition="Ready",
                    namespace="ingress-nginx",
                    timeout="90s",
                    context=self.context,
                )
            else:
                raise ValueError(f"Unsupported ingress type: {ingress_type}")
        except Exception as e:
            raise IngressInstallationError(
                f"Failed to install ingress: {str(e)}"
            ) from e

    def wait_for_ready(self, timeout: int = 60) -> bool:
        """
        Wait for the cluster to be ready.

        Args:
            timeout: Timeout in seconds

        Returns:
            True if the cluster is ready, False otherwise
        """
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                # Check if all nodes are ready
                result = self.kubectl_client.execute(
                    args=[
                        "get",
                        "nodes",
                        "-o=jsonpath='{.items[*].status.conditions[?(@.type==\"Ready\")].status}'",
                    ],
                    context=self.context,
                    check=False,
                )

                if result.success:
                    # Check if all nodes report 'True' for Ready condition
                    statuses = result.stdout.strip("'").split()
                    if all(status == "True" for status in statuses):
                        return True

                time.sleep(5)
            except Exception:
                time.sleep(5)

        return False

    def get_info(self) -> Dict[str, Any]:
        """
        Get information about the cluster.

        Returns:
            Dictionary containing cluster information
        """
        try:
            # Get nodes information
            nodes_result = self.kubectl_client.execute(
                args=["get", "nodes", "-o", "wide"], context=self.context
            )

            # Get node metrics
            metrics_result = self.kubectl_client.execute(
                args=["top", "nodes"], context=self.context, check=False
            )

            nodes = []
            if metrics_result.success:
                # Parse metrics output
                lines = metrics_result.stdout.strip().split("\n")[1:]  # Skip header
                for line in lines:
                    parts = line.split()
                    if len(parts) >= 4:
                        node_name = parts[0]
                        cpu = int(parts[1].rstrip("%"))
                        memory = int(parts[2].rstrip("%"))

                        # Get role from node name
                        role = (
                            "control-plane"
                            if "control-plane" in node_name
                            else "worker"
                        )

                        # Get Kubernetes version from nodes_result
                        version = "v1.27.3"  # Default version
                        for node_line in nodes_result.stdout.strip().split("\n")[
                            1:
                        ]:  # Skip header
                            node_parts = node_line.split()
                            if len(node_parts) >= 5 and node_parts[0] == node_name:
                                version = node_parts[
                                    4
                                ]  # Version is typically in the 5th column
                                break

                        nodes.append(
                            {
                                "name": node_name,
                                "role": role,
                                "status": "Ready",
                                "cpu": cpu,
                                "memory": memory,
                                "disk": 0,  # Currently not available in Kind
                                "version": version,
                            }
                        )

            return {"nodes": nodes}
        except Exception as e:
            return {"nodes": [], "error": str(e)}

    def check_health(self) -> Dict[str, Any]:
        """
        Check the health of the cluster.

        Returns:
            Dictionary containing health information
        """
        try:
            # Check if nodes are ready
            result = self.kubectl_client.execute(
                args=[
                    "get",
                    "nodes",
                    "-o=jsonpath='{.items[*].metadata.name} {.items[*].status.conditions[?(@.type==\"Ready\")].status}'",
                ],
                context=self.context,
                check=False,
            )

            if not result.success:
                return {
                    "status": "unavailable",
                    "details": {"error": result.stderr},
                    "issues": ["Cannot connect to cluster"],
                }

            # Process node status
            status_parts = result.stdout.strip("'").split()
            if not status_parts:
                return {
                    "status": "unavailable",
                    "details": {"error": "No nodes found"},
                    "issues": ["No nodes found in cluster"],
                }

            node_names = status_parts[: len(status_parts) // 2]
            node_statuses = status_parts[len(status_parts) // 2 :]

            details = {"nodes": {}}
            issues = []

            for name, status in zip(node_names, node_statuses):
                details["nodes"][name] = {"ready": status == "True"}
                if status != "True":
                    issues.append(f"Node {name} not ready")

            # Determine overall status
            if issues:
                status = "degraded"
            else:
                status = "healthy"

            return {"status": status, "details": details, "issues": issues}
        except Exception as e:
            return {
                "status": "unavailable",
                "details": {"error": str(e)},
                "issues": ["Error checking cluster health"],
            }


class ClusterCreationError(Exception):
    """Exception raised when cluster creation fails."""

    pass


class ClusterDeletionError(Exception):
    """Exception raised when cluster deletion fails."""

    pass


class IngressInstallationError(Exception):
    """Exception raised when ingress installation fails."""

    pass
