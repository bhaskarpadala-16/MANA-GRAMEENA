import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Leaf, Award, Users } from 'lucide-react';

export const metadata = {
  title: 'Our Heritage | Mana Grameena',
  description: 'The story and philosophy of Mana Grameena herbal heritage.',
};

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-herbal-800 hover:text-terracotta-600 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-herbal-100 text-herbal-800 text-xs font-semibold">
          <Leaf className="w-3.5 h-3.5 text-gold-600" />
          <span>Village Origins</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl font-bold text-herbal-950">
          Rooted in Rural Reverence
        </h1>
        <p className="text-base sm:text-lg text-herbal-800 leading-relaxed">
          Mana Grameena was born from a timeless truth: nature has already perfected wellness. Our mission is to restore the authentic village apothecary traditions of Southern India, bringing pure, unadulterated herbal formulations directly from local farms to your home.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          <div className="p-6 rounded-2xl bg-white border border-cream-300 space-y-2">
            <Award className="w-6 h-6 text-terracotta-600" />
            <h3 className="font-serif font-bold text-lg text-herbal-950">Small Batch Reverence</h3>
            <p className="text-xs text-herbal-700 leading-relaxed">
              Every formulation is prepared in copper and iron vessels following exact solar and lunar decoction cycles.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-cream-300 space-y-2">
            <Users className="w-6 h-6 text-herbal-800" />
            <h3 className="font-serif font-bold text-lg text-herbal-950">Fair Farmer Collectives</h3>
            <p className="text-xs text-herbal-700 leading-relaxed">
              We eliminate middlemen, paying ethical premium prices directly to village farmers cultivating rare indigenous botanicals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
