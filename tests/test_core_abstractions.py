"""
Tests for the core abstractions.

This module contains tests for the core abstractions in the kind_cluster_setup.core package.
"""

import os
import unittest
from unittest.mock import MagicMock, patch

from kind_cluster_setup.core.cluster import (Cluster, ClusterConfig,
                                             ClusterManager, EnvironmentConfig)
from kind_cluster_setup.core.command import (CommandResult,
                                             MockCommandExecutor,
                                             SubprocessCommandExecutor)
from kind_cluster_setup.core.deployment import (DeploymentStrategyFactory,
                                                HelmDeploymentStrategy,
                                                KubectlDeploymentStrategy)
from kind_cluster_setup.core.docker import DockerClient
from kind_cluster_setup.core.factory import ClientFactory, create_mock_factory
from kind_cluster_setup.core.helm import HelmClient
from kind_cluster_setup.core.kind import KindClient
from kind_cluster_setup.core.kubernetes import KubectlClient


class TestCommandExecutor(unittest.TestCase):
    """Tests for the CommandExecutor classes."""

    def test_mock_command_executor(self):
        """Test the MockCommandExecutor."""
        # Create a mock executor with predefined results
        mock_executor = MockCommandExecutor()

        # Add mock results
        mock_executor.add_mock_result(
            "docker ps",
            CommandResult(returncode=0, stdout="CONTAINER ID\n123456789", stderr=""),
        )

        mock_executor.add_mock_result(
            "kind get clusters",
            CommandResult(returncode=0, stdout="test-cluster", stderr=""),
        )

        # Execute commands and check results
        result = mock_executor.execute(["docker", "ps"])
        self.assertEqual(result.returncode, 0)
        self.assertIn("CONTAINER ID", result.stdout)

        result = mock_executor.execute(["kind", "get", "clusters"])
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stdout, "test-cluster")

        # Check that executed commands were recorded
        self.assertEqual(len(mock_executor.executed_commands), 2)
        self.assertEqual(
            mock_executor.executed_commands[0]["command"], ["docker", "ps"]
        )
        self.assertEqual(
            mock_executor.executed_commands[1]["command"], ["kind", "get", "clusters"]
        )


class TestDockerClient(unittest.TestCase):
    """Tests for the DockerClient class."""

    def test_docker_client_with_mock_executor(self):
        """Test the DockerClient with a mock executor."""
        # Create a mock executor
        mock_executor = MockCommandExecutor()

        # Add mock results
        mock_executor.add_mock_result(
            "docker ps",
            CommandResult(
                returncode=0,
                stdout='[{"ID":"123456789","Names":"test-container"}]',
                stderr="",
            ),
        )

        mock_executor.add_mock_result(
            "docker update", CommandResult(returncode=0, stdout="", stderr="")
        )

        # Create a docker client with the mock executor
        docker_client = DockerClient(mock_executor)

        # Test is_running
        self.assertTrue(docker_client.is_running())

        # Test get_containers
        containers = docker_client.get_containers()
        self.assertEqual(len(containers), 1)
        self.assertEqual(containers[0]["ID"], "123456789")

        # Test update_container
        result = docker_client.update_container(
            container_id="test-container",
            cpu_limit="1",
            memory_limit="2g",
            memory_swap="4g",
        )
        self.assertTrue(result.success)


class TestKindClient(unittest.TestCase):
    """Tests for the KindClient class."""

    def test_kind_client_with_mock_executor(self):
        """Test the KindClient with a mock executor."""
        # Create a mock executor
        mock_executor = MockCommandExecutor()

        # Add mock results
        mock_executor.add_mock_result(
            "kind version",
            CommandResult(returncode=0, stdout="kind v0.20.0", stderr=""),
        )

        mock_executor.add_mock_result(
            "kind get clusters",
            CommandResult(
                returncode=0, stdout="test-cluster\nother-cluster", stderr=""
            ),
        )

        mock_executor.add_mock_result(
            "kind create cluster",
            CommandResult(returncode=0, stdout="Creating cluster...\nDone!", stderr=""),
        )

        # Create a kind client with the mock executor
        kind_client = KindClient(mock_executor)

        # Test is_installed
        self.assertTrue(kind_client.is_installed())

        # Test get_clusters
        clusters = kind_client.get_clusters()
        self.assertEqual(len(clusters), 2)
        self.assertEqual(clusters[0], "test-cluster")
        self.assertEqual(clusters[1], "other-cluster")

        # Test create_cluster
        result = kind_client.create_cluster(name="new-cluster")
        self.assertTrue(result.success)
        self.assertIn("Creating cluster", result.stdout)


class TestKubectlClient(unittest.TestCase):
    """Tests for the KubectlClient class."""

    def test_kubectl_client_with_mock_executor(self):
        """Test the KubectlClient with a mock executor."""
        # Create a mock executor
        mock_executor = MockCommandExecutor()

        # Add mock results
        mock_executor.add_mock_result(
            "kubectl get nodes",
            CommandResult(
                returncode=0,
                stdout='{"items":[{"metadata":{"name":"node1"}}]}',
                stderr="",
            ),
        )

        mock_executor.add_mock_result(
            "kubectl get pods",
            CommandResult(
                returncode=0,
                stdout='{"items":[{"metadata":{"name":"pod1"}}]}',
                stderr="",
            ),
        )

        # Add the missing mock result for the 'kubectl --namespace default get pods -o json' command
        mock_executor.add_mock_result(
            "kubectl --namespace default get pods -o json",
            CommandResult(
                returncode=0,
                stdout='{"items":[{"metadata":{"name":"pod1"}}]}',
                stderr="",
            ),
        )

        # Create a kubectl client with the mock executor
        kubectl_client = KubectlClient(mock_executor)

        # Test get_nodes
        nodes = kubectl_client.get_nodes()
        self.assertEqual(len(nodes), 1)
        self.assertEqual(nodes[0]["metadata"]["name"], "node1")

        # Test get_pods
        pods = kubectl_client.get_pods(namespace="default")
        self.assertEqual(len(pods), 1)
        self.assertEqual(pods[0]["metadata"]["name"], "pod1")


