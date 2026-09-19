'use client';

import React, { useState, useTransition, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Leaf, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { signInCustomerAction } from '@/lib/auth/actions';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/account';
  const urlError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(() => {
    if (urlError === 'InvalidOrExpiredConfirmationLink') {
      return 'The confirmation link was invalid or has expired. Please sign in or request a new one.';
    }
    if (urlError === 'InvalidOrExpiredResetLink') {
      return 'The password reset link was invalid or has expired. Please request a new one.';
    }
    if (urlError === 'AuthCallbackFailed') {
      return 'Authentication callback could not be completed. Please try again.';
    }
    return null;
  });

  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      const result = await signInCustomerAction({ email, password }, returnUrl);
      if (!result.success) {
        setErrorMsg(result.error || 'Invalid login details.');
      } else if (result.redirectUrl) {
        router.push(result.redirectUrl);
        router.refresh();
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
          <h1 className="font-serif text-3xl font-bold text-herbal-950">Welcome Back</h1>
          <p className="text-sm text-herbal-700 mt-1">Sign in to your Mana Grameena customer account</p>
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

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-herbal-900 uppercase tracking-wider mb-2"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-herbal-400" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="name@example.com"
                className="w-full pl-11 pr-4 py-3 text-sm bg-cream-50 border border-cream-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-herbal-800 focus:border-transparent text-herbal-950 placeholder:text-herbal-400"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-herbal-900 uppercase tracking-wider"
              >
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-terracotta-600 hover:text-terracotta-700 font-medium hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-herbal-400" />
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 text-sm bg-cream-50 border border-cream-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-herbal-800 focus:border-transparent text-herbal-950 placeholder:text-herbal-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3.5 px-4 bg-herbal-800 hover:bg-herbal-900 text-gold-400 font-serif font-bold text-base rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-herbal-800 pt-2 border-t border-cream-200">
          Don&apos;t have an account yet?{' '}
          <Link href="/register" className="font-semibold text-terracotta-600 hover:underline">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-cream-50">
          <Loader2 className="w-8 h-8 animate-spin text-herbal-800" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
