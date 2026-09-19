import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/storefront/Navbar';
import Footer from '@/components/storefront/Footer';
import ProfileEditor from '@/components/storefront/ProfileEditor';
import { getCustomerProfile } from '@/lib/actions/profile';
import { requireCustomer } from '@/lib/auth/session';
import prisma from '@/lib/db';
import { ArrowLeft, User } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Profile Settings | Mana Grameena',
  description: 'Manage your authenticated customer account profile.',
};

export default async function CustomerProfilePage() {
  const authUser = await requireCustomer();
  const [profile, cartCount, wishlistCount] = await Promise.all([
    getCustomerProfile(),
    prisma.cartItem.count({ where: { cart: { userId: authUser.id } } }),
    prisma.wishlistItem.count({ where: { wishlist: { userId: authUser.id } } }),
  ]);

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
            <User className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-herbal-950">
              Profile Settings
            </h1>
            <p className="text-xs text-herbal-700">
              Personal customer identity and contact preferences
            </p>
          </div>
        </div>

        <ProfileEditor initialProfile={profile} />
      </main>

      <Footer />
    </div>
  );
}
