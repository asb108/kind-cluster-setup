"""Configuration package for Kind Cluster Setup.

This package contains configuration settings and utilities for the application.
"""

# Import configuration modules for easier access
from kind_cluster_setup.config.config import (
    API_STATUS,
    TASK_MESSAGES,
    DEFAULT_WORKER_CONFIG,
    DEFAULT_CONTROL_PLANE_CONFIG,
    ENVIRONMENTS,
    DEFAULT_NAMESPACE,
    DEPLOYMENT_METHODS
)

from kind_cluster_setup.config.server_config import (
    get_server_config,
    SERVER_CONFIG,
    DEFAULT_ENVIRONMENTS,
    DEMO_APPS
)