/**
 * ARGOS_I 요청 인터페이스 설정 · 순수 함수 (DB·네트워크 접근 없음).
 *
 * 환경변수 해석: 토큰(+NEXT), 활성화, 상한, 승인 대상, 내부 도메인·패턴·용어 해시, 추가 허용 호스트, 비용 추정치.
 * 토큰 값·내부 용어 값은 이 모듈 밖으로 나가지 않는다 (로그·응답에 쓰지 않는다).
 */

import { DEFAULT_INTERNAL_DOMAINS, DEFAULT_INTERNAL_PATTERNS, TERM_HASH_RE } from './argos-i-guard-rules.js';
import { TOKEN_MIN_LENGTH } from './argos-i-export-config.js';

export type Env = Record<string, string | undefined>;

/** 724301~724305 가 사용 중이다 (액추에이터·주간 브리프·핸드 벤치마크·일일 번들·전체 DB 덤프) */
export const ARGOS_I_REQUESTS_LOCK_KEY = 724306;
export const ARGOS_I_REQUESTS_TASK_NAME = 'argos-i-requests';
export const ARGOS_I_REQUESTS_MARKER_KEY = 'argos-i-requests:last';
export const ARGOS_I_REQUESTS_SUSPEND_KEY = 'argos-i-requests:suspended';
/** KST 는 스케줄러의 timezone: 'Asia/Seoul' 로 처리한다 */
export const DEFAULT_ARGOS_I_REQUESTS_CRON = '* * * * *';

export const REQUEST_RATE_PER_HOUR = 60;
export const REQUEST_QUEUE_MAX = 200;
export const REQUEST_BODY_MAX_BYTES = 8192;
export const IDEMPOTENCY_TTL_MS = 24 * 3_600_000;
export const INLINE_QUERY_TIMEOUT_MS = 2000;
export const RESULT_MAX_BYTES = 64 * 1024;
export const TICK_MAX_REQUESTS = 5;
export const TICK_MAX_MS = 55_000;
export const RUNNING_TIMEOUT_MS = 10 * 60_000;
export const MAX_ATTEMPTS = 2;
export const APPROVAL_EXPIRE_MS = 7 * 24 * 3_600_000;
export const NOTE_RETAIN_AFTER_FINISH_MS = 7 * 24 * 3_600_000;
export const RETENTION_DAYS = 90;
export const RETENTION_AFTER_HOUR_KST = 3;
export const CIRCUIT_WINDOW_MS = 3_600_000;
export const CIRCUIT_THRESHOLD = 5;
export const REJECT_RATE_PER_HOUR = 60;

export const DEFAULT_REQUIRE_APPROVAL: readonly string[] = ['analyze:topic', 'add_source:youtube_channel', 'watch_register'];

