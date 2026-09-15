import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Shipping Policy | Mana Grameena',
};

export default function ShippingPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-herbal-800 hover:text-terracotta-600 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>
      <h1 className="font-serif text-3xl font-bold text-herbal-950 mb-6">Shipping & Delivery Policy</h1>
      <div className="prose prose-sm text-herbal-900 space-y-4">
        <p>Because all formulations are handmade in small fresh batches, please review our delivery timelines:</p>
        <h2 className="font-semibold text-base mt-4">1. Dispatch & Processing</h2>
        <p>Orders are dispatched within 24–48 hours of confirmed payment or Cash on Delivery order verification.</p>
        <h2 className="font-semibold text-base mt-4">2. Delivery Timeframes</h2>
        <p>Standard delivery takes 3 to 7 business days depending on location across India. You will receive tracking updates in your account.</p>
      </div>
    </div>
  );
}
