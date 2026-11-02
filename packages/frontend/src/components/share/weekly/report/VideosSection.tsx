import type { WeeklyReportVideo } from '@/types/weekly-brief';
import { REPORT_TOP_VIDEO_BADGE, REPORT_VIEWS_NOTE } from '@/lib/weekly-brief-report';
import { domainLabel, formatKstMonthDay, formatViews, safeVideoHref } from '@/lib/weekly-brief-format';
import { ExtLink } from '../PosterSections';
import { VideoThumb } from '../VideoThumbGrid';
import { Badge, CARD_CLASS, TitleBlock } from './shared';

export function VideoReportCard({ v }: { v: WeeklyReportVideo }) {
  const href = safeVideoHref(v.url);
  const dom = domainLabel(v.domain);
  const md = v.publishedAt ? formatKstMonthDay(v.publishedAt) : '';
  const views = formatViews(v.views);
  return (
    <article className={`${CARD_CLASS} report-vc grid grid-cols-1 items-start gap-4 sm:grid-cols-[240px_1fr]`} data-testid="video-card">
      <VideoThumb thumbnail={v.thumbnail} title={v.title} url={v.url} durationSec={v.durationSec} />
      <div className="min-w-0">
        {v.isTop && <Badge>{REPORT_TOP_VIDEO_BADGE}</Badge>}
        {dom && <Badge>{dom}</Badge>}
        <h3 className="m-0 mt-1 text-[17px] font-extrabold leading-snug sm:text-[18px]">
          <TitleBlock title={v.title} titleKo={v.titleKo} href={href} />
        </h3>
        <p className="m-0 mt-1 break-words text-[12.5px] text-poster-fg-2">
          {[v.channel, md, views ? `조회 ${views} (수집 시점)` : ''].filter(Boolean).join(' · ')}
          {href && (
            <>
              {' · '}
              <ExtLink href={href} className="underline underline-offset-2">유튜브 원본 ↗</ExtLink>
            </>
          )}
        </p>
        {v.summaryLines.length > 0 && (
          <ul className="m-0 mt-2 grid list-none gap-1 p-0">
            {v.summaryLines.map((s) => (
              <li key={s} className="relative pl-3 text-[14.5px] leading-[1.6] before:absolute before:left-0.5 before:content-['·']">
                {s}
              </li>
            ))}
          </ul>
        )}
        {v.tags.length > 0 && (
          <ul className="m-0 mt-2.5 flex list-none flex-wrap gap-1.5 p-0">
            {v.tags.map((t) => (
              <li key={t} className="rounded-full border border-white/[0.28] px-2.5 py-0.5 text-[12.5px]">
                {t}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

export function VideosSection({ videos }: { videos: readonly WeeklyReportVideo[] }) {
  return (
    <div data-testid="videos">
      <p className="m-0 text-[12.5px] text-poster-fg-2">{REPORT_VIEWS_NOTE}</p>
      {videos.map((v) => (
        <VideoReportCard key={v.id} v={v} />
      ))}
    </div>
  );
}
