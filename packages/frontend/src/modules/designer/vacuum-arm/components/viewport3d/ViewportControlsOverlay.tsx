'use client';

/**
 * ViewportControlsOverlay — 시뮬레이션 화면 위에 floating 컨트롤러.
 *
 * 다크 viewport 위라서 light text + 반투명 다크 배경. 좌측에 로봇 D-pad,
 * 우측에 팔 자세 (어깨 / 팔꿈치) + GRAB/RELEASE 단축. 시뮬레이션 중 시선을
 * 화면에 두고 그대로 조작 가능하도록.
 *
 * SpecParametersPanel.PoseSection / TimelinePanel.RobotController와 같은 store
 * action을 호출하므로 자동 동기화. 중복 마운트 OK.
 */

import { useEffect, useRef, useState } from 'react';
import { useDesignerVacuumStore } from '../../stores/designer-vacuum-store';

const STEP_OPTIONS_CM = [5, 10, 20, 50] as const;
const ROTATE_STEP_DEG = 15;
const HOLD_REPEAT_MS = 80;

interface ViewportControlsOverlayProps {
  /** 팔이 있을 때만 arm pose 섹션 표시 */
  showArmPose?: boolean;
  /** GRAB/RELEASE/Waypoint 단축 표시 (room3d 모드에서) */
  showTimelineActions?: boolean;
}

export function ViewportControlsOverlay({
  showArmPose = true,
  showTimelineActions = true,
}: ViewportControlsOverlayProps) {
  const robotXCm = useDesignerVacuumStore((s) => s.robotXCm);
  const robotYCm = useDesignerVacuumStore((s) => s.robotYCm);
  const robotYawDeg = useDesignerVacuumStore((s) => s.robotYawDeg);
  const setRobotPosition = useDesignerVacuumStore((s) => s.setRobotPosition);
  const setRobotYawDeg = useDesignerVacuumStore((s) => s.setRobotYawDeg);

  const armPose = useDesignerVacuumStore((s) => s.armPose);
  const setArmPose = useDesignerVacuumStore((s) => s.setArmPose);
  const applyPosePreset = useDesignerVacuumStore((s) => s.applyPosePreset);

  const timelineCurrentTime = useDesignerVacuumStore((s) => s.timeline.currentTime);
  const addGesture = useDesignerVacuumStore((s) => s.addGestureKeyframe);
  const addWaypoint = useDesignerVacuumStore((s) => s.addWaypoint);

  const [stepCm, setStepCm] = useState<number>(10);
  const [collapsed, setCollapsed] = useState(false);

  const getStore = useDesignerVacuumStore.getState;

  const move = (signedStep: number) => {
    const s = getStore();
    const yaw = (s.robotYawDeg * Math.PI) / 180;
    const curX = s.robotXCm ?? s.room.widthCm / 2;
    const curY = s.robotYCm ?? s.room.depthCm / 2;
    const dx = Math.sin(yaw) * signedStep;
    const dy = Math.cos(yaw) * signedStep;
    const nx = Math.max(0, Math.min(s.room.widthCm, curX + dx));
    const ny = Math.max(0, Math.min(s.room.depthCm, curY + dy));
    setRobotPosition(nx, ny);
  };
  const rotate = (deg: number) => {
    const s = getStore();
    setRobotYawDeg(s.robotYawDeg + deg);
  };

  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-3 z-20 flex items-stretch gap-2 max-w-[calc(100%-24px)]">
      {/* Collapse toggle (작은 라벨 탭) */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="self-start font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85 bg-black/55 border border-white/20 px-2 py-1 hover:bg-black/75"
        title={collapsed ? '펼치기' : '접기'}
      >
        {collapsed ? '▴ Controls' : '▾'}
      </button>

      {!collapsed ? (
        <div className="flex flex-wrap items-center gap-3 bg-black/55 backdrop-blur-sm border border-white/20 px-3 py-2">
          {/* ─── 로봇 컨트롤 ─── */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/60">
              Robot
            </span>
            <div className="flex items-center gap-1">
              <HoldButton onTrigger={() => rotate(-ROTATE_STEP_DEG)} title="좌회전 −15°">
                ↺
              </HoldButton>
              <div className="flex flex-col gap-1">
                <HoldButton onTrigger={() => move(stepCm)} title={`전진 +${stepCm}cm`} small>
                  ▲
                </HoldButton>
                <HoldButton onTrigger={() => move(-stepCm)} title={`후진 −${stepCm}cm`} small>
                  ▼
                </HoldButton>
              </div>
              <HoldButton onTrigger={() => rotate(ROTATE_STEP_DEG)} title="우회전 +15°">
                ↻
              </HoldButton>
            </div>
            <div className="flex items-center gap-1">
              {STEP_OPTIONS_CM.map((cm) => (
                <button
                  key={cm}
                  type="button"
                  onClick={() => setStepCm(cm)}
                  className={[
                    'font-mono text-[10px] uppercase tracking-[0.14em] px-1.5 py-0.5 border transition-colors',
                    stepCm === cm
                      ? 'border-designer-accent bg-designer-accent/30 text-designer-accent'
                      : 'border-white/20 text-white/60 hover:border-white/40 hover:text-white',
                  ].join(' ')}
                >
                  {cm}
                </button>
              ))}
            </div>
          </div>

          <span className="h-7 w-px bg-white/15" />

          {/* ─── 팔 자세 ─── */}
          {showArmPose ? (
            <>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/60">
                  Arm
                </span>
                <div className="flex flex-col gap-1">
                  <SliderRow
                    label="어깨"
                    value={armPose.shoulderPitchDeg}
                    min={-30}
                    max={180}
                    onChange={(v) => setArmPose({ shoulderPitchDeg: v })}
                  />
                  <SliderRow
                    label="팔꿈치"
                    value={armPose.elbowDeg}
                    min={0}
                    max={180}
                    onChange={(v) => setArmPose({ elbowDeg: v })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <PresetButton onClick={() => applyPosePreset('reach')}>리치</PresetButton>
                  <PresetButton onClick={() => applyPosePreset('folded')}>접힘</PresetButton>
                </div>
              </div>

              <span className="h-7 w-px bg-white/15" />
            </>
          ) : null}

          {/* ─── Timeline 단축 (room3d) ─── */}
          {showTimelineActions ? (
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/60">
                Action
              </span>
              <button
                type="button"
                onClick={() =>
                  addGesture({ t: timelineCurrentTime, durationSec: 2, type: 'GRAB' })
                }
                className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] border border-green-400/60 bg-green-500/15 hover:bg-green-500/25 text-green-200 px-2 py-1"
                title={`현재 시점(${timelineCurrentTime.toFixed(1)}s)에 GRAB 동작 추가 — 팔이 자동 reach + 가까운 타겟 잡음`}
              >
                + GRAB
              </button>
              <button
                type="button"
                onClick={() =>
                  addGesture({ t: timelineCurrentTime, durationSec: 2, type: 'RELEASE' })
                }
                className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] border border-orange-400/60 bg-orange-500/15 hover:bg-orange-500/25 text-orange-200 px-2 py-1"
                title="현재 시점에 RELEASE — 잡고 있던 것 놓고 retract"
              >
                + RELEASE
              </button>
              <button
                type="button"
                onClick={() => {
                  const s = getStore();
                  addWaypoint({
                    t: s.timeline.currentTime,
                    xCm: s.robotXCm ?? s.room.widthCm / 2,
                    yCm: s.robotYCm ?? s.room.depthCm / 2,
                    yawDeg: s.robotYawDeg,
                  });
                }}
                className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] border border-designer-accent/60 bg-designer-accent/20 hover:bg-designer-accent/30 text-designer-accent px-2 py-1"
                title="현재 시점·로봇 위치를 웨이포인트로 추가"
              >
                + WP
              </button>
            </div>
          ) : null}

          <span className="h-7 w-px bg-white/15" />

          {/* readout — 우측 끝 */}
          <span className="font-mono text-[10px] tabular-nums text-white/65">
            ({(robotXCm ?? 0).toFixed(0)}, {(robotYCm ?? 0).toFixed(0)})cm · yaw {robotYawDeg.toFixed(0)}°
          </span>
        </div>
      ) : null}
    </div>
  );
}

