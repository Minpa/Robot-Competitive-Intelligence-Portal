'use client';

import { useMemo } from 'react';
import { DoubleSide } from 'three';
import type { FovCone } from '../../types/robot';

const POSITION_COLORS: Record<string, string> = {
  head: '#E63950',
  chest: '#F2A93B',
  arm_left: '#5BC0EB',
  arm_right: '#7CCBA2',
};

interface FovConeOverlayProps {
  cones: FovCone[];
}

export function FovConeOverlay({ cones }: FovConeOverlayProps) {
  return (
    <group>
      {cones.map((cone, idx) => (
        <FovConeMesh key={`${cone.position}-${idx}`} cone={cone} />
      ))}
    </group>
  );
}

function FovConeMesh({ cone }: { cone: FovCone }) {
  const color = POSITION_COLORS[cone.position] ?? '#B8892B';

  // Cap visualization at 2.5m for readability.
  const length = Math.min(cone.rangeMaxM, 2.5);
  const radiusH = Math.tan(cone.halfAngleHorizontalRad) * length;
  const radiusV = Math.tan(cone.halfAngleVerticalRad) * length;
  const avgRadius = (radiusH + radiusV) / 2;

  // Decompose the cone direction into yaw (around Y) + pitch (around local X).
  // After yaw, the direction lies in the local YZ plane; pitch tilts +Y onto it.
  const { yaw, pitch } = useMemo(() => {
    const [x, y, z] = cone.direction;
    const len = Math.hypot(x, y, z) || 1;
    const ny = y / len;
    const horizMag = Math.hypot(x, z) / len;
    return {
      yaw: Math.atan2(x, z),       // rotation around world Y
      pitch: Math.atan2(horizMag, ny), // rotation around local X (tilt +Y forward)
    };
  }, [cone.direction]);

  return (
    <group position={cone.origin} rotation={[0, yaw, 0]}>
      <group rotation={[pitch, 0, 0]}>
        {/* Cone is built along +Y; translate so the apex sits at the origin. */}
        <group position={[0, length / 2, 0]}>
          <mesh>
            <coneGeometry args={[avgRadius, length, 32, 1, true]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.18}
              side={DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <mesh>
            <coneGeometry args={[avgRadius, length, 24, 1, true]} />
            <meshBasicMaterial color={color} wireframe transparent opacity={0.45} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
