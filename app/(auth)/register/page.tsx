import React from 'react';
import Link from 'next/link';
import { Leaf } from 'lucide-react';

export const metadata = {
  title: 'Register Account | Mana Grameena',
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-cream-50">
      <div className="max-w-md w-full space-y-8 p-8 rounded-3xl bg-white border border-cream-300 shadow-xl">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-herbal-800 text-gold-400 flex items-center justify-center mx-auto mb-3">
            <Leaf className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-3xl font-bold text-herbal-950">Create Account</h2>
          <p className="text-xs text-herbal-700 mt-1">Join the Mana Grameena wellness family</p>
        </div>

        <div className="p-4 rounded-xl bg-cream-100 text-xs text-herbal-800 text-center border border-cream-200">
          Supabase Auth registration and profile creation connect in Phase 3.
        </div>

        <div className="text-center text-xs text-herbal-800">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-terracotta-600 hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
