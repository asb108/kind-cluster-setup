"""
Kind-specific command execution and abstractions.

This module provides classes for interacting with Kind (Kubernetes IN Docker)
through the kind command-line tool, using the CommandExecutor abstraction.
"""

import os
from typing import Any, Dict, List, Optional, Union

import yaml

from kind_cluster_setup.core.command import (CommandExecutionError,
                                             CommandExecutor, CommandResult)


class KindClient:
    """
    Client for interacting with Kind through the kind CLI.

    This class provides methods for executing kind commands using
    the CommandExecutor abstraction, making it more testable and flexible.
    """

    def __init__(self, executor: CommandExecutor):
        """
        Initialize the kind client.

        Args:
            executor: CommandExecutor to use for executing kind commands
        """
        self.executor = executor

    def execute(self, args: List[str], check: bool = True) -> CommandResult:
        """
        Execute a kind command with the given arguments.

        Args:
            args: List of kind arguments
            check: Whether to raise an exception if the command fails

        Returns:
            CommandResult object containing returncode, stdout, and stderr

        Raises:
            CommandExecutionError: If check is True and the command fails
        """
        # Build the command
        command = ["kind"]

        # Add the arguments
        command.extend(args)

        # Execute the command
        return self.executor.execute(command, check=check)

    def is_installed(self) -> bool:
        """
        Check if Kind is installed.

        Returns:
            True if Kind is installed, False otherwise
        """
        try:
            result = self.execute(["version"], check=False)
            return result.success
        except Exception:
            return False

    def get_clusters(self) -> List[str]:
        """
        Get the list of Kind clusters.

        Returns:
            List of cluster names

        Raises:
            CommandExecutionError: If the command fails
        """
        # Execute the command
        result = self.execute(["get", "clusters"])

        # Parse the output
        if not result.stdout.strip():
            return []

        return result.stdout.strip().split("\n")

    def create_cluster(
        self,
        name: str,
        config_file: Optional[str] = None,
        image: Optional[str] = None,
        wait: Optional[str] = None,
    ) -> CommandResult:
        """
        Create a Kind cluster.

        Args:
            name: Cluster name
            config_file: Path to cluster configuration file
            image: Node image to use
            wait: Wait duration for control plane to be ready

        Returns:
            CommandResult object containing returncode, stdout, and stderr

        Raises:
            CommandExecutionError: If the command fails
        """
        # Build the arguments
        args = ["create", "cluster", "--name", name]

        # Add config file if provided
        if config_file:
            args.extend(["--config", config_file])

        # Add image if provided
        if image:
            args.extend(["--image", image])

        # Add wait if provided
        if wait:
            args.extend(["--wait", wait])

        # Execute the command
        return self.execute(args)

    def delete_cluster(self, name: str) -> CommandResult:
        """
        Delete a Kind cluster.

        Args:
            name: Cluster name

        Returns:
            CommandResult object containing returncode, stdout, and stderr

        Raises:
            CommandExecutionError: If the command fails
        """
        # Execute the command
        return self.execute(["delete", "cluster", "--name", name])

    def export_kubeconfig(
        self, name: str, path: Optional[str] = None, internal: bool = False
    ) -> CommandResult:
        """
        Export kubeconfig for a Kind cluster.

        Args:
            name: Cluster name
            path: Path to write kubeconfig to
            internal: Whether to use internal IP addresses

        Returns:
            CommandResult object containing returncode, stdout, and stderr

        Raises:
            CommandExecutionError: If the command fails
        """
        # Build the arguments
        args = ["export", "kubeconfig", "--name", name]

        # Add path if provided
        if path:
            args.extend(["--kubeconfig", path])

        # Add internal flag if requested
        if internal:
            args.append("--internal")

        # Execute the command
        return self.execute(args)

    def load_docker_image(self, image_name: str, cluster_name: str) -> CommandResult:
        """
        Load a Docker image into a Kind cluster.

        Args:
            image_name: Docker image name
            cluster_name: Cluster name

        Returns:
            CommandResult object containing returncode, stdout, and stderr

        Raises:
            CommandExecutionError: If the command fails
        """
        # Execute the command
        return self.execute(
            ["load", "docker-image", image_name, "--name", cluster_name]
        )

    def get_nodes(self, cluster_name: str) -> List[str]:
        """
        Get the list of nodes in a Kind cluster.

        Args:
            cluster_name: Cluster name

        Returns:
            List of node names

        Raises:
            CommandExecutionError: If the command fails
        """
        # Execute the command
        result = self.execute(["get", "nodes", "--name", cluster_name])

        # Parse the output
        if not result.stdout.strip():
            return []

        return result.stdout.strip().split("\n")
