"""
Base command interface for the Kind Cluster Setup application.

This module defines the base Command interface that all commands must implement.
It also provides access to repositories through the RepositoryFactory.
"""

import argparse
from abc import ABC, abstractmethod
from typing import Optional

from kind_cluster_setup.domain.repositories import (
    ApplicationRepository,
    ClusterRepository,
    TaskRepository,
    UserRepository,
)
from kind_cluster_setup.infrastructure.repositories.factory import (
    get_repository_factory,
)
from kind_cluster_setup.utils.logging import get_logger

logger = get_logger(__name__)


class Command(ABC):
    """
    Base command interface.

    All commands in the application must implement this interface.
    It provides access to repositories through the RepositoryFactory.
    """

    def __init__(self):
        """Initialize the command."""
        try:
            # Get repositories
            factory = get_repository_factory()
            self._cluster_repo = factory.get_cluster_repository()
            self._task_repo = factory.get_task_repository()
            self._app_repo = factory.get_application_repository()
            self._user_repo = factory.get_user_repository()
        except Exception as e:
            logger.warning(f"Failed to initialize repositories: {e}")
            self._cluster_repo = None
            self._task_repo = None
            self._app_repo = None
            self._user_repo = None

    @property
    def cluster_repository(self) -> Optional[ClusterRepository]:
        """Get the cluster repository."""
        return self._cluster_repo

    @property
    def task_repository(self) -> Optional[TaskRepository]:
        """Get the task repository."""
        return self._task_repo

    @property
    def application_repository(self) -> Optional[ApplicationRepository]:
        """Get the application repository."""
        return self._app_repo

    @property
    def user_repository(self) -> Optional[UserRepository]:
        """Get the user repository."""
        return self._user_repo

    @abstractmethod
    def execute(self, args: argparse.Namespace) -> None:
        """
        Execute the command.

        Args:
            args: Command-line arguments
        """
        pass
