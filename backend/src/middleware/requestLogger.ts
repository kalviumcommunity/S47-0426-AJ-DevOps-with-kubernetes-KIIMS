import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';
import logger from '../logger/logger';
import { metricsCollector } from '../metrics/metrics';

/**
 * Request logging middleware.
 *
 * Assigns a unique UUID requestId to each incoming request, attaches it to
 * res.locals.requestId and req.headers['x-request-id'] for downstream
 * propagation, then logs method, path, status, and duration on response finish.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = uuidv4();

  // Attach to res.locals so other middleware and handlers can reference it
  res.locals.requestId = requestId;

  // Propagate downstream (e.g. to outgoing fetch/axios calls)
  req.headers['x-request-id'] = requestId;

  const startTime = Date.now();

  metricsCollector.incrementActiveConnections();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    metricsCollector.decrementActiveConnections();
    metricsCollector.recordRequest(req.path, req.method, res.statusCode, duration);
    logger.info('HTTP request completed', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration,
    });
  });

  next();
}
