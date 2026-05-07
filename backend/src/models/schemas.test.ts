/**
 * Unit tests for Mongoose schema validation.
 *
 * These tests use doc.validate() directly and do NOT require a real MongoDB
 * connection — Mongoose validates in-memory before any network call.
 */

import { Types } from 'mongoose';
import { Patient } from './patient.model';
import { Appointment, VALID_SPECIALTIES, VALID_DURATIONS } from './appointment.model';
import { Session } from './session.model';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validPatientData() {
  return {
    email: 'jane.doe@example.com',
    passwordHash: '$2b$12$hashedpassword',
    firstName: 'Jane',
    lastName: 'Doe',
    dateOfBirth: new Date('1990-06-15'),
    phone: '+12125551234',
  };
}

function validAppointmentData() {
  return {
    patientId: new Types.ObjectId(),
    doctorId: new Types.ObjectId(),
    specialty: 'Cardiology',
    scheduledAt: new Date(Date.now() + 86_400_000), // tomorrow
    duration: 30,
    status: 'scheduled',
  };
}

function validSessionData() {
  return {
    patientId: new Types.ObjectId(),
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
    refreshToken: 'refresh-token-value',
    expiresAt: new Date(Date.now() + 86_400_000), // tomorrow
  };
}

// ---------------------------------------------------------------------------
// Patient schema tests
// ---------------------------------------------------------------------------

describe('Patient schema validation', () => {
  it('rejects an invalid email format', async () => {
    const doc = new Patient({ ...validPatientData(), email: 'not-an-email' });
    await expect(doc.validate()).rejects.toThrow(/valid email address/);
  });

  it('rejects a future dateOfBirth', async () => {
    const futureDate = new Date(Date.now() + 365 * 86_400_000); // one year ahead
    const doc = new Patient({ ...validPatientData(), dateOfBirth: futureDate });
    await expect(doc.validate()).rejects.toThrow(/Date of birth must be in the past/);
  });

  it('rejects a phone number that does not match E.164 format', async () => {
    const doc = new Patient({ ...validPatientData(), phone: '555-1234' });
    await expect(doc.validate()).rejects.toThrow(/E\.164/);
  });

  it('accepts a valid patient document', async () => {
    const doc = new Patient(validPatientData());
    await expect(doc.validate()).resolves.toBeUndefined();
  });

  it('rejects a document missing required firstName', async () => {
    const { firstName: _omit, ...rest } = validPatientData();
    const doc = new Patient(rest);
    await expect(doc.validate()).rejects.toThrow(/First name is required/);
  });
});

// ---------------------------------------------------------------------------
// Appointment schema tests
// ---------------------------------------------------------------------------

describe('Appointment schema validation', () => {
  it('rejects a duration not in [15, 30, 45, 60]', async () => {
    const doc = new Appointment({ ...validAppointmentData(), duration: 20 });
    await expect(doc.validate()).rejects.toThrow(/Duration must be one of/);
  });

  it('rejects an invalid specialty', async () => {
    const doc = new Appointment({ ...validAppointmentData(), specialty: 'Astrology' });
    await expect(doc.validate()).rejects.toThrow(/Specialty must be one of/);
  });

  it('accepts a valid appointment document', async () => {
    const doc = new Appointment(validAppointmentData());
    await expect(doc.validate()).resolves.toBeUndefined();
  });

  it('accepts all valid durations', async () => {
    for (const duration of VALID_DURATIONS) {
      const doc = new Appointment({ ...validAppointmentData(), duration });
      await expect(doc.validate()).resolves.toBeUndefined();
    }
  });

  it('accepts all valid specialties', async () => {
    for (const specialty of VALID_SPECIALTIES) {
      const doc = new Appointment({ ...validAppointmentData(), specialty });
      await expect(doc.validate()).resolves.toBeUndefined();
    }
  });

  it('rejects a document missing patientId', async () => {
    const { patientId: _omit, ...rest } = validAppointmentData();
    const doc = new Appointment(rest);
    await expect(doc.validate()).rejects.toThrow(/Patient ID is required/);
  });
});

// ---------------------------------------------------------------------------
// Session schema tests
// ---------------------------------------------------------------------------

describe('Session schema validation', () => {
  it('rejects a document missing token', async () => {
    const { token: _omit, ...rest } = validSessionData();
    const doc = new Session(rest);
    await expect(doc.validate()).rejects.toThrow(/Token is required/);
  });

  it('accepts a valid session document', async () => {
    const doc = new Session(validSessionData());
    await expect(doc.validate()).resolves.toBeUndefined();
  });

  it('rejects a document missing patientId', async () => {
    const { patientId: _omit, ...rest } = validSessionData();
    const doc = new Session(rest);
    await expect(doc.validate()).rejects.toThrow(/Patient ID is required/);
  });

  it('rejects a document missing refreshToken', async () => {
    const { refreshToken: _omit, ...rest } = validSessionData();
    const doc = new Session(rest);
    await expect(doc.validate()).rejects.toThrow(/Refresh token is required/);
  });
});
