"""
Command execution abstractions for the Kind Setup project.

This module provides interfaces and implementations for executing shell commands,
allowing for better testability and flexibility.
"""

import os
import subprocess
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Union


@dataclass
class CommandResult:
    """Result of a command execution."""

    returncode: int
    stdout: str
    stderr: str

    @property
    def success(self) -> bool:
        """Return True if the command was successful (returncode == 0)."""
        return self.returncode == 0


class CommandExecutor(ABC):
    """
    Abstract interface for command execution.

    This interface decouples the code from direct subprocess calls,
    making it more testable and flexible.
    """

    @abstractmethod
    def execute(
        self,
        command: List[str],
        env: Optional[Dict[str, str]] = None,
        cwd: Optional[str] = None,
        check: bool = True,
        timeout: Optional[float] = None,
    ) -> CommandResult:
        """
        Execute a command and return the result.

        Args:
            command: List of command parts to execute
            env: Environment variables to set for the command
            cwd: Working directory for the command
            check: Whether to raise an exception if the command fails
            timeout: Timeout in seconds

        Returns:
            CommandResult object containing returncode, stdout, and stderr

        Raises:
            CommandExecutionError: If check is True and the command fails
        """
        pass


class CommandExecutionError(Exception):
    """Exception raised when a command execution fails."""

    def __init__(self, command: List[str], result: CommandResult):
        self.command = command
        self.result = result
        message = (
            f"Command '{' '.join(command)}' failed with exit code {result.returncode}.\n"
            f"STDOUT: {result.stdout}\n"
            f"STDERR: {result.stderr}"
        )
        super().__init__(message)


class SubprocessCommandExecutor(CommandExecutor):
    """
    Implementation of CommandExecutor using subprocess.

    This is the default implementation that uses Python's subprocess module
    to execute commands.
    """

    def execute(
        self,
        command: List[str],
        env: Optional[Dict[str, str]] = None,
        cwd: Optional[str] = None,
        check: bool = True,
        timeout: Optional[float] = None,
    ) -> CommandResult:
        """
        Execute a command using subprocess and return the result.

        Args:
            command: List of command parts to execute
            env: Environment variables to set for the command
            cwd: Working directory for the command
            check: Whether to raise an exception if the command fails
            timeout: Timeout in seconds

        Returns:
            CommandResult object containing returncode, stdout, and stderr

        Raises:
            CommandExecutionError: If check is True and the command fails
            subprocess.TimeoutExpired: If the command times out
        """
        # Prepare environment
        env_copy = os.environ.copy()
        if env:
            env_copy.update(env)

        try:
            # Execute the command
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                env=env_copy,
                cwd=cwd,
                timeout=timeout,
            )

            # Create the result object
            command_result = CommandResult(
                returncode=result.returncode, stdout=result.stdout, stderr=result.stderr
            )

            # Check if the command failed
            if check and not command_result.success:
                raise CommandExecutionError(command, command_result)

            return command_result

        except subprocess.TimeoutExpired as e:
            # Create a result object for timeout
            command_result = CommandResult(
                returncode=-1,
                stdout="",
                stderr=f"Command timed out after {timeout} seconds",
            )

            if check:
                raise CommandExecutionError(command, command_result) from e

            return command_result


class MockCommandExecutor(CommandExecutor):
    """
    Mock implementation of CommandExecutor for testing.

    This implementation returns predefined results for commands,
    allowing for deterministic testing without executing real commands.
    """

    def __init__(self, mock_results: Dict[str, CommandResult] = None):
        """
        Initialize the mock executor with predefined results.

        Args:
            mock_results: Dictionary mapping command strings to CommandResult objects
        """
        self.mock_results = mock_results or {}
        self.executed_commands = []
        self.default_result = None
        self.command_history = []

    def add_mock_result(
        self, command: Union[str, List[str]], result: CommandResult
    ) -> None:
        """
        Add a mock result for a command.

        Args:
            command: Command string or list to mock
            result: Result to return when the command is executed
        """
        if isinstance(command, list):
            command = " ".join(command)
        self.mock_results[command] = result

    def add_default_mock_result(self, result: CommandResult) -> None:
        """
        Add a default mock result for any command that doesn't have a specific mock.

        Args:
            result: Result to return when a command without a specific mock is executed
        """
        self.default_result = result

    def execute(
        self,
        command: List[str],
        env: Optional[Dict[str, str]] = None,
        cwd: Optional[str] = None,
        check: bool = True,
        timeout: Optional[float] = None,
    ) -> CommandResult:
        """
        Return a predefined result for the command.

        Args:
            command: List of command parts to execute
            env: Environment variables (ignored in mock)
            cwd: Working directory (ignored in mock)
            check: Whether to raise an exception if the command fails
            timeout: Timeout in seconds (ignored in mock)

        Returns:
            Predefined CommandResult for the command

        Raises:
            CommandExecutionError: If check is True and the mocked command fails
            KeyError: If no mock result is defined for the command
        """
        # Convert command list to string for lookup
        command_str = " ".join(command)

        # Record the executed command
        self.executed_commands.append({"command": command, "env": env, "cwd": cwd})

        # Add to command history
        self.command_history.append(command_str)

        # Get the mock result
        if command_str in self.mock_results:
            command_result = self.mock_results[command_str]
        else:
            # If no exact match, try to find a partial match
            for mock_cmd, result in self.mock_results.items():
                if mock_cmd in command_str:
                    command_result = result
                    break
            else:
                # If no match found, use default result if available
                if self.default_result is not None:
                    command_result = self.default_result
                else:
                    raise KeyError(f"No mock result defined for command: {command_str}")

        # Check if the command failed
        if check and not command_result.success:
            raise CommandExecutionError(command, command_result)

        return command_result
