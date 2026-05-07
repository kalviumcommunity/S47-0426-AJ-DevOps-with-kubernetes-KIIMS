import { NextFunction, Request, Response } from 'express';
import { Appointment } from '../models/appointment.model';
import { AppointmentBookingInput, AppointmentService, createAppointmentService } from './appointment.service';

export interface AppointmentControllerDependencies {
  appointmentService: AppointmentService;
}

function getPatientId(req: Request): string {
  const patientId = req.user?.patientId;
  if (!patientId) {
    throw new Error('Authentication required');
  }
  return patientId;
}

export function createAppointmentController(
  dependencies: AppointmentControllerDependencies = { appointmentService: createAppointmentService() }
) {
  return {
    async getAvailableSlots(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const date = new Date(String(req.query.date));
        const specialty = String(req.query.specialty ?? '');
        const slots = await dependencies.appointmentService.getAvailableSlots(date, specialty);
        res.status(200).json({ slots });
      } catch (error) {
        next(error);
      }
    },

    async bookAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const patientId = getPatientId(req);
        const input = req.body as AppointmentBookingInput;
        const appointment = await dependencies.appointmentService.bookAppointment({ ...input, patientId });
        res.status(201).json({ appointment });
      } catch (error) {
        next(error);
      }
    },

    async getAppointments(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const patientId = getPatientId(req);
        const appointments = await dependencies.appointmentService.getAppointments(patientId);
        res.status(200).json({ appointments });
      } catch (error) {
        next(error);
      }
    },

    async cancelAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const patientId = getPatientId(req);
        const appointment = await dependencies.appointmentService.cancelAppointment(patientId, req.params.id);
        res.status(200).json({ appointment });
      } catch (error) {
        next(error);
      }
    },
  };
}