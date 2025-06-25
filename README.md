# Kind Cluster Setup

<div align="center">

![Kind Cluster Setup Logo](https://via.placeholder.com/200x100/2196F3/FFFFFF?text=Kind+Cluster+Setup)

**A comprehensive tool for managing Kind (Kubernetes in Docker) clusters with a modern web interface**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.7+](https://img.shields.io/badge/python-3.7+-blue.svg)](https://www.python.org/downloads/)
[![Next.js](https://img.shields.io/badge/Next.js-15.3-black.svg)](https://nextjs.org/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Compatible-326CE5.svg)](https://kubernetes.io/)

</div>

## 🚀 Overview

Kind Cluster Setup is a powerful, user-friendly platform for creating, managing, and deploying applications to Kubernetes clusters using Kind (Kubernetes in Docker). It features a modern React-based web interface, comprehensive template system, and robust backend API for seamless cluster and application management.

### ✨ Key Features

- **🎛️ Web-Based Management**: Modern React/Next.js interface for intuitive cluster and application management
- **🔧 Cluster Lifecycle Management**: Create, configure, and manage multiple Kind clusters with custom resource limits
- **📦 Application Templates**: Extensible template system for deploying popular applications (Airflow, MySQL, etc.)
- **🚀 One-Click Deployments**: Deploy complex applications with pre-configured templates
- **📊 Real-Time Monitoring**: Live status updates, resource monitoring, and application health checks
- **🔄 Port Forwarding**: Built-in port forwarding for easy access to deployed applications
- **🌍 Multi-Environment Support**: Support for dev, test, staging, and production environments
- **🔌 Flexible Deployment**: Support for both Helm charts and raw Kubernetes manifests
- **🛡️ Resource Management**: CPU and memory limits, automatic cleanup, and resource optimization

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Kubernetes    │
│   (Next.js)     │◄──►│   (FastAPI)     │◄──►│   (Kind)        │
│                 │    │                 │    │                 │
│ • Cluster UI    │    │ • Cluster Mgmt  │    │ • Kind Clusters │
│ • App Mgmt      │    │ • App Deploy    │    │ • Applications  │
│ • Monitoring    │    │ • Templates     │    │ • Resources     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Prerequisites

- **Python 3.7+** - Backend API server
- **Node.js 18+** - Frontend development and build
- **Docker** - Required for Kind clusters
- **Kind** - Kubernetes in Docker
- **kubectl** - Kubernetes command-line tool
- **Helm** (optional) - For Helm-based deployments

## ⚡ Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/asb108/kind-cluster-setup.git
cd kind-cluster-setup
```

### 2. Backend Setup
```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -e .

# Copy environment configuration
cp .env.example .env

# Start the backend server
python -m kind_cluster_setup.api.server
```

### 3. Frontend Setup
```bash
# Navigate to frontend directory
cd kind-setup-frontend

# Install dependencies
npm install

# Copy environment configuration
cp .env.local.example .env.local

# Start the development server
npm run dev
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8020
- **API Documentation**: http://localhost:8020/docs

## 📖 Usage Guide

### Creating Your First Cluster

1. **Open the Web Interface**: Navigate to http://localhost:3000
2. **Create Cluster**: Click "Create Cluster" and configure your cluster settings
3. **Deploy Applications**: Use the "Deploy App" section to deploy from templates
4. **Manage Applications**: Monitor and manage your deployments in "Manage Apps"

### Using Templates

The template system allows you to deploy applications with pre-configured settings:

```bash
# List available templates
curl http://localhost:8020/api/templates

# Deploy Airflow with default settings
curl -X POST http://localhost:8020/api/apps/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "cluster_name": "my-cluster",
    "app_name": "airflow",
    "namespace": "default",
    "values": {
      "replicas": 1,
      "version": "3.0.0"
    }
  }'
```

### Command Line Interface

```bash
# Create a cluster
kind-cluster-setup create-cluster my-cluster --workers 2

# Deploy an application
kind-cluster-setup deploy-app airflow --cluster my-cluster

# List clusters
kind-cluster-setup list-clusters

# Delete a cluster
kind-cluster-setup delete-cluster my-cluster
```

## 🧪 Testing

### Backend Tests
```bash
# Run all tests
python -m pytest tests/

# Run specific test file
python -m pytest tests/test_cluster.py

# Run with coverage
python -m pytest tests/ --cov=src/kind_cluster_setup
```

### Frontend Tests
```bash
cd kind-setup-frontend

# Run Jest tests
npm run test

# Run tests in watch mode
npm run test:watch
```

## 📚 Documentation

- **[Architecture Guide](./ARCHITECTURE.md)** - Detailed system architecture and design decisions
- **[Template Development Guide](./TEMPLATE_DEVELOPMENT_GUIDE.md)** - How to create custom application templates
- **[Contributing Guidelines](./CONTRIBUTING.md)** - How to contribute to the project
- **[API Documentation](http://localhost:8020/docs)** - Interactive API documentation (when server is running)
- **[Deployment Guide](./docs/deployment.md)** - Production deployment instructions

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
- `HOST` - Server host (default: 0.0.0.0)
- `PORT` - Server port (default: 8020)
- `USE_MOCK_DATA` - Use mock data for development (default: false)
- `TASK_STORE_TYPE` - Task storage type: file|memory (default: file)

#### Frontend (.env.local)
- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:8020)
- `NEXT_PUBLIC_STATUS_POLL_INTERVAL` - Status polling interval in ms (default: 5000)

### Template Configuration

Templates are located in `templates/apps/` and follow a standardized structure:
```
templates/apps/
├── airflow/
│   ├── template.yaml      # Template metadata
│   ├── deployment.yaml    # Kubernetes manifests
│   └── values.yaml        # Default values
└── mysql/
    ├── template.yaml
    └── helm-values.yaml   # Helm chart values
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](./CONTRIBUTING.md) for details.

### Development Setup

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and add tests
4. **Run tests**: `npm test` and `python -m pytest`
5. **Commit your changes**: `git commit -m 'Add amazing feature'`
6. **Push to the branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Template Contributions

To contribute a new application template:
1. Follow the [Template Development Guide](./TEMPLATE_DEVELOPMENT_GUIDE.md)
2. Add your template to `templates/apps/`
3. Include tests and documentation
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Kind](https://kind.sigs.k8s.io/) - Kubernetes in Docker
- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [Next.js](https://nextjs.org/) - React framework for production
- [Radix UI](https://www.radix-ui.com/) - Low-level UI primitives

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/asb108/kind-cluster-setup/issues)
- **Discussions**: [GitHub Discussions](https://github.com/asb108/kind-cluster-setup/discussions)
- **Documentation**: [Project Wiki](https://github.com/asb108/kind-cluster-setup/wiki)

---

<div align="center">
Made with ❤️ by the Kind Cluster Setup community
</div>

The unit tests use mocking to avoid creating actual clusters.

### Integration Test

A test script is provided to demonstrate the KindCluster functionality in a real-world scenario:

```sh
# Basic usage (1 worker node, with resource limits, using context manager)
python test_kind_cluster.py

# Custom configuration
python test_kind_cluster.py --workers 2 --no-limits --no-context-manager
```

Options:
- `--workers N`: Set the number of worker nodes (default: 1)
- `--no-limits`: Disable resource limits
- `--no-context-manager`: Don't use the context manager pattern (manual cleanup)

## Usage

### Creating a Kind cluster