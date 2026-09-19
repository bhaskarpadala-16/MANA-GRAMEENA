import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/storefront/Navbar';
import Footer from '@/components/storefront/Footer';
import CartView from '@/components/storefront/CartView';
import { getCart } from '@/lib/actions/cart';
import { getCurrentUser } from '@/lib/auth/session';
import prisma from '@/lib/db';
import { ShoppingBag, ArrowRight, User } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Your Shopping Cart | Mana Grameena',
  description: 'Review and checkout your handcrafted herbal wellness essentials.',
};

export default async function CartPage() {
  const user = await getCurrentUser();

  let cartCount = 0;
  let wishlistCount = 0;

  if (user) {
    const [cCount, wCount] = await Promise.all([
      prisma.cartItem.count({ where: { cart: { userId: user.id } } }),
      prisma.wishlistItem.count({ where: { wishlist: { userId: user.id } } }),
    ]);
    cartCount = cCount;
    wishlistCount = wCount;
  }

  const cart = user ? await getCart() : null;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar
        cartCount={cartCount}
        wishlistCount={wishlistCount}
        user={user ? { firstName: user.firstName, role: user.role } : null}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Breadcrumb Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-herbal-800 text-cream-100 flex items-center justify-center shadow-md">
              <ShoppingBag className="w-5 h-5 text-gold-400" />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-herbal-950">
                Your Shopping Cart
              </h1>
              <p className="text-xs text-herbal-700">
                Fresh small-batch preparations from rural artisan collectives
              </p>
            </div>
          </div>
        </div>

        {/* Content depending on auth */}
        {!user ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-cream-300 max-w-md mx-auto my-12 space-y-4">
            <div className="w-16 h-16 rounded-full bg-cream-200 flex items-center justify-center mx-auto text-herbal-700">
              <User className="w-8 h-8" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-herbal-950">
              Sign In to View Cart
            </h2>
            <p className="text-xs sm:text-sm text-herbal-800 leading-relaxed">
              Your herbal shopping cart is safely saved to your personal account. Sign in to review your items and continue to checkout.
            </p>
            <div className="pt-3 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/login?redirect=/cart"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-herbal-800 text-cream-100 text-xs font-semibold hover:bg-herbal-900 transition-colors shadow-md"
              >
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4 text-gold-400" />
              </Link>
              <Link
                href="/register?redirect=/cart"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border border-cream-300 text-herbal-900 text-xs font-semibold hover:bg-cream-100 transition-colors"
              >
                Create Account
              </Link>
            </div>
          </div>
        ) : cart ? (
          <CartView initialCart={cart} />
        ) : (
          <div className="p-8 text-center text-xs text-herbal-700">
            Unable to load your cart. Please refresh the page.
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
