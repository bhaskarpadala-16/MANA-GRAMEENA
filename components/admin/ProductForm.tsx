'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { createProductAction, updateProductAction } from '@/lib/actions/admin/products';
import { ProductStatus } from '@prisma/client';

interface CategoryOption {
  id: string;
  name: string;
}

interface ProductFormProps {
  categories: CategoryOption[];
  initialData?: {
    id: string;
    name: string;
    slug: string;
    shortDescription: string;
    description: string;
    ingredients: string;
    benefits: string;
    usageInstructions: string;
    categoryId: string;
    price: number;
    discountPrice?: number | null;
    sku: string;
    weightGrams: number;
    status: ProductStatus;
    isFeatured: boolean;
    lowStockThreshold: number;
  };
}

export function ProductForm({ categories, initialData }: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isEdit = !!initialData;

  const [name, setName] = useState(initialData?.name || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [shortDescription, setShortDescription] = useState(initialData?.shortDescription || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [ingredients, setIngredients] = useState(initialData?.ingredients || '');
  const [benefits, setBenefits] = useState(initialData?.benefits || '');
  const [usageInstructions, setUsageInstructions] = useState(initialData?.usageInstructions || '');
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || categories[0]?.id || '');
  const [price, setPrice] = useState(initialData?.price ? String(initialData.price) : '');
  const [discountPrice, setDiscountPrice] = useState(
    initialData?.discountPrice ? String(initialData.discountPrice) : ''
  );
  const [sku, setSku] = useState(initialData?.sku || '');
  const [weightGrams, setWeightGrams] = useState(
    initialData?.weightGrams ? String(initialData.weightGrams) : ''
  );
  const [status, setStatus] = useState<ProductStatus>(initialData?.status || ProductStatus.DRAFT);
  const [isFeatured, setIsFeatured] = useState(initialData?.isFeatured || false);
  const [initialStock, setInitialStock] = useState('0');
  const [lowStockThreshold, setLowStockThreshold] = useState(
    initialData?.lowStockThreshold ? String(initialData.lowStockThreshold) : '5'
  );

  function handleNameChange(val: string) {
    setName(val);
    if (!isEdit) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setSlug(generatedSlug);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const payload = {
      name,
      slug,
      shortDescription,
      description,
      ingredients,
      benefits,
      usageInstructions,
      categoryId,
      price: parseFloat(price) || 0,
      discountPrice: discountPrice ? parseFloat(discountPrice) : null,
      sku,
      weightGrams: parseInt(weightGrams, 10) || 0,
      status,
      isFeatured,
      initialStock: parseInt(initialStock, 10) || 0,
      lowStockThreshold: parseInt(lowStockThreshold, 10) || 5,
    };

    startTransition(async () => {
      let res;
      if (isEdit && initialData) {
        res = await updateProductAction(initialData.id, payload);
      } else {
        res = await createProductAction(payload);
      }

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to save product.');
      } else {
        router.push('/admin/products');
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Details Card */}
      <div className="p-6 rounded-3xl bg-herbal-900 border border-herbal-800 shadow-xl space-y-5">
        <h3 className="font-serif text-base font-bold text-cream-50 border-b border-herbal-800 pb-3">
          Core Botanical Product Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1">
            <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
              Product Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Pure Cold-Pressed Virgin Coconut Oil"
              className="w-full px-4 py-2.5 bg-herbal-950/80 border border-herbal-800 rounded-xl text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
              URL Slug *
            </label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="pure-cold-pressed-coconut-oil"
              className="w-full px-4 py-2.5 bg-herbal-950/80 border border-herbal-800 rounded-xl text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50 font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
              Category *
            </label>
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-2.5 bg-herbal-950/80 border border-herbal-800 rounded-xl text-xs text-cream-200 focus:outline-none focus:border-gold-500/50"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
              Short Description (Card summary) *
            </label>
            <input
              type="text"
              required
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Handcrafted village cold-pressed oil with zero additives."
              className="w-full px-4 py-2.5 bg-herbal-950/80 border border-herbal-800 rounded-xl text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50"
            />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
              Full Botanical Description *
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe origin, heritage recipes, traditional wooden ghani press..."
              className="w-full px-4 py-2.5 bg-herbal-950/80 border border-herbal-800 rounded-xl text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50 leading-relaxed"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
              Herbal Ingredients *
            </label>
            <textarea
              required
              rows={2}
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              placeholder="100% pure sun-dried coconut copra, cold-pressed."
              className="w-full px-4 py-2.5 bg-herbal-950/80 border border-herbal-800 rounded-xl text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
              Ayurvedic Benefits *
            </label>
            <textarea
              required
              rows={2}
              value={benefits}
              onChange={(e) => setBenefits(e.target.value)}
              placeholder="Deep conditioning for scalp, moisturizes skin naturally."
              className="w-full px-4 py-2.5 bg-herbal-950/80 border border-herbal-800 rounded-xl text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50"
            />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
              Usage Instructions *
            </label>
            <input
              type="text"
              required
              value={usageInstructions}
              onChange={(e) => setUsageInstructions(e.target.value)}
              placeholder="Massage gently into scalp and hair. Leave for 30 minutes before washing."
              className="w-full px-4 py-2.5 bg-herbal-950/80 border border-herbal-800 rounded-xl text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50"
            />
          </div>
        </div>
      </div>

      {/* Pricing & Inventory Card */}
      <div className="p-6 rounded-3xl bg-herbal-900 border border-herbal-800 shadow-xl space-y-5">
        <h3 className="font-serif text-base font-bold text-cream-50 border-b border-herbal-800 pb-3">
          Pricing & Inventory Tracking
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
              Price (₹) *
            </label>
            <input
              type="number"
              step="0.01"
              required
              min="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="350.00"
              className="w-full px-4 py-2.5 bg-herbal-950/80 border border-herbal-800 rounded-xl text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50 font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
              Discount Price (₹)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={discountPrice}
              onChange={(e) => setDiscountPrice(e.target.value)}
              placeholder="299.00"
              className="w-full px-4 py-2.5 bg-herbal-950/80 border border-herbal-800 rounded-xl text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50 font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
              Product SKU *
            </label>
            <input
              type="text"
              required
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="MG-OIL-COCO-500"
              className="w-full px-4 py-2.5 bg-herbal-950/80 border border-herbal-800 rounded-xl text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50 font-mono uppercase"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
              Weight (Grams) *
            </label>
            <input
              type="number"
              step="1"
              required
              min="1"
              value={weightGrams}
              onChange={(e) => setWeightGrams(e.target.value)}
              placeholder="500"
              className="w-full px-4 py-2.5 bg-herbal-950/80 border border-herbal-800 rounded-xl text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50 font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
              Low Stock Threshold
            </label>
            <input
              type="number"
              min="0"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              className="w-full px-4 py-2.5 bg-herbal-950/80 border border-herbal-800 rounded-xl text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50 font-mono"
            />
          </div>

          {!isEdit && (
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
                Initial Stock Quantity
              </label>
              <input
                type="number"
                min="0"
                value={initialStock}
                onChange={(e) => setInitialStock(e.target.value)}
                className="w-full px-4 py-2.5 bg-herbal-950/80 border border-herbal-800 rounded-xl text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50 font-mono"
              />
            </div>
          )}
        </div>
      </div>

      {/* Visibility & Status Card */}
      <div className="p-6 rounded-3xl bg-herbal-900 border border-herbal-800 shadow-xl space-y-5">
        <h3 className="font-serif text-base font-bold text-cream-50 border-b border-herbal-800 pb-3">
          Catalog Visibility
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
              Publish Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProductStatus)}
              className="w-full px-4 py-2.5 bg-herbal-950/80 border border-herbal-800 rounded-xl text-xs text-cream-200 focus:outline-none focus:border-gold-500/50"
            >
              <option value="DRAFT">Draft (Hidden from Storefront)</option>
              <option value="PUBLISHED">Published (Visible to Customers)</option>
              <option value="ARCHIVED">Archived (Retired Product)</option>
            </select>
          </div>

          <div className="flex items-center gap-3 pt-6">
            <input
              type="checkbox"
              id="isFeatured"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="w-4 h-4 rounded bg-herbal-950 border-herbal-800 text-gold-500 focus:ring-gold-500"
            />
            <label htmlFor="isFeatured" className="text-xs text-cream-200 font-semibold cursor-pointer">
              Feature on Homepage Hero & Collections
            </label>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-between pt-4">
        <Link
          href="/admin/products"
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
              Saving Product...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {isEdit ? 'Save Changes' : 'Create Product'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
