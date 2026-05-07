import { NextFunction, Request, Response } from 'express';
import { AuthenticatedPatient, createDefaultAuthService } from '../auth/auth.service';
import { AppError } from './errorHandler';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedPatient;
    }
  }
}

const authService = createDefaultAuthService();

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authorizationHeader = req.header('authorization');

  if (!authorizationHeader?.startsWith('Bearer ')) {
    next(new AppError(401, 'UNAUTHORIZED', 'Missing or invalid Authorization header'));
    return;
  }

  const token = authorizationHeader.slice('Bearer '.length);

  try {
    req.user = await authService.verifyToken(token);
    next();
  } catch (error) {
    next(error);
  }
}