import { and, eq, sql } from 'drizzle-orm';
import { getDb, articles } from '../db/index.js';
import {
  ARXIV_SUMMARY_MAX,
  markArxivRequestDone,
  parseArxivAtom,
  waitArxivTurn,
  withArxivConnection,
  type ArxivAtomEntry,
  type ParsedArxivFeed,
} from './arxiv-atom.js';
import {
  bisectWindow,
  buildArxivUrl,
  buildMonthWindows,
  contentHashForArxivId,
  type ArxivWindow,
  type HandQuery,
  type HandQueryId,
} from './arxiv-hand-query.js';
import {
  ARXIV_DOMAIN_QUERIES,
  collectedAtKey,
  collectorName,
  estimateDomainBackfill,
  isRelevantDomainPaper,
  logTag,
  type ArxivTopicDomain,
} from './arxiv-domain-query.js';

/**
 * 도메인(hand/actuator) arXiv 검색 수집기 (일일 증분 + 과거 N개월 1회성 백필)
 *
 * 원래 핸드 전용(ArxivHandCollector)이던 구현을 도메인 파라미터화한 것으로, 기본 도메인은 hand 이며
 * hand 의 쿼리·필터·저장 메타·로그 형식은 종전과 동일하다. 도메인별로 인스턴스(잠금)가 분리되고
 * 레이트리미터·백오프·중복 병합 로직은 공유한다.
 *
 * 법적으로 안전한 수집:
 * - arXiv 공식 API(https://export.arxiv.org/api/query, Atom)만 사용. PDF/HTML 페이지는 요청하지 않는다.
 * - 초록은 앞 500자 발췌만 저장.
 *
 * arXiv API ToU 준수: 요청 간 최소 3초 간격(ARXIV_MIN_INTERVAL_MS), 단일 연결 — 요청은 항상 직렬(await).
 * 레이트리미터는 ArxivCollector·모든 도메인 인스턴스가 모듈 레벨로 공유한다(arxiv-atom.ts).
 */

/** 페이지 크기 */
export const ARXIV_PAGE_SIZE = 100;
/** 윈도우당 한 쿼리가 가져올 수 있는 최대 건수(10페이지). 초과하면 윈도우를 이분한다. */
export const MAX_WINDOW_RESULTS = 1000;
/** 네트워크/429/5xx 재시도 횟수 */
export const MAX_RETRIES = 2;
/** 백오프 기준 3초 × 2^n → 6초, 12초 */
const BACKOFF_BASE_MS = 3000;
/** Retry-After 상한 */
const RETRY_AFTER_CAP_MS = 60_000;
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_ERRORS_KEPT = 500;

// ------------------------------------------------------------------
// 저장소 추상화 (DB 모킹 지점)
// ------------------------------------------------------------------

export interface HandArticleRow {
  title: string;
  source: 'arxiv';
  url: string;
  publishedAt: Date | null;
  summary: string;
  contentHash: string;
  category: 'technology';
  language: 'en';
  productType: null;
  extractedMetadata: Record<string, unknown>;
}

export interface HandMergeMeta {
  queryIds: string[];
  /** 실행 시각(ISO). 이름은 핸드 시절의 호환용 — 도메인 저장소는 `${domain}CollectedAt` 키로 기록한다 */
  handCollectedAt: string;
}

/** 도메인 수집기가 넘기는 병합 메타 — handCollectedAt(호환)과 collectedAt 은 같은 값 */
export interface DomainMergeMeta extends HandMergeMeta {
  domain: ArxivTopicDomain;
  collectedAt: string;
}

export interface HandArticleStore {
  /** base arXiv ID → 이미 존재하는 source='arxiv' 행 id 목록 (http/https, 버전 차이 흡수) */
  findExistingByBaseIds(baseIds: string[]): Promise<Map<string, string[]>>;
  /** INSERT … ON CONFLICT DO NOTHING. 새 행 id, 충돌이면 null */
  insert(row: HandArticleRow): Promise<string | null>;
  /** extracted_metadata 에 topicQuery/topics/queryIds/{domain}CollectedAt 만 병합 (aiSummaryKo 등 기존 키 보존) */
  mergeMeta(rowIds: string[], meta: DomainMergeMeta): Promise<void>;
}

export type DomainArticleStore = HandArticleStore;

