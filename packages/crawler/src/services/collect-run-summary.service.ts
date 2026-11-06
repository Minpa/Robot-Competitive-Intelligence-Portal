/**
 * 수집기 실행 요약 — data_migrations 의 단일 키 `collect:last` 에 수집기별 마지막 실행 결과를 남긴다.
 *
 * - 각 수집기는 자기 항목(`collectors.<key>`)만 jsonb 병합으로 갱신한다. 기동 체인이 크론 때 기록한 legal 항목을 지우지 않는다.
 * - `config` 에는 설정 여부 불리언만 둔다(값·길이 기록 금지).
 * - 오류 문자열은 200자 이내로 줄이고 URL 쿼리, key=, token=, Bearer 를 제거한다.
 * - 쓰기 실패는 절대 throw 하지 않으며 수집 흐름·종료 코드에 영향을 주지 않는다.
 * - 백엔드 데이터 커버리지 화면이 읽는다(읽기 전용). 이 파일은 수집 로직을 바꾸지 않는다.
 */

import { sql } from 'drizzle-orm';
import { getDb } from '../db/index.js';

export const COLLECT_LAST_KEY = 'collect:last';
export const SUMMARY_SCHEMA_VERSION = 1;
export const MAX_ERRORS = 5;
export const MAX_ERROR_LEN = 200;
export const MAX_CHANNELS = 300;

export type CollectorKey = 'legal' | 'arxivHand' | 'arxivActuator' | 'youtube' | 'eventSearch' | 'topicSearch';
export type Trigger = 'cron' | 'startup';

export interface CollectorEntry {
  finishedAt: string;
  trigger: Trigger;
  ok: boolean | null;
  durationMs: number;
  saved: number;
  errorCount: number;
  errors: string[];
  [extra: string]: unknown;
}

export interface ConfigFlags {
  youtubeApiKeyConfigured: boolean;
  githubTokenConfigured: boolean;
  htmlCrawlerEnabled: boolean;
  legalCollectDisabled: boolean;
  collectOnStartup: boolean;
}

type Env = Record<string, string | undefined>;

// ── 순수 함수 ──

