# Template Development Guide

This guide provides comprehensive instructions for creating application templates for the Kind Cluster Setup system. Templates enable one-click deployment of applications with customizable parameters.

## Table of Contents

- [Overview](#overview)
- [Template Structure](#template-structure)
- [Metadata Schema](#metadata-schema)
- [Template Processing](#template-processing)
- [Parameter Validation](#parameter-validation)
- [Testing Templates](#testing-templates)
- [Submission Process](#submission-process)

## Overview

Templates in Kind Cluster Setup are structured collections of Kubernetes manifests with parameterized values that allow users to deploy applications with customizable configurations. Each template consists of:

- **Metadata**: JSON file defining parameters, validation rules, and UI configuration
- **Manifests**: Kubernetes YAML files with template variables
- **Documentation**: README and examples for users
- **Tests**: Validation and integration tests

## Template Structure

### Directory Layout

```
templates/apps/{app-name}/
├── metadata.json              # Template metadata and parameters
├── README.md                 # Template documentation
├── kubernetes/               # Kubernetes manifests
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   └── ingress.yaml (optional)
├── helm/                     # Helm chart (optional)
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/
├── tests/                    # Template tests
│   ├── default-values.yaml
│   ├── test-scenarios/
│   └── validation-tests.yaml
└── examples/                 # Usage examples
    ├── basic-deployment.yaml
    ├── production-config.yaml
    └── development-config.yaml
```

### Naming Conventions

1. **Directory Names**: Use kebab-case (e.g., `my-application`)
2. **File Names**: Use kebab-case with descriptive names
3. **Parameter Names**: Use snake_case (e.g., `database_name`)
4. **Resource Names**: Use template variables for dynamic naming

## Metadata Schema

The `metadata.json` file defines the template's parameters, UI configuration, and deployment options.

### Basic Structure

```json
{
  "display_name": "Application Name",
  "description": "Brief description of the application",
  "version": "1.0.0",
  "app_version": "latest",
  "category": "Databases",
  "tags": ["database", "sql"],
  "deployment_methods": ["kubectl", "helm"],
  "min_kubernetes_version": "1.20.0",
  "parameters": {
    // Parameter definitions
  },
  "parameter_groups": {
    // UI grouping configuration
  }
}
```

### Parameter Types

#### String Parameters
```json
"app_name": {
  "type": "string",
  "ui_control": "text",
  "label": "Application Name",
  "description": "Name for the application instance",
  "default": "my-app",
  "required": true,
  "validation": {
    "pattern": "^[a-z0-9-]+$",
    "minLength": 3,
    "maxLength": 50
  },
  "group": "basic"
}
```

#### Number Parameters
```json
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
  "group": "scaling"
}
```

#### Boolean Parameters
```json
"enable_monitoring": {
  "type": "boolean",
  "ui_control": "checkbox",
  "label": "Enable Monitoring",
  "description": "Enable Prometheus monitoring",
  "default": false,
  "group": "monitoring"
}
```

#### Enum Parameters
```json
"service_type": {
  "type": "enum",
  "ui_control": "select",
  "label": "Service Type",
  "description": "Kubernetes service type",
  "default": "ClusterIP",
  "validation": {
    "options": ["ClusterIP", "NodePort", "LoadBalancer"]
  },
  "group": "networking"
}
```

### Parameter Dependencies

Parameters can have dependencies that control when they are shown or required:

```json
"monitoring_port": {
  "type": "number",
  "ui_control": "number",
  "label": "Monitoring Port",
  "default": 9090,
  "dependencies": {
    "show_when": {"enable_monitoring": true},
    "required_when": {"enable_monitoring": true}
  },
  "group": "monitoring"
}
```

### Parameter Groups

Organize parameters into logical groups for better UI organization:

```json
"parameter_groups": {
  "basic": {
    "label": "Basic Configuration",
    "description": "Essential application settings",
    "order": 1,
    "collapsible": false
  },
  "scaling": {
    "label": "Scaling & Performance",
    "description": "Replica and resource configuration",
    "order": 2,
    "collapsible": true,
    "collapsed": true
  }
}
```

## Template Processing

### Variable Substitution

Templates support multiple variable formats:

```yaml
# Simple variables
name: {{ .app_name }}
name: {{ app_name }}

# With functions
password: {{ .password | b64enc }}
config: {{ .config | to_json }}

# With defaults
image: {{ .image | default "nginx:latest" }}
```

### Conditional Blocks

Use conditional blocks for optional features:

```yaml
{{- if .enable_monitoring }}
- name: metrics
  containerPort: {{ .monitoring_port }}
  protocol: TCP
{{- end }}
```

### Loop Blocks

Process arrays and lists:

```yaml
{{- range .additional_ports }}
- name: {{ .name }}
  containerPort: {{ .port }}
  protocol: {{ .protocol | default "TCP" }}
{{- end }}
```

### Available Functions

| Function | Description | Example |
|----------|-------------|---------|
| `b64enc` | Base64 encode | `{{ .password \| b64enc }}` |
| `b64dec` | Base64 decode | `{{ .encoded \| b64dec }}` |
| `to_json` | Convert to JSON | `{{ .config \| to_json }}` |
| `to_yaml` | Convert to YAML | `{{ .data \| to_yaml }}` |
| `upper` | Uppercase | `{{ .name \| upper }}` |
| `lower` | Lowercase | `{{ .name \| lower }}` |
| `default` | Default value | `{{ .value \| default "fallback" }}` |
| `required` | Require value | `{{ .value \| required "Error message" }}` |
| `quote` | Quote string | `{{ .value \| quote }}` |
| `sha256` | SHA256 hash | `{{ .value \| sha256 }}` |

## Parameter Validation

### Validation Rules

#### String Validation
```json
{
  "pattern": "^[a-z0-9-]+$",
  "minLength": 3,
  "maxLength": 50
}
```

#### Number Validation
```json
{
  "min": 1,
  "max": 100,
  "multipleOf": 1
}
```

#### Array Validation
```json
{
  "minItems": 1,
  "maxItems": 10,
  "uniqueItems": true
}
```

#### Custom Validation
```json
{
  "custom": "validate_kubernetes_name"
}
```

### Best Practices

1. **Provide Sensible Defaults**: All optional parameters should have reasonable defaults
2. **Use Descriptive Labels**: Make parameter purposes clear to users
3. **Group Related Parameters**: Organize parameters logically for better UX
4. **Validate Input**: Use appropriate validation rules to prevent errors
5. **Document Dependencies**: Clearly specify parameter relationships

## Testing Templates

### Unit Tests

Create test files in the `tests/` directory:

```yaml
# tests/default-values.yaml
app_name: test-app
replicas: 1
enable_monitoring: false
```

### Integration Tests

Test actual deployments:

```bash
# Test with default values
./test-template.sh my-app tests/default-values.yaml

# Test with custom values
./test-template.sh my-app tests/production-config.yaml
```

### Validation Tests

Ensure parameter validation works:

```yaml
# tests/validation-tests.yaml
test_cases:
  - name: "invalid_app_name"
    parameters:
      app_name: "Invalid Name!"
    expect_error: true
  - name: "valid_config"
    parameters:
      app_name: "valid-app"
      replicas: 3
    expect_error: false
```

## Submission Process

### Before Submitting

1. **Test Thoroughly**: Ensure template works with various parameter combinations
2. **Follow Standards**: Adhere to naming conventions and structure requirements
3. **Document Completely**: Provide comprehensive README and examples
4. **Validate Metadata**: Ensure metadata.json follows the schema

### Submission Steps

1. **Create Pull Request**: Submit template via GitHub pull request
2. **Include Tests**: Provide comprehensive test cases
3. **Add Documentation**: Include README with usage examples
4. **Request Review**: Tag maintainers for template review

### Review Criteria

Templates are reviewed for:

- **Functionality**: Does the template deploy successfully?
- **Security**: Are security best practices followed?
- **Documentation**: Is the template well-documented?
- **Testing**: Are adequate tests provided?
- **Standards Compliance**: Does it follow project conventions?

---

For more detailed examples and advanced features, see the existing templates in the `templates/apps/` directory.
