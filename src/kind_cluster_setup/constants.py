import os

APP_CONFIG_PATH = os.environ.get("APP_CONFIG_PATH", "applications/{app}/config/{environment}.yaml")
HELM_CHART_PATH = os.environ.get("HELM_CHART_PATH", "./applications/{app}/helm")
K8S_MANIFEST_PATH = os.environ.get("K8S_MANIFEST_PATH", "applications/{app}/kubernetes")
CLUSTER_CONFIG_PATH = os.environ.get("CLUSTER_CONFIG_PATH", "cluster_config/{environment}.yaml")
