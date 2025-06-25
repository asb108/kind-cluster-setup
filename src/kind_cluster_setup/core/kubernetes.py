"""
Kubernetes-specific command execution and abstractions.

This module provides classes for interacting with Kubernetes through
the kubectl command-line tool, using the CommandExecutor abstraction.
"""

import os
import json
import yaml
from typing import Dict, List, Optional, Any, Union

from kind_cluster_setup.core.command import CommandExecutor, CommandResult, CommandExecutionError


class KubectlClient:
    """
    Client for interacting with Kubernetes through kubectl.

    This class provides methods for executing kubectl commands using
    the CommandExecutor abstraction, making it more testable and flexible.
    """

    def __init__(self, executor: CommandExecutor):
        """
        Initialize the kubectl client.

        Args:
            executor: CommandExecutor to use for executing kubectl commands
        """
        self.executor = executor

    def execute(self,
                args: List[str],
                context: Optional[str] = None,
                namespace: Optional[str] = None,
                kubeconfig: Optional[str] = None,
                check: bool = True) -> CommandResult:
        """
        Execute a kubectl command with the given arguments.

        Args:
            args: List of kubectl arguments
            context: Kubernetes context to use
            namespace: Kubernetes namespace to use
            kubeconfig: Path to kubeconfig file
            check: Whether to raise an exception if the command fails

        Returns:
            CommandResult object containing returncode, stdout, and stderr

        Raises:
            CommandExecutionError: If check is True and the command fails
        """
        # Build the command
        command = ["kubectl"]

        # Add context if provided
        if context:
            command.extend(["--context", context])

        # Add namespace if provided
        if namespace:
            command.extend(["--namespace", namespace])

        # Add the arguments
        command.extend(args)

        # Prepare environment
        env = {}
        if kubeconfig:
            env["KUBECONFIG"] = kubeconfig

        # Execute the command
        return self.executor.execute(command, env=env, check=check)

    def get_nodes(self,
                 context: Optional[str] = None,
                 output_format: str = "json",
                 kubeconfig: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get the list of nodes in the cluster.

        Args:
            context: Kubernetes context to use
            output_format: Output format (json or yaml)
            kubeconfig: Path to kubeconfig file

        Returns:
            List of node objects

        Raises:
            CommandExecutionError: If the command fails
        """
        # Build the arguments
        args = ["get", "nodes", "-o", output_format]

        # Execute the command
        result = self.execute(args, context=context, kubeconfig=kubeconfig)

        # Parse the output
        if output_format == "json":
            return json.loads(result.stdout).get("items", [])
        elif output_format == "yaml":
            return yaml.safe_load(result.stdout).get("items", [])
        else:
            raise ValueError(f"Unsupported output format: {output_format}")

    def get_pods(self,
                namespace: str,
                context: Optional[str] = None,
                selector: Optional[str] = None,
                output_format: str = "json",
                kubeconfig: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get the list of pods in the namespace.

        Args:
            namespace: Kubernetes namespace
            context: Kubernetes context to use
            selector: Label selector for filtering pods
            output_format: Output format (json or yaml)
            kubeconfig: Path to kubeconfig file

        Returns:
            List of pod objects

        Raises:
            CommandExecutionError: If the command fails
        """
        # Build the arguments
        args = ["get", "pods", "-o", output_format]

        # Add selector if provided
        if selector:
            args.extend(["-l", selector])

        # Execute the command
        result = self.execute(
            args,
            context=context,
            namespace=namespace,
            kubeconfig=kubeconfig
        )

        # Parse the output
        if output_format == "json":
            return json.loads(result.stdout).get("items", [])
        elif output_format == "yaml":
            return yaml.safe_load(result.stdout).get("items", [])
        else:
            raise ValueError(f"Unsupported output format: {output_format}")

    def apply(self,
             files: List[str],
             context: Optional[str] = None,
             namespace: Optional[str] = None,
             kubeconfig: Optional[str] = None) -> CommandResult:
        """
        Apply Kubernetes manifests from files.

        Args:
            files: List of file paths to apply
            context: Kubernetes context to use
            namespace: Kubernetes namespace to use
            kubeconfig: Path to kubeconfig file

        Returns:
            CommandResult object containing returncode, stdout, and stderr

        Raises:
            CommandExecutionError: If the command fails
        """
        # Build the arguments
        args = ["apply"]

        # Add files
        for file_path in files:
            args.extend(["-f", file_path])

        # Execute the command
        return self.execute(
            args,
            context=context,
            namespace=namespace,
            kubeconfig=kubeconfig
        )

    def wait_for_condition(self,
                          resource_type: str,
                          resource_name: Optional[str] = None,
                          condition: str = "Ready",
                          selector: Optional[str] = None,
                          timeout: str = "60s",
                          context: Optional[str] = None,
                          namespace: Optional[str] = None,
                          kubeconfig: Optional[str] = None) -> CommandResult:
        """
        Wait for a condition on a Kubernetes resource.

        Args:
            resource_type: Type of resource (e.g., pod, deployment)
            resource_name: Name of the resource (optional)
            condition: Condition to wait for (e.g., Ready)
            selector: Label selector for filtering resources
            timeout: Timeout duration (e.g., 60s, 5m)
            context: Kubernetes context to use
            namespace: Kubernetes namespace to use
            kubeconfig: Path to kubeconfig file

        Returns:
            CommandResult object containing returncode, stdout, and stderr

        Raises:
            CommandExecutionError: If the command fails
        """
        # Build the arguments
        args = ["wait", resource_type]

        # Add resource name if provided
        if resource_name:
            args.append(resource_name)

        # Add condition
        args.extend(["--for", f"condition={condition}"])

        # Add selector if provided
        if selector:
            args.extend(["--selector", selector])

        # Add timeout
        args.extend(["--timeout", timeout])

        # Execute the command
        return self.execute(
            args,
            context=context,
            namespace=namespace,
            kubeconfig=kubeconfig
        )

    def expose(self,
              resource: str,
              name: str,
              port: Union[int, str],
              target_port: Optional[Union[int, str]] = None,
              type: str = "ClusterIP",
              protocol: str = "TCP",
              context: Optional[str] = None,
              namespace: Optional[str] = None,
              kubeconfig: Optional[str] = None) -> CommandResult:
        """
        Expose a Kubernetes resource as a service.

        Args:
            resource: Type of resource to expose (e.g., deployment, pod)
            name: Name of the resource to expose
            port: Port that the service should serve on
            target_port: Port that the container accepts traffic on
            type: Type of service to create (ClusterIP, NodePort, LoadBalancer)
            protocol: Protocol for the service (TCP, UDP)
            context: Kubernetes context to use
            namespace: Kubernetes namespace to use
            kubeconfig: Path to kubeconfig file

        Returns:
            CommandResult object containing returncode, stdout, and stderr

        Raises:
            CommandExecutionError: If the command fails
        """
        # Build the arguments
        args = ["expose", resource, name, f"--port={port}"]

        # Add target port if provided
        if target_port:
            args.append(f"--target-port={target_port}")

        # Add type
        args.append(f"--type={type}")

        # Add protocol
        args.append(f"--protocol={protocol}")

        # Execute the command
        return self.execute(
            args,
            context=context,
            namespace=namespace,
            kubeconfig=kubeconfig
        )

    def get(self,
           resource: str,
           name: Optional[str] = None,
           selector: Optional[str] = None,
           output: Optional[str] = None,
           context: Optional[str] = None,
           namespace: Optional[str] = None,
           kubeconfig: Optional[str] = None) -> CommandResult:
        """
        Get information about Kubernetes resources.

        Args:
            resource: Type of resource to get (e.g., pod, deployment, service)
            name: Name of the resource (optional)
            selector: Label selector for filtering resources
            output: Output format (e.g., json, yaml, wide)
            context: Kubernetes context to use
            namespace: Kubernetes namespace to use
            kubeconfig: Path to kubeconfig file

        Returns:
            CommandResult object containing returncode, stdout, and stderr

        Raises:
            CommandExecutionError: If the command fails
        """
        # Build the arguments
        args = ["get", resource]

        # Add resource name if provided
        if name:
            args.append(name)

        # Add selector if provided
        if selector:
            args.extend(["-l", selector])

        # Add output format if provided
        if output:
            args.extend(["-o", output])

        # Execute the command
        return self.execute(
            args,
            context=context,
            namespace=namespace,
            kubeconfig=kubeconfig,
            check=False
        )
