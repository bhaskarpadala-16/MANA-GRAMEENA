import React from 'react';
import Navbar from '@/components/storefront/Navbar';
import Footer from '@/components/storefront/Footer';
import { getCurrentUser } from '@/lib/auth/session';
import prisma from '@/lib/db';

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user: { firstName: string; role: string } | null = null;
  let cartCount = 0;
  let wishlistCount = 0;

  try {
    const authUser = await getCurrentUser();
    if (authUser) {
      user = {
        firstName: authUser.firstName,
        role: authUser.role,
      };

      const [cCount, wCount] = await Promise.all([
        prisma.cartItem.count({
          where: { cart: { userId: authUser.id } },
        }),
        prisma.wishlistItem.count({
          where: { wishlist: { userId: authUser.id } },
        }),
      ]);

      cartCount = cCount;
      wishlistCount = wCount;
    }
  } catch {
    // Graceful fallback if database or session is momentarily unavailable
    user = null;
    cartCount = 0;
    wishlistCount = 0;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar cartCount={cartCount} wishlistCount={wishlistCount} user={user} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
