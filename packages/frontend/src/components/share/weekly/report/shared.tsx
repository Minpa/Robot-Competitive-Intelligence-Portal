import type { ReactNode } from 'react';
import type { WeeklyEvidenceCard, WeeklyReportEvidence } from '@/types/weekly-brief';
import { REPORT_EVIDENCE_LABELS, REPORT_LABELS, REPORT_TOP_ID, cardTypeLabel, titlePair, type PlannedSection } from '@/lib/weekly-brief-report';
import { formatKstMonthDay, safeArticleHref, safePaperHref, safeVideoHref } from '@/lib/weekly-brief-format';
import { ExtLink, MaybeLink, POSTER_DASH } from '../PosterSections';

/**
 * 리포트 공통 조각. 글자색 × 배경 조합은 lib/weekly-brief-report 의 REPORT_CONTRAST_PAIRS 만 쓴다:
 *  - 본문·제목은 text-poster-fg, 보조는 text-poster-fg-2 (pill 배경 위에서는 fg 만), fg-3 는 포스터 면과 상단 바 메타에만.
 */

/** 카드 — 인쇄에서 쪼개지지 않게 report-card 로 표시한다 */
export const CARD_CLASS = 'report-card report-block my-3.5 bg-poster-card p-4 text-poster-fg';

export function Badge({ children }: { children: ReactNode }) {
  return <span className="mr-1.5 inline-block bg-poster-3 px-[7px] text-[11.5px] font-bold not-italic text-poster-fg">{children}</span>;
}

/** 본문 문단 — 15px(모바일)/16px(sm 이상), 행간 1.78, 문단 간격 12px */
export function Para({ children }: { children: ReactNode }) {
  return <p className="report-para my-3 text-[15px] leading-[1.78] text-poster-fg sm:text-[16px]">{children}</p>;
}

/** 제목: 한글 제목이 있으면 한글이 주, 원제는 아래 작게. 링크가 안전하면 제목에 건다 */
export function TitleBlock({ title, titleKo, href, className = '' }: { title: string; titleKo: string | null | undefined; href: string; className?: string }) {
  const { main, sub } = titlePair(title, titleKo);
  return (
    <>
      <MaybeLink href={href} className={`underline underline-offset-2 ${className}`}>
        {main}
      </MaybeLink>
      {sub && (
        <span className="mt-0.5 block break-words text-[12.5px] font-normal text-poster-fg-2">
          {REPORT_LABELS.original}: {sub}
        </span>
      )}
    </>
  );
}

export function cardHref(c: Pick<WeeklyEvidenceCard, 'type' | 'url'>): string {
  return c.type === 'video' ? safeVideoHref(c.url) : c.type === 'paper' ? safePaperHref(c.url) : safeArticleHref(c.url);
}

/** 근거 카드 목록 (도메인·회사 공용): 유형 배지, 제목(링크), 출처·날짜, 파생 요약 한 줄 */
export function EvidenceCardList({ cards }: { cards: readonly WeeklyEvidenceCard[] }) {
  if (cards.length === 0) return null;
  return (
    <ul className="m-0 mt-2 list-none p-0" data-testid="evidence-cards">
      {cards.map((c) => {
        const md = c.publishedAt ? formatKstMonthDay(c.publishedAt) : '';
        return (
          <li key={`${c.type}:${c.id}`} className="report-card border-t border-dashed border-white/[0.28] py-2 first:border-t-0">
            <Badge>{cardTypeLabel(c.type)}</Badge>
            <span className="text-[15px] font-bold">
              <TitleBlock title={c.title} titleKo={c.titleKo} href={cardHref(c)} />
            </span>
            <div className="mt-0.5 break-words text-[12.5px] text-poster-fg-2">{[c.source, md].filter(Boolean).join(' · ')}</div>
            {c.line && <p className="m-0 mt-[3px] text-[14px] text-poster-fg-2">{c.line}</p>}
          </li>
        );
      })}
    </ul>
  );
}

/** 하이라이트·관찰 포인트 근거 칩 (유형 · 제목 (라벨) ↗) */
export function EvidenceChips({ list }: { list: readonly WeeklyReportEvidence[] }) {
  if (list.length === 0) return null;
  return (
    <ul className="m-0 mt-2.5 flex list-none flex-wrap gap-1.5 p-0" data-testid="evidence-chips">
      {list.slice(0, 3).map((e) => {
        const href = e.type === 'keyword' ? '' : e.type === 'video' ? safeVideoHref(e.url) : e.type === 'paper' ? safePaperHref(e.url) : safeArticleHref(e.url);
        const inner = `${REPORT_EVIDENCE_LABELS[e.type] ?? ''} · ${e.title}${e.label ? ` (${e.label})` : ''}`;
        return (
          <li key={`${e.type}:${e.id}`} className="max-w-full break-words rounded-2xl bg-poster-3 px-2.5 py-[3px] text-[12.5px] text-poster-fg">
            {href ? <ExtLink href={href} className="underline underline-offset-2">{`${inner} ↗`}</ExtLink> : inner}
          </li>
        );
      })}
    </ul>
  );
}

export function BackToTop() {
  return (
    <p className="no-print m-0 px-5 pb-4 pt-1.5 text-right text-[12.5px] sm:pb-[18px]">
      <a href={`#${REPORT_TOP_ID}`} className="text-poster-fg-2 underline underline-offset-2">
        ↑ {REPORT_LABELS.backToTop}
      </a>
    </p>
  );
}

/** 섹션: 밴드 헤더(번호 · 제목 · 부제 · 건수) + 본문 + "맨 위로". scroll-mt 로 앵커 이동 시 제목이 가리지 않는다 */
export function SectionShell({ section, children }: { section: PlannedSection; children: ReactNode }) {
  return (
    <section id={section.id} className={`report-section scroll-mt-28 ${POSTER_DASH}`} aria-labelledby={`${section.id}-h`}>
      <div className="report-sh grid grid-cols-[auto_1fr_auto] items-center gap-x-3.5 gap-y-1 bg-poster-2 px-5 py-4 text-poster-fg">
        <span className="row-span-2 text-[28px] font-black leading-none tracking-[-0.02em]" aria-hidden="true">
          {section.number}
        </span>
        <h2 id={`${section.id}-h`} className="m-0 text-[20px] font-black leading-tight tracking-[0.02em] sm:text-[22px]">
          {section.title}
        </h2>
        <span className="col-start-3 row-start-1 whitespace-nowrap text-[13px] text-poster-fg-2">{section.countLabel ?? ''}</span>
        <p className="col-span-2 col-start-2 m-0 text-[12.5px] text-poster-fg-2">{section.subtitle}</p>
        {section.intro && section.intro !== section.subtitle && (
          <p className="col-span-2 col-start-2 m-0 mt-0.5 text-[13.5px] leading-[1.6] text-poster-fg" data-testid="section-intro">
            {section.intro}
          </p>
        )}
        {section.notice && (
          <p className="col-span-2 col-start-2 m-0 text-[12px] text-poster-fg-2" data-testid="section-notice">
            {section.notice}
          </p>
        )}
      </div>
      <div className="report-body px-5 pb-2 pt-[22px]">{children}</div>
      <BackToTop />
    </section>
  );
}
