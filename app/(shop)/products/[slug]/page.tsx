import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getProductDetailBySlug } from '@/lib/db/products';
import ProductImageGallery from '@/components/storefront/ProductImageGallery';
import VariantSelector from '@/components/storefront/VariantSelector';
import ProductCard from '@/components/storefront/ProductCard';
import {
  ChevronRight,
  ShieldCheck,
  Leaf,
  HeartHandshake,
  Star,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

import ReviewForm from '@/components/storefront/ReviewForm';
import { checkReviewEligibility } from '@/lib/actions/reviews';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductDetailBySlug(slug);

  if (!product) {
    return {
      title: 'Product Not Found | Mana Grameena',
      description: 'The requested herbal product could not be found.',
    };
  }

  return {
    title: `${product.name} | Mana Grameena`,
    description: product.shortDescription,
    openGraph: {
      title: product.name,
      description: product.shortDescription,
      images: product.images.length > 0 ? [product.images[0].imageUrl] : [],
    },
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await getProductDetailBySlug(slug);

  if (!product) {
    notFound();
  }

  const eligibility = await checkReviewEligibility(product.id);

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://managrameena.com').replace(/\/$/, '');
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription,
    image: product.images.map((img) => img.imageUrl),
    sku: product.sku,
    category: product.category.name,
    offers: {
      '@type': 'Offer',
      price: Number(product.price),
      priceCurrency: 'INR',
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${siteUrl}/products/${product.slug}`,
    },
    ...(product.reviewsCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.ratingAverage,
            reviewCount: product.reviewsCount,
          },
        }
      : {}),
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
      {/* Search Engine Rich Snippet Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />

      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-herbal-700">
        <Link href="/" className="hover:text-terracotta-600 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-cream-400" />
        <Link href="/categories" className="hover:text-terracotta-600 transition-colors">
          Categories
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-cream-400" />
        <Link
          href={`/categories/${product.category.slug}`}
          className="hover:text-terracotta-600 transition-colors font-medium"
        >
          {product.category.name}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-cream-400" />
        <span className="text-herbal-950 font-semibold truncate max-w-xs">{product.name}</span>
      </nav>

      {/* Main Product Showcase (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
        {/* Left Column: Image Gallery */}
        <div className="lg:col-span-6">
          <ProductImageGallery images={product.images} productName={product.name} />

          {/* Heritage Trust Badges */}
          <div className="grid grid-cols-3 gap-3 mt-6 p-4 rounded-2xl bg-cream-50 border border-cream-300 text-center">
            <div className="space-y-1">
              <Leaf className="w-5 h-5 text-herbal-700 mx-auto" />
              <div className="text-[11px] font-bold text-herbal-900">100% Herbal</div>
              <div className="text-[10px] text-herbal-600">Zero Chemicals</div>
            </div>
            <div className="space-y-1 border-x border-cream-300">
              <ShieldCheck className="w-5 h-5 text-herbal-700 mx-auto" />
              <div className="text-[11px] font-bold text-herbal-900">Handcrafted</div>
              <div className="text-[10px] text-herbal-600">Small Batches</div>
            </div>
            <div className="space-y-1">
              <HeartHandshake className="w-5 h-5 text-herbal-700 mx-auto" />
              <div className="text-[11px] font-bold text-herbal-900">Direct Sourced</div>
              <div className="text-[10px] text-herbal-600">Village Artisans</div>
            </div>
          </div>
        </div>

        {/* Right Column: Title, Rating, Variant Selector, Add to Cart */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-2">
            <Link
              href={`/categories/${product.category.slug}`}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cream-200 text-terracotta-700 text-xs font-semibold uppercase tracking-wider hover:bg-cream-300 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-gold-600" />
              <span>{product.category.name}</span>
            </Link>

            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-herbal-950 tracking-tight leading-tight">
              {product.name}
            </h1>

            {/* Ratings Summary */}
            <div className="flex items-center gap-3 pt-1">
              <div className="flex items-center gap-1 text-amber-500">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= Math.round(product.ratingAverage)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-cream-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-bold text-herbal-900">
                {product.ratingAverage.toFixed(1)} / 5.0
              </span>
              <span className="text-xs text-herbal-600">
                ({product.reviewsCount} customer reviews)
              </span>
            </div>
          </div>

          <p className="text-sm sm:text-base text-herbal-800 leading-relaxed">
            {product.shortDescription}
          </p>

          {/* Interactive Variant Selection & Cart Management */}
          <VariantSelector
            productId={product.id}
            productName={product.name}
            basePrice={product.price}
            discountPrice={product.discountPrice}
            baseSku={product.sku}
            baseStock={product.baseStock}
            variants={product.variants}
          />
        </div>
      </div>

      {/* Deep Dive Herbal Details (Tabs/Sections) */}
      <div className="pt-8 border-t border-cream-300">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Ingredients */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-cream-300 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-herbal-100 flex items-center justify-center text-herbal-800">
              <Leaf className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-bold text-herbal-950">Traditional Ingredients</h3>
            <p className="text-xs sm:text-sm text-herbal-800/90 leading-relaxed whitespace-pre-line">
              {product.ingredients}
            </p>
          </div>

          {/* Health Benefits */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-cream-300 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-terracotta-100 flex items-center justify-center text-terracotta-800">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-bold text-herbal-950">Ayurvedic Benefits</h3>
            <p className="text-xs sm:text-sm text-herbal-800/90 leading-relaxed whitespace-pre-line">
              {product.benefits}
            </p>
          </div>

          {/* Usage Instructions */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-cream-300 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-gold-400/20 flex items-center justify-center text-gold-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-bold text-herbal-950">Usage Instructions (Vidhi)</h3>
            <p className="text-xs sm:text-sm text-herbal-800/90 leading-relaxed whitespace-pre-line">
              {product.usageInstructions}
            </p>
          </div>
        </div>

        {/* Detailed Ancestral Story / Description */}
        <div className="mt-8 bg-white rounded-3xl p-6 sm:p-8 border border-cream-300 shadow-sm space-y-3">
          <h3 className="font-serif text-xl font-bold text-herbal-950">
            About This Heritage Formulation
          </h3>
          <p className="text-xs sm:text-sm text-herbal-800 leading-relaxed whitespace-pre-line">
            {product.description}
          </p>
        </div>
      </div>

      {/* Verified Customer Reviews Section */}
      <div className="pt-8 border-t border-cream-300 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl font-bold text-herbal-950">Customer Experiences</h2>
            <p className="text-xs text-herbal-700 mt-1">
              Authentic reviews submitted exclusively by verified buyers.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-2xl font-serif font-bold text-herbal-950">
              {product.ratingAverage.toFixed(1)}
            </div>
            <div>
              <div className="flex items-center gap-0.5 text-amber-500">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-3.5 h-3.5 ${
                      s <= Math.round(product.ratingAverage)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-cream-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[11px] text-herbal-600">
                Based on {product.reviewsCount} reviews
              </span>
            </div>
          </div>
        </div>

        {/* Write a Review Section */}
        <ReviewForm
          productId={product.id}
          canReview={eligibility.canReview}
          reason={eligibility.reason}
          initialRating={eligibility.existingReview?.rating || 5}
          initialText={eligibility.existingReview?.reviewText || ''}
        />

        {product.reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {product.reviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-white rounded-2xl p-5 border border-cream-300 shadow-sm space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-herbal-950">{rev.userName}</span>
                  <span className="text-[11px] text-herbal-500">
                    {new Date(rev.createdAt).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3 h-3 ${
                          s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-cream-300'
                        }`}
                      />
                    ))}
                  </div>
                  {rev.isVerifiedPurchase && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified Purchase
                    </span>
                  )}
                </div>

                <p className="text-xs text-herbal-800 leading-relaxed">{rev.reviewText}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-cream-50 border border-cream-300 text-center text-xs text-herbal-700">
            No customer reviews yet. Be the first verified buyer to share your experience after delivery!
          </div>
        )}
      </div>

      {/* Related Herbal Formulations */}
      {product.relatedProducts.length > 0 && (
        <div className="pt-8 border-t border-cream-300 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl font-bold text-herbal-950">
              More from {product.category.name}
            </h2>
            <Link
              href={`/categories/${product.category.slug}`}
              className="text-xs font-semibold text-terracotta-600 hover:text-terracotta-700"
            >
              View Category →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {product.relatedProducts.map((rel) => (
              <ProductCard key={rel.id} product={rel} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
