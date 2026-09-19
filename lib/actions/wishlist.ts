'use server';

import prisma from '@/lib/db';
import { requireCustomer } from '@/lib/auth/session';
import { ProductStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const WishlistToggleSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
});

export interface WishlistItemDto {
  id: string;
  productId: string;
  variantId: string | null;
  productName: string;
  productSlug: string;
  variantTitle: string | null;
  price: number;
  originalPrice: number | null;
  inStock: boolean;
  stock: number;
  imageUrl: string | null;
  weightGrams: number;
}

/**
 * Retrieves or creates a wishlist record for the authenticated customer.
 */
async function getOrCreateUserWishlist(userId: string) {
  return await prisma.wishlist.upsert({
    where: { userId },
    update: {},
    create: { userId },
    select: { id: true, userId: true },
  });
}

/**
 * Retrieves all items in the customer's wishlist with real product details and inventory status.
 */
export async function getWishlist(): Promise<WishlistItemDto[]> {
  const authUser = await requireCustomer();
  const wishlist = await getOrCreateUserWishlist(authUser.id);

  const items = await prisma.wishlistItem.findMany({
    where: { wishlistId: wishlist.id },
    orderBy: { createdAt: 'desc' },
    include: {
      product: {
        include: {
          images: {
            orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
            take: 1,
            select: { imageUrl: true },
          },
          inventory: {
            select: { stockQuantity: true, reservedQuantity: true, variantId: true },
          },
        },
      },
      variant: {
        include: {
          inventory: {
            select: { stockQuantity: true, reservedQuantity: true },
          },
        },
      },
    },
  });

  return items.map((item) => {
    let price = Number(item.product.price);
    let originalPrice: number | null = null;

    if (item.variant?.priceOverride) {
      price = Number(item.variant.priceOverride);
    } else if (item.product.discountPrice) {
      price = Number(item.product.discountPrice);
      originalPrice = Number(item.product.price);
    }

    let stock = 0;
    if (item.variant) {
      stock = item.variant.inventory.reduce(
        (acc, inv) => acc + Math.max(0, inv.stockQuantity - inv.reservedQuantity),
        0
      );
    } else {
      const baseInv = item.product.inventory.find((inv) => inv.variantId === null);
      stock = baseInv ? Math.max(0, baseInv.stockQuantity - baseInv.reservedQuantity) : 0;
    }

    const inStock = stock > 0 && item.product.status === ProductStatus.PUBLISHED;

    return {
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      productName: item.product.name,
      productSlug: item.product.slug,
      variantTitle: item.variant?.title || null,
      price,
      originalPrice,
      inStock,
      stock,
      imageUrl: item.product.images[0]?.imageUrl || null,
      weightGrams: item.variant?.weightGrams || item.product.weightGrams,
    };
  });
}

/**
 * Toggles a product (and optional variant) in the customer's wishlist.
 */
export async function toggleWishlist(
  productIdInput: string,
  variantIdInput?: string | null
): Promise<{ inWishlist: boolean; error?: string }> {
  try {
    const authUser = await requireCustomer();

    const parsed = WishlistToggleSchema.safeParse({
      productId: productIdInput,
      variantId: variantIdInput || null,
    });

    if (!parsed.success) {
      return { inWishlist: false, error: 'Invalid product or variant ID.' };
    }

    const { productId, variantId } = parsed.data;

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      return { inWishlist: false, error: 'Product not found.' };
    }

    const wishlist = await getOrCreateUserWishlist(authUser.id);

    // Look for existing item
    const existing = await prisma.wishlistItem.findFirst({
      where: {
        wishlistId: wishlist.id,
        productId,
        variantId: variantId ?? null,
      },
    });

    if (existing) {
      await prisma.wishlistItem.delete({ where: { id: existing.id } });
      revalidatePath('/account/wishlist');
      return { inWishlist: false };
    } else {
      await prisma.wishlistItem.create({
        data: {
          wishlistId: wishlist.id,
          productId,
          variantId: variantId ?? null,
        },
      });
      revalidatePath('/account/wishlist');
      return { inWishlist: true };
    }
  } catch (err: any) {
    if (err.message?.includes('UNAUTHORIZED') || err.message?.includes('sign in')) {
      return { inWishlist: false, error: 'Please sign in to save items to your wishlist.' };
    }
    return { inWishlist: false, error: 'Failed to update wishlist.' };
  }
}

/**
 * Removes an item from the customer's wishlist by item ID.
 */
export async function removeFromWishlist(
  wishlistItemId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const authUser = await requireCustomer();

    const item = await prisma.wishlistItem.findUnique({
      where: { id: wishlistItemId },
      include: { wishlist: true },
    });

    if (!item || item.wishlist.userId !== authUser.id) {
      return { success: false, error: 'Wishlist item not found or unauthorized.' };
    }

    await prisma.wishlistItem.delete({ where: { id: wishlistItemId } });

    revalidatePath('/account/wishlist');
    return { success: true };
  } catch {
    return { success: false, error: 'Could not remove item from wishlist.' };
  }
}

/**
 * Moves an item from wishlist to cart, verifying product status and inventory.
 */
export async function moveWishlistItemToCart(
  wishlistItemId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const authUser = await requireCustomer();

    const item = await prisma.wishlistItem.findUnique({
      where: { id: wishlistItemId },
      include: {
        wishlist: true,
        product: { select: { id: true, status: true } },
      },
    });

    if (!item || item.wishlist.userId !== authUser.id) {
      return { success: false, error: 'Wishlist item not found.' };
    }

    if (item.product.status !== ProductStatus.PUBLISHED) {
      return { success: false, error: 'This product is no longer available.' };
    }

    // Check inventory
    const inv = await prisma.inventory.findFirst({
      where: {
        productId: item.productId,
        variantId: item.variantId ?? null,
      },
      select: { stockQuantity: true, reservedQuantity: true },
    });

    const stock = inv ? Math.max(0, inv.stockQuantity - inv.reservedQuantity) : 0;
    if (stock < 1) {
      return { success: false, error: 'This item is currently out of stock.' };
    }

    // Add to cart
    const cart = await prisma.cart.upsert({
      where: { userId: authUser.id },
      update: {},
      create: { userId: authUser.id },
      select: { id: true },
    });

    const existingCartItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: item.productId,
        variantId: item.variantId ?? null,
      },
    });

    if (existingCartItem) {
      await prisma.cartItem.update({
        where: { id: existingCartItem.id },
        data: { quantity: { increment: 1 } },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: item.productId,
          variantId: item.variantId ?? null,
          quantity: 1,
        },
      });
    }

    // Remove from wishlist
    await prisma.wishlistItem.delete({ where: { id: wishlistItemId } });

    revalidatePath('/cart');
    revalidatePath('/account/wishlist');

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to move item to cart.' };
  }
}
