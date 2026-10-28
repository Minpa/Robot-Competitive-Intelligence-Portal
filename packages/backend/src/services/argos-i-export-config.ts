/**
 * ARGOS_I 내보내기 설정 · 순수 함수 (DB·네트워크 접근 없음).
 *
 * 환경변수 해석, 번들 날짜(KST), 보존 기준일, 기동 캐치업 판정, 토큰 해석.
 * 토큰 값은 이 모듈 밖으로 나가지 않는다 (로그·응답에 쓰지 않는다).
 */

import { addDaysYmd, isValidYmd, kstYmd } from './weekly-brief-period.js';

/** 위클리 브리프(724302)·핸드 벤치마크(724303)와 구분되는 advisory lock 키 */
export const ARGOS_I_EXPORT_LOCK_KEY = 724304;
export const ARGOS_I_EXPORT_TASK_NAME = 'argos-i-export';
export const ARGOS_I_EXPORT_MARKER_KEY = 'argos-i-export:last';
/** KST 는 스케줄러의 timezone: 'Asia/Seoul' 로 처리한다 */
export const DEFAULT_ARGOS_I_EXPORT_CRON = '0 7 * * *';
/** 생성 시각(KST 시) — 기동 캐치업 판정에 쓴다 */
export const ARGOS_I_EXPORT_HOUR_KST = 7;
export const BUSY_POLL_MS = 60_000;
export const STARTUP_CHAIN_POLL_MS = 60_000;
export const STARTUP_CHAIN_WAIT_MAX_MS = 30 * 60_000;
export const TOKEN_MIN_LENGTH = 32;
export const MANIFEST_LIST_LIMIT = 30;

const KST_OFFSET_MS = 9 * 3_600_000;

type Env = Record<string, string | undefined>;

