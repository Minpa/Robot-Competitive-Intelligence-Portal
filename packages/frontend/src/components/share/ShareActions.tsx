'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link2, Check, FileDown, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { buildTechTrendReportHtml } from '@/lib/tech-trend-report-html';
import { useTechTrendAnalysis } from './useTechTrendAnalysis';
import type { TechTrendDomain, TechTrendReport } from '@/types/tech-trend-report';

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
 * 공유 버튼 — 링크 복사(전원) + HTML 다운로드(admin만).
 * admin 판정은 videos/page.tsx와 동일하게 /auth/me 의 role을 사용한다.
 */
export function ShareActions({ report, titleKo, titleEn, domain, days }: Props) {
  const meQuery = useQuery({ queryKey: ['me'], queryFn: () => api.getMe() });
  const isAdmin = (meQuery.data as { role?: string } | undefined)?.role === 'admin';
  const [copied, setCopied] = useState(false);
  const showAnalyze = isAdmin && domain === 'hand';
  const analysis = useTechTrendAnalysis(domain, days, showAnalyze);

  const handleAnalyze = () => {
    const ok = window.confirm(
      '핸드 리포트 대상 영상을 Gemini로 분석합니다(최대 150건, 비용 발생, 수 분~수십 분 소요). 진행할까요?'
    );
    if (!ok) return;
    analysis.start();
  };

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
    const html = buildTechTrendReportHtml(report, { pageUrl: window.location.href, titleKo, titleEn });
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
          title="리포트 대상 영상을 Gemini로 분석하고 핸드와 무관한 영상을 제외 (관리자, 비용 발생)"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Gemini 전체 분석 실행
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