/** 'arxiv_id_without_version' 을 계산하는 SQL 식 (url 에서 http/https, 버전 접미사 제거) */
const BASE_ID_SQL = sql`regexp_replace(regexp_replace(${articles.url}, '^https?://(www\\.)?arxiv\\.org/abs/', ''), 'v[0-9]+$', '')`;

export class DrizzleHandArticleStore implements HandArticleStore {
  constructor(private readonly domain: ArxivTopicDomain = 'hand') {}

  async findExistingByBaseIds(baseIds: string[]): Promise<Map<string, string[]>> {
    const out = new Map<string, string[]>();
    if (baseIds.length === 0) return out;
    const db = getDb();
    const rows = await db
      .select({ id: articles.id, base: sql<string>`${BASE_ID_SQL}` })
      .from(articles)
      .where(
        and(
          eq(articles.source, 'arxiv'),
          sql`${BASE_ID_SQL} IN (${sql.join(
            baseIds.map((b) => sql`${b}`),
            sql`, `
          )})`
        )
      );
    for (const r of rows) {
      const list = out.get(r.base) ?? [];
      list.push(r.id);
      out.set(r.base, list);
    }
    return out;
  }

  async insert(row: HandArticleRow): Promise<string | null> {
    const db = getDb();
    const inserted = await db
      .insert(articles)
      .values({
        title: row.title,
        source: row.source,
        url: row.url,
        publishedAt: row.publishedAt,
        summary: row.summary,
        contentHash: row.contentHash,
        category: row.category,
        language: row.language,
        productType: row.productType,
        extractedMetadata: row.extractedMetadata,
      })
      .onConflictDoNothing()
      .returning({ id: articles.id });
    return inserted[0]?.id ?? null;
  }

  async mergeMeta(rowIds: string[], meta: DomainMergeMeta): Promise<void> {
    if (rowIds.length === 0) return;
    const db = getDb();
    const domain = meta.domain ?? this.domain;
    const idList = sql.join(
      rowIds.map((id) => sql`${id}::uuid`),
      sql`, `
    );
    const queryIdsJson = JSON.stringify(meta.queryIds);
    const collectedAt = meta.collectedAt ?? meta.handCollectedAt;
    // topicQuery/topics/queryIds/{domain}CollectedAt 만 덮어쓰고(|| jsonb) aiSummaryKo 등 기존 키는 보존한다.
    // topicQuery 는 다른 도메인이 먼저 기록한 값이 있으면 유지하고(topics 에 합집합으로 들어간다), 없을 때만 이 도메인으로 채운다.
    // queryIds 는 도메인 접두어 없이 합집합 — 같은 논문이 두 도메인에 걸리면 q1~q4 가 어느 도메인의 것인지는
    // topics 로만 구분한다(기존 hand 저장 형식 유지).
    await db.execute(sql`
      UPDATE articles
      SET extracted_metadata = COALESCE(extracted_metadata, '{}'::jsonb) || jsonb_build_object(
        'topicQuery', COALESCE(extracted_metadata->>'topicQuery', ${domain}::text),
        'topics', (
          SELECT COALESCE(jsonb_agg(DISTINCT t), '[]'::jsonb)
          FROM jsonb_array_elements_text(
            CASE WHEN jsonb_typeof(extracted_metadata->'topics') = 'array'
                 THEN extracted_metadata->'topics' ELSE '[]'::jsonb END
            || jsonb_build_array(${domain}::text)
          ) AS t
        ),
        'queryIds', (
          SELECT COALESCE(jsonb_agg(DISTINCT q), '[]'::jsonb)
          FROM jsonb_array_elements_text(
            CASE WHEN jsonb_typeof(extracted_metadata->'queryIds') = 'array'
                 THEN extracted_metadata->'queryIds' ELSE '[]'::jsonb END
            || ${queryIdsJson}::jsonb
          ) AS q
        ),
        ${collectedAtKey(domain)}::text, ${collectedAt}::text
      )
      WHERE id IN (${idList})
    `);
  }
}

// ------------------------------------------------------------------
// 행 빌더 (순수)
// ------------------------------------------------------------------

