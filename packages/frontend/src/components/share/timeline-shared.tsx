'use client';

/**
 * 기술 시계열 섹션 공용 조각 — 색 의미 고정(논문/영상), 라벨 포맷, 토글, 축 틱.
 * 색은 chartColors 토큰만 사용하고 새 hex를 정의하지 않는다. 계산 로직 없음(표시 변환만).
 */

import { CATEGORY_PALETTE, CATEGORY_OTHER, CHART_HUE_MUTED } from '@/app/events/wrc2026/components/chartColors';
import { cn } from '@/lib/utils';
import type { TrendLabel, LeadLagRelation } from '@/types/tech-trend-timeline';

export type TimelineSourceKey = 'papers' | 'videos';
export type TimelineBasis = 'any' | 'primary';

/** 섹션 전체에서 의미 고정: 논문 = 팔레트[0], 영상 = 팔레트[1] */
export const SOURCE_COLOR: Record<TimelineSourceKey, string> = {
  papers: CATEGORY_PALETTE[0] as string,
  videos: CATEGORY_PALETTE[1] as string,
};
export const SOURCE_LABEL: Record<TimelineSourceKey, string> = { papers: '논문', videos: '영상' };
export const SOURCE_UNIT: Record<TimelineSourceKey, string> = { papers: '편', videos: '건' };
/** 진행 중인 월·수집 이전 월 */
export const MUTED_COLOR = CHART_HUE_MUTED;
/** 미분류·기타 */
export const OTHER_COLOR = CATEGORY_OTHER;

/** '2026-09' → '26.09' (X축 라벨) */
export function shortMonth(month: string): string {
  return `${month.slice(2, 4)}.${month.slice(5, 7)}`;
}

/** '2026-09' → '2026.09' (툴팁) */
export function fullMonth(month: string): string {
  return month.replace('-', '.');
}

export const TREND_BADGE: Record<TrendLabel, { text: string; className: string }> = {
  rising: { text: '▲ 증가', className: 'text-pos' },
  falling: { text: '▼ 감소', className: 'text-neg' },
  steady: { text: '― 보합', className: 'text-ink-600' },
  insufficient: { text: '데이터 부족', className: 'text-ink-500' },
};

export function leadLagText(relation: LeadLagRelation, lagMonths: number | null): string {
  switch (relation) {
    case 'paper_leads':
      return `논문 선행 ${lagMonths ?? 0}개월`;
    case 'video_leads':
      return `영상 선행 ${lagMonths ?? 0}개월`;
    case 'concurrent':
      return '동시';
    default:
      return '판단 유보';
  }
}

interface ToggleOption<T extends string> {
  value: T;
  label: string;
}

/** 인쇄 시 숨김(no-print) 세그먼트 토글 */
export function SegmentedToggle<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ToggleOption<T>[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="no-print flex items-center gap-2">
      <span className="text-[11px] text-ink-500">{label}</span>
      <div role="group" aria-label={label} className="inline-flex border border-ink-200 rounded-[8px] overflow-hidden">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              'px-2.5 py-1 text-[12px] font-medium transition-colors',
              value === o.value ? 'bg-brand text-white' : 'bg-white text-ink-700 hover:bg-ink-50'
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** 범례 칩 (색 + 글자) */
export function LegendChip({ color, label, muted = false }: { color: string; label: string; muted?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-600">
      <span
        aria-hidden
        className="inline-block w-2.5 h-2.5 rounded-[2px]"
        style={{ backgroundColor: color, opacity: muted ? 0.45 : 1 }}
      />
      {label}
    </span>
  );
}

/** recharts 축 틱 — 색은 tailwind 토큰(fill-ink-600) 사용 */
export function XTick(props: { x?: number; y?: number; payload?: { value: string } }) {
  const { x = 0, y = 0, payload } = props;
  return (
    <text x={x} y={y} dy={12} textAnchor="middle" className="fill-ink-600" fontSize={11}>
      {payload?.value}
    </text>
  );
}

export function YTick(props: { x?: number; y?: number; payload?: { value: number } }) {
  const { x = 0, y = 0, payload } = props;
  return (
    <text x={x} y={y} dy={4} textAnchor="end" className="fill-ink-600" fontSize={11}>
      {payload?.value}
    </text>
  );
}

/** 카드 래퍼 — 인쇄 시 쪼개지지 않도록 report-panel */
export function SubCard({
  title,
  description,
  right,
  children,
}: {
  title: string;
  description?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="report-panel border border-ink-200 rounded-[10px] bg-white p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-[14px] font-semibold text-ink-900">{title}</h4>
          {description && <p className="text-[11.5px] text-ink-500 mt-0.5">{description}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}
