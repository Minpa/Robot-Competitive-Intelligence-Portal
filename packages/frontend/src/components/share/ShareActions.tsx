'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link2, Check, FileDown, Sparkles, Layers } from 'lucide-react';
import { api } from '@/lib/api';
import { buildTechTrendReportHtml } from '@/lib/tech-trend-report-html';
import { buildActuatorMapCardHtml, buildActuatorStrategyCardHtml } from './actuator/actuator-map-html';
import { ACTUATOR_MAP_QUERY_KEY } from './actuator/useActuatorMap';
import type { ActuatorMapResponse } from '@/types/actuator-map';
import { useTechTrendAnalysis } from './useTechTrendAnalysis';
import { useHandTopicClassification } from './useHandTopicClassification';
import type { TechTrendDomain, TechTrendReport } from '@/types/tech-trend-report';
import {
  isTimelineDomain,
  timelineDomainNoun,
  TIMELINE_DOMAIN_LABELS,
  type TechTrendTimeline,
  type TechTrendTimelineInsightResponse,
} from '@/types/tech-trend-timeline';

interface Props {
  report?: TechTrendReport;
  titleKo: string;
  titleEn: string;
  domain: TechTrendDomain;
  days: number;
}

const BTN =
  'inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium border border-ink-200 bg-white text-ink-700 hover:border-ink-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

/**
 * 공유 버튼 — 링크 복사(전원) + HTML 다운로드(admin만) + 분석/시계열 분류 실행(admin, 시계열 지원 도메인: hand·actuator).
 * admin 판정은 videos/page.tsx와 동일하게 /auth/me 의 role을 사용한다.
 */
