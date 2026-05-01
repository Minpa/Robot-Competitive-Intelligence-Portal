'use client';

/**
 * ManipulatorArm · REQ-2 3D primitive
 *
 * Renders a 2-link arm (upper arm + forearm) + end-effector tip from
 * the current `ManipulatorArmSpec`. The "worst-case" pose used by the
 * statics calculation (REQ-4) is horizontal extension; we render that
 * pose here so the visual matches the analysis.
 *
 * Mount position offsets (relative to base center, top surface):
 *   - center: [0, 0]
 *   - front:  [0, +radius * 0.65]
 *   - left:   [-radius * 0.65, 0]
 *   - right:  [+radius * 0.65, 0]
 *
 * Outward direction (the arm extends from the shoulder to the +Z/+X axis):
 *   - center / front: +Z
 *   - left:           -X
 *   - right:          +X
 *
 * Units: cm in spec, m in scene.
 */

import { Edges } from '@react-three/drei';
import * as THREE from 'three';
import type { ManipulatorArmSpec, VacuumBaseSpec, EndEffectorSpec } from '../../types/product';

const CM_TO_M = 0.01;

interface ManipulatorArmProps {
  arm: ManipulatorArmSpec;
  base: VacuumBaseSpec;
  /** Lookup for end-effector → tip color/scale hints. Optional. */
  endEffector?: EndEffectorSpec;
  /** Color accent (hex). */
  color?: string;
}

export function ManipulatorArm({ arm, base, endEffector, color = '#E63950' }: ManipulatorArmProps) {
  const baseHeightM = base.heightCm * CM_TO_M;
  const liftM = base.hasLiftColumn ? base.liftColumnMaxExtensionCm * CM_TO_M : 0;
  const baseRadiusM = (base.diameterOrWidthCm / 2) * CM_TO_M;
  const shoulderUpM = arm.shoulderHeightAboveBaseCm * CM_TO_M;

  // Mount XZ offset (m). Use 65% of the radius so the shoulder is on the
  // top surface but inset from the rim — looks anchored.
  const offset = baseRadiusM * 0.65;
  let mountX = 0;
  let mountZ = 0;
  /** Outward unit vector along which the arm extends in worst-case pose. */
  let outX = 0;
  let outZ = 1;
  switch (arm.mountPosition) {
    case 'center':
      mountX = 0;
      mountZ = 0;
      outX = 0;
      outZ = 1;
      break;
    case 'front':
      mountX = 0;
      mountZ = offset;
      outX = 0;
      outZ = 1;
      break;
    case 'left':
      mountX = -offset;
      mountZ = 0;
      outX = -1;
      outZ = 0;
      break;
    case 'right':
      mountX = offset;
      mountZ = 0;
      outX = 1;
      outZ = 0;
      break;
  }

  const shoulderY = baseHeightM + liftM + shoulderUpM;
  const shoulderPos = new THREE.Vector3(mountX, shoulderY, mountZ);

  const L1 = arm.upperArmLengthCm * CM_TO_M;
  const L2 = arm.forearmLengthCm * CM_TO_M;
  const out = new THREE.Vector3(outX, 0, outZ).normalize();

  const elbowPos = shoulderPos.clone().addScaledVector(out, L1);
  const tipPos = elbowPos.clone().addScaledVector(out, L2);

  // Limb cylinders use length = link length, axis along Y by default.
  // We need to orient the cylinder along `out`. Rotation from +Y to `out`:
  const yAxis = new THREE.Vector3(0, 1, 0);
  const limbQuat = new THREE.Quaternion().setFromUnitVectors(yAxis, out);
  const limbEuler = new THREE.Euler().setFromQuaternion(limbQuat);

  // Limb radii — stylistic, not real.
  const upperArmRadiusM = 0.018;
  const forearmRadiusM = 0.014;
  const jointRadiusM = 0.024;

  // Mid-points of each limb (cylinder is centered at its origin).
  const upperMid = shoulderPos.clone().addScaledVector(out, L1 / 2);
  const forearmMid = elbowPos.clone().addScaledVector(out, L2 / 2);

  const tipScale = endEffector ? Math.min(0.05, 0.025 + endEffector.maxPayloadKg * 0.012) : 0.03;

  return (
    <group>
      {/* shoulder joint */}
      <mesh position={shoulderPos.toArray()} castShadow>
        <sphereGeometry args={[jointRadiusM, 24, 16]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* upper arm (L1) */}
      <mesh position={upperMid.toArray()} rotation={limbEuler.toArray() as [number, number, number]} castShadow>
        <cylinderGeometry args={[upperArmRadiusM, upperArmRadiusM, L1, 24]} />
        <meshStandardMaterial color="#262626" metalness={0.3} roughness={0.55} />
        <Edges color={color} threshold={15} />
      </mesh>

      {/* elbow joint */}
      <mesh position={elbowPos.toArray()} castShadow>
        <sphereGeometry args={[jointRadiusM * 0.85, 24, 16]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* forearm (L2) */}
      <mesh position={forearmMid.toArray()} rotation={limbEuler.toArray() as [number, number, number]} castShadow>
        <cylinderGeometry args={[forearmRadiusM, forearmRadiusM, L2, 24]} />
        <meshStandardMaterial color="#262626" metalness={0.3} roughness={0.55} />
        <Edges color={color} threshold={15} />
      </mesh>

      {/* end-effector tip — color accents the arm */}
      <mesh position={tipPos.toArray()} castShadow>
        <boxGeometry args={[tipScale, tipScale * 0.7, tipScale]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} emissive={color} emissiveIntensity={0.15} />
      </mesh>

      {/* wrist DOF visual cue: extra rings near tip */}
      {Array.from({ length: arm.wristDof }).map((_, i) => {
        const t = 1 - 0.06 * (i + 1);
        const ringPos = shoulderPos.clone().lerp(tipPos, t);
        return (
          <mesh
            key={i}
            position={ringPos.toArray()}
            rotation={limbEuler.toArray() as [number, number, number]}
          >
            <torusGeometry args={[forearmRadiusM * 1.4, forearmRadiusM * 0.35, 8, 24]} />
            <meshBasicMaterial color={color} />
          </mesh>
        );
      })}
    </group>
  );
}
