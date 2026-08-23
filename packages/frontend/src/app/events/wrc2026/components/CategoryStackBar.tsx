'use client';

/**
 * CategoryStackBar (B-3) — 카테고리 분포 100% 스택바 (flex+div 기반, 단일 행)
 * count desc 상위 6 + 나머지 '기타' 합산, % 정규화(마지막 세그먼트에서 반올림 오차 보정).
 * 세그먼트 간 2px 흰 경계선, %<8이면 내부 라벨 생략(하단 범례에는 항상 표시), title 속성 툴팁.
 * 카테고리 색은 검증된 팔레트를 count desc 순서로 인덱스 0부터 배정, '기타'는 항상 마지막 회색.
 */

import { Panel } from '@/components/ui';
import { CATEGORY_PALETTE, CATEGORY_OTHER } from './chartColors';

interface Props {
  categoryDistribution: { category: string; count: number }[];
}

interface Segment {
  category: string;
  count: number;
  pct: number;
  color: string;
}

function buildSegments(dist: { category: string; count: number }[]): Segment[] {
  const total = dist.reduce((s, d) => s + d.count, 0);
  if (total === 0) return [];

  const top = dist.slice(0, 6);
  const restCount = dist.slice(6).reduce((s, d) => s + d.count, 0);

  const raw = top.map((d, i) => ({
    category: d.category,
    count: d.count,
    color: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
  }));
  if (restCount > 0) raw.push({ category: '기타', count: restCount, color: CATEGORY_OTHER });

  const rounded = raw.map((r) => Math.round((r.count / total) * 100));
  const sum = rounded.reduce((s, p) => s + p, 0);
  if (rounded.length > 0) rounded[rounded.length - 1] += 100 - sum;

  return raw.map((r, i) => ({ ...r, pct: rounded[i] }));
}

export function CategoryStackBar({ categoryDistribution }: Props) {
  const segments = buildSegments(categoryDistribution);
  if (segments.length === 0) return null;

  return (
    <Panel kicker="Category Mix" title="카테고리 분포">
      <div className="space-y-3">
        <div className="flex w-full h-7 rounded-sm overflow-hidden">
          {segments.map((s, i) => (
            <div
              key={s.category}
              title={`${s.category} · ${s.count}건 · ${s.pct}%`}
              className="box-border h-full flex items-center justify-center overflow-hidden"
              style={{
                width: `${s.pct}%`,
                backgroundColor: s.color,
                borderRight: i < segments.length - 1 ? '2px solid #fff' : undefined,
              }}
            >
              {s.pct >= 8 && <span className="text-[10px] font-medium text-white truncate px-1">{s.pct}%</span>}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {segments.map((s) => (
            <div key={s.category} className="flex items-center gap-1.5 text-[11px] text-ink-600">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
              <span>{s.category}</span>
              <span className="font-mono text-ink-400">
                {s.count}건 · {s.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
