from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Union


class Deployment(ABC):
    """
    Base abstract class for application deployment strategies.

    This class defines the interface that all deployment implementations must follow.
    Implementations include HelmDeployment and KubernetesDeployment.

    Attributes:
        cluster_name (str): The name of the Kind cluster to deploy to
    """

    def __init__(self, cluster_name: str) -> None:
        """
        Initialize a deployment strategy.

        Args:
            cluster_name: Name of the target Kind cluster
        """
        self.cluster_name = cluster_name

    @abstractmethod
    def deploy(
        self, app: str, app_config: Dict[str, Any], env_config: Dict[str, Any]
    ) -> bool:
        """
        Deploy an application to the cluster.

        Args:
            app: Name of the application to deploy
            app_config: Application-specific configuration
            env_config: Environment configuration

        Returns:
            bool: True if deployment was successful, False otherwise
        """
        pass

    @abstractmethod
    def check_status(self, app: str, namespace: Optional[str] = None) -> Dict[str, Any]:
        """
        Check the status of a deployed application.

        Args:
            app: Name of the application to check
            namespace: Kubernetes namespace, defaults to 'default'

        Returns:
            Dict containing status information with keys:
            - 'status': str - Overall status (e.g., 'Running', 'Failed')
            - 'pods': List[Dict] - Status of individual pods
            - 'services': List[Dict] - Exposed services
            - 'message': str - Human-readable status message
        """
        pass

    @abstractmethod
    def delete(self, app: str, namespace: Optional[str] = None) -> bool:
        """
        Delete a deployed application.

        Args:
            app: Name of the application to delete
            namespace: Kubernetes namespace, defaults to 'default'

        Returns:
            bool: True if deletion was successful, False otherwise
        """
        pass


# For backward compatibility
DeploymentStrategy = Deployment
