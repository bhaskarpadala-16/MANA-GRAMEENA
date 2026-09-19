'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CustomerProfileDto, updateCustomerProfile } from '@/lib/actions/profile';
import {
  User,
  Shield,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
} from 'lucide-react';

interface ProfileEditorProps {
  initialProfile: CustomerProfileDto;
}

export default function ProfileEditor({ initialProfile }: ProfileEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [firstName, setFirstName] = useState(initialProfile.firstName);
  const [lastName, setLastName] = useState(initialProfile.lastName);
  const [phone, setPhone] = useState(initialProfile.phone || '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await updateCustomerProfile({
        firstName,
        lastName,
        phone: phone.trim() ? phone.trim() : null,
      });

      if (res.success) {
        setSuccessMessage('Profile details updated successfully.');
        router.refresh();
      } else {
        setErrorMessage(res.error || 'Failed to update profile.');
      }
    });
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-cream-300 shadow-sm space-y-6 max-w-2xl">
      {/* Toast Feedback */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 text-red-800 border border-red-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-herbal-800 mb-1">
              First Name *
            </label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 bg-cream-50 text-xs text-herbal-950 focus:outline-none focus:ring-2 focus:ring-herbal-700/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-herbal-800 mb-1">
              Last Name *
            </label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 bg-cream-50 text-xs text-herbal-950 focus:outline-none focus:ring-2 focus:ring-herbal-700/30"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-herbal-800 mb-1">
            Email Address
          </label>
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-cream-200 bg-cream-100/70 text-xs text-herbal-700">
            <Mail className="w-4 h-4 text-herbal-600 shrink-0" />
            <span className="font-medium">{initialProfile.email}</span>
            <span className="ml-auto text-[10px] text-herbal-500 font-semibold uppercase">
              Verified
            </span>
          </div>
          <p className="text-[10px] text-herbal-500 mt-1">
            Email address is cryptographically tied to your Supabase security session.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-herbal-800 mb-1">
            Phone Number (for Delivery SMS & Dispatch)
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-herbal-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-cream-300 bg-cream-50 text-xs text-herbal-950 focus:outline-none focus:ring-2 focus:ring-herbal-700/30"
            />
          </div>
        </div>

        {/* Read-Only Account Security Metadata */}
        <div className="pt-2 border-t border-cream-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3 rounded-xl bg-cream-50 border border-cream-200 flex items-center gap-2.5 text-xs text-herbal-800">
            <Shield className="w-4 h-4 text-herbal-700 shrink-0" />
            <div>
              <span className="text-[10px] text-herbal-600 block uppercase font-semibold">Role</span>
              <span className="font-bold">{initialProfile.role}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-cream-50 border border-cream-200 flex items-center gap-2.5 text-xs text-herbal-800">
            <Calendar className="w-4 h-4 text-herbal-700 shrink-0" />
            <div>
              <span className="text-[10px] text-herbal-600 block uppercase font-semibold">
                Member Since
              </span>
              <span className="font-bold">
                {new Date(initialProfile.createdAt).toLocaleDateString('en-IN', {
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-2.5 rounded-xl bg-herbal-800 hover:bg-herbal-900 text-cream-100 text-xs font-semibold flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Save Profile Changes</span>
          </button>
        </div>
      </form>
    </div>
  );
}
