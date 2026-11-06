'use client';

import { EXEC_LABELS, EXEC_TOC_ID, type ExecTocItem } from '@/lib/weekly-brief-exec';

/** 목차 — 보이는 섹션과 정확히 일치한다(죽은 앵커 없음). sm 이상: 가로 칩(상단 고정), 모바일: 접이식. 인쇄에서는 숨긴다 */
export function ExecToc({ items }: { items: readonly ExecTocItem[] }) {
  if (items.length === 0) return null;
  return (
    <nav id={EXEC_TOC_ID} aria-label={EXEC_LABELS.toc} className="no-print sticky top-0 z-10 border-y border-dashed border-white/[0.28] bg-poster-2 px-5 py-2.5 text-poster-fg" data-testid="exec-toc">
      <div className="hidden flex-wrap items-center gap-2 sm:flex" data-testid="toc-chips">
        <span className="mr-1 text-[12px] font-extrabold tracking-[0.1em]">{EXEC_LABELS.toc}</span>
        {items.map((i) => (
          <a key={i.id} href={`#${i.id}`} className="rounded-full bg-poster-3 px-3 py-1 text-[13px] text-poster-fg no-underline">
            {i.label}
          </a>
        ))}
      </div>
      <details className="sm:hidden" data-testid="toc-details">
        <summary className="cursor-pointer py-1 text-[14px] font-bold">
          {EXEC_LABELS.toc} ({items.length})
        </summary>
        <ul className="m-0 mt-2 grid list-none gap-1.5 p-0">
          {items.map((i) => (
            <li key={i.id}>
              <a href={`#${i.id}`} className="block bg-poster-3 px-3 py-2 text-[14px] text-poster-fg no-underline" onClick={(e) => e.currentTarget.closest('details')?.removeAttribute('open')}>
                {i.label}
              </a>
            </li>
          ))}
        </ul>
      </details>
    </nav>
  );
}
