"""
Kind Cluster Setup - Simplified Kubernetes development with Kind

This package provides tools for creating, managing, and deploying to
Kubernetes clusters using Kind (Kubernetes IN Docker).

Key Components:
- cluster: Core functionality for Kind cluster management
- deployment: Application deployment capabilities
- api: REST API for remote management
- cli: Command-line interface tools
"""

__version__ = '0.1.0'

from .utils.logging import setup_logging

# Set up logging when the package is imported
setup_logging()

# Import statements moved to avoid circular imports
# Core components can be imported directly from their modules
