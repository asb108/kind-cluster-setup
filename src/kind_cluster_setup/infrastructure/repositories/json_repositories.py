"""
JSON file-based implementations of repository interfaces.

This module provides JSON file-based implementations of the repository
interfaces defined in kind_cluster_setup.domain.repositories.
"""

import json
import os
from datetime import datetime
from typing import Any, Dict, List, Optional, Type, TypeVar, cast

from kind_cluster_setup.core.repository import FileRepository
from kind_cluster_setup.domain.entities import Application, Cluster, Task, User
from kind_cluster_setup.domain.repositories import (
    ApplicationRepository,
    ClusterRepository,
    TaskRepository,
    UserRepository,
)
from kind_cluster_setup.utils.logging import get_logger

logger = get_logger(__name__)

# Type variable for entity classes
E = TypeVar("E", Cluster, Task, Application, User)


class JsonFileRepository(FileRepository[E]):
    """
    JSON file-based implementation of the Repository interface.

    This class provides functionality for storing entities in a JSON file.
    """

    def __init__(self, file_path: str, entity_class: Type[E]):
        """
        Initialize a JSON file-based repository.

        Args:
            file_path: Path to the JSON file where entities are stored
            entity_class: Class of the entities stored in this repository
        """
        self.entity_class = entity_class
        super().__init__(file_path)

    def _load_entities(self) -> None:
        """Load entities from the JSON file."""
        if not os.path.exists(self.file_path):
            logger.info(
                f"File {self.file_path} does not exist, creating empty repository"
            )
            self._entities = {}
            return

        try:
            with open(self.file_path, "r") as f:
                data = json.load(f)

            self._entities = {}
            for entity_dict in data:
                # Convert string dates to datetime objects
                if "created_at" in entity_dict:
                    entity_dict["created_at"] = datetime.fromisoformat(
                        entity_dict["created_at"]
                    )
                if "updated_at" in entity_dict:
                    entity_dict["updated_at"] = datetime.fromisoformat(
                        entity_dict["updated_at"]
                    )

                # Create entity instance
                entity = self.entity_class(**entity_dict)
                self._entities[entity.id] = entity

            logger.info(f"Loaded {len(self._entities)} entities from {self.file_path}")
        except Exception as e:
            logger.error(f"Error loading entities from {self.file_path}: {str(e)}")
            self._entities = {}

    def _save_entities(self) -> None:
        """Save entities to the JSON file."""
        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(self.file_path), exist_ok=True)

            # Convert entities to dictionaries
            entity_dicts = []
            for entity in self._entities.values():
                entity_dict = entity.__dict__.copy()

                # Convert datetime objects to ISO format strings
                if "created_at" in entity_dict:
                    entity_dict["created_at"] = entity_dict["created_at"].isoformat()
                if "updated_at" in entity_dict:
                    entity_dict["updated_at"] = entity_dict["updated_at"].isoformat()

                entity_dicts.append(entity_dict)

            # Write to file
            with open(self.file_path, "w") as f:
                json.dump(entity_dicts, f, indent=2)

            logger.info(f"Saved {len(self._entities)} entities to {self.file_path}")
        except Exception as e:
            logger.error(f"Error saving entities to {self.file_path}: {str(e)}")

    def save(self, entity: E) -> E:
        """
        Save an entity.

        Args:
            entity: The entity to save

        Returns:
            The saved entity
        """
        # Update the updated_at timestamp
        entity.updated_at = datetime.now()
        return super().save(entity)


