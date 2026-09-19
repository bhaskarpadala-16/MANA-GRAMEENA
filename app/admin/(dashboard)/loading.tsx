import React from 'react';

export default function AdminLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-64 bg-herbal-900 rounded-xl" />
        <div className="h-4 w-96 bg-herbal-900/60 rounded-lg" />
      </div>

      {/* Metric cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-herbal-900 border border-herbal-800 p-6 space-y-4">
            <div className="flex justify-between">
              <div className="h-3 w-24 bg-herbal-800 rounded" />
              <div className="h-8 w-8 bg-herbal-800 rounded-lg" />
            </div>
            <div className="h-8 w-20 bg-herbal-800 rounded" />
          </div>
        ))}
      </div>

      {/* Main table/content skeleton */}
      <div className="h-96 rounded-2xl bg-herbal-900 border border-herbal-800 p-6 space-y-4">
        <div className="h-6 w-48 bg-herbal-800 rounded" />
        <div className="space-y-2 pt-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 w-full bg-herbal-950/60 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
