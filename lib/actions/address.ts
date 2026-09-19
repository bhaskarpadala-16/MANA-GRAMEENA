'use server';

import prisma from '@/lib/db';
import { requireCustomer } from '@/lib/auth/session';
import { AddressType } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const AddressInputSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(150),
  phone: z.string().min(10, 'Phone must be at least 10 digits').max(20),
  addressLine1: z.string().min(5, 'Address line 1 must be at least 5 characters').max(255),
  addressLine2: z.string().max(255).nullable().optional(),
  landmark: z.string().max(150).nullable().optional(),
  city: z.string().min(2, 'City is required').max(100),
  state: z.string().min(2, 'State is required').max(100),
  postalCode: z.string().min(5, 'Postal PIN code is required').max(20),
  country: z.string().max(50).default('India'),
  addressType: z.nativeEnum(AddressType).default(AddressType.SHIPPING),
  isDefault: z.boolean().default(false),
});

export type AddressInput = z.infer<typeof AddressInputSchema>;

export interface AddressDto {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  addressType: AddressType;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Retrieves all delivery addresses belonging to the authenticated customer.
 */
export async function getUserAddresses(): Promise<AddressDto[]> {
  const authUser = await requireCustomer();

  return await prisma.address.findMany({
    where: { userId: authUser.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
}

/**
 * Creates a new address for the authenticated customer.
 * Automatically enforces customer ownership.
 */
export async function createAddress(
  rawInput: AddressInput
): Promise<{ success: boolean; address?: AddressDto; error?: string }> {
  try {
    const authUser = await requireCustomer();
    const validated = AddressInputSchema.parse(rawInput);

    // Count existing addresses
    const existingCount = await prisma.address.count({
      where: { userId: authUser.id },
    });

    const isFirstAddress = existingCount === 0;
    const shouldBeDefault = isFirstAddress || validated.isDefault;

    const result = await prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.address.updateMany({
          where: { userId: authUser.id, isDefault: true },
          data: { isDefault: false },
        });
      }

      return await tx.address.create({
        data: {
          userId: authUser.id,
          fullName: validated.fullName.trim(),
          phone: validated.phone.trim(),
          addressLine1: validated.addressLine1.trim(),
          addressLine2: validated.addressLine2 ? validated.addressLine2.trim() : null,
          landmark: validated.landmark ? validated.landmark.trim() : null,
          city: validated.city.trim(),
          state: validated.state.trim(),
          postalCode: validated.postalCode.trim(),
          country: validated.country.trim() || 'India',
          addressType: validated.addressType,
          isDefault: shouldBeDefault,
        },
      });
    });

    revalidatePath('/account/addresses');
    revalidatePath('/checkout');

    return { success: true, address: result };
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.errors[0]?.message || 'Invalid address format.' };
    }
    return { success: false, error: 'Failed to create address. Please try again.' };
  }
}

/**
 * Updates an existing delivery address, verifying customer ownership.
 */
export async function updateAddress(
  addressId: string,
  rawInput: Partial<AddressInput>
): Promise<{ success: boolean; address?: AddressDto; error?: string }> {
  try {
    const authUser = await requireCustomer();

    // Verify ownership
    const existing = await prisma.address.findUnique({
      where: { id: addressId },
      select: { id: true, userId: true },
    });

    if (!existing || existing.userId !== authUser.id) {
      return { success: false, error: 'Address not found or unauthorized.' };
    }

    const validated = AddressInputSchema.partial().parse(rawInput);

    const result = await prisma.$transaction(async (tx) => {
      if (validated.isDefault) {
        await tx.address.updateMany({
          where: { userId: authUser.id, isDefault: true, id: { not: addressId } },
          data: { isDefault: false },
        });
      }

      return await tx.address.update({
        where: { id: addressId },
        data: {
          ...(validated.fullName && { fullName: validated.fullName.trim() }),
          ...(validated.phone && { phone: validated.phone.trim() }),
          ...(validated.addressLine1 && { addressLine1: validated.addressLine1.trim() }),
          ...(validated.addressLine2 !== undefined && {
            addressLine2: validated.addressLine2 ? validated.addressLine2.trim() : null,
          }),
          ...(validated.landmark !== undefined && {
            landmark: validated.landmark ? validated.landmark.trim() : null,
          }),
          ...(validated.city && { city: validated.city.trim() }),
          ...(validated.state && { state: validated.state.trim() }),
          ...(validated.postalCode && { postalCode: validated.postalCode.trim() }),
          ...(validated.country && { country: validated.country.trim() }),
          ...(validated.addressType && { addressType: validated.addressType }),
          ...(validated.isDefault !== undefined && { isDefault: validated.isDefault }),
        },
      });
    });

    revalidatePath('/account/addresses');
    revalidatePath('/checkout');

    return { success: true, address: result };
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.errors[0]?.message || 'Invalid address data.' };
    }
    return { success: false, error: 'Failed to update address.' };
  }
}

/**
 * Deletes an address, verifying customer ownership.
 * If the deleted address was default, promotes another address to default.
 */
export async function deleteAddress(
  addressId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const authUser = await requireCustomer();

    const existing = await prisma.address.findUnique({
      where: { id: addressId },
      select: { id: true, userId: true, isDefault: true },
    });

    if (!existing || existing.userId !== authUser.id) {
      return { success: false, error: 'Address not found or unauthorized.' };
    }

    await prisma.$transaction(async (tx) => {
      await tx.address.delete({ where: { id: addressId } });

      if (existing.isDefault) {
        // Find another address to make default
        const nextAddress = await tx.address.findFirst({
          where: { userId: authUser.id },
          orderBy: { createdAt: 'desc' },
        });

        if (nextAddress) {
          await tx.address.update({
            where: { id: nextAddress.id },
            data: { isDefault: true },
          });
        }
      }
    });

    revalidatePath('/account/addresses');
    revalidatePath('/checkout');

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to delete address.' };
  }
}

/**
 * Marks a specific address as the customer's default delivery address.
 */
export async function setDefaultAddress(
  addressId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const authUser = await requireCustomer();

    const existing = await prisma.address.findUnique({
      where: { id: addressId },
      select: { id: true, userId: true },
    });

    if (!existing || existing.userId !== authUser.id) {
      return { success: false, error: 'Address not found or unauthorized.' };
    }

    await prisma.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: { userId: authUser.id, isDefault: true },
        data: { isDefault: false },
      });

      await tx.address.update({
        where: { id: addressId },
        data: { isDefault: true },
      });
    });

    revalidatePath('/account/addresses');
    revalidatePath('/checkout');

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to set default address.' };
  }
}
