# Application Management Guide

This guide explains how to manage applications in a Kind cluster using the Kind Setup project.

## Application Lifecycle

The Kind Setup project supports the following operations for managing applications:

1. **Deploy**: Deploy a new application to a cluster.
2. **Modify**: Update an existing application's configuration.
3. **Delete**: Remove an application from a cluster without deleting the cluster itself.
4. **Status**: Check the status of an application.

## Deploying Applications

To deploy a new application to a cluster, use the `deploy` command:

```bash
python -m kind_cluster_setup.main deploy --environment dev --apps test-app --deployments kubernetes
```

This command will:

1. Load the application configuration from `applications/test-app/config/dev.yaml` or alternative paths.
2. Deploy the application to the Kind cluster using the specified deployment method.
3. Create or update the application entity in the repository.
4. Create a task to track the deployment process.

For more details on deployment, see the [Deployment Guide](deployment.md).

## Modifying Applications

To modify an existing application, use the `modify` command:

```bash
python -m kind_cluster_setup.main modify --environment dev --app test-app --image nginx:1.21
```

This command will:

1. Load the current application configuration.
2. Apply the specified modifications.
3. Save the modified configuration.
4. Redeploy the application with the new configuration.
5. Update the application entity in the repository.
6. Create a task to track the modification process.

### Available Modification Options

The `modify` command supports the following options:

- `--image`: Update the container image.
- `--replicas`: Change the number of replicas.
- `--cpu-limit`: Set the CPU limit.
- `--memory-limit`: Set the memory limit.
- `--cpu-request`: Set the CPU request.
- `--memory-request`: Set the memory request.
- `--expose`: Expose the application as a service.
- `--service-type`: Set the service type (ClusterIP, NodePort, LoadBalancer).
- `--port`: Set the service port.
- `--target-port`: Set the container port.

### Examples

Update the container image:

```bash
python -m kind_cluster_setup.main modify --app test-app --image nginx:1.21
```

Scale the application to 3 replicas:

```bash
python -m kind_cluster_setup.main modify --app test-app --replicas 3
```

Set resource limits:

```bash
python -m kind_cluster_setup.main modify --app test-app --cpu-limit 500m --memory-limit 512Mi
```

Expose the application as a NodePort service:

```bash
python -m kind_cluster_setup.main modify --app test-app --expose --service-type NodePort --port 80 --target-port 80
```

## Deleting Applications

To delete an application from a cluster without deleting the cluster itself, use the `delete-app` command:

```bash
python -m kind_cluster_setup.main delete-app --environment dev --app test-app
```

This command will:

1. Delete the application resources from the cluster.
2. Update the application status to "deleted" in the repository.
3. Optionally delete the application configuration files.
4. Create a task to track the deletion process.

### Available Deletion Options

The `delete-app` command supports the following options:

- `--force`: Force deletion even if the cluster is not running.
- `--delete-config`: Delete the application configuration files.

### Examples

Delete an application:

```bash
python -m kind_cluster_setup.main delete-app --app test-app
```

Force deletion of an application:

```bash
python -m kind_cluster_setup.main delete-app --app test-app --force
```

Delete an application and its configuration files:

```bash
python -m kind_cluster_setup.main delete-app --app test-app --delete-config
```

## Checking Application Status

To check the status of an application, use the `status` command:

```bash
python -m kind_cluster_setup.main status --environment dev --apps test-app
```

This command will:

1. Check the status of the application in the cluster.
2. Display information about the application's resources (pods, services, etc.).
3. Show access URLs for the application.
4. Create a task to track the status check process.

For more details on status checking, see the [Status Guide](status.md).

## Error Handling

The application management commands include error handling for common scenarios:

- Application not found
- Cluster not found
- Cluster not running
- Invalid configuration
- Deployment failures

If an error occurs, the command will:

1. Log the error message.
2. Update the task status to "failed" with the error details.
3. Return a non-zero exit code.

## Repository Integration

All application management commands integrate with the repository pattern to track the state of applications:

- The `deploy` command creates or updates application entities.
- The `modify` command updates existing application entities.
- The `delete-app` command updates application status to "deleted".
- All commands create task entities to track their execution.

This ensures that the repository always reflects the current state of the applications in the cluster.
