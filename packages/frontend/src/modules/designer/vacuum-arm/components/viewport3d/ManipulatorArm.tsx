'use client';

/**
 * ManipulatorArm · REQ-2 3D primitive (LG FlexiArm Riser 스타일)
 *
 * Renders a 2-link arm rising from the base in a "folded/stowed" pose
 * matching the LG 로보킹 + FlexiArm Riser silhouette: shoulder rises,
 * upper arm tilts back+up, elbow folds the forearm forward+up, end
 * effector is a small camera/grabber tip.
 *
 * The folded pose is for visual presentation only — engineering analysis
 * (REQ-4) still uses worst-case horizontal extension internally.
 *
 * Mount position offsets (relative to base center, top surface):
 *   - center: [0, 0]
 *   - front:  [0, +radius * 0.45]
 *   - left:   [-radius * 0.45, 0]
 *   - right:  [+radius * 0.45, 0]
 *
 * Units: cm in spec, m in scene.
 */

import { Edges } from '@react-three/drei';
import * as THREE from 'three';
import type { ManipulatorArmSpec, VacuumBaseSpec, EndEffectorSpec } from '../../types/product';
import { useDesignerVacuumStore } from '../../stores/designer-vacuum-store';

const CM_TO_M = 0.01;

interface ManipulatorArmProps {
  arm: ManipulatorArmSpec;
  base: VacuumBaseSpec;
  endEffector?: EndEffectorSpec;
  color?: string;
}

