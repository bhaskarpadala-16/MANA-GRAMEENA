'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log sanitized error digest for operational tracking without exposing to DOM
    if (process.env.NODE_ENV !== 'production') {
      console.error('App Segment Error Boundary Caught:', error);
    }
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6 bg-cream-100 text-herbal-950 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-cream-300 shadow-xl text-center space-y-6">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="font-serif text-2xl font-bold text-herbal-950">
            Something went unexpectedly
          </h2>
          <p className="text-xs sm:text-sm text-herbal-700 leading-relaxed">
            We experienced a momentary issue loading this section. Your orders and personal details remain secure.
          </p>
          {error.digest && (
            <p className="font-mono text-[11px] text-herbal-500 pt-1">
              Reference ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-herbal-800 hover:bg-herbal-900 text-cream-100 font-semibold text-xs transition-colors shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-cream-300 hover:bg-cream-200 text-herbal-900 font-semibold text-xs transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Return to Home</span>
          </Link>
        </div>

        <div className="pt-4 border-t border-cream-200 text-[11px] text-herbal-600">
          Need immediate help? Contact our rural artisan care team at{' '}
          <Link href="/contact" className="underline font-medium text-terracotta-600 hover:text-terracotta-700">
            Customer Support
          </Link>
          .
        </div>
      </div>
    </div>
  );
}
