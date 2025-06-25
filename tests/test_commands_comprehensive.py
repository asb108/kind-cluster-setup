"""
Comprehensive tests for command implementations.

This module contains comprehensive tests for the command implementations,
testing both happy path and error handling scenarios for each command.
"""

import argparse
import os
import shutil
import tempfile
import unittest
from datetime import datetime
from unittest.mock import MagicMock, PropertyMock, patch

from kind_cluster_setup.cluster.kind_cluster import (ClusterOperationError,
                                                     DockerNotRunningError,
                                                     KindNotInstalledError)
from kind_cluster_setup.commands.create import CreateCommand
from kind_cluster_setup.commands.delete import DeleteCommand
from kind_cluster_setup.commands.deploy import DeployCommand
from kind_cluster_setup.commands.status import StatusCommand
from kind_cluster_setup.core.command import CommandResult
from kind_cluster_setup.domain.entities import Application, Cluster, Task
from kind_cluster_setup.infrastructure.repositories.factory import \
    init_repository_factory


class BaseCommandTest(unittest.TestCase):
    """Base class for command tests with common setup and teardown."""

    def setUp(self):
        """Set up the test environment."""
        # Create a temporary directory for test files
        self.test_dir = tempfile.mkdtemp()

        # Initialize the repository factory
        init_repository_factory(self.test_dir)

        # Create mock arguments
        self.args = argparse.Namespace()
        self.args.environment = "dev"

        # Set up common patches
        self.mock_load_cluster_config = patch(
            "kind_cluster_setup.commands.create.load_cluster_config"
        ).start()
        self.mock_get_env_config = patch(
            "kind_cluster_setup.commands.create.get_environment_config"
        ).start()
        self.mock_kind_cluster = patch(
            "kind_cluster_setup.commands.create.KindCluster"
        ).start()

        # Set up default return values
        self.mock_get_env_config.return_value = {"environment": "dev"}
        self.mock_load_cluster_config.return_value = {"name": "test-cluster"}

        # Set up the KindCluster mock
        self.mock_cluster = MagicMock()
        self.mock_kind_cluster.return_value = self.mock_cluster

    def tearDown(self):
        """Clean up the test environment."""
        # Stop all patches
        patch.stopall()

        # Remove the temporary directory
        shutil.rmtree(self.test_dir)

    def create_test_cluster(self, command, name="test-cluster", status="running"):
        """Create a test cluster in the repository."""
        cluster = Cluster(
            name=name, config={"name": name}, environment="dev", status=status
        )
        return command.cluster_repository.save(cluster)


