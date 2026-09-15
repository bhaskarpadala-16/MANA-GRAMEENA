import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Herbal Catalogue | Mana Grameena',
  description: 'Browse authentic homemade herbal products and wellness formulations.',
};

export default function ProductsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-herbal-800 hover:text-terracotta-600 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>
      <h1 className="font-serif text-3xl sm:text-4xl font-bold text-herbal-950 mb-4">
        Herbal Product Catalogue
      </h1>
      <p className="text-herbal-800 max-w-2xl text-sm leading-relaxed mb-8">
        Our complete range of homemade herbal oils, natural face pastes, and traditional wellness formulations. Real database integration scheduled for Phase 4.
      </p>
      <div className="p-8 rounded-2xl bg-white border border-cream-300 text-center text-herbal-700 text-sm">
        Catalogue active. Awaiting database connection and seeding in Phase 2 & 4.
      </div>
    </div>
  );
}
