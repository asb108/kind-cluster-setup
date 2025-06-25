"""
API Package for Kind Cluster Setup

This package provides RESTful API endpoints for managing Kind Kubernetes clusters
and the applications deployed on them. The API allows remote management of clusters
and integrates with the frontend UI.

Components:
- server: Main FastAPI server with comprehensive endpoints
- simple_server: Lightweight server for basic operations
- test_server: Server implementation for testing

Usage:
    from kind_cluster_setup.api.server import start_api_server
    from kind_cluster_setup.config.server_config import get_server_config

    # Get configuration for a specific environment
    config = get_server_config(environment="dev")

    # Start the API server with configuration
    start_api_server(environment="dev")

    # Or override specific settings
    start_api_server(host='0.0.0.0', port=8080, environment="prod")
"""

# For convenient imports
from .server import start_api_server, app as api_app
from .simple_server import app as simple_app