class TestHelmClient(unittest.TestCase):
    """Tests for the HelmClient class."""

    def test_helm_client_with_mock_executor(self):
        """Test the HelmClient with a mock executor."""
        # Create a mock executor
        mock_executor = MockCommandExecutor()

        # Add mock results
        mock_executor.add_mock_result(
            "helm version", CommandResult(returncode=0, stdout="v3.12.0", stderr="")
        )

        mock_executor.add_mock_result(
            "helm list",
            CommandResult(
                returncode=0,
                stdout='[{"name":"release1","namespace":"default"}]',
                stderr="",
            ),
        )

        # Create a helm client with the mock executor
        helm_client = HelmClient(mock_executor)

        # Test is_installed
        self.assertTrue(helm_client.is_installed())

        # Test list_releases
        releases = helm_client.list_releases()
        self.assertEqual(len(releases), 1)
        self.assertEqual(releases[0]["name"], "release1")


class TestClusterManager(unittest.TestCase):
    """Tests for the ClusterManager class."""

    def test_cluster_manager_with_mock_executor(self):
        """Test the ClusterManager with a mock executor."""
        # Create a mock executor
        mock_executor = MockCommandExecutor()

        # Add mock results
        mock_executor.add_mock_result(
            "docker ps",
            CommandResult(returncode=0, stdout="CONTAINER ID\n123456789", stderr=""),
        )

        mock_executor.add_mock_result(
            "kind version",
            CommandResult(returncode=0, stdout="kind v0.20.0", stderr=""),
        )

        mock_executor.add_mock_result(
            "kind get clusters", CommandResult(returncode=0, stdout="", stderr="")
        )

        mock_executor.add_mock_result(
            "kind create cluster",
            CommandResult(returncode=0, stdout="Creating cluster...\nDone!", stderr=""),
        )

        # Create a cluster manager with the mock executor
        cluster_manager = ClusterManager(mock_executor)

        # Mock the KindClient.is_installed method to return True
        with patch(
            "kind_cluster_setup.core.kind.KindClient.is_installed", return_value=True
        ):
            # Test create_cluster
            cluster_config = ClusterConfig(
                name="test-cluster", worker_nodes=1, apply_resource_limits=True
            )

            env_config = EnvironmentConfig(environment="dev", namespace="default")

            # Mock the _apply_resource_limits method to avoid Docker API calls
            with patch.object(ClusterManager, "_apply_resource_limits"):
                cluster = cluster_manager.create_cluster(cluster_config, env_config)

                self.assertEqual(cluster.name, "test-cluster")
                self.assertEqual(cluster.context, "kind-test-cluster")


class TestDeploymentStrategy(unittest.TestCase):
    """Tests for the DeploymentStrategy classes."""

    def test_deployment_strategy_factory(self):
        """Test the DeploymentStrategyFactory."""
        # Create a mock executor
        mock_executor = MockCommandExecutor()

        # Create a factory
        factory = DeploymentStrategyFactory(mock_executor)

        # Register strategies
        factory.register_strategy("kubectl", KubectlDeploymentStrategy)
        factory.register_strategy("helm", HelmDeploymentStrategy)

        # Create strategies
        kubectl_strategy = factory.create_strategy("kubectl")
        helm_strategy = factory.create_strategy("helm")

        # Check types
        self.assertIsInstance(kubectl_strategy, KubectlDeploymentStrategy)
        self.assertIsInstance(helm_strategy, HelmDeploymentStrategy)

        # Check that the executor was passed
        self.assertEqual(kubectl_strategy.executor, mock_executor)
        self.assertEqual(helm_strategy.executor, mock_executor)


class TestClientFactory(unittest.TestCase):
    """Tests for the ClientFactory class."""

    def test_client_factory(self):
        """Test the ClientFactory."""
        # Create a mock executor
        mock_executor = MockCommandExecutor()

        # Create a factory
        factory = ClientFactory(mock_executor)

        # Create clients
        docker_client = factory.create_docker_client()
        kind_client = factory.create_kind_client()
        kubectl_client = factory.create_kubectl_client()
        helm_client = factory.create_helm_client()

        # Check types
        self.assertIsInstance(docker_client, DockerClient)
        self.assertIsInstance(kind_client, KindClient)
        self.assertIsInstance(kubectl_client, KubectlClient)
        self.assertIsInstance(helm_client, HelmClient)

        # Check that the executor was passed
        self.assertEqual(docker_client.executor, mock_executor)
        self.assertEqual(kind_client.executor, mock_executor)
        self.assertEqual(kubectl_client.executor, mock_executor)
        self.assertEqual(helm_client.executor, mock_executor)

    def test_create_mock_factory(self):
        """Test the create_mock_factory function."""
        # Create a mock factory
        factory = create_mock_factory()

        # Check that the executor is a MockCommandExecutor
        self.assertIsInstance(factory.executor, MockCommandExecutor)


if __name__ == "__main__":
    unittest.main()
