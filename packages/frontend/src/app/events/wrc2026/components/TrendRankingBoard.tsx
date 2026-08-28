'use client';

/**
 * TrendRankingBoard — 트렌드 포인트를 사업 영향도 순위표(카드 리스트)로 보여준다.
 * TrendMatrix(산점도)의 텍스트 대응물 — 같은 포인트를 순위·근거 중심으로 훑어볼 수 있게 한다.
 * 근거 썸네일 클릭 시 해당 영상을 재생하고 페이지 상단으로 스크롤한다 (TrendJourney와 동일 동작).
 */

import { useEffect, useRef } from 'react';
import { Tag } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { EventVideo, TrendPointTheme } from '../types';
import { THEME_COLOR } from './TrendMatrix';

export interface RankedTrendPoint {
  key: string;
  source: '종합' | '기술';
  title?: string;
  text: string;
  theme?: TrendPointTheme;
  impact?: number;
  maturity?: number;
  evidenceCount: number;
  videoIds: string[];
}

/**
 * 근거 영상들의 brief.companies를 소문자 기준으로 병합 집계해 빈도 상위 3개를 반환한다.
 * 동률이면 최초 등장 순서를 유지하고(Array.sort는 안정 정렬), 대표 표기는 최초 등장한 원문 그대로 사용한다.
 */
export function deriveLeadCompanies(videoIds: string[], videoMap: Map<string, EventVideo>): string[] {
  const order: string[] = [];
  const counts = new Map<string, { display: string; count: number }>();
  for (const id of videoIds) {
    const companies = videoMap.get(id)?.brief?.companies ?? [];
    for (const raw of companies) {
      const name = typeof raw === 'string' ? raw.trim() : '';
      if (!name) continue;
      const key = name.toLowerCase();
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, { display: name, count: 1 });
        order.push(key);
      }
    }
  }
  return order
    .map((key) => counts.get(key)!)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((c) => c.display);
}

/** impact desc → evidenceCount desc → 원본 순서(둘 다 동률이면 안정 정렬로 유지) */
export function sortRankedPoints(points: RankedTrendPoint[]): RankedTrendPoint[] {
  return [...points].sort((a, b) => {
    const impactDiff = (b.impact ?? 0) - (a.impact ?? 0);
    if (impactDiff !== 0) return impactDiff;
    return b.evidenceCount - a.evidenceCount;
  });
}

function summarize(text: string, max = 40): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-12 shrink-0 text-[10px] text-ink-500">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={cn('h-2 w-3 rounded-sm', i <= value ? 'bg-ink-900' : 'bg-ink-100')} />
        ))}
      </div>
      <span className="font-mono text-[10px] text-ink-500">{value}/5</span>
    </div>
  );
}

function EvidenceThumbs({
  videoIds,
  videoMap,
  onSelectVideo,
}: {
  videoIds: string[];
  videoMap: Map<string, EventVideo>;
  onSelectVideo: (v: EventVideo) => void;
}) {
  const evidence = videoIds.map((id) => videoMap.get(id)).filter((v): v is EventVideo => !!v);
  if (evidence.length === 0) return null;
  return (
    <div className="mt-2 flex gap-1.5 flex-wrap">
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
            <img src={v.thumbnail} alt={v.title} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="h-full w-full bg-ink-100" />
          )}
        </button>
      ))}
    </div>
  );
}

function RankCard({
  rank,
  point,
  videoMap,
  onSelectVideo,
  selected,
}: {
  rank: string;
  point: RankedTrendPoint;
  videoMap: Map<string, EventVideo>;
  onSelectVideo: (v: EventVideo) => void;
  selected: boolean;
}) {
  const leadCompanies = deriveLeadCompanies(point.videoIds, videoMap);
  const themeColor = point.theme ? THEME_COLOR[point.theme] : undefined;

  return (
    <div
      id={`trend-rank-${point.key}`}
      className={cn(
        'border border-ink-200 rounded-lg p-3 sm:p-4 bg-white',
        selected && 'ring-2 ring-info ring-offset-2'
      )}
    >
      <div className="flex items-start gap-3">
        <span className="w-8 shrink-0 font-mono text-[18px] font-bold text-ink-900 leading-none">{rank}</span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Tag tone="neutral" size="sm">{point.source}</Tag>
            {point.theme && themeColor && (
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium"
                style={{ backgroundColor: `${themeColor}22`, color: themeColor }}
              >
                {point.theme}
              </span>
            )}
            {point.evidenceCount > 0 && (
              <Tag tone="neutral" size="sm">근거 {point.evidenceCount}건</Tag>
            )}
          </div>

          <p className="text-[13.5px] font-bold text-ink-900 leading-snug">
            {point.title ?? summarize(point.text)}
          </p>

          {typeof point.impact === 'number' && typeof point.maturity === 'number' && (
            <div className="flex flex-col gap-1">
              <ScoreBar label="영향도" value={point.impact} />
              <ScoreBar label="성숙도" value={point.maturity} />
            </div>
          )}

          {leadCompanies.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {leadCompanies.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center rounded-full border border-ink-200 bg-ink-50 px-2 py-0.5 text-[10.5px] text-ink-600"
                >
                  {name}
                </span>
              ))}
            </div>
          )}

          <p className="text-[12.5px] text-ink-700 leading-relaxed">{point.text}</p>

          <EvidenceThumbs videoIds={point.videoIds} videoMap={videoMap} onSelectVideo={onSelectVideo} />
        </div>
      </div>
    </div>
  );
}

interface Props {
  points: RankedTrendPoint[]; // 정렬 적용된(sortRankedPoints) 점수 산정 포인트
  unscored: RankedTrendPoint[]; // 점수 미산정 포인트
  videoMap: Map<string, EventVideo>;
  onSelectVideo: (v: EventVideo) => void;
  selectedKey: string | null;
}

export function TrendRankingBoard({ points, unscored, videoMap, onSelectVideo, selectedKey }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedKey) return;
    const el = document.getElementById(`trend-rank-${selectedKey}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [selectedKey]);

  if (points.length === 0 && unscored.length === 0) return null;

  return (
    <div ref={containerRef} className="space-y-3">
      {points.map((p, i) => (
        <RankCard
          key={p.key}
          rank={String(i + 1)}
          point={p}
          videoMap={videoMap}
          onSelectVideo={onSelectVideo}
          selected={selectedKey === p.key}
        />
      ))}

      {unscored.length > 0 && (
        <>
          <div className="border-t border-ink-200 pt-3">
            <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-500">점수 미산정</p>
          </div>
          {unscored.map((p) => (
            <RankCard
              key={p.key}
              rank="—"
              point={p}
              videoMap={videoMap}
              onSelectVideo={onSelectVideo}
              selected={selectedKey === p.key}
            />
          ))}
        </>
      )}
    </div>
  );
}