/* HoldButton — 누르고 있으면 80ms 간격 onTrigger 반복. 다크 viewport용. */
function HoldButton({
  onTrigger,
  title,
  small,
  children,
}: {
  onTrigger: () => void;
  title?: string;
  small?: boolean;
  children: React.ReactNode;
}) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };
  const start = () => {
    onTrigger();
    stop();
    intervalRef.current = setInterval(onTrigger, HOLD_REPEAT_MS);
  };
  useEffect(() => stop, []);

  return (
    <button
      type="button"
      title={title}
      onMouseDown={start}
      onMouseUp={stop}
      onMouseLeave={stop}
      onTouchStart={start}
      onTouchEnd={stop}
      className={[
        'border border-designer-accent/50 bg-designer-accent/15 hover:bg-designer-accent/30 text-designer-accent select-none flex items-center justify-center',
        small ? 'w-7 h-5 text-[11px]' : 'w-7 h-7 text-[14px]',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

/* 컴팩트 슬라이더 — 라벨 + 트랙 + 값 한 줄 */
function SliderRow({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-[10px] text-white/65 w-9">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-24 accent-designer-accent cursor-pointer"
        aria-label={label}
      />
      <span className="font-mono text-[10px] tabular-nums text-white w-8 text-right">
        {value.toFixed(0)}°
      </span>
    </div>
  );
}

function PresetButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-mono text-[10px] uppercase tracking-[0.14em] border border-white/20 bg-black/30 hover:border-white/40 hover:bg-black/50 text-white/75 px-1.5 py-0.5"
    >
      {children}
    </button>
  );
}
