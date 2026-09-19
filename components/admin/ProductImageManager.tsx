'use client';

import React, { useState, useTransition } from 'react';
import { Plus, Trash2, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { createProductImageAction, deleteProductImageAction } from '@/lib/actions/admin/products';

interface ImageItem {
  id: string;
  imageUrl: string;
  altText?: string | null;
  isPrimary: boolean;
  displayOrder: number;
}

interface ProductImageManagerProps {
  productId: string;
  images: ImageItem[];
}

export function ProductImageManager({ productId, images }: ProductImageManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [imageUrl, setImageUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [isPrimary, setIsPrimary] = useState(images.length === 0);

  const handleAddImage = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      const res = await createProductImageAction(productId, {
        imageUrl,
        altText: altText || null,
        isPrimary,
        displayOrder: images.length,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to attach image.');
      } else {
        setImageUrl('');
        setAltText('');
        setIsPrimary(false);
        setIsOpen(false);
      }
    });
  };

  const handleDelete = (imageId: string) => {
    if (!confirm('Remove this product photo?')) return;
    setErrorMsg(null);

    startTransition(async () => {
      const res = await deleteProductImageAction(imageId, productId);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to delete photo.');
      }
    });
  };

  return (
    <div className="p-6 rounded-3xl bg-herbal-900 border border-herbal-800 shadow-xl space-y-5">
      <div className="flex items-center justify-between border-b border-herbal-800 pb-3">
        <div>
          <h3 className="font-serif text-base font-bold text-cream-50">Product Gallery Photos</h3>
          <p className="text-xs text-cream-400">High-resolution botanical product photography</p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-herbal-800 border border-gold-500/30 text-gold-400 hover:bg-herbal-700 text-xs font-semibold transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Photo URL
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Add Image Form */}
      {isOpen && (
        <form
          onSubmit={handleAddImage}
          className="p-4 rounded-2xl bg-herbal-950/80 border border-gold-500/30 space-y-3 shadow-inner"
        >
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-cream-300">
              Valid Image URL (HTTPS) *
            </label>
            <input
              type="url"
              required
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-3 py-1.5 bg-herbal-900 border border-herbal-800 rounded-lg text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-cream-300">
                Alt Description
              </label>
              <input
                type="text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="e.g. Glass bottle of organic neem oil with leaves"
                className="w-full px-3 py-1.5 bg-herbal-900 border border-herbal-800 rounded-lg text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50"
              />
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="isPrimary"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="w-4 h-4 rounded bg-herbal-900 border-herbal-800 text-gold-500 focus:ring-gold-500"
              />
              <label htmlFor="isPrimary" className="text-xs text-cream-200 font-semibold cursor-pointer">
                Set as Primary / Cover Photo
              </label>
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
              {isPending ? 'Saving...' : 'Attach Photo'}
            </button>
          </div>
        </form>
      )}

      {/* Photos Grid */}
      {images.length === 0 ? (
        <div className="p-8 rounded-2xl bg-herbal-950/40 border border-herbal-800 text-center space-y-2">
          <ImageIcon className="w-8 h-8 text-cream-600 mx-auto" />
          <p className="text-xs text-cream-400 italic">
            No photos uploaded yet. Add high quality image URLs to showcase this product.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {images.map((img) => (
            <div
              key={img.id}
              className="group relative rounded-2xl bg-herbal-950 border border-herbal-800 overflow-hidden shadow"
            >
              <div className="aspect-square w-full">
                <img
                  src={img.imageUrl}
                  alt={img.altText || 'Product photo'}
                  className="w-full h-full object-cover"
                />
              </div>

              {img.isPrimary && (
                <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-gold-500/90 text-herbal-950 font-bold shadow">
                  Primary
                </span>
              )}

              <button
                type="button"
                onClick={() => handleDelete(img.id)}
                disabled={isPending}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-cream-200 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="Remove photo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
