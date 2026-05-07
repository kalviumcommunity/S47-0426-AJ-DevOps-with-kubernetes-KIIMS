import express from 'express';
import request from 'supertest';
import { errorHandler } from '../middleware/errorHandler';

const requireAuthMock = jest.fn((req: any, _res: any, next: any) => {
  req.user = { patientId: '507f1f77bcf86cd799439011', email: 'jane@example.com' };
  next();
});

jest.mock('../middleware/auth.middleware', () => ({
  __esModule: true,
  requireAuth: requireAuthMock,
}));

jest.mock('../appointments/appointment.controller', () => ({
  __esModule: true,
  createAppointmentController: () => ({
    getAvailableSlots: jest.fn(async (_req: any, res: any) => res.status(200).json({ slots: [] })),
    bookAppointment: jest.fn(async (_req: any, res: any) => res.status(201).json({ appointment: { status: 'scheduled' } })),
    getAppointments: jest.fn(async (_req: any, res: any) => res.status(200).json({ appointments: [] })),
    cancelAppointment: jest.fn(async (_req: any, res: any) => res.status(200).json({ appointment: { status: 'cancelled' } })),
  }),
}));

import appointmentRoutes from './appointment.routes';

describe('appointment routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/appointments', appointmentRoutes);
  app.use(errorHandler);

  it('returns slots for GET /appointments/slots', async () => {
    const response = await request(app).get('/appointments/slots').query({ date: '2026-05-07', specialty: 'Cardiology' });
    expect(response.status).toBe(200);
    expect(response.body.slots).toEqual([]);
  });

  it('books an appointment for POST /appointments', async () => {
    const response = await request(app).post('/appointments').send({
      doctorId: '507f1f77bcf86cd799439011',
      specialty: 'Cardiology',
      scheduledAt: '2026-05-07T12:00:00.000Z',
      duration: 30,
    });
    expect(response.status).toBe(201);
    expect(response.body.appointment.status).toBe('scheduled');
  });

  it('returns appointments for GET /appointments', async () => {
    const response = await request(app).get('/appointments');
    expect(response.status).toBe(200);
    expect(response.body.appointments).toEqual([]);
  });

  it('cancels an appointment for DELETE /appointments/:id', async () => {
    const response = await request(app).delete('/appointments/507f1f77bcf86cd799439011');
    expect(response.status).toBe(200);
    expect(response.body.appointment.status).toBe('cancelled');
  });
});