'use server';

import prisma from '@/lib/db';
import { requireCustomer } from '@/lib/auth/session';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
  DiscountType,
  InventoryTxType,
} from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { sendEmail, buildOrderPlacedEmail } from '@/lib/email';
import { logger } from '@/lib/observability/logger';
import { getPublicUpiConfig } from '@/lib/env';

const CheckoutInputSchema = z.object({
  shippingAddressId: z.string().uuid('Please select a valid delivery address.'),
  billingAddressId: z.string().uuid().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  couponCode: z.string().max(50).optional().nullable(),
  customerNotes: z.string().max(500).optional().nullable(),
  manualUpiTxRef: z.string().max(100).optional().nullable(),
});

export type CheckoutInput = z.infer<typeof CheckoutInputSchema>;

export interface CheckoutResult {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  error?: string;
}

const FREE_SHIPPING_THRESHOLD = 999;
const STANDARD_SHIPPING_FEE = 99;

/**
 * Generates an authentic human-readable unique order number.
 * Format: MG-YYYYMMDD-XXXX (e.g. MG-20260919-AB82)
 */
function generateOrderNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MG-${dateStr}-${randomSuffix}`;
}

/**
 * Executes a server-authoritative, atomic checkout transaction.
 * 
 * Invariants enforced:
 * - Customer identity derived exclusively from server session
 * - Complete price and stock recalculation from database state
 * - Strict inventory reservation semantics
 * - Idempotent, atomic transaction via prisma.$transaction
 * - Cart cleared only on successful order creation
 * - Customer notification created automatically
 */
export async function processCheckout(rawInput: CheckoutInput): Promise<CheckoutResult> {
  try {
    const authUser = await requireCustomer();
    const validated = CheckoutInputSchema.parse(rawInput);

    // Guardrail 11: Manual UPI configuration check
    const configuredUpiId = getPublicUpiConfig().upiId;
    if (validated.paymentMethod === PaymentMethod.MANUAL_UPI && !configuredUpiId) {
      return {
        success: false,
        error: 'UPI payment configuration pending — please select Cash on Delivery or contact support.',
      };
    }

    // 1. Verify shipping and billing addresses belong to authenticated customer
    const shippingAddress = await prisma.address.findUnique({
      where: { id: validated.shippingAddressId },
    });

    if (!shippingAddress || shippingAddress.userId !== authUser.id) {
      return { success: false, error: 'Selected delivery address is invalid or does not belong to you.' };
    }

    let billingAddress = shippingAddress;
    if (validated.billingAddressId && validated.billingAddressId !== validated.shippingAddressId) {
      const bAddr = await prisma.address.findUnique({
        where: { id: validated.billingAddressId },
      });
      if (bAddr && bAddr.userId === authUser.id) {
        billingAddress = bAddr;
      }
    }

    const shippingSnapshot = {
      fullName: shippingAddress.fullName,
      phone: shippingAddress.phone,
      addressLine1: shippingAddress.addressLine1,
      addressLine2: shippingAddress.addressLine2,
      landmark: shippingAddress.landmark,
      city: shippingAddress.city,
      state: shippingAddress.state,
      postalCode: shippingAddress.postalCode,
      country: shippingAddress.country,
    };

    const billingSnapshot = {
      fullName: billingAddress.fullName,
      phone: billingAddress.phone,
      addressLine1: billingAddress.addressLine1,
      addressLine2: billingAddress.addressLine2,
      landmark: billingAddress.landmark,
      city: billingAddress.city,
      state: billingAddress.state,
      postalCode: billingAddress.postalCode,
      country: billingAddress.country,
    };

    // 2. Load customer's cart
    const cart = await prisma.cart.findUnique({
      where: { userId: authUser.id },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return { success: false, error: 'Your cart is empty. Please add items before checking out.' };
    }

    // 3. Perform atomic order transaction
    const orderNumber = generateOrderNumber();
    const orderItemsData: {
      productId: string;
      variantId: string | null;
      productNameSnapshot: string;
      skuSnapshot: string;
      unitPrice: number;
      quantity: number;
      totalPrice: number;
    }[] = [];

    const createdOrder = await prisma.$transaction(async (tx) => {
      let subtotal = 0;

      // A. Verify and reserve inventory for each item
      for (const item of cart.items) {
        if (item.product.status !== ProductStatus.PUBLISHED) {
          throw new Error(`Product "${item.product.name}" is no longer available.`);
        }

        if (item.variantId) {
          if (!item.variant || item.variant.productId !== item.productId || !item.variant.isActive) {
            throw new Error(`A selected variant for "${item.product.name}" is invalid or discontinued.`);
          }
        }

        // Determine authoritative price
        let authoritativeUnitPrice = Number(item.product.price);
        if (item.variant?.priceOverride) {
          authoritativeUnitPrice = Number(item.variant.priceOverride);
        } else if (item.product.discountPrice) {
          authoritativeUnitPrice = Number(item.product.discountPrice);
        }

        const lineTotal = authoritativeUnitPrice * item.quantity;
        subtotal += lineTotal;

        // Query and verify real inventory
        const inv = await tx.inventory.findFirst({
          where: {
            productId: item.productId,
            variantId: item.variantId ?? null,
          },
        });

        if (!inv) {
          throw new Error(`Inventory record not found for "${item.product.name}".`);
        }

        const available = inv.stockQuantity - inv.reservedQuantity;
        if (available < item.quantity) {
          throw new Error(
            `Insufficient stock for "${item.product.name}"${
              item.variant ? ` (${item.variant.title})` : ''
            }. Available: ${available}, Requested: ${item.quantity}.`
          );
        }

        // Atomically reserve only if stock is still available at write time (concurrency protection)
        const updateRes = await tx.$executeRaw`
          UPDATE "inventory"
          SET "reserved_quantity" = "reserved_quantity" + ${item.quantity}
          WHERE "id" = ${inv.id}::uuid
            AND "stock_quantity" - "reserved_quantity" >= ${item.quantity}
        `;

        if (updateRes === 0) {
          throw new Error(
            `Insufficient stock for "${item.product.name}" due to a concurrent purchase. Please review your cart.`
          );
        }

        // Record inventory reservation transaction
        await tx.inventoryTransaction.create({
          data: {
            inventoryId: inv.id,
            transactionType: InventoryTxType.ORDER_RESERVED,
            quantityDelta: -item.quantity,
            referenceId: orderNumber,
            notes: `Inventory reserved for order ${orderNumber}`,
            createdBy: authUser.id,
          },
        });

        orderItemsData.push({
          productId: item.productId,
          variantId: item.variantId,
          productNameSnapshot: item.product.name,
          skuSnapshot: item.variant?.sku || item.product.sku,
          unitPrice: authoritativeUnitPrice,
          quantity: item.quantity,
          totalPrice: lineTotal,
        });
      }

      // B. Authoritative Coupon Verification
      let discountAmount = 0;
      let appliedCoupon: any = null;

      if (validated.couponCode && validated.couponCode.trim()) {
        const code = validated.couponCode.trim().toUpperCase();
        const coupon = await tx.coupon.findUnique({ where: { code } });

        if (!coupon || !coupon.isActive) {
          throw new Error('The coupon code is invalid or no longer active. Please remove it and try again.');
        }

        const now = new Date();
        const isValidDate = now >= coupon.startDate && now <= coupon.expiryDate;
        if (!isValidDate) {
          throw new Error('This coupon has expired or is not yet valid.');
        }

        const meetsMinOrder = subtotal >= Number(coupon.minOrderAmount);
        if (!meetsMinOrder) {
          throw new Error(
            `Minimum order amount of ₹${Number(coupon.minOrderAmount).toLocaleString('en-IN')} required to use this coupon.`
          );
        }

        const underGlobalLimit =
          coupon.totalUsageLimit === null || coupon.usedCount < coupon.totalUsageLimit;
        if (!underGlobalLimit) {
          throw new Error('This coupon has reached its maximum global usage limit.');
        }

        const userUsageCount = await tx.couponUsage.count({
          where: { couponId: coupon.id, userId: authUser.id },
        });
        const underUserLimit = userUsageCount < coupon.perUserLimit;
        if (!underUserLimit) {
          throw new Error(`You have already used this coupon the maximum allowed times (${coupon.perUserLimit}).`);
        }

        const discVal = Number(coupon.discountValue);
        if (coupon.discountType === DiscountType.PERCENTAGE) {
          discountAmount = (subtotal * discVal) / 100;
          if (coupon.maxDiscountAmount !== null) {
            discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountAmount));
          }
        } else {
          discountAmount = discVal;
        }
        discountAmount = Math.min(discountAmount, subtotal);
        discountAmount = Math.round(discountAmount * 100) / 100;
        appliedCoupon = coupon;
      }

      // C. Shipping calculation
      const qualifiesForFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
      const shippingFee = qualifiesForFreeShipping ? 0 : STANDARD_SHIPPING_FEE;
      const totalAmount = Math.max(0, subtotal - discountAmount + shippingFee);

      // D. Create Order record
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: authUser.id,
          orderStatus: OrderStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PENDING,
          subtotal,
          discountAmount,
          shippingFee,
          totalAmount,
          shippingAddressSnapshot: shippingSnapshot,
          billingAddressSnapshot: billingSnapshot,
          customerNotes: validated.customerNotes?.trim() || null,
          items: {
            create: orderItemsData.map((oi) => ({
              productId: oi.productId,
              variantId: oi.variantId,
              productNameSnapshot: oi.productNameSnapshot,
              skuSnapshot: oi.skuSnapshot,
              unitPrice: oi.unitPrice,
              quantity: oi.quantity,
              totalPrice: oi.totalPrice,
            })),
          },
          payment: {
            create: {
              paymentMethod: validated.paymentMethod,
              paymentStatus: PaymentStatus.PENDING,
              amount: totalAmount,
              transactionRef: validated.manualUpiTxRef?.trim() || null,
            },
          },
          shipment: {
            create: {
              carrierName: 'Manual / Local Courier',
              shippingStatus: 'PENDING',
            },
          },
        },
      });

      // E. If coupon used, record usage and increment count
      if (appliedCoupon && discountAmount > 0) {
        await tx.couponUsage.create({
          data: {
            couponId: appliedCoupon.id,
            userId: authUser.id,
            orderId: order.id,
            discountApplied: discountAmount,
          },
        });

        await tx.coupon.update({
          where: { id: appliedCoupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      // F. Clear customer cart items
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      // G. Create notification for customer
      await tx.notification.create({
        data: {
          userId: authUser.id,
          title: 'Order Confirmed!',
          message: `Your order #${orderNumber} for ₹${totalAmount.toLocaleString(
            'en-IN'
          )} has been placed successfully.`,
          linkUrl: `/orders/${order.id}`,
        },
      });

      return order;
    }, { timeout: 30000, maxWait: 15000 });

    // Asynchronous observable transactional email dispatch (never rolls back transaction)
    sendEmail(
      buildOrderPlacedEmail({
        orderNumber: createdOrder.orderNumber,
        orderId: createdOrder.id,
        customerName: `${authUser.firstName} ${authUser.lastName}`.trim() || 'Valued Customer',
        customerEmail: authUser.email,
        totalAmount: Number(createdOrder.totalAmount),
        paymentMethod: validated.paymentMethod,
        items: orderItemsData.map((oi) => ({
          productName: oi.productNameSnapshot,
          quantity: oi.quantity,
          totalPrice: oi.totalPrice,
        })),
        shippingAddress: {
          addressLine1: shippingSnapshot.addressLine1,
          city: shippingSnapshot.city,
          state: shippingSnapshot.state,
          postalCode: shippingSnapshot.postalCode,
        },
      })
    ).catch((err) => {
      logger.error('Checkout', 'Non-blocking email delivery failure during checkout', {
        orderId: createdOrder.id,
        error: err?.message,
      });
    });

    revalidatePath('/cart');
    revalidatePath('/account/orders');
    revalidatePath('/orders');

    return {
      success: true,
      orderId: createdOrder.id,
      orderNumber: createdOrder.orderNumber,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Checkout failed. Please review your cart and try again.',
    };
  }
}
