#!/bin/bash

# Apache Airflow with KubernetesExecutor Deployment Script
# This script deploys Airflow with KubernetesExecutor to avoid dependency conflicts

set -e

# Configuration
NAMESPACE=${KUBERNETES_NAMESPACE:-airflow}
VERSION=${VERSION:-2.8.1}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-airflow}

echo "🚀 Deploying Apache Airflow with KubernetesExecutor..."
echo "📋 Configuration:"
echo "   Namespace: $NAMESPACE"
echo "   Version: $VERSION"
echo "   PostgreSQL Password: $POSTGRES_PASSWORD"

# Create namespace if it doesn't exist
echo "📁 Creating namespace..."
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Apply RBAC configuration
echo "🔐 Setting up RBAC permissions..."
kubectl apply -f rbac.yaml -n $NAMESPACE

# Apply DAGs ConfigMap
echo "📄 Creating DAGs ConfigMap..."
kubectl apply -f dags-configmap.yaml -n $NAMESPACE

# Apply PostgreSQL and Redis
echo "🗄️ Deploying PostgreSQL and Redis..."
kubectl apply -f deployment.yaml -n $NAMESPACE

# Apply services
echo "🌐 Creating services..."
kubectl apply -f service.yaml -n $NAMESPACE

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
kubectl wait --for=condition=ready pod -l component=postgres -n $NAMESPACE --timeout=300s

# Wait for webserver to be ready
echo "⏳ Waiting for Airflow webserver to be ready..."
kubectl wait --for=condition=ready pod -l component=webserver -n $NAMESPACE --timeout=300s

echo "✅ Airflow deployment completed!"
echo ""
echo "🌐 Access Instructions:"
echo "   1. Port forward: kubectl port-forward -n $NAMESPACE svc/airflow-webserver 8080:8080"
echo "   2. Open browser: http://localhost:8080"
echo "   3. Login: admin/admin"
echo ""
echo "📊 Check status:"
echo "   kubectl get pods -n $NAMESPACE"
echo "   kubectl get svc -n $NAMESPACE"
echo ""
echo "🔍 View logs:"
echo "   kubectl logs -n $NAMESPACE -l component=webserver"
echo "   kubectl logs -n $NAMESPACE -l component=scheduler"
echo ""
echo "🎯 Example DAG:"
echo "   The 'kubernetes_pod_example' DAG demonstrates KubernetesPodOperator usage"
echo "   It includes Python, Spark, and data processing tasks in separate containers"
