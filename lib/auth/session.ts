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
  isActive: boolean;
}

/**
 * Retrieves the currently authenticated Supabase user and their database profile.
 * Cryptographically verifies JWT claims using supabase.auth.getClaims().
 *
 * Implements self-healing profile provisioning:
 * If an authenticated auth.users record exists without a public.profiles row
 * (e.g. registration trigger failure), it safely initializes a default CUSTOMER profile.
 *
 * Returns null if not authenticated or if the user account has been deactivated.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) {
    return null;
  }

  const userId = data.claims.sub;
  const userEmail = typeof data.claims.email === 'string' ? data.claims.email : '';

  // Query database profile: never trust client-supplied roles
  let profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      firstName: true,
      lastName: true,
      isActive: true,
    },
  });

  // Self-healing fallback: prevent unrecoverable "zombie" accounts
  if (!profile) {
    try {
      const metadata = (data.claims.user_metadata as Record<string, unknown>) || {};
      const firstName =
        typeof metadata.first_name === 'string' && metadata.first_name.trim()
          ? metadata.first_name.trim().slice(0, 100)
          : 'Valued';
      const lastName =
        typeof metadata.last_name === 'string' && metadata.last_name.trim()
          ? metadata.last_name.trim().slice(0, 100)
          : 'Customer';
      const phone =
        typeof metadata.phone === 'string' && metadata.phone.trim()
          ? metadata.phone.trim().slice(0, 20)
          : null;

      // Always creates with default CUSTOMER role; DB trigger prevents escalation
      profile = await prisma.profile.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          role: UserRole.CUSTOMER,
          firstName,
          lastName,
          phone,
          isActive: true,
        },
        select: {
          id: true,
          role: true,
          firstName: true,
          lastName: true,
          isActive: true,
        },
      });
    } catch {
      // If concurrent insert occurred or database is unavailable, attempt read
      profile = await prisma.profile.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true,
          firstName: true,
          lastName: true,
          isActive: true,
        },
      });
    }
  }

  if (!profile) {
    throw new Error('DATABASE_ERROR: User profile record could not be loaded or provisioned.');
  }

  if (!profile.isActive) {
    return null;
  }

  return {
    id: userId,
    email: userEmail,
    role: profile.role,
    firstName: profile.firstName,
    lastName: profile.lastName,
    isActive: profile.isActive,
  };
}

/**
 * Enforces authenticated user server-side.
 * Throws an Error (401) if unauthenticated or inactive.
 */
export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED: Please sign in to continue.');
  }
  return user;
}

/**
 * Backward compatibility alias for requireAuthenticatedUser.
 */
export const requireAuth = requireAuthenticatedUser;

/**
 * Enforces customer access server-side.
 * Ensures the authenticated user is an active customer or administrator.
 */
export async function requireCustomer(
  currentUser?: AuthenticatedUser
): Promise<AuthenticatedUser> {
  const user = currentUser ?? (await requireAuthenticatedUser());
  if (!user.isActive) {
    throw new Error('FORBIDDEN: Customer account is inactive.');
  }
  return user;
}

/**
 * Enforces administrative authorization server-side.
 * Throws an Error (403) if unauthenticated or if the role is not ADMIN or SUPER_ADMIN.
 * NEVER trusts client-supplied headers or claims.
 */
export async function requireAdmin(currentUser?: AuthenticatedUser): Promise<AuthenticatedUser> {
  const user = currentUser ?? (await requireAuthenticatedUser());

  if (!user.isActive) {
    throw new Error('FORBIDDEN: Administrator account is inactive.');
  }

  if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
    throw new Error('FORBIDDEN: Administrative privileges required.');
  }

  return user;
}

/**
 * Enforces super-administrative authorization server-side.
 * Throws an Error (403) if unauthenticated or if the role is not SUPER_ADMIN.
 * Used for platform settings, role assignment, and critical governance.
 */
export async function requireSuperAdmin(
  currentUser?: AuthenticatedUser
): Promise<AuthenticatedUser> {
  const user = currentUser ?? (await requireAuthenticatedUser());

  if (!user.isActive) {
    throw new Error('FORBIDDEN: Super Administrator account is inactive.');
  }

  if (user.role !== UserRole.SUPER_ADMIN) {
    throw new Error('FORBIDDEN: Super Administrative privileges required.');
  }

  return user;
}
