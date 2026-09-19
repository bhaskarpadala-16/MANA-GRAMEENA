import { PrismaClient, ProductStatus, DiscountType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;

function getPrismaClient(): PrismaClient {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Cannot run seed without a database connection.');
  }
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export async function seedBaseInventory(
  prismaClient: any,
  productId: string,
  stockQuantity = 20,
  lowStockThreshold = 5
) {
  const existing = await prismaClient.inventory.findFirst({
    where: { productId, variantId: null },
  });
  if (existing) {
    return await prismaClient.inventory.update({
      where: { id: existing.id },
      data: { stockQuantity, lowStockThreshold },
    });
  }
  return await prismaClient.inventory.create({
    data: {
      productId,
      variantId: null,
      stockQuantity,
      lowStockThreshold,
    },
  });
}

export async function seed(prismaInstance?: PrismaClient) {
  const prisma = prismaInstance ?? getPrismaClient();

  console.log('🌱 Starting Mana Grameena database seeding...\n');

  // 1. Seed Categories
  const categoriesData = [
    {
      name: 'Traditional Cold Pressed Oils',
      slug: 'cold-pressed-oils',
      description: 'Pure, unrefined wood-pressed (Gaana/Kachi Ghani) edible and medicinal oils extracted at room temperature to preserve natural nutrients and aroma.',
      displayOrder: 1,
    },
    {
      name: 'Pure Herbal & Ayurvedic Powders',
      slug: 'herbal-powders',
      description: 'Single-origin and synergistic traditional herbal powders sourced directly from village farmers, stone-ground and sun-dried without chemicals.',
      displayOrder: 2,
    },
    {
      name: 'Raw Wild Forest Honey & Preserves',
      slug: 'honey-preserves',
      description: 'Wild forest honey ethically harvested from tribal regions, unpasteurized and unfiltered, retaining natural bee pollen and enzymes.',
      displayOrder: 3,
    },
    {
      name: 'Natural & Herbal Personal Care',
      slug: 'personal-care',
      description: 'Chemical-free traditional bath powders (Sunni Pindi), herbal hair oils, and skin treatments crafted from ancient Ayurvedic formulas.',
      displayOrder: 4,
    },
  ];

  const categoryMap = new Map<string, string>();

  for (const cat of categoriesData) {
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
        displayOrder: cat.displayOrder,
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        displayOrder: cat.displayOrder,
      },
    });
    categoryMap.set(cat.slug, record.id);
    console.log(`  ✓ Category upserted: ${cat.name}`);
  }

  // 2. Seed Products with Variants and Inventory
  const productsData = [
    {
      categorySlug: 'cold-pressed-oils',
      name: 'Wood Pressed Black Sesame Oil (Til Oil)',
      slug: 'wood-pressed-black-sesame-oil',
      shortDescription: '100% pure traditional black sesame oil extracted using neem wood press. Rich in antioxidants, calcium, and natural sesame aroma.',
      description: 'Mana Grameena Wood Pressed Black Sesame Oil is crafted using traditional Vaagai wood chukkus (cold-press mills) without external heat, chemicals, or preservatives. Black sesame seeds are harvested by smallholder farmers in Andhra Pradesh and Telangana. Known traditionally as "Nallanuvvula Nune", this oil is deeply nourishing for daily culinary use, oil pulling, and Ayurvedic body massage (Abhyanga).',
      ingredients: '100% Pure Black Sesame Seeds (Sesamum indicum), Palm Jaggery (trace for extraction). Zero additives.',
      benefits: 'Supports cardiovascular health, strengthens bone density with bioavailable calcium, improves skin barrier health, and aids digestion when consumed daily.',
      usageInstructions: 'Culinary: Use for traditional tempering, curries, and podi mixing. Ayurvedic: Warm slightly and apply for body massage or use 1 tablespoon for morning oil pulling (Gandusha).',
      price: 420.00,
      discountPrice: 380.00,
      sku: 'MG-OIL-SESAME-BASE',
      weightGrams: 500,
      isFeatured: true,
      variants: [
        {
          title: '500 ml Glass Bottle',
          sku: 'MG-OIL-SESAME-500ML',
          priceOverride: 380.00,
          weightGrams: 500,
          stock: 60,
        },
        {
          title: '1 Litre Glass Bottle',
          sku: 'MG-OIL-SESAME-1L',
          priceOverride: 720.00,
          weightGrams: 1000,
          stock: 45,
        },
        {
          title: '5 Litre Traditional Tin',
          sku: 'MG-OIL-SESAME-5L',
          priceOverride: 3400.00,
          weightGrams: 5000,
          stock: 15,
        },
      ],
    },
    {
      categorySlug: 'cold-pressed-oils',
      name: 'Cold Pressed Native Groundnut Oil',
      slug: 'cold-pressed-groundnut-oil',
      shortDescription: 'Unrefined, aromatic peanut oil wood-pressed from native farm-grown groundnuts. Perfect for traditional high-heat cooking.',
      description: 'Extracted slowly from sun-dried native groundnuts (Palle Verusanaga) grown in dryland farms of Rayalaseema. Unlike industrial refined oils, our cold-pressed groundnut oil maintains a rich golden color, authentic nutty fragrance, and high smoke point naturally without chemical refining or bleaching.',
      ingredients: '100% Native Sun-Dried Groundnut Kernels (Arachis hypogaea). Single ingredient.',
      benefits: 'High in monounsaturated fats (MUFA), rich in Vitamin E, supports cholesterol balance, and provides clean energy without trans-fats.',
      usageInstructions: 'Ideal for everyday sautéing, deep frying, seasoning, and traditional Andhra snacks. Smoke point approx 220°C.',
      price: 320.00,
      discountPrice: 290.00,
      sku: 'MG-OIL-GNDNUT-BASE',
      weightGrams: 1000,
      isFeatured: true,
      variants: [
        {
          title: '1 Litre Can',
          sku: 'MG-OIL-GNDNUT-1L',
          priceOverride: 290.00,
          weightGrams: 1000,
          stock: 80,
        },
        {
          title: '5 Litre Eco Tin',
          sku: 'MG-OIL-GNDNUT-5L',
          priceOverride: 1380.00,
          weightGrams: 5000,
          stock: 30,
        },
      ],
    },
    {
      categorySlug: 'herbal-powders',
      name: 'Organic Moringa Leaf Powder (Munagaku)',
      slug: 'organic-moringa-leaf-powder',
      shortDescription: 'Shade-dried drumstick leaf powder packed with plant-based iron, Vitamin C, 18 amino acids, and essential minerals.',
      description: 'Harvested early in the morning from pesticide-free Moringa oleifera trees in rural Telangana. The leaves are shade-dried on raised bamboo racks to preserve chlorophyll and temperature-sensitive micronutrients, then stone-milled into a fine, vibrant green powder.',
      ingredients: '100% Organic Drumstick Leaves (Moringa oleifera). Shade-dried and powdered.',
      benefits: 'Combats nutritional fatigue, elevates hemoglobin levels, provides anti-inflammatory polyphenols, and boosts lactation in nursing mothers.',
      usageInstructions: 'Mix 1 teaspoon (3g-5g) into warm water with lemon and honey, blend into green smoothies, or stir into warm rice with ghee and a pinch of salt.',
      price: 240.00,
      discountPrice: 210.00,
      sku: 'MG-PWD-MORINGA-BASE',
      weightGrams: 200,
      isFeatured: true,
      variants: [
        {
          title: '200g Eco Pouch',
          sku: 'MG-PWD-MORINGA-200G',
          priceOverride: 210.00,
          weightGrams: 200,
          stock: 120,
        },
        {
          title: '500g Value Pack',
          sku: 'MG-PWD-MORINGA-500G',
          priceOverride: 480.00,
          weightGrams: 500,
          stock: 75,
        },
      ],
    },
    {
      categorySlug: 'herbal-powders',
      name: 'Pure Himalayan Ashwagandha Root Powder',
      slug: 'pure-ashwagandha-root-powder',
      shortDescription: 'Nagori grade adaptogenic Ashwagandha root powder to reduce stress, improve sleep quality, and enhance physical vitality.',
      description: 'Our Ashwagandha (Withania somnifera) is harvested from pristine rural soils and thoroughly washed, sun-cured, and pulverized into ultra-fine powder. Standardized with natural withanolides to support cortisol regulation and deep regenerative sleep.',
      ingredients: '100% Pure Certified Ashwagandha Root (Withania somnifera).',
      benefits: 'Powerful adaptogen that lowers serum cortisol, eases anxiety, enhances muscular endurance, and fosters deep restorative sleep.',
      usageInstructions: 'Take half teaspoon (2g-3g) mixed in warm milk or plant milk with a dash of cardamom and jaggery 30 minutes before bedtime.',
      price: 290.00,
      discountPrice: 260.00,
      sku: 'MG-PWD-ASHWA-BASE',
      weightGrams: 150,
      isFeatured: false,
      variants: [
        {
          title: '150g Glass Jar',
          sku: 'MG-PWD-ASHWA-150G',
          priceOverride: 260.00,
          weightGrams: 150,
          stock: 90,
        },
        {
          title: '300g Value Jar',
          sku: 'MG-PWD-ASHWA-300G',
          priceOverride: 490.00,
          weightGrams: 300,
          stock: 50,
        },
      ],
    },
    {
      categorySlug: 'honey-preserves',
      name: 'Wild Rock Bee Forest Honey (Konda Teene)',
      slug: 'wild-rock-bee-forest-honey',
      shortDescription: 'Unpasteurized raw forest honey collected from cliff hives in Eastern Ghats. Rich amber hue with complex floral notes.',
      description: 'Ethically gathered by indigenous tribal honey-hunters from the high cliffs and ancient forest canopies of the Nallamala and Eastern Ghats hills. Extracted using manual gravity filtration without boiling or micro-filtering, keeping natural propolis, royal jelly traces, and pollen intact.',
      ingredients: '100% Raw Forest Honey (Apis dorsata). Unpasteurized, no added sugar, no corn syrup.',
      benefits: 'Natural antimicrobial agent, soothes throat irritation, boosts natural immunity, and serves as an enzyme-rich pre-biotic.',
      usageInstructions: 'Consume 1-2 teaspoons directly or mix in lukewarm water (never boiling water to preserve enzymes). Ideal natural sweetener for herbal teas.',
      price: 490.00,
      discountPrice: 440.00,
      sku: 'MG-HON-WILD-BASE',
      weightGrams: 500,
      isFeatured: true,
      variants: [
        {
          title: '500g Hexagon Glass Jar',
          sku: 'MG-HON-WILD-500G',
          priceOverride: 440.00,
          weightGrams: 500,
          stock: 65,
        },
        {
          title: '1kg Bulk Jar',
          sku: 'MG-HON-WILD-1KG',
          priceOverride: 820.00,
          weightGrams: 1000,
          stock: 40,
        },
      ],
    },
    {
      categorySlug: 'personal-care',
      name: 'Traditional Herbal Bath Powder (Sunni Pindi)',
      slug: 'traditional-herbal-bath-powder',
      shortDescription: 'Ancient 18-herb Ayurvedic bathing blend with green gram, vetiver, rose petals, and turmeric. Natural soap alternative.',
      description: 'Mana Grameena Sunni Pindi is an authentic village recipe passed down across generations. Formulated with green gram flour, wild turmeric, khus grass, kasturi manjal, poolan kizhangu, and sweet orange peel. It gently exfoliates, cleanses pores, and leaves skin naturally glowing and fragrant without chemical surfactants.',
      ingredients: 'Green Gram (Moong), Wild Turmeric, Rose Petals, Vetiver (Khus), Orange Peel, Fenugreek, Tulsi, Neem, Bawachi, Sandalwood flakes.',
      benefits: 'Gently removes dead skin cells, prevents body odor, evens skin tone, and protects natural skin lipid moisture without dryness.',
      usageInstructions: 'Mix 2 tablespoons with water, milk, or rosewater to make a smooth paste. Massage over damp skin in circular motions and rinse with lukewarm water.',
      price: 260.00,
      discountPrice: 225.00,
      sku: 'MG-SKN-SUNNI-BASE',
      weightGrams: 250,
      isFeatured: true,
      variants: [
        {
          title: '250g Cotton Pouch',
          sku: 'MG-SKN-SUNNI-250G',
          priceOverride: 225.00,
          weightGrams: 250,
          stock: 100,
        },
        {
          title: '500g Value Pack',
          sku: 'MG-SKN-SUNNI-500G',
          priceOverride: 410.00,
          weightGrams: 500,
          stock: 60,
        },
      ],
    },
  ];

  for (const prod of productsData) {
    const categoryId = categoryMap.get(prod.categorySlug);
    if (!categoryId) {
      throw new Error(`Category ${prod.categorySlug} not found during product seeding`);
    }

    const productRecord = await prisma.product.upsert({
      where: { slug: prod.slug },
      update: {
        name: prod.name,
        shortDescription: prod.shortDescription,
        description: prod.description,
        ingredients: prod.ingredients,
        benefits: prod.benefits,
        usageInstructions: prod.usageInstructions,
        price: prod.price,
        discountPrice: prod.discountPrice,
        sku: prod.sku,
        weightGrams: prod.weightGrams,
        isFeatured: prod.isFeatured,
        status: ProductStatus.PUBLISHED,
        categoryId,
      },
      create: {
        name: prod.name,
        slug: prod.slug,
        shortDescription: prod.shortDescription,
        description: prod.description,
        ingredients: prod.ingredients,
        benefits: prod.benefits,
        usageInstructions: prod.usageInstructions,
        price: prod.price,
        discountPrice: prod.discountPrice,
        sku: prod.sku,
        weightGrams: prod.weightGrams,
        isFeatured: prod.isFeatured,
        status: ProductStatus.PUBLISHED,
        categoryId,
      },
    });

    console.log(`  ✓ Product upserted: ${prod.name}`);

    // Seed base inventory using shared exported function
    await seedBaseInventory(prisma, productRecord.id);

    // Seed Variants
    for (const v of prod.variants) {
      const variantRecord = await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: {
          title: v.title,
          priceOverride: v.priceOverride,
          weightGrams: v.weightGrams,
          isActive: true,
          productId: productRecord.id,
        },
        create: {
          productId: productRecord.id,
          title: v.title,
          sku: v.sku,
          priceOverride: v.priceOverride,
          weightGrams: v.weightGrams,
          isActive: true,
        },
      });

      // Seed Variant Inventory
      const existingInv = await prisma.inventory.findFirst({
        where: { productId: productRecord.id, variantId: variantRecord.id },
      });
      if (existingInv) {
        await prisma.inventory.update({
          where: { id: existingInv.id },
          data: { stockQuantity: v.stock },
        });
      } else {
        await prisma.inventory.create({
          data: {
            productId: productRecord.id,
            variantId: variantRecord.id,
            stockQuantity: v.stock,
            lowStockThreshold: 5,
          },
        });
      }
      console.log(`    ↳ Variant upserted: ${v.title} (${v.sku}) - Stock: ${v.stock}`);
    }
  }

  // 3. Seed Promotional Coupons
  const couponsData = [
    {
      code: 'WELCOME10',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 10.00,
      minOrderAmount: 499.00,
      maxDiscountAmount: 150.00,
      perUserLimit: 1,
      startDate: new Date('2026-01-01T00:00:00Z'),
      expiryDate: new Date('2027-12-31T23:59:59Z'),
    },
    {
      code: 'GRAMEENA50',
      discountType: DiscountType.FIXED,
      discountValue: 50.00,
      minOrderAmount: 799.00,
      maxDiscountAmount: null,
      perUserLimit: 2,
      startDate: new Date('2026-01-01T00:00:00Z'),
      expiryDate: new Date('2027-12-31T23:59:59Z'),
    },
  ];

  for (const c of couponsData) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: {
        discountType: c.discountType,
        discountValue: c.discountValue,
        minOrderAmount: c.minOrderAmount,
        maxDiscountAmount: c.maxDiscountAmount,
        perUserLimit: c.perUserLimit,
        startDate: c.startDate,
        expiryDate: c.expiryDate,
      },
      create: {
        code: c.code,
        discountType: c.discountType,
        discountValue: c.discountValue,
        minOrderAmount: c.minOrderAmount,
        maxDiscountAmount: c.maxDiscountAmount,
        perUserLimit: c.perUserLimit,
        startDate: c.startDate,
        expiryDate: c.expiryDate,
      },
    });
    console.log(`  ✓ Coupon upserted: ${c.code}`);
  }

  console.log('\n✅ Mana Grameena database seeding completed successfully!');
}

// Auto-run when executed directly via CLI
if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    });
}
