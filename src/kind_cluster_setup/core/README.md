# Core Abstractions for Kind Setup

This directory contains the core abstractions for the Kind Setup project. These abstractions provide a more modular, testable, and maintainable architecture for the project.

## Overview

The core abstractions are designed to follow SOLID principles and provide a more modular and testable architecture. The main abstractions include:

1. **Command Execution**: Abstractions for executing shell commands
2. **Client Interfaces**: Abstractions for interacting with Docker, Kind, Kubernetes, and Helm
3. **Cluster Management**: Abstractions for managing cluster lifecycle
4. **Deployment Strategies**: Abstractions for deploying applications to clusters
5. **Factory Pattern**: Factories for creating clients and strategies
6. **Adapters**: Adapters for integrating with existing code

## Usage

### Creating a Cluster

```python
from kind_cluster_setup.core.command import SubprocessCommandExecutor
from kind_cluster_setup.core.factory import ClientFactory
from kind_cluster_setup.core.cluster import ClusterConfig, EnvironmentConfig

# Create command executor
executor = SubprocessCommandExecutor()

# Create client factory
factory = ClientFactory(executor)

# Create cluster manager
cluster_manager = factory.create_cluster_manager()

# Create cluster configuration
cluster_config = ClusterConfig(
    name="test-cluster",
    worker_nodes=1,
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
if cluster.wait_for_ready(timeout=120):
    print("Cluster is ready")
else:
    print("Cluster readiness check timed out")

# Install ingress
cluster.install_ingress()
```

### Deploying an Application

```python
from kind_cluster_setup.core.command import SubprocessCommandExecutor
from kind_cluster_setup.core.factory import ClientFactory
from kind_cluster_setup.core.deployment import DeploymentStrategyFactory
from kind_cluster_setup.core.cluster import EnvironmentConfig

# Create command executor
executor = SubprocessCommandExecutor()

# Create client factory
factory = ClientFactory(executor)

# Create a cluster object
cluster = factory.create_cluster(
    name="test-cluster",
    context="kind-test-cluster"
)

# Create deployment strategy factory
strategy_factory = DeploymentStrategyFactory.create_default_factory(executor)

# Create deployment strategy
strategy = strategy_factory.create_strategy("helm")

# Create application configuration
app_config = {
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

# Create environment configuration
env_config = EnvironmentConfig(
    environment="dev",
    namespace="nginx-dev"
)

# Deploy the application
success = strategy.deploy("nginx", app_config, env_config, cluster)

if success:
    print("Application deployed successfully")
else:
    print("Failed to deploy application")
```

### Using the Adapter with Existing Code

If you want to use the new abstractions with existing code, you can use the adapter pattern:

```python
from kind_cluster_setup.core.command import SubprocessCommandExecutor
from kind_cluster_setup.core.adapters import KindClusterAdapter

# Create command executor
executor = SubprocessCommandExecutor()

# Create cluster configuration
cluster_config = {
    'name': 'test-cluster',
    'worker_nodes': 1,
    'apply_resource_limits': True,
    'worker_config': {
        'cpu': '1',
        'memory': '2GB'
    },
    'control_plane_config': {
        'cpu': '1',
        'memory': '2GB'
    }
}

# Create environment configuration
env_config = {
    'environment': 'dev',
    'namespace': 'default'
}

# Create adapter
adapter = KindClusterAdapter(cluster_config, env_config, executor)

# Use the adapter
adapter.create()
adapter.install_ingress()
adapter.wait_for_ready(timeout=120)
adapter.delete()
```

### Using the KindCluster Implementation

The `KindCluster` implementation uses the core abstractions for better modularity, testability, and maintainability:

```python
from kind_cluster_setup.cluster import KindCluster

# Create cluster configuration
cluster_config = {
    'name': 'test-cluster',
    'worker_nodes': 1,
    'apply_resource_limits': True,
    'worker_config': {
        'cpu': '1',
        'memory': '2GB'
    },
    'control_plane_config': {
        'cpu': '1',
        'memory': '2GB'
    }
}

# Create environment configuration
env_config = {
    'environment': 'dev',
    'namespace': 'default'
}

# Create cluster
cluster = KindCluster(cluster_config, env_config)
cluster.create()
cluster.install_ingress()
cluster.wait_for_ready(timeout=120)
cluster.delete()
```

### Using the API Server

The API server uses the core abstractions for better modularity, testability, and maintainability:

```bash
# Run the API server
./scripts/run_api_server.sh
```

## Testing

The core abstractions include a `MockCommandExecutor` that can be used for testing:

```python
from kind_cluster_setup.core.command import CommandResult, MockCommandExecutor
from kind_cluster_setup.core.docker import DockerClient

# Create a mock executor
mock_executor = MockCommandExecutor()

# Add mock results
mock_executor.add_mock_result(
    "docker ps",
    CommandResult(returncode=0, stdout="CONTAINER ID\n123456789", stderr="")
)

# Create a docker client with the mock executor
docker_client = DockerClient(mock_executor)

# Test is_running
assert docker_client.is_running() == True
```

## Directory Structure

- `command.py`: Command execution abstractions
- `docker.py`: Docker client
- `kind.py`: Kind client
- `kubernetes.py`: Kubernetes client
- `helm.py`: Helm client
- `cluster.py`: Cluster management
- `deployment.py`: Deployment strategies
- `factory.py`: Client factory
- `adapters.py`: Adapters for integrating with existing code

## Next Steps

The core abstractions provide a solid foundation for the Kind Setup project. Future improvements could include:

1. **More Deployment Strategies**: Add support for more deployment methods
2. **Database Integration**: Add support for storing cluster and application state in a database
3. **Authentication and Authorization**: Add support for authentication and authorization
4. **API Integration**: Integrate the abstractions with the API server
5. **UI Integration**: Integrate the abstractions with the UI
