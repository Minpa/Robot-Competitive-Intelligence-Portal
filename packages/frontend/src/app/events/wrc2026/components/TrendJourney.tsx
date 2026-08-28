'use client';

/**
 * TrendJourney — 트렌드 포인트를 여정형 타임라인(지그재그 스파인 + 번호 배지)으로 보여준다.
 * 근거 썸네일을 클릭하면 해당 영상을 재생하고 페이지 상단으로 스크롤한다 (기존 TrendPointCards와 동일 동작).
 * 구형 트렌드 캐시(points: string[] 또는 {text, videoIds})는 아이콘·제목 없이 설명·썸네일만 표시된다.
 */

import type { LucideIcon } from 'lucide-react';
import { Package, Cpu, TrendingUp, ConciergeBell, Factory, HeartHandshake } from 'lucide-react';
import { Panel } from '@/components/ui';
import { getTrendPointText, getTrendPointVideoIds, getTrendPointTitle, getTrendPointTheme } from '../types';
import type { EventTrendPoint, EventVideo, TrendPointTheme } from '../types';
import { CHART_HUE, CATEGORY_PALETTE } from './chartColors';
import { lerp3Stops } from './journeyGradient';

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

/** 테마별 아이콘 — lucide-react 0.312.0 기준 Handshake 미제공으로 HeartHandshake로 대체 */
const THEME_ICON: Record<TrendPointTheme, LucideIcon> = {
  제품: Package,
  기술: Cpu,
  시장: TrendingUp,
  서비스: ConciergeBell,
  생산: Factory,
  파트너십: HeartHandshake,
};

/** 스파인·배지에 사용하는 3색 그라데이션 스톱 (히어로 차트와 동일 팔레트) */
const GRADIENT_STOPS = [CHART_HUE, CATEGORY_PALETTE[0], CATEGORY_PALETTE[2]] as const;

export function TrendJourney({
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
      <div className="relative">
        {/* 단일 연속 스파인 — 모바일은 좌측 고정, sm 이상은 중앙 정렬 */}
        <div
          className="absolute top-2 bottom-2 left-7 sm:left-1/2 sm:-translate-x-1/2 w-[3px] rounded-full z-0"
          style={{
            backgroundImage: `linear-gradient(180deg, ${GRADIENT_STOPS[0]} 0%, ${GRADIENT_STOPS[1]} 50%, ${GRADIENT_STOPS[2]} 100%)`,
          }}
        />

        {points.map((p, i) => {
          const text = getTrendPointText(p);
          const pointTitle = getTrendPointTitle(p);
          const theme = getTrendPointTheme(p);
          const ThemeIcon = theme ? THEME_ICON[theme] : undefined;
          const evidence = getTrendPointVideoIds(p)
            .map((id) => videoMap.get(id))
            .filter((v): v is EventVideo => !!v);
          const t = points.length > 1 ? i / (points.length - 1) : 0;
          const badgeColor = lerp3Stops(GRADIENT_STOPS, t);
          const isEven = i % 2 === 0;

          return (
            <div
              key={i}
              className="grid grid-cols-[56px_1fr] sm:grid-cols-[1fr_56px_1fr] sm:items-start gap-x-4 sm:gap-x-6 pb-9 last:pb-0"
            >
              {/* 순서 배지 */}
              <div className="col-start-1 sm:col-start-2 relative z-10 flex sm:justify-center">
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-mono text-[14px] font-bold"
                  style={{ backgroundColor: badgeColor }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>

              {/* 콘텐츠 카드 — 데스크톱에서 짝/홀수 인덱스에 따라 좌우 지그재그 배치 */}
              <div
                className={`col-start-2 ${isEven ? 'sm:col-start-1' : 'sm:col-start-3'} border border-ink-200 rounded-lg p-3 sm:p-4 bg-white`}
              >
                {pointTitle && (
                  <div className="mb-1.5 flex items-center gap-1.5">
                    {ThemeIcon && <ThemeIcon className="w-4 h-4 text-ink-600" aria-hidden="true" />}
                    <span className="text-[13.5px] sm:text-[14px] font-bold text-ink-900">{pointTitle}</span>
                  </div>
                )}
                <p className="text-[12.5px] text-ink-700 leading-relaxed">{text}</p>
                {evidence.length > 0 && (
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
