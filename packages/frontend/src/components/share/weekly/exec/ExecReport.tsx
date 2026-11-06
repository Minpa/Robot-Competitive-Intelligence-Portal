'use client';

import { useRef } from 'react';
import type { WeeklyExecutiveResponse } from '@/types/weekly-brief';
import {
  EXEC_EMPTY_NOTICE,
  EXEC_FOOTER_NOTICE,
  EXEC_PARTIAL_NOTICE,
  EXEC_TOP_ID,
  buildExecToc,
  estimateExecReadingMinutes,
  isExecEmpty,
  planExecSections,
  type PublishBadgeTone,
} from '@/lib/weekly-brief-exec';
import { formatKstDate } from '@/lib/weekly-brief-format';
import { POSTER_DASH } from '../PosterSections';
import { SectionShell } from '../report/shared';
import { usePrintImages } from '../report/usePrintImages';
import { ExecEditContext, type ExecEditApi } from '../useWeeklyBriefEdit';
import { BusinessSection } from './BusinessSection';
import { ConclusionsSection } from './ConclusionsSection';
import { EvidenceSection } from './EvidenceSection';
import { ExecCover } from './ExecCover';
import { ExecToc } from './ExecToc';
import { GapSection } from './GapSection';
import { QuestionsSection } from './QuestionsSection';
import { TechSection } from './TechSection';

interface Props {
  brief: WeeklyExecutiveResponse;
  /** 관리자 편집 컨텍스트 — 없으면(비관리자) 편집 요소가 DOM 에 전혀 없다 */
  edit?: ExecEditApi | null;
  /** 관리자에게만 보이는 발행 상태 배지 */
  badge?: { label: string; tone: PublishBadgeTone } | null;
}

/**
 * 주간 브리프 임원판(v3) — 순수 표현 컴포넌트. 섹션 가시성·번호·앵커·목차·읽기 시간은 lib/weekly-brief-exec 의 순수 함수가 정한다
 * (다운로드 HTML 과 같은 결과). 데이터가 없는 섹션은 통째로 숨기고 목차에서도 빠진다.
 */
export function ExecReport({ brief, edit = null, badge = null }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  usePrintImages(rootRef);
  const p = brief.payload;
  const sections = planExecSections(p);
  const empty = isExecEmpty(p);

  const body = (key: (typeof sections)[number]['key']) => {
    switch (key) {
      case 'conclusions':
        return <ConclusionsSection conclusions={p.conclusions} />;
      case 'gap':
        return <GapSection gaps={p.gaps} />;
      case 'tech':
        return <TechSection tech={p.tech} />;
      case 'business':
        return <BusinessSection business={p.business} />;
      case 'questions':
        return <QuestionsSection questions={p.questions} />;
      case 'evidence':
        return <EvidenceSection evidence={p.evidence} />;
      default:
        return null;
    }
  };

  return (
    <ExecEditContext.Provider value={edit}>
      <article
        ref={rootRef}
        id={EXEC_TOP_ID}
        data-testid="exec-report"
        className="weekly-poster weekly-report weekly-exec mx-auto w-full max-w-[760px] break-words bg-poster text-poster-fg print:mx-0 print:block print:w-full print:max-w-none print:overflow-visible"
      >
        <ExecCover header={p.header} readingMinutes={estimateExecReadingMinutes(p)} oneLiner={p.conclusions[0]?.headline ?? null} badge={badge} />
        <ExecToc items={buildExecToc(sections)} />
        {sections.map((s) => (
          <SectionShell key={s.id} section={{ ...s, key: 'glance', notice: null }}>
            {body(s.key)}
          </SectionShell>
        ))}
        {empty && (
          <div className="report-card px-5 py-9 text-center text-[15px] text-poster-fg-2" data-testid="exec-empty">
            {EXEC_EMPTY_NOTICE}
          </div>
        )}
        <footer className={`report-card ${POSTER_DASH} px-5 pb-[26px] pt-4 text-center text-[11px] text-poster-fg-3`} data-testid="exec-footer">
          {brief.status === 'partial' && <p className="m-0 mb-1">{EXEC_PARTIAL_NOTICE}</p>}
          <p className="m-0">
            {EXEC_FOOTER_NOTICE} · ARGOS · {formatKstDate(p.header.generatedAt)}
          </p>
        </footer>
      </article>
    </ExecEditContext.Provider>
  );
}