class TestCreateCommand(BaseCommandTest):
    """Comprehensive tests for CreateCommand."""

    def setUp(self):
        """Set up the test environment."""
        super().setUp()

        # Create the command
        self.command = CreateCommand()

    def test_create_success(self):
        """Test successful cluster creation."""
        # Execute the command
        self.command.execute(self.args)

        # Verify the mocks were called
        self.mock_get_env_config.assert_called_once_with("dev")
        self.mock_load_cluster_config.assert_called_once_with("dev")
        self.mock_kind_cluster.assert_called_once()
        self.mock_cluster.create.assert_called_once()

        # Verify that a task was created
        tasks = self.command.task_repository.find_all()
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0].command, "create")
        self.assertEqual(tasks[0].status, "completed")

        # Verify that a cluster was created
        clusters = self.command.cluster_repository.find_all()
        self.assertEqual(len(clusters), 1)
        self.assertEqual(clusters[0].name, "test-cluster")
        self.assertEqual(clusters[0].status, "running")

    def test_create_docker_not_running(self):
        """Test cluster creation when Docker is not running."""
        # Set up the mock to raise DockerNotRunningError
        self.mock_cluster.create.side_effect = DockerNotRunningError(
            "Docker is not running"
        )

        # Execute the command and expect an exception
        with self.assertRaises(DockerNotRunningError):
            self.command.execute(self.args)

        # Verify the mocks were called
        self.mock_get_env_config.assert_called_once_with("dev")
        self.mock_load_cluster_config.assert_called_once_with("dev")
        self.mock_kind_cluster.assert_called_once()
        self.mock_cluster.create.assert_called_once()

        # Verify that a task was created and marked as failed
        tasks = self.command.task_repository.find_all()
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0].command, "create")
        self.assertEqual(tasks[0].status, "failed")
        self.assertIn("error", tasks[0].result)

    def test_create_kind_not_installed(self):
        """Test cluster creation when Kind is not installed."""
        # Set up the mock to raise KindNotInstalledError
        self.mock_cluster.create.side_effect = KindNotInstalledError(
            "Kind is not installed"
        )

        # Execute the command and expect an exception
        with self.assertRaises(KindNotInstalledError):
            self.command.execute(self.args)

        # Verify that a task was created and marked as failed
        tasks = self.command.task_repository.find_all()
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0].command, "create")
        self.assertEqual(tasks[0].status, "failed")
        self.assertIn("error", tasks[0].result)

    def test_create_cluster_operation_error(self):
        """Test cluster creation when the operation fails."""
        # Set up the mock to raise ClusterOperationError
        self.mock_cluster.create.side_effect = ClusterOperationError(
            "Failed to create cluster"
        )

        # Execute the command and expect an exception
        with self.assertRaises(ClusterOperationError):
            self.command.execute(self.args)

        # Verify that a task was created and marked as failed
        tasks = self.command.task_repository.find_all()
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0].command, "create")
        self.assertEqual(tasks[0].status, "failed")
        self.assertIn("error", tasks[0].result)

    def test_create_cluster_already_exists(self):
        """Test cluster creation when the cluster already exists."""
        # Create a cluster in the repository
        self.create_test_cluster(self.command)

        # Execute the command
        self.command.execute(self.args)

        # Verify the mocks were called
        self.mock_get_env_config.assert_called_once_with("dev")
        self.mock_load_cluster_config.assert_called_once_with("dev")
        self.mock_kind_cluster.assert_called_once()
        self.mock_cluster.create.assert_called_once()

        # Verify that a task was created
        tasks = self.command.task_repository.find_all()
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0].command, "create")
        self.assertEqual(tasks[0].status, "completed")

        # Verify that the cluster was updated
        clusters = self.command.cluster_repository.find_all()
        self.assertEqual(len(clusters), 1)
        self.assertEqual(clusters[0].name, "test-cluster")
        self.assertEqual(clusters[0].status, "running")


class TestDeleteCommand(BaseCommandTest):
    """Comprehensive tests for DeleteCommand."""

    def setUp(self):
        """Set up the test environment."""
        super().setUp()

        # Create the command
        self.command = DeleteCommand()

        # Set up patches specific to DeleteCommand
        self.mock_load_cluster_config = patch(
            "kind_cluster_setup.commands.delete.load_cluster_config"
        ).start()
        self.mock_get_env_config = patch(
            "kind_cluster_setup.commands.delete.get_environment_config"
        ).start()
        self.mock_kind_cluster = patch(
            "kind_cluster_setup.commands.delete.KindCluster"
        ).start()

        # Set up default return values
        self.mock_get_env_config.return_value = {"environment": "dev"}
        self.mock_load_cluster_config.return_value = {"name": "test-cluster"}

        # Set up the KindCluster mock
        self.mock_cluster = MagicMock()
        self.mock_kind_cluster.return_value = self.mock_cluster

    def test_delete_success(self):
        """Test successful cluster deletion."""
        # Create a cluster in the repository
        self.create_test_cluster(self.command)

        # Execute the command
        self.command.execute(self.args)

        # Verify the mocks were called
        self.mock_get_env_config.assert_called_once_with("dev")
        self.mock_load_cluster_config.assert_called_once_with("dev")
        self.mock_kind_cluster.assert_called_once()
        self.mock_cluster.delete.assert_called_once()

        # Verify that a task was created
        tasks = self.command.task_repository.find_all()
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0].command, "delete")
        self.assertEqual(tasks[0].status, "completed")

        # Verify that the cluster status was updated
        clusters = self.command.cluster_repository.find_all()
        self.assertEqual(len(clusters), 1)
        self.assertEqual(clusters[0].status, "deleted")

    def test_delete_cluster_not_exists(self):
        """Test cluster deletion when the cluster doesn't exist."""
        # Execute the command
        self.command.execute(self.args)

        # Verify the mocks were called
        self.mock_get_env_config.assert_called_once_with("dev")
        self.mock_load_cluster_config.assert_called_once_with("dev")
        self.mock_kind_cluster.assert_called_once()
        self.mock_cluster.delete.assert_called_once()

        # Verify that a task was created
        tasks = self.command.task_repository.find_all()
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0].command, "delete")
        self.assertEqual(tasks[0].status, "completed")

    def test_delete_cluster_operation_error(self):
        """Test cluster deletion when the operation fails."""
        # Create a cluster in the repository
        self.create_test_cluster(self.command)

        # Set up the mock to raise ClusterOperationError
        self.mock_cluster.delete.side_effect = ClusterOperationError(
            "Failed to delete cluster"
        )

        # Execute the command and expect an exception
        with self.assertRaises(ClusterOperationError):
            self.command.execute(self.args)

        # Verify that a task was created and marked as failed
        tasks = self.command.task_repository.find_all()
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0].command, "delete")
        self.assertEqual(tasks[0].status, "failed")
        self.assertIn("error", tasks[0].result)

        # Verify that the cluster status was not updated
        clusters = self.command.cluster_repository.find_all()
        self.assertEqual(len(clusters), 1)
        self.assertEqual(clusters[0].status, "running")


