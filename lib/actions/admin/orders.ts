'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth/guards';
import { OrderStatus, PaymentStatus, ShippingStatus, InventoryTxType } from '@prisma/client';
import { recordAdminActivity } from './audit';
import { logger } from '@/lib/observability/logger';
import { sendEmail, getCustomerContact, buildShipmentDispatchedEmail } from '@/lib/email';

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.PACKED, OrderStatus.CANCELLED],
  [OrderStatus.PACKED]: [OrderStatus.SHIPPED],
  [OrderStatus.SHIPPED]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [OrderStatus.RETURNED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.RETURNED]: [],
};

const UpdateOrderStatusSchema = z.object({
  orderId: z.string().uuid('Valid order ID required'),
  newStatus: z.nativeEnum(OrderStatus),
  notes: z.string().max(500).optional(),
});

const UpdateShipmentSchema = z.object({
  orderId: z.string().uuid('Valid order ID required'),
  carrierName: z.string().min(2).max(100),
  trackingNumber: z.string().max(100).optional().nullable(),
  trackingUrl: z.string().url('Tracking URL must be valid').optional().nullable(),
  shippingStatus: z.nativeEnum(ShippingStatus).default(ShippingStatus.SHIPPED),
  estimatedDelivery: z.string().optional().nullable(),
});

/**
 * Updates order status with strict state machine validation and atomic inventory management.
 */
export async function updateOrderStatusAction(rawInput: unknown) {
  const admin = await requireAdmin();
  const parsed = UpdateOrderStatusSchema.safeParse(rawInput);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { orderId, newStatus, notes } = parsed.data;

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payment: true,
      },
    });

    if (!order) {
      return { success: false, error: 'Order not found.' };
    }

    const currentStatus = order.orderStatus;
    const allowedNext = VALID_TRANSITIONS[currentStatus];

    if (!allowedNext.includes(newStatus)) {
      return {
        success: false,
        error: `Invalid status jump: Cannot transition order from ${currentStatus} to ${newStatus}.`,
      };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Claim transition atomically
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          orderStatus: newStatus,
          // If cancelled and payment was pending, mark failed
          paymentStatus:
            newStatus === OrderStatus.CANCELLED && order.paymentStatus === PaymentStatus.PENDING
              ? PaymentStatus.FAILED
              : order.paymentStatus,
        },
      });

      // 2. Handle inventory adjustments based on transition
      if (newStatus === OrderStatus.CANCELLED) {
        // Release reserved inventory
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
                notes: `Admin cancelled order: ${notes || 'Administrative action'}`,
                createdBy: admin.id,
              },
            });
          }
        }
      } else if (newStatus === OrderStatus.DELIVERED) {
        // Fulfill reserved inventory (decrement both stock and reserved)
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
                stockQuantity: {
                  decrement: Math.min(inv.stockQuantity, item.quantity),
                },
                reservedQuantity: {
                  decrement: Math.min(inv.reservedQuantity, item.quantity),
                },
              },
            });

            await tx.inventoryTransaction.create({
              data: {
                inventoryId: inv.id,
                transactionType: InventoryTxType.ORDER_FULFILLED,
                quantityDelta: -item.quantity,
                referenceId: order.orderNumber,
                notes: `Order delivered and fulfilled #${order.orderNumber}`,
                createdBy: admin.id,
              },
            });
          }
        }
      }

      // 3. Notify customer of status change
      await tx.notification.create({
        data: {
          userId: order.userId,
          title: `Order #${order.orderNumber} Status Update`,
          message: `Your order status has changed to ${newStatus.replace(/_/g, ' ')}.`,
          linkUrl: `/orders/${order.id}`,
        },
      });

      return updatedOrder;
    }, { timeout: 30000, maxWait: 15000 });

    // 4. Record privileged administrative activity
    await recordAdminActivity({
      actorId: admin.id,
      action: 'ORDER_STATUS_UPDATED',
      entity: 'Order',
      entityId: orderId,
      oldValues: { orderStatus: currentStatus },
      newValues: { orderStatus: newStatus, notes },
    });

    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath('/admin/inventory');
    revalidatePath('/admin');
    revalidatePath('/admin/dashboard');

    return { success: true, newStatus };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to update order status.',
    };
  }
}

