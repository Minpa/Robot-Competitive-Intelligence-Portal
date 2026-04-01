'use client';

import { useState, useRef, useEffect } from 'react';
import { FlaskConical, Sparkles } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ManualPasteMode } from '@/components/insight-pipeline/ManualPasteMode';
import { InsightPanel } from '@/components/insight-pipeline/InsightPanel';
import { api } from '@/lib/api';
import type { AnalysisResult } from '@/types/insight-pipeline';

const PROGRESS_STEPS = [
  { topic: '주요 기업 & 제품', detail: 'Tesla Optimus, Figure, Agility Digit, Unitree...' },
  { topic: '중국 시장', detail: 'Unitree G1/H1, UBTECH Walker, Fourier GR-1...' },
  { topic: '일본/한국', detail: 'Rainbow Robotics, Hyundai, Honda, Toyota...' },
  { topic: 'SoC/프로세서', detail: 'NVIDIA Jetson, Qualcomm RB5, Hailo, Kneron...' },
  { topic: '액추에이터/모터', detail: 'Harmonic Drive, Maxon, Faulhaber...' },
  { topic: '적용 사례', detail: '물류(Amazon), 제조(BMW), 건설, 의료...' },
  { topic: '투자 동향', detail: 'Figure AI, 1X Technologies, Sanctuary AI...' },
  { topic: 'AI 모델', detail: 'RT-2, RT-X, OpenVLA, PaLM-E...' },
  { topic: '유럽 시장', detail: 'ABB, KUKA, Universal Robots, PAL Robotics...' },
  { topic: '센서/비전', detail: 'LiDAR, RealSense, 촉각 센서, IMU...' },
];

