'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { AddressDto } from '@/lib/actions/address';
import { CartSummaryDto } from '@/lib/actions/cart';
import { validateCoupon } from '@/lib/actions/coupon';
import { processCheckout } from '@/lib/actions/checkout';
import { PaymentMethod } from '@prisma/client';
import {
  MapPin,
  Truck,
  CreditCard,
  ShieldCheck,
  Tag,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  ArrowRight,
  Leaf,
  Info,
} from 'lucide-react';

interface CheckoutFormProps {
  initialAddresses: AddressDto[];
  cart: CartSummaryDto;
  hasUpiConfigured: boolean;
}

export default function CheckoutForm({
  initialAddresses,
  cart,
  hasUpiConfigured,
}: CheckoutFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Selected address state
  const defaultAddr = initialAddresses.find((a) => a.isDefault) || initialAddresses[0];
  const [selectedAddressId, setSelectedAddressId] = useState<string>(defaultAddr?.id || '');

  // Payment method state (default to COD)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.COD);
  const [manualUpiTxRef, setManualUpiTxRef] = useState('');

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Delivery notes
  const [customerNotes, setCustomerNotes] = useState('');

  // General error/success state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Totals
  const subtotal = cart.subtotal;
  const shippingFee = cart.shippingFee;
  const finalTotal = Math.max(0, subtotal - discountAmount + shippingFee);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    setIsValidatingCoupon(true);
    setCouponError(null);
    setCouponSuccess(null);

    try {
      const res = await validateCoupon(couponInput, subtotal);
      if (res.valid) {
        setAppliedCouponCode(res.code || couponInput.trim().toUpperCase());
        setDiscountAmount(res.calculatedDiscount);
        setCouponSuccess(
          `Coupon "${res.code}" applied! You saved ₹${res.calculatedDiscount.toLocaleString('en-IN')}.`
        );
      } else {
        setCouponError(res.error || 'Invalid coupon code.');
        setAppliedCouponCode(null);
        setDiscountAmount(0);
      }
    } catch {
      setCouponError('Could not validate coupon. Please try again.');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCouponCode(null);
    setDiscountAmount(0);
    setCouponInput('');
    setCouponSuccess(null);
    setCouponError(null);
  };

  const handlePlaceOrder = () => {
    if (!selectedAddressId) {
      setErrorMessage('Please select or add a delivery address to continue.');
      return;
    }

    if (paymentMethod === PaymentMethod.MANUAL_UPI && !hasUpiConfigured) {
      setErrorMessage(
        'UPI payment configuration pending — please select Cash on Delivery or contact support.'
      );
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const result = await processCheckout({
        shippingAddressId: selectedAddressId,
        paymentMethod,
        couponCode: appliedCouponCode,
        customerNotes: customerNotes.trim() ? customerNotes.trim() : null,
        manualUpiTxRef: manualUpiTxRef.trim() ? manualUpiTxRef.trim() : null,
      });

      if (result.success && result.orderId) {
        router.push(`/orders/${result.orderId}`);
      } else {
        setErrorMessage(result.error || 'Checkout failed. Please review your cart.');
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
      {/* Left Column: Form Sections */}
      <div className="lg:col-span-7 space-y-8">
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-300 text-red-900 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Section 1: Delivery Address */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-cream-300 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-cream-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-herbal-800 text-gold-400 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h2 className="font-serif text-lg font-bold text-herbal-950">
                Delivery Destination
              </h2>
            </div>
            <Link
              href="/account/addresses"
              className="inline-flex items-center gap-1 text-xs font-semibold text-terracotta-600 hover:text-terracotta-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Manage Addresses</span>
            </Link>
          </div>

          {initialAddresses.length > 0 ? (
            <div className="space-y-3">
              {initialAddresses.map((addr) => {
                const isSelected = addr.id === selectedAddressId;
                return (
                  <label
                    key={addr.id}
                    className={`block p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-herbal-800 bg-herbal-50/50 ring-2 ring-herbal-800/10 shadow-sm'
                        : 'border-cream-300 hover:border-herbal-400 bg-cream-50/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="deliveryAddress"
                        value={addr.id}
                        checked={isSelected}
                        onChange={() => setSelectedAddressId(addr.id)}
                        className="mt-1 text-herbal-800 focus:ring-herbal-700"
                      />
                      <div className="space-y-1 text-xs text-herbal-800 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-herbal-950">{addr.fullName}</span>
                          {addr.isDefault && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              Default
                            </span>
                          )}
                          <span className="text-herbal-600">({addr.phone})</span>
                        </div>
                        <p>{addr.addressLine1}</p>
                        {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                        <p>
                          {addr.city}, {addr.state} - {addr.postalCode}
                        </p>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-cream-100/70 border border-cream-200 text-center space-y-3">
              <MapPin className="w-8 h-8 text-herbal-700 mx-auto" />
              <p className="text-xs text-herbal-800">
                You haven&apos;t added a delivery address yet.
              </p>
              <Link
                href="/account/addresses"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-herbal-800 text-cream-100 text-xs font-semibold hover:bg-herbal-900 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 text-gold-400" />
                <span>Add Delivery Address</span>
              </Link>
            </div>
          )}
        </section>

        {/* Section 2: Payment Method */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-cream-300 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-cream-200 pb-4">
            <div className="w-8 h-8 rounded-xl bg-herbal-800 text-gold-400 flex items-center justify-center font-bold text-xs">
              2
            </div>
            <h2 className="font-serif text-lg font-bold text-herbal-950">
              Payment Method
            </h2>
          </div>

          <div className="space-y-4">
            {/* Option A: Cash on Delivery */}
            <label
              className={`block p-4 rounded-2xl border cursor-pointer transition-all ${
                paymentMethod === PaymentMethod.COD
                  ? 'border-herbal-800 bg-herbal-50/50 ring-2 ring-herbal-800/10 shadow-sm'
                  : 'border-cream-300 hover:border-herbal-400 bg-cream-50/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="paymentOption"
                  value={PaymentMethod.COD}
                  checked={paymentMethod === PaymentMethod.COD}
                  onChange={() => setPaymentMethod(PaymentMethod.COD)}
                  className="mt-1 text-herbal-800 focus:ring-herbal-700"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-herbal-800" />
                    <span className="font-bold text-xs text-herbal-950">
                      Cash on Delivery (COD)
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-herbal-700">
                    Pay securely in cash or via delivery agent UPI upon parcel arrival at your doorstep.
                  </p>
                </div>
              </div>
            </label>

            {/* Option B: Manual UPI */}
            <div
              className={`p-4 rounded-2xl border transition-all ${
                paymentMethod === PaymentMethod.MANUAL_UPI
                  ? 'border-herbal-800 bg-herbal-50/50 ring-2 ring-herbal-800/10 shadow-sm'
                  : 'border-cream-300 bg-cream-50/50'
              }`}
            >
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="paymentOption"
                  value={PaymentMethod.MANUAL_UPI}
                  checked={paymentMethod === PaymentMethod.MANUAL_UPI}
                  onChange={() => setPaymentMethod(PaymentMethod.MANUAL_UPI)}
                  className="mt-1 text-herbal-800 focus:ring-herbal-700"
                />
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-herbal-800" />
                    <span className="font-bold text-xs text-herbal-950">
                      Manual UPI Transfer
                    </span>
                  </div>

                  {!hasUpiConfigured ? (
                    <div className="pt-2">
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                        <Info className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          UPI payment configuration pending — please select Cash on Delivery or contact support.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 space-y-2">
                      <p className="text-xs text-herbal-700">
                        Scan our official UPI QR or transfer directly. Provide your UPI transaction reference number below:
                      </p>
                      <input
                        type="text"
                        value={manualUpiTxRef}
                        onChange={(e) => setManualUpiTxRef(e.target.value)}
                        placeholder="e.g. 12-digit UPI Ref / UTR No"
                        className="w-full px-3 py-2 rounded-xl border border-cream-300 bg-white text-xs text-herbal-950 focus:outline-none focus:ring-2 focus:ring-herbal-700/30"
                      />
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>
        </section>

        {/* Section 3: Delivery Instructions / Notes */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-cream-300 shadow-sm space-y-3">
          <div className="flex items-center gap-3 border-b border-cream-200 pb-4">
            <div className="w-8 h-8 rounded-xl bg-herbal-800 text-gold-400 flex items-center justify-center font-bold text-xs">
              3
            </div>
            <h2 className="font-serif text-lg font-bold text-herbal-950">
              Delivery Notes (Optional)
            </h2>
          </div>

          <textarea
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Please leave parcel with neighbor if unavailable, or gate landmark"
            className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 bg-cream-50 text-xs text-herbal-950 focus:outline-none focus:ring-2 focus:ring-herbal-700/30"
          />
        </section>
      </div>

      {/* Right Column: Order Summary & Coupon */}
      <div className="lg:col-span-5 space-y-6 sticky top-24">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-cream-300 shadow-md space-y-6">
          <h3 className="font-serif text-xl font-bold text-herbal-950 border-b border-cream-200 pb-4">
            Order Review ({cart.itemsCount} items)
          </h3>

          {/* Mini Items List */}
          <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
            {cart.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 text-xs">
                <div className="relative w-12 h-12 rounded-xl bg-cream-100 overflow-hidden border border-cream-200 shrink-0">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.productName}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-herbal-700">
                      <Leaf className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-herbal-950 block truncate">
                    {item.productName}
                  </span>
                  <div className="text-[11px] text-herbal-600">
                    Qty: {item.quantity} {item.variantTitle && `• ${item.variantTitle}`}
                  </div>
                </div>
                <div className="font-bold text-herbal-950">
                  ₹{item.lineTotal.toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>

          {/* Coupon Input */}
          <div className="pt-4 border-t border-cream-200 space-y-2">
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-3.5 h-3.5 text-herbal-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Coupon code (e.g. WELCOME10)"
                  disabled={appliedCouponCode !== null || isValidatingCoupon}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-cream-300 bg-cream-50 text-xs uppercase font-mono text-herbal-950 focus:outline-none focus:ring-2 focus:ring-herbal-700/30 disabled:opacity-60"
                />
              </div>
              {appliedCouponCode ? (
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors"
                >
                  Remove
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isValidatingCoupon || !couponInput.trim()}
                  className="px-4 py-2 rounded-xl bg-herbal-800 hover:bg-herbal-900 text-cream-100 text-xs font-semibold disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {isValidatingCoupon && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Apply</span>
                </button>
              )}
            </form>

            {couponSuccess && (
              <div className="text-[11px] text-emerald-700 flex items-center gap-1.5 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{couponSuccess}</span>
              </div>
            )}

            {couponError && (
              <div className="text-[11px] text-red-600 flex items-center gap-1.5 pt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{couponError}</span>
              </div>
            )}
          </div>

          {/* Pricing Calculations */}
          <div className="space-y-2.5 pt-4 border-t border-cream-200 text-xs sm:text-sm text-herbal-800">
            <div className="flex items-center justify-between">
              <span>Cart Subtotal</span>
              <span className="font-semibold text-herbal-950">
                ₹{subtotal.toLocaleString('en-IN')}
              </span>
            </div>

            {discountAmount > 0 && (
              <div className="flex items-center justify-between text-emerald-700">
                <span>Coupon Savings ({appliedCouponCode})</span>
                <span className="font-semibold">-₹{discountAmount.toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span>Delivery Charges</span>
              <span className="font-semibold">
                {shippingFee === 0 ? (
                  <span className="text-emerald-700">FREE</span>
                ) : (
                  `₹${shippingFee}`
                )}
              </span>
            </div>

            <div className="pt-3 border-t border-cream-200 flex items-baseline justify-between text-base sm:text-lg font-bold text-herbal-950">
              <span>Total Payable</span>
              <span className="text-2xl font-serif">
                ₹{finalTotal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={isPending || !selectedAddressId}
            className="w-full py-4 px-6 rounded-2xl bg-herbal-800 hover:bg-herbal-900 text-cream-100 font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin text-gold-400" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-gold-400" />
            )}
            <span>
              {isPending
                ? 'Confirming Order...'
                : `Place Order • ₹${finalTotal.toLocaleString('en-IN')}`}
            </span>
          </button>

          {/* Guarantees */}
          <div className="pt-4 border-t border-cream-200 space-y-2 text-[11px] text-herbal-700">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-herbal-700 shrink-0" />
              <span>100% Genuine homemade herbal preparations</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-herbal-700 shrink-0" />
              <span>Doorstep delivery with complete package tracking</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
