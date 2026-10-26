import type { WeeklyBriefResponse } from '@/types/weekly-brief';
import { POSTER_EMPTY_NOTICE, isPosterEmpty, planKeyMessages } from '@/lib/weekly-brief-format';
import { ArticleList } from './ArticleList';
import { CiChangesBand } from './CiChangesBand';
import { CauseEffectMessage, StatMessage } from './KeyMessageBlocks';
import { KeywordsBand } from './KeywordsBand';
import { PaperList } from './PaperList';
import { PosterFooter, PosterHero, PosterSection, PosterTopBar } from './PosterSections';
import { TopVideoBox } from './TopVideoBox';
import { VideoThumbGrid } from './VideoThumbGrid';

/**
 * 주간 브리프 포스터 — 순수 표현 컴포넌트. payload 를 받아 섹션을 순서대로 렌더하고 빈 섹션은 통째로 숨긴다.
 * 배경 3단(poster / poster-2 / poster-3·card)은 tailwind.config.js 의 `poster` 팔레트(= lib/weekly-brief-theme.ts).
 */
export function WeeklyBriefPoster({ brief }: { brief: WeeklyBriefResponse }) {
  const p = brief.payload;
  const plan = planKeyMessages(p.keyMessages);
  const empty = isPosterEmpty(p);

  return (
    <article
      data-testid="weekly-poster"
      className="weekly-poster mx-auto w-full max-w-[760px] bg-poster text-poster-fg print:mx-0 print:block print:w-full print:max-w-none print:overflow-visible"
    >
      <PosterTopBar generatedAt={p.header.generatedAt} />
      <PosterHero header={p.header} />

      {/* 행 A: keyMessages[0](stat) + 가장 많이 본 영상. 한쪽이 없으면 나머지가 전폭 */}
      {plan.lead && p.topVideo && (
        <PosterSection className="grid grid-cols-1 gap-[22px] sm:grid-cols-2">
          <StatMessage m={plan.lead} />
          <TopVideoBox video={p.topVideo} />
        </PosterSection>
      )}
      {plan.lead && !p.topVideo && (
        <PosterSection>
          <StatMessage m={plan.lead} />
        </PosterSection>
      )}
      {!plan.lead && p.topVideo && (
        <PosterSection>
          <TopVideoBox video={p.topVideo} />
        </PosterSection>
      )}

      {plan.rest.map((m) => (
        <PosterSection key={m.id}>{m.kind === 'stat' ? <StatMessage m={m} /> : <CauseEffectMessage m={m} />}</PosterSection>
      ))}

      {p.ciChanges.length > 0 && <CiChangesBand changes={p.ciChanges} summary={p.ciSummary} />}
      {p.keywords.length > 0 && <KeywordsBand keywords={p.keywords} />}
      {p.videos.length > 0 && <VideoThumbGrid videos={p.videos} />}
      {p.papers.length > 0 && <PaperList papers={p.papers} />}
      {p.articles.length > 0 && <ArticleList articles={p.articles} />}

      {empty && (
        <PosterSection className="text-center text-[14px] text-poster-fg-2">{POSTER_EMPTY_NOTICE}</PosterSection>
      )}

      <PosterFooter status={brief.status} generatedAt={p.header.generatedAt} />
    </article>
  );
}
