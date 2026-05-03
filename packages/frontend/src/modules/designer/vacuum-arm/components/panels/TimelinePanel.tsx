'use client';

/**
 * TimelinePanel — 모션 시퀀스 편집 + 재생.
 *
 * 시간축 수평 바:
 *   - 0초 ~ duration초
 *   - waypoints는 노란 마커 (위치)
 *   - gestures는 색깔 블록 (PICKUP/WAVE/etc + 폭=durationSec)
 *   - 빨간 playhead가 currentTime
 *
 * 컨트롤:
 *   - ▶ / ⏸ 재생
 *   - 스크럽 슬라이더 (수동으로 currentTime 이동)
 *   - 재생 속도 (1x / 2x / 3x)
 *   - 총 길이 input
 *   - "+ 웨이포인트 (현재 시점·로봇 위치)" 버튼
 *   - "+ 동작" 버튼 + 종류 selector
 *   - 항목별 삭제 버튼
 *
 * 단일 로봇 시나리오 전용. 룸 3D 모드에서만 표시.
 */

import { useDesignerVacuumStore } from '../../stores/designer-vacuum-store';
import type { GestureType, TimelineWaypoint, TimelineGesture } from '../../stores/designer-vacuum-store';

const GESTURE_COLORS: Record<GestureType, string> = {
  IDLE: '#4a4a4a',
  PICKUP: '#E63950',
  WAVE: '#3a8dde',
  POINT: '#f2a93b',
  SCAN: '#8b5cf6',
  BOW: '#10b981',
  HANDSHAKE: '#ec4899',
  GRAB: '#22c55e',     // green = 잡기
  RELEASE: '#f97316',  // orange = 놓기
};

const GESTURE_LABELS: Record<GestureType, string> = {
  IDLE: 'IDLE',
  PICKUP: 'PICKUP',
  WAVE: 'WAVE',
  POINT: 'POINT',
  SCAN: 'SCAN',
  BOW: 'BOW',
  HANDSHAKE: 'HANDSHAKE',
  GRAB: 'GRAB',
  RELEASE: 'RELEASE',
};

// 위치 변화 없는 자세 동작들 (GRAB/RELEASE는 별도 UI)
const POSE_GESTURES: GestureType[] = ['PICKUP', 'WAVE', 'POINT', 'SCAN', 'BOW', 'HANDSHAKE'];

