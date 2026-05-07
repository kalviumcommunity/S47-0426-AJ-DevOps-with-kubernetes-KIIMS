import request from 'supertest';

const now = new Date('2026-05-07T10:00:00.000Z');
const validSpecialties = [
  'Cardiology',
  'Dermatology',
  'Endocrinology',
  'Gastroenterology',
  'General Practice',
  'Neurology',
  'Oncology',
  'Orthopedics',
  'Pediatrics',
  'Psychiatry',
  'Pulmonology',
  'Radiology',
  'Surgery',
  'Urology',
] as const;
const validDurations = [15, 30, 45, 60] as const;

type PatientRecord = {
  _id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
};

type AppointmentRecord = {
  id: string;
  patientId: string;
  doctorId: string;
  specialty: string;
  scheduledAt: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
};

let AppErrorClass: typeof import('../../src/middleware/errorHandler').AppError;

const state = {
  nextPatientId: 1,
  nextAppointmentId: 1,
  nextTokenId: 1,
  patientsById: new Map<string, PatientRecord>(),
  patientsByEmail: new Map<string, PatientRecord>(),
  sessionsByAccessToken: new Map<string, PatientRecord>(),
  sessionsByRefreshToken: new Map<string, PatientRecord>(),
  appointmentsById: new Map<string, AppointmentRecord>(),
};

function resetState(): void {
  state.nextPatientId = 1;
  state.nextAppointmentId = 1;
  state.nextTokenId = 1;
  state.patientsById.clear();
  state.patientsByEmail.clear();
  state.sessionsByAccessToken.clear();
  state.sessionsByRefreshToken.clear();
  state.appointmentsById.clear();
}

function issueTokens(patient: PatientRecord) {
  const tokenId = state.nextTokenId++;
  const accessToken = `access-${tokenId}`;
  const refreshToken = `refresh-${tokenId}`;
  state.sessionsByAccessToken.set(accessToken, patient);
  state.sessionsByRefreshToken.set(refreshToken, patient);
  return {
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: 24 * 60 * 60,
    },
    patient,
  };
}

function sameDay(left: Date, right: Date): boolean {
  return left.getUTCFullYear() === right.getUTCFullYear()
    && left.getUTCMonth() === right.getUTCMonth()
    && left.getUTCDate() === right.getUTCDate();
}

function overlaps(startA: Date, durationA: number, startB: Date, durationB: number): boolean {
  const endA = new Date(startA.getTime() + durationA * 60_000);
  const endB = new Date(startB.getTime() + durationB * 60_000);
  return startA < endB && startB < endA;
}

function buildPatientRecord(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  phone: string;
}): PatientRecord {
  const patient: PatientRecord = {
    _id: `patient-${state.nextPatientId++}`,
    email: input.email.toLowerCase(),
    password: input.password,
    firstName: input.firstName,
    lastName: input.lastName,
    dateOfBirth: input.dateOfBirth.toISOString(),
    phone: input.phone,
  };

  state.patientsById.set(patient._id, patient);
  state.patientsByEmail.set(patient.email, patient);
  return patient;
}

jest.mock('../../src/logger/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../src/auth/auth.service', () => ({
  __esModule: true,
  createDefaultAuthService: () => ({
    register: jest.fn(async (input: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      dateOfBirth: Date;
      phone: string;
    }) => buildPatientRecord(input)),
    login: jest.fn(async ({ email, password }: { email: string; password: string }) => {
      const patient = state.patientsByEmail.get(email.toLowerCase());
      if (!patient || patient.password !== password) {
        throw new AppErrorClass(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
      }

      return issueTokens(patient);
    }),
    logout: jest.fn(async (token: string) => {
      const patient = state.sessionsByAccessToken.get(token);
      state.sessionsByAccessToken.delete(token);
      if (patient) {
        for (const [refreshToken, sessionPatient] of state.sessionsByRefreshToken.entries()) {
          if (sessionPatient._id === patient._id) {
            state.sessionsByRefreshToken.delete(refreshToken);
          }
        }
      }
    }),
    verifyToken: jest.fn(async (token: string) => {
      const patient = state.sessionsByAccessToken.get(token);
      if (!patient) {
        throw new AppErrorClass(401, 'UNAUTHORIZED', 'Invalid or expired access token');
      }

      return {
        patientId: patient._id,
        email: patient.email,
      };
    }),
    refreshToken: jest.fn(async (refreshToken: string) => {
      const patient = state.sessionsByRefreshToken.get(refreshToken);
      if (!patient) {
        throw new AppErrorClass(401, 'UNAUTHORIZED', 'Invalid refresh token');
      }

      return issueTokens(patient).tokens;
    }),
  }),
}));

