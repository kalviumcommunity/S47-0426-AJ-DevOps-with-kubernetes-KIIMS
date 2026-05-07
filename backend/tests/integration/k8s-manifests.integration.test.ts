import fs from 'fs';
import path from 'path';
import { parseAllDocuments } from 'yaml';

const manifestPaths = [
  'k8s/backend-deployment.yaml',
  'k8s/frontend-deployment.yaml',
  'k8s/services.yaml',
  'k8s/ingress.yaml',
  'k8s/hpa.yaml',
  'k8s/secret.yaml',
];

function loadDocuments(filePath: string) {
  const absolutePath = path.resolve(__dirname, '../../../', filePath);
  const source = fs.readFileSync(absolutePath, 'utf8');
  const documents = parseAllDocuments(source);

  for (const document of documents) {
    if (document.errors.length > 0) {
      const message = document.errors.map((error) => error.message).join('; ');
      throw new Error(`${filePath} has YAML errors: ${message}`);
    }
  }

  return documents.map((document) => document.toJSON());
}

describe('kubernetes manifests', () => {
  it('parse as valid YAML', () => {
    for (const filePath of manifestPaths) {
      expect(() => loadDocuments(filePath)).not.toThrow();
    }
  });

  it('include the backend deployment probes, envFrom secret, and CPU limits', () => {
    const [backendDeployment] = loadDocuments('k8s/backend-deployment.yaml');

    expect(backendDeployment.kind).toBe('Deployment');
    expect(backendDeployment.metadata.name).toBe('patient-portal-backend');
    expect(backendDeployment.spec.replicas).toBe(2);
    expect(backendDeployment.spec.strategy.rollingUpdate.maxSurge).toBe(1);
    expect(backendDeployment.spec.strategy.rollingUpdate.maxUnavailable).toBe(0);

    const container = backendDeployment.spec.template.spec.containers[0];
    expect(container.envFrom[0].secretRef.name).toBe('patient-portal-secrets');
    expect(container.resources.limits.cpu).toBe('500m');
    expect(container.livenessProbe.httpGet.path).toBe('/health/live');
    expect(container.readinessProbe.httpGet.path).toBe('/health/ready');
  });

  it('define the HPA scaling bounds', () => {
    const [hpa] = loadDocuments('k8s/hpa.yaml');

    expect(hpa.kind).toBe('HorizontalPodAutoscaler');
    expect(hpa.spec.minReplicas).toBe(2);
    expect(hpa.spec.maxReplicas).toBe(10);
    expect(hpa.spec.metrics[0].resource.target.averageUtilization).toBe(70);
  });

  it('wire the backend secret reference and service names', () => {
    const [secret] = loadDocuments('k8s/secret.yaml');
    const serviceDocuments = loadDocuments('k8s/services.yaml');
    const [ingress] = loadDocuments('k8s/ingress.yaml');

    expect(secret.metadata.name).toBe('patient-portal-secrets');
    expect(secret.data).toHaveProperty('mongodb-uri');
    expect(secret.data).toHaveProperty('jwt-secret');
    expect(secret.data).toHaveProperty('session-secret');

    expect(serviceDocuments).toHaveLength(2);
    expect(serviceDocuments[0].metadata.name).toBe('patient-portal-backend');
    expect(serviceDocuments[1].metadata.name).toBe('patient-portal-frontend');

    const backendPath = ingress.spec.rules[0].http.paths.find((entry: { path: string }) => entry.path === '/api');
    const frontendPath = ingress.spec.rules[0].http.paths.find((entry: { path: string }) => entry.path === '/');

    expect(backendPath.backend.service.name).toBe('patient-portal-backend');
    expect(frontendPath.backend.service.name).toBe('patient-portal-frontend');
  });
});
