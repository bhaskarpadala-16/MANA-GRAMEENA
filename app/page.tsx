import React from 'react';
import Link from 'next/link';
import HerbalHeroClient from '@/components/3d/HerbalHeroClient';
import Navbar from '@/components/storefront/Navbar';
import Footer from '@/components/storefront/Footer';
import ProductCard from '@/components/storefront/ProductCard';
import { getPublishedProducts, getActiveCategories } from '@/lib/db/products';
import { getCurrentUser } from '@/lib/auth/session';
import prisma from '@/lib/db';
import {
  Sparkles,
  ShieldCheck,
  Leaf,
  HeartHandshake,
  ArrowRight,
  Truck,
} from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  let user: { firstName: string; role: string } | null = null;
  let cartCount = 0;
  let wishlistCount = 0;

  try {
    const authUser = await getCurrentUser();
    if (authUser) {
      user = {
        firstName: authUser.firstName,
        role: authUser.role,
      };
      const [cCount, wCount] = await Promise.all([
        prisma.cartItem.count({ where: { cart: { userId: authUser.id } } }),
        prisma.wishlistItem.count({ where: { wishlist: { userId: authUser.id } } }),
      ]);
      cartCount = cCount;
      wishlistCount = wCount;
    }
  } catch {
    // Graceful fallback
  }

  const [{ products: featuredProducts }, categories] = await Promise.all([
    getPublishedProducts({ limit: 4, sort: 'featured' }),
    getActiveCategories(),
  ]);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar cartCount={cartCount} wishlistCount={wishlistCount} user={user} />

      {/* Hero Section with 3D Canvas */}
      <section className="relative overflow-hidden bg-gradient-to-b from-cream-100 via-cream-50 to-cream-200 py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Hero Text */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-herbal-100 border border-herbal-300 text-herbal-800 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-gold-600" />
                <span>Ancestral Homemade Formulations</span>
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-herbal-950 leading-[1.15]">
                Pure Rural Wisdom, Crafted with Devotion.
              </h1>

              <p className="text-base sm:text-lg text-herbal-800/90 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Handmade wood-pressed oils, single-origin forest honeys, and ancestral wellness powders sourced directly from village roots. Free from mineral oils, chemicals, and artificial fragrances.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  href="/products"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-herbal-800 text-cream-100 font-semibold shadow-lg hover:bg-herbal-900 transition-all hover:shadow-xl hover:-translate-y-0.5 text-sm"
                >
                  <span>Explore Herbal Catalogue</span>
                  <ArrowRight className="w-4 h-4 text-gold-400" />
                </Link>
                <Link
                  href="/categories"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-herbal-700 text-herbal-950 font-semibold hover:bg-cream-200 transition-colors text-sm"
                >
                  <span>Browse Categories</span>
                </Link>
              </div>
            </div>

            {/* 3D Herbal Botanical Canvas */}
            <div className="lg:col-span-5 relative">
              <div className="w-full max-w-md mx-auto aspect-square rounded-3xl bg-gradient-to-tr from-cream-300/60 to-herbal-100/40 p-4 border border-cream-300 shadow-inner flex flex-col justify-center items-center">
                <HerbalHeroClient />
                <span className="text-[11px] uppercase tracking-widest text-herbal-700 font-medium pb-2">
                  Interactive Botanical Element
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Heritage Categories Spotlight */}
      <section className="py-16 bg-cream-50 border-y border-cream-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-terracotta-600">
                Ancestral Classifications
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-herbal-950">
                Shop by Wellness Category
              </h2>
            </div>
            <Link
              href="/categories"
              className="text-xs font-semibold text-herbal-900 hover:text-terracotta-600 inline-flex items-center gap-1"
            >
              <span>View All Categories</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="group relative flex flex-col justify-between bg-white rounded-2xl p-6 border border-cream-300 hover:border-herbal-600 hover:shadow-lg transition-all duration-300"
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-herbal-100 flex items-center justify-center text-herbal-800 group-hover:bg-herbal-800 group-hover:text-cream-100 transition-colors">
                    <Leaf className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-herbal-950 group-hover:text-herbal-800 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-herbal-800/80 line-clamp-2 leading-relaxed">
                    {cat.description}
                  </p>
                </div>
                <div className="pt-4 mt-2 border-t border-cream-200 flex items-center justify-between text-xs font-semibold text-terracotta-600">
                  <span>{cat._count.products} Formulations</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Herbal Formulations */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-terracotta-600">
                Fresh From Small Batches
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-herbal-950">
                Featured Rural Creations
              </h2>
            </div>
            <Link
              href="/products"
              className="text-xs font-semibold text-herbal-900 hover:text-terracotta-600 inline-flex items-center gap-1"
            >
              <span>View Full Catalogue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* Rural Heritage & Standards */}
      <section className="py-16 bg-cream-50 border-t border-cream-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-cream-300 shadow-sm">
              <div className="p-3 rounded-xl bg-herbal-100 text-herbal-800 shrink-0">
                <Leaf className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-herbal-950 text-sm">100% Homemade</h3>
                <p className="text-xs text-herbal-700 mt-1 leading-relaxed">
                  Crafted by village elders using ancestral traditional techniques.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-cream-300 shadow-sm">
              <div className="p-3 rounded-xl bg-herbal-100 text-herbal-800 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-herbal-950 text-sm">Zero Preservatives</h3>
                <p className="text-xs text-herbal-700 mt-1 leading-relaxed">
                  No artificial preservatives, mineral oils, or synthetic chemicals.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-cream-300 shadow-sm">
              <div className="p-3 rounded-xl bg-herbal-100 text-herbal-800 shrink-0">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-herbal-950 text-sm">Safe Delivery</h3>
                <p className="text-xs text-herbal-700 mt-1 leading-relaxed">
                  Cash on Delivery and secure delivery across all Indian pin codes.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-cream-300 shadow-sm">
              <div className="p-3 rounded-xl bg-herbal-100 text-herbal-800 shrink-0">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-herbal-950 text-sm">Farmer Empowerment</h3>
                <p className="text-xs text-herbal-700 mt-1 leading-relaxed">
                  Direct proceeds empower rural women farming collectives.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
