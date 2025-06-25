from typing import Dict
from kind_cluster_setup.utils.yaml_handler import load_yaml
from kind_cluster_setup.constants import APP_CONFIG_PATH, CLUSTER_CONFIG_PATH

def load_app_config(app: str, environment: str) -> Dict[str, any]:
    config_path = APP_CONFIG_PATH.format(app=app, environment=environment)
    return load_yaml(config_path)

def load_cluster_config(environment: str) -> Dict[str, any]:
    config_path = CLUSTER_CONFIG_PATH.format(environment=environment)
    return load_yaml(config_path)

def get_environment_config(environment: str) -> Dict[str, str]:
    base_config = {
        "dev": {"namespace": "dev", "resource_multiplier": "0.5"},
        "qa": {"namespace": "qa", "resource_multiplier": "0.75"},
        "staging": {"namespace": "staging", "resource_multiplier": "1.0"},
        "prod": {"namespace": "prod", "resource_multiplier": "1.5"}
    }
    return base_config.get(environment, base_config["dev"])
