## DevOps with Kubernetes & CI/CD

---

## CI/CD Pipeline Responsibilities — Understanding Who Does What and Why

CI/CD is not a single step. It is a pipeline of clearly separated responsibilities, where each stage has a defined purpose and a defined owner. Understanding these boundaries is what separates someone who can follow a pipeline from someone who can reason about, modify, and trust one.

---

## The Big Picture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  [CODE CHANGE]  ──►  [CI PIPELINE]  ──►  [ARTIFACT]  ──►  [CD PIPELINE] │
│                                                                          │
│  Git Commit         Build & Test         Docker Image      Deploy        │
│  Pull Request       Validate             (immutable)       to Cluster    │
│                                                                          │
│                                                    ──►  [KUBERNETES]     │
│                                                         Run & Heal       │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Key principle:** Each stage answers a different question.

| Stage | Question It Answers |
|---|---|
| **CI** | Is this code safe to merge? |
| **CD** | How do we safely run this version in production? |
| **Kubernetes** | Is the system in the desired state right now? |

---

## Part 1 — Continuous Integration (CI)

CI is about **validating code changes**. Its job is to catch problems before they reach production.

**What CI does:**

```
Pull Request or Commit pushed
         ↓
CI pipeline triggers automatically
         ↓
1. Check out source code at the specific commit
         ↓
2. Run linting and static checks
         ↓
3. Run unit tests
         ↓
4. Build Docker image
         ↓
5. Tag image with version or commit hash
         ↓
6. Push image to Container Registry
         ↓
CI passes → code is safe to merge
```

**CI responsibilities at a glance:**

| Responsibility | Belongs to CI? |
|---|---|
| Running unit tests | ✅ Yes |
| Building Docker image | ✅ Yes |
| Tagging and pushing image | ✅ Yes |
| Linting and static analysis | ✅ Yes |
| Deploying to production | ❌ No |
| Restarting failed pods | ❌ No |

> CI builds **confidence**. It does not ship anything to users — it validates that the artifact is ready to be shipped.

**When CI is triggered:**
- A developer opens a Pull Request
- A commit is pushed to a branch
- A merge into the main branch occurs

---

## Part 2 — Continuous Deployment (CD)

CD is about **releasing validated artifacts**. It takes what CI produced and moves it into a running environment.

**What CD does:**

```
CI pipeline completes successfully
         ↓
CD pipeline triggers
         ↓
1. Pull the pre-built Docker image from the registry
         ↓
2. Update the Kubernetes Deployment manifest (new image tag)
         ↓
3. Apply the manifest to the cluster
         ↓
4. Monitor rollout progress
         ↓
5. Trigger rollback if rollout fails
```

**CD responsibilities at a glance:**

| Responsibility | Belongs to CD? |
|---|---|
| Rebuilding application code | ❌ No |
| Pulling pre-built image from registry | ✅ Yes |
| Updating Kubernetes manifests | ✅ Yes |
| Applying manifests to the cluster | ✅ Yes |
| Managing rollout and rollback | ✅ Yes |
| Running unit tests | ❌ No |

> CD moves **artifacts** — it does not rebuild them. The image CD deploys is exactly the image CI built and tested. This is what makes deployments reproducible.

---

## Part 3 — Where Every Action Belongs

This is the most important table to internalise. Every action in a DevOps system has a home.

| Action | Happens In |
|---|---|
| Writing business logic | Application code |
| Writing unit tests | Application code |
| Running unit tests | CI pipeline |
| Running linting / static checks | CI pipeline |
| Building Docker image | CI pipeline |
| Tagging image with version | CI pipeline |
| Pushing image to registry | CI pipeline |
| Updating Kubernetes manifests | CD pipeline |
| Applying manifests to cluster | CD pipeline |
| Managing rolling updates | Kubernetes |
| Restarting failed pods | Kubernetes |
| Self-healing crashed containers | Kubernetes |

**Key insight:** Pipelines **orchestrate** actions. They do not replace application logic or infrastructure behaviour.

---

## Part 4 — Responsibility Boundaries (Why They Matter)

