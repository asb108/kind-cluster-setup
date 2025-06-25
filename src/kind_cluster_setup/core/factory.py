"""
Factory for creating clients and managers.

This module provides factory functions for creating clients and managers
with the appropriate dependencies.
"""

import os
from typing import Optional, Dict, Any

from kind_cluster_setup.core.command import CommandExecutor, SubprocessCommandExecutor, MockCommandExecutor
from kind_cluster_setup.core.docker import DockerClient
from kind_cluster_setup.core.kind import KindClient
from kind_cluster_setup.core.kubernetes import KubectlClient
from kind_cluster_setup.core.helm import HelmClient
from kind_cluster_setup.core.cluster import ClusterManager, ClusterConfig, EnvironmentConfig, Cluster


class ClientFactory:
    """
    Factory for creating clients with the appropriate dependencies.
    
    This class provides methods for creating clients with the appropriate
    command executor and other dependencies.
    """
    
    def __init__(self, executor: Optional[CommandExecutor] = None):
        """
        Initialize the factory.
        
        Args:
            executor: CommandExecutor to use for creating clients
        """
        self.executor = executor or SubprocessCommandExecutor()
    
    def create_docker_client(self) -> DockerClient:
        """
        Create a Docker client.
        
        Returns:
            DockerClient instance
        """
        return DockerClient(self.executor)
    
    def create_kind_client(self) -> KindClient:
        """
        Create a Kind client.
        
        Returns:
            KindClient instance
        """
        return KindClient(self.executor)
    
    def create_kubectl_client(self) -> KubectlClient:
        """
        Create a kubectl client.
        
        Returns:
            KubectlClient instance
        """
        return KubectlClient(self.executor)
    
    def create_helm_client(self) -> HelmClient:
        """
        Create a Helm client.
        
        Returns:
            HelmClient instance
        """
        return HelmClient(self.executor)
    
    def create_cluster_manager(self, config_dir: Optional[str] = None) -> ClusterManager:
        """
        Create a cluster manager.
        
        Args:
            config_dir: Directory for storing cluster configurations
            
        Returns:
            ClusterManager instance
        """
        return ClusterManager(self.executor, config_dir)
    
    def create_cluster(self, 
                      name: str,
                      context: str,
                      config: Optional[ClusterConfig] = None,
                      env_config: Optional[EnvironmentConfig] = None) -> Cluster:
        """
        Create a cluster object.
        
        Args:
            name: Cluster name
            context: Kubernetes context
            config: Cluster configuration
            env_config: Environment configuration
            
        Returns:
            Cluster instance
        """
        return Cluster(
            name=name,
            context=context,
            executor=self.executor,
            config=config,
            env_config=env_config
        )


def create_default_factory() -> ClientFactory:
    """
    Create a factory with default configuration.
    
    Returns:
        ClientFactory instance
    """
    return ClientFactory(SubprocessCommandExecutor())


def create_mock_factory(mock_results: Optional[Dict[str, Any]] = None) -> ClientFactory:
    """
    Create a factory with mock command executor.
    
    Args:
        mock_results: Dictionary mapping command strings to CommandResult objects
        
    Returns:
        ClientFactory instance
    """
    return ClientFactory(MockCommandExecutor(mock_results))