function numEnv(raw: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number(raw);
  if (raw === undefined || raw.trim() === '' || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function resolveArgosIRequestsCron(env: Env = process.env): string {
  return env.CRON_ARGOS_I_REQUESTS || DEFAULT_ARGOS_I_REQUESTS_CRON;
}

/**
 * `ARGOS_I_REQUESTS_ENABLED=true` 일 때만 요청 API·폴러가 동작한다 (기본 꺼짐).
 * `DISABLE_ARGOS_I_REQUESTS=true` 는 킬 스위치다 — 태스크는 등록되나 실행 시 아무것도 하지 않고 요청 API 도 503 이다.
 */
export function isArgosIRequestsEnabled(env: Env = process.env): boolean {
  return (env.ARGOS_I_REQUESTS_ENABLED ?? '').trim().toLowerCase() === 'true' && (env.DISABLE_ARGOS_I_REQUESTS ?? '').trim().toLowerCase() !== 'true';
}

// ─────────────────────────────────────────────────────────────────────────────
// 토큰 (pull 토큰과 완전히 별개)
// ─────────────────────────────────────────────────────────────────────────────

/** 사용 가능한 요청 토큰 목록(현재 + NEXT). 32자 미만은 설정되지 않은 것으로 본다. */
export function getRequestTokens(env: Env = process.env): string[] {
  const out: string[] = [];
  for (const raw of [env.ARGOS_I_REQUEST_TOKEN, env.ARGOS_I_REQUEST_TOKEN_NEXT]) {
    const t = typeof raw === 'string' ? raw.trim() : '';
    if (t.length >= TOKEN_MIN_LENGTH) out.push(t);
  }
  return out;
}

export function isRequestTokenConfigured(env: Env = process.env): boolean {
  const t = typeof env.ARGOS_I_REQUEST_TOKEN === 'string' ? env.ARGOS_I_REQUEST_TOKEN.trim() : '';
  return t.length >= TOKEN_MIN_LENGTH;
}

export function isRequestTokenTooShort(env: Env = process.env): boolean {
  const t = typeof env.ARGOS_I_REQUEST_TOKEN === 'string' ? env.ARGOS_I_REQUEST_TOKEN.trim() : '';
  return t.length > 0 && t.length < TOKEN_MIN_LENGTH;
}

/** 요청 토큰이 pull 토큰과 같은 값이면 권한 분리가 무너지므로 API 를 비활성으로 본다 */
export function requestTokenCollidesWithPullToken(env: Env = process.env): boolean {
  const pulls = [env.ARGOS_I_EXPORT_TOKEN, env.ARGOS_I_EXPORT_TOKEN_NEXT].map((v) => (typeof v === 'string' ? v.trim() : '')).filter(Boolean);
  return getRequestTokens(env).some((t) => pulls.includes(t));
}

/** 요청 API 사용 가능 여부: 활성화 플래그 + 토큰(32자 이상) + pull 토큰과 다른 값 */
export function isRequestApiActive(env: Env = process.env): boolean {
  return isArgosIRequestsEnabled(env) && isRequestTokenConfigured(env) && !requestTokenCollidesWithPullToken(env);
}

// ─────────────────────────────────────────────────────────────────────────────
// 예산·승인
// ─────────────────────────────────────────────────────────────────────────────

export function resolveDailyBudgetUsd(env: Env = process.env): number {
  return numEnv(env.ARGOS_I_REQUESTS_DAILY_BUDGET_USD, 2, 0, 1000);
}

export function resolveDailyMaxAnalyze(env: Env = process.env): number {
  return Math.trunc(numEnv(env.ARGOS_I_REQUESTS_DAILY_MAX_ANALYZE, 30, 0, 10_000));
}

/**
 * analyze 종류별 추정 비용(USD). 기본값은 ai-usage 단가표 기준 **보수적 추정**이다 (운영 DB 의 ai_usage_logs 를 보고 측정한 값이 아니다 —
 * 운영 중 평균을 확인해 환경변수로 조정한다).
 *  - video: 영상 분석 1회 (1~3분 영상 ≈ 입력 2~5만 토큰 + 출력 2천 토큰 ≈ $0.02~0.05 → 0.1)
 *  - topic: 시사점 생성 1회 (hand 는 고성능 모델·출력 최대 1.6만 토큰 ≈ $0.5, 그 외 도메인은 $0.02 안팎 → 0.5)
 *  - spec : 로봇 1건 스펙 추출 1회 (소형 모델, 입력 ~3천 토큰 → 0.01)
 */
export interface CostEstimates {
  video: number;
  topic: number;
  spec: number;
}

export function resolveCostEstimates(env: Env = process.env): CostEstimates {
  return {
    video: numEnv(env.ARGOS_I_REQUESTS_COST_VIDEO_USD, 0.1, 0, 100),
    topic: numEnv(env.ARGOS_I_REQUESTS_COST_TOPIC_USD, 0.5, 0, 100),
    spec: numEnv(env.ARGOS_I_REQUESTS_COST_SPEC_USD, 0.01, 0, 100),
  };
}

/** `type` 또는 `type:서브키` 쉼표 구분. 비어 있으면 기본값 */
export function parseRequireApproval(env: Env = process.env): string[] {
  const raw = env.ARGOS_I_REQUESTS_REQUIRE_APPROVAL;
  if (raw === undefined || raw.trim() === '') return [...DEFAULT_REQUIRE_APPROVAL]; // 빈 값으로 승인 전체가 꺼지지 않게
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[a-z_]+(?::[a-z_]+)?$/.test(s));
}

export function requiresApproval(type: string, subKey: string | null, rules: readonly string[]): boolean {
  return rules.includes(type) || (subKey !== null && rules.includes(`${type}:${subKey}`));
}

// ─────────────────────────────────────────────────────────────────────────────
// 가드 설정 (내부 도메인·패턴·용어 해시·허용 호스트)
// ─────────────────────────────────────────────────────────────────────────────

function splitList(raw: string | undefined, sep: RegExp): string[] {
  return (raw ?? '')
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean);
}