jest.mock('../../src/middleware/auth.middleware', () => ({
  __esModule: true,
  requireAuth: (req: any, _res: any, next: any) => {
    const authorizationHeader = req.header?.('authorization') ?? req.headers?.authorization;
    if (typeof authorizationHeader !== 'string' || !authorizationHeader.startsWith('Bearer ')) {
      next(new AppErrorClass(401, 'UNAUTHORIZED', 'Missing or invalid Authorization header'));
      return;
    }

    const token = authorizationHeader.slice('Bearer '.length);
    const patient = state.sessionsByAccessToken.get(token);
    if (!patient) {
      next(new AppErrorClass(401, 'UNAUTHORIZED', 'Invalid or expired access token'));
      return;
    }

    req.user = {
      patientId: patient._id,
      email: patient.email,
    };
    next();
  },
}));

jest.mock('../../src/patients/patient.controller', () => ({
  __esModule: true,
  createPatientController: () => ({
    getProfile: async (req: any, res: any, next: any) => {
      try {
        const patient = state.patientsById.get(req.user?.patientId);
        if (!patient) {
          throw new AppErrorClass(404, 'PATIENT_NOT_FOUND', 'Patient profile not found');
        }

        res.status(200).json({
          patient: {
            id: patient._id,
            email: patient.email,
            firstName: patient.firstName,
            lastName: patient.lastName,
            dateOfBirth: patient.dateOfBirth,
            phone: patient.phone,
          },
        });
      } catch (error) {
        next(error);
      }
    },
    updateProfile: async (req: any, res: any, next: any) => {
      try {
        const patient = state.patientsById.get(req.user?.patientId);
        if (!patient) {
          throw new AppErrorClass(404, 'PATIENT_NOT_FOUND', 'Patient profile not found');
        }

        if (req.body.email) {
          state.patientsByEmail.delete(patient.email);
          patient.email = req.body.email.toLowerCase();
          state.patientsByEmail.set(patient.email, patient);
        }

        if (req.body.firstName) patient.firstName = req.body.firstName;
        if (req.body.lastName) patient.lastName = req.body.lastName;
        if (req.body.phone) patient.phone = req.body.phone;
        if (req.body.dateOfBirth) patient.dateOfBirth = new Date(req.body.dateOfBirth).toISOString();

        res.status(200).json({
          patient: {
            id: patient._id,
            email: patient.email,
            firstName: patient.firstName,
            lastName: patient.lastName,
            dateOfBirth: patient.dateOfBirth,
            phone: patient.phone,
          },
        });
      } catch (error) {
        next(error);
      }
    },
  }),
}));

