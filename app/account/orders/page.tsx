import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/storefront/Navbar';
import Footer from '@/components/storefront/Footer';
import { getUserOrders } from '@/lib/actions/orders';
import { requireCustomer } from '@/lib/auth/session';
import prisma from '@/lib/db';
import {
  ArrowLeft,
  Package,
  ArrowRight,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  ShoppingBag,
} from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'My Orders | Mana Grameena',
  description: 'Review your past orders and track current shipments.',
};

export default async function CustomerOrdersPage() {
  const authUser = await requireCustomer();
  const [{ orders, totalCount }, cartCount, wishlistCount] = await Promise.all([
    getUserOrders(50),
    prisma.cartItem.count({ where: { cart: { userId: authUser.id } } }),
    prisma.wishlistItem.count({ where: { wishlist: { userId: authUser.id } } }),
  ]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Delivered
          </span>
        );
      case 'SHIPPED':
      case 'OUT_FOR_DELIVERY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 text-[11px] font-semibold border border-blue-200">
            <Truck className="w-3.5 h-3.5 text-blue-600" />
            Shipped / In Transit
          </span>
        );
      case 'CONFIRMED':
      case 'PROCESSING':
      case 'PACKED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[11px] font-semibold border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            {status}
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-800 text-[11px] font-semibold border border-red-200">
            <XCircle className="w-3.5 h-3.5 text-red-600" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cream-200 text-herbal-900 text-[11px] font-semibold">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar
        cartCount={cartCount}
        wishlistCount={wishlistCount}
        user={{ firstName: authUser.firstName, role: authUser.role }}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
        <Link
          href="/account"
          className="inline-flex items-center gap-2 text-xs font-semibold text-herbal-800 hover:text-terracotta-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Account Overview
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-herbal-800 text-gold-400 flex items-center justify-center shadow-md">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-herbal-950">
              My Orders
            </h1>
            <p className="text-xs text-herbal-700">
              {totalCount} total order{totalCount === 1 ? '' : 's'} placed with Mana Grameena
            </p>
          </div>
        </div>

        {orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-3xl p-6 border border-cream-300 shadow-sm space-y-4 hover:border-herbal-400/60 transition-all"
              >
                {/* Order Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cream-200 pb-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-herbal-950">
                        {order.orderNumber}
                      </span>
                      {getStatusBadge(order.orderStatus)}
                    </div>
                    <span className="text-xs text-herbal-600 block">
                      Placed on{' '}
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 sm:self-center">
                    <div className="text-right">
                      <span className="text-[10px] text-herbal-600 uppercase block font-semibold">
                        Total Amount
                      </span>
                      <span className="text-base font-bold text-herbal-950">
                        ₹{order.totalAmount.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <Link
                      href={`/orders/${order.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cream-100 hover:bg-herbal-800 hover:text-cream-100 text-xs font-semibold text-herbal-900 border border-cream-300 transition-colors"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Items Summary */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-herbal-700 uppercase tracking-wider">
                    Package Items ({order.itemsCount})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl bg-cream-50 border border-cream-200 text-xs text-herbal-900 flex justify-between items-center"
                      >
                        <div className="truncate pr-2">
                          <span className="font-medium truncate block">{item.productName}</span>
                          {item.variantTitle && (
                            <span className="text-[10px] text-terracotta-600 block">
                              {item.variantTitle}
                            </span>
                          )}
                        </div>
                        <span className="text-herbal-600 shrink-0 font-semibold">
                          x{item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center border border-cream-300 max-w-md mx-auto my-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-cream-200 flex items-center justify-center mx-auto text-herbal-700">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h2 className="font-serif text-xl font-bold text-herbal-950">No Orders Placed Yet</h2>
            <p className="text-xs text-herbal-800 leading-relaxed">
              When you order handcrafted oils, face packs, or herbal powders, your order tracking and receipts will appear here.
            </p>
            <div className="pt-2">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-herbal-800 text-cream-100 text-xs font-semibold hover:bg-herbal-900 transition-colors shadow-sm"
              >
                <span>Browse Products</span>
                <ArrowRight className="w-3.5 h-3.5 text-gold-400" />
              </Link>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
