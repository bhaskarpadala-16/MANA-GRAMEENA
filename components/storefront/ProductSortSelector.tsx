'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface ProductSortSelectorProps {
  currentSort: string;
}

export function ProductSortSelector({ currentSort }: ProductSortSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const handleSortChange = (newSort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', newSort);
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <select
      name="sort"
      value={currentSort}
      onChange={(e) => handleSortChange(e.target.value)}
      className="py-2 px-3 rounded-xl border border-cream-300 bg-cream-50 text-xs font-semibold text-herbal-900 focus:outline-none focus:ring-2 focus:ring-herbal-700/30 transition-all cursor-pointer"
      aria-label="Sort products"
    >
      <option value="featured">Featured First</option>
      <option value="price-asc">Price: Low to High</option>
      <option value="price-desc">Price: High to Low</option>
      <option value="newest">Newest Arrivals</option>
    </select>
  );
}
