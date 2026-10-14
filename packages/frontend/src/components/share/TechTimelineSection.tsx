'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Panel } from '@/components/ui';
import { TimelineVolumeChart } from './TimelineVolumeChart';
import { TopicSmallMultiples } from './TopicSmallMultiples';
import { TopicHeatmap } from './TopicHeatmap';
import { TimelineInsightCard } from './TimelineInsightCard';
import { TimelineClassificationBanner } from './TimelineClassificationBanner';
import { fullMonth, type TimelineBasis, type TimelineSourceKey } from './timeline-shared';
import type { TechTrendDomain } from '@/types/tech-trend-report';

/**
 * 기술 시계열 트렌드 (전체 기간) — 핸드 리포트 전용.
 * 서버 응답을 그리기만 한다 (집계·추세·선후행 계산은 백엔드). 차트는 AI 해설과 별도 쿼리라 해설 지연/실패와 무관하게 렌더된다.
 */
export function TechTimelineSection({ domain }: { domain: TechTrendDomain }) {
  const [source, setSource] = useState<TimelineSourceKey>('papers');
  const [basis, setBasis] = useState<TimelineBasis>('any');

  const meQuery = useQuery({ queryKey: ['me'], queryFn: () => api.getMe() });
  const isAdmin = (meQuery.data as { role?: string } | undefined)?.role === 'admin';

  const timelineQuery = useQuery({
    queryKey: ['tech-trend-timeline', domain],
    queryFn: () => api.getTechTrendTimeline(domain),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
  const timeline = timelineQuery.data;

  const insightQuery = useQuery({
    queryKey: ['tech-trend-timeline-insight', domain],
    queryFn: () => api.getTechTrendTimelineInsight(domain),
    enabled: !!timeline && !!timeline.period,
    staleTime: 30 * 60 * 1000,
    retry: 0,
  });

  const period = timeline?.period ?? null;
  const subtitle = period
    ? `${fullMonth(period.startMonth)} ~ ${fullMonth(period.endMonth)} · 리포트 기간(days)과 무관 · 상단 요약 수치와 집계 범위가 다릅니다`
    : '수집 시작월~현재월 · 리포트 기간(days)과 무관';

  const renderBody = () => {
    if (timelineQuery.isLoading) {
      return <div className="py-10 text-center text-ink-500 text-sm">기술 시계열을 집계하는 중…</div>;
    }
    if (timelineQuery.isError || !timeline) {
      return (
        <div className="py-10 flex flex-col items-center gap-3 text-sm">
          <p className="text-ink-600">시계열 데이터를 불러오지 못했습니다</p>
          <button
            type="button"
            onClick={() => timelineQuery.refetch()}
            className="no-print px-3 py-2 text-[12px] font-medium border border-ink-200 bg-white text-ink-700 hover:border-ink-400 transition-colors"
          >
            재시도
          </button>
        </div>
      );
    }
    if (!period || timeline.classification.total === 0) {
      return (
        <div className="py-10 text-center text-ink-500 text-sm">
          수집된 핸드 관련 데이터가 없습니다
          {timeline.scope.beforeRangeDropped > 0 && (
            <p className="text-[11.5px] mt-1">수집 시작보다 12개월 넘게 과거인 {timeline.scope.beforeRangeDropped}건은 제외되었습니다.</p>
          )}
        </div>
      );
    }

    const c = timeline.classification;
    const noneClassified = c.classified === 0;
    const placeholder = (
      <div className="report-panel border border-dashed border-ink-200 rounded-[10px] py-8 text-center text-[13px] text-ink-500">
        분류 완료 후 표시됩니다
      </div>
    );

    return (
      <div className="flex flex-col gap-4">
        <TimelineClassificationBanner classification={c} isAdmin={isAdmin} />
        {period.monthCount < 3 && (
          <p className="text-[12px] text-warn">수집 기간이 짧아 추이 해석에 한계가 있습니다({period.monthCount}개월)</p>
        )}

        <TimelineVolumeChart buckets={timeline.buckets} />

        {noneClassified ? (
          <>
            {placeholder}
            {placeholder}
          </>
        ) : (
          <>
            <TopicSmallMultiples
              topics={timeline.topics}
              buckets={timeline.buckets}
              source={source}
              basis={basis}
              onSourceChange={setSource}
              onBasisChange={setBasis}
            />
            <TopicHeatmap
              heatmap={timeline.heatmap}
              topics={timeline.topics}
              source={source}
              basis={basis}
              onSourceChange={setSource}
              onBasisChange={setBasis}
            />
          </>
        )}

        <p className="text-[11px] text-ink-500 leading-relaxed">
          논문은 arXiv cs.RO/cs.AI 최신 제출분을 일 1회(최대 30건) 수집한 표본이라 월별 건수는 실제 논문 수가 아닌 수집량 기준의
          상대 추이입니다. 핸드 판정은 키워드 필터와 AI 분류를 거칩니다. 핸드와 무관하다고 AI가 판정한 영상은 제외됩니다.
          {c.offTopic > 0 && ` AI가 핸드 무관으로 분류해 시계열에서 제외한 항목은 ${c.offTopic}건입니다.`}
          {timeline.scope.beforeRangeDropped > 0 &&
            ` 수집 시작보다 12개월 넘게 과거에 게시된 ${timeline.scope.beforeRangeDropped}건은 집계에서 제외했습니다.`}
          {timeline.scope.truncated && ' 조회 상한을 넘어 가장 오래된 일부 항목은 집계되지 않았습니다.'}
        </p>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <Panel kicker="Tech Timeline" title="기술 시계열 트렌드 (전체 기간)" subtitle={subtitle}>
        {renderBody()}
      </Panel>
      {timeline && period && timeline.classification.total > 0 && (
        <TimelineInsightCard
          data={insightQuery.data}
          loading={insightQuery.isLoading}
          error={insightQuery.isError}
          classification={timeline.classification}
          period={period}
        />
      )}
    </div>
  );
}
