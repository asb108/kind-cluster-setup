"""
Repository interfaces for domain entities.

This module defines repository interfaces for the domain entities,
such as ClusterRepository, TaskRepository, and ApplicationRepository.
"""

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any

from kind_cluster_setup.core.repository import Repository
from kind_cluster_setup.domain.entities import Cluster, Task, Application, User


class ClusterRepository(Repository[Cluster], ABC):
    """Repository interface for Cluster entities."""
    
    @abstractmethod
    def find_by_name(self, name: str) -> Optional[Cluster]:
        """
        Find a cluster by its name.
        
        Args:
            name: The name of the cluster to find
            
        Returns:
            The cluster if found, None otherwise
        """
        pass
    
    @abstractmethod
    def find_by_environment(self, environment: str) -> List[Cluster]:
        """
        Find clusters by environment.
        
        Args:
            environment: The environment to filter by
            
        Returns:
            A list of clusters in the specified environment
        """
        pass
    
    @abstractmethod
    def find_by_status(self, status: str) -> List[Cluster]:
        """
        Find clusters by status.
        
        Args:
            status: The status to filter by
            
        Returns:
            A list of clusters with the specified status
        """
        pass


class TaskRepository(Repository[Task], ABC):
    """Repository interface for Task entities."""
    
    @abstractmethod
    def find_by_cluster_id(self, cluster_id: str) -> List[Task]:
        """
        Find tasks by cluster ID.
        
        Args:
            cluster_id: The ID of the cluster to filter by
            
        Returns:
            A list of tasks associated with the specified cluster
        """
        pass
    
    @abstractmethod
    def find_by_status(self, status: str) -> List[Task]:
        """
        Find tasks by status.
        
        Args:
            status: The status to filter by
            
        Returns:
            A list of tasks with the specified status
        """
        pass
    
    @abstractmethod
    def find_pending_tasks(self) -> List[Task]:
        """
        Find pending tasks.
        
        Returns:
            A list of tasks with status 'pending'
        """
        pass


class ApplicationRepository(Repository[Application], ABC):
    """Repository interface for Application entities."""
    
    @abstractmethod
    def find_by_cluster_id(self, cluster_id: str) -> List[Application]:
        """
        Find applications by cluster ID.
        
        Args:
            cluster_id: The ID of the cluster to filter by
            
        Returns:
            A list of applications deployed on the specified cluster
        """
        pass
    
    @abstractmethod
    def find_by_name(self, name: str) -> Optional[Application]:
        """
        Find an application by its name.
        
        Args:
            name: The name of the application to find
            
        Returns:
            The application if found, None otherwise
        """
        pass
    
    @abstractmethod
    def find_by_status(self, status: str) -> List[Application]:
        """
        Find applications by status.
        
        Args:
            status: The status to filter by
            
        Returns:
            A list of applications with the specified status
        """
        pass


class UserRepository(Repository[User], ABC):
    """Repository interface for User entities."""
    
    @abstractmethod
    def find_by_username(self, username: str) -> Optional[User]:
        """
        Find a user by username.
        
        Args:
            username: The username to search for
            
        Returns:
            The user if found, None otherwise
        """
        pass
    
    @abstractmethod
    def find_by_email(self, email: str) -> Optional[User]:
        """
        Find a user by email.
        
        Args:
            email: The email to search for
            
        Returns:
            The user if found, None otherwise
        """
        pass
    
    @abstractmethod
    def find_by_role(self, role: str) -> List[User]:
        """
        Find users by role.
        
        Args:
            role: The role to filter by
            
        Returns:
            A list of users with the specified role
        """
        pass
