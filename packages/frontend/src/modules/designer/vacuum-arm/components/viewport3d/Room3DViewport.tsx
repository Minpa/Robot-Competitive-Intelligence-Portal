'use client';

/**
 * Room3DViewport · Phase A — 3D 공간에서 로봇 + 환경 정적 배치 확인
 *
 * 룸 에디터(2D)의 가구/장애물/타겟을 그대로 3D로 lift해서, 워크스페이스 메시
 * 와 가구 높이의 충돌이 시각적으로 보이도록 한다. 로봇은 룸 중앙(2D 룸 에디터
 * 와 동일)에 배치, 모든 좌표는 cm → m (× 0.01).
 *
 * 좌표 변환:
 *   2D Konva  →  3D Three.js
 *   xCm       →  (xCm - widthCm/2)  * 0.01   (worldX)
 *   yCm       →  (yCm - depthCm/2)  * 0.01   (worldZ)   ← 화면 아래 = +Z
 *   surfaceHeightCm / zCm           * 0.01   (worldY, 위)
 */

import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Html } from '@react-three/drei';
import { useQuery } from '@tanstack/react-query';
import { WorkspaceMesh } from './WorkspaceMesh';
import { ZMPOverlay } from './ZMPOverlay';
import { KinematicRobot } from './RobotViewport';
import { designerVacuumApi } from '../../api/designer-vacuum-api';
import { useDesignerVacuumStore } from '../../stores/designer-vacuum-store';
import type {
  ManipulatorArmSpec,
  VacuumBaseSpec,
  EndEffectorSpec,
  StabilityResult,
  FurnitureSpec,
  ObstacleSpec,
  TargetObjectSpec,
  FurnitureType,
  ObstacleType,
} from '../../types/product';

interface Room3DViewportProps {
  base: VacuumBaseSpec;
  arms: ManipulatorArmSpec[];
  endEffectors?: EndEffectorSpec[];
  stability?: StabilityResult | null;
  autoRotate?: boolean;
  showLabels?: boolean;
  showWorkspaceMesh?: boolean;
  showZmp?: boolean;
}

const CM_TO_M = 0.01;
const DEG_TO_RAD = Math.PI / 180;

const FURNITURE_COLOR: Record<FurnitureType, string> = {
  sofa: '#3a8dde',
  dining_table: '#a07238',
  sink_counter: '#7a7a7a',
  desk: '#a07238',
  chair: '#5a5a5a',
};

const OBSTACLE_COLOR: Record<ObstacleType, string> = {
  rug: '#7a4a2a',
  threshold: '#8a8a8a',
  cable: '#3a3a3a',
  toy: '#E63950',
};

// 2D 에디터의 obstacle "depth" 기본값 (cable / threshold 같은 1차원 항목)
const OBSTACLE_DEFAULT_DEPTH_CM = 30;

