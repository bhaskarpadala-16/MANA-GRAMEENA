import 'server-only';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/db';
import { UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}

/**
 * Retrieves the currently authenticated Supabase user and their database profile.
 * Returns null if not authenticated or profile not found.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!profile) {
      return null;
    }

    return {
      id: user.id,
      email: user.email || '',
      role: profile.role,
      firstName: profile.firstName,
      lastName: profile.lastName,
    };
  } catch {
    return null;
  }
}

/**
 * Enforces customer authentication server-side.
 * Throws an Error if unauthenticated.
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED: Please sign in to continue.');
  }
  return user;
}

/**
 * Enforces administrative authorization server-side.
 * Throws an Error if unauthenticated or if the role is not ADMIN or SUPER_ADMIN.
 * NEVER trusts client-supplied headers or claims.
 */
export async function requireAdmin(): Promise<AuthenticatedUser> {
  const user = await requireAuth();

  if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
    throw new Error('FORBIDDEN: Administrative privileges required.');
  }

  return user;
}
