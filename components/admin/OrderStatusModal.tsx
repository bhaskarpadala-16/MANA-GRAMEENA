'use client';

import React, { useState, useTransition } from 'react';
import { X, Loader2, ArrowRight, AlertCircle, ShoppingCart } from 'lucide-react';
import { updateOrderStatusAction } from '@/lib/actions/admin/orders';
import { OrderStatus } from '@prisma/client';

interface OrderStatusModalProps {
  orderId: string;
  orderNumber: string;
  currentStatus: OrderStatus;
  onClose: () => void;
  onSuccess?: () => void;
}

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.PACKED, OrderStatus.CANCELLED],
  [OrderStatus.PACKED]: [OrderStatus.SHIPPED],
  [OrderStatus.SHIPPED]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [OrderStatus.RETURNED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.RETURNED]: [],
};

export function OrderStatusModal({
  orderId,
  orderNumber,
  currentStatus,
  onClose,
  onSuccess,
}: OrderStatusModalProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  const [targetStatus, setTargetStatus] = useState<OrderStatus>(allowed[0] || currentStatus);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      const res = await updateOrderStatusAction({
        orderId,
        newStatus: targetStatus,
        notes: notes || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to update order status.');
      } else {
        if (onSuccess) onSuccess();
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-herbal-900 border border-herbal-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-herbal-800 border border-gold-500/30 text-gold-400 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-cream-50">Update Order Status</h3>
              <p className="text-xs text-cream-400 font-mono">Order #{orderNumber}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-cream-400 hover:text-cream-100 hover:bg-herbal-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {allowed.length === 0 ? (
          <div className="p-4 rounded-2xl bg-herbal-950/80 border border-herbal-800 text-xs text-cream-400 text-center space-y-2">
            <p className="font-semibold text-cream-200">Terminal Order Status Reached</p>
            <p>
              Order #{orderNumber} is currently{' '}
              <span className="font-bold text-cream-100">{currentStatus}</span> and cannot be
              transitioned further.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
                Current Status
              </label>
              <div className="px-4 py-2 bg-herbal-950/80 border border-herbal-800 rounded-xl text-xs font-semibold text-cream-200">
                {currentStatus}
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
                Target Transition *
              </label>
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value as OrderStatus)}
                className="w-full px-4 py-2.5 bg-herbal-950 border border-herbal-800 rounded-xl text-xs text-cream-100 focus:outline-none focus:border-gold-500/50 font-semibold"
              >
                {allowed.map((st) => (
                  <option key={st} value={st}>
                    Advance to: {st.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
                Fulfillment Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes or courier reference..."
                className="w-full px-3 py-2 bg-herbal-950 border border-herbal-800 rounded-xl text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs text-cream-400 hover:text-cream-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-herbal-800 hover:bg-herbal-700 text-gold-400 border border-gold-500/30 text-xs font-bold transition-all cursor-pointer shadow-lg disabled:opacity-40"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Transitioning...
                  </>
                ) : (
                  <>
                    Confirm Transition <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
