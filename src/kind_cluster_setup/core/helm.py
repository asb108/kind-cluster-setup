"""
Helm-specific command execution and abstractions.

This module provides classes for interacting with Helm through
the helm command-line tool, using the CommandExecutor abstraction.
"""

import json
from typing import Any, Dict, List, Optional, Union

import yaml

from kind_cluster_setup.core.command import (
    CommandExecutionError,
    CommandExecutor,
    CommandResult,
)


class HelmClient:
    """
    Client for interacting with Helm through the helm CLI.

    This class provides methods for executing helm commands using
    the CommandExecutor abstraction, making it more testable and flexible.
    """

    def __init__(self, executor: CommandExecutor):
        """
        Initialize the helm client.

        Args:
            executor: CommandExecutor to use for executing helm commands
        """
        self.executor = executor

    def execute(
        self, args: List[str], kubeconfig: Optional[str] = None, check: bool = True
    ) -> CommandResult:
        """
        Execute a helm command with the given arguments.

        Args:
            args: List of helm arguments
            kubeconfig: Path to kubeconfig file
            check: Whether to raise an exception if the command fails

        Returns:
            CommandResult object containing returncode, stdout, and stderr

        Raises:
            CommandExecutionError: If check is True and the command fails
        """
        # Build the command
        command = ["helm"]

        # Add the arguments
        command.extend(args)

        # Prepare environment
        env = {}
        if kubeconfig:
            env["KUBECONFIG"] = kubeconfig

        # Execute the command
        return self.executor.execute(command, env=env, check=check)

    def is_installed(self) -> bool:
        """
        Check if Helm is installed.

        Returns:
            True if Helm is installed, False otherwise
        """
        try:
            result = self.execute(["version", "--short"], check=False)
            return result.success
        except Exception:
            return False

    def list_releases(
        self,
        namespace: Optional[str] = None,
        all_namespaces: bool = False,
        output_format: str = "json",
        kubeconfig: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        List Helm releases.

        Args:
            namespace: Kubernetes namespace
            all_namespaces: Whether to list releases in all namespaces
            output_format: Output format (json or yaml)
            kubeconfig: Path to kubeconfig file

        Returns:
            List of release objects

        Raises:
            CommandExecutionError: If the command fails
        """
        # Build the arguments
        args = ["list", "-o", output_format]

        # Add namespace if provided
        if namespace:
            args.extend(["-n", namespace])

        # Add all namespaces flag if requested
        if all_namespaces:
            args.append("--all-namespaces")

        # Execute the command
        result = self.execute(args, kubeconfig=kubeconfig)

        # Parse the output
        if not result.stdout.strip():
            return []

        if output_format == "json":
            return json.loads(result.stdout)
        elif output_format == "yaml":
            return yaml.safe_load(result.stdout)
        else:
            raise ValueError(f"Unsupported output format: {output_format}")

    def install_or_upgrade(
        self,
        release_name: str,
        chart: str,
        namespace: str,
        values_file: Optional[str] = None,
        set_values: Optional[Dict[str, str]] = None,
        version: Optional[str] = None,
        create_namespace: bool = True,
        wait: bool = False,
        timeout: Optional[str] = None,
        kubeconfig: Optional[str] = None,
    ) -> CommandResult:
        """
        Install or upgrade a Helm chart.

        Args:
            release_name: Release name
            chart: Chart name or path
            namespace: Kubernetes namespace
            values_file: Path to values file
            set_values: Dictionary of values to set
            version: Chart version
            create_namespace: Whether to create the namespace if it doesn't exist
            wait: Whether to wait for the release to be ready
            timeout: Timeout duration (e.g., 5m)
            kubeconfig: Path to kubeconfig file

        Returns:
            CommandResult object containing returncode, stdout, and stderr

        Raises:
            CommandExecutionError: If the command fails
        """
        # Build the arguments
        args = ["upgrade", "--install", release_name, chart, "-n", namespace]

        # Add values file if provided
        if values_file:
            args.extend(["-f", values_file])

        # Add set values if provided
        if set_values:
            for key, value in set_values.items():
                args.extend(["--set", f"{key}={value}"])

        # Add version if provided
        if version:
            args.extend(["--version", version])

        # Add create namespace flag if requested
        if create_namespace:
            args.append("--create-namespace")

        # Add wait flag if requested
        if wait:
            args.append("--wait")

        # Add timeout if provided
        if timeout:
            args.extend(["--timeout", timeout])

        # Execute the command
        return self.execute(args, kubeconfig=kubeconfig)

    def uninstall(
        self,
        release_name: str,
        namespace: str,
        wait: bool = False,
        timeout: Optional[str] = None,
        kubeconfig: Optional[str] = None,
    ) -> CommandResult:
        """
        Uninstall a Helm release.

        Args:
            release_name: Release name
            namespace: Kubernetes namespace
            wait: Whether to wait for the release to be uninstalled
            timeout: Timeout duration (e.g., 5m)
            kubeconfig: Path to kubeconfig file

        Returns:
            CommandResult object containing returncode, stdout, and stderr

        Raises:
            CommandExecutionError: If the command fails
        """
        # Build the arguments
        args = ["uninstall", release_name, "-n", namespace]

        # Add wait flag if requested
        if wait:
            args.append("--wait")

        # Add timeout if provided
        if timeout:
            args.extend(["--timeout", timeout])

        # Execute the command
        return self.execute(args, kubeconfig=kubeconfig)

    def get_values(
        self,
        release_name: str,
        namespace: str,
        all_values: bool = False,
        output_format: str = "json",
        kubeconfig: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Get values for a Helm release.

        Args:
            release_name: Release name
            namespace: Kubernetes namespace
            all_values: Whether to get all values (including defaults)
            output_format: Output format (json or yaml)
            kubeconfig: Path to kubeconfig file

        Returns:
            Dictionary of values

        Raises:
            CommandExecutionError: If the command fails
        """
        # Build the arguments
        args = ["get", "values", release_name, "-n", namespace, "-o", output_format]

        # Add all flag if requested
        if all_values:
            args.append("--all")

        # Execute the command
        result = self.execute(args, kubeconfig=kubeconfig)

        # Parse the output
        if not result.stdout.strip():
            return {}

        if output_format == "json":
            return json.loads(result.stdout)
        elif output_format == "yaml":
            return yaml.safe_load(result.stdout)
        else:
            raise ValueError(f"Unsupported output format: {output_format}")
