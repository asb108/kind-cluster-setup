"""
Tests for repository implementations.

This module contains tests for the repository implementations,
focusing on specific query methods and the repository factory.
Basic CRUD operations are tested in test_repository_persistence.py.
"""

import os
import shutil
import tempfile
import unittest
from datetime import datetime

from kind_cluster_setup.domain.entities import Application, Cluster, Task, User
from kind_cluster_setup.infrastructure.repositories.factory import (
    RepositoryFactory,
    get_repository_factory,
    init_repository_factory,
)
from kind_cluster_setup.infrastructure.repositories.json_repositories import (
    JsonApplicationRepository,
    JsonClusterRepository,
    JsonTaskRepository,
    JsonUserRepository,
)


class TestJsonClusterRepository(unittest.TestCase):
    """Tests for JsonClusterRepository specific query methods."""

    def setUp(self):
        """Set up the test environment."""
        # Create a temporary directory for test files
        self.test_dir = tempfile.mkdtemp()
        self.repo_file = os.path.join(self.test_dir, "clusters.json")
        self.repo = JsonClusterRepository(self.repo_file)

    def tearDown(self):
        """Clean up the test environment."""
        # Remove the temporary directory
        shutil.rmtree(self.test_dir)

    def test_find_by_name(self):
        """Test finding a cluster by name."""
        # Create and save clusters
        cluster1 = Cluster(
            name="cluster1", config={"worker_nodes": 1}, environment="dev"
        )
        cluster2 = Cluster(
            name="cluster2", config={"worker_nodes": 2}, environment="test"
        )

        self.repo.save(cluster1)
        self.repo.save(cluster2)

        # Find cluster by name
        found_cluster = self.repo.find_by_name("cluster2")

        # Verify the cluster was found
        self.assertIsNotNone(found_cluster)
        self.assertEqual(found_cluster.name, "cluster2")
        self.assertEqual(found_cluster.environment, "test")

    def test_find_by_environment(self):
        """Test finding clusters by environment."""
        # Create and save clusters
        cluster1 = Cluster(
            name="cluster1", config={"worker_nodes": 1}, environment="dev"
        )
        cluster2 = Cluster(
            name="cluster2", config={"worker_nodes": 2}, environment="test"
        )
        cluster3 = Cluster(
            name="cluster3", config={"worker_nodes": 3}, environment="dev"
        )

        self.repo.save(cluster1)
        self.repo.save(cluster2)
        self.repo.save(cluster3)

        # Find clusters by environment
        dev_clusters = self.repo.find_by_environment("dev")

        # Verify the clusters were found
        self.assertEqual(len(dev_clusters), 2)
        self.assertTrue(any(c.name == "cluster1" for c in dev_clusters))
        self.assertTrue(any(c.name == "cluster3" for c in dev_clusters))

    def test_find_by_status(self):
        """Test finding clusters by status."""
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
            status="stopped",
        )
        cluster3 = Cluster(
            name="cluster3",
            config={"worker_nodes": 3},
            environment="dev",
            status="running",
        )

        self.repo.save(cluster1)
        self.repo.save(cluster2)
        self.repo.save(cluster3)

        # Find clusters by status
        running_clusters = self.repo.find_by_status("running")

        # Verify the clusters were found
        self.assertEqual(len(running_clusters), 2)
        self.assertTrue(any(c.name == "cluster1" for c in running_clusters))
        self.assertTrue(any(c.name == "cluster3" for c in running_clusters))


