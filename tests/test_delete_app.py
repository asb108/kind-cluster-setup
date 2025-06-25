"""
Tests for the delete-app command.

This module contains tests for the delete-app command, which is responsible for
deleting an application from a Kind cluster without deleting the cluster itself.
"""

import os
import unittest
from datetime import datetime
from unittest.mock import MagicMock, patch

from kind_cluster_setup.commands.delete_app import DeleteAppCommand
from kind_cluster_setup.domain.entities import Application, Cluster, Task
from kind_cluster_setup.utils.yaml_handler import (dump_multi_yaml, dump_yaml,
                                                   load_yaml)


class TestDeleteAppCommand(unittest.TestCase):
    """Tests for the DeleteAppCommand class."""

    def setUp(self):
        """Set up the test environment."""
        # Create a temporary directory for test files
        self.test_dir = os.path.join(os.path.dirname(__file__), "temp")
        os.makedirs(self.test_dir, exist_ok=True)

        # Create test YAML files
        self.test_yaml = os.path.join(self.test_dir, "test.yaml")

        # Create test deployment
        deployment = {
            "apiVersion": "apps/v1",
            "kind": "Deployment",
            "metadata": {"name": "test-app", "namespace": "dev"},
            "spec": {
                "replicas": 1,
                "selector": {"matchLabels": {"app": "test-app"}},
                "template": {
                    "metadata": {"labels": {"app": "test-app"}},
                    "spec": {
                        "containers": [
                            {
                                "name": "nginx",
                                "image": "nginx:latest",
                                "ports": [{"containerPort": 80}],
                            }
                        ]
                    },
                },
            },
        }

        # Create test service
        service = {
            "apiVersion": "v1",
            "kind": "Service",
            "metadata": {"name": "test-app", "namespace": "dev"},
            "spec": {
                "selector": {"app": "test-app"},
                "ports": [{"port": 80, "targetPort": 80}],
                "type": "ClusterIP",
            },
        }

        # Write the YAML files
        dump_multi_yaml([deployment, service], self.test_yaml)

        # Create application directory structure
        self.app_dir = os.path.join(self.test_dir, "applications", "test-app", "config")
        os.makedirs(self.app_dir, exist_ok=True)

        # Copy the YAML files to the application directory
        dump_multi_yaml([deployment, service], os.path.join(self.app_dir, "dev.yaml"))

        # Create a mock application
        self.application = Application(
            name="test-app",
            description="Test application",
            cluster_id="cluster-123",
            config=deployment,
            status="deployed",
            deployment_method="kubernetes",
        )

        # Create a mock cluster
        self.cluster = Cluster(
            name="test-cluster", config={}, environment="dev", status="running"
        )

    def tearDown(self):
        """Clean up the test environment."""
        # Remove the temporary directory
        import shutil

        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)

    @patch("kind_cluster_setup.commands.delete_app.Command.__init__")
    def test_delete_app(self, mock_init):
        """Test deleting an application."""
        # Mock the Command.__init__ method to avoid repository initialization
        mock_init.return_value = None

        # Create the command
        command = DeleteAppCommand()

        # Set up the repositories manually
        command._cluster_repo = MagicMock()
        command._task_repo = MagicMock()
        command._app_repo = MagicMock()

        # Mock the application repository
        command._app_repo.find_by_name.return_value = self.application

        # Mock the cluster repository
        command._cluster_repo.find_by_id.return_value = self.cluster

        # Mock the _delete_from_cluster method
        command._delete_from_cluster = MagicMock()

        # Create the args
        args = MagicMock()
        args.app = "test-app"
        args.environment = "dev"
        args.force = False
        args.delete_config = False

        # Execute the command
        command.execute(args)

        # Check that the application was found
        command._app_repo.find_by_name.assert_called_once_with("test-app")

        # Check that the cluster was found
        command._cluster_repo.find_by_id.assert_called_once_with(
            self.application.cluster_id
        )

        # Check that the application was deleted from the cluster
        command._delete_from_cluster.assert_called_once_with(
            self.application, self.cluster.name, "dev"
        )

        # Check that the application status was updated
        self.assertEqual(self.application.status, "deleted")

        # Check that the application was saved
        command._app_repo.save.assert_called_once_with(self.application)

        # Check that the task was saved
        command._task_repo.save.assert_called()

    @patch("kind_cluster_setup.commands.delete_app.Command.__init__")
    def test_delete_app_with_force(self, mock_init):
        """Test deleting an application with force."""
        # Mock the Command.__init__ method to avoid repository initialization
        mock_init.return_value = None

        # Create the command
        command = DeleteAppCommand()

        # Set up the repositories manually
        command._cluster_repo = MagicMock()
        command._task_repo = MagicMock()
        command._app_repo = MagicMock()

        # Mock the application repository
        command._app_repo.find_by_name.return_value = self.application

        # Mock the cluster repository
        cluster = self.cluster.copy()
        cluster.status = "stopped"
        command._cluster_repo.find_by_id.return_value = cluster

        # Mock the _delete_from_cluster method
        command._delete_from_cluster = MagicMock()

        # Create the args
        args = MagicMock()
        args.app = "test-app"
        args.environment = "dev"
        args.force = True
        args.delete_config = False

        # Execute the command
        command.execute(args)

        # Check that the application was found
        command._app_repo.find_by_name.assert_called_once_with("test-app")

        # Check that the cluster was found
        command._cluster_repo.find_by_id.assert_called_once_with(
            self.application.cluster_id
        )

        # Check that the application was not deleted from the cluster
        command._delete_from_cluster.assert_not_called()

        # Check that the application status was updated
        self.assertEqual(self.application.status, "deleted")

        # Check that the application was saved
        command._app_repo.save.assert_called_once_with(self.application)

        # Check that the task was saved
        command._task_repo.save.assert_called()

    @patch("kind_cluster_setup.commands.delete_app.Command.__init__")
    def test_delete_app_with_delete_config(self, mock_init):
        """Test deleting an application with delete_config."""
        # Mock the Command.__init__ method to avoid repository initialization
        mock_init.return_value = None

        # Create the command
        command = DeleteAppCommand()

        # Set up the repositories manually
        command._cluster_repo = MagicMock()
        command._task_repo = MagicMock()
        command._app_repo = MagicMock()

        # Mock the application repository
        command._app_repo.find_by_name.return_value = self.application

        # Mock the cluster repository
        command._cluster_repo.find_by_id.return_value = self.cluster

        # Mock the _delete_from_cluster method
        command._delete_from_cluster = MagicMock()

        # Mock the _delete_config_files method
        command._delete_config_files = MagicMock()

        # Create the args
        args = MagicMock()
        args.app = "test-app"
        args.environment = "dev"
        args.force = False
        args.delete_config = True

        # Execute the command
        command.execute(args)

        # Check that the application was found
        command._app_repo.find_by_name.assert_called_once_with("test-app")

        # Check that the cluster was found
        command._cluster_repo.find_by_id.assert_called_once_with(
            self.application.cluster_id
        )

        # Check that the application was deleted from the cluster
        command._delete_from_cluster.assert_called_once_with(
            self.application, self.cluster.name, "dev"
        )

        # Check that the configuration files were deleted
        command._delete_config_files.assert_called_once_with("test-app", "dev")

        # Check that the application status was updated
        self.assertEqual(self.application.status, "deleted")

        # Check that the application was saved
        command._app_repo.save.assert_called_once_with(self.application)

        # Check that the task was saved
        command._task_repo.save.assert_called()

    @patch("kind_cluster_setup.commands.delete_app.Command.__init__")
    def test_delete_app_with_force_and_delete_config(self, mock_init):
        """Test deleting an application with both force and delete_config."""
        # Mock the Command.__init__ method to avoid repository initialization
        mock_init.return_value = None

        # Create the command
        command = DeleteAppCommand()

        # Set up the repositories manually
        command._cluster_repo = MagicMock()
        command._task_repo = MagicMock()
        command._app_repo = MagicMock()

        # Mock the application repository
        command._app_repo.find_by_name.return_value = self.application

        # Mock the cluster repository
        cluster = self.cluster.copy()
        cluster.status = "stopped"
        command._cluster_repo.find_by_id.return_value = cluster

        # Mock the _delete_from_cluster method
        command._delete_from_cluster = MagicMock()

        # Mock the _delete_config_files method
        command._delete_config_files = MagicMock()

        # Create the args
        args = MagicMock()
        args.app = "test-app"
        args.environment = "dev"
        args.force = True
        args.delete_config = True

        # Execute the command
        command.execute(args)

        # Check that the application was found
        command._app_repo.find_by_name.assert_called_once_with("test-app")

        # Check that the cluster was found
        command._cluster_repo.find_by_id.assert_called_once_with(
            self.application.cluster_id
        )

        # Check that the application was not deleted from the cluster (because force=True)
        command._delete_from_cluster.assert_not_called()

        # Check that the configuration files were deleted
        command._delete_config_files.assert_called_once_with("test-app", "dev")

        # Check that the application status was updated
        self.assertEqual(self.application.status, "deleted")

        # Check that the application was saved
        command._app_repo.save.assert_called_once_with(self.application)

        # Check that the task was saved
        command._task_repo.save.assert_called()

    @patch("kind_cluster_setup.commands.delete_app.Command.__init__")
    def test_delete_app_not_found(self, mock_init):
        """Test deleting an application that doesn't exist."""
        # Mock the Command.__init__ method to avoid repository initialization
        mock_init.return_value = None

        # Create the command
        command = DeleteAppCommand()

        # Set up the repositories manually
        command._cluster_repo = MagicMock()
        command._task_repo = MagicMock()
        command._app_repo = MagicMock()

        # Mock the application repository to return None (app not found)
        command._app_repo.find_by_name.return_value = None

        # Create the args
        args = MagicMock()
        args.app = "non-existent-app"
        args.environment = "dev"
        args.force = False
        args.delete_config = False

        # Execute the command
        command.execute(args)

        # Check that the application was searched for
        command._app_repo.find_by_name.assert_called_once_with("non-existent-app")

        # Check that the cluster was not searched for
        command._cluster_repo.find_by_id.assert_not_called()

        # Check that the task was saved with a failed status
        command._task_repo.save.assert_called()
        task = command._task_repo.save.call_args[0][0]
        self.assertEqual(task.status, "failed")
        self.assertIn("not found", task.result.get("error", ""))

    @patch("kind_cluster_setup.commands.delete_app.Command.__init__")
    def test_delete_app_cluster_not_found(self, mock_init):
        """Test deleting an application when the cluster is not found."""
        # Mock the Command.__init__ method to avoid repository initialization
        mock_init.return_value = None

        # Create the command
        command = DeleteAppCommand()

        # Set up the repositories manually
        command._cluster_repo = MagicMock()
        command._task_repo = MagicMock()
        command._app_repo = MagicMock()

        # Mock the application repository
        command._app_repo.find_by_name.return_value = self.application

        # Mock the cluster repository to return None (cluster not found)
        command._cluster_repo.find_by_id.return_value = None

        # Create the args
        args = MagicMock()
        args.app = "test-app"
        args.environment = "dev"
        args.force = False
        args.delete_config = False

        # Execute the command
        command.execute(args)

        # Check that the application was found
        command._app_repo.find_by_name.assert_called_once_with("test-app")

        # Check that the cluster was searched for
        command._cluster_repo.find_by_id.assert_called_once_with(
            self.application.cluster_id
        )

        # Check that the task was saved with a failed status
        command._task_repo.save.assert_called()
        task = command._task_repo.save.call_args[0][0]
        self.assertEqual(task.status, "failed")
        self.assertIn("not found", task.result.get("error", ""))

    @patch("kind_cluster_setup.commands.delete_app.Command.__init__")
    def test_delete_app_delete_from_cluster_failure(self, mock_init):
        """Test deleting an application when the deletion from cluster fails."""
        # Mock the Command.__init__ method to avoid repository initialization
        mock_init.return_value = None

        # Create the command
        command = DeleteAppCommand()

        # Set up the repositories manually
        command._cluster_repo = MagicMock()
        command._task_repo = MagicMock()
        command._app_repo = MagicMock()

        # Mock the application repository
        command._app_repo.find_by_name.return_value = self.application

        # Mock the cluster repository
        command._cluster_repo.find_by_id.return_value = self.cluster

        # Mock the _delete_from_cluster method to raise an exception
        command._delete_from_cluster = MagicMock(
            side_effect=Exception("Failed to delete from cluster")
        )

        # Create the args
        args = MagicMock()
        args.app = "test-app"
        args.environment = "dev"
        args.force = False
        args.delete_config = False

        # Execute the command
        command.execute(args)

        # Check that the application was found
        command._app_repo.find_by_name.assert_called_once_with("test-app")

        # Check that the cluster was found
        command._cluster_repo.find_by_id.assert_called_once_with(
            self.application.cluster_id
        )

        # Check that the application was attempted to be deleted from the cluster
        command._delete_from_cluster.assert_called_once_with(
            self.application, self.cluster.name, "dev"
        )

        # Check that the task was saved with a failed status
        command._task_repo.save.assert_called()
        task = command._task_repo.save.call_args[0][0]
        self.assertEqual(task.status, "failed")
        self.assertIn("Failed to delete", task.result.get("error", ""))

    @patch("kind_cluster_setup.commands.delete_app.Command.__init__")
    def test_delete_app_delete_config_files_failure(self, mock_init):
        """Test deleting an application when the deletion of config files fails."""
        # Mock the Command.__init__ method to avoid repository initialization
        mock_init.return_value = None

        # Create the command
        command = DeleteAppCommand()

        # Set up the repositories manually
        command._cluster_repo = MagicMock()
        command._task_repo = MagicMock()
        command._app_repo = MagicMock()

        # Mock the application repository
        command._app_repo.find_by_name.return_value = self.application

        # Mock the cluster repository
        command._cluster_repo.find_by_id.return_value = self.cluster

        # Mock the _delete_from_cluster method
        command._delete_from_cluster = MagicMock()

        # Mock the _delete_config_files method to raise an exception
        command._delete_config_files = MagicMock(
            side_effect=Exception("Failed to delete config files")
        )

        # Create the args
        args = MagicMock()
        args.app = "test-app"
        args.environment = "dev"
        args.force = False
        args.delete_config = True

        # Execute the command
        command.execute(args)

        # Check that the application was found
        command._app_repo.find_by_name.assert_called_once_with("test-app")

        # Check that the cluster was found
        command._cluster_repo.find_by_id.assert_called_once_with(
            self.application.cluster_id
        )

        # Check that the application was deleted from the cluster
        command._delete_from_cluster.assert_called_once_with(
            self.application, self.cluster.name, "dev"
        )

        # Check that the configuration files were attempted to be deleted
        command._delete_config_files.assert_called_once_with("test-app", "dev")

        # Check that the task was saved with a completed status (config file deletion failures don't fail the task)
        command._task_repo.save.assert_called()
        task = command._task_repo.save.call_args[0][0]
        self.assertEqual(task.status, "completed")
        self.assertEqual(task.result.get("result"), "success")

    @patch("kind_cluster_setup.commands.delete_app.os.path.exists")
    @patch("kind_cluster_setup.commands.delete_app.os.remove")
    @patch("kind_cluster_setup.commands.delete_app.Command.__init__")
    def test_delete_config_files(self, mock_init, mock_remove, mock_exists):
        """Test the _delete_config_files method."""
        # Mock the Command.__init__ method to avoid repository initialization
        mock_init.return_value = None

        # Mock os.path.exists to return True
        mock_exists.return_value = True

        # Create the command
        command = DeleteAppCommand()

        # Call the _delete_config_files method
        command._delete_config_files("test-app", "dev")

        # Check that os.path.exists was called for each possible config path
        self.assertEqual(mock_exists.call_count, 3)

        # Check that os.remove was called for each existing config file
        self.assertEqual(mock_remove.call_count, 3)

        # Check the paths that were checked and removed
        expected_paths = [
            "applications/test-app/config/dev.yaml",
            "config/apps/dev/test-app.yaml",
            "applications/test-app/kubernetes/dev.yaml",
        ]

        for path in expected_paths:
            mock_exists.assert_any_call(path)
            mock_remove.assert_any_call(path)


if __name__ == "__main__":
    unittest.main()
