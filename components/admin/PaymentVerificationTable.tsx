'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { PaymentProofModal } from './PaymentProofModal';
import { EmptyState } from './EmptyState';

interface PaymentProofItem {
  id: string;
  transactionReferenceId: string;
  screenshotStoragePath: string;
  reviewStatus: string;
  adminNotes?: string | null;
  createdAt: Date;
  payment: {
    amount: any;
    order: {
      id: string;
      orderNumber: string;
      totalAmount: any;
      orderStatus: any;
      createdAt: Date;
    };
  };
  user: {
    firstName: string;
    lastName: string;
    phone?: string | null;
  };
}

interface PaymentVerificationTableProps {
  proofs: PaymentProofItem[];
}

export function PaymentVerificationTable({ proofs }: PaymentVerificationTableProps) {
  const [selectedProof, setSelectedProof] = useState<PaymentProofItem | null>(null);

  return (
    <div className="space-y-6">
      {/* Storage configuration banner */}
      <div className="p-4 rounded-2xl bg-herbal-900 border border-gold-500/30 flex items-start gap-3 shadow-lg">
        <ShieldAlert className="w-5 h-5 text-gold-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-cream-100">
            Manual Verification Safety & Infrastructure Protocol
          </h4>
          <p className="text-[11px] text-cream-300 leading-relaxed">
            Payment proof storage is not configured (0 storage buckets exist). All UPI transaction
            approvals are audited through bank statement UTR cross-referencing. Never expose customer
            private transaction records externally.
          </p>
        </div>
      </div>

      {/* Proofs Table */}
      <div className="rounded-3xl bg-herbal-900 border border-herbal-800 shadow-xl overflow-hidden p-6 space-y-4">
        {proofs.length === 0 ? (
          <EmptyState
            title="Verification Queue Clear"
            description="There are currently no manual UPI payment proofs pending administrator verification."
            icon={CheckCircle2}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-herbal-800 text-cream-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Order #</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Transaction UTR / Ref</th>
                  <th className="pb-3">Submitted</th>
                  <th className="pb-3">Storage Status</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-herbal-800/60">
                {proofs.map((proof) => (
                  <tr key={proof.id} className="hover:bg-herbal-800/30 transition-colors">
                    <td className="py-3 font-mono font-bold text-cream-100">
                      <Link
                        href={`/admin/orders/${proof.payment.order.id}`}
                        className="hover:text-gold-400"
                      >
                        #{proof.payment.order.orderNumber}
                      </Link>
                    </td>

                    <td className="py-3 text-cream-200">
                      <span className="font-semibold block">
                        {proof.user.firstName} {proof.user.lastName}
                      </span>
                      {proof.user.phone && (
                        <span className="font-mono text-[10px] text-cream-400">
                          {proof.user.phone}
                        </span>
                      )}
                    </td>

                    <td className="py-3 font-bold text-gold-400 font-serif text-sm">
                      ₹{Number(proof.payment.amount).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 font-mono text-cream-100 font-semibold">
                      <span className="px-2 py-0.5 rounded bg-herbal-950 border border-herbal-800">
                        {proof.transactionReferenceId}
                      </span>
                    </td>

                    <td className="py-3 text-cream-400 whitespace-nowrap">
                      {new Date(proof.createdAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold uppercase">
                        Storage Unconfigured
                      </span>
                    </td>

                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedProof(proof)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-cream-50 font-bold text-xs transition-colors cursor-pointer shadow"
                      >
                        Inspect & Verify
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedProof && (
        <PaymentProofModal
          proof={selectedProof}
          onClose={() => setSelectedProof(null)}
          onSuccess={() => {
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
