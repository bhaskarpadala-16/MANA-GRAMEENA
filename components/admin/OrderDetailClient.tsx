'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart,
  Truck,
  CreditCard,
  User,
  MapPin,
  Clock,
  Loader2,
  Save,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { AdminBadge } from './AdminBadge';
import { OrderStatusModal } from './OrderStatusModal';
import { updateShipmentTrackingAction } from '@/lib/actions/admin/orders';
import { OrderStatus, PaymentStatus, ShippingStatus } from '@prisma/client';

interface OrderDetailClientProps {
  order: {
    id: string;
    orderNumber: string;
    orderStatus: OrderStatus;
    paymentStatus: PaymentStatus;
    subtotal: any;
    discountAmount: any;
    shippingFee: any;
    totalAmount: any;
    customerNotes?: string | null;
    shippingAddressSnapshot: any;
    createdAt: string | Date;
    placedAt?: string;
    profile: {
      id: string;
      firstName: string;
      lastName: string;
      phone?: string | null;
    };
    items: {
      id: string;
      productNameSnapshot: string;
      skuSnapshot: string;
      unitPrice: any;
      quantity: number;
      totalPrice: any;
      variant?: { title: string } | null;
    }[];
    payment?: {
      id: string;
      paymentMethod: string;
      paymentStatus: PaymentStatus;
      amount: any;
      transactionRef?: string | null;
      proof?: {
        id: string;
        transactionReferenceId: string;
        reviewStatus: string;
        adminNotes?: string | null;
      } | null;
    } | null;
    shipment?: {
      id: string;
      carrierName: string;
      trackingNumber?: string | null;
      trackingUrl?: string | null;
      shippingStatus: ShippingStatus;
      estimatedDelivery?: Date | null;
      shippedAt?: Date | null;
      deliveredAt?: Date | string | null;
    } | null;
    couponUsages?: {
      coupon: {
        code: string;
        discountType: string;
        discountValue: any;
      };
    }[];
  };
}

