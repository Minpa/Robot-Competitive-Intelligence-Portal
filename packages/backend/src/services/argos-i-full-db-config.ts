/**
 * ARGOS_I 초기 적재용 전체 DB 덤프 설정 · 순수 함수 (DB·네트워크 접근 없음).
 *
 * 상수, 환경변수 해석, 제외 규칙(테이블·컬럼·JSON 키).
 *
 * ⚠ 블록리스트(EXCLUDED_TABLES)는 안전망이 아니다. 아래 목록에 없는 테이블은 신규로 생겨도 자동으로 덤프에 포함된다.
 *   새 테이블을 추가하는 개발자는 비밀·계정·개인정보 컬럼이 있는지 확인하고, 필요하면 이 파일의 EXCLUDED_TABLES 에 추가해야 한다.
 *   컬럼은 이름 규칙(EXCLUDED_COLUMN_PATTERNS)에만 의존한다. 규칙에 걸리지 않는 비밀 컬럼은 SCRUB_JSON_COLUMNS 또는 EXCLUDED_TABLES 로 직접 처리한다.
 */

/** 724301~724304 가 사용 중이다. 이 덤프 전용 키 */
export const FULL_DB_LOCK_KEY = 724305;
/** 이름 변경·삭제·의미 변경 시 증가 */
export const FULL_DB_DUMP_FORMAT_VERSION = 1;
/** 한 번에 메모리에 올리는 배치의 바이트 목표 (실측: 4MiB 는 덤프 중 RSS 가 +340MB 까지 올랐고 1MiB 는 +100MB 이하였다) */
export const FULL_DB_BATCH_TARGET_BYTES = 1024 * 1024;
export const FULL_DB_MIN_FETCH_ROWS = 50;
/** Readable highWaterMark */
export const FULL_DB_STREAM_HWM = 256 * 1024;
export const FULL_DB_ZIP_ROOT = 'argos-i-full-db';
export const FULL_DB_RETRY_AFTER_SEC = 60;

type Env = Record<string, string | undefined>;

