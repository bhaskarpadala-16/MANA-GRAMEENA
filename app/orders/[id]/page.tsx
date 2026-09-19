import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import Navbar from '@/components/storefront/Navbar';
import Footer from '@/components/storefront/Footer';
import OrderDetailView from '@/components/storefront/OrderDetailView';
import { getOrderDetailById } from '@/lib/actions/orders';
import { getCurrentUser } from '@/lib/auth/session';
import { getPublicUpiConfig } from '@/lib/env';
import prisma from '@/lib/db';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface OrderPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderPage({ params }: OrderPageProps) {
  const user = await getCurrentUser();

  const { id } = await params;

  if (!user) {
    redirect(`/login?redirect=/orders/${encodeURIComponent(id)}`);
  }
  const [order, cartCount, wishlistCount] = await Promise.all([
    getOrderDetailById(id),
    prisma.cartItem.count({ where: { cart: { userId: user.id } } }),
    prisma.wishlistItem.count({ where: { wishlist: { userId: user.id } } }),
  ]);

  if (!order) {
    notFound();
  }

  const upiConfig = getPublicUpiConfig();

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar
        cartCount={cartCount}
        wishlistCount={wishlistCount}
        user={{ firstName: user.firstName, role: user.role }}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/account/orders"
            className="inline-flex items-center gap-2 text-xs font-semibold text-herbal-800 hover:text-terracotta-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Orders</span>
          </Link>

          <div className="inline-flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Order Confirmed in Database</span>
          </div>
        </div>

        <OrderDetailView order={order} upiConfig={upiConfig} />
      </main>

      <Footer />
    </div>
  );
}
