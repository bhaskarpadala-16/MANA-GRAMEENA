'use server';

import prisma from '@/lib/db';
import { requireCustomer } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

export interface NotificationDto {
  id: string;
  title: string;
  message: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: Date;
}

/**
 * Retrieves all notifications for the authenticated customer.
 * Enforces customer isolation.
 */
export async function getUserNotifications(): Promise<{
  notifications: NotificationDto[];
  unreadCount: number;
}> {
  const authUser = await requireCustomer();

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: authUser.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.notification.count({
      where: { userId: authUser.id, isRead: false },
    }),
  ]);

  return {
    notifications: notifications.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      linkUrl: n.linkUrl,
      isRead: n.isRead,
      createdAt: n.createdAt,
    })),
    unreadCount,
  };
}

/**
 * Marks a specific customer notification as read.
 * Enforces user ownership.
 */
export async function markNotificationRead(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const authUser = await requireCustomer();

    const n = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: { id: true, userId: true },
    });

    if (!n || n.userId !== authUser.id) {
      return { success: false, error: 'Notification not found or unauthorized.' };
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    revalidatePath('/account/notifications');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update notification.' };
  }
}

/**
 * Marks all notifications for the authenticated customer as read.
 */
export async function markAllNotificationsRead(): Promise<{ success: boolean; error?: string }> {
  try {
    const authUser = await requireCustomer();

    await prisma.notification.updateMany({
      where: { userId: authUser.id, isRead: false },
      data: { isRead: true },
    });

    revalidatePath('/account/notifications');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to mark notifications as read.' };
  }
}
