import express from 'express';
import request from 'supertest';
import { Types } from 'mongoose';
import { createAuthRoutes } from './auth.routes';

function buildAuthServiceMock() {
  return {
    register: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
  };
}

describe('auth routes', () => {
  it('registers a patient via POST /auth/register', async () => {
    const authService = buildAuthServiceMock();
    authService.register.mockResolvedValue({ _id: new Types.ObjectId(), email: 'jane@example.com' });

    const app = express();
    app.use(express.json());
    app.use('/auth', createAuthRoutes(authService as never));

    const response = await request(app).post('/auth/register').send({
      email: 'jane@example.com',
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      phone: '+12125551234',
    });

    expect(response.status).toBe(201);
    expect(response.body.patient.email).toBe('jane@example.com');
  });

  it('logs in a patient via POST /auth/login', async () => {
    const authService = buildAuthServiceMock();
    authService.login.mockResolvedValue({
      tokens: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600,
      },
      patient: { id: 'patient-1', email: 'jane@example.com' },
    });

    const app = express();
    app.use(express.json());
    app.use('/auth', createAuthRoutes(authService as never));

    const response = await request(app).post('/auth/login').send({
      email: 'jane@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(200);
    expect(response.body.tokens.accessToken).toBe('access-token');
  });

  it('logs out a patient via POST /auth/logout', async () => {
    const authService = buildAuthServiceMock();
    authService.logout.mockResolvedValue(undefined);

    const app = express();
    app.use(express.json());
    app.use('/auth', createAuthRoutes(authService as never));

    const response = await request(app).post('/auth/logout').set('Authorization', 'Bearer access-token');

    expect(response.status).toBe(200);
    expect(authService.logout).toHaveBeenCalledWith('access-token');
  });

  it('refreshes a token via POST /auth/refresh', async () => {
    const authService = buildAuthServiceMock();
    authService.refreshToken.mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: 'refresh-token',
      expiresIn: 3600,
    });

    const app = express();
    app.use(express.json());
    app.use('/auth', createAuthRoutes(authService as never));

    const response = await request(app).post('/auth/refresh').send({ refreshToken: 'refresh-token' });

    expect(response.status).toBe(200);
    expect(response.body.tokens.accessToken).toBe('new-access-token');
  });
});