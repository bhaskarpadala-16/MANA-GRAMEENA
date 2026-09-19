'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth/guards';
import { DiscountType } from '@prisma/client';
import { recordAdminActivity } from './audit';

const CouponInputSchema = z
  .object({
    code: z
      .string()
      .min(3, 'Code must be at least 3 characters')
      .max(50)
      .transform((c) => c.trim().toUpperCase()),
    discountType: z.nativeEnum(DiscountType),
    discountValue: z.number().positive('Discount value must be positive'),
    minOrderAmount: z.number().min(0).default(0),
    maxDiscountAmount: z.number().positive().optional().nullable(),
    startDate: z.string().datetime().optional().nullable(),
    expiryDate: z.string().datetime(),
    totalUsageLimit: z.number().int().positive().optional().nullable(),
    perUserLimit: z.number().int().positive().default(1),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.discountType === DiscountType.PERCENTAGE && data.discountValue > 100) {
        return false;
      }
      return true;
    },
    {
      message: 'Percentage discount cannot exceed 100%',
      path: ['discountValue'],
    }
  );

export async function createCouponAction(rawInput: unknown) {
  const admin = await requireAdmin();
  const parsed = CouponInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const {
    code,
    discountType,
    discountValue,
    minOrderAmount,
    maxDiscountAmount,
    startDate,
    expiryDate,
    totalUsageLimit,
    perUserLimit,
    isActive,
  } = parsed.data;

  try {
    const coupon = await prisma.coupon.create({
      data: {
        code,
        discountType,
        discountValue,
        minOrderAmount,
        maxDiscountAmount: maxDiscountAmount ?? null,
        startDate: startDate ? new Date(startDate) : new Date(),
        expiryDate: new Date(expiryDate),
        totalUsageLimit: totalUsageLimit ?? null,
        perUserLimit,
        isActive,
      },
    });

    await recordAdminActivity({
      actorId: admin.id,
      action: 'COUPON_CREATED',
      entity: 'Coupon',
      entityId: coupon.id,
      newValues: { code, discountType, discountValue },
    });

    revalidatePath('/admin/coupons');

    return { success: true, couponId: coupon.id };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, error: 'A coupon with this code already exists.' };
    }
    return { success: false, error: 'Failed to create coupon.' };
  }
}

const ToggleCouponActiveSchema = z.object({
  couponId: z.string().uuid('Valid coupon ID required'),
  isActive: z.boolean(),
});

export async function toggleCouponActiveAction(couponId: string, isActive: boolean) {
  const admin = await requireAdmin();

  const parsed = ToggleCouponActiveSchema.safeParse({ couponId, isActive });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const coupon = await prisma.coupon.update({
      where: { id: parsed.data.couponId },
      data: { isActive: parsed.data.isActive },
    });

    await recordAdminActivity({
      actorId: admin.id,
      action: parsed.data.isActive ? 'COUPON_ACTIVATED' : 'COUPON_DEACTIVATED',
      entity: 'Coupon',
      entityId: parsed.data.couponId,
      newValues: { isActive: parsed.data.isActive },
    });

    revalidatePath('/admin/coupons');

    return { success: true, isActive: coupon.isActive };
  } catch {
    return { success: false, error: 'Failed to update coupon status.' };
  }
}
