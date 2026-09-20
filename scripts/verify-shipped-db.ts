import { createClient } from '@supabase/supabase-js';

async function check() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase secret configuration: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY is not defined.');
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const orderId = '8d6459e4-1abb-47fd-9913-392809f1e39e';

  console.log('======================================================================');
  console.log('MANA GRAMEENA — VERIFY SHIPPED ORDER DATABASE STATE');
  console.log('======================================================================\n');

  // 1. Order Details
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('*, profile:profiles(*)')
    .eq('id', orderId)
    .single();

  if (orderErr) {
    console.error('Order query error:', orderErr.message);
    return;
  }

  console.log('=== ORDER STATUS ===');
  console.log('Order ID:', order.id);
  console.log('Order Number:', order.order_number);
  console.log('Status:', order.order_status);
  console.log('Customer ID:', order.user_id);
  console.log('Customer Name:', order.profile?.first_name, order.profile?.last_name);

  // 2. Shipment Record
  console.log('\n=== SHIPMENT RECORD ===');
  const { data: shipments, error: shipErr } = await supabase
    .from('shipments')
    .select('*')
    .eq('order_id', orderId);

  if (shipErr) {
    console.error('Shipment query error:', shipErr.message);
  } else {
    console.log(`Total shipment records for order (${orderId}):`, shipments.length);
    shipments.forEach((s, idx) => {
      console.log(`  [${idx + 1}] ID: ${s.id} | Carrier: ${s.carrier_name} | Status: ${s.shipping_status} | ShippedAt: ${s.shipped_at} | CreatedAt: ${s.created_at}`);
    });
  }

  // 3. Notifications for Customer
  console.log('\n=== NOTIFICATION RECORDS ===');
  const { data: notifications, error: notifErr } = await supabase
    .from('notifications')
    .select('*')
    .eq('link_url', `/orders/${orderId}`)
    .order('created_at', { ascending: false });

  if (notifErr) {
    console.error('Notification query error:', notifErr.message);
  } else {
    console.log(`Total notifications for order (${orderId}):`, notifications.length);
    notifications.forEach((n, idx) => {
      console.log(`  [${idx + 1}] Title: "${n.title}" | Message: "${n.message}" | Read: ${n.is_read} | Created: ${n.created_at}`);
    });
  }

  // 4. Admin Activity Logs (public.admin_activity_logs)
  console.log('\n=== ADMIN ACTIVITY LOGS ===');
  const { data: auditLogs, error: auditErr } = await supabase
    .from('admin_activity_logs')
    .select('*')
    .eq('entity_id', orderId)
    .order('created_at', { ascending: false });

  if (auditErr) {
    console.error('Audit log query error:', auditErr.message);
  } else {
    console.log(`Total admin activity logs for order (${orderId}):`, auditLogs.length);
    auditLogs.forEach((a, idx) => {
      console.log(`  [${idx + 1}] Action: ${a.action} | ActorId: ${a.actor_id} | OldValues: ${JSON.stringify(a.old_values)} | NewValues: ${JSON.stringify(a.new_values)} | Created: ${a.created_at}`);
    });
  }

  // 5. Verification Assertions
  console.log('\n=== CRITERIA ASSERTIONS ===');
  const isShipped = order.order_status === 'SHIPPED';
  console.log(`[${isShipped ? 'PASS' : 'FAIL'}] Order status is SHIPPED (Actual: ${order.order_status})`);

  const shipmentCreated = shipments && shipments.length === 1 && shipments[0].shipping_status === 'SHIPPED';
  console.log(`[${shipmentCreated ? 'PASS' : 'FAIL'}] Shipment created/updated to SHIPPED (Count: ${shipments?.length}, Status: ${shipments?.[0]?.shipping_status})`);

  const hasNotification = notifications && notifications.some(n => n.message?.includes('SHIPPED') || n.title?.includes('Shipment'));
  console.log(`[${hasNotification ? 'PASS' : 'FAIL'}] Notification created for customer`);

  const hasAuditLog = auditLogs && auditLogs.some(a => a.action === 'ORDER_STATUS_UPDATED');
  console.log(`[${hasAuditLog ? 'PASS' : 'FAIL'}] Admin activity log created for ORDER_STATUS_UPDATED`);

  const noDuplicateShipment = shipments && shipments.length === 1;
  console.log(`[${noDuplicateShipment ? 'PASS' : 'FAIL'}] No duplicate shipments (Count: ${shipments?.length})`);

  const shippedAudits = auditLogs ? auditLogs.filter(a => a.action === 'ORDER_STATUS_UPDATED' && JSON.stringify(a.new_values).includes('SHIPPED')) : [];
  const noDuplicateAudit = shippedAudits.length === 1;
  console.log(`[${noDuplicateAudit ? 'PASS' : 'FAIL'}] No duplicate audit records for SHIPPED transition (Count: ${shippedAudits.length})`);

  const shippedNotifs = notifications ? notifications.filter(n => n.message?.includes('SHIPPED')) : [];
  const noDuplicateNotif = shippedNotifs.length === 1;
  console.log(`[${noDuplicateNotif ? 'PASS' : 'FAIL'}] No duplicate notification records for SHIPPED status change (Count: ${shippedNotifs.length})`);
}

check().catch(console.error);
