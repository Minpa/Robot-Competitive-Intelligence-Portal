'use client';

/**
 * ViewportHud · ARGOS-UX-Spec §5
 *
 * 3D 뷰포트(다크) 위에 HTML 오버레이로 그려지는 정보 layer.
 *   - 좌표축 indicator (X pink, Z green) — spec §5.1
 *   - 1m 스케일바 — 카메라가 고정 거리라 px 환산은 근사값
 *   - 객체 라벨 chip (선택: accent yellow, 비선택: muted outlined) — spec §5.2
 *
 * 동적 카메라 추적이 필요하면 Three.js subscene으로 옮길 수 있지만,
 * Phase 1에서는 spec의 시각언어(축 색·라벨·스케일바·chip)만 충실히 구현.
 */

const ACCENT = '#D4A22F';
const RISK = '#D63F6F'; // X axis pink
const PASS = '#3F8C6E'; // Z axis green

interface ViewportHudProps {
  /** 1m 스케일바 표시 여부 */
  showScale?: boolean;
  /** 좌표축 indicator 표시 여부 */
  showAxes?: boolean;
  /** 객체 라벨 (예: 후보 이름) */
  objectLabel?: string;
  /** 작업 영역 표시 여부 + 반경 (m) */
  workspaceRadiusM?: number;
}

export function ViewportHud({
  showScale = true,
  showAxes = true,
  objectLabel,
  workspaceRadiusM,
}: ViewportHudProps) {
  return (
    <>
      {/* Axis indicator — 좌측 하단 (object label 위쪽에 별도 배치) */}
      {showAxes ? (
        <div className="absolute left-3 bottom-12 z-10 pointer-events-none">
          <AxisIndicator />
        </div>
      ) : null}

      {/* Scale bar — axis 아래쪽 (object label 위) */}
      {showScale ? (
        <div className="absolute left-3 bottom-3 z-10 pointer-events-none">
          <ScaleBar />
        </div>
      ) : null}

      {/* Object label chip — 우측 하단 */}
      {objectLabel ? (
        <div className="absolute right-3 bottom-3 z-10 pointer-events-none">
          <ObjectChip label={objectLabel} selected />
        </div>
      ) : null}

      {/* Workspace label — chip 위쪽 */}
      {workspaceRadiusM !== undefined ? (
        <div className="absolute right-3 bottom-12 z-10 pointer-events-none">
          <span
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] px-2 py-0.5 border bg-black/40"
            style={{ borderColor: RISK, color: RISK }}
          >
            WORKSPACE r={workspaceRadiusM.toFixed(1)}m
          </span>
        </div>
      ) : null}
    </>
  );
}

function AxisIndicator() {
  // 32px 축 + 11px 라벨. SVG로 그려서 retina에서도 깔끔.
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      {/* Z (up, green) */}
      <line x1="14" y1="42" x2="14" y2="14" stroke={PASS} strokeWidth="1.5" />
      <polygon points="14,8 11,14 17,14" fill={PASS} />
      <text
        x="20"
        y="14"
        fill={PASS}
        fontSize="11"
        fontFamily="JetBrains Mono, monospace"
        fontWeight="600"
        letterSpacing="0.05em"
      >
        Z
      </text>
      {/* X (right, pink) */}
      <line x1="14" y1="42" x2="42" y2="42" stroke={RISK} strokeWidth="1.5" />
      <polygon points="48,42 42,39 42,45" fill={RISK} />
      <text
        x="42"
        y="38"
        fill={RISK}
        fontSize="11"
        fontFamily="JetBrains Mono, monospace"
        fontWeight="600"
        letterSpacing="0.05em"
      >
        X
      </text>
      {/* Origin */}
      <circle cx="14" cy="42" r="2" fill="#FFFFFF" />
    </svg>
  );
}

function ScaleBar() {
  // 1m 표시 — viewport 카메라가 고정 fov + maxDistance 4 기준이라
  // 80px가 대략 1m 근사값. (정확한 화면 px ↔ world m 환산은
  // Canvas 안의 Drei <Html> 또는 useThree가 필요해 후속 작업으로 이관)
  return (
    <div className="flex flex-col items-start">
      <svg width="80" height="10" viewBox="0 0 80 10" fill="none">
        <line x1="1" y1="3" x2="1" y2="9" stroke="#FFFFFF" strokeWidth="1" />
        <line x1="79" y1="3" x2="79" y2="9" stroke="#FFFFFF" strokeWidth="1" />
        <line x1="1" y1="6" x2="79" y2="6" stroke="#FFFFFF" strokeWidth="1" />
      </svg>
      <span className="mt-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85">
        1.0 m
      </span>
    </div>
  );
}

function ObjectChip({ label, selected }: { label: string; selected: boolean }) {
  if (selected) {
    return (
      <span
        className="inline-flex items-center px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] border"
        style={{
          background: ACCENT,
          color: '#1A1A1A',
          borderColor: ACCENT,
        }}
      >
        {label}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center px-2 py-1 font-mono text-[11px] uppercase tracking-[0.14em] border"
      style={{
        background: '#1F1F23',
        color: '#FFFFFF',
        borderColor: '#6B6B6B',
      }}
    >
      {label}
    </span>
  );
}
