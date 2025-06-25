"""
Deployment Package for Kind Cluster Setup

This package contains components for deploying applications to Kind Kubernetes clusters.
It provides abstraction layers for different deployment methods including Helm charts,
Kubernetes manifests, and direct kubectl application.

Components:
- base: Base deployment interface and common functionality
- helm: Helm chart deployment implementation
- kubernetes: Direct Kubernetes manifest deployment

Usage:
    from kind_cluster_setup.deployment.helm import HelmDeploymentStrategy
    from kind_cluster_setup.deployment.kubernetes import KubernetesDeploymentStrategy

    # Deploy using Helm
    helm_deploy = HelmDeploymentStrategy()
    helm_deploy.deploy('nginx', app_config, env_config)

    # Deploy using Kubernetes manifests
    k8s_deploy = KubernetesDeploymentStrategy()
    k8s_deploy.deploy('nginx', template_dir, cluster_name, values, env_config)
"""

# For convenient imports
from .base import DeploymentStrategy
from .helm import HelmDeploymentStrategy
from .kubernetes import KubernetesDeploymentStrategy