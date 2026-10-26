import type { ReactNode } from 'react';
import type { WeeklyBriefHeader } from '@/types/weekly-brief';
import {
  POSTER_FOOTER_NOTICE,
  POSTER_PARTIAL_NOTICE,
  buildStatItems,
  formatGeneratedLabel,
  formatKstDate,
  formatWeekTitle,
} from '@/lib/weekly-brief-format';

/** 점선 구분선 (Tailwind: border-white/[0.28]) */
export const POSTER_DASH = 'border-t border-dashed border-white/[0.28]';

/** 외부 링크 — 항상 target=_blank rel="noopener noreferrer". href 는 호출 전에 안전 헬퍼를 통과해야 한다 */
export function ExtLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

/** 안전 헬퍼 통과값(비어 있지 않음)이면 링크, 아니면 텍스트만 */
export function MaybeLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return href ? (
    <ExtLink href={href} className={className}>
      {children}
    </ExtLink>
  ) : (
    <>{children}</>
  );
}

/** 점선 60% (히어로·행 내부) */
export function DashShort() {
  return <hr className={`${POSTER_DASH} my-[10px] mx-auto w-[60%]`} />;
}

/** 본문 블록 — 점선 위 구분 + 인쇄 시 절단 금지 */
export function PosterSection({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`poster-block ${POSTER_DASH} px-7 py-[26px] ${className}`}>{children}</section>;
}

/** 밴드(제목 + 부제) + 본문 */
export function BandSection({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className={`poster-block ${POSTER_DASH}`}>
      <div className="bg-poster-2 py-[18px] px-7 text-center">
        <h2 className="m-0 text-[22px] font-black tracking-[0.04em]">{title}</h2>
        <p className="mt-1 mb-0 text-[12.5px] text-poster-fg-2">{subtitle}</p>
      </div>
      <div className="px-7 py-[26px]">{children}</div>
    </section>
  );
}

export function PosterTopBar({ generatedAt }: { generatedAt: string }) {
  return (
    <div className="poster-block flex items-center justify-between gap-3 bg-ink-900 px-7 py-[14px]">
      <div className="whitespace-nowrap text-[14px] font-extrabold tracking-[0.14em]">
        ARGOS <span className="ml-1 text-[12px] font-normal tracking-[0.08em] text-poster-fg-3">|| WEEKLY BRIEF</span>
      </div>
      <div className="text-[12px] tracking-[0.04em] text-poster-fg-3">{formatGeneratedLabel(generatedAt)}</div>
    </div>
  );
}

/** 히어로 — 중립 타이틀(AI 종합 문장 없음) + 통계 띠 */
export function PosterHero({ header }: { header: WeeklyBriefHeader }) {
  const stats = buildStatItems(header.counts, header.deltas);
  return (
    <header className="poster-block px-7 pt-[34px] pb-[26px] text-center">
      <div className="text-[11px] uppercase tracking-[0.2em] text-poster-fg-3">Weekly Brief · Week {header.weekNumber}</div>
      <DashShort />
      <h1 className="m-0 mt-[10px] text-[30px] sm:text-[40px] leading-[1.1] tracking-[-0.01em]">
        <b className="font-black">주간 브리프</b>
        <br />
        <span className="font-light">{formatWeekTitle(header.weekStart, header.weekEnd, header.weekNumber)}</span>
      </h1>
      <DashShort />
      <p data-testid="weekly-stats" className="m-0 mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[12px] text-poster-fg-2">
        {stats.map((s, i) => (
          <span key={s.label} className="whitespace-nowrap">
            {i > 0 && <span className="mr-2 text-poster-fg-3">·</span>}
            {s.label} {s.value}
            {s.delta && <span> ({s.delta})</span>}
          </span>
        ))}
      </p>
    </header>
  );
}

export function PosterFooter({ status, generatedAt }: { status: 'ok' | 'partial'; generatedAt: string }) {
  return (
    <footer className={`poster-block ${POSTER_DASH} px-7 pt-4 pb-[26px] text-center text-[11px] text-poster-fg-3`}>
      {status === 'partial' && <p className="m-0 mb-1">{POSTER_PARTIAL_NOTICE}</p>}
      <p className="m-0">
        {POSTER_FOOTER_NOTICE} · ARGOS · {formatKstDate(generatedAt)}
      </p>
    </footer>
  );
}
