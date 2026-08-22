'use client';

/**
 * TagCloud — 참여 기업 · 기술 키워드 칩 클라우드 (2단, 빈도 기반 크기/톤 3단계)
 * 표시 전용이며 클릭 필터는 없다. 데이터가 없으면 Panel 자체를 렌더링하지 않는다.
 */

import { Panel, Kicker } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { EventStats } from '../types';

function tierClasses(rank: number, total: number): string {
  const ratio = total > 1 ? rank / (total - 1) : 0;
  if (ratio < 0.34) return 'text-[13px] font-semibold border-info-soft bg-info-soft text-info';
  if (ratio < 0.67) return 'text-[11.5px] font-medium border-ink-200 bg-ink-100 text-ink-700';
  return 'text-[10.5px] border-ink-100 bg-ink-50 text-ink-500';
}

function ChipGroup({ title, items }: { title: string; items: { name: string; count: number }[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <Kicker>{title}</Kicker>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((it, i) => (
          <span
            key={it.name}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2.5 py-1',
              tierClasses(i, items.length)
            )}
          >
            {it.name}
            <span className="font-mono text-[9px] opacity-70">{it.count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function TagCloud({ stats }: { stats: EventStats | null }) {
  if (!stats || (stats.topCompanies.length === 0 && stats.topKeywords.length === 0)) return null;

  return (
    <Panel
      kicker="Tag Cloud"
      title="등장 기업 · 기술 키워드"
      subtitle="브리프 완료 영상 기준 빈도 상위 태그입니다."
    >
      <div className="grid sm:grid-cols-2 gap-6">
        <ChipGroup title="참여 기업" items={stats.topCompanies} />
        <ChipGroup title="기술 키워드" items={stats.topKeywords} />
      </div>
    </Panel>
  );
}
