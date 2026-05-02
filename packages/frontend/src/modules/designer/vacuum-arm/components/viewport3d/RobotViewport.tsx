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
import { WorkspaceMesh } from './WorkspaceMesh';
import { ZMPOverlay } from './ZMPOverlay';
import type {
  ManipulatorArmSpec,
  VacuumBaseSpec,
  EndEffectorSpec,
  StabilityResult,
} from '../../types/product';

interface RobotViewportProps {
  base: VacuumBaseSpec;
  arms: ManipulatorArmSpec[];
  endEffectors?: EndEffectorSpec[];
  stability?: StabilityResult | null;
  autoRotate?: boolean;
  showLabels?: boolean;
  showWorkspaceMesh?: boolean;
  showZmp?: boolean;
}

const CM_TO_M = 0.01;

const ARM_COLORS = ['#E63950', '#3a8dde'] as const;

export function RobotViewport({
  base,
  arms,
  endEffectors = [],
  stability = null,
  autoRotate = false,
  showLabels = false,
  showWorkspaceMesh = true,
  showZmp = true,
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
      style={{ background: '#1f242c' }}
    >
      {/* Studio-style 3-point lighting + hemisphere fill so dark robot bodies
          read clearly against a mid-tone neutral background. */}
      <hemisphereLight args={['#dfe6f0', '#2a2f38', 0.55]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[3, 4, 2]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[-2.5, 3, -1.5]} intensity={0.45} color="#a8c0e8" />
      <directionalLight position={[0, 2, -3]} intensity={0.30} color="#ffb088" />

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
        {arms.length > 0 ? (
          <WorkspaceMesh arms={arms} base={base} visible={showWorkspaceMesh} />
        ) : null}
        {arms.length > 0 && stability ? (
          <ZMPOverlay stability={stability} visible={showZmp} />
        ) : null}
        <Environment preset="warehouse" />
      </Suspense>

      <Grid
        args={[6, 6]}
        cellColor="#3d4452"
        sectionColor="#7a6238"
        cellSize={0.1}
        sectionSize={0.5}
        fadeDistance={8}
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
