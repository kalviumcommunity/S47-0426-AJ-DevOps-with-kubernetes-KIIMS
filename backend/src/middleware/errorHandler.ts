import { Request, Response, NextFunction } from 'express';
import logger from '../logger/logger';

/**
 * Custom application error class.
 *
 * Extend this class to create domain-specific errors that carry an HTTP
 * status code and a machine-readable error code.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: object;

  constructor(statusCode: number, code: string, message: string, details?: object) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    // Restore prototype chain (required when extending built-ins in TypeScript)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Standard error response shape returned by the API.
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: object;
  };
}

/**
 * Express error-handling middleware (4-argument signature).
 *
 * Must be registered AFTER all routes and other middleware so that errors
 * thrown or passed via next(err) are caught here.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const requestId: string = (res.locals.requestId as string) ?? 'unknown';

  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  const details = (err as AppError).details;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
  }

  logger.error('Unhandled application error', {
    requestId,
    endpoint: req.originalUrl ?? req.path,
    errorMessage: err.message,
    stack: err.stack,
    statusCode,
    errorCode: code,
  });

  const body: ErrorResponse = {
    error: {
      code,
      message: err.message,
      requestId,
      ...(details !== undefined ? { details } : {}),
    },
  };

  res.status(statusCode).json(body);
}
