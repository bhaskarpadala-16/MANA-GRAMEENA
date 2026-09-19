import React from 'react';
import Link from 'next/link';
import { getPublishedProducts, getActiveCategories } from '@/lib/db/products';
import ProductCard from '@/components/storefront/ProductCard';
import { ProductSortSelector } from '@/components/storefront/ProductSortSelector';
import { Search, SlidersHorizontal, Leaf, X } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Herbal Catalogue | Mana Grameena',
  description:
    'Explore authentic homemade herbal oils, botanical wellness powders, and handcrafted natural care products from rural roots.',
};

interface ProductsPageProps {
  searchParams: Promise<{
    category?: string;
    search?: string;
    sort?: 'featured' | 'price-asc' | 'price-desc' | 'newest';
    page?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const categorySlug = params.category;
  const search = params.search;
  const sort = params.sort || 'featured';
  const parsedPage = Number.parseInt(params.page || '1', 10);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const limit = 12;

  const [{ products, totalCount }, categories] = await Promise.all([
    getPublishedProducts({
      categorySlug,
      search,
      sort,
      limit,
      page,
    }),
    getActiveCategories(),
  ]);

  const totalPages = Math.ceil(totalCount / limit);
  const activeCategory = categories.find((c) => c.slug === categorySlug);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header & Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-herbal-700 font-medium mb-2">
          <Link href="/" className="hover:text-herbal-900 transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-herbal-950 font-semibold">Store Catalog</span>
          {activeCategory && (
            <>
              <span>/</span>
              <span className="text-herbal-800 font-semibold">{activeCategory.name}</span>
            </>
          )}
        </div>
        <h1 className="text-3xl font-serif font-bold text-herbal-950">
          {activeCategory ? activeCategory.name : 'Authentic Ayurvedic Formulations'}
        </h1>
        <p className="text-sm text-herbal-800/80 mt-1 max-w-2xl">
          {activeCategory?.description ||
            'Explore our certified organic, cold-pressed, and traditional herbal formulations prepared in strict accordance with ancestral Ayurvedic texts.'}
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-cream-200 mb-8 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <form method="GET" action="/products" className="relative flex-1 max-w-md">
            {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
            {sort && <input type="hidden" name="sort" value={sort} />}
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-herbal-600/70" />
            <input
              type="text"
              name="search"
              defaultValue={search || ''}
              placeholder="Search by herb, formulation, or benefit..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cream-300 bg-cream-50 text-sm text-herbal-950 placeholder:text-herbal-600/60 focus:outline-none focus:ring-2 focus:ring-herbal-700/30 focus:border-herbal-700 transition-all"
            />
          </form>

          {/* Sort Selector */}
          <div className="flex items-center gap-3 self-end md:self-auto">
            <div className="flex items-center gap-2 text-xs font-medium text-herbal-800">
              <SlidersHorizontal className="w-4 h-4 text-herbal-700" />
              <span>Sort:</span>
            </div>
            <ProductSortSelector currentSort={sort} />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2 border-t border-cream-200">
          <Link
            href={`/products${search ? `?search=${encodeURIComponent(search)}` : ''}`}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors ${
              !categorySlug
                ? 'bg-herbal-800 text-cream-100 shadow-sm'
                : 'bg-cream-100 text-herbal-800 hover:bg-cream-200'
            }`}
          >
            All Herbs ({categories.reduce((sum, c) => sum + c._count.products, 0)})
          </Link>

          {categories.map((cat) => {
            const isSelected = cat.slug === categorySlug;
            const href = `/products?category=${cat.slug}${
              search ? `&search=${encodeURIComponent(search)}` : ''
            }`;

            return (
              <Link
                key={cat.id}
                href={href}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-herbal-800 text-cream-100 shadow-sm'
                    : 'bg-cream-100 text-herbal-800 hover:bg-cream-200'
                }`}
              >
                {cat.name} ({cat._count.products})
              </Link>
            );
          })}
        </div>

        {/* Active Filter Badges */}
        {(categorySlug || search) && (
          <div className="flex items-center gap-2 pt-2 border-t border-cream-200 text-xs text-herbal-700">
            <span className="font-medium">Active Filters:</span>
            {activeCategory && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-herbal-100 text-herbal-900 font-semibold text-[11px]">
                {activeCategory.name}
                <Link href={`/products${search ? `?search=${encodeURIComponent(search)}` : ''}`}>
                  <X className="w-3 h-3 hover:text-terracotta-600" />
                </Link>
              </span>
            )}
            {search && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-herbal-100 text-herbal-900 font-semibold text-[11px]">
                &quot;{search}&quot;
                <Link
                  href={`/products${categorySlug ? `?category=${encodeURIComponent(categorySlug)}` : ''}`}
                >
                  <X className="w-3 h-3 hover:text-terracotta-600" />
                </Link>
              </span>
            )}
            <Link
              href="/products"
              className="text-terracotta-600 hover:underline font-semibold ml-2 text-[11px]"
            >
              Reset All
            </Link>
          </div>
        )}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-herbal-700 mb-6 font-medium">
        <span>
          Showing <strong className="text-herbal-950">{products.length}</strong> of{' '}
          <strong className="text-herbal-950">{totalCount}</strong> herbal creations
        </span>
        {totalPages > 1 && (
          <span>
            Page {page} of {totalPages}
          </span>
        )}
      </div>

      {/* Products Grid */}
      {products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-cream-300 max-w-lg mx-auto my-12 space-y-4">
          <div className="w-16 h-16 rounded-full bg-cream-200 flex items-center justify-center mx-auto text-herbal-700">
            <Leaf className="w-8 h-8" />
          </div>
          <h3 className="font-serif text-xl font-bold text-herbal-950">No Herbal Products Found</h3>
          <p className="text-xs text-herbal-800 leading-relaxed">
            We couldn&apos;t find any products matching your active filters. Try searching for other
            herbs or clearing selected filters.
          </p>
          <div className="pt-2">
            <Link
              href="/products"
              className="inline-flex px-5 py-2.5 rounded-xl bg-herbal-800 text-cream-100 text-xs font-semibold hover:bg-herbal-900 transition-colors"
            >
              Browse All Products
            </Link>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-12">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
            const isCurrent = p === page;
            const searchParamsObj = new URLSearchParams();
            if (categorySlug) searchParamsObj.set('category', categorySlug);
            if (search) searchParamsObj.set('search', search);
            if (sort) searchParamsObj.set('sort', sort);
            searchParamsObj.set('page', p.toString());

            return (
              <Link
                key={p}
                href={`/products?${searchParamsObj.toString()}`}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-semibold transition-all ${
                  isCurrent
                    ? 'bg-herbal-800 text-cream-100 shadow-md'
                    : 'bg-white text-herbal-900 border border-cream-300 hover:bg-cream-200'
                }`}
              >
                {p}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
