# Docker Architecture — Images, Layers, and Containers

---

## Overview

Docker's internal architecture is built on three tightly related concepts:

| Concept | What It Is |
|---|---|
| **Image** | A read-only, immutable blueprint for a container |
| **Layer** | A single, cached filesystem change that stacks to form an image |
| **Container** | A running (or stopped) instance created from an image |

Understanding how these three interact explains Docker's performance characteristics, image size behaviour, and build caching — all of which directly affect this project's CI/CD pipeline.

---

## 1. Docker Images

A Docker image is a **read-only template** that contains everything needed to run an application:

- A base operating system filesystem (e.g. `python:3.11-slim`)
- Installed packages and libraries (e.g. Flask, Gunicorn)
- Application source code (e.g. `app/main.py`)
- Metadata: environment variables, exposed ports, the startup command

Images are **immutable**. Once built, an image never changes. Every time you run `docker build`, you produce a new image. The old one remains untouched in the local cache or registry.

### How This Project Produces an Image

The CI/CD pipeline (Stage 3) runs:

```bash
docker build -t ghcr.io/kalviumcommunity/sprint3-app:sha-9f3a1c2 .
docker push ghcr.io/kalviumcommunity/sprint3-app:sha-9f3a1c2
```

The resulting image is tagged with the **commit SHA** — creating an unbreakable link between the Git commit and the artifact running in Kubernetes. The image stored in GHCR (GitHub Container Registry) is the exact same artifact that was tested in CI and later deployed to the cluster.

---

## 2. Docker Layers — The Foundation of Caching

Every instruction in a `Dockerfile` that modifies the filesystem creates a new **layer**. A layer is a diff — it records only what changed relative to the layer below it.

```
┌─────────────────────────────────────────────────────────────────┐
│                        DOCKER IMAGE                             │
│                                                                 │
│  Layer 5 │  COPY app/ ./app/          ← application code       │
│  ─────────────────────────────────────────────────────────────  │
│  Layer 4 │  COPY --from=builder ...   ← installed packages      │
│  ─────────────────────────────────────────────────────────────  │
│  Layer 3 │  RUN useradd appuser       ← non-root user           │
│  ─────────────────────────────────────────────────────────────  │
│  Layer 2 │  WORKDIR /app              ← working directory        │
│  ─────────────────────────────────────────────────────────────  │
│  Layer 1 │  FROM python:3.11-slim     ← base OS + Python        │
└─────────────────────────────────────────────────────────────────┘
```

Each layer is identified by a **content hash (SHA-256)**. If the inputs to a layer have not changed, Docker reuses the cached version instead of re-executing the instruction. This is the **layer cache**.

### Layer Cache Rules

1. Docker evaluates layers **top to bottom**.
2. If a layer's inputs are unchanged, Docker uses the **cached layer** — no work is done.
3. If a layer's inputs change, that layer and **every layer below it** are invalidated and rebuilt from scratch.

This means **layer order matters enormously** for build performance.

---

## 3. How This Project's Dockerfile Uses Layers

The `Dockerfile` in this project is structured to maximise cache reuse:

```dockerfile
# ── Stage 1: Builder ──────────────────────────────────────────────
FROM python:3.11-slim AS builder
WORKDIR /build

# Layer A — copy only the dependency manifest
COPY requirements.txt .

# Layer B — install dependencies
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: Runtime ──────────────────────────────────────────────
FROM python:3.11-slim AS runtime

# Layer C — create non-root user
RUN useradd --create-home --shell /bin/bash appuser

WORKDIR /app

# Layer D — copy installed packages from builder
COPY --from=builder /install /usr/local

# Layer E — copy application source code
COPY app/ ./app/

USER appuser
EXPOSE 8080
CMD ["python", "-m", "app.main"]
```

### Why This Order Is Intentional

```
Change type                    Layers invalidated
─────────────────────────────────────────────────
requirements.txt changes   →   Layer B, D, E  (pip reinstall required)
app/main.py changes        →   Layer E only   (pip cache reused)
No changes                 →   All layers cached (near-instant build)
```

Because `COPY requirements.txt` comes **before** `COPY app/`, a change to `app/main.py` only invalidates the final layer. The expensive `pip install` step (Layer B) is served from cache.

If the order were reversed — `COPY app/` first, then `COPY requirements.txt` — every code change would invalidate the pip install layer, forcing a full dependency reinstall on every build.

---

## 4. Multi-Stage Builds — Keeping the Final Image Small

This project uses a **two-stage build**:

```
Stage 1 (builder)                Stage 2 (runtime)
─────────────────                ─────────────────
python:3.11-slim                 python:3.11-slim
+ pip                            + installed packages only
+ build tools                    + app source code
+ pip cache                      + non-root user
+ requirements.txt
        │
        │  COPY --from=builder /install /usr/local
        └──────────────────────────────────────────►
```

The builder stage is **discarded** after the build. It never appears in the final image. This means:

