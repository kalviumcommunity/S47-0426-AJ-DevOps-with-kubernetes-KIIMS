# Kubernetes Architecture and Cloud-Native Awareness

This document outlines the architectural decisions, cluster component interactions, and cloud-native practices adopted in the Kubernetes integration for the Patient Portal (KIIMS) project.

## 1. Kubernetes Cluster Architecture Applied to KIIMS

Our application relies on the Kubernetes master-worker architecture to ensure high availability, scaling, and self-healing. 

### Control Plane Responsibilities
The Control Plane acts as the "brain" of the cluster. For the Patient Portal:
- **API Server (`kube-apiserver`)**: Acts as the front end. When we apply our `k8s/` manifests (e.g., `frontend-deployment.yaml`), the API server validates these requests and updates the desired state in `etcd`.
- **etcd**: The highly-available key-value store that holds the cluster state, including our `patient-portal-secrets` and `patient-portal-config`.
- **Scheduler (`kube-scheduler`)**: Watches for newly created Pods (like when our HPA scales the backend from 2 to 10 replicas) that have no Node assigned, and selects a Worker Node for them to run on based on the resource requests defined in our deployments (e.g., `cpu: "50m"` for frontend, `cpu: "100m"` for backend).
- **Controller Manager (`kube-controller-manager`)**: Runs controller processes. Our `Deployment` manifests for frontend and backend rely on the ReplicaSet controller to ensure that exactly 2 replicas are always running. If a pod crashes, the controller manager detects the drift from the desired state and creates a new one.

### Worker Node Responsibilities
Worker Nodes execute the actual containerized applications.
- **Kubelet**: The agent running on each node. It receives Pod definitions from the control plane and interacts with the container runtime (e.g., containerd or Docker) to pull the `ghcr.io/kalviumcommunity/patient-portal-*` images and run the containers. It also executes our defined Liveness and Readiness probes to report the health of our frontend and backend containers back to the control plane.
- **Kube-Proxy**: Maintains network rules on the nodes. It implements the Kubernetes `Service` concept. When traffic hits our `patient-portal-frontend` or `patient-portal-backend` ClusterIP services, `kube-proxy` ensures the traffic is load-balanced across the healthy, ready backend Pods.
- **Container Runtime**: Responsible for pulling the images and running the containers on the node.

### Component Interactions & Traffic Flow
When a user accesses `patient-portal.local`, the interaction flows as follows:
1. The external request hits the **Ingress Controller** (Nginx, as defined in `k8s/ingress.yaml`).
2. The Ingress Controller evaluates the rules and routes `/` to the `patient-portal-frontend` Service and `/api` to the `patient-portal-backend` Service.
3. The **Service** (implemented via `kube-proxy` rules) forwards the request to one of the healthy Pods in the Deployment.
4. The **Pod** (running on a Worker Node, managed by `kubelet`) processes the request.
5. If the backend pod experiences high CPU load (above 70%), the **HorizontalPodAutoscaler (HPA)** detects this via the metrics server. The HPA instructs the **API Server** to update the Deployment's scale. The **Controller Manager** creates new Pods, the **Scheduler** places them on available Worker Nodes, and **Kubelet** spins them up.

---

## 2. Cloud-Native Practices

### Decoupling Configuration with ConfigMaps
In cloud-native environments, application configuration should be separated from container images. To support this:
- Added `k8s/configmap.yaml` which defines the `patient-portal-config` ConfigMap.
- The `NODE_ENV`, `BACKEND_URL`, and `LOG_LEVEL` variables are stored here.
- Modified both `k8s/frontend-deployment.yaml` and `k8s/backend-deployment.yaml` to use `envFrom` pointing to this ConfigMap.
- **Why?** This ensures that the exact same container image can be promoted across environments (Dev, Staging, Prod) by only varying the ConfigMap, avoiding hardcoded configuration variables inside deployment manifests.

### Zero-Trust Security with Network Policies
A core principle of cloud-native systems is default-deny networking. To improve our security posture:
- Added `k8s/network-policy.yaml`.
- This policy restricts inbound traffic (ingress) to the backend service. It only permits traffic originating from pods with the `app: patient-portal-frontend` label.
- **Why?** It prevents unauthorized microservices or compromised pods from querying the backend directly. By explicitly stating who can communicate with whom, we significantly reduce the attack surface.

### Resilience Through Probes and Resources
Existing resources ensure that the applications are robust:
- Both deployments use **Liveness and Readiness probes**. Readiness probes ensure that traffic is not routed to a pod until it is fully initialized and capable of serving requests. Liveness probes automatically restart pods if they get into a deadlocked or unresponsive state.
- **Resource Limits and Requests** are configured for both frontend and backend. 
- **Why?** Defining requests guarantees that pods are scheduled onto nodes with sufficient capacity. Limits ensure that a single misbehaving pod cannot exhaust the underlying node's CPU or Memory (Noisy Neighbor problem).

### Summary
By integrating ConfigMaps for configuration management, NetworkPolicies for microservice isolation, and defining a robust architecture leveraging Kubernetes control plane and worker node capabilities, the application is moving closer to a mature, 12-factor cloud-native architecture that handles scaling securely and flexibly.
