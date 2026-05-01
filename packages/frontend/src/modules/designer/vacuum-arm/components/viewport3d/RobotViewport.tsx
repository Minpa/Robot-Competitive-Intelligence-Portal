'use client';

/**
 * RobotViewport · REQ-1
 *
 * Three.js canvas hosting the vacuum base. OrbitControls + grid + lighting.
 * Auto-fits camera framing to the current base envelope.
 */

import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { VacuumBase } from './VacuumBase';
import type { VacuumBaseSpec } from '../../types/product';

interface RobotViewportProps {
  base: VacuumBaseSpec;
  autoRotate?: boolean;
  showLabels?: boolean;
}

const CM_TO_M = 0.01;

export function RobotViewport({ base, autoRotate = false, showLabels = false }: RobotViewportProps) {
  // Total visual height: base + lift column (if present)
  const totalHeightM = useMemo(() => {
    const lift = base.hasLiftColumn ? base.liftColumnMaxExtensionCm * CM_TO_M : 0;
    return base.heightCm * CM_TO_M + lift;
  }, [base.heightCm, base.hasLiftColumn, base.liftColumnMaxExtensionCm]);

  const widthM = base.diameterOrWidthCm * CM_TO_M;
  const camRadius = Math.max(0.9, widthM * 2.5, totalHeightM * 1.8);
  const camHeight = Math.max(0.5, totalHeightM * 1.2);
  const target = [0, totalHeightM / 2, 0] as [number, number, number];

  return (
    <Canvas
      shadows
      camera={{ position: [camRadius, camHeight, camRadius], fov: 38 }}
      style={{ background: '#050505' }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[3, 4, 2]}
        intensity={0.9}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-2, 3, -1.5]} intensity={0.25} />

      <Suspense fallback={null}>
        <VacuumBase base={base} showLabels={showLabels} />
        <Environment preset="warehouse" />
      </Suspense>

      <Grid
        args={[6, 6]}
        cellColor="#1a1a1a"
        sectionColor="#3a2a18"
        cellSize={0.1}
        sectionSize={0.5}
        fadeDistance={6}
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
        target={target}
        minDistance={0.5}
        maxDistance={4}
      />
    </Canvas>
  );
}