export function Room3DViewport({
  base,
  arms,
  endEffectors = [],
  stability = null,
  autoRotate = false,
  showLabels = false,
  showWorkspaceMesh = true,
  showZmp = true,
}: Room3DViewportProps) {
  const room = useDesignerVacuumStore((s) => s.room);

  // 카탈로그 fetch (RoomCanvas와 동일 패턴, queryKey 공유로 캐시 재사용)
  const furnitureQ = useQuery({
    queryKey: ['vacuum-arm', 'furniture'],
    queryFn: () => designerVacuumApi.listFurniture(),
    staleTime: 5 * 60_000,
  });
  const obstaclesQ = useQuery({
    queryKey: ['vacuum-arm', 'obstacles'],
    queryFn: () => designerVacuumApi.listObstacles(),
    staleTime: 5 * 60_000,
  });
  const targetsQ = useQuery({
    queryKey: ['vacuum-arm', 'target-objects'],
    queryFn: () => designerVacuumApi.listTargetObjects(),
    staleTime: 5 * 60_000,
  });

  const furnitureCatalog = furnitureQ.data?.furniture ?? [];
  const obstacleCatalog = obstaclesQ.data?.obstacles ?? [];
  const targetCatalog = targetsQ.data?.targetObjects ?? [];

  const findFurniture = (id: number) => furnitureCatalog.find((f) => f.id === id);
  const findObstacle = (id: number) => obstacleCatalog.find((o) => o.id === id);
  const findTarget = (id: number) => targetCatalog.find((t) => t.id === id);

  // 룸 중앙이 월드 원점(로봇이 여기 위치). 2D 좌표(xCm,yCm) → 3D (worldX, worldZ)
  const roomWidthM = room.widthCm * CM_TO_M;
  const roomDepthM = room.depthCm * CM_TO_M;
  const halfWCm = room.widthCm / 2;
  const halfDCm = room.depthCm / 2;

  // 카메라 — 룸 전체가 한 화면에 들어오도록
  const totalHeightM = useMemo(() => {
    const lift = base.hasLiftColumn ? base.liftColumnMaxExtensionCm * CM_TO_M : 0;
    const baseM = base.heightCm * CM_TO_M;
    const armEnvelope = arms.reduce((max, a) => {
      const shoulder = a.shoulderHeightAboveBaseCm * CM_TO_M;
      const reach = (a.upperArmLengthCm + a.forearmLengthCm) * CM_TO_M;
      return Math.max(max, baseM + lift + shoulder + reach * 0.3);
    }, baseM + lift);
    return armEnvelope;
  }, [base, arms]);

  const camRadius = Math.max(roomWidthM, roomDepthM) * 0.95;
  const camHeight = Math.max(roomWidthM, roomDepthM) * 0.55;
  const target = [0, totalHeightM / 2, 0] as [number, number, number];

  return (
    <Canvas
      shadows
      camera={{ position: [camRadius, camHeight, camRadius], fov: 42 }}
      style={{ background: '#1f242c' }}
    >
      {/* Studio 라이팅 (RobotViewport와 동일 톤) */}
      <hemisphereLight args={['#dfe6f0', '#2a2f38', 0.55]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[roomWidthM * 0.6, Math.max(4, roomDepthM * 0.7), roomDepthM * 0.4]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-roomWidthM}
        shadow-camera-right={roomWidthM}
        shadow-camera-top={roomDepthM}
        shadow-camera-bottom={-roomDepthM}
      />
      <directionalLight
        position={[-roomWidthM * 0.5, 3, -roomDepthM * 0.4]}
        intensity={0.45}
        color="#a8c0e8"
      />
      <directionalLight position={[0, 2, -roomDepthM * 0.6]} intensity={0.30} color="#ffb088" />

      <Suspense fallback={null}>
        {/* 룸 바닥 */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[roomWidthM, roomDepthM]} />
          <meshStandardMaterial color="#252b34" roughness={0.85} metalness={0.05} />
        </mesh>

        {/* 룸 경계선 */}
        <RoomBoundary widthM={roomWidthM} depthM={roomDepthM} />

        {/* 가구 */}
        {room.furniture.map((p, i) => {
          const spec = findFurniture(p.furnitureId);
          if (!spec) return null;
          return (
            <Furniture3D
              key={`f-${i}-${p.furnitureId}`}
              placement={p}
              spec={spec}
              halfWCm={halfWCm}
              halfDCm={halfDCm}
              showLabel={showLabels}
            />
          );
        })}

        {/* 장애물 */}
        {room.obstacles.map((p, i) => {
          const spec = findObstacle(p.obstacleId);
          if (!spec) return null;
          return (
            <Obstacle3D
              key={`o-${i}-${p.obstacleId}`}
              placement={p}
              spec={spec}
              halfWCm={halfWCm}
              halfDCm={halfDCm}
              showLabel={showLabels}
            />
          );
        })}

        {/* 타겟 */}
        {room.targets.map((t, i) => {
          const spec = findTarget(t.targetObjectId);
          if (!spec) return null;
          return (
            <Target3D
              key={`t-${i}-${t.targetObjectId}-${i}`}
              target={t}
              spec={spec}
              halfWCm={halfWCm}
              halfDCm={halfDCm}
              showLabel={showLabels}
            />
          );
        })}

        {/* 로봇 (룸 중앙) — 새 kinematic tree 기반 렌더 */}
        <KinematicRobot base={base} arms={arms} endEffectors={endEffectors} />

        {arms.length > 0 ? (
          <WorkspaceMesh arms={arms} base={base} visible={showWorkspaceMesh} />
        ) : null}
        {arms.length > 0 && stability ? (
          <ZMPOverlay stability={stability} visible={showZmp} />
        ) : null}

        <Environment preset="warehouse" />
      </Suspense>

      {/* 그리드 (방 바닥보다 약간 위) */}
      <Grid
        args={[Math.max(roomWidthM, roomDepthM) * 1.5, Math.max(roomWidthM, roomDepthM) * 1.5]}
        cellColor="#3d4452"
        sectionColor="#7a6238"
        cellSize={0.5}
        sectionSize={1.0}
        fadeDistance={Math.max(roomWidthM, roomDepthM) * 1.2}
        fadeStrength={1}
        position={[0, 0.002, 0]}
      />

      <OrbitControls
        autoRotate={autoRotate}
        autoRotateSpeed={0.6}
        enablePan
        enableZoom
        enableRotate
        target={target}
        minDistance={0.8}
        maxDistance={Math.max(roomWidthM, roomDepthM) * 2}
      />
    </Canvas>
  );
}

