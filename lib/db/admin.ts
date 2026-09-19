import 'server-only';
import prisma from '@/lib/db';
import {
  OrderStatus,
  PaymentStatus,
  ProductStatus,
  ReviewStatus,
  UserRole,
  Prisma,
} from '@prisma/client';

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function parsePagination(params?: PaginationParams, defaultPageSize = 20): {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
} {
  const rawPage = params?.page;
  const rawSize = params?.pageSize;

  const page = Number.isFinite(rawPage) && (rawPage as number) > 0 ? Math.floor(rawPage as number) : 1;
  const pageSize =
    Number.isFinite(rawSize) && (rawSize as number) > 0
      ? Math.min(100, Math.floor(rawSize as number))
      : defaultPageSize;

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

// ---------------------------------------------------------------------------
// 1. DASHBOARD & ANALYTICS
// ---------------------------------------------------------------------------

export async function getAdminDashboardMetrics() {
  const [
    totalOrders,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    customerCount,
    pendingPaymentCount,
    lowStockItems,
    revenueAgg,
    recentOrders,
    recentActivity,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { orderStatus: OrderStatus.PENDING } }),
    prisma.order.count({ where: { orderStatus: OrderStatus.DELIVERED } }),
    prisma.order.count({ where: { orderStatus: OrderStatus.CANCELLED } }),
    prisma.profile.count({ where: { role: UserRole.CUSTOMER } }),
    prisma.paymentProof.count({ where: { reviewStatus: PaymentStatus.UNDER_REVIEW } }),
    prisma.inventory.findMany({
      where: {
        stockQuantity: {
          lte: prisma.inventory.fields.lowStockThreshold,
        },
      },
      select: {
        id: true,
        stockQuantity: true,
        reservedQuantity: true,
        lowStockThreshold: true,
        product: { select: { id: true, name: true, sku: true } },
        variant: { select: { id: true, title: true, sku: true } },
      },
      take: 10,
    }),
    prisma.order.aggregate({
      where: {
        orderStatus: { notIn: [OrderStatus.CANCELLED, OrderStatus.RETURNED] },
        paymentStatus: { in: [PaymentStatus.VERIFIED, PaymentStatus.PENDING] },
      },
      _sum: {
        totalAmount: true,
      },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        orderNumber: true,
        orderStatus: true,
        paymentStatus: true,
        totalAmount: true,
        createdAt: true,
        profile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: { items: true },
        },
      },
    }),
    prisma.adminActivityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    }),
  ]);

  return {
    totalOrders,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    customerCount,
    pendingPaymentCount,
    lowStockCount: lowStockItems.length,
    lowStockItems,
    totalRevenue: Number(revenueAgg._sum.totalAmount || 0),
    recentOrders,
    recentActivity,
  };
}

