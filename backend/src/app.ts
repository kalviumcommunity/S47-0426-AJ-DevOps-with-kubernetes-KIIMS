import express, { Request, Response, Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import healthRoutes from './routes/health.routes';
import metricsRoutes from './routes/metrics.routes';
import { createAuthRoutes } from './routes/auth.routes';
import { createDefaultAuthService } from './auth/auth.service';
import patientRoutes from './routes/patient.routes';
import appointmentRoutes from './routes/appointment.routes';
import simpleRegistrarRoutes from './simpleRegistrar';

const app = express();

// Security headers
app.use(helmet());

// Cross-origin resource sharing
app.use(cors());

// JSON body parsing
app.use(express.json());

// Attach requestId and log each request
app.use(requestLogger);

const authService = createDefaultAuthService();
const authRoutes = createAuthRoutes(authService);

const apiRouter = Router();

// Authentication endpoints
apiRouter.use('/auth', authRoutes);

// Patient profile endpoints
apiRouter.use('/patients', patientRoutes);

// Appointment endpoints
apiRouter.use('/appointments', appointmentRoutes);

// Mount all routes under /api
app.use('/api', apiRouter);

// FALLBACK: Also allow /auth at the root level for compatibility
app.use('/auth', authRoutes);

// Health endpoints for Kubernetes probes
app.use('/health', healthRoutes);

// Prometheus metrics endpoint
app.use('/metrics', metricsRoutes);

// Placeholder health/root route
app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Error handler must be the last middleware registered
app.use(errorHandler);

export default app;