jest.mock('../../src/appointments/appointment.controller', () => ({
  __esModule: true,
  createAppointmentController: () => ({
    getAvailableSlots: async (req: any, res: any, next: any) => {
      try {
        const specialty = String(req.query.specialty ?? '');
        const date = new Date(String(req.query.date));
        const slots = [9, 10, 11, 13, 14, 15, 16].flatMap((hour) => {
          return [15, 30, 45, 60].map((duration) => {
            const startTime = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hour, 0, 0, 0));
            const conflict = [...state.appointmentsById.values()].some((appointment) =>
              appointment.specialty === specialty
              && appointment.status === 'scheduled'
              && overlaps(startTime, duration, new Date(appointment.scheduledAt), appointment.duration)
            );

            return {
              doctorId: 'doctor-1',
              specialty,
              startTime: startTime.toISOString(),
              endTime: new Date(startTime.getTime() + duration * 60_000).toISOString(),
              available: !conflict,
            };
          });
        });

        res.status(200).json({ slots });
      } catch (error) {
        next(error);
      }
    },
    bookAppointment: async (req: any, res: any, next: any) => {
      try {
        const patientId = req.user?.patientId;
        const { doctorId, specialty, scheduledAt, duration, notes } = req.body;
        const scheduledDate = new Date(scheduledAt);

        if (!validSpecialties.includes(specialty)) {
          throw new AppErrorClass(400, 'VALIDATION_ERROR', 'Specialty must be one of the supported specialties');
        }

        if (!validDurations.includes(duration)) {
          throw new AppErrorClass(400, 'VALIDATION_ERROR', 'Duration must be one of 15, 30, 45, 60 minutes');
        }

        if (scheduledDate <= now) {
          throw new AppErrorClass(400, 'VALIDATION_ERROR', 'scheduledAt must be in the future');
        }

        const appointmentsForDay = [...state.appointmentsById.values()].filter((appointment) =>
          appointment.patientId === patientId
          && appointment.status === 'scheduled'
          && sameDay(new Date(appointment.scheduledAt), scheduledDate)
        );

        if (appointmentsForDay.length >= 3) {
          throw new AppErrorClass(409, 'DAILY_LIMIT_EXCEEDED', 'Patient cannot book more than 3 appointments per day');
        }

        const conflictingAppointment = [...state.appointmentsById.values()].find((appointment) =>
          appointment.doctorId === doctorId
          && appointment.status === 'scheduled'
          && overlaps(scheduledDate, duration, new Date(appointment.scheduledAt), appointment.duration)
        );

        if (conflictingAppointment) {
          throw new AppErrorClass(409, 'APPOINTMENT_CONFLICT', 'This time slot is already booked');
        }

        const appointment: AppointmentRecord = {
          id: `appointment-${state.nextAppointmentId++}`,
          patientId,
          doctorId,
          specialty,
          scheduledAt: scheduledDate.toISOString(),
          duration,
          status: 'scheduled',
          notes,
        };

        state.appointmentsById.set(appointment.id, appointment);
        res.status(201).json({ appointment });
      } catch (error) {
        next(error);
      }
    },
    getAppointments: async (req: any, res: any, next: any) => {
      try {
        const patientId = req.user?.patientId;
        const appointments = [...state.appointmentsById.values()]
          .filter((appointment) => appointment.patientId === patientId)
          .sort((left, right) => right.scheduledAt.localeCompare(left.scheduledAt));

        res.status(200).json({ appointments });
      } catch (error) {
        next(error);
      }
    },
    cancelAppointment: async (req: any, res: any, next: any) => {
      try {
        const patientId = req.user?.patientId;
        const appointment = state.appointmentsById.get(req.params.id);
        if (!appointment) {
          throw new AppErrorClass(404, 'APPOINTMENT_NOT_FOUND', 'Appointment not found');
        }

        if (appointment.patientId !== patientId) {
          throw new AppErrorClass(403, 'FORBIDDEN', 'You can only cancel your own appointments');
        }

        if (appointment.status !== 'scheduled') {
          throw new AppErrorClass(422, 'INVALID_APPOINTMENT_STATE', 'Appointment is already cancelled or completed');
        }

        const hoursUntilAppointment = (new Date(appointment.scheduledAt).getTime() - now.getTime()) / 3_600_000;
        if (hoursUntilAppointment < 24) {
          throw new AppErrorClass(422, 'CANCELLATION_WINDOW_EXPIRED', 'Appointments must be cancelled at least 24 hours in advance');
        }

        appointment.status = 'cancelled';
        res.status(200).json({ appointment });
      } catch (error) {
        next(error);
      }
    },
  }),
}));

let app: typeof import('../../src/app').default;

beforeAll(async () => {
  jest.resetModules();
  AppErrorClass = (jest.requireActual('../../src/middleware/errorHandler') as typeof import('../../src/middleware/errorHandler')).AppError;
  ({ default: app } = await import('../../src/app'));
});

beforeEach(() => {
  resetState();
});

