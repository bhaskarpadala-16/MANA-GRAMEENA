'use server';

import prisma from '@/lib/db';
import { requireCustomer } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const ProfileUpdateSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z
    .string()
    .min(10, 'Phone must be at least 10 digits')
    .max(20)
    .regex(/^[0-9+\s()-]+$/, 'Invalid phone number format')
    .nullable()
    .optional(),
});

export interface CustomerProfileDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Retrieves the full customer profile from the database.
 */
export async function getCustomerProfile(): Promise<CustomerProfileDto> {
  const authUser = await requireCustomer();

  const profile = await prisma.profile.findUnique({
    where: { id: authUser.id },
  });

  if (!profile) {
    throw new Error('PROFILE_NOT_FOUND: Customer profile record could not be located.');
  }

  return {
    id: profile.id,
    email: authUser.email,
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone,
    role: profile.role,
    isActive: profile.isActive,
    createdAt: profile.createdAt,
  };
}

/**
 * Updates customer profile information (First Name, Last Name, Phone).
 * Role and Active status remain strictly protected and cannot be modified by customer.
 */
export async function updateCustomerProfile(rawInput: {
  firstName: string;
  lastName: string;
  phone?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const authUser = await requireCustomer();
    const validated = ProfileUpdateSchema.parse(rawInput);

    // Check phone uniqueness if phone changed
    if (validated.phone) {
      const existingPhone = await prisma.profile.findFirst({
        where: {
          phone: validated.phone,
          id: { not: authUser.id },
        },
      });

      if (existingPhone) {
        return { success: false, error: 'This phone number is already registered to another account.' };
      }
    }

    await prisma.profile.update({
      where: { id: authUser.id },
      data: {
        firstName: validated.firstName.trim(),
        lastName: validated.lastName.trim(),
        phone: validated.phone ? validated.phone.trim() : null,
      },
    });

    revalidatePath('/account');
    revalidatePath('/account/profile');

    return { success: true };
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.errors[0]?.message || 'Invalid input data.' };
    }
    return { success: false, error: 'Failed to update profile. Please try again.' };
  }
}
