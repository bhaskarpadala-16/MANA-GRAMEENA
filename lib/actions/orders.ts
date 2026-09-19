'use server';

import prisma from '@/lib/db';
import { requireCustomer } from '@/lib/auth/session';
import { OrderStatus, PaymentStatus, PaymentMethod, InventoryTxType } from '@prisma/client';
import { z } from 'zod';
import { uploadPaymentProofScreenshot, AllowedMimeType, ALLOWED_MIME_TYPES } from '@/lib/storage';
import { logger } from '@/lib/observability/logger';
import { sendEmail, buildPaymentProofReceivedEmail } from '@/lib/email';
import { revalidatePath } from 'next/cache';

export interface OrderListItemDto {
  id: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  itemsCount: number;
  createdAt: Date;
  items: {
    id: string;
    productName: string;
    variantTitle: string | null;
    quantity: number;
    totalPrice: number;
  }[];
}

export interface OrderDetailDto {
  id: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  totalAmount: number;
  shippingAddress: any;
  billingAddress: any;
  customerNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  payment: {
    paymentMethod: string;
    paymentStatus: string;
    amount: number;
    transactionRef: string | null;
  } | null;
  shipment: {
    carrierName: string;
    trackingNumber: string | null;
    trackingUrl: string | null;
    shippingStatus: string;
    estimatedDelivery: Date | null;
    shippedAt: Date | null;
    deliveredAt: Date | null;
  } | null;
  items: {
    id: string;
    productId: string;
    variantId: string | null;
    productName: string;
    sku: string;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
  }[];
  couponUsage: {
    code: string;
    discountApplied: number;
  } | null;
  paymentProof: {
    id: string;
    transactionReferenceId: string;
    reviewStatus: string;
    adminNotes: string | null;
    createdAt: Date;
  } | null;
}

/**
 * Retrieves paginated orders for the authenticated customer.
 * Strict IDOR prevention: scoped to authUser.id.
 */
export async function getUserOrders(
  limit = 20,
  page = 1
): Promise<{ orders: OrderListItemDto[]; totalCount: number }> {
  const authUser = await requireCustomer();
  const skip = (page - 1) * limit;

  const [totalCount, rawOrders] = await Promise.all([
    prisma.order.count({ where: { userId: authUser.id } }),
    prisma.order.findMany({
      where: { userId: authUser.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        items: {
          select: {
            id: true,
            productNameSnapshot: true,
            unitPrice: true,
            quantity: true,
            totalPrice: true,
            variant: { select: { title: true } },
          },
        },
      },
    }),
  ]);

  const orders: OrderListItemDto[] = rawOrders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    orderStatus: o.orderStatus,
    paymentStatus: o.paymentStatus,
    totalAmount: Number(o.totalAmount),
    itemsCount: o.items.reduce((sum, item) => sum + item.quantity, 0),
    createdAt: o.createdAt,
    items: o.items.map((i) => ({
      id: i.id,
      productName: i.productNameSnapshot,
      variantTitle: i.variant?.title || null,
      quantity: i.quantity,
      totalPrice: Number(i.totalPrice),
    })),
  }));

  return { orders, totalCount };
}

/**
 * Retrieves full order detail by ID.
 * Strict IDOR protection: returns null if order does not belong to authenticated customer.
 */
