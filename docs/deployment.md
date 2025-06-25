# Deployment Guide

This guide explains how to deploy applications to a Kind cluster using the Kind Setup project.

## Deployment Methods

The Kind Setup project supports two deployment methods:

1. **Kubernetes**: Deploy applications using Kubernetes manifests.
2. **Helm**: Deploy applications using Helm charts.

## Directory Structure

The Kind Setup project expects the following directory structure for applications:

```
applications/
  <app-name>/
    config/
      dev.yaml
      qa.yaml
      staging.yaml
      prod.yaml
    helm/
      Chart.yaml
      values.yaml
      templates/
        ...
    kubernetes/
      ...
```

Alternatively, you can place your application configuration files in:

```
config/
  apps/
    <environment>/
      <app-name>.yaml
```

## YAML Configuration

The Kind Setup project supports both single-document and multi-document YAML files. For example:

### Single-Document YAML

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-app
  namespace: dev
spec:
  replicas: 1
  selector:
    matchLabels:
      app: test-app
  template:
    metadata:
      labels:
        app: test-app
    spec:
      containers:
      - name: nginx
        image: nginx:latest
        ports:
        - containerPort: 80
```

### Multi-Document YAML

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-app
  namespace: dev
spec:
  replicas: 1
  selector:
    matchLabels:
      app: test-app
  template:
    metadata:
      labels:
        app: test-app
    spec:
      containers:
      - name: nginx
        image: nginx:latest
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: test-app
  namespace: dev
spec:
  selector:
    app: test-app
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

## Command-Line Usage

### Deploy an Application

```bash
python -m kind_cluster_setup.main deploy --environment dev --apps test-app --deployments kubernetes
```

This command will:

1. Load the application configuration from `applications/test-app/config/dev.yaml` or alternative paths.
2. Deploy the application to the Kind cluster using the specified deployment method.
3. Create or update the application entity in the repository.
4. Create a task to track the deployment process.

### Check Application Status

```bash
python -m kind_cluster_setup.main status --environment dev
```

This command will:

1. Check the status of all clusters in the specified environment.
2. Check the status of all applications deployed to those clusters.
3. Display the status information.

### Delete an Application

```bash
python -m kind_cluster_setup.main delete --environment dev
```

This command will:

1. Delete the Kind cluster in the specified environment.
2. Update the status of all applications deployed to that cluster to "deleted".
3. Create a task to track the deletion process.

## Accessing Deployed Applications

Applications deployed to a Kind cluster can be accessed through:

1. **NodePort Services**: Access the application through `http://localhost:<node-port>`.
2. **Port Forwarding**: Use `kubectl port-forward` to forward a local port to the application.
3. **Ingress**: If you have an Ingress controller installed, access the application through the Ingress host.

## Troubleshooting

If you encounter issues with deployment, check the following:

1. Make sure the Kind cluster is running.
2. Make sure the application configuration file exists and is valid YAML.
3. Check the logs for error messages.
4. Check the status of the application using the `status` command.
