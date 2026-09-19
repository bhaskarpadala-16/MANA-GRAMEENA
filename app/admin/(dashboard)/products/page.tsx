import 'server-only';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, Search, Filter, Package, ArrowUpRight, FolderTree } from 'lucide-react';
import { getAdminProducts, getAdminCategories } from '@/lib/db/admin';
import { AdminBadge } from '@/components/admin/AdminBadge';
import { Pagination } from '@/components/admin/Pagination';
import { EmptyState } from '@/components/admin/EmptyState';
import { ProductStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Products Management | Admin | Mana Grameena',
};

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    categoryId?: string;
    status?: ProductStatus;
    page?: string;
  }>;
}) {
  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page || '1', 10);
  const search = resolvedParams.search || '';
  const categoryId = resolvedParams.categoryId || '';
  const status = resolvedParams.status;

  const [productsData, categories] = await Promise.all([
    getAdminProducts({
      search,
      categoryId: categoryId || undefined,
      status: status || undefined,
      page,
      pageSize: 15,
    }),
    getAdminCategories(),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-cream-50">
            Products & Variants
          </h1>
          <p className="text-xs text-cream-400 mt-1">
            Manage catalog items, pricing, inventory thresholds, and botanical descriptions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/products/categories"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-herbal-900 border border-herbal-800 text-cream-200 hover:bg-herbal-800 text-xs font-semibold transition-colors"
          >
            <FolderTree className="w-4 h-4 text-gold-400" />
            Categories
          </Link>
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-herbal-800 border border-gold-500/30 text-gold-400 hover:bg-herbal-700 text-xs font-semibold transition-colors cursor-pointer shadow"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </Link>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <form
        method="GET"
        className="p-4 rounded-2xl bg-herbal-900 border border-herbal-800 flex flex-col md:flex-row items-center gap-3 shadow-lg"
      >
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-cream-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search by product title or SKU..."
            className="w-full pl-10 pr-4 py-2 bg-herbal-950/80 border border-herbal-800 rounded-xl text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            name="categoryId"
            defaultValue={categoryId}
            className="px-3 py-2 bg-herbal-950/80 border border-herbal-800 rounded-xl text-xs text-cream-200 focus:outline-none focus:border-gold-500/50"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            name="status"
            defaultValue={status || ''}
            className="px-3 py-2 bg-herbal-950/80 border border-herbal-800 rounded-xl text-xs text-cream-200 focus:outline-none focus:border-gold-500/50"
          >
            <option value="">All Statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-herbal-800 hover:bg-herbal-700 text-xs font-semibold text-cream-100 transition-colors"
          >
            Filter
          </button>
        </div>
      </form>

      {/* Products Table */}
      <div className="rounded-3xl bg-herbal-900 border border-herbal-800 shadow-xl overflow-hidden p-6 space-y-4">
        {productsData.items.length === 0 ? (
          <EmptyState
            title="No Products Found"
            description="No catalog products match your search or filter criteria."
            icon={Package}
            actionHref="/admin/products/new"
            actionLabel="Create First Product"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-herbal-800 text-cream-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3">Product</th>
                    <th className="pb-3">SKU</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3">Base Price</th>
                    <th className="pb-3">Stock Level</th>
                    <th className="pb-3">Variants</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-herbal-800/60">
                  {productsData.items.map((prod) => {
                    const primaryImage = prod.images[0]?.imageUrl;
                    const stock = prod.inventory[0]?.stockQuantity ?? 0;
                    const threshold = prod.inventory[0]?.lowStockThreshold ?? 5;
                    const isLow = stock <= threshold;

                    return (
                      <tr key={prod.id} className="hover:bg-herbal-800/30 transition-colors">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-herbal-950 border border-herbal-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                              {primaryImage ? (
                                <img
                                  src={primaryImage}
                                  alt={prod.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="w-5 h-5 text-cream-600" />
                              )}
                            </div>
                            <div>
                              <Link
                                href={`/admin/products/${prod.id}`}
                                className="font-semibold text-cream-100 hover:text-gold-400 transition-colors"
                              >
                                {prod.name}
                              </Link>
                              {prod.isFeatured && (
                                <span className="ml-2 text-[10px] px-1.5 py-0.2 rounded bg-gold-500/20 text-gold-300 font-bold">
                                  Featured
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 font-mono text-cream-400">{prod.sku}</td>

                        <td className="py-3 text-cream-300">{prod.category.name}</td>

                        <td className="py-3 font-semibold text-cream-100">
                          ₹{Number(prod.price).toLocaleString('en-IN')}
                        </td>

                        <td className="py-3">
                          <span
                            className={`font-semibold ${
                              isLow ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {stock} units
                          </span>
                        </td>

                        <td className="py-3 text-cream-400">
                          {prod._count.variants > 0
                            ? `${prod._count.variants} variant(s)`
                            : 'Single SKU'}
                        </td>

                        <td className="py-3">
                          <AdminBadge status={prod.status} size="sm" />
                        </td>

                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/products/${prod.slug}`}
                              target="_blank"
                              className="p-1.5 rounded-lg bg-herbal-950 border border-herbal-800 text-cream-400 hover:text-cream-100"
                              title="View on Public Store"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
                            <Link
                              href={`/admin/products/${prod.id}`}
                              className="px-3 py-1.5 rounded-lg bg-herbal-800 hover:bg-herbal-700 text-cream-200 font-medium transition-colors"
                            >
                              Edit
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={productsData.page}
              totalPages={productsData.totalPages}
              totalItems={productsData.total}
              pageSize={productsData.pageSize}
              baseUrl="/admin/products"
              searchParams={{ search, categoryId, status }}
            />
          </>
        )}
      </div>
    </div>
  );
}
