"""
Adapters for integrating new abstractions with existing code.

This module provides adapter classes that bridge between the existing code
and the new abstractions, allowing for a smooth transition.
"""

import os
import subprocess
from typing import Dict, List, Optional, Any, Union

from kind_cluster_setup.core.command import CommandExecutor, CommandResult
from kind_cluster_setup.core.docker import DockerClient
from kind_cluster_setup.core.kind import KindClient
from kind_cluster_setup.core.kubernetes import KubectlClient
from kind_cluster_setup.core.cluster import Cluster, ClusterConfig, EnvironmentConfig
from kind_cluster_setup.utils.logging import get_logger

logger = get_logger(__name__)


class KindClusterAdapter:
    """
    Adapter for the KindCluster class to use the new abstractions.
    
    This adapter provides methods that match the interface of the original
    KindCluster class but use the new abstractions internally.
    """
    
    def __init__(self, 
                cluster_config: Dict[str, Any], 
                env_config: Dict[str, Any],
                executor: CommandExecutor):
        """
        Initialize the adapter.
        
        Args:
            cluster_config: Cluster configuration dictionary
            env_config: Environment configuration dictionary
            executor: CommandExecutor to use for executing commands
        """
        self.cluster_config = cluster_config
        self.env_config = env_config
        self.executor = executor
        
        # Create clients
        self.docker_client = DockerClient(executor)
        self.kind_client = KindClient(executor)
        self.kubectl_client = KubectlClient(executor)
        
        # Extract cluster name
        self.name = cluster_config.get('name', 'kind')
        
        # Create cluster configuration
        self.config = ClusterConfig(
            name=self.name,
            worker_nodes=cluster_config.get('worker_nodes', 1),
            apply_resource_limits=cluster_config.get('apply_resource_limits', True)
        )
        
        # If worker_config is provided, update the config
        if 'worker_config' in cluster_config:
            worker_config = cluster_config['worker_config']
            self.config.worker_config.cpu = worker_config.get('cpu', '1')
            self.config.worker_config.memory = worker_config.get('memory', '2GB')
        
        # If control_plane_config is provided, update the config
        if 'control_plane_config' in cluster_config:
            control_plane_config = cluster_config['control_plane_config']
            self.config.control_plane_config.cpu = control_plane_config.get('cpu', '1')
            self.config.control_plane_config.memory = control_plane_config.get('memory', '2GB')
        
        # Create environment configuration
        self.env = EnvironmentConfig(
            environment=env_config.get('environment', 'dev'),
            namespace=env_config.get('namespace', 'default'),
            kubeconfig=env_config.get('kubeconfig')
        )
        
        # Create cluster object
        self.cluster = Cluster(
            name=self.name,
            context=f"kind-{self.name}",
            executor=executor,
            config=self.config,
            env_config=self.env
        )
    
    def create(self) -> None:
        """
        Create a Kind cluster.
        
        This method checks if Docker is running, if Kind is installed,
        creates a Kind configuration file, and creates the cluster.
        
        Raises:
            DockerNotRunningError: If Docker is not running
            KindNotInstalledError: If Kind is not installed
            ClusterCreationError: If cluster creation fails
        """
        # Check if Docker is running
        if not self.docker_client.is_running():
            logger.error("Docker is not running or not accessible")
            raise DockerNotRunningError("Docker is not running or not accessible. Please start Docker Desktop.")
        
        # Check if Kind is installed
        if not self.kind_client.is_installed():
            logger.error("Kind CLI is not found in PATH")
            raise KindNotInstalledError("Kind CLI tool is not installed or not in PATH.")
        
        # Check if cluster already exists
        existing_clusters = self.kind_client.get_clusters()
        if self.name in existing_clusters:
            logger.info(f"Cluster {self.name} already exists")
            return
        
        # Create the cluster
        try:
            # Create a temporary config file
            config_path = os.path.join(os.path.expanduser("~/.kind-setup/configs"), f"{self.name}.yaml")
            os.makedirs(os.path.dirname(config_path), exist_ok=True)
            
            # Create the cluster using the KindClient
            self.kind_client.create_cluster(
                name=self.name,
                config_file=config_path
            )
            
            # Apply resource limits if requested
            if self.config.apply_resource_limits:
                self._apply_resource_limits()
            
            logger.info(f"Cluster {self.name} created successfully")
        except Exception as e:
            logger.error(f"Failed to create cluster: {str(e)}")
            # Try to clean up
            try:
                self.kind_client.delete_cluster(self.name)
            except Exception:
                pass
            
            raise ClusterCreationError(f"Failed to create cluster: {str(e)}") from e
    
    def delete(self) -> None:
        """
        Delete the Kind cluster.
        
        Raises:
            ClusterDeletionError: If cluster deletion fails
        """
        try:
            # Delete the cluster using the KindClient
            self.kind_client.delete_cluster(self.name)
            logger.info(f"Cluster {self.name} deleted successfully")
        except Exception as e:
            logger.error(f"Failed to delete cluster: {str(e)}")
            raise ClusterDeletionError(f"Failed to delete cluster: {str(e)}") from e
    
    def install_ingress(self, ingress_type: str = "nginx") -> None:
        """
        Install an ingress controller in the Kind cluster.
        
        Args:
            ingress_type: Type of ingress controller to install
            
        Raises:
            IngressInstallationError: If ingress installation fails
        """
        try:
            # Install ingress using the Cluster object
            self.cluster.install_ingress(ingress_type)
            logger.info(f"Ingress controller {ingress_type} installed successfully")
        except Exception as e:
            logger.error(f"Failed to install ingress: {str(e)}")
            raise IngressInstallationError(f"Failed to install ingress: {str(e)}") from e
    
    def wait_for_ready(self, timeout: int = 60) -> bool:
        """
        Wait for the cluster to be ready.
        
        Args:
            timeout: Timeout in seconds
            
        Returns:
            True if the cluster is ready, False otherwise
        """
        # Wait for the cluster to be ready using the Cluster object
        return self.cluster.wait_for_ready(timeout)
    
    def get_info(self) -> Dict[str, Any]:
        """
        Get information about the Kind cluster including node metrics.
        
        Returns:
            Dictionary containing cluster information
        """
        # Get cluster info using the Cluster object
        return self.cluster.get_info()
    
    def check_health(self) -> Dict[str, Any]:
        """
        Check the health of the cluster.
        
        Returns:
            Dictionary containing health information
        """
        # Check cluster health using the Cluster object
        return self.cluster.check_health()
    
    def _apply_resource_limits(self) -> None:
        """
        Apply resource limits to cluster nodes.
        
        This method applies CPU and memory limits to the control plane
        and worker nodes using the Docker client.
        """
        # Apply resource limits to control plane
        cp_memory = self.config.control_plane_config.memory
        cp_memory_bytes = int(cp_memory.replace('GB', '')) * 1024 * 1024 * 1024
        cp_memory_swap = cp_memory_bytes * 2
        cp_cpus = self.config.control_plane_config.cpu
        cp_container = f"{self.name}-control-plane"
        
        self.docker_client.update_container(
            container_id=cp_container,
            cpu_limit=cp_cpus,
            memory_limit=str(cp_memory_bytes),
            memory_swap=str(cp_memory_swap)
        )
        
        # Apply resource limits to worker nodes
        worker_memory = self.config.worker_config.memory
        worker_memory_bytes = int(worker_memory.replace('GB', '')) * 1024 * 1024 * 1024
        worker_memory_swap = worker_memory_bytes * 2
        worker_cpus = self.config.worker_config.cpu
        
        for i in range(self.config.worker_nodes):
            worker_suffix = '' if i == 0 else str(i+1)
            worker_container = f"{self.name}-worker{worker_suffix}"
            
            # Check if container exists
            containers = self.docker_client.get_containers(
                all_containers=True,
                filter_expr=f"name={worker_container}"
            )
            
            if containers:
                self.docker_client.update_container(
                    container_id=worker_container,
                    cpu_limit=worker_cpus,
                    memory_limit=str(worker_memory_bytes),
                    memory_swap=str(worker_memory_swap)
                )
    
    def __enter__(self):
        """
        Enter the context manager.
        
        Returns:
            Self
        """
        self.create()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """
        Exit the context manager.
        
        Args:
            exc_type: Exception type
            exc_val: Exception value
            exc_tb: Exception traceback
        """
        self.delete()


class DockerNotRunningError(Exception):
    """Exception raised when Docker is not running."""
    pass


class KindNotInstalledError(Exception):
    """Exception raised when Kind is not installed."""
    pass


class ClusterCreationError(Exception):
    """Exception raised when cluster creation fails."""
    pass


class ClusterDeletionError(Exception):
    """Exception raised when cluster deletion fails."""
    pass


class IngressInstallationError(Exception):
    """Exception raised when ingress installation fails."""
    pass
