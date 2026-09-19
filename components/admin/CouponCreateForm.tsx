'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Save, ArrowLeft, AlertCircle } from 'lucide-react';
import { createCouponAction } from '@/lib/actions/admin/coupons';
import { DiscountType } from '@prisma/client';

export function CouponCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>(DiscountType.PERCENTAGE);
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('0');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [totalUsageLimit, setTotalUsageLimit] = useState('');
  const [perUserLimit, setPerUserLimit] = useState('1');
  const [isActive, setIsActive] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!expiryDate) {
      setErrorMsg('Expiry date is required.');
      return;
    }

    const payload = {
      code,
      discountType,
      discountValue: parseFloat(discountValue) || 0,
      minOrderAmount: parseFloat(minOrderAmount) || 0,
      maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : null,
      startDate: new Date().toISOString(),
      expiryDate: new Date(expiryDate).toISOString(),
      totalUsageLimit: totalUsageLimit ? parseInt(totalUsageLimit, 10) : null,
      perUserLimit: parseInt(perUserLimit, 10) || 1,
      isActive,
    };

    startTransition(async () => {
      const res = await createCouponAction(payload);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to create coupon.');
      } else {
        router.push('/admin/coupons');
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="p-6 rounded-3xl bg-herbal-900 border border-herbal-800 shadow-xl space-y-4">
        <h3 className="font-serif text-base font-bold text-cream-50 border-b border-herbal-800 pb-3">
          Coupon Rules & Restrictions
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
              Coupon Code *
            </label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. HERBAL15"
              className="w-full px-4 py-2.5 bg-herbal-950 border border-herbal-800 rounded-xl text-xs font-mono font-bold text-gold-400 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50 uppercase"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
              Discount Type *
            </label>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as DiscountType)}
              className="w-full px-4 py-2.5 bg-herbal-950 border border-herbal-800 rounded-xl text-xs text-cream-200 focus:outline-none focus:border-gold-500/50 font-semibold"
            >
              <option value={DiscountType.PERCENTAGE}>Percentage (%) Discount</option>
              <option value={DiscountType.FIXED}>Flat Rupee (₹) Discount</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
              Discount Value ({discountType === DiscountType.PERCENTAGE ? '%' : '₹'}) *
            </label>
            <input
              type="number"
              step="0.01"
              required
              min="0.01"
              max={discountType === DiscountType.PERCENTAGE ? '100' : undefined}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountType === DiscountType.PERCENTAGE ? '15' : '100'}
              className="w-full px-4 py-2.5 bg-herbal-950 border border-herbal-800 rounded-xl text-xs font-mono text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
              Minimum Cart Total (₹)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={minOrderAmount}
              onChange={(e) => setMinOrderAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-2.5 bg-herbal-950 border border-herbal-800 rounded-xl text-xs font-mono text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50"
            />
          </div>

          {discountType === DiscountType.PERCENTAGE && (
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
                Max Discount Cap (₹)
              </label>
              <input
                type="number"
                min="1"
                value={maxDiscountAmount}
                onChange={(e) => setMaxDiscountAmount(e.target.value)}
                placeholder="200"
                className="w-full px-4 py-2.5 bg-herbal-950 border border-herbal-800 rounded-xl text-xs font-mono text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
              Total Usage Limit
            </label>
            <input
              type="number"
              min="1"
              value={totalUsageLimit}
              onChange={(e) => setTotalUsageLimit(e.target.value)}
              placeholder="e.g. 100 uses (blank for unlimited)"
              className="w-full px-4 py-2.5 bg-herbal-950 border border-herbal-800 rounded-xl text-xs font-mono text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
              Per-User Limit *
            </label>
            <input
              type="number"
              min="1"
              required
              value={perUserLimit}
              onChange={(e) => setPerUserLimit(e.target.value)}
              placeholder="1"
              className="w-full px-4 py-2.5 bg-herbal-950 border border-herbal-800 rounded-xl text-xs font-mono text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
              Expiry Date *
            </label>
            <input
              type="date"
              required
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-herbal-950 border border-herbal-800 rounded-xl text-xs text-cream-100 focus:outline-none focus:border-gold-500/50 font-mono"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-3 border-t border-herbal-800">
          <input
            type="checkbox"
            id="isActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded bg-herbal-950 border-herbal-800 text-gold-500 focus:ring-gold-500"
          />
          <label htmlFor="isActive" className="text-xs text-cream-200 font-semibold cursor-pointer">
            Activate coupon immediately upon creation
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Link
          href="/admin/coupons"
          className="inline-flex items-center gap-2 text-xs font-semibold text-cream-400 hover:text-cream-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Cancel
        </Link>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-herbal-800 border border-gold-500/30 text-gold-400 hover:bg-herbal-700 text-xs font-bold transition-all cursor-pointer shadow-lg disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving Coupon...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Create Coupon
            </>
          )}
        </button>
      </div>
    </form>
  );
}
