import React from 'react';
import Link from 'next/link';
import { Leaf, ShieldCheck, HeartHandshake, Truck, Phone, Mail, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-herbal-950 text-cream-200 border-t border-herbal-900 mt-auto">
      {/* Value Badges Banner */}
      <div className="border-b border-herbal-900/60 bg-herbal-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-herbal-800/80 flex items-center justify-center text-gold-400 shrink-0 shadow-inner">
                <Leaf className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-serif font-semibold text-cream-100 text-sm">100% Pure & Herbal</h4>
                <p className="text-xs text-cream-400 mt-0.5">Sourced from wild rural harvests</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-herbal-800/80 flex items-center justify-center text-gold-400 shrink-0 shadow-inner">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-serif font-semibold text-cream-100 text-sm">Empowering Artisans</h4>
                <p className="text-xs text-cream-400 mt-0.5">Fair trade with village farmers</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-herbal-800/80 flex items-center justify-center text-gold-400 shrink-0 shadow-inner">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-serif font-semibold text-cream-100 text-sm">Traditional Formulations</h4>
                <p className="text-xs text-cream-400 mt-0.5">Zero parabens, chemicals, or mineral oils</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-herbal-800/80 flex items-center justify-center text-gold-400 shrink-0 shadow-inner">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-serif font-semibold text-cream-100 text-sm">Safe & Fresh Delivery</h4>
                <p className="text-xs text-cream-400 mt-0.5">Dispatched directly from source</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Story */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-herbal-800 flex items-center justify-center text-cream-100 shadow-md">
                <Leaf className="w-5 h-5 text-gold-400" />
              </div>
              <div>
                <span className="font-serif text-2xl font-bold tracking-tight text-cream-100 block leading-none">
                  Mana Grameena
                </span>
                <span className="text-[10px] tracking-widest text-gold-400 uppercase font-semibold block mt-1">
                  Rural Herbal Heritage
                </span>
              </div>
            </Link>
            <p className="text-sm text-cream-300 leading-relaxed max-w-sm">
              Devoted to preserving time-tested herbal wisdom. Every oil is cold-pressed, every powder is ground from whole indigenous herbs, and every jar is crafted with love and ancestral care.
            </p>
            <div className="text-xs text-cream-400 space-y-1.5 pt-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gold-400 shrink-0" />
                <span>Mana Grameena Herbals, Andhra Pradesh & Telangana, India</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gold-400 shrink-0" />
                <span>Customer Care: +91 98765 43210</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gold-400 shrink-0" />
                <span>care@managrameena.com</span>
              </div>
            </div>
          </div>

          {/* Catalog Links */}
          <div className="space-y-3">
            <h4 className="font-serif font-semibold text-cream-100 text-sm uppercase tracking-wider">Catalogue</h4>
            <ul className="space-y-2 text-sm text-cream-300">
              <li>
                <Link href="/products" className="hover:text-gold-400 transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/categories/cold-pressed-oils" className="hover:text-gold-400 transition-colors">
                  Cold-Pressed Oils
                </Link>
              </li>
              <li>
                <Link href="/categories/herbal-powders" className="hover:text-gold-400 transition-colors">
                  Herbal Powders
                </Link>
              </li>
              <li>
                <Link href="/categories/honey-preserves" className="hover:text-gold-400 transition-colors">
                  Honey & Preserves
                </Link>
              </li>
              <li>
                <Link href="/categories/personal-care" className="hover:text-gold-400 transition-colors">
                  Personal Care
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-serif font-semibold text-cream-100 text-sm uppercase tracking-wider">Account & Help</h4>
            <ul className="space-y-2 text-sm text-cream-300">
              <li>
                <Link href="/account" className="hover:text-gold-400 transition-colors">
                  My Profile
                </Link>
              </li>
              <li>
                <Link href="/account/orders" className="hover:text-gold-400 transition-colors">
                  Order History
                </Link>
              </li>
              <li>
                <Link href="/account/wishlist" className="hover:text-gold-400 transition-colors">
                  My Wishlist
                </Link>
              </li>
              <li>
                <Link href="/cart" className="hover:text-gold-400 transition-colors">
                  Shopping Cart
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-gold-400 transition-colors">
                  Help & Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Policies & Governance */}
          <div className="space-y-3">
            <h4 className="font-serif font-semibold text-cream-100 text-sm uppercase tracking-wider">Trust & Policies</h4>
            <ul className="space-y-2 text-sm text-cream-300">
              <li>
                <Link href="/policies/privacy" className="hover:text-gold-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/policies/terms" className="hover:text-gold-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/policies/shipping" className="hover:text-gold-400 transition-colors">
                  Shipping Policy
                </Link>
              </li>
              <li>
                <Link href="/policies/returns" className="hover:text-gold-400 transition-colors">
                  Returns & Refunds
                </Link>
              </li>
              <li>
                <span className="inline-block mt-2 px-2.5 py-1 rounded bg-herbal-900 border border-herbal-800 text-[11px] text-cream-300">
                  Cash on Delivery & UPI Supported
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-herbal-900/80 flex flex-col sm:flex-row items-center justify-between text-xs text-cream-400 gap-4">
          <p>© {new Date().getFullYear()} Mana Grameena Herbals. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Traditional Indian Wellness Heritage</span>
            <span>•</span>
            <span>Small-Batch Village Craft</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
