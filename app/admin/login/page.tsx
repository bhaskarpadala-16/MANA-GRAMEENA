'use client';

import React, { useState, useTransition, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Lock, Mail, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { signInAdminAction } from '@/lib/auth/actions';

function AdminLoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      const result = await signInAdminAction({ email, password }, returnUrl);
      if (!result.success) {
        setErrorMsg(result.error || 'Invalid administrator credentials.');
      } else if (result.redirectUrl) {
        router.push(result.redirectUrl);
        router.refresh();
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-herbal-950 text-cream-100">
      <div className="max-w-md w-full space-y-8 p-8 sm:p-10 rounded-3xl bg-herbal-900 border border-herbal-800 shadow-2xl">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-herbal-800 text-gold-400 flex items-center justify-center mx-auto mb-4 border border-gold-500/30 shadow-lg">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-cream-50">Mana Grameena Admin</h1>
          <p className="text-xs text-cream-400 mt-1">Authorized store personnel only</p>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-terracotta-950/80 border border-terracotta-600/40 text-xs text-terracotta-200 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-terracotta-400 mt-0.5" />
            <div className="leading-relaxed font-medium">{errorMsg}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="admin-email"
              className="block text-xs font-semibold text-cream-300 uppercase tracking-wider mb-2"
            >
              Admin Email
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-herbal-500" />
              <input
                id="admin-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="admin@managrameena.com"
                className="w-full pl-11 pr-4 py-3 text-sm bg-herbal-950 border border-herbal-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent text-cream-50 placeholder:text-herbal-500"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="block text-xs font-semibold text-cream-300 uppercase tracking-wider mb-2"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-herbal-500" />
              <input
                id="admin-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 text-sm bg-herbal-950 border border-herbal-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent text-cream-50 placeholder:text-herbal-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3.5 px-4 bg-gold-500 hover:bg-gold-600 text-herbal-950 font-serif font-bold text-base rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Verifying Access...</span>
              </>
            ) : (
              <span>Authenticate Portal</span>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-herbal-800">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs text-cream-400 hover:text-cream-100 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to Public Store
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-herbal-950 text-cream-100">
          <Loader2 className="w-8 h-8 animate-spin text-gold-400" />
        </div>
      }
    >
      <AdminLoginFormContent />
    </Suspense>
  );
}