export function ShareActions({ report, titleKo, titleEn, domain, days }: Props) {
  const meQuery = useQuery({ queryKey: ['me'], queryFn: () => api.getMe() });
  const isAdmin = (meQuery.data as { role?: string } | undefined)?.role === 'admin';
  const [copied, setCopied] = useState(false);
  const timelineDomain = isTimelineDomain(domain);
  const noun = timelineDomainNoun(domain);
  const videoScope = timelineDomain ? TIMELINE_DOMAIN_LABELS[domain].videoScope : TIMELINE_DOMAIN_LABELS.hand.videoScope;
  const showAnalyze = isAdmin && timelineDomain;
  const analysis = useTechTrendAnalysis(domain, days, showAnalyze);
  const queryClient = useQueryClient();
  const classification = useHandTopicClassification(domain, showAnalyze);
  const timelineQuery = useQuery({
    queryKey: ['tech-trend-timeline', domain],
    queryFn: () => api.getTechTrendTimeline(domain),
    enabled: false,
  });

  const handleAnalyze = () => {
    const ok = window.confirm(
      `${videoScope}을 Gemini로 분석합니다(최대 150건, 비용 발생, 수 분~수십 분 소요). 진행할까요?`
    );
    if (!ok) return;
    analysis.start();
  };

  const handleClassify = () => {
    const unclassified = timelineQuery.data?.classification.unclassified;
    const countText = typeof unclassified === 'number' ? `${unclassified}건` : '미분류 건';
    const ok = window.confirm(
      `미분류 ${countText}을 Claude Haiku로 분류합니다(약 $0.1~0.6, 수 분 소요). 진행할까요?`
    );
    if (!ok) return;
    classification.start();
  };

  const cs = classification.status;
  const classifyBusy = classification.running || classification.starting;
  const classifyFinished = !!cs && !cs.running && !!cs.finishedAt;

  const st = analysis.status;
  const analyzeBusy = analysis.running || analysis.starting;
  const finished = !!st && !st.running && !!st.finishedAt;
  const stoppedEarly = finished && (st.quotaHit || st.budgetHit);

  const handleCopy = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('아래 링크를 복사하세요', url);
    }
  };

  const handleDownload = () => {
    if (!report) return;
    // 같은 react-query 키로 캐시된 시계열 데이터를 읽어 넘긴다 (없으면 해당 카드만 생략)
    const timeline = queryClient.getQueryData<TechTrendTimeline>(['tech-trend-timeline', domain]);
    const insight = queryClient.getQueryData<TechTrendTimelineInsightResponse>(['tech-trend-timeline-insight', domain]);
    // 액추에이터 도메인: 같은 react-query 키로 캐시된 포지션 맵 데이터가 있으면 카드로 포함 (없으면 생략)
    const actuatorMap =
      domain === 'actuator' ? queryClient.getQueryData<ActuatorMapResponse>(ACTUATOR_MAP_QUERY_KEY) : undefined;
    // 액추에이터 도메인: 포지션 맵 카드(데이터 있을 때만) + 전략 카드(정적 원고는 데이터 없이도 항상 포함)
    const actuatorCardsHtml =
      domain === 'actuator'
        ? `${actuatorMap ? buildActuatorMapCardHtml(actuatorMap, window.location.href) : ''}${buildActuatorStrategyCardHtml(actuatorMap)}`
        : '';
    const html = buildTechTrendReportHtml(
      report,
      { pageUrl: window.location.href, titleKo, titleEn },
      timelineDomain ? { timeline, insight } : null,
      actuatorCardsHtml
    );
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ARGOS_${titleKo.replace(/\s+/g, '')}_${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="no-print flex flex-col items-end gap-1.5">
    <div className="flex items-center gap-2">
      <button type="button" onClick={handleCopy} className={BTN} title="현재 페이지 링크 복사">
        {copied ? <Check className="w-3.5 h-3.5 text-pos" /> : <Link2 className="w-3.5 h-3.5" />}
        {copied ? '복사됨' : '링크 복사'}
      </button>
      {isAdmin && (
        <button
          type="button"
          onClick={handleDownload}
          disabled={!report}
          className={BTN}
          title="단일 HTML 파일로 저장 (관리자)"
        >
          <FileDown className="w-3.5 h-3.5" />
          HTML 다운로드
        </button>
      )}
      {showAnalyze && (
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={analyzeBusy}
          className={BTN}
          title={`리포트 대상 영상을 Gemini로 분석하고 ${noun}와 무관한 영상을 제외 (관리자, 비용 발생)`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Gemini 전체 분석 실행
        </button>
      )}
      {showAnalyze && (
        <button
          type="button"
          onClick={handleClassify}
          disabled={classifyBusy}
          className={BTN}
          title={`${noun} 논문·영상을 기술 서브토픽으로 분류해 시계열에 반영 (관리자, Claude Haiku, 비용 발생)`}
        >
          <Layers className="w-3.5 h-3.5" />
          시계열 분류 실행
        </button>
      )}
    </div>
    {showAnalyze && (
      <div className="text-[11.5px] text-ink-500 text-right leading-relaxed">
        {analysis.running && st && (
          <p>
            분석 중 {st.processed}/{st.total}
            {st.excluded > 0 ? ` · 제외 ${st.excluded}` : ''}
          </p>
        )}
        {!analysis.running && analysis.lastResponse?.alreadyRunning && <p>이미 분석이 실행 중입니다.</p>}
        {!analysis.running && finished && st.total > 0 && (
          <p>
            완료: 분석 {st.analyzed} · 판정 {st.judged} · 제외 {st.excluded} · 실패 {st.failed}
          </p>
        )}
        {stoppedEarly && <p className="text-warn">쿼터/예산 한도로 중단됨 — 남은 영상은 다시 실행하면 이어서 처리</p>}
        {finished && st.judgeSkipped && <p className="text-warn">Anthropic 키 미설정으로 판정 단계를 건너뜀</p>}
        {classification.running && cs && (
          <p>
            분류 중 {cs.processed}/{cs.total}
          </p>
        )}
        {!classification.running && classification.lastResponse?.alreadyRunning && <p>이미 분류가 실행 중입니다.</p>}
        {!classification.running && classifyFinished && cs.total > 0 && (
          <p>
            완료: 분류 {cs.classified} · {noun} 무관 {cs.offTopic} · 실패 {cs.unresolved}
          </p>
        )}
        {classifyFinished && cs.aborted && (
          <p className="text-warn">API 오류가 연속 발생해 중단됨 — 다시 실행하면 남은 건을 이어서 처리</p>
        )}
        {classification.error && (
          <p className="text-neg">
            {/ANTHROPIC_API_KEY/.test(classification.error.message)
              ? `Anthropic 키 미설정: ${classification.error.message}`
              : classification.error.message}
          </p>
        )}
        {analysis.error && (
          <p className="text-neg">
            {/GEMINI_API_KEY/.test(analysis.error.message)
              ? `Gemini 키 미설정: ${analysis.error.message}`
              : analysis.error.message}
          </p>
        )}
      </div>
    )}
    </div>
  );
}
