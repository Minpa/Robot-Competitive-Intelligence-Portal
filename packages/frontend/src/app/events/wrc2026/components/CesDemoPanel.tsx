'use client';

/**
 * CesDemoPanel — CES 부스 시연 전환 가능성 분석 패널
 * 브리프가 있는 영상 중 시연·상호작용 성격이 강한 후보를 Gemini로 분석해
 * 텔레오퍼레이션 여부/관람객 참여 가능성/난이도/재미 요소/데모 아이디어를 카드로 보여준다.
 */

import { Sparkles, Loader2 } from 'lucide-react';
import { Panel, Tag } from '@/components/ui';
import { CHART_HUE, CHART_HUE_MUTED } from './chartColors';
import { thumbFallback } from '../utils';
import type { CesDemoVideo, CesInsight, EventVideo } from '../types';

interface RunBatchResult {
  analyzed: number;
  failed: number;
  skipped: number;
  candidateTotal: number;
  alreadyRunning?: boolean;
}

interface Props {
  data?: { videos: CesDemoVideo[]; insight: CesInsight | null; candidateTotal: number };
  videoMap: Map<string, EventVideo>;
  onSelectVideo: (video: EventVideo) => void;
  isAdmin: boolean;
  onRunBatch: () => void;
  runBatchPending: boolean;
  runBatchResult?: RunBatchResult;
}

const EMPTY_CELL = '#E5E7EB'; // 미충족 칸(연한 회색)

function ScoreBar({ label, value, color, hint }: { label: string; value: number; color: string; hint?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-[10.5px] text-ink-500 leading-tight">
        {label}
        {hint && <span className="block text-[9px] text-ink-400">{hint}</span>}
      </span>
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="w-3 h-2.5 rounded-sm"
            style={{ backgroundColor: i < value ? color : EMPTY_CELL }}
          />
        ))}
      </div>
      <span className="text-[10.5px] font-mono text-ink-600">{value}/5</span>
    </div>
  );
}

function RunBatchButton({ pending, onClick }: { pending: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="inline-flex items-center gap-2 px-3 py-2 text-[12px] font-medium border border-ink-200 bg-white text-ink-700 hover:border-ink-400 transition-colors disabled:opacity-50"
    >
      {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
      CES 데모 분석 실행
    </button>
  );
}

function ResultBanner({ result }: { result: RunBatchResult }) {
  if (result.alreadyRunning) {
    return (
      <div className="text-[12px] text-ink-600 bg-ink-50 border border-ink-200 rounded-lg px-4 py-2.5">
        CES 데모 분석이 이미 진행 중입니다 — 잠시 후 목록이 자동 갱신됩니다. (중복 분석은 실행되지 않았습니다)
      </div>
    );
  }
  return (
    <div className="text-[12px] text-ink-600 bg-ink-50 border border-ink-200 rounded-lg px-4 py-2.5">
      CES 데모 분석 완료 — 성공 {result.analyzed}건, 실패 {result.failed}건, 건너뜀 {result.skipped}건 (후보{' '}
      {result.candidateTotal}건 중 처리)
      {result.skipped > 0 && ' — 건너뜀은 대부분 Gemini 일일 쿼터 소진'}
    </div>
  );
}

export function CesDemoPanel({
  data,
  videoMap,
  onSelectVideo,
  isAdmin,
  onRunBatch,
  runBatchPending,
  runBatchResult,
}: Props) {
  const videos = data?.videos ?? [];
  const insight = data?.insight ?? null;
  const candidateTotal = data?.candidateTotal ?? 0;

  if (videos.length === 0 && !isAdmin) return null;

  if (videos.length === 0) {
    // 관리자 전용: 아직 분석 결과가 없을 때는 안내 문구 + 실행 버튼만 노출
    return (
      <Panel kicker="CES Demo Readiness" title="CES 시연 준비 시사점 — 텔레오퍼레이션·관람객 참여">
        <div className="space-y-3">
          <p className="text-[12px] text-ink-500">
            아직 분석된 영상이 없습니다. 분석 대상 후보 {candidateTotal}건
          </p>
          <RunBatchButton pending={runBatchPending} onClick={onRunBatch} />
          {runBatchResult && <ResultBanner result={runBatchResult} />}
        </div>
      </Panel>
    );
  }

  return (
    <Panel kicker="CES Demo Readiness" title="CES 시연 준비 시사점 — 텔레오퍼레이션·관람객 참여">
      <div className="space-y-4">
        {insight && insight.points.length > 0 && (
          <div className="border-l-2 border-info pl-4 py-1">
            <div className="flex items-center gap-1.5 text-info text-[11px] font-semibold">
              <Sparkles className="w-3 h-3" />
              CES 시연 준비 인사이트 (AI 분석)
            </div>
            <ul className="mt-1.5 space-y-1">
              {insight.points.map((p, i) => (
                <li key={i} className="text-[12.5px] text-ink-700 leading-relaxed">
                  <span className="mr-1.5">•</span>
                  {p}
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-[10.5px] text-ink-400">
              내부 CES 데모 분석 데이터 기반 AI 제안 · {videos.length}건 영상 분석 결과
            </p>
          </div>
        )}

        {isAdmin && (
          <div className="flex items-center gap-3 flex-wrap">
            <RunBatchButton pending={runBatchPending} onClick={onRunBatch} />
            <span className="text-[11.5px] text-ink-500">분석 대상 후보 {candidateTotal}건</span>
          </div>
        )}
        {isAdmin && runBatchResult && <ResultBanner result={runBatchResult} />}

        <div className="space-y-4">
          {videos.slice(0, 8).map((v) => {
            const linked = videoMap.get(v.id);
            const thumb = v.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={v.thumbnail}
                alt={v.title}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={thumbFallback}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[10px] text-ink-400">썸네일 없음</div>
            );

            return (
              <div key={v.id} className="grid grid-cols-[96px_1fr] sm:grid-cols-[140px_1fr] gap-4">
                {linked ? (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectVideo(linked);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="relative aspect-video overflow-hidden rounded border border-ink-200 hover:border-ink-400 transition-colors bg-ink-100"
                  >
                    {thumb}
                  </button>
                ) : (
                  <div className="relative aspect-video overflow-hidden rounded border border-ink-200 bg-ink-100">
                    {thumb}
                  </div>
                )}

                <div className="min-w-0 space-y-1.5">
                  <h4 className="text-[12.5px] font-semibold text-ink-900 leading-snug line-clamp-2">
                    {v.titleKo ?? v.title}
                  </h4>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {v.cesDemo.teleop && (
                      <Tag tone="pos" size="sm">
                        텔레오퍼레이션
                      </Tag>
                    )}
                    {v.cesDemo.audience && (
                      <Tag tone="info" size="sm">
                        관람객 참여
                      </Tag>
                    )}
                  </div>
                  <div className="space-y-1">
                    <ScoreBar label="일반인 시연 가능성" value={v.cesDemo.publicFriendly} color={CHART_HUE} />
                    <ScoreBar label="재미 요소" value={v.cesDemo.funFactor} color={CHART_HUE} />
                    <ScoreBar
                      label="난이도"
                      value={v.cesDemo.difficulty}
                      color={CHART_HUE_MUTED}
                      hint="(낮을수록 시연 부담 적음)"
                    />
                  </div>
                  {v.cesDemo.demoIdea && (
                    <p className="text-[11px] italic text-ink-500 leading-relaxed">{v.cesDemo.demoIdea}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {videos.length > 8 && <p className="text-[11px] text-ink-400">외 {videos.length - 8}건</p>}
      </div>
    </Panel>
  );
}