describe('patient portal integration flows', () => {
  it('handles register, login, protected profile access, and logout', async () => {
    const registerResponse = await request(app).post('/auth/register').send({
      email: 'jane.doe@example.com',
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      phone: '+12125551234',
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.patient.email).toBe('jane.doe@example.com');

    const loginResponse = await request(app).post('/auth/login').send({
      email: 'jane.doe@example.com',
      password: 'password123',
    });

    expect(loginResponse.status).toBe(200);
    const accessToken = loginResponse.body.tokens.accessToken as string;

    const profileResponse = await request(app)
      .get('/patients/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.patient.email).toBe('jane.doe@example.com');

    const logoutResponse = await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(logoutResponse.status).toBe(200);

    const revokedProfileResponse = await request(app)
      .get('/patients/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(revokedProfileResponse.status).toBe(401);
    expect(revokedProfileResponse.body.error.code).toBe('UNAUTHORIZED');
  });

  it('books, lists, and cancels an appointment while enforcing rejection rules', async () => {
    await request(app).post('/auth/register').send({
      email: 'jane.doe@example.com',
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      phone: '+12125551234',
    });

    const loginResponse = await request(app).post('/auth/login').send({
      email: 'jane.doe@example.com',
      password: 'password123',
    });
    const accessToken = loginResponse.body.tokens.accessToken as string;

    const bookingResponse = await request(app)
      .post('/appointments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        doctorId: 'doctor-1',
        specialty: 'Cardiology',
        scheduledAt: '2026-05-08T12:00:00.000Z',
        duration: 30,
        notes: 'Initial consultation',
      });

    expect(bookingResponse.status).toBe(201);
    expect(bookingResponse.body.appointment.status).toBe('scheduled');

    const listResponse = await request(app)
      .get('/appointments')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.appointments).toHaveLength(1);

    const cancelResponse = await request(app)
      .delete(`/appointments/${bookingResponse.body.appointment.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body.appointment.status).toBe('cancelled');

    const pastTimeResponse = await request(app)
      .post('/appointments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        doctorId: 'doctor-1',
        specialty: 'Cardiology',
        scheduledAt: '2026-05-07T09:00:00.000Z',
        duration: 30,
      });

    expect(pastTimeResponse.status).toBe(400);
    expect(pastTimeResponse.body.error.code).toBe('VALIDATION_ERROR');

    const invalidDurationResponse = await request(app)
      .post('/appointments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        doctorId: 'doctor-1',
        specialty: 'Cardiology',
        scheduledAt: '2026-05-08T14:00:00.000Z',
        duration: 20,
      });

    expect(invalidDurationResponse.status).toBe(400);
    expect(invalidDurationResponse.body.error.code).toBe('VALIDATION_ERROR');

    await request(app).post('/appointments').set('Authorization', `Bearer ${accessToken}`).send({
      doctorId: 'doctor-2',
      specialty: 'Cardiology',
      scheduledAt: '2026-05-08T15:00:00.000Z',
      duration: 30,
    });
    await request(app).post('/appointments').set('Authorization', `Bearer ${accessToken}`).send({
      doctorId: 'doctor-3',
      specialty: 'Cardiology',
      scheduledAt: '2026-05-08T16:00:00.000Z',
      duration: 30,
    });
    await request(app).post('/appointments').set('Authorization', `Bearer ${accessToken}`).send({
      doctorId: 'doctor-4',
      specialty: 'Cardiology',
      scheduledAt: '2026-05-08T17:00:00.000Z',
      duration: 30,
    });

    const dailyLimitResponse = await request(app)
      .post('/appointments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        doctorId: 'doctor-5',
        specialty: 'Cardiology',
        scheduledAt: '2026-05-08T18:00:00.000Z',
        duration: 30,
      });

    expect(dailyLimitResponse.status).toBe(409);
    expect(dailyLimitResponse.body.error.code).toBe('DAILY_LIMIT_EXCEEDED');

    const closeAppointmentResponse = await request(app)
      .post('/appointments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        doctorId: 'doctor-6',
        specialty: 'Cardiology',
        scheduledAt: '2026-05-07T18:00:00.000Z',
        duration: 30,
      });

    expect(closeAppointmentResponse.status).toBe(201);

    const tooLateToCancelResponse = await request(app)
      .delete(`/appointments/${closeAppointmentResponse.body.appointment.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(tooLateToCancelResponse.status).toBe(422);
    expect(tooLateToCancelResponse.body.error.code).toBe('CANCELLATION_WINDOW_EXPIRED');
  });

  it('returns Prometheus metrics text after processing requests', async () => {
    await request(app).post('/auth/register').send({
      email: 'jane.doe@example.com',
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      phone: '+12125551234',
    });

    const loginResponse = await request(app).post('/auth/login').send({
      email: 'jane.doe@example.com',
      password: 'password123',
    });

    const accessToken = loginResponse.body.tokens.accessToken as string;
    await request(app).get('/patients/me').set('Authorization', `Bearer ${accessToken}`);
    await request(app).get('/health/live');

    const metricsResponse = await request(app).get('/metrics');

    expect(metricsResponse.status).toBe(200);
    expect(metricsResponse.headers['content-type']).toContain('text/plain');
    expect(metricsResponse.text).toContain('patient_portal_http_requests_total');
    expect(metricsResponse.text).toContain('patient_portal_http_request_duration_seconds');
    expect(metricsResponse.text).toContain('patient_portal_http_active_connections');
    expect(metricsResponse.text).toContain('endpoint="/login"');
    expect(metricsResponse.text).toContain('endpoint="/me"');
  });
});
