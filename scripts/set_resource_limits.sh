#!/bin/bash

# set_resource_limits.sh - Direct Docker container resource limit setter
# This script directly applies resource limits to Kind cluster containers
# Usage: ./set_resource_limits.sh <cluster-name> <worker-cpu> <worker-memory-gb> <cp-cpu> <cp-memory-gb>

set -e  # Exit immediately if a command exits with non-zero status

# Display usage information if not enough args
if [ "$#" -lt 5 ]; then
    echo "Usage: $0 <cluster-name> <worker-cpu> <worker-memory-gb> <cp-cpu> <cp-memory-gb>"
    echo ""
    echo "Example: $0 my-cluster 2 4 2 4"
    echo "  This sets 2 CPUs, 4GB memory for workers and 2 CPUs, 4GB memory for control-plane"
    exit 1
fi

# Parse arguments
CLUSTER_NAME=$1
WORKER_CPU=$2
WORKER_MEM_GB=$3
CP_CPU=$4
CP_MEM_GB=$5

echo "==== KIND CLUSTER RESOURCE LIMITS SETTER ===="
echo "Setting resource limits for cluster: $CLUSTER_NAME"
echo "Worker: CPU=$WORKER_CPU cores, Memory=${WORKER_MEM_GB}GB"
echo "Control-plane: CPU=$CP_CPU cores, Memory=${CP_MEM_GB}GB"
echo ""

# Convert memory to bytes (required by Docker)
WORKER_MEM_BYTES=$(($WORKER_MEM_GB * 1024 * 1024 * 1024))
CP_MEM_BYTES=$(($CP_MEM_GB * 1024 * 1024 * 1024))

# Memory swap must be set when setting memory limits (set to 2x memory)
# Set a minimum of 2GB for any container to ensure Kind operates properly
WORKER_MEM_BYTES_MIN=$((2 * 1024 * 1024 * 1024))
CP_MEM_BYTES_MIN=$((2 * 1024 * 1024 * 1024))

# Use the larger of the requested or minimum values
if [ $WORKER_MEM_BYTES -lt $WORKER_MEM_BYTES_MIN ]; then
    echo "Warning: Increasing worker memory to minimum 2GB for proper operation"
    WORKER_MEM_BYTES=$WORKER_MEM_BYTES_MIN
fi

if [ $CP_MEM_BYTES -lt $CP_MEM_BYTES_MIN ]; then
    echo "Warning: Increasing control plane memory to minimum 2GB for proper operation"
    CP_MEM_BYTES=$CP_MEM_BYTES_MIN
fi

# Set memory swap to 2x memory
WORKER_MEM_SWAP=$(($WORKER_MEM_BYTES * 2))
CP_MEM_SWAP=$(($CP_MEM_BYTES * 2))

# Wait for containers to be ready
echo "Waiting for containers to be ready..."
sleep 10

# Update control-plane container
CP_CONTAINER="${CLUSTER_NAME}-control-plane"
echo "Updating control-plane container: $CP_CONTAINER"
echo "  Memory: $CP_MEM_BYTES bytes (swap: $CP_MEM_SWAP bytes)"
echo "  CPUs: $CP_CPU"

docker update \
  --memory $CP_MEM_BYTES \
  --memory-swap $CP_MEM_SWAP \
  --cpus $CP_CPU \
  $CP_CONTAINER

echo "Control-plane resource limits applied."
echo ""

# Get all worker nodes
echo "Looking for worker containers..."
WORKER_CONTAINERS=$(docker ps --format '{{.Names}}' | grep "${CLUSTER_NAME}-worker")

if [ -z "$WORKER_CONTAINERS" ]; then
    echo "No worker containers found for cluster: $CLUSTER_NAME"
else
    echo "Found worker containers:"
    echo "$WORKER_CONTAINERS"
    echo ""
    
    # Update each worker node
    echo "$WORKER_CONTAINERS" | while read -r worker; do
        echo "Updating worker container: $worker"
        echo "  Memory: $WORKER_MEM_BYTES bytes (swap: $WORKER_MEM_SWAP bytes)"
        echo "  CPUs: $WORKER_CPU"
        
        docker update \
          --memory $WORKER_MEM_BYTES \
          --memory-swap $WORKER_MEM_SWAP \
          --cpus $WORKER_CPU \
          $worker
          
        echo "Worker resource limits applied to $worker."
        echo ""
    done
fi

# Verify the limits were actually set
echo "Verifying limits..."
echo ""

echo "Control-plane container limits:"
docker inspect $CP_CONTAINER | jq '.[0].HostConfig | {Memory, MemorySwap, NanoCpus, CpuShares}'
echo ""

if [ -n "$WORKER_CONTAINERS" ]; then
    echo "First worker container limits:"
    FIRST_WORKER=$(echo "$WORKER_CONTAINERS" | head -n 1)
    docker inspect $FIRST_WORKER | jq '.[0].HostConfig | {Memory, MemorySwap, NanoCpus, CpuShares}'
fi

echo ""
echo "Resource limits application completed."
