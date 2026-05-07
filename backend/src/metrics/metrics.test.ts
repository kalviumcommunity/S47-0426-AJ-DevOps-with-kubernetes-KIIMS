import { Registry } from 'prom-client';
import { PrometheusMetricsCollector } from './metrics';

describe('PrometheusMetricsCollector', () => {
  it('exports counters, histogram, and gauge in Prometheus text format', async () => {
    const collector = new PrometheusMetricsCollector(new Registry());

    collector.incrementActiveConnections();
    collector.recordRequest('/appointments', 'GET', 200, 125);
    collector.decrementActiveConnections();

    const output = await collector.metricsText();

    expect(output).toContain('patient_portal_http_requests_total');
    expect(output).toContain('patient_portal_http_request_duration_seconds');
    expect(output).toContain('patient_portal_http_active_connections');
    expect(output).toContain('endpoint="/appointments"');
    expect(output).toContain('method="GET"');
    expect(output).toContain('status_code="200"');
  });
});