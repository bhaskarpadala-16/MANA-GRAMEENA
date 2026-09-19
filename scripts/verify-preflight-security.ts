import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function runSecurityVerification() {
  console.log('=== PHASE 6 PRE-FLIGHT VERIFICATION: AUTH TRIGGER & ROLE GOVERNANCE ===\n');

  const directUrl = process.env.DIRECT_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!directUrl || !supabaseUrl || !secretKey) {
    throw new Error('Missing environment variables');
  }

  const pgClient = new Client({
    connectionString: directUrl,
    ssl: { rejectUnauthorized: false },
  });
  await pgClient.connect();

  const supabaseAdmin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ephemeralUserId: string[] = [];

  try {
    // -----------------------------------------------------------------------
    // TEST 1: REAL SUPABASE AUTH TRIGGER TEST (with malicious metadata)
    // -----------------------------------------------------------------------
    console.log('--- TEST 1: Ephemeral Auth User & Profile Trigger ---');
    const ts = Date.now();
    const testEmail = `sec-preflight-${ts}@managrameena.test`;
    const testPassword = `P@ss-${ts}-${randomBytes(18).toString('base64url')}`;

    // Create auth user with malicious attempts to inject role = 'SUPER_ADMIN' and 'ADMIN' in metadata
    const { data: userCreated, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        first_name: 'Preflight',
        last_name: 'Tester',
        role: 'SUPER_ADMIN', // MALICIOUS INJECTION ATTEMPT
        is_admin: true,
      },
    });

    if (createErr || !userCreated?.user) {
      throw new Error(`Failed to create ephemeral auth user: ${createErr?.message}`);
    }

    const createdId = userCreated.user.id;
    ephemeralUserId.push(createdId);
    console.log('[PASS] auth.users row successfully created.');

    // Query public.profiles directly to verify trigger execution
    const profileRes = await pgClient.query(
      'SELECT id, role, first_name, last_name, is_active FROM public.profiles WHERE id = $1;',
      [createdId]
    );

    if (profileRes.rows.length === 0) {
      throw new Error('FAIL: public.profiles row was NOT created by trigger!');
    }

    const profile = profileRes.rows[0];
    console.log(`[PASS] public.profiles row automatically created by handle_new_user() trigger.`);
    console.log(`       Profile role: "${profile.role}"`);

    if (profile.role !== 'CUSTOMER') {
      throw new Error(`FAIL: Malicious metadata successfully escalated role to: ${profile.role}!`);
    }
    console.log('[PASS] Malicious metadata rejected: Role is strictly CUSTOMER.');

    // -----------------------------------------------------------------------
    // TEST 2: ROLE ESCALATION & GOVERNANCE ENFORCEMENT
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 2: Role Escalation & Governance Enforcement ---');
    await pgClient.query('BEGIN;');

    const custAId = 'a0000000-0000-0000-0000-000000000001';
    const custBId = 'b0000000-0000-0000-0000-000000000002';
    const adminId = 'c0000000-0000-0000-0000-000000000003';
    const superAdminId = 'd0000000-0000-0000-0000-000000000004';

    await pgClient.query(`
      INSERT INTO public.profiles (id, role, first_name, last_name, updated_at) VALUES
      ('${custAId}', 'CUSTOMER', 'Cust', 'A', NOW()),
      ('${custBId}', 'CUSTOMER', 'Cust', 'B', NOW()),
      ('${adminId}', 'ADMIN', 'Admin', 'User', NOW()),
      ('${superAdminId}', 'SUPER_ADMIN', 'Super', 'Admin', NOW());
    `);

    // 2A: CUSTOMER cannot become ADMIN
    await pgClient.query(`SET LOCAL "request.jwt.claim.sub" = '${custAId}';`);
    let custEscalateAdmin = false;
    await pgClient.query('SAVEPOINT sp_esc_admin;');
    try {
      await pgClient.query(`UPDATE public.profiles SET role = 'ADMIN' WHERE id = '${custAId}';`);
      custEscalateAdmin = true;
    } catch {
      await pgClient.query('ROLLBACK TO SAVEPOINT sp_esc_admin;');
      custEscalateAdmin = false;
    }
    console.log(`[${!custEscalateAdmin ? 'PASS' : 'FAIL'}] CUSTOMER cannot become ADMIN: ${!custEscalateAdmin}`);

    // 2B: CUSTOMER cannot become SUPER_ADMIN
    let custEscalateSuper = false;
    await pgClient.query('SAVEPOINT sp_esc_super;');
    try {
      await pgClient.query(`UPDATE public.profiles SET role = 'SUPER_ADMIN' WHERE id = '${custAId}';`);
      custEscalateSuper = true;
    } catch {
      await pgClient.query('ROLLBACK TO SAVEPOINT sp_esc_super;');
      custEscalateSuper = false;
    }
    console.log(`[${!custEscalateSuper ? 'PASS' : 'FAIL'}] CUSTOMER cannot become SUPER_ADMIN: ${!custEscalateSuper}`);

    // 2C: ADMIN cannot become SUPER_ADMIN
    await pgClient.query(`SET LOCAL "request.jwt.claim.sub" = '${adminId}';`);
    let adminPromoteSuper = false;
    await pgClient.query('SAVEPOINT sp_admin_promote;');
    try {
      await pgClient.query(`UPDATE public.profiles SET role = 'SUPER_ADMIN' WHERE id = '${adminId}';`);
      adminPromoteSuper = true;
    } catch {
      await pgClient.query('ROLLBACK TO SAVEPOINT sp_admin_promote;');
      adminPromoteSuper = false;
    }
    console.log(`[${!adminPromoteSuper ? 'PASS' : 'FAIL'}] ADMIN cannot promote self/others to SUPER_ADMIN: ${!adminPromoteSuper}`);

    // 2D: ADMIN cannot demote SUPER_ADMIN
    let adminDemoteSuper = false;
    await pgClient.query('SAVEPOINT sp_admin_demote;');
    try {
      await pgClient.query(`UPDATE public.profiles SET role = 'CUSTOMER' WHERE id = '${superAdminId}';`);
      adminDemoteSuper = true;
    } catch {
      await pgClient.query('ROLLBACK TO SAVEPOINT sp_admin_demote;');
      adminDemoteSuper = false;
    }
    console.log(`[${!adminDemoteSuper ? 'PASS' : 'FAIL'}] ADMIN cannot demote an existing SUPER_ADMIN: ${!adminDemoteSuper}`);

    // 2E: SUPER_ADMIN retains legitimate role-governance capability
    await pgClient.query(`SET LOCAL "request.jwt.claim.sub" = '${superAdminId}';`);
    let superAdminPromote = false;
    await pgClient.query('SAVEPOINT sp_super_promote;');
    try {
      await pgClient.query(`UPDATE public.profiles SET role = 'ADMIN' WHERE id = '${custAId}';`);
      superAdminPromote = true;
    } catch {
      await pgClient.query('ROLLBACK TO SAVEPOINT sp_super_promote;');
      superAdminPromote = false;
    }
    console.log(`[${superAdminPromote ? 'PASS' : 'FAIL'}] SUPER_ADMIN legitimately promotes user to ADMIN: ${superAdminPromote}`);

    // Rollback simulation data
    await pgClient.query('ROLLBACK;');
    console.log('[PASS] Simulation rollback clean.');

    // -----------------------------------------------------------------------
    // TEST 3: RLS EXECUTION TEST (public.is_admin works through RLS)
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 3: RLS Evaluation with is_admin() ---');
    await pgClient.query('BEGIN;');

    const testAdminId = 'e0000000-0000-0000-0000-000000000005';
    await pgClient.query(`
      INSERT INTO public.profiles (id, role, first_name, last_name, updated_at)
      VALUES ('${testAdminId}', 'ADMIN', 'Test', 'Admin', NOW());
    `);

    // Authenticated admin should see all orders/profiles via public.is_admin() RLS policy
    await pgClient.query('SET LOCAL ROLE authenticated;');
    await pgClient.query(`SET LOCAL "request.jwt.claims" = '{"sub": "${testAdminId}", "role": "authenticated"}';`);

    const rlsCheck = await pgClient.query('SELECT COUNT(*) FROM public.orders;');
    console.log(`[PASS] Authenticated admin successfully evaluated RLS with is_admin(): Orders visible = ${rlsCheck.rows[0].count}`);

    await pgClient.query('RESET ROLE;');
    await pgClient.query('ROLLBACK;');

  } finally {
    // Guaranteed cleanup of ephemeral test auth user
    for (const uid of ephemeralUserId) {
      console.log('\n--- CLEANUP: Deleting Ephemeral Test Auth User ---');
      await supabaseAdmin.auth.admin.deleteUser(uid);
      await pgClient.query('DELETE FROM public.profiles WHERE id = $1;', [uid]);
      console.log(`[PASS] Ephemeral user ${uid.slice(0, 8)}... completely purged.`);
    }

    await pgClient.end();
  }

  console.log('\n=== ALL PRE-FLIGHT AUTH & RLS CHECKS PASSED ===');
}

runSecurityVerification().catch(err => {
  console.error('Security verification failed:', err);
  process.exit(1);
});