/** 도메인별 저장 행 — hand 는 종전 buildHandArticleRow 와 키·값·순서가 동일 */
export function buildDomainArticleRow(
  domain: ArxivTopicDomain,
  entry: ArxivAtomEntry,
  queryIds: string[],
  nowIso: string
): HandArticleRow {
  const published = entry.published ? new Date(entry.published) : null;
  return {
    title: entry.title.substring(0, 500),
    source: 'arxiv',
    url: entry.id,
    publishedAt: published && !Number.isNaN(published.getTime()) ? published : null,
    summary: entry.summary.substring(0, ARXIV_SUMMARY_MAX),
    contentHash: contentHashForArxivId(entry.id),
    category: 'technology',
    language: 'en',
    productType: null,
    extractedMetadata: {
      domain: 'paper',
      topicQuery: domain,
      topics: [domain],
      arxivId: entry.arxivId,
      arxivVersion: entry.arxivVersion,
      primaryCategory: entry.primaryCategory,
      categories: entry.categories,
      authors: entry.authors.slice(0, 5),
      queryIds,
      [collectedAtKey(domain)]: nowIso,
      collector: collectorName(domain),
    },
  };
}

export function buildHandArticleRow(entry: ArxivAtomEntry, queryIds: string[], nowIso: string): HandArticleRow {
  return buildDomainArticleRow('hand', entry, queryIds, nowIso);
}

// ------------------------------------------------------------------
// 수집기
// ------------------------------------------------------------------

export interface ArxivHandDeps {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  store?: HandArticleStore;
  /** 수집 도메인 (기본 hand — 종전 ArxivHandCollector 동작) */
  domain?: ArxivTopicDomain;
}

export type ArxivTopicDeps = ArxivHandDeps;

interface Stats {
  queries: number;
  fetched: number;
  relevant: number;
  inserted: number;
  skipped: number;
  wouldInsert: number;
  merged: number;
  truncatedWindows: number;
}

interface SeenInfo {
  relevant: boolean;
  queryIds: Set<string>;
  rowIds: string[];
}

interface RunCtx {
  label: 'daily' | 'backfill';
  dryRun: boolean;
  stats: Stats;
  errors: string[];
  seen: Map<string, SeenInfo>;
  currentWindow: string | null;
}

interface PageStat {
  fetched: number;
  relevant: number;
  inserted: number;
  skipped: number;
}

export interface RunResult extends Stats {
  ran: true;
  errors: string[];
  elapsedMs: number;
  dryRun: boolean;
}

export interface DailySkipped {
  ran: false;
  reason: 'backfill running' | 'daily running';
}

export interface BackfillStatus {
  running: boolean;
  mode: 'daily' | 'backfill' | null;
  startedAt: string | null;
  finishedAt: string | null;
  dryRun: boolean | null;
  months: number | null;
  currentWindow: string | null;
  requests: number;
  fetched: number;
  relevant: number;
  inserted: number;
  skipped: number;
  wouldInsert: number;
  merged: number;
  truncatedWindows: number;
  errors: string[];
}

export type StartBackfillResult =
  | {
      started: true;
      months: number;
      dryRun: boolean;
      windows: number;
      queries: number;
      estimatedRequests: number;
      estimatedMinutes: number;
    }
  | { started: false; startedAt: string | null; progress: BackfillStatus };

export class ArxivHandBusyError extends Error {
  constructor() {
    super('backfill already running');
    this.name = 'ArxivHandBusyError';
  }
}

export const ArxivTopicBusyError = ArxivHandBusyError;

function emptyStats(): Stats {
  return {
    queries: 0,
    fetched: 0,
    relevant: 0,
    inserted: 0,
    skipped: 0,
    wouldInsert: 0,
    merged: 0,
    truncatedWindows: 0,
  };
}

function newCtx(label: 'daily' | 'backfill', dryRun: boolean): RunCtx {
  return { label, dryRun, stats: emptyStats(), errors: [], seen: new Map(), currentWindow: null };
}

/** Retry-After(초 또는 HTTP-date) → ms, 상한 60초. 해석 불가면 null */
export function parseRetryAfterMs(header: string | null | undefined, nowMs: number): number | null {
  if (!header) return null;
  const t = header.trim();
  let ms: number;
  if (/^\d+(\.\d+)?$/.test(t)) {
    ms = parseFloat(t) * 1000;
  } else {
    const at = Date.parse(t);
    if (Number.isNaN(at)) return null;
    ms = at - nowMs;
  }
  return Math.min(RETRY_AFTER_CAP_MS, Math.max(0, ms));
}

export class ArxivTopicCollector {
  readonly domain: ArxivTopicDomain;
  /** 이 도메인의 쿼리 목록 (hand: Q1~Q4 불변) */
  readonly queries: readonly HandQuery[];
  /** 콘솔 로그 태그 (hand: ArxivHand) */
  private readonly tag: string;
  private readonly fetchFn: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;
  private storeInstance: HandArticleStore | null;

