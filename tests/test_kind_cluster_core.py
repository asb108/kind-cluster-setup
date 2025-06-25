"""
Tests for the KindCluster implementation using core abstractions.

This module contains tests for the KindCluster implementation that uses
the core abstractions.
"""

import unittest
from unittest.mock import patch, MagicMock

from kind_cluster_setup.cluster.kind_cluster import KindCluster
from kind_cluster_setup.core.command import CommandResult


class TestKindClusterCore(unittest.TestCase):
    """Tests for the KindCluster implementation using core abstractions."""

    def setUp(self):
        """Set up test fixtures."""
        self.cluster_config = {
            'name': 'test-cluster',
            'worker_nodes': 1,
            'apply_resource_limits': True,
            'worker_config': {
                'cpu': '1',
                'memory': '2GB'
            },
            'control_plane_config': {
                'cpu': '1',
                'memory': '2GB'
            }
        }

        self.env_config = {
            'environment': 'dev',
            'namespace': 'default'
        }

    @patch('kind_cluster_setup.cluster.kind_cluster.KindClient')
    @patch('kind_cluster_setup.cluster.kind_cluster.DockerClient')
    @patch('kind_cluster_setup.cluster.kind_cluster.KindCluster.wait_for_ready')
    def test_create_cluster(self, mock_wait_for_ready, mock_docker_client, mock_kind_client):
        """Test creating a cluster."""
        # Set up mocks
        mock_docker_instance = MagicMock()
        mock_docker_instance.is_running.return_value = True
        mock_docker_client.return_value = mock_docker_instance

        mock_kind_instance = MagicMock()
        mock_kind_instance.is_installed.return_value = True
        mock_kind_instance.get_clusters.return_value = []
        mock_kind_instance.create_cluster.return_value = CommandResult(returncode=0, stdout="", stderr="")
        mock_kind_client.return_value = mock_kind_instance

        # Mock wait_for_ready to return True
        mock_wait_for_ready.return_value = True

        # Create a cluster
        cluster = KindCluster(self.cluster_config, self.env_config)
        result = cluster.create()

        # Verify that the kind client was called
        mock_kind_instance.create_cluster.assert_called_once()

        # Verify that wait_for_ready was called
        mock_wait_for_ready.assert_called_once()

        # Verify that _created was set to True
        self.assertTrue(cluster._created)
        self.assertTrue(result)

    @patch('kind_cluster_setup.cluster.kind_cluster.KindClient')
    def test_delete_cluster(self, mock_kind_client):
        """Test deleting a cluster."""
        # Set up mocks
        mock_kind_instance = MagicMock()
        mock_kind_instance.get_clusters.return_value = ["test-cluster"]
        mock_kind_instance.delete_cluster.return_value = CommandResult(returncode=0, stdout="", stderr="")
        mock_kind_client.return_value = mock_kind_instance

        # Create a cluster
        cluster = KindCluster(self.cluster_config, self.env_config)
        result = cluster.delete()

        # Verify that the kind client was called
        mock_kind_instance.delete_cluster.assert_called_once_with("test-cluster")

        # Verify the result
        self.assertTrue(result)

    @patch('kind_cluster_setup.cluster.kind_cluster.KubectlClient')
    def test_install_ingress(self, mock_kubectl_client):
        """Test installing ingress."""
        # Set up mocks
        mock_kubectl_instance = MagicMock()
        mock_kubectl_instance.apply.return_value = CommandResult(returncode=0, stdout="", stderr="")
        mock_kubectl_instance.wait_for_condition.return_value = CommandResult(returncode=0, stdout="", stderr="")
        mock_kubectl_client.return_value = mock_kubectl_instance

        # Create a cluster
        cluster = KindCluster(self.cluster_config, self.env_config)
        cluster.kubectl_client = mock_kubectl_instance
        result = cluster.install_ingress('nginx')

        # Verify that the kubectl client was called
        mock_kubectl_instance.apply.assert_called_once()
        mock_kubectl_instance.wait_for_condition.assert_called_once()

        # Verify the result
        self.assertTrue(result)

    @patch('kind_cluster_setup.cluster.kind_cluster.KubectlClient')
    def test_wait_for_ready(self, mock_kubectl_client):
        """Test waiting for the cluster to be ready."""
        # Set up mocks
        mock_kubectl_instance = MagicMock()
        mock_kubectl_instance.execute.return_value = CommandResult(
            returncode=0,
            stdout="'True True'",
            stderr=""
        )
        mock_kubectl_client.return_value = mock_kubectl_instance

        # Create a cluster
        cluster = KindCluster(self.cluster_config, self.env_config)
        cluster.kubectl_client = mock_kubectl_instance
        result = cluster.wait_for_ready(timeout=30)

        # Verify that the kubectl client was called
        mock_kubectl_instance.execute.assert_called_once()

        # Verify the result
        self.assertTrue(result)

    @patch('kind_cluster_setup.cluster.kind_cluster.KubectlClient')
    def test_get_info(self, mock_kubectl_client):
        """Test getting cluster info."""
        # Set up mocks
        mock_kubectl_instance = MagicMock()
        mock_kubectl_instance.execute.side_effect = [
            CommandResult(returncode=0, stdout="node1 Ready", stderr=""),
            CommandResult(returncode=0, stdout="node1 10% 20%", stderr="")
        ]
        mock_kubectl_client.return_value = mock_kubectl_instance

        # Create a cluster
        cluster = KindCluster(self.cluster_config, self.env_config)
        cluster.kubectl_client = mock_kubectl_instance
        result = cluster.get_info()

        # Verify that the kubectl client was called
        self.assertEqual(mock_kubectl_instance.execute.call_count, 2)

        # Verify the result
        self.assertIn('nodes', result)

    @patch('kind_cluster_setup.cluster.kind_cluster.KubectlClient')
    def test_check_health(self, mock_kubectl_client):
        """Test checking cluster health."""
        # Set up mocks
        mock_kubectl_instance = MagicMock()
        mock_kubectl_instance.execute.return_value = CommandResult(
            returncode=0,
            stdout="'node1 True'",
            stderr=""
        )
        mock_kubectl_client.return_value = mock_kubectl_instance

        # Create a cluster
        cluster = KindCluster(self.cluster_config, self.env_config)
        cluster.kubectl_client = mock_kubectl_instance
        result = cluster.check_health()

        # Verify that the kubectl client was called
        mock_kubectl_instance.execute.assert_called_once()

        # Verify the result
        self.assertEqual(result['status'], 'healthy')
        self.assertEqual(len(result['issues']), 0)

    def test_context_manager(self):
        """Test using the cluster as a context manager."""
        # Create a cluster instance
        cluster = KindCluster(self.cluster_config, self.env_config)

        # Mock the create and delete methods
        cluster.create = MagicMock(return_value=True)
        cluster.delete = MagicMock(return_value=True)

        # Set _created to True to ensure delete is called
        cluster._created = True

        # Use the cluster as a context manager
        with cluster:
            # Verify that create was called
            cluster.create.assert_called_once()

        # Verify that delete was called
        cluster.delete.assert_called_once()


if __name__ == '__main__':
    unittest.main()