/* ─── 룸 경계선 (4-wall outline, low height) ──────────────────────────────── */

function RoomBoundary({ widthM, depthM }: { widthM: number; depthM: number }) {
  const wallH = 0.04;
  const wallT = 0.01;
  return (
    <group>
      {/* North */}
      <mesh position={[0, wallH / 2, -depthM / 2]}>
        <boxGeometry args={[widthM, wallH, wallT]} />
        <meshBasicMaterial color="#E63950" transparent opacity={0.65} />
      </mesh>
      {/* South */}
      <mesh position={[0, wallH / 2, depthM / 2]}>
        <boxGeometry args={[widthM, wallH, wallT]} />
        <meshBasicMaterial color="#E63950" transparent opacity={0.45} />
      </mesh>
      {/* West */}
      <mesh position={[-widthM / 2, wallH / 2, 0]}>
        <boxGeometry args={[wallT, wallH, depthM]} />
        <meshBasicMaterial color="#E63950" transparent opacity={0.45} />
      </mesh>
      {/* East */}
      <mesh position={[widthM / 2, wallH / 2, 0]}>
        <boxGeometry args={[wallT, wallH, depthM]} />
        <meshBasicMaterial color="#E63950" transparent opacity={0.45} />
      </mesh>
    </group>
  );
}

/* ─── Furniture 3D ─────────────────────────────────────────────────────────
 * 가구는 surfaceHeightCm 만큼 솟은 박스로 표현. 윗면이 정확히 surfaceHeightCm
 * 에 위치 → 워크스페이스 메시와 충돌 여부를 직관적으로 판단 가능.
 * ─────────────────────────────────────────────────────────────────────────── */

