# Hospital Patient Portal

A full-stack web application that allows patients to manage their profiles, book appointments, and interact with healthcare services. Built with a React frontend, Express/TypeScript backend, MongoDB, and deployed on Kubernetes.

---

## Overview

The Hospital Patient Portal provides patients with a secure, self-service interface to:

- Register and authenticate with JWT-based sessions
- View and update their personal profile
- Browse available appointment slots by specialty
- Book, view, and cancel appointments
- Receive real-time feedback on booking conflicts and business rule violations

---

## Architecture

```
hospital-patient-portal/
├── frontend/          # React + Vite + TypeScript + Tailwind CSS
├── backend/           # Express + TypeScript + Mongoose
├── k8s/               # Kubernetes manifests
└── README.md
```

**Frontend:** React SPA served via Nginx, communicates with the backend over HTTPS.

**Backend:** RESTful Express API with JWT authentication, Mongoose ODM, Winston structured logging, and Prometheus metrics.

**Database:** MongoDB, accessed via a Kubernetes Secret-injected connection URI.

**Infrastructure:** Kubernetes Deployments with rolling updates, HPA for autoscaling, and an Ingress for HTTPS routing.

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env   # fill in MONGODB_URI, JWT_SECRET, SESSION_SECRET
npm run dev
```

The backend starts on `http://localhost:3001` by default.

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend starts on `http://localhost:5173` by default.

---

## Environment Variables

The backend requires the following environment variables:

| Variable         | Description                              |
|------------------|------------------------------------------|
| `MONGODB_URI`    | MongoDB connection string                |
| `JWT_SECRET`     | Secret key for signing JWTs             |
| `SESSION_SECRET` | Secret key for session management        |
| `PORT`           | HTTP port (default: `3001`)              |
| `LOG_LEVEL`      | Winston log level (default: `info`)      |

Set these in a `backend/.env` file for local development. In Kubernetes, they are injected from the `patient-portal-secrets` Secret.

---

## Kubernetes Deployment

Manifests are located in the `k8s/` directory.

```bash
# Apply all manifests
kubectl apply -f k8s/

# Check rollout status
kubectl rollout status deployment/patient-portal-backend
kubectl rollout status deployment/patient-portal-frontend
```

Key resources:

| File                        | Description                                      |
|-----------------------------|--------------------------------------------------|
| `k8s/secret.yaml`           | MongoDB URI, JWT secret, session secret          |
| `k8s/backend-deployment.yaml` | Backend Deployment (2 replicas, rolling update) |
| `k8s/frontend-deployment.yaml` | Frontend Deployment (Nginx)                   |
| `k8s/hpa.yaml`              | HPA: 2–10 replicas at 70% CPU utilization        |
| `k8s/services.yaml`         | ClusterIP Services for frontend and backend      |
| `k8s/ingress.yaml`          | HTTPS Ingress routing                            |

---

## Documentation

- [Kubernetes Workloads & Desired State](docs/K8S_WORKLOADS.md)
- [Kubernetes Services & Networking](docs/K8S_SERVICES.md)
- [Kubernetes Architecture](docs/K8S_ARCHITECTURE.md)
- [Kubernetes Configuration & Secrets](docs/K8S_CONFIG_SECRETS.md)
