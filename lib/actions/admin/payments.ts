'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth/guards';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { recordAdminActivity } from './audit';
import { getSignedPaymentProofUrl } from '@/lib/storage';
import { logger } from '@/lib/observability/logger';
import {
  sendEmail,
  getCustomerContact,
  buildPaymentApprovedEmail,
  buildPaymentRejectedEmail,
} from '@/lib/email';

const RejectProofSchema = z.object({
  proofId: z.string().uuid('Valid proof ID required'),
  reason: z.string().min(5, 'Rejection reason must be at least 5 characters').max(500),
});

/**
 * Verifies a submitted customer manual UPI payment proof.
 * Advances payment status and confirms order atomically.
 */
export async function verifyPaymentProofAction(proofId: string) {
  const admin = await requireAdmin();

  if (!proofId || typeof proofId !== 'string') {
    return { success: false, error: 'Invalid payment proof ID.' };
  }

  try {
    const proof = await prisma.paymentProof.findUnique({
      where: { id: proofId },
      include: {
        payment: {
          include: {
            order: true,
          },
        },
      },
    });

    if (!proof) {
      return { success: false, error: 'Payment proof record not found.' };
    }

    if (proof.reviewStatus === PaymentStatus.VERIFIED) {
      return { success: false, error: 'Payment proof has already been verified.' };
    }

    const orderId = proof.payment.orderId;
    const paymentId = proof.paymentId;
    const orderNumber = proof.payment.order.orderNumber;
    const customerId = proof.userId;

    await prisma.$transaction(async (tx) => {
      // 1. Update PaymentProof
      await tx.paymentProof.update({
        where: { id: proofId },
        data: {
          reviewStatus: PaymentStatus.VERIFIED,
          verifiedBy: admin.id,
          verifiedAt: new Date(),
        },
      });

      // 2. Update Payment
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          paymentStatus: PaymentStatus.VERIFIED,
        },
      });

      // 3. Update Order
      const updateData: { paymentStatus: PaymentStatus; orderStatus?: OrderStatus } = {
        paymentStatus: PaymentStatus.VERIFIED,
      };

      if (proof.payment.order.orderStatus === OrderStatus.PENDING) {
        updateData.orderStatus = OrderStatus.CONFIRMED;
      }

      await tx.order.update({
        where: { id: orderId },
        data: updateData,
      });

      // 4. Send customer notification
      await tx.notification.create({
        data: {
          userId: customerId,
          title: `UPI Payment Verified for Order #${orderNumber}`,
          message: `Your manual UPI payment has been verified successfully. Your order is confirmed.`,
          linkUrl: `/orders/${orderId}`,
        },
      });
    }, { timeout: 20000, maxWait: 10000 });

    // 5. Record privileged audit log
    await recordAdminActivity({
      actorId: admin.id,
      action: 'PAYMENT_PROOF_VERIFIED',
      entity: 'PaymentProof',
      entityId: proofId,
      newValues: { orderId, paymentId, verifiedBy: admin.id },
    });

    // 6. Asynchronous observable customer email notification
    getCustomerContact(customerId)
      .then((contact) => {
        if (contact) {
          sendEmail(
            buildPaymentApprovedEmail({
              orderNumber: proof.payment.order.orderNumber,
              orderId: proof.payment.order.id,
              customerName: contact.name,
              customerEmail: contact.email,
              totalAmount: Number(proof.payment.order.totalAmount),
              paymentMethod: 'Manual UPI',
            })
          ).catch((err) => {
            logger.error('AdminPayments', 'Non-blocking email delivery failure after payment approval', {
              orderId: proof.payment.order.id,
              error: err?.message,
            });
          });
        }
      })
      .catch((err) => {
        logger.error('AdminPayments', 'Failed to retrieve contact for payment approval email', {
          orderId: proof.payment.order.id,
          error: err?.message,
        });
      });

    revalidatePath('/admin/orders/payments');
    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath('/admin');
    revalidatePath('/admin/dashboard');
    revalidatePath(`/orders/${orderId}`);

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to verify payment proof.',
    };
  }
}

