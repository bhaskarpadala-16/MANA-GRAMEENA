import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Categories | Mana Grameena',
  description: 'Explore herbal products by wellness category.',
};

export default function CategoriesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-herbal-800 hover:text-terracotta-600 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>
      <h1 className="font-serif text-3xl sm:text-4xl font-bold text-herbal-950 mb-4">
        Herbal Categories
      </h1>
      <p className="text-herbal-800 max-w-2xl text-sm leading-relaxed mb-8">
        Traditional categories spanning Hair Care, Skin Rejuvenation, Bath Powders, and Dietary Wellness.
      </p>
      <div className="p-8 rounded-2xl bg-white border border-cream-300 text-center text-herbal-700 text-sm">
        Category taxonomy active in Prisma schema. Database querying connects in Phase 4.
      </div>
    </div>
  );
}
