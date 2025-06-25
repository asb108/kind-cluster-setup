# Template Contribution Guide

This guide explains how to create and contribute application templates to the Kind Setup deployment system.

## Getting Started

Application templates are modular packages that define how to deploy applications to Kubernetes clusters. Each template includes metadata, parameter definitions, and deployment manifests.

## Template Structure

Create a new template by following this directory structure:

```
templates/apps/<your-template-name>/
├── metadata.json          # Required: Template metadata and parameters
├── README.md             # Required: Template documentation
├── kubernetes/           # Required: Kubernetes manifests
│   ├── deployment.yaml
│   ├── service.yaml
│   └── configmap.yaml
├── helm/                 # Optional: Helm chart
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/
└── examples/             # Optional: Example configurations
    ├── basic.yaml
    └── production.yaml
```

## Step-by-Step Guide

### 1. Create Template Directory

```bash
mkdir -p templates/apps/my-application
cd templates/apps/my-application
```

### 2. Create metadata.json

This is the most important file that defines your template:

```json
{
  "display_name": "My Application",
  "description": "A brief description of what this application does",
  "version": "1.0.0",
  "icon": "https://example.com/icon.png",
  "category": "Web Servers",
  "tags": ["web", "api", "microservice"],
  "deployment_methods": ["kubectl", "helm"],
  "min_kubernetes_version": "1.20.0",
  "parameters": {
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
      },
      "group": "basic"
    },
    "replicas": {
      "type": "number",
      "ui_control": "slider",
      "label": "Replica Count",
      "description": "Number of application replicas",
      "default": 1,
      "validation": {
        "min": 1,
        "max": 10
      },
      "group": "basic"
    }
  },
  "parameter_groups": {
    "basic": {
      "label": "Basic Configuration",
      "description": "Essential application settings",
      "order": 1
    }
  }
}
```

### 3. Create Kubernetes Manifests

Create deployment manifests in the `kubernetes/` directory:

**deployment.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .app_name }}
  labels:
    app: {{ .app_name }}
spec:
  replicas: {{ .replicas }}
  selector:
    matchLabels:
      app: {{ .app_name }}
  template:
    metadata:
      labels:
        app: {{ .app_name }}
    spec:
      containers:
      - name: {{ .app_name }}
        image: my-app:latest
        ports:
        - containerPort: 8080
```

**service.yaml:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: {{ .app_name }}-service
spec:
  selector:
    app: {{ .app_name }}
  ports:
  - port: 80
    targetPort: 8080
  type: ClusterIP
```

### 4. Create README.md

Document your template:

```markdown
# My Application Template

## Description
Brief description of the application and its purpose.

## Parameters
- **app_name**: Name for the application instance
- **replicas**: Number of application replicas

## Usage
1. Select this template in the Kind Setup UI
2. Configure the parameters
3. Deploy to your cluster

## Examples
See the `examples/` directory for sample configurations.
```

### 5. Add Examples (Optional)

Create example configurations in the `examples/` directory:

**examples/basic.yaml:**
```yaml
app_name: "my-basic-app"
replicas: 1
```

**examples/production.yaml:**
```yaml
app_name: "my-prod-app"
replicas: 3
enable_monitoring: true
```

## Parameter Types and UI Controls

### String Parameters
```json
{
  "parameter_name": {
    "type": "string",
    "ui_control": "text|textarea",
    "label": "Display Label",
    "description": "Help text",
    "default": "default_value",
    "validation": {
      "pattern": "^[a-zA-Z0-9-]+$",
      "min": 1,
      "max": 100
    }
  }
}
```

### Number Parameters
```json
{
  "parameter_name": {
    "type": "number",
    "ui_control": "number|slider",
    "label": "Display Label",
    "default": 1,
    "validation": {
      "min": 1,
      "max": 100
    }
  }
}
```

### Boolean Parameters
```json
{
  "parameter_name": {
    "type": "boolean",
    "ui_control": "checkbox",
    "label": "Display Label",
    "default": false
  }
}
```

### Enum Parameters
```json
{
  "parameter_name": {
    "type": "enum",
    "ui_control": "select",
    "label": "Display Label",
    "default": "option1",
    "validation": {
      "options": ["option1", "option2", "option3"]
    }
  }
}
```

## Parameter Dependencies

Make parameters conditional based on other selections:

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

## Template Validation

Before submitting your template, validate it:

1. **Metadata Validation**: Ensure metadata.json follows the schema
2. **Manifest Validation**: Verify Kubernetes manifests are valid
3. **Parameter Testing**: Test all parameter combinations
4. **Documentation**: Ensure README.md is complete

## Submission Process

1. **Fork the Repository**: Create a fork of the Kind Setup repository
2. **Create Your Template**: Follow this guide to create your template
3. **Test Thoroughly**: Deploy and test your template
4. **Submit Pull Request**: Create a PR with your template
5. **Review Process**: Maintainers will review and provide feedback

## Best Practices

### Naming Conventions
- Use lowercase with hyphens for template names: `my-application`
- Use snake_case for parameter names: `app_name`
- Use descriptive, clear names

### Parameter Design
- Provide sensible defaults for all parameters
- Group related parameters together
- Use appropriate UI controls for parameter types
- Add helpful descriptions and validation

### Documentation
- Write clear, comprehensive README files
- Include usage examples
- Document all parameters and their effects
- Provide troubleshooting information

### Security
- Don't include sensitive data in templates
- Use Kubernetes secrets for sensitive information
- Follow security best practices

### Testing
- Test with different parameter combinations
- Verify deployment on different cluster configurations
- Test upgrade and rollback scenarios

## Template Categories

Choose the appropriate category for your template:

- **Web Servers**: nginx, apache, caddy
- **Databases**: postgresql, mysql, mongodb, redis
- **Monitoring**: prometheus, grafana, jaeger
- **Development**: jenkins, gitlab, sonarqube
- **Message Queues**: rabbitmq, kafka, nats
- **Storage**: minio, ceph, longhorn
- **Security**: vault, cert-manager, oauth2-proxy

## Support

If you need help creating templates:

1. Check existing templates for examples
2. Review the template schema documentation
3. Ask questions in GitHub issues
4. Join our community discussions

## License

All contributed templates must be compatible with the project's license.
