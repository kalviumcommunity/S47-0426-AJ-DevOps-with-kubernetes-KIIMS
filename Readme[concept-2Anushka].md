## DevOps with Kubernetes & CI/CD

---

## Kubernetes Application Lifecycle — Understanding How Workloads Are Managed

When you deploy an application to Kubernetes, it does not simply "start running." It moves through a well-defined lifecycle, managed by several cooperating components that continuously work to keep the system in the state you declared.

---

## The Big Picture

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│   [YOU]              [CONTROL PLANE]          [NODE]            │
│                                                                  │
│  Apply Manifest ──►  Deployment Created                         │
│                             ↓                                   │
│                      ReplicaSet Created                         │
│                             ↓                                   │
│                       Pods Created                              │
│                             ↓                                   │
│                      Scheduler Assigns  ──►  Pod on Node        │
│                                                   ↓             │
│                                           kubelet Starts        │
│                                           Container             │
│                                                   ↓             │
│                                           Health Checks Pass    │
│                                                   ↓             │
│                                           App Available         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Key principle:** You declare the desired state. Kubernetes continuously works to achieve and maintain it.

---

## Stage 1 — Pod Creation & Scheduling

A **Pod** is the smallest deployable unit in Kubernetes. It wraps one or more containers and gives them a shared network and storage context.

**What happens when you apply a Deployment:**

```
kubectl apply -f deployment.yaml
         ↓
Kubernetes creates a Deployment object
         ↓
Deployment creates a ReplicaSet
         ↓
ReplicaSet creates the required number of Pods
         ↓
Scheduler assigns each Pod to a suitable Node
         ↓
kubelet on that Node pulls the image and starts the container
```

> You never create Pods directly in production. Deployments and ReplicaSets manage them for you — this is intentional. Direct pod creation has no self-healing.

---

## Stage 2 — ReplicaSets: Maintaining Desired State

A **ReplicaSet** is the self-healing mechanism behind every Deployment. Its only job is to ensure the correct number of healthy pods are always running.

**Example declaration:**
```yaml
replicas: 3
```

**What the ReplicaSet does in response to events:**

| Event | ReplicaSet Response |
|---|---|
| A pod crashes | Creates a replacement pod |
| A node fails | Reschedules pods onto healthy nodes |
| `replicas` increased | Starts additional pods |
| `replicas` decreased | Terminates excess pods |

```
Desired: 3 pods running
         ↓
Pod crashes → ReplicaSet detects count = 2
         ↓
New pod created → count restored to 3
```

> ReplicaSets do not fix broken application code. They ensure the right *number* of pods exist. If your app crashes on startup, the **kubelet** will keep restarting the container — which leads to CrashLoopBackOff.

---

## Stage 3 — Deployment Rollouts & Update Mechanics

When you update your application (e.g. a new image version), Kubernetes performs a **rollout** — replacing old pods with new ones in a controlled way.

**Rolling Update Strategy (default):**

```
Before update:   [Pod v1] [Pod v1] [Pod v1]

During rollout:  [Pod v1] [Pod v1] [Pod v2]   ← new pod starts
                 [Pod v1] [Pod v2] [Pod v2]   ← old pod removed
                 [Pod v2] [Pod v2] [Pod v2]   ← rollout complete
```

**Key properties of a rolling update:**
- New pods are created before old ones are removed
- Traffic shifts incrementally as new pods become ready
- Availability is maintained throughout
- Old ReplicaSet is kept (scaled to 0) to enable rollback

**Possible rollout outcomes:**

| Outcome | What It Means |
|---|---|
| Successful | All new pods became ready — rollout complete |
| Paused | Waiting for manual intervention |
| Failed | New pods never became healthy — rollout stalled |

**How to inspect rollout state:**
- Check Deployment status (`kubectl rollout status`)
- Check Pod readiness
- Check ReplicaSet history (`kubectl rollout history`)

---

## Stage 4 — Health Probes: How Kubernetes Knows a Pod Is Healthy

Kubernetes does not guess whether a pod is healthy — it uses **probes** that you define. Incorrect or missing probes are one of the most common causes of broken deployments.

**Three types of probes:**

| Probe | Purpose | Failure Consequence |
|---|---|---|
| **Liveness** | Is the container still alive? | Container is restarted |
| **Readiness** | Can the pod receive traffic? | Pod removed from load balancer |
| **Startup** | Has the app finished starting? | Prevents premature liveness checks |

**How they interact:**

