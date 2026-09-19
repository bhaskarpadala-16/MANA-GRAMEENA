import 'server-only';
import React from 'react';
import { requireAdmin } from '@/lib/auth/guards';
import prisma from '@/lib/db';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Enforces server-side database authentication and role verification
  const user = await requireAdmin();

  // Load real-time operational badge counts
  const [pendingOrdersCount, pendingPaymentCount, lowStockCount] = await Promise.all([
    prisma.order.count({ where: { orderStatus: OrderStatus.PENDING } }),
    prisma.paymentProof.count({ where: { reviewStatus: PaymentStatus.UNDER_REVIEW } }),
    prisma.inventory.count({
      where: {
        stockQuantity: {
          lte: prisma.inventory.fields.lowStockThreshold,
        },
      },
    }),
  ]);

  return (
    <div className="min-h-screen bg-herbal-950 text-cream-100 flex flex-col antialiased">
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex flex-shrink-0">
          <AdminSidebar
            userRole={user.role}
            pendingOrdersCount={pendingOrdersCount}
            pendingPaymentCount={pendingPaymentCount}
            lowStockCount={lowStockCount}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <AdminHeader
            user={{
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              role: user.role,
            }}
            pendingOrdersCount={pendingOrdersCount}
            pendingPaymentCount={pendingPaymentCount}
            lowStockCount={lowStockCount}
          />

          <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
