import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { AppError } from '../middleware/errorHandler';
import { DefaultAuthService } from './auth.service';

async function buildService() {
  const patientId = new Types.ObjectId();
  const passwordHash = await bcrypt.hash('password123', 12);
  const patient = {
    _id: patientId,
    email: 'jane.doe@example.com',
    passwordHash,
    firstName: 'Jane',
    lastName: 'Doe',
    dateOfBirth: new Date('1990-01-01'),
    phone: '+12125551234',
  };

  const patientModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
  } as any;

  const sessionModel = {
    create: jest.fn(),
    countDocuments: jest.fn(),
    deleteOne: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
  } as any;

  const service = new DefaultAuthService({
    patientModel,
    sessionModel,
    bcryptLib: bcrypt as any,
    jwtLib: jwt as any,
    jwtSecret: 'test-jwt-secret',
    sessionSecret: 'test-session-secret',
    maxConcurrentSessions: 5,
    sessionDurationSeconds: 3600,
  } as any);

  return { service, patientModel, sessionModel, patient };
}

describe('DefaultAuthService', () => {
  it('hashes passwords on register', async () => {
    const { service, patientModel } = await buildService();
    patientModel.create.mockResolvedValue({ _id: new Types.ObjectId(), email: 'jane@example.com' });

    await service.register({
      email: 'jane@example.com',
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Doe',
      dateOfBirth: new Date('1990-01-01'),
      phone: '+12125551234',
    });

    expect(patientModel.create).toHaveBeenCalledWith(expect.objectContaining({
      passwordHash: expect.stringMatching(/^\$2[aby]\$12\$/),
    }));
  });

  it('returns signed tokens for valid credentials', async () => {
    const { service, patientModel, sessionModel, patient } = await buildService();
    patientModel.findOne.mockResolvedValue(patient);
    sessionModel.countDocuments.mockResolvedValue(0);
    sessionModel.create.mockResolvedValue({});

    const response = await service.login({
      email: patient.email,
      password: 'password123',
    });

    expect(response.tokens.accessToken).toBeTruthy();
    expect(response.tokens.refreshToken).toBeTruthy();
    expect(sessionModel.create).toHaveBeenCalled();
  });

  it('rejects invalid credentials with 401', async () => {
    const { service, patientModel } = await buildService();
    patientModel.findOne.mockResolvedValue(null);

    await expect(service.login({ email: 'missing@example.com', password: 'password123' })).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    } as Partial<AppError>);
  });

  it('enforces the 5-session limit', async () => {
    const { service, patientModel, sessionModel, patient } = await buildService();
    patientModel.findOne.mockResolvedValue(patient);
    sessionModel.countDocuments.mockResolvedValue(5);

    await expect(service.login({ email: patient.email, password: 'password123' })).rejects.toMatchObject({
      statusCode: 409,
      code: 'SESSION_LIMIT_EXCEEDED',
    } as Partial<AppError>);
  });

  it('invalidates a session on logout', async () => {
    const { service, sessionModel } = await buildService();

    await service.logout('access-token');

    expect(sessionModel.deleteOne).toHaveBeenCalledWith({ token: 'access-token' });
  });

  it('verifies signed JWTs', async () => {
    const { service } = await buildService();
    const token = jwt.sign({ patientId: 'abc', email: 'jane@example.com' }, 'test-jwt-secret');

    await expect(service.verifyToken(token)).resolves.toEqual(
      expect.objectContaining({ patientId: 'abc', email: 'jane@example.com' })
    );
  });

  it('issues a new access token on refresh', async () => {
    const { service, patientModel, sessionModel, patient } = await buildService();
    patientModel.findById.mockResolvedValue(patient);
    sessionModel.findOne.mockResolvedValue({
      _id: new Types.ObjectId(),
      patientId: patient._id,
      refreshToken: 'refresh-token',
    });
    sessionModel.updateOne.mockResolvedValue({});

    const tokens = await service.refreshToken('refresh-token');

    expect(tokens.accessToken).toBeTruthy();
    expect(sessionModel.updateOne).toHaveBeenCalled();
  });
});