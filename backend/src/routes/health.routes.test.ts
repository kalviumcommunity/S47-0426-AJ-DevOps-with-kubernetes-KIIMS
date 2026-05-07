import express from 'express';
import request from 'supertest';
import healthRoutes from './health.routes';
import { healthCheckService } from '../health/healthCheck.service';

jest.mock('../health/healthCheck.service', () => {
  const actual = jest.requireActual('../health/healthCheck.service');
  return {
    __esModule: true,
    ...actual,
    healthCheckService: {
      checkLiveness: jest.fn(),
      checkReadiness: jest.fn(),
    },
  };
});

describe('health routes', () => {
  const app = express();

  app.use('/health', healthRoutes);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 on /health/live with the HealthStatus payload', async () => {
    (healthCheckService.checkLiveness as jest.Mock).mockResolvedValue({
      status: 'healthy',
      timestamp: '2026-05-07T00:00:00.000Z',
      checks: { database: true, memory: true, disk: true },
      uptime: 12.5,
    });

    const response = await request(app).get('/health/live');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'healthy',
      timestamp: '2026-05-07T00:00:00.000Z',
      checks: { database: true, memory: true, disk: true },
      uptime: 12.5,
    });
  });

  it('returns 503 on /health/ready when the database is unavailable', async () => {
    (healthCheckService.checkReadiness as jest.Mock).mockResolvedValue({
      status: 'unhealthy',
      timestamp: '2026-05-07T00:00:00.000Z',
      checks: { database: false, memory: true, disk: true },
      uptime: 15,
    });

    const response = await request(app).get('/health/ready');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      status: 'unhealthy',
      timestamp: '2026-05-07T00:00:00.000Z',
      checks: { database: false, memory: true, disk: true },
      uptime: 15,
    });
  });

  it('returns the required HealthStatus fields from /health/ready when healthy', async () => {
    (healthCheckService.checkReadiness as jest.Mock).mockResolvedValue({
      status: 'healthy',
      timestamp: '2026-05-07T00:00:00.000Z',
      checks: { database: true, memory: false, disk: true },
      uptime: 20,
    });

    const response = await request(app).get('/health/ready');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'healthy',
        timestamp: expect.any(String),
        checks: expect.objectContaining({
          database: true,
          memory: expect.any(Boolean),
          disk: expect.any(Boolean),
        }),
        uptime: expect.any(Number),
      })
    );
  });
});