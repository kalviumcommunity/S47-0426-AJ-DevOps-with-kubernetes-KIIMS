import bcrypt from 'bcrypt';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Types } from 'mongoose';
import { AppError } from '../middleware/errorHandler';
import { Patient, PatientDocument } from '../models/patient.model';
import { Session, SessionDocument } from '../models/session.model';

export interface AuthenticatedPatient extends JwtPayload {
  patientId: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  phone: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthServiceDependencies {
  patientModel: typeof Patient;
  sessionModel: typeof Session;
  bcryptLib: typeof bcrypt;
  jwtLib: typeof jwt;
  jwtSecret: string;
  sessionSecret: string;
  maxConcurrentSessions?: number;
  sessionDurationSeconds?: number;
}

export interface AuthService {
  register(input: RegisterInput): Promise<PatientDocument>;
  login(input: LoginInput): Promise<{ tokens: AuthTokens; patient: PatientDocument }>;
  logout(token: string): Promise<void>;
  verifyToken(token: string): Promise<AuthenticatedPatient>;
  refreshToken(refreshToken: string): Promise<AuthTokens>;
}

const DEFAULT_SESSION_DURATION_SECONDS = 24 * 60 * 60;
const DEFAULT_MAX_SESSIONS = 5;

/**
 * Mock Auth Service for local development without MongoDB.
 */
class MockAuthService implements AuthService {
  private patients: any[] = [];
  private sessions: any[] = [];

  async register(input: RegisterInput): Promise<any> {
    const patient = {
      _id: new Types.ObjectId(),
      ...input,
      email: input.email.toLowerCase(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.patients.push(patient);
    return patient;
  }

  async login(input: LoginInput): Promise<{ tokens: AuthTokens; patient: any }> {
    const patient = this.patients.find(p => p.email === input.email.toLowerCase());
    if (!patient) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    
    const tokens = {
      accessToken: 'mock-access-token-' + Math.random(),
      refreshToken: 'mock-refresh-token-' + Math.random(),
      expiresIn: 3600
    };
    this.sessions.push({ patientId: patient._id, ...tokens });
    return { tokens, patient };
  }

  async logout(token: string): Promise<void> {
    this.sessions = this.sessions.filter(s => s.accessToken !== token);
  }

  async verifyToken(token: string): Promise<AuthenticatedPatient> {
    const session = this.sessions.find(s => s.accessToken === token);
    if (!session) throw new AppError(401, 'UNAUTHORIZED', 'Invalid token');
    const patient = this.patients.find(p => p._id.equals(session.patientId));
    return { patientId: patient._id.toString(), email: patient.email };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    return { accessToken: 'new-token', refreshToken: 'new-refresh', expiresIn: 3600 };
  }
}

export class DefaultAuthService implements AuthService {
  private readonly maxConcurrentSessions: number;
  private readonly sessionDurationSeconds: number;

  constructor(private readonly dependencies: AuthServiceDependencies) {
    this.maxConcurrentSessions = dependencies.maxConcurrentSessions ?? DEFAULT_MAX_SESSIONS;
    this.sessionDurationSeconds = dependencies.sessionDurationSeconds ?? DEFAULT_SESSION_DURATION_SECONDS;
  }

  async register(input: RegisterInput): Promise<PatientDocument> {
    const passwordHash = await this.dependencies.bcryptLib.hash(input.password, 12);

    return this.dependencies.patientModel.create({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: input.dateOfBirth,
      phone: input.phone,
    });
  }

  async login(input: LoginInput): Promise<{ tokens: AuthTokens; patient: PatientDocument }> {
    const patient = await this.dependencies.patientModel.findOne({ email: input.email.toLowerCase() });

    if (!patient) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const passwordMatches = await this.dependencies.bcryptLib.compare(input.password, patient.passwordHash);
    if (!passwordMatches) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const activeSessions = await this.dependencies.sessionModel.countDocuments({
      patientId: patient._id,
      expiresAt: { $gt: new Date() },
    });

    if (activeSessions >= this.maxConcurrentSessions) {
      throw new AppError(409, 'SESSION_LIMIT_EXCEEDED', 'Maximum concurrent sessions exceeded');
    }

    const tokens = await this.issueTokens(patient);
    await this.storeSession(patient._id, tokens);

    return { tokens, patient };
  }

  async logout(token: string): Promise<void> {
    await this.dependencies.sessionModel.deleteOne({ token });
  }

  async verifyToken(token: string): Promise<AuthenticatedPatient> {
    try {
      return this.dependencies.jwtLib.verify(token, this.dependencies.jwtSecret) as AuthenticatedPatient;
    } catch {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired access token');
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const session = await this.dependencies.sessionModel.findOne({ refreshToken, expiresAt: { $gt: new Date() } });

    if (!session) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid refresh token');
    }

    const patient = await this.dependencies.patientModel.findById(session.patientId);
    if (!patient) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid refresh token');
    }

    const tokens = await this.issueTokens(patient);
    await this.dependencies.sessionModel.updateOne(
      { _id: session._id },
      {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + this.sessionDurationSeconds * 1000),
        lastAccessedAt: new Date(),
      }
    );

    return tokens;
  }

  private async issueTokens(patient: PatientDocument): Promise<AuthTokens> {
    const payload: AuthenticatedPatient = {
      patientId: patient._id.toString(),
      email: patient.email,
    };

    const accessToken = this.dependencies.jwtLib.sign(payload, this.dependencies.jwtSecret, {
      expiresIn: this.sessionDurationSeconds,
    });

    const refreshToken = this.dependencies.jwtLib.sign(payload, this.dependencies.sessionSecret, {
      expiresIn: '30d',
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.sessionDurationSeconds,
    };
  }

  private async storeSession(patientId: Types.ObjectId, tokens: AuthTokens): Promise<SessionDocument> {
    return this.dependencies.sessionModel.create({
      patientId,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: new Date(Date.now() + this.sessionDurationSeconds * 1000),
      lastAccessedAt: new Date(),
    });
  }
}

export function createDefaultAuthService(): AuthService {
  // Use mock service if SIMPLE_REGISTRAR is enabled to avoid MongoDB dependency in local dev
  if (process.env.SIMPLE_REGISTRAR === 'true') {
    return new MockAuthService();
  }

  const jwtSecret = process.env.JWT_SECRET;
  const sessionSecret = process.env.SESSION_SECRET;

  if (!jwtSecret || !sessionSecret) {
    throw new Error('JWT_SECRET and SESSION_SECRET are required to initialize auth service');
  }

  return new DefaultAuthService({
    patientModel: Patient,
    sessionModel: Session,
    bcryptLib: bcrypt,
    jwtLib: jwt,
    jwtSecret,
    sessionSecret,
  });
}