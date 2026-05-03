'use client';

/**
 * Link visual primitives.
 *
 * 각 link의 VisualSpec.kind에 따라 적절한 메시를 렌더링.
 * 모든 메시는 link의 local frame (joint origin + joint state) 안에서 그려짐.
 *
 * 중요한 좌표 규약 (URDF 패턴):
 *   - link의 local +Y = "이 link가 자라는 방향" (cylinder axis)
 *   - 자식 link는 보통 +Y 방향 끝에 attach (예: upper_arm 끝에 elbow가 +Y에 위치)
 *   - 그리퍼는 wrist의 +Y 방향으로 extend
 *
 * 이렇게 하면 부모의 회전이 자식에 자동으로 전파되어 그리퍼 부착 방향이
 * 항상 정확함 (이전 코드의 setFromUnitVectors 자유도 문제 해결).
 */

import type { VisualSpec } from './robot-tree';
import type { EndEffectorType } from '../types/product';

const ACCENT_GOLD = '#c08a3a';

interface LinkVisualProps {
  visual: VisualSpec;
}

export function LinkVisual({ visual }: LinkVisualProps) {
  switch (visual.kind) {
    case 'vacuumBase':
      return <VacuumBaseVisual params={visual.params} />;
    case 'liftColumn':
      return <LiftColumnVisual params={visual.params} color={visual.color} />;
    case 'pedestal':
      return <PedestalVisual params={visual.params} />;
    case 'jointSphere':
      return <JointSphereVisual params={visual.params} color={visual.color} />;
    case 'linkCylinder':
      return <LinkCylinderVisual params={visual.params} color={visual.color} />;
    case 'wristJoint':
      return <WristJointVisual params={visual.params} />;
    case 'endEffector':
      return <EndEffectorVisual params={visual.params} color={visual.color} />;
    default:
      return null;
  }
}

/* ─── VacuumBase: 디스크 또는 사각, 베이스 윗면이 +Y 방향 ────────────────── */

