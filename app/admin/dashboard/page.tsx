import React from 'react';
import Link from 'next/link';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';

export const metadata = {
  title: 'Admin Dashboard | Mana Grameena',
};

export default function AdminDashboardPage() {
  return (
    <div className="min-h-screen bg-cream-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-xs text-herbal-800 hover:text-terracotta-600">
          <ArrowLeft className="w-4 h-4" />
          Storefront
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-herbal-800 text-gold-400">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-bold text-herbal-950">Store Administration</h1>
            <p className="text-xs text-herbal-700">Live PostgreSQL database metrics & management</p>
          </div>
        </div>

        <div className="p-8 rounded-3xl bg-white border border-cream-300 text-center text-sm text-herbal-800">
          Admin metrics, inventory management, and UPI payment verification portals will connect to live Supabase data in Phase 8.
        </div>
      </div>
    </div>
  );
}
