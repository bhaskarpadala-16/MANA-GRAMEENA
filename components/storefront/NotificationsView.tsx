'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  NotificationDto,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/actions/notifications';
import {
  Bell,
  CheckCircle2,
  Clock,
  ArrowRight,
  CheckCheck,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface NotificationsViewProps {
  initialNotifications: NotificationDto[];
  unreadCount: number;
}

export default function NotificationsView({
  initialNotifications,
  unreadCount: initialUnreadCount,
}: NotificationsViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notifications, setNotifications] = useState<NotificationDto[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState<number>(initialUnreadCount);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleMarkRead = (id: string) => {
    startTransition(async () => {
      const res = await markNotificationRead(id);
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
        router.refresh();
      } else {
        setErrorMessage(res.error || 'Failed to update notification.');
      }
    });
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      const res = await markAllNotificationsRead();
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        router.refresh();
      } else {
        setErrorMessage(res.error || 'Failed to update notifications.');
      }
    });
  };

  if (notifications.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-cream-300 shadow-sm max-w-md mx-auto space-y-4">
        <div className="w-16 h-16 rounded-full bg-cream-100 text-herbal-800 flex items-center justify-center mx-auto">
          <Bell className="w-8 h-8" />
        </div>
        <h2 className="font-serif text-xl font-bold text-herbal-950">No Notifications</h2>
        <p className="text-xs text-herbal-700 leading-relaxed">
          You are all caught up! Order updates, fulfillment status, and store alerts will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-herbal-700 font-medium">
          {unreadCount > 0 ? (
            <strong className="text-herbal-950">{unreadCount} unread notification(s)</strong>
          ) : (
            'All notifications read'
          )}
        </span>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-terracotta-600 hover:text-terracotta-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`p-5 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              !n.isRead
                ? 'bg-white border-herbal-400/80 shadow-md ring-1 ring-herbal-700/10'
                : 'bg-white/80 border-cream-300 opacity-80'
            }`}
          >
            <div className="flex items-start gap-4 flex-1">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                  !n.isRead
                    ? 'bg-herbal-800 text-gold-400 shadow-sm'
                    : 'bg-cream-100 text-herbal-700'
                }`}
              >
                <Bell className="w-5 h-5" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-sm text-herbal-950">{n.title}</h3>
                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-terracotta-600 animate-pulse" />
                  )}
                </div>
                <p className="text-xs text-herbal-800/90 leading-relaxed">{n.message}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-herbal-500 pt-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    {new Date(n.createdAt).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              {n.linkUrl && (
                <Link
                  href={n.linkUrl}
                  onClick={() => !n.isRead && handleMarkRead(n.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cream-100 hover:bg-herbal-800 hover:text-cream-100 text-xs font-semibold text-herbal-900 border border-cream-300 transition-colors"
                >
                  <span>View</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}

              {!n.isRead && (
                <button
                  type="button"
                  onClick={() => handleMarkRead(n.id)}
                  disabled={isPending}
                  className="p-2 rounded-xl text-herbal-600 hover:text-herbal-950 hover:bg-cream-100 transition-colors disabled:opacity-50"
                  title="Mark as read"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