export async function getAdminAnalytics() {
  const [ordersByStatus, paymentsByMethod, recentOrders] = await Promise.all([
    prisma.order.groupBy({
      by: ['orderStatus'],
      _count: { id: true },
      _sum: { totalAmount: true },
    }),
    prisma.payment.groupBy({
      by: ['paymentMethod', 'paymentStatus'],
      _count: { id: true },
      _sum: { amount: true },
    }),
    prisma.order.findMany({
      where: {
        orderStatus: { notIn: [OrderStatus.CANCELLED] },
      },
      select: {
        totalAmount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
  ]);

  // Aggregate revenue by month
  const monthlyRevenue: Record<string, { count: number; revenue: number }> = {};
  for (const o of recentOrders) {
    const monthKey = o.createdAt.toISOString().slice(0, 7); // YYYY-MM
    if (!monthlyRevenue[monthKey]) {
      monthlyRevenue[monthKey] = { count: 0, revenue: 0 };
    }
    monthlyRevenue[monthKey].count += 1;
    monthlyRevenue[monthKey].revenue += Number(o.totalAmount);
  }

  return {
    ordersByStatus: ordersByStatus.map((s) => ({
      status: s.orderStatus,
      count: s._count.id,
      revenue: Number(s._sum.totalAmount || 0),
    })),
    paymentsByMethod: paymentsByMethod.map((p) => ({
      method: p.paymentMethod,
      status: p.paymentStatus,
      count: p._count.id,
      amount: Number(p._sum.amount || 0),
    })),
    monthlyRevenue: Object.entries(monthlyRevenue).map(([month, data]) => ({
      month,
      count: data.count,
      revenue: data.revenue,
    })),
  };
}

// ---------------------------------------------------------------------------
// 2. PRODUCTS & CATEGORIES
// ---------------------------------------------------------------------------

export interface AdminProductFilterParams extends PaginationParams {
  search?: string;
  categoryId?: string;
  status?: ProductStatus;
}

export async function getAdminProducts(params?: AdminProductFilterParams) {
  const { page, pageSize, skip, take } = parsePagination(params);

  const where: Prisma.ProductWhereInput = {};

  if (params?.search && params.search.trim()) {
    const s = params.search.trim();
    where.OR = [
      { name: { contains: s, mode: 'insensitive' } },
      { sku: { contains: s, mode: 'insensitive' } },
    ];
  }

  if (params?.categoryId) {
    where.categoryId = params.categoryId;
  }

  if (params?.status) {
    where.status = params.status;
  }

  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        price: true,
        discountPrice: true,
        status: true,
        isFeatured: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        images: {
          orderBy: { displayOrder: 'asc' },
          take: 1,
          select: { imageUrl: true, altText: true },
        },
        inventory: {
          select: {
            stockQuantity: true,
            reservedQuantity: true,
            lowStockThreshold: true,
          },
        },
        _count: {
          select: { variants: true },
        },
      },
    }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function getAdminProductById(id: string) {
  return await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      images: { orderBy: { displayOrder: 'asc' } },
      variants: {
        orderBy: { createdAt: 'asc' },
        include: {
          inventory: true,
        },
      },
      inventory: {
        include: {
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { creator: { select: { firstName: true, lastName: true } } },
          },
        },
      },
    },
  });
}

