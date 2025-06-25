#!/usr/bin/env python3
"""
Example of using the core abstractions.

This script demonstrates how to use the core abstractions to create and manage
Kind clusters, deploy applications, and check their status.
"""

import os
import sys
import time
import argparse
from typing import Dict, Any

# Add the parent directory to the path so we can import the package
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from kind_cluster_setup.core.command import SubprocessCommandExecutor
from kind_cluster_setup.core.factory import ClientFactory
from kind_cluster_setup.core.cluster import ClusterConfig, EnvironmentConfig
from kind_cluster_setup.core.deployment import DeploymentStrategyFactory
from kind_cluster_setup.utils.logging import get_logger

logger = get_logger(__name__)


def create_cluster(factory: ClientFactory, cluster_name: str, worker_nodes: int = 1) -> None:
    """
    Create a Kind cluster.
    
    Args:
        factory: ClientFactory to use for creating clients
        cluster_name: Name of the cluster to create
        worker_nodes: Number of worker nodes
    """
    logger.info(f"Creating cluster {cluster_name} with {worker_nodes} worker nodes")
    
    # Create cluster manager
    cluster_manager = factory.create_cluster_manager()
    
    # Create cluster configuration
    cluster_config = ClusterConfig(
        name=cluster_name,
        worker_nodes=worker_nodes,
        worker_config=None,  # Use default
        control_plane_config=None,  # Use default
        apply_resource_limits=True
    )
    
    # Create environment configuration
    env_config = EnvironmentConfig(
        environment="dev",
        namespace="default"
    )
    
    # Create the cluster
    cluster = cluster_manager.create_cluster(cluster_config, env_config)
    
    # Wait for the cluster to be ready
    logger.info("Waiting for cluster to be ready")
    if cluster.wait_for_ready(timeout=120):
        logger.info("Cluster is ready")
    else:
        logger.warning("Cluster readiness check timed out")
    
    # Install ingress
    logger.info("Installing ingress controller")
    cluster.install_ingress()
    
    # Check cluster health
    health = cluster.check_health()
    logger.info(f"Cluster health: {health['status']}")
    
    # Get cluster info
    info = cluster.get_info()
    logger.info(f"Cluster has {len(info.get('nodes', []))} nodes")


def delete_cluster(factory: ClientFactory, cluster_name: str) -> None:
    """
    Delete a Kind cluster.
    
    Args:
        factory: ClientFactory to use for creating clients
        cluster_name: Name of the cluster to delete
    """
    logger.info(f"Deleting cluster {cluster_name}")
    
    # Create cluster manager
    cluster_manager = factory.create_cluster_manager()
    
    # Delete the cluster
    cluster_manager.delete_cluster(cluster_name)
    
    logger.info(f"Cluster {cluster_name} deleted")


def deploy_application(factory: ClientFactory, 
                      cluster_name: str, 
                      app_name: str, 
                      deployment_method: str = "helm") -> None:
    """
    Deploy an application to a cluster.
    
    Args:
        factory: ClientFactory to use for creating clients
        cluster_name: Name of the cluster to deploy to
        app_name: Name of the application to deploy
        deployment_method: Deployment method to use (helm or kubectl)
    """
    logger.info(f"Deploying {app_name} to cluster {cluster_name} using {deployment_method}")
    
    # Create a cluster object
    cluster = factory.create_cluster(
        name=cluster_name,
        context=f"kind-{cluster_name}"
    )
    
    # Create deployment strategy factory
    strategy_factory = DeploymentStrategyFactory.create_default_factory(factory.executor)
    
    # Create deployment strategy
    strategy = strategy_factory.create_strategy(deployment_method)
    
    # Create application configuration
    app_config = create_app_config(app_name)
    
    # Create environment configuration
    env_config = EnvironmentConfig(
        environment="dev",
        namespace=app_config.get("namespace", f"{app_name}-dev")
    )
    
    # Deploy the application
    success = strategy.deploy(app_name, app_config, env_config, cluster)
    
    if success:
        logger.info(f"Application {app_name} deployed successfully")
    else:
        logger.error(f"Failed to deploy application {app_name}")
    
    # Check application status
    status = strategy.check_status(
        app=app_name,
        namespace=app_config.get("namespace", f"{app_name}-dev"),
        cluster=cluster
    )
    
    logger.info(f"Application status: {status['status']}")


def delete_application(factory: ClientFactory, 
                      cluster_name: str, 
                      app_name: str, 
                      deployment_method: str = "helm") -> None:
    """
    Delete an application from a cluster.
    
    Args:
        factory: ClientFactory to use for creating clients
        cluster_name: Name of the cluster to delete from
        app_name: Name of the application to delete
        deployment_method: Deployment method to use (helm or kubectl)
    """
    logger.info(f"Deleting {app_name} from cluster {cluster_name} using {deployment_method}")
    
    # Create a cluster object
    cluster = factory.create_cluster(
        name=cluster_name,
        context=f"kind-{cluster_name}"
    )
    
    # Create deployment strategy factory
    strategy_factory = DeploymentStrategyFactory.create_default_factory(factory.executor)
    
    # Create deployment strategy
    strategy = strategy_factory.create_strategy(deployment_method)
    
    # Create application configuration
    app_config = create_app_config(app_name)
    
    # Delete the application
    success = strategy.delete(
        app=app_name,
        namespace=app_config.get("namespace", f"{app_name}-dev"),
        cluster=cluster
    )
    
    if success:
        logger.info(f"Application {app_name} deleted successfully")
    else:
        logger.error(f"Failed to delete application {app_name}")


def create_app_config(app_name: str) -> Dict[str, Any]:
    """
    Create application configuration.
    
    Args:
        app_name: Name of the application
        
    Returns:
        Application configuration dictionary
    """
    if app_name == "nginx":
        return {
            "namespace": "nginx-dev",
            "chart": "nginx",
            "release_name": "nginx-release",
            "values": {
                "replicaCount": 1,
                "service": {
                    "type": "ClusterIP"
                }
            }
        }
    elif app_name == "airflow":
        return {
            "namespace": "airflow-dev",
            "chart": "apache-airflow/airflow",
            "release_name": "airflow-release",
            "values": {
                "executor": "LocalExecutor",
                "webserver": {
                    "defaultUser": {
                        "enabled": True,
                        "role": "Admin",
                        "username": "admin",
                        "password": "admin"
                    }
                }
            }
        }
    else:
        return {
            "namespace": f"{app_name}-dev",
            "chart": app_name,
            "release_name": f"{app_name}-release",
            "values": {}
        }


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Example of using the core abstractions")
    parser.add_argument("action", choices=["create", "delete", "deploy", "undeploy"],
                       help="Action to perform")
    parser.add_argument("--cluster", default="test-cluster",
                       help="Name of the cluster")
    parser.add_argument("--workers", type=int, default=1,
                       help="Number of worker nodes")
    parser.add_argument("--app", default="nginx",
                       help="Name of the application")
    parser.add_argument("--method", choices=["helm", "kubectl"], default="helm",
                       help="Deployment method")
    
    args = parser.parse_args()
    
    # Create command executor
    executor = SubprocessCommandExecutor()
    
    # Create client factory
    factory = ClientFactory(executor)
    
    # Perform the requested action
    if args.action == "create":
        create_cluster(factory, args.cluster, args.workers)
    elif args.action == "delete":
        delete_cluster(factory, args.cluster)
    elif args.action == "deploy":
        deploy_application(factory, args.cluster, args.app, args.method)
    elif args.action == "undeploy":
        delete_application(factory, args.cluster, args.app, args.method)


if __name__ == "__main__":
    main()
