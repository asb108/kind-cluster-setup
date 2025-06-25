#!/bin/bash
set -e

# Create the kind cluster if it doesn't exist
if ! kind get clusters | grep -q "kind-setup"; then
  echo "Creating kind cluster..."
  kind create cluster --name kind-setup --config=./scripts/kind-config.yaml
fi

# Build the Docker image
echo "Building Docker image..."
docker build -t kind-setup-frontend:latest -f Dockerfile.prod .

# Load the image into the kind cluster
echo "Loading image into kind cluster..."
kind load docker-image kind-setup-frontend:latest --name kind-setup

# Apply the Kubernetes manifests
echo "Applying Kubernetes manifests..."
kubectl apply -k ./k8s/overlays/dev

# Wait for the deployment to be ready
echo "Waiting for deployment to be ready..."
kubectl rollout status deployment/dev-kind-setup-frontend

# Port-forward the service
echo "Port-forwarding the service..."
kubectl port-forward svc/dev-kind-setup-frontend 3000:80 &

echo "Application is running at http://localhost:3000"
