'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/db';
import { UserRole } from '@prisma/client';
import {
  signInSchema,
  signUpSchema,
  adminSignInSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type SignInInput,
  type SignUpInput,
  type AdminSignInInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from './validation';
import { getSafeRedirectUrl, getTrustedOrigin } from './redirect';

export interface AuthActionResult {
  success: boolean;
  error?: string;
  message?: string;
  redirectUrl?: string;
  requiresVerification?: boolean;
}

/**
 * Customer Sign In Server Action
 * Authenticates credentials via Supabase Auth and validates profile status.
 */
export async function signInCustomerAction(
  input: SignInInput,
  returnUrl?: string
): Promise<AuthActionResult> {
  const parseResult = signInSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.errors[0]?.message || 'Invalid login details.',
    };
  }

  const { email, password } = parseResult.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return {
      success: false,
      error: 'Invalid email address or password.',
    };
  }

  // Verify account is active in PostgreSQL
  const profile = await prisma.profile.findUnique({
    where: { id: data.user.id },
    select: { isActive: true },
  });

  if (profile && !profile.isActive) {
    await supabase.auth.signOut();
    return {
      success: false,
      error: 'Account has been deactivated. Please contact support.',
    };
  }

  const safeRedirect = getSafeRedirectUrl(returnUrl, '/account');
  return {
    success: true,
    redirectUrl: safeRedirect,
  };
}

/**
 * Customer Sign Up Server Action
 * Validates user data with Zod, creates Supabase auth user,
 * and idempotently provisions public.profiles with default role CUSTOMER.
 */
export async function signUpCustomerAction(input: SignUpInput): Promise<AuthActionResult> {
  const parseResult = signUpSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.errors[0]?.message || 'Invalid registration details.',
    };
  }

  const { email, password, firstName, lastName, phone } = parseResult.data;
  const supabase = await createClient();

  const headersList = await headers();
  const origin = getTrustedOrigin(headersList.get('origin'));

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
      },
      emailRedirectTo: `${origin}/auth/confirm?type=email&next=/account`,
    },
  });

  if (error) {
    // Return sanitized message without leaking backend error details
    if (error.message.toLowerCase().includes('already registered')) {
      return {
        success: false,
        error: 'An account with this email address already exists.',
      };
    }
    return {
      success: false,
      error: error.message || 'Registration failed. Please verify your details.',
    };
  }

  if (!data.user) {
    return {
      success: false,
      error: 'Unable to initialize user account. Please try again.',
    };
  }

  // Idempotently provision public.profiles with default CUSTOMER role
  try {
    await prisma.profile.upsert({
      where: { id: data.user.id },
      update: {},
      create: {
        id: data.user.id,
        role: UserRole.CUSTOMER, // STRICT: Always CUSTOMER; database trigger prevents escalation
        firstName,
        lastName,
        phone: phone || null,
        isActive: true,
      },
    });
  } catch (profileError) {
    // If profile already exists or trigger created it, proceed safely
    console.warn('Profile provisioning note:', profileError);
  }

  const requiresVerification = !data.session;
  return {
    success: true,
    requiresVerification,
    redirectUrl: '/account',
    message: requiresVerification
      ? 'Account created! Please check your email to confirm your account.'
      : 'Account created successfully!',
  };
}

/**
 * Admin Sign In Server Action
 * Strictly isolates administrative authentication from customer login.
 * Terminates session immediately if authenticated user lacks ADMIN or SUPER_ADMIN role.
 */
export async function signInAdminAction(
  input: AdminSignInInput,
  returnUrl?: string
): Promise<AuthActionResult> {
  const parseResult = adminSignInSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.errors[0]?.message || 'Invalid administrator credentials.',
    };
  }

  const { email, password } = parseResult.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return {
      success: false,
      error: 'Invalid administrator credentials.',
    };
  }

  // Query database profile: verify administrative authorization
  const profile = await prisma.profile.findUnique({
    where: { id: data.user.id },
    select: { role: true, isActive: true },
  });

  if (!profile || (profile.role !== UserRole.ADMIN && profile.role !== UserRole.SUPER_ADMIN)) {
    // Customer or unprivileged user attempted admin login: terminate session immediately
    await supabase.auth.signOut();
    return {
      success: false,
      error: 'Unauthorized: Administrative credentials required.',
    };
  }

  if (!profile.isActive) {
    await supabase.auth.signOut();
    return {
      success: false,
      error: 'Administrator account is deactivated.',
    };
  }

  const safeRedirect = getSafeRedirectUrl(returnUrl, '/admin');
  return {
    success: true,
    redirectUrl: safeRedirect,
  };
}

/**
 * Sign Out Server Action
 * Terminates Supabase session and clears authentication cookies.
 */
export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

/**
 * Admin Sign Out Server Action
 */
export async function signOutAdminAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}

/**
 * Password Reset Request Server Action
 * Dispatches password reset link without exposing whether the email exists (anti-enumeration).
 */
export async function requestPasswordResetAction(
  input: ForgotPasswordInput
): Promise<AuthActionResult> {
  const parseResult = forgotPasswordSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.errors[0]?.message || 'Invalid email address.',
    };
  }

  const { email } = parseResult.data;
  const supabase = await createClient();

  const headersList = await headers();
  const origin = getTrustedOrigin(headersList.get('origin'));

  try {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?type=recovery`,
    });
  } catch (err) {
    // Log server-side but do not reveal failure details
    console.error('Password reset request error:', err);
  }

  // Anti-enumeration: Uniform response whether email exists or not
  return {
    success: true,
    message: 'If an account exists with this email address, a password reset link has been sent.',
  };
}

/**
 * Password Reset Completion Server Action
 * Updates user password within an established recovery session.
 */
export async function resetPasswordAction(input: ResetPasswordInput): Promise<AuthActionResult> {
  const parseResult = resetPasswordSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.errors[0]?.message || 'Invalid password details.',
    };
  }

  const { password } = parseResult.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return {
      success: false,
      error: error.message || 'Unable to update password. Please request a new reset link.',
    };
  }

  return {
    success: true,
    message: 'Your password has been successfully reset. Please sign in with your new password.',
    redirectUrl: '/login',
  };
}
