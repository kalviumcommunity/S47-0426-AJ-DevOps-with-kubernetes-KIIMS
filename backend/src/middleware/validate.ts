import { ZodError, ZodTypeAny } from 'zod';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError } from './errorHandler';

/**
 * Middleware factory that validates req.body against a Zod schema.
 *
 * On success the request continues to the next handler.
 * On failure an AppError with status 400 and code VALIDATION_ERROR is passed
 * to the error handler, with field-level details derived from the Zod issues.
 */
export function validate(schema: ZodTypeAny): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (result.success) {
      // Replace req.body with the parsed (and potentially coerced) value
      req.body = result.data;
      next();
      return;
    }

    const zodError: ZodError = result.error;

    // Build a field-level error map from Zod issues
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of zodError.issues) {
      const field = issue.path.join('.') || '_root';
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field].push(issue.message);
    }

    next(
      new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', {
        fields: fieldErrors,
      })
    );
  };
}
