#!/bin/bash

# Kubernetes Rollout and Rollback Demonstration Script

echo -e "\033[0;36m--- Step 1: Initial Deployment (v1) ---\033[0m"
# Replace IMAGE_TAG with latest for the initial run
sed "s/IMAGE_TAG/latest/g" k8s/backend-deployment.yaml | kubectl apply -f -
kubectl rollout status deployment/patient-portal-backend
echo -e "\033[0;32mv1 deployed successfully.\n\033[0m"

echo -e "\033[0;36m--- Step 2: Rolling Update (v2) ---\033[0m"
echo "Triggering a rolling update by adding a dummy annotation..."
kubectl patch deployment patient-portal-backend -p "{\"spec\":{\"template\":{\"metadata\":{\"annotations\":{\"update-v2\":\"$(date)\"}}}}}"
echo "Monitoring rollout... You will see new pods starting and old ones stopping."
kubectl rollout status deployment/patient-portal-backend
echo -e "\033[0;32mv2 (rolling update) complete. No downtime occurred.\n\033[0m"

echo -e "\033[0;36m--- Step 3: Simulate Failed Release (v3) ---\033[0m"
echo "Updating image to a non-existent tag: 'v-broken'..."
kubectl set image deployment/patient-portal-backend patient-portal-backend=ghcr.io/kalviumcommunity/patient-portal-backend:v-broken

echo "Waiting for Kubernetes to detect the failure..."
sleep 10
kubectl get pods -l app=patient-portal-backend

echo -e "\n\033[0;33mNotice that some pods are in 'ImagePullBackOff' or 'ErrImagePull', but the old pods are still running!\033[0m"
echo "Kubernetes prevents the rollout from completing, ensuring the app stays up."

echo -e "\n\033[0;36m--- Step 4: Rollback to Stable Version ---\033[0m"
echo "Undoing the failed rollout..."
kubectl rollout undo deployment/patient-portal-backend
kubectl rollout status deployment/patient-portal-backend
echo -e "\033[0;32mRollback successful! The application is back to a stable state.\033[0m"

echo -e "\n\033[0;36m--- Deployment History ---\033[0m"
kubectl rollout history deployment/patient-portal-backend
