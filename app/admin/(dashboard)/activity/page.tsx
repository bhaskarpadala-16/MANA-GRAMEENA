import 'server-only';
import React from 'react';
import { Activity, Search, ShieldCheck } from 'lucide-react';
import { getAdminActivityLogs } from '@/lib/db/admin';
import { AdminBadge } from '@/components/admin/AdminBadge';
import { Pagination } from '@/components/admin/Pagination';
import { EmptyState } from '@/components/admin/EmptyState';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Activity & Audit Log | Admin | Mana Grameena',
  description: 'Immutable system and administrative operational audit trail.',
};

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{
    action?: string;
    entity?: string;
    page?: string;
  }>;
}) {
  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page || '1', 10);
  const action = resolvedParams.action || '';
  const entity = resolvedParams.entity || '';

  const logsData = await getAdminActivityLogs({
    action,
    entity,
    page,
    pageSize: 20,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-cream-50">
          Activity & Audit Log
        </h1>
        <p className="text-xs text-cream-400 mt-1">
          Server-generated immutable trail of all privileged mutations, role elevations, and stock adjustments.
        </p>
      </div>

      {/* Filter Bar */}
      <form
        method="GET"
        className="p-4 rounded-2xl bg-herbal-900 border border-herbal-800 flex flex-col sm:flex-row items-center gap-3 shadow-lg"
      >
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-cream-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            name="action"
            defaultValue={action}
            placeholder="Filter by action (e.g. INVENTORY_ADJUSTED, PRODUCT_CREATED)..."
            className="w-full pl-10 pr-4 py-2 bg-herbal-950/80 border border-herbal-800 rounded-xl text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50 font-mono"
          />
        </div>

        <div className="relative w-full sm:w-60">
          <input
            type="text"
            name="entity"
            defaultValue={entity}
            placeholder="Filter by entity (e.g. Order, Inventory)..."
            className="w-full px-4 py-2 bg-herbal-950/80 border border-herbal-800 rounded-xl text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50"
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-herbal-800 hover:bg-herbal-700 text-xs font-semibold text-cream-100 transition-colors"
        >
          Filter
        </button>
      </form>

      {/* Activity Table */}
      <div className="rounded-3xl bg-herbal-900 border border-herbal-800 shadow-xl overflow-hidden p-6 space-y-4">
        {logsData.items.length === 0 ? (
          <EmptyState
            title="No Activity Logs"
            description="No administrative actions match your current filter."
            icon={Activity}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-herbal-800 text-cream-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3">Timestamp</th>
                    <th className="pb-3">Actor</th>
                    <th className="pb-3">Action</th>
                    <th className="pb-3">Entity</th>
                    <th className="pb-3">Entity ID</th>
                    <th className="pb-3">Mutation Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-herbal-800/60">
                  {logsData.items.map((log) => (
                    <tr key={log.id} className="hover:bg-herbal-800/30 transition-colors">
                      <td className="py-3 text-cream-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>

                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-cream-100">
                            {log.actor.firstName} {log.actor.lastName}
                          </span>
                          <AdminBadge status={log.actor.role} size="sm" />
                        </div>
                      </td>

                      <td className="py-3">
                        <span className="font-mono text-gold-400 font-semibold text-[11px] bg-herbal-950 px-2 py-0.5 rounded border border-herbal-800">
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3 text-cream-200 font-medium">{log.entity}</td>

                      <td className="py-3 font-mono text-cream-400 max-w-[130px] truncate">
                        {log.entityId}
                      </td>

                      <td className="py-3 text-cream-300 max-w-sm truncate">
                        {log.newValues ? (
                          <span className="font-mono text-[11px] text-cream-300">
                            {JSON.stringify(log.newValues)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={logsData.page}
              totalPages={logsData.totalPages}
              totalItems={logsData.total}
              pageSize={logsData.pageSize}
              baseUrl="/admin/activity"
              searchParams={{ action, entity }}
            />
          </>
        )}
      </div>
    </div>
  );
}
