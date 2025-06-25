#!/bin/bash

# This script provides a reliable way to clean up and create a Kind cluster
# with resource limits applied afterward to avoid kubelet startup issues

set -e

# Get parameters
CLUSTER_NAME="$1"
WORKER_NODES="$2"
WORKER_CPU="$3"
WORKER_MEM="$4"
CP_CPU="$5"
CP_MEM="$6"
APPLY_LIMITS="${7:-true}"
HTTP_PORT="${8:-80}"
HTTPS_PORT="${9:-443}"
NODEPORT="${10:-30080}"

if [ -z "$CLUSTER_NAME" ]; then
  echo "Error: Cluster name is required"
  exit 1
fi

# Set defaults if not provided
WORKER_NODES=${WORKER_NODES:-1}
WORKER_CPU=${WORKER_CPU:-2}
WORKER_MEM=${WORKER_MEM:-4}
CP_CPU=${CP_CPU:-2}
CP_MEM=${CP_MEM:-4}

echo "===== CLEAN AND CREATE KIND CLUSTER ====="
echo "Cluster Name: $CLUSTER_NAME"
echo "Worker Nodes: $WORKER_NODES"
echo "Worker CPU: $WORKER_CPU cores, Memory: ${WORKER_MEM}GB"
echo "Control Plane CPU: $CP_CPU cores, Memory: ${CP_MEM}GB"
echo "Apply Resource Limits: $APPLY_LIMITS"

# Step 1: Delete any existing cluster with this name
echo "Checking for existing cluster..."
if kind get clusters | grep -q "^$CLUSTER_NAME$"; then
  echo "Deleting existing cluster: $CLUSTER_NAME"
  kind delete cluster --name "$CLUSTER_NAME"
fi

# Step 2: Clean up any existing config file
CONFIG_PATH="kind_config_${CLUSTER_NAME}.yaml"
if [ -f "$CONFIG_PATH" ]; then
  echo "Removing existing config file: $CONFIG_PATH"
  rm "$CONFIG_PATH"
fi

# Step 3: Create a minimal Kind config file WITHOUT resource limits
# This avoids kubelet startup issues
cat > "$CONFIG_PATH" << EOF
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "ingress-ready=true"
  extraPortMappings:
  - containerPort: 80
    hostPort: $HTTP_PORT
    protocol: TCP
  - containerPort: 443
    hostPort: $HTTPS_PORT
    protocol: TCP
  - containerPort: 30080
    hostPort: $NODEPORT
    protocol: TCP
EOF

# Add worker nodes if specified
if [ "$WORKER_NODES" -gt 0 ]; then
  for i in $(seq 1 $WORKER_NODES); do
    cat >> "$CONFIG_PATH" << EOF
- role: worker
  kubeadmConfigPatches:
  - |
    kind: JoinConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "kind.x-k8s.io/worker=true"
EOF
  done
fi

# Step 4: Create the cluster with minimal config
echo "Creating Kind cluster with minimal configuration (no resource limits)..."
kind create cluster --name "$CLUSTER_NAME" --config "$CONFIG_PATH"

# Step 5: Apply resource limits if requested
if [ "$APPLY_LIMITS" = "true" ]; then
  echo "Cluster created successfully. Now applying resource limits..."

  # Use the set_resource_limits.sh script to apply limits
  SCRIPT_PATH="$(dirname "$0")/set_resource_limits.sh"
  if [ ! -f "$SCRIPT_PATH" ]; then
    echo "Error: Resource limits script not found at: $SCRIPT_PATH"
    exit 1
  fi

  echo "Waiting 10 seconds for containers to stabilize..."
  sleep 10

  echo "Applying resource limits..."
  bash "$SCRIPT_PATH" "$CLUSTER_NAME" "$WORKER_CPU" "$WORKER_MEM" "$CP_CPU" "$CP_MEM"

  echo "Cluster setup and resource limits application complete."
else
  echo "Resource limits application skipped as requested."
  echo "Cluster setup complete."
fi
