'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { User, Phone, Calendar, ShoppingCart, MapPin, Loader2, ShieldAlert } from 'lucide-react';
import { AdminBadge } from './AdminBadge';
import { toggleCustomerActiveStatusAction } from '@/lib/actions/admin/customers';

interface CustomerDetailClientProps {
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    isActive: boolean;
    createdAt: Date;
    addresses: {
      id: string;
      fullName: string;
      phone: string;
      addressLine1: string;
      addressLine2?: string | null;
      landmark?: string | null;
      city: string;
      state: string;
      postalCode: string;
      isDefault: boolean;
    }[];
    orders: {
      id: string;
      orderNumber: string;
      orderStatus: any;
      paymentStatus: any;
      totalAmount: any;
      createdAt: Date;
      _count: { items: number };
    }[];
    reviews: {
      id: string;
      rating: number;
      reviewText: string;
      product: { name: string; slug: string };
    }[];
  };
}

export function CustomerDetailClient({ customer }: CustomerDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);

  const totalSpent = customer.orders.reduce((acc, curr) => acc + Number(curr.totalAmount), 0);

  const handleToggleStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusReason.trim()) {
      setErrorMsg('A reason is mandatory for altering customer status.');
      return;
    }

    setErrorMsg(null);
    startTransition(async () => {
      const res = await toggleCustomerActiveStatusAction({
        customerId: customer.id,
        isActive: !customer.isActive,
        reason: statusReason,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to update customer status.');
      } else {
        setShowStatusConfirm(false);
        setStatusReason('');
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Header Profile Card */}
      <div className="p-6 rounded-3xl bg-herbal-900 border border-herbal-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-herbal-800 border border-gold-500/30 text-gold-400 flex items-center justify-center font-serif text-xl font-bold">
            {customer.firstName[0]}
            {customer.lastName[0]}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-serif text-2xl font-bold text-cream-50">
                {customer.firstName} {customer.lastName}
              </h2>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase ${
                  customer.isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}
              >
                {customer.isActive ? 'Active Account' : 'Deactivated'}
              </span>
            </div>
            <p className="text-xs text-cream-400 mt-1">
              Member since {new Date(customer.createdAt).toLocaleDateString('en-IN')} • Phone:{' '}
              <span className="font-mono text-cream-200">{customer.phone || 'None'}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowStatusConfirm(true)}
          className={`px-4 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
            customer.isActive
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
          }`}
        >
          {customer.isActive ? 'Deactivate Customer' : 'Activate Customer'}
        </button>
      </div>

      {/* Confirmation Modal */}
      {showStatusConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="max-w-md w-full p-6 rounded-3xl bg-herbal-900 border border-herbal-800 space-y-4 shadow-2xl">
            <h3 className="font-serif text-base font-bold text-cream-50">
              {customer.isActive ? 'Deactivate Account' : 'Activate Account'}
            </h3>
            <p className="text-xs text-cream-400">
              {customer.isActive
                ? 'Deactivating this customer will immediately block storefront login and order creation.'
                : 'Activating this customer will restore full purchasing privileges.'}
            </p>

            {errorMsg && (
              <p className="text-xs text-rose-400 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30">
                {errorMsg}
              </p>
            )}

            <form onSubmit={handleToggleStatus} className="space-y-3">
              <textarea
                required
                rows={2}
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Mandatory administrative reason for audit log..."
                className="w-full px-3 py-2 bg-herbal-950 border border-herbal-800 rounded-xl text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStatusConfirm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-cream-400 hover:text-cream-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 rounded-lg bg-herbal-800 text-gold-400 border border-gold-500/30 text-xs font-bold hover:bg-herbal-700 disabled:opacity-50"
                >
                  {isPending ? 'Updating...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-herbal-900 border border-herbal-800 space-y-1">
          <span className="text-xs text-cream-400 uppercase tracking-wider block">Total Spend</span>
          <span className="font-serif text-2xl font-bold text-gold-400">
            ₹{totalSpent.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-herbal-900 border border-herbal-800 space-y-1">
          <span className="text-xs text-cream-400 uppercase tracking-wider block">Orders Placed</span>
          <span className="font-serif text-2xl font-bold text-cream-50">
            {customer.orders.length}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-herbal-900 border border-herbal-800 space-y-1">
          <span className="text-xs text-cream-400 uppercase tracking-wider block">
            Reviews Submitted
          </span>
          <span className="font-serif text-2xl font-bold text-cream-50">
            {customer.reviews.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Orders History (2 Cols) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-herbal-900 border border-herbal-800 shadow-xl space-y-4">
          <h3 className="font-serif text-base font-bold text-cream-50 border-b border-herbal-800 pb-3">
            Customer Order History
          </h3>

          {customer.orders.length === 0 ? (
            <p className="text-xs text-cream-400 italic py-4">No orders placed by this customer.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-herbal-800 text-cream-400 font-semibold uppercase tracking-wider">
                    <th className="pb-2">Order #</th>
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Items</th>
                    <th className="pb-2">Total</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-herbal-800/40">
                  {customer.orders.map((o) => (
                    <tr key={o.id} className="text-cream-200">
                      <td className="py-2.5 font-mono font-bold text-cream-100">
                        <a href={`/admin/orders/${o.id}`} className="hover:text-gold-400">
                          {o.orderNumber}
                        </a>
                      </td>
                      <td className="py-2.5 text-cream-400">
                        {new Date(o.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-2.5 text-cream-300">{o._count.items} item(s)</td>
                      <td className="py-2.5 font-semibold text-cream-100">
                        ₹{Number(o.totalAmount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5">
                        <AdminBadge status={o.orderStatus} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Addresses (1 Col) */}
        <div className="p-6 rounded-3xl bg-herbal-900 border border-herbal-800 shadow-xl space-y-4">
          <h3 className="font-serif text-base font-bold text-cream-50 border-b border-herbal-800 pb-3">
            Saved Addresses
          </h3>

          {customer.addresses.length === 0 ? (
            <p className="text-xs text-cream-400 italic py-4">No saved delivery addresses.</p>
          ) : (
            <div className="space-y-3">
              {customer.addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="p-3.5 rounded-2xl bg-herbal-950/60 border border-herbal-800 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-cream-100">{addr.fullName}</span>
                    {addr.isDefault && (
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-gold-500/20 text-gold-300 font-bold">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-cream-300">{addr.addressLine1}</p>
                  {addr.addressLine2 && <p className="text-cream-300">{addr.addressLine2}</p>}
                  <p className="text-cream-400">
                    {addr.city}, {addr.state} - {addr.postalCode}
                  </p>
                  <p className="text-[11px] font-mono text-cream-400 pt-1">Phone: {addr.phone}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
