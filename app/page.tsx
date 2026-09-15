import React from 'react';
import Link from 'next/link';
import HerbalHeroCanvas from '@/components/3d/HerbalHeroCanvas';
import {
  Sparkles,
  ShieldCheck,
  Leaf,
  HeartHandshake,
  ShoppingBag,
  User,
  ArrowRight,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Banner */}
      <div className="bg-herbal-900 text-cream-100 text-xs py-2 px-4 text-center font-medium tracking-wide">
        Handmade in small batches • 100% chemical-free herbal wellness essentials • Free delivery across India on orders above ₹999
      </div>

      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 bg-cream-100/90 backdrop-blur-md border-b border-cream-300 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-herbal-800 flex items-center justify-center text-cream-100 shadow-md group-hover:bg-herbal-700 transition-colors">
              <Leaf className="w-5 h-5 text-gold-400" />
            </div>
            <div>
              <span className="font-serif text-2xl font-bold tracking-tight text-herbal-950 block leading-none">
                Mana Grameena
              </span>
              <span className="text-[10px] tracking-widest text-terracotta-600 uppercase font-semibold block mt-1">
                Rural Herbal Heritage
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-herbal-900">
            <Link href="/products" className="hover:text-terracotta-600 transition-colors">
              Products
            </Link>
            <Link href="/categories" className="hover:text-terracotta-600 transition-colors">
              Categories
            </Link>
            <Link href="/about" className="hover:text-terracotta-600 transition-colors">
              Our Heritage
            </Link>
            <Link href="/contact" className="hover:text-terracotta-600 transition-colors">
              Contact
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/account"
              className="p-2.5 rounded-full text-herbal-900 hover:bg-cream-200 transition-colors"
              title="Customer Account"
            >
              <User className="w-5 h-5" />
            </Link>
            <Link
              href="/cart"
              className="p-2.5 rounded-full text-herbal-900 hover:bg-cream-200 transition-colors relative"
              title="Shopping Cart"
            >
              <ShoppingBag className="w-5 h-5" />
            </Link>
            <Link
              href="/admin/login"
              className="hidden sm:inline-flex text-xs font-semibold px-3 py-1.5 rounded-md border border-herbal-800 text-herbal-900 hover:bg-herbal-800 hover:text-cream-100 transition-colors"
            >
              Admin Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section with 3D Canvas */}
      <section className="relative overflow-hidden bg-gradient-to-b from-cream-100 via-cream-50 to-cream-200 py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Hero Text */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-herbal-100 border border-herbal-300 text-herbal-800 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-gold-600" />
                <span>Authentic Traditional Formulations</span>
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-herbal-950 leading-[1.15]">
                Pure Rural Wisdom, Crafted with Devotion.
              </h1>

              <p className="text-base sm:text-lg text-herbal-800/90 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Handmade herbal hair oils, rejuvenating botanical skin pastes, and wellness powders sourced from ancestral village roots. Free from mineral oils, chemicals, and artificial fragrances.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  href="/products"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-herbal-900 text-cream-100 font-semibold shadow-lg hover:bg-herbal-800 transition-all hover:shadow-xl hover:-translate-y-0.5"
                >
                  <span>Explore Herbal Catalogue</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/about"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-herbal-700 text-herbal-950 font-semibold hover:bg-cream-200 transition-colors"
                >
                  <span>Our Craft & Roots</span>
                </Link>
              </div>
            </div>

            {/* 3D Herbal Botanical Canvas */}
            <div className="lg:col-span-5 relative">
              <div className="w-full max-w-md mx-auto aspect-square rounded-3xl bg-gradient-to-tr from-cream-300/60 to-herbal-100/40 p-4 border border-cream-300 shadow-inner flex flex-col justify-center items-center">
                <HerbalHeroCanvas />
                <span className="text-[11px] uppercase tracking-widest text-herbal-700 font-medium pb-2">
                  Interactive Botanical Element
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quality Standards Section */}
      <section className="py-12 bg-white border-y border-cream-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-cream-50 border border-cream-200">
              <div className="p-3 rounded-xl bg-herbal-100 text-herbal-800 shrink-0">
                <Leaf className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-herbal-950 text-sm">100% Homemade</h3>
                <p className="text-xs text-herbal-700 mt-1">
                  Crafted by rural artisans using age-old ancestral techniques.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl bg-cream-50 border border-cream-200">
              <div className="p-3 rounded-xl bg-herbal-100 text-herbal-800 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-herbal-950 text-sm">Zero Preservatives</h3>
                <p className="text-xs text-herbal-700 mt-1">
                  No artificial preservatives, mineral oils, or synthetic colors.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl bg-cream-50 border border-cream-200">
              <div className="p-3 rounded-xl bg-herbal-100 text-herbal-800 shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-herbal-950 text-sm">Cold-Pressed Oils</h3>
                <p className="text-xs text-herbal-700 mt-1">
                  Traditional wooden press extraction preserves vital nutrients.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl bg-cream-50 border border-cream-200">
              <div className="p-3 rounded-xl bg-herbal-100 text-herbal-800 shrink-0">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-herbal-950 text-sm">Empowering Villages</h3>
                <p className="text-xs text-herbal-700 mt-1">
                  Every order directly supports rural women farming collectives.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-herbal-950 text-cream-200 border-t border-herbal-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2 space-y-4">
              <span className="font-serif text-2xl font-bold text-cream-50">
                Mana Grameena
              </span>
              <p className="text-sm text-cream-300 max-w-sm leading-relaxed">
                Reviving holistic village remedies with integrity, pure botanical craftsmanship, and radical honesty.
              </p>
              <div className="pt-2">
                <span className="text-xs text-gold-400 font-medium">
                  Verified Production-Grade E-Commerce Platform
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-cream-100 mb-3">
                Quick Navigation
              </h4>
              <ul className="space-y-2 text-sm text-cream-300">
                <li><Link href="/products" className="hover:text-cream-50 transition-colors">All Products</Link></li>
                <li><Link href="/categories" className="hover:text-cream-50 transition-colors">Categories</Link></li>
                <li><Link href="/about" className="hover:text-cream-50 transition-colors">About Brand</Link></li>
                <li><Link href="/contact" className="hover:text-cream-50 transition-colors">Contact Us</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-cream-100 mb-3">
                Store Policies
              </h4>
              <ul className="space-y-2 text-sm text-cream-300">
                <li><Link href="/policies/privacy" className="hover:text-cream-50 transition-colors">Privacy Policy</Link></li>
                <li><Link href="/policies/terms" className="hover:text-cream-50 transition-colors">Terms of Service</Link></li>
                <li><Link href="/policies/shipping" className="hover:text-cream-50 transition-colors">Shipping Policy</Link></li>
                <li><Link href="/policies/returns" className="hover:text-cream-50 transition-colors">Return & Refund Policy</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-herbal-900 text-xs text-center text-cream-400">
            © {new Date().getFullYear()} Mana Grameena. All rights reserved. Handcrafted with traditional reverence.
          </div>
        </div>
      </footer>
    </div>
  );
}
