'use client';

import React, { useState, useTransition } from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import {
  createProductVariantAction,
  deleteProductVariantAction,
} from '@/lib/actions/admin/products';

interface VariantItem {
  id: string;
  title: string;
  sku: string;
  priceOverride?: any;
  weightGrams: number;
  isActive: boolean;
  inventory?: {
    stockQuantity: number;
    reservedQuantity: number;
  }[] | null;
}

interface ProductVariantManagerProps {
  productId: string;
  variants: VariantItem[];
}

export function ProductVariantManager({ productId, variants }: ProductVariantManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [sku, setSku] = useState('');
  const [priceOverride, setPriceOverride] = useState('');
  const [weightGrams, setWeightGrams] = useState('');
  const [initialStock, setInitialStock] = useState('0');

  const handleCreateVariant = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const payload = {
      title,
      sku,
      priceOverride: priceOverride ? parseFloat(priceOverride) : null,
      weightGrams: parseInt(weightGrams, 10) || 0,
      initialStock: parseInt(initialStock, 10) || 0,
      isActive: true,
    };

    startTransition(async () => {
      const res = await createProductVariantAction(productId, payload);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to create variant.');
      } else {
        setTitle('');
        setSku('');
        setPriceOverride('');
        setWeightGrams('');
        setInitialStock('0');
        setIsOpen(false);
      }
    });
  };

  const handleDelete = (variantId: string) => {
    if (!confirm('Are you sure you want to remove this variant?')) return;
    setErrorMsg(null);

    startTransition(async () => {
      const res = await deleteProductVariantAction(variantId, productId);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to remove variant.');
      }
    });
  };

  return (
    <div className="p-6 rounded-3xl bg-herbal-900 border border-herbal-800 shadow-xl space-y-5">
      <div className="flex items-center justify-between border-b border-herbal-800 pb-3">
        <div>
          <h3 className="font-serif text-base font-bold text-cream-50">Product Variants</h3>
          <p className="text-xs text-cream-400">Available sizes, packaging volumes, or weights</p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-herbal-800 border border-gold-500/30 text-gold-400 hover:bg-herbal-700 text-xs font-semibold transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Variant
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Add Variant Modal / Drawer */}
      {isOpen && (
        <form
          onSubmit={handleCreateVariant}
          className="p-4 rounded-2xl bg-herbal-950/80 border border-gold-500/30 space-y-4 shadow-inner"
        >
          <h4 className="text-xs font-bold text-gold-400 uppercase tracking-wider">
            New Variant Details
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-cream-300">Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 500ml Bottle"
                className="w-full px-3 py-1.5 bg-herbal-900 border border-herbal-800 rounded-lg text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-cream-300">SKU *</label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="MG-OIL-500ML"
                className="w-full px-3 py-1.5 bg-herbal-900 border border-herbal-800 rounded-lg text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50 uppercase font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-cream-300">Price Override (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={priceOverride}
                onChange={(e) => setPriceOverride(e.target.value)}
                placeholder="Leave blank to use base"
                className="w-full px-3 py-1.5 bg-herbal-900 border border-herbal-800 rounded-lg text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-cream-300">Weight (Grams) *</label>
              <input
                type="number"
                required
                min="1"
                value={weightGrams}
                onChange={(e) => setWeightGrams(e.target.value)}
                placeholder="500"
                className="w-full px-3 py-1.5 bg-herbal-900 border border-herbal-800 rounded-lg text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-cream-300">Initial Stock</label>
              <input
                type="number"
                min="0"
                value={initialStock}
                onChange={(e) => setInitialStock(e.target.value)}
                className="w-full px-3 py-1.5 bg-herbal-900 border border-herbal-800 rounded-lg text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 rounded-lg text-xs text-cream-400 hover:text-cream-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-1.5 rounded-lg bg-herbal-800 hover:bg-herbal-700 text-gold-400 border border-gold-500/30 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Save Variant'}
            </button>
          </div>
        </form>
      )}

      {/* Variants List */}
      {variants.length === 0 ? (
        <p className="text-xs text-cream-400 italic py-2">
          No variants created. This product sells as a single standard item.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-herbal-800 text-cream-400 font-semibold uppercase tracking-wider">
                <th className="pb-2">Title</th>
                <th className="pb-2">SKU</th>
                <th className="pb-2">Price Override</th>
                <th className="pb-2">Weight</th>
                <th className="pb-2">Stock</th>
                <th className="pb-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-herbal-800/40">
              {variants.map((v) => {
                const stock = v.inventory?.[0]?.stockQuantity ?? 0;
                return (
                  <tr key={v.id} className="text-cream-200">
                    <td className="py-2.5 font-semibold text-cream-100">{v.title}</td>
                    <td className="py-2.5 font-mono text-cream-400">{v.sku}</td>
                    <td className="py-2.5 font-semibold text-cream-100">
                      {v.priceOverride ? `₹${Number(v.priceOverride).toLocaleString('en-IN')}` : 'Base Price'}
                    </td>
                    <td className="py-2.5 text-cream-400">{v.weightGrams}g</td>
                    <td className="py-2.5">
                      <span className="font-semibold text-emerald-400">
                        {stock} units
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(v.id)}
                        disabled={isPending}
                        className="p-1 text-cream-500 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Remove variant"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
