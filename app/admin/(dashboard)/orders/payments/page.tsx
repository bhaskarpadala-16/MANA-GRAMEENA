import 'server-only';
import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getAdminPendingPaymentProofs } from '@/lib/db/admin';
import { PaymentVerificationTable } from '@/components/admin/PaymentVerificationTable';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'UPI Payment Verification | Admin | Mana Grameena',
  description: 'Manual UPI payment proof review and audit verification queue.',
};

export default async function AdminPaymentsVerificationPage() {
  const pendingProofs = await getAdminPendingPaymentProofs();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/orders"
          className="p-2 rounded-xl bg-herbal-900 border border-herbal-800 text-cream-400 hover:text-cream-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-cream-50">
            Manual UPI Verification Portal
          </h1>
          <p className="text-xs text-cream-400 mt-0.5">
            Audit customer bank UTR references and confirm order payments securely.
          </p>
        </div>
      </div>

      <PaymentVerificationTable proofs={pendingProofs} />
    </div>
  );
}
