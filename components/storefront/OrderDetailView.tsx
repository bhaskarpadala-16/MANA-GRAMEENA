'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { OrderDetailDto, cancelCustomerOrder, submitPaymentProofAction } from '@/lib/actions/orders';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  MapPin,
  CreditCard,
  Printer,
  AlertCircle,
  Loader2,
  Star,
  Copy,
  Check,
  QrCode,
  Upload,
  ExternalLink,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';

interface OrderDetailViewProps {
  order: OrderDetailDto;
  upiConfig?: {
    upiId: string | null;
    upiName: string;
    isConfigured: boolean;
  };
}

export default function OrderDetailView({ order, upiConfig }: OrderDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Manual UPI Proof State
  const [proofUtr, setProofUtr] = useState(order.payment?.transactionRef || '');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [proofMessage, setProofMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isReSubmitting, setIsReSubmitting] = useState(false);

  const handleCopyUpi = () => {
    if (upiConfig?.upiId) {
      navigator.clipboard.writeText(upiConfig.upiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setProofFile(null);
      setFilePreview(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProofMessage({ type: 'error', text: 'Screenshot image size must not exceed 5MB.' });
      return;
    }
    setProofFile(file);
    setProofMessage(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofUtr.trim()) {
      setProofMessage({ type: 'error', text: 'Please enter your UPI transaction reference / UTR ID.' });
      return;
    }
    if (!proofFile) {
      setProofMessage({ type: 'error', text: 'Please attach a payment confirmation screenshot.' });
      return;
    }

    setIsSubmittingProof(true);
    setProofMessage(null);

    const formData = new FormData();
    formData.append('orderId', order.id);
    formData.append('transactionReferenceId', proofUtr.trim());
    formData.append('screenshot', proofFile);

    try {
      const res = await submitPaymentProofAction(formData);
      if (res.success) {
        setProofMessage({ type: 'success', text: res.message || 'Payment proof submitted successfully.' });
        setIsReSubmitting(false);
        router.refresh();
      } else {
        setProofMessage({ type: 'error', text: res.error || 'Failed to submit payment proof.' });
      }
    } catch {
      setProofMessage({ type: 'error', text: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsSubmittingProof(false);
    }
  };

  // Pre-calculate URL-encoded UPI payment parameters
  const upiId = upiConfig?.upiId;
  const upiName = upiConfig?.upiName || 'Mana Grameena';
  const upiAmount = order.totalAmount.toFixed(2);
  const upiNote = `Order_${order.orderNumber}`;
  const upiUri = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${encodeURIComponent(upiAmount)}&cu=INR&tn=${encodeURIComponent(upiNote)}`
    : null;
  const qrUrl = upiUri
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiUri)}`
    : null;

  const canCancel =
    order.orderStatus === 'PENDING' || order.orderStatus === 'CONFIRMED';

  const handleCancel = () => {
    if (!confirm('Are you sure you want to cancel this order? Any reserved inventory will be released.')) {
      return;
    }

    setIsCancelling(true);
    setErrorMessage(null);

    startTransition(async () => {
      const res = await cancelCustomerOrder(order.id, 'Customer requested cancellation via portal');
      if (res.success) {
        router.refresh();
      } else {
        setErrorMessage(res.error || 'Failed to cancel order.');
      }
      setIsCancelling(false);
    });
  };

  const steps = [
    { label: 'Confirmed', status: ['CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'] },
    { label: 'Processing', status: ['PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'] },
    { label: 'Packed', status: ['PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'] },
    { label: 'Shipped', status: ['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'] },
    { label: 'Delivered', status: ['DELIVERED'] },
  ];

  const isCancelled = order.orderStatus === 'CANCELLED';

  return (
    <div className="space-y-8">
      {/* Top Bar with Order Number & Print */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-cream-300 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cream-200 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-lg sm:text-xl font-bold text-herbal-950">
                #{order.orderNumber}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isCancelled
                    ? 'bg-red-100 text-red-800'
                    : order.orderStatus === 'DELIVERED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {order.orderStatus}
              </span>
            </div>
            <p className="text-xs text-herbal-600 mt-1">
              Order placed on{' '}
              {new Date(order.createdAt).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-cream-300 text-xs font-semibold text-herbal-900 hover:bg-cream-100 transition-colors"
            >
              <Printer className="w-4 h-4 text-herbal-700" />
              <span>Print Invoice</span>
            </button>

            {canCancel && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={isCancelling || isPending}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {isCancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                <span>Cancel Order</span>
              </button>
            )}
          </div>
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tracking Pipeline / Stepper */}
        {!isCancelled ? (
          <div className="py-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-herbal-700 mb-6">
              Fulfillment Journey
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 relative">
              {steps.map((step, idx) => {
                const isComplete = step.status.includes(order.orderStatus);
                const isCurrent =
                  (idx === 0 && order.orderStatus === 'CONFIRMED') ||
                  (idx === 1 && order.orderStatus === 'PROCESSING') ||
                  (idx === 2 && order.orderStatus === 'PACKED') ||
                  (idx === 3 && (order.orderStatus === 'SHIPPED' || order.orderStatus === 'OUT_FOR_DELIVERY')) ||
                  (idx === 4 && order.orderStatus === 'DELIVERED');

                return (
                  <div key={step.label} className="flex flex-col items-center text-center space-y-2">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        isComplete
                          ? 'bg-herbal-800 text-cream-100 shadow-md ring-4 ring-herbal-800/10'
                          : 'bg-cream-200 text-herbal-500 border border-cream-300'
                      }`}
                    >
                      {isComplete ? <CheckCircle2 className="w-5 h-5 text-gold-400" /> : idx + 1}
                    </div>
                    <span
                      className={`text-xs ${
                        isCurrent
                          ? 'font-bold text-herbal-950'
                          : isComplete
                          ? 'font-medium text-herbal-800'
                          : 'text-herbal-500'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>
              This order has been cancelled. All reserved products have been safely returned to stock inventory.
            </span>
          </div>
        )}
      </div>

      {/* Main Details Grid: Items & Addresses */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Itemized Receipt */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-cream-300 shadow-sm space-y-6">
          <h3 className="font-serif text-lg font-bold text-herbal-950 border-b border-cream-200 pb-4">
            Purchased Herbal Formulations ({order.items.length})
          </h3>

          <div className="divide-y divide-cream-200">
            {order.items.map((item) => (
              <div key={item.id} className="py-4 flex items-center justify-between gap-4 text-xs">
                <div className="space-y-1 min-w-0 flex-1">
                  <span className="font-bold text-sm text-herbal-950 block">
                    {item.productName}
                  </span>
                  <div className="flex items-center gap-3 text-herbal-600 text-[11px]">
                    <span>SKU: {item.sku}</span>
                    <span>•</span>
                    <span>₹{item.unitPrice.toLocaleString('en-IN')} each</span>
                    <span>•</span>
                    <span className="font-semibold text-herbal-900">Qty: {item.quantity}</span>
                  </div>

                  {/* Review Link for Delivered Items */}
                  {order.orderStatus === 'DELIVERED' && (
                    <div className="pt-2">
                      <Link
                        href={`/products?reviewProduct=${item.productId}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-terracotta-600 hover:text-terracotta-700"
                      >
                        <Star className="w-3.5 h-3.5 fill-terracotta-500 text-terracotta-500" />
                        <span>Write a Verified Customer Review</span>
                      </Link>
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-herbal-950">
                    ₹{item.totalPrice.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Shipment Tracking Info Card */}
          {order.shipment && (
            <div className="p-4 rounded-2xl bg-cream-50 border border-cream-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-herbal-950">
                  <Truck className="w-4 h-4 text-herbal-800" />
                  <span>Courier: {order.shipment.carrierName}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cream-200 text-herbal-800 uppercase">
                  {order.shipment.shippingStatus}
                </span>
              </div>
              {order.shipment.trackingNumber && (
                <p className="text-herbal-700">
                  Tracking Number:{' '}
                  <span className="font-mono font-bold text-herbal-900">
                    {order.shipment.trackingNumber}
                  </span>
                </p>
              )}
              {order.shipment.deliveredAt && (
                <p className="text-emerald-700 font-medium">
                  Delivered on {new Date(order.shipment.deliveredAt).toLocaleDateString('en-IN')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right: Payment, Pricing, & Destination Snapshot */}
        <div className="lg:col-span-4 space-y-6">
          {/* Financial Calculation */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-cream-300 shadow-md space-y-4">
            <h3 className="font-serif text-lg font-bold text-herbal-950 border-b border-cream-200 pb-3">
              Payment Summary
            </h3>

            <div className="space-y-2 text-xs sm:text-sm text-herbal-800">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-herbal-950">
                  ₹{order.subtotal.toLocaleString('en-IN')}
                </span>
              </div>

              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Coupon Discount {order.couponUsage ? `(${order.couponUsage.code})` : ''}</span>
                  <span className="font-semibold">-₹{order.discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Delivery Charge</span>
                <span className="font-semibold">
                  {order.shippingFee === 0 ? <span className="text-emerald-700">FREE</span> : `₹${order.shippingFee}`}
                </span>
              </div>

              <div className="pt-3 border-t border-cream-200 flex justify-between text-base font-bold text-herbal-950">
                <span>Total Paid / Payable</span>
                <span className="text-lg font-serif">
                  ₹{order.totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Payment Mode Snapshot */}
            {order.payment && (
              <div className="pt-3 border-t border-cream-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-herbal-800">
                  <CreditCard className="w-4 h-4 text-herbal-700" />
                  <span className="font-semibold">{order.payment.paymentMethod}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                  {order.payment.paymentStatus}
                </span>
              </div>
            )}
          </div>

          {/* Manual UPI Payment & Verification Section */}
          {order.payment?.paymentMethod === 'MANUAL_UPI' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-cream-300 shadow-md space-y-5">
              <div className="flex items-center gap-2 font-serif text-base font-bold text-herbal-950 border-b border-cream-200 pb-3">
                <QrCode className="w-5 h-5 text-herbal-800" />
                <span>Manual UPI Verification</span>
              </div>

              {/* Status Case 1: Verified */}
              {order.paymentProof?.reviewStatus === 'VERIFIED' ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Payment Verified & Confirmed</span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    Ref ID: <span className="font-mono font-bold">{order.paymentProof.transactionReferenceId}</span>
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    Your transfer has been verified against our merchant bank account. Your order is moving to packaging.
                  </p>
                </div>
              ) : order.paymentProof?.reviewStatus === 'UNDER_REVIEW' && !isReSubmitting ? (
                /* Status Case 2: Under Review */
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-amber-800">
                    <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                    <span>Payment Proof Under Review</span>
                  </div>
                  <div className="space-y-1 text-[11px] text-amber-800">
                    <p>
                      Submitted UTR Ref:{' '}
                      <span className="font-mono font-bold">{order.paymentProof.transactionReferenceId}</span>
                    </p>
                    <p className="text-amber-700">
                      Submitted on {new Date(order.paymentProof.createdAt).toLocaleString('en-IN')}.
                    </p>
                    <p className="text-amber-700 pt-1">
                      Our finance team is currently reconciling this reference with our merchant bank statement.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsReSubmitting(true)}
                    className="text-[11px] font-semibold text-herbal-800 hover:text-herbal-950 underline"
                  >
                    Update Reference or Re-upload Screenshot
                  </button>
                </div>
              ) : (
                /* Status Case 3: Needs Submission or Rejected Re-Submission */
                <div className="space-y-4 text-xs">
                  {order.paymentProof?.reviewStatus === 'REJECTED' && !isReSubmitting && (
                    <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-900 space-y-2">
                      <div className="flex items-center gap-2 font-bold text-red-800">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span>Previous Verification Unsuccessful</span>
                      </div>
                      {order.paymentProof.adminNotes && (
                        <p className="text-[11px] text-red-700">
                          Reason: {order.paymentProof.adminNotes}
                        </p>
                      )}
                      <p className="text-[11px] text-red-700">
                        Please re-check your bank transfer statement and submit the correct UTR reference and screenshot.
                      </p>
                    </div>
                  )}

                  {upiConfig?.isConfigured && upiId ? (
                    <div className="space-y-4">
                      {/* VPA Copy Bar */}
                      <div className="p-3 rounded-2xl bg-cream-50 border border-cream-200 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-herbal-600 block">
                            Official Merchant UPI ID
                          </span>
                          <span className="font-mono font-bold text-xs text-herbal-950">
                            {upiId}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyUpi}
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-cream-300 hover:bg-cream-100 text-herbal-800 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      {/* QR Code & Deep Link */}
                      <div className="flex flex-col items-center justify-center p-4 bg-cream-50/50 rounded-2xl border border-cream-200 space-y-3">
                        {qrUrl && (
                          <div className="p-2 bg-white rounded-xl shadow-sm border border-cream-200">
                            <img
                              src={qrUrl}
                              alt="Scan UPI QR"
                              className="w-36 h-36 object-contain"
                            />
                          </div>
                        )}
                        <span className="text-[11px] text-herbal-600 text-center">
                          Scan with any UPI App (GPay, PhonePe, Paytm, BHIM)
                        </span>
                        {upiUri && (
                          <a
                            href={upiUri}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-herbal-800 text-cream-100 text-xs font-semibold hover:bg-herbal-900 transition-colors shadow-sm"
                          >
                            <span>Pay with Installed UPI App</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      {/* Proof Submission Form */}
                      <form onSubmit={handleSubmitProof} className="space-y-3 pt-1">
                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-herbal-900 uppercase">
                            12-Digit UPI Ref / UTR Number *
                          </label>
                          <input
                            type="text"
                            required
                            value={proofUtr}
                            onChange={(e) => setProofUtr(e.target.value)}
                            placeholder="e.g. 423456789012"
                            className="w-full px-3 py-2 rounded-xl border border-cream-300 bg-white text-xs font-mono text-herbal-950 focus:outline-none focus:ring-2 focus:ring-herbal-700/30"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-herbal-900 uppercase">
                            Payment Screenshot (Max 5MB) *
                          </label>
                          <input
                            type="file"
                            required
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleFileChange}
                            className="w-full text-[11px] text-herbal-700 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border file:border-cream-300 file:text-xs file:font-semibold file:bg-cream-100 hover:file:bg-cream-200 cursor-pointer"
                          />
                        </div>

                        {filePreview && (
                          <div className="p-2 rounded-xl bg-cream-50 border border-cream-200 flex items-center gap-2">
                            <img
                              src={filePreview}
                              alt="Preview"
                              className="w-12 h-12 rounded-lg object-cover border border-cream-300"
                            />
                            <span className="text-[11px] text-herbal-700 truncate">
                              {proofFile?.name}
                            </span>
                          </div>
                        )}

                        {proofMessage && (
                          <div
                            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                              proofMessage.type === 'success'
                                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                                : 'bg-red-50 text-red-900 border border-red-200'
                            }`}
                          >
                            {proofMessage.type === 'success' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                            )}
                            <span>{proofMessage.text}</span>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={isSubmittingProof}
                          className="w-full py-2.5 rounded-xl bg-herbal-800 hover:bg-herbal-900 text-cream-100 font-semibold text-xs transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {isSubmittingProof ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Uploading & Submitting...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              <span>Submit Payment Proof</span>
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                      Official merchant UPI configuration is currently being finalized. Please contact customer support with your order reference.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Delivery Address Snapshot */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-cream-300 shadow-sm space-y-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-sm text-herbal-950 border-b border-cream-200 pb-3">
              <MapPin className="w-4 h-4 text-terracotta-600" />
              <span>Delivery Destination</span>
            </div>
            <div className="text-herbal-800/90 leading-relaxed space-y-0.5">
              <p className="font-bold text-herbal-950">{order.shippingAddress?.fullName}</p>
              <p>{order.shippingAddress?.addressLine1}</p>
              {order.shippingAddress?.addressLine2 && <p>{order.shippingAddress?.addressLine2}</p>}
              <p>
                {order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.postalCode}
              </p>
              <p className="text-herbal-600">Phone: {order.shippingAddress?.phone}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
