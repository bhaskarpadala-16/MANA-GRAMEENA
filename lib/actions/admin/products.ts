'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth/guards';
import { ProductStatus } from '@prisma/client';
import { recordAdminActivity } from './audit';

// ---------------------------------------------------------------------------
// ZOD VALIDATION SCHEMAS
// ---------------------------------------------------------------------------

export const CategoryInputSchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters').max(100),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric and hyphens only'),
  description: z.string().max(500).optional().nullable(),
  imageUrl: z.string().url('Image URL must be valid').optional().nullable(),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const ProductInputSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(220)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric and hyphens only'),
  shortDescription: z.string().min(5, 'Short description is required').max(300),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  ingredients: z.string().min(2, 'Ingredients are required'),
  benefits: z.string().min(2, 'Benefits are required'),
  usageInstructions: z.string().min(2, 'Usage instructions are required'),
  categoryId: z.string().uuid('Valid Category ID is required'),
  price: z.number().positive('Price must be greater than 0'),
  discountPrice: z.number().positive('Discount price must be greater than 0').optional().nullable(),
  sku: z.string().min(2, 'SKU is required').max(50),
  weightGrams: z.number().int().positive('Weight in grams must be positive'),
  status: z.nativeEnum(ProductStatus).default(ProductStatus.DRAFT),
  isFeatured: z.boolean().default(false),
  initialStock: z.number().int().min(0, 'Stock cannot be negative').default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
});

export const VariantInputSchema = z.object({
  title: z.string().min(2, 'Variant title is required').max(100),
  sku: z.string().min(2, 'Variant SKU is required').max(50),
  priceOverride: z.number().positive('Price override must be greater than 0').optional().nullable(),
  weightGrams: z.number().int().positive('Weight in grams must be positive'),
  isActive: z.boolean().default(true),
  initialStock: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
});

export const ImageInputSchema = z.object({
  imageUrl: z.string().url('Valid image URL is required'),
  altText: z.string().max(200).optional().nullable(),
  displayOrder: z.number().int().default(0),
  isPrimary: z.boolean().default(false),
});

// ---------------------------------------------------------------------------
// CATEGORY ACTIONS
// ---------------------------------------------------------------------------

export async function createCategoryAction(rawInput: unknown) {
  const admin = await requireAdmin();
  const parsed = CategoryInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { name, slug, description, imageUrl, displayOrder, isActive } = parsed.data;

  try {
    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description: description ?? null,
        imageUrl: imageUrl ?? null,
        displayOrder,
        isActive,
      },
    });

    await recordAdminActivity({
      actorId: admin.id,
      action: 'CATEGORY_CREATED',
      entity: 'Category',
      entityId: category.id,
      newValues: { name, slug },
    });

    revalidatePath('/admin/products');
    revalidatePath('/admin/products/categories');
    revalidatePath('/categories');

    return { success: true, categoryId: category.id };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, error: 'A category with this name or slug already exists.' };
    }
    return { success: false, error: 'Failed to create category.' };
  }
}

export async function updateCategoryAction(id: string, rawInput: unknown) {
  const admin = await requireAdmin();
  const parsed = CategoryInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: 'Category not found.' };
    }

    const updated = await prisma.category.update({
      where: { id },
      data: parsed.data,
    });

    await recordAdminActivity({
      actorId: admin.id,
      action: 'CATEGORY_UPDATED',
      entity: 'Category',
      entityId: id,
      oldValues: { name: existing.name, slug: existing.slug },
      newValues: parsed.data,
    });

    revalidatePath('/admin/products');
    revalidatePath('/admin/products/categories');
    revalidatePath('/categories');

    return { success: true, category: updated };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, error: 'Category slug already in use.' };
    }
    return { success: false, error: 'Failed to update category.' };
  }
}

// ---------------------------------------------------------------------------
// PRODUCT ACTIONS
// ---------------------------------------------------------------------------

