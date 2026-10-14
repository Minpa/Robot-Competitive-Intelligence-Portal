'use client';

/**
 * (b) 서브토픽별 월별 추이 — 소형 다중 차트.
 * 토픽이 10개라 6색 팔레트의 스택 영역은 색 혼동이 생기고, 월 점이 적어 기저선 이동으로 개별 추이를 읽기 어렵다.
 * 각 칸은 선택한 소스의 단일 색 면적, 토픽 구분은 칸 제목, 모든 칸이 Y 최대값을 공유한다.
 */

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { TimelineBucket, TimelineTopic } from '@/types/tech-trend-timeline';
import {
  SOURCE_COLOR,
  SOURCE_LABEL,
  SOURCE_UNIT,
  SegmentedToggle,
  SubCard,
  TREND_BADGE,
  fullMonth,
  shortMonth,
  type TimelineBasis,
  type TimelineSourceKey,
} from './timeline-shared';

interface Props {
  topics: TimelineTopic[];
  buckets: TimelineBucket[];
  source: TimelineSourceKey;
  basis: TimelineBasis;
  onSourceChange: (s: TimelineSourceKey) => void;
  onBasisChange: (b: TimelineBasis) => void;
}

interface Point {
  month: string;
  label: string;
  value: number;
  partial: boolean;
}

function CellTooltip({
  active,
  payload,
  topicLabel,
  unit,
}: {
  active?: boolean;
  payload?: { payload: Point }[];
  topicLabel: string;
  unit: string;
}) {
  const p = active ? payload?.[0]?.payload : undefined;
  if (!p) return null;
  return (
    <div className="bg-white border border-ink-200 rounded-[8px] px-2.5 py-1.5 text-[11.5px] shadow-report">
      <p className="text-ink-900 font-medium">
        {fullMonth(p.month)} · {topicLabel} · {p.value}
        {unit}
      </p>
      {p.partial && <p className="text-warn">집계 중(월 진행 중)</p>}
    </div>
  );
}

export function TopicSmallMultiples({ topics, buckets, source, basis, onSourceChange, onBasisChange }: Props) {
  const shown = topics.filter((t) => t.id !== 'other').sort((a, b) => a.order - b.order);
  const color = SOURCE_COLOR[source];
  const unit = SOURCE_UNIT[source];

  const seriesOf = (topicId: string): Point[] =>
    buckets.map((b) => ({
      month: b.month,
      label: shortMonth(b.month),
      value: b[source].byTopic[topicId]?.[basis] ?? 0,
      partial: b.partial,
    }));

  const all = shown.map((t) => ({ topic: t, points: seriesOf(t.id) }));
  const yMax = Math.max(1, ...all.flatMap((a) => a.points.map((p) => p.value)));
  const firstLabel = buckets[0] ? shortMonth(buckets[0].month) : '';
  const lastLabel = buckets.length > 0 ? shortMonth(buckets[buckets.length - 1]!.month) : '';

  return (
    <SubCard
      title="서브토픽별 월별 추이"
      description={`${SOURCE_LABEL[source]} 기준 · 모든 칸의 Y축 최대값(${yMax})을 공유합니다.`}
      right={
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <SegmentedToggle
            label="소스"
            value={source}
            onChange={onSourceChange}
            options={[
              { value: 'papers', label: '논문' },
              { value: 'videos', label: '영상' },
            ]}
          />
          <SegmentedToggle
            label="집계 기준"
            value={basis}
            onChange={onBasisChange}
            options={[
              { value: 'any', label: '복수 주제 포함' },
              { value: 'primary', label: '주요 주제만' },
            ]}
          />
        </div>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {all.map(({ topic, points }) => {
          const total = topic.totals[source][basis];
          const badge = TREND_BADGE[topic.trend[source].label];
          return (
            <div key={topic.id} className="border border-ink-200 rounded-[8px] p-2.5 flex flex-col gap-1 min-w-0">
              <p className="text-[12px] font-semibold text-ink-900 leading-tight truncate" title={topic.label}>
                {topic.shortLabel}
              </p>
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-[12px] text-ink-700">
                  <span className="font-semibold">{total}</span>
                  {unit}
                </span>
                <span className={`text-[10.5px] font-medium ${badge.className}`}>{badge.text}</span>
              </div>
              {total === 0 ? (
                <div className="h-[72px] flex items-center justify-center text-[11px] text-ink-400">데이터 없음</div>
              ) : (
                <div className="h-[72px]" role="img" aria-label={`${topic.label} 월별 ${SOURCE_LABEL[source]} 추이`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                      <XAxis dataKey="label" hide />
                      <YAxis hide domain={[0, yMax]} allowDecimals={false} />
                      <Tooltip
                        content={<CellTooltip topicLabel={topic.shortLabel} unit={unit} />}
                        cursor={{ strokeDasharray: '3 3' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={1.75}
                        fill={color}
                        fillOpacity={0.2}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="flex items-center justify-between text-[10px] text-ink-500">
                <span>{firstLabel}</span>
                <span>최대 {yMax}</span>
                <span>{lastLabel}</span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-ink-500">
        복수 주제 포함은 한 건이 최대 3개 토픽에 중복 집계되어 합계가 실제 건수보다 클 수 있고, 주요 주제만은 건당 1개 토픽에만
        집계됩니다. 마지막 달은 집계 중입니다. 미분류 건은 이 차트에서 제외됩니다.
      </p>
    </SubCard>
  );
}
