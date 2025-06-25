# Security Policy

## Supported Versions

We actively support the following versions of Kind Cluster Setup:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security vulnerability in Kind Cluster Setup, please report it to us privately.

### How to Report

1. **Email**: Send details to security@kind-cluster-setup.dev
2. **GitHub**: Use the private vulnerability reporting feature
3. **Include**: 
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: We'll acknowledge receipt within 48 hours
- **Assessment**: Initial assessment within 5 business days
- **Updates**: Regular updates on our progress
- **Resolution**: We aim to resolve critical issues within 30 days

### Security Best Practices

When using Kind Cluster Setup:

1. **Environment Variables**: Never commit sensitive data to version control
2. **Network Security**: Restrict access to the API server in production
3. **CORS Configuration**: Configure CORS properly for production deployments
4. **Authentication**: Implement proper authentication for production use
5. **Updates**: Keep dependencies and the application updated
6. **Monitoring**: Monitor for unusual activity in your clusters

### Responsible Disclosure

We follow responsible disclosure practices:

- We'll work with you to understand and resolve the issue
- We'll credit you for the discovery (unless you prefer to remain anonymous)
- We'll coordinate the timing of any public disclosure
- We'll provide security advisories for significant vulnerabilities

## Security Features

Kind Cluster Setup includes several security features:

- **Input Validation**: All API inputs are validated
- **Resource Limits**: Configurable resource limits for clusters
- **Namespace Isolation**: Applications are deployed in separate namespaces
- **Template Validation**: Application templates are validated before deployment
- **Audit Logging**: Comprehensive logging of all operations

## Known Security Considerations

- **Local Development**: This tool is designed for local development and testing
- **Production Use**: Additional security measures are required for production deployments
- **Cluster Access**: The tool requires cluster-admin privileges to manage Kind clusters
- **Docker Access**: Requires Docker daemon access to create Kind clusters

Thank you for helping keep Kind Cluster Setup secure!