export async function createProductAction(rawInput: unknown) {
  const admin = await requireAdmin();
  const parsed = ProductInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const {
    name,
    slug,
    shortDescription,
    description,
    ingredients,
    benefits,
    usageInstructions,
    categoryId,
    price,
    discountPrice,
    sku,
    weightGrams,
    status,
    isFeatured,
    initialStock,
    lowStockThreshold,
  } = parsed.data;

  try {
    const product = await prisma.$transaction(async (tx) => {
      // 1. Create Product
      const newProd = await tx.product.create({
        data: {
          name,
          slug,
          shortDescription,
          description,
          ingredients,
          benefits,
          usageInstructions,
          categoryId,
          price,
          discountPrice: discountPrice ?? null,
          sku,
          weightGrams,
          status,
          isFeatured,
        },
      });

      // 2. Automatically provision base Inventory record
      await tx.inventory.create({
        data: {
          productId: newProd.id,
          variantId: null,
          stockQuantity: initialStock,
          reservedQuantity: 0,
          lowStockThreshold,
        },
      });

      return newProd;
    });

    await recordAdminActivity({
      actorId: admin.id,
      action: 'PRODUCT_CREATED',
      entity: 'Product',
      entityId: product.id,
      newValues: { name, slug, sku, price, status },
    });

    revalidatePath('/admin/products');
    revalidatePath('/admin/inventory');
    revalidatePath('/products');

    return { success: true, productId: product.id };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, error: 'A product with this slug or SKU already exists.' };
    }
    return { success: false, error: 'Failed to create product.' };
  }
}

export async function updateProductAction(id: string, rawInput: unknown) {
  const admin = await requireAdmin();
  const parsed = ProductInputSchema.omit({ initialStock: true }).safeParse(rawInput);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { inventory: { where: { variantId: null } } },
    });

    if (!existing) {
      return { success: false, error: 'Product not found.' };
    }

    const {
      name,
      slug,
      shortDescription,
      description,
      ingredients,
      benefits,
      usageInstructions,
      categoryId,
      price,
      discountPrice,
      sku,
      weightGrams,
      status,
      isFeatured,
      lowStockThreshold,
    } = parsed.data;

    const updated = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.update({
        where: { id },
        data: {
          name,
          slug,
          shortDescription,
          description,
          ingredients,
          benefits,
          usageInstructions,
          categoryId,
          price,
          discountPrice: discountPrice ?? null,
          sku,
          weightGrams,
          status,
          isFeatured,
        },
      });

      // Update low stock threshold on base inventory if exists
      if (existing.inventory[0]) {
        await tx.inventory.update({
          where: { id: existing.inventory[0].id },
          data: { lowStockThreshold },
        });
      }

      return prod;
    });

    await recordAdminActivity({
      actorId: admin.id,
      action: 'PRODUCT_UPDATED',
      entity: 'Product',
      entityId: id,
      oldValues: { name: existing.name, price: existing.price, status: existing.status },
      newValues: { name, price, status },
    });

    revalidatePath('/admin/products');
    revalidatePath(`/admin/products/${id}`);
    revalidatePath('/admin/inventory');
    revalidatePath(`/products/${updated.slug}`);

    return { success: true, product: updated };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, error: 'Product slug or SKU already exists.' };
    }
    return { success: false, error: 'Failed to update product.' };
  }
}

export async function toggleProductStatusAction(id: string, status: ProductStatus) {
  const admin = await requireAdmin();

  try {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: 'Product not found.' };
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { status },
    });

    await recordAdminActivity({
      actorId: admin.id,
      action: 'PRODUCT_STATUS_CHANGED',
      entity: 'Product',
      entityId: id,
      oldValues: { status: existing.status },
      newValues: { status },
    });

    revalidatePath('/admin/products');
    revalidatePath(`/admin/products/${id}`);
    revalidatePath('/products');

    return { success: true, status: updated.status };
  } catch {
    return { success: false, error: 'Failed to update product status.' };
  }
}

// ---------------------------------------------------------------------------
// VARIANT ACTIONS
// ---------------------------------------------------------------------------

export async function createProductVariantAction(productId: string, rawInput: unknown) {
  const admin = await requireAdmin();
  const parsed = VariantInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const {
    title,
    sku,
    priceOverride,
    weightGrams,
    isActive,
    initialStock,
    lowStockThreshold,
  } = parsed.data;

  try {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return { success: false, error: 'Parent product not found.' };
    }

    const variant = await prisma.$transaction(async (tx) => {
      // 1. Create variant
      const v = await tx.productVariant.create({
        data: {
          productId,
          title,
          sku,
          priceOverride: priceOverride ?? null,
          weightGrams,
          isActive,
        },
      });

      // 2. Automatically provision variant inventory record
      await tx.inventory.create({
        data: {
          productId,
          variantId: v.id,
          stockQuantity: initialStock,
          reservedQuantity: 0,
          lowStockThreshold,
        },
      });

      return v;
    });

    await recordAdminActivity({
      actorId: admin.id,
      action: 'PRODUCT_VARIANT_CREATED',
      entity: 'ProductVariant',
      entityId: variant.id,
      newValues: { productId, title, sku, priceOverride },
    });

    revalidatePath(`/admin/products/${productId}`);
    revalidatePath('/admin/inventory');
    revalidatePath(`/products/${product.slug}`);

    return { success: true, variantId: variant.id };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, error: 'A variant with this SKU already exists.' };
    }
    return { success: false, error: 'Failed to create product variant.' };
  }
}

