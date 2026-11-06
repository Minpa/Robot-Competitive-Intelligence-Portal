/**
 * 데이터 커버리지 오케스트레이터 — 쿼리 묶음 실행(동시성 3, 쿼리별 타임아웃, 전체 데드라인),
 * 구역 격리, view_cache 10분 캐시, 단일 실행(single-flight), 새로고침 스로틀, 일일 스냅샷, 비교 기준 병합.
 * 읽기 전용이며 AI 를 호출하지 않는다. 쓰기는 data_migrations 의 스냅샷 키뿐이다.
 */

import { pool } from '../db/index.js';
import { viewCacheService } from './view-cache.service.js';
import { dataMigrationService } from './data-migration.service.js';
import { dataAuditService, type AuditReport } from './data-audit.service.js';
import { resolveClaudeMonthlyLimitUsd } from './ai-usage.service.js';
import { getGeminiScopeConfig } from './video-content-analysis.service.js';
import { VIDEO_TAGGING_DAILY_LIMIT } from './video-tagging.service.js';
import { PAPER_SUMMARY_DAILY_LIMIT } from './paper-summary.service.js';
import type { CoverageSection, DataCoverageResponse } from '../types/data-coverage.js';
import { applyBaselineDelta, sanitizeErrorMessage } from './data-coverage-aggregate.js';
import {
  QueryTimeoutError,
  classifyQueryError,
  createCoverageQueries,
  type CoverageQueryMap,
  type QueryCtx,
  type Res,
} from './data-coverage-queries.js';
import { buildSections, parseCollectLast, type CollectLast, type CoverageBundles, type CoverageLimits, type GeminiScopeView } from './data-coverage-sections.js';
import { SnapshotStore, kstDate, type MigrationStoreLike } from './data-coverage-snapshot.js';

export const DATA_COVERAGE_CACHE_KEY = 'data-coverage';
export const DATA_COVERAGE_TTL_SEC = 600;
export const COLLECT_LAST_KEY = 'collect:last';
export const REFRESH_THROTTLE_MS = 30_000;
export const PARTIAL_RETRY_MS = 60_000;
export const COMPUTE_DEADLINE_MS = 5_000;
export const DEFAULT_QUERY_TIMEOUT_MS = 4_000;
export const MAX_CONCURRENCY = 3;

/** 캐시에 저장되는 값 — 현재값만(비교 기준은 요청 시 병합) */
export interface CoverageBase {
  schemaVersion: 1;
  generatedAt: string;
  partial: boolean;
  sections: CoverageSection[];
}

export function resolveQueryTimeoutMs(env: Readonly<Record<string, string | undefined>> = process.env): number {
  const n = env.DATA_COVERAGE_QUERY_TIMEOUT_MS !== undefined ? Number(env.DATA_COVERAGE_QUERY_TIMEOUT_MS) : NaN;
  return Number.isFinite(n) && n >= 100 ? Math.floor(n) : DEFAULT_QUERY_TIMEOUT_MS;
}

export function isSnapshotDisabled(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  return env.DISABLE_DATA_COVERAGE_SNAPSHOT === 'true';
}

export interface DataCoverageDeps {
  queries: CoverageQueryMap;
  snapshots: SnapshotStore;
  cache: {
    getOrCompute<T>(view: string, fn: () => Promise<T>): Promise<{ data: T; isStale: boolean; cachedAt: Date | null }>;
    invalidate(view: string): Promise<void>;
  };
  readCollect(): Promise<CollectLast | null>;
  readAudit(): Promise<AuditReport | null>;
  geminiScope(): GeminiScopeView & { batchLimit: number };
  limits(): Omit<CoverageLimits, 'geminiBatchLimit'>;
  now(): Date;
  queryTimeoutMs(): number;
  deadlineMs: number;
  snapshotDisabled(): boolean;
  log(message: string): void;
}

