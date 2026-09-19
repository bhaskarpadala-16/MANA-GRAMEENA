import React from 'react';
import Link from 'next/link';
import { getActiveCategories } from '@/lib/db/products';
import { Leaf, ArrowRight, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Herbal Categories | Mana Grameena',
  description:
    'Browse handcrafted cold-pressed oils, pure botanical powders, raw forest honeys, and natural care formulations.',
};

export default async function CategoriesPage() {
  const categories = await getActiveCategories();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cream-200 text-terracotta-700 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-gold-600" />
          <span>Ancestral Classifications</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-herbal-950">
          Herbal Wellness Categories
        </h1>
        <p className="text-herbal-800 text-sm sm:text-base max-w-2xl leading-relaxed">
          Each category represents a timeless tradition of holistic village wellness — from wood-pressed nutrient-rich oils to wild forest harvests.
        </p>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/categories/${cat.slug}`}
            className="group relative flex flex-col justify-between bg-white rounded-3xl p-8 border border-cream-300 hover:border-herbal-500/60 hover:shadow-xl transition-all duration-300 overflow-hidden"
          >
            {/* Subtle background decoration */}
            <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-herbal-50 rounded-full group-hover:scale-125 transition-transform duration-500 ease-out -z-0" />

            <div className="relative z-10 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-herbal-100 flex items-center justify-center text-herbal-800 group-hover:bg-herbal-800 group-hover:text-cream-100 transition-colors">
                <Leaf className="w-6 h-6" />
              </div>

              <div>
                <h3 className="font-serif text-2xl font-bold text-herbal-950 group-hover:text-herbal-800 transition-colors">
                  {cat.name}
                </h3>
                <span className="inline-block mt-1 text-xs font-semibold text-terracotta-600">
                  {cat._count.products} Formulations Available
                </span>
              </div>

              <p className="text-xs sm:text-sm text-herbal-800/80 leading-relaxed">
                {cat.description ||
                  'Traditional herbal preparations crafted according to ancient rural methods.'}
              </p>
            </div>

            <div className="relative z-10 pt-6 mt-4 border-t border-cream-200 flex items-center justify-between text-xs font-semibold text-herbal-900 group-hover:text-herbal-700">
              <span>Explore Collection</span>
              <div className="w-8 h-8 rounded-full bg-cream-100 flex items-center justify-center group-hover:bg-herbal-800 group-hover:text-cream-100 transition-all group-hover:translate-x-1">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
