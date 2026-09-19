'use client';

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

import BotanicalFallback from '@/components/3d/BotanicalFallback';
import { WebGLErrorBoundary } from '@/components/3d/WebGLErrorBoundary';

function BotanicalElement() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.8} floatIntensity={1}>
      <mesh ref={meshRef} castShadow receiveShadow>
        <dodecahedronGeometry args={[1.6, 0]} />
        <meshStandardMaterial
          color="#255234"
          roughness={0.35}
          metalness={0.15}
          wireframe={false}
        />
      </mesh>
    </Float>
  );
}

export default function HerbalHeroCanvas() {
  return (
    <div className="relative w-full h-[360px] md:h-[440px] flex items-center justify-center">
      <WebGLErrorBoundary fallback={<BotanicalFallback />}>
        <Canvas
          camera={{ position: [0, 0, 4.5], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 8, 5]} intensity={1.2} />
          <pointLight position={[-4, -4, -2]} color="#dfac50" intensity={0.8} />
          <BotanicalElement />
        </Canvas>
      </WebGLErrorBoundary>
    </div>
  );
}
