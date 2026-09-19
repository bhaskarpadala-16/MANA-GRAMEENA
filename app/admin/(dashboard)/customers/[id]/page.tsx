import 'server-only';
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getAdminCustomerDetail } from '@/lib/db/admin';
import { CustomerDetailClient } from '@/components/admin/CustomerDetailClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Customer Details | Admin | Mana Grameena',
};

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getAdminCustomerDetail(id);

  if (!customer) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-2 text-xs font-semibold text-cream-400 hover:text-cream-100 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Customer Directory
      </Link>

      <CustomerDetailClient customer={customer} />
    </div>
  );
}
