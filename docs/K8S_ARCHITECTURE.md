# Kubernetes Architecture and Cloud-Native Awareness

This document outlines the architectural decisions and cloud-native practices adopted in the Kubernetes integration for the Patient Portal project.

## 1. Decoupling Configuration with ConfigMaps
In cloud-native environments, application configuration should be separated from container images. To support this:
- Added `k8s/configmap.yaml` which defines the `patient-portal-config` ConfigMap.
- The `NODE_ENV`, `BACKEND_URL`, and `LOG_LEVEL` variables are stored here.
- Modified both `k8s/frontend-deployment.yaml` and `k8s/backend-deployment.yaml` to use `envFrom` pointing to this ConfigMap.
- **Why?** This ensures that the exact same container image can be promoted across environments (Dev, Staging, Prod) by only varying the ConfigMap, avoiding hardcoded configuration variables inside deployment manifests.

## 2. Zero-Trust Security with Network Policies
A core principle of cloud-native systems is default-deny networking. To improve our security posture:
- Added `k8s/network-policy.yaml`.
- This policy restricts inbound traffic (ingress) to the backend service. It only permits traffic originating from pods with the `app: patient-portal-frontend` label.
- **Why?** It prevents unauthorized microservices or compromised pods from querying the backend directly. By explicitly stating who can communicate with whom, we significantly reduce the attack surface.

## 3. Resilience Through Probes and Resources
Existing resources ensure that the applications are robust:
- Both deployments use **Liveness and Readiness probes**. Readiness probes ensure that traffic is not routed to a pod until it is fully initialized and capable of serving requests. Liveness probes automatically restart pods if they get into a deadlocked or unresponsive state.
- **Resource Limits and Requests** are configured for both frontend and backend. 
- **Why?** Defining requests guarantees that pods are scheduled onto nodes with sufficient capacity. Limits ensure that a single misbehaving pod cannot exhaust the underlying node's CPU or Memory (Noisy Neighbor problem).

## Summary
By integrating ConfigMaps for configuration management and NetworkPolicies for microservice isolation, the application is moving closer to a mature, 12-factor cloud-native architecture that handles scaling securely and flexibly.