const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,24}$/;

/** 기본 내부 도메인 + ARGOS_I_INTERNAL_DOMAINS(쉼표·공백·개행). 도메인 형식이 아닌 항목은 버린다 */
export function parseInternalDomains(env: Env = process.env): string[] {
  const extra = splitList(env.ARGOS_I_INTERNAL_DOMAINS, /[\s,;]+/)
    .map((d) => d.toLowerCase().replace(/^\*?\./, ''))
    .filter((d) => DOMAIN_RE.test(d));
  return Array.from(new Set([...DEFAULT_INTERNAL_DOMAINS, ...extra]));
}

export interface PatternParseResult {
  patterns: RegExp[];
  invalid: number;
}

const PATTERN_MAX_LENGTH = 200;

/** 개행 또는 `;;` 로 구분된 정규식. 컴파일 오류·과도하게 긴 패턴은 건너뛰고 개수만 센다 */
export function parseInternalPatterns(env: Env = process.env, raw: string | undefined = env.ARGOS_I_INTERNAL_PATTERNS): PatternParseResult {
  const patterns: RegExp[] = [];
  let invalid = 0;
  const sources = [...DEFAULT_INTERNAL_PATTERNS, ...splitList(raw, /\r?\n|;;/)];
  for (const src of sources) {
    if (src.length > PATTERN_MAX_LENGTH) {
      invalid += 1;
      continue;
    }
    try {
      patterns.push(new RegExp(src, 'iu'));
    } catch {
      invalid += 1;
    }
  }
  return { patterns, invalid };
}

/** sha256 hex 64자 목록 (쉼표·공백·개행 구분). 형식이 다른 항목은 버린다 */
export function parseTermHashes(env: Env = process.env): Set<string> {
  const out = new Set<string>();
  for (const h of splitList(env.ARGOS_I_INTERNAL_TERM_HASHES, /[\s,;]+/)) {
    const v = h.toLowerCase();
    if (TERM_HASH_RE.test(v)) out.add(v);
  }
  return out;
}

export function parseExtraAllowedHosts(env: Env = process.env): string[] {
  return splitList(env.ARGOS_I_EXTRA_ALLOWED_HOSTS, /[\s,;]+/)
    .map((d) => d.toLowerCase().replace(/^\*?\./, ''))
    .filter((d) => DOMAIN_RE.test(d));
}

// ─────────────────────────────────────────────────────────────────────────────
// KST 일 경계
// ─────────────────────────────────────────────────────────────────────────────

const KST_OFFSET_MS = 9 * 3_600_000;

/** now 가 속한 KST 날짜의 00:00 KST 에 해당하는 UTC 인스턴트 */
export function kstDayStartUtc(now: Date): Date {
  const ymd = new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
  return new Date(Date.parse(`${ymd}T00:00:00.000Z`) - KST_OFFSET_MS);
}

/** KST 시(0~23) */
export function kstHour(now: Date): number {
  return new Date(now.getTime() + KST_OFFSET_MS).getUTCHours();
}
