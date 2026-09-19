import 'server-only';
import prisma from '@/lib/db';
import { ProductStatus } from '@prisma/client';

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  price: number;
  discountPrice: number | null;
  weightGrams: number;
  isFeatured: boolean;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  primaryImage: string | null;
  variantsCount: number;
  inStock: boolean;
  totalStock: number;
  ratingAverage: number;
  reviewsCount: number;
}

export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  ingredients: string;
  benefits: string;
  usageInstructions: string;
  price: number;
  discountPrice: number | null;
  sku: string;
  weightGrams: number;
  isFeatured: boolean;
  category: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  };
  images: {
    id: string;
    imageUrl: string;
    altText: string;
    isPrimary: boolean;
    displayOrder: number;
  }[];
  variants: {
    id: string;
    title: string;
    sku: string;
    price: number;
    weightGrams: number;
    stock: number;
    inStock: boolean;
  }[];
  baseStock: number;
  totalStock: number;
  inStock: boolean;
  reviews: {
    id: string;
    userName: string;
    rating: number;
    reviewText: string;
    isVerifiedPurchase: boolean;
    createdAt: Date;
  }[];
  ratingAverage: number;
  reviewsCount: number;
  relatedProducts: ProductSummary[];
}

export interface ProductFilterParams {
  categorySlug?: string;
  search?: string;
  sort?: 'featured' | 'price-asc' | 'price-desc' | 'newest';
  limit?: number;
  page?: number;
}

/**
 * Retrieves published products for catalog and search with category, images, variants, and stock summary.
 * Strictly prevents N+1 queries through batched Prisma includes and aggregations.
 */
export async function getPublishedProducts(params: ProductFilterParams = {}): Promise<{
  products: ProductSummary[];
  totalCount: number;
}> {
  const { categorySlug, search, sort = 'featured', limit = 20, page = 1 } = params;

  const where: any = {
    status: ProductStatus.PUBLISHED,
  };

  if (categorySlug) {
    where.category = {
      slug: categorySlug,
      isActive: true,
    };
  }

  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { shortDescription: { contains: term, mode: 'insensitive' } },
      { ingredients: { contains: term, mode: 'insensitive' } },
      { benefits: { contains: term, mode: 'insensitive' } },
    ];
  }

  let orderBy: any = [{ isFeatured: 'desc' }, { createdAt: 'desc' }];
  if (sort === 'price-asc') {
    orderBy = [{ price: 'asc' }];
  } else if (sort === 'price-desc') {
    orderBy = [{ price: 'desc' }];
  } else if (sort === 'newest') {
    orderBy = [{ createdAt: 'desc' }];
  }

  const skip = (page - 1) * limit;

  const [totalCount, rawProducts] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        shortDescription: true,
        price: true,
        discountPrice: true,
        weightGrams: true,
        isFeatured: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
          take: 1,
          select: {
            imageUrl: true,
          },
        },
        variants: {
          where: { isActive: true },
          select: {
            id: true,
          },
        },
        inventory: {
          select: {
            variantId: true,
            stockQuantity: true,
            reservedQuantity: true,
          },
        },
        reviews: {
          where: { status: 'APPROVED' },
          select: {
            rating: true,
          },
        },
      },
    }),
  ]);

  const products: ProductSummary[] = rawProducts.map((p) => {
    const activeVariantIds = new Set(p.variants.map((v) => v.id));
    const totalStock =
      p.variants.length > 0
        ? p.inventory
            .filter((inv) => inv.variantId !== null && activeVariantIds.has(inv.variantId))
            .reduce((sum, inv) => sum + Math.max(0, inv.stockQuantity - inv.reservedQuantity), 0)
        : p.inventory
            .filter((inv) => inv.variantId === null)
            .reduce((sum, inv) => sum + Math.max(0, inv.stockQuantity - inv.reservedQuantity), 0);

    const reviewsCount = p.reviews.length;
    const ratingAverage =
      reviewsCount > 0
        ? Number((p.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount).toFixed(1))
        : 0;

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      shortDescription: p.shortDescription,
      price: Number(p.price),
      discountPrice: p.discountPrice ? Number(p.discountPrice) : null,
      weightGrams: p.weightGrams,
      isFeatured: p.isFeatured,
      category: p.category,
      primaryImage: p.images[0]?.imageUrl || null,
      variantsCount: p.variants.length,
      inStock: totalStock > 0,
      totalStock,
      ratingAverage,
      reviewsCount,
    };
  });

  return { products, totalCount };
}

/**
 * Retrieves complete product details by slug, including full gallery, variants with inventory,
 * customer reviews, and related products.
 */
