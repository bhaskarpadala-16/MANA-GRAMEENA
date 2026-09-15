import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | Mana Grameena',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-herbal-800 hover:text-terracotta-600 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>
      <h1 className="font-serif text-3xl font-bold text-herbal-950 mb-6">Privacy Policy</h1>
      <div className="prose prose-sm text-herbal-900 space-y-4">
        <p>At Mana Grameena, we respect and prioritize your privacy. This policy explains how we collect, store, and protect your personal information.</p>
        <h2 className="font-semibold text-base mt-4">1. Data Collected</h2>
        <p>We collect essential order details including your name, shipping address, phone number, and email strictly to fulfill orders and provide order tracking.</p>
        <h2 className="font-semibold text-base mt-4">2. Payment Verification Security</h2>
        <p>Payment screenshots uploaded for Manual UPI verification are stored in isolated, private storage buckets accessible only by you and authorized administrators.</p>
        <h2 className="font-semibold text-base mt-4">3. No Third-Party Data Selling</h2>
        <p>We do not sell, rent, or trade your personal information to any third parties.</p>
      </div>
    </div>
  );
}