  private runningMode: 'daily' | 'backfill' | null = null;
  private lastRun: {
    ctx: RunCtx;
    startedAt: string;
    finishedAt: string | null;
    months: number;
  } | null = null;

  constructor(deps: ArxivHandDeps = {}) {
    this.domain = deps.domain ?? 'hand';
    this.queries = ARXIV_DOMAIN_QUERIES[this.domain];
    this.tag = logTag(this.domain);
    this.fetchFn = deps.fetch ?? ((input, init) => globalThis.fetch(input, init));
    this.sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.now = deps.now ?? Date.now;
    this.storeInstance = deps.store ?? null;
  }

  private get store(): HandArticleStore {
    if (!this.storeInstance) this.storeInstance = new DrizzleHandArticleStore(this.domain);
    return this.storeInstance;
  }

  isRunning(): boolean {
    return this.runningMode !== null;
  }

  private mergeMetaFor(queryId: string, nowIso: string): DomainMergeMeta {
    return { domain: this.domain, queryIds: [queryId], collectedAt: nowIso, handCollectedAt: nowIso };
  }

  // ----------------------------------------------------------------
  // 요청 (직렬 + 3초 간격 + 백오프)
  // ----------------------------------------------------------------

  private pushError(ctx: RunCtx, msg: string): void {
    console.warn(`[${this.tag}] ${msg}`);
    if (ctx.errors.length < MAX_ERRORS_KEPT) ctx.errors.push(msg);
  }

  /**
   * 한 번의 논리 요청. 네트워크 오류/429/5xx/에러 entry 는 최대 MAX_RETRIES 회 재시도(6s, 12s),
   * 그 외 4xx 는 재시도하지 않는다. 최종 실패는 예외 없이 errors 에 기록하고 null 을 반환한다.
   */
  /** 한 번의 HTTP 왕복 — 공유 단일 연결 게이트 안에서 슬롯 대기 → fetch → 본문 읽기 → 완료 기록 */
  private fetchOnce(url: string): Promise<{ status: number; ok: boolean; retryAfter: string | null; text: string }> {
    return withArxivConnection(async () => {
      await waitArxivTurn({ now: this.now, sleep: this.sleep });
      try {
        const res = await this.fetchFn(url, {
          headers: { 'User-Agent': 'RCIPBot/1.0' },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        const text = res.ok ? await res.text() : '';
        return { status: res.status, ok: res.ok, retryAfter: res.headers.get('retry-after'), text };
      } finally {
        markArxivRequestDone(this.now);
      }
    });
  }

  private async requestFeed(ctx: RunCtx, url: string, label: string): Promise<ParsedArxivFeed | null> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      let reason: string;
      let retryAfterMs: number | null = null;
      try {
        const res = await this.fetchOnce(url);
        if (!res.ok) {
          reason = `HTTP ${res.status}`;
          if (!(res.status === 429 || res.status >= 500)) {
            this.pushError(ctx, `${label}: ${reason} (not retried)`);
            return null;
          }
          retryAfterMs = parseRetryAfterMs(res.retryAfter, this.now());
        } else {
          const feed = parseArxivAtom(res.text);
          if (!feed.hasError) {
            ctx.stats.queries++;
            return feed;
          }
          reason = `arXiv error entry: ${feed.errorMessage ?? 'unknown'}`;
        }
      } catch (err) {
        reason = `network error: ${(err as Error).message}`;
      }

      if (attempt === MAX_RETRIES) {
        this.pushError(ctx, `${label}: failed after ${MAX_RETRIES + 1} attempts (${reason})`);
        return null;
      }
      const delayMs = retryAfterMs ?? BACKOFF_BASE_MS * 2 ** (attempt + 1);
      console.log(`[${this.tag}] retry ${attempt + 1}/${MAX_RETRIES} in ${delayMs}ms (${reason}) ${label}`);
      await this.sleep(delayMs);
    }
    return null;
  }

  // ----------------------------------------------------------------
  // 엔트리 처리 (필터 → 중복 판정 → INSERT/병합)
  // ----------------------------------------------------------------

