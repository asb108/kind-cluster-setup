"""Server configuration module for Kind Cluster Setup API.

This module centralizes configuration settings for the API server, including
default values, environment configurations, and other configurable parameters.
"""

import os
from typing import Dict, Any

def get_server_config() -> Dict[str, Any]:
    """Get server configuration from environment variables with defaults."""
    return {
        "host": os.getenv("HOST", "0.0.0.0"),
        "port": int(os.getenv("PORT", "8020")),
        "debug": os.getenv("DEBUG", "true").lower() == "true",
        "cors": {
            "allow_origins": os.getenv("CORS_ALLOW_ORIGINS", "*").split(","),
            "allow_credentials": os.getenv("CORS_ALLOW_CREDENTIALS", "false").lower() == "true",
            "allow_methods": os.getenv("CORS_ALLOW_METHODS", "*").split(","),
            "allow_headers": os.getenv("CORS_ALLOW_HEADERS", "*").split(","),
            "expose_headers": os.getenv("CORS_EXPOSE_HEADERS", "*").split(","),
            "max_age": int(os.getenv("CORS_MAX_AGE", "86400"))
        }
    }

# Backward compatibility
SERVER_CONFIG = get_server_config()

# Default environments to check for cluster status
DEFAULT_ENVIRONMENTS = ['dev', 'staging', 'prod']

# Default resource configurations
DEFAULT_WORKER_CONFIG = {
    'cpu': 2,
    'memory': '4GB'
}

DEFAULT_CONTROL_PLANE_CONFIG = {
    'cpu': 2,
    'memory': '4GB'
}

# Demo application configurations
DEMO_APPS = {
    'mysql': {
        'app_name': 'mysql',
        'display_name': 'MySQL Database',
        'cluster_name': 'test-1',
        'namespace': 'mysql-dev',
        'deployment_method': 'kubectl',
        'app_version': '8.0',
        'access_urls': [{"type": "ingress", "url": "mysql://localhost:30306"}]
    },
    'airflow': {
        'app_name': 'airflow',
        'display_name': 'Apache Airflow',
        'cluster_name': 'test-1',
        'namespace': 'airflow',
        'deployment_method': 'helm',
        'app_version': '2.7.1',
        'access_urls': [{"type": "ingress", "url": "http://localhost:8080/airflow"}]
    }
}

# API response status codes (imported from config.py)
from kind_cluster_setup.config.config import API_STATUS

# Task status messages (imported from config.py)
from kind_cluster_setup.config.config import TASK_MESSAGES

# Helper function to get environment-specific configuration
def get_server_config(environment: str = "dev") -> Dict[str, Any]:
    """
    Get environment-specific server configuration.
    
    Args:
        environment: The environment name (dev, test, prod)
        
    Returns:
        Dict containing server configuration for the specified environment
    """
    # Base configuration is the default
    config = SERVER_CONFIG.copy()
    
    # Environment-specific overrides
    if environment == "prod":
        config["debug"] = False
        config["cors"]["allow_origins"] = ["https://your-production-domain.com"]
    elif environment == "staging":
        config["debug"] = False
        config["cors"]["allow_origins"] = ["https://staging.your-domain.com"]
    
    return config