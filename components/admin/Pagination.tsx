import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  baseUrl: string;
  searchParams?: Record<string, string | number | undefined>;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  baseUrl,
  searchParams = {},
}: PaginationProps) {
  if (totalPages <= 1) return null;

  function buildUrl(page: number) {
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(searchParams)) {
      if (val !== undefined && val !== null && val !== '') {
        params.set(key, String(val));
      }
    }
    params.set('page', String(page));
    return `${baseUrl}?${params.toString()}`;
  }

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-herbal-800 text-xs text-cream-400">
      <div>
        Showing <span className="font-semibold text-cream-200">{startItem}</span> to{' '}
        <span className="font-semibold text-cream-200">{endItem}</span> of{' '}
        <span className="font-semibold text-cream-200">{totalItems}</span> results
      </div>

      <div className="flex items-center gap-2">
        {currentPage > 1 ? (
          <Link
            href={buildUrl(currentPage - 1)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-herbal-800 border border-herbal-700/60 hover:bg-herbal-700 text-cream-200 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-herbal-900 border border-herbal-800 text-cream-600 opacity-50 cursor-not-allowed">
            <ChevronLeft className="w-4 h-4" />
            Previous
          </span>
        )}

        <span className="px-3 py-1.5 rounded-lg bg-herbal-900 border border-herbal-800 text-cream-200 font-semibold">
          Page {currentPage} of {totalPages}
        </span>

        {currentPage < totalPages ? (
          <Link
            href={buildUrl(currentPage + 1)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-herbal-800 border border-herbal-700/60 hover:bg-herbal-700 text-cream-200 transition-colors cursor-pointer"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-herbal-900 border border-herbal-800 text-cream-600 opacity-50 cursor-not-allowed">
            Next
            <ChevronRight className="w-4 h-4" />
          </span>
        )}
      </div>
    </div>
  );
}
