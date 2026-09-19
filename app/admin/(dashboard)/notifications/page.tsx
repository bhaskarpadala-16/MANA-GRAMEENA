import 'server-only';
import React from 'react';
import { Bell } from 'lucide-react';
import { getAdminNotifications } from '@/lib/db/admin';
import { NotificationBroadcastForm } from '@/components/admin/NotificationBroadcastForm';
import { Pagination } from '@/components/admin/Pagination';
import { EmptyState } from '@/components/admin/EmptyState';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Alerts & Broadcasts | Admin | Mana Grameena',
  description: 'Store announcements and notification management.',
};

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page || '1', 10);

  const notificationsData = await getAdminNotifications({
    page,
    pageSize: 15,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-cream-50">
          Alerts & Customer Broadcasts
        </h1>
        <p className="text-xs text-cream-400 mt-1">
          Publish storewide notices, seasonal harvest announcements, and customer advisories.
        </p>
      </div>

      {/* Broadcast Form */}
      <NotificationBroadcastForm />

      {/* Dispatched Notifications Log */}
      <div className="rounded-3xl bg-herbal-900 border border-herbal-800 shadow-xl overflow-hidden p-6 space-y-4">
        <h3 className="font-serif text-base font-bold text-cream-50 border-b border-herbal-800 pb-3">
          Recently Dispatched Notifications
        </h3>

        {notificationsData.items.length === 0 ? (
          <EmptyState
            title="No Notifications Sent"
            description="Broadcast alerts or order updates sent to customers will be tracked here."
            icon={Bell}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-herbal-800 text-cream-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3">Timestamp</th>
                    <th className="pb-3">Recipient</th>
                    <th className="pb-3">Title</th>
                    <th className="pb-3">Message</th>
                    <th className="pb-3">Link</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-herbal-800/60">
                  {notificationsData.items.map((n) => (
                    <tr key={n.id} className="hover:bg-herbal-800/30 transition-colors">
                      <td className="py-3 text-cream-400 whitespace-nowrap">
                        {new Date(n.createdAt).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="py-3 font-semibold text-cream-100 whitespace-nowrap">
                        {n.profile.firstName} {n.profile.lastName}
                      </td>

                      <td className="py-3 font-semibold text-gold-400 max-w-[180px] truncate">
                        {n.title}
                      </td>

                      <td className="py-3 text-cream-300 max-w-xs truncate">{n.message}</td>

                      <td className="py-3 font-mono text-[11px] text-cream-400 truncate max-w-[120px]">
                        {n.linkUrl || '—'}
                      </td>

                      <td className="py-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase ${
                            n.isRead
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {n.isRead ? 'Read' : 'Unread'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={notificationsData.page}
              totalPages={notificationsData.totalPages}
              totalItems={notificationsData.total}
              pageSize={notificationsData.pageSize}
              baseUrl="/admin/notifications"
            />
          </>
        )}
      </div>
    </div>
  );
}
