import React from 'react';
import Link from 'next/link';
import { ArrowLeft, CreditCard } from 'lucide-react';

export const metadata = {
  title: 'Secure Checkout | Mana Grameena',
};

export default function CheckoutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <Link href="/cart" className="inline-flex items-center gap-2 text-sm text-herbal-800 hover:text-terracotta-600 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Cart
      </Link>
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="w-8 h-8 text-herbal-800" />
        <h1 className="font-serif text-3xl font-bold text-herbal-950">Checkout</h1>
      </div>
      <div className="p-8 rounded-3xl bg-white border border-cream-300 text-center text-sm text-herbal-700">
        Checkout with Cash on Delivery and Manual UPI QR workflow activates in Phase 5 & 7.
      </div>
    </div>
  );
}