  private async processEntries(ctx: RunCtx, queryId: HandQueryId, entries: ArxivAtomEntry[]): Promise<PageStat> {
    const page: PageStat = { fetched: 0, relevant: 0, inserted: 0, skipped: 0 };
    const nowIso = new Date(this.now()).toISOString();

    // 1) 실행 내 중복 제거 — 이미 본 논문은 새 queryId 만 병합
    const fresh = new Map<string, ArxivAtomEntry>();
    for (const e of entries) {
      const seen = ctx.seen.get(e.arxivId);
      if (seen) {
        if (seen.relevant && !seen.queryIds.has(queryId)) {
          seen.queryIds.add(queryId);
          if (!ctx.dryRun && seen.rowIds.length > 0) {
            try {
              await this.store.mergeMeta(seen.rowIds, this.mergeMetaFor(queryId, nowIso));
              ctx.stats.merged++;
            } catch (err) {
              this.pushError(ctx, `merge ${e.arxivId}: ${(err as Error).message}`);
            }
          }
        }
        continue;
      }
      if (!fresh.has(e.arxivId)) fresh.set(e.arxivId, e);
    }

    // 2) 정밀 필터 + 페이지당 1회 DB 조회(base ID)
    const relevantEntries = [...fresh.values()].filter((e) =>
      isRelevantDomainPaper(this.domain, { title: e.title, abstract: e.summary, categories: e.categories })
    );
    const existing = await this.store.findExistingByBaseIds(relevantEntries.map((e) => e.arxivId));

    const relevantIds = new Set(relevantEntries.map((e) => e.arxivId));
    for (const [base] of fresh) {
      ctx.seen.set(base, { relevant: relevantIds.has(base), queryIds: new Set([queryId]), rowIds: [] });
      ctx.stats.fetched++;
      page.fetched++;
    }

    // 3) 저장/병합
    for (const e of relevantEntries) {
      const info = ctx.seen.get(e.arxivId)!;
      const rowIds = existing.get(e.arxivId);

      if (rowIds && rowIds.length > 0) {
        info.rowIds = rowIds;
        ctx.stats.relevant++;
        ctx.stats.skipped++;
        page.relevant++;
        page.skipped++;
        if (!ctx.dryRun) {
          try {
            await this.store.mergeMeta(rowIds, this.mergeMetaFor(queryId, nowIso));
            ctx.stats.merged++;
          } catch (err) {
            this.pushError(ctx, `merge ${e.arxivId}: ${(err as Error).message}`);
          }
        }
        continue;
      }

      if (ctx.dryRun) {
        ctx.stats.relevant++;
        ctx.stats.wouldInsert++;
        page.relevant++;
        continue;
      }

      let newId: string | null;
      try {
        newId = await this.store.insert(buildDomainArticleRow(this.domain, e, [queryId], nowIso));
      } catch (err) {
        // 저장 실패 건은 relevant 에 포함하지 않는다(inserted + skipped = relevant 불변식 유지)
        this.pushError(ctx, `insert ${e.arxivId}: ${(err as Error).message}`);
        continue;
      }
      ctx.stats.relevant++;
      page.relevant++;
      if (newId) {
        info.rowIds = [newId];
        ctx.stats.inserted++;
        page.inserted++;
      } else {
        ctx.stats.skipped++; // contentHash 충돌(안전망)
        page.skipped++;
      }
    }
    return page;
  }

  // ----------------------------------------------------------------
  // 일일 증분
  // ----------------------------------------------------------------

  /** Q1~Q4 를 순차로 각 1요청(최신 100건, 날짜 필터 없음). 예외를 던지지 않는다. */
  async collectDaily(): Promise<RunResult | DailySkipped> {
    if (this.runningMode) {
      const reason = this.runningMode === 'backfill' ? 'backfill running' : 'daily running';
      console.log(`[${this.tag}] daily skipped: ${reason}`);
      return { ran: false, reason };
    }
    this.runningMode = 'daily';
    const startedAtMs = this.now();
    const ctx = newCtx('daily', false);
    try {
      for (const q of this.queries) {
        try {
          const url = buildArxivUrl({ query: q.query, start: 0, maxResults: ARXIV_PAGE_SIZE, sortOrder: 'descending' });
          const feed = await this.requestFeed(ctx, url, `daily ${q.id}`);
          if (!feed) continue;
          const page = await this.processEntries(ctx, q.id, feed.entries);
          console.log(
            `[${this.tag}] daily ${q.id}: fetched ${page.fetched}, relevant ${page.relevant}, inserted ${page.inserted}, skipped ${page.skipped}`
          );
        } catch (err) {
          this.pushError(ctx, `daily ${q.id}: ${(err as Error).message}`);
        }
      }
    } finally {
      this.runningMode = null;
    }
    return this.finish(ctx, startedAtMs);
  }

