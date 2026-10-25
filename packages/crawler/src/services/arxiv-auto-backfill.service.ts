/**
 * actuator arXiv 12개월 백필 — 배포만으로 1회 자동 수행.
 *
 * - 실행 조건: data_migrations 에 `arxiv-backfill:actuator:12m` 마커가 없을 때만 (행 수 조건은 쓰지 않는다).
 *   일일 크론이 이미 actuator 행을 넣고 있을 수 있어 "0건일 때만" 조건은 영원히 거짓이 될 수 있기 때문이다.
 * - 시작 시각: 기동 후 최소 90초, 기동 수집 체인(YouTube/Event/Topic) 종료 + 30초 (체인 대기는 최대 20분).
 *   KST 02:50~03:30 에는 시작하지 않고 03:31 까지 미룬다 (03:00 일일 크론과 충돌 회피).
 * - `arxivTopicCollectors.actuator.backfill({ months: 12 })` 를 await — 인스턴스 잠금/arXiv 연결 게이트를 그대로 공유한다.
 * - ok/partial 모두 완료로 기록한다. 락 충돌(ArxivTopicBusyError)·실패·예외는 마커를 남기지 않아 다음 기동에서 재시도된다.
 * - 어떤 경우에도 throw 하지 않는다 (프로세스 유지).
 */

import { sql } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { arxivTopicCollectors, ArxivTopicBusyError, type RunResult } from './arxiv-hand-collector.service.js';

const TAG = 'ArxivAutoBackfill';
export const BACKFILL_MARKER_KEY = 'arxiv-backfill:actuator:12m';
export const BACKFILL_MONTHS = 12;
export const DEFAULT_MIN_DELAY_SEC = 90;
export const CHAIN_GRACE_MS = 30_000;
export const CHAIN_MAX_WAIT_MS = 20 * 60_000;
const MAX_ERRORS_IN_MARKER = 20;

const KST_OFFSET_MS = 9 * 3_600_000;
const DAY_MS = 24 * 3_600_000;
/** 02:50 ~ 03:30 (분 단위, 양끝 포함) */
const BLACKOUT_START_MIN = 2 * 60 + 50;
const BLACKOUT_END_MIN = 3 * 60 + 30;

type Env = Record<string, string | undefined>;

// ─────────────────────────────────────────────────────────────────────────────
// 순수 함수
// ─────────────────────────────────────────────────────────────────────────────

/** 공통 게이트: DATABASE_URL, 자동 백필/actuator arXiv/법적 수집 비활성 env */
export function disabledReason(env: Env): string | null {
  if (!env.DATABASE_URL) return 'no-database-url';
  if (env.ARXIV_ACTUATOR_AUTO_BACKFILL === 'false') return 'auto-backfill-off';
  if (env.DISABLE_ARXIV_ACTUATOR === 'true') return 'arxiv-actuator-disabled';
  if (env.DISABLE_LEGAL_COLLECT === 'true') return 'legal-collect-disabled';
  return null;
}

/** 실행 여부 판정 — env 게이트를 통과하고 완료 마커가 없을 때만 실행 */
export function shouldRunBackfill(input: { env: Env; markerExists: boolean }): { run: boolean; reason?: string } {
  const off = disabledReason(input.env);
  if (off) return { run: false, reason: off };
  if (input.markerExists) return { run: false, reason: 'marker-exists' };
  return { run: true };
}

function kstTimeOfDayMs(now: Date): number {
  return (((now.getTime() + KST_OFFSET_MS) % DAY_MS) + DAY_MS) % DAY_MS;
}

/** KST 02:50~03:30 (양끝 포함) 여부. 서버 TZ 와 무관하게 UTC 기준으로 환산한다. */
export function isInKstBlackout(now: Date): boolean {
  const min = Math.floor(kstTimeOfDayMs(now) / 60_000);
  return min >= BLACKOUT_START_MIN && min <= BLACKOUT_END_MIN;
}

/** 블랙아웃 중이면 KST 03:31:00 까지 남은 ms, 아니면 0 */
export function blackoutDelayMs(now: Date): number {
  if (!isInKstBlackout(now)) return 0;
  return (BLACKOUT_END_MIN + 1) * 60_000 - kstTimeOfDayMs(now);
}

