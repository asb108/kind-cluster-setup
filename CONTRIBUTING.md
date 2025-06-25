# Contributing to Kind Cluster Setup

Welcome to the Kind Cluster Setup project! We're excited to have you contribute to making Kubernetes application deployment simple and accessible for everyone.

## Table of Contents

- [Project Overview](#project-overview)
- [Getting Started](#getting-started)
- [Development Environment Setup](#development-environment-setup)
- [Code Style Guidelines](#code-style-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Issue Reporting](#issue-reporting)
- [Community Guidelines](#community-guidelines)

## Project Overview

Kind Cluster Setup is a comprehensive platform for deploying applications to Kubernetes clusters using a template-based approach. The project consists of:

- **Backend API**: Python FastAPI server handling deployments and template management
- **Frontend UI**: React-based web interface for user interactions
- **Template System**: Extensible template library for various applications
- **Testing Framework**: Comprehensive testing suite for reliability

### Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend UI   │────│   Backend API   │────│  Kubernetes     │
│   (React)       │    │   (FastAPI)     │    │  Cluster        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                       ┌─────────────────┐
                       │  Template       │
                       │  System         │
                       └─────────────────┘
```

### Key Components

1. **Template Engine**: Processes application templates with parameter substitution
2. **Parameter Validation**: Ensures deployment parameters meet requirements
3. **Deployment Manager**: Handles Kubernetes resource creation and management
4. **Error Handling**: Comprehensive error recovery and rollback capabilities
5. **UI Generator**: Dynamic form generation based on template metadata

## Getting Started

### Prerequisites

- Python 3.11 or higher
- Node.js 18 or higher
- Docker and Docker Compose
- kubectl configured with cluster access
- Kind (Kubernetes in Docker) for local development

### Quick Start

1. **Fork and Clone the Repository**
   ```bash
   git clone https://github.com/asb108/kind-cluster-setup.git
   cd kind-cluster-setup
   ```

2. **Set Up Development Environment**
   ```bash
   # Create virtual environment
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate

   # Install dependencies
   pip install -r requirements-dev.txt

   # Install frontend dependencies
   cd frontend
   npm install
   cd ..
   ```

3. **Start Development Services**
   ```bash
   # Start backend
   python -m kind_cluster_setup.api.server

   # In another terminal, start frontend
   cd frontend
   npm start
   ```

## Development Environment Setup

### Backend Development

1. **Python Environment**
   ```bash
   # Create and activate virtual environment
   python -m venv venv
   source venv/bin/activate

   # Install development dependencies
   pip install -r requirements-dev.txt
   pip install -e .
   ```

2. **Environment Configuration**
   ```bash
   # Copy example environment file
   cp .env.example .env

   # Edit configuration as needed
   vim .env
   ```

3. **Database Setup**
   ```bash
   # Initialize database (if using database persistence)
   python -m kind_cluster_setup.db.init
   ```

### Frontend Development

1. **Node.js Setup**
   ```bash
   cd frontend
   npm install

   # Start development server
   npm start
   ```

2. **Environment Configuration**
   ```bash
   # Copy example environment file
   cp .env.example .env.local

   # Configure API endpoint
   echo "REACT_APP_API_URL=http://localhost:8020" >> .env.local
   ```

### Testing Environment

1. **Create Test Cluster**
   ```bash
   # Create Kind cluster for testing
   kind create cluster --name test-cluster --config kind-config.yaml

   # Verify cluster access
   kubectl cluster-info --context kind-test-cluster
   ```

2. **Run Test Suite**
   ```bash
   # Run backend tests
   pytest tests/ -v --cov=src/kind_cluster_setup

   # Run frontend tests
   cd frontend
   npm test
   ```

## Code Style Guidelines

### Python Code Style

We follow PEP 8 with some project-specific conventions:

1. **Formatting**
   - Use Black for code formatting: `black src/ tests/`
   - Line length: 100 characters
   - Use double quotes for strings

2. **Import Organization**
   ```python
   # Standard library imports
   import os
   import sys
   from typing import Dict, List, Optional

   # Third-party imports
   import yaml
   from fastapi import FastAPI

   # Local imports
   from .core import KubernetesClient
   from .templates import TemplateProcessor
   ```

3. **Type Hints**
   ```python
   # Always use type hints for function parameters and return values
   def process_template(content: str, values: Dict[str, Any]) -> str:
       """Process template with given values."""
       pass
   ```

4. **Documentation**
   ```python
   def deploy_application(app_config: Dict[str, Any]) -> DeploymentResult:
       """
       Deploy application using provided configuration.

       Args:
           app_config: Application configuration including template and parameters

       Returns:
           DeploymentResult containing deployment status and details

       Raises:
           ValidationError: If configuration is invalid
           DeploymentError: If deployment fails
       """
       pass
   ```

### JavaScript/React Code Style

1. **Use ESLint and Prettier**
   ```bash
   # Run linting
   npm run lint

   # Fix linting issues
   npm run lint:fix

   # Format code
   npm run format
   ```

2. **Component Structure**
   ```jsx
   // Use functional components with hooks
   import React, { useState, useEffect } from 'react';

   const DeploymentForm = ({ template, onSubmit }) => {
     const [parameters, setParameters] = useState({});

     useEffect(() => {
       // Initialize parameters with defaults
       setParameters(getDefaultParameters(template));
     }, [template]);

     return (
       <form onSubmit={handleSubmit}>
         {/* Component JSX */}
       </form>
     );
   };

   export default DeploymentForm;
   ```

### Linting and Formatting

1. **Pre-commit Hooks**
   ```bash
   # Install pre-commit hooks
   pre-commit install

   # Run hooks manually
   pre-commit run --all-files
   ```

2. **Automated Checks**
   - Black (Python formatting)
   - isort (Import sorting)
   - flake8 (Python linting)
   - mypy (Type checking)
   - ESLint (JavaScript linting)
   - Prettier (JavaScript formatting)

## Pull Request Process

### Before Submitting

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow code style guidelines
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**
   ```bash
   # Run full test suite
   make test

   # Run specific tests
   pytest tests/test_your_feature.py -v
   ```

4. **Commit Changes**
   ```bash
   # Use conventional commit format
   git commit -m "feat: add new template validation system"
   git commit -m "fix: resolve parameter processing bug"
   git commit -m "docs: update template creation guide"
   ```

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(templates): add PostgreSQL template with backup support
fix(api): resolve parameter validation error handling
docs(contributing): update development setup instructions
test(templates): add integration tests for Redis template
```

### Pull Request Guidelines

1. **PR Title and Description**
   - Use clear, descriptive titles
   - Include detailed description of changes
   - Reference related issues: "Fixes #123"

2. **PR Checklist**
   - [ ] Code follows style guidelines
   - [ ] Tests added for new functionality
   - [ ] Documentation updated
   - [ ] All tests pass
   - [ ] No breaking changes (or clearly documented)

3. **Review Process**
   - At least one maintainer review required
   - Address all review comments
   - Keep PR focused and reasonably sized
   - Rebase on main branch before merging

## Testing Requirements

### Test Categories

1. **Unit Tests**
   ```python
   # Test individual functions and classes
   def test_parameter_validation():
       validator = ParameterValidator()
       result = validator.validate_parameters(params, schema)
       assert result.is_valid
   ```

2. **Integration Tests**
   ```python
   # Test component interactions
   def test_template_deployment_flow():
       # Test complete deployment workflow
       pass
   ```

3. **End-to-End Tests**
   ```python
   # Test full user workflows
   def test_complete_deployment_workflow():
       # Test from UI interaction to cluster deployment
       pass
   ```

### Test Requirements

1. **Coverage Requirements**
   - Minimum 80% code coverage
   - 100% coverage for critical paths
   - All new features must include tests

2. **Test Organization**
   ```
   tests/
   ├── unit/
   │   ├── test_templates.py
   │   ├── test_validation.py
   │   └── test_deployment.py
   ├── integration/
   │   ├── test_api_endpoints.py
   │   └── test_template_processing.py
   └── e2e/
       ├── test_deployment_workflow.py
       └── test_ui_interactions.py
   ```

3. **Running Tests**
   ```bash
   # Run all tests
   pytest

   # Run with coverage
   pytest --cov=src/kind_cluster_setup --cov-report=html

   # Run specific test categories
   pytest tests/unit/
   pytest tests/integration/
   pytest tests/e2e/
   ```

## Issue Reporting

### Bug Reports

When reporting bugs, please include:

1. **Environment Information**
   - Operating system and version
   - Python version
   - Kubernetes version
   - Browser (for UI issues)

2. **Steps to Reproduce**
   ```markdown
   ## Steps to Reproduce
   1. Navigate to deployment page
   2. Select PostgreSQL template
   3. Fill in parameters: ...
   4. Click Deploy

   ## Expected Behavior
   Deployment should succeed

   ## Actual Behavior
   Error message: "Template processing failed"

   ## Additional Context
   - Logs attached
   - Screenshots included
   ```

3. **Error Information**
   - Complete error messages
   - Relevant log files
   - Stack traces

### Feature Requests

For feature requests, please provide:

1. **Problem Description**
   - What problem does this solve?
   - Who would benefit from this feature?

2. **Proposed Solution**
   - Detailed description of the feature
   - How should it work?
   - Any implementation ideas

3. **Alternatives Considered**
   - Other solutions you've considered
   - Why this approach is preferred

## Community Guidelines

### Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:

- Be respectful and constructive in discussions
- Help others learn and grow
- Focus on what's best for the community
- Show empathy towards other community members

### Getting Help

- **GitHub Discussions**: For questions and general discussion
- **GitHub Issues**: For bug reports and feature requests
- **Documentation**: Check existing documentation first
- **Code Review**: Learn from feedback and help others

### Recognition

We value all contributions:

- Code contributions
- Documentation improvements
- Bug reports and testing
- Community support and mentoring
- Template creation and maintenance

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project documentation
- Community highlights

---

Thank you for contributing to Kind Cluster Setup! Your efforts help make Kubernetes deployment accessible to everyone.
