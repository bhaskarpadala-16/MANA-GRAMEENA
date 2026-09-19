'use server';

import prisma from '@/lib/db';
import { requireCustomer } from '@/lib/auth/session';
import { DiscountType } from '@prisma/client';

export interface CouponValidationResult {
  valid: boolean;
  code?: string;
  discountType?: DiscountType;
  discountValue?: number;
  calculatedDiscount: number;
  minOrderAmount?: number;
  error?: string;
}

/**
 * Validates a coupon code server-authoritatively against current cart subtotal and authenticated user.
 * Never trusts any discount passed from the browser.
 */
export async function validateCoupon(
  rawCode: string,
  currentSubtotal: number
): Promise<CouponValidationResult> {
  try {
    const authUser = await requireCustomer();
    const code = rawCode.trim().toUpperCase();

    if (!code) {
      return { valid: false, calculatedDiscount: 0, error: 'Please enter a coupon code.' };
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code },
    });

    if (!coupon) {
      return { valid: false, calculatedDiscount: 0, error: 'Invalid coupon code.' };
    }

    if (!coupon.isActive) {
      return { valid: false, calculatedDiscount: 0, error: 'This coupon is no longer active.' };
    }

    const now = new Date();
    if (now < coupon.startDate) {
      return { valid: false, calculatedDiscount: 0, error: 'This coupon is not yet valid.' };
    }

    if (now > coupon.expiryDate) {
      return { valid: false, calculatedDiscount: 0, error: 'This coupon has expired.' };
    }

    // Check total usage limit
    if (coupon.totalUsageLimit !== null && coupon.usedCount >= coupon.totalUsageLimit) {
      return { valid: false, calculatedDiscount: 0, error: 'This coupon has reached its maximum global usage limit.' };
    }

    // Check minimum order amount
    const minOrder = Number(coupon.minOrderAmount);
    if (currentSubtotal < minOrder) {
      return {
        valid: false,
        calculatedDiscount: 0,
        error: `Minimum order amount of ₹${minOrder.toLocaleString('en-IN')} required for this coupon.`,
      };
    }

    // Check per-user usage limit
    const userUsageCount = await prisma.couponUsage.count({
      where: {
        couponId: coupon.id,
        userId: authUser.id,
      },
    });

    if (userUsageCount >= coupon.perUserLimit) {
      return {
        valid: false,
        calculatedDiscount: 0,
        error: `You have already used this coupon the maximum allowed times (${coupon.perUserLimit}).`,
      };
    }

    // Calculate discount amount server-authoritatively
    let discountAmount = 0;
    const discountVal = Number(coupon.discountValue);

    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discountAmount = (currentSubtotal * discountVal) / 100;
      if (coupon.maxDiscountAmount !== null) {
        const maxDisc = Number(coupon.maxDiscountAmount);
        if (discountAmount > maxDisc) {
          discountAmount = maxDisc;
        }
      }
    } else {
      // Fixed discount
      discountAmount = discountVal;
    }

    // Never allow discount to exceed the cart subtotal
    discountAmount = Math.min(discountAmount, currentSubtotal);
    discountAmount = Math.round(discountAmount * 100) / 100;

    return {
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: discountVal,
      calculatedDiscount: discountAmount,
      minOrderAmount: minOrder,
    };
  } catch {
    return { valid: false, calculatedDiscount: 0, error: 'Unable to validate coupon.' };
  }
}
