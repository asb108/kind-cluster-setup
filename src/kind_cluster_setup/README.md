# Kind Cluster Setup Module

## Overview

This is the core module for the Kind Cluster Setup project, providing functionality for creating and managing Kind Kubernetes clusters and deploying applications to them.

## Directory Structure

- `api/`: REST API server and endpoints
- `cli/`: Command-line interface tools
- `cluster/`: Cluster management functionality
- `commands/`: Shell command execution wrappers
- `config/`: Configuration management
- `deployment/`: Application deployment functionality
- `templates/`: Template files for resources
- `utils/`: Utility functions and helpers

## Key Components

### Cluster Management

The `cluster/` directory contains the `KindCluster` class, which is the primary interface for creating and managing Kind clusters.

Example:
```python
from kind_cluster_setup.cluster import KindCluster

# Create a cluster with default settings
cluster = KindCluster(cluster_config={'name': 'test-cluster'}, env_config={'namespace': 'test'})
cluster.create()

# Install Ingress controller
cluster.install_ingress()

# Delete the cluster when done
cluster.delete()
```

### Application Deployment

The `deployment/` directory contains classes for deploying applications to clusters using different methods.

Example:
```python
from kind_cluster_setup.deployment import HelmDeployment

# Deploy an application using Helm
deployment = HelmDeployment(cluster_name='test-cluster')
deployment.deploy('airflow', app_config={'version': '2.6.0'}, env_config={'namespace': 'airflow'})
```

### API Server

The `api/` directory contains a FastAPI server that exposes endpoints for managing clusters and applications.

Example:
```python
from kind_cluster_setup.api import start_api_server

# Start the API server
start_api_server(host='0.0.0.0', port=8020)
```

## Usage

This module can be used both programmatically and through its command-line interface or API server. See the documentation in each subdirectory for more details on specific components.
