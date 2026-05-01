'use client';

/**
 * VacuumBase · REQ-1 3D primitive (LG 로보킹 스타일)
 *
 * Renders the vacuum cleaner base from the current `VacuumBaseSpec`. The
 * disc shape mirrors the LG 로보킹 + FlexiArm Riser silhouette: flat black
 * cylinder with chrome top accent, side sensor window, side mop wing,
 * and 3 small wheel discs on the bottom.
 *
 * Units: spec is in cm; Three.js scene uses meters (cm / 100).
 */

import { Edges } from '@react-three/drei';
import type { VacuumBaseSpec } from '../../types/product';

interface VacuumBaseProps {
  base: VacuumBaseSpec;
  showLabels?: boolean;
}

const CM_TO_M = 0.01;

export function VacuumBase({ base }: VacuumBaseProps) {
  const heightM = base.heightCm * CM_TO_M;
  const widthM = base.diameterOrWidthCm * CM_TO_M;
  const radiusM = widthM / 2;
  const isDisc = base.shape !== 'square';

  // Position so the bottom of the base sits on y=0.
  const yCenter = heightM / 2;

  // Color palette — matte black body w/ chrome accent
  const BODY_COLOR = '#1a1a1a';
  const TOP_COLOR = '#0d0d0d';
  const CHROME_COLOR = '#9a9a9a';
  const ACCENT_GOLD = '#c08a3a';

  return (
    <group>
      {/* Main body */}
      {base.shape === 'square' ? (
        <mesh position={[0, yCenter, 0]} castShadow receiveShadow>
          <boxGeometry args={[widthM, heightM, widthM]} />
          <meshStandardMaterial color={BODY_COLOR} metalness={0.35} roughness={0.5} />
          <Edges color="#3a2a18" threshold={15} />
        </mesh>
      ) : (
        <mesh position={[0, yCenter, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[radiusM, radiusM, heightM, 64]} />
          <meshStandardMaterial color={BODY_COLOR} metalness={0.35} roughness={0.5} />
        </mesh>
      )}

      {/* Top surface — slightly recessed glossy panel */}
      {isDisc && (
        <mesh position={[0, heightM + 0.0008, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[radiusM * 0.95, 64]} />
          <meshStandardMaterial color={TOP_COLOR} metalness={0.55} roughness={0.25} />
        </mesh>
      )}

      {/* Chrome top ring (accent) */}
      {isDisc && (
        <mesh position={[0, heightM + 0.0012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radiusM * 0.92, radiusM * 0.985, 64]} />
          <meshStandardMaterial color={CHROME_COLOR} metalness={0.85} roughness={0.18} />
        </mesh>
      )}

      {/* Inner gold accent ring (small) — matches LG branding */}
      {isDisc && (
        <mesh position={[0, heightM + 0.0014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radiusM * 0.42, radiusM * 0.48, 48]} />
          <meshBasicMaterial color={ACCENT_GOLD} />
        </mesh>
      )}

      {/* Front sensor window — small dark rectangle on the front rim */}
      {isDisc && (
        <mesh position={[0, heightM * 0.55, radiusM * 0.99]} rotation={[0, 0, 0]}>
          <planeGeometry args={[radiusM * 0.5, heightM * 0.35]} />
          <meshStandardMaterial color="#000000" metalness={0.7} roughness={0.15} />
        </mesh>
      )}

      {/* LiDAR turret on top (small) */}
      {isDisc && (
        <mesh position={[0, heightM + heightM * 0.18, 0]} castShadow>
          <cylinderGeometry args={[radiusM * 0.18, radiusM * 0.2, heightM * 0.4, 32]} />
          <meshStandardMaterial color="#0d0d0d" metalness={0.5} roughness={0.4} />
        </mesh>
      )}

      {/* Side mop wing (left side) */}
      {isDisc && (
        <mesh position={[-radiusM * 1.05, heightM * 0.15, 0]} castShadow>
          <boxGeometry args={[radiusM * 0.18, heightM * 0.5, radiusM * 0.45]} />
          <meshStandardMaterial color="#e8e8e8" metalness={0.05} roughness={0.85} />
        </mesh>
      )}

      {/* Wheel discs on bottom — 3 small */}
      {isDisc && (
        <>
          <mesh position={[radiusM * 0.55, 0.005, radiusM * 0.55]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[radiusM * 0.08, radiusM * 0.08, 0.01, 16]} />
            <meshStandardMaterial color="#2a2a2a" metalness={0.3} roughness={0.7} />
          </mesh>
          <mesh position={[-radiusM * 0.55, 0.005, radiusM * 0.55]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[radiusM * 0.08, radiusM * 0.08, 0.01, 16]} />
            <meshStandardMaterial color="#2a2a2a" metalness={0.3} roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.005, -radiusM * 0.55]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[radiusM * 0.06, radiusM * 0.06, 0.01, 16]} />
            <meshStandardMaterial color="#2a2a2a" metalness={0.3} roughness={0.7} />
          </mesh>
        </>
      )}

      {/* Top vent slots (3 thin lines on top) */}
      {isDisc &&
        [-0.3, 0, 0.3].map((zOffset, i) => (
          <mesh
            key={i}
            position={[0, heightM + 0.0016, zOffset * radiusM]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[radiusM * 0.6, 0.002]} />
            <meshBasicMaterial color="#3a3a3a" />
          </mesh>
        ))}

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
