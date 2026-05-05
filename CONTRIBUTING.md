# Contributing Guide

This document defines how contributors should work with this repository — branching strategy, commit conventions, and how to handle common Git situations like merge conflicts.

---

## Branching Strategy

This repository follows a **feature-branch workflow** based on `main` as the single source of truth.

```
main
 ├── concept-1/anushka        ← learning concept branches
 ├── concept-2/anushka
 ├── concept-3/anushka
 ├── workstation              ← environment setup
 ├── feature/ci-cd-pipeline   ← feature branches
 └── feature/git-workflow-improvements
```

### Branch Naming Conventions

| Type | Pattern | Example |
|---|---|---|
| Learning concept | `concept-<n>/<name>` | `concept-1/anushka` |
| New feature | `feature/<short-description>` | `feature/add-metrics-endpoint` |
| Bug fix | `fix/<short-description>` | `fix/health-probe-timeout` |
| Documentation | `docs/<short-description>` | `docs/update-k8s-guide` |
| Refactor | `refactor/<short-description>` | `refactor/logging-module` |

### Rules

- **Never commit directly to `main`.** All changes go through a Pull Request.
- **Branch from `main`** unless you are building on top of another in-progress branch.
- **Keep branches short-lived.** A branch should represent one focused unit of work.
- **Delete branches after merging.** Stale branches create confusion.

---

## Commit Message Conventions

This repository uses the [Conventional Commits](https://www.conventionalcommits.org/) format.

```
<type>(<optional scope>): <short summary>

<optional body — explain WHY, not WHAT>

<optional footer — e.g. Closes #12>
```

### Commit Types

| Type | When to Use |
|---|---|
| `feat` | A new feature or capability |
| `fix` | A bug fix |
| `docs` | Documentation only changes |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or updating tests |
| `ci` | Changes to CI/CD pipeline configuration |
| `chore` | Maintenance tasks (dependency updates, config tweaks) |

### Examples

```
feat(app): add /metrics endpoint for Prometheus scraping

Exposes application metrics at /metrics using the prometheus_client
library. Required for the observability milestone.

Closes #18
```

```
fix(k8s): increase memory limit to prevent OOMKilled restarts

The app was being OOMKilled under load. Increased memory limit
from 256Mi to 512Mi based on profiling results.
```

```
docs: add CONTRIBUTING.md with branching and commit conventions
```

### Rules

- Use the **imperative mood** in the summary: "add feature" not "added feature"
- Keep the summary line under **72 characters**
- Explain **why** in the body, not what (the diff shows what)
- Reference issues where relevant (`Closes #n`, `Refs #n`)

---

## Pull Request Process

1. **Create a branch** from `main` using the naming convention above.
2. **Make focused commits** — each commit should represent one logical change.
3. **Push the branch** and open a Pull Request against `main`.
4. **Write a clear PR description** covering:
   - What changed and why
   - How to test the change
   - Any known limitations or follow-up work
5. **Ensure CI passes** — all lint and test checks must be green before merging.
6. **Request a review** if working in a team.
7. **Squash or rebase** if the commit history is noisy before merging.

---

## Handling Merge Conflicts

See [`docs/BRANCHING.md`](docs/BRANCHING.md) for a detailed walkthrough of the conflict resolution workflow, including the parallel-feature scenario.

### Quick Reference

When your branch is behind `main` and has conflicts:

```bash
# 1. Fetch the latest state of main
git fetch origin

# 2. Rebase your branch on top of the updated main
git rebase origin/main

# 3. Resolve any conflicts in your editor, then:
git add <resolved-file>
git rebase --continue

# 4. Force-push the rebased branch (safe because it's your own branch)
git push --force-with-lease origin <your-branch>
```

Prefer `rebase` over `merge` when updating a feature branch — it keeps the commit history linear and easier to read.

---

## Local Development Setup

### Prerequisites

- Python 3.11+
- Docker Desktop (with Kubernetes enabled)
- kubectl, Helm, curl — see [`devops-setup/README.md`](devops-setup/README.md)

### Running the App Locally

```bash
# Install dependencies
pip install -r requirements.txt

# Run the Flask app
python -m app.main
```

The app starts on `http://localhost:8080`.

### Running Tests

```bash
# Run all tests with coverage report
pytest --cov=app --cov-report=term-missing tests/
```

### Running Linting

```bash
flake8 app/ tests/
pylint app/ tests/
```

---

## Repository Structure

```
.
├── app/
│   ├── __init__.py          # Package marker
│   └── main.py              # Flask application (health + ready + index endpoints)
│
├── tests/
│   └── test_app.py          # Unit tests (run by CI Stage 2)
│
├── k8s/
│   ├── deployment.yaml      # Kubernetes Deployment (rolling update, health probes)
│   └── service.yaml         # Kubernetes Service (ClusterIP)
│
├── docs/
│   ├── Readme[concept-1Anushka].md   # CI/CD artifact flow
│   ├── Readme[concept-2Anushka].md   # Kubernetes application lifecycle
│   ├── Readme[concept-3Anushka].md   # CI/CD pipeline responsibilities
│   └── BRANCHING.md                  # Git branching strategy and conflict resolution
│
├── devops-setup/
│   └── README.md            # Local environment setup proof
│
├── Dockerfile               # Multi-stage build (builder + runtime)
├── requirements.txt         # Pinned Python dependencies
├── CONTRIBUTING.md          # This file — how to contribute
└── readme.md                # Project overview and pipeline documentation
```
