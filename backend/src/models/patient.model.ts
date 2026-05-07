import { Document, Schema, model } from 'mongoose';

export interface PatientDocument extends Document {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  medicalHistory: Array<{
    condition: string;
    diagnosedAt: Date;
    notes: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema(
  {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    zipCode: { type: String },
    country: { type: String },
  },
  { _id: false }
);

const emergencyContactSchema = new Schema(
  {
    name: { type: String },
    relationship: { type: String },
    phone: { type: String },
  },
  { _id: false }
);

const medicalHistorySchema = new Schema(
  {
    condition: { type: String },
    diagnosedAt: { type: Date },
    notes: { type: String },
  },
  { _id: false }
);

const patientSchema = new Schema<PatientDocument>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator(value: string): boolean {
          // Basic RFC-5322-inspired email format check
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        },
        message: 'Email must be a valid email address',
      },
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
      validate: {
        validator(value: Date): boolean {
          return value < new Date();
        },
        message: 'Date of birth must be in the past',
      },
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      validate: {
        validator(value: string): boolean {
          return /^\+[1-9]\d{1,14}$/.test(value);
        },
        message: 'Phone must be in E.164 format (e.g. +12125551234)',
      },
    },
    address: { type: addressSchema },
    emergencyContact: { type: emergencyContactSchema },
    medicalHistory: { type: [medicalHistorySchema], default: [] },
  },
  { timestamps: true }
);

// Indexes
patientSchema.index({ email: 1 }, { unique: true });
patientSchema.index({ lastName: 1, firstName: 1 });

export const Patient = model<PatientDocument>('Patient', patientSchema);
