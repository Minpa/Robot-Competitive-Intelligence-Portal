'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Archive, Check, ChevronLeft, ChevronRight, FileDown, Link2, Loader2, RefreshCw } from 'lucide-react';
import type { WeeklyBriefResponse, WeeklyBriefRunStatus } from '@/types/weekly-brief';
import { buildWeeklyBriefHtml, weeklyBriefFileName } from '@/lib/weekly-brief-html';
import { formatCostUsd, formatDurationMs, weeklyBriefPermalink } from '@/lib/weekly-brief-format';
import type { useWeeklyBriefGenerate } from './useWeeklyBriefGenerate';

export type WeeklyGenerateState = ReturnType<typeof useWeeklyBriefGenerate>;

const BTN =
  'inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium border border-ink-200 bg-white text-ink-700 hover:border-ink-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_DISABLED_LINK = `${BTN} opacity-50 cursor-not-allowed hover:border-ink-200`;

const PHASE_STEPS: { key: WeeklyBriefRunStatus['phase']; label: string }[] = [
  { key: 'collecting', label: '수집' },
  { key: 'summarizing', label: '요약' },
  { key: 'persisting', label: '저장' },
];

const ERROR_MESSAGES: Record<string, string> = {
  already_running: '이미 생성 중입니다. 완료될 때까지 기다려 주세요.',
  week_not_complete: '아직 끝나지 않은 주차는 생성할 수 없습니다.',
  invalid_week_start: '올바르지 않은 주차입니다.',
};

export function generateErrorText(message: string): string {
  return ERROR_MESSAGES[message] ?? message;
}

interface GenerateButtonProps {
  generate: WeeklyGenerateState;
  /** 생성 대상 주 (route 의 weekStart 또는 서버 기본값) */
  targetWeekStart?: string;
  /** 대상 주에 이미 브리프가 있는지 */
  targetExists: boolean;
  /** 대상 주 존재 여부가 확정됐는지 (로딩 중이면 false) */
  ready: boolean;
  large?: boolean;
}

/** "지금 생성" — 기존 주차는 덮어쓰기 확인(force:true), 없으면 일반 확인(force:false). 비용 안내 포함 */
export function GenerateButton({ generate, targetWeekStart, targetExists, ready, large }: GenerateButtonProps) {
  const busy = generate.running || generate.starting || generate.waitingForStart;
  const handle = () => {
    if (!targetWeekStart) return;
    const ok = window.confirm(
      targetExists
        ? `${targetWeekStart} 주 브리프가 이미 있습니다. 덮어쓰기로 다시 생성할까요?\nAI 문장 생성 비용(회당 약 $0.1 이하)이 발생합니다.`
        : `${targetWeekStart} 주 브리프를 생성할까요?\nAI 문장 생성 비용(회당 약 $0.1 이하)이 발생할 수 있습니다.`
    );
    if (!ok) return;
    generate.start({ weekStart: targetWeekStart, force: targetExists });
  };
  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy || !ready || !targetWeekStart}
      className={
        large
          ? 'inline-flex items-center gap-2 px-5 py-3 text-[14px] font-semibold bg-ink-900 text-white border border-ink-900 hover:bg-ink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
          : BTN
      }
      title={
        targetWeekStart
          ? `${targetWeekStart} 주 브리프를 지금 생성합니다 (관리자, AI 비용 발생 가능)`
          : '생성 대상 주를 확인하는 중…'
      }
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
      {targetExists ? '지금 다시 생성' : '지금 생성'}
    </button>
  );
}

