'use client';

import Link from 'next/link';
import {
  formatCountsSummary,
  formatKstDateTime,
  formatWeekTitle,
} from '@/lib/weekly-brief-format';
import { useWeeklyBriefList } from './useWeeklyBrief';

/** 최근 26주 목록 — 한 줄: 기간 · Week N, 건수 요약, 생성 시각, partial 태그 */
export function WeeklyArchiveList() {
  const query = useWeeklyBriefList(26);
  const items = query.data;

  if (query.isLoading) {
    return <div className="border border-ink-200 bg-white px-6 py-10 text-center text-[13px] text-ink-500">목록을 불러오는 중…</div>;
  }
  if (query.isError) {
    return (
      <div className="border border-ink-200 bg-white px-6 py-10 text-center text-[13px] text-ink-700">
        <p className="m-0">주간 브리프 목록을 불러오지 못했습니다</p>
        <p className="mt-1 text-[12px] text-ink-500">{query.error.message}</p>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="mt-3 border border-ink-200 bg-white px-3 py-2 text-[12px] font-medium text-ink-700 hover:border-ink-400"
        >
          재시도
        </button>
      </div>
    );
  }
  if (!items || items.length === 0) {
    return (
      <div className="border border-ink-200 bg-white px-6 py-10 text-center text-[13px] text-ink-600" data-testid="archive-empty">
        아직 발행된 브리프가 없습니다. 브리프는 매주 월요일 오전에 자동 발행됩니다.
      </div>
    );
  }
  return (
    <ul className="m-0 list-none border border-ink-200 bg-white p-0" data-testid="archive-list">
      {items.map((it) => (
        <li key={it.weekStart} className="border-t border-ink-200 first:border-t-0">
          <Link
            href={`/share/weekly/${it.weekStart}`}
            className="grid grid-cols-1 gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-ink-50 sm:grid-cols-[1fr_auto]"
          >
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-ink-900">
                {formatWeekTitle(it.weekStart, it.weekEnd, it.weekNumber)}
                {it.status === 'partial' && (
                  <span className="ml-2 border border-warn bg-warn-soft px-1.5 py-px align-middle text-[11px] font-medium text-ink-700">
                    일부 규칙 기반
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-[12px] text-ink-600">{formatCountsSummary(it.counts)}</div>
            </div>
            <div className="text-[12px] text-ink-500 sm:whitespace-nowrap sm:text-right">
              생성 {formatKstDateTime(it.generatedAt)} KST
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
