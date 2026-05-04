'use client';

/**
 * RoomCanvas · REQ-6
 *
 * 2D top-down room editor (HTML5 Canvas via React Konva).
 *
 * - 방 사이즈 입력 (top toolbar)
 * - 5종 가구 팔레트 → 드래그 배치
 * - 4종 장애물 팔레트 → 드래그 배치
 * - 8종 타겟 → 클릭 추가 후 위치 편집
 * - 클릭 → 선택, drag → 이동, 회전 슬라이더
 * - 방 프리셋 3종 / 시나리오 5종 로드
 *
 * Coordinate system: room (0,0) = top-left corner. xCm grows rightward,
 * yCm grows downward (matches mock-data + screen layout).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Rect, Line, Circle, Group, Text, Arrow } from 'react-konva';
import type Konva from 'konva';
import { useQuery } from '@tanstack/react-query';
import { Trash2, RotateCw } from 'lucide-react';
import { useDesignerVacuumStore } from '../../stores/designer-vacuum-store';
import { designerVacuumApi } from '../../api/designer-vacuum-api';
import type {
  FurnitureSpec,
  ObstacleSpec,
  TargetObjectSpec,
  RoomPresetSpec,
  ScenarioSpec,
  FurnitureType,
  ObstacleType,
} from '../../types/product';

const FURNITURE_FILL: Record<FurnitureType, string> = {
  sofa: '#3a8dde',
  dining_table: '#a07238',
  sink_counter: '#7a7a7a',
  desk: '#a07238',
  chair: '#5a5a5a',
};

const OBSTACLE_FILL: Record<ObstacleType, string> = {
  rug: '#7a4a2a',
  threshold: '#8a8a8a',
  cable: '#3a3a3a',
  toy: '#E63950',
};

interface SelectionState {
  type: 'furniture' | 'obstacle' | 'target' | null;
  index: number;
}

export function RoomCanvas({ heightPx = 500 }: { heightPx?: number }) {
  const room = useDesignerVacuumStore((s) => s.room);
  const setRoomSize = useDesignerVacuumStore((s) => s.setRoomSize);
  const loadRoomPreset = useDesignerVacuumStore((s) => s.loadRoomPreset);
  const loadScenario = useDesignerVacuumStore((s) => s.loadScenario);
  const resetRoom = useDesignerVacuumStore((s) => s.resetRoom);
  const addFurniture = useDesignerVacuumStore((s) => s.addFurniture);
  const updateFurniture = useDesignerVacuumStore((s) => s.updateFurniture);
  const removeFurniture = useDesignerVacuumStore((s) => s.removeFurniture);
  const addObstacle = useDesignerVacuumStore((s) => s.addObstacle);
  const updateObstacle = useDesignerVacuumStore((s) => s.updateObstacle);
  const removeObstacle = useDesignerVacuumStore((s) => s.removeObstacle);
  const addTarget = useDesignerVacuumStore((s) => s.addTarget);
  const updateTarget = useDesignerVacuumStore((s) => s.updateTarget);
  const removeTarget = useDesignerVacuumStore((s) => s.removeTarget);

  const [selection, setSelection] = useState<SelectionState>({ type: null, index: -1 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Catalogs
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
  const scenariosQ = useQuery({
    queryKey: ['vacuum-arm', 'scenarios'],
    queryFn: () => designerVacuumApi.listScenarios(),
    staleTime: 5 * 60_000,
  });

  const furnitureCatalog = furnitureQ.data?.furniture ?? [];
  const obstacleCatalog = obstaclesQ.data?.obstacles ?? [];
  const targetCatalog = targetsQ.data?.targetObjects ?? [];
  const presets = presetsQ.data?.roomPresets ?? [];
  const scenarios = scenariosQ.data?.scenarios ?? [];

  // Stage scale: fit room into containerWidth × heightPx (margin 20px)
  const stageWidth = containerWidth;
  const stageHeight = heightPx;
  const scale = useMemo(() => {
    const sx = (stageWidth - 40) / room.widthCm;
    const sy = (stageHeight - 40) / room.depthCm;
    return Math.min(sx, sy);
  }, [stageWidth, stageHeight, room.widthCm, room.depthCm]);

  const offsetX = (stageWidth - room.widthCm * scale) / 2;
  const offsetY = (stageHeight - room.depthCm * scale) / 2;

  // Resolved catalog lookups
  const findFurniture = (id: number) => furnitureCatalog.find((f) => f.id === id);
  const findObstacle = (id: number) => obstacleCatalog.find((o) => o.id === id);
  const findTarget = (id: number) => targetCatalog.find((t) => t.id === id);

  function clamp(v: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, v));
  }

  // Drag handlers — convert pixel to cm and clamp inside room
  const onFurnitureDrag = (i: number) => (e: Konva.KonvaEventObject<DragEvent>) => {
    const px = (e.target.x() - offsetX) / scale;
    const py = (e.target.y() - offsetY) / scale;
    updateFurniture(i, { xCm: clamp(px, 0, room.widthCm), yCm: clamp(py, 0, room.depthCm) });
  };
  const onObstacleDrag = (i: number) => (e: Konva.KonvaEventObject<DragEvent>) => {
    const px = (e.target.x() - offsetX) / scale;
    const py = (e.target.y() - offsetY) / scale;
    updateObstacle(i, { xCm: clamp(px, 0, room.widthCm), yCm: clamp(py, 0, room.depthCm) });
  };
  const onTargetDrag = (i: number) => (e: Konva.KonvaEventObject<DragEvent>) => {
    const px = (e.target.x() - offsetX) / scale;
    const py = (e.target.y() - offsetY) / scale;
    updateTarget(i, { xCm: clamp(px, 0, room.widthCm), yCm: clamp(py, 0, room.depthCm) });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Top toolbar: room size + presets + scenarios + reset */}
      <div className="flex flex-wrap items-center gap-3 border-b border-designer-rule bg-designer-surface-2 px-3 py-2">
        <div className="flex items-center gap-1">
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-designer-muted">방</span>
          <NumberField
            value={room.widthCm}
            onChange={(v) => setRoomSize(v, room.depthCm)}
            min={200}
            max={1000}
            step={10}
            unit="cm"
          />
          <span className="text-designer-muted">×</span>
          <NumberField
            value={room.depthCm}
            onChange={(v) => setRoomSize(room.widthCm, v)}
            min={200}
            max={1000}
            step={10}
            unit="cm"
          />
        </div>

        <div className="flex items-center gap-1">
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-designer-muted">프리셋</span>
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => loadRoomPreset(p)}
              className={[
                'border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors',
                room.preset === p.id
                  ? 'border-designer-accent text-designer-accent'
                  : 'border-designer-rule text-designer-ink-2 hover:border-designer-ink-2 hover:text-designer-ink',
              ].join(' ')}
              title={p.description}
            >
              {p.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-designer-muted">시나리오</span>
          {scenarios.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                const presetSpec = presets.find((p) => p.id === s.presetRoomId) ?? null;
                loadScenario(s, presetSpec);
              }}
              className="border border-designer-rule px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-designer-ink-2 hover:border-designer-accent hover:text-designer-ink transition-colors"
              title={s.description}
            >
              {s.id}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            resetRoom();
            setSelection({ type: null, index: -1 });
          }}
          className="ml-auto border border-designer-rule px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-designer-muted hover:border-designer-risk hover:text-designer-risk transition-colors"
        >
          비우기
        </button>
      </div>

      {/* Body: palettes + canvas */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: palettes (collapsible scroll) */}
        <div className="w-44 shrink-0 overflow-y-auto border-r border-designer-rule bg-designer-surface-2 p-2 space-y-3">
          <Palette
            title="가구"
            items={furnitureCatalog.map((f) => ({
              key: `f-${f.id}`,
              label: f.name,
              hint: `${f.widthCm}×${f.depthCm}cm · 윗면 ${f.surfaceHeightCm}cm`,
              fill: FURNITURE_FILL[f.type],
              onAdd: () =>
                addFurniture({
                  furnitureId: f.id,
                  xCm: room.widthCm / 2,
                  yCm: room.depthCm / 2,
                  rotationDeg: 0,
                }),
            }))}
          />
          <Palette
            title="장애물"
            items={obstacleCatalog.map((o) => ({
              key: `o-${o.id}`,
              label: o.name,
              hint: `H${o.heightCm}cm · W${o.widthCm}cm`,
              fill: OBSTACLE_FILL[o.type],
              onAdd: () =>
                addObstacle({
                  obstacleId: o.id,
                  xCm: room.widthCm / 2,
                  yCm: room.depthCm / 2,
                  rotationDeg: 0,
                }),
            }))}
          />
          <Palette
            title="타겟"
            items={targetCatalog.map((t) => ({
              key: `t-${t.id}`,
              label: t.name,
              hint: `${t.weightKg.toFixed(2)}kg`,
              fill: '#3acc6f',
              onAdd: () =>
                addTarget({
                  targetObjectId: t.id,
                  onFurnitureIndex: null,
                  xCm: room.widthCm / 2,
                  yCm: room.depthCm / 2,
                  zCm: 0,
                }),
            }))}
          />
        </div>

        {/* Center: canvas */}
        <div className="flex-1 overflow-hidden bg-designer-viewport" ref={containerRef}>
          <Stage width={stageWidth} height={stageHeight} onMouseDown={() => setSelection({ type: null, index: -1 })}>
            <Layer>
              {/* Floor outline — mid-tone neutral so furniture / overlays read clearly */}
              <Rect
                x={offsetX}
                y={offsetY}
                width={room.widthCm * scale}
                height={room.depthCm * scale}
                stroke="rgba(255,255,255,0.32)"
                strokeWidth={1.2}
                fill="#1a1f27"
              />
              {/* Grid lines every 50 cm */}
              <GridLines
                widthCm={room.widthCm}
                depthCm={room.depthCm}
                scale={scale}
                offsetX={offsetX}
                offsetY={offsetY}
              />
              {/* Furniture */}
              {room.furniture.map((p, i) => {
                const f = findFurniture(p.furnitureId);
                if (!f) return null;
                return (
                  <FurnitureRect
                    key={`f-${i}-${p.furnitureId}`}
                    placement={p}
                    spec={f}
                    selected={selection.type === 'furniture' && selection.index === i}
                    scale={scale}
                    offsetX={offsetX}
                    offsetY={offsetY}
                    onSelect={(e) => {
                      e.cancelBubble = true;
                      setSelection({ type: 'furniture', index: i });
                    }}
                    onDragMove={onFurnitureDrag(i)}
                  />
                );
              })}
              {/* Obstacles */}
              {room.obstacles.map((p, i) => {
                const o = findObstacle(p.obstacleId);
                if (!o) return null;
                return (
                  <ObstacleRect
                    key={`o-${i}-${p.obstacleId}`}
                    placement={p}
                    spec={o}
                    selected={selection.type === 'obstacle' && selection.index === i}
                    scale={scale}
                    offsetX={offsetX}
                    offsetY={offsetY}
                    onSelect={(e) => {
                      e.cancelBubble = true;
                      setSelection({ type: 'obstacle', index: i });
                    }}
                    onDragMove={onObstacleDrag(i)}
                  />
                );
              })}
              {/* Targets */}
              {room.targets.map((p, i) => {
                const t = findTarget(p.targetObjectId);
                if (!t) return null;
                return (
                  <TargetMarkerNode
                    key={`t-${i}-${p.targetObjectId}`}
                    target={p}
                    spec={t}
                    selected={selection.type === 'target' && selection.index === i}
                    scale={scale}
                    offsetX={offsetX}
                    offsetY={offsetY}
                    onSelect={(e) => {
                      e.cancelBubble = true;
                      setSelection({ type: 'target', index: i });
                    }}
                    onDragMove={onTargetDrag(i)}
                  />
                );
              })}
              {/* Robot center marker */}
              <Group x={offsetX + (room.widthCm / 2) * scale} y={offsetY + (room.depthCm / 2) * scale}>
                <Circle radius={Math.max(6, 17.5 * scale)} stroke="#E63950" strokeWidth={1.5} dash={[3, 3]} />
                <Text text="ROBOT" fill="rgba(230,57,80,0.7)" fontSize={9} offsetX={15} offsetY={-7} fontStyle="bold" />
              </Group>
            </Layer>
          </Stage>
        </div>

        {/* Right: selection inspector */}
        <div className="w-56 shrink-0 overflow-y-auto border-l border-designer-rule bg-designer-surface-2 p-3">
          <SelectionInspector
            selection={selection}
            onClear={() => setSelection({ type: null, index: -1 })}
            onRemove={(type, idx) => {
              if (type === 'furniture') removeFurniture(idx);
              if (type === 'obstacle') removeObstacle(idx);
              if (type === 'target') removeTarget(idx);
              setSelection({ type: null, index: -1 });
            }}
          />
        </div>
      </div>

      {/* Bottom: counts */}
      <div className="border-t border-designer-rule bg-designer-card px-3 py-1.5 flex items-center gap-4 font-mono text-[9px] uppercase tracking-[0.18em] text-designer-muted">
        <span>가구 {room.furniture.length}</span>
        <span>장애물 {room.obstacles.length}</span>
        <span>타겟 {room.targets.length}</span>
        <span className="ml-auto">방 {room.widthCm}×{room.depthCm} cm</span>
      </div>
    </div>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

