import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getCategoryBySlug, getPublishedProducts } from '@/lib/db/products';
import ProductCard from '@/components/storefront/ProductCard';
import { ChevronRight, Leaf, ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface CategoryDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CategoryDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    return {
      title: 'Category Not Found | Mana Grameena',
      description: 'The requested herbal category could not be found.',
    };
  }

  return {
    title: `${category.name} | Mana Grameena`,
    description: category.description || `Browse ${category.name} at Mana Grameena.`,
  };
}

export default async function CategoryDetailPage({ params }: CategoryDetailPageProps) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const { products, totalCount } = await getPublishedProducts({
    categorySlug: slug,
    limit: 24,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-herbal-700">
        <Link href="/" className="hover:text-terracotta-600 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-cream-400" />
        <Link href="/categories" className="hover:text-terracotta-600 transition-colors">
          Categories
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-cream-400" />
        <span className="text-herbal-950 font-semibold">{category.name}</span>
      </nav>

      {/* Category Banner */}
      <div className="bg-white rounded-3xl p-8 sm:p-10 border border-cream-300 shadow-sm space-y-3 relative overflow-hidden">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-terracotta-600">
          <Leaf className="w-4 h-4" />
          <span>Category Spotlight</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-herbal-950">
          {category.name}
        </h1>
        <p className="text-sm sm:text-base text-herbal-800/90 max-w-2xl leading-relaxed">
          {category.description ||
            'Discover handcrafted village preparations using pristine natural ingredients.'}
        </p>
        <div className="pt-2 text-xs font-semibold text-herbal-700">
          {totalCount} Authentic Formulation{totalCount === 1 ? '' : 's'}
        </div>
      </div>

      {/* Products Grid */}
      {products.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {totalCount > 24 && (
            <div className="pt-6 text-center">
              <Link
                href={`/products?category=${slug}`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-herbal-800 text-cream-100 text-xs font-semibold hover:bg-herbal-900 transition-colors shadow-sm"
              >
                <span>View All {totalCount} Formulations in {category.name}</span>
                <ChevronRight className="w-4 h-4 text-gold-400" />
              </Link>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-cream-300 max-w-md mx-auto my-12 space-y-4">
          <div className="w-16 h-16 rounded-full bg-cream-200 flex items-center justify-center mx-auto text-herbal-700">
            <Leaf className="w-8 h-8" />
          </div>
          <h3 className="font-serif text-xl font-bold text-herbal-950">
            No Formulations Listed Yet
          </h3>
          <p className="text-xs text-herbal-800 leading-relaxed">
            New small-batch harvests in this category are being prepared. Check back soon or explore
            our other categories.
          </p>
          <div className="pt-2">
            <Link
              href="/categories"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-herbal-800 text-cream-100 text-xs font-semibold hover:bg-herbal-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              All Categories
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
