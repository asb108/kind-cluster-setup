# Core Abstractions

This document explains the core abstractions introduced in the Kind Setup project to improve modularity, testability, and maintainability.

## Overview

The core abstractions are designed to follow SOLID principles and provide a more modular and testable architecture. The main abstractions include:

1. **Command Execution**: Abstractions for executing shell commands
2. **Client Interfaces**: Abstractions for interacting with Docker, Kind, Kubernetes, and Helm
3. **Cluster Management**: Abstractions for managing cluster lifecycle
4. **Deployment Strategies**: Abstractions for deploying applications to clusters
5. **Factory Pattern**: Factories for creating clients and strategies

## Command Execution

The command execution abstractions provide a way to execute shell commands in a testable and flexible way.

### CommandExecutor

The `CommandExecutor` interface defines the contract for executing shell commands:

```python
class CommandExecutor(ABC):
    @abstractmethod
    def execute(self, 
                command: List[str], 
                env: Optional[Dict[str, str]] = None,
                cwd: Optional[str] = None,
                check: bool = True,
                timeout: Optional[float] = None) -> CommandResult:
        pass
```

### Implementations

- **SubprocessCommandExecutor**: Uses Python's subprocess module to execute commands
- **MockCommandExecutor**: Returns predefined results for testing

### CommandResult

The `CommandResult` class represents the result of a command execution:

```python
@dataclass
class CommandResult:
    returncode: int
    stdout: str
    stderr: str
    
    @property
    def success(self) -> bool:
        return self.returncode == 0
```

## Client Interfaces

The client interfaces provide abstractions for interacting with external tools.

### DockerClient

The `DockerClient` class provides methods for interacting with Docker:

```python
class DockerClient:
    def __init__(self, executor: CommandExecutor):
        self.executor = executor
    
    def is_running(self) -> bool:
        # Implementation...
    
    def get_containers(self, all_containers: bool = False, filter_expr: Optional[str] = None) -> List[Dict[str, Any]]:
        # Implementation...
    
    def update_container(self, container_id: str, cpu_limit: Optional[str] = None, memory_limit: Optional[str] = None, memory_swap: Optional[str] = None) -> CommandResult:
        # Implementation...
```

### KindClient

The `KindClient` class provides methods for interacting with Kind:

```python
class KindClient:
    def __init__(self, executor: CommandExecutor):
        self.executor = executor
    
    def is_installed(self) -> bool:
        # Implementation...
    
    def get_clusters(self) -> List[str]:
        # Implementation...
    
    def create_cluster(self, name: str, config_file: Optional[str] = None, image: Optional[str] = None, wait: Optional[str] = None) -> CommandResult:
        # Implementation...
```

### KubectlClient

The `KubectlClient` class provides methods for interacting with Kubernetes:

```python
class KubectlClient:
    def __init__(self, executor: CommandExecutor):
        self.executor = executor
    
    def get_nodes(self, context: Optional[str] = None, output_format: str = "json", kubeconfig: Optional[str] = None) -> List[Dict[str, Any]]:
        # Implementation...
    
    def get_pods(self, namespace: str, context: Optional[str] = None, selector: Optional[str] = None, output_format: str = "json", kubeconfig: Optional[str] = None) -> List[Dict[str, Any]]:
        # Implementation...
```

### HelmClient

The `HelmClient` class provides methods for interacting with Helm:

```python
class HelmClient:
    def __init__(self, executor: CommandExecutor):
        self.executor = executor
    
    def list_releases(self, namespace: Optional[str] = None, all_namespaces: bool = False, output_format: str = "json", kubeconfig: Optional[str] = None) -> List[Dict[str, Any]]:
        # Implementation...
    
    def install_or_upgrade(self, release_name: str, chart: str, namespace: str, values_file: Optional[str] = None, set_values: Optional[Dict[str, str]] = None, version: Optional[str] = None, create_namespace: bool = True, wait: bool = False, timeout: Optional[str] = None, kubeconfig: Optional[str] = None) -> CommandResult:
        # Implementation...
```

## Cluster Management

The cluster management abstractions provide a way to manage the lifecycle of Kind clusters.

### ClusterConfig

The `ClusterConfig` class represents the configuration for a Kind cluster:

```python
@dataclass
class ClusterConfig:
    name: str
    worker_nodes: int = 1
    worker_config: Optional[NodeConfig] = None
    control_plane_config: Optional[NodeConfig] = None
    apply_resource_limits: bool = True
    http_port: int = 80
    https_port: int = 443
    nodeport_start: int = 30000
    custom_ports: Dict[str, int] = field(default_factory=dict)
```

### EnvironmentConfig

The `EnvironmentConfig` class represents the configuration for a deployment environment:

```python
@dataclass
class EnvironmentConfig:
    environment: str = "dev"
    namespace: str = "default"
    kubeconfig: Optional[str] = None
```

