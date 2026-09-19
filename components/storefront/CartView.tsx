'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  CartSummaryDto,
  updateCartQuantity,
  removeFromCart,
  clearCart,
} from '@/lib/actions/cart';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  Truck,
  AlertTriangle,
  Leaf,
  Loader2,
} from 'lucide-react';

interface CartViewProps {
  initialCart: CartSummaryDto;
}

export default function CartView({ initialCart }: CartViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartSummaryDto>(initialCart);

  useEffect(() => {
    setCart(initialCart);
  }, [initialCart]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleUpdateQty = (cartItemId: string, newQty: number) => {
    setLoadingItemId(cartItemId);
    setErrorMessage(null);

    startTransition(async () => {
      const res = await updateCartQuantity(cartItemId, newQty);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to update item.');
      } else {
        router.refresh();
      }
      setLoadingItemId(null);
    });
  };

  const handleRemove = (cartItemId: string) => {
    setLoadingItemId(cartItemId);
    setErrorMessage(null);

    startTransition(async () => {
      const res = await removeFromCart(cartItemId);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to remove item.');
      } else {
        router.refresh();
      }
      setLoadingItemId(null);
    });
  };

  const handleClear = () => {
    if (!confirm('Are you sure you want to clear your cart?')) return;
    setErrorMessage(null);

    startTransition(async () => {
      const res = await clearCart();
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to clear cart.');
      } else {
        router.refresh();
      }
    });
  };

  if (cart.items.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-cream-300 max-w-lg mx-auto my-12 space-y-4">
        <div className="w-20 h-20 rounded-full bg-cream-200 flex items-center justify-center mx-auto text-herbal-700">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-herbal-950">Your Cart is Empty</h2>
        <p className="text-xs sm:text-sm text-herbal-800 leading-relaxed max-w-sm mx-auto">
          Discover our handcrafted herbal oils, pure botanical powders, and natural remedies prepared with village wisdom.
        </p>
        <div className="pt-3">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-herbal-800 text-cream-100 text-sm font-semibold hover:bg-herbal-900 transition-colors shadow-md"
          >
            <span>Explore Catalogue</span>
            <ArrowRight className="w-4 h-4 text-gold-400" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Free Shipping Progress Indicator */}
      <div className="bg-white rounded-2xl p-4 border border-cream-300 shadow-sm">
        <div className="flex items-center justify-between text-xs font-semibold mb-2">
          <div className="flex items-center gap-1.5 text-herbal-900">
            <Truck className="w-4 h-4 text-terracotta-600" />
            <span>
              {cart.qualifiesForFreeShipping
                ? '🎉 You have unlocked FREE Delivery across India!'
                : `Add ₹${cart.amountNeededForFreeShipping.toLocaleString('en-IN')} more to unlock FREE Delivery!`}
            </span>
          </div>
          <span className="text-herbal-700 text-[11px]">Threshold: ₹{cart.freeShippingThreshold}</span>
        </div>
        <div className="w-full h-2 bg-cream-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-herbal-700 rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, (cart.subtotal / cart.freeShippingThreshold) * 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Out of Stock Warning */}
      {cart.hasOutOfStockItems && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>
            Some items in your cart exceed currently available inventory. Please adjust quantities before proceeding to checkout.
          </span>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-300 text-red-900 text-xs">
          {errorMessage}
        </div>
      )}

      {/* Main 2-Column Cart Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Cart Items List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-cream-300 text-xs text-herbal-700">
            <span>{cart.itemsCount} Items in your cart</span>
            <button
              type="button"
              onClick={handleClear}
              disabled={isPending}
              className="text-terracotta-600 hover:text-terracotta-700 font-semibold transition-colors disabled:opacity-50"
            >
              Clear Cart
            </button>
          </div>

          <div className="space-y-4">
            {cart.items.map((item) => {
              const isItemLoading = loadingItemId === item.id;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-cream-300 shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
                >
                  {/* Thumbnail & Title */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <Link
                      href={`/products/${item.productSlug}`}
                      className="relative w-20 h-20 rounded-xl bg-cream-100 overflow-hidden border border-cream-200 shrink-0"
                    >
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.productName}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-herbal-700">
                          <Leaf className="w-6 h-6" />
                        </div>
                      )}
                    </Link>

                    <div className="min-w-0 space-y-1">
                      <Link
                        href={`/products/${item.productSlug}`}
                        className="font-serif font-bold text-sm sm:text-base text-herbal-950 hover:text-herbal-700 transition-colors truncate block"
                      >
                        {item.productName}
                      </Link>

                      {item.variantTitle && (
                        <div className="text-xs font-semibold text-terracotta-600">
                          Size: {item.variantTitle}
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-xs text-herbal-600">
                        <span>₹{item.price.toLocaleString('en-IN')} each</span>
                        <span>•</span>
                        <span>{item.weightGrams}g</span>
                      </div>

                      {!item.inStock && (
                        <div className="text-[11px] font-bold text-red-600">
                          Only {item.availableStock} available (requested {item.quantity})
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quantity Stepper & Line Total */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-cream-200">
                    {/* Stepper */}
                    <div className="flex items-center rounded-xl border border-cream-300 bg-cream-50 p-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                        disabled={isPending || isItemLoading || item.quantity <= 1}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-herbal-900 hover:bg-cream-200 disabled:opacity-30 disabled:cursor-not-allowed font-semibold text-sm"
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-herbal-950">
                        {isItemLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto text-herbal-700" />
                        ) : (
                          item.quantity
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                        disabled={
                          isPending ||
                          isItemLoading ||
                          item.quantity >= Math.min(10, item.availableStock)
                        }
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-herbal-900 hover:bg-cream-200 disabled:opacity-30 disabled:cursor-not-allowed font-semibold text-sm"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    {/* Total Price */}
                    <div className="text-right min-w-[80px]">
                      <div className="text-base font-bold text-herbal-950">
                        ₹{item.lineTotal.toLocaleString('en-IN')}
                      </div>
                    </div>

                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      disabled={isPending || isItemLoading}
                      className="p-2 rounded-xl text-herbal-600 hover:text-terracotta-600 hover:bg-cream-100 transition-colors disabled:opacity-50"
                      title="Remove from cart"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Summary Card */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 sm:p-8 border border-cream-300 shadow-md space-y-6 sticky top-24">
          <h3 className="font-serif text-xl font-bold text-herbal-950 border-b border-cream-200 pb-4">
            Order Summary
          </h3>

          <div className="space-y-3 text-xs sm:text-sm text-herbal-800">
            <div className="flex items-center justify-between">
              <span>Subtotal ({cart.itemsCount} items)</span>
              <span className="font-semibold text-herbal-950">
                ₹{cart.subtotal.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span>Standard Shipping</span>
              <span className="font-semibold">
                {cart.shippingFee === 0 ? (
                  <span className="text-emerald-700">FREE</span>
                ) : (
                  `₹${cart.shippingFee}`
                )}
              </span>
            </div>

            <div className="pt-3 border-t border-cream-200 flex items-baseline justify-between text-base sm:text-lg font-bold text-herbal-950">
              <span>Estimated Total</span>
              <span className="text-xl font-serif">
                ₹{cart.estimatedTotal.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-[11px] text-herbal-600">
              Tax included. Applicable coupons and exact shipping confirmed at checkout.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Link
              href={cart.hasOutOfStockItems ? '#' : '/checkout'}
              aria-disabled={cart.hasOutOfStockItems}
              className={`w-full py-4 px-6 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md transition-all ${
                cart.hasOutOfStockItems
                  ? 'bg-cream-300 text-herbal-600 cursor-not-allowed opacity-60'
                  : 'bg-herbal-800 hover:bg-herbal-900 text-cream-100 hover:shadow-lg'
              }`}
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4 text-gold-400" />
            </Link>

            <Link
              href="/products"
              className="w-full py-3 px-6 rounded-2xl border border-cream-300 text-center font-medium text-xs text-herbal-800 hover:bg-cream-100 transition-colors block"
            >
              Continue Shopping
            </Link>
          </div>

          {/* Trust Guarantees */}
          <div className="pt-4 border-t border-cream-200 space-y-2 text-[11px] text-herbal-700">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-herbal-700 shrink-0" />
              <span>100% Genuine homemade herbal preparations</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-herbal-700 shrink-0" />
              <span>Cash on Delivery & Secure UPI supported</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
