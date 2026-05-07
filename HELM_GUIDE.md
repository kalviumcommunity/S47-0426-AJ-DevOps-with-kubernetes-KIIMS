# Helm User Guide: Managing the Patient Portal

This guide explains how to use Helm to manage the Patient Portal application, and why Helm is a significant improvement over individual Kubernetes manifests.

## Why Helm?

Helm simplifies Kubernetes management in several key ways:

1.  **Parametrization (DRY Principle):** Instead of duplicating values (like image tags, environment names, or replica counts) across multiple YAML files, you define them once in `values.yaml`.
2.  **Release Management:** Helm tracks your application as a "release". You can see the history of your deployments, upgrade them with a single command, and roll back to previous versions easily if something goes wrong.
3.  **Template Engine:** Helm uses the Go template engine, allowing you to use logic (if/else, ranges, functions) to dynamically generate your manifests based on the environment (e.g., dev vs. prod).
4.  **Package Sharing:** Charts can be packaged, versioned, and shared via Helm repositories, making it easy to distribute and reuse complex application stacks.

---

## Getting Started

### 1. Initialize Helm
Helm 3+ is already initialized by default. No `helm init` is required. You can verify your installation with:
```powershell
helm version
```

### 2. Install the Application
To install the Patient Portal for the first time:
```powershell
helm install patient-portal ./helm/patient-portal
```

### 3. Upgrade the Application
If you change `values.yaml` or any template, apply the changes with:
```powershell
helm upgrade patient-portal ./helm/patient-portal
```
To override a value without editing the file (e.g., a new image tag in CI):
```powershell
helm upgrade patient-portal ./helm/patient-portal --set image.tag=v2.0.0
```

### 4. Rollback
If a deployment fails, roll back to the previous stable version:
```powershell
helm rollback patient-portal 1
```
(Where `1` is the revision number).

### 5. Check Status and History
```powershell
# List all releases
helm list

# Check the history of a release
helm history patient-portal

# Get details about the current release
helm status patient-portal
```

### 6. Uninstall
To remove all components of the application:
```powershell
helm uninstall patient-portal
```

---

## Key Files in this Chart

- `Chart.yaml`: Metadata about the chart.
- `values.yaml`: Default configuration values.
- `templates/`: Parametrized Kubernetes manifests.
