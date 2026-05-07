import { Router } from 'express';
import { createPatientController } from '../patients/patient.controller';
import { patientUpdateSchema } from '../patients/patient.validation';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth.middleware';

export function createPatientRoutes() {
  const router = Router();
  const controller = createPatientController();

  router.get('/me', requireAuth, controller.getProfile);
  router.patch('/me', requireAuth, validate(patientUpdateSchema), controller.updateProfile);

  return router;
}

export default createPatientRoutes();