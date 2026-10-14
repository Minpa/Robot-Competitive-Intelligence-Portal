'use client';

/**
 * (c) 서브토픽 × 기간 히트맵 — div 그리드 (recharts에 히트맵 없음).
 * 셀 색은 선택한 소스의 단일 색 농도(4단계), 숫자는 항상 표시해 색에만 의존하지 않는다. 값 0은 빈 셀.
 * 월/분기 열 변환은 서버(heatmap.columns)에서 끝났다.
 */

import type { TimelineHeatmap, TimelineTopic } from '@/types/tech-trend-timeline';
import {
  SOURCE_COLOR,
  SOURCE_LABEL,
  SOURCE_UNIT,
  SegmentedToggle,
  SubCard,
  type TimelineBasis,
  type TimelineSourceKey,
} from './timeline-shared';

/** 농도 4단계 (0~25%, ~50%, ~75%, ~100% 구간) — 같은 hue의 투명도 단계 */
const STEP_OPACITY = [0.18, 0.4, 0.68, 1] as const;

function stepOf(value: number, max: number): 0 | 1 | 2 | 3 {
  const ratio = max > 0 ? value / max : 0;
  if (ratio <= 0.25) return 0;
  if (ratio <= 0.5) return 1;
  if (ratio <= 0.75) return 2;
  return 3;
}

interface Props {
  heatmap: TimelineHeatmap;
  topics: TimelineTopic[];
  source: TimelineSourceKey;
  basis: TimelineBasis;
  onSourceChange: (s: TimelineSourceKey) => void;
  onBasisChange: (b: TimelineBasis) => void;
}

export function TopicHeatmap({ heatmap, topics, source, basis, onSourceChange, onBasisChange }: Props) {
  const color = SOURCE_COLOR[source];
  const unit = SOURCE_UNIT[source];
  const topicById = new Map(topics.map((t) => [t.id, t] as const));
  const max = Math.max(0, ...heatmap.rows.flatMap((r) => r[source][basis]));
  const cols = heatmap.columns;
  const gridTemplate = `minmax(112px,164px) repeat(${cols.length}, minmax(40px,1fr)) 52px`;
  const periodWord = heatmap.granularity === 'quarter' ? '분기' : '월';

  return (
    <SubCard
      title="서브토픽 × 기간 히트맵"
      description={`${SOURCE_LABEL[source]} 기준 · ${periodWord} 단위 · 셀 숫자는 건수입니다.`}
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
      <div className="overflow-x-auto">
        <div
          className="grid gap-1 items-center min-w-[420px]"
          style={{ gridTemplateColumns: gridTemplate }}
          role="table"
          aria-label={`서브토픽별 ${periodWord} ${SOURCE_LABEL[source]} 건수 히트맵`}
        >
          <div role="columnheader" className="text-[10.5px] text-ink-500">
            서브토픽 \ {periodWord}
          </div>
          {cols.map((c) => (
            <div key={c.key} role="columnheader" className="text-[10.5px] text-ink-600 text-center leading-tight">
              {c.label}
              {c.partial && <span className="block text-warn">(집계 중)</span>}
            </div>
          ))}
          <div role="columnheader" className="text-[10.5px] text-ink-500 text-right">
            합계
          </div>

          {heatmap.rows.map((row) => {
            const topic = topicById.get(row.topicId);
            const values = row[source][basis];
            const rowTotal = topic?.totals[source][basis] ?? 0;
            const name = topic?.shortLabel ?? row.topicId;
            return (
              <div key={row.topicId} role="row" className="contents">
                <div role="rowheader" className="text-[12px] text-ink-800 truncate pr-1" title={topic?.label ?? name}>
                  {name}
                </div>
                {cols.map((c, i) => {
                  const v = values[i] ?? 0;
                  const tip = `${name} · ${c.label}${c.partial ? '(집계 중)' : ''} · ${v}${unit}`;
                  if (v === 0) {
                    return (
                      <div
                        key={c.key}
                        role="cell"
                        title={tip}
                        aria-label={tip}
                        className="h-8 rounded-[4px] bg-ink-50 flex items-center justify-center text-[11px] text-ink-300"
                      >
                        0
                      </div>
                    );
                  }
                  const step = stepOf(v, max);
                  return (
                    <div
                      key={c.key}
                      role="cell"
                      title={tip}
                      aria-label={tip}
                      className="relative h-8 rounded-[4px] overflow-hidden flex items-center justify-center bg-ink-50 [print-color-adjust:exact] [-webkit-print-color-adjust:exact]"
                    >
                      <span
                        aria-hidden
                        className="absolute inset-0"
                        style={{ backgroundColor: color, opacity: STEP_OPACITY[step] }}
                      />
                      <span
                        className={`relative text-[12px] font-semibold ${step === 3 ? 'text-white' : 'text-ink-900'}`}
                      >
                        {v}
                      </span>
                    </div>
                  );
                })}
                <div role="cell" className="text-[12px] text-ink-700 text-right font-medium">
                  {rowTotal}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-500">
        <span>적음</span>
        {STEP_OPACITY.map((o, i) => (
          <span
            key={i}
            aria-hidden
            className="relative inline-block w-6 h-3 rounded-[3px] overflow-hidden bg-ink-50 [print-color-adjust:exact] [-webkit-print-color-adjust:exact]"
          >
            <span className="absolute inset-0" style={{ backgroundColor: color, opacity: o }} />
          </span>
        ))}
        <span>많음</span>
        <span className="ml-2">· 최대 {max}{unit} 대비 4단계 · 0건은 빈 칸</span>
      </div>
    </SubCard>
  );
}
