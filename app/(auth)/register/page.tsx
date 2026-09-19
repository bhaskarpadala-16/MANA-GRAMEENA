'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Leaf, Lock, Mail, User, Phone, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { signUpCustomerAction } from '@/lib/auth/actions';

export default function RegisterPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const result = await signUpCustomerAction({
        firstName,
        lastName,
        email,
        password,
        phone,
      });

      if (!result.success) {
        setErrorMsg(result.error || 'Registration failed. Please check your inputs.');
      } else {
        if (result.requiresVerification) {
          setSuccessMsg(
            result.message ||
              'Account created! A confirmation link has been sent to your email address.'
          );
        } else {
          router.push(result.redirectUrl || '/account');
          router.refresh();
        }
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
          <h1 className="font-serif text-3xl font-bold text-herbal-950">Create Account</h1>
          <p className="text-sm text-herbal-700 mt-1">Join the Mana Grameena authentic wellness family</p>
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
            <h2 className="font-serif text-lg font-bold text-herbal-950">Check Your Inbox</h2>
            <p className="text-xs text-herbal-800 leading-relaxed">{successMsg}</p>
            <Link
              href="/login"
              className="inline-block mt-3 px-5 py-2.5 bg-herbal-800 text-gold-400 font-semibold text-xs rounded-xl shadow hover:bg-herbal-900 transition-colors"
            >
              Proceed to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-xs font-semibold text-herbal-900 uppercase tracking-wider mb-1.5"
                >
                  First Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-herbal-400" />
                  <input
                    id="firstName"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Padala"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-cream-50 border border-cream-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-herbal-800 focus:border-transparent text-herbal-950 placeholder:text-herbal-400"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="block text-xs font-semibold text-herbal-900 uppercase tracking-wider mb-1.5"
                >
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Bhaskar"
                  className="w-full px-3 py-2.5 text-sm bg-cream-50 border border-cream-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-herbal-800 focus:border-transparent text-herbal-950 placeholder:text-herbal-400"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="register-email"
                className="block text-xs font-semibold text-herbal-900 uppercase tracking-wider mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-herbal-400" />
                <input
                  id="register-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-cream-50 border border-cream-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-herbal-800 focus:border-transparent text-herbal-950 placeholder:text-herbal-400"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="register-phone"
                className="block text-xs font-semibold text-herbal-900 uppercase tracking-wider mb-1.5"
              >
                Phone Number (Optional)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-herbal-400" />
                <input
                  id="register-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-cream-50 border border-cream-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-herbal-800 focus:border-transparent text-herbal-950 placeholder:text-herbal-400"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="register-password"
                className="block text-xs font-semibold text-herbal-900 uppercase tracking-wider mb-1.5"
              >
                Password (min 8 characters)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-herbal-400" />
                <input
                  id="register-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
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
                  <span>Registering...</span>
                </>
              ) : (
                <span>Create Customer Account</span>
              )}
            </button>
          </form>
        )}

        <div className="text-center text-xs text-herbal-800 pt-2 border-t border-cream-200">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-terracotta-600 hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
