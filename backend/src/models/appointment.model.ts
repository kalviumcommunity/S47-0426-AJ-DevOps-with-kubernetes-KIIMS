import { Document, Schema, Types, model } from 'mongoose';

export const VALID_SPECIALTIES = [
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

export const VALID_DURATIONS = [15, 30, 45, 60] as const;

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no-show';

export interface AppointmentDocument extends Document {
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  specialty: string;
  scheduledAt: Date;
  duration: number;
  status: AppointmentStatus;
  notes?: string;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<AppointmentDocument>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient ID is required'],
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor ID is required'],
    },
    specialty: {
      type: String,
      required: [true, 'Specialty is required'],
      enum: {
        values: VALID_SPECIALTIES as unknown as string[],
        message: `Specialty must be one of: ${VALID_SPECIALTIES.join(', ')}`,
      },
    },
    scheduledAt: {
      type: Date,
      required: [true, 'Scheduled time is required'],
    },
    duration: {
      type: Number,
      required: [true, 'Duration is required'],
      enum: {
        values: VALID_DURATIONS as unknown as number[],
        message: `Duration must be one of: ${VALID_DURATIONS.join(', ')} minutes`,
      },
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['scheduled', 'completed', 'cancelled', 'no-show'],
        message: 'Status must be one of: scheduled, completed, cancelled, no-show',
      },
      default: 'scheduled',
    },
    notes: {
      type: String,
    },
    cancellationReason: {
      type: String,
    },
  },
  { timestamps: true }
);

// Indexes
appointmentSchema.index({ patientId: 1, scheduledAt: -1 });
appointmentSchema.index({ doctorId: 1, scheduledAt: 1 });
appointmentSchema.index({ status: 1, scheduledAt: 1 });

export const Appointment = model<AppointmentDocument>('Appointment', appointmentSchema);