function intEnv(raw: string | undefined, fallback: number, min: number, max: number): number {
  const n = parseInt(raw ?? '', 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** `ARGOS_I_FULL_DB_ENABLED=true` 일 때만 덤프가 동작한다 (기본 꺼짐) */
export function isFullDbEnabled(env: Env = process.env): boolean {
  return (env.ARGOS_I_FULL_DB_ENABLED ?? '').trim().toLowerCase() === 'true';
}

/** 커서 한 번에 가져오는 최대 행 수 — 기본 1000, 100~5000 으로 클램프 */
export function resolveFullDbBatchRows(env: Env = process.env): number {
  return intEnv(env.ARGOS_I_FULL_DB_BATCH_ROWS, 1000, 100, 5000);
}

/** 한 덤프의 전체 상한(ms) — 기본 60분, 5~240분으로 클램프 */
export function resolveFullDbTimeoutMs(env: Env = process.env): number {
  return intEnv(env.ARGOS_I_FULL_DB_TIMEOUT_MIN, 60, 5, 240) * 60_000;
}

/** deflate 레벨 — 기본 6, 0~9 (0 이면 무압축) */
export function resolveFullDbZipLevel(env: Env = process.env): number {
  return intEnv(env.ARGOS_I_FULL_DB_ZIP_LEVEL, 6, 0, 9);
}

// ─────────────────────────────────────────────────────────────────────────────
// 제외 테이블
// ─────────────────────────────────────────────────────────────────────────────

export interface ExcludedTableRule {
  name: string;
  reason: string;
}

/** 이름이 정확히 일치하는 제외 테이블 (public 스키마) */
export const EXCLUDED_TABLES: readonly ExcludedTableRule[] = [
  { name: 'users', reason: 'accounts_and_password_hash' },
  { name: 'allowed_emails', reason: 'personal_data_signup_allowlist' },
  { name: 'audit_logs', reason: 'user_activity_log' },
  { name: 'ai_usage_logs', reason: 'ai_usage_and_cost_log' },
  { name: 'argos_i_exports', reason: 'daily_bundle_store' },
  { name: 'argos_i_export_files', reason: 'daily_bundle_store_bytea' },
];

/** 이름 패턴으로 제외하는 테이블 (마이그레이션 메타 방어용 — 현재 없음) */
export const EXCLUDED_TABLE_PATTERNS: readonly { pattern: RegExp; reason: string }[] = [{ pattern: /^__drizzle/, reason: 'migration_metadata' }];

/** 컬럼명(소문자)에 포함되면 제외하는 부분 문자열 */
export const EXCLUDED_COLUMN_PATTERNS: readonly string[] = ['password', 'secret', 'token', 'api_key', 'apikey', 'credential'];

/**
 * 이름 규칙에 걸리지만 비밀이 아니어서 포함하는 (table, column).
 * LLM 토큰 사용량 컬럼이다 — 제외하면 ARGOS_I 에서 0 이 되어 cost_usd 와 어긋난다.
 */
export const EXCLUDED_COLUMN_ALLOWLIST: readonly (readonly [string, string])[] = [
  ['weekly_briefs', 'input_tokens'],
  ['weekly_briefs', 'output_tokens'],
  ['issue_ai_call_log', 'input_tokens'],
  ['issue_ai_call_log', 'output_tokens'],
];

/** JSON 키 스크러빙 대상 컬럼. 모든 jsonb 에 적용하지 않는다 (정상 키 손상 방지) */
export const SCRUB_JSON_COLUMNS: readonly { table: string; column: string }[] = [{ table: 'regulatory_sources', column: 'config' }];

/** 스크러빙에서 컬럼 패턴 외에 추가로 제거하는 JSON 키 (부분 문자열, 대소문자 무시) */
export const SCRUB_EXTRA_KEY_PATTERNS: readonly string[] = ['authorization', 'bearer', 'cookie', 'private_key'];

/** 덤프에는 넣지만 기본 적재에서 빼는 테이블 */
export const NO_LOAD_BY_DEFAULT_TABLES: readonly ExcludedTableRule[] = [
  { name: 'data_migrations', reason: '마커 키 충돌, ARGOS_I에서는 적재하지 말 것' },
];

/** 제외 사유(문자열) 또는 null (포함). schema 는 기본 'public' */
export function getTableExclusionReason(name: string, schema = 'public'): string | null {
  if (schema !== 'public') return 'non_public_schema';
  const exact = EXCLUDED_TABLES.find((t) => t.name === name);
  if (exact) return exact.reason;
  const pat = EXCLUDED_TABLE_PATTERNS.find((p) => p.pattern.test(name));
  return pat ? pat.reason : null;
}

export function isExcludedTable(name: string, schema = 'public'): boolean {
  return getTableExclusionReason(name, schema) !== null;
}

/** 컬럼명이 걸리는 첫 번째 패턴 (허용 목록은 고려하지 않는다). 없으면 null */
export function matchExcludedColumnPattern(column: string): string | null {
  const lower = column.toLowerCase();
  return EXCLUDED_COLUMN_PATTERNS.find((p) => lower.includes(p)) ?? null;
}

export function isAllowlistedColumn(table: string, column: string): boolean {
  return EXCLUDED_COLUMN_ALLOWLIST.some(([t, c]) => t === table && c === column);
}

export type ColumnNameVerdict =
  | { kind: 'ok' }
  | { kind: 'excluded'; pattern: string }
  | { kind: 'allowlisted'; pattern: string };

/** 이름 규칙 + 허용 목록 판정 */
export function classifyColumnByName(table: string, column: string): ColumnNameVerdict {
  const pattern = matchExcludedColumnPattern(column);
  if (!pattern) return { kind: 'ok' };
  return isAllowlistedColumn(table, column) ? { kind: 'allowlisted', pattern } : { kind: 'excluded', pattern };
}

export function isScrubJsonColumn(table: string, column: string): boolean {
  return SCRUB_JSON_COLUMNS.some((s) => s.table === table && s.column === column);
}

/** JSON 키가 스크러빙 대상인지 (소문자, '-'·공백은 '_' 로 정규화) */
export function isScrubbedJsonKey(key: string): boolean {
  const norm = key.toLowerCase().replace(/[-\s]/g, '_');
  return EXCLUDED_COLUMN_PATTERNS.some((p) => norm.includes(p)) || SCRUB_EXTRA_KEY_PATTERNS.some((p) => norm.includes(p));
}

export function getNoLoadByDefaultReason(table: string): string | null {
  return NO_LOAD_BY_DEFAULT_TABLES.find((t) => t.name === table)?.reason ?? null;
}

/** `?tables=` 의 테이블명 형식 */
export const TABLE_NAME_RE = /^[a-z_][a-z0-9_]{0,62}$/;
