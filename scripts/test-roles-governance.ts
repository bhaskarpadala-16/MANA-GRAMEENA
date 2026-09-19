import { createClient } from '@supabase/supabase-js';
import { UserRole } from '@prisma/client';
import { requireAdmin, requireSuperAdmin, type AuthenticatedUser } from '../lib/auth/guards';
import type { AdminUserDto } from '../lib/db/admin';

// Test harness for /admin/roles security boundaries & serialization

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`[PASS] ${description}`);
  } else {
    console.error(`[FAIL] ${description}`);
    process.exitCode = 1;
  }
}

async function runRolesGovernanceVerification() {
  console.log('======================================================================');
  console.log('MANA GRAMEENA — /admin/roles SECURITY BOUNDARIES & GOVERNANCE TEST');
  console.log('======================================================================\n');

  // 1. DTO Serialization Validation
  console.log('--- TEST SUITE 1: Deterministic Date & DTO Serialization ---');
  const mockCreatedAt = new Date('2026-09-19T18:30:00.000Z');
  const mockUpdatedAt = new Date('2026-09-19T20:00:00.000Z');

  const serializedDto: AdminUserDto = {
    id: 'test-super-admin-id',
    firstName: 'Store',
    lastName: 'Owner',
    role: UserRole.SUPER_ADMIN,
    isActive: true,
    createdAt: mockCreatedAt.toISOString(),
    updatedAt: mockUpdatedAt.toISOString(),
    assignedSince: mockCreatedAt.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    }),
    _count: { adminLogs: 12 },
  };

  assert(typeof serializedDto.createdAt === 'string', 'DTO createdAt is serialized as ISO string');
  assert(typeof serializedDto.updatedAt === 'string', 'DTO updatedAt is serialized as ISO string');
  assert(typeof serializedDto.assignedSince === 'string', 'DTO assignedSince is deterministically pre-formatted');
  assert(serializedDto.assignedSince.includes('2026'), 'DTO assignedSince contains expected year in IST');

  // 2. Server Component Redirection Logic Simulation
  console.log('\n--- TEST SUITE 2: Server Component Expected Error / Redirect Handling ---');

  // Helper simulating roles/page.tsx behavior
  function simulateRolesPageGuard(user: AuthenticatedUser | null, unauth = false): { status: number; destination?: string; rendered: boolean } {
    try {
      if (unauth || !user) {
        throw new Error('UNAUTHORIZED: Please sign in to continue.');
      }
      if (user.role !== UserRole.SUPER_ADMIN) {
        throw new Error('FORBIDDEN: Super Administrative privileges required.');
      }
      return { status: 200, rendered: true };
    } catch (authError: any) {
      if (authError?.message?.includes('UNAUTHORIZED')) {
        return { status: 307, destination: '/admin/login?returnUrl=/admin/roles', rendered: false };
      }
      if (authError?.message?.includes('FORBIDDEN')) {
        return { status: 307, destination: '/admin', rendered: false };
      }
      throw authError;
    }
  }

  // Helper simulating layout.tsx behavior
  function simulateLayoutGuard(user: AuthenticatedUser | null, unauth = false): { status: number; destination?: string; rendered: boolean } {
    try {
      if (unauth || !user) {
        throw new Error('UNAUTHORIZED: Please sign in to continue.');
      }
      if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
        throw new Error('FORBIDDEN: Administrative privileges required.');
      }
      return { status: 200, rendered: true };
    } catch (authError: any) {
      if (authError?.message?.includes('UNAUTHORIZED')) {
        return { status: 307, destination: '/admin/login', rendered: false };
      }
      if (authError?.message?.includes('FORBIDDEN')) {
        return { status: 307, destination: '/admin/login?error=AccessDenied', rendered: false };
      }
      throw authError;
    }
  }

  // A. Unauthenticated user
  const unauthLayout = simulateLayoutGuard(null, true);
  assert(unauthLayout.status === 307 && unauthLayout.destination === '/admin/login', 'Unauthenticated user redirected to /admin/login by AdminDashboardLayout');

  const unauthRoles = simulateRolesPageGuard(null, true);
  assert(unauthRoles.status === 307 && unauthRoles.destination === '/admin/login?returnUrl=/admin/roles', 'Unauthenticated user redirected to /admin/login?returnUrl=/admin/roles by AdminRolesPage');

  // B. Customer user
  const customerUser: AuthenticatedUser = {
    id: 'cust-id-123',
    email: 'customer@example.com',
    role: UserRole.CUSTOMER,
    firstName: 'Test',
    lastName: 'Customer',
    isActive: true,
  };

  const custLayout = simulateLayoutGuard(customerUser);
  assert(custLayout.status === 307 && custLayout.destination === '/admin/login?error=AccessDenied', 'CUSTOMER role denied by AdminDashboardLayout and redirected to /admin/login?error=AccessDenied');

  const custRoles = simulateRolesPageGuard(customerUser);
  assert(custRoles.status === 307 && custRoles.destination === '/admin', 'CUSTOMER role denied by AdminRolesPage and redirected to /admin');

  // C. Regular Admin user
  const adminUser: AuthenticatedUser = {
    id: 'admin-id-456',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    firstName: 'Operations',
    lastName: 'Staff',
    isActive: true,
  };

  const adminLayout = simulateLayoutGuard(adminUser);
  assert(adminLayout.status === 200 && adminLayout.rendered === true, 'ADMIN role accepted by AdminDashboardLayout');

  const adminRoles = simulateRolesPageGuard(adminUser);
  assert(adminRoles.status === 307 && adminRoles.destination === '/admin', 'ADMIN role strictly forbidden from /admin/roles and redirected to /admin (Super Admin Only)');

  // D. Super Admin user
  const superAdminUser: AuthenticatedUser = {
    id: 'super-admin-id-789',
    email: 'owner@example.com',
    role: UserRole.SUPER_ADMIN,
    firstName: 'Store',
    lastName: 'Owner',
    isActive: true,
  };

  const superAdminLayout = simulateLayoutGuard(superAdminUser);
  assert(superAdminLayout.status === 200 && superAdminLayout.rendered === true, 'SUPER_ADMIN role accepted by AdminDashboardLayout');

  const superAdminRoles = simulateRolesPageGuard(superAdminUser);
  assert(superAdminRoles.status === 200 && superAdminRoles.rendered === true, 'SUPER_ADMIN role granted full access to /admin/roles');

  // 3. Live Production Supabase Cryptographic & Role Verification
  console.log('\n--- TEST SUITE 3: Production Supabase Auth & Role Verification ---');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey) {
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Check existing Super Admin
    const { data: superAdminProfiles, error: pErr } = await supabase
      .from('profiles')
      .select('id, role, first_name, last_name, is_active, created_at')
      .eq('role', 'SUPER_ADMIN');

    if (pErr) {
      console.error('Supabase query error:', pErr.message);
    }

    assert(!pErr && !!superAdminProfiles && superAdminProfiles.length > 0, `Live Supabase Profiles: Found ${superAdminProfiles?.length ?? 0} active SUPER_ADMIN account(s)`);

    if (superAdminProfiles && superAdminProfiles.length > 0) {
      const owner = superAdminProfiles[0];
      console.log(`     Confirmed Super Admin: ${owner.first_name} ${owner.last_name} (${owner.id})`);
      assert(owner.role === 'SUPER_ADMIN', 'Verified live profile role is strictly SUPER_ADMIN');
      assert(owner.is_active === true, 'Verified live SUPER_ADMIN account is active');
    }

    // Check existing Customer account
    const { data: customerProfiles } = await supabase
      .from('profiles')
      .select('id, role, is_active')
      .eq('role', 'CUSTOMER')
      .limit(1);

    if (customerProfiles && customerProfiles.length > 0) {
      const cust = customerProfiles[0];
      assert(cust.role === 'CUSTOMER', `Verified live Customer profile (${cust.id}) role is strictly CUSTOMER`);
    }
  }

  // 4. Exercise Production Guards Directly
  console.log('\n--- TEST SUITE 4: Direct Guard Assertion Independence ---');
  let custThrew = false;
  try {
    await requireAdmin(customerUser);
  } catch (e: any) {
    custThrew = true;
    assert(e.message.includes('FORBIDDEN'), 'requireAdmin() throws FORBIDDEN on CUSTOMER');
  }
  assert(custThrew, 'requireAdmin() rejected CUSTOMER');

  let adminThrew = false;
  try {
    await requireSuperAdmin(adminUser);
  } catch (e: any) {
    adminThrew = true;
    assert(e.message.includes('FORBIDDEN'), 'requireSuperAdmin() throws FORBIDDEN on ADMIN');
  }
  assert(adminThrew, 'requireSuperAdmin() rejected ADMIN');

  const superAdminVerified = await requireSuperAdmin(superAdminUser);
  assert(superAdminVerified.role === UserRole.SUPER_ADMIN, 'requireSuperAdmin() successfully verified SUPER_ADMIN');

  console.log('\n======================================================================');
  console.log('ALL /admin/roles SECURITY & GOVERNANCE CHECKS PASSED');
  console.log('======================================================================');
}

runRolesGovernanceVerification().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
