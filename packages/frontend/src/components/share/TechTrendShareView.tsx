'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel } from '@/components/ui';
import { ShareActions } from './ShareActions';
import { ReportSummaryCards } from './ReportSummaryCards';
import { ReportInsightCard } from './ReportInsightCard';
import { ReportVideoGrid } from './ReportVideoGrid';
import { ReportPaperList } from './ReportPaperList';
import type { TechTrendDomain } from '@/types/tech-trend-report';

/**
 * 공유용 기술 트렌드 리포트 — 최근 N일 영상 + 논문 + AI 시사점.
 * 영상 제목·논문은 원어 그대로 표시하고(번역 없음), 공개 메타데이터만 포함한다.
 */

interface ShareDomainMeta {
  titleKo: string;
  titleEn: string;
}

export const SHARE_DOMAIN_META: Record<TechTrendDomain, ShareDomainMeta> = {
  hand: { titleKo: '핸드 기술 트렌드', titleEn: 'Hand Technology Trend' },
  rfm: { titleKo: 'RFM 기술 트렌드', titleEn: 'Robot Foundation Model Trend' },
  actuator: { titleKo: '액추에이터 기술 트렌드', titleEn: 'Actuator Technology Trend' },
  expo: { titleKo: '전시회 트렌드', titleEn: 'Exhibition Watch' },
  production: { titleKo: '양산 트렌드', titleEn: 'Production Watch' },
};

function isShareDomain(d: string): d is TechTrendDomain {
  return Object.prototype.hasOwnProperty.call(SHARE_DOMAIN_META, d);
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function fmtDate(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${fmtDate(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** URL 쿼리 days — 7~90 정수가 아니면 30 */
function parseDays(raw: string | null): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 7 && n <= 90 ? n : 30;
}

export function TechTrendShareView() {
  const params = useParams();
  const searchParams = useSearchParams();
  const domainParam = String(params.domain ?? '');
  const supported = isShareDomain(domainParam);
  const domain = supported ? domainParam : null;
  const days = parseDays(searchParams.get('days'));

  const reportQuery = useQuery({
    queryKey: ['tech-trend-report', domain, days],
    queryFn: () => api.getTechTrendReport(domain!, days),
    enabled: !!domain,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });

  if (!domain) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-ink-500">지원하지 않는 공유 리포트 도메인입니다.</p>
        <Link href="/video-trends" className="text-info hover:underline mt-2">
          홈으로
        </Link>
      </div>
    );
  }

  const meta = SHARE_DOMAIN_META[domain];
  const report = reportQuery.data;
  const secondLabel = report?.secondKind === 'news' ? '기사' : '논문';
  const secondUnit = report?.secondKind === 'news' ? '건' : '편';

  const description = report
    ? `최근 ${report.days}일 (${fmtDate(report.periodStart)} – ${fmtDate(report.periodEnd)}) · 영상 ${report.stats.videoCount}건 · ${secondLabel} ${report.stats.paperCount}${secondUnit} · 생성 ${fmtDateTime(report.generatedAt)}`
    : reportQuery.isError
      ? `최근 ${days}일`
      : `최근 ${days}일 · 리포트를 생성하는 중…`;

  return (
    <AuthGuard>
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .report-panel {
            break-inside: avoid;
          }
          body {
            background: #fff;
          }
        }
      `}</style>
      <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-6">
        <PageHeader
          module="Share · Report"
          titleKo={meta.titleKo}
          titleEn={meta.titleEn}
          description={description}
          actions={<ShareActions report={report} titleKo={meta.titleKo} titleEn={meta.titleEn} />}
        />

        {reportQuery.isLoading && (
          <Panel className="report-panel">
            <div className="py-10 text-center text-ink-500 text-sm">
              리포트를 생성하는 중… (첫 생성 시 시사점 작성에 수 초 소요)
            </div>
          </Panel>
        )}

        {reportQuery.isError && (
          <Panel className="report-panel">
            <div className="py-10 flex flex-col items-center gap-3 text-sm">
              <p className="text-ink-600">리포트를 불러오지 못했습니다</p>
              <button
                type="button"
                onClick={() => reportQuery.refetch()}
                className="no-print px-3 py-2 text-[12px] font-medium border border-ink-200 bg-white text-ink-700 hover:border-ink-400 transition-colors"
              >
                재시도
              </button>
            </div>
          </Panel>
        )}

        {report && (
          <>
            <ReportSummaryCards report={report} />
            <ReportInsightCard insight={report.insight} />
            <ReportVideoGrid videos={report.videos} total={report.stats.videoCount} truncated={report.truncated.videos} />
            <ReportPaperList
              papers={report.papers}
              total={report.stats.paperCount}
              truncated={report.truncated.papers}
              kind={report.secondKind}
            />
            <p className="text-[11px] text-ink-400 leading-relaxed text-center pt-2">
              본 리포트는 공개 메타데이터(제목·썸네일 URL·링크)와 AI 생성 요약만 포함하며 원문을 복제하지 않습니다.
              ARGOS · {fmtDate(report.generatedAt)}
            </p>
          </>
        )}
      </div>
    </AuthGuard>
  );
}