export function TimelinePanel() {
  const timeline = useDesignerVacuumStore((s) => s.timeline);
  const room = useDesignerVacuumStore((s) => s.room);
  const robotXCm = useDesignerVacuumStore((s) => s.robotXCm);
  const robotYCm = useDesignerVacuumStore((s) => s.robotYCm);
  const robotYawDeg = useDesignerVacuumStore((s) => s.robotYawDeg);
  const setRobotYawDeg = useDesignerVacuumStore((s) => s.setRobotYawDeg);
  const addWaypoint = useDesignerVacuumStore((s) => s.addWaypoint);
  const removeWaypoint = useDesignerVacuumStore((s) => s.removeWaypoint);
  const addGesture = useDesignerVacuumStore((s) => s.addGestureKeyframe);
  const removeGesture = useDesignerVacuumStore((s) => s.removeGestureKeyframe);
  const setDuration = useDesignerVacuumStore((s) => s.setTimelineDuration);
  const setCurrentTime = useDesignerVacuumStore((s) => s.setTimelineCurrentTime);
  const setPlaying = useDesignerVacuumStore((s) => s.setTimelinePlaying);
  const setPlaySpeed = useDesignerVacuumStore((s) => s.setTimelinePlaySpeed);
  const resetTimeline = useDesignerVacuumStore((s) => s.resetTimeline);

  const halfWCm = room.widthCm / 2;
  const halfDCm = room.depthCm / 2;

  // playhead percent
  const playheadPct = (timeline.currentTime / timeline.duration) * 100;

  return (
    <div className="bg-[#0a0a0a] border-t border-white/10 px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-gold">
          모션 타임라인
        </span>
        <span className="font-mono text-[9px] text-white/45 ml-2">
          {timeline.currentTime.toFixed(1)}s / {timeline.duration.toFixed(1)}s
        </span>
        <div className="flex-1" />
        {/* 재생 컨트롤 */}
        <button
          type="button"
          onClick={() => setPlaying(!timeline.isPlaying)}
          className="border border-gold/40 bg-[#1a1408] hover:bg-[#231a0c] text-gold px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em]"
          title={timeline.isPlaying ? '일시정지' : '재생'}
        >
          {timeline.isPlaying ? '⏸ 일시정지' : '▶ 재생'}
        </button>
        <select
          value={timeline.playSpeed}
          onChange={(e) => setPlaySpeed(Number(e.target.value) as 1 | 2 | 3)}
          className="bg-[#0a0a0a] border border-white/15 text-white/80 px-2 py-1 font-mono text-[10px]"
          aria-label="재생 속도"
        >
          <option value={1}>1×</option>
          <option value={2}>2×</option>
          <option value={3}>3×</option>
        </select>
        <button
          type="button"
          onClick={() => {
            setCurrentTime(0);
            setPlaying(false);
          }}
          className="border border-white/15 bg-[#0a0a0a] hover:border-white/30 text-white/55 hover:text-white px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em]"
          title="처음으로"
        >
          ↺ 0:00
        </button>
        <span className="mx-2 h-4 w-px bg-white/15" />
        <label className="text-[10px] text-white/55 font-mono">길이</label>
        <input
          type="number"
          min={1}
          max={300}
          step={1}
          value={timeline.duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="w-14 bg-[#0a0a0a] border border-white/15 text-white/80 px-2 py-1 font-mono text-[10px]"
        />
        <span className="text-[10px] text-white/45">s</span>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('모든 웨이포인트와 동작을 삭제할까요?')) resetTimeline();
          }}
          className="border border-white/15 bg-[#0a0a0a] hover:border-error hover:text-error text-white/55 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em]"
        >
          전체 삭제
        </button>
      </div>

      {/* 시간축 트랙 */}
      <div className="relative h-12 bg-[#1a1f27] border border-white/10 mb-2">
        {/* 배경 그리드 (1초 간격) */}
        {Array.from({ length: Math.floor(timeline.duration) + 1 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-white/8"
            style={{ left: `${(i / timeline.duration) * 100}%` }}
          />
        ))}
        {/* Gesture 블록 */}
        {timeline.gestures.map((g) => {
          const leftPct = (g.t / timeline.duration) * 100;
          const widthPct = (g.durationSec / timeline.duration) * 100;
          return (
            <div
              key={g.id}
              className="absolute top-1 bottom-6 group cursor-pointer"
              style={{
                left: `${leftPct}%`,
                width: `${widthPct}%`,
                background: GESTURE_COLORS[g.type],
                opacity: 0.85,
              }}
              title={`${GESTURE_LABELS[g.type]} · ${g.t.toFixed(1)}s ~ ${(g.t + g.durationSec).toFixed(1)}s`}
            >
              <span className="absolute inset-0 flex items-center justify-center text-[8.5px] font-mono uppercase text-white tracking-wider truncate px-1">
                {GESTURE_LABELS[g.type]}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeGesture(g.id);
                }}
                className="absolute top-0 right-0 w-3.5 h-3.5 bg-black/60 text-white/70 text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100"
                title="삭제"
              >
                ×
              </button>
            </div>
          );
        })}
        {/* Waypoint 마커 (아래쪽에) */}
        {timeline.waypoints.map((w) => {
          const leftPct = (w.t / timeline.duration) * 100;
          return (
            <div
              key={w.id}
              className="absolute bottom-0 group cursor-pointer"
              style={{ left: `${leftPct}%`, transform: 'translateX(-50%)' }}
              title={`웨이포인트 · t=${w.t.toFixed(1)}s · (${w.xCm.toFixed(0)}, ${w.yCm.toFixed(0)})cm`}
            >
              <div className="w-2 h-5 bg-gold border border-gold-dark" />
              <button
                type="button"
                onClick={() => removeWaypoint(w.id)}
                className="absolute -top-3 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-black/70 text-white/70 text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100"
                title="삭제"
              >
                ×
              </button>
            </div>
          );
        })}
        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-px bg-[#ff4d64] pointer-events-none"
          style={{ left: `${playheadPct}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#ff4d64] rotate-45" />
        </div>
      </div>

      {/* 스크럽 슬라이더 */}
      <input
        type="range"
        min={0}
        max={timeline.duration}
        step={0.05}
        value={timeline.currentTime}
        onChange={(e) => {
          setPlaying(false);
          setCurrentTime(Number(e.target.value));
        }}
        className="w-full accent-[#ff4d64] mb-3"
        aria-label="시간 스크럽"
      />

      {/* 로봇 회전 슬라이더 — 위치와 별도로 yaw 제어 */}
      <div className="flex items-center gap-2 mb-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/55 w-16">
          로봇 yaw
        </span>
        <input
          type="range"
          min={0}
          max={359}
          step={1}
          value={robotYawDeg}
          onChange={(e) => setRobotYawDeg(Number(e.target.value))}
          className="flex-1 accent-gold cursor-pointer"
          aria-label="로봇 회전 (yaw)"
        />
        <span className="font-mono text-[10px] tabular-nums text-white w-10 text-right">
          {robotYawDeg.toFixed(0)}°
        </span>
        <button
          type="button"
          onClick={() => setRobotYawDeg(0)}
          className="border border-white/15 bg-[#0a0a0a] hover:border-white/30 text-white/55 hover:text-white px-2 py-1 font-mono text-[9px] uppercase"
          title="회전 초기화"
        >
          ↺
        </button>
      </div>

      {/* 추가 컨트롤 */}
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <button
          type="button"
          onClick={() =>
            addWaypoint({
              t: timeline.currentTime,
              xCm: robotXCm ?? halfWCm,
              yCm: robotYCm ?? halfDCm,
              yawDeg: robotYawDeg,
            })
          }
          className="border border-gold/40 bg-[#1a1408] hover:bg-[#231a0c] text-gold px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em]"
          title="현재 시점·위치·회전을 웨이포인트로 추가"
        >
          + 웨이포인트
        </button>
        <span className="text-[10px] text-white/40 font-mono">
          현재: ({(robotXCm ?? halfWCm).toFixed(0)}, {(robotYCm ?? halfDCm).toFixed(0)})cm · {robotYawDeg.toFixed(0)}°
        </span>

        <span className="mx-2 h-4 w-px bg-white/15" />

        {POSE_GESTURES.map((gType) => (
          <button
            key={gType}
            type="button"
            onClick={() => addGesture({ t: timeline.currentTime, durationSec: 3, type: gType })}
            className="border border-white/20 bg-[#0a0a0a] hover:border-white/40 text-white/70 hover:text-white px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.18em]"
            style={{ borderColor: `${GESTURE_COLORS[gType]}60` }}
            title={`현재 시점에 ${gType} 동작 추가 (3초). 위치는 별도 웨이포인트로 관리.`}
          >
            + {GESTURE_LABELS[gType]}
          </button>
        ))}

        {/* 그리퍼 닫기/열기 — proximity-based auto grab */}
        <span className="mx-1 h-4 w-px bg-white/15" />
        <button
          type="button"
          onClick={() => addGesture({ t: timeline.currentTime, durationSec: 0.5, type: 'GRAB' })}
          className="border border-green-500/60 bg-green-500/10 hover:bg-green-500/20 text-green-200 px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.18em]"
          title="그리퍼 닫기 — 반경 18cm 안에 가장 가까운 타겟 자동 잡음"
        >
          + GRAB (그리퍼 닫기)
        </button>
        <button
          type="button"
          onClick={() => addGesture({ t: timeline.currentTime, durationSec: 0.5, type: 'RELEASE' })}
          className="border border-orange-500/60 bg-orange-500/10 hover:bg-orange-500/20 text-orange-200 px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.18em]"
          title="그리퍼 열기 — 잡고 있던 거 떨어짐"
        >
          + RELEASE (열기)
        </button>
      </div>

      {/* Gestures 있는데 waypoints 없으면 경고 — 로봇이 이동 안 하는 흔한 케이스 */}
      {timeline.gestures.length > 0 && timeline.waypoints.length === 0 ? (
        <div className="mt-2 px-3 py-2 border border-amber-500/40 bg-amber-500/10 text-[10.5px] text-amber-200/90 leading-relaxed">
          ⚠️ 동작은 있지만 <strong>웨이포인트가 없어서</strong> 로봇이 이동하지 않습니다.
          로봇을 원하는 위치로 드래그한 뒤 시간축에서 + 웨이포인트로 위치를 캡쳐하세요.
        </div>
      ) : null}

      {/* 웨이포인트/제스처 리스트 (편집용) */}
      {(timeline.waypoints.length > 0 || timeline.gestures.length > 0) ? (
        <div className="grid grid-cols-2 gap-3 mt-3">
          <WaypointList waypoints={timeline.waypoints} />
          <GestureList gestures={timeline.gestures} />
        </div>
      ) : (
        <div className="mt-2 text-[10px] text-white/45 leading-relaxed space-y-1">
          <p>
            <strong className="text-gold">위치(웨이포인트)</strong>와{' '}
            <strong className="text-gold">동작(제스처)</strong>는 독립 트랙입니다.
          </p>
          <p>
            <strong>위치 시퀀스</strong>: 로봇을 A로 드래그 → 시간축 0초 → + 웨이포인트 → 스크럽
            5초로 → B로 드래그 → + 웨이포인트 → 재생 시 0~5초 동안 A→B 이동.
          </p>
          <p>
            <strong>동작 시퀀스</strong>: 어떤 시점에든 + PICKUP/WAVE 등 클릭 → 동작 블록 추가.
            위치는 별도(웨이포인트가 결정).
          </p>
        </div>
      )}
    </div>
  );
}

function WaypointList({ waypoints }: { waypoints: TimelineWaypoint[] }) {
  const updateWaypoint = useDesignerVacuumStore((s) => s.updateWaypoint);
  const removeWaypoint = useDesignerVacuumStore((s) => s.removeWaypoint);
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/55 mb-1">
        웨이포인트 ({waypoints.length}) — t / x / y / yaw 편집 가능
      </div>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {waypoints.map((w) => (
          <div
            key={w.id}
            className="flex items-center gap-1 bg-[#0f0f0f] border border-white/10 px-2 py-1 font-mono text-[10px]"
          >
            <span className="text-gold/80 text-[9px]">t</span>
            <input
              type="number"
              min={0}
              step={0.1}
              value={w.t.toFixed(1)}
              onChange={(e) => updateWaypoint(w.id, { t: Number(e.target.value) })}
              className="w-12 bg-[#0a0a0a] border border-white/15 text-white/85 px-1 text-[10px]"
              title="시점 (초)"
            />
            <span className="text-white/45 text-[9px] ml-1">x</span>
            <input
              type="number"
              min={0}
              step={1}
              value={w.xCm.toFixed(0)}
              onChange={(e) => updateWaypoint(w.id, { xCm: Number(e.target.value) })}
              className="w-11 bg-[#0a0a0a] border border-white/15 text-white/85 px-1 text-[10px]"
              title="X 위치 (cm)"
            />
            <span className="text-white/45 text-[9px]">y</span>
            <input
              type="number"
              min={0}
              step={1}
              value={w.yCm.toFixed(0)}
              onChange={(e) => updateWaypoint(w.id, { yCm: Number(e.target.value) })}
              className="w-11 bg-[#0a0a0a] border border-white/15 text-white/85 px-1 text-[10px]"
              title="Y 위치 (cm)"
            />
            <span className="text-white/45 text-[9px]">yaw</span>
            <input
              type="number"
              min={0}
              max={359}
              step={5}
              value={(w.yawDeg ?? 0).toFixed(0)}
              onChange={(e) => updateWaypoint(w.id, { yawDeg: Number(e.target.value) })}
              className="w-11 bg-[#0a0a0a] border border-white/15 text-white/85 px-1 text-[10px]"
              title="회전 yaw (도). 인접 waypoint와 lerp."
            />
            <button
              type="button"
              onClick={() => removeWaypoint(w.id)}
              className="text-white/35 hover:text-error ml-auto"
              title="삭제"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function GestureList({ gestures }: { gestures: TimelineGesture[] }) {
  const updateGesture = useDesignerVacuumStore((s) => s.updateGestureKeyframe);
  const removeGesture = useDesignerVacuumStore((s) => s.removeGestureKeyframe);
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/55 mb-1">
        동작 ({gestures.length})
      </div>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {gestures.map((g) => (
          <div
            key={g.id}
            className="flex items-center gap-2 bg-[#0f0f0f] border border-white/10 px-2 py-1 font-mono text-[10px]"
          >
            <span
              className="w-1.5 h-1.5 rounded-sm"
              style={{ background: GESTURE_COLORS[g.type] }}
            />
            <span className="text-white/80 w-20 truncate">{GESTURE_LABELS[g.type]}</span>
            <span className="text-white/45 text-[9px]">@</span>
            <input
              type="number"
              min={0}
              step={0.1}
              value={g.t.toFixed(1)}
              onChange={(e) => updateGesture(g.id, { t: Number(e.target.value) })}
              className="w-12 bg-[#0a0a0a] border border-white/15 text-white/80 px-1 text-[10px]"
            />
            <span className="text-white/45 text-[9px]">×</span>
            <input
              type="number"
              min={0.5}
              max={20}
              step={0.5}
              value={g.durationSec.toFixed(1)}
              onChange={(e) => updateGesture(g.id, { durationSec: Number(e.target.value) })}
              className="w-12 bg-[#0a0a0a] border border-white/15 text-white/80 px-1 text-[10px]"
            />
            <span className="text-white/45 text-[9px]">s</span>
            <button
              type="button"
              onClick={() => removeGesture(g.id)}
              className="text-white/35 hover:text-error"
              title="삭제"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