export function ManipulatorArm({ arm, base, endEffector, color = '#E63950' }: ManipulatorArmProps) {
  const armPose = useDesignerVacuumStore((s) => s.armPose);
  const baseHeightM = base.heightCm * CM_TO_M;
  const liftM = base.hasLiftColumn ? base.liftColumnMaxExtensionCm * CM_TO_M : 0;
  const baseRadiusM = (base.diameterOrWidthCm / 2) * CM_TO_M;
  const shoulderUpM = arm.shoulderHeightAboveBaseCm * CM_TO_M;

  // Mount XZ offset — closer to center (45% of radius) since FlexiArm
  // typically rises from a central pedestal.
  const offset = baseRadiusM * 0.45;
  let mountX = 0;
  let mountZ = 0;
  switch (arm.mountPosition) {
    case 'center':
      mountX = 0;
      mountZ = 0;
      break;
    case 'front':
      mountX = 0;
      mountZ = offset;
      break;
    case 'left':
      mountX = -offset;
      mountZ = 0;
      break;
    case 'right':
      mountX = offset;
      mountZ = 0;
      break;
  }

  const pedestalY = baseHeightM + liftM;
  const shoulderY = pedestalY + shoulderUpM;

  const L1 = arm.upperArmLengthCm * CM_TO_M;
  const L2 = arm.forearmLengthCm * CM_TO_M;

  // ─── Pose from store (visual only) ─────────────────────────────────
  // shoulderPitchDeg: 0 = vertical up, 90 = horizontal forward
  // elbowDeg: 180 = straight (extended), 110 = folded back
  const upperPitch = (Math.PI / 180) * armPose.shoulderPitchDeg;
  const elbowAngle = (Math.PI / 180) * armPose.elbowDeg;
  const forearmPitch = upperPitch - (Math.PI - elbowAngle);

  // Outward direction in horizontal plane: prefer +Z (forward) for center
  // mount; for side mounts, fold is in the radial direction.
  let dirX = 0;
  let dirZ = 1;
  if (arm.mountPosition === 'left') { dirX = -1; dirZ = 0; }
  else if (arm.mountPosition === 'right') { dirX = 1; dirZ = 0; }

  // Vector from shoulder to elbow (along upper arm)
  const upperVec = new THREE.Vector3(
    Math.sin(upperPitch) * dirX,
    Math.cos(upperPitch),
    Math.sin(upperPitch) * dirZ,
  ).multiplyScalar(L1);

  // Vector from elbow to wrist (along forearm)
  const forearmVec = new THREE.Vector3(
    Math.sin(forearmPitch) * dirX,
    Math.cos(forearmPitch),
    Math.sin(forearmPitch) * dirZ,
  ).multiplyScalar(L2);

  const shoulderPos = new THREE.Vector3(mountX, shoulderY, mountZ);
  const elbowPos = shoulderPos.clone().add(upperVec);
  const tipPos = elbowPos.clone().add(forearmVec);

  // Cylinder orientation for limbs
  const yAxis = new THREE.Vector3(0, 1, 0);
  const upperDir = upperVec.clone().normalize();
  const forearmDir = forearmVec.clone().normalize();
  const upperQuat = new THREE.Quaternion().setFromUnitVectors(yAxis, upperDir);
  const forearmQuat = new THREE.Quaternion().setFromUnitVectors(yAxis, forearmDir);
  const upperEuler = new THREE.Euler().setFromQuaternion(upperQuat);
  const forearmEuler = new THREE.Euler().setFromQuaternion(forearmQuat);

  // Limb radii — thicker than before, matching FlexiArm proportions
  const upperArmRadiusM = 0.024;
  const forearmRadiusM = 0.020;
  const jointRadiusM = 0.032;
  const wristRadiusM = 0.022;

  // Mid-points
  const upperMid = shoulderPos.clone().add(upperVec.clone().multiplyScalar(0.5));
  const forearmMid = elbowPos.clone().add(forearmVec.clone().multiplyScalar(0.5));

  // End-effector tip dimensions
  const tipScale = endEffector ? Math.min(0.05, 0.025 + endEffector.maxPayloadKg * 0.012) : 0.032;

  // Pedestal disc — small flat platform on top of base where the arm mounts
  const pedestalRadiusM = 0.045;
  const pedestalHeightM = 0.012;

  return (
    <group>
      {/* Pedestal (FlexiArm Riser mount platform) */}
      <mesh
        position={[mountX, pedestalY + pedestalHeightM / 2, mountZ]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[pedestalRadiusM, pedestalRadiusM * 1.1, pedestalHeightM, 32]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.65} roughness={0.25} />
      </mesh>

      {/* Shoulder joint (large black sphere) */}
      <mesh position={shoulderPos.toArray()} castShadow>
        <sphereGeometry args={[jointRadiusM, 32, 24]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Shoulder accent ring */}
      <mesh
        position={shoulderPos.toArray()}
        rotation={upperEuler.toArray() as [number, number, number]}
      >
        <torusGeometry args={[jointRadiusM * 0.85, jointRadiusM * 0.18, 8, 32]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Upper arm — thicker cylinder w/ subtle edge highlight */}
      <mesh
        position={upperMid.toArray()}
        rotation={upperEuler.toArray() as [number, number, number]}
        castShadow
      >
        <cylinderGeometry args={[upperArmRadiusM, upperArmRadiusM, L1, 32]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.45} roughness={0.4} />
        <Edges color={color} threshold={15} />
      </mesh>

      {/* Elbow joint */}
      <mesh position={elbowPos.toArray()} castShadow>
        <sphereGeometry args={[jointRadiusM * 0.85, 28, 20]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Forearm */}
      <mesh
        position={forearmMid.toArray()}
        rotation={forearmEuler.toArray() as [number, number, number]}
        castShadow
      >
        <cylinderGeometry args={[forearmRadiusM, forearmRadiusM, L2, 32]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.45} roughness={0.4} />
        <Edges color={color} threshold={15} />
      </mesh>

      {/* Wrist (smaller joint) */}
      <mesh position={tipPos.toArray()} castShadow>
        <sphereGeometry args={[wristRadiusM, 24, 18]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* End-effector tip — camera-like capsule */}
      <mesh
        position={tipPos
          .clone()
          .add(forearmDir.clone().multiplyScalar(tipScale * 1.2))
          .toArray()}
        rotation={forearmEuler.toArray() as [number, number, number]}
        castShadow
      >
        <cylinderGeometry args={[tipScale * 0.55, tipScale * 0.65, tipScale * 1.4, 24]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.45} emissive={color} emissiveIntensity={0.18} />
      </mesh>

      {/* Wrist DOF rings */}
      {Array.from({ length: arm.wristDof }).map((_, i) => {
        const t = 1 - 0.08 * (i + 1);
        const ringPos = elbowPos.clone().lerp(tipPos, t);
        return (
          <mesh
            key={i}
            position={ringPos.toArray()}
            rotation={forearmEuler.toArray() as [number, number, number]}
          >
            <torusGeometry args={[forearmRadiusM * 1.5, forearmRadiusM * 0.32, 8, 24]} />
            <meshBasicMaterial color={color} />
          </mesh>
        );
      })}
    </group>
  );
}
