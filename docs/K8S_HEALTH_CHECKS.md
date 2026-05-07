# Kubernetes Health Checks and Self-Healing

This document explains how the Hospital Patient Portal ensures high availability and reliability using Kubernetes health checks (Probes).

## 1. Types of Probes

We have implemented three types of probes in our deployment manifests:

### Startup Probe (`startupProbe`)
- **Purpose**: Checks if the application has successfully started.
- **Behavior**: Kubernetes disables liveness and readiness checks until the startup probe succeeds. This is useful for applications that take a long time to initialize (e.g., connecting to a database or loading cache).
- **Configuration**:
  ```yaml
  startupProbe:
    httpGet:
      path: /health/live
      port: 8080
    initialDelaySeconds: 5
    periodSeconds: 5
    failureThreshold: 30 # Gives the app up to 150 seconds to start
  ```

### Liveness Probe (`livenessProbe`)
- **Purpose**: Checks if the application is still running correctly.
- **Behavior**: If this probe fails, Kubernetes **restarts** the container. It helps recover from deadlocks or internal crashes.
- **Configuration**:
  ```yaml
  livenessProbe:
    httpGet:
      path: /health/live
      port: 8080
    periodSeconds: 10
    failureThreshold: 3
  ```

### Readiness Probe (`readinessProbe`)
- **Purpose**: Checks if the application is ready to handle traffic.
- **Behavior**: If this probe fails, Kubernetes **removes the Pod from the Service's endpoints**. No new traffic will be sent to this Pod until it becomes ready again.
- **Configuration**:
  ```yaml
  readinessProbe:
    httpGet:
      path: /health/ready
      port: 8080
    periodSeconds: 5
    failureThreshold: 3
  ```

---

## 2. Restart Behavior vs. Traffic Routing Behavior

It is critical to understand how Kubernetes treats these two probes differently:

| Feature | Liveness Probe | Readiness Probe |
|---------|----------------|-----------------|
| **Primary Action** | Restarts the container | Removes Pod from Service Load Balancer |
| **Use Case** | Detects if the app is "stuck" or "crashed" | Detects if the app is "overloaded" or "disconnected" |
| **Result of Failure** | `Container restarts` (Self-healing) | `Traffic stops` (Reliability/Availability) |
| **Typical Endpoint** | Shallow check (e.g., `/health/live`) | Deep check (e.g., `/health/ready` - includes DB) |

---

## 3. Demonstrating Self-Healing

To see Kubernetes in action, you can simulate failures in your local cluster.

### Scenario A: Simulating Liveness Failure (Restart)
1. **Apply the manifest**: `kubectl apply -f k8s/backend-deployment.yaml`
2. **Watch the pods**: `kubectl get pods -w`
3. **Simulate a crash**: Exec into a backend pod and kill the main process (or use a dedicated "kill" endpoint if available).
   ```bash
   kubectl exec <pod-name> -- kill 1
   ```
4. **Observe**: You will see the pod's `RESTARTS` count increment.

### Scenario B: Simulating Readiness Failure (Traffic Routing)
1. **Check Endpoints**: `kubectl get endpoints patient-portal-backend`
2. **Simulate DB Disconnection**: (If you have a way to toggle the DB health)
   Alternatively, you can manually change the readiness path to a non-existent route in the manifest and apply it.
3. **Observe**: Run `kubectl describe service patient-portal-backend`. You will see that the pod is no longer listed in the endpoints, even though the pod itself is still `Running`.

---

## 4. Verification

You can verify the health check configuration by describing the pod:

```bash
kubectl describe pod <backend-pod-name>
```

Look for the `Liveness`, `Readiness`, and `Startup` sections in the output to confirm they are correctly configured.
