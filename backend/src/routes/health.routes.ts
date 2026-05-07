import { Router, Request, Response } from 'express';
import { healthCheckService } from '../health/healthCheck.service';

const router = Router();

router.get('/live', async (_req: Request, res: Response) => {
  const health = await healthCheckService.checkLiveness();
  res.status(200).json(health);
});

router.get('/ready', async (_req: Request, res: Response) => {
  const health = await healthCheckService.checkReadiness();
  res.status(health.checks.database ? 200 : 503).json(health);
});

export default router;