Modern DevOps systems enforce strict separation of responsibility. This is not bureaucracy — it is safety engineering.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  APPLICATION CODE                                               │
│  ─────────────────                                              │
│  • Implements features and business logic                       │
│  • Defines unit tests                                           │
│  • Should NOT directly deploy itself                            │
│                                                                 │
│  CI PIPELINE                                                    │
│  ───────────                                                    │
│  • Validates code changes                                       │
│  • Builds and tags artifacts                                    │
│  • Automates repeatable build steps                             │
│                                                                 │
│  CD PIPELINE                                                    │
│  ───────────                                                    │
│  • Deploys validated artifacts                                  │
│  • Updates infrastructure state                                 │
│  • Manages rollout and rollback                                 │
│                                                                 │
│  KUBERNETES / INFRASTRUCTURE                                    │
│  ──────────────────────────                                     │
│  • Runs workloads                                               │
│  • Enforces desired state                                       │
│  • Self-heals failures                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Why this separation exists:**

| Reason | Explanation |
|---|---|
| Prevents accidental deployments | Code merges do not automatically push to production unless CD is explicitly configured to do so |
| Enables safe PR reviews | Reviewers can evaluate code changes without worrying about triggering a live deployment |
| Reduces blast radius | A broken CI step fails the build — it does not take down production |
| Makes rollbacks predictable | CD always deploys a known, tested artifact — rolling back means pointing to a previous image |

---

## Part 5 — Safe Pipeline Modifications

Not all pipeline changes carry the same risk. Understanding what each section controls is essential before modifying it.

```
Pipeline file sections and their impact:

  Test steps      →  affects CI validation
                     (broken tests = PRs fail to merge)

  Build steps     →  affects artifact creation
                     (broken build = no image produced)

  Deploy steps    →  affects live systems
                     (broken deploy = production outage risk)
```

**Rules for modifying pipeline configuration:**

| Rule | Why |
|---|---|
| Review changes carefully | A one-line change to a deploy step can affect every future release |
| Keep changes minimal and intentional | Pipelines are shared infrastructure — side effects are easy to miss |
| Understand before merging | Pipeline files are code — treat them with the same rigour as application code |

**This is why pipeline configuration is typically:**
- Version-controlled alongside application code
- Protected by branch review rules
- Restricted from direct edits on production branches

---

## Part 6 — Common Misconceptions

These are the most frequent wrong mental models. Recognising them is as important as knowing the correct ones.

| Misconception | Why It Is Wrong |
|---|---|
| "CI deploys code" | CI builds and validates — CD deploys |
| "CD recompiles the application" | CD pulls a pre-built image — it never touches source code |
| "Pipelines replace Kubernetes logic" | Pipelines trigger deployments — Kubernetes manages the running state |
| "A passing CI means the app is production-ready" | CI validates the artifact — CD and infrastructure determine if it runs correctly |

**Correct mental model:**

```
CI   →  builds confidence
CD   →  moves artifacts
K8s  →  runs and heals systems
```

---

## End-to-End Flow — A Single Code Change

```
1. Developer pushes a commit or opens a Pull Request
         ↓
2. CI pipeline triggers automatically
         ↓
3. Linting and static checks run
         ↓
4. Unit tests run — code is validated
         ↓
5. Docker image built and tagged (e.g. app:commit-9f3a1c2)
         ↓
6. Image pushed to Container Registry
         ↓
7. CI passes — code is safe to merge
         ↓
8. CD pipeline triggers on merge to main
         ↓
9. CD pulls the pre-built image from the registry
         ↓
10. Kubernetes Deployment manifest updated with new image tag
         ↓
11. Manifest applied to the cluster
         ↓
12. Kubernetes performs a rolling update
         ↓
13. New version is live — old pods replaced gradually
```

Every stage has a clear owner. Every handoff is explicit. No stage does another stage's job.

---

## Summary Table

| Concept | Stage | Core Responsibility |
|---|---|---|
| **Unit tests** | Application code + CI | Defined in code, executed by CI |
| **Docker image build** | CI | Produces the immutable artifact |
| **Image tagging & push** | CI | Stores artifact in registry with version |
| **Manifest update** | CD | Points Kubernetes to the new image |
| **Cluster deployment** | CD | Applies the updated state to the cluster |
| **Rolling update** | Kubernetes | Replaces pods without downtime |
| **Self-healing** | Kubernetes | Restarts failed containers automatically |
| **Rollback** | CD + Kubernetes | CD updates manifest; Kubernetes re-deploys old image |

---
