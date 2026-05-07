import { Document, Schema, Types, model } from 'mongoose';

export interface SessionDocument extends Document {
  patientId: Types.ObjectId;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  lastAccessedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const sessionSchema = new Schema<SessionDocument>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient ID is required'],
    },
    token: {
      type: String,
      required: [true, 'Token is required'],
      unique: true,
    },
    refreshToken: {
      type: String,
      required: [true, 'Refresh token is required'],
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiry date is required'],
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes
sessionSchema.index({ token: 1 }, { unique: true });
sessionSchema.index({ patientId: 1, expiresAt: -1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

export const Session = model<SessionDocument>('Session', sessionSchema);
