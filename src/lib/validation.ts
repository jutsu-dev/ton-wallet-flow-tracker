import { z } from 'zod';

// Zod schemas shared by client forms and server route handlers. Server routes
// always re-validate; never trust client-side validation alone.

export const LABEL_TYPES = [
  'OWN',
  'SAFE',
  'UNKNOWN',
  'SUSPICIOUS',
  'SERVICE',
  'EXCHANGE',
  'MARKETPLACE',
  'OTHER',
] as const;

export const ALLOWED_LIMITS = [10, 25, 50, 100] as const;

export const analyzeSchema = z.object({
  address: z.string().trim().min(1).max(120),
  limit: z.coerce
    .number()
    .int()
    .refine((v) => (ALLOWED_LIMITS as readonly number[]).includes(v), 'limit must be 10, 25, 50, or 100')
    .default(25),
  depth: z.coerce.number().int().min(1).max(3).default(1),
});
export type AnalyzeInput = z.infer<typeof analyzeSchema>;

export const expandSchema = z.object({
  address: z.string().trim().min(1).max(120),
  limit: z.coerce
    .number()
    .int()
    .refine((v) => (ALLOWED_LIMITS as readonly number[]).includes(v), 'invalid limit')
    .default(25),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(200),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(10, 'at least 10 characters').max(200),
});

export const labelSchema = z.object({
  address: z.string().trim().min(1).max(120),
  labelType: z.enum(LABEL_TYPES),
  title: z.string().trim().min(1).max(80),
  note: z.string().trim().max(500).optional().nullable(),
});
export type LabelInput = z.infer<typeof labelSchema>;

export const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(64)
    .regex(/^[a-zA-Z0-9_.-]+$/, 'letters, digits, dot, dash, underscore only'),
  password: z.string().min(10).max(200),
  role: z.enum(['OWNER', 'MEMBER']),
});
