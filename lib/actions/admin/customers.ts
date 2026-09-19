'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth/guards';
import { UserRole } from '@prisma/client';
import { recordAdminActivity } from './audit';

const ToggleCustomerActiveSchema = z.object({
  customerId: z.string().uuid('Valid customer ID is required'),
  isActive: z.boolean(),
  reason: z.string().min(5, 'A reason is required for account status changes').max(500),
});

/**
 * Toggles customer account active state.
 * Inactive customers are prevented from logging in or placing orders.
 */
export async function toggleCustomerActiveStatusAction(rawInput: unknown) {
  const admin = await requireAdmin();
  const parsed = ToggleCustomerActiveSchema.safeParse(rawInput);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { customerId, isActive, reason } = parsed.data;

  // Cannot modify own status
  if (customerId === admin.id) {
    return { success: false, error: 'Administrators cannot alter their own account status.' };
  }

  try {
    const customer = await prisma.profile.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return { success: false, error: 'Customer profile not found.' };
    }

    // Ordinary admin cannot deactivate a SUPER_ADMIN
    if (customer.role === UserRole.SUPER_ADMIN && admin.role !== UserRole.SUPER_ADMIN) {
      return { success: false, error: 'Unauthorized: Cannot modify Super Administrator profile.' };
    }

    const updated = await prisma.profile.update({
      where: { id: customerId },
      data: { isActive },
    });

    await recordAdminActivity({
      actorId: admin.id,
      action: isActive ? 'CUSTOMER_ACCOUNT_ACTIVATED' : 'CUSTOMER_ACCOUNT_DEACTIVATED',
      entity: 'Profile',
      entityId: customerId,
      oldValues: { isActive: customer.isActive },
      newValues: { isActive, reason },
    });

    revalidatePath('/admin/customers');
    revalidatePath(`/admin/customers/${customerId}`);
    revalidatePath('/admin');
    revalidatePath('/admin/dashboard');

    return { success: true, isActive: updated.isActive };
  } catch {
    return { success: false, error: 'Failed to update customer account status.' };
  }
}