  private finish(ctx: RunCtx, startedAtMs: number): RunResult {
    const s = ctx.stats;
    const elapsedMs = this.now() - startedAtMs;
    console.log(
      `[${this.tag}] ${ctx.label}: queries ${s.queries}, fetched ${s.fetched}, relevant ${s.relevant}, inserted ${s.inserted}, skipped ${s.skipped}`
    );
    console.log(
      `[${this.tag}] ${ctx.label}: merged ${s.merged} existing rows, errors ${ctx.errors.length}, truncatedWindows ${s.truncatedWindows}, elapsed ${Math.round(elapsedMs / 1000)}s`
    );
    if (ctx.dryRun) {
      console.log(`[${this.tag}] ${ctx.label} (dryRun): would-insert ${s.wouldInsert}, skipped(existing) ${s.skipped}`);
    }
    return { ran: true, ...s, errors: [...ctx.errors], elapsedMs, dryRun: ctx.dryRun };
  }

  // ----------------------------------------------------------------
  // 백필
  // ----------------------------------------------------------------

  private plan(months: number): { windows: ArxivWindow[]; estimatedRequests: number; estimatedMinutes: number } {
    const windows = buildMonthWindows(months, new Date(this.now()));
    return { windows, ...estimateDomainBackfill(windows.length, this.queries.length) };
  }

  /**
   * 백필을 백그라운드로 시작한다(엔드포인트용). 이미 실행 중이면 started:false.
   * 완료까지 기다리려면 backfill() 을 쓴다.
   */
  startBackfill(opts: { months: number; dryRun: boolean }): StartBackfillResult {
    if (this.runningMode) {
      return { started: false, startedAt: this.lastRun?.startedAt ?? null, progress: this.getStatus() };
    }
    const { windows, estimatedRequests, estimatedMinutes } = this.plan(opts.months);
    const run = this.beginBackfill(opts.months, opts.dryRun);
    void this.executeBackfill(run, windows, opts.months)
      .catch((err) => console.error(`[${this.tag}] backfill crashed:`, err))
      .finally(() => {
        this.runningMode = null;
      });
    return {
      started: true,
      months: opts.months,
      dryRun: opts.dryRun,
      windows: windows.length,
      queries: this.queries.length,
      estimatedRequests,
      estimatedMinutes,
    };
  }

  /** 백필을 끝까지 실행한다. 이미 실행 중이면 ArxivHandBusyError. */
  async backfill(opts: { months: number; dryRun: boolean }): Promise<RunResult> {
    if (this.runningMode) throw new ArxivHandBusyError();
    const { windows } = this.plan(opts.months);
    const run = this.beginBackfill(opts.months, opts.dryRun);
    try {
      return await this.executeBackfill(run, windows, opts.months);
    } finally {
      this.runningMode = null;
    }
  }

  private beginBackfill(months: number, dryRun: boolean): RunCtx {
    this.runningMode = 'backfill'; // 동기적으로 잠금 획득
    const ctx = newCtx('backfill', dryRun);
    this.lastRun = { ctx, startedAt: new Date(this.now()).toISOString(), finishedAt: null, months };
    return ctx;
  }

  private async executeBackfill(ctx: RunCtx, windows: ArxivWindow[], months: number): Promise<RunResult> {
    const startedAtMs = this.now();
    console.log(
      `[${this.tag}] backfill starting: months ${months}, windows ${windows.length}, dryRun ${ctx.dryRun}`
    );
    try {
      // 최신 월 → 과거 월 (중단돼도 최신 데이터가 먼저 확보)
      for (const win of [...windows].reverse()) {
        for (const q of this.queries) {
          try {
            await this.runWindowQuery(ctx, win, q);
          } catch (err) {
            this.pushError(ctx, `backfill ${win.label} ${q.id}: ${(err as Error).message}`);
          }
        }
      }
    } finally {
      ctx.currentWindow = null;
      if (this.lastRun && this.lastRun.ctx === ctx) this.lastRun.finishedAt = new Date(this.now()).toISOString();
    }
    return this.finish(ctx, startedAtMs);
  }

