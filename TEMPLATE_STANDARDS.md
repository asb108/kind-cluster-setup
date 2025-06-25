# Template Standards and Conventions

This document defines the standards and conventions for creating application templates in the Kind Cluster Setup project. Following these standards ensures consistency, quality, and maintainability across all templates.

## Table of Contents

- [Naming Conventions](#naming-conventions)
- [Required Metadata Fields](#required-metadata-fields)
- [Resource Management](#resource-management)
- [Security Guidelines](#security-guidelines)
- [Documentation Requirements](#documentation-requirements)
- [Quality Assurance](#quality-assurance)

## Naming Conventions

### Template Directory Names
- Use **kebab-case** for all directory names
- Use descriptive, clear names that indicate the application
- Avoid abbreviations unless they are widely recognized
- Maximum length: 50 characters

**Examples:**
```
✅ Good:
- postgresql
- redis-cluster
- nginx-ingress
- apache-kafka
- prometheus-monitoring

❌ Bad:
- pg (too abbreviated)
- Redis_Cluster (wrong case)
- nginx_with_ssl (use kebab-case)
- VeryLongApplicationNameThatExceedsReasonableLength
```

### Parameter Names
- Use **snake_case** for all parameter names
- Use descriptive names that clearly indicate purpose
- Group related parameters with common prefixes
- Avoid single-letter or overly abbreviated names

**Examples:**
```json
✅ Good:
{
  "app_name": "...",
  "database_name": "...",
  "cpu_request": "...",
  "memory_limit": "...",
  "enable_monitoring": "...",
  "backup_schedule": "..."
}

❌ Bad:
{
  "n": "...",           // Too short
  "dbName": "...",      // Wrong case
  "cpu-request": "...", // Wrong case
  "mem_lmt": "...",     // Too abbreviated
  "monitoring": "..."   // Unclear boolean intent
}
```

### Resource Names
- Use template variables for dynamic naming
- Follow Kubernetes naming conventions
- Include app name in all resource names
- Use consistent suffixes for resource types

**Examples:**
```yaml
✅ Good:
metadata:
  name: {{ .app_name }}-deployment
  name: {{ .app_name }}-service
  name: {{ .app_name }}-config
  name: {{ .app_name }}-secret

❌ Bad:
metadata:
  name: my-app-deployment    # Hardcoded
  name: {{ .app_name }}svc   # Inconsistent suffix
  name: config-{{ .app_name }} # Inconsistent prefix
```

### File Names
- Use **kebab-case** for all file names
- Use descriptive names that indicate content
- Group related files with common prefixes
- Use standard Kubernetes resource type names

**Examples:**
```
✅ Good:
- deployment.yaml
- service.yaml
- configmap.yaml
- secret.yaml
- ingress.yaml
- persistent-volume-claim.yaml
- horizontal-pod-autoscaler.yaml

❌ Bad:
- deploy.yaml (abbreviated)
- Service.yaml (wrong case)
- config_map.yaml (wrong case)
- my-secret.yaml (too specific)
```

## Required Metadata Fields

### Mandatory Fields
Every template must include these fields in `metadata.json`:

```json
{
  "display_name": "Human-readable application name",
  "description": "Detailed description of what this template deploys",
  "version": "1.0.0",
  "category": "One of: Databases, Web Servers, Monitoring, CI/CD, Message Queues, Storage, Security, Development Tools",
  "tags": ["array", "of", "relevant", "tags"],
  "deployment_methods": ["kubectl"],
  "min_kubernetes_version": "1.20.0",
  "parameters": {
    "app_name": {
      "type": "string",
      "ui_control": "text",
      "label": "Application Name",
      "description": "Name for the application instance",
      "default": "template-name",
      "required": true,
      "validation": {
        "pattern": "^[a-z0-9]([a-z0-9-]*[a-z0-9])?$",
        "minLength": 1,
        "maxLength": 63
      },
      "group": "basic"
    }
  },
  "parameter_groups": {
    "basic": {
      "label": "Basic Configuration",
      "description": "Essential application settings",
      "order": 1,
      "collapsible": false
    }
  }
}
```

### Recommended Fields
Templates should also include these fields when applicable:

```json
{
  "app_version": "latest",
  "icon": "https://example.com/icon.png",
  "dependencies": [],
  "resources": {
    "cpu_request": "100m",
    "memory_request": "128Mi",
    "cpu_limit": "500m",
    "memory_limit": "512Mi"
  },
  "networking": {
    "ports": [
      {
        "name": "http",
        "port": 80,
        "protocol": "TCP"
      }
    ]
  },
  "security": {
    "run_as_non_root": true,
    "read_only_root_filesystem": false
  },
  "monitoring": {
    "metrics_enabled": false,
    "health_check_path": "/health"
  }
}
```

### Standard Parameter Groups
Use these standard parameter groups for consistency:

```json
{
  "parameter_groups": {
    "basic": {
      "label": "Basic Configuration",
      "order": 1,
      "collapsible": false
    },
    "scaling": {
      "label": "Scaling & Performance",
      "order": 2,
      "collapsible": true,
      "collapsed": true
    },
    "resources": {
      "label": "Resource Limits",
      "order": 3,
      "collapsible": true,
      "collapsed": true
    },
    "storage": {
      "label": "Storage Configuration",
      "order": 4,
      "collapsible": true,
      "collapsed": true
    },
    "networking": {
      "label": "Networking",
      "order": 5,
      "collapsible": true,
      "collapsed": true
    },
    "security": {
      "label": "Security Settings",
      "order": 6,
      "collapsible": true,
      "collapsed": true
    },
    "monitoring": {
      "label": "Monitoring & Logging",
      "order": 7,
      "collapsible": true,
      "collapsed": true
    },
    "backup": {
      "label": "Backup & Recovery",
      "order": 8,
      "collapsible": true,
      "collapsed": true
    },
    "advanced": {
      "label": "Advanced Settings",
      "order": 9,
      "collapsible": true,
      "collapsed": true
    }
  }
}
```

## Resource Management

### Resource Specifications
All templates must include proper resource specifications:

```yaml
resources:
  requests:
    cpu: {{ .cpu_request | default "100m" }}
    memory: {{ .memory_request | default "128Mi" }}
  limits:
    cpu: {{ .cpu_limit | default "500m" }}
    memory: {{ .memory_limit | default "512Mi" }}
```

### Health Checks
Include appropriate health checks for all applications:

```yaml
livenessProbe:
  httpGet:
    path: {{ .liveness_path | default "/health" }}
    port: {{ .port }}
  initialDelaySeconds: {{ .liveness_initial_delay | default 30 }}
  periodSeconds: {{ .liveness_period | default 10 }}
  timeoutSeconds: {{ .liveness_timeout | default 5 }}
  failureThreshold: {{ .liveness_failure_threshold | default 3 }}

readinessProbe:
  httpGet:
    path: {{ .readiness_path | default "/ready" }}
    port: {{ .port }}
  initialDelaySeconds: {{ .readiness_initial_delay | default 5 }}
  periodSeconds: {{ .readiness_period | default 5 }}
  timeoutSeconds: {{ .readiness_timeout | default 3 }}
  failureThreshold: {{ .readiness_failure_threshold | default 3 }}
```

### Labels and Annotations
Use consistent labels and annotations:

```yaml
metadata:
  labels:
    app: {{ .app_name }}
    app.kubernetes.io/name: {{ .app_name }}
    app.kubernetes.io/instance: {{ .app_name }}
    app.kubernetes.io/version: {{ .app_version | default "latest" }}
    app.kubernetes.io/component: {{ .component | default "app" }}
    app.kubernetes.io/part-of: {{ .app_name }}
    app.kubernetes.io/managed-by: kind-cluster-setup
  annotations:
    deployment.kubernetes.io/revision: "1"
    {{- if .description }}
    description: {{ .description }}
    {{- end }}
```

## Security Guidelines

### Security Context
Always specify security context:

```yaml
securityContext:
  runAsNonRoot: {{ .run_as_non_root | default true }}
  runAsUser: {{ .run_as_user | default 1000 }}
  runAsGroup: {{ .run_as_group | default 1000 }}
  fsGroup: {{ .fs_group | default 1000 }}
  readOnlyRootFilesystem: {{ .read_only_root_filesystem | default false }}
  allowPrivilegeEscalation: {{ .allow_privilege_escalation | default false }}
  capabilities:
    drop:
    - ALL
    {{- if .additional_capabilities }}
    add:
    {{- range .additional_capabilities }}
    - {{ . }}
    {{- end }}
    {{- end }}
```

### Secret Management
Use Kubernetes secrets for sensitive data:

```yaml
# Never include sensitive data in plain text
env:
- name: DATABASE_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ .app_name }}-secret
      key: password
- name: API_KEY
  valueFrom:
    secretKeyRef:
      name: {{ .app_name }}-secret
      key: api-key
```

### Network Policies
Include network policies when applicable:

```yaml
{{- if .network_policy_enabled }}
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: {{ .app_name }}-netpol
spec:
  podSelector:
    matchLabels:
      app: {{ .app_name }}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          access: {{ .app_name }}
    ports:
    - protocol: TCP
      port: {{ .port }}
{{- end }}
```

## Documentation Requirements

### README.md Structure
Every template must include a comprehensive README.md:

```markdown
# Application Name Template

## Description
Brief description of what this template deploys.

## Features
- List of key features
- Supported configurations
- Optional components

## Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| app_name | string | app | Application name |

## Examples

### Basic Deployment
```yaml
app_name: my-app
replicas: 1
```

### Production Deployment
```yaml
app_name: prod-app
replicas: 3
enable_monitoring: true
```

## Requirements
- Kubernetes 1.20+
- Minimum resources: 1 CPU, 2GB RAM
- Storage requirements (if applicable)

## Security Considerations
- Security features enabled by default
- Recommended security configurations
- Known security limitations

## Troubleshooting
Common issues and solutions.
```

### Parameter Documentation
Document all parameters with:
- Clear descriptions
- Valid value ranges
- Default values
- Dependencies
- Examples

### Examples Directory
Include practical examples:
- `basic-deployment.yaml` - Minimal configuration
- `production-config.yaml` - Production-ready configuration
- `development-config.yaml` - Development environment
- `high-availability.yaml` - HA configuration (if applicable)

## Quality Assurance

### Pre-submission Checklist
- [ ] Template follows naming conventions
- [ ] All required metadata fields present
- [ ] Parameters properly documented
- [ ] Resource limits specified
- [ ] Security context configured
- [ ] Health checks implemented
- [ ] Labels and annotations consistent
- [ ] README.md complete
- [ ] Examples provided
- [ ] Tests included

### Testing Requirements
- [ ] Template processes without errors
- [ ] Deployment succeeds with default parameters
- [ ] Deployment succeeds with custom parameters
- [ ] Application starts and responds to health checks
- [ ] Resource cleanup works properly
- [ ] Parameter validation works correctly

### Code Review Criteria
Templates are reviewed for:
1. **Functionality**: Does it work as intended?
2. **Security**: Are security best practices followed?
3. **Performance**: Are resource limits appropriate?
4. **Maintainability**: Is the code clean and well-documented?
5. **Standards Compliance**: Does it follow project conventions?
6. **User Experience**: Is it easy to use and understand?

### Continuous Improvement
- Regular template updates for security patches
- Performance optimization based on usage patterns
- User feedback incorporation
- Documentation improvements
- Test coverage enhancement

---

Following these standards ensures that all templates in the Kind Cluster Setup project maintain high quality, consistency, and usability for the community.