export async function getProductDetailBySlug(slug: string): Promise<ProductDetail | null> {
  const p = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
        },
      },
      images: {
        orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
        select: {
          id: true,
          imageUrl: true,
          altText: true,
          isPrimary: true,
          displayOrder: true,
        },
      },
      variants: {
        where: { isActive: true },
        select: {
          id: true,
          title: true,
          sku: true,
          priceOverride: true,
          weightGrams: true,
          inventory: {
            select: {
              stockQuantity: true,
              reservedQuantity: true,
            },
          },
        },
      },
      inventory: {
        select: {
          variantId: true,
          stockQuantity: true,
          reservedQuantity: true,
        },
      },
      reviews: {
        where: { status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          rating: true,
          reviewText: true,
          isVerifiedPurchase: true,
          createdAt: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });

  if (!p || p.status !== ProductStatus.PUBLISHED) {
    return null;
  }

  const baseInv = p.inventory.find((inv) => inv.variantId === null);
  const baseStock = baseInv ? Math.max(0, baseInv.stockQuantity - baseInv.reservedQuantity) : 0;

  const variants = p.variants.map((v) => {
    const vStock = v.inventory.reduce(
      (acc, inv) => acc + Math.max(0, inv.stockQuantity - inv.reservedQuantity),
      0
    );
    return {
      id: v.id,
      title: v.title,
      sku: v.sku,
      price: v.priceOverride ? Number(v.priceOverride) : Number(p.price),
      weightGrams: v.weightGrams,
      stock: vStock,
      inStock: vStock > 0,
    };
  });

  const totalStock =
    variants.length > 0
      ? variants.reduce((sum, v) => sum + v.stock, 0)
      : baseStock;

  const reviewsCount = p.reviews.length;
  const ratingAverage =
    reviewsCount > 0
      ? Number((p.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount).toFixed(1))
      : 0;

  // Query up to 4 related products in the same category
  const relatedRaw = await prisma.product.findMany({
    where: {
      categoryId: p.categoryId,
      id: { not: p.id },
      status: ProductStatus.PUBLISHED,
    },
    take: 4,
    orderBy: { isFeatured: 'desc' },
    select: {
      id: true,
      name: true,
      slug: true,
      shortDescription: true,
      price: true,
      discountPrice: true,
      weightGrams: true,
      isFeatured: true,
      category: {
        select: { id: true, name: true, slug: true },
      },
      images: {
        orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
        take: 1,
        select: { imageUrl: true },
      },
      variants: { where: { isActive: true }, select: { id: true } },
      inventory: { select: { variantId: true, stockQuantity: true, reservedQuantity: true } },
      reviews: { where: { status: 'APPROVED' }, select: { rating: true } },
    },
  });

  const relatedProducts: ProductSummary[] = relatedRaw.map((rp) => {
    const rActiveVariantIds = new Set(rp.variants.map((v) => v.id));
    const rStock =
      rp.variants.length > 0
        ? rp.inventory
            .filter((inv) => inv.variantId !== null && rActiveVariantIds.has(inv.variantId))
            .reduce((sum, inv) => sum + Math.max(0, inv.stockQuantity - inv.reservedQuantity), 0)
        : rp.inventory
            .filter((inv) => inv.variantId === null)
            .reduce((sum, inv) => sum + Math.max(0, inv.stockQuantity - inv.reservedQuantity), 0);

    const rCount = rp.reviews.length;
    const rAvg =
      rCount > 0
        ? Number((rp.reviews.reduce((sum, r) => sum + r.rating, 0) / rCount).toFixed(1))
        : 0;

    return {
      id: rp.id,
      name: rp.name,
      slug: rp.slug,
      shortDescription: rp.shortDescription,
      price: Number(rp.price),
      discountPrice: rp.discountPrice ? Number(rp.discountPrice) : null,
      weightGrams: rp.weightGrams,
      isFeatured: rp.isFeatured,
      category: rp.category,
      primaryImage: rp.images[0]?.imageUrl || null,
      variantsCount: rp.variants.length,
      inStock: rStock > 0,
      totalStock: rStock,
      ratingAverage: rAvg,
      reviewsCount: rCount,
    };
  });

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    shortDescription: p.shortDescription,
    description: p.description,
    ingredients: p.ingredients,
    benefits: p.benefits,
    usageInstructions: p.usageInstructions,
    price: Number(p.price),
    discountPrice: p.discountPrice ? Number(p.discountPrice) : null,
    sku: p.sku,
    weightGrams: p.weightGrams,
    isFeatured: p.isFeatured,
    category: p.category,
    images: p.images,
    variants,
    baseStock,
    totalStock,
    inStock: totalStock > 0,
    reviews: p.reviews.map((r) => ({
      id: r.id,
      userName: `${r.user.firstName} ${r.user.lastName.charAt(0)}.`,
      rating: r.rating,
      reviewText: r.reviewText,
      isVerifiedPurchase: r.isVerifiedPurchase,
      createdAt: r.createdAt,
    })),
    ratingAverage,
    reviewsCount,
    relatedProducts,
  };
}

/**
 * Retrieves all active categories with product counts.
 */
export async function getActiveCategories() {
  return await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      _count: {
        select: {
          products: {
            where: { status: ProductStatus.PUBLISHED },
          },
        },
      },
    },
  });
}

/**
 * Retrieves category metadata and details by slug.
 */
export async function getCategoryBySlug(slug: string) {
  return await prisma.category.findUnique({
    where: { slug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      _count: {
        select: {
          products: {
            where: { status: ProductStatus.PUBLISHED },
          },
        },
      },
    },
  });
}
