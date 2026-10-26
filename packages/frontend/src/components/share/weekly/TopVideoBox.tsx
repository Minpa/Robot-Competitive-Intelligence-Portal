import type { WeeklyTopVideo } from '@/types/weekly-brief';
import { formatKstMonthDay, formatViews, safeVideoHref } from '@/lib/weekly-brief-format';
import { ExtLink, MaybeLink } from './PosterSections';
import { VideoThumb } from './VideoThumbGrid';

/** 가장 많이 본 영상 박스 (조회수는 수집 시점 값) */
export function TopVideoBox({ video }: { video: WeeklyTopVideo }) {
  const hasViews = video.views != null;
  const href = safeVideoHref(video.url);
  const md = formatKstMonthDay(video.publishedAt);
  const who: string[] = [];
  if (video.channel) who.push(video.channel);
  if (md) who.push(md);
  if (hasViews) who.push(`조회 ${formatViews(video.views)}`);
  return (
    <div className="bg-poster-card px-[18px] pb-[14px] pt-[18px] text-center" data-testid="top-video">
      <div className="text-[11px] uppercase tracking-[0.14em] text-poster-fg-2">
        {hasViews ? '이번 주 가장 많이 본 영상' : '이번 주 분석 영상'}
      </div>
      {hasViews && <div className="mt-[2px] text-[12px] text-poster-fg-2">수집 시점 조회수 기준</div>}
      <VideoThumb
        thumbnail={video.thumbnail}
        title={video.title}
        url={video.url}
        durationSec={video.durationSec}
        className="mx-auto mb-[10px] mt-3 max-w-[260px]"
      />
      <div className="text-[15px] leading-[1.45] break-words">
        <MaybeLink href={href}>{video.title}</MaybeLink>
      </div>
      {video.analysisLine && <div className="mt-[6px] text-[12px] text-poster-fg-2 break-words">{video.analysisLine}</div>}
      <div className="mt-[10px] text-[12px] text-poster-fg-2 break-words">
        {who.join(' · ')}
        {href && (
          <>
            {who.length > 0 && ' · '}
            <ExtLink href={href} className="underline decoration-dotted underline-offset-2">
              유튜브 원본 ↗
            </ExtLink>
          </>
        )}
      </div>
    </div>
  );
}