export default function InsightPipelinePage() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [articleTitle, setArticleTitle] = useState('');
  const [isAICollecting, setIsAICollecting] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [progressLogs, setProgressLogs] = useState<string[]>([]);
  const [batchResult, setBatchResult] = useState<{
    totalTopics: number; completed: number; failed: number;
    results: Array<{ topic: string; companiesSaved: number; productsSaved: number; articlesSaved: number; keywordsSaved: number; errors: string[] }>;
  } | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [progressLogs]);

  useEffect(() => {
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  const handleAnalysisComplete = (result: AnalysisResult) => {
    setAnalysisResult(result);
    setSaveSuccess(false);
    setIsDuplicate(false);
  };

  const addLog = (msg: string) => {
    setProgressLogs((prev) => [...prev, msg]);
  };

  const handleAICollect = async () => {
    if (isAICollecting) return;
    setAiError(null);
    setIsAICollecting(true);
    setBatchResult(null);
    setProgressLogs([]);

    const startTime = Date.now();
    addLog('> Claude Sonnet 4 연결 중...');

    // Simulate progress logs while the batch API runs
    let stepIndex = 0;
    const subSteps = ['분석 중...', '엔티티 추출 중...', 'DB 저장 중...'];

    progressInterval.current = setInterval(() => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);

      if (stepIndex < PROGRESS_STEPS.length) {
        const step = PROGRESS_STEPS[stepIndex];
        const sub = subSteps[stepIndex % subSteps.length];
        addLog(`[${elapsed}s] ${step.topic} ${sub} (${step.detail})`);
        stepIndex++;
      } else {
        // Loop through waiting messages
        const waitMsgs = [
          '응답 대기 중...',
          '데이터 정리 중...',
          '엔티티 링킹 중...',
          '키워드 매핑 중...',
        ];
        addLog(`[${elapsed}s] ${waitMsgs[(stepIndex - PROGRESS_STEPS.length) % waitMsgs.length]}`);
        stepIndex++;
      }
    }, 6000);

    setTimeout(() => addLog('> 웹 검색 활성화 (실시간 데이터)'), 800);
    setTimeout(() => addLog('> 10개 주제 배치 시작'), 1600);

    try {
      const result = await api.generateDataBatch('claude', true);
      if (progressInterval.current) clearInterval(progressInterval.current);
      const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      addLog(`[${totalElapsed}s] 완료! ${result.completed}/${result.totalTopics} 주제 수집 성공`);
      setBatchResult(result);
    } catch (err: any) {
      if (progressInterval.current) clearInterval(progressInterval.current);
      addLog(`> 오류 발생: ${err?.message ?? '알 수 없는 오류'}`);
      setAiError(err?.message ?? 'AI 데이터 수집 중 오류가 발생했습니다.');
    } finally {
      setIsAICollecting(false);
    }
  };

  const handleSave = async (result: AnalysisResult) => {
    setIsSaving(true);
    setSaveSuccess(false);
    setIsDuplicate(false);

    try {
      const linkedCompanyIds = result.entities.companies
        .filter((e) => e.linkedEntityId)
        .map((e) => e.linkedEntityId!);
      const linkedRobotIds = result.entities.products
        .filter((e) => e.linkedEntityId)
        .map((e) => e.linkedEntityId!);
      const linkedComponentIds = result.entities.components
        .filter((e) => e.linkedEntityId)
        .map((e) => e.linkedEntityId!);
      const linkedApplicationIds = result.entities.applications
        .filter((e) => e.linkedEntityId)
        .map((e) => e.linkedEntityId!);

      const encoder = new TextEncoder();
      const data = encoder.encode(result.summary + articleTitle);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const contentHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      await api.saveAnalysis({
        title: articleTitle || '분석 결과',
        summary: result.summary,
        contentHash,
        linkedCompanyIds,
        linkedRobotIds,
        linkedComponentIds,
        linkedApplicationIds,
        keywords: result.entities.keywords.map((kw) => ({
          term: kw.term,
          relevance: kw.relevance,
        })),
      });

      setSaveSuccess(true);
    } catch (err: any) {
      if (err?.message?.includes('409') || err?.message?.includes('duplicate')) {
        setIsDuplicate(true);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleLinkEntity = (entityName: string, linkedEntityId: string) => {
    if (!analysisResult) return;

    setAnalysisResult((prev) => {
      if (!prev) return prev;

      const updateEntities = (entities: typeof prev.entities.companies) =>
        entities.map((e) =>
          e.name === entityName ? { ...e, linkedEntityId } : e
        );

      return {
        ...prev,
        entities: {
          companies: updateEntities(prev.entities.companies),
          products: updateEntities(prev.entities.products),
          components: updateEntities(prev.entities.components),
          applications: updateEntities(prev.entities.applications),
          workforce: updateEntities(prev.entities.workforce),
          market: updateEntities(prev.entities.market),
          technology: updateEntities(prev.entities.technology),
          keywords: prev.entities.keywords,
        },
      };
    });
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950 p-6 space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <FlaskConical className="w-7 h-7 text-violet-400" />
            기사 분석
          </h1>
          <button
            onClick={handleAICollect}
            disabled={isAICollecting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-violet-600 hover:bg-violet-500 text-white"
          >
            <Sparkles className="w-4 h-4" />
            {isAICollecting ? 'AI 데이터 모으는 중...' : 'AI 데이터 모으기'}
          </button>
        </div>

        {/* Console-style progress log */}
        {(progressLogs.length > 0 || aiError) && (
          <div className="bg-slate-950 border border-slate-700 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/80 border-b border-slate-700">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <span className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-xs text-slate-500 font-mono ml-2">AI 데이터 수집</span>
              {isAICollecting && (
                <span className="ml-auto flex items-center gap-1.5 text-xs text-violet-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                  실행 중
                </span>
              )}
              {batchResult && !isAICollecting && (
                <span className="ml-auto text-xs text-emerald-400">
                  완료 {batchResult.completed}/{batchResult.totalTopics}
                </span>
              )}
            </div>
            <div className="p-4 max-h-52 overflow-y-auto font-mono text-xs leading-relaxed scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {progressLogs.map((log, i) => (
                <div
                  key={i}
                  className={`${
                    log.startsWith('>')
                      ? 'text-violet-400'
                      : log.includes('완료!')
                        ? 'text-emerald-400 font-medium'
                        : log.includes('오류')
                          ? 'text-red-400'
                          : 'text-slate-400'
                  }`}
                >
                  {log}
                </div>
              ))}
              {isAICollecting && (
                <span className="inline-block w-2 h-4 bg-violet-400 animate-pulse ml-0.5" />
              )}
              <div ref={logEndRef} />
            </div>
            {batchResult && (
              <div className="border-t border-slate-800 px-4 py-3 text-xs text-slate-400 space-y-1">
                {batchResult.results.map((r, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="truncate flex-1 mr-2">{r.topic}</span>
                    <span className="text-slate-500 whitespace-nowrap">
                      기업 {r.companiesSaved} · 제품 {r.productsSaved} · 기사 {r.articlesSaved} · 키워드 {r.keywordsSaved}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column: article input */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <ManualPasteMode
              onAnalysisComplete={handleAnalysisComplete}
              isAnalyzing={isAnalyzing}
              setIsAnalyzing={setIsAnalyzing}
              articleTitle={articleTitle}
              setArticleTitle={setArticleTitle}
            />
          </div>

          {/* Right column: insight panel */}
          <div>
            <InsightPanel
              result={analysisResult}
              sourceType="manual"
              onSave={handleSave}
              onLinkEntity={handleLinkEntity}
              isSaving={isSaving}
              saveSuccess={saveSuccess}
              isDuplicate={isDuplicate}
            />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
