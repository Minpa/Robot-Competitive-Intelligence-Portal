'use client';

/**
 * EnvironmentPanel · REQ-7
 *
 * Light theme per ARGOS-UX-Spec.
 *   - 2x2 KPI grid (통과 영역 / 차단 / 클리어런스 / 면적)
 *   - 타겟 도달성 카드 — PASS/WARN/FAIL chip + 사유 + payload 마진
 */

import { useQuery } from '@tanstack/react-query';
import type { EnvironmentResult, RoomConfig, TargetReachabilityResult } from '../../types/product';
import { designerVacuumApi } from '../../api/designer-vacuum-api';

const ACCENT = '#D4A22F';
const RISK = '#D63F6F';
const PASS = '#3F8C6E';

interface EnvironmentPanelProps {
  room: RoomConfig;
  environment: EnvironmentResult | null;
  isLoading: boolean;
}

export function EnvironmentPanel({ room, environment, isLoading }: EnvironmentPanelProps) {
  const targetsQ = useQuery({
    queryKey: ['vacuum-arm', 'target-objects'],
    queryFn: () => designerVacuumApi.listTargetObjects(),
    staleTime: 5 * 60_000,
  });
  const targetCatalog = targetsQ.data?.targetObjects ?? [];

  if (room.targets.length === 0 && room.obstacles.length === 0) {
    return (
      <div className="space-y-3 border-t border-designer-rule pt-6 mt-6">
        <SectionLabel>Environment Fit · REQ-7</SectionLabel>
        <p className="text-[15px] text-designer-muted leading-relaxed">
          [방 에디터] 탭에서 가구·장애물·타겟을 추가하면 도달성 / 통과 가능 영역 분석이 표시됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 border-t border-designer-rule pt-6 mt-6">
      <div className="flex items-baseline justify-between">
        <SectionLabel>Environment Fit · REQ-7</SectionLabel>
        {isLoading ? (
          <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-designer-accent">
            ▸ 분석 중
          </span>
        ) : null}
      </div>

      {/* KPI grid */}
      {environment?.traversability ? (
        <div className="grid grid-cols-2 gap-3">
          <KpiCard
            label="통과 영역"
            value={environment.traversability.coveragePct.toFixed(1)}
            unit="%"
            status={
              environment.traversability.coveragePct >= 80
                ? { label: 'PASS', color: PASS }
                : environment.traversability.coveragePct >= 60
                  ? { label: 'WARN', color: ACCENT }
                  : { label: 'FAIL', color: RISK }
            }
          />
          <KpiCard
            label="차단 장애물"
            value={`${environment.traversability.blockedObstacleIndices.length}`}
            unit={`/ ${room.obstacles.length}`}
          />
          <KpiCard
            label="베이스 클리어런스"
            value={environment.traversability.groundClearanceCm.toFixed(1)}
            unit="cm"
          />
          <KpiCard
            label="바닥 면적"
            value={(environment.traversability.reachableFloorAreaCm2 / 10000).toFixed(2)}
            unit="m²"
          />
        </div>
      ) : null}

      {/* Per-target reachability */}
      <div className="space-y-2">
        <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-designer-muted">
          타겟 도달성 ({room.targets.length}개)
        </span>
        {room.targets.map((t, i) => {
          const result: TargetReachabilityResult | undefined = environment?.targets.find(
            (x) => x.targetMarkerIndex === i
          );
          const spec = targetCatalog.find((c) => c.id === t.targetObjectId);
          const status = reachabilityStatus(result);
          return (
            <div
              key={i}
              className="border border-designer-rule bg-designer-card p-3"
              style={{ borderLeftColor: status.color, borderLeftWidth: 3 }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[15px] font-medium text-designer-ink truncate">
                  {spec?.name ?? `타겟 ${i + 1}`}
                </span>
                <span className="font-mono text-[13px] text-designer-muted tabular-nums shrink-0">
                  ({t.xCm.toFixed(0)}, {t.yCm.toFixed(0)}, z {t.zCm.toFixed(0)})
                </span>
              </div>
              <p className="text-[13px] mt-1 leading-snug" style={{ color: status.color }}>
                <span className="font-mono font-semibold mr-1">{status.label}</span>
                {result?.reasonText ?? '대기 중…'}
              </p>
              {result?.canReach && result.payloadMarginKg !== 0 ? (
                <p className="font-mono text-[13px] text-designer-muted mt-1">
                  payload margin {result.payloadMarginKg > 0 ? '+' : ''}
                  {result.payloadMarginKg.toFixed(2)} kg ·
                  팔 {result.armUsed !== null ? result.armUsed + 1 : '-'}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-designer-muted">
      {children}
    </span>
  );
}

function KpiCard({
  label,
  value,
  unit,
  status,
}: {
  label: string;
  value: string;
  unit: string;
  status?: { label: string; color: string };
}) {
  return (
    <div className="border border-designer-rule bg-designer-card p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-medium text-designer-muted">{label}</span>
        {status ? (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 border font-mono text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{ borderColor: status.color, color: status.color }}
          >
            <span className="block h-1 w-1 rounded-full" style={{ background: status.color }} />
            {status.label}
          </span>
        ) : null}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="font-mono text-[28px] font-semibold leading-none tabular-nums text-designer-ink">
          {value}
        </span>
        {unit ? (
          <span className="font-mono text-[15px] tabular-nums text-designer-muted">{unit}</span>
        ) : null}
      </div>
    </div>
  );
}

function reachabilityStatus(r: TargetReachabilityResult | undefined): { label: string; color: string } {
  if (!r) return { label: '대기', color: '#6B6B6B' };
  if (r.canReach) return { label: 'PASS', color: PASS };
  if (r.reason === 'BASE_BLOCKED' || r.reason === 'HEIGHT_OUT_OF_REACH') {
    return { label: 'WARN', color: ACCENT };
  }
  return { label: 'FAIL', color: RISK };
}
