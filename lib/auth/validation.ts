import { z } from 'zod';

/**
 * MANA GRAMEENA — AUTHENTICATION INPUT VALIDATION SCHEMAS
 * Strict Zod validation schemas enforcing data sanitation, length limits,
 * and zero user-controlled role injection.
 */

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address')
    .max(255, 'Email cannot exceed 255 characters'),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password cannot exceed 128 characters'),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const adminSignInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Administrator email is required')
    .email('Please enter a valid email address')
    .max(255, 'Email cannot exceed 255 characters'),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password cannot exceed 128 characters'),
});

export type AdminSignInInput = z.infer<typeof adminSignInSchema>;

export const signUpSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address')
    .max(255, 'Email cannot exceed 255 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password cannot exceed 128 characters'),
  firstName: z
    .string()
    .trim()
    .min(1, 'First name is required')
    .max(100, 'First name cannot exceed 100 characters'),
  lastName: z
    .string()
    .trim()
    .min(1, 'Last name is required')
    .max(100, 'Last name cannot exceed 100 characters'),
  phone: z
    .string()
    .trim()
    .regex(/^[+]?[0-9\s-]{7,20}$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address')
    .max(255, 'Email cannot exceed 255 characters'),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password cannot exceed 128 characters'),
    confirmPassword: z
      .string()
      .min(8, 'Please confirm your password')
      .max(128, 'Password confirmation cannot exceed 128 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