const SECRET_PATTERNS: [RegExp, string][] = [
  [/\b(?:key|token|apikey|api_key|access_token|secret|password)=[^\s&'")]+/gi, '[masked]'],
  [/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [masked]'],
  [/\bAIza[A-Za-z0-9_-]{10,}/g, '[masked]'],
  [/\bsk-[A-Za-z0-9_-]{8,}/g, '[masked]'],
  [/\b(?:ghp|gho|github_pat)_[A-Za-z0-9_]{10,}/g, '[masked]'],
  [/\b[a-z][a-z0-9+.-]*:\/\/[^\s'")]*:[^\s@'")]*@[^\s'")]+/gi, '[url]'],
];

/** URL 쿼리스트링·키·토큰·Bearer 제거, 한 줄, 최대 길이로 자름 */
export function sanitizeError(input: unknown, max = MAX_ERROR_LEN): string {
  let s = input instanceof Error ? input.message : typeof input === 'string' ? input : String(input ?? '');
  s = (s.split('\n')[0] ?? '');
  // URL 의 쿼리스트링(? 이후)과 프래그먼트 제거
  s = s.replace(/(https?:\/\/[^\s?#'")]+)[?#][^\s'")]*/gi, '$1');
  for (const [re, rep] of SECRET_PATTERNS) s = s.replace(re, rep);
  s = s.replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export function buildConfigFlags(env: Env = process.env): ConfigFlags {
  return {
    youtubeApiKeyConfigured: Boolean(env.YOUTUBE_API_KEY),
    githubTokenConfigured: Boolean(env.GITHUB_TOKEN),
    htmlCrawlerEnabled: env.ENABLE_HTML_CRAWLER === 'true',
    legalCollectDisabled: env.DISABLE_LEGAL_COLLECT === 'true',
    collectOnStartup: env.COLLECT_ON_STARTUP !== 'false',
  };
}

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const optNum = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const errList = (v: unknown): string[] => (Array.isArray(v) ? v.map((e) => sanitizeError(e)).filter(Boolean) : []);

interface BuildCtx {
  trigger: Trigger;
  durationMs: number;
  finishedAt?: string;
}

function base(ctx: BuildCtx, o: { ok: boolean | null; saved: number; errors: string[]; errorCount?: number }): CollectorEntry {
  return {
    finishedAt: ctx.finishedAt ?? new Date().toISOString(),
    trigger: ctx.trigger,
    ok: o.ok,
    durationMs: Math.max(0, Math.round(ctx.durationMs)),
    saved: o.saved,
    errorCount: o.errorCount ?? o.errors.length,
    errors: o.errors.slice(0, MAX_ERRORS),
  };
}

/** 수집기 반환값 → 요약 항목. 알 수 없는 형상이어도 throw 하지 않는다. */
export function buildCollectorEntry(key: CollectorKey, result: unknown, ctx: BuildCtx): CollectorEntry {
  const r = isObj(result) ? result : {};
  switch (key) {
    case 'legal': {
      const results = Array.isArray(r.results) ? r.results.filter(isObj) : [];
      const bySource = results.slice(0, 10).map((x) => ({
        source: typeof x.source === 'string' ? x.source.slice(0, 40) : 'unknown',
        success: x.success === true,
        count: num(x.count),
        error: typeof x.error === 'string' ? sanitizeError(x.error) : null,
      }));
      const errors = bySource.filter((b) => !b.success).map((b) => `${b.source}: ${b.error ?? 'failed'}`);
      return { ...base(ctx, { ok: bySource.length > 0 && errors.length === 0, saved: num(r.savedCount), errors }), bySource };
    }
    case 'arxivHand':
    case 'arxivActuator': {
      if (r.ran === false) {
        return { ...base(ctx, { ok: null, saved: 0, errors: [] }), skippedReason: typeof r.reason === 'string' ? r.reason.slice(0, 60) : 'skipped' };
      }
      const errors = errList(r.errors);
      return base(ctx, { ok: errors.length === 0, saved: num(r.inserted), errors });
    }
    case 'youtube': {
      const errors = errList(r.errors);
      const skipped = Array.isArray(r.skippedChannels) ? r.skippedChannels.slice(0, MAX_CHANNELS).map((c) => sanitizeError(c, 120)) : [];
      const channels = Array.isArray(r.channels)
        ? r.channels.filter(isObj).slice(0, MAX_CHANNELS).map((c) => ({
            name: typeof c.name === 'string' ? c.name.slice(0, 120) : '',
            official: c.official === true,
            status: c.status === 'ok' ? 'ok' : 'skipped',
            fetched: num(c.fetched),
            inserted: num(c.inserted),
          }))
        : [];
      return {
        ...base(ctx, { ok: errors.length === 0, saved: num(r.videosInserted), errors }),
        channelsProcessed: num(r.channelsProcessed),
        channelsSkipped: num(r.channelsSkipped),
        skippedChannels: skipped.map((name) => ({ name })),
        channels,
        searchCalls: num(r.searchCalls),
        quotaExhausted: r.quotaExhausted === true,
      };
    }
    case 'eventSearch':
    case 'topicSearch': {
      const errors = errList(r.errors);
      const searchCalls = optNum(r.searchCalls) ?? num(r.queriesRun);
      return {
        ...base(ctx, { ok: errors.length === 0, saved: num(r.videosInserted), errors }),
        searchCalls,
        quotaExhausted: r.quotaExhausted === true,
        estimatedQuotaUnits: optNum(r.estimatedQuotaUnits) ?? searchCalls * 100,
      };
    }
  }
}

/** 수집기가 예외를 던진 경우의 항목 */
export function buildFailureEntry(err: unknown, ctx: BuildCtx): CollectorEntry {
  return base(ctx, { ok: false, saved: 0, errors: [sanitizeError(err)], errorCount: 1 });
}

// ── 쓰기(절대 throw 하지 않음) ──

export interface SummaryWriter {
  ensureTable(): Promise<void>;
  upsert(patch: { updatedAt: string; config: ConfigFlags; collectors: Record<string, CollectorEntry> }): Promise<void>;
}

const defaultWriter: SummaryWriter = {
  // 백엔드 dataMigrationService.ensureTable() 과 동일 DDL — 어느 쪽이 먼저 만들어도 동일
  ensureTable: async () => {
    await getDb().execute(sql`
      CREATE TABLE IF NOT EXISTS data_migrations (
        key VARCHAR(200) PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW(),
        summary JSONB NOT NULL DEFAULT '{}'::jsonb
      )
    `);
  },
  // 수집기 항목 단위 병합: 다른 수집기의 항목은 그대로 둔다
  upsert: async ({ updatedAt, config, collectors }) => {
    const cfg = JSON.stringify(config);
    const col = JSON.stringify(collectors);
    await getDb().execute(sql`
      INSERT INTO data_migrations (key, summary)
      VALUES (${COLLECT_LAST_KEY}, jsonb_build_object('schemaVersion', ${SUMMARY_SCHEMA_VERSION}::int, 'updatedAt', ${updatedAt}::text, 'config', ${cfg}::jsonb, 'collectors', ${col}::jsonb))
      ON CONFLICT (key) DO UPDATE SET
        applied_at = NOW(),
        summary = data_migrations.summary
          || jsonb_build_object('schemaVersion', ${SUMMARY_SCHEMA_VERSION}::int, 'updatedAt', ${updatedAt}::text, 'config', ${cfg}::jsonb,
               'collectors', COALESCE(data_migrations.summary->'collectors', '{}'::jsonb) || ${col}::jsonb)
    `);
  },
};

export interface WriteOptions {
  env?: Env;
  writer?: SummaryWriter;
  now?: () => Date;
  warn?: (msg: string) => void;
}

/** 한 수집기 항목을 기록한다. 성공 여부를 돌려줄 뿐 throw 하지 않는다. */
export async function writeCollectorSummary(key: CollectorKey, entry: CollectorEntry, opts: WriteOptions = {}): Promise<boolean> {
  const env = opts.env ?? process.env;
  const warn = opts.warn ?? ((m: string) => console.warn(m));
  try {
    if (!env.DATABASE_URL && !opts.writer) return false;
    const writer = opts.writer ?? defaultWriter;
    await writer.ensureTable();
    await writer.upsert({ updatedAt: (opts.now ?? (() => new Date()))().toISOString(), config: buildConfigFlags(env), collectors: { [key]: entry } });
    return true;
  } catch (err) {
    try {
      warn(`[CollectSummary] write failed (${key}): ${sanitizeError(err)}`);
    } catch {
      /* 로깅 실패도 무시 */
    }
    return false;
  }
}

/**
 * 수집기를 실행하고 결과를 기록한다. 수집기 결과는 그대로 돌려주고, 예외는 기록 후 그대로 다시 던진다
 * (기존 try/catch 와 로그 동작을 바꾸지 않는다). 기록 실패는 흐름에 영향이 없다.
 */
export async function trackCollector<T>(key: CollectorKey, trigger: Trigger, fn: () => Promise<T>, opts: WriteOptions = {}): Promise<T> {
  const t0 = Date.now();
  try {
    const result = await fn();
    await writeCollectorSummary(key, buildCollectorEntry(key, result, { trigger, durationMs: Date.now() - t0 }), opts);
    return result;
  } catch (err) {
    await writeCollectorSummary(key, buildFailureEntry(err, { trigger, durationMs: Date.now() - t0 }), opts);
    throw err;
  }
}
