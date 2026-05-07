# Kubernetes Resource Management: Requests and Limits

This document explains how the Hospital Patient Portal manages CPU and memory consumption within the Kubernetes cluster to ensure stability, fairness, and efficient resource utilization.

## 1. Core Concepts: Requests vs. Limits

In Kubernetes, we define two types of resource constraints for each container:

### Resource Requests
- **Definition**: The minimum amount of CPU or memory that a container is guaranteed to have.
- **Usage**: Kubernetes uses this value to decide which node to place the Pod on (Scheduling). A Pod will only be scheduled on a node that has enough unallocated resources to satisfy the Pod's request.
- **Example**:
  ```yaml
  requests:
    cpu: "100m"
    memory: "128Mi"
  ```

### Resource Limits
- **Definition**: The maximum amount of CPU or memory that a container can consume.
- **Usage**: Kubernetes enforces these boundaries to prevent a single Pod from "starving" other Pods on the same node (Fairness).
- **Example**:
  ```yaml
  limits:
    cpu: "200m"
    memory: "256Mi"
  ```

---

## 2. Resource Enforcement Mechanisms

Kubernetes treats CPU and memory differently because one is "compressible" and the other is not.

| Resource | Type | Behavior when Limit is Reached |
|----------|------|-------------------------------|
| **CPU** | Compressible | **Throttling**: The container is allowed to keep running but its CPU usage is capped (slowed down). |
| **Memory** | Incompressible | **OOMKill**: The container is terminated by the Kernel (Out Of Memory Killer) because it cannot be "slowed down" to save memory. |

### How Kubernetes Enforces Boundaries:
1. **CPU Throttling**: Kubernetes uses CFS (Completely Fair Scheduler) quotas to limit the CPU time a container can use within a specific period.
2. **Memory Limits**: The container's memory usage is tracked by the Linux `cgroups`. If the usage exceeds the limit, the kernel terminates the process with an `OOMKilled` status. Kubernetes then restarts the container (if the restart policy allows).

---

## 3. Configured Resources

We have optimized the resources for our application components:

### Frontend (`k8s/frontend-deployment.yaml`)
- **Requests**: 50m CPU, 64Mi Memory
- **Limits**: 100m CPU, 128Mi Memory

### Backend (`k8s/backend-deployment.yaml`)
- **Requests**: 100m CPU, 128Mi Memory
- **Limits**: 200m CPU, 256Mi Memory

---

## 4. Monitoring and Verification

To see how much resources your Pods are actually using, you can use the following commands:

### Check Current Usage
If your cluster has the Metrics Server installed:
```bash
kubectl top pods
```

### Describe Pod Resources
To see the configured requests and limits for a specific Pod:
```bash
kubectl describe pod <pod-name>
```

### Detecting Resource Issues
- **CPU Throttling**: Can be observed via Prometheus metrics or by checking if the application responds slowly under load.
- **Memory OOMKill**: Can be seen in the Pod's events or status:
  ```bash
  kubectl get pods
  # Look for Status: OOMKilled or check:
  kubectl describe pod <pod-name>
  ```
  In the output, look for `Last State: Terminated` and `Reason: OOMKilled`.

---

## 5. Why use Requests and Limits?

1. **Predictability**: Requests ensure your app always has what it needs to run.
2. **Stability**: Limits prevent a memory leak in one application from crashing the entire node.
3. **Cost Efficiency**: By defining precise requests, Kubernetes can pack Pods more densely onto nodes, reducing cloud costs.
