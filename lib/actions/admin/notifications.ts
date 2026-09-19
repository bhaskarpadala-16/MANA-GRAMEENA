'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth/guards';
import { UserRole } from '@prisma/client';
import { recordAdminActivity } from './audit';

const BroadcastNotificationSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(150),
  message: z.string().min(5, 'Message must be at least 5 characters'),
  linkUrl: z.string().max(255).optional().nullable(),
  targetUserId: z.string().uuid().optional().nullable(),
});

/**
 * Creates administrative system notifications.
 * Can broadcast to all active customers or target an individual user.
 */
export async function broadcastNotificationAction(rawInput: unknown) {
  const admin = await requireAdmin();
  const parsed = BroadcastNotificationSchema.safeParse(rawInput);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { title, message, linkUrl, targetUserId } = parsed.data;

  try {
    if (targetUserId) {
      // Target specific user
      const user = await prisma.profile.findUnique({ where: { id: targetUserId } });
      if (!user) {
        return { success: false, error: 'Target user not found.' };
      }

      await prisma.notification.create({
        data: {
          userId: targetUserId,
          title,
          message,
          linkUrl: linkUrl ?? null,
        },
      });

      await recordAdminActivity({
        actorId: admin.id,
        action: 'NOTIFICATION_SENT_DIRECT',
        entity: 'Notification',
        entityId: targetUserId,
        newValues: { title },
      });
    } else {
      // Broadcast to active customers
      const activeCustomers = await prisma.profile.findMany({
        where: { role: UserRole.CUSTOMER, isActive: true },
        select: { id: true },
      });

      if (activeCustomers.length > 0) {
        await prisma.notification.createMany({
          data: activeCustomers.map((c) => ({
            userId: c.id,
            title,
            message,
            linkUrl: linkUrl ?? null,
          })),
        });
      }

      await recordAdminActivity({
        actorId: admin.id,
        action: 'NOTIFICATION_BROADCAST_SENT',
        entity: 'Notification',
        entityId: 'ALL_ACTIVE_CUSTOMERS',
        newValues: { title, count: activeCustomers.length },
      });
    }

    revalidatePath('/admin/notifications');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to dispatch notification.' };
  }
}
