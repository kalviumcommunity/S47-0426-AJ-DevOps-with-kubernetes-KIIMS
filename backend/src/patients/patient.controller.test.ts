import { Types } from 'mongoose';
import { createPatientController } from './patient.controller';

function buildAuthService() {
  return {
    getPatientById: jest.fn(),
    updatePatient: jest.fn(),
  } as any;
}

describe('patient controller', () => {
  it('returns the current profile', async () => {
    const authService = buildAuthService();
    authService.getPatientById.mockResolvedValue({
      _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
      email: 'jane.doe@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      dateOfBirth: new Date('1990-01-01'),
      phone: '+12125551234',
    });

    const controller = createPatientController({ authService });
    const req = { user: { patientId: '507f1f77bcf86cd799439011', email: 'jane.doe@example.com' } } as any;
    const json = jest.fn();
    const res = { status: jest.fn(() => ({ json })), json } as any;
    const next = jest.fn();

    await controller.getProfile(req, res, next);

    expect(authService.getPatientById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      patient: expect.objectContaining({
        email: 'jane.doe@example.com',
        firstName: 'Jane',
      }),
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('updates and returns the profile', async () => {
    const authService = buildAuthService();
    authService.updatePatient.mockResolvedValue({
      _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
      email: 'jane.updated@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      dateOfBirth: new Date('1990-01-01'),
      phone: '+12125551234',
    });

    const controller = createPatientController({ authService });
    const req = {
      user: { patientId: '507f1f77bcf86cd799439011', email: 'jane.doe@example.com' },
      body: { email: 'jane.updated@example.com' },
    } as any;
    const json = jest.fn();
    const res = { status: jest.fn(() => ({ json })), json } as any;
    const next = jest.fn();

    await controller.updateProfile(req, res, next);

    expect(authService.updatePatient).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      { email: 'jane.updated@example.com' }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      patient: expect.objectContaining({
        email: 'jane.updated@example.com',
      }),
    }));
    expect(next).not.toHaveBeenCalled();
  });
});