### ClusterManager

The `ClusterManager` class provides methods for creating and deleting Kind clusters:

```python
class ClusterManager:
    def __init__(self, executor: CommandExecutor, config_dir: Optional[str] = None):
        # Implementation...
    
    def create_cluster(self, cluster_config: ClusterConfig, env_config: EnvironmentConfig) -> 'Cluster':
        # Implementation...
    
    def delete_cluster(self, cluster_name: str) -> None:
        # Implementation...
```

### Cluster

The `Cluster` class represents a Kind cluster and provides methods for interacting with it:

```python
class Cluster:
    def __init__(self, name: str, context: str, executor: CommandExecutor, config: Optional[ClusterConfig] = None, env_config: Optional[EnvironmentConfig] = None):
        # Implementation...
    
    def install_ingress(self, ingress_type: str = "nginx") -> None:
        # Implementation...
    
    def wait_for_ready(self, timeout: int = 60) -> bool:
        # Implementation...
    
    def get_info(self) -> Dict[str, Any]:
        # Implementation...
```

## Deployment Strategies

The deployment strategy abstractions provide a way to deploy applications to Kubernetes clusters.

### DeploymentStrategy

The `DeploymentStrategy` interface defines the contract for deploying applications:

```python
class DeploymentStrategy(ABC):
    @abstractmethod
    def deploy(self, app: str, app_config: Dict[str, Any], env_config: Dict[str, Any], cluster: Cluster) -> bool:
        pass
    
    @abstractmethod
    def check_status(self, app: str, namespace: str, cluster: Cluster) -> Dict[str, Any]:
        pass
    
    @abstractmethod
    def delete(self, app: str, namespace: str, cluster: Cluster) -> bool:
        pass
```

### Implementations

- **KubectlDeploymentStrategy**: Deploys applications using kubectl
- **HelmDeploymentStrategy**: Deploys applications using Helm

### DeploymentStrategyFactory

The `DeploymentStrategyFactory` class provides methods for creating deployment strategies:

```python
class DeploymentStrategyFactory:
    def __init__(self, executor: CommandExecutor):
        self.executor = executor
        self._strategies = {}
    
    def register_strategy(self, name: str, strategy_class: type) -> None:
        # Implementation...
    
    def create_strategy(self, name: str) -> DeploymentStrategy:
        # Implementation...
```

## Factory Pattern

The factory pattern is used to create clients and strategies with the appropriate dependencies.

### ClientFactory

The `ClientFactory` class provides methods for creating clients:

```python
class ClientFactory:
    def __init__(self, executor: Optional[CommandExecutor] = None):
        self.executor = executor or SubprocessCommandExecutor()
    
    def create_docker_client(self) -> DockerClient:
        # Implementation...
    
    def create_kind_client(self) -> KindClient:
        # Implementation...
    
    def create_kubectl_client(self) -> KubectlClient:
        # Implementation...
    
    def create_helm_client(self) -> HelmClient:
        # Implementation...
    
    def create_cluster_manager(self, config_dir: Optional[str] = None) -> ClusterManager:
        # Implementation...
```

## Usage Examples

### Creating a Cluster

```python
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
# Create a cluster object
cluster = factory.create_cluster(
    name="test-cluster",
    context="kind-test-cluster"
)

# Create deployment strategy factory
strategy_factory = DeploymentStrategyFactory.create_default_factory(factory.executor)

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

### Testing with Mock Executor

```python
# Create a mock executor
mock_executor = MockCommandExecutor()

# Add mock results
mock_executor.add_mock_result(
    "docker ps",
    CommandResult(returncode=0, stdout="CONTAINER ID\n123456789", stderr="")
)

mock_executor.add_mock_result(
    "kind get clusters",
    CommandResult(returncode=0, stdout="test-cluster", stderr="")
)

# Create a docker client with the mock executor
docker_client = DockerClient(mock_executor)

# Test is_running
assert docker_client.is_running() == True

# Test get_containers
containers = docker_client.get_containers()
assert len(containers) == 1
assert containers[0]['ID'] == "123456789"
```

## Benefits

The core abstractions provide several benefits:

1. **Testability**: The abstractions make it easy to test the code without executing real commands
2. **Flexibility**: The abstractions allow for different implementations of the same interface
3. **Separation of Concerns**: Each class has a single responsibility
4. **Dependency Injection**: Dependencies are injected rather than created directly
5. **Loose Coupling**: Classes depend on abstractions rather than concrete implementations

## Next Steps

The core abstractions provide a solid foundation for the Kind Setup project. Future improvements could include:

1. **More Deployment Strategies**: Add support for more deployment methods
2. **Database Integration**: Add support for storing cluster and application state in a database
3. **Authentication and Authorization**: Add support for authentication and authorization
4. **API Integration**: Integrate the abstractions with the API server
5. **UI Integration**: Integrate the abstractions with the UI