class Semaphore {
  private waiters: (() => void)[] = [];
  private active = 0;
  constructor(private readonly max: number) {}
  async acquire(): Promise<void> {
    if (this.active < this.max) {
      this.active++;
      return;
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
  }
  release(): void {
    const next = this.waiters.shift();
    if (next) next();
    else this.active--;
  }
}

function withTimer<T>(p: Promise<T>, ms: number): Promise<T> {
  let t: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    t = setTimeout(() => reject(new QueryTimeoutError('query timed out')), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(t));
}

const hasAnyOk = (sections: readonly CoverageSection[]) => sections.some((s) => s.metrics.some((m) => m.status === 'ok') || s.tables.some((t) => t.status === 'ok'));
const isPartial = (sections: readonly CoverageSection[]) => sections.some((s) => s.status === 'failed' || s.status === 'partial');

export type RefreshResult = { ok: true; response: DataCoverageResponse } | { ok: false; retryAfterSec: number };

export class DataCoverageService {
  private computeInflight: Promise<CoverageBase> | null = null;
  private lastComputedAtMs = 0;
  private lastGood: { base: CoverageBase; cachedAt: Date } | null = null;
  private snapshotState: { date: string; partial: boolean } | null = null;

  constructor(private readonly deps: DataCoverageDeps) {}

  // ── 계산 ──

  private async compute(): Promise<CoverageBase> {
    const d = this.deps;
    const startedAt = Date.now();
    const deadlineAt = startedAt + d.deadlineMs;
    const queryTimeout = d.queryTimeoutMs();
    const sem = new Semaphore(MAX_CONCURRENCY);

    const exec = async <T>(fn: (ctx: QueryCtx) => Promise<T>): Promise<Res<T>> => {
      await sem.acquire();
      try {
        const remaining = deadlineAt - Date.now();
        if (remaining <= 0) return { ok: false, reason: 'timeout', message: '계산 시간 초과' };
        const timeoutMs = Math.min(queryTimeout, remaining);
        const data = await withTimer(fn({ timeoutMs }), timeoutMs + 250);
        return { ok: true, data };
      } catch (err) {
        return { ok: false, reason: classifyQueryError(err), message: sanitizeErrorMessage(err) };
      } finally {
        sem.release();
      }
    };

    const now = d.now();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const scopeFull = d.geminiScope();
    const q = d.queries;

    // 무거운 articles 스캔을 먼저 시작한다(동시성 슬롯 우선 배정)
    const [qa1, qa2, qa6, robots, bodyFields, handFields, powerFields, components, supplier, sourcing, ci, ciByLayer, ciStaging, handBenchmark, aiProvider, aiTag, aiLoggedTags, autoCompanies, crawl, crawlErrors, collect, audit] = await Promise.all([
      exec((c) => q.qa1(c)),
      exec((c) => q.qa2(c, scopeFull)),
      exec((c) => q.qa6(c, 200_000)),
      exec((c) => q.robots(c)),
      exec((c) => q.bodyFields(c)),
      exec((c) => q.handFields(c)),
      exec((c) => q.powerFields(c)),
      exec((c) => q.components(c)),
      exec((c) => q.supplier(c)),
      exec((c) => q.sourcing(c)),
      exec((c) => q.ci(c)),
      exec((c) => q.ciByLayer(c)),
      exec((c) => q.ciStaging(c)),
      exec((c) => q.handBenchmark(c)),
      exec((c) => q.aiProvider(c, monthStart)),
      exec((c) => q.aiTag(c, monthStart)),
      exec((c) => q.aiLoggedTags(c)),
      exec((c) => q.autoCompanies(c)),
      exec((c) => q.crawl(c)),
      exec((c) => q.crawlErrors(c)),
      exec(() => d.readCollect()),
      exec(() => d.readAudit()),
    ]);

    const bundles: CoverageBundles = {
      qa1, qa2, qa6, robots, bodyFields, handFields, powerFields, components, supplier, sourcing, ci, ciByLayer, ciStaging, handBenchmark,
      aiProvider, aiTag, aiLoggedTags, autoCompanies, crawl, crawlErrors, collect, audit,
    };
    const sections = buildSections({
      now,
      monthStart,
      bundles,
      limits: { ...d.limits(), geminiBatchLimit: scopeFull.batchLimit },
      geminiScope: scopeFull,
    });
    const base: CoverageBase = { schemaVersion: 1, generatedAt: new Date().toISOString(), partial: isPartial(sections), sections };
    this.lastComputedAtMs = Date.now();
    if (hasAnyOk(sections)) this.lastGood = { base, cachedAt: new Date() };
    return base;
  }

