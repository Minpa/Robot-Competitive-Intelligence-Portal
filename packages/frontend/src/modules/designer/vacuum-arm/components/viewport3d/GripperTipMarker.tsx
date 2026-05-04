'use client';

/**
 * GripperTipMarker — 그리퍼 끝 위치를 항상 보이는 emissive 마커로 표시.
 *
 * 사용자가 슬라이더로 자세를 조정하면 그리퍼가 어디 가는지 즉각 보이도록.
 * Three.js Canvas 안에서 mount.
 */

import { useDesignerVacuumStore } from '../../stores/designer-vacuum-store';
import { computeWristWorldPosition } from '../../kinematics/grasp-engine';

const CM_TO_M = 0.01;

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

  const arm = product.arms[0];
  if (!arm) return null;

  const robotXM = ((robotXCm ?? halfWCm) - halfWCm) * CM_TO_M;
  const robotZM = ((robotYCm ?? halfDCm) - halfDCm) * CM_TO_M;
  const yawRad = (robotYawDeg * Math.PI) / 180;
  const wrist = computeWristWorldPosition(product.base, arm, armPose, robotXM, robotZM, yawRad);

  return (
    <group position={[wrist.x, wrist.y, wrist.z]}>
      {/* 노란 발광 구체 */}
      <mesh>
        <sphereGeometry args={[0.018, 16, 12]} />
        <meshStandardMaterial color="#ffd86b" emissive="#ffb020" emissiveIntensity={0.9} />
      </mesh>
      {/* 바닥에 수직 가이드선 — 어떤 위치인지 평면상 확인 */}
      {wrist.y > 0.02 ? (
        <mesh position={[0, -wrist.y / 2, 0]}>
          <cylinderGeometry args={[0.0018, 0.0018, wrist.y, 6]} />
          <meshBasicMaterial color="#ffd86b" transparent opacity={0.45} />
        </mesh>
      ) : null}
      {/* 바닥 ring (그리퍼 ground projection) */}
      <mesh position={[0, -wrist.y + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.025, 0.038, 24]} />
        <meshBasicMaterial color="#ffd86b" transparent opacity={0.55} />
      </mesh>
    </group>
  );
}
