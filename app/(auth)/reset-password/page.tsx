'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Leaf, Lock, AlertCircle, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';
import { resetPasswordAction } from '@/lib/auth/actions';

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    startTransition(async () => {
      const result = await resetPasswordAction({ password, confirmPassword });
      if (!result.success) {
        setErrorMsg(result.error || 'Unable to reset password. Link may have expired.');
      } else {
        setSuccessMsg(
          result.message || 'Your password has been successfully updated! You can now sign in.'
        );
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-cream-50">
      <div className="max-w-md w-full space-y-8 p-8 sm:p-10 rounded-3xl bg-white border border-cream-300 shadow-xl">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-herbal-800 text-gold-400 flex items-center justify-center mx-auto mb-4 shadow-md">
            <Leaf className="w-7 h-7" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-herbal-950">New Password</h1>
          <p className="text-sm text-herbal-700 mt-1">
            Choose a secure password for your Mana Grameena account
          </p>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-terracotta-50 border border-terracotta-200 text-xs text-terracotta-800 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-terracotta-600 mt-0.5" />
            <div className="leading-relaxed font-medium">{errorMsg}</div>
          </div>
        )}

        {successMsg ? (
          <div className="p-6 rounded-2xl bg-herbal-50 border border-herbal-200 text-center space-y-4">
            <CheckCircle2 className="w-10 h-10 text-herbal-800 mx-auto" />
            <h2 className="font-serif text-lg font-bold text-herbal-950">Password Updated</h2>
            <p className="text-xs text-herbal-800 leading-relaxed">{successMsg}</p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 mt-3 px-5 py-2.5 bg-herbal-800 text-gold-400 font-semibold text-xs rounded-xl shadow hover:bg-herbal-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Sign In with New Password
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="new-password"
                className="block text-xs font-semibold text-herbal-900 uppercase tracking-wider mb-1.5"
              >
                New Password (min 8 chars)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-herbal-400" />
                <input
                  id="new-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-cream-50 border border-cream-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-herbal-800 focus:border-transparent text-herbal-950 placeholder:text-herbal-400"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-xs font-semibold text-herbal-900 uppercase tracking-wider mb-1.5"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-herbal-400" />
                <input
                  id="confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-cream-50 border border-cream-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-herbal-800 focus:border-transparent text-herbal-950 placeholder:text-herbal-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full mt-2 py-3 px-4 bg-herbal-800 hover:bg-herbal-900 text-gold-400 font-serif font-bold text-base rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Updating password...</span>
                </>
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </form>
        )}

        <div className="text-center pt-2 border-t border-cream-200">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-xs font-semibold text-herbal-800 hover:text-terracotta-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
