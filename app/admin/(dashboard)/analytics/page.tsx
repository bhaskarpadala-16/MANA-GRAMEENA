import 'server-only';
import React from 'react';
import { BarChart3, TrendingUp, CreditCard, PieChart } from 'lucide-react';
import { getAdminAnalytics } from '@/lib/db/admin';
import { AdminBadge } from '@/components/admin/AdminBadge';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Business Analytics | Admin | Mana Grameena',
  description: 'Database-derived business performance telemetry and financial breakdown.',
};

export default async function AdminAnalyticsPage() {
  const analytics = await getAdminAnalytics();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-cream-50">
          Business Analytics & Intelligence
        </h1>
        <p className="text-xs text-cream-400 mt-1">
          Aggregated database metrics covering order pipelines, payment methods, and revenue trajectories.
        </p>
      </div>

      {/* Grid: Status Distribution & Payment Methods */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Order Status Distribution */}
        <div className="p-6 rounded-3xl bg-herbal-900 border border-herbal-800 shadow-xl space-y-4">
          <div className="flex items-center gap-3 border-b border-herbal-800 pb-3">
            <div className="w-8 h-8 rounded-xl bg-herbal-800 text-gold-400 flex items-center justify-center">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-cream-50">
                Order Pipeline Distribution
              </h3>
              <p className="text-xs text-cream-400">Order count and volume by lifecycle state</p>
            </div>
          </div>

          {analytics.ordersByStatus.length === 0 ? (
            <p className="text-xs text-cream-400 italic py-4">No order records available.</p>
          ) : (
            <div className="space-y-3">
              {analytics.ordersByStatus.map((s) => (
                <div
                  key={s.status}
                  className="p-3.5 rounded-2xl bg-herbal-950/60 border border-herbal-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <AdminBadge status={s.status} size="sm" />
                    <span className="text-xs font-semibold text-cream-200">
                      {s.count} order(s)
                    </span>
                  </div>
                  <span className="font-serif text-sm font-bold text-cream-100">
                    ₹{s.revenue.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Methods Breakdown */}
        <div className="p-6 rounded-3xl bg-herbal-900 border border-herbal-800 shadow-xl space-y-4">
          <div className="flex items-center gap-3 border-b border-herbal-800 pb-3">
            <div className="w-8 h-8 rounded-xl bg-herbal-800 text-gold-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-cream-50">
                Payment Channel Breakdown
              </h3>
              <p className="text-xs text-cream-400">Volume across Cash on Delivery & Manual UPI</p>
            </div>
          </div>

          {analytics.paymentsByMethod.length === 0 ? (
            <p className="text-xs text-cream-400 italic py-4">No payment records available.</p>
          ) : (
            <div className="space-y-3">
              {analytics.paymentsByMethod.map((p, idx) => (
                <div
                  key={`${p.method}-${p.status}-${idx}`}
                  className="p-3.5 rounded-2xl bg-herbal-950/60 border border-herbal-800 flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-xs text-gold-400 uppercase tracking-wider block">
                      {p.method}
                    </span>
                    <span className="text-[11px] text-cream-400">
                      {p.count} transaction(s) • Status: {p.status}
                    </span>
                  </div>
                  <span className="font-serif text-sm font-bold text-cream-100">
                    ₹{p.amount.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Monthly Revenue Aggregation */}
      <div className="p-6 rounded-3xl bg-herbal-900 border border-herbal-800 shadow-xl space-y-4">
        <div className="flex items-center gap-3 border-b border-herbal-800 pb-3">
          <div className="w-8 h-8 rounded-xl bg-herbal-800 text-gold-400 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-cream-50">
              Monthly Revenue Aggregation
            </h3>
            <p className="text-xs text-cream-400">
              Aggregated from verified and non-cancelled historical customer purchases
            </p>
          </div>
        </div>

        {analytics.monthlyRevenue.length === 0 ? (
          <p className="text-xs text-cream-400 italic py-4">
            No completed monthly order history yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {analytics.monthlyRevenue.map((m) => (
              <div
                key={m.month}
                className="p-4 rounded-2xl bg-herbal-950/60 border border-herbal-800 space-y-1"
              >
                <span className="font-mono text-xs text-gold-400 font-semibold uppercase tracking-wider">
                  {m.month}
                </span>
                <div className="font-serif text-xl font-bold text-cream-50">
                  ₹{m.revenue.toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-cream-400">{m.count} order(s) processed</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
