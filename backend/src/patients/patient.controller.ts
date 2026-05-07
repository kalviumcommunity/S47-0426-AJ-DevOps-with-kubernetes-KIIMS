import { Request, Response, NextFunction } from 'express';
import { Patient } from '../models/patient.model';
import { PatientUpdateInput } from './patient.validation';
import { AppError } from '../middleware/errorHandler';

export interface PatientControllerDependencies {
  patientModel: typeof Patient;
}

export interface PatientProfileResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  phone: string;
  address?: unknown;
  emergencyContact?: unknown;
  medicalHistory?: unknown[];
  createdAt?: Date;
  updatedAt?: Date;
}

function toPatientProfileResponse(patient: { _id?: { toString(): string }; id?: string } & Record<string, unknown>): PatientProfileResponse {
  const identifier = typeof patient.id === 'string'
    ? patient.id
    : typeof patient._id?.toString === 'function'
      ? patient._id.toString()
      : '';

  return {
    id: identifier,
    email: String(patient.email),
    firstName: String(patient.firstName),
    lastName: String(patient.lastName),
    dateOfBirth: new Date(patient.dateOfBirth as string | number | Date),
    phone: String(patient.phone),
    address: patient.address,
    emergencyContact: patient.emergencyContact,
    medicalHistory: Array.isArray(patient.medicalHistory) ? patient.medicalHistory : [],
    createdAt: patient.createdAt ? new Date(patient.createdAt as string | number | Date) : undefined,
    updatedAt: patient.updatedAt ? new Date(patient.updatedAt as string | number | Date) : undefined,
  };
}

export function createPatientController(dependencies: PatientControllerDependencies = { patientModel: Patient }) {
  return {
    async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const patientId = req.user?.patientId;
        if (!patientId) {
          next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
          return;
        }

        const patient = await dependencies.patientModel.findById(patientId).lean().exec();
        if (!patient) {
          next(new AppError(404, 'PATIENT_NOT_FOUND', 'Patient profile not found'));
          return;
        }

        res.status(200).json({ patient: toPatientProfileResponse(patient as Record<string, unknown>) });
      } catch (error) {
        next(error);
      }
    },

    async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const patientId = req.user?.patientId;
        if (!patientId) {
          next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
          return;
        }

        const updates = req.body as PatientUpdateInput;
        const patient = await dependencies.patientModel
          .findByIdAndUpdate(patientId, updates, { new: true, runValidators: true })
          .lean()
          .exec();

        if (!patient) {
          next(new AppError(404, 'PATIENT_NOT_FOUND', 'Patient profile not found'));
          return;
        }

        res.status(200).json({ patient: toPatientProfileResponse(patient as Record<string, unknown>) });
      } catch (error) {
        next(error);
      }
    },
  };
}