/** 진행 단계·완료 요약·오류 표시 */
export function GenerateStatus({
  generate,
  viewingWeekStarts,
}: {
  generate: WeeklyGenerateState;
  /** 현재 보고 있는 주차 후보 — lastRun.weekStart 가 이 중 하나일 때만 완료·실패 요약을 보여준다 */
  viewingWeekStarts: (string | undefined)[];
}) {
  const { status } = generate;
  const busy = generate.running || generate.starting || generate.waitingForStart;
  const lastRun = status?.lastRun ?? null;
  const recentManual =
    !!lastRun && lastRun.reason === 'manual' && Date.now() - new Date(lastRun.finishedAt).getTime() < 10 * 60 * 1000;
  const sameWeek = !!lastRun && viewingWeekStarts.some((w) => !!w && w === lastRun.weekStart);
  const showLastRun = !busy && !!lastRun && sameWeek && (generate.finishedInSession || recentManual);

  return (
    <div className="text-right text-[11.5px] leading-relaxed text-ink-500" data-testid="generate-status" aria-live="polite">
      {busy && (
        <p data-testid="generate-progress">
          생성 중… {PHASE_STEPS.map((s, i) => (
            <span key={s.key} className={generate.phase === s.key ? 'font-semibold text-ink-900' : undefined}>
              {i > 0 && ' → '}
              {s.label}
            </span>
          ))}
          {generate.phase !== 'idle' && (
            <span> · 현재 {PHASE_STEPS.find((s) => s.key === generate.phase)?.label} 단계</span>
          )}
          {status?.current && <span> · 대상 {status.current.weekStart}</span>}
        </p>
      )}
      {!busy && generate.skippedExists && <p>이미 생성된 주차입니다 (건너뜀). 다시 만들려면 덮어쓰기로 실행하세요.</p>}
      {!busy && generate.error && <p className="text-neg">{generateErrorText(generate.error.message)}</p>}
      {showLastRun && lastRun && lastRun.outcome === 'created' && (
        <p data-testid="generate-done">
          완료 · {lastRun.status ?? '-'}
          {formatCostUsd(lastRun.costUsd) && ` · 비용 ${formatCostUsd(lastRun.costUsd)}`}
          {formatDurationMs(lastRun.durationMs) && ` · ${formatDurationMs(lastRun.durationMs)}`}
          {lastRun.warnings.length > 0 && ` · 참고: ${lastRun.warnings.join(', ')}`}
        </p>
      )}
      {showLastRun && lastRun && lastRun.outcome === 'failed' && (
        <p className="text-neg" data-testid="generate-failed">
          생성 실패: {lastRun.error ?? '알 수 없는 오류'} — 기존 브리프는 그대로 유지됩니다.
        </p>
      )}
      {showLastRun && lastRun && lastRun.outcome === 'skipped_exists' && <p>이미 생성된 주차라 건너뛰었습니다.</p>}
      {showLastRun && lastRun && lastRun.outcome === 'skipped_locked' && <p>다른 프로세스가 생성 중이라 건너뛰었습니다.</p>}
    </div>
  );
}

interface ToolbarProps {
  brief?: WeeklyBriefResponse;
  isAdmin: boolean;
  generate: WeeklyGenerateState;
  targetWeekStart?: string;
  targetExists: boolean;
  targetReady: boolean;
}

/** 이전/다음 주 · 아카이브 · 링크 복사 · HTML 다운로드(admin) · 지금 생성(admin) · 진행 상태 */
export function WeeklyBriefToolbar({ brief, isAdmin, generate, targetWeekStart, targetExists, targetReady }: ToolbarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!brief) return;
    // 현재 URL 이 아니라 영구 링크 — 최신 페이지에서 복사해도 다음 주에 의미가 바뀌지 않는다
    const url = weeklyBriefPermalink(window.location.origin, brief.weekStart);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('아래 링크를 복사하세요', url);
    }
  };

  const handleDownload = () => {
    if (!brief) return;
    const html = buildWeeklyBriefHtml(brief, { pageUrl: weeklyBriefPermalink(window.location.origin, brief.weekStart) });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = weeklyBriefFileName(brief);
    a.click();
    URL.revokeObjectURL(url);
  };

  const prev = brief?.prevWeekStart ?? null;
  const next = brief?.nextWeekStart ?? null;

  return (
    <div className="no-print mx-auto flex w-full max-w-[760px] flex-col gap-1.5" data-testid="weekly-toolbar">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {prev ? (
            <Link href={`/share/weekly/${prev}`} className={BTN} data-testid="nav-prev">
              <ChevronLeft className="h-3.5 w-3.5" />
              이전 주
            </Link>
          ) : (
            <span className={BTN_DISABLED_LINK} aria-disabled="true" data-testid="nav-prev-disabled">
              <ChevronLeft className="h-3.5 w-3.5" />
              이전 주
            </span>
          )}
          {next ? (
            <Link href={`/share/weekly/${next}`} className={BTN} data-testid="nav-next">
              다음 주
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span className={BTN_DISABLED_LINK} aria-disabled="true" data-testid="nav-next-disabled">
              다음 주
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          )}
          <Link href="/share/weekly/archive" className={BTN}>
            <Archive className="h-3.5 w-3.5" />
            아카이브
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!brief}
            className={BTN}
            title="이 주차의 영구 링크를 복사"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-pos" /> : <Link2 className="h-3.5 w-3.5" />}
            {copied ? '복사됨' : '링크 복사'}
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={!brief}
              className={BTN}
              title="단일 HTML 파일로 저장 (관리자)"
            >
              <FileDown className="h-3.5 w-3.5" />
              HTML 다운로드
            </button>
          )}
          {isAdmin && (
            <GenerateButton
              generate={generate}
              targetWeekStart={targetWeekStart}
              targetExists={targetExists}
              ready={targetReady}
            />
          )}
        </div>
      </div>
      {isAdmin && <GenerateStatus generate={generate} viewingWeekStarts={[brief?.weekStart, targetWeekStart]} />}
    </div>
  );
}
