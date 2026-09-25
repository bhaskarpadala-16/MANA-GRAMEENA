import './mock-server-only.js';
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, OrderStatus, ShippingStatus, PaymentStatus, UserRole, InventoryTxType } from '@prisma/client';
import { AuthenticatedUser } from '../lib/auth/guards';

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedCount++;
    process.exitCode = 1;
  }
}

async function main() {
  console.log('======================================================================');
  console.log('AUTOMATED REGRESSION: DELIVERED SHIPMENT/ORDER SYNCHRONIZATION & IDEMPOTENCY');
  console.log('======================================================================\n');

  // 1. Initialize PGlite and load schema
  const pglite = new PGlite();
  await pglite.waitReady;
  await pglite.exec("SET timezone = 'UTC';");

  const initSql = fs.readFileSync(
    path.join(process.cwd(), 'prisma/migrations/20260915000000_init/migration.sql'),
    'utf8'
  );
  await pglite.exec(initSql);
  console.log('[SETUP] Baseline PostgreSQL migration executed on PGlite.\n');

  // 2. Setup mockPool that proxies to PGlite
  function normalizeRows(rows: any[], fields: any[], isRowModeArray: boolean) {
    if (!rows || !fields) return rows;
    if (isRowModeArray) {
      return rows.map((row) =>
        row.map((val: any, idx: number) => {
          const field = fields[idx];
          if (val instanceof Date) {
            return val.toISOString();
          }
          if (field && (field.dataTypeID === 114 || field.dataTypeID === 3802)) {
            if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
              return JSON.stringify(val);
            }
          }
          return val;
        })
      );
    } else {
      return rows.map((row) => {
        const newRow = { ...row };
        for (const field of fields) {
          const val = newRow[field.name];
          if (val instanceof Date) {
            newRow[field.name] = val.toISOString();
          } else if (field && (field.dataTypeID === 114 || field.dataTypeID === 3802)) {
            if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
              newRow[field.name] = JSON.stringify(val);
            }
          }
        }
        return newRow;
      });
    }
  }

  const mockPool = Object.create(pg.Pool.prototype);
  Object.assign(mockPool, {
    options: {},
    connect: async () => {
      const client = {
        query: async (text: string | { text: string; values: any[]; rowMode?: string }, params?: any[]) => {
          const sql = typeof text === 'string' ? text : text.text;
          const vals = typeof text === 'string' ? params : text.values;
          const isRowModeArray = typeof text !== 'string' && text.rowMode === 'array';
          const opts: any = {};
          if (isRowModeArray) {
            opts.rowMode = 'array';
          }
          const res = await pglite.query(sql, vals, opts);
          const normalizedRows = normalizeRows(res.rows, res.fields, isRowModeArray);
          return { rows: normalizedRows, fields: res.fields, rowCount: res.rows?.length ?? 0 };
        },
        release: () => {},
        on: () => {},
        removeListener: () => {},
      };
      return client;
    },
    query: async (text: string | { text: string; values: any[]; rowMode?: string }, params?: any[]) => {
      const sql = typeof text === 'string' ? text : text.text;
      const vals = typeof text === 'string' ? params : text.values;
      const isRowModeArray = typeof text !== 'string' && text.rowMode === 'array';
      const opts: any = {};
      if (isRowModeArray) {
        opts.rowMode = 'array';
      }
      const res = await pglite.query(sql, vals, opts);
      const normalizedRows = normalizeRows(res.rows, res.fields, isRowModeArray);
      return { rows: normalizedRows, fields: res.fields, rowCount: res.rows?.length ?? 0 };
    },
    on: () => {},
    end: async () => {},
  });

  const adapter = new PrismaPg(mockPool);
  const prisma = new PrismaClient({ adapter });

  // Inject this in-memory prisma instance into globalThis so Server Actions use it
  (globalThis as any).prisma = prisma;

  // Dynamically import Server Actions after prisma is set in globalThis
  const { updateOrderStatusAction, updateShipmentTrackingAction } = await import(
    '../lib/actions/admin/orders'
  );

  // 3. Seed baseline test records
  const superAdminId = crypto.randomUUID();
  const superAdmin = await prisma.profile.create({
    data: {
      id: superAdminId,
      role: UserRole.SUPER_ADMIN,
      firstName: 'Super',
      lastName: 'Admin',
      isActive: true,
    },
  });

  const adminAuth: AuthenticatedUser = {
    id: superAdmin.id,
    email: 'superadmin@managrameena.com',
    role: superAdmin.role,
    firstName: superAdmin.firstName,
    lastName: superAdmin.lastName,
    isActive: true,
  };

  const customerId = crypto.randomUUID();
  const customer = await prisma.profile.create({
    data: {
      id: customerId,
      role: UserRole.CUSTOMER,
      firstName: 'Customer',
      lastName: 'User',
      isActive: true,
    },
  });

  const category = await prisma.category.create({
    data: {
      name: 'Organic Grains',
      slug: 'organic-grains',
      description: 'Healthy and natural grains',
    },
  });

  const product = await prisma.product.create({
    data: {
      categoryId: category.id,
      name: 'Pure Desi Rice',
      slug: 'pure-desi-rice',
      shortDescription: 'Organic Desi Rice from local farms',
      description: 'High quality grain with rich aroma and traditional taste.',
      ingredients: '100% Raw Desi Rice',
      benefits: 'Naturally gluten free and easy to digest',
      usageInstructions: 'Cook with 1:2 water ratio',
      price: 120.0,
      sku: 'RICE-001',
      weightGrams: 1000,
    },
  });

  const inventory = await prisma.inventory.create({
    data: {
      productId: product.id,
      stockQuantity: 100,
      reservedQuantity: 0,
    },
  });

  const sampleAddress = {
    fullName: 'Customer User',
    addressLine1: 'Plot 42, Green Avenue',
    city: 'Hyderabad',
    state: 'Telangana',
    postalCode: '500081',
    phone: '9876543210',
  };

  // =========================================================================
  // SUITE 1: Direction 1 — SHIPPED -> DELIVERED through updateOrderStatusAction
  // =========================================================================
  console.log('--- SUITE 1: Direction 1 (updateOrderStatusAction: SHIPPED -> DELIVERED) ---');

  // Reset inventory for Order 1: 50 stock, 2 reserved
  await prisma.inventory.update({
    where: { id: inventory.id },
    data: { stockQuantity: 50, reservedQuantity: 2 },
  });

  const orderNumber1 = `TEST-DELIV-1-${Date.now()}`;
  const order1 = await prisma.order.create({
    data: {
      userId: customer.id,
      orderNumber: orderNumber1,
      orderStatus: OrderStatus.SHIPPED,
      paymentStatus: PaymentStatus.VERIFIED,
      subtotal: 240.0,
      totalAmount: 240.0,
      shippingAddressSnapshot: sampleAddress,
      billingAddressSnapshot: sampleAddress,
      items: {
        create: [
          {
            productId: product.id,
            productNameSnapshot: product.name,
            skuSnapshot: 'RICE-001',
            unitPrice: 120.0,
            quantity: 2,
            totalPrice: 240.0,
          },
        ],
      },
      shipment: {
        create: {
          carrierName: 'SpeedPost India',
          trackingNumber: 'SP100200300IN',
          shippingStatus: ShippingStatus.SHIPPED,
          shippedAt: new Date(Date.now() - 86400000), // 1 day ago
        },
      },
    },
  });

  const res1 = await updateOrderStatusAction(
    { orderId: order1.id, newStatus: OrderStatus.DELIVERED, notes: 'Delivered to customer' },
    adminAuth
  );

  assert(res1.success === true, 'updateOrderStatusAction successfully returns success');

  const refreshedOrder1 = await prisma.order.findUnique({
    where: { id: order1.id },
    include: { shipment: true },
  });

  assert(
    refreshedOrder1?.orderStatus === OrderStatus.DELIVERED,
    'Order status correctly transitioned to DELIVERED'
  );
  assert(
    refreshedOrder1?.shipment?.shippingStatus === ShippingStatus.DELIVERED,
    'Shipment shippingStatus atomically synchronized to DELIVERED'
  );
  assert(
    refreshedOrder1?.shipment?.deliveredAt instanceof Date,
    'Shipment deliveredAt is recorded as a valid Date'
  );

  const refreshedInv1 = await prisma.inventory.findUnique({
    where: { id: inventory.id },
  });

  assert(
    refreshedInv1?.stockQuantity === 48,
    `Inventory stock quantity decremented from 50 to 48 (actual: ${refreshedInv1?.stockQuantity})`
  );
  assert(
    refreshedInv1?.reservedQuantity === 0,
    `Inventory reserved quantity decremented from 2 to 0 (actual: ${refreshedInv1?.reservedQuantity})`
  );

  const txLogs1 = await prisma.inventoryTransaction.findMany({
    where: {
      referenceId: orderNumber1,
      transactionType: InventoryTxType.ORDER_FULFILLED,
    },
  });
  assert(txLogs1.length === 1, 'Exactly one ORDER_FULFILLED inventory transaction recorded');
  assert(txLogs1[0]?.quantityDelta === -2, 'Inventory transaction delta correctly reflects -2');

  const notifications1 = await prisma.notification.findMany({
    where: {
      userId: customer.id,
      title: { contains: orderNumber1 },
    },
  });
  assert(notifications1.length === 1, 'Customer received exactly one order status update notification');
  assert(
    notifications1[0]?.message.includes('DELIVERED'),
    'Notification message explicitly mentions DELIVERED'
  );

  const auditLogs1 = await prisma.adminActivityLog.findMany({
    where: {
      entityId: order1.id,
      action: 'ORDER_STATUS_UPDATED',
    },
  });
  assert(auditLogs1.length === 1, 'Admin activity audit log recorded for ORDER_STATUS_UPDATED');

  // =========================================================================
  // SUITE 2: Idempotency of updateOrderStatusAction
  // =========================================================================
  console.log('\n--- SUITE 2: Idempotency (Repeat updateOrderStatusAction: DELIVERED) ---');

  const deliveredAtFirst = refreshedOrder1?.shipment?.deliveredAt?.getTime();

  const res1Repeat = await updateOrderStatusAction(
    { orderId: order1.id, newStatus: OrderStatus.DELIVERED, notes: 'Duplicate action attempt' },
    adminAuth
  );

  assert(res1Repeat.success === true, 'Repeated call to updateOrderStatusAction returns success');

  const invAfterRepeat = await prisma.inventory.findUnique({
    where: { id: inventory.id },
  });
  assert(
    invAfterRepeat?.stockQuantity === 48,
    `Inventory stock remained at 48 without duplicate decrement (actual: ${invAfterRepeat?.stockQuantity})`
  );
  assert(
    invAfterRepeat?.reservedQuantity === 0,
    `Inventory reserved remained at 0 (actual: ${invAfterRepeat?.reservedQuantity})`
  );

  const txLogsAfterRepeat = await prisma.inventoryTransaction.findMany({
    where: {
      referenceId: orderNumber1,
      transactionType: InventoryTxType.ORDER_FULFILLED,
    },
  });
  assert(txLogsAfterRepeat.length === 1, 'No duplicate ORDER_FULFILLED inventory transactions created');

  const shipmentAfterRepeat = await prisma.shipment.findUnique({
    where: { orderId: order1.id },
  });
  assert(
    shipmentAfterRepeat?.deliveredAt?.getTime() === deliveredAtFirst,
    'Original deliveredAt timestamp preserved without mutation'
  );

  // =========================================================================
  // SUITE 3: Direction 2 — Shipment SHIPPED -> DELIVERED through updateShipmentTrackingAction
  // =========================================================================
  console.log('\n--- SUITE 3: Direction 2 (updateShipmentTrackingAction: SHIPPED -> DELIVERED) ---');

  // Set inventory for Order 2: 48 stock, 3 reserved
  await prisma.inventory.update({
    where: { id: inventory.id },
    data: { stockQuantity: 48, reservedQuantity: 3 },
  });

  const orderNumber2 = `TEST-DELIV-2-${Date.now()}`;
  const order2 = await prisma.order.create({
    data: {
      userId: customer.id,
      orderNumber: orderNumber2,
      orderStatus: OrderStatus.SHIPPED,
      paymentStatus: PaymentStatus.VERIFIED,
      subtotal: 360.0,
      totalAmount: 360.0,
      shippingAddressSnapshot: sampleAddress,
      billingAddressSnapshot: sampleAddress,
      items: {
        create: [
          {
            productId: product.id,
            productNameSnapshot: product.name,
            skuSnapshot: 'RICE-001',
            unitPrice: 120.0,
            quantity: 3,
            totalPrice: 360.0,
          },
        ],
      },
      shipment: {
        create: {
          carrierName: 'Delhivery Surface',
          trackingNumber: 'DL12345678IN',
          shippingStatus: ShippingStatus.SHIPPED,
          shippedAt: new Date(Date.now() - 43200000), // 12 hours ago
        },
      },
    },
  });

  const res2 = await updateShipmentTrackingAction(
    {
      orderId: order2.id,
      carrierName: 'Delhivery Surface',
      trackingNumber: 'DL12345678IN',
      shippingStatus: ShippingStatus.DELIVERED,
    },
    adminAuth
  );

  assert(res2.success === true, 'updateShipmentTrackingAction returned success');
  assert(
    res2.shipment?.shippingStatus === ShippingStatus.DELIVERED,
    'Returned shipment payload contains shippingStatus DELIVERED'
  );
  assert(
    typeof res2.shipment?.deliveredAt === 'string' && res2.shipment.deliveredAt.length > 0,
    'Returned shipment payload contains serialized deliveredAt timestamp'
  );

  const refreshedOrder2 = await prisma.order.findUnique({
    where: { id: order2.id },
    include: { shipment: true },
  });

  assert(
    refreshedOrder2?.orderStatus === OrderStatus.DELIVERED,
    'Order status transitioned to DELIVERED via shipment tracking update'
  );
  assert(
    refreshedOrder2?.shipment?.shippingStatus === ShippingStatus.DELIVERED,
    'Shipment status confirmed as DELIVERED in database'
  );
  assert(
    refreshedOrder2?.shipment?.deliveredAt instanceof Date,
    'Shipment deliveredAt is a valid Date instance in database'
  );

  const refreshedInv2 = await prisma.inventory.findUnique({
    where: { id: inventory.id },
  });
  assert(
    refreshedInv2?.stockQuantity === 45,
    `Inventory stock decremented from 48 to 45 (actual: ${refreshedInv2?.stockQuantity})`
  );
  assert(
    refreshedInv2?.reservedQuantity === 0,
    `Inventory reserved decremented from 3 to 0 (actual: ${refreshedInv2?.reservedQuantity})`
  );

  const txLogs2 = await prisma.inventoryTransaction.findMany({
    where: {
      referenceId: orderNumber2,
      transactionType: InventoryTxType.ORDER_FULFILLED,
    },
  });
  assert(txLogs2.length === 1, 'Exactly one ORDER_FULFILLED inventory transaction recorded');
  assert(txLogs2[0]?.quantityDelta === -3, 'Inventory transaction delta correctly reflects -3');

  const notifications2 = await prisma.notification.findMany({
    where: {
      userId: customer.id,
      title: { contains: orderNumber2 },
    },
  });
  assert(notifications2.length === 1, 'Customer received exactly one DELIVERED notification');
  assert(
    notifications2[0]?.message.includes('DELIVERED'),
    'Notification message confirms DELIVERED state'
  );

  const shipmentAuditLogs2 = await prisma.adminActivityLog.findMany({
    where: {
      action: 'SHIPMENT_UPDATED',
      entityId: refreshedOrder2?.shipment?.id,
    },
  });
  assert(shipmentAuditLogs2.length === 1, 'SHIPMENT_UPDATED audit log entry recorded');

  const orderAuditLogs2 = await prisma.adminActivityLog.findMany({
    where: {
      action: 'ORDER_STATUS_UPDATED',
      entityId: order2.id,
    },
  });
  assert(orderAuditLogs2.length === 1, 'ORDER_STATUS_UPDATED audit log entry recorded');

  // =========================================================================
  // SUITE 4: Idempotency of updateShipmentTrackingAction
  // =========================================================================
  console.log('\n--- SUITE 4: Idempotency (Repeat updateShipmentTrackingAction: DELIVERED) ---');

  const deliveredAtFirst2 = refreshedOrder2?.shipment?.deliveredAt?.getTime();

  const res2Repeat = await updateShipmentTrackingAction(
    {
      orderId: order2.id,
      carrierName: 'Delhivery Surface (Priority)',
      trackingNumber: 'DL12345678IN-UPDATED',
      shippingStatus: ShippingStatus.DELIVERED,
    },
    adminAuth
  );

  assert(res2Repeat.success === true, 'Repeated updateShipmentTrackingAction returns success');

  const refreshedOrder2AfterRepeat = await prisma.order.findUnique({
    where: { id: order2.id },
    include: { shipment: true },
  });

  assert(
    refreshedOrder2AfterRepeat?.shipment?.carrierName === 'Delhivery Surface (Priority)',
    'Shipment tracking metadata safely updated on repeat action'
  );
  assert(
    refreshedOrder2AfterRepeat?.shipment?.trackingNumber === 'DL12345678IN-UPDATED',
    'Tracking number safely updated on repeat action'
  );
  const deliveredAtRepeat2 = refreshedOrder2AfterRepeat?.shipment?.deliveredAt?.getTime();
  assert(
    deliveredAtRepeat2 === deliveredAtFirst2,
    'Shipment deliveredAt timestamp preserved without reset'
  );

  const invAfterRepeat2 = await prisma.inventory.findUnique({
    where: { id: inventory.id },
  });
  assert(
    invAfterRepeat2?.stockQuantity === 45,
    `Inventory stock remained at 45 (NOT decremented twice! actual: ${invAfterRepeat2?.stockQuantity})`
  );
  assert(
    invAfterRepeat2?.reservedQuantity === 0,
    `Inventory reserved remained at 0 (actual: ${invAfterRepeat2?.reservedQuantity})`
  );

  const txLogsAfterRepeat2 = await prisma.inventoryTransaction.findMany({
    where: {
      referenceId: orderNumber2,
      transactionType: InventoryTxType.ORDER_FULFILLED,
    },
  });
  assert(txLogsAfterRepeat2.length === 1, 'No duplicate ORDER_FULFILLED transactions on repeat');

  const notificationsAfterRepeat2 = await prisma.notification.findMany({
    where: {
      userId: customer.id,
      title: { contains: orderNumber2 },
    },
  });
  assert(notificationsAfterRepeat2.length === 1, 'No duplicate customer notifications created on repeat');

  const orderAuditLogsAfterRepeat2 = await prisma.adminActivityLog.findMany({
    where: {
      action: 'ORDER_STATUS_UPDATED',
      entityId: order2.id,
    },
  });
  assert(orderAuditLogsAfterRepeat2.length === 1, 'No duplicate ORDER_STATUS_UPDATED audit logs created on repeat');

  // =========================================================================
  // SUITE 5: Zero Customer-Facing revalidatePath Calls Assertion
  // =========================================================================
  console.log('\n--- SUITE 5: Zero Customer-Facing revalidatePath In Admin Actions ---');
  const adminOrdersCode = fs.readFileSync(
    path.join(process.cwd(), 'lib/actions/admin/orders.ts'),
    'utf8'
  );

  const customerRevalMatches = adminOrdersCode.match(/revalidatePath\s*\(\s*['"`]\/orders/g);
  assert(
    customerRevalMatches === null,
    'Preserve commit 835fa0b: Zero customer-facing /orders revalidatePath calls in admin actions'
  );

  console.log('\n======================================================================');
  console.log(`TOTAL DELIVERED SYNCHRONIZATION TESTS: ${passedCount + failedCount}`);
  console.log(`PASSED: ${passedCount}`);
  console.log(`FAILED: ${failedCount}`);
  console.log('======================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Unhandled test execution error:', err);
  process.exit(1);
});
