import { z } from 'zod';

const phoneSchema = z.string().regex(/^\+[1-9]\d{1,14}$/, 'Phone must be in E.164 format (e.g. +12125551234)');

const pastDateSchema = z.coerce.date().refine((value) => value < new Date(), {
  message: 'Date of birth must be in the past',
});

export const patientUpdateSchema = z
  .object({
    email: z.string().email('Email must be a valid email address').optional(),
    firstName: z.string().min(1, 'First name is required').optional(),
    lastName: z.string().min(1, 'Last name is required').optional(),
    dateOfBirth: pastDateSchema.optional(),
    phone: phoneSchema.optional(),
    address: z
      .object({
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        country: z.string().optional(),
      })
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one profile field must be provided',
  });

export type PatientUpdateInput = z.infer<typeof patientUpdateSchema>;