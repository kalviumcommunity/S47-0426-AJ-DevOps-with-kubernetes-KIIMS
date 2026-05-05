# SPRINT - 3

## DevOps with Kubernetes & CI/CD

---

## Learning Concepts

- [Concept 1 — CI/CD Artifact Flow: Source → Image → Registry → Cluster](docs/Readme[concept-1Anushka].md)
- [Concept 2 — Kubernetes Application Lifecycle](docs/Readme[concept-2Anushka].md)
- [Concept 3 — CI/CD Pipeline Responsibilities](docs/Readme[concept-3Anushka].md)
- [Containerization Concepts — Why Containers Exist and How They Apply to This Project](docs/containerization-concepts.md)
- [Docker Architecture — Images, Layers, and Containers](docs/docker-architecture-images-layers-containers.md)

---

## CI/CD Pipeline

This repository includes a working GitHub Actions CI/CD pipeline that demonstrates the full artifact flow described in the concept documents.

**Pipeline file:** [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml)

### Pipeline Stages

| Stage | What It Does | Runs On |
|---|---|---|
| **1 — Lint** | flake8 + pylint static analysis | All pushes and PRs |
| **2 — Test** | pytest unit tests with 80% coverage gate | All pushes and PRs |
| **3 — Build & Push** | Docker image built, tagged with commit SHA, pushed to GHCR | Merges to `main` only |
| **4 — Deploy** | Kubernetes manifests applied, rollout monitored, auto-rollback on failure | Merges to `main` only |

### Key Files

```
.github/
  workflows/
    ci-cd.yml          ← GitHub Actions pipeline (4 stages)

app/
  main.py              ← Flask application (health + ready endpoints)

tests/
  test_app.py          ← Unit tests (run by Stage 2)

k8s/
  deployment.yaml      ← Kubernetes Deployment (rolling update + health probes)
  service.yaml         ← Kubernetes Service (ClusterIP)

Dockerfile             ← Multi-stage build (builder + runtime)
requirements.txt       ← Pinned Python dependencies
```

---

## DevOps Environment Setup

See [`devops-setup/README.md`](devops-setup/README.md) for the local environment configuration (Docker Desktop, kubectl, Helm, etc.).

---

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the branching strategy, commit conventions, and PR process.

See [`docs/BRANCHING.md`](docs/BRANCHING.md) for the Git workflow diagram, conflict resolution walkthrough, and the scenario-based question answer (parallel feature development).

## PR Contributions

- [`devops-setup/PR-description.md`](devops-setup/PR-description.md) — Linux filesystem permissions PR (scenario-based Q&A included)
- [`devops-setup/PR-description-containerization.md`](devops-setup/PR-description-containerization.md) — Containerization concepts PR (scenario-based Q&A included)
- [`devops-setup/PR-description-docker-architecture.md`](devops-setup/PR-description-docker-architecture.md) — Docker architecture (images, layers, containers) PR (scenario-based Q&A included)
