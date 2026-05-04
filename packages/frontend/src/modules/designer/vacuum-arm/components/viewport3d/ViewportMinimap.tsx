'use client';

/**
 * ViewportMinimap — 방 평면 미니맵 + 카메라 타겟 인터랙션.
 *
 * 우측 상단 floating SVG 패널:
 *   - 방 외곽 + 가구 / 타겟 / 로봇 (yaw 화살표 포함) 위에서 본 평면도
 *   - 카메라 target은 십자선 (crosshair) 표시 + 노란 원
 *   - 클릭하면 카메라 target이 그 지점으로 이동
 *   - 십자선 드래그로 연속 이동 (캔버스 자체 좌표 기준)
 *   - 로봇 클릭하면 로봇 위치로 카메라 target 리셋 (홈)
 *
 * 좌표:
 *   2D 룸:  (xCm, yCm) — x=가로, y=세로 (위→아래)
 *   3D 월드: (worldX, worldZ) — x=가로, z=세로
 *   원점 변환: worldX = (xCm − halfW) * 0.01,  worldZ = (yCm − halfD) * 0.01
 *
 * 부모(Room3DViewport)는 cameraTargetWorld {x, z} (월드 m)로 받고,
 * onCameraTargetChange(worldX, worldZ)를 호출해 OrbitControls.target을 갱신.
 */

import { useEffect, useRef, useState } from 'react';
import type {
  RoomConfig,
  FurnitureSpec,
  TargetObjectSpec,
} from '../../types/product';

const CM_TO_M = 0.01;

interface ViewportMinimapProps {
  room: RoomConfig;
  furnitureCatalog: FurnitureSpec[];
  targetCatalog: TargetObjectSpec[];
  robotXCm: number | null;
  robotYCm: number | null;
  robotYawDeg: number;
  robotDiameterCm: number;
  /** 카메라가 보고 있는 floor 위치 (월드 m) */
  cameraTargetWorld: { x: number; z: number };
  /** 사용자가 미니맵을 클릭/드래그하면 호출 (월드 m) */
  onCameraTargetChange: (worldX: number, worldZ: number) => void;
}

const MAP_MAX_W = 200;
const MAP_MAX_H = 160;
const PADDING = 8;

