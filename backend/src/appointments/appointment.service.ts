import { Types } from 'mongoose';
import { AppError } from '../middleware/errorHandler';
import { Appointment, AppointmentDocument, AppointmentStatus } from '../models/appointment.model';

export interface AppointmentSlot {
  doctorId: string;
  specialty: string;
  startTime: Date;
  endTime: Date;
  available: boolean;
}

export interface AppointmentBookingInput {
  patientId: string;
  doctorId: string;
  specialty: string;
  scheduledAt: Date;
  duration: number;
  notes?: string;
}

export interface AppointmentServiceDependencies {
  appointmentModel: typeof Appointment;
  now(): Date;
}

export interface AppointmentService {
  getAvailableSlots(date: Date, specialty: string): Promise<AppointmentSlot[]>;
  bookAppointment(input: AppointmentBookingInput): Promise<AppointmentDocument>;
  getAppointments(patientId: string): Promise<AppointmentDocument[]>;
  cancelAppointment(patientId: string, appointmentId: string): Promise<AppointmentDocument>;
}

const DEFAULT_SLOT_MINUTES = [15, 30, 45, 60];

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function overlaps(startA: Date, durationA: number, startB: Date, durationB: number): boolean {
  const endA = addMinutes(startA, durationA);
  const endB = addMinutes(startB, durationB);
  return startA < endB && startB < endA;
}

export class DefaultAppointmentService implements AppointmentService {
  constructor(private readonly dependencies: AppointmentServiceDependencies) {}

  async getAvailableSlots(date: Date, specialty: string): Promise<AppointmentSlot[]> {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    const appointments = await this.dependencies.appointmentModel
      .find({ specialty, status: 'scheduled', scheduledAt: { $gte: dayStart, $lte: dayEnd } })
      .lean()
      .exec();

    const slots: AppointmentSlot[] = [];
    const baseSlotTimes = [9, 10, 11, 13, 14, 15, 16];

    for (const hour of baseSlotTimes) {
      const startTime = new Date(dayStart);
      startTime.setHours(hour, 0, 0, 0);

      for (const duration of DEFAULT_SLOT_MINUTES) {
        const existingConflict = appointments.some((appointment) =>
          overlaps(startTime, duration, new Date(appointment.scheduledAt), appointment.duration)
        );

        slots.push({
          doctorId: '',
          specialty,
          startTime,
          endTime: addMinutes(startTime, duration),
          available: !existingConflict,
        });
      }
    }

    return slots;
  }

  async bookAppointment(input: AppointmentBookingInput): Promise<AppointmentDocument> {
    if (!DEFAULT_SLOT_MINUTES.includes(input.duration)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Duration must be one of 15, 30, 45, 60 minutes');
    }

    if (input.scheduledAt <= this.dependencies.now()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'scheduledAt must be in the future');
    }

    const [patientDayAppointments, doctorConflicts, sameSlot] = await Promise.all([
      this.dependencies.appointmentModel.countDocuments({
        patientId: new Types.ObjectId(input.patientId),
        scheduledAt: { $gte: startOfDay(input.scheduledAt), $lte: endOfDay(input.scheduledAt) },
        status: 'scheduled',
      }),
      this.dependencies.appointmentModel.find({
        doctorId: new Types.ObjectId(input.doctorId),
        status: 'scheduled',
      }).lean().exec(),
      this.dependencies.appointmentModel.findOne({
        doctorId: new Types.ObjectId(input.doctorId),
        scheduledAt: input.scheduledAt,
        status: 'scheduled',
      }).exec(),
    ]);

    if (patientDayAppointments >= 3) {
      throw new AppError(409, 'DAILY_LIMIT_EXCEEDED', 'Patient cannot book more than 3 appointments per day');
    }

    if (sameSlot) {
      throw new AppError(409, 'APPOINTMENT_CONFLICT', 'This time slot is already booked');
    }

    const overlapsWithDoctor = doctorConflicts.some((appointment) =>
      overlaps(input.scheduledAt, input.duration, new Date(appointment.scheduledAt), appointment.duration)
    );

    if (overlapsWithDoctor) {
      throw new AppError(409, 'APPOINTMENT_CONFLICT', 'Appointment overlaps with an existing appointment for the same doctor');
    }

    return this.dependencies.appointmentModel.create({
      patientId: new Types.ObjectId(input.patientId),
      doctorId: new Types.ObjectId(input.doctorId),
      specialty: input.specialty,
      scheduledAt: input.scheduledAt,
      duration: input.duration,
      status: 'scheduled' as AppointmentStatus,
      notes: input.notes,
    });
  }

  async getAppointments(patientId: string): Promise<AppointmentDocument[]> {
    return this.dependencies.appointmentModel
      .find({ patientId: new Types.ObjectId(patientId) })
      .sort({ scheduledAt: -1 })
      .exec();
  }

  async cancelAppointment(patientId: string, appointmentId: string): Promise<AppointmentDocument> {
    const appointment = await this.dependencies.appointmentModel.findById(appointmentId).exec();

    if (!appointment) {
      throw new AppError(404, 'APPOINTMENT_NOT_FOUND', 'Appointment not found');
    }

    if (appointment.patientId.toString() !== patientId) {
      throw new AppError(403, 'FORBIDDEN', 'You can only cancel your own appointments');
    }

    if (appointment.status === 'cancelled' || appointment.status === 'completed') {
      throw new AppError(422, 'INVALID_APPOINTMENT_STATE', 'Appointment is already cancelled or completed');
    }

    const hoursUntilAppointment = (appointment.scheduledAt.getTime() - this.dependencies.now().getTime()) / 3_600_000;
    if (hoursUntilAppointment < 24) {
      throw new AppError(422, 'CANCELLATION_WINDOW_EXPIRED', 'Appointments must be cancelled at least 24 hours in advance');
    }

    appointment.status = 'cancelled';
    return appointment.save();
  }
}

export function createAppointmentService(dependencies: AppointmentServiceDependencies = {
  appointmentModel: Appointment,
  now: () => new Date(),
}): AppointmentService {
  return new DefaultAppointmentService(dependencies);
}