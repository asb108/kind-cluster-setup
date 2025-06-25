"""
Tests for the modify command.

This module contains tests for the modify command, which is responsible for
modifying an existing application in a Kind cluster.
"""

import os
import unittest
from datetime import datetime
from unittest.mock import MagicMock, patch

from kind_cluster_setup.commands.modify import ModifyCommand
from kind_cluster_setup.domain.entities import Application, Cluster, Task
from kind_cluster_setup.utils.yaml_handler import (dump_multi_yaml, dump_yaml,
                                                   load_yaml)


class TestModifyCommand(unittest.TestCase):
    """Tests for the ModifyCommand class."""

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

    @patch("kind_cluster_setup.commands.modify.load_app_config")
    @patch("kind_cluster_setup.commands.modify.get_environment_config")
    @patch(
        "kind_cluster_setup.core.deployment.DeploymentStrategyFactory.create_default_factory"
    )
    @patch("kind_cluster_setup.commands.modify.SubprocessCommandExecutor")
    @patch("kind_cluster_setup.commands.modify.Command.__init__")
    def test_modify_deployment(
        self,
        mock_init,
        mock_executor,
        mock_factory,
        mock_get_env_config,
        mock_load_app_config,
    ):
        """Test modifying a deployment."""
        # Mock the Command.__init__ method to avoid repository initialization
        mock_init.return_value = None

        # Mock the load_app_config function
        mock_load_app_config.return_value = load_yaml(self.test_yaml, multi_doc=True)

        # Mock the get_environment_config function
        mock_get_env_config.return_value = {"namespace": "dev", "environment": "dev"}

        # Mock the SubprocessCommandExecutor
        mock_executor_instance = MagicMock()
        mock_executor.return_value = mock_executor_instance

        # Mock the DeploymentStrategyFactory
        mock_factory_instance = MagicMock()
        mock_factory.return_value = mock_factory_instance

        # Mock the strategy
        mock_strategy = MagicMock()
        mock_strategy.deploy.return_value = True
        mock_factory_instance.create_strategy.return_value = mock_strategy

        # Create the command
        command = ModifyCommand()

        # Set up the repositories manually
        command._cluster_repo = MagicMock()
        command._task_repo = MagicMock()
        command._app_repo = MagicMock()

        # Mock the application repository
        command._app_repo.find_by_name.return_value = self.application

        # Mock the cluster repository
        command._cluster_repo.find_by_id.return_value = self.cluster

        # Create the args
        args = MagicMock()
        args.app = "test-app"
        args.environment = "dev"
        args.image = "nginx:1.21"
        args.replicas = 2
        args.cpu_limit = "500m"
        args.memory_limit = "512Mi"
        args.cpu_request = "250m"
        args.memory_request = "256Mi"
        args.expose = True
        args.service_type = "NodePort"
        args.port = 8080
        args.target_port = 80

        # Execute the command
        command.execute(args)

        # Check that the application was found
        command._app_repo.find_by_name.assert_called_once_with("test-app")

        # Check that the cluster was found
        command._cluster_repo.find_by_id.assert_called_once_with(
            self.application.cluster_id
        )

        # Check that the deployment strategy was created
        mock_factory_instance.create_strategy.assert_called_once_with("kubernetes")

        # Check that the deployment was deployed
        mock_strategy.deploy.assert_called_once()

        # Check that the application was saved
        command._app_repo.save.assert_called_once()

        # Check that the task was saved
        command._task_repo.save.assert_called()

    def test_modify_deployment_config_all_parameters(self):
        """Test modifying a deployment configuration with all parameters."""
        # Create the command
        command = ModifyCommand()

        # Load the test YAML
        config = load_yaml(self.test_yaml, multi_doc=True)

        # Create the args
        args = MagicMock()
        args.image = "nginx:1.21"
        args.replicas = 2
        args.cpu_limit = "500m"
        args.memory_limit = "512Mi"
        args.cpu_request = "250m"
        args.memory_request = "256Mi"
        args.service_type = "NodePort"
        args.port = 8080
        args.target_port = 80

        # Modify the configuration
        modified_config = command._apply_modifications(config, args)

        # Check that the configuration was modified
        self.assertEqual(len(modified_config), 2)
        self.assertEqual(modified_config[0]["kind"], "Deployment")
        self.assertEqual(modified_config[1]["kind"], "Service")

        # Check that the deployment was modified
        deployment = modified_config[0]
        self.assertEqual(deployment["spec"]["replicas"], 2)
        self.assertEqual(
            deployment["spec"]["template"]["spec"]["containers"][0]["image"],
            "nginx:1.21",
        )
        self.assertEqual(
            deployment["spec"]["template"]["spec"]["containers"][0]["resources"][
                "limits"
            ]["cpu"],
            "500m",
        )
        self.assertEqual(
            deployment["spec"]["template"]["spec"]["containers"][0]["resources"][
                "limits"
            ]["memory"],
            "512Mi",
        )
        self.assertEqual(
            deployment["spec"]["template"]["spec"]["containers"][0]["resources"][
                "requests"
            ]["cpu"],
            "250m",
        )
        self.assertEqual(
            deployment["spec"]["template"]["spec"]["containers"][0]["resources"][
                "requests"
            ]["memory"],
            "256Mi",
        )

        # Check that the service was modified
        service = modified_config[1]
        self.assertEqual(service["spec"]["type"], "NodePort")
        self.assertEqual(service["spec"]["ports"][0]["port"], 8080)
        self.assertEqual(service["spec"]["ports"][0]["targetPort"], 80)

    def test_modify_deployment_config_image_only(self):
        """Test modifying only the image of a deployment."""
        # Create the command
        command = ModifyCommand()

        # Load the test YAML
        config = load_yaml(self.test_yaml, multi_doc=True)

        # Create the args with only image parameter
        args = MagicMock()
        args.image = "nginx:1.22"
        args.replicas = None
        args.cpu_limit = None
        args.memory_limit = None
        args.cpu_request = None
        args.memory_request = None
        args.service_type = None
        args.port = None
        args.target_port = None

        # Modify the configuration
        modified_config = command._apply_modifications(config, args)

        # Check that the configuration was modified
        self.assertEqual(len(modified_config), 2)

        # Check that only the image was modified
        deployment = modified_config[0]
        self.assertEqual(deployment["spec"]["replicas"], 1)  # Original value
        self.assertEqual(
            deployment["spec"]["template"]["spec"]["containers"][0]["image"],
            "nginx:1.22",
        )

        # Check that the service was not modified
        service = modified_config[1]
        self.assertEqual(service["spec"]["type"], "ClusterIP")  # Original value
        self.assertEqual(service["spec"]["ports"][0]["port"], 80)  # Original value

    def test_modify_deployment_config_replicas_only(self):
        """Test modifying only the replicas of a deployment."""
        # Create the command
        command = ModifyCommand()

        # Load the test YAML
        config = load_yaml(self.test_yaml, multi_doc=True)

        # Create the args with only replicas parameter
        args = MagicMock()
        args.image = None
        args.replicas = 3
        args.cpu_limit = None
        args.memory_limit = None
        args.cpu_request = None
        args.memory_request = None
        args.service_type = None
        args.port = None
        args.target_port = None

        # Modify the configuration
        modified_config = command._apply_modifications(config, args)

        # Check that the configuration was modified
        self.assertEqual(len(modified_config), 2)

        # Check that only the replicas were modified
        deployment = modified_config[0]
        self.assertEqual(deployment["spec"]["replicas"], 3)
        self.assertEqual(
            deployment["spec"]["template"]["spec"]["containers"][0]["image"],
            "nginx:latest",
        )  # Original value

        # Check that the service was not modified
        service = modified_config[1]
        self.assertEqual(service["spec"]["type"], "ClusterIP")  # Original value
        self.assertEqual(service["spec"]["ports"][0]["port"], 80)  # Original value

    def test_modify_deployment_config_resource_limits_only(self):
        """Test modifying only the resource limits of a deployment."""
        # Create the command
        command = ModifyCommand()

        # Load the test YAML
        config = load_yaml(self.test_yaml, multi_doc=True)

        # Create the args with only resource limits parameters
        args = MagicMock()
        args.image = None
        args.replicas = None
        args.cpu_limit = "1000m"
        args.memory_limit = "1Gi"
        args.cpu_request = None
        args.memory_request = None
        args.service_type = None
        args.port = None
        args.target_port = None

        # Modify the configuration
        modified_config = command._apply_modifications(config, args)

        # Check that the configuration was modified
        self.assertEqual(len(modified_config), 2)

        # Check that only the resource limits were modified
        deployment = modified_config[0]
        self.assertEqual(deployment["spec"]["replicas"], 1)  # Original value
        self.assertEqual(
            deployment["spec"]["template"]["spec"]["containers"][0]["image"],
            "nginx:latest",
        )  # Original value
        self.assertEqual(
            deployment["spec"]["template"]["spec"]["containers"][0]["resources"][
                "limits"
            ]["cpu"],
            "1000m",
        )
        self.assertEqual(
            deployment["spec"]["template"]["spec"]["containers"][0]["resources"][
                "limits"
            ]["memory"],
            "1Gi",
        )

        # Check that the service was not modified
        service = modified_config[1]
        self.assertEqual(service["spec"]["type"], "ClusterIP")  # Original value
        self.assertEqual(service["spec"]["ports"][0]["port"], 80)  # Original value

    def test_modify_deployment_config_resource_requests_only(self):
        """Test modifying only the resource requests of a deployment."""
        # Create the command
        command = ModifyCommand()

        # Load the test YAML
        config = load_yaml(self.test_yaml, multi_doc=True)

        # Create the args with only resource requests parameters
        args = MagicMock()
        args.image = None
        args.replicas = None
        args.cpu_limit = None
        args.memory_limit = None
        args.cpu_request = "500m"
        args.memory_request = "512Mi"
        args.service_type = None
        args.port = None
        args.target_port = None

        # Modify the configuration
        modified_config = command._apply_modifications(config, args)

        # Check that the configuration was modified
        self.assertEqual(len(modified_config), 2)

        # Check that only the resource requests were modified
        deployment = modified_config[0]
        self.assertEqual(deployment["spec"]["replicas"], 1)  # Original value
        self.assertEqual(
            deployment["spec"]["template"]["spec"]["containers"][0]["image"],
            "nginx:latest",
        )  # Original value
        self.assertEqual(
            deployment["spec"]["template"]["spec"]["containers"][0]["resources"][
                "requests"
            ]["cpu"],
            "500m",
        )
        self.assertEqual(
            deployment["spec"]["template"]["spec"]["containers"][0]["resources"][
                "requests"
            ]["memory"],
            "512Mi",
        )

        # Check that the service was not modified
        service = modified_config[1]
        self.assertEqual(service["spec"]["type"], "ClusterIP")  # Original value
        self.assertEqual(service["spec"]["ports"][0]["port"], 80)  # Original value

    def test_modify_deployment_config_service_only(self):
        """Test modifying only the service of a deployment."""
        # Create the command
        command = ModifyCommand()

        # Load the test YAML
        config = load_yaml(self.test_yaml, multi_doc=True)

        # Create the args with only service parameters
        args = MagicMock()
        args.image = None
        args.replicas = None
        args.cpu_limit = None
        args.memory_limit = None
        args.cpu_request = None
        args.memory_request = None
        args.service_type = "LoadBalancer"
        args.port = 8080
        args.target_port = 80

        # Modify the configuration
        modified_config = command._apply_modifications(config, args)

        # Check that the configuration was modified
        self.assertEqual(len(modified_config), 2)

        # Check that the deployment was not modified
        deployment = modified_config[0]
        self.assertEqual(deployment["spec"]["replicas"], 1)  # Original value
        self.assertEqual(
            deployment["spec"]["template"]["spec"]["containers"][0]["image"],
            "nginx:latest",
        )  # Original value

        # Check that only the service was modified
        service = modified_config[1]
        self.assertEqual(service["spec"]["type"], "LoadBalancer")
        self.assertEqual(service["spec"]["ports"][0]["port"], 8080)
        self.assertEqual(service["spec"]["ports"][0]["targetPort"], 80)

    @patch("kind_cluster_setup.commands.modify.load_app_config")
    @patch("kind_cluster_setup.commands.modify.get_environment_config")
    @patch("kind_cluster_setup.commands.modify.Command.__init__")
    def test_modify_deployment_app_not_found(
        self, mock_init, mock_get_env_config, mock_load_app_config
    ):
        """Test modifying a deployment when the application is not found."""
        # Mock the Command.__init__ method to avoid repository initialization
        mock_init.return_value = None

        # Mock the get_environment_config function
        mock_get_env_config.return_value = {"namespace": "dev", "environment": "dev"}

        # Create the command
        command = ModifyCommand()

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
        args.image = "nginx:1.21"

        # Execute the command
        command.execute(args)

        # Check that the application was searched for
        command._app_repo.find_by_name.assert_called_once_with("non-existent-app")

        # Check that the task was saved with a failed status
        command._task_repo.save.assert_called()
        # Get the last call to save
        task = command._task_repo.save.call_args[0][0]
        self.assertEqual(task.status, "failed")
        self.assertIn("not found", task.result.get("error", ""))

    @patch("kind_cluster_setup.commands.modify.load_app_config")
    @patch("kind_cluster_setup.commands.modify.get_environment_config")
    @patch("kind_cluster_setup.commands.modify.Command.__init__")
    def test_modify_deployment_cluster_not_found(
        self, mock_init, mock_get_env_config, mock_load_app_config
    ):
        """Test modifying a deployment when the cluster is not found."""
        # Mock the Command.__init__ method to avoid repository initialization
        mock_init.return_value = None

        # Mock the get_environment_config function
        mock_get_env_config.return_value = {"namespace": "dev", "environment": "dev"}

        # Create the command
        command = ModifyCommand()

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
        args.image = "nginx:1.21"

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

    @patch("kind_cluster_setup.commands.modify.load_app_config")
    @patch("kind_cluster_setup.commands.modify.get_environment_config")
    @patch(
        "kind_cluster_setup.core.deployment.DeploymentStrategyFactory.create_default_factory"
    )
    @patch("kind_cluster_setup.commands.modify.SubprocessCommandExecutor")
    @patch("kind_cluster_setup.commands.modify.Command.__init__")
    def test_modify_deployment_strategy_failure(
        self,
        mock_init,
        mock_executor,
        mock_factory,
        mock_get_env_config,
        mock_load_app_config,
    ):
        """Test modifying a deployment when the deployment strategy fails."""
        # Mock the Command.__init__ method to avoid repository initialization
        mock_init.return_value = None

        # Mock the load_app_config function
        mock_load_app_config.return_value = load_yaml(self.test_yaml, multi_doc=True)

        # Mock the get_environment_config function
        mock_get_env_config.return_value = {"namespace": "dev", "environment": "dev"}

        # Mock the SubprocessCommandExecutor
        mock_executor_instance = MagicMock()
        mock_executor.return_value = mock_executor_instance

        # Mock the DeploymentStrategyFactory
        mock_factory_instance = MagicMock()
        mock_factory.return_value = mock_factory_instance

        # Mock the strategy to fail
        mock_strategy = MagicMock()
        mock_strategy.deploy.return_value = False
        mock_factory_instance.create_strategy.return_value = mock_strategy

        # Create the command
        command = ModifyCommand()

        # Set up the repositories manually
        command._cluster_repo = MagicMock()
        command._task_repo = MagicMock()
        command._app_repo = MagicMock()

        # Mock the application repository
        command._app_repo.find_by_name.return_value = self.application

        # Mock the cluster repository
        command._cluster_repo.find_by_id.return_value = self.cluster

        # Create the args
        args = MagicMock()
        args.app = "test-app"
        args.environment = "dev"
        args.image = "nginx:1.21"
        args.replicas = 2
        args.cpu_limit = "500m"
        args.memory_limit = "512Mi"
        args.cpu_request = "250m"
        args.memory_request = "256Mi"
        args.expose = True
        args.service_type = "NodePort"
        args.port = 8080
        args.target_port = 80

        # Execute the command
        command.execute(args)

        # Check that the application was found
        command._app_repo.find_by_name.assert_called_once_with("test-app")

        # Check that the cluster was found
        command._cluster_repo.find_by_id.assert_called_once_with(
            self.application.cluster_id
        )

        # Check that the deployment strategy was created
        mock_factory_instance.create_strategy.assert_called_once_with("kubernetes")

        # Check that the deployment was attempted
        mock_strategy.deploy.assert_called_once()

        # Check that the task was saved with a failed status
        command._task_repo.save.assert_called()
        task = command._task_repo.save.call_args[0][0]
        self.assertEqual(task.status, "failed")
        self.assertIn("Failed to deploy", task.result.get("error", ""))


if __name__ == "__main__":
    unittest.main()
