"""
Constants for the Kind Cluster Setup application.

This module defines constants used throughout the application,
such as file paths, default values, and configuration settings.
"""

import os
import sys
from pathlib import Path

# Project root directory
PROJECT_ROOT = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

# Data directory for storing repository data
DATA_DIR = os.path.join(PROJECT_ROOT, "data")

# Application paths
APP_CONFIG_PATH = os.environ.get(
    "APP_CONFIG_PATH",
    os.path.join(PROJECT_ROOT, "applications/{app}/config/{environment}.yaml"),
)
HELM_CHART_PATH = os.environ.get(
    "HELM_CHART_PATH", os.path.join(PROJECT_ROOT, "applications/{app}/helm")
)
K8S_MANIFEST_PATH = os.environ.get(
    "K8S_MANIFEST_PATH", os.path.join(PROJECT_ROOT, "applications/{app}/kubernetes")
)
CLUSTER_CONFIG_PATH = os.environ.get(
    "CLUSTER_CONFIG_PATH", os.path.join(PROJECT_ROOT, "config/cluster_config.yaml")
)

# Environments
ENVIRONMENTS = ["dev", "qa", "staging", "prod"]

# Default cluster configuration
DEFAULT_CLUSTER_CONFIG = {
    "name": "kind-cluster",
    "worker_nodes": 1,
    "apply_resource_limits": True,
    "worker_config": {"cpu": "1", "memory": "2GB"},
    "control_plane_config": {"cpu": "1", "memory": "2GB"},
}

# Default environment configuration
DEFAULT_ENV_CONFIG = {"environment": "dev", "namespace": "default"}

# Default ports
DEFAULT_HTTP_PORT = 80
DEFAULT_HTTPS_PORT = 443
DEFAULT_NODE_PORT_RANGE_START = 30000

# Timeout values (in seconds)
DEFAULT_TIMEOUT = 300
RETRY_TIMEOUT = 60
RETRY_INTERVAL = 2

# Maximum number of retry attempts
MAX_RETRY_ATTEMPTS = 3
