'use client';

/**
 * (a) 월별 논문·영상 건수 — 묶음 막대, 단일 정수 Y축.
 * 월은 이산 버킷이고 데이터 점이 적어 면적 차트보다 막대가 값을 정직하게 보여준다.
 * 건수 = 버킷 total (핸드 무관 제외, 미분류 포함) — 분류 없이도 렌더된다.
 */

import { BarChart, Bar, Cell, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { TimelineBucket } from '@/types/tech-trend-timeline';
import {
  SOURCE_COLOR,
  SOURCE_LABEL,
  SOURCE_UNIT,
  MUTED_COLOR,
  LegendChip,
  SubCard,
  XTick,
  YTick,
  shortMonth,
  fullMonth,
} from './timeline-shared';

interface Datum {
  month: string;
  label: string;
  papers: number;
  videos: number;
  partial: boolean;
  beforeCollection: boolean;
}

function VolumeTooltip({ active, payload }: { active?: boolean; payload?: { payload: Datum }[] }) {
  const d = active ? payload?.[0]?.payload : undefined;
  if (!d) return null;
  return (
    <div className="bg-white border border-ink-200 rounded-[8px] px-3 py-2 text-[12px] shadow-report">
      <p className="text-ink-900 font-medium">
        {fullMonth(d.month)} · 논문 {d.papers}
        {SOURCE_UNIT.papers} · 영상 {d.videos}
        {SOURCE_UNIT.videos}
      </p>
      {d.partial && <p className="text-warn mt-0.5">집계 중(월 진행 중)</p>}
      {d.beforeCollection && <p className="text-ink-500 mt-0.5">수집 시작 이전 월(소급 게시분)</p>}
    </div>
  );
}

export function TimelineVolumeChart({ buckets }: { buckets: TimelineBucket[] }) {
  const data: Datum[] = buckets.map((b) => ({
    month: b.month,
    label: shortMonth(b.month),
    papers: b.papers.total,
    videos: b.videos.total,
    partial: b.partial,
    beforeCollection: b.beforeCollection,
  }));
  const hasBefore = data.some((d) => d.beforeCollection);

  return (
    <SubCard
      title="월별 수집 건수"
      description="논문(arXiv)과 영상의 월별 건수 — 동일한 Y축 기준입니다."
      right={
        <div className="flex flex-wrap items-center gap-3">
          <LegendChip color={SOURCE_COLOR.papers} label={SOURCE_LABEL.papers} />
          <LegendChip color={SOURCE_COLOR.videos} label={SOURCE_LABEL.videos} />
          <LegendChip color={SOURCE_COLOR.papers} label="진행 중인 월(연한 색)" muted />
          {hasBefore && <LegendChip color={MUTED_COLOR} label="수집 시작 이전 월" />}
        </div>
      }
    >
      <p className="text-[11px] text-ink-500">건수 (Y축)</p>
      <div style={{ height: 240 }} role="img" aria-label="월별 논문·영상 수집 건수 막대 차트">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-ink-100" />
            <XAxis dataKey="label" tick={<XTick />} axisLine={false} tickLine={false} interval={0} />
            <YAxis allowDecimals={false} tick={<YTick />} axisLine={false} tickLine={false} width={32} />
            <Tooltip content={<VolumeTooltip />} cursor={{ className: 'fill-ink-50' }} />
            <Legend content={() => null} />
            <Bar dataKey="papers" name={SOURCE_LABEL.papers} radius={[2, 2, 0, 0]} isAnimationActive={false}>
              {data.map((d) => (
                <Cell
                  key={d.month}
                  fill={d.beforeCollection ? MUTED_COLOR : SOURCE_COLOR.papers}
                  fillOpacity={d.partial ? 0.45 : 1}
                />
              ))}
            </Bar>
            <Bar dataKey="videos" name={SOURCE_LABEL.videos} radius={[2, 2, 0, 0]} isAnimationActive={false}>
              {data.map((d) => (
                <Cell
                  key={d.month}
                  fill={d.beforeCollection ? MUTED_COLOR : SOURCE_COLOR.videos}
                  fillOpacity={d.partial ? 0.45 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-ink-500 text-center">월 (UTC 기준 YY.MM)</p>
    </SubCard>
  );
}
