/**
 * ARGOS_I 연동 카드 표시용 순수 함수 — 시각은 프로세스 TZ 와 무관하게 고정 KST(UTC+9) 산술로 포맷한다.
 */

import type { ArgosIExportLastRun, ArgosIExportPhase } from '@/types/argos-i-export';

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** ISO UTC → 'YYYY-MM-DD HH:mm' (KST). 해석할 수 없으면 '-' */
export function formatKst(iso: string | null | undefined): string {
  const t = iso ? Date.parse(iso) : NaN;
  if (Number.isNaN(t)) return '-';
  const s = new Date(t + KST_OFFSET_MS).toISOString();
  return `${s.slice(0, 10)} ${s.slice(11, 16)}`;
}

/** 바이트 수 → 사람이 읽는 크기 (1024 기준, 소수 1자리) */
export function formatBytes(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n) || n < 0) return '-';
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}

export function formatDurationMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms) || ms < 0) return '-';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}초`;
  return `${Math.floor(s / 60)}분 ${Math.round(s % 60)}초`;
}

export const PHASE_LABELS: Record<ArgosIExportPhase, string> = {
  idle: '대기',
  waiting_upstream: '상류 작업 대기 중',
  collecting: '데이터 수집 중',
  building: '파일 생성 중',
  persisting: 'DB 저장 중',
};

export const REASON_LABELS: Record<string, string> = {
  cron: '정기(07:00)',
  startup: '기동 캐치업',
  manual: '수동',
  'weekly-brief': '주간 브리프 반영',
};

export type LastRunTone = 'ok' | 'warn' | 'error' | 'none';

/** 마지막 실행 결과 한 줄 요약과 색상 톤 */
export function summarizeLastRun(run: ArgosIExportLastRun | null | undefined): { tone: LastRunTone; text: string } {
  if (!run) return { tone: 'none', text: '실행 기록이 없습니다' };
  const when = formatKst(run.finishedAt);
  const reason = REASON_LABELS[run.reason] ?? run.reason;
  if (run.outcome === 'failed') return { tone: 'error', text: `실패 (${reason}, ${when})${run.error ? `: ${run.error}` : ''}` };
  if (run.outcome === 'skipped_locked') return { tone: 'warn', text: `다른 인스턴스가 실행 중이라 건너뜀 (${reason}, ${when})` };
  const tone: LastRunTone = run.status === 'partial' || run.warnings.length > 0 ? 'warn' : 'ok';
  return {
    tone,
    text: `${run.status === 'partial' ? '일부 실패로 완료' : '완료'} (${reason}, ${when}, ${formatDurationMs(run.durationMs)})`,
  };
}
