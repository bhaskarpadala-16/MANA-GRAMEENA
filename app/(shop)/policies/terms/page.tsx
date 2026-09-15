import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service | Mana Grameena',
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-herbal-800 hover:text-terracotta-600 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>
      <h1 className="font-serif text-3xl font-bold text-herbal-950 mb-6">Terms of Service</h1>
      <div className="prose prose-sm text-herbal-900 space-y-4">
        <p>Welcome to Mana Grameena. By browsing and purchasing from this website, you agree to comply with and be bound by the following terms.</p>
        <h2 className="font-semibold text-base mt-4">1. Product Usage & Herbal Disclaimers</h2>
        <p>Our formulations are homemade traditional herbal wellness essentials. They are not intended to diagnose, treat, cure, or prevent any specific disease. Always perform a patch test before first use.</p>
        <h2 className="font-semibold text-base mt-4">2. Payment & Manual UPI Verification</h2>
        <p>Orders placed via Manual UPI remain in an under-review status until an authorized administrator verifies the submitted transaction reference ID and proof screenshot.</p>
      </div>
    </div>
  );
}
