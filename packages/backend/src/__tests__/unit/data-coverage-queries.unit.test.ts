/**
 * data-coverage-queries — 정적 검사(쓰기 SQL 없음, AI SDK 없음, 스캔 3회 이하, 읽기 전용 트랜잭션) + 실행기 동작(모의 Pool)
 * + Gemini 범위 일치(AC-05) + 일일 상한 상수 재사용(AC-06)
 */
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ARTICLES_FULL_SCAN_QUERIES,
  AUTO_COMPANY_SAMPLES_SQL,
  QA1_SQL,
  QA2_SQL,
  QA2_SQL_NO_DEMO_SIGNAL,
  QA6_SQL,
  classifyQueryError,
  createCoverageQueries,
  TooLargeError,
  withReadOnlyTx,
} from '../../services/data-coverage-queries.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const svcDir = path.resolve(here, '../../services');
const read = (f: string) => fs.readFileSync(path.join(svcDir, f), 'utf-8');
const COVERAGE_FILES = ['data-coverage-aggregate.ts', 'data-coverage-queries.ts', 'data-coverage-sections.ts', 'data-coverage-snapshot.ts', 'data-coverage.service.ts', '../routes/data-coverage.ts'];

describe('static checks (AC-16, AC-17)', () => {
  const src = read('data-coverage-queries.ts');

  it('contains no write or DDL keywords', () => {
    expect(src).not.toMatch(/\b(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|GRANT)\b/i);
  });

  it('runs every query inside BEGIN READ ONLY + SET LOCAL statement_timeout', () => {
    expect(src).toContain('BEGIN READ ONLY');
    expect(src).toContain('SET LOCAL statement_timeout');
    expect(src.match(/pool\.query\(/g)).toBeNull();
    expect(src.match(/pool\.connect\(\)/g)).toHaveLength(1);
  });

  it('no coverage file imports an AI SDK, logs usage, calls getClaudeCreditInfo / runFullAudit, or touches ops-status', () => {
    for (const f of COVERAGE_FILES) {
      const s = read(f);
      expect(s, f).not.toMatch(/@anthropic-ai\/sdk|@google\/genai|from 'openai'/);
      expect(s, f).not.toMatch(/logUsage|aiUsageService|getClaudeCreditInfo|runFullAudit|ops-status|getOpsStatus/);
      expect(s, f).not.toMatch(/\.messages\.create|generateContent/);
    }
  });

  it('only the data_migrations snapshot write exists: no raw db.insert/update/delete outside the snapshot store', () => {
    for (const f of COVERAGE_FILES) {
      const s = read(f);
      expect(s, f).not.toMatch(/db\.(insert|update|delete)|CREATE TABLE/i);
    }
    expect(read('data-coverage-snapshot.ts')).toMatch(/store\.upsert/);
  });

  it('uses no model identifiers or secrets', () => {
    for (const f of COVERAGE_FILES) expect(read(f), f).not.toMatch(/claude-(haiku|sonnet|opus)|gemini-[0-9a-z.-]*flash|sk-[A-Za-z0-9]{10}|AIza[A-Za-z0-9_-]{10}/);
  });
});

describe('articles scans (AC-10)', () => {
  it('there are exactly three full-scan queries and every other SQL mentioning articles is an index lookup', () => {
    expect(ARTICLES_FULL_SCAN_QUERIES).toHaveLength(3);
    expect(ARTICLES_FULL_SCAN_QUERIES).toEqual([QA1_SQL, QA2_SQL, QA6_SQL]);
    expect(AUTO_COMPANY_SAMPLES_SQL).toContain('a.company_id = c.id');
    const src = read('data-coverage-queries.ts');
    const mentions = src.match(/FROM articles/g) ?? [];
    // QA1, QA2 (builder), QA6, and the auto-company sample subquery
    expect(mentions).toHaveLength(4);
  });
  it('the three scans each reference articles exactly once', () => {
    for (const q of ARTICLES_FULL_SCAN_QUERIES) expect(q.match(/FROM articles/g)).toHaveLength(1);
  });
});

describe('Gemini scope matches getPending (AC-05)', () => {
  const vca = read('video-content-analysis.service.ts');
  const getPending = vca.slice(vca.indexOf('private async getPending'), vca.indexOf('isConfigured()'));

  it('getPending and the coverage SQL use the same predicates', () => {
    expect(getPending).toContain("product_type = 'video'");
    expect(QA2_SQL).toContain("a.product_type = 'video'");
    expect(getPending).toContain("(extracted_metadata->>'geminiAnalyzedAt') IS NULL");
    expect(QA2_SQL).toContain("extracted_metadata->>'geminiAnalyzedAt' IS NULL");
    expect(getPending).toContain("COALESCE((extracted_metadata->>'geminiAnalysisAttempts')::int, 0) < ${MAX_ATTEMPTS}");
    expect(QA2_SQL).toContain("COALESCE((a.extracted_metadata->>'geminiAnalysisAttempts')::int, 0) < $2::int");
    expect(getPending).toContain('published_at >= now() - make_interval(days => ${SINCE_DAYS})');
    expect(QA2_SQL).toContain('a.published_at >= now() - make_interval(days => $1::int)');
    expect(getPending).toContain("REQUIRE_DEMO_SIGNAL ? sql`(extracted_metadata->'aiTags') IS NOT NULL` : sql`TRUE`");
    expect(QA2_SQL).toContain("(a.extracted_metadata->'aiTags' IS NOT NULL) AND");
    expect(QA2_SQL_NO_DEMO_SIGNAL).toContain('(TRUE) AND');
  });

  it('the scope values come from the service getter, never copied', () => {
    const svc = read('data-coverage.service.ts');
    expect(svc).toContain('getGeminiScopeConfig');
    for (const f of COVERAGE_FILES) {
      expect(read(f), f).not.toMatch(/GEMINI_VIDEO_(DOMAIN_FILTER|SINCE_DAYS|REQUIRE_DEMO_SIGNAL|MAX_ATTEMPTS)/);
    }
  });

  it('getGeminiScopeConfig mirrors the module constants and reacts to env', async () => {
    vi.resetModules();
    process.env.GEMINI_VIDEO_DOMAIN_FILTER = 'robot, hand';
    process.env.GEMINI_VIDEO_SINCE_DAYS = '90';
    process.env.GEMINI_VIDEO_REQUIRE_DEMO_SIGNAL = 'false';
    process.env.GEMINI_VIDEO_MAX_ATTEMPTS = '3';
    process.env.GEMINI_VIDEO_CONTENT_ANALYSIS_BATCH_LIMIT = '7';
    const mod = await import('../../services/video-content-analysis.service.js');
    expect(mod.getGeminiScopeConfig()).toEqual({ domainFilter: ['robot', 'hand'], sinceDays: 90, requireDemoSignal: false, maxAttempts: 3, batchLimit: 7 });
    expect(mod.MAX_ATTEMPTS).toBe(3);
    for (const k of ['GEMINI_VIDEO_DOMAIN_FILTER', 'GEMINI_VIDEO_SINCE_DAYS', 'GEMINI_VIDEO_REQUIRE_DEMO_SIGNAL', 'GEMINI_VIDEO_MAX_ATTEMPTS', 'GEMINI_VIDEO_CONTENT_ANALYSIS_BATCH_LIMIT']) delete process.env[k];
    vi.resetModules();
  });
});

describe('daily limits are shared constants (AC-06)', () => {
  it('video tagging and paper summary run() default to the exported constant; no literal 300 left in the signature', async () => {
    const { VIDEO_TAGGING_DAILY_LIMIT } = await import('../../services/video-tagging.service.js');
    const { PAPER_SUMMARY_DAILY_LIMIT } = await import('../../services/paper-summary.service.js');
    expect(VIDEO_TAGGING_DAILY_LIMIT).toBe(300);
    expect(PAPER_SUMMARY_DAILY_LIMIT).toBe(300);
    expect(read('video-tagging.service.ts')).toContain('async run(limit = VIDEO_TAGGING_DAILY_LIMIT)');
    expect(read('paper-summary.service.ts')).toContain('async run(limit = PAPER_SUMMARY_DAILY_LIMIT)');
    const svc = read('data-coverage.service.ts');
    expect(svc).toContain('VIDEO_TAGGING_DAILY_LIMIT');
    expect(svc).toContain('PAPER_SUMMARY_DAILY_LIMIT');
    expect(read('data-coverage-sections.ts')).not.toMatch(/\b300\b/);
  });
});

describe('executor behaviour with a fake pool', () => {
  function fakePool(handler: (sql: string, params?: unknown[]) => { rows: unknown[] } | Promise<{ rows: unknown[] }>) {
    const log: string[] = [];
    const client = {
      query: vi.fn(async (sql: string, params?: unknown[]) => {
        log.push(sql.trim().split('\n')[0]!.slice(0, 60));
        if (/^(BEGIN|SET LOCAL|ROLLBACK)/.test(sql)) return { rows: [] };
        return handler(sql, params);
      }),
      release: vi.fn(),
    };
    return { pool: { connect: vi.fn(async () => client) } as never, client, log };
  }

  it('wraps the work in BEGIN READ ONLY / SET LOCAL / ROLLBACK and always releases the client', async () => {
    const { pool, client, log } = fakePool(() => ({ rows: [{ total: 3 }] }));
    const out = await withReadOnlyTx(pool, 1234, async (c) => (await c.query('SELECT 1')).rows);
    expect(out).toEqual([{ total: 3 }]);
    expect(log[0]).toBe('BEGIN READ ONLY');
    expect(log[1]).toBe('SET LOCAL statement_timeout = 1234');
    expect(log.at(-1)).toBe('ROLLBACK');
    expect(client.release).toHaveBeenCalledTimes(1);
    await expect(withReadOnlyTx(pool, 10, async () => { throw new Error('x'); })).rejects.toThrow('x');
    expect(client.release).toHaveBeenCalledTimes(2);
  });

  it('qa6 pages with keyset and stops with TooLargeError over the cap', async () => {
    let page = 0;
    const mk = (n: number, start: number) => Array.from({ length: n }, (_, i) => ({ id: `id-${start + i}`, source: 's', url: `https://e.com/${start + i}`, arxiv_id: null, video_id: null }));
    const { pool } = fakePool((_sql, params) => {
      page++;
      return { rows: page === 1 ? mk(5000, 0) : mk(10, 5000) };
    });
    const q = createCoverageQueries(pool);
    const res = await q.qa6({ timeoutMs: 1000 }, 200_000);
    expect(res.rowsScanned).toBe(5010);
    page = 0;
    await expect(q.qa6({ timeoutMs: 1000 }, 100)).rejects.toBeInstanceOf(TooLargeError);
  });

  it('qa1 maps rows to numbers and ISO dates', async () => {
    const { pool } = fakePool(() => ({ rows: [{ source: 'arxiv', product_type: 'none', language: 'en', channel: null, third_party: null, total: '3', c7: 1, c30: 2, c90: 3, last_collected_at: new Date('2026-11-01T00:00:00Z'), company_null: 3, published_null: 0, entity_title: 0, ko_title: 0, cjk_title: 0, arxiv_summary: 1, arxiv_summary30: 1, news_total: 0, news_key_points: 0, news30_total: 0, news30_key_points: 0, focus_hand_judged: 1, focus_hand_primary: 1, focus_hand_secondary: 0, focus_hand_none: 0, focus_actuator_judged: 0, focus_actuator_primary: 0, focus_actuator_secondary: 0, focus_actuator_none: 0, hand_topics: 1, actuator_topics: 0 }] }));
    const rows = await createCoverageQueries(pool).qa1({ timeoutMs: 1000 });
    expect(rows[0]).toMatchObject({ source: 'arxiv', total: 3, lastCollectedAt: '2026-11-01T00:00:00.000Z', focusHand: { judged: 1, primary: 1 }, handTopics: 1 });
  });

  it('classifyQueryError', () => {
    expect(classifyQueryError(Object.assign(new Error('x'), { code: '57014' }))).toBe('timeout');
    expect(classifyQueryError(new Error('canceling statement due to statement timeout'))).toBe('timeout');
    expect(classifyQueryError(new TooLargeError())).toBe('too_large');
    expect(classifyQueryError(new Error('relation does not exist'))).toBe('query_failed');
  });
});
