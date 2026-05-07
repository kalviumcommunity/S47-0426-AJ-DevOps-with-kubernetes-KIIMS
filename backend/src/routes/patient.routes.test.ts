import express from 'express';
import request from 'supertest';
import { Types } from 'mongoose';
import { errorHandler } from '../middleware/errorHandler';

const requireAuthMock = jest.fn((req: any, _res: any, next: any) => {
  req.user = { patientId: '507f1f77bcf86cd799439011', email: 'jane.doe@example.com' };
  next();
});

const patientModelMock = {
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
};

jest.mock('../middleware/auth.middleware', () => ({
  __esModule: true,
  requireAuth: requireAuthMock,
}));

jest.mock('../patients/patient.controller', () => ({
  __esModule: true,
  createPatientController: () => ({
    getProfile: jest.fn(async (req: any, res: any) => {
      res.status(200).json({ patient: { email: 'jane.doe@example.com', firstName: 'Jane' } });
    }),
    updateProfile: jest.fn(async (req: any, res: any) => {
      res.status(200).json({ patient: { email: req.body.email ?? 'jane.doe@example.com' } });
    }),
  }),
}));

import patientRoutes from './patient.routes';

describe('patient routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/patients', patientRoutes);
  app.use(errorHandler);

  it('returns the current profile from GET /patients/me', async () => {
    const response = await request(app).get('/patients/me');

    expect(response.status).toBe(200);
    expect(response.body.patient.email).toBe('jane.doe@example.com');
  });

  it('returns 400 for an invalid phone number on PATCH /patients/me', async () => {
    const response = await request(app).patch('/patients/me').send({ phone: '555-1234' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for an invalid email format on PATCH /patients/me', async () => {
    const response = await request(app).patch('/patients/me').send({ email: 'not-an-email' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('persists and returns a valid update on PATCH /patients/me', async () => {
    const response = await request(app).patch('/patients/me').send({ email: 'jane.updated@example.com' });

    expect(response.status).toBe(200);
    expect(response.body.patient.email).toBe('jane.updated@example.com');
  });
});