export async function getAdminCategories() {
  return await prisma.category.findMany({
    orderBy: { displayOrder: 'asc' },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// 3. INVENTORY
// ---------------------------------------------------------------------------

export interface AdminInventoryFilterParams extends PaginationParams {
  search?: string;
  lowStockOnly?: boolean;
}

export async function getAdminInventory(params?: AdminInventoryFilterParams) {
  const { page, pageSize, skip, take } = parsePagination(params);

  const where: Prisma.InventoryWhereInput = {};

  if (params?.search && params.search.trim()) {
    const s = params.search.trim();
    where.OR = [
      { product: { name: { contains: s, mode: 'insensitive' } } },
      { product: { sku: { contains: s, mode: 'insensitive' } } },
      { variant: { title: { contains: s, mode: 'insensitive' } } },
      { variant: { sku: { contains: s, mode: 'insensitive' } } },
    ];
  }

  if (params?.lowStockOnly) {
    where.stockQuantity = {
      lte: prisma.inventory.fields.lowStockThreshold,
    };
  }

  const [total, items] = await Promise.all([
    prisma.inventory.count({ where }),
    prisma.inventory.findMany({
      where,
      skip,
      take,
      orderBy: { updatedAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            sku: true,
            status: true,
            images: {
              take: 1,
              orderBy: { displayOrder: 'asc' },
              select: { imageUrl: true },
            },
          },
        },
        variant: {
          select: {
            id: true,
            title: true,
            sku: true,
            isActive: true,
          },
        },
      },
    }),
  ]);

  return {
    items: items.map((inv) => ({
      id: inv.id,
      productId: inv.productId,
      variantId: inv.variantId,
      productTitle: inv.product.name,
      variantTitle: inv.variant?.title ?? null,
      sku: inv.variant?.sku || inv.product.sku,
      imageUrl: inv.product.images[0]?.imageUrl || null,
      stockQuantity: inv.stockQuantity,
      reservedQuantity: inv.reservedQuantity,
      availableQuantity: Math.max(0, inv.stockQuantity - inv.reservedQuantity),
      lowStockThreshold: inv.lowStockThreshold,
      isLowStock: inv.stockQuantity <= inv.lowStockThreshold,
      productStatus: inv.product.status,
      updatedAt: inv.updatedAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function getAdminInventoryTransactions(
  inventoryId?: string,
  params?: PaginationParams
) {
  const { page, pageSize, skip, take } = parsePagination(params);

  const where: Prisma.InventoryTransactionWhereInput = {};
  if (inventoryId) {
    where.inventoryId = inventoryId;
  }

  const [total, items] = await Promise.all([
    prisma.inventoryTransaction.count({ where }),
    prisma.inventoryTransaction.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        inventory: {
          select: {
            product: { select: { name: true, sku: true } },
            variant: { select: { title: true, sku: true } },
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

// ---------------------------------------------------------------------------
// 4. ORDERS & FULFILLMENT
// ---------------------------------------------------------------------------

export interface AdminOrderFilterParams extends PaginationParams {
  search?: string;
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
}

export async function getAdminOrders(params?: AdminOrderFilterParams) {
  const { page, pageSize, skip, take } = parsePagination(params);

  const where: Prisma.OrderWhereInput = {};

  if (params?.search && params.search.trim()) {
    const s = params.search.trim();
    where.OR = [
      { orderNumber: { contains: s, mode: 'insensitive' } },
      { profile: { firstName: { contains: s, mode: 'insensitive' } } },
      { profile: { lastName: { contains: s, mode: 'insensitive' } } },
    ];
  }

  if (params?.orderStatus) {
    where.orderStatus = params.orderStatus;
  }

  if (params?.paymentStatus) {
    where.paymentStatus = params.paymentStatus;
  }

  const [total, items] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        orderStatus: true,
        paymentStatus: true,
        totalAmount: true,
        createdAt: true,
        updatedAt: true,
        profile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        payment: {
          select: {
            paymentMethod: true,
            paymentStatus: true,
          },
        },
        shipment: {
          select: {
            carrierName: true,
            trackingNumber: true,
            shippingStatus: true,
          },
        },
        _count: {
          select: { items: true },
        },
      },
    }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function getAdminOrderDetail(orderId: string) {
  return await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      profile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          createdAt: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: { take: 1, select: { imageUrl: true } },
            },
          },
          variant: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
      payment: {
        include: {
          proof: {
            include: {
              verifier: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      },
      shipment: true,
      couponUsages: {
        include: {
          coupon: {
            select: {
              code: true,
              discountType: true,
              discountValue: true,
            },
          },
        },
      },
    },
  });
}

export async function getAdminPendingPaymentProofs() {
  return await prisma.paymentProof.findMany({
    where: { reviewStatus: PaymentStatus.UNDER_REVIEW },
    orderBy: { createdAt: 'desc' },
    include: {
      payment: {
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
              orderStatus: true,
              createdAt: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// 5. CUSTOMERS
// ---------------------------------------------------------------------------

export interface AdminCustomerFilterParams extends PaginationParams {
  search?: string;
  isActive?: boolean;
}

export async function getAdminCustomers(params?: AdminCustomerFilterParams) {
  const { page, pageSize, skip, take } = parsePagination(params);

  const where: Prisma.ProfileWhereInput = {
    role: UserRole.CUSTOMER,
  };

  if (params?.search && params.search.trim()) {
    const s = params.search.trim();
    where.OR = [
      { firstName: { contains: s, mode: 'insensitive' } },
      { lastName: { contains: s, mode: 'insensitive' } },
      { phone: { contains: s, mode: 'insensitive' } },
    ];
  }

  if (typeof params?.isActive === 'boolean') {
    where.isActive = params.isActive;
  }

  const [total, items] = await Promise.all([
    prisma.profile.count({ where }),
    prisma.profile.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            orders: true,
            reviews: true,
          },
        },
        orders: {
          where: {
            orderStatus: { notIn: [OrderStatus.CANCELLED] },
          },
          select: {
            totalAmount: true,
          },
        },
      },
    }),
  ]);

  return {
    items: items.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone,
      isActive: c.isActive,
      createdAt: c.createdAt,
      ordersCount: c._count.orders,
      reviewsCount: c._count.reviews,
      totalSpent: c.orders.reduce((acc, curr) => acc + Number(curr.totalAmount), 0),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function getAdminCustomerDetail(customerId: string) {
  return await prisma.profile.findUnique({
    where: { id: customerId },
    include: {
      addresses: {
        orderBy: { isDefault: 'desc' },
      },
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          orderNumber: true,
          orderStatus: true,
          paymentStatus: true,
          totalAmount: true,
          createdAt: true,
          _count: { select: { items: true } },
        },
      },
      reviews: {
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { name: true, slug: true } },
        },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// 6. ROLES & GOVERNANCE
// ---------------------------------------------------------------------------

export async function getAdminUsers() {
  return await prisma.profile.findMany({
    where: {
      role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
    },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          adminLogs: true,
        },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// 7. REVIEWS MODERATION
// ---------------------------------------------------------------------------

export interface AdminReviewFilterParams extends PaginationParams {
  status?: ReviewStatus;
  rating?: number;
}

export async function getAdminReviews(params?: AdminReviewFilterParams) {
  const { page, pageSize, skip, take } = parsePagination(params);

  const where: Prisma.ReviewWhereInput = {};
  if (params?.status) {
    where.status = params.status;
  }
  if (params?.rating && params.rating >= 1 && params.rating <= 5) {
    where.rating = params.rating;
  }

  const [total, items] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: { take: 1, select: { imageUrl: true } },
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

// ---------------------------------------------------------------------------
// 8. COUPONS
// ---------------------------------------------------------------------------

export interface AdminCouponFilterParams extends PaginationParams {
  search?: string;
  isActive?: boolean;
}

export async function getAdminCoupons(params?: AdminCouponFilterParams) {
  const { page, pageSize, skip, take } = parsePagination(params);

  const where: Prisma.CouponWhereInput = {};
  if (params?.search && params.search.trim()) {
    where.code = { contains: params.search.trim().toUpperCase() };
  }
  if (typeof params?.isActive === 'boolean') {
    where.isActive = params.isActive;
  }

  const [total, items] = await Promise.all([
    prisma.coupon.count({ where }),
    prisma.coupon.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { usages: true },
        },
      },
    }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

// ---------------------------------------------------------------------------
// 9. NOTIFICATIONS & BROADCASTS
// ---------------------------------------------------------------------------

export async function getAdminNotifications(params?: PaginationParams) {
  const { page, pageSize, skip, take } = parsePagination(params);

  const [total, items] = await Promise.all([
    prisma.notification.count(),
    prisma.notification.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        profile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

// ---------------------------------------------------------------------------
// 10. ADMIN ACTIVITY AUDIT LOGS
// ---------------------------------------------------------------------------

export interface AdminActivityFilterParams extends PaginationParams {
  action?: string;
  entity?: string;
}

export async function getAdminActivityLogs(params?: AdminActivityFilterParams) {
  const { page, pageSize, skip, take } = parsePagination(params);

  const where: Prisma.AdminActivityLogWhereInput = {};
  if (params?.action && params.action.trim()) {
    where.action = { contains: params.action.trim(), mode: 'insensitive' };
  }
  if (params?.entity && params.entity.trim()) {
    where.entity = { contains: params.entity.trim(), mode: 'insensitive' };
  }

  const [total, items] = await Promise.all([
    prisma.adminActivityLog.count({ where }),
    prisma.adminActivityLog.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}
