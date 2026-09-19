import 'server-only';
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getAdminOrderDetail } from '@/lib/db/admin';
import { OrderDetailClient } from '@/components/admin/OrderDetailClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Order Details | Admin | Mana Grameena',
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getAdminOrderDetail(id);

  if (!order) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-2 text-xs font-semibold text-cream-400 hover:text-cream-100 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Orders
      </Link>

      <OrderDetailClient order={order} />
    </div>
  );
}
