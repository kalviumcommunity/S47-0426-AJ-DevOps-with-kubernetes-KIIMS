import { Types } from 'mongoose';
import { AppError } from '../middleware/errorHandler';
import { DefaultAppointmentService } from './appointment.service';

function buildService() {
  const appointmentModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
  } as any;

  const service = new DefaultAppointmentService({
    appointmentModel,
    now: () => new Date('2026-05-07T10:00:00.000Z'),
  });

  return { service, appointmentModel };
}

describe('DefaultAppointmentService', () => {
  it('creates a scheduled appointment for valid input', async () => {
    const { service, appointmentModel } = buildService();
    appointmentModel.countDocuments.mockResolvedValue(0);
    appointmentModel.find.mockReturnValue({ lean: () => ({ exec: async () => [] }) });
    appointmentModel.findOne.mockReturnValue({ exec: async () => null });
    appointmentModel.create.mockResolvedValue({
      _id: new Types.ObjectId(),
      status: 'scheduled',
      patientId: new Types.ObjectId(),
      doctorId: new Types.ObjectId(),
      specialty: 'Cardiology',
      scheduledAt: new Date('2026-05-07T12:00:00.000Z'),
      duration: 30,
    });

    const appointment = await service.bookAppointment({
      patientId: new Types.ObjectId().toString(),
      doctorId: new Types.ObjectId().toString(),
      specialty: 'Cardiology',
      scheduledAt: new Date('2026-05-07T12:00:00.000Z'),
      duration: 30,
    });

    expect(appointment.status).toBe('scheduled');
    expect(appointmentModel.create).toHaveBeenCalled();
  });

  it('rejects past booking times', async () => {
    const { service } = buildService();

    await expect(service.bookAppointment({
      patientId: new Types.ObjectId().toString(),
      doctorId: new Types.ObjectId().toString(),
      specialty: 'Cardiology',
      scheduledAt: new Date('2026-05-07T09:00:00.000Z'),
      duration: 30,
    })).rejects.toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' } as Partial<AppError>);
  });

  it('rejects invalid durations', async () => {
    const { service } = buildService();

    await expect(service.bookAppointment({
      patientId: new Types.ObjectId().toString(),
      doctorId: new Types.ObjectId().toString(),
      specialty: 'Cardiology',
      scheduledAt: new Date('2026-05-07T12:00:00.000Z'),
      duration: 20,
    })).rejects.toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' } as Partial<AppError>);
  });

  it('rejects bookings beyond the daily limit', async () => {
    const { service, appointmentModel } = buildService();
    appointmentModel.countDocuments.mockResolvedValue(3);
    appointmentModel.find.mockReturnValue({ lean: () => ({ exec: async () => [] }) });
    appointmentModel.findOne.mockReturnValue({ exec: async () => null });

    await expect(service.bookAppointment({
      patientId: new Types.ObjectId().toString(),
      doctorId: new Types.ObjectId().toString(),
      specialty: 'Cardiology',
      scheduledAt: new Date('2026-05-07T12:00:00.000Z'),
      duration: 30,
    })).rejects.toMatchObject({ statusCode: 409, code: 'DAILY_LIMIT_EXCEEDED' } as Partial<AppError>);
  });

  it('rejects cancellation within 24 hours', async () => {
    const { service, appointmentModel } = buildService();
    appointmentModel.findById.mockReturnValue({
      exec: async () => ({
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        patientId: new Types.ObjectId('507f1f77bcf86cd799439011'),
        status: 'scheduled',
        scheduledAt: new Date('2026-05-08T09:00:00.000Z'),
        save: async () => undefined,
      }),
    });

    await expect(service.cancelAppointment('507f1f77bcf86cd799439011', '507f1f77bcf86cd799439011')).rejects.toMatchObject({
      statusCode: 422,
      code: 'CANCELLATION_WINDOW_EXPIRED',
    } as Partial<AppError>);
  });
});