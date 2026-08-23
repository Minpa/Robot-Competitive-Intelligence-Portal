'use client';

/**
 * TagCloud — 참여 기업 · 기술 키워드 칩 클라우드 (2단, 빈도 기반 크기/톤 3단계)
 * 칩을 클릭하면 해당 태그로 영상 리스트를 필터링한다(재클릭 시 해제). 데이터가 없으면 Panel 자체를 렌더링하지 않는다.
 */

import { Panel, Kicker } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { EventStats } from '../types';

export interface TagSelection {
  type: 'company' | 'keyword';
  name: string;
}

function tierClasses(rank: number, total: number): string {
  const ratio = total > 1 ? rank / (total - 1) : 0;
  if (ratio < 0.34) return 'text-[13px] font-semibold border-info-soft bg-info-soft text-info';
  if (ratio < 0.67) return 'text-[11.5px] font-medium border-ink-200 bg-ink-100 text-ink-700';
  return 'text-[10.5px] border-ink-100 bg-ink-50 text-ink-500';
}

function ChipGroup({
  title,
  type,
  items,
  selected,
  onSelect,
}: {
  title: string;
  type: TagSelection['type'];
  items: { name: string; count: number }[];
  selected: TagSelection | null;
  onSelect: (tag: TagSelection) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <Kicker>{title}</Kicker>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((it, i) => {
          const isSelected = selected?.type === type && selected.name === it.name;
          return (
            <button
              key={it.name}
              onClick={() => onSelect({ type, name: it.name })}
              aria-pressed={isSelected}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 transition-colors',
                tierClasses(i, items.length),
                isSelected
                  ? 'ring-2 ring-ink-900 ring-offset-1'
                  : 'hover:border-ink-400'
              )}
            >
              {it.name}
              <span className="font-mono text-[9px] opacity-70">{it.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TagCloud({
  stats,
  selected,
  onSelect,
}: {
  stats: EventStats | null;
  selected: TagSelection | null;
  onSelect: (tag: TagSelection) => void;
}) {
  if (!stats || (stats.topCompanies.length === 0 && stats.topKeywords.length === 0)) return null;

  return (
    <Panel
      kicker="Tag Cloud"
      title="등장 기업 · 기술 키워드"
      subtitle="브리프 완료 영상 기준 빈도 상위 태그입니다. 태그를 클릭하면 해당 영상만 모아 볼 수 있습니다. 상단 차트에 없는 태그도 여기서 모두 확인·필터할 수 있습니다."
    >
      <div className="grid sm:grid-cols-2 gap-6">
        <ChipGroup title="참여 기업" type="company" items={stats.topCompanies} selected={selected} onSelect={onSelect} />
        <ChipGroup title="기술 키워드" type="keyword" items={stats.topKeywords} selected={selected} onSelect={onSelect} />
      </div>
    </Panel>
  );
}
