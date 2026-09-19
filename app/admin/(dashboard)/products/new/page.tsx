import 'server-only';
import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getAdminCategories } from '@/lib/db/admin';
import { ProductForm } from '@/components/admin/ProductForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Add New Product | Admin | Mana Grameena',
};

export default async function NewProductPage() {
  const categories = await getAdminCategories();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/products"
          className="p-2 rounded-xl bg-herbal-900 border border-herbal-800 text-cream-400 hover:text-cream-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-cream-50">
            Create Herbal Product
          </h1>
          <p className="text-xs text-cream-400 mt-0.5">
            Add a new homemade formulation or botanical product to the catalog.
          </p>
        </div>
      </div>

      <ProductForm categories={categories} />
    </div>
  );
}