export function ViewportMinimap({
  room,
  furnitureCatalog,
  targetCatalog,
  robotXCm,
  robotYCm,
  robotYawDeg,
  robotDiameterCm,
  cameraTargetWorld,
  onCameraTargetChange,
}: ViewportMinimapProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [dragging, setDragging] = useState(false);

  // SVG viewBox: 방 사이즈에 맞춰 aspect ratio 유지
  const aspect = room.widthCm / room.depthCm;
  const containerW = aspect >= MAP_MAX_W / MAP_MAX_H ? MAP_MAX_W : MAP_MAX_H * aspect;
  const containerH = aspect >= MAP_MAX_W / MAP_MAX_H ? MAP_MAX_W / aspect : MAP_MAX_H;

  const halfW = room.widthCm / 2;
  const halfD = room.depthCm / 2;

  // 룸 2D 좌표(cm) → SVG px
  const cmToPx = (xCm: number, yCm: number) => ({
    x: PADDING + (xCm / room.widthCm) * (containerW - PADDING * 2),
    y: PADDING + (yCm / room.depthCm) * (containerH - PADDING * 2),
  });
  // SVG px → 룸 cm
  const pxToCm = (px: number, py: number) => ({
    xCm: ((px - PADDING) / (containerW - PADDING * 2)) * room.widthCm,
    yCm: ((py - PADDING) / (containerH - PADDING * 2)) * room.depthCm,
  });

  // 카메라 target 월드 → 룸 cm → SVG px
  const cameraTargetCm = {
    xCm: Math.max(0, Math.min(room.widthCm, cameraTargetWorld.x / CM_TO_M + halfW)),
    yCm: Math.max(0, Math.min(room.depthCm, cameraTargetWorld.z / CM_TO_M + halfD)),
  };
  const cameraTargetPx = cmToPx(cameraTargetCm.xCm, cameraTargetCm.yCm);

  const robotEffectiveX = robotXCm ?? room.widthCm / 2;
  const robotEffectiveY = robotYCm ?? room.depthCm / 2;
  const robotPx = cmToPx(robotEffectiveX, robotEffectiveY);
  // 로봇 yaw 화살표 — yaw 0 = +y(아래), CCW. SVG 좌표에서는 +y가 아래라 그대로 매핑.
  const yawRad = (robotYawDeg * Math.PI) / 180;
  const arrowLen = 14;
  const arrowEndPx = {
    x: robotPx.x + Math.sin(yawRad) * arrowLen,
    y: robotPx.y + Math.cos(yawRad) * arrowLen,
  };

  // SVG 좌표로 클릭 → 카메라 target 변경
  const handlePointerEvent = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    // px는 렌더링된 SVG 픽셀 좌표 — 우리 SVG의 viewBox와 동일하므로 그대로 cm 환산
    const { xCm, yCm } = pxToCm(px, py);
    const clampedX = Math.max(0, Math.min(room.widthCm, xCm));
    const clampedY = Math.max(0, Math.min(room.depthCm, yCm));
    const wx = (clampedX - halfW) * CM_TO_M;
    const wz = (clampedY - halfD) * CM_TO_M;
    onCameraTargetChange(wx, wz);
  };

  // 글로벌 pointer up 처리 — drag 도중에 SVG 밖으로 나가도 안전하게 종료
  useEffect(() => {
    if (!dragging) return;
    const onUp = () => setDragging(false);
    window.addEventListener('pointerup', onUp);
    return () => window.removeEventListener('pointerup', onUp);
  }, [dragging]);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="absolute top-3 right-3 z-20 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85 bg-black/55 border border-white/20 px-2 py-1 hover:bg-black/75"
        title="미니맵 펼치기"
      >
        ▾ Map
      </button>
    );
  }

  return (
    <div className="absolute top-3 right-3 z-20 bg-black/55 backdrop-blur-sm border border-white/20 p-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/70">
          MAP · {room.widthCm}×{room.depthCm}
        </span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/55 hover:text-white px-1"
          title="접기"
        >
          ▴
        </button>
      </div>

      <svg
        ref={svgRef}
        width={containerW}
        height={containerH}
        viewBox={`0 0 ${containerW} ${containerH}`}
        style={{ display: 'block', cursor: dragging ? 'grabbing' : 'crosshair' }}
        onPointerDown={(e) => {
          e.preventDefault();
          (e.target as Element).setPointerCapture(e.pointerId);
          setDragging(true);
          handlePointerEvent(e);
        }}
        onPointerMove={(e) => {
          if (!dragging) return;
          handlePointerEvent(e);
        }}
        onPointerUp={(e) => {
          try {
            (e.target as Element).releasePointerCapture(e.pointerId);
          } catch {
            // ignore
          }
          setDragging(false);
        }}
      >
        {/* 방 배경 */}
        <rect
          x={PADDING}
          y={PADDING}
          width={containerW - PADDING * 2}
          height={containerH - PADDING * 2}
          fill="rgba(255,255,255,0.06)"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth={1}
        />

        {/* 가구 */}
        {room.furniture.map((p, i) => {
          const spec = furnitureCatalog.find((f) => f.id === p.furnitureId);
          if (!spec) return null;
          const center = cmToPx(p.xCm, p.yCm);
          const w = (spec.widthCm / room.widthCm) * (containerW - PADDING * 2);
          const h = (spec.depthCm / room.depthCm) * (containerH - PADDING * 2);
          return (
            <rect
              key={`f-${i}`}
              x={center.x - w / 2}
              y={center.y - h / 2}
              width={w}
              height={h}
              fill="rgba(160,140,90,0.45)"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth={0.5}
              transform={`rotate(${p.rotationDeg} ${center.x} ${center.y})`}
              pointerEvents="none"
            />
          );
        })}

        {/* 장애물 */}
        {room.obstacles.map((p, i) => {
          const center = cmToPx(p.xCm, p.yCm);
          return (
            <circle
              key={`o-${i}`}
              cx={center.x}
              cy={center.y}
              r={2.5}
              fill="rgba(214,63,111,0.6)"
              pointerEvents="none"
            />
          );
        })}

        {/* 타겟 */}
        {room.targets.map((t, i) => {
          const spec = targetCatalog.find((c) => c.id === t.targetObjectId);
          const center = cmToPx(t.xCm, t.yCm);
          const isElevated = t.zCm > 5;
          return (
            <g key={`t-${i}`} pointerEvents="none">
              <circle
                cx={center.x}
                cy={center.y}
                r={3}
                fill={isElevated ? '#9bd6e0' : '#3acc6f'}
                stroke="white"
                strokeWidth={0.5}
              />
              {spec ? (
                <title>
                  {spec.name} {t.zCm > 0 ? `· z${t.zCm}cm` : ''}
                </title>
              ) : null}
            </g>
          );
        })}

        {/* 로봇 — 원 + yaw 화살표 (gold) */}
        <g pointerEvents="none">
          <circle
            cx={robotPx.x}
            cy={robotPx.y}
            r={(robotDiameterCm / 2 / room.widthCm) * (containerW - PADDING * 2)}
            fill="rgba(212,162,47,0.35)"
            stroke="#D4A22F"
            strokeWidth={1.2}
          />
          <line
            x1={robotPx.x}
            y1={robotPx.y}
            x2={arrowEndPx.x}
            y2={arrowEndPx.y}
            stroke="#D4A22F"
            strokeWidth={1.5}
          />
          {/* 화살표 head */}
          <polygon
            points={`${arrowEndPx.x},${arrowEndPx.y} ${arrowEndPx.x - 3 * Math.sin(yawRad - 0.5)},${
              arrowEndPx.y - 3 * Math.cos(yawRad - 0.5)
            } ${arrowEndPx.x - 3 * Math.sin(yawRad + 0.5)},${
              arrowEndPx.y - 3 * Math.cos(yawRad + 0.5)
            }`}
            fill="#D4A22F"
          />
        </g>

        {/* 카메라 target 십자선 — 위에 그려서 항상 보임 */}
        <g pointerEvents="none">
          <circle
            cx={cameraTargetPx.x}
            cy={cameraTargetPx.y}
            r={7}
            fill="rgba(255, 216, 107, 0.15)"
            stroke="#FFD86B"
            strokeWidth={1.2}
          />
          <line
            x1={cameraTargetPx.x - 5}
            y1={cameraTargetPx.y}
            x2={cameraTargetPx.x + 5}
            y2={cameraTargetPx.y}
            stroke="#FFD86B"
            strokeWidth={1}
          />
          <line
            x1={cameraTargetPx.x}
            y1={cameraTargetPx.y - 5}
            x2={cameraTargetPx.x}
            y2={cameraTargetPx.y + 5}
            stroke="#FFD86B"
            strokeWidth={1}
          />
        </g>
      </svg>

      <div className="flex items-center justify-between mt-1.5">
        <span className="font-mono text-[9px] tabular-nums text-white/55">
          ({cameraTargetCm.xCm.toFixed(0)}, {cameraTargetCm.yCm.toFixed(0)})cm
        </span>
        <button
          type="button"
          onClick={() => {
            // 로봇 위치로 카메라 target 리셋 (홈)
            const wx = (robotEffectiveX - halfW) * CM_TO_M;
            const wz = (robotEffectiveY - halfD) * CM_TO_M;
            onCameraTargetChange(wx, wz);
          }}
          className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/65 hover:text-white border border-white/20 px-1.5 py-0.5"
          title="로봇 위치로 카메라 리셋"
        >
          ⌖ Home
        </button>
      </div>
    </div>
  );
}
