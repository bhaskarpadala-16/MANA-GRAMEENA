'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ShieldCheck, UserCheck, UserMinus, AlertCircle, Loader2 } from 'lucide-react';
import { AdminBadge } from './AdminBadge';
import { updateUserRoleAction } from '@/lib/actions/admin/roles';
import { UserRole } from '@prisma/client';

interface AdminUserItem {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  assignedSince?: string;
  _count?: { adminLogs: number };
}

interface RoleGovernanceClientProps {
  adminUsers: AdminUserItem[];
  currentSuperAdminId: string;
}

export function RoleGovernanceClient({
  adminUsers,
  currentSuperAdminId,
}: RoleGovernanceClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Promote Customer state
  const [promoteUserId, setPromoteUserId] = useState('');
  const [promoteReason, setPromoteReason] = useState('');
  const [showPromoteModal, setShowPromoteModal] = useState(false);

  // Demote Admin state
  const [demoteUser, setDemoteUser] = useState<AdminUserItem | null>(null);
  const [demoteReason, setDemoteReason] = useState('');

  const handlePromote = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await updateUserRoleAction({
        targetUserId: promoteUserId,
        newRole: UserRole.ADMIN,
        reason: promoteReason,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to promote user.');
      } else {
        setSuccessMsg('User successfully granted administrative privileges.');
        setPromoteUserId('');
        setPromoteReason('');
        setShowPromoteModal(false);
        router.refresh();
      }
    });
  };

  const handleDemote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoteUser) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await updateUserRoleAction({
        targetUserId: demoteUser.id,
        newRole: UserRole.CUSTOMER,
        reason: demoteReason,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to revoke administrative privileges.');
      } else {
        setSuccessMsg(`Administrative privileges revoked for ${demoteUser.firstName}.`);
        setDemoteUser(null);
        setDemoteReason('');
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Security Governance Notice */}
      <div className="p-5 rounded-3xl bg-gold-500/10 border border-gold-500/30 flex items-start gap-4 shadow-xl">
        <ShieldAlert className="w-6 h-6 text-gold-400 flex-shrink-0 mt-1" />
        <div className="space-y-1">
          <h3 className="font-serif text-base font-bold text-cream-50">
            Super Administrator Access Control & Privilege Boundary
          </h3>
          <p className="text-xs text-cream-300 leading-relaxed">
            Role elevation is cryptographically isolated and guarded by database triggers
            (prevent_profile_role_escalation). Ordinary administrators cannot create, promote, or
            demote staff. Elevation to SUPER_ADMIN is permanently disabled via application layers.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-serif text-lg font-bold text-cream-50">
            Administrative Team ({adminUsers.length})
          </h3>
          <p className="text-xs text-cream-400">Personnel with operational console access</p>
        </div>

        <button
          type="button"
          onClick={() => setShowPromoteModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-herbal-800 border border-gold-500/30 text-gold-400 hover:bg-herbal-700 text-xs font-bold transition-all cursor-pointer shadow"
        >
          <UserCheck className="w-4 h-4" />
          Promote Customer to Admin
        </button>
      </div>

      {/* Admin Personnel Table */}
      <div className="rounded-3xl bg-herbal-900 border border-herbal-800 shadow-xl overflow-hidden p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-herbal-800 text-cream-400 font-semibold uppercase tracking-wider">
                <th className="pb-3">Name</th>
                <th className="pb-3">Current Role</th>
                <th className="pb-3">Account Status</th>
                <th className="pb-3">Audited Mutations</th>
                <th className="pb-3">Assigned Since</th>
                <th className="pb-3 text-right">Governance Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-herbal-800/60">
              {adminUsers.map((u) => {
                const isSelf = u.id === currentSuperAdminId;
                const isSuper = u.role === UserRole.SUPER_ADMIN;

                const initialFirst = u.firstName ? u.firstName[0] : 'A';
                const initialLast = u.lastName ? u.lastName[0] : '';
                const displayDate =
                  u.assignedSince ||
                  new Date(u.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    timeZone: 'Asia/Kolkata',
                  });

                return (
                  <tr key={u.id} className="hover:bg-herbal-800/30 transition-colors">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-herbal-800 border border-gold-500/30 text-gold-400 flex items-center justify-center font-bold text-xs">
                          {initialFirst}
                          {initialLast}
                        </div>
                        <div>
                          <span className="font-semibold text-cream-100">
                            {u.firstName} {u.lastName}
                          </span>
                          {isSelf && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.2 rounded bg-gold-500/20 text-gold-300 font-bold">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3">
                      <AdminBadge status={u.role} size="sm" />
                    </td>

                    <td className="py-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase ${
                          u.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>

                    <td className="py-3 font-mono text-cream-300">
                      {u._count?.adminLogs ?? 0} actions logged
                    </td>

                    <td className="py-3 text-cream-400">
                      {displayDate}
                    </td>

                    <td className="py-3 text-right">
                      {isSuper || isSelf ? (
                        <span className="text-[11px] text-cream-600 italic">Protected</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDemoteUser(u)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          Revoke Admin
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Promote Modal */}
      {showPromoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-herbal-900 border border-gold-500/30 space-y-5 shadow-2xl">
            <h3 className="font-serif text-base font-bold text-cream-50">
              Promote Customer to Store Admin
            </h3>
            <p className="text-xs text-cream-400 leading-relaxed">
              Granting administrative privileges permits order management, inventory restocking,
              and product publishing. Enter the Customer User ID.
            </p>

            <form onSubmit={handlePromote} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
                  Target User ID (UUID) *
                </label>
                <input
                  type="text"
                  required
                  value={promoteUserId}
                  onChange={(e) => setPromoteUserId(e.target.value)}
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                  className="w-full px-3 py-2 bg-herbal-950 border border-herbal-800 rounded-xl text-xs font-mono text-cream-100 focus:outline-none focus:border-gold-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
                  Governance Reason (Audit Trail) *
                </label>
                <textarea
                  required
                  rows={2}
                  value={promoteReason}
                  onChange={(e) => setPromoteReason(e.target.value)}
                  placeholder="Mandatory justification for staff elevation..."
                  className="w-full px-3 py-2 bg-herbal-950 border border-herbal-800 rounded-xl text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPromoteModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-cream-400 hover:text-cream-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-herbal-800 hover:bg-herbal-700 text-gold-400 border border-gold-500/30 text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Promotion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Demote Modal */}
      {demoteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-herbal-900 border border-rose-500/40 space-y-5 shadow-2xl">
            <h3 className="font-serif text-base font-bold text-rose-300">
              Revoke Administrative Privileges
            </h3>
            <p className="text-xs text-cream-400 leading-relaxed">
              Are you sure you want to demote{' '}
              <span className="font-bold text-cream-100">
                {demoteUser.firstName} {demoteUser.lastName}
              </span>{' '}
              back to standard CUSTOMER? They will lose access to all admin operations immediately.
            </p>

            <form onSubmit={handleDemote} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-rose-300 uppercase tracking-wider">
                  Demotion Reason (Audit Trail) *
                </label>
                <textarea
                  required
                  rows={2}
                  value={demoteReason}
                  onChange={(e) => setDemoteReason(e.target.value)}
                  placeholder="Mandatory justification for privilege revocation..."
                  className="w-full px-3 py-2 bg-herbal-950 border border-rose-500/40 rounded-xl text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-rose-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDemoteUser(null)}
                  className="px-4 py-2 rounded-xl text-xs text-cream-400 hover:text-cream-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-cream-50 text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Revocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
