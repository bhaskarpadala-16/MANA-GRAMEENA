/**
 * MANA GRAMEENA — PHASE 3 AUTOMATED SECURITY, AUTHENTICATION & AUTHORIZATION VERIFICATION SUITE
 *
 * Comprehensive empirical validation covering:
 * 1. Architecture, File Structure, Migration & Server-Only Barriers
 * 2. Next.js 16 proxy.ts & @supabase/ssr Cookie Management
 * 3. Open Redirect Defense & Strict Zod Input Validation
 * 4. PostgreSQL 18.3 Engine Execution (PGlite WASM) & Zero-Trust RLS Role Enforcement
 * 5. Database Trigger on auth.users -> public.profiles with SECURITY DEFINER & search_path
 * 6. Multi-Tenant Role Isolation (Customer, Admin, Super Admin, Anonymous)
 * 7. Anti-Role-Escalation & Super Admin Governance Protection
 * 8. Dual-Layer Profile Provisioning & Self-Healing Zombie Account Prevention
 * 9. Independent Server-Side Authorization Guards (Tested independently of proxy)
 * 10. Separation of Customer & Admin Authentication Portals
 * 11. Cache-Control & Anti-Session-Leak Verification
 */

import fs from 'fs';
import path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { getSafeRedirectUrl, getTrustedOrigin } from '../lib/auth/redirect';
import {
  requireAdmin,
  requireSuperAdmin,
  requireCustomer,
  type AuthenticatedUser,
} from '../lib/auth/guards';
import { UserRole } from '@prisma/client';
import {
  signInSchema,
  signUpSchema,
  adminSignInSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../lib/auth/validation';

async function runPhase3Verification() {
  console.log('======================================================================');
  console.log('MANA GRAMEENA — PHASE 3 AUTHENTICATION & AUTHORIZATION GATE VERIFICATION');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  const rootDir = process.cwd();

  // =========================================================================
  // GATE 1: ARCHITECTURE, PROXY, MIGRATIONS & FILE INTEGRITY
  // =========================================================================
  console.log('--- GATE 1: Architecture, Proxy, Migrations & File Integrity ---');

  const proxyPath = path.join(rootDir, 'proxy.ts');
  assert(fs.existsSync(proxyPath), 'Next.js 16 proxy.ts exists at project root');
  const proxyCode = fs.readFileSync(proxyPath, 'utf8');
  assert(
    proxyCode.includes('export async function proxy') &&
      proxyCode.includes('export const config') &&
      proxyCode.includes('updateSession'),
    'proxy.ts: Correctly exports Next.js 16 proxy handler and route matcher config'
  );

  const supabaseProxyPath = path.join(rootDir, 'lib/supabase/proxy.ts');
  assert(fs.existsSync(supabaseProxyPath), 'lib/supabase/proxy.ts exists');
  const supabaseProxyCode = fs.readFileSync(supabaseProxyPath, 'utf8');
  assert(
    supabaseProxyCode.includes('supabase.auth.getClaims()') &&
      !supabaseProxyCode.includes('supabase.auth.getSession()') &&
      supabaseProxyCode.includes('Cache-Control') &&
      supabaseProxyCode.includes('private, no-cache, no-store'),
    'lib/supabase/proxy.ts: Uses getClaims() for cryptographic JWT verification and enforces private no-store headers'
  );

  const confirmRoutePath = path.join(rootDir, 'app/auth/confirm/route.ts');
  assert(fs.existsSync(confirmRoutePath), 'Email confirmation route /auth/confirm exists');
  const confirmCode = fs.readFileSync(confirmRoutePath, 'utf8');
  assert(
    confirmCode.includes('supabase.auth.verifyOtp') &&
      confirmCode.includes('token_hash') &&
      confirmCode.includes("dynamic = 'force-dynamic'"),
    '/auth/confirm: Explicitly implements verifyOtp with token_hash and dynamic force-dynamic'
  );

  const callbackRoutePath = path.join(rootDir, 'app/auth/callback/route.ts');
  assert(fs.existsSync(callbackRoutePath), 'Auth callback & recovery route /auth/callback exists');
  const callbackCode = fs.readFileSync(callbackRoutePath, 'utf8');
  assert(
    callbackCode.includes('exchangeCodeForSession') &&
      callbackCode.includes('/reset-password') &&
      callbackCode.includes("dynamic = 'force-dynamic'"),
    '/auth/callback: Implements exchangeCodeForSession and recovery routing to /reset-password'
  );

  // Phase 3 trigger migration check
  const triggerMigrationPath = path.join(
    rootDir,
    'prisma/migrations/20260916000000_auth_trigger/migration.sql'
  );
  assert(
    fs.existsSync(triggerMigrationPath),
    'Phase 3 Migration: 20260916000000_auth_trigger migration exists'
  );
  const triggerSql = fs.readFileSync(triggerMigrationPath, 'utf8');
  assert(
    triggerSql.includes('CREATE OR REPLACE FUNCTION public.handle_new_user()') &&
      triggerSql.includes('SECURITY DEFINER') &&
      triggerSql.includes('SET search_path = public, pg_temp') &&
      triggerSql.includes("'CUSTOMER'") &&
      triggerSql.includes('REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC'),
    'Phase 3 Migration: handle_new_user() uses SECURITY DEFINER, search_path = public, pg_temp, CUSTOMER role, and revoked public execution'
  );
  assert(
    !triggerSql.includes('EXCEPTION') && !triggerSql.includes('WHEN OTHERS'),
    'Phase 3 Migration: handle_new_user() does not suppress exceptions, guaranteeing atomic transaction rollback on profile insert failure'
  );

  // Server-only barriers audit
  const serverFiles = [
    'lib/supabase/admin.ts',
    'lib/db/index.ts',
    'lib/auth/session.ts',
    'lib/auth/guards.ts',
  ];
  for (const file of serverFiles) {
    const content = fs.readFileSync(path.join(rootDir, file), 'utf8');
    assert(
      content.includes("import 'server-only'") || content.includes("'use server'"),
      `Security Barrier: ${file} is strictly guarded with server-only protection`
    );
  }

  // =========================================================================
  // GATE 2: OPEN REDIRECT DEFENSE & ZOD VALIDATION
  // =========================================================================
  console.log('\n--- GATE 2: Open Redirect Defense & Zod Validation ---');

  // Open redirect tests
  assert(
    getSafeRedirectUrl('https://attacker.com/evil') === '/account',
    'Redirect Defense: Rejects absolute external URLs (https://attacker.com)'
  );
  assert(
    getSafeRedirectUrl('//attacker.com/evil') === '/account',
    'Redirect Defense: Rejects protocol-relative URLs (//attacker.com)'
  );
  assert(
    getSafeRedirectUrl('/\\attacker.com/evil') === '/account',
    'Redirect Defense: Rejects backslash normalized URLs (/\\attacker.com)'
  );
  assert(
    getSafeRedirectUrl('/%5c%5cattacker.com/evil') === '/account',
    'Redirect Defense: Rejects URL-encoded backslash attacks (/%5c%5c)'
  );
  assert(
    getSafeRedirectUrl('javascript:alert(1)') === '/account',
    'Redirect Defense: Rejects javascript: URI scheme'
  );
  assert(
    getSafeRedirectUrl('/account\r\nSet-Cookie: evil=1') === '/account',
    'Redirect Defense: Rejects CRLF injection and HTTP response splitting attempts'
  );
  assert(
    getSafeRedirectUrl('/account/orders') === '/account/orders',
    'Redirect Defense: Preserves safe internal relative routes (/account/orders)'
  );
  assert(
    getSafeRedirectUrl('/checkout?step=2') === '/checkout?step=2',
    'Redirect Defense: Preserves safe internal relative routes with query params (/checkout?step=2)'
  );
  assert(
    getSafeRedirectUrl('/unallowlisted-path/test') === '/account',
    'Redirect Defense: Rejects unallowlisted internal paths (/unallowlisted-path/test)'
  );

  // Zod validation tests
  const validSignUp = signUpSchema.safeParse({
    email: 'customer@managrameena.com',
    password: 'SecurePassword123!',
    firstName: 'Bhaskar',
    lastName: 'Padala',
    phone: '+91 9876543210',
  });
  assert(validSignUp.success, 'Zod Validation: Accepts valid customer registration payload');

  const shortPasswordSignUp = signUpSchema.safeParse({
    email: 'customer@managrameena.com',
    password: 'short',
    firstName: 'Bhaskar',
    lastName: 'Padala',
  });
  assert(
    !shortPasswordSignUp.success,
    'Zod Validation: Rejects passwords shorter than 8 characters'
  );

  // Verify role injection cannot pass or pollute
  const injectedRoleSignUp = signUpSchema.safeParse({
    email: 'attacker@managrameena.com',
    password: 'SecurePassword123!',
    firstName: 'Attacker',
    lastName: 'User',
    role: 'SUPER_ADMIN', // Injected role attempt
  });
  assert(
    injectedRoleSignUp.success && !('role' in (injectedRoleSignUp.data as Record<string, unknown>)),
    'Anti-Escalation: Zod signUpSchema completely strips client-supplied role fields'
  );

  const validReset = resetPasswordSchema.safeParse({
    password: 'NewStrongPassword123!',
    confirmPassword: 'NewStrongPassword123!',
  });
  assert(validReset.success, 'Zod Validation: Accepts valid matching password reset');

  const mismatchedReset = resetPasswordSchema.safeParse({
    password: 'NewStrongPassword123!',
    confirmPassword: 'DifferentPassword456!',
  });
  assert(!mismatchedReset.success, 'Zod Validation: Rejects mismatched password confirmation');

  // =========================================================================
  // GATE 3: POSTGRESQL 18.3 ENGINE (PGLITE) & ZERO-TRUST RLS ROLE ENFORCEMENT
  // =========================================================================
  console.log('\n--- GATE 3: PostgreSQL Engine Execution & RLS Role Enforcement ---');
  const db = new PGlite();
  await db.waitReady;

  // Setup mock auth schema simulating Supabase Auth
  await db.exec(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
    $$ LANGUAGE sql STABLE;
    CREATE TABLE IF NOT EXISTS auth.users (
      id UUID PRIMARY KEY,
      raw_user_meta_data JSONB
    );
  `);

  // Load migrations from Phase 2 & Phase 3
  const baselineSql = fs.readFileSync(
    path.join(rootDir, 'prisma/migrations/20260915000000_init/migration.sql'),
    'utf8'
  );
  const rlsSql = fs.readFileSync(
    path.join(rootDir, 'prisma/migrations/20260915000001_rls_policies/migration.sql'),
    'utf8'
  );

  await db.exec(baselineSql);
  await db.exec(rlsSql);
  await db.exec(triggerSql);

  // Configure non-superuser authenticated role to simulate Supabase client requests under RLS
  await db.exec(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
      END IF;
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon;
      END IF;
    END
    $$;
    GRANT USAGE ON SCHEMA public TO authenticated, anon;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, anon;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon;
  `);

  // Setup test user UUIDs
  const customerAId = '11111111-1111-1111-1111-111111111111';
  const customerBId = '22222222-2222-2222-2222-222222222222';
  const adminId = '33333333-3333-3333-3333-333333333333';
  const superAdminId = '44444444-4444-4444-4444-444444444444';

  // Seed baseline profiles as superuser (auth.uid() = NULL)
  await db.exec(`
    INSERT INTO public.profiles (id, role, first_name, last_name, is_active, updated_at) VALUES
      ('${customerAId}', 'CUSTOMER', 'Customer', 'One', true, NOW()),
      ('${customerBId}', 'CUSTOMER', 'Customer', 'Two', true, NOW()),
      ('${adminId}', 'ADMIN', 'Store', 'Admin', true, NOW()),
      ('${superAdminId}', 'SUPER_ADMIN', 'Platform', 'SuperAdmin', true, NOW());
  `);

  // 1. Test database trigger on auth.users -> public.profiles
  const autoTriggerId = '77777777-7777-7777-7777-777777777777';
  await db.exec(`
    INSERT INTO auth.users (id, raw_user_meta_data)
    VALUES ('${autoTriggerId}', '{"first_name": "AutoTriggered", "last_name": "Customer", "phone": "+919876543210"}');
  `);
  const autoProfile = await db.query<{ role: string; first_name: string }>(
    `SELECT role, first_name FROM public.profiles WHERE id = '${autoTriggerId}';`
  );
  assert(
    autoProfile.rows.length === 1 &&
      autoProfile.rows[0].role === 'CUSTOMER' &&
      autoProfile.rows[0].first_name === 'AutoTriggered',
    'Database Trigger: Inserting into auth.users automatically creates public.profiles as CUSTOMER'
  );

  // 2. Customer registration profile creation: customer can insert their OWN profile as CUSTOMER
  const newCustId = '55555555-5555-5555-5555-555555555555';
  await db.exec(`
    SET ROLE authenticated;
    SET request.jwt.claim.sub = '${newCustId}';
  `);
  await db.exec(`
    INSERT INTO public.profiles (id, role, first_name, last_name, is_active, updated_at)
    VALUES ('${newCustId}', 'CUSTOMER', 'Fresh', 'Customer', true, NOW());
  `);

  const freshProfile = await db.query<{ role: string }>(
    `SELECT role FROM public.profiles WHERE id = '${newCustId}';`
  );
  assert(
    freshProfile.rows.length === 1 && freshProfile.rows[0].role === 'CUSTOMER',
    'Customer Registration: Self-provisioning creates valid CUSTOMER profile'
  );

  // 3. Customer self-promotion defense: Customer cannot insert role = ADMIN
  const rogueCustId = '66666666-6666-6666-6666-666666666666';
  await db.exec(`
    SET ROLE authenticated;
    SET request.jwt.claim.sub = '${rogueCustId}';
  `);
  let rogueInsertFailed = false;
  try {
    await db.exec(`
      INSERT INTO public.profiles (id, role, first_name, last_name, is_active, updated_at)
      VALUES ('${rogueCustId}', 'ADMIN', 'Rogue', 'Customer', true, NOW());
    `);
  } catch {
    rogueInsertFailed = true;
  }
  assert(
    rogueInsertFailed,
    'Anti-Role-Escalation: Customer cannot register or insert profile with role = ADMIN (denied by RLS & trigger)'
  );

  // 4. Customer self-update defense: Customer cannot promote self to ADMIN or SUPER_ADMIN
  await db.exec(`
    SET ROLE authenticated;
    SET request.jwt.claim.sub = '${customerAId}';
  `);
  let customerEscalateFailed = false;
  try {
    await db.exec(`
      UPDATE public.profiles SET role = 'ADMIN' WHERE id = '${customerAId}';
    `);
  } catch {
    customerEscalateFailed = true;
  }
  assert(
    customerEscalateFailed,
    'Anti-Role-Escalation: Customer cannot update own profile to ADMIN (denied by RLS & trigger)'
  );

  // 5. Admin promotion defense: Admin cannot promote any user to SUPER_ADMIN
  await db.exec(`
    SET ROLE authenticated;
    SET request.jwt.claim.sub = '${adminId}';
  `);
  let adminSuperEscalateFailed = false;
  try {
    await db.exec(`
      UPDATE public.profiles SET role = 'SUPER_ADMIN' WHERE id = '${customerAId}';
    `);
  } catch {
    adminSuperEscalateFailed = true;
  }
  assert(
    adminSuperEscalateFailed,
    'Anti-Role-Escalation: Regular ADMIN cannot promote user to SUPER_ADMIN (blocked by prevent_profile_role_escalation)'
  );

  // 6. Admin demotion defense: Admin cannot demote an existing SUPER_ADMIN
  let adminDemoteSuperFailed = false;
  try {
    await db.exec(`
      UPDATE public.profiles SET role = 'ADMIN' WHERE id = '${superAdminId}';
    `);
  } catch {
    adminDemoteSuperFailed = true;
  }
  assert(
    adminDemoteSuperFailed,
    'Anti-Role-Escalation: Regular ADMIN cannot demote a SUPER_ADMIN (blocked by prevent_profile_role_escalation)'
  );

  // 7. Super Admin governance: Super Admin CAN modify roles legitimately
  await db.exec(`
    SET ROLE authenticated;
    SET request.jwt.claim.sub = '${superAdminId}';
  `);
  await db.exec(`
    UPDATE public.profiles SET role = 'ADMIN' WHERE id = '${customerBId}';
  `);
  const updatedCustomerB = await db.query<{ role: string }>(
    `SELECT role FROM public.profiles WHERE id = '${customerBId}';`
  );
  assert(
    updatedCustomerB.rows[0].role === 'ADMIN',
    'Super Admin Governance: SUPER_ADMIN can legitimately promote a user to ADMIN'
  );

  // 8. Multi-tenant privacy: Customer A cannot read Customer B's private profile
  await db.exec(`
    SET ROLE authenticated;
    SET request.jwt.claim.sub = '${customerAId}';
  `);
  const custBViewFromA = await db.query(
    `SELECT * FROM public.profiles WHERE id = '${customerBId}';`
  );
  assert(
    custBViewFromA.rows.length === 0,
    'Multi-Tenant Isolation: Customer A cannot view or query Customer B profile'
  );

  // 9. Anonymous access defense: Anonymous cannot read any customer profiles
  await db.exec(`
    SET ROLE anon;
    SET request.jwt.claim.sub = '';
  `);
  const anonProfiles = await db.query(`SELECT * FROM public.profiles;`);
  assert(
    anonProfiles.rows.length === 0,
    'Anonymous Isolation: Anonymous requests cannot read customer profiles'
  );

  // Reset back to superuser for clean teardown
  await db.exec('RESET ROLE;');

  // =========================================================================
  // GATE 4: SERVER-SIDE AUTHORIZATION GUARDS INDEPENDENCE
  // =========================================================================
  console.log('\n--- GATE 4: Server-Side Authorization Guards Independence ---');

  // Exercise exported production guards directly via dependency-injection seam
  const testCustomer: AuthenticatedUser = {
    id: 'test-cust',
    email: 'customer@test.com',
    role: UserRole.CUSTOMER,
    firstName: 'Test',
    lastName: 'Customer',
    isActive: true,
  };

  const testDeactivatedAdmin: AuthenticatedUser = {
    id: 'test-deact-admin',
    email: 'deact-admin@test.com',
    role: UserRole.ADMIN,
    firstName: 'Deact',
    lastName: 'Admin',
    isActive: false,
  };

  const testActiveAdmin: AuthenticatedUser = {
    id: 'test-admin',
    email: 'admin@test.com',
    role: UserRole.ADMIN,
    firstName: 'Store',
    lastName: 'Admin',
    isActive: true,
  };

  const testDeactivatedSuperAdmin: AuthenticatedUser = {
    id: 'test-deact-super',
    email: 'deact-super@test.com',
    role: UserRole.SUPER_ADMIN,
    firstName: 'Deact',
    lastName: 'Super',
    isActive: false,
  };

  const testActiveSuperAdmin: AuthenticatedUser = {
    id: 'test-super',
    email: 'super@test.com',
    role: UserRole.SUPER_ADMIN,
    firstName: 'Platform',
    lastName: 'Super',
    isActive: true,
  };

  let customerAdminAccessBlocked = false;
  try {
    await requireAdmin(testCustomer);
  } catch (err) {
    if ((err as Error).message.includes('Administrative privileges required')) {
      customerAdminAccessBlocked = true;
    }
  }
  assert(
    customerAdminAccessBlocked,
    'Production Guard: requireAdmin() strictly rejects CUSTOMER role'
  );

  let inactiveAdminBlocked = false;
  try {
    await requireAdmin(testDeactivatedAdmin);
  } catch (err) {
    if ((err as Error).message.includes('Administrator account is inactive')) {
      inactiveAdminBlocked = true;
    }
  }
  assert(
    inactiveAdminBlocked,
    'Production Guard: requireAdmin() strictly rejects deactivated administrator accounts'
  );

  let adminSuperAdminAccessBlocked = false;
  try {
    await requireSuperAdmin(testActiveAdmin);
  } catch (err) {
    if ((err as Error).message.includes('Super Administrative privileges required')) {
      adminSuperAdminAccessBlocked = true;
    }
  }
  assert(
    adminSuperAdminAccessBlocked,
    'Production Guard: requireSuperAdmin() strictly rejects regular ADMIN role'
  );

  let inactiveSuperAdminBlocked = false;
  try {
    await requireSuperAdmin(testDeactivatedSuperAdmin);
  } catch (err) {
    if ((err as Error).message.includes('Super Administrator account is inactive')) {
      inactiveSuperAdminBlocked = true;
    }
  }
  assert(
    inactiveSuperAdminBlocked,
    'Production Guard: requireSuperAdmin() strictly rejects deactivated super administrator accounts'
  );

  const adminAllowed = await requireAdmin(testActiveAdmin);
  assert(adminAllowed.id === testActiveAdmin.id, 'Production Guard: requireAdmin() permits active ADMIN role');

  const superAdminAllowed = await requireSuperAdmin(testActiveSuperAdmin);
  assert(
    superAdminAllowed.id === testActiveSuperAdmin.id,
    'Production Guard: requireSuperAdmin() permits active SUPER_ADMIN role'
  );

  // =========================================================================
  // GATE 5: SEPARATION OF CUSTOMER & ADMIN AUTHENTICATION
  // =========================================================================
  console.log('\n--- GATE 5: Customer vs Admin Authentication Separation ---');

  const adminLoginPage = fs.readFileSync(path.join(rootDir, 'app/admin/login/page.tsx'), 'utf8');
  assert(
    adminLoginPage.includes('signInAdminAction') &&
      adminLoginPage.includes('bg-herbal-950') &&
      adminLoginPage.includes('ShieldCheck'),
    'Admin Login Separation: Dedicated /admin/login portal with isolated signInAdminAction'
  );

  const customerLoginPage = fs.readFileSync(
    path.join(rootDir, 'app/(auth)/login/page.tsx'),
    'utf8'
  );
  assert(
    customerLoginPage.includes('signInCustomerAction') &&
      !customerLoginPage.includes('signInAdminAction'),
    'Customer Login Separation: Standard /login portal strictly uses signInCustomerAction'
  );

  const actionsCode = fs.readFileSync(path.join(rootDir, 'lib/auth/actions.ts'), 'utf8');
  assert(
    actionsCode.includes('signInAdminAction') &&
      actionsCode.includes('profile.role !== UserRole.ADMIN') &&
      actionsCode.includes('await supabase.auth.signOut()'),
    'Admin Auth Security: signInAdminAction immediately revokes session if authenticated user is CUSTOMER'
  );

  assert(
    actionsCode.includes('getTrustedOrigin('),
    'Host Header Defense: actions.ts strictly delegates origin selection to getTrustedOrigin helper'
  );

  // Behavioral origin precedence test
  const envMap = process.env as Record<string, string | undefined>;
  const prevSiteUrl = envMap.NEXT_PUBLIC_SITE_URL;
  const prevNodeEnv = envMap.NODE_ENV;

  try {
    // 1. When NEXT_PUBLIC_SITE_URL is set, attacker client origin header is completely ignored
    envMap.NEXT_PUBLIC_SITE_URL = 'https://managrameena.com';
    envMap.NODE_ENV = 'production';
    const resolvedOrigin = getTrustedOrigin('https://attacker.evil.com');
    assert(
      resolvedOrigin === 'https://managrameena.com',
      'Host Header Defense: getTrustedOrigin ignores attacker client origin when NEXT_PUBLIC_SITE_URL is set'
    );

    // 2. In production without NEXT_PUBLIC_SITE_URL, attacker origin header is strictly rejected
    delete envMap.NEXT_PUBLIC_SITE_URL;
    envMap.NODE_ENV = 'production';
    const prodFallback = getTrustedOrigin('https://attacker.evil.com');
    assert(
      prodFallback === 'http://localhost:3000',
      'Host Header Defense: In production without site URL, attacker origin header is strictly rejected'
    );

    // 3. In development without NEXT_PUBLIC_SITE_URL, local dev origin is permitted
    envMap.NODE_ENV = 'development';
    const devOrigin = getTrustedOrigin('http://localhost:3001');
    assert(
      devOrigin === 'http://localhost:3001',
      'Development Origin: Permitted in development when site URL is unset'
    );

    // 4. Origin normalization: Trailing slashes and path subdirectories are normalized to pure origin
    envMap.NEXT_PUBLIC_SITE_URL = 'https://managrameena.com/extra/path/';
    envMap.NODE_ENV = 'production';
    const normalizedOrigin = getTrustedOrigin();
    assert(
      normalizedOrigin === 'https://managrameena.com',
      'Origin Validation: Normalizes NEXT_PUBLIC_SITE_URL to pure origin and strips trailing slashes'
    );

    // 5. Malformed URL resilience: Non-URL string safely falls back rather than producing malformed auth links
    envMap.NEXT_PUBLIC_SITE_URL = 'not-a-valid-protocol://';
    const malformedFallback = getTrustedOrigin();
    assert(
      malformedFallback === 'http://localhost:3000',
      'Origin Validation: Malformed NEXT_PUBLIC_SITE_URL safely falls back to default origin'
    );
  } finally {
    envMap.NEXT_PUBLIC_SITE_URL = prevSiteUrl;
    envMap.NODE_ENV = prevNodeEnv;
  }

  // =========================================================================
  // GATE 6: DUAL-LAYER PROFILE PROVISIONING & ANTI-ZOMBIE FALLBACK
  // =========================================================================
  console.log('\n--- GATE 6: Dual-Layer Profile Provisioning & Anti-Zombie Fallback ---');

  const sessionCode = fs.readFileSync(path.join(rootDir, 'lib/auth/session.ts'), 'utf8');
  assert(
    sessionCode.includes('prisma.profile.upsert') &&
      sessionCode.includes('role: UserRole.CUSTOMER') &&
      sessionCode.includes('getClaims()'),
    'Anti-Zombie Provisioning: lib/auth/session.ts includes self-healing profile fallback with hardcoded CUSTOMER role'
  );

  // =========================================================================
  // GATE 7: CACHE DEFENSE ON AUTHENTICATED ROUTES
  // =========================================================================
  console.log('\n--- GATE 7: Cache Defense on Authenticated Routes ---');

  const protectedRoutes = [
    'app/account/page.tsx',
    'app/account/profile/page.tsx',
    'app/account/addresses/page.tsx',
    'app/account/orders/page.tsx',
    'app/account/wishlist/page.tsx',
    'app/account/notifications/page.tsx',
    'app/admin/page.tsx',
    'app/admin/products/page.tsx',
    'app/admin/orders/page.tsx',
    'app/admin/inventory/page.tsx',
    'app/admin/customers/page.tsx',
    'app/admin/reviews/page.tsx',
    'app/admin/coupons/page.tsx',
    'app/admin/notifications/page.tsx',
    'app/admin/activity/page.tsx',
    'app/auth/confirm/route.ts',
    'app/auth/callback/route.ts',
  ];

  let allRoutesDynamic = true;
  for (const route of protectedRoutes) {
    let targetPath = path.join(rootDir, route);
    if (!fs.existsSync(targetPath)) {
      const groupedPath = path.join(rootDir, route.replace('app/admin/', 'app/admin/(dashboard)/'));
      if (fs.existsSync(groupedPath)) {
        targetPath = groupedPath;
      }
    }
    const routeContent = fs.readFileSync(targetPath, 'utf8');
    if (!routeContent.includes("dynamic = 'force-dynamic'")) {
      console.error(`Route missing force-dynamic: ${route}`);
      allRoutesDynamic = false;
    }
  }
  assert(
    allRoutesDynamic,
    `Anti-Cache Defense: All ${protectedRoutes.length} authenticated pages & callbacks export dynamic = 'force-dynamic'`
  );

  // Close PGlite database cleanly
  await db.close();

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n======================================================================');
  console.log(`PHASE 3 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase3Verification().catch((err) => {
  console.error('Phase 3 Verification unhandled exception:', err);
  process.exit(1);
});
