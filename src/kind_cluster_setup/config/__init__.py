"""Configuration package for Kind Cluster Setup.

This package contains configuration settings and utilities for the application.
"""

# Import configuration modules for easier access
from kind_cluster_setup.config.config import (
    API_STATUS,
    DEFAULT_CONTROL_PLANE_CONFIG,
    DEFAULT_NAMESPACE,
    DEFAULT_WORKER_CONFIG,
    DEPLOYMENT_METHODS,
    ENVIRONMENTS,
    TASK_MESSAGES,
)
from kind_cluster_setup.config.server_config import (
    DEFAULT_ENVIRONMENTS,
    DEMO_APPS,
    SERVER_CONFIG,
    get_server_config,
)