  private computeShared(): Promise<CoverageBase> {
    if (!this.computeInflight) {
      this.computeInflight = this.compute().finally(() => {
        this.computeInflight = null;
      });
    }
    return this.computeInflight;
  }

  /** 캐시를 거쳐 현재값을 얻는다. 전체 계산 불가 + 직전 정상값이 있으면 던져서 캐시 폴백(stale)을 타게 한다. */
  private async resolve(): Promise<{ base: CoverageBase; computed: boolean; stale: boolean; cachedAt: Date | null }> {
    let computed = false;
    const run = () =>
      this.deps.cache.getOrCompute<CoverageBase>(DATA_COVERAGE_CACHE_KEY, async () => {
        computed = true;
        const base = await this.computeShared();
        if (!hasAnyOk(base.sections) && this.lastGood) throw new Error('coverage compute failed');
        return base;
      });
    try {
      const r = await run();
      return { base: r.data, computed, stale: r.isStale, cachedAt: r.cachedAt };
    } catch {
      if (this.lastGood) return { base: this.lastGood.base, computed, stale: true, cachedAt: this.lastGood.cachedAt };
      throw new Error('coverage unavailable');
    }
  }

  // ── 응답 조립 ──

  private async respond(base: CoverageBase, meta: { computed: boolean; stale: boolean; cachedAt: Date | null }, compareTo: string | null): Promise<DataCoverageResponse> {
    const now = this.deps.now();
    let compare: DataCoverageResponse['compare'] = { requestedDate: compareTo, baselineDate: null, baselineTakenAt: null, availableDates: [], reason: 'no_snapshot' };
    let sections = applyBaselineDelta(base.sections, null);
    try {
      const r = await this.deps.snapshots.resolveBaseline(compareTo, now);
      compare = r.compare;
      sections = applyBaselineDelta(base.sections, r.snapshot);
    } catch (err) {
      this.deps.log(`[DataCoverage] snapshot read failed: ${sanitizeErrorMessage(err)}`);
    }
    const ageSec = meta.computed || !meta.cachedAt ? 0 : Math.max(0, Math.floor((now.getTime() - meta.cachedAt.getTime()) / 1000));
    return {
      schemaVersion: 1,
      generatedAt: base.generatedAt,
      cache: { hit: !meta.computed, stale: meta.stale, ageSec, ttlSec: DATA_COVERAGE_TTL_SEC },
      partial: base.partial,
      compare,
      sections,
    };
  }

  /** 당일 스냅샷 보충 저장(비동기·실패 무시). 상태 메모로 캐시 적중 요청은 DB 를 건드리지 않는다. */
  private maybeSnapshot(base: CoverageBase): Promise<'saved' | 'kept' | 'skipped'> {
    if (this.deps.snapshotDisabled()) return Promise.resolve('skipped');
    const today = kstDate(this.deps.now());
    if (kstDate(new Date(base.generatedAt)) !== today) return Promise.resolve('skipped');
    const st = this.snapshotState;
    if (st && st.date === today && !(st.partial && !base.partial)) return Promise.resolve('skipped');
    return this.deps.snapshots
      .saveForDate(today, base.sections, { takenAt: base.generatedAt, partial: base.partial })
      .then((outcome) => {
        this.snapshotState = { date: today, partial: base.partial };
        return outcome;
      })
      .catch((err) => {
        this.deps.log(`[DataCoverage] snapshot save failed: ${sanitizeErrorMessage(err)}`);
        return 'skipped' as const;
      });
  }

