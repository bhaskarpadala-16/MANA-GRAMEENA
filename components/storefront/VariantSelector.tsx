'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addToCart } from '@/lib/actions/cart';
import { toggleWishlist } from '@/lib/actions/wishlist';
import {
  ShoppingBag,
  Heart,
  Check,
  Zap,
  Plus,
  Minus,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export interface VariantItem {
  id: string;
  title: string;
  sku: string;
  price: number;
  weightGrams: number;
  stock: number;
  inStock: boolean;
}

interface VariantSelectorProps {
  productId: string;
  productName: string;
  basePrice: number;
  discountPrice: number | null;
  baseSku: string;
  baseStock: number;
  variants: VariantItem[];
  onAddToCartAction?: (productId: string, variantId: string | null, quantity: number) => Promise<{ success: boolean; error?: string }>;
  onToggleWishlistAction?: (productId: string, variantId: string | null) => Promise<{ inWishlist: boolean; error?: string }>;
  initialInWishlist?: boolean;
}

export default function VariantSelector({
  productId,
  productName,
  basePrice,
  discountPrice,
  baseSku,
  baseStock,
  variants,
  onAddToCartAction,
  onToggleWishlistAction,
  initialInWishlist = false,
}: VariantSelectorProps) {
  const router = useRouter();
  const hasVariants = variants && variants.length > 0;

  // Selected variant state (default to first variant if available)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    hasVariants ? variants[0].id : null
  );

  const [quantity, setQuantity] = useState<number>(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isWishlisting, setIsWishlisting] = useState(false);
  const [inWishlist, setInWishlist] = useState(initialInWishlist);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const selectedVariant = hasVariants
    ? variants.find((v) => v.id === selectedVariantId) || variants[0]
    : null;

  const currentPrice = selectedVariant ? selectedVariant.price : (discountPrice || basePrice);
  const originalPrice = selectedVariant ? null : (discountPrice ? basePrice : null);
  const currentStock = selectedVariant ? selectedVariant.stock : baseStock;
  const isAvailable = currentStock > 0;
  const currentSku = selectedVariant ? selectedVariant.sku : baseSku;
  const currentWeight = selectedVariant ? selectedVariant.weightGrams : null;

  const handleVariantSelect = (variantId: string) => {
    setSelectedVariantId(variantId);
    setQuantity(1);
    setActionMessage(null);
  };

  const handleQuantityChange = (delta: number) => {
    const next = quantity + delta;
    if (next >= 1 && next <= Math.min(10, currentStock)) {
      setQuantity(next);
      setActionMessage(null);
    }
  };

  const handleAddToCart = async (goToCheckout = false) => {
    if (!isAvailable) return;
    setIsAdding(true);
    setActionMessage(null);

    try {
      const addFn = onAddToCartAction || addToCart;
      const res = await addFn(productId, selectedVariantId, quantity);
      if (res.success) {
        setActionMessage({ type: 'success', text: `Added ${quantity} item(s) to your cart.` });
        if (goToCheckout) {
          router.push('/checkout');
        } else {
          router.refresh();
        }
      } else {
        if (res.error?.includes('sign in') || res.error?.includes('UNAUTHORIZED')) {
          router.push(`/login?redirect=/products/${productId}`);
        } else {
          setActionMessage({ type: 'error', text: res.error || 'Could not add item to cart.' });
        }
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Network connection issue. Please retry.' });
    } finally {
      setIsAdding(false);
    }
  };

  const handleWishlistToggle = async () => {
    setIsWishlisting(true);
    setActionMessage(null);
    try {
      const toggleFn = onToggleWishlistAction || toggleWishlist;
      const res = await toggleFn(productId, selectedVariantId);
      if (res.error) {
        if (res.error?.includes('sign in') || res.error?.includes('UNAUTHORIZED')) {
          router.push(`/login?redirect=/products/${productId}`);
        } else {
          setActionMessage({ type: 'error', text: res.error });
        }
      } else {
        setInWishlist(res.inWishlist);
        setActionMessage({
          type: 'success',
          text: res.inWishlist ? 'Saved to your wishlist.' : 'Removed from wishlist.',
        });
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Failed to update wishlist. Please retry.' });
    } finally {
      setIsWishlisting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Price & SKU Header */}
      <div className="border-b border-cream-300 pb-5">
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-serif font-bold text-herbal-950">
            ₹{currentPrice.toLocaleString('en-IN')}
          </span>
          {originalPrice && (
            <span className="text-base text-herbal-500 line-through">
              ₹{originalPrice.toLocaleString('en-IN')}
            </span>
          )}
          <span className="text-xs text-herbal-600">Inclusive of all taxes</span>
        </div>

        <div className="flex items-center gap-4 text-xs text-herbal-600 mt-2">
          <span>SKU: <span className="font-mono text-herbal-900">{currentSku}</span></span>
          {currentWeight && (
            <span>Net Wt: <strong className="text-herbal-900">{currentWeight}g</strong></span>
          )}
          <span>
            Availability:{' '}
            {isAvailable ? (
              <strong className="text-emerald-700 font-semibold">
                In Stock ({currentStock} available)
              </strong>
            ) : (
              <strong className="text-red-700 font-semibold">Out of Stock</strong>
            )}
          </span>
        </div>
      </div>

      {/* Variant Selection Buttons */}
      {hasVariants && (
        <div className="space-y-2.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-herbal-800">
            Select Size / Pack
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {variants.map((v) => {
              const isSelected = v.id === selectedVariantId;
              const isVarStock = v.stock > 0;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleVariantSelect(v.id)}
                  disabled={!isVarStock}
                  className={`relative p-3 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'border-herbal-800 bg-herbal-50/60 ring-2 ring-herbal-800/20 shadow-sm'
                      : isVarStock
                      ? 'border-cream-300 bg-white hover:border-herbal-400'
                      : 'border-cream-200 bg-cream-100 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="font-medium text-xs text-herbal-950">{v.title}</div>
                  <div className="text-sm font-bold text-herbal-900 mt-0.5">
                    ₹{v.price.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-herbal-600 mt-1">
                    {isVarStock ? `${v.stock} in stock` : 'Sold out'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quantity & CTA Bar */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-4">
          {/* Quantity Stepper */}
          <div className="flex items-center rounded-xl border border-cream-300 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => handleQuantityChange(-1)}
              disabled={quantity <= 1 || !isAvailable}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-herbal-900 hover:bg-cream-200 disabled:opacity-30 disabled:cursor-not-allowed text-base font-semibold"
              aria-label="Decrease quantity"
            >
              -
            </button>
            <span className="w-10 text-center font-semibold text-sm text-herbal-950">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => handleQuantityChange(1)}
              disabled={quantity >= Math.min(10, currentStock) || !isAvailable}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-herbal-900 hover:bg-cream-200 disabled:opacity-30 disabled:cursor-not-allowed text-base font-semibold"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          {/* Wishlist Button */}
          <button
            type="button"
            onClick={handleWishlistToggle}
            disabled={isWishlisting}
            className={`p-3 rounded-xl border transition-colors flex items-center justify-center ${
              inWishlist
                ? 'border-terracotta-500 bg-terracotta-50 text-terracotta-600'
                : 'border-cream-300 bg-white text-herbal-800 hover:bg-cream-200'
            }`}
            title={inWishlist ? 'In Wishlist' : 'Add to Wishlist'}
            aria-label="Toggle Wishlist"
          >
            {isWishlisting ? (
              <Loader2 className="w-5 h-5 animate-spin text-herbal-700" />
            ) : (
              <Heart
                className={`w-5 h-5 ${inWishlist ? 'fill-terracotta-500 text-terracotta-500' : ''}`}
              />
            )}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleAddToCart(false)}
            disabled={!isAvailable || isAdding}
            className="w-full py-3.5 px-6 rounded-2xl bg-herbal-800 hover:bg-herbal-900 text-cream-100 font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isAdding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShoppingBag className="w-4 h-4 text-gold-400" />
            )}
            <span>{isAvailable ? 'Add to Cart' : 'Out of Stock'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleAddToCart(true)}
            disabled={!isAvailable || isAdding}
            className="w-full py-3.5 px-6 rounded-2xl bg-terracotta-600 hover:bg-terracotta-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <span>Buy Now</span>
          </button>
        </div>

        {/* Status Feedback Message */}
        {actionMessage && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 animate-fade-in ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {actionMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
        )}
      </div>
    </div>
  );
}
