# DevOps Environment Setup — Proof of Completion

## Overview

This folder contains proof that a complete local DevOps environment has been configured and verified, ready for hands-on Kubernetes and CI/CD work.

---

## Environment Details

| Field | Value |
|---|---|
| **OS** | Windows 11 |
| **Shell** | PowerShell |
| **IDE** | Visual Studio Code |
| **Kubernetes Local Environment** | Docker Desktop (Kubernetes enabled) |

---

## Tools Installed & Verified

| Tool | Version | Verification Command | Status |
|---|---|---|---|
| **Git** | 2.43.0 | `git --version` | ✅ Installed |
| **Docker** | 29.4.1 | `docker --version` | ✅ Installed |
| **Docker Hello World** | — | `docker run hello-world` | ✅ Working |
| **kubectl** | v1.34.1 | `kubectl version --client` | ✅ Installed |
| **Kubernetes Cluster** | v1.34.3 | `kubectl get nodes` | ✅ Running |
| **Helm** | v4.1.4 | `helm version` | ✅ Installed |
| **curl** | 8.19.0 | `curl.exe --version` | ✅ Installed |

---

## Verification Output

### Git
```
git --version
git version 2.43.0.windows.1
```

### Docker
```
docker --version
Docker version 29.4.1, build 055a478
```

### Docker Hello World
```
docker run hello-world
Hello from Docker!
This message shows that your installation appears to be working correctly.
```

### kubectl
```
kubectl version --client
Client Version: v1.34.1
Kustomize Version: v5.7.1
```

### Kubernetes Cluster
```
kubectl get nodes
NAME                    STATUS   ROLES           AGE   VERSION
desktop-control-plane   Ready    control-plane   35s   v1.34.3
```

### Helm
```
helm version
version.BuildInfo{Version:"v4.1.4", GitCommit:"05fa37973dc9e42b76e1d2883494c87174b6074f", GitTreeState:"clean", GoVersion:"go1.25.9", KubeClientVersion:"v1.35"}
```

### curl
```
curl.exe --version
curl 8.19.0 (Windows) libcurl/8.19.0 Schannel zlib/1.3.1 WinIDN WinLDAP
Release-Date: 2026-03-11
Protocols: dict file ftp ftps gopher gophers http https imap imaps ...
Features: alt-svc AsynchDNS HSTS HTTPS-proxy IDN IPv6 ...
```

---

## Screenshots

All terminal screenshots are in the [`screenshots/`](./screenshots/) folder.

| File | What It Shows |
|---|---|
| `01-git-version.png` | `git --version` output |
| `02-docker-version.png` | `docker --version` output |
| `03-docker-hello-world.png` | `docker run hello-world` successful output |
| `04-kubectl-version.png` | `kubectl version --client` output |
| `05-kubectl-get-nodes.png` | `kubectl get nodes` — node Ready |
| `06-kubectl-cluster-info.png` | `kubectl cluster-info` output |
| `07-helm-version.png` | `helm version` output |
| `08-curl-version.png` | `curl.exe --version` output |

---

## Setup Steps Followed

### 1. Git
Already installed on the system.
Verified with `git --version`.

### 2. Docker Desktop
Downloaded from https://www.docker.com/products/docker-desktop and installed.
Verified with `docker --version` and `docker run hello-world`.

### 3. kubectl
Installed automatically with Docker Desktop.
Verified with `kubectl version --client`.

### 4. Kubernetes Cluster
Enabled inside Docker Desktop:
- Opened Docker Desktop → clicked **Kubernetes** in the sidebar
- Clicked **"Create cluster"**
- Waited ~3 minutes for the cluster to start
- Verified with `kubectl get nodes` — node shows STATUS = Ready

### 5. Helm
Installed using winget:
```powershell
winget install Helm.Helm
```
Verified with `helm version`.

### 6. curl
Installed using winget:
```powershell
winget install curl.curl
```
Verified with `curl.exe --version`.
Note: On PowerShell, `curl.exe` must be used instead of `curl` because PowerShell has a built-in alias that conflicts.

---

## Setup Notes

- Docker Desktop was chosen as the local Kubernetes environment because it bundles both Docker and Kubernetes in a single install — the simplest setup on Windows.
- `kubectl` came bundled with Docker Desktop — no separate install needed.
- PowerShell's built-in `curl` alias conflicts with real curl. Use `curl.exe` in PowerShell to invoke the real curl binary.
- All tools are accessible from PowerShell without any PATH issues.

---

## Related Concepts

- [Concept 1 — CI/CD Artifact Flow](../docs/Readme[concept-1Anushka].md)
- [Concept 2 — Kubernetes Application Lifecycle](../docs/Readme[concept-2Anushka].md)
- [Concept 3 — CI/CD Pipeline Responsibilities](../docs/Readme[concept-3Anushka].md)