class TestDeployCommand(BaseCommandTest):
    """Comprehensive tests for DeployCommand."""

    def setUp(self):
        """Set up the test environment."""
        super().setUp()

        # Create the command
        self.command = DeployCommand()

        # Set up patches specific to DeployCommand
        self.mock_load_app_config = patch(
            "kind_cluster_setup.commands.deploy.load_app_config"
        ).start()
        self.mock_get_env_config = patch(
            "kind_cluster_setup.commands.deploy.get_environment_config"
        ).start()
        self.mock_helm_strategy = patch(
            "kind_cluster_setup.commands.deploy.HelmDeploymentStrategy"
        ).start()
        self.mock_k8s_strategy = patch(
            "kind_cluster_setup.commands.deploy.KubernetesDeploymentStrategy"
        ).start()

        # Set up default return values
        self.mock_get_env_config.return_value = {"environment": "dev"}
        self.mock_load_app_config.return_value = {"name": "app1"}

        # Set up the strategy mocks
        self.mock_helm = MagicMock()
        self.mock_helm_strategy.return_value = self.mock_helm
        self.mock_helm.deploy.return_value = {"status": "deployed"}

        self.mock_k8s = MagicMock()
        self.mock_k8s_strategy.return_value = self.mock_k8s
        self.mock_k8s.deploy.return_value = {"status": "deployed"}

        # Set up command-line arguments
        self.args.apps = ["app1"]
        self.args.deployments = ["helm"]

    def test_deploy_success(self):
        """Test successful application deployment."""
        # Create a cluster in the repository
        cluster = self.create_test_cluster(self.command, name="kind-dev")

        # Execute the command
        self.command.execute(self.args)

        # Verify the mocks were called
        self.mock_get_env_config.assert_called_once_with("dev")
        self.mock_load_app_config.assert_called_once_with("app1", "dev")
        self.mock_helm_strategy.assert_called_once()
        self.mock_helm.deploy.assert_called_once()

        # Verify that a task was created
        tasks = self.command.task_repository.find_all()
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0].command, "deploy")
        self.assertEqual(tasks[0].status, "completed")

        # Verify that an application was created
        applications = self.command.application_repository.find_all()
        self.assertEqual(len(applications), 1)
        self.assertEqual(applications[0].name, "app1")
        self.assertEqual(applications[0].deployment_method, "helm")
        self.assertEqual(applications[0].status, "deployed")
        self.assertEqual(applications[0].cluster_id, cluster.id)

    def test_deploy_cluster_not_exists(self):
        """Test application deployment when the cluster doesn't exist."""
        # Execute the command
        self.command.execute(self.args)

        # Verify the mocks were called
        self.mock_get_env_config.assert_called_once_with("dev")
        self.mock_load_app_config.assert_called_once_with("app1", "dev")
        self.mock_helm_strategy.assert_called_once()
        self.mock_helm.deploy.assert_called_once()

        # Verify that a task was created
        tasks = self.command.task_repository.find_all()
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0].command, "deploy")
        self.assertEqual(tasks[0].status, "completed")

        # Verify that no application was created (since cluster doesn't exist)
        applications = self.command.application_repository.find_all()
        self.assertEqual(len(applications), 0)

    def test_deploy_multiple_apps(self):
        """Test deployment of multiple applications."""
        # Create a cluster in the repository
        cluster = self.create_test_cluster(self.command, name="kind-dev")

        # Set up command-line arguments for multiple apps
        self.args.apps = ["app1", "app2"]
        self.args.deployments = ["helm", "kubernetes"]

        # Execute the command
        self.command.execute(self.args)

        # Verify the mocks were called
        self.assertEqual(self.mock_get_env_config.call_count, 1)
        self.assertEqual(self.mock_load_app_config.call_count, 2)
        self.mock_helm_strategy.assert_called_once()
        self.mock_k8s_strategy.assert_called_once()
        self.mock_helm.deploy.assert_called_once()
        self.mock_k8s.deploy.assert_called_once()

        # Verify that a task was created
        tasks = self.command.task_repository.find_all()
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0].command, "deploy")
        self.assertEqual(tasks[0].status, "completed")

        # Verify that applications were created
        applications = self.command.application_repository.find_all()
        self.assertEqual(len(applications), 2)
        app_names = [app.name for app in applications]
        self.assertIn("app1", app_names)
        self.assertIn("app2", app_names)

    def test_deploy_failure(self):
        """Test application deployment when the deployment fails."""
        # Create a cluster in the repository
        self.create_test_cluster(self.command, name="kind-dev")

        # Set up the mock to raise an exception
        self.mock_helm.deploy.side_effect = Exception("Failed to deploy application")

        # Execute the command (DeployCommand catches exceptions and records them in the task)
        self.command.execute(self.args)

        # Verify that a task was created and completed (with failure info in results)
        tasks = self.command.task_repository.find_all()
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0].command, "deploy")
        self.assertEqual(tasks[0].status, "completed")

        # Verify that the results contain the error
        self.assertEqual(len(tasks[0].result["results"]), 1)
        self.assertEqual(tasks[0].result["results"][0]["status"], "failed")
        self.assertIn("error", tasks[0].result["results"][0])

        # Verify that no application was created
        applications = self.command.application_repository.find_all()
        self.assertEqual(len(applications), 0)

    def test_deploy_partial_failure(self):
        """Test deployment when one application fails but others succeed."""
        # Create a cluster in the repository
        cluster = self.create_test_cluster(self.command, name="kind-dev")

        # Set up command-line arguments for multiple apps
        self.args.apps = ["app1", "app2"]
        self.args.deployments = ["helm", "kubernetes"]

        # Set up the second mock to raise an exception
        self.mock_k8s.deploy.side_effect = Exception("Failed to deploy app2")

        # Execute the command
        self.command.execute(self.args)

        # Verify the mocks were called
        self.assertEqual(self.mock_get_env_config.call_count, 1)
        self.assertEqual(self.mock_load_app_config.call_count, 2)
        self.mock_helm_strategy.assert_called_once()
        self.mock_k8s_strategy.assert_called_once()
        self.mock_helm.deploy.assert_called_once()
        self.mock_k8s.deploy.assert_called_once()

        # Verify that a task was created
        tasks = self.command.task_repository.find_all()
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0].command, "deploy")
        self.assertEqual(tasks[0].status, "completed")

        # Verify that only the first application was created
        applications = self.command.application_repository.find_all()
        self.assertEqual(len(applications), 1)
        self.assertEqual(applications[0].name, "app1")
        self.assertEqual(applications[0].deployment_method, "helm")
        self.assertEqual(applications[0].status, "deployed")
        self.assertEqual(applications[0].cluster_id, cluster.id)


