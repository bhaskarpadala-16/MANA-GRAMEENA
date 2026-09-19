import React from 'react';
import {
  OrderStatus,
  PaymentStatus,
  ShippingStatus,
  ProductStatus,
  UserRole,
  ReviewStatus,
} from '@prisma/client';

interface BadgeProps {
  status:
    | OrderStatus
    | PaymentStatus
    | ShippingStatus
    | ProductStatus
    | UserRole
    | ReviewStatus
    | string;
  size?: 'sm' | 'md';
}

export function AdminBadge({ status, size = 'sm' }: BadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';

  let colorClasses = 'bg-cream-200 text-herbal-800 border-cream-300';

  switch (status) {
    // Order Statuses
    case OrderStatus.PENDING:
    case PaymentStatus.PENDING:
    case PaymentStatus.UNDER_REVIEW:
    case ReviewStatus.PENDING:
      colorClasses = 'bg-amber-500/10 text-amber-500 border-amber-500/30';
      break;

    case OrderStatus.CONFIRMED:
    case OrderStatus.PROCESSING:
    case OrderStatus.PACKED:
      colorClasses = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      break;

    case OrderStatus.SHIPPED:
    case ShippingStatus.SHIPPED:
    case ShippingStatus.IN_TRANSIT:
    case ShippingStatus.OUT_FOR_DELIVERY:
      colorClasses = 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      break;

    case OrderStatus.DELIVERED:
    case PaymentStatus.VERIFIED:
    case ShippingStatus.DELIVERED:
    case ReviewStatus.APPROVED:
    case ProductStatus.PUBLISHED:
      colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      break;

    case OrderStatus.CANCELLED:
    case PaymentStatus.FAILED:
    case PaymentStatus.REJECTED:
    case ShippingStatus.FAILED:
    case ReviewStatus.REJECTED:
    case ProductStatus.ARCHIVED:
      colorClasses = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      break;

    case ProductStatus.DRAFT:
      colorClasses = 'bg-cream-300/20 text-cream-400 border-cream-400/20';
      break;

    // Roles
    case UserRole.SUPER_ADMIN:
      colorClasses = 'bg-gold-500/10 text-gold-400 border-gold-500/30 font-semibold';
      break;
    case UserRole.ADMIN:
      colorClasses = 'bg-herbal-500/20 text-cream-200 border-herbal-500/40 font-semibold';
      break;
    case UserRole.CUSTOMER:
      colorClasses = 'bg-cream-200/10 text-cream-400 border-cream-300/20';
      break;
  }

  // Format label: replace underscores with spaces
  const label = typeof status === 'string' ? status.replace(/_/g, ' ') : status;

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${sizeClasses} ${colorClasses} uppercase tracking-wider`}
    >
      {label}
    </span>
  );
}
