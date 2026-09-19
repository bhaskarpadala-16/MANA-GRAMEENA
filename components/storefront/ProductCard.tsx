import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Leaf, Star, Sparkles } from 'lucide-react';
import { ProductSummary } from '@/lib/db/products';

interface ProductCardProps {
  product: ProductSummary;
}

export default function ProductCard({ product }: ProductCardProps) {
  const hasDiscount = product.discountPrice !== null && product.discountPrice < product.price;
  const displayPrice = hasDiscount ? product.discountPrice! : product.price;
  const originalPrice = product.price;

  return (
    <div className="group relative flex flex-col bg-white rounded-2xl border border-cream-300 overflow-hidden hover:shadow-xl hover:border-herbal-400/50 transition-all duration-300">
      {/* Product Image Area */}
      <Link
        href={`/products/${product.slug}`}
        className="relative aspect-square w-full bg-cream-100/60 overflow-hidden flex items-center justify-center"
      >
        {product.primaryImage ? (
          <Image
            src={product.primaryImage}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center text-herbal-800/60">
            <div className="w-16 h-16 rounded-full bg-herbal-100 flex items-center justify-center mb-2 group-hover:bg-herbal-200 transition-colors">
              <Leaf className="w-8 h-8 text-herbal-700" />
            </div>
            <span className="text-xs font-medium text-herbal-600">Herbal Craft</span>
          </div>
        )}

        {/* Featured Badge */}
        {product.isFeatured && (
          <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-herbal-800 text-cream-100 text-[11px] font-semibold shadow-sm">
            <Sparkles className="w-3 h-3 text-gold-400" />
            <span>Featured</span>
          </div>
        )}

        {/* Stock Status Badge */}
        <div className="absolute top-3 right-3">
          {!product.inStock ? (
            <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-[11px] font-semibold border border-red-200 shadow-sm">
              Out of Stock
            </span>
          ) : product.totalStock <= 5 ? (
            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold border border-amber-200 shadow-sm">
              Only {product.totalStock} left
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200 shadow-sm">
              In Stock
            </span>
          )}
        </div>
      </Link>

      {/* Details Container */}
      <div className="flex flex-col flex-1 p-5 space-y-3">
        {/* Category & Rating */}
        <div className="flex items-center justify-between text-xs">
          <Link
            href={`/categories/${product.category.slug}`}
            className="text-terracotta-600 hover:text-terracotta-700 font-medium uppercase tracking-wider text-[11px]"
          >
            {product.category.name}
          </Link>
          <div className="flex items-center gap-1 text-amber-600 font-medium">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{product.ratingAverage.toFixed(1)}</span>
            <span className="text-herbal-500 text-[11px]">({product.reviewsCount})</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-serif font-bold text-herbal-950 text-base leading-snug line-clamp-1 group-hover:text-herbal-700 transition-colors">
          <Link href={`/products/${product.slug}`}>{product.name}</Link>
        </h3>

        {/* Short Description */}
        <p className="text-xs text-herbal-800/80 line-clamp-2 leading-relaxed flex-1">
          {product.shortDescription}
        </p>

        {/* Pricing & CTA */}
        <div className="pt-2 border-t border-cream-200 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-herbal-950">₹{displayPrice.toLocaleString('en-IN')}</span>
              {hasDiscount && (
                <span className="text-xs text-herbal-500 line-through">
                  ₹{originalPrice.toLocaleString('en-IN')}
                </span>
              )}
            </div>
            {product.variantsCount > 1 ? (
              <span className="text-[10px] text-herbal-600 block">
                {product.variantsCount} sizes available
              </span>
            ) : (
              <span className="text-[10px] text-herbal-600 block">
                {product.weightGrams}g net wt.
              </span>
            )}
          </div>

          <Link
            href={`/products/${product.slug}`}
            className="px-3.5 py-1.5 rounded-xl bg-cream-200 text-herbal-900 hover:bg-herbal-800 hover:text-cream-100 text-xs font-semibold transition-colors duration-200 text-center"
          >
            {product.variantsCount > 1 ? 'Options' : 'View'}
          </Link>
        </div>
      </div>
    </div>
  );
}
