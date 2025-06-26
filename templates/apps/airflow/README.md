# Apache Airflow with KubernetesExecutor

This template deploys Apache Airflow 2.8.1 with KubernetesExecutor, which resolves dependency conflicts by running tasks in separate containers.

## Features

- ✅ **No Dependency Conflicts**: Each task runs in its own container
- ✅ **Dynamic Scaling**: Workers are created on-demand
- ✅ **Resource Isolation**: Tasks can use different images and resources
- ✅ **Simplified Management**: No need to manage worker deployments
- ✅ **Spark Support**: Run Spark tasks without provider conflicts

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Webserver     │    │   Scheduler     │    │   PostgreSQL    │
│   (UI/API)      │    │   (Orchestrator)│    │   (Metadata)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Kubernetes     │
                    │  API Server     │
                    └─────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │ Worker Pod  │ │ Worker Pod  │ │ Worker Pod  │
    │ (Python)    │ │ (Spark)     │ │ (Custom)    │
    └─────────────┘ └─────────────┘ └─────────────┘
```

## Deployment Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `version` | Airflow version | `2.8.1` |
| `replicas` | Number of webserver replicas | `1` |
| `postgres_version` | PostgreSQL version | `15` |
| `postgres_password` | PostgreSQL password | `airflow` |
| `kubernetes_namespace` | Namespace for worker pods | `airflow` |
| `enable_dag_examples` | Load example DAGs | `true` |
| `memory_request` | Memory request | `1Gi` |
| `memory_limit` | Memory limit | `2Gi` |
| `cpu_request` | CPU request | `500m` |
| `cpu_limit` | CPU limit | `1000m` |

## Quick Start

1. **Deploy Airflow**:
   ```bash
   # Using the Kind Cluster Setup UI
   # Navigate to Deploy App > Apache Airflow
   # Configure parameters and deploy
   ```

2. **Access the UI**:
   ```bash
   # Port forward to access locally
   kubectl port-forward -n airflow svc/airflow-webserver 8080:8080
   
   # Open browser to http://localhost:8080
   # Login: admin/admin
   ```

3. **Run Example DAG**:
   - Navigate to DAGs page
   - Find `kubernetes_pod_example`
   - Toggle it ON and trigger a run

## Example Tasks

### Python Task
```python
python_task = KubernetesPodOperator(
    task_id='python_task',
    name='python-task',
    namespace='airflow',
    image='python:3.9-slim',
    cmds=['python', '-c'],
    arguments=['print("Hello from Python container!")'],
    get_logs=True,
)
```

### Spark Task
```python
spark_task = KubernetesPodOperator(
    task_id='spark_task',
    name='spark-task',
    namespace='airflow',
    image='bitnami/spark:3.4',
    cmds=['spark-submit'],
    arguments=[
        '--class', 'org.apache.spark.examples.SparkPi',
        '/opt/bitnami/spark/examples/jars/spark-examples_2.12-3.4.0.jar',
        '10'
    ],
    get_logs=True,
)
```

### Custom Data Processing
```python
data_task = KubernetesPodOperator(
    task_id='data_processing',
    name='data-processing-task',
    namespace='airflow',
    image='pandas/pandas:latest',
    cmds=['python', '-c'],
    arguments=['import pandas as pd; print(pd.__version__)'],
    get_logs=True,
)
```

## Benefits Over Traditional Approach

| Traditional Airflow | KubernetesExecutor |
|-------------------|-------------------|
| ❌ Dependency conflicts | ✅ Isolated dependencies |
| ❌ Fixed worker resources | ✅ Dynamic scaling |
| ❌ Complex provider management | ✅ Use any Docker image |
| ❌ Shared environment issues | ✅ Task-specific environments |

## Troubleshooting

### Check Worker Pods
```bash
kubectl get pods -n airflow -l app=airflow
```

### View Task Logs
```bash
kubectl logs -n airflow <worker-pod-name>
```

### Check RBAC Permissions
```bash
kubectl auth can-i create pods --as=system:serviceaccount:airflow:airflow -n airflow
```

## Security Notes

- ServiceAccount `airflow` has minimal required permissions
- Worker pods run in isolated namespace
- No privileged containers required
- Network policies can be applied for additional security
