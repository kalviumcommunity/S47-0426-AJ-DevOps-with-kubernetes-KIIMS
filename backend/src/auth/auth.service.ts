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
  getPatientById(id: string): Promise<any>;
  updatePatient(id: string, updates: any): Promise<any>;
}

const DEFAULT_SESSION_DURATION_SECONDS = 24 * 60 * 60;
const DEFAULT_MAX_SESSIONS = 5;

import fs from 'fs';
import path from 'path';

/**
 * Mock Auth Service for local development without MongoDB.
 * Now with file-based persistence to survive restarts!
 */
class MockAuthService implements AuthService {
  private patients: any[] = [];
  private sessions: any[] = [];
  private readonly dataDir = path.join(process.cwd(), 'data');
  private readonly patientsFile = path.join(this.dataDir, 'patients.json');
  private readonly sessionsFile = path.join(this.dataDir, 'sessions.json');

  constructor() {
    this.ensureDataDir();
    this.loadData();
  }

  private ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private loadData() {
    try {
      if (fs.existsSync(this.patientsFile)) {
        this.patients = JSON.parse(fs.readFileSync(this.patientsFile, 'utf8'));
      }
      if (fs.existsSync(this.sessionsFile)) {
        this.sessions = JSON.parse(fs.readFileSync(this.sessionsFile, 'utf8'));
      }
    } catch (error) {
      console.error('Failed to load mock data:', error);
    }
  }

  private saveData() {
    try {
      fs.writeFileSync(this.patientsFile, JSON.stringify(this.patients, null, 2));
      fs.writeFileSync(this.sessionsFile, JSON.stringify(this.sessions, null, 2));
    } catch (error) {
      console.error('Failed to save mock data:', error);
    }
  }

  async register(input: RegisterInput): Promise<any> {
    const patient = {
      _id: new Types.ObjectId(),
      ...input,
      email: input.email.toLowerCase(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.patients.push(patient);
    this.saveData();
    return patient;
  }

  async login(input: LoginInput): Promise<{ tokens: AuthTokens; patient: any }> {
    const patient = this.patients.find(p => p.email === input.email.toLowerCase());
    if (!patient) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    
    const tokens = {
      accessToken: 'mock-access-token-' + Math.random().toString(36).substring(7),
      refreshToken: 'mock-refresh-token-' + Math.random().toString(36).substring(7),
      expiresIn: 3600
    };
    this.sessions.push({ patientId: patient._id, ...tokens });
    this.saveData();
    return { tokens, patient };
  }

  async logout(token: string): Promise<void> {
    this.sessions = this.sessions.filter(s => s.accessToken !== token);
    this.saveData();
  }

  async verifyToken(token: string): Promise<AuthenticatedPatient> {
    const session = this.sessions.find(s => s.accessToken === token);
    if (!session) throw new AppError(401, 'UNAUTHORIZED', 'Invalid token');
    const patient = this.patients.find(p => {
      // Handle both string and ObjectId cases for the mock
      const pId = p._id?.$oid || p._id;
      const sId = session.patientId?.$oid || session.patientId;
      return String(pId) === String(sId);
    });
    
    if (!patient) throw new AppError(401, 'UNAUTHORIZED', 'Patient no longer exists');
    return { patientId: String(patient._id?.$oid || patient._id), email: patient.email };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    return { accessToken: 'new-token', refreshToken: 'new-refresh', expiresIn: 3600 };
  }

  async getPatientById(id: string): Promise<any> {
    const patient = this.patients.find(p => {
      const pId = p._id?.$oid || p._id;
      return String(pId) === String(id);
    });
    return patient;
  }

  async updatePatient(id: string, updates: any): Promise<any> {
    const index = this.patients.findIndex(p => {
      const pId = p._id?.$oid || p._id;
      return String(pId) === String(id);
    });
    if (index === -1) throw new AppError(404, 'PATIENT_NOT_FOUND', 'Patient not found');
    this.patients[index] = { ...this.patients[index], ...updates, updatedAt: new Date() };
    this.saveData();
    return this.patients[index];
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

  async getPatientById(id: string): Promise<any> {
    return this.dependencies.patientModel.findById(id).lean().exec();
  }

  async updatePatient(id: string, updates: any): Promise<any> {
    return this.dependencies.patientModel.findByIdAndUpdate(id, updates, { new: true }).lean().exec();
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

let sharedAuthService: AuthService | null = null;

export function createDefaultAuthService(): AuthService {
  if (sharedAuthService) {
    return sharedAuthService;
  }

  const registrarValue = String(process.env.SIMPLE_REGISTRAR).trim().toLowerCase();
  
  // Use mock service if SIMPLE_REGISTRAR is enabled to avoid MongoDB dependency in local dev
  if (registrarValue === 'true') {
    sharedAuthService = new MockAuthService();
    return sharedAuthService;
  }

  const jwtSecret = process.env.JWT_SECRET;
  const sessionSecret = process.env.SESSION_SECRET;

  if (!jwtSecret || !sessionSecret) {
    throw new Error('JWT_SECRET and SESSION_SECRET are required to initialize auth service');
  }

  sharedAuthService = new DefaultAuthService({
    patientModel: Patient,
    sessionModel: Session,
    bcryptLib: bcrypt,
    jwtLib: jwt,
    jwtSecret,
    sessionSecret,
  });

  return sharedAuthService;
}