import { z } from 'zod';
import { VALID_DURATIONS, VALID_SPECIALTIES } from '../models/appointment.model';

const futureDateSchema = z.coerce.date().refine((value) => value > new Date(), {
  message: 'scheduledAt must be in the future',
});

export const appointmentBookingSchema = z.object({
  doctorId: z.string().min(1, 'Doctor ID is required'),
  specialty: z.enum(VALID_SPECIALTIES),
  scheduledAt: futureDateSchema,
  duration: z.number().refine((value) => VALID_DURATIONS.includes(value as never), {
    message: 'Duration must be one of 15, 30, 45, 60 minutes',
  }),
  notes: z.string().optional(),
});

export const appointmentCancellationSchema = z.object({
  appointmentId: z.string().min(1, 'Appointment ID is required'),
});

export type AppointmentBookingInput = z.infer<typeof appointmentBookingSchema>;