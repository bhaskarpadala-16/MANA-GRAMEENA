import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShoppingBag } from 'lucide-react';

export const metadata = {
  title: 'Your Cart | Mana Grameena',
};

export default function CartPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-herbal-800 hover:text-terracotta-600 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Continue Shopping
      </Link>
      <div className="flex items-center gap-3 mb-6">
        <ShoppingBag className="w-8 h-8 text-herbal-800" />
        <h1 className="font-serif text-3xl font-bold text-herbal-950">Shopping Cart</h1>
      </div>
      <div className="p-8 rounded-3xl bg-white border border-cream-300 text-center text-sm text-herbal-700">
        Cart calculations and database-persisted cart items activate in Phase 5.
      </div>
    </div>
  );
}
