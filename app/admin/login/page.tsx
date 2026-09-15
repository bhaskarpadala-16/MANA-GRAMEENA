import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Administrative Access | Mana Grameena',
};

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-herbal-950 text-cream-100">
      <div className="max-w-md w-full space-y-8 p-8 rounded-3xl bg-herbal-900 border border-herbal-800 shadow-2xl">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-herbal-800 text-gold-400 flex items-center justify-center mx-auto mb-3 border border-gold-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-cream-50">Mana Grameena Admin</h2>
          <p className="text-xs text-cream-400 mt-1">Authorized store personnel only</p>
        </div>

        <div className="p-4 rounded-xl bg-herbal-950/60 border border-herbal-800 text-xs text-cream-300 text-center leading-relaxed">
          Admin sessions are validated server-side via Supabase Auth and PostgreSQL role checks in Phase 3.
        </div>

        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-xs text-cream-400 hover:text-cream-100 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to Public Store
          </Link>
        </div>
      </div>
    </div>
  );
}
