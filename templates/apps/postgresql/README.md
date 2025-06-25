# PostgreSQL Database Template

## Description

This template deploys a PostgreSQL database server on Kubernetes with comprehensive configuration options including backup, monitoring, and resource management.

## Features

- **Multiple PostgreSQL Versions**: Support for PostgreSQL 13, 14, 15, and 16
- **Persistent Storage**: Configurable persistent volume for database data
- **Resource Management**: Customizable CPU and memory limits
- **Backup Support**: Automated backup with configurable schedule and retention
- **Monitoring**: Optional Prometheus metrics export
- **Security**: Password stored in Kubernetes secrets
- **High Availability**: Support for multiple replicas (experimental)

## Parameters

### Basic Configuration
- **app_name**: Name for the PostgreSQL instance (default: postgresql)
- **postgres_version**: PostgreSQL version to deploy (13, 14, 15, 16)
- **database_name**: Name of the initial database to create
- **username**: Database username (default: postgres)
- **password**: Database password (stored securely in Kubernetes secret)

### Scaling
- **replicas**: Number of PostgreSQL replicas (1-3, default: 1)

### Resources
- **cpu_request**: CPU resource request (default: 250m)
- **memory_request**: Memory resource request (default: 512Mi)
- **cpu_limit**: CPU resource limit (default: 1000m)
- **memory_limit**: Memory resource limit (default: 1Gi)

### Storage
- **storage_size**: Size of persistent storage (default: 10Gi)
- **storage_class**: Kubernetes storage class (optional)

### Backup
- **enable_backup**: Enable automated backups (default: false)
- **backup_schedule**: Cron schedule for backups (default: "0 2 * * *")
- **backup_retention**: Backup retention in days (default: 7)

### Monitoring
- **enable_monitoring**: Enable Prometheus monitoring (default: false)
- **monitoring_port**: Port for metrics endpoint (default: 9187)

### Networking
- **service_type**: Kubernetes service type (ClusterIP, NodePort, LoadBalancer)
- **port**: Database port (default: 5432)

## Usage

1. **Basic Deployment**: Use default settings for a simple PostgreSQL instance
2. **Production Setup**: Enable monitoring, backups, and configure appropriate resources
3. **Development**: Use smaller resource limits and disable backups

## Examples

### Basic Development Setup
```yaml
app_name: "dev-postgres"
postgres_version: "15"
database_name: "devdb"
username: "developer"
password: "dev123"
cpu_request: "100m"
memory_request: "256Mi"
storage_size: "5Gi"
```

### Production Setup
```yaml
app_name: "prod-postgres"
postgres_version: "15"
database_name: "proddb"
username: "postgres"
password: "secure-password-123"
cpu_request: "500m"
memory_request: "1Gi"
cpu_limit: "2000m"
memory_limit: "4Gi"
storage_size: "100Gi"
enable_backup: true
backup_schedule: "0 2 * * *"
backup_retention: 30
enable_monitoring: true
service_type: "ClusterIP"
```

## Post-Deployment

### Connecting to PostgreSQL

From within the cluster:
```bash
psql -h <app_name>-service -U <username> -d <database_name>
```

From outside the cluster (if using NodePort or LoadBalancer):
```bash
psql -h <external-ip> -p <external-port> -U <username> -d <database_name>
```

### Monitoring

If monitoring is enabled, metrics are available at:
- Service: `<app_name>-metrics:<monitoring_port>/metrics`
- Prometheus scraping is automatically configured

### Backups

If backups are enabled:
- Backups are stored in a persistent volume
- Backup files are named: `<app_name>-YYYYMMDD_HHMMSS.sql`
- Old backups are automatically cleaned up based on retention policy

### Scaling

**Note**: PostgreSQL scaling with multiple replicas is experimental and requires additional configuration for read replicas. For production use, consider using PostgreSQL operators like Zalando Postgres Operator or Crunchy Data PostgreSQL Operator.

## Troubleshooting

### Common Issues

1. **Pod not starting**: Check resource limits and storage availability
2. **Connection refused**: Verify service configuration and network policies
3. **Backup failures**: Check backup storage permissions and connectivity

### Useful Commands

```bash
# Check pod status
kubectl get pods -l app=<app_name>

# View logs
kubectl logs -l app=<app_name>

# Connect to database
kubectl exec -it <pod-name> -- psql -U <username> -d <database_name>

# Check backup status
kubectl get cronjobs
kubectl get jobs

# View metrics (if monitoring enabled)
kubectl port-forward svc/<app_name>-metrics <monitoring_port>:<monitoring_port>
curl http://localhost:<monitoring_port>/metrics
```

## Security Considerations

- Database password is stored in a Kubernetes secret
- Consider using network policies to restrict database access
- Enable SSL/TLS for production deployments
- Regularly update PostgreSQL version for security patches
- Use strong passwords and consider rotating them regularly

## Performance Tuning

The template includes basic PostgreSQL configuration optimizations:
- Shared buffers set to 128MB
- Effective cache size set to 512MB
- Work memory optimized for concurrent connections
- WAL settings for better write performance

For production workloads, consider:
- Adjusting shared_buffers based on available memory
- Tuning checkpoint settings for your workload
- Configuring connection pooling (PgBouncer)
- Setting up read replicas for read-heavy workloads
