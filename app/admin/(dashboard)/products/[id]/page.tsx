import 'server-only';
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { getAdminProductById, getAdminCategories } from '@/lib/db/admin';
import { ProductForm } from '@/components/admin/ProductForm';
import { ProductVariantManager } from '@/components/admin/ProductVariantManager';
import { ProductImageManager } from '@/components/admin/ProductImageManager';
import { AdminBadge } from '@/components/admin/AdminBadge';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Edit Product | Admin | Mana Grameena',
};

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product, categories] = await Promise.all([
    getAdminProductById(id),
    getAdminCategories(),
  ]);

  if (!product) {
    notFound();
  }

  const baseInventory = product.inventory.find((inv) => inv.variantId === null);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/products"
            className="p-2 rounded-xl bg-herbal-900 border border-herbal-800 text-cream-400 hover:text-cream-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-cream-50">
                {product.name}
              </h1>
              <AdminBadge status={product.status} size="sm" />
            </div>
            <p className="text-xs text-cream-400 mt-0.5">
              SKU: <span className="font-mono text-cream-200">{product.sku}</span> • Base Stock:{' '}
              <span className="font-semibold text-emerald-400">
                {baseInventory?.stockQuantity ?? 0} units
              </span>
            </p>
          </div>
        </div>

        <Link
          href={`/products/${product.slug}`}
          target="_blank"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-herbal-900 border border-herbal-800 text-cream-200 hover:bg-herbal-800 text-xs font-semibold transition-colors"
        >
          View Public Storefront <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Main Edit Form */}
      <ProductForm
        categories={categories}
        initialData={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          shortDescription: product.shortDescription,
          description: product.description,
          ingredients: product.ingredients,
          benefits: product.benefits,
          usageInstructions: product.usageInstructions,
          categoryId: product.categoryId,
          price: Number(product.price),
          discountPrice: product.discountPrice ? Number(product.discountPrice) : null,
          sku: product.sku,
          weightGrams: product.weightGrams,
          status: product.status,
          isFeatured: product.isFeatured,
          lowStockThreshold: baseInventory?.lowStockThreshold ?? 5,
        }}
      />

      {/* Variants Manager */}
      <ProductVariantManager
        productId={product.id}
        variants={product.variants.map((v) => ({
          id: v.id,
          title: v.title,
          sku: v.sku,
          priceOverride: v.priceOverride ? Number(v.priceOverride) : null,
          weightGrams: v.weightGrams,
          isActive: v.isActive,
          inventory: v.inventory,
        }))}
      />

      {/* Image Gallery Manager */}
      <ProductImageManager
        productId={product.id}
        images={product.images.map((img) => ({
          id: img.id,
          imageUrl: img.imageUrl,
          altText: img.altText,
          isPrimary: img.isPrimary,
          displayOrder: img.displayOrder,
        }))}
      />
    </div>
  );
}
