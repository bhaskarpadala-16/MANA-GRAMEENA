'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import BotanicalFallback from '@/components/3d/BotanicalFallback';
import { WebGLErrorBoundary } from '@/components/3d/WebGLErrorBoundary';
import { isWebGLAvailable } from '@/components/3d/webgl-check';

const HerbalHeroCanvas = dynamic(
  () => import('@/components/3d/HerbalHeroCanvas'),
  {
    ssr: false,
    loading: () => <BotanicalFallback />,
  }
);

export default function HerbalHeroClient() {
  const [canRender3D, setCanRender3D] = useState<boolean | null>(null);

  useEffect(() => {
    setCanRender3D(isWebGLAvailable());
  }, []);

  // During SSR or initial client hydration before useEffect runs, show BotanicalFallback
  if (canRender3D === null || canRender3D === false) {
    return <BotanicalFallback />;
  }

  return (
    <WebGLErrorBoundary fallback={<BotanicalFallback />}>
      <HerbalHeroCanvas />
    </WebGLErrorBoundary>
  );
}

