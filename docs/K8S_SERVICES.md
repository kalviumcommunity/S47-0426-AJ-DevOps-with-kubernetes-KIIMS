# Kubernetes Services and Networking

This document explains how Kubernetes Services enable stable networking and traffic routing for the Patient Portal application, fulfilling the requirements for Sprint #3 regarding Service configuration and behavior.

## 1. What is a Kubernetes Service?

In Kubernetes, Pods are ephemeral. They can be created, destroyed, and moved between nodes, often resulting in changing IP addresses. A **Service** is an abstraction that defines a logical set of Pods and a policy by which to access them. It provides a stable IP address and DNS name that remains constant, even as the underlying Pods come and go.

### Why we need Services:
*   **Service Discovery:** Allows one part of the application (e.g., Frontend) to find and communicate with another (e.g., Backend) without knowing individual Pod IP addresses.
*   **Load Balancing:** Automatically distributes incoming traffic across all healthy Pods that match the Service's selector.
*   **Decoupling:** Frontend only needs to know the Service name `patient-portal-backend`, not how many backend Pods are running or where they are located.

---

## 2. Routing Traffic with Labels and Selectors

The connection between a Service and its Pods is established through **Labels** and **Selectors**.

### Example: `k8s/services.yaml` (Backend)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: patient-portal-backend
spec:
  type: ClusterIP
  selector:
    app: patient-portal-backend  # This MUST match the Pod labels in the Deployment
  ports:
    - name: http
      port: 80           # The port the Service listens on
      targetPort: 8080   # The port the container is listening on
      protocol: TCP
```

### How it works:
1.  **Deployment Labels:** The `backend-deployment.yaml` defines Pods with the label `app: patient-portal-backend`.
2.  **Service Selector:** The Service defines a selector `app: patient-portal-backend`.
3.  **Endpoints:** Kubernetes automatically creates an **Endpoints** object that lists the IP addresses of all Pods matching that label.
4.  **Traffic Flow:** When traffic hits the Service on port 80, it is forwarded to one of the Pods on port 8080.

---

## 3. Service Types in this Project

We use different Service types based on whether the traffic is internal or external to the cluster.

### ClusterIP (Internal Traffic)
*   **Usage:** Used for `patient-portal-backend` and `patient-portal-frontend`.
*   **Behavior:** Provides a stable IP address accessible only from *within* the cluster.
*   **Real Project Context:** The Frontend communicates with the Backend via the internal DNS name `http://patient-portal-backend`. This keeps the backend isolated from the public internet.

### Ingress (External Traffic)
*   **Usage:** Configured in `k8s/ingress.yaml`.
*   **Behavior:** While not a Service itself, an Ingress sits in front of Services to provide HTTP/HTTPS routing, SSL termination, and host-based routing.
*   **Real Project Context:** Users access the application via `https://patient-portal.local`. The Ingress controller receives this traffic and routes it to the `patient-portal-frontend` Service.

---

## 4. Practical Verification

### Applying the Services
To apply the service configurations to your cluster, run:
```bash
kubectl apply -f k8s/services.yaml
```

### Verifying Service Status
List all services in the current namespace:
```bash
kubectl get svc
```

### Checking Endpoints
To see which Pods are currently being targeted by a Service:
```bash
kubectl get endpoints patient-portal-backend
```

### Testing Internal Connectivity
You can test if the Frontend can reach the Backend by exec-ing into a frontend Pod:
```bash
kubectl exec -it <frontend-pod-name> -- curl http://patient-portal-backend/api/health
```

This ensures that our networking is reliable, stable, and follows Kubernetes best practices for microservices communication.
