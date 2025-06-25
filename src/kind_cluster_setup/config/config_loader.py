from typing import Dict, List, Union, Any
import os
from kind_cluster_setup.utils.yaml_handler import load_yaml
from kind_cluster_setup.utils.constants import APP_CONFIG_PATH, CLUSTER_CONFIG_PATH
from kind_cluster_setup.utils.logging import get_logger

logger = get_logger(__name__)

def load_app_config(app: str, environment: str, multi_doc: bool = True) -> Union[Dict[str, Any], List[Dict[str, Any]]]:
    """Load application configuration from YAML file.

    Args:
        app: Application name
        environment: Environment name (dev, qa, staging, prod)
        multi_doc: If True, load all YAML documents in the file

    Returns:
        Application configuration as a dictionary or list of dictionaries if multi_doc is True
    """
    config_path = APP_CONFIG_PATH.format(app=app, environment=environment)

    # Check if the file exists
    if not os.path.exists(config_path):
        # Try alternative paths
        alt_paths = [
            os.path.join("config", "apps", environment, f"{app}.yaml"),
            os.path.join("applications", app, "config", f"{environment}.yaml"),
            os.path.join("applications", app, "kubernetes", f"{environment}.yaml")
        ]

        for alt_path in alt_paths:
            if os.path.exists(alt_path):
                logger.info(f"Using alternative config path: {alt_path}")
                config_path = alt_path
                break
        else:
            logger.warning(f"Could not find config file for {app} in environment {environment}")
            raise FileNotFoundError(f"Config file for {app} in environment {environment} not found")

    logger.info(f"Loading app config from {config_path}")
    return load_yaml(config_path, multi_doc=multi_doc)

def load_cluster_config(environment: str) -> Dict[str, Any]:
    """Load cluster configuration from YAML file.

    Args:
        environment: Environment name (dev, qa, staging, prod)

    Returns:
        Cluster configuration as a dictionary
    """
    config_path = CLUSTER_CONFIG_PATH.format(environment=environment)

    # Check if the file exists
    if not os.path.exists(config_path):
        logger.warning(f"Could not find cluster config file for environment {environment}")
        # Return default config
        from kind_cluster_setup.utils.constants import DEFAULT_CLUSTER_CONFIG
        return DEFAULT_CLUSTER_CONFIG

    return load_yaml(config_path)

def get_environment_config(environment: str) -> Dict[str, str]:
    """Get environment configuration.

    Args:
        environment: Environment name (dev, qa, staging, prod)

    Returns:
        Environment configuration as a dictionary
    """
    base_config = {
        "dev": {"namespace": "dev", "resource_multiplier": "0.5"},
        "qa": {"namespace": "qa", "resource_multiplier": "0.75"},
        "staging": {"namespace": "staging", "resource_multiplier": "1.0"},
        "prod": {"namespace": "prod", "resource_multiplier": "1.5"}
    }
    return base_config.get(environment, base_config["dev"])