function VacuumBaseVisual({ params }: { params: Record<string, number | string> }) {
  const shape = params.shape as string;
  const diameterM = params.diameterM as number;
  const heightM = params.heightM as number;
  const hasArm = (params.hasArm as number) === 1;
  const radiusM = diameterM / 2;
  const isDisc = shape !== 'square';
  const yCenter = heightM / 2;

  const BODY_COLOR = '#1a1a1a';
  const TOP_COLOR = '#0d0d0d';
  const CHROME_COLOR = '#9a9a9a';

  return (
    <group>
      {isDisc ? (
        <mesh position={[0, yCenter, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[radiusM, radiusM, heightM, 64]} />
          <meshStandardMaterial color={BODY_COLOR} metalness={0.35} roughness={0.5} />
        </mesh>
      ) : (
        <mesh position={[0, yCenter, 0]} castShadow receiveShadow>
          <boxGeometry args={[diameterM, heightM, diameterM]} />
          <meshStandardMaterial color={BODY_COLOR} metalness={0.35} roughness={0.5} />
        </mesh>
      )}

      {/* 윗면 패널 */}
      {isDisc && (
        <mesh position={[0, heightM + 0.0008, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[radiusM * 0.95, 64]} />
          <meshStandardMaterial color={TOP_COLOR} metalness={0.55} roughness={0.25} />
        </mesh>
      )}

      {/* 크롬 링 */}
      {isDisc && (
        <mesh position={[0, heightM + 0.0012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radiusM * 0.92, radiusM * 0.985, 64]} />
          <meshStandardMaterial color={CHROME_COLOR} metalness={0.85} roughness={0.18} />
        </mesh>
      )}

      {/* 골드 액센트 링 */}
      {isDisc && (
        <mesh position={[0, heightM + 0.0014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radiusM * 0.42, radiusM * 0.48, 48]} />
          <meshBasicMaterial color={ACCENT_GOLD} />
        </mesh>
      )}

      {/* LiDAR 터릿 — 디자인 툴 컨텍스트에서 essential 아니고 사용자 혼동
          (페데스탈 stem과 비슷한 visual)을 야기해서 항상 숨김.
          향후 baseDecor toggle 같은 옵션으로 노출 가능. */}
      {/* hasArm 무시하고 항상 안 그림 — hasArm 변수는 미래 분기를 위해 유지 */}
      {false && isDisc && !hasArm ? <group /> : null}

      {/* 사이드 모프 윙 */}
      {isDisc && (
        <mesh position={[-radiusM * 1.05, heightM * 0.15, 0]} castShadow>
          <boxGeometry args={[radiusM * 0.18, heightM * 0.5, radiusM * 0.45]} />
          <meshStandardMaterial color="#e8e8e8" metalness={0.05} roughness={0.85} />
        </mesh>
      )}

      {/* 휠 디스크 3개 */}
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

      {/* 윗면 벤트 슬롯 */}
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
    </group>
  );
}

/* ─── LiftColumn: prismatic joint, +Y 방향으로 extend ──────────────────── */

function LiftColumnVisual({
  params,
  color = '#E63950',
}: {
  params: Record<string, number | string>;
  color?: string;
}) {
  const maxExtensionM = params.maxExtensionM as number;
  const baseRadiusM = params.baseRadiusM as number;
  // joint state로 column이 +Y 방향으로 이동했음 — 시각은 column 자체 (column 길이가 max로 고정,
  // joint state는 column 끝 위치를 결정하므로 column 길이는 max로 그리되 자식이 +Y로 이동)
  return (
    <mesh position={[0, maxExtensionM / 2, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[baseRadiusM * 0.6, baseRadiusM * 0.7, maxExtensionM, 24]} />
      <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} />
    </mesh>
  );
}

/* ─── Pedestal: 팔 마운트 디스크 + 어깨까지 올라오는 stem ──────────────── */

function PedestalVisual({ params }: { params: Record<string, number | string> }) {
  const discRadiusM = (params.discRadiusM as number) ?? 0.045;
  const discHeightM = (params.discHeightM as number) ?? 0.012;
  const stemHeightM = (params.stemHeightM as number) ?? 0;
  const stemRadiusM = (params.stemRadiusM as number) ?? 0.018;

  return (
    <group>
      {/* 마운트 디스크 (베이스 위) */}
      <mesh position={[0, discHeightM / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[discRadiusM, discRadiusM * 1.1, discHeightM, 32]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.65} roughness={0.25} />
      </mesh>
      {/* Stem: 디스크 위에서 어깨 origin까지 솟는 기둥 */}
      {stemHeightM > 0.005 ? (
        <mesh position={[0, discHeightM + stemHeightM / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[stemRadiusM * 0.9, stemRadiusM, stemHeightM, 24]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.55} roughness={0.35} />
        </mesh>
      ) : null}
    </group>
  );
}

/* ─── JointSphere: revolute joint visual (구체 + 액센트 링) ──────────── */

function JointSphereVisual({
  params,
  color = '#E63950',
}: {
  params: Record<string, number | string>;
  color?: string;
}) {
  const radiusM = params.radiusM as number;
  return (
    <group>
      <mesh castShadow>
        <sphereGeometry args={[radiusM, 28, 20]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* 액센트 토러스 — joint axis (X) 주위로 */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[radiusM * 0.85, radiusM * 0.18, 8, 32]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

/* ─── LinkCylinder: upper arm / forearm — local +Y 방향으로 length만큼 extend ── */

function LinkCylinderVisual({
  params,
  color = '#E63950',
}: {
  params: Record<string, number | string>;
  color?: string;
}) {
  const radiusM = params.radiusM as number;
  const lengthM = params.lengthM as number;
  return (
    <group>
      <mesh position={[0, lengthM / 2, 0]} castShadow>
        <cylinderGeometry args={[radiusM, radiusM * 0.93, lengthM, 24]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.45} roughness={0.4} />
      </mesh>
      {/* 액센트 stripe — 길이 방향으로 */}
      <mesh position={[radiusM, lengthM * 0.5, 0]}>
        <boxGeometry args={[0.003, lengthM * 0.7, radiusM * 1.5]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

/* ─── WristJoint: 손목 visual — 오리진에 sphere만 (offset 없음, 그리퍼와 충돌 방지) */

function WristJointVisual({ params }: { params: Record<string, number | string> }) {
  const radiusM = params.radiusM as number;
  return (
    <mesh position={[0, 0, 0]} castShadow>
      <sphereGeometry args={[radiusM, 24, 18]} />
      <meshStandardMaterial color="#0a0a0a" metalness={0.6} roughness={0.3} />
    </mesh>
  );
}

/* ─── EndEffector: type별 분기 (suction / 2finger / 3finger / fallback) ──
 * wrist link의 +Y 방향으로 extend. 부모(wrist) frame이 forearm 끝의 방향을
 * 가리키므로, 그리퍼는 항상 forearm 연장선으로 부착됨. (URDF fixed joint 패턴)
 * ─────────────────────────────────────────────────────────────────────────── */

function EndEffectorVisual({
  params,
  color = '#E63950',
}: {
  params: Record<string, number | string>;
  color?: string;
}) {
  const eeType = params.eeType as EndEffectorType;
  const tipScale = params.tipScale as number;

  return (
    <group>
      {/* Coupling collar — 손목 face에서 시작, body 쪽으로 살짝 좁아짐 */}
      <mesh position={[0, tipScale * 0.18, 0]} castShadow>
        <cylinderGeometry args={[tipScale * 0.45, tipScale * 0.55, tipScale * 0.30, 20]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.3} />
      </mesh>

      {eeType === 'suction' ? (
        <SuctionEffector tipScale={tipScale} color={color} />
      ) : eeType === '2finger' || eeType === 'simple_gripper' ? (
        <TwoFingerGripper tipScale={tipScale} color={color} />
      ) : eeType === '3finger' ? (
        <ThreeFingerGripper tipScale={tipScale} color={color} />
      ) : (
        <FallbackEffector tipScale={tipScale} color={color} />
      )}
    </group>
  );
}

function SuctionEffector({ tipScale, color }: { tipScale: number; color: string }) {
  return (
    <>
      {/* Stem (좁은 원기둥) */}
      <mesh position={[0, tipScale * 0.55, 0]} castShadow>
        <cylinderGeometry args={[tipScale * 0.18, tipScale * 0.30, tipScale * 0.40, 16]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} emissive={color} emissiveIntensity={0.12} />
      </mesh>
      {/* Cup (파지 face가 wider) */}
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
  );
}

function TwoFingerGripper({ tipScale, color }: { tipScale: number; color: string }) {
  return (
    <>
      {/* Gripper body */}
      <mesh position={[0, tipScale * 0.55, 0]} castShadow>
        <boxGeometry args={[tipScale * 1.10, tipScale * 0.35, tipScale * 0.55]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} emissive={color} emissiveIntensity={0.12} />
      </mesh>
      {/* 평행 jaw 2개 — local X축으로 벌어짐 (forearm 방향과 수직) */}
      {[-1, 1].map((sign) => (
        <group key={sign} position={[sign * tipScale * 0.30, tipScale * 0.95, 0]}>
          <mesh castShadow>
            <boxGeometry args={[tipScale * 0.16, tipScale * 0.55, tipScale * 0.45]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.55} roughness={0.4} />
          </mesh>
          {/* 안쪽 패드 */}
          <mesh position={[-sign * tipScale * 0.085, 0, 0]}>
            <boxGeometry args={[tipScale * 0.02, tipScale * 0.50, tipScale * 0.40]} />
            <meshStandardMaterial color="#3a3a3a" roughness={0.6} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function ThreeFingerGripper({ tipScale, color }: { tipScale: number; color: string }) {
  return (
    <>
      <mesh position={[0, tipScale * 0.55, 0]} castShadow>
        <cylinderGeometry args={[tipScale * 0.55, tipScale * 0.55, tipScale * 0.45, 24]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} emissive={color} emissiveIntensity={0.12} />
      </mesh>
      {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((angle, i) => {
        const fx = Math.cos(angle) * tipScale * 0.30;
        const fz = Math.sin(angle) * tipScale * 0.30;
        return (
          <group key={i} position={[fx, tipScale * 1.05, fz]} rotation={[0, -angle, -0.25]}>
            <mesh castShadow>
              <boxGeometry args={[tipScale * 0.14, tipScale * 0.55, tipScale * 0.18]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.55} roughness={0.4} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

function FallbackEffector({ tipScale, color }: { tipScale: number; color: string }) {
  return (
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
  );
}
