'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  CheckCircle2,
  Boxes,
  Users,
  Star,
  Ticket,
  Bell,
  Activity,
  BarChart3,
  ShieldAlert,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { UserRole } from '@prisma/client';

interface AdminSidebarProps {
  userRole: UserRole;
  pendingOrdersCount?: number;
  pendingPaymentCount?: number;
  lowStockCount?: number;
  onNavigate?: () => void;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  badge?: string | number | null;
  badgeColor?: string;
}

export function AdminSidebar({
  userRole,
  pendingOrdersCount = 0,
  pendingPaymentCount = 0,
  lowStockCount = 0,
  onNavigate,
}: AdminSidebarProps) {
  const pathname = usePathname();

  const navigation: NavigationItem[] = [
    {
      name: 'Overview',
      href: '/admin',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      name: 'Products & Variants',
      href: '/admin/products',
      icon: Package,
      badge: null,
    },
    {
      name: 'Orders & Dispatch',
      href: '/admin/orders',
      icon: ShoppingCart,
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : null,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    },
    {
      name: 'UPI Verification',
      href: '/admin/orders/payments',
      icon: CheckCircle2,
      badge: pendingPaymentCount > 0 ? pendingPaymentCount : null,
      badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
    },
    {
      name: 'Inventory Control',
      href: '/admin/inventory',
      icon: Boxes,
      badge: lowStockCount > 0 ? lowStockCount : null,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    },
    {
      name: 'Customers',
      href: '/admin/customers',
      icon: Users,
      badge: null,
    },
    {
      name: 'Review Moderation',
      href: '/admin/reviews',
      icon: Star,
      badge: null,
    },
    {
      name: 'Coupons & Promos',
      href: '/admin/coupons',
      icon: Ticket,
      badge: null,
    },
    {
      name: 'Alerts & Broadcasts',
      href: '/admin/notifications',
      icon: Bell,
      badge: null,
    },
    {
      name: 'Activity Audit Log',
      href: '/admin/activity',
      icon: Activity,
      badge: null,
    },
    {
      name: 'Business Analytics',
      href: '/admin/analytics',
      icon: BarChart3,
      badge: null,
    },
  ];

  if (userRole === UserRole.SUPER_ADMIN) {
    navigation.push({
      name: 'Role Governance',
      href: '/admin/roles',
      icon: ShieldAlert,
      badge: 'Super',
      badgeColor: 'bg-gold-500/20 text-gold-300 border border-gold-500/30',
    });
  }

  function isActiveRoute(href: string) {
    if (href === '/admin') {
      return pathname === '/admin' || pathname === '/admin/dashboard';
    }
    return pathname.startsWith(href);
  }

  return (
    <aside className="w-64 flex-shrink-0 bg-herbal-950 border-r border-herbal-800 flex flex-col justify-between h-full">
      <div className="p-5 space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-herbal-900 border border-gold-500/30 text-gold-400 flex items-center justify-center shadow">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-cream-50 leading-tight">
              Mana Grameena
            </h2>
            <p className="text-[10px] text-gold-400 font-semibold uppercase tracking-wider">
              Admin Console
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navigation.map((item) => {
            const active = isActiveRoute(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  active
                    ? 'bg-herbal-900 text-gold-400 font-semibold shadow border border-gold-500/30'
                    : 'text-cream-300 hover:bg-herbal-900/60 hover:text-cream-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${active ? 'text-gold-400' : 'text-cream-400'}`} />
                  <span>{item.name}</span>
                </div>

                {item.badge !== null && item.badge !== undefined && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      item.badgeColor || 'bg-herbal-800 text-cream-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Return to Storefront */}
      <div className="p-5 border-t border-herbal-900 space-y-2">
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-cream-400 hover:text-cream-100 hover:bg-herbal-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Storefront</span>
        </Link>
      </div>
    </aside>
  );
}
