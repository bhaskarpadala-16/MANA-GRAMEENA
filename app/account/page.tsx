import React from 'react';
import Link from 'next/link';
import { ArrowLeft, User } from 'lucide-react';

export const metadata = {
  title: 'My Account | Mana Grameena',
};

export default function AccountPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-herbal-800 hover:text-terracotta-600 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Store
      </Link>
      <div className="flex items-center gap-3 mb-6">
        <User className="w-8 h-8 text-herbal-800" />
        <h1 className="font-serif text-3xl font-bold text-herbal-950">Customer Account</h1>
      </div>
      <div className="p-8 rounded-3xl bg-white border border-cream-300 text-center text-sm text-herbal-700">
        Order history, profile, and address management activate in Phase 3 & 6.
      </div>
    </div>
  );
}
