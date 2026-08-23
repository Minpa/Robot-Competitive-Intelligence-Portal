'use client';

/**
 * TrendHeadlinePanel — AI 트렌드 헤드라인 + 히어로 숫자 밴드(B-1) +
 * 기업 막대(B-2) / 카테고리 100% 스택바(B-3) / 주간 업로드 타임라인(B-4)
 * 트렌드가 아직 없어도(브리프 3건 미만) stats만 있으면 히어로·차트는 표시한다.
 */

import { Panel } from '@/components/ui';
import { formatDate } from '../utils';
import type { EventStats, EventTrendSummary } from '../types';
import type { TagSelection } from './TagCloud';
import { CompanyBarChart } from './CompanyBarChart';
import { CategoryStackBar } from './CategoryStackBar';
import { WeeklyTimelineChart } from './WeeklyTimelineChart';

interface Props {
  trend: EventTrendSummary | null;
  stats: EventStats | null;
  onSelectTag: (tag: TagSelection) => void;
  selectedTag: TagSelection | null;
}

function HeroTile({
  label,
  value,
  unit,
  context,
  onClick,
}: {
  label: string;
  value: string | number;
  unit?: string;
  context?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <p className="text-[11px] text-ink-500">{label}</p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-[32px] font-bold leading-none text-ink-900 tracking-tight truncate">{value}</span>
        {unit && <span className="font-mono text-[11px] text-ink-500">{unit}</span>}
      </div>
      {context && <p className="mt-1 text-[10.5px] font-mono text-ink-400">{context}</p>}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="text-left bg-white border border-ink-200 rounded-[14px] p-4 hover:border-ink-400 hover:ring-1 hover:ring-info transition-shadow"
      >
        {content}
      </button>
    );
  }
  return <div className="bg-white border border-ink-200 rounded-[14px] p-4">{content}</div>;
}

export function TrendHeadlinePanel({ trend, stats, onSelectTag, selectedTag }: Props) {
  if (!trend && !stats) return null;

  const briefedPct =
    stats && stats.totalVideos > 0 ? Math.round((stats.briefedVideos / stats.totalVideos) * 100) : 0;
  const topCompany = stats?.topCompanies[0] ?? null;

  const hasCharts =
    !!stats &&
    (stats.topCompanies.length > 0 || stats.categoryDistribution.length > 0 || stats.weeklyUploads.length > 1);

  return (
    <div className="space-y-4">
      <Panel kicker="WRC 2026 영상 기반 트렌드 요약 (AI 분석)" title={trend?.headline ?? 'WRC 2026 특집 현황'}>
        <div className="space-y-5">
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <HeroTile label="수집 영상" value={stats.totalVideos} unit="건" />
              <HeroTile
                label="브리프 완료율"
                value={briefedPct}
                unit="%"
                context={`${stats.briefedVideos}/${stats.totalVideos}건`}
              />
              <HeroTile label="참여 기업" value={stats.uniqueCompanyCount} unit="곳" />
              <HeroTile
                label="최다 등장 기업"
                value={topCompany ? topCompany.name : '데이터 없음'}
                context={topCompany ? `${topCompany.count}건` : undefined}
                onClick={topCompany ? () => onSelectTag({ type: 'company', name: topCompany.name }) : undefined}
              />
            </div>
          )}

          {trend && (
            <p className="border-t border-ink-100 pt-3 text-right text-[10.5px] text-ink-400">
              브리프 {trend.basedOn}건 기반 · {formatDate(trend.generatedAt)}
            </p>
          )}
        </div>
      </Panel>

      {hasCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CompanyBarChart companies={stats!.topCompanies} onSelect={onSelectTag} selected={selectedTag} />
          <div className="space-y-4">
            <CategoryStackBar categoryDistribution={stats!.categoryDistribution} />
            <WeeklyTimelineChart weeklyUploads={stats!.weeklyUploads} />
          </div>
        </div>
      )}
    </div>
  );
}
