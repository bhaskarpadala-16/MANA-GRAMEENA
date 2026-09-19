'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth/guards';
import { ReviewStatus } from '@prisma/client';
import { recordAdminActivity } from './audit';

const ModerateReviewSchema = z.object({
  reviewId: z.string().uuid('Valid review ID is required'),
  status: z.nativeEnum(ReviewStatus),
});

/**
 * Moderates customer product reviews using existing schema statuses:
 * PENDING, APPROVED, REJECTED.
 */
export async function moderateReviewAction(rawInput: unknown) {
  const admin = await requireAdmin();
  const parsed = ModerateReviewSchema.safeParse(rawInput);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { reviewId, status } = parsed.data;

  try {
    const existing = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        product: { select: { slug: true } },
      },
    });

    if (!existing) {
      return { success: false, error: 'Review not found.' };
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: { status },
    });

    await recordAdminActivity({
      actorId: admin.id,
      action: status === ReviewStatus.APPROVED ? 'REVIEW_APPROVED' : 'REVIEW_REJECTED',
      entity: 'Review',
      entityId: reviewId,
      oldValues: { status: existing.status },
      newValues: { status },
    });

    revalidatePath('/admin/reviews');
    revalidatePath(`/products/${existing.product.slug}`);

    return { success: true, status: updated.status };
  } catch {
    return { success: false, error: 'Failed to update review moderation status.' };
  }
}
