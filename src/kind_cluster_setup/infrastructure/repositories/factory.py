"""
Repository factory for creating and managing repositories.

This module provides a factory for creating and managing repositories,
making it easier to switch between different repository implementations.
"""

import os
from typing import Dict, Optional, Type, TypeVar, cast

from kind_cluster_setup.core.repository import Repository
from kind_cluster_setup.domain.repositories import (
    ApplicationRepository,
    ClusterRepository,
    TaskRepository,
    UserRepository,
)
from kind_cluster_setup.infrastructure.repositories.json_repositories import (
    JsonApplicationRepository,
    JsonClusterRepository,
    JsonTaskRepository,
    JsonUserRepository,
)
from kind_cluster_setup.utils.logging import get_logger

logger = get_logger(__name__)

# Type variable for repository interfaces
R = TypeVar("R", bound=Repository)


class RepositoryFactory:
    """
    Factory for creating and managing repositories.

    This class provides methods for creating and retrieving repositories,
    making it easier to switch between different repository implementations.
    """

    def __init__(self, data_dir: str):
        """
        Initialize the repository factory.

        Args:
            data_dir: Directory where repository data files are stored
        """
        self.data_dir = data_dir
        self._repositories: Dict[Type[Repository], Repository] = {}

        # Create the data directory if it doesn't exist
        os.makedirs(data_dir, exist_ok=True)

    def get_cluster_repository(self) -> ClusterRepository:
        """
        Get the cluster repository.

        Returns:
            The cluster repository
        """
        return self._get_repository(
            ClusterRepository,
            lambda: JsonClusterRepository(os.path.join(self.data_dir, "clusters.json")),
        )

    def get_task_repository(self) -> TaskRepository:
        """
        Get the task repository.

        Returns:
            The task repository
        """
        return self._get_repository(
            TaskRepository,
            lambda: JsonTaskRepository(os.path.join(self.data_dir, "tasks.json")),
        )

    def get_application_repository(self) -> ApplicationRepository:
        """
        Get the application repository.

        Returns:
            The application repository
        """
        return self._get_repository(
            ApplicationRepository,
            lambda: JsonApplicationRepository(
                os.path.join(self.data_dir, "applications.json")
            ),
        )

    def get_user_repository(self) -> UserRepository:
        """
        Get the user repository.

        Returns:
            The user repository
        """
        return self._get_repository(
            UserRepository,
            lambda: JsonUserRepository(os.path.join(self.data_dir, "users.json")),
        )

    def _get_repository(self, repo_type: Type[R], factory_func) -> R:
        """
        Get a repository of the specified type.

        Args:
            repo_type: Type of the repository to get
            factory_func: Function to create the repository if it doesn't exist

        Returns:
            The repository
        """
        if repo_type not in self._repositories:
            logger.info(f"Creating repository of type {repo_type.__name__}")
            self._repositories[repo_type] = factory_func()

        return cast(R, self._repositories[repo_type])


# Singleton instance of the repository factory
_factory: Optional[RepositoryFactory] = None


def init_repository_factory(data_dir: str) -> RepositoryFactory:
    """
    Initialize the repository factory.

    Args:
        data_dir: Directory where repository data files are stored

    Returns:
        The repository factory
    """
    global _factory
    _factory = RepositoryFactory(data_dir)
    return _factory


def get_repository_factory() -> RepositoryFactory:
    """
    Get the repository factory.

    Returns:
        The repository factory

    Raises:
        RuntimeError: If the repository factory has not been initialized
    """
    if _factory is None:
        raise RuntimeError("Repository factory has not been initialized")
    return _factory
