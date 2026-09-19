'use server';

import prisma from '@/lib/db';
import { requireCustomer } from '@/lib/auth/session';
import { ProductStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const AddToCartSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
  quantity: z.number().int().min(1).max(50).default(1),
});

const UpdateQuantitySchema = z.object({
  cartItemId: z.string().uuid(),
  quantity: z.number().int().min(0).max(50),
});

export interface CartItemDto {
  id: string;
  productId: string;
  variantId: string | null;
  productName: string;
  productSlug: string;
  variantTitle: string | null;
  sku: string;
  price: number;
  quantity: number;
  availableStock: number;
  inStock: boolean;
  imageUrl: string | null;
  weightGrams: number;
  lineTotal: number;
}

export interface CartSummaryDto {
  id: string;
  items: CartItemDto[];
  subtotal: number;
  itemsCount: number;
  hasOutOfStockItems: boolean;
  shippingFee: number;
  freeShippingThreshold: number;
  qualifiesForFreeShipping: boolean;
  amountNeededForFreeShipping: number;
  estimatedTotal: number;
}

const FREE_SHIPPING_THRESHOLD = 999;
const STANDARD_SHIPPING_FEE = 99;

/**
 * Retrieves or creates a cart record for the authenticated customer.
 * Scoped strictly to the authenticated user ID.
 */
async function getOrCreateUserCart(userId: string) {
  return await prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
    select: { id: true, userId: true },
  });
}

/**
 * Validates available stock for a product or variant from PostgreSQL.
 */
async function getAvailableStock(productId: string, variantId: string | null): Promise<number> {
  const inv = await prisma.inventory.findFirst({
    where: {
      productId,
      variantId: variantId ?? null,
    },
    select: { stockQuantity: true, reservedQuantity: true },
  });

  if (!inv) return 0;
  return Math.max(0, inv.stockQuantity - inv.reservedQuantity);
}

/**
 * Retrieves the full customer cart with authoritative database prices and inventory availability.
 */
export async function getCart(): Promise<CartSummaryDto | null> {
  const authUser = await requireCustomer();
  const cart = await getOrCreateUserCart(authUser.id);

  const cartItems = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    orderBy: { createdAt: 'desc' },
    include: {
      product: {
        include: {
          images: {
            orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
            take: 1,
            select: { imageUrl: true },
          },
        },
      },
      variant: true,
    },
  });

  let subtotal = 0;
  let itemsCount = 0;
  let hasOutOfStockItems = false;

  const items: CartItemDto[] = [];

  for (const item of cartItems) {
    // Determine authoritative price and stock
    const isPublished = item.product.status === ProductStatus.PUBLISHED;
    const isVariantActive = item.variant ? item.variant.isActive : true;

    const stock = isPublished && isVariantActive
      ? await getAvailableStock(item.productId, item.variantId)
      : 0;

    let unitPrice = Number(item.product.price);
    if (item.variant?.priceOverride) {
      unitPrice = Number(item.variant.priceOverride);
    } else if (item.product.discountPrice) {
      unitPrice = Number(item.product.discountPrice);
    }

    const inStock = stock >= item.quantity && isPublished && isVariantActive;
    if (!inStock) {
      hasOutOfStockItems = true;
    }

    const lineTotal = unitPrice * item.quantity;
    subtotal += lineTotal;
    itemsCount += item.quantity;

    items.push({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      productName: item.product.name,
      productSlug: item.product.slug,
      variantTitle: item.variant?.title || null,
      sku: item.variant?.sku || item.product.sku,
      price: unitPrice,
      quantity: item.quantity,
      availableStock: stock,
      inStock,
      imageUrl: item.product.images[0]?.imageUrl || null,
      weightGrams: item.variant?.weightGrams || item.product.weightGrams,
      lineTotal,
    });
  }

  const qualifiesForFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD || items.length === 0;
  const shippingFee = qualifiesForFreeShipping ? 0 : STANDARD_SHIPPING_FEE;
  const amountNeededForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const estimatedTotal = subtotal + shippingFee;

  return {
    id: cart.id,
    items,
    subtotal,
    itemsCount,
    hasOutOfStockItems,
    shippingFee,
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    qualifiesForFreeShipping,
    amountNeededForFreeShipping,
    estimatedTotal,
  };
}

