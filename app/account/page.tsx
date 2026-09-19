import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/storefront/Navbar';
import Footer from '@/components/storefront/Footer';
import {
  User,
  MapPin,
  Package,
  Heart,
  Bell,
  LogOut,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { requireCustomer } from '@/lib/auth/session';
import { signOutAction } from '@/lib/auth/actions';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Customer Account | Mana Grameena',
  description: 'Manage your profile, orders, addresses, and wishlist.',
};

export default async function AccountPage() {
  const user = await requireCustomer();

  const [cartCount, wishlistCount, ordersCount, unreadNotificationsCount] =
    await Promise.all([
      prisma.cartItem.count({ where: { cart: { userId: user.id } } }),
      prisma.wishlistItem.count({ where: { wishlist: { userId: user.id } } }),
      prisma.order.count({ where: { userId: user.id } }),
      prisma.notification.count({ where: { userId: user.id, isRead: false } }),
    ]);

  const navCards = [
    {
      href: '/account/profile',
      title: 'Profile Settings',
      description: 'Personal details and contact information',
      badge: null,
      icon: User,
    },
    {
      href: '/account/orders',
      title: 'My Orders',
      description: 'Track orders, status, and download invoices',
      badge: `${ordersCount} orders`,
      icon: Package,
    },
    {
      href: '/account/addresses',
      title: 'Delivery Addresses',
      description: 'Saved shipping and billing destinations',
      badge: null,
      icon: MapPin,
    },
    {
      href: '/account/wishlist',
      title: 'My Wishlist',
      description: 'Saved herbal & wellness favorites',
      badge: `${wishlistCount} saved`,
      icon: Heart,
    },
    {
      href: '/account/notifications',
      title: 'Notifications',
      description: 'Store updates, restock alerts, and order notices',
      badge: unreadNotificationsCount > 0 ? `${unreadNotificationsCount} unread` : null,
      icon: Bell,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar
        cartCount={cartCount}
        wishlistCount={wishlistCount}
        user={{ firstName: user.firstName, role: user.role }}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* User Hero Header */}
        <div className="p-8 rounded-3xl bg-white border border-cream-300 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-herbal-800 text-gold-400 flex items-center justify-center font-serif text-2xl font-bold shadow-md">
              {user.firstName ? user.firstName.charAt(0).toUpperCase() : 'M'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-herbal-950">
                  {user.firstName} {user.lastName}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-herbal-100 text-herbal-800 border border-herbal-200 uppercase tracking-wider">
                  <Shield className="w-3 h-3" />
                  {user.role}
                </span>
              </div>
              <p className="text-xs text-herbal-700 mt-1">{user.email}</p>
            </div>
          </div>

          <form action={signOutAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cream-100 hover:bg-cream-200 text-xs font-semibold text-herbal-900 border border-cream-300 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-terracotta-600" />
              <span>Sign Out</span>
            </button>
          </form>
        </div>

        {/* Sub-routes Navigation Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {navCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group p-6 rounded-3xl bg-white border border-cream-300 hover:border-herbal-600 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-cream-100 text-herbal-800 flex items-center justify-center group-hover:bg-herbal-800 group-hover:text-gold-400 transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    {card.badge && (
                      <span className="px-2.5 py-0.5 rounded-full bg-cream-200 text-herbal-800 text-[10px] font-semibold">
                        {card.badge}
                      </span>
                    )}
                  </div>
                  <div>
                    <h2 className="font-serif text-lg font-bold text-herbal-950 group-hover:text-herbal-800 transition-colors">
                      {card.title}
                    </h2>
                    <p className="text-xs text-herbal-700 mt-1 leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-cream-200 flex items-center justify-between text-xs font-semibold text-herbal-800 group-hover:text-terracotta-600 transition-colors">
                  <span>Open Section</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}
