/**
 * weekly-brief-collect — 쿼리 파라미터(KST 경계), 핵심/선택 수집기 실패 처리, 상한 초과 (가짜 쿼리 실행기)
 * 실제 SQL 의 결과는 통합 테스트(weekly-brief.integration.test.ts)가 임시 PostgreSQL 에서 확인한다.
 */
import { describe, it, expect, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';

vi.mock('../../db/index.js', () => ({ db: { execute: vi.fn() } }));

import { ROW_LIMIT, collectWeek, type CollectDeps } from '../../services/weekly-brief-collect.js';
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
function fakeDeps(opts: { rows?: number; fail?: (text: string) => boolean } = {}) {
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
});
