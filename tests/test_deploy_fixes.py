import os
import tempfile
import unittest
from unittest.mock import MagicMock, patch

import yaml

from kind_cluster_setup.commands.deploy import DeployCommand
from kind_cluster_setup.deployment.helm import HelmDeploymentStrategy
from kind_cluster_setup.deployment.kubernetes import KubernetesDeploymentStrategy
from kind_cluster_setup.utils.yaml_handler import dump_multi_yaml, dump_yaml, load_yaml


class TestDeployFixes(unittest.TestCase):
    def setUp(self):
        # Create temporary directory for test files
        self.temp_dir = tempfile.TemporaryDirectory()

        # Create test YAML files
        self.single_doc_yaml = os.path.join(self.temp_dir.name, "single_doc.yaml")
        self.multi_doc_yaml = os.path.join(self.temp_dir.name, "multi_doc.yaml")

        # Create single document YAML
        single_doc = {
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

        # Create multi-document YAML
        service_doc = {
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
        dump_yaml(single_doc, self.single_doc_yaml)
        dump_multi_yaml([single_doc, service_doc], self.multi_doc_yaml)

        # Create application directory structure
        self.app_dir = os.path.join(
            self.temp_dir.name, "applications", "test-app", "config"
        )
        os.makedirs(self.app_dir, exist_ok=True)

        # Copy the YAML files to the application directory
        dump_yaml(single_doc, os.path.join(self.app_dir, "dev.yaml"))
        dump_multi_yaml(
            [single_doc, service_doc], os.path.join(self.app_dir, "multi_dev.yaml")
        )

    def tearDown(self):
        # Clean up temporary directory
        self.temp_dir.cleanup()

    def test_load_yaml_multi_doc(self):
        """Test that load_yaml can load multiple documents."""
        # Load single document
        single_doc = load_yaml(self.single_doc_yaml)
        self.assertIsInstance(single_doc, dict)
        self.assertEqual(single_doc["kind"], "Deployment")

        # Load multiple documents
        multi_docs = load_yaml(self.multi_doc_yaml, multi_doc=True)
        self.assertIsInstance(multi_docs, list)
        self.assertEqual(len(multi_docs), 2)
        self.assertEqual(multi_docs[0]["kind"], "Deployment")
        self.assertEqual(multi_docs[1]["kind"], "Service")

    def test_dump_multi_yaml(self):
        """Test that dump_multi_yaml can dump multiple documents."""
        # Load multiple documents
        multi_docs = load_yaml(self.multi_doc_yaml, multi_doc=True)

        # Create a new file path
        new_file_path = os.path.join(self.temp_dir.name, "new_multi_doc.yaml")

        # Dump the documents
        dump_multi_yaml(multi_docs, new_file_path)

        # Load the dumped documents
        new_multi_docs = load_yaml(new_file_path, multi_doc=True)

        # Verify the documents were dumped correctly
        self.assertIsInstance(new_multi_docs, list)
        self.assertEqual(len(new_multi_docs), 2)
        self.assertEqual(new_multi_docs[0]["kind"], "Deployment")
        self.assertEqual(new_multi_docs[1]["kind"], "Service")

    @patch("kind_cluster_setup.deployment.kubernetes.KubectlClient")
    def test_kubernetes_deploy_multi_doc(self, mock_kubectl):
        """Test that KubernetesDeploymentStrategy can deploy multiple documents."""
        # Mock the kubectl client
        mock_kubectl_instance = MagicMock()
        mock_kubectl.return_value = mock_kubectl_instance
        mock_kubectl_instance.apply.return_value = MagicMock(
            stdout="deployment.apps/test-app created\nservice/test-app created"
        )

        # Create the strategy
        strategy = KubernetesDeploymentStrategy()

        # Load the multi-document YAML
        app_config = load_yaml(self.multi_doc_yaml, multi_doc=True)

        # Deploy the application
        result = strategy.deploy(
            app="test-app",
            app_config=app_config,
            env_config={"namespace": "dev", "environment": "dev"},
            cluster_name="my-kind-cluster",
        )

        # Check that the deployment was successful
        self.assertTrue(result)

        # Check that kubectl apply was called
        mock_kubectl_instance.apply.assert_called_once()

    @patch("kind_cluster_setup.deployment.helm.HelmClient")
    @patch("kind_cluster_setup.deployment.helm.KubectlClient")
    def test_helm_deploy_with_values(self, mock_kubectl, mock_helm):
        """Test that HelmDeploymentStrategy can deploy with values."""
        # Mock the kubectl and helm clients
        mock_kubectl_instance = MagicMock()
        mock_helm_instance = MagicMock()
        mock_kubectl.return_value = mock_kubectl_instance
        mock_helm.return_value = mock_helm_instance
        mock_helm_instance.is_installed.return_value = True
        mock_helm_instance.install_or_upgrade.return_value = MagicMock(
            stdout="Release test-app-release has been upgraded"
        )

        # Create the strategy
        strategy = HelmDeploymentStrategy()

        # Create a chart directory
        chart_dir = os.path.join(self.temp_dir.name, "helm", "test-app")
        os.makedirs(chart_dir, exist_ok=True)

        # Create a Chart.yaml file
        with open(os.path.join(chart_dir, "Chart.yaml"), "w") as f:
            f.write("apiVersion: v2\nname: test-app\nversion: 1.0.0\n")

        # Deploy the application
        result = strategy.deploy(
            app="test-app",
            app_config={"name": "test-app"},
            env_config={"namespace": "dev", "environment": "dev"},
            template_dir=chart_dir,
            cluster_name="my-kind-cluster",
            values={"replicas": 2},
        )

        # Check that the deployment was successful
        self.assertTrue(result)

        # Check that helm install_or_upgrade was called
        mock_helm_instance.install_or_upgrade.assert_called_once()

    @patch("kind_cluster_setup.commands.deploy.KubernetesDeploymentStrategy")
    @patch("kind_cluster_setup.commands.deploy.load_app_config")
    @patch("kind_cluster_setup.commands.deploy.Command.__init__")
    def test_deploy_command_with_kubernetes(
        self, mock_init, mock_load_app_config, mock_kubernetes_strategy
    ):
        """Test that DeployCommand can deploy with KubernetesDeploymentStrategy."""
        # Mock the Command.__init__ method to avoid repository initialization
        mock_init.return_value = None

        # Mock the load_app_config function
        mock_load_app_config.return_value = load_yaml(
            self.multi_doc_yaml, multi_doc=True
        )

        # Mock the KubernetesDeploymentStrategy
        mock_strategy_instance = MagicMock()
        mock_kubernetes_strategy.return_value = mock_strategy_instance
        mock_strategy_instance.deploy.return_value = True

        # Create the command
        command = DeployCommand()

        # Set up the repositories manually
        command._cluster_repo = MagicMock()
        command._task_repo = MagicMock()
        command._app_repo = MagicMock()

        # Mock the cluster
        mock_cluster = MagicMock()
        mock_cluster.name = "my-kind-cluster"
        command._cluster_repo.find_by_name.return_value = mock_cluster

        # Create the args
        args = MagicMock()
        args.environment = "dev"
        args.apps = ["test-app"]
        args.deployments = ["kubernetes"]
        args.cluster_name = "my-kind-cluster"

        # Execute the command
        command.execute(args)

        # Check that the strategy was called with the correct parameters
        mock_strategy_instance.deploy.assert_called_once()
        call_args = mock_strategy_instance.deploy.call_args[1]
        self.assertEqual(call_args["app"], "test-app")
        self.assertEqual(call_args["cluster_name"], "my-kind-cluster")


if __name__ == "__main__":
    unittest.main()
