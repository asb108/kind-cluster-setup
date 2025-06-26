"""
Docker-specific command execution and abstractions.

This module provides classes for interacting with Docker through
the docker command-line tool, using the CommandExecutor abstraction.
"""

import json
from typing import Any, Dict, List, Optional, Union

from kind_cluster_setup.core.command import (
    CommandExecutionError,
    CommandExecutor,
    CommandResult,
)


class DockerClient:
    """
    Client for interacting with Docker through the docker CLI.

    This class provides methods for executing docker commands using
    the CommandExecutor abstraction, making it more testable and flexible.
    """

    def __init__(self, executor: CommandExecutor):
        """
        Initialize the docker client.

        Args:
            executor: CommandExecutor to use for executing docker commands
        """
        self.executor = executor

    def execute(self, args: List[str], check: bool = True) -> CommandResult:
        """
        Execute a docker command with the given arguments.

        Args:
            args: List of docker arguments
            check: Whether to raise an exception if the command fails

        Returns:
            CommandResult object containing returncode, stdout, and stderr

        Raises:
            CommandExecutionError: If check is True and the command fails
        """
        # Build the command
        command = ["docker"]

        # Add the arguments
        command.extend(args)

        # Execute the command
        return self.executor.execute(command, check=check)

    def is_running(self) -> bool:
        """
        Check if Docker is running.

        Returns:
            True if Docker is running, False otherwise
        """
        try:
            result = self.execute(["ps"], check=False)
            return result.success
        except Exception:
            return False

    def get_containers(
        self, all_containers: bool = False, filter_expr: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get the list of containers.

        Args:
            all_containers: Whether to include stopped containers
            filter_expr: Filter expression (e.g., "name=kind")

        Returns:
            List of container objects

        Raises:
            CommandExecutionError: If the command fails
        """
        # Build the arguments
        args = ["ps", "--format", "json"]

        # Add all flag if requested
        if all_containers:
            args.append("--all")

        # Add filter if provided
        if filter_expr:
            args.extend(["--filter", filter_expr])

        # Execute the command
        result = self.execute(args)

        # Parse the output - handle both single JSON object and array of objects
        if not result.stdout.strip():
            return []

        try:
            # Try parsing as a JSON array
            containers = json.loads(result.stdout)
            if isinstance(containers, dict):
                # Single container returned
                return [containers]
            return containers
        except json.JSONDecodeError:
            # Handle case where each line is a separate JSON object
            containers = []
            for line in result.stdout.strip().split("\n"):
                if line.strip():
                    containers.append(json.loads(line))
            return containers

    def update_container(
        self,
        container_id: str,
        cpu_limit: Optional[str] = None,
        memory_limit: Optional[str] = None,
        memory_swap: Optional[str] = None,
    ) -> CommandResult:
        """
        Update container resource limits.

        Args:
            container_id: Container ID or name
            cpu_limit: CPU limit (e.g., "1.5")
            memory_limit: Memory limit (e.g., "2g")
            memory_swap: Memory swap limit (e.g., "4g")

        Returns:
            CommandResult object containing returncode, stdout, and stderr

        Raises:
            CommandExecutionError: If the command fails
        """
        # Build the arguments
        args = ["update"]

        # Add resource limits if provided
        if cpu_limit:
            args.extend(["--cpus", cpu_limit])

        if memory_limit:
            args.extend(["--memory", memory_limit])

        if memory_swap:
            args.extend(["--memory-swap", memory_swap])

        # Add container ID
        args.append(container_id)

        # Execute the command
        return self.execute(args)

    def inspect_container(
        self, container_id: str, format_expr: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Inspect a container.

        Args:
            container_id: Container ID or name
            format_expr: Format expression (e.g., "{{.State.Status}}")

        Returns:
            Container details as a dictionary

        Raises:
            CommandExecutionError: If the command fails
        """
        # Build the arguments
        args = ["inspect"]

        # Add format if provided
        if format_expr:
            args.extend(["--format", format_expr])

        # Add container ID
        args.append(container_id)

        # Execute the command
        result = self.execute(args)

        # Parse the output
        if format_expr:
            # If a format was specified, return the raw output
            return {"output": result.stdout.strip()}
        else:
            # Otherwise, parse as JSON
            return json.loads(result.stdout)[0]