  /** 한 (윈도우, 쿼리) 를 ascending 으로 페이지 순회. totalResults > 1000 이면 이분. */
  private async runWindowQuery(ctx: RunCtx, win: ArxivWindow, q: HandQuery): Promise<void> {
    ctx.currentWindow = `${win.label} ${q.id}`;
    const label = `${q.id} ${win.label}`;
    const urlFor = (start: number) =>
      buildArxivUrl({
        query: q.query,
        start,
        maxResults: ARXIV_PAGE_SIZE,
        sortOrder: 'ascending',
        range: { start: win.start, end: win.end },
      });

    const first = await this.requestFeed(ctx, urlFor(0), label);
    if (!first) return;
    const total = first.totalResults ?? first.entries.length;
    const reachable = Math.min(total, MAX_WINDOW_RESULTS);
    const totalPages = Math.max(1, Math.ceil(reachable / ARXIV_PAGE_SIZE));

    let truncated = false;
    let children: [ArxivWindow, ArxivWindow] | null = null;
    if (total > MAX_WINDOW_RESULTS) {
      console.log(`[${this.tag}] window ${win.label} ${q.id} totalResults ${total} > ${MAX_WINDOW_RESULTS}, bisecting`);
      children = bisectWindow(win);
      if (!children) {
        truncated = true;
        ctx.stats.truncatedWindows++;
        this.pushError(
          ctx,
          `truncated: window ${win.label} ${q.id} totalResults ${total} > ${MAX_WINDOW_RESULTS} at minimum (1 day) window`
        );
      }
    }

    const logPage = (page: number, p: PageStat) =>
      console.log(
        `[${this.tag}] backfill ${win.label} ${q.id} page ${page}/${totalPages}: fetched ${p.fetched}, relevant ${p.relevant}, inserted ${p.inserted}, skipped ${p.skipped}`
      );

    // 첫 페이지는 이분 여부와 무관하게 처리(중복은 실행 내 dedupe 로 흡수)
    logPage(1, await this.processEntries(ctx, q.id, first.entries));

    if (children) {
      for (const child of children) await this.runWindowQuery(ctx, child, q);
      ctx.currentWindow = `${win.label} ${q.id}`;
      return;
    }
    if (first.entries.length === 0) return;

    for (let start = ARXIV_PAGE_SIZE, page = 2; start < reachable; start += ARXIV_PAGE_SIZE, page++) {
      const feed = await this.requestFeed(ctx, urlFor(start), `${label} page ${page}`);
      if (!feed) break;
      if (feed.entries.length === 0) break;
      logPage(page, await this.processEntries(ctx, q.id, feed.entries));
    }
    if (truncated) console.warn(`[${this.tag}] window ${win.label} ${q.id} truncated at ${MAX_WINDOW_RESULTS} results`);
  }

  // ----------------------------------------------------------------
  // 상태 조회
  // ----------------------------------------------------------------

  getStatus(): BackfillStatus {
    const r = this.lastRun;
    const s = r?.ctx.stats ?? emptyStats();
    return {
      running: this.runningMode === 'backfill',
      mode: this.runningMode,
      startedAt: r?.startedAt ?? null,
      finishedAt: r?.finishedAt ?? null,
      dryRun: r ? r.ctx.dryRun : null,
      months: r?.months ?? null,
      currentWindow: r?.ctx.currentWindow ?? null,
      requests: s.queries,
      fetched: s.fetched,
      relevant: s.relevant,
      inserted: s.inserted,
      skipped: s.skipped,
      wouldInsert: s.wouldInsert,
      merged: s.merged,
      truncatedWindows: s.truncatedWindows,
      errors: r ? [...r.ctx.errors] : [],
    };
  }
}

/** 종전 이름 호환 — 기본 도메인 hand 인 ArxivTopicCollector */
export const ArxivHandCollector = ArxivTopicCollector;
export type ArxivHandCollector = ArxivTopicCollector;

export const arxivHandCollector = new ArxivTopicCollector({ domain: 'hand' });
export const arxivActuatorCollector = new ArxivTopicCollector({ domain: 'actuator' });

/** 도메인별 수집기 인스턴스 (잠금은 도메인별로 독립, 레이트리미터는 공유) */
export const arxivTopicCollectors: Readonly<Record<ArxivTopicDomain, ArxivTopicCollector>> = {
  hand: arxivHandCollector,
  actuator: arxivActuatorCollector,
};
