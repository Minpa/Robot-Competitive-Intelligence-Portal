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

import { Suspense, useMemo, useState, type ReactNode } from 'react';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Html } from '@react-three/drei';
import { useQuery } from '@tanstack/react-query';
import { WorkspaceMesh } from './WorkspaceMesh';
import { ZMPOverlay } from './ZMPOverlay';
import { KinematicRobot } from './RobotViewport';
import { FurnitureVisual } from '../../kinematics/furniture-visuals';
import {
  PhysicsScene,
  PhysicsFloor,
  PhysicsWalls,
  PhysicalDraggableObject,
  KinematicRobotBody,
  GrabbableTarget,
  GrabController,
} from '../../kinematics/physics-bodies';
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
const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));

// 가구 색상은 furniture-visuals.tsx의 각 컴포넌트가 자체 정의 (sofa = blue,
// table = wood 등). 더이상 외부에서 mapping 안 함.

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
  const loadRoomPreset = useDesignerVacuumStore((s) => s.loadRoomPreset);
  const updateFurniture = useDesignerVacuumStore((s) => s.updateFurniture);
  const updateObstacle = useDesignerVacuumStore((s) => s.updateObstacle);
  const updateTarget = useDesignerVacuumStore((s) => s.updateTarget);
  const robotXCm = useDesignerVacuumStore((s) => s.robotXCm);
  const robotYCm = useDesignerVacuumStore((s) => s.robotYCm);
  const robotYawDeg = useDesignerVacuumStore((s) => s.robotYawDeg);
  const setRobotPosition = useDesignerVacuumStore((s) => s.setRobotPosition);

  // 드래그 진행 중이면 OrbitControls 비활성화 (카메라 패닝과 충돌 방지)
  const [isDragging, setDragging] = useState(false);

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
  const presetsQ = useQuery({
    queryKey: ['vacuum-arm', 'room-presets'],
    queryFn: () => designerVacuumApi.listRoomPresets(),
    staleTime: 5 * 60_000,
  });

  const furnitureCatalog = furnitureQ.data?.furniture ?? [];
  const obstacleCatalog = obstaclesQ.data?.obstacles ?? [];
  const targetCatalog = targetsQ.data?.targetObjects ?? [];
  const roomPresets = presetsQ.data?.roomPresets ?? [];

  // 빈 방 검사 — 가구/장애물/타겟 모두 없으면 hint 표시
  const isEmpty =
    room.furniture.length === 0 &&
    room.obstacles.length === 0 &&
    room.targets.length === 0;

  const findFurniture = (id: number) => furnitureCatalog.find((f) => f.id === id);
  const findObstacle = (id: number) => obstacleCatalog.find((o) => o.id === id);
  const findTarget = (id: number) => targetCatalog.find((t) => t.id === id);

  // 룸 중앙이 월드 원점. 2D 좌표(xCm,yCm) → 3D (worldX, worldZ)
  const roomWidthM = room.widthCm * CM_TO_M;
  const roomDepthM = room.depthCm * CM_TO_M;
  const halfWCm = room.widthCm / 2;
  const halfDCm = room.depthCm / 2;

  // 로봇 위치: store 값 또는 방 중앙 (default). 월드 좌표로 변환.
  const robotXEffectiveCm = robotXCm ?? halfWCm;
  const robotYEffectiveCm = robotYCm ?? halfDCm;
  const robotWorldX = (robotXEffectiveCm - halfWCm) * CM_TO_M;
  const robotWorldZ = (robotYEffectiveCm - halfDCm) * CM_TO_M;

  // 좌표 변환 헬퍼: 월드 (X, Z) → 방 (xCm, yCm), 방 경계 안으로 clamp.
  const worldToRoomCm = (wx: number, wz: number): { xCm: number; yCm: number } => ({
    xCm: clamp(wx / CM_TO_M + halfWCm, 0, room.widthCm),
    yCm: clamp(wz / CM_TO_M + halfDCm, 0, room.depthCm),
  });

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
    <div className="relative w-full h-full">
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
        <PhysicsScene>
          {/* Grasp 자동 컨트롤러 — 매 프레임 closest target in range 검사 */}
          <GrabController halfWCm={halfWCm} halfDCm={halfDCm} />

          {/* 룸 바닥 — visual mesh + physics floor (둘 다 필요) */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0, 0]}
            receiveShadow
          >
            <planeGeometry args={[roomWidthM, roomDepthM]} />
            <meshStandardMaterial color="#252b34" roughness={0.85} metalness={0.05} />
          </mesh>
          <PhysicsFloor widthM={roomWidthM} depthM={roomDepthM} />

          {/* 방 경계 — visual outline + physics walls */}
          <RoomBoundary widthM={roomWidthM} depthM={roomDepthM} />
          <PhysicsWalls widthM={roomWidthM} depthM={roomDepthM} />

          {/* 가구 — physics dynamic body (로봇이 밀어냄) + 드래그로 배치 */}
          {room.furniture.map((p, i) => {
            const spec = findFurniture(p.furnitureId);
            if (!spec) return null;
            const wx = (p.xCm - halfWCm) * CM_TO_M;
            const wz = (p.yCm - halfDCm) * CM_TO_M;
            const w = spec.widthCm * CM_TO_M;
            const d = spec.depthCm * CM_TO_M;
            const h = spec.surfaceHeightCm * CM_TO_M;
            return (
              <PhysicalDraggableObject
                key={`f-${i}-${p.furnitureId}`}
                initialX={wx}
                initialZ={wz}
                rotationY={-p.rotationDeg * DEG_TO_RAD}
                sizeM={[w, h, d]}
                massKg={spec.weightKg}
                onDragStart={() => setDragging(true)}
                onDragEnd={() => setDragging(false)}
                onPositionChange={(nx, nz) => {
                  const r = worldToRoomCm(nx, nz);
                  updateFurniture(i, { xCm: r.xCm, yCm: r.yCm });
                }}
              >
                <Furniture3D
                  placement={p}
                  spec={spec}
                  halfWCm={halfWCm}
                  halfDCm={halfDCm}
                  showLabel={showLabels}
                />
              </PhysicalDraggableObject>
            );
          })}

          {/* 장애물 — physics dynamic body */}
          {room.obstacles.map((p, i) => {
            const spec = findObstacle(p.obstacleId);
            if (!spec) return null;
            const wx = (p.xCm - halfWCm) * CM_TO_M;
            const wz = (p.yCm - halfDCm) * CM_TO_M;
            const wCm = spec.widthCm;
            const dCm = spec.type === 'rug' || spec.type === 'toy' ? spec.widthCm : 30;
            const w = wCm * CM_TO_M;
            const d = dCm * CM_TO_M;
            const h = Math.max(spec.heightCm, 0.3) * CM_TO_M;
            return (
              <PhysicalDraggableObject
                key={`o-${i}-${p.obstacleId}`}
                initialX={wx}
                initialZ={wz}
                rotationY={-p.rotationDeg * DEG_TO_RAD}
                sizeM={[w, h, d]}
                massKg={spec.type === 'threshold' ? 50 : 2}
                onDragStart={() => setDragging(true)}
                onDragEnd={() => setDragging(false)}
                onPositionChange={(nx, nz) => {
                  const r = worldToRoomCm(nx, nz);
                  updateObstacle(i, { xCm: r.xCm, yCm: r.yCm });
                }}
              >
                <Obstacle3D
                  placement={p}
                  spec={spec}
                  halfWCm={halfWCm}
                  halfDCm={halfDCm}
                  showLabel={showLabels}
                />
              </PhysicalDraggableObject>
            );
          })}

          {/* 타겟 — GrabbableTarget: 잡혀있을 땐 손목 따라가고, 자유면 dynamic */}
          {room.targets.map((t, i) => {
            const spec = findTarget(t.targetObjectId);
            if (!spec) return null;
            const wx = (t.xCm - halfWCm) * CM_TO_M;
            const wz = (t.yCm - halfDCm) * CM_TO_M;
            const tSize = 0.06;
            return (
              <GrabbableTarget
                key={`t-${i}-${t.targetObjectId}-${i}`}
                targetIndex={i}
                initialX={wx}
                initialZ={wz}
                rotationY={0}
                sizeM={[tSize, tSize, tSize]}
                massKg={Math.max(0.05, spec.weightKg)}
                halfWCm={halfWCm}
                halfDCm={halfDCm}
                onDragStart={() => setDragging(true)}
                onDragEnd={() => setDragging(false)}
                onPositionChange={(nx, nz) => {
                  const r = worldToRoomCm(nx, nz);
                  updateTarget(i, { xCm: r.xCm, yCm: r.yCm });
                }}
              >
                <Target3D
                  target={t}
                  spec={spec}
                  halfWCm={halfWCm}
                  halfDCm={halfDCm}
                  showLabel={showLabels}
                />
              </GrabbableTarget>
            );
          })}

          {/* 로봇 — kinematic body, store position+yaw 추종 + 드래그 가능. 가구를 자동 push */}
          <KinematicRobotBody
            targetX={robotWorldX}
            targetZ={robotWorldZ}
            targetYawRad={(robotYawDeg * Math.PI) / 180}
            diameterM={base.diameterOrWidthCm * CM_TO_M}
            heightM={base.heightCm * CM_TO_M}
            onDragStart={() => setDragging(true)}
            onDragEnd={() => setDragging(false)}
            onDragMove={(nx, nz) => {
              const r = worldToRoomCm(nx, nz);
              setRobotPosition(r.xCm, r.yCm);
            }}
          >
            <KinematicRobot base={base} arms={arms} endEffectors={endEffectors} />
          </KinematicRobotBody>
        </PhysicsScene>

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
        enabled={!isDragging}
        enablePan
        enableZoom
        enableRotate
        target={target}
        minDistance={0.8}
        maxDistance={Math.max(roomWidthM, roomDepthM) * 2}
      />
      </Canvas>

      {/* 빈 방 hint — 방 에디터로 안내 + 원클릭 프리셋 로드 */}
      {isEmpty ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="pointer-events-auto bg-black/75 border border-gold/40 px-6 py-5 max-w-md backdrop-blur">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold mb-2">
              빈 방 — 가구를 추가하세요
            </div>
            <p className="text-[12px] text-white/75 leading-relaxed mb-4">
              가구·장애물·타겟이 아직 없어서 로봇만 보입니다. 좌상단에서{' '}
              <span className="text-gold">방 에디터 (2D)</span>로 전환해서 직접 배치하거나, 아래
              프리셋을 로드해서 시작하세요.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {roomPresets.length === 0 ? (
                <span className="text-[10px] text-white/45 font-mono">프리셋 로딩 중…</span>
              ) : (
                roomPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => loadRoomPreset(preset)}
                    className="border border-white/20 bg-[#1a1a1a] hover:border-gold hover:text-gold transition-colors px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/80"
                    title={preset.description}
                  >
                    {preset.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
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
  // halfWCm/halfDCm는 더 이상 내부 position에 사용 안 함 — DraggableOnFloor가 처리.
  // 시그니처 호환성을 위해 prop은 유지하되 unused로 둠.
  showLabel,
}: {
  placement: { xCm: number; yCm: number; rotationDeg: number };
  spec: FurnitureSpec;
  halfWCm: number;
  halfDCm: number;
  showLabel: boolean;
}) {
  const w = spec.widthCm * CM_TO_M;
  const d = spec.depthCm * CM_TO_M;
  const h = spec.surfaceHeightCm * CM_TO_M;
  const rotY = -placement.rotationDeg * DEG_TO_RAD; // 2D rotationDeg 시계방향 → 3D Y축 반시계

  return (
    <group rotation={[0, rotY, 0]}>
      {/* 가구 type별 사실적인 형상 (sofa/table/desk/sink/chair) */}
      <FurnitureVisual type={spec.type} widthM={w} depthM={d} heightM={h} />
      {showLabel ? (
        <Html
          position={[0, h + 0.10, 0]}
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
  showLabel,
}: {
  placement: { xCm: number; yCm: number; rotationDeg: number };
  spec: ObstacleSpec;
  halfWCm: number;
  halfDCm: number;
  showLabel: boolean;
}) {
  // 2D 에디터와 동일 규약: rug/toy는 정사각, 그 외(threshold/cable)는 width × 30cm
  const wCm = spec.widthCm;
  const dCm = spec.type === 'rug' || spec.type === 'toy' ? spec.widthCm : OBSTACLE_DEFAULT_DEPTH_CM;
  const w = wCm * CM_TO_M;
  const d = dCm * CM_TO_M;
  const h = Math.max(spec.heightCm, 0.3) * CM_TO_M;

  const rotY = -placement.rotationDeg * DEG_TO_RAD;
  const color = OBSTACLE_COLOR[spec.type] ?? '#5a5a5a';

  return (
    <group rotation={[0, rotY, 0]}>
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
  showLabel,
}: {
  target: { xCm: number; yCm: number; zCm: number; targetObjectId: number };
  spec: TargetObjectSpec;
  halfWCm: number;
  halfDCm: number;
  showLabel: boolean;
}) {
  const y = Math.max(target.zCm, 0.5) * CM_TO_M; // 바닥 아래로 박히지 않게

  return (
    <group position={[0, y, 0]}>
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

/* ─── DraggableOnFloor ─────────────────────────────────────────────────────
 * 자식을 (x, 0, z) 위치의 그룹에 배치하고, pointer drag로 X-Z 평면 위에서 이동.
 * pointer capture로 빠른 드래그도 안정적. onDragStart/End는 OrbitControls 토글용.
 * onMove(worldX, worldZ): 새 월드 좌표 (Y는 0 고정).
 * ─────────────────────────────────────────────────────────────────────────── */

interface DraggableOnFloorProps {
  x: number;
  z: number;
  onMove: (worldX: number, worldZ: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  children: ReactNode;
}

function DraggableOnFloor({ x, z, onMove, onDragStart, onDragEnd, children }: DraggableOnFloorProps) {
  const [dragging, setDraggingLocal] = useState(false);
  const [hovered, setHovered] = useState(false);

  const projectRayToFloor = (e: ThreeEvent<PointerEvent>): { x: number; z: number } | null => {
    // floor plane y = 0. ray intersection: t = -origin.y / direction.y
    const dir = e.ray.direction;
    if (Math.abs(dir.y) < 1e-6) return null;
    const t = -e.ray.origin.y / dir.y;
    if (t <= 0) return null;
    return {
      x: e.ray.origin.x + dir.x * t,
      z: e.ray.origin.z + dir.z * t,
    };
  };

  return (
    <group
      position={[x, 0, z]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'grab';
      }}
      onPointerOut={() => {
        setHovered(false);
        if (!dragging) document.body.style.cursor = 'auto';
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        (e.target as Element).setPointerCapture(e.pointerId);
        setDraggingLocal(true);
        onDragStart?.();
        document.body.style.cursor = 'grabbing';
      }}
      onPointerUp={(e) => {
        if (!dragging) return;
        try {
          (e.target as Element).releasePointerCapture(e.pointerId);
        } catch {
          // already released
        }
        setDraggingLocal(false);
        onDragEnd?.();
        document.body.style.cursor = hovered ? 'grab' : 'auto';
      }}
      onPointerMove={(e) => {
        if (!dragging) return;
        const hit = projectRayToFloor(e);
        if (hit) onMove(hit.x, hit.z);
      }}
    >
      {/* Hover/drag 시각 단서 — 바닥에 작은 ring */}
      {(hovered || dragging) ? (
        <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.10, 0.13, 24]} />
          <meshBasicMaterial color={dragging ? '#ffd86b' : '#a8a8a8'} transparent opacity={0.7} />
        </mesh>
      ) : null}
      {children}
    </group>
  );
}
