import express, { Request, Response } from 'express';
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

const app = express();

// Security headers
app.use(helmet());

// Cross-origin resource sharing
app.use(cors());

// JSON body parsing
app.use(express.json());

// Attach requestId and log each request
app.use(requestLogger);

// Health endpoints for Kubernetes probes
app.use('/health', healthRoutes);

// Prometheus metrics endpoint
app.use('/metrics', metricsRoutes);

// Authentication endpoints
app.use('/auth', createAuthRoutes(createDefaultAuthService()));

// Patient profile endpoints
app.use('/patients', patientRoutes);

// Appointment endpoints
app.use('/appointments', appointmentRoutes);

// Placeholder health/root route
app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Error handler must be the last middleware registered
app.use(errorHandler);

export default app;
