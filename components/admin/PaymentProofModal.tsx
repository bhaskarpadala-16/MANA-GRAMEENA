'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { X, CheckCircle2, XCircle, AlertCircle, Loader2, ShieldAlert, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { verifyPaymentProofAction, rejectPaymentProofAction, getPaymentProofSignedUrlAction } from '@/lib/actions/admin/payments';

interface PaymentProofModalProps {
  proof: {
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
      };
    };
    user: {
      firstName: string;
      lastName: string;
      phone?: string | null;
    };
  };
  onClose: () => void;
  onSuccess?: () => void;
}

export function PaymentProofModal({ proof, onClose, onSuccess }: PaymentProofModalProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadSignedUrl() {
      setIsLoadingUrl(true);
      try {
        const res = await getPaymentProofSignedUrlAction(proof.id);
        if (isMounted && res.success && res.signedUrl) {
          setSignedUrl(res.signedUrl);
        }
      } finally {
        if (isMounted) setIsLoadingUrl(false);
      }
    }
    loadSignedUrl();
    return () => {
      isMounted = false;
    };
  }, [proof.id]);

  const handleVerify = () => {
    if (!confirm(`Verify UPI transaction reference ${proof.transactionReferenceId} for Order #${proof.payment.order.orderNumber}?`)) {
      return;
    }

    setErrorMsg(null);
    startTransition(async () => {
      const res = await verifyPaymentProofAction(proof.id);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to verify payment proof.');
      } else {
        if (onSuccess) onSuccess();
        onClose();
      }
    });
  };

  const handleReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      setErrorMsg('A rejection explanation is mandatory.');
      return;
    }

    setErrorMsg(null);
    startTransition(async () => {
      const res = await rejectPaymentProofAction({
        proofId: proof.id,
        reason: rejectReason,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to reject payment proof.');
      } else {
        if (onSuccess) onSuccess();
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-herbal-900 border border-herbal-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-herbal-800 border border-gold-500/30 text-gold-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-cream-50">
                Verify Manual UPI Payment
              </h3>
              <p className="text-xs text-cream-400 font-mono">
                Order #{proof.payment.order.orderNumber}
              </p>
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

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Transaction Details Card */}
        <div className="p-4 rounded-2xl bg-herbal-950/80 border border-herbal-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-cream-400">Customer Name:</span>
            <span className="font-semibold text-cream-100">
              {proof.user.firstName} {proof.user.lastName}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-cream-400">Order Total:</span>
            <span className="font-serif text-base font-bold text-gold-400">
              ₹{Number(proof.payment.amount).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-cream-400">UPI Reference / UTR ID:</span>
            <span className="font-mono font-bold text-cream-100 bg-herbal-900 px-2 py-0.5 rounded border border-herbal-700">
              {proof.transactionReferenceId}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-cream-400">Submission Timestamp:</span>
            <span className="text-cream-300">
              {new Date(proof.createdAt).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Proof Screenshot Viewer */}
        <div className="p-4 rounded-2xl bg-herbal-950 border border-herbal-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-semibold text-cream-200">
              <ImageIcon className="w-4 h-4 text-gold-400" />
              <span>Customer Payment Screenshot</span>
            </div>
            {signedUrl && (
              <a
                href={signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-gold-400 hover:text-gold-300 font-medium"
              >
                <span>Full Size</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {isLoadingUrl ? (
            <div className="h-40 rounded-xl bg-herbal-900/50 border border-herbal-800/80 flex flex-col items-center justify-center gap-2 text-xs text-cream-400">
              <Loader2 className="w-5 h-5 animate-spin text-gold-400" />
              <span>Generating secure screenshot view...</span>
            </div>
          ) : signedUrl ? (
            <div className="relative rounded-xl overflow-hidden border border-herbal-700 bg-black/40 max-h-64 flex items-center justify-center">
              <img
                src={signedUrl}
                alt={`Proof for Order #${proof.payment.order.orderNumber}`}
                className="object-contain max-h-64 w-auto rounded-lg"
              />
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-herbal-900 border border-herbal-800 text-[11px] text-cream-400 leading-relaxed">
              <span className="font-semibold text-amber-400 block mb-1">
                Direct Screenshot Not Attached
              </span>
              Verification is performed by matching UTR reference{' '}
              <span className="font-mono text-cream-200 font-bold">{proof.transactionReferenceId}</span>{' '}
              with your merchant bank account statement or SMS alert.
            </div>
          )}
        </div>

        {/* Action Controls */}
        {!rejectMode ? (
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => setRejectMode(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition-colors cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              Reject Proof
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={handleVerify}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-cream-50 font-bold text-xs transition-all cursor-pointer shadow-lg disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Approve & Confirm Order
                </>
              )}
            </button>
          </div>
        ) : (
          <form onSubmit={handleReject} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-rose-300 uppercase tracking-wider">
                Rejection Reason (Sent to Customer) *
              </label>
              <textarea
                required
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why UTR could not be verified (e.g. UTR not found on merchant bank statement, incorrect transfer amount)..."
                className="w-full px-3 py-2 bg-herbal-950 border border-rose-500/40 rounded-xl text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-rose-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectMode(false)}
                className="px-4 py-2 rounded-xl text-xs text-cream-400 hover:text-cream-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-cream-50 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  'Confirm Rejection'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
