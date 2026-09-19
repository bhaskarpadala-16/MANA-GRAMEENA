import 'server-only';
import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CouponCreateForm } from '@/components/admin/CouponCreateForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Create Coupon | Admin | Mana Grameena',
};

export default function NewCouponPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/coupons"
          className="p-2 rounded-xl bg-herbal-900 border border-herbal-800 text-cream-400 hover:text-cream-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-cream-50">
            Create Promotional Coupon
          </h1>
          <p className="text-xs text-cream-400 mt-0.5">
            Configure new discount codes, minimum order requirements, and redemption limits.
          </p>
        </div>
      </div>

      <CouponCreateForm />
    </div>
  );
}
