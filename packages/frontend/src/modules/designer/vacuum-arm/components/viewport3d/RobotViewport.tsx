'use client';

/**
 * RobotViewport · REQ-1 + REQ-2
 *
 * Three.js canvas hosting the vacuum base + 0/1/2 manipulator arms.
 * OrbitControls + grid + lighting. Auto-fits camera framing.
 */

import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { VacuumBase } from './VacuumBase';
import { ManipulatorArm } from './ManipulatorArm';
import type { ManipulatorArmSpec, VacuumBaseSpec, EndEffectorSpec } from '../../types/product';

interface RobotViewportProps {
  base: VacuumBaseSpec;
  arms: ManipulatorArmSpec[];
  endEffectors?: EndEffectorSpec[];
  autoRotate?: boolean;
  showLabels?: boolean;
}

const CM_TO_M = 0.01;

const ARM_COLORS = ['#E63950', '#3a8dde'] as const;

export function RobotViewport({
  base,
  arms,
  endEffectors = [],
  autoRotate = false,
  showLabels = false,
}: RobotViewportProps) {
  // Total visual height: base + lift column + max arm reach (vertical envelope).
  const totalHeightM = useMemo(() => {
    const lift = base.hasLiftColumn ? base.liftColumnMaxExtensionCm * CM_TO_M : 0;
    const baseM = base.heightCm * CM_TO_M;
    const armEnvelope = arms.reduce((max, a) => {
      const shoulder = a.shoulderHeightAboveBaseCm * CM_TO_M;
      const reach = (a.upperArmLengthCm + a.forearmLengthCm) * CM_TO_M;
      return Math.max(max, baseM + lift + shoulder + reach * 0.3);
    }, baseM + lift);
    return armEnvelope;
  }, [base, arms]);

  const widthM = base.diameterOrWidthCm * CM_TO_M;
  const maxArmReachM = arms.reduce(
    (m, a) => Math.max(m, (a.upperArmLengthCm + a.forearmLengthCm) * CM_TO_M),
    0
  );
  const camRadius = Math.max(0.9, widthM * 2.5, totalHeightM * 1.8, maxArmReachM * 1.6);
  const camHeight = Math.max(0.5, totalHeightM * 1.0);
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
        {arms.map((arm, i) => (
          <ManipulatorArm
            key={i}
            arm={arm}
            base={base}
            endEffector={endEffectors.find((e) => e.sku === arm.endEffectorSku)}
            color={ARM_COLORS[i] ?? '#E63950'}
          />
        ))}
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
