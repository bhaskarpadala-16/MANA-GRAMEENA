import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone, MapPin } from 'lucide-react';

export const metadata = {
  title: 'Contact Us | Mana Grameena',
  description: 'Get in touch with the Mana Grameena herbal care team.',
};

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-herbal-800 hover:text-terracotta-600 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>
      <h1 className="font-serif text-3xl sm:text-4xl font-bold text-herbal-950 mb-4">
        Contact Our Herbal Team
      </h1>
      <p className="text-herbal-800 text-sm max-w-xl mb-8">
        Have questions regarding our homemade herbal formulations or need assistance with your order? Reach out directly.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-cream-300 space-y-2 text-center">
          <Mail className="w-6 h-6 text-herbal-800 mx-auto" />
          <h3 className="font-semibold text-herbal-950 text-sm">Email Support</h3>
          <p className="text-xs text-herbal-700">support@managrameena.com</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-cream-300 space-y-2 text-center">
          <Phone className="w-6 h-6 text-herbal-800 mx-auto" />
          <h3 className="font-semibold text-herbal-950 text-sm">Customer Care</h3>
          <p className="text-xs text-herbal-700">+91 98765 43210</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-cream-300 space-y-2 text-center">
          <MapPin className="w-6 h-6 text-herbal-800 mx-auto" />
          <h3 className="font-semibold text-herbal-950 text-sm">Apothecary Origin</h3>
          <p className="text-xs text-herbal-700">Rural Andhra Pradesh, India</p>
        </div>
      </div>
    </div>
  );
}