/**
 * Adds an item to the authenticated customer's shopping cart.
 * Enforces product publication, variant validity, and inventory checks.
 */
export async function addToCart(
  productIdInput: string,
  variantIdInput?: string | null,
  quantityInput = 1
): Promise<{ success: boolean; error?: string; cartCount?: number }> {
  try {
    const authUser = await requireCustomer();

    const parsed = AddToCartSchema.safeParse({
      productId: productIdInput,
      variantId: variantIdInput || null,
      quantity: quantityInput,
    });

    if (!parsed.success) {
      return { success: false, error: 'Invalid cart item parameters.' };
    }

    const { productId, variantId, quantity } = parsed.data;

    // Verify product
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, status: true, name: true },
    });

    if (!product || product.status !== ProductStatus.PUBLISHED) {
      return { success: false, error: 'Product is currently unavailable.' };
    }

    // Verify variant if provided
    if (variantId) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        select: { id: true, productId: true, isActive: true },
      });

      if (!variant || variant.productId !== productId || !variant.isActive) {
        return { success: false, error: 'Selected variant is not valid for this product.' };
      }
    }

    // Verify inventory availability
    const availableStock = await getAvailableStock(productId, variantId ?? null);
    if (availableStock <= 0) {
      return { success: false, error: 'This item is currently out of stock.' };
    }

    const cart = await getOrCreateUserCart(authUser.id);

    // Check existing item in cart
    const existing = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
        variantId: variantId ?? null,
      },
    });

    const newQuantity = (existing?.quantity || 0) + quantity;
    if (newQuantity > availableStock) {
      return {
        success: false,
        error: `Only ${availableStock} units available in stock. Cannot add more.`,
      };
    }

    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQuantity },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          variantId: variantId ?? null,
          quantity,
        },
      });
    }

    revalidatePath('/cart');
    revalidatePath('/products');

    const totalItems = await prisma.cartItem.count({ where: { cartId: cart.id } });
    return { success: true, cartCount: totalItems };
  } catch (err: any) {
    if (err.message?.includes('UNAUTHORIZED') || err.message?.includes('sign in')) {
      return { success: false, error: 'Please sign in to add items to your cart.' };
    }
    return { success: false, error: 'Unable to update cart. Please try again.' };
  }
}

/**
 * Updates quantity of a specific cart item owned by the authenticated customer.
 */
export async function updateCartQuantity(
  cartItemId: string,
  quantity: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const authUser = await requireCustomer();

    const parsed = UpdateQuantitySchema.safeParse({ cartItemId, quantity });
    if (!parsed.success) {
      return { success: false, error: 'Invalid quantity.' };
    }

    // Verify ownership
    const item = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true },
    });

    if (!item || item.cart.userId !== authUser.id) {
      return { success: false, error: 'Cart item not found or unauthorized.' };
    }

    if (quantity <= 0) {
      await prisma.cartItem.delete({ where: { id: cartItemId } });
    } else {
      // Validate inventory
      const availableStock = await getAvailableStock(item.productId, item.variantId);
      if (quantity > availableStock) {
        return {
          success: false,
          error: `Only ${availableStock} units available in stock.`,
        };
      }

      await prisma.cartItem.update({
        where: { id: cartItemId },
        data: { quantity },
      });
    }

    revalidatePath('/cart');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update item quantity.' };
  }
}

/**
 * Removes a specific item from the authenticated customer's cart.
 */
export async function removeFromCart(
  cartItemId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const authUser = await requireCustomer();

    const item = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true },
    });

    if (!item || item.cart.userId !== authUser.id) {
      return { success: false, error: 'Item not found in your cart.' };
    }

    await prisma.cartItem.delete({ where: { id: cartItemId } });

    revalidatePath('/cart');
    return { success: true };
  } catch {
    return { success: false, error: 'Could not remove item from cart.' };
  }
}

/**
 * Clears all items from the authenticated customer's cart.
 */
export async function clearCart(): Promise<{ success: boolean; error?: string }> {
  try {
    const authUser = await requireCustomer();
    const cart = await prisma.cart.findUnique({ where: { userId: authUser.id } });

    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }

    revalidatePath('/cart');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to clear cart.' };
  }
}
