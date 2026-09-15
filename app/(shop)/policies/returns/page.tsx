import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Return & Refund Policy | Mana Grameena',
};

export default function ReturnsPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-herbal-800 hover:text-terracotta-600 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>
      <h1 className="font-serif text-3xl font-bold text-herbal-950 mb-6">Returns & Refunds Policy</h1>
      <div className="prose prose-sm text-herbal-900 space-y-4">
        <p>Because our products are perishable homemade herbal cosmetics and wellness items, hygiene is paramount.</p>
        <h2 className="font-semibold text-base mt-4">1. Damaged or Incorrect Deliveries</h2>
        <p>If you receive a damaged package or incorrect item, notify us within 48 hours of delivery with photographic evidence to initiate a free replacement or full refund.</p>
        <h2 className="font-semibold text-base mt-4">2. Opened Products</h2>
        <p>For safety and hygiene reasons, products with broken seals cannot be returned once opened.</p>
      </div>
    </div>
  );
}
