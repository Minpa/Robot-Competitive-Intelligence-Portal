'use client';

/**
 * GripperTipMarker — 그리퍼 끝 위치 + grab 반경을 시각화.
 *
 * 사용자가 슬라이더로 자세를 조정하면 그리퍼가 어디 가는지 즉각 보이도록.
 * 추가로 grab 반경(18cm)을 옅은 구체로 — 타겟이 안에 들어오면 닫기만 하면 잡힘.
 * Three.js Canvas 안에서 mount.
 */

import * as THREE from 'three';
import { useDesignerVacuumStore } from '../../stores/designer-vacuum-store';
import { computeWristWorldPosition } from '../../kinematics/grasp-engine';

const CM_TO_M = 0.01;
const GRIP_RADIUS_M = 0.18; // physics-bodies.tsx GRIP_RADIUS_M와 동일

interface GripperTipMarkerProps {
  halfWCm: number;
  halfDCm: number;
}

export function GripperTipMarker({ halfWCm, halfDCm }: GripperTipMarkerProps) {
  const product = useDesignerVacuumStore((s) => s.product);
  const armPose = useDesignerVacuumStore((s) => s.armPose);
  const robotXCm = useDesignerVacuumStore((s) => s.robotXCm);
  const robotYCm = useDesignerVacuumStore((s) => s.robotYCm);
  const robotYawDeg = useDesignerVacuumStore((s) => s.robotYawDeg);
  const targets = useDesignerVacuumStore((s) => s.room.targets);
  const manualGripperClosed = useDesignerVacuumStore((s) => s.manualGripperClosed);

  const arm = product.arms[0];
  if (!arm) return null;

  const robotXM = ((robotXCm ?? halfWCm) - halfWCm) * CM_TO_M;
  const robotZM = ((robotYCm ?? halfDCm) - halfDCm) * CM_TO_M;
  const yawRad = (robotYawDeg * Math.PI) / 180;
  const wrist = computeWristWorldPosition(product.base, arm, armPose, robotXM, robotZM, yawRad);

  // 반경 안에 타겟이 있는지 — 색상 강조
  const halfW = halfWCm;
  const halfD = halfDCm;
  let inRange = false;
  for (const t of targets) {
    const tWX = (t.xCm - halfW) * CM_TO_M;
    const tWZ = (t.yCm - halfD) * CM_TO_M;
    const tWY = Math.max(t.zCm, 0.5) * CM_TO_M;
    const dx = wrist.x - tWX;
    const dy = wrist.y - tWY;
    const dz = wrist.z - tWZ;
    if (dx * dx + dy * dy + dz * dz < GRIP_RADIUS_M * GRIP_RADIUS_M) {
      inRange = true;
      break;
    }
  }

  const tipColor = manualGripperClosed ? '#86efac' : inRange ? '#ffd86b' : '#ffd86b';
  const rangeColor = inRange ? '#86efac' : '#ffd86b';

  return (
    <group position={[wrist.x, wrist.y, wrist.z]}>
      {/* Grab 반경 — 매우 옅은 구체. 타겟이 안에 있으면 녹색, 아니면 노랑. */}
      <mesh>
        <sphereGeometry args={[GRIP_RADIUS_M, 24, 16]} />
        <meshBasicMaterial
          color={rangeColor}
          transparent
          opacity={inRange ? 0.12 : 0.05}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      {/* 발광 구체 — 잡힌 상태면 녹색, 아니면 노랑 */}
      <mesh>
        <sphereGeometry args={[0.018, 16, 12]} />
        <meshStandardMaterial color={tipColor} emissive={tipColor} emissiveIntensity={0.9} />
      </mesh>
      {/* 바닥에 수직 가이드선 */}
      {wrist.y > 0.02 ? (
        <mesh position={[0, -wrist.y / 2, 0]}>
          <cylinderGeometry args={[0.0018, 0.0018, wrist.y, 6]} />
          <meshBasicMaterial color={tipColor} transparent opacity={0.45} />
        </mesh>
      ) : null}
      {/* 바닥 ring (그리퍼 ground projection) */}
      <mesh position={[0, -wrist.y + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.025, 0.038, 24]} />
        <meshBasicMaterial color={tipColor} transparent opacity={0.55} />
      </mesh>
    </group>
  );
}
