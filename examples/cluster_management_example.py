#!/usr/bin/env python3
"""
Comprehensive Example for Kind Cluster Management

This example demonstrates how to use the Kind Cluster Setup module to:
1. Create a cluster with custom configuration
2. Deploy applications using different methods
3. Manage and monitor the cluster
4. Clean up resources when done
"""

import os
import time
import logging
from pathlib import Path

# Import the core modules
from kind_cluster_setup.cluster import KindCluster
from kind_cluster_setup.deployment import HelmDeployment, KubernetesDeployment
from kind_cluster_setup.utils.logging import setup_logging

# Setup logging
setup_logging()
logger = logging.getLogger("examples.comprehensive")

# Define cluster configuration
CLUSTER_NAME = "example-cluster"
CLUSTER_CONFIG = {
    "name": CLUSTER_NAME,
    "workers": 2,  # Number of worker nodes
    "control_plane_config": {
        "extra_port_mappings": [
            {"containerPort": 80, "hostPort": 80, "protocol": "TCP"},
            {"containerPort": 443, "hostPort": 443, "protocol": "TCP"},
        ]
    }
}

# Define environment configuration
ENV_CONFIG = {
    "namespace": "example",
    "environment": "dev"
}


def main():
    """Run the comprehensive example"""
    logger.info("Starting comprehensive example")
    
    # Create cluster
    try:
        logger.info(f"Creating cluster: {CLUSTER_NAME}")
        cluster = KindCluster(cluster_config=CLUSTER_CONFIG, env_config=ENV_CONFIG)
        cluster.create()
        logger.info(f"Cluster {CLUSTER_NAME} created successfully")
        
        # Install ingress controller
        logger.info("Installing NGINX ingress controller")
        cluster.install_ingress()
        logger.info("Ingress controller installed successfully")
        
        # Deploy an application using Helm
        logger.info("Deploying an application using Helm")
        helm_deployment = HelmDeployment(cluster_name=CLUSTER_NAME)
        
        app_config = {
            "name": "nginx",
            "namespace": "web",
            "chart": "nginx",
            "repo": "https://charts.bitnami.com/bitnami",
            "values": {
                "service": {
                    "type": "NodePort",
                    "nodePorts": {
                        "http": 30080
                    }
                }
            }
        }
        
        success = helm_deployment.deploy(
            app="nginx", 
            app_config=app_config, 
            env_config=ENV_CONFIG
        )
        
        if success:
            logger.info("Helm deployment successful")
            
            # Check application status
            logger.info("Checking application status")
            status = helm_deployment.check_status("nginx", namespace="web")
            logger.info(f"Application status: {status['status']}")
            
            # Wait for a bit to allow exploration
            logger.info("Application deployed. Waiting for 30 seconds before cleanup...")
            time.sleep(30)  # Give time to explore the deployment
        else:
            logger.error("Helm deployment failed")
        
    except Exception as e:
        logger.error(f"Error in example: {str(e)}")
    finally:
        # Cleanup
        try:
            if 'helm_deployment' in locals():
                logger.info("Deleting deployed application")
                helm_deployment.delete("nginx", namespace="web")
            
            logger.info(f"Deleting cluster: {CLUSTER_NAME}")
            cluster.delete()
            logger.info("Cluster deleted successfully")
        except Exception as cleanup_error:
            logger.error(f"Error during cleanup: {str(cleanup_error)}")
    
    logger.info("Example completed")


if __name__ == "__main__":
    main()
