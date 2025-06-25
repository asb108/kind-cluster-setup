"""
Deployment strategy abstractions.

This module provides interfaces and implementations for deploying
applications to Kubernetes clusters.
"""

import os
import tempfile
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, Union

import yaml

from kind_cluster_setup.core.command import CommandExecutor
from kind_cluster_setup.core.kubernetes import KubectlClient
from kind_cluster_setup.core.helm import HelmClient
from kind_cluster_setup.core.cluster import Cluster
from kind_cluster_setup.utils.logging import get_logger

logger = get_logger(__name__)


class DeploymentStrategy(ABC):
    """
    Abstract interface for deployment strategies.
    
    This interface defines the contract for deploying applications
    to Kubernetes clusters.
    """
    
    @abstractmethod
    def deploy(self, 
              app: str,
              app_config: Dict[str, Any],
              env_config: Dict[str, Any],
              cluster: Cluster) -> bool:
        """
        Deploy an application to a cluster.
        
        Args:
            app: Name of the application to deploy
            app_config: Application-specific configuration
            env_config: Environment configuration
            cluster: Cluster to deploy to
            
        Returns:
            True if deployment was successful, False otherwise
        """
        pass
    
    @abstractmethod
    def check_status(self, 
                    app: str,
                    namespace: str,
                    cluster: Cluster) -> Dict[str, Any]:
        """
        Check the status of a deployed application.
        
        Args:
            app: Name of the application to check
            namespace: Kubernetes namespace
            cluster: Cluster to check
            
        Returns:
            Dictionary containing status information
        """
        pass
    
    @abstractmethod
    def delete(self, 
              app: str,
              namespace: str,
              cluster: Cluster) -> bool:
        """
        Delete a deployed application.
        
        Args:
            app: Name of the application to delete
            namespace: Kubernetes namespace
            cluster: Cluster to delete from
            
        Returns:
            True if deletion was successful, False otherwise
        """
        pass


class KubectlDeploymentStrategy(DeploymentStrategy):
    """
    Deployment strategy using kubectl.
    
    This strategy deploys applications using kubectl apply.
    """
    
    def __init__(self, executor: CommandExecutor):
        """
        Initialize the kubectl deployment strategy.
        
        Args:
            executor: CommandExecutor to use for executing commands
        """
        self.executor = executor
        self.kubectl_client = KubectlClient(executor)
    
    def deploy(self, 
              app: str,
              app_config: Dict[str, Any],
              env_config: Dict[str, Any],
              cluster: Cluster) -> bool:
        """
        Deploy an application using kubectl apply.
        
        Args:
            app: Name of the application to deploy
            app_config: Application-specific configuration
            env_config: Environment configuration
            cluster: Cluster to deploy to
            
        Returns:
            True if deployment was successful, False otherwise
        """
        try:
            logger.info(f"Deploying {app} using kubectl")
            
            # Get namespace from config or use default format
            namespace = app_config.get('namespace', f"{app}-{env_config.get('environment', 'dev')}")
            
            # Get manifest files
            manifest_files = app_config.get('manifest_files', [])
            if not manifest_files:
                logger.error(f"No manifest files specified for {app}")
                return False
            
            # Apply manifests
            for manifest_file in manifest_files:
                self.kubectl_client.apply(
                    files=[manifest_file],
                    context=cluster.context,
                    namespace=namespace
                )
            
            logger.info(f"Successfully deployed {app} using kubectl")
            return True
        except Exception as e:
            logger.error(f"Error deploying {app} with kubectl: {str(e)}")
            return False
    
    def check_status(self, 
                    app: str,
                    namespace: str,
                    cluster: Cluster) -> Dict[str, Any]:
        """
        Check the status of a deployed application.
        
        Args:
            app: Name of the application to check
            namespace: Kubernetes namespace
            cluster: Cluster to check
            
        Returns:
            Dictionary containing status information
        """
        try:
            logger.info(f"Checking status of {app} in namespace {namespace}")
            
            # Get pods
            pods = self.kubectl_client.get_pods(
                namespace=namespace,
                context=cluster.context,
                selector=f"app={app}"
            )
            
            # Determine status based on pods
            status = "Unknown"
            if pods:
                all_running = all(pod.get('status', {}).get('phase') == 'Running' for pod in pods)
                status = "Running" if all_running else "Partially Running"
            
            return {
                'status': status,
                'pods': pods,
                'services': [],
                'message': f"Found {len(pods)} pods for {app}"
            }
        except Exception as e:
            logger.error(f"Error checking status of {app}: {str(e)}")
            return {
                'status': "Error",
                'pods': [],
                'services': [],
                'message': f"Error checking status: {str(e)}"
            }
    
    def delete(self, 
              app: str,
              namespace: str,
              cluster: Cluster) -> bool:
        """
        Delete a deployed application.
        
        Args:
            app: Name of the application to delete
            namespace: Kubernetes namespace
            cluster: Cluster to delete from
            
        Returns:
            True if deletion was successful, False otherwise
        """
        try:
            logger.info(f"Deleting {app} from namespace {namespace}")
            
            # Delete all resources with the app label
            self.kubectl_client.execute(
                args=["delete", "all", "-l", f"app={app}"],
                context=cluster.context,
                namespace=namespace
            )
            
            logger.info(f"Successfully deleted {app} from namespace {namespace}")
            return True
        except Exception as e:
            logger.error(f"Error deleting {app}: {str(e)}")
            return False


