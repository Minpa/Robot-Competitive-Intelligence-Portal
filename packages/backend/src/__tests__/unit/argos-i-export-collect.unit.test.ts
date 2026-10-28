/**
 * argos-i-export-collect — 읽기 전용 SELECT, 원문 컬럼 미조회, 시각은 SQL 에서 ISO 문자열, 영역 내부 병렬 ≤ 3, 공유 원자료 1회 조회
 */
import { describe, it, expect, vi } from 'vitest';
import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';

vi.mock('../../db/index.js', () => ({ db: {} }));
vi.mock('../../services/actuator-position-map.service.js', () => ({ actuatorPositionMapService: { getMap: vi.fn() } }));
vi.mock('../../services/data-migration.service.js', () => ({ dataMigrationService: { get: vi.fn() } }));

import { COLLECTABLE_AREA_IDS, articleQuery, createCollector, runLimited, type CollectDeps } from '../../services/argos-i-export-collect.js';

const dialect = new PgDialect();
const textOf = (q: SQL) => dialect.sqlToQuery(q).sql;

function fakeDeps(opts: { rowsFor?: (sql: string) => unknown[]; delayMs?: number } = {}) {
  const queries: string[] = [];
  let active = 0;
  let maxActive = 0;
  const deps: CollectDeps = {
    query: async (q) => {
      const text = textOf(q);
      queries.push(text);
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, opts.delayMs ?? 1));
      active--;
      return { rows: opts.rowsFor ? opts.rowsFor(text) : [] };
    },
    getActuatorMap: vi.fn(async () => ({ robots: [], suppliers: [], edges: [], adoptions: [], vendorMarkets: [] }) as any),
    getMarker: vi.fn(async (key: string) => (key === 'pipeline:last' ? { status: 'ok' } : null)),
  };
  return { deps, queries, stats: () => ({ maxActive }) };
}

describe('collector', () => {
  it('collects every registry area using only SELECT statements (empty DB -> empty raw, no throw)', async () => {
    const f = fakeDeps();
    const c = createCollector(f.deps);
    for (const id of COLLECTABLE_AREA_IDS) await expect(c.collect(id), id).resolves.toBeDefined();
    expect(f.queries.length).toBeGreaterThan(40);
    for (const q of f.queries) expect(q.trim(), q.slice(0, 80)).toMatch(/^(SELECT|WITH)\b/i);
    expect(f.stats().maxActive).toBeLessThanOrEqual(3);
  });

  it('rejects unknown areas', async () => {
    await expect(createCollector(fakeDeps().deps).collect('nope')).rejects.toThrow('unknown_area:nope');
  });

  it('never reads articles.content, and description / arXiv summary only as bounded classification input', () => {
    for (const kind of ['videos', 'papers', 'news', 'external'] as const) {
      const q = articleQuery(kind);
      expect(q).not.toMatch(/\ba\.content\b/);
      expect(q).not.toMatch(/'content'/);
      expect(q).not.toMatch(/AT TIME ZONE/); // timestamp(UTC 저장) 는 세션 TZ 와 무관하게 그대로 포맷한다
      expect(q).toContain(`to_char(a.published_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`);
    }
    expect(articleQuery('videos')).toContain(`left(x.m->>'description', 400)`);
    expect(articleQuery('videos')).toContain('NULL::text AS summary');
    expect(articleQuery('papers')).toContain('left(a.summary, 2000) AS summary');
    expect(articleQuery('papers')).not.toContain(`'description'`);
    expect(articleQuery('news')).toContain('left(a.summary, 300) AS summary');
    expect(articleQuery('news')).toContain('article_robot_tags');
    expect(articleQuery('external')).toContain(`'{}'::jsonb`);
  });

  it('the article partitions match the classification used elsewhere (video / arxiv paper / news / external)', () => {
    expect(articleQuery('videos')).toContain(`a.product_type = 'video'`);
    expect(articleQuery('papers')).toContain(`a.source = 'arxiv'`);
    expect(articleQuery('news')).toContain(`NOT IN ('arxiv', 'github', 'sec_edgar', 'patent')`);
    expect(articleQuery('external')).toContain(`IN ('github', 'sec_edgar', 'patent')`);
  });

  it('videos / papers / news are read once and shared with tech-trends', async () => {
    const f = fakeDeps();
    const c = createCollector(f.deps);
    await c.collect('videos');
    await c.collect('papers');
    await c.collect('news');
    const before = f.queries.length;
    await c.collect('tech-trends');
    const articleQueries = f.queries.slice(before).filter((q) => q.includes('FROM articles a'));
    expect(articleQueries).toHaveLength(0);
  });

  it('actuator-map and actuator-sourcing share one getMap() call', async () => {
    const f = fakeDeps();
    const c = createCollector(f.deps);
    await c.collect('actuator-map');
    await c.collect('actuator-sourcing');
    expect(f.deps.getActuatorMap).toHaveBeenCalledTimes(1);
  });

  it('maps rows: articles -> RawArticle, jsonb rows unwrapped, markers passed through', async () => {
    const f = fakeDeps({
      rowsFor: (sql) => {
        if (sql.includes('FROM articles a') && sql.includes(`'video'`))
          return [{ id: 'v1', title: 'T', url: 'u', summary: null, source: 'youtube', product_type: 'video', category: 'x', language: 'en', company_id: null, company_name: null, published_at: '2026-10-27T01:00:00.000Z', collected_at: '2026-10-27T02:00:00.000Z', meta: { channel: 'c' }, robot_ids: null }];
        if (sql.includes('FROM companies t')) return [{ r: { id: 'c1', name: 'Acme' } }];
        return [];
      },
    });
    const c = createCollector(f.deps);
    const videos = (await c.collect('videos')) as { rows: any[] };
    expect(videos.rows[0]).toMatchObject({ id: 'v1', productType: 'video', publishedAt: '2026-10-27T01:00:00.000Z', meta: { channel: 'c' } });
    const companies = (await c.collect('companies')) as { companies: any[] };
    expect(companies.companies).toEqual([{ id: 'c1', name: 'Acme' }]);
    const overview = (await c.collect('overview')) as any;
    expect(overview.markers.pipeline).toEqual({ status: 'ok' });
    expect(overview.markers.weeklyBrief).toBeNull();
  });

  it('personal / operator columns are dropped in SQL for sensitive tables', async () => {
    const f = fakeDeps();
    const c = createCollector(f.deps);
    await c.collect('regulations');
    await c.collect('strategy-warroom');
    await c.collect('competitive-alerts');
    await c.collect('lg-humanoid-models');
    await c.collect('robots');
    const all = f.queries.join('\n');
    for (const drop of ["'original_text'", "'assignee'", "'evidence'", "'evaluated_by'", "'ai_cost_usd'", "'read_by'", "'is_read'", "'created_by'", "'image_url'"]) {
      expect(all, drop).toContain(`- ${drop}`);
    }
  });
});

describe('runLimited', () => {
  it('keeps result order and never exceeds the concurrency limit', async () => {
    let active = 0;
    let max = 0;
    const tasks = Array.from({ length: 10 }, (_v, i) => async () => {
      active++;
      max = Math.max(max, active);
      await new Promise((r) => setTimeout(r, 5 - (i % 3)));
      active--;
      return i;
    });
    expect(await runLimited(tasks, 3)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(max).toBeLessThanOrEqual(3);
    expect(await runLimited([], 3)).toEqual([]);
  });
});
