import { Router } from 'express';
import { createAppointmentController } from '../appointments/appointment.controller';
import { appointmentBookingSchema } from '../appointments/appointment.validation';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';

export function createAppointmentRoutes() {
  const router = Router();
  const controller = createAppointmentController();

  router.get('/slots', requireAuth, controller.getAvailableSlots);
  router.post('/', requireAuth, validate(appointmentBookingSchema), controller.bookAppointment);
  router.get('/', requireAuth, controller.getAppointments);
  router.delete('/:id', requireAuth, controller.cancelAppointment);

  return router;
}

export default createAppointmentRoutes();