  // ── 공개 API ──

  async getCoverage(compareTo: string | null = null): Promise<DataCoverageResponse> {
    let r = await this.resolve();
    // 부분 실패 결과는 60초 후 다음 요청에서 재계산한다
    if (!r.computed && !r.stale && r.base.partial && r.cachedAt && this.deps.now().getTime() - r.cachedAt.getTime() >= PARTIAL_RETRY_MS) {
      await this.deps.cache.invalidate(DATA_COVERAGE_CACHE_KEY);
      r = await this.resolve();
    }
    void this.maybeSnapshot(r.base);
    return this.respond(r.base, r, compareTo);
  }

  async refresh(): Promise<RefreshResult> {
    // 진행 중 계산이 있으면 새로 시작하지 않고 그 결과를 공유한다
    if (!this.computeInflight) {
      const since = Date.now() - this.lastComputedAtMs;
      if (this.lastComputedAtMs > 0 && since < REFRESH_THROTTLE_MS) {
        return { ok: false, retryAfterSec: Math.max(1, Math.ceil((REFRESH_THROTTLE_MS - since) / 1000)) };
      }
      await this.deps.cache.invalidate(DATA_COVERAGE_CACHE_KEY);
    }
    const r = await this.resolve();
    void this.maybeSnapshot(r.base);
    return { ok: true, response: await this.respond(r.base, r, null) };
  }

  /** 스케줄러 태스크: TTL 을 무시하고 재계산해 오늘 스냅샷을 규칙대로 저장한다. */
  async runSnapshotTask(): Promise<{ outcome: 'saved' | 'kept' | 'skipped' | 'failed' }> {
    if (this.deps.snapshotDisabled()) return { outcome: 'skipped' };
    try {
      await this.deps.cache.invalidate(DATA_COVERAGE_CACHE_KEY);
      const r = await this.resolve();
      if (!hasAnyOk(r.base.sections)) return { outcome: 'failed' };
      this.snapshotState = null;
      const outcome = await this.maybeSnapshot(r.base);
      return { outcome };
    } catch (err) {
      this.deps.log(`[DataCoverage] snapshot task failed: ${sanitizeErrorMessage(err)}`);
      return { outcome: 'failed' };
    }
  }
}

export function createDefaultDeps(overrides: Partial<DataCoverageDeps> = {}): DataCoverageDeps {
  return {
    queries: createCoverageQueries(pool),
    snapshots: new SnapshotStore(dataMigrationService as unknown as MigrationStoreLike),
    cache: viewCacheService,
    readCollect: async () => parseCollectLast((await dataMigrationService.get(COLLECT_LAST_KEY))?.summary),
    readAudit: () => dataAuditService.getLatestReport(),
    geminiScope: () => {
      const c = getGeminiScopeConfig();
      return { domainFilter: c.domainFilter, sinceDays: c.sinceDays, requireDemoSignal: c.requireDemoSignal, maxAttempts: c.maxAttempts, batchLimit: c.batchLimit };
    },
    limits: () => ({
      claudeMonthlyLimitUsd: resolveClaudeMonthlyLimitUsd(),
      videoTaggingDailyLimit: VIDEO_TAGGING_DAILY_LIMIT,
      paperSummaryDailyLimit: PAPER_SUMMARY_DAILY_LIMIT,
    }),
    now: () => new Date(),
    queryTimeoutMs: () => resolveQueryTimeoutMs(),
    deadlineMs: COMPUTE_DEADLINE_MS,
    snapshotDisabled: () => isSnapshotDisabled(),
    log: (m) => console.warn(m),
    ...overrides,
  };
}

let instance: DataCoverageService | null = null;
export function getDataCoverageService(): DataCoverageService {
  if (!instance) instance = new DataCoverageService(createDefaultDeps());
  return instance;
}
