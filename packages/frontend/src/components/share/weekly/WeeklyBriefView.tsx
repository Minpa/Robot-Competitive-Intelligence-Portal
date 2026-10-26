'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { isValidWeekStart } from '@/lib/weekly-brief-format';
import { POSTER_WHITE } from '@/lib/weekly-brief-theme';
import { WeeklyBriefPoster } from './WeeklyBriefPoster';
import { GenerateButton, GenerateStatus, WeeklyBriefToolbar } from './WeeklyBriefToolbar';
import { isNotFoundError, useWeeklyBrief } from './useWeeklyBrief';
import { useWeeklyBriefGenerate } from './useWeeklyBriefGenerate';

interface Props {
  /** 지정하면 해당 주(/share/weekly/[weekStart]), 없으면 최신(/share/weekly) */
  weekStart?: string;
}

const PANEL = 'mx-auto w-full max-w-[760px] border border-ink-200 bg-white px-6 py-10 text-center';

/**
 * 주간 브리프 화면 — 데이터 로딩(react-query), 로딩/오류/빈 상태, 툴바와 포스터 조립.
 * admin 판정은 ShareActions 와 같이 ['me'] 쿼리의 role 을 쓴다.
 */
export function WeeklyBriefView({ weekStart }: Props) {
  const invalid = weekStart !== undefined && !isValidWeekStart(weekStart);

  const meQuery = useQuery({ queryKey: ['me'], queryFn: () => api.getMe() });
  const isAdmin = (meQuery.data as { role?: string } | undefined)?.role === 'admin';
  const generate = useWeeklyBriefGenerate(isAdmin);
  const briefQuery = useWeeklyBrief(weekStart, !invalid);

  // 인쇄: 툴바 숨김, 어두운 배경 유지, 블록 절단 금지 (TechTrendShareView 의 <style jsx global> 패턴)
  const printStyle = (
    <style jsx global>{`
      @page {
        size: A4 portrait;
        margin: 10mm;
      }
      @media print {
        .no-print {
          display: none !important;
        }
        body {
          background: ${POSTER_WHITE};
        }
        .weekly-poster,
        .weekly-poster * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .poster-block,
        .poster-card,
        .poster-row {
          break-inside: avoid;
          page-break-inside: avoid;
        }
      }
    `}</style>
  );

  if (invalid) {
    return (
      <div className="flex flex-col gap-4 px-4 py-6" data-testid="weekly-invalid">
        {printStyle}
        <div className={PANEL}>
          <p className="m-0 text-[15px] font-semibold text-ink-900">올바르지 않은 주차입니다</p>
          <p className="mt-2 text-[13px] text-ink-600">주차는 월요일 날짜(YYYY-MM-DD)여야 합니다.</p>
          <Link href="/share/weekly/archive" className="mt-4 inline-block text-[13px] text-info hover:underline">
            아카이브에서 주차 선택
          </Link>
        </div>
      </div>
    );
  }

  const brief = briefQuery.data;
  const notFound = briefQuery.isError && isNotFoundError(briefQuery.error);

  // "지금 생성" 대상: 특정 주를 보고 있으면 그 주, 아니면 서버 기본값(직전 완료 주)
  const targetWeekStart = weekStart ?? generate.status?.targetWeekStart;
  const targetExists = weekStart ? !!brief : generate.status?.targetExists ?? false;
  const targetReady = weekStart ? !briefQuery.isLoading : !!generate.status;

  if (briefQuery.isLoading) {
    return (
      <div className="px-4 py-6">
        {printStyle}
        <div className={PANEL}>
          <p className="m-0 text-[13px] text-ink-500">주간 브리프를 불러오는 중…</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col gap-4 px-4 py-6" data-testid="weekly-empty">
        {printStyle}
        <div className={PANEL}>
          <p className="m-0 text-[16px] font-semibold text-ink-900">
            {weekStart ? '해당 주차 브리프 없음' : '아직 발행된 브리프가 없습니다'}
          </p>
          <p className="mt-2 text-[13px] text-ink-600">
            {weekStart
              ? `${weekStart} 주차의 브리프가 아직 생성되지 않았습니다.`
              : '브리프는 매주 월요일 오전에 직전 주(월~일) 기준으로 자동 발행됩니다.'}
          </p>
          {isAdmin && (
            <div className="mt-5 flex flex-col items-center gap-2">
              <GenerateButton
                generate={generate}
                targetWeekStart={targetWeekStart}
                targetExists={targetExists}
                ready={targetReady}
                large
              />
              <GenerateStatus generate={generate} viewingWeekStarts={[targetWeekStart]} />
            </div>
          )}
          <div className="mt-4">
            <Link href="/share/weekly/archive" className="text-[13px] text-info hover:underline">
              아카이브 보기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (briefQuery.isError || !brief) {
    return (
      <div className="px-4 py-6" data-testid="weekly-error">
        {printStyle}
        <div className={PANEL}>
          <p className="m-0 text-[14px] text-ink-700">주간 브리프를 불러오지 못했습니다</p>
          <p className="mt-1 text-[12px] text-ink-500">{briefQuery.error?.message}</p>
          <button
            type="button"
            onClick={() => briefQuery.refetch()}
            className="no-print mt-4 border border-ink-200 bg-white px-3 py-2 text-[12px] font-medium text-ink-700 transition-colors hover:border-ink-400"
          >
            재시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-0 py-2 sm:px-2" data-testid="weekly-view">
      {printStyle}
      <WeeklyBriefToolbar
        brief={brief}
        isAdmin={isAdmin}
        generate={generate}
        targetWeekStart={targetWeekStart}
        targetExists={targetExists}
        targetReady={targetReady}
      />
      <WeeklyBriefPoster brief={brief} />
    </div>
  );
}