export async function updateProductVariantAction(
  variantId: string,
  productId: string,
  rawInput: unknown
) {
  const admin = await requireAdmin();
  const parsed = VariantInputSchema.omit({ initialStock: true }).safeParse(rawInput);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const existing = await prisma.productVariant.findUnique({
      where: {
        id_productId: {
          id: variantId,
          productId,
        },
      },
    });

    if (!existing) {
      return { success: false, error: 'Variant not found for this product.' };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const v = await tx.productVariant.update({
        where: {
          id_productId: {
            id: variantId,
            productId,
          },
        },
        data: {
          title: parsed.data.title,
          sku: parsed.data.sku,
          priceOverride: parsed.data.priceOverride ?? null,
          weightGrams: parsed.data.weightGrams,
          isActive: parsed.data.isActive,
        },
      });

      // Update low stock threshold on variant inventory if exists
      const inv = await tx.inventory.findFirst({
        where: { productId, variantId },
      });

      if (inv) {
        await tx.inventory.update({
          where: { id: inv.id },
          data: { lowStockThreshold: parsed.data.lowStockThreshold },
        });
      }

      return v;
    });

    await recordAdminActivity({
      actorId: admin.id,
      action: 'PRODUCT_VARIANT_UPDATED',
      entity: 'ProductVariant',
      entityId: variantId,
      oldValues: { title: existing.title, priceOverride: existing.priceOverride },
      newValues: parsed.data,
    });

    revalidatePath(`/admin/products/${productId}`);
    revalidatePath('/admin/inventory');

    return { success: true, variant: updated };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, error: 'Variant SKU already exists.' };
    }
    return { success: false, error: 'Failed to update variant.' };
  }
}

export async function deleteProductVariantAction(variantId: string, productId: string) {
  const admin = await requireAdmin();

  try {
    // Check if variant is used in any historical order items
    const orderItemsCount = await prisma.orderItem.count({
      where: { variantId },
    });

    if (orderItemsCount > 0) {
      return {
        success: false,
        error:
          'Cannot delete variant that is part of historical customer orders. Deactivate it instead.',
      };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete associated inventory
      await tx.inventory.deleteMany({
        where: { productId, variantId },
      });

      // 2. Delete variant
      await tx.productVariant.delete({
        where: {
          id_productId: {
            id: variantId,
            productId,
          },
        },
      });
    });

    await recordAdminActivity({
      actorId: admin.id,
      action: 'PRODUCT_VARIANT_DELETED',
      entity: 'ProductVariant',
      entityId: variantId,
    });

    revalidatePath(`/admin/products/${productId}`);
    revalidatePath('/admin/inventory');

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to delete variant.' };
  }
}

// ---------------------------------------------------------------------------
// IMAGE ACTIONS
// ---------------------------------------------------------------------------

export async function createProductImageAction(productId: string, rawInput: unknown) {
  const admin = await requireAdmin();
  const parsed = ImageInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { imageUrl, altText, displayOrder, isPrimary } = parsed.data;

  try {
    const image = await prisma.productImage.create({
      data: {
        productId,
        imageUrl,
        altText: altText || 'Product photo',
        displayOrder,
        isPrimary,
      },
    });

    await recordAdminActivity({
      actorId: admin.id,
      action: 'PRODUCT_IMAGE_ADDED',
      entity: 'ProductImage',
      entityId: image.id,
      newValues: { productId, imageUrl, isPrimary },
    });

    revalidatePath(`/admin/products/${productId}`);
    return { success: true, imageId: image.id };
  } catch {
    return { success: false, error: 'Failed to attach image to product.' };
  }
}

export async function deleteProductImageAction(imageId: string, productId: string) {
  const admin = await requireAdmin();

  if (!imageId || !productId) {
    return { success: false, error: 'Valid image ID and product ID are required.' };
  }

  try {
    const existing = await prisma.productImage.findFirst({
      where: {
        id: imageId,
        productId,
      },
    });

    if (!existing) {
      return { success: false, error: 'Product image not found for this product.' };
    }

    await prisma.productImage.delete({
      where: { id: imageId },
    });

    await recordAdminActivity({
      actorId: admin.id,
      action: 'PRODUCT_IMAGE_DELETED',
      entity: 'ProductImage',
      entityId: imageId,
      newValues: { productId },
    });

    revalidatePath(`/admin/products/${productId}`);
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to remove product image.' };
  }
}
