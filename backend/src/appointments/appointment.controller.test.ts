import { Types } from 'mongoose';
import { createAppointmentController } from './appointment.controller';

function buildAppointmentService() {
  return {
    getAvailableSlots: jest.fn(),
    bookAppointment: jest.fn(),
    getAppointments: jest.fn(),
    cancelAppointment: jest.fn(),
  } as any;
}

describe('appointment controller', () => {
  it('books an appointment for the authenticated patient', async () => {
    const appointmentService = buildAppointmentService();
    appointmentService.bookAppointment.mockResolvedValue({
      _id: new Types.ObjectId(),
      status: 'scheduled',
    });

    const controller = createAppointmentController({ appointmentService });
    const req = {
      user: { patientId: '507f1f77bcf86cd799439011', email: 'jane@example.com' },
      body: {
        doctorId: new Types.ObjectId().toString(),
        specialty: 'Cardiology',
        scheduledAt: new Date('2026-05-07T12:00:00.000Z'),
        duration: 30,
      },
    } as any;
    const json = jest.fn();
    const res = { status: jest.fn(() => ({ json })), json } as any;
    const next = jest.fn();

    await controller.bookAppointment(req, res, next);

    expect(appointmentService.bookAppointment).toHaveBeenCalledWith(expect.objectContaining({ patientId: '507f1f77bcf86cd799439011' }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ appointment: expect.objectContaining({ status: 'scheduled' }) }));
  });
});