/**
 * Updates or creates shipment and courier tracking details for an order.
 */
export async function updateShipmentTrackingAction(rawInput: unknown) {
  const admin = await requireAdmin();
  const parsed = UpdateShipmentSchema.safeParse(rawInput);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { orderId, carrierName, trackingNumber, trackingUrl, shippingStatus, estimatedDelivery } =
    parsed.data;

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { shipment: true },
    });

    if (!order) {
      return { success: false, error: 'Order not found.' };
    }

    const estDate = estimatedDelivery ? new Date(estimatedDelivery) : null;

    const shipment = await prisma.shipment.upsert({
      where: { orderId },
      update: {
        carrierName,
        trackingNumber: trackingNumber ?? null,
        trackingUrl: trackingUrl ?? null,
        shippingStatus,
        estimatedDelivery: estDate,
        shippedAt:
          shippingStatus === ShippingStatus.SHIPPED || shippingStatus === ShippingStatus.IN_TRANSIT
            ? new Date()
            : undefined,
      },
      create: {
        orderId,
        carrierName,
        trackingNumber: trackingNumber ?? null,
        trackingUrl: trackingUrl ?? null,
        shippingStatus,
        estimatedDelivery: estDate,
        shippedAt:
          shippingStatus === ShippingStatus.SHIPPED || shippingStatus === ShippingStatus.IN_TRANSIT
            ? new Date()
            : null,
      },
    });

    // If shipment is dispatched and order was PACKED, advance to SHIPPED
    if (
      (shippingStatus === ShippingStatus.SHIPPED || shippingStatus === ShippingStatus.IN_TRANSIT) &&
      order.orderStatus === OrderStatus.PACKED
    ) {
      await prisma.order.update({
        where: { id: orderId },
        data: { orderStatus: OrderStatus.SHIPPED },
      });
    }

    // Notify customer
    await prisma.notification.create({
      data: {
        userId: order.userId,
        title: `Shipment Update for Order #${order.orderNumber}`,
        message: `Your package is with ${carrierName}. ${
          trackingNumber ? `Tracking #: ${trackingNumber}` : ''
        }`,
        linkUrl: `/orders/${order.id}`,
      },
    });

    await recordAdminActivity({
      actorId: admin.id,
      action: 'SHIPMENT_UPDATED',
      entity: 'Shipment',
      entityId: shipment.id,
      newValues: { orderId, carrierName, trackingNumber, shippingStatus },
    });

    // Asynchronous observable customer email notification if shipment is dispatched
    if (shippingStatus === ShippingStatus.SHIPPED || shippingStatus === ShippingStatus.IN_TRANSIT) {
      getCustomerContact(order.userId)
        .then((contact) => {
          if (contact) {
            sendEmail(
              buildShipmentDispatchedEmail(
                {
                  orderNumber: order.orderNumber,
                  orderId: order.id,
                  customerName: contact.name,
                  customerEmail: contact.email,
                  totalAmount: Number(order.totalAmount),
                  paymentMethod: order.paymentStatus,
                },
                {
                  carrierName: shipment.carrierName,
                  trackingNumber: shipment.trackingNumber,
                  trackingUrl: shipment.trackingUrl,
                }
              )
            ).catch((err) => {
              logger.error('AdminOrders', 'Non-blocking email delivery failure after shipment dispatch', {
                orderId: order.id,
                error: err?.message,
              });
            });
          }
        })
        .catch((err) => {
          logger.error('AdminOrders', 'Failed to retrieve contact for shipment email', {
            orderId: order.id,
            error: err?.message,
          });
        });
    }

    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${orderId}`);

    return {
      success: true,
      shipment: {
        id: shipment.id,
        orderId: shipment.orderId,
        carrierName: shipment.carrierName,
        trackingNumber: shipment.trackingNumber,
        trackingUrl: shipment.trackingUrl,
        shippingStatus: shipment.shippingStatus,
        estimatedDelivery: shipment.estimatedDelivery?.toISOString() ?? null,
        shippedAt: shipment.shippedAt?.toISOString() ?? null,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to update shipment details.',
    };
  }
}