/**
 * Rejects a customer manual UPI payment proof with a mandatory rejection explanation.
 */
export async function rejectPaymentProofAction(rawInput: unknown) {
  const admin = await requireAdmin();
  const parsed = RejectProofSchema.safeParse(rawInput);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { proofId, reason } = parsed.data;

  try {
    const proof = await prisma.paymentProof.findUnique({
      where: { id: proofId },
      include: {
        payment: {
          include: {
            order: true,
          },
        },
      },
    });

    if (!proof) {
      return { success: false, error: 'Payment proof record not found.' };
    }

    const orderId = proof.payment.orderId;
    const paymentId = proof.paymentId;
    const orderNumber = proof.payment.order.orderNumber;
    const customerId = proof.userId;

    await prisma.$transaction(async (tx) => {
      // 1. Update PaymentProof
      await tx.paymentProof.update({
        where: { id: proofId },
        data: {
          reviewStatus: PaymentStatus.REJECTED,
          adminNotes: reason,
          verifiedBy: admin.id,
          verifiedAt: new Date(),
        },
      });

      // 2. Update Payment
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          paymentStatus: PaymentStatus.REJECTED,
        },
      });

      // 3. Update Order payment status
      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: PaymentStatus.FAILED,
        },
      });

      // 4. Send customer notification with explanation
      await tx.notification.create({
        data: {
          userId: customerId,
          title: `UPI Payment Rejected for Order #${orderNumber}`,
          message: `Your payment proof could not be verified: ${reason}. Please contact customer support.`,
          linkUrl: `/orders/${orderId}`,
        },
      });
    }, { timeout: 20000, maxWait: 10000 });

    // 5. Record privileged audit log
    await recordAdminActivity({
      actorId: admin.id,
      action: 'PAYMENT_PROOF_REJECTED',
      entity: 'PaymentProof',
      entityId: proofId,
      newValues: { orderId, paymentId, reason },
    });

    // 6. Asynchronous observable customer email notification
    getCustomerContact(customerId)
      .then((contact) => {
        if (contact) {
          sendEmail(
            buildPaymentRejectedEmail(
              {
                orderNumber: proof.payment.order.orderNumber,
                orderId: proof.payment.order.id,
                customerName: contact.name,
                customerEmail: contact.email,
                totalAmount: Number(proof.payment.order.totalAmount),
                paymentMethod: 'Manual UPI',
              },
              reason
            )
          ).catch((err) => {
            logger.error('AdminPayments', 'Non-blocking email delivery failure after payment rejection', {
              orderId: proof.payment.order.id,
              error: err?.message,
            });
          });
        }
      })
      .catch((err) => {
        logger.error('AdminPayments', 'Failed to retrieve contact for payment rejection email', {
          orderId: proof.payment.order.id,
          error: err?.message,
        });
      });

    revalidatePath('/admin/orders/payments');
    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath('/admin');
    revalidatePath('/admin/dashboard');

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to reject payment proof.',
    };
  }
}

/**
 * Generates a short-lived signed URL for an authorized administrator to view a private payment proof screenshot.
 */
export async function getPaymentProofSignedUrlAction(proofId: string): Promise<{
  success: boolean;
  signedUrl?: string;
  error?: string;
}> {
  await requireAdmin();

  if (!proofId || typeof proofId !== 'string') {
    return { success: false, error: 'Valid proof ID is required.' };
  }

  try {
    const proof = await prisma.paymentProof.findUnique({
      where: { id: proofId },
      select: { screenshotStoragePath: true },
    });

    if (!proof || !proof.screenshotStoragePath) {
      return { success: false, error: 'Payment proof screenshot record not found.' };
    }

    const signedUrl = await getSignedPaymentProofUrl(proof.screenshotStoragePath, 900);
    if (!signedUrl) {
      return { success: false, error: 'Unable to generate secure view link for screenshot.' };
    }

    return { success: true, signedUrl };
  } catch {
    return { success: false, error: 'Failed to retrieve screenshot view link.' };
  }
}

