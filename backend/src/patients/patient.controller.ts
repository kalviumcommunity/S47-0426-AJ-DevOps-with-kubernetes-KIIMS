import { Request, Response, NextFunction } from 'express';
import { PatientUpdateInput } from './patient.validation';
import { AppError } from '../middleware/errorHandler';
import { AuthService, createDefaultAuthService, AuthenticatedPatient } from '../auth/auth.service';

/**
 * Extend Express Request to include our authenticated user
 */
interface AuthenticatedRequest extends Request {
  user?: AuthenticatedPatient;
}

export interface PatientControllerDependencies {
  authService: AuthService;
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

function toPatientProfileResponse(patient: any): PatientProfileResponse {
  const identifier = patient.id || patient._id?.toString() || patient._id?.$oid || '';

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

export function createPatientController(dependencies: PatientControllerDependencies = { authService: createDefaultAuthService() }) {
  return {
    async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
      try {
        const patientId = req.user?.patientId;
        if (!patientId) {
          next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
          return;
        }

        const patient = await dependencies.authService.getPatientById(patientId);
        if (!patient) {
          next(new AppError(404, 'PATIENT_NOT_FOUND', 'Patient profile not found'));
          return;
        }

        res.status(200).json({ patient: toPatientProfileResponse(patient) });
      } catch (error) {
        next(error);
      }
    },

    async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
      try {
        const patientId = req.user?.patientId;
        if (!patientId) {
          next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
          return;
        }

        const updates = req.body as PatientUpdateInput;
        const patient = await dependencies.authService.updatePatient(patientId, updates);

        if (!patient) {
          next(new AppError(404, 'PATIENT_NOT_FOUND', 'Patient profile not found'));
          return;
        }

        res.status(200).json({ patient: toPatientProfileResponse(patient) });
      } catch (error) {
        next(error);
      }
    },
  };
}
