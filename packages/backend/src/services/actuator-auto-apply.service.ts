/**
 * 액추에이터 데이터 기동 시 자동 적용.
 *
 * - env ACTUATOR_DATA_AUTO_APPLY: true(기본) | false | dry-run
 * - 키 = 데이터 파일 내용 해시(+LOGIC_VERSION). data_migrations 에 키가 있으면 건너뛴다.
 * - pg_advisory_xact_lock 후 같은 트랜잭션에서 키를 재확인하고, 데이터 쓰기와 마커 기록을 한 트랜잭션으로 묶는다.
 * - 정상 적용(applied, dry-run 제외) 직후 포지션 맵 캐시를 무효화한다 (실패해도 throw 하지 않음).
 * - 어떤 실패에도 throw 하지 않는다 (서버 기동 유지). 실패 시 마커가 없으므로 다음 기동에서 재시도된다.
 */

import { eq, sql } from 'drizzle-orm';
import { dataMigrations } from '../db/index.js';
import {
  applyActuatorDataUpdate,
  computeActuatorDataKey,
  resolveDefaultDataDir,
  type ApplyLogger,
  type ApplyResult,
} from '../db/apply-actuator-data-update.js';
import { dataMigrationService } from './data-migration.service.js';
import { actuatorPositionMapService } from './actuator-position-map.service.js';
import { formatLogLine } from './ops-log.util.js';

const TAG = 'ActuatorAutoApply';
/** 동시 기동(다중 인스턴스) 직렬화용 advisory lock 키 */
export const ADVISORY_LOCK_KEY = 724301;
const MAX_WARNINGS_IN_MARKER = 50;

export type AutoApplyMode = 'true' | 'false' | 'dry-run';

/** env 값 해석 — 미설정은 true, 이상값은 true 로 취급하고 onInvalid 콜백(기본 console.warn)으로 알린다. */
export function parseMode(raw: string | undefined, onInvalid: (raw: string) => void = defaultInvalidWarn): AutoApplyMode {
  if (raw === undefined) return 'true';
  const v = raw.trim().toLowerCase();
  if (v === '') return 'true';
  if (v === 'true' || v === 'false' || v === 'dry-run') return v;
  onInvalid(raw);
  return 'true';
}

function defaultInvalidWarn(raw: string): void {
  console.warn(formatLogLine(TAG, { warn: 'invalid ACTUATOR_DATA_AUTO_APPLY, treated as true', value: raw }));
}

export type AutoApplyStatus = 'applied' | 'skipped' | 'dry-run' | 'failed' | 'disabled';

export interface AutoApplyOutcome {
  status: AutoApplyStatus;
  key?: string;
  reason?: string;
  error?: string;
  result?: ApplyResult;
}

export function buildMarkerSummary(result: ApplyResult, key: string, durationMs: number): Record<string, unknown> {
  return {
    counters: result.counters,
    warnings: result.warnings.slice(0, MAX_WARNINGS_IN_MARKER),
    warningCount: result.warnings.length,
    createdCompanies: result.createdCompanies,
    createdRobots: result.createdRobots,
    sections: result.sectionsRun,
    files: { ...result.files, sha: key.slice('actuator-update:'.length) },
    durationMs,
    ...(process.env.npm_package_version ? { appVersion: process.env.npm_package_version } : {}),
  };
}

function makeLogger(): ApplyLogger {
  const verbose = process.env.ACTUATOR_DATA_VERBOSE === 'true';
  return {
    detail: (m) => { if (verbose) console.log(m); },
    info: (m) => { if (verbose) console.log(`[${TAG}] ${m.trim()}`); },
    warn: (m) => console.warn(`[${TAG}] warn=${JSON.stringify(m)}`),
  };
}

function logLine(level: 'log' | 'warn' | 'error', fields: Parameters<typeof formatLogLine>[1]): void {
  console[level](formatLogLine(TAG, fields));
}

export async function autoApplyActuatorData(): Promise<AutoApplyOutcome> {
  const mode = parseMode(process.env.ACTUATOR_DATA_AUTO_APPLY);
  if (mode === 'false') {
    logLine('log', { status: 'disabled' });
    return { status: 'disabled' };
  }

  const startedAt = Date.now();
  let key: string | undefined;
  try {
    const dataDir = resolveDefaultDataDir();
    key = computeActuatorDataKey(dataDir); // 파일 없음 → throw (DB 접근 전 실패)
    const dryRun = mode === 'dry-run';
    const markerKey = key;

    if (!dryRun && (await dataMigrationService.has(markerKey))) {
      logLine('log', { key, status: 'skipped', reason: 'already-applied' });
      return { status: 'skipped', key, reason: 'already-applied' };
    }

    const result = await applyActuatorDataUpdate({
      dryRun,
      dataDir,
      createRobotCompanies: process.env.ACTUATOR_DATA_CREATE_COMPANIES === 'true',
      logger: makeLogger(),
      txHooks: dryRun
        ? undefined
        : {
            beforeWrite: async (tx) => {
              await tx.execute(sql`SELECT pg_advisory_xact_lock(${ADVISORY_LOCK_KEY})`);
              const rows = await tx.select({ key: dataMigrations.key }).from(dataMigrations).where(eq(dataMigrations.key, markerKey)).limit(1);
              return rows.length > 0 ? 'skip' : 'proceed';
            },
            afterWrite: async (tx, r) => {
              await tx
                .insert(dataMigrations)
                .values({ key: markerKey, summary: buildMarkerSummary(r, markerKey, Date.now() - startedAt) })
                .onConflictDoNothing();
            },
          },
    });

    const durationMs = Date.now() - startedAt;
    if (result.skipped) {
      logLine('log', { key, status: 'skipped', reason: 'already-applied', durationMs });
      return { status: 'skipped', key, reason: 'already-applied', result };
    }
    const status: AutoApplyStatus = dryRun ? 'dry-run' : 'applied';
    if (status === 'applied') {
      try {
        await actuatorPositionMapService.invalidate();
      } catch (err) {
        logLine('warn', { key, warn: 'position map cache invalidation failed', error: err instanceof Error ? err.message : String(err) });
      }
    }
    logLine('log', {
      key,
      status,
      durationMs,
      counts: result.counters,
      warnings: result.warnings.length,
      createdCompanies: result.createdCompanies.length,
      createdRobots: result.createdRobots.length,
    });
    return { status, key, result };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logLine('error', { key, status: 'failed', durationMs: Date.now() - startedAt, error });
    return { status: 'failed', key, error };
  }
}
