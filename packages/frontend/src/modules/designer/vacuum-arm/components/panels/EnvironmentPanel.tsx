'use client';

/**
 * EnvironmentPanel · REQ-7
 *
 * Per-target reachability + base traversability summary, shown in the right
 * column when room mode is active or when room has targets.
 */

import { useQuery } from '@tanstack/react-query';
import type { EnvironmentResult, RoomConfig, TargetReachabilityResult } from '../../types/product';
import { designerVacuumApi } from '../../api/designer-vacuum-api';

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
      <div className="space-y-2 border-t border-white/10 pt-4 mt-4">
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/45">
          Environment Fit · REQ-7
        </span>
        <p className="text-[10.5px] text-white/55 leading-relaxed">
          [방 에디터] 탭에서 가구·장애물·타겟을 추가하면 도달성 / 통과 가능 영역 분석이 표시됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t border-white/10 pt-4 mt-4">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/45">
          Environment Fit · REQ-7
        </span>
        {isLoading ? (
          <span className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-gold/70">▸ 분석 중</span>
        ) : null}
      </div>

      {/* Traversability summary */}
      {environment?.traversability ? (
        <div className="grid grid-cols-2 gap-1.5">
          <Stat
            label="통과 가능 영역"
            value={`${environment.traversability.coveragePct.toFixed(1)}%`}
            highlight={environment.traversability.coveragePct < 60 ? '#F2A93B' : '#3acc6f'}
          />
          <Stat
            label="차단 장애물"
            value={`${environment.traversability.blockedObstacleIndices.length} / ${room.obstacles.length}개`}
          />
          <Stat
            label="베이스 클리어런스"
            value={`${environment.traversability.groundClearanceCm.toFixed(1)} cm`}
          />
          <Stat
            label="바닥 면적"
            value={`${(environment.traversability.reachableFloorAreaCm2 / 10000).toFixed(2)} m²`}
          />
        </div>
      ) : null}

      {/* Per-target reachability */}
      <div className="space-y-1">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/45">
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
              className="flex items-start gap-2 border border-white/10 px-2 py-1.5"
              style={{ borderLeftColor: status.color, borderLeftWidth: 2 }}
            >
              <span className="font-mono text-[14px] leading-none mt-0.5" style={{ color: status.color }}>
                {status.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-white truncate">
                    {spec?.name ?? `타겟 ${i + 1}`}
                  </span>
                  <span className="font-mono text-[9px] text-white/50 tabular-nums shrink-0 ml-2">
                    ({t.xCm.toFixed(0)}, {t.yCm.toFixed(0)}, z {t.zCm.toFixed(0)}) cm
                  </span>
                </div>
                <p className="text-[10px] mt-0.5 leading-snug" style={{ color: status.color }}>
                  {result?.reasonText ?? '대기 중…'}
                </p>
                {result?.canReach && result.payloadMarginKg !== 0 ? (
                  <p className="font-mono text-[9px] text-white/40 mt-0.5">
                    payload margin {result.payloadMarginKg > 0 ? '+' : ''}
                    {result.payloadMarginKg.toFixed(2)} kg ·
                    팔 {result.armUsed !== null ? result.armUsed + 1 : '-'}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function reachabilityStatus(r: TargetReachabilityResult | undefined): { icon: string; color: string } {
  if (!r) return { icon: '○', color: 'rgba(255,255,255,0.35)' };
  if (r.canReach) return { icon: '✓', color: '#3acc6f' };
  if (r.reason === 'BASE_BLOCKED' || r.reason === 'HEIGHT_OUT_OF_REACH') {
    return { icon: '⚠', color: '#F2A93B' };
  }
  return { icon: '✗', color: '#E63950' };
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: string;
}) {
  return (
    <div className="border border-white/10 px-2 py-1">
      <span className="block text-[9.5px] text-white/50">{label}</span>
      <span
        className="block font-mono text-[11px] tabular-nums mt-0.5"
        style={{ color: highlight ?? '#fff' }}
      >
        {value}
      </span>
    </div>
  );
}
