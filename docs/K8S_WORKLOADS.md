# Kubernetes Workloads and Desired-State Management

This document outlines the core concepts of Kubernetes workload management, specifically focusing on how YAML manifests declare desired state and how Kubernetes works to maintain that state through Pods and ReplicaSets. This fulfills the requirements for Sprint #3 regarding workload object management.

## Declarative Configuration (YAML) vs. Imperative Commands

Kubernetes configuration is predominantly managed declaratively using YAML manifests rather than imperatively through CLI commands.

*   **Imperative Approach:** Giving specific instructions on *how* to achieve a result (e.g., "Run this container, then start two more").
*   **Declarative Approach (YAML):** Declaring the *desired end state* (e.g., "I want 3 replicas of the nginx container running"). 

YAML files in Kubernetes define the "what," and the Kubernetes control plane figures out the "how." This makes infrastructure version-controllable (Infrastructure as Code), reproducible, and easier to audit.

### The Anatomy of a Kubernetes YAML Manifest

Every Kubernetes object defined in YAML requires four fundamental fields:

1.  **`apiVersion`**: Which version of the Kubernetes API to use (e.g., `v1`, `apps/v1`).
2.  **`kind`**: The type of object being created (e.g., `Pod`, `ReplicaSet`, `Deployment`).
3.  **`metadata`**: Data that uniquely identifies the object (e.g., `name`, `namespace`, `labels`).
4.  **`spec`**: The desired state of the object, unique to the type of object being created (e.g., container images, ports, replicas).

---

## 1. Creating Pods Correctly

The **Pod** is the smallest and simplest unit in the Kubernetes object model that you create or deploy. It represents a single instance of a running process in your cluster and can contain one or more tightly coupled containers.

### Example: `k8s/pod.yaml`
We have created a standalone Pod manifest (`k8s/pod.yaml`) to demonstrate this concept:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: patient-portal-demo-pod
  labels:
    app: patient-portal-demo
    type: standalone
spec:
  containers:
    - name: nginx-container
      image: nginx:alpine
      ports:
        - containerPort: 80
```

**Why we rarely create standalone Pods:**
While creating a standalone Pod is simple, it is not recommended for production. If the node a standalone Pod is running on fails, the Pod is lost forever. Kubernetes does not automatically reschedule it. To get self-healing behavior, we use higher-level workload controllers like ReplicaSets and Deployments.

---

## 2. Using ReplicaSets to Manage Multiple Replicas

A **ReplicaSet**'s purpose is to maintain a stable set of replica Pods running at any given time. It guarantees the availability of a specified number of identical Pods.

### Example: `k8s/replicaset.yaml`
We have created a ReplicaSet manifest (`k8s/replicaset.yaml`) to demonstrate managing multiple instances:

```yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: patient-portal-demo-rs
  labels:
    app: patient-portal-demo
    tier: frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: patient-portal-demo
      tier: frontend
  template:
    metadata:
      labels:
        app: patient-portal-demo
        tier: frontend
    spec:
      containers:
        - name: nginx-container
          image: nginx:alpine
          ports:
            - containerPort: 80
```

### Key Components of a ReplicaSet:
*   **`replicas: 3`**: This tells the control plane exactly how many Pod instances should be running simultaneously.
*   **`selector`**: How the ReplicaSet identifies which Pods it owns. It constantly looks for Pods matching `app: patient-portal-demo` and `tier: frontend`.
*   **`template`**: The blueprint used to create new Pods if the current count falls below the desired `replicas` count.

---

## 3. Desired-State Management in Action

Kubernetes is essentially a continuous reconciliation loop. It constantly compares the **Desired State** (what you declared in your YAML file) with the **Actual State** (what is currently running in the cluster).

### The Reconciliation Loop

1.  **Observe:** The control plane (specifically, the Controller Manager) observes the current state of the cluster.
2.  **Diff:** It compares the actual state to the desired state specified in `etcd`.
3.  **Act:** If there's a discrepancy, it takes action to make the actual state match the desired state.

### Scenario: A Pod Dies

Imagine we have applied our `replicaset.yaml` and we currently have 3 Pods running. 

1.  A hardware failure causes Node A to crash. One of our Pods was running on Node A.
2.  **Actual State:** 2 Pods running.
3.  **Desired State:** 3 Pods running (per the ReplicaSet manifest).
4.  The ReplicaSet controller notices the mismatch.
5.  It uses the `template` defined in the YAML to schedule a new Pod on a healthy node.
6.  **New Actual State:** 3 Pods running. The system has self-healed.

### Scenario: Scaling Up

1.  You update `k8s/replicaset.yaml` to set `replicas: 5` and run `kubectl apply -f k8s/replicaset.yaml`.
2.  **Desired State:** 5 Pods.
3.  **Actual State:** 3 Pods.
4.  The controller notices it is short by 2 Pods.
5.  It spins up 2 additional Pods based on the `template`.
6.  **New Actual State:** 5 Pods.

This demonstrates the power of declarative, desired-state management. You never tell Kubernetes to "start two new pods." You simply state that you want a total of five, and Kubernetes handles the complex logic of achieving and maintaining that state.