/** 기동 후 최소 지연(ms) — ARXIV_ACTUATOR_BACKFILL_DELAY_SEC, 기본 90초 */
export function minStartDelayMs(env: Env): number {
  const n = parseInt(env.ARXIV_ACTUATOR_BACKFILL_DELAY_SEC ?? '', 10);
  return (Number.isFinite(n) && n >= 0 ? n : DEFAULT_MIN_DELAY_SEC) * 1000;
}

export function buildMarkerSummary(r: RunResult, startedAt: string, finishedAt: string): Record<string, unknown> {
  return {
    status: r.errors.length === 0 ? 'ok' : 'partial',
    months: BACKFILL_MONTHS,
    inserted: r.inserted,
    skipped: r.skipped,
    relevant: r.relevant,
    errors: r.errors.slice(0, MAX_ERRORS_IN_MARKER),
    errorCount: r.errors.length,
    truncatedWindows: r.truncatedWindows,
    elapsedMs: r.elapsedMs,
    startedAt,
    finishedAt,
  };
}

type Field = string | number | boolean | null | undefined | object;

export function formatLogLine(fields: Record<string, Field>): string {
  const parts = Object.entries(fields)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => {
      if (v === null) return `${k}=null`;
      if (typeof v === 'string') return `${k}=${/^[\w:.,\-/]+$/.test(v) ? v : JSON.stringify(v)}`;
      if (typeof v === 'object') return `${k}=${JSON.stringify(v)}`;
      return `${k}=${v}`;
    });
  return `[${TAG}] ${parts.join(' ')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 의존성 (테스트에서 주입)
// ─────────────────────────────────────────────────────────────────────────────

export interface BackfillDeps {
  env: Env;
  now(): Date;
  ensureTable(): Promise<void>;
  hasMarker(): Promise<boolean>;
  writeMarker(summary: Record<string, unknown>): Promise<void>;
  backfill(opts: { months: number; dryRun: boolean }): Promise<RunResult>;
  log: { info(line: string): void; warn(line: string): void; error(line: string): void };
}

export const defaultDeps: BackfillDeps = {
  get env() { return process.env; },
  now: () => new Date(),
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
  hasMarker: async () => {
    const res = await getDb().execute(sql`SELECT 1 AS present FROM data_migrations WHERE key = ${BACKFILL_MARKER_KEY} LIMIT 1`);
    return (res.rows?.length ?? 0) > 0;
  },
  writeMarker: async (summary) => {
    await getDb().execute(sql`
      INSERT INTO data_migrations (key, summary)
      VALUES (${BACKFILL_MARKER_KEY}, ${JSON.stringify(summary)}::jsonb)
      ON CONFLICT (key) DO UPDATE SET applied_at = NOW(), summary = EXCLUDED.summary
    `);
  },
  backfill: (opts) => arxivTopicCollectors.actuator.backfill(opts),
  log: { info: (l) => console.log(l), warn: (l) => console.warn(l), error: (l) => console.error(l) },
};

// ─────────────────────────────────────────────────────────────────────────────
// 실행
// ─────────────────────────────────────────────────────────────────────────────

export type BackfillOutcome = 'skipped' | 'ok' | 'partial' | 'failed';

/**
 * 판정 + 실행 + 마커 기록 (대기 없음). 시각 보정(블랙아웃)은 호출자가 먼저 처리한다.
 * 어떤 경우에도 throw 하지 않는다.
 */
export async function runActuatorBackfillOnce(deps: BackfillDeps = defaultDeps): Promise<BackfillOutcome> {
  const base = { domain: 'actuator' };
  try {
    const off = disabledReason(deps.env);
    if (off) {
      deps.log.info(formatLogLine({ ...base, status: 'skipped', reason: off }));
      return 'skipped';
    }
    await deps.ensureTable();
    const decision = shouldRunBackfill({ env: deps.env, markerExists: await deps.hasMarker() });
    if (!decision.run) {
      deps.log.info(formatLogLine({ ...base, status: 'skipped', reason: decision.reason }));
      return 'skipped';
    }

    const startedAt = deps.now().toISOString();
    deps.log.info(formatLogLine({ ...base, status: 'starting', months: BACKFILL_MONTHS }));
    let result: RunResult;
    try {
      result = await deps.backfill({ months: BACKFILL_MONTHS, dryRun: false });
    } catch (err) {
      if (err instanceof ArxivTopicBusyError) {
        deps.log.warn(formatLogLine({ ...base, status: 'skipped', reason: 'lock-busy' }));
        return 'skipped';
      }
      throw err;
    }
    const finishedAt = deps.now().toISOString();
    const summary = buildMarkerSummary(result, startedAt, finishedAt);
    try {
      await deps.writeMarker(summary);
    } catch (err) {
      deps.log.error(formatLogLine({ ...base, status: 'failed', reason: 'marker-write', error: (err as Error).message }));
    }
    deps.log.info(
      formatLogLine({
        ...base, status: 'done', months: BACKFILL_MONTHS, result: summary.status as string,
        inserted: result.inserted, errors: result.errors.length, elapsedMs: result.elapsedMs,
      }),
    );
    return summary.status as 'ok' | 'partial';
  } catch (err) {
    deps.log.error(formatLogLine({ ...base, status: 'failed', error: err instanceof Error ? err.message : String(err) }));
    return 'failed';
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * 기동 시 호출. 시작 시각 = max(기동+최소 지연, 수집 체인 종료+30초(체인 대기 최대 20분)), KST 블랙아웃이면 03:31 까지 연기.
 * startupChain 이 null 이면(기동 수집 꺼짐) 체인 대기 없음. 반환값은 테스트용 (실행이 끝나면 resolve).
 */
export function scheduleActuatorAutoBackfill(
  startupChain: Promise<unknown> | null,
  deps: BackfillDeps = defaultDeps,
): Promise<BackfillOutcome | 'disabled'> {
  const off = disabledReason(deps.env);
  if (off) {
    deps.log.info(formatLogLine({ domain: 'actuator', status: 'disabled', reason: off }));
    return Promise.resolve('disabled');
  }
  const minDelay = minStartDelayMs(deps.env);
  deps.log.info(formatLogLine({ domain: 'actuator', status: 'scheduled', months: BACKFILL_MONTHS, minDelaySec: minDelay / 1000, waitsForStartupChain: startupChain !== null }));

  // 체인 종료 시각은 호출 즉시 추적한다 (최소 지연 이전에 끝난 체인의 +30초 계산이 정확하도록)
  let endedAt: number | null = null;
  const tracked = startupChain
    ? startupChain.then(() => undefined, () => undefined).then(() => { endedAt = Date.now(); })
    : null;

  return new Promise((resolve) => {
    setTimeout(() => {
      void (async () => {
        try {
          // 1) 기동 수집 체인 대기 (최대 20분) 후 종료+30초
          if (tracked) {
            let cap: ReturnType<typeof setTimeout> | undefined;
            const timedOut = await Promise.race([
              tracked.then(() => false),
              new Promise<boolean>((r) => { cap = setTimeout(() => r(true), CHAIN_MAX_WAIT_MS); }),
            ]);
            if (cap) clearTimeout(cap);
            if (timedOut) {
              deps.log.warn(formatLogLine({ domain: 'actuator', status: 'waiting', reason: 'startup-chain-timeout' }));
            } else {
              const wait = Math.max(0, (endedAt ?? Date.now()) + CHAIN_GRACE_MS - Date.now());
              if (wait > 0) await sleep(wait);
            }
          }
          // 2) KST 02:50~03:30 블랙아웃 보정 — 대기 후 시각을 다시 확인한다
          for (let guard = 0; guard < 3; guard++) {
            const delay = blackoutDelayMs(deps.now());
            if (delay <= 0) break;
            deps.log.info(formatLogLine({ domain: 'actuator', status: 'waiting', reason: 'kst-blackout', delayMs: delay }));
            await sleep(delay);
          }
          // 3) 판정 + 실행
          resolve(await runActuatorBackfillOnce(deps));
        } catch (err) {
          deps.log.error(formatLogLine({ domain: 'actuator', status: 'failed', error: err instanceof Error ? err.message : String(err) }));
          resolve('failed');
        }
      })();
    }, minDelay);
  });
}
