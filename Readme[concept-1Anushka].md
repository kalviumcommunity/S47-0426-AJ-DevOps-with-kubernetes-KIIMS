## DevOps with Kubernetes & CI/CD

---

## CI/CD Artifact Flow — Understanding the Big Picture

In DevOps, code is never deployed directly. Every change is packaged into an **immutable artifact** that travels through controlled stages, gaining confidence and traceability at each step.

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   [SOURCE]          [CI]           [IMAGE]                  │
│                                                             │
│  Git Commit  ──►  CI Pipeline  ──►  Docker Image           │
│  (git push)       (build/test)      (tagged artifact)       │
│                                                             │
│      [REGISTRY]              [CLUSTER]                      │
│                                                             │
│  Container Registry  ──►  Kubernetes Deployment            │
│  (versioned store)         (pulls & runs image)            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Stages:** `Source` → `CI` → `Image` → `Registry` → `Cluster`

---

## Stage 1 — Source: Where Everything Begins

The flow starts with a **Git commit**.

- A developer pushes a commit or opens a Pull Request
- Code is reviewed and merged into the main branch
- The **commit hash** (e.g. `9f3a1c2`) uniquely identifies exactly what code is being built

> The commit hash is the input to the CI pipeline. It ties every downstream artifact back to a specific point in history.

---

## Stage 2 — CI Pipeline: Turning Code into an Artifact

A **CI pipeline** (e.g. GitHub Actions) is triggered automatically on push or merge.

**What the pipeline does:**
1. Checks out the source code at the specific commit
2. Runs tests and validations
3. Builds a Docker image
4. Tags the image with a version or commit reference

**Example image tags:**
```
app:latest
app:v1.3.2
app:commit-9f3a1c2
```

> The CI pipeline does **not** deploy code — it **produces** a Docker image artifact. Deployment is a separate, controlled step.

---

## Stage 3 — Docker Image: The Immutable Artifact

A Docker image is a self-contained snapshot of:
- Application code
- Runtime environment
- Dependencies
- Default configuration

**Why immutability matters:**
- Once built, the image never changes
- Any new code change produces a new image
- There is no ambiguity about what is running

```
Commit A  →  Image app:commit-a1b2c3
Commit B  →  Image app:commit-d4e5f6
```

Each commit maps to exactly one image. No hidden changes, no surprises.

---

## Stage 4 — Container Registry: The Artifact Store

Built images are **pushed to a container registry** for storage and distribution.

**Examples of registries:**
- Docker Hub
- GitHub Container Registry (GHCR)
- AWS ECR, Azure ACR, Google Artifact Registry

**Why registries are critical:**
| Reason | Explanation |
|---|---|
| Versioned storage | Every image version is retained and retrievable |
| Traceability | You can trace any running image back to its source commit |
| Controlled access | Only authorised systems can pull and deploy images |
| Decoupling | Kubernetes pulls from the registry — never from source code |

**Tags vs Digests:**
- **Tags** (`app:v1.3.2`) — human-friendly labels, can be reassigned
- **Digests** (`app@sha256:abc123...`) — cryptographic identifiers, always point to the exact same image bytes

> For production deployments, digests guarantee you are running exactly what was tested.

---

## Stage 5 — Kubernetes Cluster: Running the Artifact

Kubernetes runs the Docker image inside the cluster using a **Deployment** resource.

**A Deployment specifies:**
```yaml
# Conceptual Kubernetes Deployment
image: my-app:commit-9f3a1c2
replicas: 3
strategy: RollingUpdate
```

**What Kubernetes does:**
1. Reads the Deployment spec
2. Pulls the specified image from the registry
3. Starts the required number of containers (replicas)
4. Restarts containers automatically if they crash
5. Performs a **rolling update** when the image tag changes — replacing old containers gradually with no downtime

> Kubernetes knows what to deploy because the Deployment manifest references a specific image tag or digest. Updating that reference is what triggers a new rollout.

---

## How Rollbacks Work

Because every deployment references a specific, immutable image, rollbacks are straightforward and reliable.

**Rollback process:**
1. A new release is deployed and a problem is detected
2. Identify the last known-good image tag (e.g. `app:commit-a1b2c3`)
3. Update the Deployment to reference that image
4. Kubernetes automatically rolls back — replacing new containers with the old image

**Why this works reliably:**
- Images are immutable — the old image is exactly as it was when it passed testing
- Registries retain history — old images are always available
- Deployments reference exact artifacts — no rebuilding required
- No "it worked yesterday" problems — you are running the identical artifact that worked before

```
Problem detected with app:commit-d4e5f6
         ↓
Rollback to app:commit-a1b2c3
         ↓
Kubernetes replaces containers automatically
         ↓
Service restored — same image that passed all tests
```

---

## End-to-End Journey of a Single Change

```
1. Developer pushes a Git commit
         ↓
2. CI pipeline triggers (GitHub Actions / Jenkins / etc.)
         ↓
3. Tests run — code is validated
         ↓
4. Docker image built and tagged with commit hash
         ↓
5. Image pushed to Container Registry
         ↓
6. Kubernetes Deployment manifest updated (new image tag)
         ↓
7. Kubernetes pulls image from Registry
         ↓
8. Rolling update — new containers replace old ones
         ↓
9. New version is live
```

Every step is traceable. Every artifact is versioned. Every deployment is reproducible.

---

## Summary Table

| Stage | What Happens | Key Output |
|---|---|---|
| **Source** | Developer commits code | Git commit hash |
| **CI** | Pipeline builds and tests | Docker image |
| **Image** | Immutable snapshot created | Tagged image |
| **Registry** | Image stored and versioned | Pullable image URL |
| **Cluster** | Kubernetes runs the image | Running containers |

---

