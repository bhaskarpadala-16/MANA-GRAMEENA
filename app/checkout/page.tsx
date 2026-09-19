import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import Navbar from '@/components/storefront/Navbar';
import Footer from '@/components/storefront/Footer';
import CheckoutForm from '@/components/storefront/CheckoutForm';
import { getUserAddresses } from '@/lib/actions/address';
import { getCart } from '@/lib/actions/cart';
import { getCurrentUser } from '@/lib/auth/session';
import prisma from '@/lib/db';
import { getPublicUpiConfig } from '@/lib/env';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Secure Checkout | Mana Grameena',
  description: 'Complete your authentic homemade herbal order with Cash on Delivery or UPI.',
};

export default async function CheckoutPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?redirect=/checkout');
  }

  const [addresses, cart, cartCount, wishlistCount] = await Promise.all([
    getUserAddresses(),
    getCart(),
    prisma.cartItem.count({ where: { cart: { userId: user.id } } }),
    prisma.wishlistItem.count({ where: { wishlist: { userId: user.id } } }),
  ]);

  if (!cart || cart.items.length === 0) {
    redirect('/cart');
  }

  const hasUpiConfigured = getPublicUpiConfig().isConfigured;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar
        cartCount={cartCount}
        wishlistCount={wishlistCount}
        user={{ firstName: user.firstName, role: user.role }}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/cart"
            className="inline-flex items-center gap-2 text-xs font-semibold text-herbal-800 hover:text-terracotta-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Cart</span>
          </Link>

          <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-semibold">256-Bit Encrypted Secure Checkout</span>
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-herbal-950">
            Order Checkout
          </h1>
          <p className="text-xs text-herbal-700 mt-1">
            Carefully packaged directly at our rural artisan centers
          </p>
        </div>

        {/* Checkout Form */}
        <CheckoutForm
          initialAddresses={addresses}
          cart={cart}
          hasUpiConfigured={hasUpiConfigured}
        />
      </main>

      <Footer />
    </div>
  );
}
