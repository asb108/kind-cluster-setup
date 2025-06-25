"""
Tests for repository persistence.

This module contains tests for the repository persistence,
ensuring that entities are correctly persisted to disk.
"""

import json
import os
import shutil
import tempfile
import unittest
from datetime import datetime

from kind_cluster_setup.domain.entities import Application, Cluster, Task, User
from kind_cluster_setup.infrastructure.repositories.json_repositories import (
    JsonApplicationRepository, JsonClusterRepository, JsonTaskRepository,
    JsonUserRepository)


class TestRepositoryPersistence(unittest.TestCase):
    """Tests for repository persistence."""

    def setUp(self):
        """Set up the test environment."""
        # Create a temporary directory for test files
        self.test_dir = tempfile.mkdtemp()

        # Create repository files
        self.cluster_repo_file = os.path.join(self.test_dir, "clusters.json")
        self.task_repo_file = os.path.join(self.test_dir, "tasks.json")
        self.app_repo_file = os.path.join(self.test_dir, "applications.json")
        self.user_repo_file = os.path.join(self.test_dir, "users.json")

        # Create repositories
        self.cluster_repo = JsonClusterRepository(self.cluster_repo_file)
        self.task_repo = JsonTaskRepository(self.task_repo_file)
        self.app_repo = JsonApplicationRepository(self.app_repo_file)
        self.user_repo = JsonUserRepository(self.user_repo_file)

    def tearDown(self):
        """Clean up the test environment."""
        # Remove the temporary directory
        shutil.rmtree(self.test_dir)

    def test_cluster_persistence(self):
        """Test that clusters are persisted to disk."""
        # Create and save a cluster
        cluster = Cluster(
            name="test-cluster",
            config={"worker_nodes": 1},
            environment="dev",
            status="running",
        )

        self.cluster_repo.save(cluster)

        # Verify that the file was created
        self.assertTrue(os.path.exists(self.cluster_repo_file))

        # Read the file directly
        with open(self.cluster_repo_file, "r") as f:
            data = json.load(f)

        # Verify the data
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["name"], "test-cluster")
        self.assertEqual(data[0]["environment"], "dev")
        self.assertEqual(data[0]["status"], "running")

        # Create a new repository instance that reads from the same file
        new_repo = JsonClusterRepository(self.cluster_repo_file)

        # Verify that the cluster was loaded from disk
        found_cluster = new_repo.find_by_id(cluster.id)
        self.assertIsNotNone(found_cluster)
        self.assertEqual(found_cluster.name, "test-cluster")
        self.assertEqual(found_cluster.environment, "dev")
        self.assertEqual(found_cluster.status, "running")

    def test_task_persistence(self):
        """Test that tasks are persisted to disk."""
        # Create and save a task
        task = Task(
            name="test-task",
            description="Test task description",
            status="running",
            command="create",
            args={"cluster_name": "test-cluster"},
        )

        self.task_repo.save(task)

        # Verify that the file was created
        self.assertTrue(os.path.exists(self.task_repo_file))

        # Read the file directly
        with open(self.task_repo_file, "r") as f:
            data = json.load(f)

        # Verify the data
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["name"], "test-task")
        self.assertEqual(data[0]["description"], "Test task description")
        self.assertEqual(data[0]["status"], "running")
        self.assertEqual(data[0]["command"], "create")

        # Create a new repository instance that reads from the same file
        new_repo = JsonTaskRepository(self.task_repo_file)

        # Verify that the task was loaded from disk
        found_task = new_repo.find_by_id(task.id)
        self.assertIsNotNone(found_task)
        self.assertEqual(found_task.name, "test-task")
        self.assertEqual(found_task.description, "Test task description")
        self.assertEqual(found_task.status, "running")
        self.assertEqual(found_task.command, "create")

    def test_application_persistence(self):
        """Test that applications are persisted to disk."""
        # Create and save an application
        app = Application(
            name="test-app",
            description="Test application",
            cluster_id="cluster-123",
            config={"name": "test-app"},
            status="deployed",
            deployment_method="helm",
        )

        self.app_repo.save(app)

        # Verify that the file was created
        self.assertTrue(os.path.exists(self.app_repo_file))

        # Read the file directly
        with open(self.app_repo_file, "r") as f:
            data = json.load(f)

        # Verify the data
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["name"], "test-app")
        self.assertEqual(data[0]["description"], "Test application")
        self.assertEqual(data[0]["cluster_id"], "cluster-123")
        self.assertEqual(data[0]["status"], "deployed")
        self.assertEqual(data[0]["deployment_method"], "helm")

        # Create a new repository instance that reads from the same file
        new_repo = JsonApplicationRepository(self.app_repo_file)

        # Verify that the application was loaded from disk
        found_app = new_repo.find_by_id(app.id)
        self.assertIsNotNone(found_app)
        self.assertEqual(found_app.name, "test-app")
        self.assertEqual(found_app.description, "Test application")
        self.assertEqual(found_app.cluster_id, "cluster-123")
        self.assertEqual(found_app.status, "deployed")
        self.assertEqual(found_app.deployment_method, "helm")

    def test_user_persistence(self):
        """Test that users are persisted to disk."""
        # Create and save a user
        user = User(
            username="testuser",
            email="test@example.com",
            password_hash="hashed_password",
            role="admin",
            is_active=True,
        )

        self.user_repo.save(user)

        # Verify that the file was created
        self.assertTrue(os.path.exists(self.user_repo_file))

        # Read the file directly
        with open(self.user_repo_file, "r") as f:
            data = json.load(f)

        # Verify the data
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["username"], "testuser")
        self.assertEqual(data[0]["email"], "test@example.com")
        self.assertEqual(data[0]["password_hash"], "hashed_password")
        self.assertEqual(data[0]["role"], "admin")
        self.assertTrue(data[0]["is_active"])

        # Create a new repository instance that reads from the same file
        new_repo = JsonUserRepository(self.user_repo_file)

        # Verify that the user was loaded from disk
        found_user = new_repo.find_by_id(user.id)
        self.assertIsNotNone(found_user)
        self.assertEqual(found_user.username, "testuser")
        self.assertEqual(found_user.email, "test@example.com")
        self.assertEqual(found_user.password_hash, "hashed_password")
        self.assertEqual(found_user.role, "admin")
        self.assertTrue(found_user.is_active)

    def test_update_entity(self):
        """Test updating an entity."""
        # Create and save a cluster
        cluster = Cluster(
            name="test-cluster",
            config={"worker_nodes": 1},
            environment="dev",
            status="running",
        )

        self.cluster_repo.save(cluster)

        # Update the cluster
        cluster.status = "stopped"
        self.cluster_repo.save(cluster)

        # Create a new repository instance that reads from the same file
        new_repo = JsonClusterRepository(self.cluster_repo_file)

        # Verify that the cluster was updated
        found_cluster = new_repo.find_by_id(cluster.id)
        self.assertIsNotNone(found_cluster)
        self.assertEqual(found_cluster.status, "stopped")

    def test_delete_entity(self):
        """Test deleting an entity."""
        # Create and save a cluster
        cluster = Cluster(
            name="test-cluster",
            config={"worker_nodes": 1},
            environment="dev",
            status="running",
        )

        self.cluster_repo.save(cluster)

        # Delete the cluster
        self.cluster_repo.delete(cluster.id)

        # Create a new repository instance that reads from the same file
        new_repo = JsonClusterRepository(self.cluster_repo_file)

        # Verify that the cluster was deleted
        found_cluster = new_repo.find_by_id(cluster.id)
        self.assertIsNone(found_cluster)

    def test_find_by_criteria(self):
        """Test finding entities by criteria."""
        # Create and save clusters
        cluster1 = Cluster(
            name="cluster1",
            config={"worker_nodes": 1},
            environment="dev",
            status="running",
        )

        cluster2 = Cluster(
            name="cluster2",
            config={"worker_nodes": 2},
            environment="test",
            status="running",
        )

        cluster3 = Cluster(
            name="cluster3",
            config={"worker_nodes": 3},
            environment="dev",
            status="stopped",
        )

        self.cluster_repo.save(cluster1)
        self.cluster_repo.save(cluster2)
        self.cluster_repo.save(cluster3)

        # Create a new repository instance that reads from the same file
        new_repo = JsonClusterRepository(self.cluster_repo_file)

        # Find clusters by environment
        dev_clusters = new_repo.find_by_environment("dev")
        self.assertEqual(len(dev_clusters), 2)
        self.assertTrue(any(c.name == "cluster1" for c in dev_clusters))
        self.assertTrue(any(c.name == "cluster3" for c in dev_clusters))

        # Find clusters by status
        running_clusters = new_repo.find_by_status("running")
        self.assertEqual(len(running_clusters), 2)
        self.assertTrue(any(c.name == "cluster1" for c in running_clusters))
        self.assertTrue(any(c.name == "cluster2" for c in running_clusters))


if __name__ == "__main__":
    unittest.main()
