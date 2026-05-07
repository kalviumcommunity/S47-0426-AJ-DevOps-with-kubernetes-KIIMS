import { Router, Request, Response } from 'express';
import { metricsCollector } from '../metrics/metrics';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const metrics = await metricsCollector.metricsText();
  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.status(200).send(metrics);
});

export default router;