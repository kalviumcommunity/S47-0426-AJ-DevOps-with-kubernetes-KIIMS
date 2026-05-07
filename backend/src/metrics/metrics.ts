import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

export interface MetricsCollector {
  recordRequest(endpoint: string, method: string, statusCode: number, durationMs: number): void;
  incrementActiveConnections(): void;
  decrementActiveConnections(): void;
  metricsText(): Promise<string>;
}

export class PrometheusMetricsCollector implements MetricsCollector {
  private readonly registry: Registry;
  private readonly requestCount: Counter<string>;
  private readonly requestLatency: Histogram<string>;
  private readonly activeConnections: Gauge<string>;

  constructor(registry: Registry = new Registry()) {
    this.registry = registry;

    collectDefaultMetrics({ register: this.registry });

    this.requestCount = new Counter({
      name: 'patient_portal_http_requests_total',
      help: 'Total number of HTTP requests processed by the backend',
      labelNames: ['endpoint', 'method', 'status_code'],
      registers: [this.registry],
    });

    this.requestLatency = new Histogram({
      name: 'patient_portal_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['endpoint', 'method', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });

    this.activeConnections = new Gauge({
      name: 'patient_portal_http_active_connections',
      help: 'Current number of in-flight HTTP requests',
      registers: [this.registry],
    });
  }

  recordRequest(endpoint: string, method: string, statusCode: number, durationMs: number): void {
    const labels = {
      endpoint,
      method,
      status_code: String(statusCode),
    };

    this.requestCount.inc(labels);
    this.requestLatency.observe(labels, durationMs / 1000);
  }

  incrementActiveConnections(): void {
    this.activeConnections.inc();
  }

  decrementActiveConnections(): void {
    this.activeConnections.dec();
  }

  async metricsText(): Promise<string> {
    return this.registry.metrics();
  }
}

export const metricsCollector = new PrometheusMetricsCollector();