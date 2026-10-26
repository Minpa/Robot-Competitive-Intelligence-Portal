'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import type { WeeklyVideoItem } from '@/types/weekly-brief';
import {
  domainLabel,
  formatDuration,
  formatViews,
  safeThumbSrc,
  safeVideoHref,
} from '@/lib/weekly-brief-format';
import { POSTER_DURATION_BG, POSTER_THUMB_GRADIENT, POSTER_WHITE } from '@/lib/weekly-brief-theme';
import { BandSection, MaybeLink } from './PosterSections';

interface ThumbProps {
  thumbnail: string | null;
  title: string;
  url: string | null;
  durationSec?: number | null;
  className?: string;
}

/**
 * 16:9 썸네일. src 는 safeThumbSrc(i.ytimg.com 만), 링크는 safeVideoHref 통과값만.
 * URL 이 없거나 로드 실패(onError)면 Play 아이콘 플레이스홀더.
 */
export function VideoThumb({ thumbnail, title, url, durationSec, className = '' }: ThumbProps) {
  const [failed, setFailed] = useState(false);
  const src = safeThumbSrc(thumbnail);
  const href = safeVideoHref(url);
  const duration = formatDuration(durationSec);
  const box = `relative block aspect-video w-full overflow-hidden border border-white/[0.28] ${className}`;
  const boxStyle = { background: POSTER_THUMB_GRADIENT };
  const inner = (
    <>
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={title}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span data-testid="thumb-placeholder" className="flex h-full w-full items-center justify-center text-poster-fg-2">
          <Play className="h-6 w-6" aria-hidden="true" />
        </span>
      )}
      {duration && (
        <span
          className="absolute bottom-1 right-1 px-[5px] py-px text-[11px]"
          style={{ background: POSTER_DURATION_BG, color: POSTER_WHITE }}
        >
          {duration}
        </span>
      )}
    </>
  );
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={box} style={boxStyle} aria-label={`${title} (유튜브 원본)`}>
      {inner}
    </a>
  ) : (
    <div className={box} style={boxStyle}>
      {inner}
    </div>
  );
}

export function VideoThumbGrid({ videos }: { videos: WeeklyVideoItem[] }) {
  return (
    <BandSection title="이번 주 영상" subtitle="조회수·분석 기준 상위 8 · 수집 시점 조회수 · 클릭하면 유튜브 원본">
      <div className="grid grid-cols-2 gap-[10px] sm:grid-cols-4" data-testid="video-grid">
        {videos.map((v) => {
          const badge = domainLabel(v.domain);
          const views = formatViews(v.views);
          const meta = [v.channel, views].filter(Boolean).join(' · ');
          return (
            <div key={v.id} className="poster-card min-w-0">
              <VideoThumb thumbnail={v.thumbnail} title={v.title} url={v.url} />
              <div className="mt-1 text-[11.5px] leading-[1.3]">
                <b className="line-clamp-2 font-bold">
                  <MaybeLink href={safeVideoHref(v.url)}>{v.title}</MaybeLink>
                </b>
                {(badge || meta) && (
                  <span className="mt-[2px] block break-words text-[12px] text-poster-fg-2">
                    {badge && <span className="mr-1 inline-block bg-poster-3 px-[6px] text-[11px] font-bold text-poster-fg">{badge}</span>}
                    {meta}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </BandSection>
  );
}
