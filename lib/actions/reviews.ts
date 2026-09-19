'use server';

import prisma from '@/lib/db';
import { requireCustomer } from '@/lib/auth/session';
import { OrderStatus, ReviewStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const ReviewSubmissionSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  rating: z.number().int().min(1, 'Rating must be at least 1 star').max(5, 'Rating cannot exceed 5 stars'),
  reviewText: z
    .string()
    .min(5, 'Review must be at least 5 characters')
    .max(1000, 'Review cannot exceed 1000 characters'),
});

export interface ReviewEligibilityResult {
  canReview: boolean;
  isVerifiedPurchase: boolean;
  existingReview?: {
    rating: number;
    reviewText: string;
    status: ReviewStatus;
  } | null;
  reason?: string;
}

/**
 * Checks server-authoritatively whether the customer is eligible to review this product.
 * Requires:
 * 1. Authenticated customer
 * 2. Real purchase history of this product belonging to the customer
 * 3. Order reached verified/delivered status
 */
export async function checkReviewEligibility(
  productId: string
): Promise<ReviewEligibilityResult> {
  try {
    const authUser = await requireCustomer();

    // Check existing review
    const existing = await prisma.review.findUnique({
      where: {
        productId_userId: {
          productId,
          userId: authUser.id,
        },
      },
      select: {
        rating: true,
        reviewText: true,
        status: true,
      },
    });

    // Check purchase condition in orders
    // The customer must have purchased this product in an order that has been delivered or confirmed
    const purchase = await prisma.orderItem.findFirst({
      where: {
        productId,
        order: {
          userId: authUser.id,
          orderStatus: {
            in: [
              OrderStatus.DELIVERED,
              OrderStatus.SHIPPED,
              OrderStatus.CONFIRMED,
            ],
          },
        },
      },
      select: { id: true, order: { select: { orderStatus: true } } },
    });

    if (!purchase) {
      return {
        canReview: false,
        isVerifiedPurchase: false,
        existingReview: existing || null,
        reason: 'Reviews are reserved for customers who have purchased and received this product.',
      };
    }

    return {
      canReview: true,
      isVerifiedPurchase: true,
      existingReview: existing || null,
    };
  } catch {
    return {
      canReview: false,
      isVerifiedPurchase: false,
      reason: 'Please sign in to submit a review.',
    };
  }
}

/**
 * Submits or updates a customer product review.
 * Server verifies product existence, purchase verification, and rating range.
 * Forces status to PENDING for moderation.
 */
export async function submitProductReview(rawInput: {
  productId: string;
  rating: number;
  reviewText: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const authUser = await requireCustomer();
    const validated = ReviewSubmissionSchema.parse(rawInput);

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: validated.productId },
      select: { id: true, slug: true },
    });

    if (!product) {
      return { success: false, error: 'Product not found.' };
    }

    // Verify customer actually purchased this product
    const purchase = await prisma.orderItem.findFirst({
      where: {
        productId: validated.productId,
        order: {
          userId: authUser.id,
          orderStatus: {
            in: [
              OrderStatus.DELIVERED,
              OrderStatus.SHIPPED,
              OrderStatus.CONFIRMED,
            ],
          },
        },
      },
    });

    if (!purchase) {
      return {
        success: false,
        error: 'Only verified buyers of this product are permitted to post customer reviews.',
      };
    }

    // Upsert review with PENDING moderation status and isVerifiedPurchase = true
    await prisma.review.upsert({
      where: {
        productId_userId: {
          productId: validated.productId,
          userId: authUser.id,
        },
      },
      update: {
        rating: validated.rating,
        reviewText: validated.reviewText.trim(),
        isVerifiedPurchase: true,
        status: ReviewStatus.PENDING,
      },
      create: {
        productId: validated.productId,
        userId: authUser.id,
        rating: validated.rating,
        reviewText: validated.reviewText.trim(),
        isVerifiedPurchase: true,
        status: ReviewStatus.PENDING,
      },
    });

    revalidatePath(`/products/${product.slug}`);
    revalidatePath('/products');

    return { success: true };
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.errors[0]?.message || 'Invalid review data.' };
    }
    return { success: false, error: 'Unable to submit review. Please try again.' };
  }
}
