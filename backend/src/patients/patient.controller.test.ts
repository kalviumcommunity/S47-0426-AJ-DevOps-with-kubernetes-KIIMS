import { Types } from 'mongoose';
import { createPatientController } from './patient.controller';

function buildPatientModel() {
  return {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  } as any;
}

describe('patient controller', () => {
  it('returns the current profile', async () => {
    const patientModel = buildPatientModel();
    patientModel.findById.mockReturnValue({
      lean: () => ({
        exec: async () => ({
          _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
          email: 'jane.doe@example.com',
          firstName: 'Jane',
          lastName: 'Doe',
          dateOfBirth: new Date('1990-01-01'),
          phone: '+12125551234',
        }),
      }),
    });

    const controller = createPatientController({ patientModel });
    const req = { user: { patientId: '507f1f77bcf86cd799439011', email: 'jane.doe@example.com' } } as any;
    const json = jest.fn();
    const res = { status: jest.fn(() => ({ json })), json } as any;
    const next = jest.fn();

    await controller.getProfile(req, res, next);

    expect(patientModel.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
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
    const patientModel = buildPatientModel();
    patientModel.findByIdAndUpdate.mockReturnValue({
      lean: () => ({
        exec: async () => ({
          _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
          email: 'jane.updated@example.com',
          firstName: 'Jane',
          lastName: 'Doe',
          dateOfBirth: new Date('1990-01-01'),
          phone: '+12125551234',
        }),
      }),
    });

    const controller = createPatientController({ patientModel });
    const req = {
      user: { patientId: '507f1f77bcf86cd799439011', email: 'jane.doe@example.com' },
      body: { email: 'jane.updated@example.com' },
    } as any;
    const json = jest.fn();
    const res = { status: jest.fn(() => ({ json })), json } as any;
    const next = jest.fn();

    await controller.updateProfile(req, res, next);

    expect(patientModel.findByIdAndUpdate).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      { email: 'jane.updated@example.com' },
      expect.objectContaining({ new: true, runValidators: true })
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