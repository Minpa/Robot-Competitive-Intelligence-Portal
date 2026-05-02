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
import type { ManipulatorArmSpec, VacuumBaseSpec, EndEffectorSpec, EndEffectorType } from '../../types/product';
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

      {/* End-effector — parent group is positioned AT the wrist and rotated
          to match the forearm direction (URDF "fixed joint" equivalent).
          All children extend in +y local = +forearmDir world, so the gripper
          continues past the wrist along the arm direction regardless of pose.

          Geometry routes by endEffector.type — falls back to a generic
          coupling+body+face plate for unknown / no end-effector. */}
      <EndEffectorAssembly
        wristPos={tipPos}
        forearmEuler={forearmEuler}
        type={endEffector?.type}
        color={color}
        tipScale={tipScale}
      />

      {/* Wrist DOF rings — stacked on the forearm just above the wrist (not on the tip) */}
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

/* ─── End-effector assembly ─────────────────────────────────────────────────
 * The parent group is positioned at the wrist with rotation = forearmEuler.
 * Inside this group, +y local = +forearmDir world, so all geometry extends
 * AWAY from the elbow along the arm's tool axis. This is how URDFs attach
 * end-effectors: a fixed joint with a transform offset from the wrist link.
 * ─────────────────────────────────────────────────────────────────────────── */

interface EndEffectorAssemblyProps {
  wristPos: THREE.Vector3;
  forearmEuler: THREE.Euler;
  type: EndEffectorType | undefined;
  color: string;
  tipScale: number;
}

function EndEffectorAssembly({ wristPos, forearmEuler, type, color, tipScale }: EndEffectorAssemblyProps) {
  return (
    <group
      position={wristPos.toArray()}
      rotation={forearmEuler.toArray() as [number, number, number]}
    >
      {/* Coupling collar — at the wrist face, narrows toward the body */}
      <mesh position={[0, tipScale * 0.18, 0]} castShadow>
        <cylinderGeometry args={[tipScale * 0.45, tipScale * 0.55, tipScale * 0.30, 20]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.3} />
      </mesh>

      {type === 'suction' ? (
        <>
          {/* Suction stem */}
          <mesh position={[0, tipScale * 0.55, 0]} castShadow>
            <cylinderGeometry args={[tipScale * 0.18, tipScale * 0.30, tipScale * 0.40, 16]} />
            <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} emissive={color} emissiveIntensity={0.12} />
          </mesh>
          {/* Suction cup — flared, wider at the gripping face (radiusTop > radiusBottom) */}
          <mesh position={[0, tipScale * 0.95, 0]} castShadow>
            <cylinderGeometry args={[tipScale * 0.85, tipScale * 0.18, tipScale * 0.40, 24]} />
            <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} emissive={color} emissiveIntensity={0.12} />
          </mesh>
          {/* Suction face (rubber) */}
          <mesh position={[0, tipScale * 1.18, 0]} castShadow>
            <cylinderGeometry args={[tipScale * 0.85, tipScale * 0.85, tipScale * 0.04, 28]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.85} />
          </mesh>
        </>
      ) : type === '2finger' || type === 'simple_gripper' ? (
        <>
          {/* Gripper body — short box for the actuator housing */}
          <mesh position={[0, tipScale * 0.55, 0]} castShadow>
            <boxGeometry args={[tipScale * 1.10, tipScale * 0.35, tipScale * 0.55]} />
            <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} emissive={color} emissiveIntensity={0.12} />
          </mesh>
          {/* Two parallel jaws extending outward (along +y local) */}
          {[-1, 1].map((sign) => (
            <group key={sign} position={[sign * tipScale * 0.30, tipScale * 0.95, 0]}>
              <mesh castShadow>
                <boxGeometry args={[tipScale * 0.16, tipScale * 0.55, tipScale * 0.45]} />
                <meshStandardMaterial color="#1a1a1a" metalness={0.55} roughness={0.4} />
              </mesh>
              {/* Inner pad (gripping surface) */}
              <mesh position={[-sign * tipScale * 0.085, 0, 0]}>
                <boxGeometry args={[tipScale * 0.02, tipScale * 0.50, tipScale * 0.40]} />
                <meshStandardMaterial color="#3a3a3a" roughness={0.6} />
              </mesh>
            </group>
          ))}
        </>
      ) : type === '3finger' ? (
        <>
          {/* Gripper body */}
          <mesh position={[0, tipScale * 0.55, 0]} castShadow>
            <cylinderGeometry args={[tipScale * 0.55, tipScale * 0.55, tipScale * 0.45, 24]} />
            <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} emissive={color} emissiveIntensity={0.12} />
          </mesh>
          {/* 3 fingers in 120° arrangement, angled inward */}
          {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((angle, i) => {
            const fx = Math.cos(angle) * tipScale * 0.30;
            const fz = Math.sin(angle) * tipScale * 0.30;
            return (
              <group
                key={i}
                position={[fx, tipScale * 1.05, fz]}
                rotation={[0, -angle, -0.25]}
              >
                <mesh castShadow>
                  <boxGeometry args={[tipScale * 0.14, tipScale * 0.55, tipScale * 0.18]} />
                  <meshStandardMaterial color="#1a1a1a" metalness={0.55} roughness={0.4} />
                </mesh>
              </group>
            );
          })}
        </>
      ) : (
        // Fallback: generic end-effector (body + face plate)
        <>
          <mesh position={[0, tipScale * 0.85, 0]} castShadow>
            <cylinderGeometry args={[tipScale * 0.55, tipScale * 0.85, tipScale * 1.0, 24]} />
            <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} emissive={color} emissiveIntensity={0.12} />
          </mesh>
          <mesh position={[0, tipScale * 1.40, 0]} castShadow>
            <cylinderGeometry args={[tipScale * 0.88, tipScale * 0.88, tipScale * 0.06, 28]} />
            <meshStandardMaterial color="#0a0a0a" metalness={0.5} roughness={0.4} />
          </mesh>
        </>
      )}
    </group>
  );
}
