'use client';

import React, { useState, useTransition } from 'react';
import { X, Loader2, Boxes, AlertCircle, CheckCircle2 } from 'lucide-react';
import { adjustInventoryAction } from '@/lib/actions/admin/inventory';
import { InventoryTxType } from '@prisma/client';

interface InventoryAdjustModalProps {
  item: {
    id: string;
    productTitle: string;
    variantTitle?: string | null;
    sku: string;
    stockQuantity: number;
    reservedQuantity: number;
    availableQuantity: number;
  };
  onClose: () => void;
  onSuccess?: () => void;
}

export function InventoryAdjustModal({ item, onClose, onSuccess }: InventoryAdjustModalProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [quantityDelta, setQuantityDelta] = useState('');
  const [transactionType, setTransactionType] = useState<InventoryTxType>(InventoryTxType.RESTOCK);
  const [referenceId, setReferenceId] = useState('');
  const [notes, setNotes] = useState('');

  const deltaNum = parseInt(quantityDelta, 10) || 0;
  const projectedStock = item.stockQuantity + deltaNum;
  const projectedAvailable = projectedStock - item.reservedQuantity;
  const isInvalid = projectedStock < 0 || projectedAvailable < 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (deltaNum === 0) {
      setErrorMsg('Quantity adjustment cannot be zero.');
      return;
    }

    if (isInvalid) {
      setErrorMsg('Adjustment would cause negative available inventory.');
      return;
    }

    startTransition(async () => {
      const res = await adjustInventoryAction({
        inventoryId: item.id,
        quantityDelta: deltaNum,
        transactionType,
        referenceId: referenceId || null,
        notes,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to execute stock adjustment.');
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
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-cream-50">Adjust Stock Level</h3>
              <p className="text-xs text-cream-400 font-mono">
                {item.sku} • {item.productTitle}
                {item.variantTitle && ` (${item.variantTitle})`}
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

        {/* Current State Summary */}
        <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-herbal-950/80 border border-herbal-800 text-center">
          <div>
            <span className="text-[10px] text-cream-400 uppercase tracking-wider block">
              Total Physical
            </span>
            <span className="font-serif text-lg font-bold text-cream-100">
              {item.stockQuantity}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-cream-400 uppercase tracking-wider block">
              Reserved Orders
            </span>
            <span className="font-serif text-lg font-bold text-amber-400">
              {item.reservedQuantity}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-cream-400 uppercase tracking-wider block">
              Available to Sell
            </span>
            <span className="font-serif text-lg font-bold text-emerald-400">
              {item.availableQuantity}
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
                Transaction Type *
              </label>
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value as InventoryTxType)}
                className="w-full px-3 py-2 bg-herbal-950 border border-herbal-800 rounded-xl text-xs text-cream-200 focus:outline-none focus:border-gold-500/50"
              >
                <option value={InventoryTxType.RESTOCK}>Restock / New Batch (+)</option>
                <option value={InventoryTxType.MANUAL_ADJUSTMENT}>Manual Count Correction</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
                Quantity Delta (+ or -) *
              </label>
              <input
                type="number"
                required
                value={quantityDelta}
                onChange={(e) => setQuantityDelta(e.target.value)}
                placeholder="+50 or -5"
                className={`w-full px-3 py-2 bg-herbal-950 border rounded-xl text-xs font-mono text-cream-100 focus:outline-none ${
                  isInvalid
                    ? 'border-rose-500 text-rose-300'
                    : 'border-herbal-800 focus:border-gold-500/50'
                }`}
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
                Reference ID / Batch #
              </label>
              <input
                type="text"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                placeholder="PO-2026-09-BATCH-A4"
                className="w-full px-3 py-2 bg-herbal-950 border border-herbal-800 rounded-xl text-xs font-mono text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50 uppercase"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
                Adjustment Reason / Audit Notes *
              </label>
              <textarea
                required
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Mandatory reason for stock change (e.g. Village extraction batch arrival, damage in transit, routine physical count audit)..."
                className="w-full px-3 py-2 bg-herbal-950 border border-herbal-800 rounded-xl text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50"
              />
            </div>
          </div>

          {/* Projected Outcome Preview */}
          {deltaNum !== 0 && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                isInvalid
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}
            >
              <span>Projected Total Physical Stock:</span>
              <span className="font-mono font-bold">{projectedStock} units</span>
            </div>
          )}

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
              disabled={isPending || isInvalid || deltaNum === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-herbal-800 hover:bg-herbal-700 text-gold-400 border border-gold-500/30 text-xs font-bold transition-all cursor-pointer shadow-lg disabled:opacity-40"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Recording Transaction...
                </>
              ) : (
                'Commit Stock Adjustment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
