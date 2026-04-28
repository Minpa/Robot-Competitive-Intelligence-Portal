'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { SkeletonRenderer } from './SkeletonRenderer';
import { FovConeOverlay } from './FovConeOverlay';
import type { FormFactorSummary, FovCone } from '../../types/robot';

interface RobotViewportProps {
  formFactor: FormFactorSummary | null;
  autoRotate?: boolean;
  showLabels?: boolean;
  fovCones?: FovCone[];
  showFovCones?: boolean;
}

export function RobotViewport({
  formFactor,
  autoRotate = false,
  showLabels = false,
  fovCones = [],
  showFovCones = true,
}: RobotViewportProps) {
  if (!formFactor) {
    return (
      <div className="flex items-center justify-center h-full text-white/40 text-[12px] font-mono uppercase tracking-[0.18em]">
        폼팩터를 선택하세요
      </div>
    );
  }

  const camHeight = Math.max(1.4, formFactor.heightM * 0.85);
  const camDistance = Math.max(2.6, formFactor.heightM * 1.9);

  return (
    <Canvas
      shadows
      camera={{ position: [camDistance, camHeight, camDistance], fov: 38 }}
      style={{ background: '#050505' }}
    >
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[4, 6, 3]}
        intensity={0.9}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-3, 4, -2]} intensity={0.25} />

      <Suspense fallback={null}>
        <SkeletonRenderer nodes={formFactor.skeleton} showLabels={showLabels} highlightId={null} />
        {showFovCones && fovCones.length > 0 ? <FovConeOverlay cones={fovCones} /> : null}
        <Environment preset="warehouse" />
      </Suspense>

      <Grid
        args={[8, 8]}
        cellColor="#1a1a1a"
        sectionColor="#3a2a18"
        cellSize={0.25}
        sectionSize={1}
        fadeDistance={12}
        fadeStrength={1}
        infiniteGrid
        position={[0, 0, 0]}
      />

      <OrbitControls
        autoRotate={autoRotate}
        autoRotateSpeed={0.6}
        enablePan
        enableZoom
        enableRotate
        target={[0, formFactor.heightM / 2, 0]}
        minDistance={1.2}
        maxDistance={8}
      />
    </Canvas>
  );
}
