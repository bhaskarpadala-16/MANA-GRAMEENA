import 'server-only';
import React from 'react';
import Link from 'next/link';
import {
  IndianRupee,
  ShoppingCart,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Boxes,
  Activity,
  Package,
  Sparkles,
} from 'lucide-react';
import { getAdminDashboardMetrics } from '@/lib/db/admin';
import { AdminStatsCard } from '@/components/admin/AdminStatsCard';
import { AdminBadge } from '@/components/admin/AdminBadge';
import { EmptyState } from '@/components/admin/EmptyState';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Admin Dashboard | Mana Grameena',
  description: 'Live PostgreSQL operational metrics and administrative controls.',
};

export default async function AdminOverviewPage() {
  const metrics = await getAdminDashboardMetrics();

  return (
    <div className="space-y-8">
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-herbal-900 border border-gold-500/30 text-gold-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Store Operations</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-cream-50">
            Administrative Command Center
          </h1>
          <p className="text-xs text-cream-400 mt-1">
            Real-time business telemetry and database operations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-herbal-800 border border-gold-500/30 text-gold-400 hover:bg-herbal-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Package className="w-4 h-4" />
            Add New Product
          </Link>
        </div>
      </div>

      {/* Action Banners */}
      {(metrics.pendingPaymentCount > 0 || metrics.lowStockCount > 0 || metrics.pendingOrders > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {metrics.pendingPaymentCount > 0 && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-cream-100">
                  {metrics.pendingPaymentCount} UPI Payments Awaiting Verification
                </h4>
                <p className="text-[11px] text-cream-300">
                  Manual UPI payments require administrator review.
                </p>
                <Link
                  href="/admin/orders/payments"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:underline pt-1"
                >
                  Verify Now <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}

          {metrics.lowStockCount > 0 && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
              <Boxes className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-cream-100">
                  {metrics.lowStockCount} Products Below Stock Threshold
                </h4>
                <p className="text-[11px] text-cream-300">
                  Inventory items have reached critical reorder levels.
                </p>
                <Link
                  href="/admin/inventory?lowStockOnly=true"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:underline pt-1"
                >
                  Inspect Inventory <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}

          {metrics.pendingOrders > 0 && (
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-start gap-3">
              <ShoppingCart className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-cream-100">
                  {metrics.pendingOrders} Orders Ready for Processing
                </h4>
                <p className="text-[11px] text-cream-300">
                  Customer orders awaiting confirmation and packing.
                </p>
                <Link
                  href="/admin/orders?orderStatus=PENDING"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:underline pt-1"
                >
                  View Orders <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <AdminStatsCard
          title="Verified Revenue"
          value={`₹${metrics.totalRevenue.toLocaleString('en-IN')}`}
          subtitle="Non-cancelled order totals"
          icon={IndianRupee}
          badge="Live"
          badgeColor="emerald"
        />

        <AdminStatsCard
          title="Total Orders"
          value={metrics.totalOrders}
          subtitle={`${metrics.completedOrders} Delivered • ${metrics.pendingOrders} Pending`}
          icon={ShoppingCart}
          badge={`${metrics.cancelledOrders} Cancelled`}
          badgeColor={metrics.cancelledOrders > 0 ? 'rose' : 'emerald'}
        />

        <AdminStatsCard
          title="Registered Customers"
          value={metrics.customerCount}
          subtitle="Verified active customer accounts"
          icon={Users}
          badge="Database"
          badgeColor="blue"
        />

        <AdminStatsCard
          title="Payment Proof Queue"
          value={metrics.pendingPaymentCount}
          subtitle="Manual UPI proofs pending verification"
          icon={CheckCircle2}
          badge={metrics.pendingPaymentCount > 0 ? 'Action Req' : 'Clear'}
          badgeColor={metrics.pendingPaymentCount > 0 ? 'amber' : 'emerald'}
        />
      </div>

      {/* Two Column Layout: Recent Orders & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders (2 Cols) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-herbal-900 border border-herbal-800 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-cream-50">Recent Orders</h3>
              <p className="text-xs text-cream-400">Latest customer purchases</p>
            </div>
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1 text-xs font-semibold text-gold-400 hover:underline"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {metrics.recentOrders.length === 0 ? (
            <EmptyState
              title="No Orders Yet"
              description="Customer purchases placed on the storefront will appear here."
              icon={ShoppingCart}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-herbal-800 text-cream-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3">Order #</th>
                    <th className="pb-3">Customer</th>
                    <th className="pb-3">Items</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-herbal-800/60">
                  {metrics.recentOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-herbal-800/30 transition-colors">
                      <td className="py-3 font-mono font-semibold text-cream-100">
                        {o.orderNumber}
                      </td>
                      <td className="py-3 text-cream-200">
                        {o.profile.firstName} {o.profile.lastName}
                      </td>
                      <td className="py-3 text-cream-400">{o._count.items} item(s)</td>
                      <td className="py-3 font-semibold text-cream-100">
                        ₹{Number(o.totalAmount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3">
                        <AdminBadge status={o.orderStatus} size="sm" />
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href={`/admin/orders/${o.id}`}
                          className="px-2.5 py-1 rounded-lg bg-herbal-800 hover:bg-herbal-700 text-cream-200 font-medium transition-colors"
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Low Stock Alerts (1 Col) */}
        <div className="p-6 rounded-3xl bg-herbal-900 border border-herbal-800 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-cream-50">Stock Alerts</h3>
              <p className="text-xs text-cream-400">Items at or below threshold</p>
            </div>
            <Link
              href="/admin/inventory"
              className="inline-flex items-center gap-1 text-xs font-semibold text-gold-400 hover:underline"
            >
              Inventory <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {metrics.lowStockItems.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-xs font-semibold text-cream-200">Stock Levels Healthy</p>
              <p className="text-[11px] text-cream-400">No products are currently under threshold.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {metrics.lowStockItems.map((inv) => (
                <div
                  key={inv.id}
                  className="p-3.5 rounded-2xl bg-herbal-950/60 border border-rose-500/20 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-cream-100 truncate">{inv.product.name}</p>
                    <p className="text-[10px] text-cream-400">
                      SKU: {inv.variant?.sku || inv.product.sku}
                      {inv.variant && ` • ${inv.variant.title}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-bold text-rose-400">
                      {inv.stockQuantity} left
                    </span>
                    <p className="text-[10px] text-cream-500">Min: {inv.lowStockThreshold}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Admin Activity Audit Log */}
      <div className="p-6 rounded-3xl bg-herbal-900 border border-herbal-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-herbal-800 text-gold-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-cream-50">Recent System Activity</h3>
              <p className="text-xs text-cream-400">Live immutable administrative mutation logs</p>
            </div>
          </div>
          <Link
            href="/admin/activity"
            className="inline-flex items-center gap-1 text-xs font-semibold text-gold-400 hover:underline"
          >
            Audit Log <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {metrics.recentActivity.length === 0 ? (
          <p className="text-xs text-cream-400 italic py-4">No privileged mutations recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-herbal-800 text-cream-400 font-semibold uppercase tracking-wider">
                  <th className="pb-2">Time</th>
                  <th className="pb-2">Actor</th>
                  <th className="pb-2">Action</th>
                  <th className="pb-2">Entity</th>
                  <th className="pb-2">Target ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-herbal-800/40">
                {metrics.recentActivity.map((log) => (
                  <tr key={log.id} className="text-cream-300">
                    <td className="py-2.5 text-cream-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 font-medium text-cream-100">
                      {log.actor.firstName} {log.actor.lastName}
                    </td>
                    <td className="py-2.5 font-mono text-[11px] text-gold-400">{log.action}</td>
                    <td className="py-2.5 text-cream-200">{log.entity}</td>
                    <td className="py-2.5 font-mono text-[11px] text-cream-400 truncate max-w-[120px]">
                      {log.entityId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
