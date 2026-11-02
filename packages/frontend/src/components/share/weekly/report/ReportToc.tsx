'use client';

import { REPORT_LABELS, REPORT_TOC_ID, type TocItem } from '@/lib/weekly-brief-report';

/**
 * 목차 — 보이는 섹션과 정확히 일치한다(죽은 앵커 없음).
 * sm 이상: 가로 칩(스크롤 시 상단에 고정). 모바일: 접이식 "목차 (N)". 인쇄에서는 숨긴다.
 */
export function ReportToc({ items }: { items: readonly TocItem[] }) {
  if (items.length === 0) return null;
  return (
    <nav id={REPORT_TOC_ID} aria-label={REPORT_LABELS.toc} className="no-print sticky top-0 z-10 border-y border-dashed border-white/[0.28] bg-poster-2 px-5 py-2.5 text-poster-fg" data-testid="report-toc">
      <div className="hidden flex-wrap items-center gap-2 sm:flex" data-testid="toc-chips">
        <span className="mr-1 text-[12px] font-extrabold tracking-[0.1em]">{REPORT_LABELS.toc}</span>
        {items.map((i) => (
          <a key={i.id} href={`#${i.id}`} className="rounded-full bg-poster-3 px-3 py-1 text-[13px] text-poster-fg no-underline">
            {i.label}
          </a>
        ))}
      </div>
      <details className="sm:hidden" data-testid="toc-details">
        <summary className="cursor-pointer py-1 text-[14px] font-bold">
          {REPORT_LABELS.toc} ({items.length})
        </summary>
        <ul className="m-0 mt-2 grid list-none gap-1.5 p-0">
          {items.map((i) => (
            <li key={i.id}>
              <a
                href={`#${i.id}`}
                className="block bg-poster-3 px-3 py-2 text-[14px] text-poster-fg no-underline"
                // 이동하면 접이식 목차를 닫아 열린 목차가 이동한 제목을 가리지 않게 한다
                onClick={(e) => e.currentTarget.closest('details')?.removeAttribute('open')}
              >
                {i.label}
              </a>
            </li>
          ))}
        </ul>
      </details>
    </nav>
  );
}