function Furniture3D({
  placement,
  spec,
  halfWCm,
  halfDCm,
  showLabel,
}: {
  placement: { xCm: number; yCm: number; rotationDeg: number };
  spec: FurnitureSpec;
  halfWCm: number;
  halfDCm: number;
  showLabel: boolean;
}) {
  const x = (placement.xCm - halfWCm) * CM_TO_M;
  const z = (placement.yCm - halfDCm) * CM_TO_M;
  const w = spec.widthCm * CM_TO_M;
  const d = spec.depthCm * CM_TO_M;
  const h = spec.surfaceHeightCm * CM_TO_M;
  const rotY = -placement.rotationDeg * DEG_TO_RAD; // 2D rotationDeg 시계방향 → 3D Y축 반시계

  const color = FURNITURE_COLOR[spec.type] ?? '#5a5a5a';

  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      {/* 본체 박스 */}
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.05} transparent opacity={0.85} />
      </mesh>
      {/* 윗면 가장자리 — surface 높이를 강조 */}
      <mesh position={[0, h + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.18} />
      </mesh>
      {showLabel ? (
        <Html
          position={[0, h + 0.08, 0]}
          center
          distanceFactor={8}
          occlude={false}
          style={{
            color: '#ffffff',
            fontSize: '11px',
            fontFamily: 'monospace',
            background: 'rgba(0,0,0,0.55)',
            padding: '2px 6px',
            borderRadius: 2,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {spec.name} · h{spec.surfaceHeightCm}
        </Html>
      ) : null}
    </group>
  );
}

/* ─── Obstacle 3D ─────────────────────────────────────────────────────────── */

function Obstacle3D({
  placement,
  spec,
  halfWCm,
  halfDCm,
  showLabel,
}: {
  placement: { xCm: number; yCm: number; rotationDeg: number };
  spec: ObstacleSpec;
  halfWCm: number;
  halfDCm: number;
  showLabel: boolean;
}) {
  const x = (placement.xCm - halfWCm) * CM_TO_M;
  const z = (placement.yCm - halfDCm) * CM_TO_M;

  // 2D 에디터와 동일 규약: rug/toy는 정사각, 그 외(threshold/cable)는 width × 30cm
  const wCm = spec.widthCm;
  const dCm = spec.type === 'rug' || spec.type === 'toy' ? spec.widthCm : OBSTACLE_DEFAULT_DEPTH_CM;
  const w = wCm * CM_TO_M;
  const d = dCm * CM_TO_M;
  const h = Math.max(spec.heightCm, 0.3) * CM_TO_M; // 너무 얇아서 안 보이는 경우 최소 0.3cm

  const rotY = -placement.rotationDeg * DEG_TO_RAD;
  const color = OBSTACLE_COLOR[spec.type] ?? '#5a5a5a';

  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.1} transparent opacity={0.75} />
      </mesh>
      {showLabel ? (
        <Html
          position={[0, h + 0.06, 0]}
          center
          distanceFactor={8}
          occlude={false}
          style={{
            color: '#ffd0d0',
            fontSize: '10px',
            fontFamily: 'monospace',
            background: 'rgba(0,0,0,0.55)',
            padding: '2px 6px',
            borderRadius: 2,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {spec.name} · h{spec.heightCm.toFixed(1)}
        </Html>
      ) : null}
    </group>
  );
}

/* ─── Target 3D — 타겟은 3D 위치(zCm)에 작은 발광 구체 ────────────────────── */

function Target3D({
  target,
  spec,
  halfWCm,
  halfDCm,
  showLabel,
}: {
  target: { xCm: number; yCm: number; zCm: number; targetObjectId: number };
  spec: TargetObjectSpec;
  halfWCm: number;
  halfDCm: number;
  showLabel: boolean;
}) {
  const x = (target.xCm - halfWCm) * CM_TO_M;
  const z = (target.yCm - halfDCm) * CM_TO_M;
  const y = Math.max(target.zCm, 0.5) * CM_TO_M; // 바닥 아래로 박히지 않게

  return (
    <group position={[x, y, z]}>
      {/* 발광 구체 */}
      <mesh castShadow>
        <sphereGeometry args={[0.03, 16, 12]} />
        <meshStandardMaterial color="#3acc6f" emissive="#3acc6f" emissiveIntensity={0.6} />
      </mesh>
      {/* 바닥에서 타겟까지 수직 가이드 라인 (z >= 5cm일 때) */}
      {target.zCm >= 5 ? (
        <mesh position={[0, -y / 2, 0]}>
          <cylinderGeometry args={[0.002, 0.002, y, 6]} />
          <meshBasicMaterial color="#3acc6f" transparent opacity={0.45} />
        </mesh>
      ) : null}
      {showLabel || target.zCm > 0 ? (
        <Html
          position={[0, 0.06, 0]}
          center
          distanceFactor={8}
          occlude={false}
          style={{
            color: '#caffd6',
            fontSize: '10px',
            fontFamily: 'monospace',
            background: 'rgba(0,0,0,0.55)',
            padding: '2px 6px',
            borderRadius: 2,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {spec.name}
          {target.zCm > 0 ? ` · z${target.zCm}` : ''}
        </Html>
      ) : null}
    </group>
  );
}
