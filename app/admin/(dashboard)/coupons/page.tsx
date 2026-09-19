import 'server-only';
import React from 'react';
import { getAdminCoupons } from '@/lib/db/admin';
import { CouponManager } from '@/components/admin/CouponManager';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Coupons & Discounts | Admin | Mana Grameena',
  description: 'Promotional codes, discount quotas, and usage restrictions.',
};

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    isActive?: string;
    page?: string;
  }>;
}) {
  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page || '1', 10);
  const search = resolvedParams.search || '';
  const isActiveParam = resolvedParams.isActive;
  const isActive =
    isActiveParam === 'true' ? true : isActiveParam === 'false' ? false : undefined;

  const couponsData = await getAdminCoupons({
    search,
    isActive,
    page,
    pageSize: 15,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-cream-50">
          Coupons & Discounts
        </h1>
        <p className="text-xs text-cream-400 mt-1">
          Configure percentage or fixed discounts, minimum cart values, and usage caps.
        </p>
      </div>

      <CouponManager initialData={couponsData} search={search} isActive={isActive} />
    </div>
  );
}
