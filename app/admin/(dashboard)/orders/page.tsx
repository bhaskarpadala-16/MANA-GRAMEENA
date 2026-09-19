import 'server-only';
import React from 'react';
import Link from 'next/link';
import { ShoppingCart, Search, Filter, CheckCircle2, ArrowRight } from 'lucide-react';
import { getAdminOrders } from '@/lib/db/admin';
import { AdminBadge } from '@/components/admin/AdminBadge';
import { Pagination } from '@/components/admin/Pagination';
import { EmptyState } from '@/components/admin/EmptyState';
import { OrderStatus, PaymentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Orders & Fulfillment | Admin | Mana Grameena',
  description: 'Manage customer orders, status progression, and shipment fulfillment.',
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    orderStatus?: OrderStatus;
    paymentStatus?: PaymentStatus;
    page?: string;
  }>;
}) {
  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page || '1', 10);
  const search = resolvedParams.search || '';
  const orderStatus = resolvedParams.orderStatus;
  const paymentStatus = resolvedParams.paymentStatus;

  const ordersData = await getAdminOrders({
    search,
    orderStatus: orderStatus || undefined,
    paymentStatus: paymentStatus || undefined,
    page,
    pageSize: 15,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-cream-50">
            Orders & Fulfillment
          </h1>
          <p className="text-xs text-cream-400 mt-1">
            Track customer orders, update delivery progress, and coordinate packaging.
          </p>
        </div>

        <Link
          href="/admin/orders/payments"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-herbal-900 border border-gold-500/30 text-gold-400 hover:bg-herbal-800 text-xs font-semibold transition-colors cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          UPI Verification Portal
        </Link>
      </div>

      {/* Filter / Search Bar */}
      <form
        method="GET"
        className="p-4 rounded-2xl bg-herbal-900 border border-herbal-800 flex flex-col md:flex-row items-center gap-3 shadow-lg"
      >
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-cream-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search by order number or customer name..."
            className="w-full pl-10 pr-4 py-2 bg-herbal-950/80 border border-herbal-800 rounded-xl text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            name="orderStatus"
            defaultValue={orderStatus || ''}
            className="px-3 py-2 bg-herbal-950/80 border border-herbal-800 rounded-xl text-xs text-cream-200 focus:outline-none focus:border-gold-500/50"
          >
            <option value="">All Order Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PROCESSING">Processing</option>
            <option value="PACKED">Packed</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            name="paymentStatus"
            defaultValue={paymentStatus || ''}
            className="px-3 py-2 bg-herbal-950/80 border border-herbal-800 rounded-xl text-xs text-cream-200 focus:outline-none focus:border-gold-500/50"
          >
            <option value="">All Payments</option>
            <option value="PENDING">Pending</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="VERIFIED">Verified</option>
            <option value="FAILED">Failed / Rejected</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-herbal-800 hover:bg-herbal-700 text-xs font-semibold text-cream-100 transition-colors"
          >
            Filter
          </button>
        </div>
      </form>

      {/* Orders Table */}
      <div className="rounded-3xl bg-herbal-900 border border-herbal-800 shadow-xl overflow-hidden p-6 space-y-4">
        {ordersData.items.length === 0 ? (
          <EmptyState
            title="No Orders Found"
            description="No customer purchases match the specified filter or search query."
            icon={ShoppingCart}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-herbal-800 text-cream-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3">Order #</th>
                    <th className="pb-3">Customer</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Items</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Payment</th>
                    <th className="pb-3">Order Status</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-herbal-800/60">
                  {ordersData.items.map((order) => (
                    <tr key={order.id} className="hover:bg-herbal-800/30 transition-colors">
                      <td className="py-3 font-mono font-bold text-cream-100">
                        {order.orderNumber}
                      </td>

                      <td className="py-3 text-cream-200">
                        {order.profile.firstName} {order.profile.lastName}
                      </td>

                      <td className="py-3 text-cream-400 whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="py-3 text-cream-400">{order._count.items} item(s)</td>

                      <td className="py-3 font-semibold text-cream-100 font-serif text-sm">
                        ₹{Number(order.totalAmount).toLocaleString('en-IN')}
                      </td>

                      <td className="py-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-cream-400 uppercase block">
                            {order.payment?.paymentMethod || 'COD'}
                          </span>
                          <AdminBadge status={order.paymentStatus} size="sm" />
                        </div>
                      </td>

                      <td className="py-3">
                        <AdminBadge status={order.orderStatus} size="sm" />
                      </td>

                      <td className="py-3 text-right">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="px-3 py-1.5 rounded-lg bg-herbal-800 hover:bg-herbal-700 text-cream-200 font-medium transition-colors"
                        >
                          Inspect
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={ordersData.page}
              totalPages={ordersData.totalPages}
              totalItems={ordersData.total}
              pageSize={ordersData.pageSize}
              baseUrl="/admin/orders"
              searchParams={{ search, orderStatus, paymentStatus }}
            />
          </>
        )}
      </div>
    </div>
  );
}
