"""Task persistence module for Kind Cluster Setup API.

This module provides functionality to persist task statuses across server restarts.
"""

import json
import logging
import os
import threading
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class TaskStore:
    """Base class for task storage implementations.

    This class defines the interface for storing and retrieving task statuses.
    """

    def get_all_tasks(self) -> Dict[str, Dict[str, Any]]:
        """Get all stored tasks.

        Returns:
            Dictionary mapping task IDs to task status dictionaries
        """
        raise NotImplementedError("Subclasses must implement get_all_tasks")

    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific task by ID.

        Args:
            task_id: The ID of the task to retrieve

        Returns:
            Task status dictionary or None if not found
        """
        raise NotImplementedError("Subclasses must implement get_task")

    def save_task(self, task_id: str, task_data: Dict[str, Any]) -> None:
        """Save a task status.

        Args:
            task_id: The ID of the task to save
            task_data: The task status dictionary to save
        """
        raise NotImplementedError("Subclasses must implement save_task")

    def delete_task(self, task_id: str) -> bool:
        """Delete a task status.

        Args:
            task_id: The ID of the task to delete

        Returns:
            True if the task was deleted, False if it wasn't found
        """
        raise NotImplementedError("Subclasses must implement delete_task")


class MemoryTaskStore(TaskStore):
    """In-memory implementation of task storage.

    This implementation stores tasks in memory and does not persist them
    across server restarts.
    """

    def __init__(self):
        """Initialize the in-memory task store."""
        self.tasks: Dict[str, Dict[str, Any]] = {}
        self.lock = threading.Lock()

    def get_all_tasks(self) -> Dict[str, Dict[str, Any]]:
        """Get all stored tasks."""
        with self.lock:
            return self.tasks.copy()

    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific task by ID."""
        with self.lock:
            return self.tasks.get(task_id)

    def save_task(self, task_id: str, task_data: Dict[str, Any]) -> None:
        """Save a task status."""
        with self.lock:
            self.tasks[task_id] = task_data

    def delete_task(self, task_id: str) -> bool:
        """Delete a task status."""
        with self.lock:
            if task_id in self.tasks:
                del self.tasks[task_id]
                return True
            return False


class FileTaskStore(TaskStore):
    """File-based implementation of task storage.

    This implementation persists tasks to a JSON file on disk.
    """

    def __init__(self, file_path: str):
        """Initialize the file-based task store.

        Args:
            file_path: Path to the JSON file for storing tasks
        """
        self.file_path = file_path
        self.tasks: Dict[str, Dict[str, Any]] = {}
        self.lock = threading.Lock()

        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(file_path), exist_ok=True)

        # Load existing tasks if file exists
        self._load_tasks()

    def _load_tasks(self) -> None:
        """Load tasks from the file."""
        if not os.path.exists(self.file_path):
            return

        try:
            with open(self.file_path, "r") as f:
                self.tasks = json.load(f)
            logger.info(f"Loaded {len(self.tasks)} tasks from {self.file_path}")
        except Exception as e:
            logger.error(f"Failed to load tasks from {self.file_path}: {str(e)}")
            # Initialize with empty dict if file is corrupted
            self.tasks = {}

    def _save_to_file(self) -> None:
        """Save tasks to the file."""
        try:
            with open(self.file_path, "w") as f:
                json.dump(self.tasks, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save tasks to {self.file_path}: {str(e)}")

    def get_all_tasks(self) -> Dict[str, Dict[str, Any]]:
        """Get all stored tasks."""
        with self.lock:
            return self.tasks.copy()

    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific task by ID."""
        with self.lock:
            return self.tasks.get(task_id)

    def save_task(self, task_id: str, task_data: Dict[str, Any]) -> None:
        """Save a task status."""
        with self.lock:
            self.tasks[task_id] = task_data
            self._save_to_file()

    def delete_task(self, task_id: str) -> bool:
        """Delete a task status."""
        with self.lock:
            if task_id in self.tasks:
                del self.tasks[task_id]
                self._save_to_file()
                return True
            return False


def get_task_store(
    persistence_type: str = "memory", file_path: Optional[str] = None
) -> TaskStore:
    """Factory function to get the appropriate task store.

    Args:
        persistence_type: Type of persistence to use ("memory" or "file")
        file_path: Path to the JSON file for storing tasks (required for "file" type)

    Returns:
        TaskStore instance
    """
    if persistence_type == "file" and file_path:
        logger.info(f"Using file-based task store at {file_path}")
        return FileTaskStore(file_path)
    else:
        logger.info("Using in-memory task store")
        return MemoryTaskStore()