```
Container starts
      ↓
Startup Probe runs (if defined)
      ↓ passes
Liveness Probe runs continuously  →  fail → restart container
Readiness Probe runs continuously →  fail → remove from traffic
```

**Example scenario — why probes matter:**

```
App takes 20 seconds to initialise
No startup probe defined
Liveness probe fires at 10 seconds → fails → container restarted
Container restarts → same thing happens → CrashLoopBackOff
```

With a startup probe, Kubernetes waits for the app to be ready before applying liveness checks.

---

## Stage 5 — Resource Limits & Scheduling Behaviour

Every pod can declare how much CPU and memory it needs. These values directly affect whether a pod can be scheduled and how it behaves at runtime.

**Two types of resource values:**

| Field | Meaning |
|---|---|
| `requests` | Minimum guaranteed resources — used by the Scheduler to find a suitable node |
| `limits` | Maximum allowed resources — enforced at runtime |

**What happens when limits are exceeded:**

| Resource | Limit Exceeded | Result |
|---|---|---|
| CPU | Yes | Pod is **throttled** — slowed down, not killed |
| Memory | Yes | Pod is **OOMKilled** — terminated immediately |

**What happens when requests are too high:**

```
Pod requests 8 CPU cores
No node has 8 free cores available
         ↓
Pod stays in Pending state indefinitely
```

> Setting requests too high is a common reason pods never leave `Pending`. Setting limits too low causes unexpected `OOMKilled` terminations.

---

## Stage 6 — Common Pod States & What They Tell You

Pod states are your primary debugging signal. Each state points to a specific layer of the problem.

| State | What It Means | Where to Look |
|---|---|---|
| `Pending` | Scheduler cannot place the pod | Node resources, taints, resource requests |
| `Running` | Container is executing normally | — |
| `CrashLoopBackOff` | App keeps crashing on startup | Application logs, liveness probe config |
| `ImagePullBackOff` | Image cannot be pulled from registry | Image name/tag, registry credentials |
| `OOMKilled` | Memory limit exceeded | Memory limits, application memory usage |
| `Terminating` | Pod is shutting down | Normal during updates or scale-down |

**Debugging flow:**

```
Pod not running?
      ↓
Check state
      ↓
Pending       → check node capacity and resource requests
CrashLoop     → check app logs (kubectl logs <pod>)
ImagePullBack → check image tag and registry access
OOMKilled     → check memory limits and app usage
```

---

## Stage 7 — Failure Recovery & Self-Healing

Kubernetes automatically responds to failures at multiple levels.

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Failure                    Kubernetes Response              │
│  ───────                    ────────────────────             │
│  Pod crashes          →     ReplicaSet creates replacement   │
│  Node fails           →     Pods rescheduled to other nodes  │
│  Readiness fails      →     Pod removed from load balancer   │
│  Liveness fails       →     Container restarted              │
│  Replica count wrong  →     ReplicaSet corrects it           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

> Kubernetes guarantees **desired state**, not that your application logic is correct. If your app has a bug that causes it to crash, Kubernetes will keep restarting it — but it cannot fix the bug for you.

---

## End-to-End Lifecycle of a Deployment Update

```
1. Developer updates image tag in Deployment manifest
         ↓
2. Kubernetes creates a new ReplicaSet for the new version
         ↓
3. New pods are created and scheduled onto nodes
         ↓
4. Startup probe runs (if defined) — waits for app to initialise
         ↓
5. Readiness probe passes — pod added to load balancer
         ↓
6. Old pods are terminated gradually (rolling update)
         ↓
7. Liveness probe runs continuously — restarts if app becomes unhealthy
         ↓
8. Rollout complete — all traffic on new version
         ↓
9. Old ReplicaSet retained at 0 replicas — available for rollback
```

Every step is observable. Every failure state has a name. Every name points to a cause.

---

## Summary Table

| Concept | Role | Key Behaviour |
|---|---|---|
| **Pod** | Smallest deployable unit | Runs containers; managed by ReplicaSet |
| **ReplicaSet** | Maintains desired pod count | Self-heals by creating/removing pods |
| **Deployment** | Manages rollouts and history | Enables rolling updates and rollbacks |
| **Liveness Probe** | Detects dead containers | Triggers container restart on failure |
| **Readiness Probe** | Detects unready containers | Removes pod from traffic on failure |
| **Startup Probe** | Handles slow-starting apps | Delays liveness checks until app is ready |
| **Resource Requests** | Scheduling input | Determines which node a pod lands on |
| **Resource Limits** | Runtime enforcement | Throttles CPU; kills pod on memory breach |

---
