# Kubernetes Rollout and Rollback Demonstration Script

Write-Host "--- Step 1: Initial Deployment (v1) ---" -ForegroundColor Cyan
# Replace IMAGE_TAG with latest for the initial run
(Get-Content k8s/backend-deployment.yaml) -replace 'IMAGE_TAG', 'latest' | kubectl apply -f -
kubectl rollout status deployment/patient-portal-backend
Write-Host "v1 deployed successfully.`n" -ForegroundColor Green

Write-Host "--- Step 2: Rolling Update (v2) ---" -ForegroundColor Cyan
Write-Host "Triggering a rolling update by adding a dummy environment variable..."
# We use kubectl patch to trigger a change without editing the file
kubectl patch deployment patient-portal-backend -p '{"spec":{"template":{"metadata":{"annotations":{"update-v2":"$(Get-Date)"}}}}}'
Write-Host "Monitoring rollout... You will see new pods starting and old ones stopping."
kubectl rollout status deployment/patient-portal-backend
Write-Host "v2 (rolling update) complete. No downtime occurred.`n" -ForegroundColor Green

Write-Host "--- Step 3: Simulate Failed Release (v3) ---" -ForegroundColor Cyan
Write-Host "Updating image to a non-existent tag: 'v-broken'..."
kubectl set image deployment/patient-portal-backend patient-portal-backend=ghcr.io/kalviumcommunity/patient-portal-backend:v-broken

Write-Host "Waiting for Kubernetes to detect the failure..."
Start-Sleep -Seconds 10
kubectl get pods -l app=patient-portal-backend

Write-Host "`nNotice that some pods are in 'ImagePullBackOff' or 'ErrImagePull', but the old pods are still running!" -ForegroundColor Yellow
Write-Host "Kubernetes prevents the rollout from completing, ensuring the app stays up."

Write-Host "`n--- Step 4: Rollback to Stable Version ---" -ForegroundColor Cyan
Write-Host "Undoing the failed rollout..."
kubectl rollout undo deployment/patient-portal-backend
kubectl rollout status deployment/patient-portal-backend
Write-Host "Rollback successful! The application is back to a stable state." -ForegroundColor Green

Write-Host "`n--- Deployment History ---" -ForegroundColor Cyan
kubectl rollout history deployment/patient-portal-backend
