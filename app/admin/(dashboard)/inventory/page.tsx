import 'server-only';
import React from 'react';
import { getAdminInventory } from '@/lib/db/admin';
import { InventoryTable } from '@/components/admin/InventoryTable';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Inventory Control | Admin | Mana Grameena',
  description: 'Real-time stock levels, batch restocking, and inventory transaction auditing.',
};

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    lowStockOnly?: string;
    page?: string;
  }>;
}) {
  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page || '1', 10);
  const search = resolvedParams.search || '';
  const lowStockOnly = resolvedParams.lowStockOnly === 'true';

  const inventoryData = await getAdminInventory({
    search,
    lowStockOnly,
    page,
    pageSize: 15,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-cream-50">
          Inventory Control
        </h1>
        <p className="text-xs text-cream-400 mt-1">
          Monitor physical stock, reserved order allocations, available inventory, and restock batches.
        </p>
      </div>

      <InventoryTable
        initialData={inventoryData}
        search={search}
        lowStockOnly={lowStockOnly}
      />
    </div>
  );
}
