'use client';

import React, { useState } from 'react';
import { Menu, X, LogOut, ShieldCheck, User } from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';
import { AdminBadge } from './AdminBadge';
import { signOutAdminAction } from '@/lib/auth/actions';
import { UserRole } from '@prisma/client';

interface AdminHeaderProps {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
  };
  pendingOrdersCount?: number;
  pendingPaymentCount?: number;
  lowStockCount?: number;
}

export function AdminHeader({
  user,
  pendingOrdersCount = 0,
  pendingPaymentCount = 0,
  lowStockCount = 0,
}: AdminHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 py-3.5 bg-herbal-950/90 backdrop-blur-md border-b border-herbal-800">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-herbal-900 border border-herbal-800 text-cream-200 hover:text-cream-100"
            aria-label="Open mobile menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="hidden sm:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-cream-300">Live Operation Portal</span>
          </div>
        </div>

        {/* User profile & actions */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-herbal-800 border border-gold-500/30 text-gold-400 flex items-center justify-center text-xs font-bold">
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-cream-100 leading-tight">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-[10px] text-cream-400 leading-tight">{user.email}</div>
            </div>
            <AdminBadge status={user.role} size="sm" />
          </div>

          <form action={signOutAdminAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-herbal-900 border border-herbal-800 hover:bg-herbal-800 text-xs font-medium text-cream-300 hover:text-cream-100 transition-colors cursor-pointer"
              title="Sign Out Admin"
            >
              <LogOut className="w-3.5 h-3.5 text-terracotta-400" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </form>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-50 w-64 bg-herbal-950 flex flex-col h-full shadow-2xl">
            <div className="p-4 flex justify-end">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg bg-herbal-900 text-cream-300 hover:text-cream-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <AdminSidebar
                userRole={user.role}
                pendingOrdersCount={pendingOrdersCount}
                pendingPaymentCount={pendingPaymentCount}
                lowStockCount={lowStockCount}
                onNavigate={() => setMobileMenuOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
