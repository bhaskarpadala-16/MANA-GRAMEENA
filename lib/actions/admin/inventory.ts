'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth/guards';
import { InventoryTxType } from '@prisma/client';
import { recordAdminActivity } from './audit';

const AdjustInventorySchema = z.object({
  inventoryId: z.string().uuid('Valid inventory ID is required'),
  quantityDelta: z
    .number()
    .int('Adjustment must be an integer')
    .refine((val) => val !== 0, 'Quantity delta cannot be zero'),
  transactionType: z
    .nativeEnum(InventoryTxType)
    .refine(
      (val) => val === InventoryTxType.RESTOCK || val === InventoryTxType.MANUAL_ADJUSTMENT,
      'Administrative adjustments must be RESTOCK or MANUAL_ADJUSTMENT'
    ),
  referenceId: z.string().max(100).optional().nullable(),
  notes: z.string().min(3, 'A reason/note is required for stock auditability').max(500),
});

/**
 * Concurrency-safe atomic inventory adjustment.
 * Prevents negative available inventory.
 * Guarantees that every adjustment records an immutable audit trail in inventory_transactions.
 */
export async function adjustInventoryAction(rawInput: unknown) {
  const admin = await requireAdmin();
  const parsed = AdjustInventorySchema.safeParse(rawInput);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { inventoryId, quantityDelta, transactionType, referenceId, notes } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch current inventory row inside transaction
      const current = await tx.inventory.findUnique({
        where: { id: inventoryId },
        include: {
          product: { select: { name: true, sku: true } },
          variant: { select: { title: true, sku: true } },
        },
      });

      if (!current) {
        throw new Error('Inventory record not found.');
      }

      // 2. Atomically update stock with concurrency protection
      if (quantityDelta < 0) {
        // Enforce stock non-negativity and reservation protection at write time
        const updateCount = await tx.$executeRaw`
          UPDATE "inventory"
          SET "stock_quantity" = "stock_quantity" + ${quantityDelta},
              "updated_at" = NOW()
          WHERE "id" = ${inventoryId}::uuid
            AND "stock_quantity" + ${quantityDelta} >= 0
            AND "stock_quantity" + ${quantityDelta} >= "reserved_quantity"
        `;

        if (updateCount === 0) {
          throw new Error(
            `Invalid adjustment: Cannot reduce stock below active order reservations (reserved: ${current.reservedQuantity}) or drive total stock negative.`
          );
        }
      } else {
        // Positive restock adjustment: safe atomic increment
        await tx.inventory.update({
          where: { id: inventoryId },
          data: {
            stockQuantity: {
              increment: quantityDelta,
            },
          },
        });
      }

      // 3. Fetch authoritatively updated inventory state
      const updatedInv = await tx.inventory.findUniqueOrThrow({
        where: { id: inventoryId },
      });

      // 4. Record immutable inventory transaction
      const txLog = await tx.inventoryTransaction.create({
        data: {
          inventoryId,
          transactionType,
          quantityDelta,
          referenceId: referenceId ?? null,
          notes,
          createdBy: admin.id,
        },
      });

      return {
        updatedInv,
        txLog,
        productTitle: current.product.name,
        sku: current.variant?.sku || current.product.sku,
        oldStock: current.stockQuantity,
        newStock: updatedInv.stockQuantity,
      };
    }, { timeout: 15000, maxWait: 10000 });

    // 5. Record privileged administrative activity
    await recordAdminActivity({
      actorId: admin.id,
      action: 'INVENTORY_ADJUSTED',
      entity: 'Inventory',
      entityId: inventoryId,
      oldValues: { stockQuantity: result.oldStock },
      newValues: {
        stockQuantity: result.newStock,
        delta: quantityDelta,
        type: transactionType,
        notes,
      },
    });

    revalidatePath('/admin/inventory');
    revalidatePath('/admin/products');
    revalidatePath('/admin');
    revalidatePath('/admin/dashboard');

    return {
      success: true,
      newStock: result.newStock,
      availableStock: result.newStock - result.updatedInv.reservedQuantity,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to execute atomic inventory adjustment.',
    };
  }
}
