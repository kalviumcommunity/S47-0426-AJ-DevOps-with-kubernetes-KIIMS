import { DefaultHealthCheckService } from './healthCheck.service';

describe('HealthCheckService', () => {
  it('returns a healthy liveness status when the process is running', async () => {
    const service = new DefaultHealthCheckService(() => true);

    const health = await service.checkLiveness();

    expect(health).toEqual(
      expect.objectContaining({
        status: expect.stringMatching(/healthy|degraded/),
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        checks: {
          database: true,
          memory: expect.any(Boolean),
          disk: expect.any(Boolean),
        },
      })
    );
  });

  it('returns unhealthy readiness status when the database is disconnected', async () => {
    const service = new DefaultHealthCheckService(() => false);

    const health = await service.checkReadiness();

    expect(health.status).toBe('unhealthy');
    expect(health.checks.database).toBe(false);
    expect(health).toEqual(
      expect.objectContaining({
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        checks: expect.objectContaining({
          database: false,
          memory: expect.any(Boolean),
          disk: expect.any(Boolean),
        }),
      })
    );
  });
});