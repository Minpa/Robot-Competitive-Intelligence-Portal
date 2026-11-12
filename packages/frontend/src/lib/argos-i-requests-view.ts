/**
 * ARGOS_I 요청 카드 표시용 순수 함수 — 상태 배지, 승인 가능 판정, 요약 params, 예산 게이지, 거부 통계 경고.
 * 시각은 argos-i-export-view 의 KST 포맷을 쓴다. 비밀값·payload_hash·거부된 본문은 다루지 않는다.
 */

import type { ArgosIAdminRequestItem, ArgosIRequestStatus, ArgosIRequestsStats } from '@/types/argos-i-requests';

export type Tone = 'ok' | 'warn' | 'error' | 'info' | 'none';

export const STATUS_LABELS: Record<ArgosIRequestStatus, string> = {
  queued: '대기',
  needs_approval: '승인 대기',
  running: '실행 중',
  done: '완료',
  failed: '실패',
  rejected: '거부됨',
  cancelled: '취소됨',
  unsupported: '미지원',
};

const STATUS_TONES: Record<ArgosIRequestStatus, Tone> = {
  queued: 'info',
  needs_approval: 'warn',
  running: 'info',
  done: 'ok',
  failed: 'error',
  rejected: 'error',
  cancelled: 'none',
  unsupported: 'none',
};

export function statusBadge(status: string): { label: string; tone: Tone } {
  const s = status as ArgosIRequestStatus;
  return { label: STATUS_LABELS[s] ?? status, tone: STATUS_TONES[s] ?? 'none' };
}

export const TYPE_LABELS: Record<string, string> = { add_source: '자료 추가', analyze: '분석', query: '조회' };

export const APPROVAL_REASON_LABELS: Record<string, string> = {
  type_rule: '승인 필요 종류',
  budget_daily: '일 예산·건수 초과',
};

/** 필터 선택지 — 승인 대기가 기본 강조 */
export const STATUS_FILTERS: Array<{ value: ArgosIRequestStatus | 'all'; label: string }> = [
  { value: 'needs_approval', label: '승인 대기' },
  { value: 'all', label: '전체' },
  { value: 'queued', label: '대기' },
  { value: 'running', label: '실행 중' },
  { value: 'done', label: '완료' },
  { value: 'failed', label: '실패' },
  { value: 'rejected', label: '거부됨' },
  { value: 'cancelled', label: '취소됨' },
];

/** 승인·거부 버튼을 보일 수 있는 상태인가 */
export function canDecide(item: Pick<ArgosIAdminRequestItem, 'status'>): boolean {
  return item.status === 'needs_approval';
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** params 의 사람이 읽는 한 줄 요약 (slug·URL·id 등). 값은 모두 문자열로만 다룬다 */
export function summarizeParams(params: Record<string, unknown> | null | undefined): string {
  if (!params || typeof params !== 'object') return '-';
  const p = params as Record<string, unknown>;
  const sub = [p.kind, p.target, p.query].find((v) => typeof v === 'string') as string | undefined;
  const parts: string[] = [];
  for (const key of ['id', 'slug', 'url', 'company', 'robot', 'domain', 'days', 'weeks', 'segment', 'since', 'limit']) {
    const v = p[key];
    if (typeof v === 'string' || typeof v === 'number') parts.push(key === 'days' ? `${v}일` : key === 'weeks' ? `${v}주` : clip(String(v), 60));
  }
  const text = [sub, ...parts].filter(Boolean).join(' · ');
  return text || '-';
}

export function formatUsd(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '-';
  return `$${n.toFixed(n < 1 ? 3 : 2)}`;
}

/** 오늘 비용·일 예산 게이지 (0~100%) 와 톤 */
export function budgetGauge(today: Pick<ArgosIRequestsStats['today'], 'costUsd' | 'budgetUsd'>): { pct: number; tone: Tone; text: string } {
  const budget = today.budgetUsd;
  const pct = budget > 0 ? Math.min(100, Math.round((today.costUsd / budget) * 100)) : today.costUsd > 0 ? 100 : 0;
  const tone: Tone = pct >= 100 ? 'error' : pct >= 80 ? 'warn' : 'ok';
  return { pct, tone, text: `${formatUsd(today.costUsd)} / ${formatUsd(budget)}` };
}

/** 거부 사유 통계 경고 — 건수가 0 이 아니면 아웃바운드 가드 점검 문구 */
export function rejectWarning(stats: Pick<ArgosIRequestsStats, 'rejects7d' | 'rejectTotal7d'> | null | undefined): string | null {
  const total = Math.max(stats?.rejectTotal7d ?? 0, stats?.rejects7d?.reduce((a, r) => a + r.count, 0) ?? 0);
  return total > 0 ? `ARGOS_I 아웃바운드 가드 점검 필요 — 최근 7일 사내 정보 의심 거부 ${total}건` : null;
}

export const REJECT_REASON_LABELS: Record<string, string> = {
  unknown_key: '알 수 없는 키',
  invalid_type_or_shape: '형식 위반',
  url_scheme: 'URL 스킴·포트',
  url_host_not_allowed: '허용 외 호스트',
  private_host: '사설·내부 호스트',
  internal_domain: '내부 도메인',
  email_detected: '이메일',
  employee_id: '사번 형태',
  internal_host_name: '서버·호스트명',
  unc_or_file_path: '내부 경로',
  classification_label: '보안 등급 표기',
  internal_pattern: '내부 패턴',
  internal_term_hash: '사내 용어(해시)',
  blob_detected: '인코딩 덩어리',
  number_unit_in_note: '숫자+단위',
  note_format: 'note 형식',
  source_not_public: '공개 자료 증명 누락',
  control_chars: '제어 문자',
};

export function rejectRows(stats: Pick<ArgosIRequestsStats, 'rejects7d'> | null | undefined): Array<{ code: string; label: string; count: number }> {
  return (stats?.rejects7d ?? []).map((r) => ({ code: r.reasonCode, label: REJECT_REASON_LABELS[r.reasonCode] ?? r.reasonCode, count: r.count }));
}

/** 마지막 처리 시각 표시 (없으면 '기록 없음') */
export function lastRunText(lastRun: ArgosIRequestsStats['lastRun'] | undefined, formatKst: (iso: string | null | undefined) => string): string {
  if (!lastRun?.finishedAt) return '기록 없음';
  return `${formatKst(lastRun.finishedAt)} (KST)${lastRun.processed ? ` · ${lastRun.processed}건 처리` : ''}`;
}

export const TONE_TEXT_CLASS: Record<Tone, string> = {
  ok: 'text-pos',
  warn: 'text-warn',
  error: 'text-neg',
  info: 'text-info',
  none: 'text-ink-500',
};

export const TONE_BADGE_CLASS: Record<Tone, string> = {
  ok: 'bg-pos-soft text-pos',
  warn: 'bg-warn-soft text-warn',
  error: 'bg-neg-soft text-neg',
  info: 'bg-info-soft text-info',
  none: 'bg-ink-100 text-ink-500',
};