class HelmDeploymentStrategy(DeploymentStrategy):
    """
    Deployment strategy using Helm.
    
    This strategy deploys applications using Helm charts.
    """
    
    def __init__(self, executor: CommandExecutor):
        """
        Initialize the Helm deployment strategy.
        
        Args:
            executor: CommandExecutor to use for executing commands
        """
        self.executor = executor
        self.helm_client = HelmClient(executor)
    
    def deploy(self, 
              app: str,
              app_config: Dict[str, Any],
              env_config: Dict[str, Any],
              cluster: Cluster) -> bool:
        """
        Deploy an application using Helm.
        
        Args:
            app: Name of the application to deploy
            app_config: Application-specific configuration
            env_config: Environment configuration
            cluster: Cluster to deploy to
            
        Returns:
            True if deployment was successful, False otherwise
        """
        logger.info(f"Deploying Helm chart for {app}")
        
        values_file_path = None
        
        try:
            # Get namespace from config or use default format
            namespace = app_config.get('namespace', f"{app}-{env_config.get('environment', 'dev')}")
            
            # Get template directory - either from app_config or use default path
            chart = app_config.get('chart')
            if not chart:
                logger.error(f"No chart specified for {app}")
                return False
            
            # Get values for template substitution
            values = app_config.get('values', {})
            
            # Get release name
            release_name = app_config.get('release_name', f"{app}-release")
            
            # Get chart version if specified
            version = app_config.get('version')
            
            logger.info(f"Using chart: {chart}")
            logger.info(f"Deploying to namespace: {namespace} in cluster: {cluster.name}")
            
            # Create values.yaml file from provided values
            try:
                with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as temp_values_file:
                    yaml.dump(values, temp_values_file)
                    values_file_path = temp_values_file.name
            except Exception as e:
                logger.error(f"Failed to create temporary values file: {str(e)}")
                return False
            
            # Install or upgrade the release
            self.helm_client.install_or_upgrade(
                release_name=release_name,
                chart=chart,
                namespace=namespace,
                values_file=values_file_path,
                version=version,
                create_namespace=True,
                wait=True,
                timeout="5m",
                kubeconfig=cluster.env_config.kubeconfig
            )
            
            logger.info(f"Helm chart for {app} deployed successfully")
            return True
                
        except Exception as e:
            logger.error(f"Error deploying {app} with Helm: {str(e)}")
            return False
        finally:
            # Clean up temporary values file in all cases
            if values_file_path and os.path.exists(values_file_path):
                try:
                    os.unlink(values_file_path)
                except Exception as e:
                    logger.warning(f"Failed to clean up temporary values file: {str(e)}")
    
    def check_status(self, 
                    app: str,
                    namespace: str,
                    cluster: Cluster) -> Dict[str, Any]:
        """
        Check the status of a deployed Helm chart.
        
        Args:
            app: Name of the application to check
            namespace: Kubernetes namespace
            cluster: Cluster to check
            
        Returns:
            Dictionary containing status information
        """
        logger.info(f"Checking status of Helm chart for {app}")
        
        # Get release name (could be different from app name)
        release_name = f"{app}-release"
        
        status_info = {
            'status': 'Unknown',
            'pods': [],
            'services': [],
            'message': ''
        }
        
        try:
            # Check Helm release status
            result = self.helm_client.execute(
                args=["status", release_name, "--namespace", namespace],
                kubeconfig=cluster.env_config.kubeconfig
            )
            
            logger.info(f"Helm chart for {app} status checked successfully")
            status_info['status'] = 'Deployed'
            status_info['message'] = result.stdout
            
            # Get pod status
            kubectl_client = KubectlClient(self.executor)
            pods = kubectl_client.get_pods(
                namespace=namespace,
                context=cluster.context,
                selector=f"app.kubernetes.io/instance={release_name}"
            )
            
            status_info['pods'] = pods
            
            # Determine overall status based on pods
            if pods:
                all_running = all(pod.get('status', {}).get('phase') == 'Running' for pod in pods)
                status_info['status'] = 'Running' if all_running else 'Partially Running'
            
            return status_info
            
        except Exception as e:
            error_msg = f"Failed to check status of Helm chart for {app}: {str(e)}"
            logger.error(error_msg)
            status_info['status'] = 'Error'
            status_info['message'] = error_msg
            return status_info
    
    def delete(self, 
              app: str,
              namespace: str,
              cluster: Cluster) -> bool:
        """
        Delete a deployed Helm release.
        
        Args:
            app: Name of the application to delete
            namespace: Kubernetes namespace
            cluster: Cluster to delete from
            
        Returns:
            True if deletion was successful, False otherwise
        """
        logger.info(f"Deleting Helm release for {app}")
        
        # Get release name
        release_name = f"{app}-release"
        
        try:
            # Uninstall the release
            self.helm_client.uninstall(
                release_name=release_name,
                namespace=namespace,
                wait=True,
                timeout="5m",
                kubeconfig=cluster.env_config.kubeconfig
            )
            
            logger.info(f"Helm release for {app} deleted successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to delete Helm release for {app}: {str(e)}")
            return False


