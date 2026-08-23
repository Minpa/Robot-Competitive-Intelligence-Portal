'use client';

/**
 * TechAxisChart (B-5) — 기술 요소 분포 (브리프 techKeywords 기반, 고정 기술 축)
 * 축마다 1행: 아이콘 + 축명 + 가로 비례 막대(단일 hue) + N건 + 축별 keywords 칩(클릭 시 필터링).
 * techAxes가 빈 배열이면 미표시.
 */

import { Footprints, Hand, Brain, Eye, Cog, MoreHorizontal, type LucideIcon } from 'lucide-react';
import { Panel } from '@/components/ui';
import { cn } from '@/lib/utils';
import { CHART_HUE } from './chartColors';
import type { TagSelection } from './TagCloud';

const AXIS_ICON: Record<string, LucideIcon> = {
  '이동·보행 제어': Footprints,
  '조작·핸드': Hand,
  'AI·학습': Brain,
  '센싱·인지': Eye,
  '하드웨어·구동계': Cog,
  기타: MoreHorizontal,
};

interface Props {
  techAxes: { axis: string; count: number; keywords: { name: string; count: number }[] }[];
  onSelectKeyword: (tag: TagSelection) => void;
  selected: TagSelection | null;
}

export function TechAxisChart({ techAxes, onSelectKeyword, selected }: Props) {
  if (techAxes.length === 0) return null;
  const maxCount = Math.max(...techAxes.map((a) => a.count));

  return (
    <Panel kicker="Tech Axis Distribution" title="기술 요소 분포 (브리프 키워드 기반)">
      <div className="space-y-4">
        {techAxes.map((a) => {
          const Icon = AXIS_ICON[a.axis] ?? MoreHorizontal;
          return (
            <div key={a.axis} className="space-y-1.5">
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0 text-ink-500" />
                <span className="w-28 shrink-0 text-[12px] font-medium text-ink-900 truncate">{a.axis}</span>
                <div className="flex-1 h-2.5 bg-ink-100 rounded-sm overflow-hidden">
                  <div
                    className="h-full"
                    style={{
                      width: `${maxCount > 0 ? (a.count / maxCount) * 100 : 0}%`,
                      backgroundColor: CHART_HUE,
                    }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right text-[10.5px] font-mono text-ink-500">{a.count}건</span>
              </div>
              {a.keywords.length > 0 && (
                <div className="pl-7 flex flex-wrap gap-1.5">
                  {a.keywords.map((k) => {
                    const isSelected = selected?.type === 'keyword' && selected.name === k.name;
                    return (
                      <button
                        key={k.name}
                        type="button"
                        onClick={() => onSelectKeyword({ type: 'keyword', name: k.name })}
                        aria-pressed={isSelected}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full border border-ink-200 bg-ink-50 px-2 py-0.5 text-[10.5px] text-ink-600 transition-colors',
                          isSelected ? 'ring-2 ring-ink-900 ring-offset-1' : 'hover:border-ink-400'
                        )}
                      >
                        {k.name}
                        <span className="font-mono text-[9px] opacity-70">{k.count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