export async function getOrderDetailById(orderId: string): Promise<OrderDetailDto | null> {
  const authUser = await requireCustomer();

  const o = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      payment: {
        include: { proof: true },
      },
      shipment: true,
      couponUsages: {
        include: { coupon: { select: { code: true } } },
      },
    },
  });

  if (!o || o.userId !== authUser.id) {
    return null;
  }

  return {
    id: o.id,
    orderNumber: o.orderNumber,
    orderStatus: o.orderStatus,
    paymentStatus: o.paymentStatus,
    subtotal: Number(o.subtotal),
    discountAmount: Number(o.discountAmount),
    shippingFee: Number(o.shippingFee),
    totalAmount: Number(o.totalAmount),
    shippingAddress: o.shippingAddressSnapshot,
    billingAddress: o.billingAddressSnapshot,
    customerNotes: o.customerNotes,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    payment: o.payment
      ? {
          paymentMethod: o.payment.paymentMethod,
          paymentStatus: o.payment.paymentStatus,
          amount: Number(o.payment.amount),
          transactionRef: o.payment.transactionRef,
        }
      : null,
    shipment: o.shipment
      ? {
          carrierName: o.shipment.carrierName,
          trackingNumber: o.shipment.trackingNumber,
          trackingUrl: o.shipment.trackingUrl,
          shippingStatus: o.shipment.shippingStatus,
          estimatedDelivery: o.shipment.estimatedDelivery,
          shippedAt: o.shipment.shippedAt,
          deliveredAt: o.shipment.deliveredAt,
        }
      : null,
    items: o.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productNameSnapshot,
      sku: item.skuSnapshot,
      unitPrice: Number(item.unitPrice),
      quantity: item.quantity,
      totalPrice: Number(item.totalPrice),
    })),
    couponUsage: o.couponUsages[0]
      ? {
          code: o.couponUsages[0].coupon.code,
          discountApplied: Number(o.couponUsages[0].discountApplied),
        }
      : null,
    paymentProof: o.payment?.proof
      ? {
          id: o.payment.proof.id,
          transactionReferenceId: o.payment.proof.transactionReferenceId,
          reviewStatus: o.payment.proof.reviewStatus,
          adminNotes: o.payment.proof.adminNotes,
          createdAt: o.payment.proof.createdAt,
        }
      : null,
  };
}

/**
 * Allows a customer to cancel an order if it is still PENDING or CONFIRMED.
 * Safely restores inventory reservations atomically and records inventory transactions.
 */
export async function cancelCustomerOrder(
  orderId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const authUser = await requireCustomer();

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order || order.userId !== authUser.id) {
      return { success: false, error: 'Order not found or unauthorized.' };
    }

    if (order.orderStatus !== OrderStatus.PENDING && order.orderStatus !== OrderStatus.CONFIRMED) {
      return {
        success: false,
        error: `Order cannot be cancelled in its current status (${order.orderStatus}).`,
      };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Claim the cancellation atomically before releasing inventory
      const claimed = await tx.order.updateMany({
        where: {
          id: order.id,
          userId: authUser.id,
          orderStatus: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED] },
        },
        data: {
          orderStatus: OrderStatus.CANCELLED,
          paymentStatus:
            order.paymentStatus === PaymentStatus.PENDING
              ? PaymentStatus.FAILED
              : order.paymentStatus,
        },
      });

      if (claimed.count === 0) {
        throw new Error('Order cannot be cancelled in its current status or has already been cancelled.');
      }

      // 2. Release reserved inventory for all items in order
      for (const item of order.items) {
        const inv = await tx.inventory.findFirst({
          where: {
            productId: item.productId,
            variantId: item.variantId ?? null,
          },
        });

        if (inv) {
          await tx.inventory.update({
            where: { id: inv.id },
            data: {
              reservedQuantity: {
                decrement: Math.min(inv.reservedQuantity, item.quantity),
              },
            },
          });

          await tx.inventoryTransaction.create({
            data: {
              inventoryId: inv.id,
              transactionType: InventoryTxType.ORDER_CANCELLED,
              quantityDelta: item.quantity,
              referenceId: order.orderNumber,
              notes: `Order cancelled by customer: ${reason || 'Customer request'}`,
              createdBy: authUser.id,
            },
          });
        }
      }

      // 3. Create customer cancellation notification
      await tx.notification.create({
        data: {
          userId: authUser.id,
          title: 'Order Cancelled',
          message: `Your order #${order.orderNumber} has been successfully cancelled.`,
          linkUrl: `/orders/${order.id}`,
        },
      });
    }, { timeout: 30000, maxWait: 15000 });

    revalidatePath(`/orders/${orderId}`);
    revalidatePath('/account/orders');

    return { success: true };
  } catch {
    return { success: false, error: 'Unable to cancel order. Please contact customer support.' };
  }
}

const SubmitProofInputSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  transactionReferenceId: z
    .string()
    .min(3, 'Transaction reference must be at least 3 characters')
    .max(100, 'Transaction reference cannot exceed 100 characters')
    .trim(),
});

/**
 * Allows a customer to submit their UPI payment proof screenshot and UTR reference.
 * Uploads screenshot to private Supabase Storage and records payment proof for admin review.
 */
