import React from 'react';
import { redirect } from 'next/navigation';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { getAdminUsers } from '@/lib/db/admin';
import { RoleGovernanceClient } from '@/components/admin/RoleGovernanceClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Role Governance | Super Admin | Mana Grameena',
  description: 'Privileged role governance and administrative access control.',
};

export default async function AdminRolesPage() {
  // Strictly requires SUPER_ADMIN server-side
  let superAdmin;
  try {
    superAdmin = await requireSuperAdmin();
  } catch (authError: any) {
    if (authError?.message?.includes('UNAUTHORIZED')) {
      redirect('/admin/login?returnUrl=/admin/roles');
    }
    if (authError?.message?.includes('FORBIDDEN')) {
      redirect('/admin');
    }
    throw authError;
  }

  const adminUsers = await getAdminUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-cream-50">
          Role Governance & Team Access
        </h1>
        <p className="text-xs text-cream-400 mt-1">
          Super Administrator authority to manage operational staff and administrative permissions.
        </p>
      </div>

      <RoleGovernanceClient
        adminUsers={adminUsers}
        currentSuperAdminId={superAdmin.id}
      />
    </div>
  );
}
