'use client';

import React from 'react';
import { Sparkles, Leaf } from 'lucide-react';

export default function BotanicalFallback() {
  return (
    <div
      role="img"
      aria-label="Handcrafted Herbal Botanical Geometry"
      className="relative w-full h-[360px] md:h-[440px] flex items-center justify-center select-none"
    >
      {/* Subtle ambient botanical pulse halo */}
      <div className="absolute w-64 h-64 md:w-80 md:h-80 rounded-full bg-gradient-to-tr from-herbal-900/10 via-gold-500/10 to-herbal-800/10 blur-2xl animate-pulse" />

      {/* Decorative Botanical Emblem */}
      <div className="relative flex flex-col items-center justify-center p-8 rounded-3xl bg-white/60 backdrop-blur-sm border border-cream-300 shadow-sm space-y-3">
        <div className="relative w-20 h-20 rounded-2xl bg-herbal-900 text-gold-400 flex items-center justify-center shadow-lg">
          <Leaf className="w-10 h-10 animate-bounce" style={{ animationDuration: '3s' }} />
          <Sparkles className="w-4 h-4 text-gold-400 absolute top-2 right-2 animate-pulse" />
        </div>
        <div className="text-center">
          <span className="font-serif text-sm font-bold text-herbal-950 block">
            Pure Herbal Heritage
          </span>
          <span className="text-[11px] text-herbal-700 font-medium">
            Handcrafted with Devotion
          </span>
        </div>
      </div>
    </div>
  );
}
