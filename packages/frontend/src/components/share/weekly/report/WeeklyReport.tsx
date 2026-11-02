'use client';

import { useRef } from 'react';
import type { WeeklyReportResponse } from '@/types/weekly-brief';
import { POSTER_EMPTY_NOTICE } from '@/lib/weekly-brief-format';
import { REPORT_TOP_ID, buildToc, estimateReadingMinutes, isReportEmpty, otherCiUpdates, planReportSections } from '@/lib/weekly-brief-report';
import { CompaniesSection } from './CompaniesSection';
import { DomainsSection } from './DomainsSection';
import { HighlightsSection } from './HighlightsSection';
import { NewsSection } from './NewsSection';
import { PapersSection } from './PapersSection';
import { ReportCover } from './ReportCover';
import { ReportFooter } from './ReportFooter';
import { ReportToc } from './ReportToc';
import { SectionShell } from './shared';
import { TrendsSection } from './TrendsSection';
import { VideosSection } from './VideosSection';
import { usePrintImages } from './usePrintImages';
import { WatchPointsSection } from './WatchPointsSection';

/**
 * 주간 브리프 장문 리포트(v2) — 순수 표현 컴포넌트. 섹션 가시성·번호·앵커·목차·읽기 시간은 lib/weekly-brief-report 의 순수 함수가 정한다
 * (다운로드 HTML 과 같은 결과). 빈 섹션은 통째로 숨기고 목차에서도 빠진다.
 */
export function WeeklyReport({ brief }: { brief: WeeklyReportResponse }) {
  const rootRef = useRef<HTMLElement>(null);
  usePrintImages(rootRef);
  const p = brief.payload;
  const sections = planReportSections(p);
  const empty = isReportEmpty(p);

  const body = (key: (typeof sections)[number]['key']) => {
    switch (key) {
      case 'glance':
        return <HighlightsSection highlights={p.highlights} />;
      case 'domains':
        return <DomainsSection domains={p.domains} />;
      case 'companies':
        return <CompaniesSection companies={p.companies} otherCi={otherCiUpdates(p)} />;
      case 'videos':
        return <VideosSection videos={p.videos} />;
      case 'papers':
        return <PapersSection papers={p.papers} />;
      case 'news':
        return <NewsSection articles={p.articles} />;
      case 'trends':
        return <TrendsSection p={p} />;
      case 'watch':
        return <WatchPointsSection points={p.watchPoints} />;
      default:
        return null;
    }
  };

  return (
    <article
      ref={rootRef}
      id={REPORT_TOP_ID}
      data-testid="weekly-report"
      className="weekly-poster weekly-report mx-auto w-full max-w-[760px] break-words bg-poster text-poster-fg print:mx-0 print:block print:w-full print:max-w-none print:overflow-visible"
    >
      <ReportCover header={p.header} readingMinutes={estimateReadingMinutes(p)} />
      <ReportToc items={buildToc(sections)} />
      {sections.map((s) => (
        <SectionShell key={s.id} section={s}>
          {body(s.key)}
        </SectionShell>
      ))}
      {empty && (
        <div className="report-card px-5 py-9 text-center text-[15px] text-poster-fg-2" data-testid="report-empty">
          {POSTER_EMPTY_NOTICE}
        </div>
      )}
      <ReportFooter status={brief.status} generatedAt={p.header.generatedAt} />
    </article>
  );
}
