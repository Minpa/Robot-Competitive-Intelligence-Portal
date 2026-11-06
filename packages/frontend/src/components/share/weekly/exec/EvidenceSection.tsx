import type { ExecEvidence } from '@/types/weekly-brief';
import { EXEC_LABELS, EXEC_NO_PAPERS, editPath } from '@/lib/weekly-brief-exec';
import { titlePair } from '@/lib/weekly-brief-report';
import { domainLabel, formatKstMonthDay, formatViews, safeArticleHref, safePaperHref, safeVideoHref } from '@/lib/weekly-brief-format';
import { VideoThumb } from '../VideoThumbGrid';
import { Badge, CARD_CLASS, TitleBlock } from '../report/shared';
import { EditableLine } from './EditableLine';

/** 참고 자료 — 영상 6~8, 논문(프론티어만, 한 줄 시사점), 뉴스 6~8, 맨 끝에 수집 한 줄 */
export function EvidenceSection({ evidence }: { evidence: ExecEvidence }) {
  const { videos, papers, articles } = evidence;
  return (
    <div data-testid="evidence">
      {videos.length > 0 && (
        <section aria-label="영상" data-testid="evidence-videos">
          <h3 className="m-0 mb-1 text-[16px] font-extrabold">영상 {videos.length}개</h3>
          {videos.map((v) => {
            const href = safeVideoHref(v.url);
            const dom = domainLabel(v.domain);
            const md = v.publishedAt ? formatKstMonthDay(v.publishedAt) : '';
            const views = formatViews(v.views);
            return (
              <article key={v.id} className={`${CARD_CLASS} report-vc grid grid-cols-1 items-start gap-4 sm:grid-cols-[200px_1fr]`} data-testid="video-card">
                <VideoThumb thumbnail={v.thumbnail} title={v.title} url={v.url} durationSec={v.durationSec} />
                <div className="min-w-0">
                  {dom && <Badge>{dom}</Badge>}
                  <h4 className="m-0 mt-1 text-[16px] font-extrabold leading-snug">
                    <TitleBlock title={v.title} titleKo={v.titleKo} href={href} />
                  </h4>
                  <p className="m-0 mt-1 break-words text-[12.5px] text-poster-fg-2">{[v.channel, md, views ? `${EXEC_LABELS.views} ${views}` : ''].filter(Boolean).join(' · ')}</p>
                  {v.summaryLines.length > 0 && (
                    <ul className="m-0 mt-2 grid list-none gap-1 p-0">
                      {v.summaryLines.map((s) => (
                        <li key={s} className="relative pl-3 text-[14px] leading-[1.6] before:absolute before:left-0.5 before:content-['·']">
                          {s}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      <section aria-label="논문" className="mt-4" data-testid="evidence-papers">
        <h3 className="m-0 mb-1 text-[16px] font-extrabold">논문 {papers.length > 0 ? `${papers.length}개` : ''}</h3>
        {papers.length === 0 ? (
          <p className="m-0 text-[14.5px] text-poster-fg-2" data-testid="papers-empty">
            {EXEC_NO_PAPERS}
          </p>
        ) : (
          papers.map((p) => {
            const href = safePaperHref(p.url);
            const { sub } = titlePair(p.title, p.titleKo);
            return (
              <article key={p.id} className={CARD_CLASS} data-testid="paper-card">
                <h4 className="m-0 text-[16px] font-extrabold leading-snug">
                  <TitleBlock title={p.title} titleKo={p.titleKo} href={href} />
                </h4>
                {sub && <span className="sr-only">{sub}</span>}
                <p className="m-0 mt-1 break-words text-[12.5px] text-poster-fg-2">{[p.authors, p.publishedAt ? formatKstMonthDay(p.publishedAt) : '', p.arxivId ? `arXiv ${p.arxivId}` : ''].filter(Boolean).join(' · ')}</p>
                <p className="report-para m-0 mt-2 text-[14.5px] leading-[1.7]">
                  <EditableLine path={editPath.paperImplication(p.id)} text={p.implication} />
                </p>
              </article>
            );
          })
        )}
      </section>

      {articles.length > 0 && (
        <section aria-label="뉴스" className="mt-4" data-testid="evidence-articles">
          <h3 className="m-0 mb-1 text-[16px] font-extrabold">뉴스 {articles.length}개</h3>
          <ul className="m-0 list-none p-0">
            {articles.map((a) => (
              <li key={a.id} className="report-card border-t border-dashed border-white/[0.28] py-2 first:border-t-0" data-testid="article-item">
                <span className="text-[15px] font-bold">
                  <TitleBlock title={a.title} titleKo={a.titleKo} href={safeArticleHref(a.url)} />
                </span>
                <div className="mt-0.5 break-words text-[12.5px] text-poster-fg-2">{[a.source, a.publishedAt ? formatKstMonthDay(a.publishedAt) : ''].filter(Boolean).join(' · ')}</div>
                {a.summaryLine && <p className="m-0 mt-[3px] text-[14px] text-poster-fg-2">{a.summaryLine}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {evidence.collectionLine && (
        <p className="m-0 mt-5 border-t border-dashed border-white/[0.28] pt-2 text-[12px] text-poster-fg-3" data-testid="collection-line">
          {evidence.collectionLine}
        </p>
      )}
    </div>
  );
}
