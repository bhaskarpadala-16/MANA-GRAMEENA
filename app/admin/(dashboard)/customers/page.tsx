import 'server-only';
import React from 'react';
import Link from 'next/link';
import { Users, Search, ShoppingCart, ArrowRight } from 'lucide-react';
import { getAdminCustomers } from '@/lib/db/admin';
import { Pagination } from '@/components/admin/Pagination';
import { EmptyState } from '@/components/admin/EmptyState';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Customer Directory | Admin | Mana Grameena',
  description: 'Registered customer profiles, total purchases, and account statuses.',
};

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    isActive?: string;
    page?: string;
  }>;
}) {
  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page || '1', 10);
  const search = resolvedParams.search || '';
  const isActiveParam = resolvedParams.isActive;
  const isActive =
    isActiveParam === 'true' ? true : isActiveParam === 'false' ? false : undefined;

  const customersData = await getAdminCustomers({
    search,
    isActive,
    page,
    pageSize: 15,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-cream-50">
          Customer Directory
        </h1>
        <p className="text-xs text-cream-400 mt-1">
          Review customer accounts, contact details, total orders placed, and lifetime spend.
        </p>
      </div>

      {/* Search & Status Bar */}
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
            placeholder="Search by customer name or phone..."
            className="w-full pl-10 pr-4 py-2 bg-herbal-950/80 border border-herbal-800 rounded-xl text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            name="isActive"
            defaultValue={isActiveParam || ''}
            className="px-3 py-2 bg-herbal-950/80 border border-herbal-800 rounded-xl text-xs text-cream-200 focus:outline-none focus:border-gold-500/50"
          >
            <option value="">All Accounts</option>
            <option value="true">Active Only</option>
            <option value="false">Deactivated Only</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-herbal-800 hover:bg-herbal-700 text-xs font-semibold text-cream-100 transition-colors"
          >
            Filter
          </button>
        </div>
      </form>

      {/* Customers Table */}
      <div className="rounded-3xl bg-herbal-900 border border-herbal-800 shadow-xl overflow-hidden p-6 space-y-4">
        {customersData.items.length === 0 ? (
          <EmptyState
            title="No Customers Found"
            description="No registered customer profiles matched your query."
            icon={Users}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-herbal-800 text-cream-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3">Customer</th>
                    <th className="pb-3">Phone</th>
                    <th className="pb-3">Registered</th>
                    <th className="pb-3">Orders</th>
                    <th className="pb-3">Lifetime Spend</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-herbal-800/60">
                  {customersData.items.map((c) => (
                    <tr key={c.id} className="hover:bg-herbal-800/30 transition-colors">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-herbal-800 border border-gold-500/30 text-gold-400 flex items-center justify-center font-bold text-xs">
                            {c.firstName[0]}
                            {c.lastName[0]}
                          </div>
                          <Link
                            href={`/admin/customers/${c.id}`}
                            className="font-semibold text-cream-100 hover:text-gold-400"
                          >
                            {c.firstName} {c.lastName}
                          </Link>
                        </div>
                      </td>

                      <td className="py-3 font-mono text-cream-300">{c.phone || '—'}</td>

                      <td className="py-3 text-cream-400 whitespace-nowrap">
                        {new Date(c.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="py-3 text-cream-300 font-medium">{c.ordersCount} orders</td>

                      <td className="py-3 font-semibold text-gold-400 font-serif text-sm">
                        ₹{c.totalSpent.toLocaleString('en-IN')}
                      </td>

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

                      <td className="py-3 text-right">
                        <Link
                          href={`/admin/customers/${c.id}`}
                          className="px-3 py-1.5 rounded-lg bg-herbal-800 hover:bg-herbal-700 text-cream-200 font-medium transition-colors"
                        >
                          Profile
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={customersData.page}
              totalPages={customersData.totalPages}
              totalItems={customersData.total}
              pageSize={customersData.pageSize}
              baseUrl="/admin/customers"
              searchParams={{ search, isActive: isActiveParam }}
            />
          </>
        )}
      </div>
    </div>
  );
}
