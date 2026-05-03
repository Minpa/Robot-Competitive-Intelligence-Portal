'use client';

/**
 * Furniture visuals for Room3D mode.
 *
 * cloid-exhibition-simulator의 imperative THREE.js builder들을 R3F 컴포넌트로
 * 포팅. 각 컴포넌트는 FurnitureSpec의 widthCm × depthCm × surfaceHeightCm를
 * 받아서 spec에 맞게 비례 렌더링.
 *
 * 좌표계: 가구 origin = 바닥 중앙. +Y는 위. width = X 방향, depth = Z 방향.
 */

import type { FurnitureType } from '../types/product';

interface FurnitureVisualProps {
  type: FurnitureType;
  widthM: number;
  depthM: number;
  heightM: number; // surfaceHeightCm 기준 (= 가구 윗면 높이)
}

export function FurnitureVisual({ type, widthM, depthM, heightM }: FurnitureVisualProps) {
  switch (type) {
    case 'sofa':
      return <SofaVisual widthM={widthM} depthM={depthM} heightM={heightM} />;
    case 'dining_table':
      return <DiningTableVisual widthM={widthM} depthM={depthM} heightM={heightM} />;
    case 'sink_counter':
      return <SinkCounterVisual widthM={widthM} depthM={depthM} heightM={heightM} />;
    case 'desk':
      return <DeskVisual widthM={widthM} depthM={depthM} heightM={heightM} />;
    case 'chair':
      return <ChairVisual widthM={widthM} depthM={depthM} heightM={heightM} />;
    default:
      return <FallbackBox widthM={widthM} depthM={depthM} heightM={heightM} />;
  }
}

interface PartProps {
  widthM: number;
  depthM: number;
  heightM: number;
}

/* ─── Sofa ─────────────────────────────────────────────────────────────────
 * surfaceHeightCm = 좌면 높이 (~45cm). 등받이는 좌면 위 ~40cm.
 * 좌석 수는 width 비례 (>= 1.8m → 3-seat, else 2-seat).
 * ─────────────────────────────────────────────────────────────────────────── */

function SofaVisual({ widthM, depthM, heightM }: PartProps) {
  const cushionColor = '#4a7ec4'; // bluish cushion
  const legColor = '#2a2a2a';
  const seats = widthM >= 1.8 ? 3 : 2;
  const seatBaseH = heightM * 0.55; // 좌석 본체 높이
  const seatCushionH = heightM * 0.25; // 좌석 쿠션 높이
  const seatTopY = seatBaseH + seatCushionH; // 좌면 윗면 (사용자 surfaceHeightCm)
  const backH = heightM * 0.85; // 등받이 높이 (좌면 위)
  const armH = heightM * 1.15; // 팔걸이 높이
  const legH = heightM * 0.20;
  const seatW = (widthM - 0.10) / seats;

  return (
    <group>
      {/* 본체 base */}
      <mesh position={[0, seatBaseH / 2 + legH, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, seatBaseH, depthM]} />
        <meshStandardMaterial color={cushionColor} roughness={0.85} />
      </mesh>
      {/* 좌석 쿠션 */}
      {Array.from({ length: seats }).map((_, i) => (
        <mesh
          key={`cushion-${i}`}
          position={[
            -widthM / 2 + 0.05 + seatW / 2 + i * seatW,
            legH + seatBaseH + seatCushionH / 2,
            0,
          ]}
          castShadow
        >
          <boxGeometry args={[seatW - 0.02, seatCushionH, depthM - 0.10]} />
          <meshStandardMaterial color={cushionColor} roughness={0.85} />
        </mesh>
      ))}
      {/* 등받이 쿠션 */}
      {Array.from({ length: seats }).map((_, i) => (
        <mesh
          key={`back-${i}`}
          position={[
            -widthM / 2 + 0.05 + seatW / 2 + i * seatW,
            legH + seatBaseH + seatCushionH + backH * 0.4,
            -depthM / 2 + 0.10,
          ]}
          castShadow
        >
          <boxGeometry args={[seatW - 0.04, backH * 0.8, 0.15]} />
          <meshStandardMaterial color={cushionColor} roughness={0.85} />
        </mesh>
      ))}
      {/* 팔걸이 */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * (widthM / 2 - 0.05), legH + armH / 2, 0]} castShadow>
          <boxGeometry args={[0.10, armH, depthM]} />
          <meshStandardMaterial color={cushionColor} roughness={0.85} />
        </mesh>
      ))}
      {/* 다리 */}
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <mesh
          key={`leg-${i}`}
          position={[sx * (widthM / 2 - 0.05), legH / 2, sz * (depthM / 2 - 0.05)]}
        >
          <boxGeometry args={[0.04, legH, 0.04]} />
          <meshStandardMaterial color={legColor} roughness={0.4} metalness={0.5} />
        </mesh>
      ))}
      {/* 좌면 가이드 (윗면 강조 — 워크스페이스 충돌 시각용) */}
      <mesh position={[0, seatTopY + legH + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[widthM - 0.02, depthM - 0.02]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.10} />
      </mesh>
    </group>
  );
}

