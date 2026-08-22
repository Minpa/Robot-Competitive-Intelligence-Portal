'use client';

/**
 * TrendPointCards — 트렌드 포인트 카드 목록 (번호 배지 + 텍스트 + 근거 썸네일 스트립)
 * 근거 썸네일을 클릭하면 해당 영상을 재생하고 페이지 상단으로 스크롤한다.
 * 구형 트렌드 캐시(points: string[])는 근거 썸네일 없이 텍스트만 표시된다.
 */

import type { LucideIcon } from 'lucide-react';
import { Panel } from '@/components/ui';
import { getTrendPointText, getTrendPointVideoIds } from '../types';
import type { EventTrendPoint, EventVideo } from '../types';

interface Props {
  points: (string | EventTrendPoint)[];
  videoMap: Map<string, EventVideo>;
  onSelectVideo: (video: EventVideo) => void;
  /** Panel kicker(상단 라벨) — 종합/기술 트렌드 그룹 구분용 */
  kicker?: string;
  /** Panel title — 종합/기술 트렌드 그룹 구분용 */
  title?: string;
  /** 헤더 우측에 표시할 구분 아이콘(예: 기술 트렌드는 Cpu) */
  icon?: LucideIcon;
}

export function TrendPointCards({
  points,
  videoMap,
  onSelectVideo,
  kicker = 'Trend Points',
  title = '트렌드 포인트',
  icon: Icon,
}: Props) {
  if (points.length === 0) return null;

  return (
    <Panel
      kicker={kicker}
      title={title}
      headerRight={Icon ? <Icon className="w-4 h-4 text-info" /> : undefined}
    >
      <div className="grid sm:grid-cols-2 gap-3">
        {points.map((p, i) => {
          const text = getTrendPointText(p);
          const evidence = getTrendPointVideoIds(p)
            .map((id) => videoMap.get(id))
            .filter((v): v is EventVideo => !!v);
          return (
            <div key={i} className="flex gap-3 border border-ink-200 rounded-lg p-3">
              <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-ink-900 text-white text-[11px] font-mono font-semibold">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-[12.5px] text-ink-700 leading-relaxed">{text}</p>
                {evidence.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {evidence.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          onSelectVideo(v);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="shrink-0 w-14 aspect-video overflow-hidden rounded border border-ink-200 hover:border-ink-400 transition-colors"
                        title={v.titleKo ?? v.title}
                      >
                        {v.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={v.thumbnail}
                            alt={v.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-full w-full bg-ink-100" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
