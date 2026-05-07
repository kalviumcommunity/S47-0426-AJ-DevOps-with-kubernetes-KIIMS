# Managing Kubernetes Configuration and Secrets

This document explains how the Patient Portal application manages environment-specific configurations and sensitive data using Kubernetes-native mechanisms.

## 1. ConfigMaps vs. Secrets

We distinguish between non-sensitive configuration and sensitive data:

| Feature | ConfigMap | Secret |
|---------|-----------|--------|
| **Purpose** | Non-sensitive settings (URLs, log levels, ports) | Sensitive data (passwords, keys, tokens) |
| **Storage** | Plain text in etcd | Base64 encoded in etcd (and can be encrypted at rest) |
| **Usage** | Environment variables, command-line arguments, or config files in a volume | Environment variables or files in a volume |

## 2. Implementation in KIIMS

### ConfigMap: `patient-portal-config`

The `k8s/configmap.yaml` file defines shared configurations used by both the frontend and backend.

- **`PORT`**: The port the backend server listens on (e.g., `8080`).
- **`LOG_LEVEL`**: Controls the verbosity of application logs (`info`, `debug`, `error`).
- **`BACKEND_URL`**: Used by services to discover the backend.
- **`NODE_ENV`**: Sets the runtime environment (e.g., `production`).
- **`SIMPLE_REGISTRAR`**: Enables/disables the in-memory registrar for development (`true`/`false`).

### Secret: `patient-portal-secrets`

The `k8s/secret.yaml` file handles sensitive information. Values are base64-encoded.

- **`MONGODB_URI`**: Connection string for the database.
- **`JWT_SECRET`**: Secret key for signing JSON Web Tokens.
- **`SESSION_SECRET`**: Secret key for session management.

> [!WARNING]
> Never commit real secrets to version control. The provided `k8s/secret.yaml` contains placeholder values that must be replaced during deployment using a secure CI/CD pipeline or manual injection.

## 3. Injecting Configuration

We use the `envFrom` field in our Deployment manifests to inject all key-value pairs from a ConfigMap or Secret as environment variables into the container.

### Example: Backend Deployment

```yaml
spec:
  template:
    spec:
      containers:
        - name: patient-portal-backend
          envFrom:
            - configMapRef:
                name: patient-portal-config
            - secretRef:
                name: patient-portal-secrets
```

This approach allows the application to remain **unaware** of where the configuration comes from, following the **12-Factor App** methodology for backing services and configuration.

## 4. Why This Matters

1. **Immutability**: We build the container image once and run it anywhere. We don't need to change the code or rebuild the image to change the database URL or log level.
2. **Security**: Secrets are kept separate from the application code and deployment manifests, reducing the risk of accidental exposure.
3. **Flexibility**: We can update a ConfigMap or Secret and trigger a rolling update of the deployment to pick up the new values without changing the application logic.
