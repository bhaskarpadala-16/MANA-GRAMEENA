'use client';

import React, { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Ticket, Power, Search } from 'lucide-react';
import { Pagination } from './Pagination';
import { EmptyState } from './EmptyState';
import { toggleCouponActiveAction } from '@/lib/actions/admin/coupons';

interface CouponItem {
  id: string;
  code: string;
  discountType: string;
  discountValue: any;
  minOrderAmount: any;
  maxDiscountAmount?: any;
  startDate: Date;
  expiryDate: Date;
  totalUsageLimit?: number | null;
  usedCount: number;
  perUserLimit: number;
  isActive: boolean;
  _count: { usages: number };
}

interface CouponManagerProps {
  initialData: {
    items: CouponItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  search: string;
  isActive?: boolean;
}

export function CouponManager({ initialData, search, isActive }: CouponManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleToggleActive = (couponId: string, current: boolean) => {
    startTransition(async () => {
      const res = await toggleCouponActiveAction(couponId, !current);
      if (res.success) {
        router.refresh();
      } else {
        alert('Failed to update coupon status.');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <form
          method="GET"
          className="flex items-center gap-3 w-full sm:w-auto flex-1 max-w-md"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-cream-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search coupon codes..."
              className="w-full pl-10 pr-4 py-2 bg-herbal-900 border border-herbal-800 rounded-xl text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50 uppercase font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-herbal-800 border border-herbal-700 text-cream-200 hover:bg-herbal-700 text-xs font-semibold"
          >
            Search
          </button>
        </form>

        <Link
          href="/admin/coupons/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-herbal-800 border border-gold-500/30 text-gold-400 hover:bg-herbal-700 text-xs font-semibold transition-colors cursor-pointer shadow"
        >
          <Plus className="w-4 h-4" />
          Create Coupon
        </Link>
      </div>

      {/* Coupons Table */}
      <div className="p-6 rounded-3xl bg-herbal-900 border border-herbal-800 shadow-xl space-y-4">
        {initialData.items.length === 0 ? (
          <EmptyState
            title="No Coupons Found"
            description="Create promotional discount codes for your customers."
            icon={Ticket}
            actionHref="/admin/coupons/new"
            actionLabel="Create First Coupon"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-herbal-800 text-cream-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3">Code</th>
                    <th className="pb-3">Discount</th>
                    <th className="pb-3">Min Order</th>
                    <th className="pb-3">Max Cap</th>
                    <th className="pb-3">Usage</th>
                    <th className="pb-3">Expiry</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Toggle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-herbal-800/60">
                  {initialData.items.map((c) => {
                    const isExpired = c.expiryDate && new Date(c.expiryDate) < new Date();

                    return (
                      <tr key={c.id} className="hover:bg-herbal-800/30 transition-colors">
                        <td className="py-3 font-mono font-bold text-gold-400 text-sm">{c.code}</td>

                        <td className="py-3 font-semibold text-cream-100">
                          {c.discountType === 'PERCENTAGE'
                            ? `${Number(c.discountValue)}% OFF`
                            : `₹${Number(c.discountValue)} FLAT`}
                        </td>

                        <td className="py-3 text-cream-300 font-mono">
                          {Number(c.minOrderAmount) > 0 ? `₹${Number(c.minOrderAmount)}` : 'None'}
                        </td>

                        <td className="py-3 text-cream-400 font-mono">
                          {c.maxDiscountAmount ? `₹${Number(c.maxDiscountAmount)}` : 'None'}
                        </td>

                        <td className="py-3 text-cream-300 font-mono">
                          {c.usedCount} {c.totalUsageLimit ? `/ ${c.totalUsageLimit}` : 'uses'}
                        </td>

                        <td className="py-3 text-cream-400 whitespace-nowrap">
                          {c.expiryDate ? (
                            <span className={isExpired ? 'text-rose-400 font-semibold' : ''}>
                              {new Date(c.expiryDate).toLocaleDateString('en-IN')}
                              {isExpired && ' (Expired)'}
                            </span>
                          ) : (
                            'No Expiry'
                          )}
                        </td>

                        <td className="py-3">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase ${
                              c.isActive && !isExpired
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {c.isActive && !isExpired ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(c.id, c.isActive)}
                            disabled={isPending}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              c.isActive
                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                            }`}
                            title={c.isActive ? 'Deactivate' : 'Activate'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={initialData.page}
              totalPages={initialData.totalPages}
              totalItems={initialData.total}
              pageSize={initialData.pageSize}
              baseUrl="/admin/coupons"
              searchParams={{ search }}
            />
          </>
        )}
      </div>
    </div>
  );
}
