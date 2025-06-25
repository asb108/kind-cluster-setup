"""Configuration module for Kind Cluster Setup.

This module centralizes configuration settings for the application, including
environment names, default resource limits, and other configurable parameters.
"""

from typing import Dict, Any, List

# Environment configurations
ENVIRONMENTS = {
    "dev": {
        "display_name": "Development",
        "description": "Development environment for testing and development"
    },
    "test": {
        "display_name": "Testing",
        "description": "Testing environment for QA and validation"
    },
    "prod": {
        "display_name": "Production",
        "description": "Production environment for live workloads"
    }
}

# Default resource configurations
DEFAULT_WORKER_CONFIG = {
    'cpu': 2,
    'memory': '4GB'
}

DEFAULT_CONTROL_PLANE_CONFIG = {
    'cpu': 2,
    'memory': '4GB'
}

# Deployment methods
DEPLOYMENT_METHODS = {
    "kubectl": {
        "display_name": "Kubectl",
        "description": "Deploy using kubectl apply commands"
    },
    "helm": {
        "display_name": "Helm",
        "description": "Deploy using Helm charts"
    },
    "kustomize": {
        "display_name": "Kustomize",
        "description": "Deploy using Kustomize overlays"
    }
}

# Default namespaces
DEFAULT_NAMESPACE = "default"

# API response status codes
API_STATUS = {
    "success": "success",
    "error": "error",
    "pending": "pending",
    "running": "running",
    "completed": "completed",
    "failed": "failed",
    "accepted": "accepted"
}

# Task status messages
TASK_MESSAGES = {
    "cluster_creation": {
        "queued": "Cluster creation queued",
        "running": "Cluster creation in progress...",
        "completed": "Cluster created successfully",
        "failed": "Failed to create cluster: {error}"
    },
    "app_deployment": {
        "pending": "Preparing to deploy {app_name} to {cluster_name}",
        "preparing": "Preparing to deploy {app_name}",
        "deploying": "Deploying {app_name} to cluster {cluster_name}",
        "running": "Deploying {app_name} to cluster {cluster_name}",
        "completed": "Successfully deployed {app_name} to {cluster_name}",
        "failed": "Failed to deploy {app_name}: {error}",
        "started": "Started deployment of {app_name} to {cluster_name}"
    }
}