class TestJsonTaskRepository(unittest.TestCase):
    """Tests for JsonTaskRepository specific query methods."""

    def setUp(self):
        """Set up the test environment."""
        # Create a temporary directory for test files
        self.test_dir = tempfile.mkdtemp()
        self.repo_file = os.path.join(self.test_dir, "tasks.json")
        self.repo = JsonTaskRepository(self.repo_file)

    def tearDown(self):
        """Clean up the test environment."""
        # Remove the temporary directory
        shutil.rmtree(self.test_dir)

    def test_find_by_cluster_id(self):
        """Test finding tasks by cluster ID."""
        # Create and save tasks
        task1 = Task(
            name="task1", description="Task 1 description", cluster_id="cluster-123"
        )
        task2 = Task(
            name="task2", description="Task 2 description", cluster_id="cluster-456"
        )
        task3 = Task(
            name="task3", description="Task 3 description", cluster_id="cluster-123"
        )

        self.repo.save(task1)
        self.repo.save(task2)
        self.repo.save(task3)

        # Find tasks by cluster ID
        cluster_tasks = self.repo.find_by_cluster_id("cluster-123")

        # Verify the tasks were found
        self.assertEqual(len(cluster_tasks), 2)
        self.assertTrue(any(t.name == "task1" for t in cluster_tasks))
        self.assertTrue(any(t.name == "task3" for t in cluster_tasks))

    def test_find_by_status(self):
        """Test finding tasks by status."""
        # Create and save tasks
        task1 = Task(name="task1", description="Task 1 description", status="pending")
        task2 = Task(name="task2", description="Task 2 description", status="completed")
        task3 = Task(name="task3", description="Task 3 description", status="pending")

        self.repo.save(task1)
        self.repo.save(task2)
        self.repo.save(task3)

        # Find tasks by status
        pending_tasks = self.repo.find_by_status("pending")

        # Verify the tasks were found
        self.assertEqual(len(pending_tasks), 2)
        self.assertTrue(any(t.name == "task1" for t in pending_tasks))
        self.assertTrue(any(t.name == "task3" for t in pending_tasks))

    def test_find_pending_tasks(self):
        """Test finding pending tasks."""
        # Create and save tasks
        task1 = Task(name="task1", description="Task 1 description", status="pending")
        task2 = Task(name="task2", description="Task 2 description", status="completed")
        task3 = Task(name="task3", description="Task 3 description", status="pending")

        self.repo.save(task1)
        self.repo.save(task2)
        self.repo.save(task3)

        # Find pending tasks
        pending_tasks = self.repo.find_pending_tasks()

        # Verify the tasks were found
        self.assertEqual(len(pending_tasks), 2)
        self.assertTrue(any(t.name == "task1" for t in pending_tasks))
        self.assertTrue(any(t.name == "task3" for t in pending_tasks))


class TestRepositoryFactory(unittest.TestCase):
    """Tests for RepositoryFactory."""

    def setUp(self):
        """Set up the test environment."""
        # Create a temporary directory for test files
        self.test_dir = tempfile.mkdtemp()
        self.factory = init_repository_factory(self.test_dir)

    def tearDown(self):
        """Clean up the test environment."""
        # Remove the temporary directory
        shutil.rmtree(self.test_dir)

    def test_get_cluster_repository(self):
        """Test getting a cluster repository."""
        # Get the cluster repository
        repo = self.factory.get_cluster_repository()

        # Verify the repository is of the correct type
        self.assertIsInstance(repo, JsonClusterRepository)

    def test_get_task_repository(self):
        """Test getting a task repository."""
        # Get the task repository
        repo = self.factory.get_task_repository()

        # Verify the repository is of the correct type
        self.assertIsInstance(repo, JsonTaskRepository)

    def test_get_application_repository(self):
        """Test getting an application repository."""
        # Get the application repository
        repo = self.factory.get_application_repository()

        # Verify the repository is of the correct type
        self.assertIsInstance(repo, JsonApplicationRepository)

    def test_get_user_repository(self):
        """Test getting a user repository."""
        # Get the user repository
        repo = self.factory.get_user_repository()

        # Verify the repository is of the correct type
        self.assertIsInstance(repo, JsonUserRepository)

    def test_repository_singleton(self):
        """Test that repositories are singletons within the factory."""
        # Get repositories multiple times
        repo1 = self.factory.get_cluster_repository()
        repo2 = self.factory.get_cluster_repository()

        # Verify that the same repository instance is returned
        self.assertIs(repo1, repo2)

    def test_get_repository_factory(self):
        """Test getting the repository factory."""
        # Get the repository factory
        factory = get_repository_factory()

        # Verify that the same factory instance is returned
        self.assertIs(factory, self.factory)
