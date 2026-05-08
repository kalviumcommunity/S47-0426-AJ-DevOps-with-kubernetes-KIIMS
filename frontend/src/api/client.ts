import axios, { AxiosError } from 'axios';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
}

export interface AuthPatient {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  phone?: string;
}

export interface AuthResponse {
  accessToken?: string;
  refreshToken?: string;
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  patient: AuthPatient;
}

export interface TimeSlot {
  doctorId: string;
  specialty: string;
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface Appointment {
  _id?: string;
  id?: string;
  patientId: string;
  doctorId: string;
  specialty: string;
  scheduledAt: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
}

export interface PatientProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
}

export interface PatientPortalAPI {
  login(credentials: LoginCredentials): Promise<AuthResponse>;
  register(credentials: RegisterCredentials): Promise<AuthResponse>;
  logout(): Promise<void>;
  refreshToken(): Promise<AuthResponse>;
  getAvailableSlots(date: string, specialty: string): Promise<TimeSlot[]>;
  bookAppointment(appointment: {
    doctorId: string;
    specialty: string;
    scheduledAt: string;
    duration: number;
    notes?: string;
  }): Promise<Appointment>;
  getMyAppointments(): Promise<Appointment[]>;
  cancelAppointment(appointmentId: string): Promise<void>;
  getProfile(): Promise<PatientProfile>;
  updateProfile(profile: Partial<PatientProfile>): Promise<PatientProfile>;
}

let accessToken: string | null = localStorage.getItem('auth_token');

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      setAccessToken(null);
      return Promise.reject(new Error('Your session expired. Please sign in again.'));
    }

    return Promise.reject(error);
  }
);

function unwrapAuthResponse(payload: AuthResponse): AuthResponse {
  if (payload.tokens) {
    return payload;
  }

  if (payload.accessToken && payload.refreshToken) {
    return {
      ...payload,
      tokens: {
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
        expiresIn: 24 * 60 * 60,
      },
    };
  }

  return payload;
}

export const patientPortalAPI: PatientPortalAPI = {
  async login(credentials) {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    return unwrapAuthResponse(response.data);
  },

  async register(credentials) {
    const response = await api.post<AuthResponse>('/auth/register', credentials);
    return unwrapAuthResponse(response.data);
  },

  async logout() {
    await api.post('/auth/logout');
  },

  async refreshToken() {
    const response = await api.post<AuthResponse>('/auth/refresh');
    return unwrapAuthResponse(response.data);
  },

  async getAvailableSlots(date, specialty) {
    const response = await api.get<TimeSlot[]>('/appointments/slots', { params: { date, specialty } });
    return response.data;
  },

  async bookAppointment(appointment) {
    const response = await api.post<Appointment>('/appointments', appointment);
    return response.data;
  },

  async getMyAppointments() {
    const response = await api.get<Appointment[]>('/appointments');
    return response.data;
  },

  async cancelAppointment(appointmentId) {
    await api.delete(`/appointments/${appointmentId}`);
  },

  async getProfile() {
    const response = await api.get<{ patient: PatientProfile }>('/patients/me');
    return response.data.patient;
  },

  async updateProfile(profile) {
    const response = await api.patch<{ patient: PatientProfile }>('/patients/me', profile);
    return response.data.patient;
  },
};

export default api;