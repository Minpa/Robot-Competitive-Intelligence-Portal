'use client';

/**
 * VacuumBase · REQ-1 3D primitive
 *
 * Renders the vacuum cleaner base from the current `VacuumBaseSpec` using
 * one of three primitives:
 *   - disc          → cylinder (radius = diameter/2, height = base height)
 *   - square        → box (width × height × width)
 *   - tall_cylinder → cylinder taller than wide (visual cue)
 *
 * Lift column (when enabled) appears as a thinner cylinder rising from the
 * top center to liftColumnMaxExtension above the base. It signals the future
 * shoulder mount point for REQ-2.
 *
 * Units: spec is in cm; Three.js scene uses meters (cm / 100).
 */

import { Edges } from '@react-three/drei';
import type { VacuumBaseSpec } from '../../types/product';

interface VacuumBaseProps {
  base: VacuumBaseSpec;
  /** Show a faint label under the base. */
  showLabels?: boolean;
}

const CM_TO_M = 0.01;

export function VacuumBase({ base }: VacuumBaseProps) {
  const heightM = base.heightCm * CM_TO_M;
  const widthM = base.diameterOrWidthCm * CM_TO_M;
  const radiusM = widthM / 2;

  // Position so the bottom of the base sits on y=0.
  const yCenter = heightM / 2;

  return (
    <group>
      {/* Base body */}
      {base.shape === 'square' ? (
        <mesh position={[0, yCenter, 0]} castShadow receiveShadow>
          <boxGeometry args={[widthM, heightM, widthM]} />
          <meshStandardMaterial color="#262626" metalness={0.25} roughness={0.55} />
          <Edges color="#3a2a18" threshold={15} />
        </mesh>
      ) : (
        <mesh position={[0, yCenter, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[radiusM, radiusM, heightM, 48]} />
          <meshStandardMaterial color="#262626" metalness={0.25} roughness={0.55} />
          <Edges color="#3a2a18" threshold={15} />
        </mesh>
      )}

      {/* Top accent ring — visual cue for "this is the top surface" */}
      {base.shape !== 'square' ? (
        <mesh position={[0, heightM + 0.0005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radiusM * 0.78, radiusM * 0.92, 48]} />
          <meshBasicMaterial color="#7a5a2a" />
        </mesh>
      ) : (
        <mesh position={[0, heightM + 0.0005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[widthM * 0.7, widthM * 0.7]} />
          <meshBasicMaterial color="#7a5a2a" />
        </mesh>
      )}

      {/* Lift column (if enabled) — placeholder for shoulder mount */}
      {base.hasLiftColumn && base.liftColumnMaxExtensionCm > 0 ? (
        <mesh
          position={[0, heightM + (base.liftColumnMaxExtensionCm * CM_TO_M) / 2, 0]}
          castShadow
          receiveShadow
        >
          <cylinderGeometry
            args={[
              Math.min(0.04, radiusM * 0.25),
              Math.min(0.04, radiusM * 0.25),
              base.liftColumnMaxExtensionCm * CM_TO_M,
              24,
            ]}
          />
          <meshStandardMaterial color="#E63950" metalness={0.4} roughness={0.5} />
        </mesh>
      ) : null}
    </group>
  );
}