function NumberField({
  value,
  onChange,
  min,
  max,
  step,
  unit,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
}) {
  return (
    <span className="inline-flex items-center">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-14 bg-designer-card border border-designer-rule px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-designer-ink focus:border-designer-accent focus:outline-none"
      />
      <span className="ml-0.5 font-mono text-[9px] text-designer-muted">{unit}</span>
    </span>
  );
}

function Palette({
  title,
  items,
}: {
  title: string;
  items: Array<{ key: string; label: string; hint: string; fill: string; onAdd: () => void }>;
}) {
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-designer-muted mb-1">{title}</div>
      <div className="space-y-1">
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            onClick={it.onAdd}
            className="flex w-full items-center gap-2 border border-designer-rule bg-designer-card px-2 py-1.5 text-left hover:border-designer-ink-2 hover:bg-designer-accent/10 transition-colors"
          >
            <span className="block h-3 w-3 shrink-0 border border-designer-rule" style={{ backgroundColor: it.fill }} />
            <span className="flex-1 truncate">
              <span className="block text-[10.5px] text-designer-ink truncate">{it.label}</span>
              <span className="block font-mono text-[8.5px] text-designer-muted truncate">{it.hint}</span>
            </span>
            <span className="text-[12px] text-designer-muted">+</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function GridLines({
  widthCm,
  depthCm,
  scale,
  offsetX,
  offsetY,
}: {
  widthCm: number;
  depthCm: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}) {
  const lines: JSX.Element[] = [];
  for (let x = 50; x < widthCm; x += 50) {
    lines.push(
      <Line
        key={`vx-${x}`}
        points={[offsetX + x * scale, offsetY, offsetX + x * scale, offsetY + depthCm * scale]}
        stroke="rgba(255,255,255,0.16)"
        strokeWidth={1}
      />
    );
  }
  for (let y = 50; y < depthCm; y += 50) {
    lines.push(
      <Line
        key={`hy-${y}`}
        points={[offsetX, offsetY + y * scale, offsetX + widthCm * scale, offsetY + y * scale]}
        stroke="rgba(255,255,255,0.16)"
        strokeWidth={1}
      />
    );
  }
  return <Group>{lines}</Group>;
}

function FurnitureRect({
  placement,
  spec,
  selected,
  scale,
  offsetX,
  offsetY,
  onSelect,
  onDragMove,
}: {
  placement: { xCm: number; yCm: number; rotationDeg: number };
  spec: FurnitureSpec;
  selected: boolean;
  scale: number;
  offsetX: number;
  offsetY: number;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
}) {
  return (
    <Group
      x={offsetX + placement.xCm * scale}
      y={offsetY + placement.yCm * scale}
      draggable
      onMouseDown={onSelect}
      onDragMove={onDragMove}
    >
      <Rect
        x={(-spec.widthCm / 2) * scale}
        y={(-spec.depthCm / 2) * scale}
        width={spec.widthCm * scale}
        height={spec.depthCm * scale}
        fill={FURNITURE_FILL[spec.type]}
        opacity={0.55}
        stroke={selected ? '#F2A93B' : 'rgba(255,255,255,0.25)'}
        strokeWidth={selected ? 2 : 1}
        rotation={placement.rotationDeg}
      />
      <Text
        text={spec.name}
        fontSize={9}
        fill="rgba(255,255,255,0.85)"
        offsetX={spec.name.length * 2.2}
        offsetY={4}
      />
    </Group>
  );
}

function ObstacleRect({
  placement,
  spec,
  selected,
  scale,
  offsetX,
  offsetY,
  onSelect,
  onDragMove,
}: {
  placement: { xCm: number; yCm: number; rotationDeg: number };
  spec: ObstacleSpec;
  selected: boolean;
  scale: number;
  offsetX: number;
  offsetY: number;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
}) {
  // For rugs use square, others elongated band
  const w = spec.widthCm;
  const h = spec.type === 'rug' || spec.type === 'toy' ? spec.widthCm : 30;
  return (
    <Group
      x={offsetX + placement.xCm * scale}
      y={offsetY + placement.yCm * scale}
      draggable
      onMouseDown={onSelect}
      onDragMove={onDragMove}
    >
      <Rect
        x={(-w / 2) * scale}
        y={(-h / 2) * scale}
        width={w * scale}
        height={h * scale}
        fill={OBSTACLE_FILL[spec.type]}
        opacity={0.5}
        stroke={selected ? '#F2A93B' : 'rgba(255,255,255,0.2)'}
        strokeWidth={selected ? 2 : 1}
        rotation={placement.rotationDeg}
      />
      <Text text={spec.name} fontSize={8} fill="rgba(255,255,255,0.7)" offsetX={spec.name.length * 2} offsetY={4} />
    </Group>
  );
}

function TargetMarkerNode({
  target,
  spec,
  selected,
  scale,
  offsetX,
  offsetY,
  onSelect,
  onDragMove,
}: {
  target: { xCm: number; yCm: number; zCm: number; targetObjectId: number };
  spec: TargetObjectSpec;
  selected: boolean;
  scale: number;
  offsetX: number;
  offsetY: number;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
}) {
  return (
    <Group
      x={offsetX + target.xCm * scale}
      y={offsetY + target.yCm * scale}
      draggable
      onMouseDown={onSelect}
      onDragMove={onDragMove}
    >
      <Circle radius={9} fill="#3acc6f" stroke={selected ? '#F2A93B' : '#fff'} strokeWidth={selected ? 2 : 1} opacity={0.85} />
      <Text
        text={`${spec.name} ${target.zCm > 0 ? `· z${target.zCm}cm` : ''}`}
        fontSize={9}
        fill="rgba(255,255,255,0.95)"
        offsetX={(spec.name.length + (target.zCm > 0 ? 8 : 0)) * 2.5}
        offsetY={-12}
      />
    </Group>
  );
}

function SelectionInspector({
  selection,
  onClear,
  onRemove,
}: {
  selection: SelectionState;
  onClear: () => void;
  onRemove: (type: 'furniture' | 'obstacle' | 'target', idx: number) => void;
}) {
  const room = useDesignerVacuumStore((s) => s.room);
  const updateFurniture = useDesignerVacuumStore((s) => s.updateFurniture);
  const updateObstacle = useDesignerVacuumStore((s) => s.updateObstacle);
  const updateTarget = useDesignerVacuumStore((s) => s.updateTarget);

  if (selection.type === null) {
    return (
      <div>
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-designer-muted">선택 없음</span>
        <p className="mt-2 text-[10.5px] text-designer-muted leading-relaxed">
          좌측 팔레트에서 가구/장애물/타겟을 추가하거나, 캔버스 항목을 클릭해 편집.
        </p>
      </div>
    );
  }

  if (selection.type === 'furniture') {
    const p = room.furniture[selection.index];
    if (!p) return null;
    return (
      <InspectorBlock title="가구" onRemove={() => onRemove('furniture', selection.index)} onClose={onClear}>
        <NumberRow label="X" value={p.xCm} onChange={(v) => updateFurniture(selection.index, { xCm: v })} unit="cm" />
        <NumberRow label="Y" value={p.yCm} onChange={(v) => updateFurniture(selection.index, { yCm: v })} unit="cm" />
        <SliderRow
          label="회전"
          value={p.rotationDeg}
          onChange={(v) => updateFurniture(selection.index, { rotationDeg: v })}
          min={0}
          max={360}
          step={5}
          unit="°"
        />
      </InspectorBlock>
    );
  }

  if (selection.type === 'obstacle') {
    const p = room.obstacles[selection.index];
    if (!p) return null;
    return (
      <InspectorBlock title="장애물" onRemove={() => onRemove('obstacle', selection.index)} onClose={onClear}>
        <NumberRow label="X" value={p.xCm} onChange={(v) => updateObstacle(selection.index, { xCm: v })} unit="cm" />
        <NumberRow label="Y" value={p.yCm} onChange={(v) => updateObstacle(selection.index, { yCm: v })} unit="cm" />
        <SliderRow
          label="회전"
          value={p.rotationDeg}
          onChange={(v) => updateObstacle(selection.index, { rotationDeg: v })}
          min={0}
          max={360}
          step={5}
          unit="°"
        />
      </InspectorBlock>
    );
  }

  // target
  const p = room.targets[selection.index];
  if (!p) return null;
  return (
    <InspectorBlock title="타겟" onRemove={() => onRemove('target', selection.index)} onClose={onClear}>
      <NumberRow label="X" value={p.xCm} onChange={(v) => updateTarget(selection.index, { xCm: v })} unit="cm" />
      <NumberRow label="Y" value={p.yCm} onChange={(v) => updateTarget(selection.index, { yCm: v })} unit="cm" />
      <NumberRow
        label="Z (높이)"
        value={p.zCm}
        onChange={(v) => updateTarget(selection.index, { zCm: v })}
        unit="cm"
      />
      <p className="mt-1 text-[9.5px] text-designer-muted leading-snug">
        Z=0이면 바닥, 가구 위는 그 가구의 surfaceHeightCm에 맞추기 (예: 식탁 75cm)
      </p>
    </InspectorBlock>
  );
}

function InspectorBlock({
  title,
  onRemove,
  onClose,
  children,
}: {
  title: string;
  onRemove: () => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-designer-muted">{title}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onRemove}
            className="border border-designer-rule p-1 text-designer-muted hover:border-designer-risk hover:text-designer-risk transition-colors"
            title="삭제"
          >
            <Trash2 className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="border border-designer-rule px-2 py-0.5 text-[10px] text-designer-muted hover:border-designer-ink-2 hover:text-designer-ink transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function NumberRow({
  label,
  value,
  onChange,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit: string;
}) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="text-[10.5px] text-designer-ink-2">{label}</span>
      <span className="inline-flex items-center">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          step={1}
          className="w-16 bg-designer-card border border-designer-rule px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-designer-ink text-right focus:border-designer-accent focus:outline-none"
        />
        <span className="ml-0.5 font-mono text-[9px] text-designer-muted">{unit}</span>
      </span>
    </label>
  );
}

function SliderRow({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] text-designer-ink-2">{label}</span>
        <span className="font-mono text-[10px] tabular-nums text-designer-ink">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-designer-accent cursor-pointer"
      />
    </div>
  );
}
