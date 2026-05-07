#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "Starting local Kubernetes deployment for patient-portal..."

# 1. Verify cluster connectivity
echo "Verifying cluster connectivity..."
kubectl cluster-info > /dev/null 2>&1 || { echo "Error: Kubernetes cluster is not accessible. Is Docker Desktop running?"; exit 1; }

# 2. Set the image tag (defaults to latest if not provided)
IMAGE_TAG=${1:-latest}
echo "Deploying using image tag: $IMAGE_TAG"

# 3. Apply configurations and secrets
echo "Applying ConfigMaps and Secrets..."
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml

# 4. Apply services
echo "Applying Services..."
kubectl apply -f k8s/services.yaml

# 5. Apply network policies
echo "Applying Network Policies..."
kubectl apply -f k8s/network-policy.yaml

# 6. Apply deployments with substituted IMAGE_TAG
echo "Applying Backend Deployment..."
sed "s/IMAGE_TAG/$IMAGE_TAG/g" k8s/backend-deployment.yaml | kubectl apply -f -

echo "Applying Frontend Deployment..."
sed "s/IMAGE_TAG/$IMAGE_TAG/g" k8s/frontend-deployment.yaml | kubectl apply -f -

# 7. Apply Horizontal Pod Autoscaler (HPA) if it exists
if [ -f "k8s/hpa.yaml" ]; then
    echo "Applying Horizontal Pod Autoscaler..."
    kubectl apply -f k8s/hpa.yaml
fi

# 8. Apply Ingress if it exists
if [ -f "k8s/ingress.yaml" ]; then
    echo "Applying Ingress..."
    kubectl apply -f k8s/ingress.yaml
fi

echo "Deployment complete! Waiting for pods to become ready..."

# Give it a moment to process
sleep 5

echo ""
echo "Current Pod Status:"
kubectl get pods

echo ""
echo "Current Service Status:"
kubectl get svc

echo ""
echo "To access the frontend, you may need to use port forwarding:"
echo "kubectl port-forward svc/patient-portal-frontend 3000:80"
echo "Then visit http://localhost:3000 in your browser."