- No `pip` binary in the runtime image (reduces attack surface)
- No build-time caches or temporary files
- No `requirements.txt` file (not needed at runtime)
- Smaller final image size

### Image Size Impact

| Approach | Approximate Size |
|---|---|
| Single-stage (everything in one image) | ~250–300 MB |
| Multi-stage (builder discarded) | ~120–150 MB |
| Multi-stage + slim base | ~80–100 MB |

Smaller images mean faster pulls from GHCR to the Kubernetes nodes, faster pod startup, and less registry storage cost.

---

## 5. Containers — Running Instances of Images

A **container** is a running (or stopped) process created from an image. The relationship between image and container is analogous to a class and an object in object-oriented programming:

```
Image  →  read-only blueprint  (like a class definition)
Container  →  running instance  (like an object created from that class)
```

When Docker creates a container from an image, it adds a thin **writable layer** on top of the image's read-only layers. All writes made by the running process (logs, temp files, etc.) go into this writable layer. The underlying image layers are never modified.

```
┌─────────────────────────────────────────────────────────────────┐
│                       CONTAINER                                 │
│                                                                 │
│  Writable Layer  │  runtime writes (logs, temp files)          │
│  ─────────────────────────────────────────────────────────────  │
│  Layer 5 (R/O)   │  COPY app/ ./app/                           │
│  Layer 4 (R/O)   │  COPY --from=builder ...                    │
│  Layer 3 (R/O)   │  RUN useradd appuser                        │
│  Layer 2 (R/O)   │  WORKDIR /app                               │
│  Layer 1 (R/O)   │  FROM python:3.11-slim                      │
└─────────────────────────────────────────────────────────────────┘
```

When the container is deleted, the writable layer is discarded. The image layers remain unchanged and can be used to create new containers at any time.

### Multiple Containers from One Image

Because the image layers are read-only and shared, multiple containers can run from the same image simultaneously with minimal overhead. Each container only adds its own thin writable layer.

In this project's Kubernetes deployment:

```yaml
# k8s/deployment.yaml
spec:
  replicas: 2
```

Two containers run from the same image. They share the read-only image layers on the node's filesystem — the image is pulled once and reused for both replicas.

---

## 6. Container Lifecycle in This Project

```
docker build
     │
     ▼
Image created (read-only, tagged with commit SHA)
     │
     ▼
docker push → image stored in GHCR
     │
     ▼
kubectl apply → Kubernetes pulls image to each node
     │
     ▼
Container created (image layers + writable layer)
     │
     ├── /health probe → liveness check (is the process alive?)
     ├── /ready probe  → readiness check (can it serve traffic?)
     │
     ▼
Container running → serves HTTP traffic on port 8080
     │
     ▼
Rolling update triggered (new image available)
     │
     ├── New container starts (new image)
     ├── /ready probe passes → new container added to load balancer
     ├── Old container removed from load balancer
     └── Old container stopped → writable layer discarded
```

The image in GHCR is never modified. Each deployment creates new containers from a new image. Old images remain in the registry, enabling instant rollback.

---

## 7. Scenario — Why a Small Code Change Caused a Slow Build and Larger Image

> **Scenario:** After making a small change to `app/main.py`, rebuilding the Docker image takes significantly longer than expected, and the resulting image size increases noticeably.

### Root Cause Analysis

This is a classic **layer cache invalidation** problem, most commonly caused by one of the following:

#### Cause 1 — Wrong COPY Order (Most Common)

If the Dockerfile copies application code **before** copying `requirements.txt`:

```dockerfile
# ❌ Problematic order
COPY app/ ./app/          # Layer A — app code
COPY requirements.txt .   # Layer B — dependency manifest
RUN pip install ...        # Layer C — install dependencies
```

When `app/main.py` changes:
- Layer A is invalidated (app code changed)
- Layer B is invalidated (everything below A is rebuilt)
- Layer C is invalidated → **full pip install runs again**

Even though `requirements.txt` did not change, Docker cannot reuse the pip install cache because a layer above it was invalidated.

**Fix — reverse the order:**

```dockerfile
# ✅ Correct order
COPY requirements.txt .   # Layer A — dependency manifest
RUN pip install ...        # Layer B — install dependencies (cached unless requirements.txt changes)
COPY app/ ./app/          # Layer C — app code (only this layer rebuilds on code changes)
```

This project's `Dockerfile` already follows this pattern correctly.

#### Cause 2 — No Multi-Stage Build

If all steps are in a single stage, the final image includes pip, build tools, and caches:

```dockerfile
# ❌ Single-stage — everything ends up in the image
FROM python:3.11-slim
COPY requirements.txt .
RUN pip install -r requirements.txt   # pip cache stays in this layer
COPY app/ ./app/
CMD ["python", "-m", "app.main"]
```

The `pip install` layer retains the download cache inside the image. Over time, as dependencies are added or updated, this layer grows. The final image carries unnecessary weight.

**Fix — use a multi-stage build** (as this project does):