function intEnv(raw: string | undefined, fallback: number, min: number, max: number): number {
  const n = parseInt(raw ?? '', 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function resolveArgosIExportCron(env: Env = process.env): string {
  return env.CRON_ARGOS_I_EXPORT || DEFAULT_ARGOS_I_EXPORT_CRON;
}

export function isStartupArgosIExportEnabled(env: Env = process.env): boolean {
  return env.ARGOS_I_EXPORT_ON_STARTUP !== 'false';
}

export function resolveArgosIStartupDelayMs(env: Env = process.env): number {
  return intEnv(env.ARGOS_I_EXPORT_STARTUP_DELAY_SEC, 300, 0, 86_400) * 1000;
}

export function resolveArgosIMinGapHours(env: Env = process.env): number {
  return intEnv(env.ARGOS_I_EXPORT_MIN_GAP_HOURS, 3, 0, 24 * 30);
}

/** 보존 일수 — 기본 30, 7~90 으로 클램프 */
export function resolveArgosIRetentionDays(env: Env = process.env): number {
  return intEnv(env.ARGOS_I_EXPORT_RETENTION_DAYS, 30, 7, 90);
}

export function resolveArgosIMaxBundleBytes(env: Env = process.env): number {
  return intEnv(env.ARGOS_I_EXPORT_MAX_BUNDLE_MB, 100, 1, 4096) * 1024 * 1024;
}

export function resolveArgosITimeoutMs(env: Env = process.env): number {
  return intEnv(env.ARGOS_I_EXPORT_TIMEOUT_MIN, 10, 1, 240) * 60_000;
}

export function resolveArgosIBusyWaitMs(env: Env = process.env): number {
  return intEnv(env.ARGOS_I_EXPORT_BUSY_WAIT_MIN, 30, 0, 240) * 60_000;
}

// ─────────────────────────────────────────────────────────────────────────────
// 날짜 (KST 달력 문자열 산술)
// ─────────────────────────────────────────────────────────────────────────────

/** 번들 날짜 = 생성 시작 시각의 KST 달력 날짜 */
export function resolveBundleDate(startedAt: Date): string {
  return kstYmd(startedAt);
}

/**
 * 보존 기준일: `export_date >= cutoff` 를 유지하고 그보다 이전은 삭제한다.
 * 오늘 포함 N 개 날짜를 유지한다 → cutoff = 오늘 - (N-1)일. N 은 7~90 으로 클램프.
 */
export function computeRetentionCutoff(todayKst: string, days: number): string {
  if (!isValidYmd(todayKst)) throw new Error('invalid_ymd');
  const n = Math.min(90, Math.max(7, Math.trunc(Number.isFinite(days) ? days : 30)));
  return addDaysYmd(todayKst, -(n - 1));
}

/** 해당 시점 KST 날짜의 07:00 KST 에 해당하는 UTC 인스턴트 */
export function todayExportInstant(now: Date): Date {
  const ymd = kstYmd(now);
  const midnightUtc = Date.parse(`${ymd}T00:00:00.000Z`) - KST_OFFSET_MS;
  return new Date(midnightUtc + ARGOS_I_EXPORT_HOUR_KST * 3_600_000);
}

export interface StartupDecisionArgs {
  now: Date;
  /** 오늘(KST) 날짜의 ok/partial 번들이 있는지 */
  todayExists: boolean;
  /** 마지막 시도 완료 시각 (argos-i-export:last) */
  lastAttemptAt: Date | null;
  minGapHours: number;
}

/**
 * 기동 캐치업 판정: 오늘 07:00 KST 이전이면 건너뜀(크론이 처리) / 오늘 번들이 이미 있으면 건너뜀 /
 * 마지막 시도가 minGapHours 이내면 건너뜀.
 */
export function shouldRunStartupArgosIExport(args: StartupDecisionArgs): boolean {
  if (args.now.getTime() < todayExportInstant(args.now).getTime()) return false;
  if (args.todayExists) return false;
  if (args.lastAttemptAt && args.now.getTime() - args.lastAttemptAt.getTime() < args.minGapHours * 3_600_000) return false;
  return true;
}

export function lastAttemptFromSummary(summary: Record<string, unknown> | null | undefined): Date | null {
  const t = summary && typeof summary.finishedAt === 'string' ? new Date(summary.finishedAt) : null;
  return t && !Number.isNaN(t.getTime()) ? t : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 토큰
// ─────────────────────────────────────────────────────────────────────────────

/** 사용 가능한 토큰 목록(현재 + NEXT). 32자 미만은 설정되지 않은 것으로 본다. */
export function getConfiguredTokens(env: Env = process.env): string[] {
  const out: string[] = [];
  for (const raw of [env.ARGOS_I_EXPORT_TOKEN, env.ARGOS_I_EXPORT_TOKEN_NEXT]) {
    const t = typeof raw === 'string' ? raw.trim() : '';
    if (t.length >= TOKEN_MIN_LENGTH) out.push(t);
  }
  return out;
}

/** 기본 토큰이 설정(32자 이상)되어 API 가 활성인지 */
export function isArgosITokenConfigured(env: Env = process.env): boolean {
  const t = typeof env.ARGOS_I_EXPORT_TOKEN === 'string' ? env.ARGOS_I_EXPORT_TOKEN.trim() : '';
  return t.length >= TOKEN_MIN_LENGTH;
}

/** 토큰이 있으나 32자 미만 (기동 시 경고 대상) */
export function isArgosITokenTooShort(env: Env = process.env): boolean {
  const t = typeof env.ARGOS_I_EXPORT_TOKEN === 'string' ? env.ARGOS_I_EXPORT_TOKEN.trim() : '';
  return t.length > 0 && t.length < TOKEN_MIN_LENGTH;
}

/** 문자열에서 설정된 토큰 값을 가린다 (오류 메시지·로그용) */
export function redactTokens(text: string, env: Env = process.env): string {
  let out = text;
  for (const raw of [env.ARGOS_I_EXPORT_TOKEN, env.ARGOS_I_EXPORT_TOKEN_NEXT]) {
    const t = typeof raw === 'string' ? raw.trim() : '';
    if (t.length >= 8) out = out.split(t).join('[redacted]');
  }
  return out;
}

const ARGOS_I_LOG_PATH_RE = /^\/api\/(?:admin\/)?argos-i(?=[/?]|$)/i;

/** 요청 로그에 찍히는 URL 에서 ARGOS_I 경로의 쿼리 문자열(`?token=...` 등)을 가린다. 다른 경로는 그대로 돌려준다. */
export function redactArgosIQuery(url: string): string {
  if (!ARGOS_I_LOG_PATH_RE.test(url)) return url;
  const q = url.indexOf('?');
  return q < 0 ? url : `${url.slice(0, q)}?<redacted>`;
}
