import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/storefront/Navbar';
import Footer from '@/components/storefront/Footer';
import AddressManager from '@/components/storefront/AddressManager';
import { getUserAddresses } from '@/lib/actions/address';
import { requireCustomer } from '@/lib/auth/session';
import prisma from '@/lib/db';
import { ArrowLeft, MapPin } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Delivery Addresses | Mana Grameena',
  description: 'Manage your saved delivery addresses for seamless checkout.',
};

export default async function CustomerAddressesPage() {
  const authUser = await requireCustomer();
  const [addresses, cartCount, wishlistCount] = await Promise.all([
    getUserAddresses(),
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
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-herbal-950">
              Delivery Addresses
            </h1>
            <p className="text-xs text-herbal-700">
              Manage your saved shipping and billing locations
            </p>
          </div>
        </div>

        <AddressManager initialAddresses={addresses} />
      </main>

      <Footer />
    </div>
  );
}