/* ─── Dining Table ────────────────────────────────────────────────────────
 * surfaceHeightCm = 윗면 높이 (~75cm). 4 다리.
 * ─────────────────────────────────────────────────────────────────────────── */

function DiningTableVisual({ widthM, depthM, heightM }: PartProps) {
  const woodColor = '#a07238';
  const legColor = '#3a2a1a';
  const topThicknessM = 0.04;

  return (
    <group>
      {/* 윗면 */}
      <mesh position={[0, heightM - topThicknessM / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, topThicknessM, depthM]} />
        <meshStandardMaterial color={woodColor} roughness={0.5} metalness={0.05} />
      </mesh>
      {/* 4 다리 */}
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <mesh
          key={i}
          position={[
            sx * (widthM / 2 - 0.06),
            (heightM - topThicknessM) / 2,
            sz * (depthM / 2 - 0.06),
          ]}
          castShadow
        >
          <boxGeometry args={[0.05, heightM - topThicknessM, 0.05]} />
          <meshStandardMaterial color={legColor} roughness={0.6} />
        </mesh>
      ))}
      {/* 윗면 가이드 */}
      <mesh position={[0, heightM + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[widthM - 0.02, depthM - 0.02]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.18} />
      </mesh>
    </group>
  );
}

/* ─── Sink Counter ────────────────────────────────────────────────────────
 * surfaceHeightCm = 카운터 윗면 (~90cm). 캐비닛 + 카운터 탑 + 싱크볼 + 수도꼭지.
 * ─────────────────────────────────────────────────────────────────────────── */

