import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import { AuthService } from '../auth/auth.service';
import { AppError } from '../middleware/errorHandler';
import { validate } from '../middleware/validate';

export function createAuthRoutes(authService: AuthService): Router {
  const router = Router();

  const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    dateOfBirth: z.coerce.date(),
    phone: z.string().regex(/^\+[1-9]\d{1,14}$/),
  });

  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  const refreshSchema = z.object({
    refreshToken: z.string().min(1),
  });

  router.post('/register', validate(registerSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patient = await authService.register(req.body);
      res.status(201).json({ patient });
    } catch (error) {
      next(error);
    }
  });

  router.post('/login', validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authResponse = await authService.login(req.body);
      res.status(200).json(authResponse);
    } catch (error) {
      next(error);
    }
  });

  router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.body.token ?? req.header('authorization')?.replace(/^Bearer\s+/i, '');
      if (!token) {
        throw new AppError(400, 'BAD_REQUEST', 'Token is required for logout');
      }

      await authService.logout(token);
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  });

  router.post('/refresh', validate(refreshSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokens = await authService.refreshToken(req.body.refreshToken);
      res.status(200).json({ tokens });
    } catch (error) {
      next(error);
    }
  });

  return router;
}