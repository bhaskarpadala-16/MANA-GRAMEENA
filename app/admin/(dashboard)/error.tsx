'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin Dashboard Error caught by boundary:', error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full p-8 rounded-3xl bg-herbal-900 border border-terracotta-600/30 text-center space-y-5 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-terracotta-950/80 border border-terracotta-500/40 text-terracotta-400 flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="font-serif text-xl font-bold text-cream-50">
            Administrative Error Encountered
          </h2>
          <p className="text-xs text-cream-400 leading-relaxed">
            {error.message ||
              'An unexpected system error occurred while processing administrative data.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-herbal-800 border border-gold-500/30 text-gold-400 hover:bg-herbal-700 text-xs font-semibold transition-all cursor-pointer shadow"
        >
          <RotateCcw className="w-4 h-4" />
          Retry Operation
        </button>
      </div>
    </div>
  );
}