class JsonClusterRepository(JsonFileRepository[Cluster], ClusterRepository):
    """JSON file-based implementation of the ClusterRepository interface."""

    def __init__(self, file_path: str):
        """
        Initialize a JSON file-based cluster repository.

        Args:
            file_path: Path to the JSON file where clusters are stored
        """
        super().__init__(file_path, Cluster)

    def find_by_name(self, name: str) -> Optional[Cluster]:
        """
        Find a cluster by its name.

        Args:
            name: The name of the cluster to find

        Returns:
            The cluster if found, None otherwise
        """
        for cluster in self._entities.values():
            if cluster.name == name:
                return cluster
        return None

    def find_by_environment(self, environment: str) -> List[Cluster]:
        """
        Find clusters by environment.

        Args:
            environment: The environment to filter by

        Returns:
            A list of clusters in the specified environment
        """
        return [
            cluster
            for cluster in self._entities.values()
            if cluster.environment == environment
        ]

    def find_by_status(self, status: str) -> List[Cluster]:
        """
        Find clusters by status.

        Args:
            status: The status to filter by

        Returns:
            A list of clusters with the specified status
        """
        return [
            cluster for cluster in self._entities.values() if cluster.status == status
        ]


class JsonTaskRepository(JsonFileRepository[Task], TaskRepository):
    """JSON file-based implementation of the TaskRepository interface."""

    def __init__(self, file_path: str):
        """
        Initialize a JSON file-based task repository.

        Args:
            file_path: Path to the JSON file where tasks are stored
        """
        super().__init__(file_path, Task)

    def find_by_cluster_id(self, cluster_id: str) -> List[Task]:
        """
        Find tasks by cluster ID.

        Args:
            cluster_id: The ID of the cluster to filter by

        Returns:
            A list of tasks associated with the specified cluster
        """
        return [
            task for task in self._entities.values() if task.cluster_id == cluster_id
        ]

    def find_by_status(self, status: str) -> List[Task]:
        """
        Find tasks by status.

        Args:
            status: The status to filter by

        Returns:
            A list of tasks with the specified status
        """
        return [task for task in self._entities.values() if task.status == status]

    def find_pending_tasks(self) -> List[Task]:
        """
        Find pending tasks.

        Returns:
            A list of tasks with status 'pending'
        """
        return self.find_by_status("pending")


class JsonApplicationRepository(JsonFileRepository[Application], ApplicationRepository):
    """JSON file-based implementation of the ApplicationRepository interface."""

    def __init__(self, file_path: str):
        """
        Initialize a JSON file-based application repository.

        Args:
            file_path: Path to the JSON file where applications are stored
        """
        super().__init__(file_path, Application)

    def find_by_cluster_id(self, cluster_id: str) -> List[Application]:
        """
        Find applications by cluster ID.

        Args:
            cluster_id: The ID of the cluster to filter by

        Returns:
            A list of applications deployed on the specified cluster
        """
        return [app for app in self._entities.values() if app.cluster_id == cluster_id]

    def find_by_name(self, name: str) -> Optional[Application]:
        """
        Find an application by its name.

        Args:
            name: The name of the application to find

        Returns:
            The application if found, None otherwise
        """
        for app in self._entities.values():
            if app.name == name:
                return app
        return None

    def find_by_status(self, status: str) -> List[Application]:
        """
        Find applications by status.

        Args:
            status: The status to filter by

        Returns:
            A list of applications with the specified status
        """
        return [app for app in self._entities.values() if app.status == status]


class JsonUserRepository(JsonFileRepository[User], UserRepository):
    """JSON file-based implementation of the UserRepository interface."""

    def __init__(self, file_path: str):
        """
        Initialize a JSON file-based user repository.

        Args:
            file_path: Path to the JSON file where users are stored
        """
        super().__init__(file_path, User)

    def find_by_username(self, username: str) -> Optional[User]:
        """
        Find a user by username.

        Args:
            username: The username to search for

        Returns:
            The user if found, None otherwise
        """
        for user in self._entities.values():
            if user.username == username:
                return user
        return None

    def find_by_email(self, email: str) -> Optional[User]:
        """
        Find a user by email.

        Args:
            email: The email to search for

        Returns:
            The user if found, None otherwise
        """
        for user in self._entities.values():
            if user.email == email:
                return user
        return None

    def find_by_role(self, role: str) -> List[User]:
        """
        Find users by role.

        Args:
            role: The role to filter by

        Returns:
            A list of users with the specified role
        """
        return [user for user in self._entities.values() if user.role == role]
