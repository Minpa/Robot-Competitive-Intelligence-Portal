'use client';

/**
 * TrendHeadlinePanel — AI 트렌드 헤드라인 + 통계 타일 행 + 카테고리 분포 가로 바
 * 트렌드가 아직 없어도(브리프 3건 미만) stats만 있으면 통계 타일·분포 바는 표시한다.
 */

import { Panel, KpiTile } from '@/components/ui';
import { formatDate } from '../utils';
import type { EventStats, EventTrendSummary } from '../types';

interface Props {
  trend: EventTrendSummary | null;
  stats: EventStats | null;
}

export function TrendHeadlinePanel({ trend, stats }: Props) {
  if (!trend && !stats) return null;

  const briefedPct =
    stats && stats.totalVideos > 0 ? Math.round((stats.briefedVideos / stats.totalVideos) * 100) : 0;
  const maxCatCount = stats?.categoryDistribution[0]?.count ?? 0;

  return (
    <Panel kicker="WRC 2026 영상 기반 트렌드 요약 (AI 분석)" title={trend?.headline ?? 'WRC 2026 특집 현황'}>
      <div className="space-y-5">
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiTile label="수집 영상" value={stats.totalVideos} unit="건" />
            <KpiTile label="브리프 완료" value={briefedPct} unit="%" context={`${stats.briefedVideos}건`} />
            <KpiTile label="참여 기업" value={stats.uniqueCompanyCount} unit="곳" />
            <KpiTile label="카테고리 수" value={stats.categoryDistribution.length} unit="종" />
          </div>
        )}

        {stats && stats.categoryDistribution.length > 0 && (
          <div className="space-y-1.5">
            {stats.categoryDistribution.map((c) => (
              <div key={c.category} className="flex items-center gap-2">
                <span className="w-24 shrink-0 truncate text-[11px] text-ink-600" title={c.category}>
                  {c.category}
                </span>
                <div className="flex-1 h-2.5 bg-ink-100 rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-info"
                    style={{ width: `${maxCatCount > 0 ? (c.count / maxCatCount) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-[10.5px] font-mono text-ink-500">{c.count}</span>
              </div>
            ))}
          </div>
        )}

        {trend && (
          <p className="border-t border-ink-100 pt-3 text-right text-[10.5px] text-ink-400">
            브리프 {trend.basedOn}건 기반 · {formatDate(trend.generatedAt)}
          </p>
        )}
      </div>
    </Panel>
  );
}