export async function submitPaymentProofAction(formData: FormData): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const authUser = await requireCustomer();

    const orderId = formData.get('orderId');
    const transactionReferenceId = formData.get('transactionReferenceId');
    const file = formData.get('screenshot') as File | null;

    const parsed = SubmitProofInputSchema.safeParse({
      orderId,
      transactionReferenceId,
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    if (!file || !(file instanceof File) || file.size === 0) {
      return { success: false, error: 'A screenshot image of the transfer is required.' };
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type as AllowedMimeType)) {
      return {
        success: false,
        error: 'Invalid file format. Only JPG, PNG, and WebP images are accepted.',
      };
    }

    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'Image size exceeds the 5MB maximum limit.' };
    }

    // Verify order ownership and status
    const order = await prisma.order.findUnique({
      where: { id: parsed.data.orderId },
      include: {
        payment: {
          include: { proof: true },
        },
      },
    });

    if (!order || order.userId !== authUser.id) {
      return { success: false, error: 'Order not found or unauthorized.' };
    }

    if (!order.payment || order.payment.paymentMethod !== PaymentMethod.MANUAL_UPI) {
      return { success: false, error: 'This order does not use Manual UPI payment.' };
    }

    if (order.payment.paymentStatus === PaymentStatus.VERIFIED) {
      return { success: false, error: 'This order payment has already been verified.' };
    }

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const fileExt = file.name.split('.').pop() || 'jpg';

    // Upload to private Supabase Storage
    const uploadResult = await uploadPaymentProofScreenshot({
      userId: authUser.id,
      orderId: order.id,
      fileBuffer,
      mimeType: file.type as AllowedMimeType,
      fileExtension: fileExt,
    });

    if (!uploadResult.success || !uploadResult.storagePath) {
      return {
        success: false,
        error: uploadResult.error || 'Failed to upload screenshot. Please try again.',
      };
    }

    // Atomically upsert payment proof and update payment transaction reference
    await prisma.$transaction(async (tx) => {
      // Upsert PaymentProof record
      await tx.paymentProof.upsert({
        where: { paymentId: order.payment!.id },
        update: {
          screenshotStoragePath: uploadResult.storagePath!,
          transactionReferenceId: parsed.data.transactionReferenceId,
          reviewStatus: PaymentStatus.UNDER_REVIEW,
          adminNotes: null,
          verifiedBy: null,
          verifiedAt: null,
        },
        create: {
          paymentId: order.payment!.id,
          userId: authUser.id,
          screenshotStoragePath: uploadResult.storagePath!,
          transactionReferenceId: parsed.data.transactionReferenceId,
          reviewStatus: PaymentStatus.UNDER_REVIEW,
        },
      });

      // Update payment record with reference
      await tx.payment.update({
        where: { id: order.payment!.id },
        data: {
          transactionRef: parsed.data.transactionReferenceId,
          paymentStatus: PaymentStatus.PENDING,
        },
      });

      // Notify customer
      await tx.notification.create({
        data: {
          userId: authUser.id,
          title: `UPI Payment Proof Submitted for Order #${order.orderNumber}`,
          message: `Your payment reference (${parsed.data.transactionReferenceId}) and screenshot have been received and are now under administrative review.`,
          linkUrl: `/orders/${order.id}`,
        },
      });
    }, { timeout: 20000, maxWait: 10000 });

    logger.info('Orders', 'Payment proof submitted successfully', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      userId: authUser.id,
    });

    // Asynchronous observable transactional email dispatch (never rolls back transaction)
    sendEmail(
      buildPaymentProofReceivedEmail(
        {
          orderNumber: order.orderNumber,
          orderId: order.id,
          customerName: `${authUser.firstName} ${authUser.lastName}`.trim() || 'Valued Customer',
          customerEmail: authUser.email,
          totalAmount: Number(order.totalAmount),
          paymentMethod: PaymentMethod.MANUAL_UPI,
        },
        parsed.data.transactionReferenceId
      )
    ).catch((err) => {
      logger.error('Orders', 'Non-blocking email delivery failure after payment proof submission', {
        orderId: order.id,
        error: err?.message,
      });
    });

    revalidatePath(`/orders/${order.id}`);
    revalidatePath('/admin/orders/payments');

    return {
      success: true,
      message: 'Payment proof submitted successfully. Our team will review your transfer shortly.',
    };
  } catch (error: any) {
    logger.error('Orders', 'Failed to submit payment proof', { error: error?.message });
    return {
      success: false,
      error: 'An unexpected error occurred while submitting your payment proof. Please try again.',
    };
  }
}

