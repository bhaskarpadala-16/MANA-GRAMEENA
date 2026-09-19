'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  WishlistItemDto,
  removeFromWishlist,
  moveWishlistItemToCart,
} from '@/lib/actions/wishlist';
import {
  Heart,
  ShoppingBag,
  Trash2,
  ArrowRight,
  Leaf,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface WishlistViewProps {
  initialItems: WishlistItemDto[];
}

export default function WishlistView({ initialItems }: WishlistViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState<WishlistItemDto[]>(initialItems);
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleRemove = (itemId: string) => {
    setLoadingItemId(itemId);
    setMessage(null);

    startTransition(async () => {
      const res = await removeFromWishlist(itemId);
      if (res.success) {
        setItems((prev) => prev.filter((i) => i.id !== itemId));
        setMessage({ type: 'success', text: 'Item removed from your wishlist.' });
        router.refresh();
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to remove item.' });
      }
      setLoadingItemId(null);
    });
  };

  const handleMoveToCart = (itemId: string) => {
    setLoadingItemId(itemId);
    setMessage(null);

    startTransition(async () => {
      const res = await moveWishlistItemToCart(itemId);
      if (res.success) {
        setItems((prev) => prev.filter((i) => i.id !== itemId));
        setMessage({ type: 'success', text: 'Item successfully moved to your cart!' });
        router.refresh();
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to move item to cart.' });
      }
      setLoadingItemId(null);
    });
  };

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-cream-300 shadow-sm max-w-lg mx-auto space-y-4">
        <div className="w-16 h-16 rounded-full bg-cream-200 flex items-center justify-center mx-auto text-terracotta-600">
          <Heart className="w-8 h-8" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-herbal-950">Your Wishlist is Empty</h2>
        <p className="text-xs sm:text-sm text-herbal-800 leading-relaxed max-w-sm mx-auto">
          Keep track of pure herbal formulations you love. Add items to your wishlist while browsing our catalog.
        </p>
        <div className="pt-3">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-herbal-800 text-cream-100 text-xs font-semibold hover:bg-herbal-900 transition-colors shadow-md"
          >
            <span>Discover Formulations</span>
            <ArrowRight className="w-4 h-4 text-gold-400" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {message && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center gap-2.5 animate-fade-in ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Grid of Wishlist Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => {
          const isItemLoading = loadingItemId === item.id;

          return (
            <div
              key={item.id}
              className="bg-white rounded-3xl p-5 border border-cream-300 shadow-sm flex flex-col justify-between space-y-4 hover:border-herbal-400/50 transition-all duration-300"
            >
              {/* Product Thumbnail & Details */}
              <div className="space-y-3">
                <Link
                  href={`/products/${item.productSlug}`}
                  className="relative aspect-square w-full rounded-2xl bg-cream-100 overflow-hidden block border border-cream-200"
                >
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.productName}
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-cover hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-herbal-700 p-4 text-center">
                      <Leaf className="w-8 h-8 mb-2" />
                      <span className="text-[11px] font-medium text-herbal-600">Herbal Craft</span>
                    </div>
                  )}

                  {/* Stock Status Badge */}
                  <div className="absolute top-3 right-3">
                    {item.inStock ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200 shadow-sm">
                        In Stock
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-semibold border border-red-200 shadow-sm">
                        Out of Stock
                      </span>
                    )}
                  </div>
                </Link>

                <div className="space-y-1">
                  <h3 className="font-serif font-bold text-base text-herbal-950 hover:text-herbal-700 transition-colors line-clamp-1">
                    <Link href={`/products/${item.productSlug}`}>{item.productName}</Link>
                  </h3>

                  {item.variantTitle && (
                    <div className="text-xs font-semibold text-terracotta-600">
                      Pack: {item.variantTitle}
                    </div>
                  )}

                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-lg font-bold text-herbal-950">
                      ₹{item.price.toLocaleString('en-IN')}
                    </span>
                    {item.originalPrice && (
                      <span className="text-xs text-herbal-500 line-through">
                        ₹{item.originalPrice.toLocaleString('en-IN')}
                      </span>
                    )}
                    <span className="text-[11px] text-herbal-600">({item.weightGrams}g)</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-cream-200 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleMoveToCart(item.id)}
                  disabled={!item.inStock || isItemLoading || isPending}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-herbal-800 hover:bg-herbal-900 text-cream-100 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {isItemLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ShoppingBag className="w-3.5 h-3.5 text-gold-400" />
                  )}
                  <span>Move to Cart</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  disabled={isItemLoading || isPending}
                  className="p-2.5 rounded-xl border border-cream-300 text-herbal-600 hover:text-terracotta-600 hover:bg-cream-100 transition-colors disabled:opacity-50"
                  title="Remove from wishlist"
                  aria-label="Remove from wishlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