```dockerfile
# ✅ Multi-stage — builder stage is discarded
FROM python:3.11-slim AS builder
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.11-slim AS runtime
COPY --from=builder /install /usr/local   # only the installed packages, no cache
COPY app/ ./app/
CMD ["python", "-m", "app.main"]
```

#### Cause 3 — Copying Unnecessary Files

If the `COPY` instruction copies the entire project directory (including `.git`, test files, local caches):

```dockerfile
# ❌ Copies everything — including .git, __pycache__, test files
COPY . .
```

Any change to any file — including unrelated files like `README.md` or test outputs — invalidates this layer and forces a full rebuild. The image also grows because it includes files that are not needed at runtime.

**Fix — use a `.dockerignore` file** and copy only what is needed:

```
# .dockerignore
.git
.github
__pycache__
*.pyc
tests/
docs/
*.md
.coverage
.pytest_cache
```

And in the Dockerfile:

```dockerfile
# ✅ Copy only the application source
COPY app/ ./app/
```

### Summary of Fixes

| Problem | Symptom | Fix |
|---|---|---|
| Wrong COPY order | pip reinstalls on every code change | Copy `requirements.txt` before `app/` |
| No multi-stage build | Image grows with pip cache and build tools | Use `AS builder` + `AS runtime` stages |
| `COPY . .` without `.dockerignore` | Any file change triggers full rebuild; image includes junk | Use `.dockerignore`; copy only `app/` |
| No `--no-cache-dir` flag | pip download cache stored inside the layer | Add `--no-cache-dir` to `pip install` |

---

## 8. How This Project's Dockerfile Avoids All These Problems

```dockerfile
# Stage 1 — Builder
FROM python:3.11-slim AS builder
WORKDIR /build
COPY requirements.txt .                              # ✅ dependencies copied first
RUN pip install --no-cache-dir --prefix=/install \  # ✅ no pip cache in layer
    -r requirements.txt

# Stage 2 — Runtime
FROM python:3.11-slim AS runtime
RUN useradd --create-home --shell /bin/bash appuser
WORKDIR /app
COPY --from=builder /install /usr/local              # ✅ only installed packages, no build tools
COPY app/ ./app/                                     # ✅ app code copied last
USER appuser                                         # ✅ non-root
EXPOSE 8080
CMD ["python", "-m", "app.main"]
```

**Result:**
- Changing `app/main.py` only invalidates the last `COPY` layer — build completes in seconds
- Changing `requirements.txt` invalidates the pip install layer — full reinstall, but this is expected and correct
- The final image contains no pip, no build tools, no caches — minimal size
- The builder stage is completely discarded from the final image

---

## 9. Visual Summary — Image, Layer, and Container Relationship

```
Dockerfile Instructions
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│                        IMAGE                                  │
│                                                               │
│  [Layer 1] FROM python:3.11-slim   ← base OS + Python        │
│  [Layer 2] WORKDIR /app            ← directory metadata       │
│  [Layer 3] RUN useradd appuser     ← user creation            │
│  [Layer 4] COPY --from=builder     ← installed packages       │
│  [Layer 5] COPY app/ ./app/        ← application code         │
│                                                               │
│  All layers: READ-ONLY, content-addressed (SHA-256)           │
└───────────────────────────────────────────────────────────────┘
        │
        │  docker run (or kubectl creates a pod)
        ▼
┌───────────────────────────────────────────────────────────────┐
│                      CONTAINER                                │
│                                                               │
│  [Writable Layer]  runtime writes (logs, temp files)          │
│  ─────────────────────────────────────────────────────────    │
│  [Layer 5] R/O  COPY app/ ./app/                              │
│  [Layer 4] R/O  COPY --from=builder                           │
│  [Layer 3] R/O  RUN useradd appuser                           │
│  [Layer 2] R/O  WORKDIR /app                                  │
│  [Layer 1] R/O  FROM python:3.11-slim                         │
│                                                               │
│  Process: python -m app.main  (running as appuser, port 8080) │
└───────────────────────────────────────────────────────────────┘
        │
        │  Container deleted
        ▼
  Writable layer discarded.
  Image layers unchanged — ready for the next container.
```

---

## 10. Key Takeaways

| Concept | Key Point |
|---|---|
| **Image** | Read-only, immutable blueprint. Built once, run anywhere. |
| **Layer** | A cached filesystem diff. Reused if inputs are unchanged. |
| **Layer order** | Put slow, rarely-changing steps first. Put fast, frequently-changing steps last. |
| **Cache invalidation** | Changing a layer invalidates all layers below it. Order determines the blast radius. |
| **Multi-stage build** | Discard the builder stage. Only ship what the runtime needs. |
| **Container** | A running instance with a thin writable layer on top of read-only image layers. |
| **Immutability** | Containers are ephemeral. Images are permanent. Fix code → build new image → deploy new container. |
| **Shared layers** | Multiple containers from the same image share read-only layers — efficient use of disk and memory. |
