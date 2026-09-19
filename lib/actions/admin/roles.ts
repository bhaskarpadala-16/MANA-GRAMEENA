'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { UserRole } from '@prisma/client';
import { recordAdminActivity } from './audit';

const RoleUpdateSchema = z.object({
  targetUserId: z.string().uuid('Valid target user ID is required'),
  newRole: z.nativeEnum(UserRole),
  reason: z.string().min(5, 'A reason is required for role governance actions').max(500),
});

/**
 * Super Administrator role governance.
 * Allows promotion of CUSTOMER -> ADMIN or demotion of ADMIN -> CUSTOMER.
 * Strictly prevents escalation to SUPER_ADMIN or demotion of SUPER_ADMIN.
 */
export async function updateUserRoleAction(rawInput: unknown) {
  // 1. Strictly enforces Super Admin server-side
  const superAdmin = await requireSuperAdmin();
  const parsed = RoleUpdateSchema.safeParse(rawInput);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { targetUserId, newRole, reason } = parsed.data;

  // Cannot modify self
  if (targetUserId === superAdmin.id) {
    return { success: false, error: 'Super Administrators cannot alter their own role.' };
  }

  // Explicit policy & security guard: Never permit promotion to SUPER_ADMIN through this interface
  if (newRole === UserRole.SUPER_ADMIN) {
    return {
      success: false,
      error: 'Security Policy Violation: Promotion to SUPER_ADMIN is forbidden.',
    };
  }

  try {
    const targetProfile = await prisma.profile.findUnique({
      where: { id: targetUserId },
    });

    if (!targetProfile) {
      return { success: false, error: 'Target user profile not found.' };
    }

    // Never permit demoting an existing SUPER_ADMIN
    if (targetProfile.role === UserRole.SUPER_ADMIN) {
      return {
        success: false,
        error: 'Security Policy Violation: Existing Super Administrators cannot be demoted.',
      };
    }

    // Only allow valid transitions: CUSTOMER <-> ADMIN
    if (newRole !== UserRole.ADMIN && newRole !== UserRole.CUSTOMER) {
      return { success: false, error: 'Invalid target role requested.' };
    }

    const updated = await prisma.profile.update({
      where: { id: targetUserId },
      data: { role: newRole },
    });

    await recordAdminActivity({
      actorId: superAdmin.id,
      action: newRole === UserRole.ADMIN ? 'USER_PROMOTED_TO_ADMIN' : 'ADMIN_DEMOTED_TO_CUSTOMER',
      entity: 'Profile',
      entityId: targetUserId,
      oldValues: { role: targetProfile.role },
      newValues: { role: newRole, reason },
    });

    revalidatePath('/admin/roles');
    revalidatePath('/admin/customers');
    revalidatePath(`/admin/customers/${targetUserId}`);

    return { success: true, role: updated.role };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to update user role.',
    };
  }
}