class TestStatusCommand(BaseCommandTest):
    """Comprehensive tests for StatusCommand."""

    def setUp(self):
        """Set up the test environment."""
        super().setUp()

        # Create the command
        self.command = StatusCommand()

        # Set up patches specific to StatusCommand
        self.mock_load_cluster_config = patch(
            "kind_cluster_setup.commands.status.load_cluster_config"
        ).start()
        self.mock_get_env_config = patch(
            "kind_cluster_setup.commands.status.get_environment_config"
        ).start()
        self.mock_kind_cluster = patch(
            "kind_cluster_setup.commands.status.KindCluster"
        ).start()
        self.mock_kind_client = patch(
            "kind_cluster_setup.commands.status.KindClient"
        ).start()
        self.mock_helm_strategy = patch(
            "kind_cluster_setup.commands.status.HelmDeploymentStrategy"
        ).start()
        self.mock_k8s_strategy = patch(
            "kind_cluster_setup.commands.status.KubernetesDeploymentStrategy"
        ).start()

        # Set up default return values
        self.mock_get_env_config.return_value = {"environment": "dev"}
        self.mock_load_cluster_config.return_value = {"name": "test-cluster"}

        # Set up the KindCluster mock
        self.mock_cluster = MagicMock()
        self.mock_kind_cluster.return_value = self.mock_cluster
        self.mock_cluster.get_info.return_value = {
            "name": "test-cluster",
            "nodes": [
                {
                    "name": "test-cluster-control-plane",
                    "role": "control-plane",
                    "status": "Ready",
                },
                {"name": "test-cluster-worker", "role": "worker", "status": "Ready"},
            ],
        }

        # Set up the KindClient mock
        self.mock_kind = MagicMock()
        self.mock_kind_client.return_value = self.mock_kind
        self.mock_kind.get_clusters.return_value = ["test-cluster"]

        # Set up the strategy mocks
        self.mock_helm = MagicMock()
        self.mock_helm_strategy.return_value = self.mock_helm
        self.mock_helm.check_status.return_value = {"status": "Running"}

        self.mock_k8s = MagicMock()
        self.mock_k8s_strategy.return_value = self.mock_k8s
        self.mock_k8s.check_status.return_value = {"status": "Running"}

    def test_status_success(self):
        """Test successful status check."""
        # Create a cluster in the repository
        self.create_test_cluster(self.command)

        # Execute the command
        result = self.command.execute(self.args)

        # Verify the mocks were called
        self.mock_get_env_config.assert_called_once_with("dev")
        self.mock_load_cluster_config.assert_called_once_with("dev")
        self.mock_kind_cluster.assert_called_once()
        self.mock_cluster.get_info.assert_called_once()

        # Verify that a task was created
        tasks = self.command.task_repository.find_all()
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0].command, "status")
        self.assertEqual(tasks[0].status, "completed")

        # Verify the result
        self.assertIn("clusters", result)
        self.assertEqual(result["clusters"]["name"], "test-cluster")
        self.assertEqual(len(result["clusters"]["nodes"]), 2)

    def test_status_with_apps(self):
        """Test status check with applications."""
        # Create a cluster in the repository
        cluster = self.create_test_cluster(self.command)

        # Create an application in the repository
        app = Application(
            name="app1",
            description="Test application",
            cluster_id=cluster.id,
            config={"name": "app1"},
            status="deployed",
            deployment_method="helm",
        )
        self.command.application_repository.save(app)

        # Set up command-line arguments for apps
        self.args.apps = ["app1"]
        self.args.deployments = ["helm"]

        # Execute the command
        result = self.command.execute(self.args)

        # Verify the mocks were called
        self.mock_get_env_config.assert_called_once_with("dev")
        self.mock_load_cluster_config.assert_called_once_with("dev")
        self.mock_kind_cluster.assert_called_once()
        self.mock_cluster.get_info.assert_called_once()
        self.mock_helm_strategy.assert_called_once()
        self.mock_helm.check_status.assert_called_once()

        # Verify that a task was created
        tasks = self.command.task_repository.find_all()
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0].command, "status")
        self.assertEqual(tasks[0].status, "completed")

        # Verify the result
        self.assertIn("clusters", result)
        self.assertIn("applications", result)
        self.assertEqual(len(result["applications"]), 1)
        self.assertEqual(result["applications"][0]["app"], "app1")

        # Verify that the application status was updated
        applications = self.command.application_repository.find_all()
        self.assertEqual(len(applications), 1)
        self.assertEqual(applications[0].status, "Running")

    def test_status_cluster_not_exists(self):
        """Test status check when the cluster doesn't exist."""
        # Execute the command
        result = self.command.execute(self.args)

        # Verify the mocks were called
        self.mock_get_env_config.assert_called_once_with("dev")
        self.mock_load_cluster_config.assert_called_once_with("dev")
        self.mock_kind_cluster.assert_called_once()
        self.mock_cluster.get_info.assert_called_once()

        # Verify that a task was created
        tasks = self.command.task_repository.find_all()
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0].command, "status")
        self.assertEqual(tasks[0].status, "completed")

        # Verify the result
        self.assertIn("clusters", result)

        # Verify that a cluster entity was created
        clusters = self.command.cluster_repository.find_all()
        self.assertEqual(len(clusters), 1)
        self.assertEqual(clusters[0].name, "test-cluster")
        self.assertEqual(clusters[0].status, "running")

    def test_status_failure(self):
        """Test status check when the operation fails."""
        # Set up the mock to raise an exception
        self.mock_cluster.get_info.side_effect = Exception("Failed to get cluster info")

        # Execute the command and expect an exception
        with self.assertRaises(Exception):
            self.command.execute(self.args)

        # Verify that a task was created and marked as failed
        tasks = self.command.task_repository.find_all()
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0].command, "status")
        self.assertEqual(tasks[0].status, "failed")
        self.assertIn("error", tasks[0].result)


if __name__ == "__main__":
    unittest.main()
