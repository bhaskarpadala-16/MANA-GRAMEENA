import 'server-only';
import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getAdminCategories } from '@/lib/db/admin';
import { CategoryManager } from '@/components/admin/CategoryManager';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Categories Management | Admin | Mana Grameena',
};

export default async function AdminCategoriesPage() {
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
            Herbal Categories
          </h1>
          <p className="text-xs text-cream-400 mt-0.5">
            Organize catalog classifications, display orders, and descriptions.
          </p>
        </div>
      </div>

      <CategoryManager categories={categories} />
    </div>
  );
}
