/**
 * 번들 requests 영역 — 최근 7일 종결 요청 요약, note·payload_hash·승인자 제외, 30번째 영역(additive, 스키마 버전 유지),
 * 수집 SQL 이 읽는 컬럼, 계약 테스트·영역 수 갱신 (AC-25)
 */
import { describe, it, expect, vi } from 'vitest';
import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';

vi.mock('../../db/index.js', () => ({ db: {} }));
vi.mock('../../services/actuator-position-map.service.js', async (importOriginal) => ({ ...(await importOriginal<object>()), actuatorPositionMapService: { getMap: vi.fn() } }));
vi.mock('../../services/data-migration.service.js', () => ({ dataMigrationService: { get: vi.fn() } }));

import { AREA_DEFS, getAreaDef } from '../../services/argos-i-export-areas.js';
import { REQUESTS_AREA, summarizeResult } from '../../services/argos-i-export-areas-requests.js';
import { COLLECTABLE_AREA_IDS, createCollector, type CollectDeps } from '../../services/argos-i-export-collect.js';
import { renderArea } from '../../services/argos-i-export-build.js';
import { ARGOS_I_EXPORT_SCHEMA_VERSION } from '../../types/argos-i-export.js';
import { CTX, SENTINEL, rawByArea } from '../fixtures/argos-i-export.fixture.js';

const dialect = new PgDialect();
const text = (f: { content: Buffer }) => f.content.toString('utf-8');

describe('requests area registration', () => {
  it('is the 30th area (P2), kebab-case id, collectable, and the bundle schema version stays 1 (additive)', () => {
    expect(AREA_DEFS).toHaveLength(30);
    expect(AREA_DEFS[AREA_DEFS.length - 1]).toBe(REQUESTS_AREA);
    expect(getAreaDef('requests')).toMatchObject({ id: 'requests', priority: 'P2', areaSchemaVersion: 1, sourceTables: ['argos_i_requests'] });
    expect(COLLECTABLE_AREA_IDS).toContain('requests');
    expect([...COLLECTABLE_AREA_IDS].sort()).toEqual(AREA_DEFS.map((d) => d.id).sort());
    expect(ARGOS_I_EXPORT_SCHEMA_VERSION).toBe(1);
  });
});

describe('requests area content', () => {
  const rendered = renderArea(REQUESTS_AREA, rawByArea().requests, CTX);
  const json = JSON.parse(text(rendered.json));
  const md = text(rendered.md);

  it('lists id/type/params/status/errorCode/finishedAt and a scalar result summary, newest first', () => {
    expect(json.area).toBe('requests');
    expect(json.recordCount).toBe(3);
    const items = json.data.items as any[];
    expect(items.map((i) => i.finishedAt)).toEqual(['2026-11-11T02:00:00.000Z', '2026-11-11T02:00:00.000Z', '2026-11-10T01:00:00.000Z']);
    expect(items[0]).toEqual({ id: expect.any(String), type: expect.any(String), params: expect.any(Object), status: expect.any(String), errorCode: expect.anything(), finishedAt: expect.any(String), result: null });
    const failed = items.find((i) => i.status === 'failed');
    expect(failed).toMatchObject({ type: 'analyze', errorCode: 'not_found', result: null, params: { slug: 'figure-02', target: 'robot' } });
    const query = items.find((i) => i.type === 'query');
    expect(query.result).toEqual({ itemCount: 10, recordCount: 10 });
  });

  it('never contains note, payload_hash, approver labels or result bodies (SENTINEL / email must not leak), JSON and MD', () => {
    for (const out of [text(rendered.json), md]) {
      expect(out).not.toContain(SENTINEL);
      expect(out).not.toContain('alice.private@example.com');
      expect(out).not.toMatch(/"note"|payload|approved|idempotency/i);
    }
    expect(Object.keys(json.data.items[0]).sort()).toEqual(['errorCode', 'finishedAt', 'id', 'params', 'result', 'status', 'type']);
  });

  it('MD table row count equals recordCount and an empty input gives an empty area', () => {
    const rows = md.split('\n').filter((l) => l.startsWith('|') && !l.startsWith('| ---') && !l.includes('완료(KST)'));
    expect(rows).toHaveLength(3);
    const empty = renderArea(REQUESTS_AREA, { rows: [] }, CTX);
    expect(JSON.parse(text(empty.json)).recordCount).toBe(0);
  });

  it('summarizeResult keeps scalars only (no lists, no long strings, no nested bodies)', () => {
    expect(summarizeResult({ kind: 'arxiv', inserted: 1, skipped: 0, items: [{ title: 'x' }], body: 'long' })).toEqual({ inserted: 1, skipped: 0, itemCount: 1 });
    expect(summarizeResult({ articleId: 'a'.repeat(200), geminiAnalysis: { summaryKo: 'x' } })).toBeNull();
    expect(summarizeResult(null)).toBeNull();
    expect(summarizeResult([1])).toBeNull();
  });
});

describe('collector SQL for requests', () => {
  it('reads only terminal requests of the last 7 days (max 500) and never selects note / hashes / approver columns', async () => {
    const queries: string[] = [];
    const deps: CollectDeps = {
      query: async (q: SQL) => {
        queries.push(dialect.sqlToQuery(q).sql);
        return { rows: [] };
      },
      getActuatorMap: vi.fn(async () => ({}) as any),
      getMarker: vi.fn(async () => null),
    };
    await createCollector(deps).collect('requests');
    const sql = queries.join('\n');
    expect(sql).toMatch(/FROM argos_i_requests/);
    expect(sql).toContain("status IN ('done','failed','rejected','cancelled')");
    expect(sql).toContain("INTERVAL '7 days'");
    expect(sql).toContain('LIMIT 500');
    expect(sql).toMatch(/^\s*SELECT/);
    for (const forbidden of ['note', 'payload_hash', 'idempotency_hash', 'approved_by', 'approved_at', 'requested_by', 'cost_usd']) {
      expect(sql, forbidden).not.toMatch(new RegExp(`['\\s,(]${forbidden}['\\s,)]`));
    }
  });
});
