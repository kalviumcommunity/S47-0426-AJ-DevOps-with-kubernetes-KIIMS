import express from 'express';
import request from 'supertest';
import metricsRoutes from './metrics.routes';
import { metricsCollector } from '../metrics/metrics';

jest.mock('../metrics/metrics', () => ({
  __esModule: true,
  metricsCollector: {
    metricsText: jest.fn(),
  },
}));

describe('metrics routes', () => {
  const app = express();

  app.use('/metrics', metricsRoutes);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns Prometheus text format output', async () => {
    (metricsCollector.metricsText as jest.Mock).mockResolvedValue('# HELP example\n# TYPE example counter\nexample 1\n');

    const response = await request(app).get('/metrics');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.text).toContain('example 1');
  });
});