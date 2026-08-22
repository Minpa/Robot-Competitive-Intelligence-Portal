'use client';

/**
 * BriefPanel — 선택된 영상의 브리프 렌더링 (기존 BriefRow 대체)
 * highlight 강조문 + 아이콘/컬러 라벨을 갖춘 브리프 섹션(주요 제품/시연 내용/기술 관점 시사점) +
 * companies·techKeywords 칩 행(있을 때만)으로 구성한다. v1(구형) 브리프는 highlight/칩 없이도 정상 렌더링된다.
 */

import { Package, PlayCircle, Lightbulb, type LucideIcon } from 'lucide-react';
import { Tag } from '@/components/ui';
import { cn } from '@/lib/utils';
import { formatDate } from '../utils';
import type { EventBrief } from '../types';

const SECTION_TONE = {
  info: 'border-info-soft bg-info-soft/40 text-info',
  pos: 'border-pos-soft bg-pos-soft/40 text-pos',
  warn: 'border-warn-soft bg-warn-soft/40 text-warn',
} as const;

function BriefSection({
  icon: Icon,
  label,
  tone,
  items,
}: {
  icon: LucideIcon;
  label: string;
  tone: keyof typeof SECTION_TONE;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex gap-3">
      <div
        className={cn(
          'shrink-0 w-24 self-start flex flex-col items-center gap-1 border px-2 py-1.5 text-center text-[11px] font-semibold leading-snug',
          SECTION_TONE[tone]
        )}
      >
        <Icon className="w-3.5 h-3.5" />
        <span>{label}</span>
      </div>
      <ul className="flex-1 space-y-1 pt-0.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-1.5 text-[12.5px] text-ink-700 leading-relaxed">
            <span className="text-ink-400">•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BriefPanel({ brief }: { brief: EventBrief }) {
  const hasTags = (brief.companies?.length ?? 0) > 0 || (brief.techKeywords?.length ?? 0) > 0;

  return (
    <div className="border-t border-ink-100 pt-3 space-y-3">
      {brief.highlight && (
        <blockquote className="border-l-2 border-ink-300 pl-3 text-[13px] italic text-ink-700 leading-relaxed">
          {brief.highlight}
        </blockquote>
      )}
      <BriefSection icon={Package} label="주요 제품" tone="info" items={brief.mainProducts} />
      <BriefSection icon={PlayCircle} label="시연 내용" tone="pos" items={brief.demoContents} />
      <BriefSection icon={Lightbulb} label="기술 관점 시사점" tone="warn" items={brief.insights} />
      {hasTags && (
        <div className="border-t border-ink-100 pt-3 flex flex-wrap gap-1.5">
          {brief.companies?.map((c) => (
            <Tag key={`co-${c}`} tone="neutral" size="sm">
              {c}
            </Tag>
          ))}
          {brief.techKeywords?.map((k) => (
            <Tag key={`kw-${k}`} tone="info" size="sm">
              {k}
            </Tag>
          ))}
        </div>
      )}
      {brief.briefedAt && (
        <p className="text-right text-[10.5px] text-ink-400">Gemini 영상 분석 · {formatDate(brief.briefedAt)}</p>
      )}
    </div>
  );
}
