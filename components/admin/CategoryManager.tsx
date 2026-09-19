'use client';

import React, { useState, useTransition } from 'react';
import { Plus, FolderTree, Loader2, AlertCircle } from 'lucide-react';
import { createCategoryAction } from '@/lib/actions/admin/products';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  displayOrder: number;
  isActive: boolean;
  _count: { products: number };
}

interface CategoryManagerProps {
  categories: CategoryItem[];
}

export function CategoryManager({ categories }: CategoryManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [displayOrder, setDisplayOrder] = useState('0');

  function handleNameChange(val: string) {
    setName(val);
    const generated = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    setSlug(generated);
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const payload = {
      name,
      slug,
      description: description || null,
      imageUrl: imageUrl || null,
      displayOrder: parseInt(displayOrder, 10) || 0,
      isActive: true,
    };

    startTransition(async () => {
      const res = await createCategoryAction(payload);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to create category.');
      } else {
        setName('');
        setSlug('');
        setDescription('');
        setImageUrl('');
        setDisplayOrder('0');
        setIsOpen(false);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-herbal-800 border border-gold-500/30 text-gold-400 hover:bg-herbal-700 text-xs font-semibold transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Add Category Form */}
      {isOpen && (
        <form
          onSubmit={handleCreate}
          className="p-6 rounded-3xl bg-herbal-900 border border-gold-500/30 shadow-xl space-y-4"
        >
          <h3 className="font-serif text-base font-bold text-cream-50">Create New Category</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-cream-300">Category Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Cold-Pressed Oils"
                className="w-full px-3 py-2 bg-herbal-950 border border-herbal-800 rounded-xl text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-cream-300">Slug *</label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="cold-pressed-oils"
                className="w-full px-3 py-2 bg-herbal-950 border border-herbal-800 rounded-xl text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50 font-mono"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="block text-xs font-semibold text-cream-300">Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ancestral wood-pressed unrefined culinary and body oils..."
                className="w-full px-3 py-2 bg-herbal-950 border border-herbal-800 rounded-xl text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-cream-300">Image URL</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3 py-2 bg-herbal-950 border border-herbal-800 rounded-xl text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-cream-300">Display Order</label>
              <input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                className="w-full px-3 py-2 bg-herbal-950 border border-herbal-800 rounded-xl text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 rounded-xl text-xs text-cream-400 hover:text-cream-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 rounded-xl bg-herbal-800 hover:bg-herbal-700 text-gold-400 border border-gold-500/30 text-xs font-bold transition-colors disabled:opacity-50 shadow"
            >
              {isPending ? 'Saving...' : 'Create Category'}
            </button>
          </div>
        </form>
      )}

      {/* Categories Table */}
      <div className="rounded-3xl bg-herbal-900 border border-herbal-800 shadow-xl overflow-hidden p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-herbal-800 text-cream-400 font-semibold uppercase tracking-wider">
                <th className="pb-3">Order</th>
                <th className="pb-3">Category Name</th>
                <th className="pb-3">Slug</th>
                <th className="pb-3">Products Count</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-herbal-800/60">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-herbal-800/30 transition-colors">
                  <td className="py-3 font-mono font-bold text-gold-400">{c.displayOrder}</td>
                  <td className="py-3 font-semibold text-cream-100">
                    <div className="flex items-center gap-2">
                      <FolderTree className="w-4 h-4 text-cream-500" />
                      <span>{c.name}</span>
                    </div>
                  </td>
                  <td className="py-3 font-mono text-cream-400">{c.slug}</td>
                  <td className="py-3 text-cream-300 font-semibold">{c._count.products} products</td>
                  <td className="py-3">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase ${
                        c.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
