'use client';

import React, { useState } from 'react';
import { Boxes, Search, AlertTriangle, ArrowUpDown, History } from 'lucide-react';
import { InventoryAdjustModal } from './InventoryAdjustModal';
import { Pagination } from './Pagination';
import { EmptyState } from './EmptyState';

interface InventoryRow {
  id: string;
  productId: string;
  variantId: string | null;
  productTitle: string;
  variantTitle: string | null;
  sku: string;
  imageUrl: string | null;
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  productStatus: string;
  updatedAt: Date;
}

interface InventoryTableProps {
  initialData: {
    items: InventoryRow[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  search: string;
  lowStockOnly: boolean;
}

export function InventoryTable({ initialData, search, lowStockOnly }: InventoryTableProps) {
  const [selectedItem, setSelectedItem] = useState<InventoryRow | null>(null);

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <form
        method="GET"
        className="p-4 rounded-2xl bg-herbal-900 border border-herbal-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg"
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

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="flex items-center gap-2 text-xs font-semibold text-cream-200 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              name="lowStockOnly"
              value="true"
              defaultChecked={lowStockOnly}
              className="w-4 h-4 rounded bg-herbal-950 border-herbal-800 text-rose-500 focus:ring-rose-500"
            />
            <span>Low Stock Alerts Only</span>
          </label>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-herbal-800 hover:bg-herbal-700 text-xs font-semibold text-cream-100 transition-colors"
          >
            Apply
          </button>
        </div>
      </form>

      {/* Table Card */}
      <div className="rounded-3xl bg-herbal-900 border border-herbal-800 shadow-xl overflow-hidden p-6 space-y-4">
        {initialData.items.length === 0 ? (
          <EmptyState
            title="No Inventory Records"
            description="No inventory items match the current search or low-stock criteria."
            icon={Boxes}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-herbal-800 text-cream-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3">Item / SKU</th>
                    <th className="pb-3">Variant</th>
                    <th className="pb-3">Physical Stock</th>
                    <th className="pb-3">Reserved</th>
                    <th className="pb-3">Available to Sell</th>
                    <th className="pb-3">Threshold</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-herbal-800/60">
                  {initialData.items.map((item) => (
                    <tr key={item.id} className="hover:bg-herbal-800/30 transition-colors">
                      <td className="py-3">
                        <div>
                          <span className="font-semibold text-cream-100">{item.productTitle}</span>
                          <span className="block font-mono text-[11px] text-cream-400">
                            {item.sku}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 text-cream-300 font-medium">
                        {item.variantTitle || 'Standard SKU'}
                      </td>

                      <td className="py-3 font-mono font-bold text-cream-100">
                        {item.stockQuantity}
                      </td>

                      <td className="py-3 font-mono text-amber-400 font-semibold">
                        {item.reservedQuantity}
                      </td>

                      <td className="py-3 font-mono font-bold">
                        <span
                          className={
                            item.availableQuantity <= item.lowStockThreshold
                              ? 'text-rose-400'
                              : 'text-emerald-400'
                          }
                        >
                          {item.availableQuantity}
                        </span>
                      </td>

                      <td className="py-3 font-mono text-cream-400">{item.lowStockThreshold}</td>

                      <td className="py-3">
                        {item.isLowStock ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold uppercase">
                            <AlertTriangle className="w-3 h-3" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold uppercase">
                            Healthy
                          </span>
                        )}
                      </td>

                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedItem(item)}
                          className="px-3 py-1.5 rounded-lg bg-herbal-800 hover:bg-herbal-700 text-gold-400 border border-gold-500/30 font-semibold text-xs transition-colors cursor-pointer"
                        >
                          Adjust Stock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={initialData.page}
              totalPages={initialData.totalPages}
              totalItems={initialData.total}
              pageSize={initialData.pageSize}
              baseUrl="/admin/inventory"
              searchParams={{ search, lowStockOnly: lowStockOnly ? 'true' : undefined }}
            />
          </>
        )}
      </div>

      {/* Adjust Modal */}
      {selectedItem && (
        <InventoryAdjustModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onSuccess={() => {
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
