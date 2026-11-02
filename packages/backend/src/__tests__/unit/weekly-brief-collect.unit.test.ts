/**
 * weekly-brief-collect — 쿼리 파라미터(KST 경계), 핵심/선택 수집기 실패 처리, 상한 초과 (가짜 쿼리 실행기)
 * 실제 SQL 의 결과는 통합 테스트(weekly-brief.integration.test.ts)가 임시 PostgreSQL 에서 확인한다.
 */
import { describe, it, expect, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';

vi.mock('../../db/index.js', () => ({ db: { execute: vi.fn() } }));

import { ROW_LIMIT, VOLUME_WEEKS, collectWeek, fetchVolumeWeeks, type CollectDeps } from '../../services/weekly-brief-collect.js';
import { composePayload } from '../../services/weekly-brief-compose.js';
import { getWeekRange } from '../../services/weekly-brief-period.js';

const dialect = new PgDialect();
const range = getWeekRange('2026-10-19');
const prevRange = getWeekRange('2026-10-12');

function render(q: SQL) {
  const { sql: text, params } = dialect.sqlToQuery(q);
  return { text, params };
}

function articleRow(i: number) {
  return {
    id: `id-${i}`, title: `T&amp;${i}`, url: 'https://example.com/x', summary: null, source: 'src', product_type: 'none', company_id: null,
    published_at: '2026-10-20T00:00:00.000Z', collected_at: '2026-10-20T00:00:00.000Z', ts: '2026-10-20T00:00:00.000Z', meta: null,
  };
}

/** 쿼리 텍스트로 종류를 구분하는 가짜 실행기 */
function fakeDeps(opts: { rows?: number; fail?: (text: string) => boolean; volumeRows?: Record<string, unknown>[]; directory?: Record<string, unknown>[] } = {}) {
  const seen: { text: string; params: unknown[] }[] = [];
  const deps: CollectDeps = {
    log: () => {},
    query: async (q) => {
      const r = render(q);
      seen.push(r);
      if (opts.fail?.(r.text)) throw new Error('simulated failure');
      if (r.text.includes('FROM articles a') && r.text.includes('LIMIT') && r.text.includes('jsonb_strip_nulls')) {
        return { rows: Array.from({ length: opts.rows ?? 3 }, (_, i) => articleRow(i)) };
      }
      if (r.text.includes('date_trunc(')) return { rows: opts.volumeRows ?? [] };
      if (r.text.includes('FROM companies c') && !r.text.includes('JOIN companies')) return { rows: opts.directory ?? [] };
      if (r.text.includes('count(*)::int AS n')) return { rows: [{ n: 4 }] };
      return { rows: [] };
    },
  };
  return { deps, seen };
}

describe('collectWeek', () => {
  it('uses the half-open KST window as UTC ISO bounds for both weeks (no local-time Date serialization)', async () => {
    const { deps, seen } = fakeDeps();
    await collectWeek(range, prevRange, deps);
    const rowQueries = seen.filter((s) => s.text.includes('jsonb_strip_nulls'));
    expect(rowQueries).toHaveLength(2);
    const bounds = rowQueries.map((s) => s.params.filter((p) => typeof p === 'string' && String(p).endsWith('Z')));
    expect(bounds).toContainEqual(['2026-10-18T15:00:00.000Z', '2026-10-25T15:00:00.000Z']);
    expect(bounds).toContainEqual(['2026-10-11T15:00:00.000Z', '2026-10-18T15:00:00.000Z']);
    for (const s of rowQueries) {
      expect(s.text).toContain('>=');
      expect(s.text).not.toMatch(/<=\s*\$/); // 상한은 배타적
      expect(s.text).toContain("AT TIME ZONE 'UTC'");
      expect(s.text).toContain('COALESCE(a.published_at, a.collected_at)');
      expect(s.text).toContain('LIMIT');
    }
    // 어떤 파라미터도 Date 객체가 아니다
    expect(seen.every((s) => s.params.every((p) => !(p instanceof Date)))).toBe(true);
  });

  it('applies the slim metadata projection (no whole extracted_metadata, summary/description are cut)', async () => {
    const { deps, seen } = fakeDeps();
    await collectWeek(range, prevRange, deps);
    const t = seen.find((s) => s.text.includes('jsonb_strip_nulls'))!.text;
    expect(t).toContain('left(a.summary, 300)');
    expect(t).toContain("left(x.m->>'description', 400)");
    expect(t).toContain("'geminiAnalyzedAt'");
    expect(t).not.toMatch(/a\.extracted_metadata\s+AS\s+meta/i);
    expect(t).not.toContain('a.content');
  });

  it('projects only a capped authors list and the arxivId for papers (no whole metadata)', async () => {
    const { deps, seen } = fakeDeps();
    await collectWeek(range, prevRange, deps);
    const t = seen.find((s) => s.text.includes('jsonb_strip_nulls'))!.text;
    expect(t).toContain("'authors'");
    expect(t).toContain('LIMIT 20');
    expect(t).toContain("left(x.m->>'authors', 120)");
    expect(t).toContain("'arxivId'");
  });

  it('decodes HTML entities in titles and fills an empty metadata object', async () => {
    const { deps } = fakeDeps({ rows: 2 });
    const w = await collectWeek(range, prevRange, deps);
    expect(w.rows[0]!.title).toBe('T&0');
    expect(w.rows[0]!.extractedMetadata).toEqual({});
    expect(w.truncated).toBe(false);
    expect(w.warnings).toEqual([]);
  });

  it('flags truncation when more than the row limit comes back', async () => {
    const { deps } = fakeDeps({ rows: ROW_LIMIT + 1 });
    const w = await collectWeek(range, prevRange, deps);
    expect(w.rows).toHaveLength(ROW_LIMIT);
    expect(w.truncated).toBe(true);
    expect(w.warnings).toContain('rows_truncated');
    expect(composePayload(w, null, new Date('2026-10-25T23:00:00Z')).payload.meta).toMatchObject({ truncated: true });
  });

  it('a failing core row query rejects (the service turns it into failed)', async () => {
    const { deps } = fakeDeps({ fail: (t) => t.includes('jsonb_strip_nulls') });
    await expect(collectWeek(range, prevRange, deps)).rejects.toThrow('simulated failure');
  });

  it('optional collectors fall back to defaults with *_failed warnings, and the composed result is partial', async () => {
    const { deps } = fakeDeps({ fail: (t) => t.includes('ci_value_history') || t.includes('article_keywords') || t.includes('competitive_alerts') });
    const w = await collectWeek(range, prevRange, deps);
    expect(w.ciChanges).toEqual([]);
    expect(w.keywords).toEqual([]);
    expect(w.alerts).toBe(0);
    expect([...w.warnings].sort()).toEqual(['alerts_failed', 'alerts_prev_failed', 'ci_failed', 'ci_prev_failed', 'keywords_failed']);
    expect(w.rows).toHaveLength(3); // 핵심 데이터는 그대로
    const r = composePayload(w, null, new Date('2026-10-25T23:00:00Z'));
    expect(r.status).toBe('partial');
    expect(r.payload.meta.warnings).toEqual(expect.arrayContaining(['ci_failed', 'keywords_failed']));
  });

  it('a failing new-robots counter yields newRobots=null (field omitted from counts)', async () => {
    const { deps } = fakeDeps({ fail: (t) => t.includes('humanoid_robots') });
    const w = await collectWeek(range, prevRange, deps);
    expect(w.newRobots).toBeNull();
    expect(w.warnings).toContain('robots_failed');
    expect(composePayload(w, null, new Date('2026-10-25T23:00:00Z')).payload.header.counts).not.toHaveProperty('newRobots');
  });

  it('compares geminiAnalyzedAt as ISO strings (publish date independent)', async () => {
    const { deps, seen } = fakeDeps();
    await collectWeek(range, prevRange, deps);
    const q = seen.filter((s) => s.text.includes("geminiAnalyzedAt'") && s.text.includes('count(*)::int'));
    expect(q).toHaveLength(2);
    expect(q[0]!.text).toContain("a.product_type = 'video'");
    expect(q[0]!.params).toEqual(['2026-10-18T15:00:00.000Z', '2026-10-25T15:00:00.000Z']);
  });

  it('the extended projection also carries the derived summaries (aiSummaryKo, keyPoints, task, capabilities) but never a whole metadata object', async () => {
    const { deps, seen } = fakeDeps();
    await collectWeek(range, prevRange, deps);
    const t = seen.find((s) => s.text.includes('jsonb_strip_nulls'))!.text;
    expect(t).toContain("'aiSummaryKo', left(x.m->>'aiSummaryKo', 200)");
    expect(t).toContain("'keyPoints'");
    expect(t).toContain("left(e.v, 120)");
    expect(t).toContain("'task', left(x.m#>>'{geminiAnalysis,task}', 120)");
    expect(t).toContain("'capabilities'");
    expect(t).not.toMatch(/'(content|originalText|abstract)'/);
    expect(t).not.toContain('a.content');
  });

  it('without the report option no volume / directory query is issued (poster path unchanged)', async () => {
    const { deps, seen } = fakeDeps();
    const w = await collectWeek(range, prevRange, deps);
    expect(seen.some((s) => s.text.includes('date_trunc('))).toBe(false);
    expect(seen.some((s) => s.text.includes('FROM companies c') && !s.text.includes('JOIN companies'))).toBe(false);
    expect(w.volume).toBeUndefined();
    expect(w.companyDirectory).toBeUndefined();
  });

  it('report mode: the 8-week volume query groups by KST Monday, spans [week - 49d, week end) and zero-fills missing weeks', async () => {
    const { deps, seen } = fakeDeps({ volumeRows: [{ week_start: '2026-10-19', videos: '5', papers: '2', articles: '7' }, { week_start: '2026-09-07', videos: 1, papers: 0, articles: 3 }] });
    const w = await collectWeek(range, prevRange, deps, { report: true });
    const q = seen.find((s) => s.text.includes('date_trunc('))!;
    expect(q.text).toContain("AT TIME ZONE 'Asia/Seoul'");
    expect(q.text).toContain("date_trunc('week'");
    expect(q.text).toContain('COALESCE(a.published_at, a.collected_at)');
    // 시작 = 이번 주 − 49일 = 2026-08-31(월) 00:00 KST = 08-30T15:00Z, 끝 = 다음 월요일 00:00 KST (배타적)
    expect(q.params.filter((p) => typeof p === 'string' && String(p).endsWith('Z'))).toEqual(['2026-08-30T15:00:00.000Z', '2026-10-25T15:00:00.000Z']);
    expect(q.params.every((p) => !(p instanceof Date))).toBe(true);
    expect(w.volume).toHaveLength(VOLUME_WEEKS);
    expect(w.volume!.map((v) => v.weekStart)).toEqual(['2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19']);
    expect(w.volume![0]).toEqual({ weekStart: '2026-08-31', videos: 0, articles: 0, papers: 0 });
    expect(w.volume![1]).toEqual({ weekStart: '2026-09-07', videos: 1, articles: 3, papers: 0 });
    expect(w.volume![7]).toEqual({ weekStart: '2026-10-19', videos: 5, articles: 7, papers: 2 });
    expect(w.volume![2]).toEqual({ weekStart: '2026-09-14', videos: 0, articles: 0, papers: 0 });
  });

  it('fetchVolumeWeeks returns the 8 consecutive Mondays ending with the target week', async () => {
    const { deps } = fakeDeps();
    const weeks = await fetchVolumeWeeks(deps, '2026-10-19');
    expect(weeks.map((v) => v.weekStart)).toEqual(['2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19']);
  });

  it('report mode: the company directory is loaded; volume / directory failures degrade to defaults with *_failed warnings', async () => {
    const ok = await collectWeek(range, prevRange, fakeDeps({ directory: [{ company_id: 'c1', name: 'Atlas Robotics' }] }).deps, { report: true });
    expect(ok.companyDirectory).toEqual([{ companyId: 'c1', name: 'Atlas Robotics' }]);
    expect(ok.warnings).toEqual([]);

    const { deps } = fakeDeps({ fail: (t) => t.includes('date_trunc(') || (t.includes('FROM companies c') && !t.includes('JOIN companies')) });
    const bad = await collectWeek(range, prevRange, deps, { report: true });
    expect(bad.volume).toEqual([]);
    expect(bad.companyDirectory).toEqual([]);
    expect([...bad.warnings].sort()).toEqual(['company_directory_failed', 'volume_failed']);
    expect(bad.rows).toHaveLength(3);
  });
});
