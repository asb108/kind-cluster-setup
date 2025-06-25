# Kind Cluster Setup Architecture

This document provides a comprehensive overview of the Kind Cluster Setup system architecture, including component interactions, data flow, and technical implementation details.

## Table of Contents

- [System Overview](#system-overview)
- [Component Architecture](#component-architecture)
- [Template Processing Engine](#template-processing-engine)
- [Parameter Management System](#parameter-management-system)
- [Deployment Workflow](#deployment-workflow)
- [Data Storage](#data-storage)
- [API Design](#api-design)
- [Security Architecture](#security-architecture)

## System Overview

Kind Cluster Setup is a web-based platform for deploying applications to Kubernetes clusters using a template-driven approach. The system consists of several interconnected components that work together to provide a seamless deployment experience.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                          │
├─────────────────────────────────────────────────────────────────┤
│  React UI  │  Parameter Forms  │  Deployment Status  │  Logs   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API Layer                              │
├─────────────────────────────────────────────────────────────────┤
│   FastAPI   │   Authentication   │   Rate Limiting   │  CORS   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Business Logic Layer                      │
├─────────────────────────────────────────────────────────────────┤
│ Template Engine │ Parameter Validator │ Deployment Manager     │
│ Error Handler   │ Rollback System     │ Task Manager           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Infrastructure Layer                      │
├─────────────────────────────────────────────────────────────────┤
│  Kubernetes API  │  File System  │  Task Storage  │  Logging   │
└─────────────────────────────────────────────────────────────────┘
```

### Core Principles

1. **Separation of Concerns**: Each component has a specific responsibility
2. **Modularity**: Components can be developed and tested independently
3. **Extensibility**: New templates and features can be added easily
4. **Reliability**: Comprehensive error handling and recovery mechanisms
5. **Security**: Secure by default with proper validation and authentication

## Component Architecture

### Frontend Components

```
src/
├── components/
│   ├── common/
│   │   ├── Header.jsx
│   │   ├── Navigation.jsx
│   │   └── ErrorBoundary.jsx
│   ├── templates/
│   │   ├── TemplateList.jsx
│   │   ├── TemplateCard.jsx
│   │   └── TemplateDetails.jsx
│   ├── deployment/
│   │   ├── DeploymentForm.jsx
│   │   ├── ParameterInput.jsx
│   │   ├── DeploymentStatus.jsx
│   │   └── DeploymentLogs.jsx
│   └── management/
│       ├── AppList.jsx
│       ├── AppDetails.jsx
│       └── AppActions.jsx
├── hooks/
│   ├── useTemplates.js
│   ├── useDeployment.js
│   └── useWebSocket.js
├── services/
│   ├── api.js
│   ├── websocket.js
│   └── storage.js
└── utils/
    ├── validation.js
    ├── formatting.js
    └── constants.js
```

### Backend Components

```
src/kind_cluster_setup/
├── api/
│   ├── server.py              # FastAPI application
│   ├── routes/
│   │   ├── templates.py       # Template management endpoints
│   │   ├── deployments.py     # Deployment endpoints
│   │   ├── clusters.py        # Cluster management endpoints
│   │   └── health.py          # Health check endpoints
│   ├── middleware/
│   │   ├── auth.py            # Authentication middleware
│   │   ├── cors.py            # CORS configuration
│   │   └── rate_limit.py      # Rate limiting
│   └── models/
│       ├── deployment.py      # Pydantic models
│       ├── template.py        # Template models
│       └── cluster.py         # Cluster models
├── core/
│   ├── kubernetes.py          # Kubernetes client wrapper
│   ├── command.py             # Command execution utilities
│   └── config.py              # Configuration management
├── templates/
│   ├── processor.py           # Template processing engine
│   ├── validator.py           # Template validation
│   └── loader.py              # Template loading and caching
├── deployment/
│   ├── manager.py             # Deployment orchestration
│   ├── strategies/
│   │   ├── kubectl.py         # kubectl deployment strategy
│   │   ├── helm.py            # Helm deployment strategy
│   │   └── kustomize.py       # Kustomize deployment strategy
│   └── rollback.py            # Rollback functionality
├── validation/
│   ├── parameter_validator.py # Parameter validation
│   ├── schema_validator.py    # Schema validation
│   └── security_validator.py  # Security validation
└── utils/
    ├── logging.py             # Logging configuration
    ├── errors.py              # Custom exceptions
    └── helpers.py             # Utility functions
```

## Template Processing Engine

### Template Processor Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Template      │    │   Parameter     │    │   Processed     │
│   Files         │───▶│   Substitution  │───▶│   Manifests     │
│   (.yaml)       │    │   Engine        │    │   (.yaml)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Function      │
                       │   Library       │
                       │   (b64enc, etc) │
                       └─────────────────┘
```

### Processing Pipeline

1. **Template Loading**: Load template files from filesystem
2. **Parameter Validation**: Validate input parameters against schema
3. **Variable Substitution**: Replace template variables with actual values
4. **Function Processing**: Execute template functions (encoding, formatting, etc.)
5. **Conditional Processing**: Handle if/else blocks and loops
6. **YAML Validation**: Ensure generated YAML is valid
7. **Resource Generation**: Create final Kubernetes manifests

### Template Functions

```python
class TemplateFunctions:
    """Built-in template functions"""

    @staticmethod
    def b64encode(value: str) -> str:
        """Base64 encode a string"""
        return base64.b64encode(str(value).encode()).decode()

    @staticmethod
    def to_json(value: Any) -> str:
        """Convert value to JSON string"""
        return json.dumps(value)

    @staticmethod
    def default(value: Any, default_value: Any) -> Any:
        """Return default if value is None or empty"""
        return value if value is not None and value != "" else default_value

    @staticmethod
    def required(value: Any, message: str = "Required value is missing") -> Any:
        """Ensure value is not None or empty"""
        if value is None or value == "":
            raise ValueError(message)
        return value
```

## Parameter Management System

### Parameter Validation Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Input    │    │   Schema        │    │   Validated     │
│   Parameters    │───▶│   Validation    │───▶│   Parameters    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Custom        │
                       │   Validators    │
                       └─────────────────┘
```

### Validation Layers

1. **Type Validation**: Ensure parameters match expected types
2. **Format Validation**: Validate strings against regex patterns
3. **Range Validation**: Check numeric values are within bounds
4. **Dependency Validation**: Verify parameter dependencies are met
5. **Custom Validation**: Run application-specific validation logic
6. **Security Validation**: Check for potential security issues

### Parameter Storage

```python
class ParameterConfigManager:
    """Manages parameter configurations and presets"""

    def save_parameter_config(self, config_name: str, app_name: str,
                            parameters: Dict[str, Any]) -> str:
        """Save a parameter configuration for reuse"""
        pass

    def load_parameter_config(self, config_id: str) -> Dict[str, Any]:
        """Load a saved parameter configuration"""
        pass

    def list_presets(self, app_name: str) -> List[Dict[str, Any]]:
        """List available preset configurations"""
        pass
```

## Deployment Workflow

### Deployment State Machine

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   PENDING   │───▶│  VALIDATING │───▶│ PROCESSING  │───▶│ DEPLOYING   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                          │                  │                  │
                          ▼                  ▼                  ▼
                   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
                   │   FAILED    │    │   FAILED    │    │  COMPLETED  │
                   │ (Validation)│    │ (Processing)│    │ or FAILED   │
                   └─────────────┘    └─────────────┘    └─────────────┘
```

### Deployment Process

1. **Request Validation**: Validate deployment request format
2. **Parameter Validation**: Validate all parameters against template schema
3. **Template Processing**: Generate Kubernetes manifests from templates
4. **Resource Validation**: Validate generated manifests
5. **Cluster Preparation**: Ensure namespace and prerequisites exist
6. **Resource Deployment**: Apply manifests to Kubernetes cluster
7. **Status Monitoring**: Monitor deployment progress and health
8. **Completion Notification**: Notify user of deployment status

### Error Handling and Recovery

```python
class DeploymentErrorHandler:
    """Handles deployment errors with recovery suggestions"""

    def handle_deployment_error(self, error: Exception,
                              context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle deployment errors with automatic recovery attempts
        and user-friendly error messages
        """
        pass

    def attempt_auto_recovery(self, error_info: Dict[str, Any]) -> bool:
        """Attempt automatic recovery for certain error types"""
        pass
```

## Data Storage

### Storage Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Storage Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  Templates   │  Configurations  │  Task History  │  Logs       │
│  (File)      │  (JSON Files)    │  (JSON Files)  │  (Files)    │
└─────────────────────────────────────────────────────────────────┘
```

### Data Models

#### Template Metadata
```python
@dataclass
class TemplateMetadata:
    name: str
    display_name: str
    description: str
    version: str
    category: str
    parameters: Dict[str, ParameterDefinition]
    parameter_groups: Dict[str, ParameterGroup]
```

#### Deployment Task
```python
@dataclass
class DeploymentTask:
    id: str
    app_name: str
    template_name: str
    parameters: Dict[str, Any]
    status: DeploymentStatus
    created_at: datetime
    updated_at: datetime
    error_message: Optional[str]
    rollback_id: Optional[str]
```

### Persistence Strategy

1. **Templates**: Stored as files in the filesystem
2. **Configurations**: JSON files for user parameter configurations
3. **Task History**: JSON files for deployment tracking
4. **Logs**: Structured log files with rotation
5. **Cache**: In-memory caching for frequently accessed data

## API Design

### RESTful Endpoints

```
GET    /api/templates                    # List available templates
GET    /api/templates/{name}             # Get template details
POST   /api/templates/{name}/validate    # Validate parameters

GET    /api/clusters                     # List available clusters
GET    /api/clusters/{name}/status       # Get cluster status

POST   /api/deployments                  # Create new deployment
GET    /api/deployments                  # List deployments
GET    /api/deployments/{id}             # Get deployment details
DELETE /api/deployments/{id}             # Delete deployment
POST   /api/deployments/{id}/rollback    # Rollback deployment

GET    /api/apps                         # List deployed applications
GET    /api/apps/{name}                  # Get application details
POST   /api/apps/{name}/scale            # Scale application
POST   /api/apps/{name}/restart          # Restart application

GET    /api/health                       # Health check
GET    /api/metrics                      # System metrics
```

### WebSocket Events

```python
# Real-time deployment status updates
{
    "type": "deployment_status",
    "deployment_id": "uuid",
    "status": "deploying",
    "progress": 75,
    "message": "Applying service manifest"
}

# Log streaming
{
    "type": "deployment_log",
    "deployment_id": "uuid",
    "timestamp": "2023-12-01T10:00:00Z",
    "level": "info",
    "message": "Pod started successfully"
}
```

## Security Architecture

### Security Layers

1. **Input Validation**: Sanitize all user inputs
2. **Parameter Validation**: Prevent injection attacks through parameters
3. **Template Validation**: Ensure templates don't contain malicious content
4. **Kubernetes RBAC**: Use appropriate service accounts and permissions
5. **Network Security**: Secure communication between components
6. **Audit Logging**: Log all security-relevant events

### Authentication and Authorization

```python
class SecurityManager:
    """Handles authentication and authorization"""

    def authenticate_user(self, token: str) -> Optional[User]:
        """Authenticate user from token"""
        pass

    def authorize_deployment(self, user: User, template: str,
                           cluster: str) -> bool:
        """Check if user can deploy to cluster"""
        pass

    def validate_template_security(self, template: Dict[str, Any]) -> bool:
        """Validate template for security issues"""
        pass
```

### Security Best Practices

1. **Principle of Least Privilege**: Grant minimal necessary permissions
2. **Input Sanitization**: Validate and sanitize all inputs
3. **Secure Defaults**: Use secure configurations by default
4. **Regular Updates**: Keep dependencies and base images updated
5. **Audit Trails**: Maintain comprehensive audit logs
6. **Secret Management**: Properly handle sensitive data

---

This architecture provides a solid foundation for the Kind Cluster Setup system while maintaining flexibility for future enhancements and scalability requirements.