class DeploymentStrategyFactory:
    """
    Factory for creating deployment strategies.
    
    This class provides methods for creating deployment strategies
    with the appropriate dependencies.
    """
    
    def __init__(self, executor: CommandExecutor):
        """
        Initialize the factory.
        
        Args:
            executor: CommandExecutor to use for creating strategies
        """
        self.executor = executor
        self._strategies = {}
    
    def register_strategy(self, name: str, strategy_class: type) -> None:
        """
        Register a deployment strategy.
        
        Args:
            name: Name of the strategy
            strategy_class: Strategy class to register
        """
        self._strategies[name] = strategy_class
    
    def create_strategy(self, name: str) -> DeploymentStrategy:
        """
        Create a deployment strategy.
        
        Args:
            name: Name of the strategy to create
            
        Returns:
            DeploymentStrategy instance
            
        Raises:
            ValueError: If the strategy is not registered
        """
        if name not in self._strategies:
            raise ValueError(f"Unknown deployment strategy: {name}")
        
        strategy_class = self._strategies[name]
        return strategy_class(self.executor)
    
    @classmethod
    def create_default_factory(cls, executor: CommandExecutor) -> 'DeploymentStrategyFactory':
        """
        Create a factory with default strategies.
        
        Args:
            executor: CommandExecutor to use for creating strategies
            
        Returns:
            DeploymentStrategyFactory instance
        """
        factory = cls(executor)
        factory.register_strategy('kubectl', KubectlDeploymentStrategy)
        factory.register_strategy('helm', HelmDeploymentStrategy)
        return factory
