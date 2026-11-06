/**
 * LLM 방어 지표 — 프로세스 메모리 카운터 + `[LlmGuard]` 로그 한 줄 (PM 결정 Q8: 영속화 없음, ops-status 로만 조회).
 *
 * 로그·지표에는 건수와 종류만 남긴다. 프롬프트, 응답 원문, 외부 텍스트, 키는 남기지 않는다.
 * 형식: `[LlmGuard] point=video_tagging phase=input kind=injection count=2`
 *
 * 이 파일은 packages/crawler/src/services/ 에 동일 내용으로 복제되어 있다 (llm-guard-static 테스트가 해시 동일성을 검사).
 */

import { formatLogLine } from './ops-log.util.js';

export type GuardPhase = 'input' | 'output';

export interface PointCounters {
  /** 정제한 입력 항목 수 */
  inputsSanitized: number;
  /** 지시문 패턴이 탐지된 입력 항목 수 (카테고리별) */
  injectionFlagged: Record<string, number>;
  /** 길이 상한 때문에 잘린 입력 항목 수 */
  truncated: number;
  /** 출력 폐기 사유별 건수 */
  outputRejected: Record<string, number>;
  /** 출력에서 폐기된 필드 수 */
  fieldsDropped: number;
}

export interface GuardRecentEvent {
  at: string;
  point: string;
  phase: GuardPhase;
  kind: string;
  count: number;
}

export interface LlmGuardSnapshot {
  since: string;
  totals: PointCounters;
  points: Record<string, PointCounters>;
  recent: GuardRecentEvent[];
}

const RECENT_MAX = 50;

function emptyCounters(): PointCounters {
  return { inputsSanitized: 0, injectionFlagged: {}, truncated: 0, outputRejected: {}, fieldsDropped: 0 };
}

let startedAt = new Date().toISOString();
let points = new Map<string, PointCounters>();
let recent: GuardRecentEvent[] = [];

function bucket(point: string): PointCounters {
  let c = points.get(point);
  if (!c) {
    c = emptyCounters();
    points.set(point, c);
  }
  return c;
}

function pushRecent(ev: GuardRecentEvent): void {
  recent.push(ev);
  if (recent.length > RECENT_MAX) recent = recent.slice(recent.length - RECENT_MAX);
}

/** 로그 한 줄 (카운트가 0 이하면 남기지 않는다) */
export function logGuardEvent(point: string, phase: GuardPhase, kind: string, count: number): void {
  if (!(count > 0)) return;
  console.log(formatLogLine('LlmGuard', { point, phase, kind, count }));
}

/** 입력 정제 결과를 기록한다 — 한 배치 호출당 한 번. 항목 수와 탐지/잘림 건수를 집계해 로그도 종류별로 한 줄씩만 남긴다 */
export function recordInputGuard(
  point: string,
  results: ReadonlyArray<{ truncated: boolean; hits: ReadonlyArray<{ category: string }> }>,
): void {
  if (results.length === 0) return;
  const c = bucket(point);
  c.inputsSanitized += results.length;
  let truncated = 0;
  const byCategory: Record<string, number> = {};
  for (const r of results) {
    if (r.truncated) truncated++;
    for (const cat of new Set(r.hits.map((h) => h.category))) byCategory[cat] = (byCategory[cat] ?? 0) + 1;
  }
  const at = new Date().toISOString();
  if (truncated > 0) {
    c.truncated += truncated;
    pushRecent({ at, point, phase: 'input', kind: 'truncated', count: truncated });
    logGuardEvent(point, 'input', 'truncated', truncated);
  }
  let injected = 0;
  for (const [cat, n] of Object.entries(byCategory)) {
    c.injectionFlagged[cat] = (c.injectionFlagged[cat] ?? 0) + n;
    injected += n;
  }
  if (injected > 0) {
    pushRecent({ at, point, phase: 'input', kind: 'injection', count: injected });
    logGuardEvent(point, 'input', 'injection', injected);
  }
}

/** 출력 폐기를 기록한다. reason: schema | url | leak | identifier | enum | range | empty */
export function recordOutputReject(point: string, reason: string, count = 1): void {
  if (!(count > 0)) return;
  const c = bucket(point);
  c.outputRejected[reason] = (c.outputRejected[reason] ?? 0) + count;
  c.fieldsDropped += count;
  pushRecent({ at: new Date().toISOString(), point, phase: 'output', kind: reason, count });
  logGuardEvent(point, 'output', reason, count);
}

/** 출력 검증에 넘기는 onReject 콜백 — 사유별로 모아 한 번에 기록하려면 flush 를 쓴다 */
export function createRejectCollector(point: string): { onReject: (reason: string, field: string) => void; flush: () => void } {
  const counts: Record<string, number> = {};
  return {
    onReject: (reason) => {
      counts[reason] = (counts[reason] ?? 0) + 1;
    },
    flush: () => {
      for (const [reason, n] of Object.entries(counts)) recordOutputReject(point, reason, n);
      for (const k of Object.keys(counts)) delete counts[k];
    },
  };
}

function mergeInto(target: PointCounters, src: PointCounters): void {
  target.inputsSanitized += src.inputsSanitized;
  target.truncated += src.truncated;
  target.fieldsDropped += src.fieldsDropped;
  for (const [k, v] of Object.entries(src.injectionFlagged)) target.injectionFlagged[k] = (target.injectionFlagged[k] ?? 0) + v;
  for (const [k, v] of Object.entries(src.outputRejected)) target.outputRejected[k] = (target.outputRejected[k] ?? 0) + v;
}

function cloneCounters(c: PointCounters): PointCounters {
  return { ...c, injectionFlagged: { ...c.injectionFlagged }, outputRejected: { ...c.outputRejected } };
}

/** 카운터 스냅샷 (읽기 전용 복사본) */
export function getLlmGuardSnapshot(): LlmGuardSnapshot {
  const totals = emptyCounters();
  const out: Record<string, PointCounters> = {};
  for (const [point, c] of points) {
    out[point] = cloneCounters(c);
    mergeInto(totals, c);
  }
  return { since: startedAt, totals, points: out, recent: recent.map((r) => ({ ...r })) };
}

/** 테스트용 */
export function resetLlmGuardMetrics(): void {
  startedAt = new Date().toISOString();
  points = new Map();
  recent = [];
}
