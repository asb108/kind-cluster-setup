"""
Domain entities for the Kind Cluster Setup application.

This module defines the core domain entities used in the application,
such as Cluster, Task, and Application.
"""

import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime


@dataclass
class Entity:
    """Base class for all domain entities."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)


@dataclass
class Cluster(Entity):
    """
    Represents a Kubernetes cluster managed by Kind.

    Attributes:
        name: Name of the cluster
        config: Configuration for the cluster
        environment: Environment (e.g., dev, test, prod)
        status: Current status of the cluster
        nodes: List of nodes in the cluster
        created_by: User who created the cluster
    """
    name: str = ""
    config: Dict[str, Any] = field(default_factory=dict)
    environment: str = "dev"
    status: str = "created"
    nodes: List[Dict[str, Any]] = field(default_factory=list)
    created_by: Optional[str] = None

    def copy(self):
        """Create a copy of the cluster."""
        import copy
        return copy.deepcopy(self)


@dataclass
class Task(Entity):
    """
    Represents a task to be executed on a cluster.

    Attributes:
        name: Name of the task
        description: Description of the task
        status: Current status of the task
        cluster_id: ID of the cluster the task is associated with
        command: Command to execute
        args: Arguments for the command
        result: Result of the task execution
        created_by: User who created the task
    """
    name: str = ""
    description: str = ""
    status: str = "pending"
    cluster_id: Optional[str] = None
    command: Optional[str] = None
    args: Dict[str, Any] = field(default_factory=dict)
    result: Optional[Dict[str, Any]] = None
    created_by: Optional[str] = None


@dataclass
class Application(Entity):
    """
    Represents an application deployed on a cluster.

    Attributes:
        name: Name of the application
        description: Description of the application
        cluster_id: ID of the cluster the application is deployed on
        config: Configuration for the application
        status: Current status of the application
        deployment_method: Method used to deploy the application
        created_by: User who created the application
    """
    name: str = ""
    description: str = ""
    cluster_id: str = ""
    config: Dict[str, Any] = field(default_factory=dict)
    status: str = "created"
    deployment_method: str = "helm"
    created_by: Optional[str] = None


@dataclass
class User(Entity):
    """
    Represents a user of the application.

    Attributes:
        username: Username of the user
        email: Email address of the user
        password_hash: Hashed password of the user
        role: Role of the user
        is_active: Whether the user is active
    """
    username: str = ""
    email: str = ""
    password_hash: str = ""
    role: str = "user"
    is_active: bool = True