function SinkCounterVisual({ widthM, depthM, heightM }: PartProps) {
  const cabinetColor = '#7a7a7a';
  const counterColor = '#3a3a3a'; // dark stone
  const sinkColor = '#1a1a1a';
  const faucetColor = '#a8a8a8';

  const counterThicknessM = 0.04;
  const cabinetH = heightM - counterThicknessM;

  return (
    <group>
      {/* 캐비닛 */}
      <mesh position={[0, cabinetH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, cabinetH, depthM]} />
        <meshStandardMaterial color={cabinetColor} roughness={0.65} />
      </mesh>
      {/* 캐비닛 도어 분할선 (앞면) */}
      {[-0.25, 0.25].map((xRatio, i) => (
        <mesh
          key={i}
          position={[xRatio * widthM, cabinetH / 2, depthM / 2 + 0.002]}
        >
          <planeGeometry args={[0.005, cabinetH * 0.85]} />
          <meshBasicMaterial color="#1a1a1a" />
        </mesh>
      ))}
      {/* 카운터 탑 */}
      <mesh position={[0, cabinetH + counterThicknessM / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM + 0.02, counterThicknessM, depthM + 0.02]} />
        <meshStandardMaterial color={counterColor} roughness={0.3} metalness={0.2} />
      </mesh>
      {/* 싱크볼 (카운터 위에 패인 박스) */}
      <mesh position={[0, cabinetH - 0.04, 0]} castShadow>
        <boxGeometry args={[widthM * 0.5, 0.12, depthM * 0.6]} />
        <meshStandardMaterial color={sinkColor} roughness={0.3} metalness={0.4} />
      </mesh>
      {/* 수도꼭지 */}
      <mesh position={[0, heightM + 0.18, -depthM * 0.30]} castShadow>
        <cylinderGeometry args={[0.018, 0.022, 0.30, 12]} />
        <meshStandardMaterial color={faucetColor} metalness={0.85} roughness={0.18} />
      </mesh>
      <mesh
        position={[0, heightM + 0.30, -depthM * 0.20]}
        rotation={[Math.PI / 4, 0, 0]}
      >
        <cylinderGeometry args={[0.014, 0.018, 0.18, 10]} />
        <meshStandardMaterial color={faucetColor} metalness={0.85} roughness={0.18} />
      </mesh>
      {/* 카운터 윗면 가이드 */}
      <mesh position={[0, heightM + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[widthM, depthM]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.12} />
      </mesh>
    </group>
  );
}

/* ─── Desk ─────────────────────────────────────────────────────────────────
 * surfaceHeightCm = 윗면 (~73cm). 윗면 + 양옆 서랍 캐비닛.
 * ─────────────────────────────────────────────────────────────────────────── */

function DeskVisual({ widthM, depthM, heightM }: PartProps) {
  const woodColor = '#b89a78';
  const drawerColor = '#8a6a48';
  const handleColor = '#3a3a3a';

  const topThicknessM = 0.035;
  const cabinetW = widthM * 0.30;
  const cabinetH = heightM - topThicknessM;

  return (
    <group>
      {/* 윗면 */}
      <mesh position={[0, heightM - topThicknessM / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, topThicknessM, depthM]} />
        <meshStandardMaterial color={woodColor} roughness={0.5} />
      </mesh>
      {/* 좌측 캐비닛 */}
      <mesh position={[-(widthM / 2) + cabinetW / 2, cabinetH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[cabinetW, cabinetH, depthM * 0.95]} />
        <meshStandardMaterial color={drawerColor} roughness={0.6} />
      </mesh>
      {/* 좌측 서랍 분할선 (앞) */}
      {[0.7, 0.4, 0.1].map((yRatio, i) => (
        <mesh
          key={i}
          position={[-(widthM / 2) + cabinetW / 2, cabinetH * yRatio, depthM * 0.475 + 0.002]}
        >
          <planeGeometry args={[cabinetW * 0.85, 0.005]} />
          <meshBasicMaterial color={handleColor} />
        </mesh>
      ))}
      {/* 우측 다리 (간단한 ㄷ자 프레임) */}
      <mesh position={[(widthM / 2) - 0.025, cabinetH / 2, -(depthM / 2) + 0.025]} castShadow>
        <boxGeometry args={[0.05, cabinetH, 0.05]} />
        <meshStandardMaterial color={drawerColor} roughness={0.6} />
      </mesh>
      <mesh position={[(widthM / 2) - 0.025, cabinetH / 2, (depthM / 2) - 0.025]} castShadow>
        <boxGeometry args={[0.05, cabinetH, 0.05]} />
        <meshStandardMaterial color={drawerColor} roughness={0.6} />
      </mesh>
      {/* 윗면 가이드 */}
      <mesh position={[0, heightM + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[widthM - 0.02, depthM - 0.02]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.18} />
      </mesh>
    </group>
  );
}

/* ─── Chair ────────────────────────────────────────────────────────────────
 * surfaceHeightCm = 좌면 높이 (~45cm). 등받이 + 4 다리 + 좌면.
 * Mid-century 스타일.
 * ─────────────────────────────────────────────────────────────────────────── */

function ChairVisual({ widthM, depthM, heightM }: PartProps) {
  const cushionColor = '#5a5a5a';
  const woodColor = '#8a6a48';
  const seatThicknessM = 0.08;
  const legH = heightM - seatThicknessM / 2;
  const backH = heightM * 0.85;

  const radiusM = Math.min(widthM, depthM) / 2;

  return (
    <group>
      {/* 좌면 (원형 쿠션) */}
      <mesh position={[0, legH, 0]} castShadow>
        <cylinderGeometry args={[radiusM * 0.95, radiusM * 0.95, seatThicknessM, 24]} />
        <meshStandardMaterial color={cushionColor} roughness={0.85} />
      </mesh>
      {/* 등받이 */}
      <mesh position={[0, legH + backH * 0.55, -depthM * 0.30]} castShadow>
        <boxGeometry args={[widthM * 0.7, backH, 0.08]} />
        <meshStandardMaterial color={cushionColor} roughness={0.85} />
      </mesh>
      {/* 등받이 프레임 (수직 strut) */}
      {[-1, 1].map((sx) => (
        <mesh
          key={sx}
          position={[sx * widthM * 0.32, legH + backH * 0.5, -depthM * 0.36]}
        >
          <boxGeometry args={[0.022, backH, 0.022]} />
          <meshStandardMaterial color={woodColor} roughness={0.6} />
        </mesh>
      ))}
      {/* 4 splayed legs */}
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <mesh
          key={i}
          position={[sx * widthM * 0.30, legH / 2, sz * depthM * 0.30]}
          rotation={[-sz * 0.08, 0, sx * 0.08]}
          castShadow
        >
          <cylinderGeometry args={[0.018, 0.014, legH, 10]} />
          <meshStandardMaterial color={woodColor} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

/* ─── Fallback box (unknown type) ─────────────────────────────────────────── */

function FallbackBox({ widthM, depthM, heightM }: PartProps) {
  return (
    <mesh position={[0, heightM / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[widthM, heightM, depthM]} />
      <meshStandardMaterial color="#5a5a5a" roughness={0.7} transparent opacity={0.85} />
    </mesh>
  );
}
