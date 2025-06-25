# Application Template Schema

This document defines the comprehensive schema for application templates in the Kind Setup deployment system.

## Overview

Application templates are modular, self-contained packages that define how to deploy applications to Kubernetes clusters. Each template includes metadata, parameter definitions, deployment manifests, and UI configuration.

## Directory Structure

```
templates/apps/
├── <template-name>/
│   ├── metadata.json          # Template metadata and parameter definitions
│   ├── README.md             # Template documentation
│   ├── kubernetes/           # Raw Kubernetes manifests
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── configmap.yaml
│   ├── helm/                 # Helm chart (optional)
│   │   ├── Chart.yaml
│   │   ├── values.yaml
│   │   └── templates/
│   └── examples/             # Example configurations
│       ├── basic.yaml
│       └── production.yaml
```

## Metadata Schema

The `metadata.json` file defines the template's metadata and parameter configuration:

```json
{
  "display_name": "Application Display Name",
  "description": "Detailed description of the application",
  "version": "1.0.0",
  "icon": "https://example.com/icon.png",
  "category": "Web Servers|Databases|Monitoring|Development|Message Queues",
  "tags": ["web", "server", "nginx"],
  "deployment_methods": ["kubectl", "helm"],
  "min_kubernetes_version": "1.20.0",
  "parameters": {
    "parameter_name": {
      "type": "string|number|boolean|array|object|enum",
      "ui_control": "text|textarea|number|slider|checkbox|select|multiselect|file",
      "label": "Display Label",
      "description": "Help text for the parameter",
      "default": "default_value",
      "required": true,
      "validation": {
        "min": 1,
        "max": 100,
        "pattern": "^[a-zA-Z0-9-]+$",
        "options": ["option1", "option2"],
        "custom_validator": "function_name"
      },
      "dependencies": {
        "show_when": {"other_param": "value"},
        "required_when": {"other_param": "value"},
        "disabled_when": {"other_param": "value"}
      },
      "group": "section_name"
    }
  },
  "parameter_groups": {
    "group_name": {
      "label": "Group Display Name",
      "description": "Group description",
      "order": 1,
      "collapsible": true,
      "collapsed": false
    }
  },
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
    ],
    "ingress": {
      "enabled": false,
      "annotations": {}
    }
  }
}
```

## Parameter Types

### String Parameters
```json
{
  "app_name": {
    "type": "string",
    "ui_control": "text",
    "label": "Application Name",
    "description": "Name for the application instance",
    "default": "my-app",
    "required": true,
    "validation": {
      "pattern": "^[a-z0-9-]+$",
      "min": 3,
      "max": 50
    }
  }
}
```

### Number Parameters
```json
{
  "replicas": {
    "type": "number",
    "ui_control": "slider",
    "label": "Replica Count",
    "description": "Number of application replicas",
    "default": 1,
    "validation": {
      "min": 1,
      "max": 10
    }
  }
}
```

### Boolean Parameters
```json
{
  "enable_monitoring": {
    "type": "boolean",
    "ui_control": "checkbox",
    "label": "Enable Monitoring",
    "description": "Enable Prometheus monitoring",
    "default": false
  }
}
```

### Enum Parameters
```json
{
  "service_type": {
    "type": "enum",
    "ui_control": "select",
    "label": "Service Type",
    "description": "Kubernetes service type",
    "default": "ClusterIP",
    "validation": {
      "options": ["ClusterIP", "NodePort", "LoadBalancer"]
    }
  }
}
```

### Array Parameters
```json
{
  "environment_vars": {
    "type": "array",
    "ui_control": "multiselect",
    "label": "Environment Variables",
    "description": "Additional environment variables",
    "default": [],
    "validation": {
      "max_items": 20
    }
  }
}
```

## Parameter Dependencies

Parameters can have dependencies that control their visibility and behavior:

```json
{
  "enable_ssl": {
    "type": "boolean",
    "ui_control": "checkbox",
    "label": "Enable SSL",
    "default": false
  },
  "ssl_certificate": {
    "type": "string",
    "ui_control": "textarea",
    "label": "SSL Certificate",
    "dependencies": {
      "show_when": {"enable_ssl": true},
      "required_when": {"enable_ssl": true}
    }
  }
}
```

## Parameter Groups

Organize related parameters into collapsible groups:

```json
{
  "parameter_groups": {
    "basic": {
      "label": "Basic Configuration",
      "description": "Essential application settings",
      "order": 1,
      "collapsible": false
    },
    "advanced": {
      "label": "Advanced Settings",
      "description": "Advanced configuration options",
      "order": 2,
      "collapsible": true,
      "collapsed": true
    },
    "security": {
      "label": "Security Settings",
      "description": "Security and authentication options",
      "order": 3,
      "collapsible": true,
      "collapsed": false
    }
  }
}
```

## Validation Rules

### Built-in Validators
- `required`: Field must have a value
- `min`/`max`: Minimum/maximum value for numbers or length for strings
- `pattern`: Regular expression pattern for strings
- `options`: Valid options for enum types
- `min_items`/`max_items`: Array length constraints

### Custom Validators
Templates can reference custom validation functions:

```json
{
  "validation": {
    "custom_validator": "validate_kubernetes_name"
  }
}
```

## Template Versioning

Templates support semantic versioning:

```json
{
  "version": "1.2.3",
  "compatibility": {
    "min_kind_setup_version": "1.0.0",
    "max_kind_setup_version": "2.0.0"
  }
}
```

## Best Practices

1. **Parameter Naming**: Use snake_case for parameter names
2. **Descriptions**: Provide clear, helpful descriptions for all parameters
3. **Defaults**: Set sensible default values for all parameters
4. **Grouping**: Organize parameters into logical groups
5. **Validation**: Add appropriate validation rules
6. **Dependencies**: Use dependencies to create intuitive UIs
7. **Documentation**: Include comprehensive README.md files
8. **Examples**: Provide example configurations for common use cases

## Template Categories

- **Web Servers**: nginx, apache, caddy
- **Databases**: postgresql, mysql, mongodb, redis
- **Monitoring**: prometheus, grafana, jaeger, elasticsearch
- **Development**: jenkins, gitlab, sonarqube, nexus
- **Message Queues**: rabbitmq, kafka, nats
- **Storage**: minio, ceph, longhorn
- **Security**: vault, cert-manager, oauth2-proxy