export function OrderDetailClient({ order }: OrderDetailClientProps) {
  const router = useRouter();
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [shipmentMsg, setShipmentMsg] = useState<string | null>(null);

  const [carrierName, setCarrierName] = useState(
    order.shipment?.carrierName || 'India Post / Blue Dart'
  );
  const [trackingNumber, setTrackingNumber] = useState(order.shipment?.trackingNumber || '');
  const [trackingUrl, setTrackingUrl] = useState(order.shipment?.trackingUrl || '');
  const [shippingStatus, setShippingStatus] = useState<ShippingStatus>(
    order.shipment?.shippingStatus || ShippingStatus.PENDING
  );
  const [estimatedDelivery, setEstimatedDelivery] = useState(
    order.shipment?.estimatedDelivery
      ? new Date(order.shipment.estimatedDelivery).toISOString().slice(0, 10)
      : ''
  );

  const handleUpdateShipment = (e: React.FormEvent) => {
    e.preventDefault();
    setShipmentMsg(null);

    startTransition(async () => {
      const res = await updateShipmentTrackingAction({
        orderId: order.id,
        carrierName,
        trackingNumber: trackingNumber || null,
        trackingUrl: trackingUrl || null,
        shippingStatus,
        estimatedDelivery: estimatedDelivery || null,
      });

      if (!res.success) {
        setShipmentMsg(`Error: ${res.error}`);
      } else {
        setShipmentMsg('Shipment details updated successfully.');
        router.refresh();
      }
    });
  };

  const shipAddr = order.shippingAddressSnapshot as Record<string, any> | null;

  return (
    <div className="space-y-8">
      {/* Action Header Card */}
      <div className="p-6 rounded-3xl bg-herbal-900 border border-herbal-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-serif text-2xl font-bold text-cream-50">
              Order #{order.orderNumber}
            </h2>
            <AdminBadge status={order.orderStatus} size="md" />
          </div>
          <p className="text-xs text-cream-400 mt-1">
            Placed on{' '}
            {order.placedAt ||
              new Date(order.createdAt).toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
              })}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setStatusModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-herbal-800 border border-gold-500/30 text-gold-400 hover:bg-herbal-700 text-xs font-bold transition-all cursor-pointer shadow-lg"
        >
          Advance Order Status
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Line Items & Payment */}
        <div className="lg:col-span-2 space-y-8">
          {/* Purchased Line Items */}
          <div className="p-6 rounded-3xl bg-herbal-900 border border-herbal-800 shadow-xl space-y-4">
            <h3 className="font-serif text-base font-bold text-cream-50 border-b border-herbal-800 pb-3">
              Order Items Snapshot
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-herbal-800 text-cream-400 font-semibold uppercase tracking-wider">
                    <th className="pb-2">Item</th>
                    <th className="pb-2">SKU</th>
                    <th className="pb-2">Unit Price</th>
                    <th className="pb-2">Qty</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-herbal-800/40">
                  {order.items.map((item) => (
                    <tr key={item.id} className="text-cream-200">
                      <td className="py-3">
                        <span className="font-semibold text-cream-100 block">
                          {item.productNameSnapshot}
                        </span>
                        {item.variant?.title && (
                          <span className="text-[11px] text-cream-400">{item.variant.title}</span>
                        )}
                      </td>
                      <td className="py-3 font-mono text-cream-400">{item.skuSnapshot}</td>
                      <td className="py-3 font-semibold text-cream-100">
                        ₹{Number(item.unitPrice).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 font-bold text-gold-400 font-mono">{item.quantity}</td>
                      <td className="py-3 text-right font-bold text-cream-100 font-serif">
                        ₹{Number(item.totalPrice).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Totals */}
            <div className="pt-4 border-t border-herbal-800 space-y-2 text-xs max-w-xs ml-auto">
              <div className="flex justify-between text-cream-400">
                <span>Subtotal:</span>
                <span className="font-mono text-cream-200">
                  ₹{Number(order.subtotal).toLocaleString('en-IN')}
                </span>
              </div>
              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>
                    Discount {order.couponUsages?.[0] ? `(${order.couponUsages[0].coupon.code})` : ''}:
                  </span>
                  <span className="font-mono">-₹{Number(order.discountAmount).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-cream-400">
                <span>Shipping Fee:</span>
                <span className="font-mono text-cream-200">
                  ₹{Number(order.shippingFee).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-cream-50 pt-2 border-t border-herbal-800">
                <span>Total Amount:</span>
                <span className="font-serif text-gold-400">
                  ₹{Number(order.totalAmount).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Shipment & Courier Dispatch Form */}
          <div className="p-6 rounded-3xl bg-herbal-900 border border-herbal-800 shadow-xl space-y-5">
            <div className="flex items-center gap-3 border-b border-herbal-800 pb-3">
              <div className="w-8 h-8 rounded-xl bg-herbal-800 text-gold-400 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-cream-50">
                  Shipment & Courier Tracking
                </h3>
                <p className="text-xs text-cream-400">
                  Dispatch courier details and tracking link for the customer
                </p>
              </div>
            </div>

            {shipmentMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  shipmentMsg.startsWith('Error')
                    ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                    : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {shipmentMsg.startsWith('Error') ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>{shipmentMsg}</span>
              </div>
            )}

            <form onSubmit={handleUpdateShipment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
                    Carrier Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={carrierName}
                    onChange={(e) => setCarrierName(e.target.value)}
                    placeholder="e.g. Blue Dart / DTDC / India Post"
                    className="w-full px-3 py-2 bg-herbal-950 border border-herbal-800 rounded-xl text-xs text-cream-100 focus:outline-none focus:border-gold-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
                    Tracking Number / AWB
                  </label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="AWB84920492"
                    className="w-full px-3 py-2 bg-herbal-950 border border-herbal-800 rounded-xl text-xs font-mono text-cream-100 focus:outline-none focus:border-gold-500/50 uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
                    Tracking URL
                  </label>
                  <input
                    type="url"
                    value={trackingUrl}
                    onChange={(e) => setTrackingUrl(e.target.value)}
                    placeholder="https://track.bluedart.com/..."
                    className="w-full px-3 py-2 bg-herbal-950 border border-herbal-800 rounded-xl text-xs text-cream-100 focus:outline-none focus:border-gold-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
                    Shipping Status
                  </label>
                  <select
                    value={shippingStatus}
                    onChange={(e) => setShippingStatus(e.target.value as ShippingStatus)}
                    className="w-full px-3 py-2 bg-herbal-950 border border-herbal-800 rounded-xl text-xs text-cream-200 focus:outline-none focus:border-gold-500/50"
                  >
                    <option value="PENDING">Pending Packaging</option>
                    <option value="SHIPPED">Dispatched / Shipped</option>
                    <option value="IN_TRANSIT">In Transit</option>
                    <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                    <option value="DELIVERED">Delivered</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-herbal-800 hover:bg-herbal-700 text-gold-400 border border-gold-500/30 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Shipment Details
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column (1 Col): Customer & Delivery Address */}
        <div className="space-y-8">
          {/* Customer Profile Card */}
          <div className="p-6 rounded-3xl bg-herbal-900 border border-herbal-800 shadow-xl space-y-4">
            <div className="flex items-center gap-3 border-b border-herbal-800 pb-3">
              <div className="w-8 h-8 rounded-xl bg-herbal-800 text-gold-400 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <h3 className="font-serif text-base font-bold text-cream-50">Customer Contact</h3>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-cream-400 block">Name:</span>
                <span className="font-semibold text-cream-100">
                  {order.profile.firstName} {order.profile.lastName}
                </span>
              </div>
              <div>
                <span className="text-cream-400 block">Phone:</span>
                <span className="font-mono text-cream-200">
                  {order.profile.phone || shipAddr?.phone || 'Not provided'}
                </span>
              </div>
            </div>
          </div>

          {/* Delivery Address Snapshot Card */}
          <div className="p-6 rounded-3xl bg-herbal-900 border border-herbal-800 shadow-xl space-y-4">
            <div className="flex items-center gap-3 border-b border-herbal-800 pb-3">
              <div className="w-8 h-8 rounded-xl bg-herbal-800 text-gold-400 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <h3 className="font-serif text-base font-bold text-cream-50">Shipping Destination</h3>
            </div>

            {shipAddr ? (
              <div className="text-xs text-cream-200 space-y-1 leading-relaxed">
                <p className="font-semibold text-cream-100">{shipAddr.fullName}</p>
                <p>{shipAddr.addressLine1}</p>
                {shipAddr.addressLine2 && <p>{shipAddr.addressLine2}</p>}
                {shipAddr.landmark && <p className="text-cream-400">Landmark: {shipAddr.landmark}</p>}
                <p>
                  {shipAddr.city}, {shipAddr.state} - {shipAddr.postalCode}
                </p>
                <p className="text-cream-400">{shipAddr.country || 'India'}</p>
                <p className="text-cream-300 font-mono pt-1">Phone: {shipAddr.phone}</p>
              </div>
            ) : (
              <p className="text-xs text-cream-400 italic">No shipping address recorded.</p>
            )}
          </div>

          {/* Payment Status Card */}
          <div className="p-6 rounded-3xl bg-herbal-900 border border-herbal-800 shadow-xl space-y-4">
            <div className="flex items-center gap-3 border-b border-herbal-800 pb-3">
              <div className="w-8 h-8 rounded-xl bg-herbal-800 text-gold-400 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <h3 className="font-serif text-base font-bold text-cream-50">Payment Overview</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-cream-400">Method:</span>
                <span className="font-bold text-cream-100 uppercase">
                  {order.payment?.paymentMethod || 'COD'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-cream-400">Status:</span>
                <AdminBadge status={order.paymentStatus} size="sm" />
              </div>
              {order.payment?.transactionRef && (
                <div className="flex justify-between items-center">
                  <span className="text-cream-400">Ref / UTR:</span>
                  <span className="font-mono text-cream-200">{order.payment.transactionRef}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transition Modal */}
      {statusModalOpen && (
        <OrderStatusModal
          orderId={order.id}
          orderNumber={order.orderNumber}
          currentStatus={order.orderStatus}
          onClose={() => setStatusModalOpen(false)}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
