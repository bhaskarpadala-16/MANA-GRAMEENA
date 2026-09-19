'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import BotanicalFallback from '@/components/3d/BotanicalFallback';

const HerbalHeroCanvas = dynamic(
  () => import('@/components/3d/HerbalHeroCanvas'),
  {
    ssr: false,
    loading: () => <BotanicalFallback />,
  }
);

export default function HerbalHeroClient() {
  return <HerbalHeroCanvas />;
}
