/**
 * 인제스트 가드(`ingest` 프로파일) — 항목 단위 거부, 일반 뉴스 단어 오탐 없음, 배치 비롤백, 거부 항목 title/url 미에코, source 거부
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';

const h = vi.hoisted(() => ({ inserts: [] as unknown[][], key: 'ingest-test-key' }));

function chain(result: unknown) {
  const c: any = {
    from: () => c,
    where: () => c,
    limit: () => c,
    values: (v: unknown) => {
      h.inserts.push([v]);
      return c;
    },
    onConflictDoNothing: () => c,
    returning: () => c,
    then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej),
  };
  return c;
}

vi.mock('../../db/index.js', async () => {
  const schema = await import('../../db/schema.js');
  return {
    ...schema,
    db: {
      select: () => chain([]),
      insert: () => chain([{ id: '00000000-0000-4000-8000-000000000001' }]),
    },
  };
});

import { ingestArticles, guardIngestItem } from '../../services/ingest.service.js';
import { createGuardContext } from '../../services/argos-i-inbound-guard.js';
import { ingestRoutes } from '../../routes/ingest.js';

const good = (over: Record<string, unknown> = {}) => ({
  title: 'Figure unveils new humanoid',
  url: 'https://www.therobotreport.com/figure-new/',
  source: 'rss',
  publishedAt: '2026-11-01T00:00:00Z',
  summary: 'The company kept the terms confidential and announced a pilot.',
  companyName: 'Figure AI',
  ...over,
});

beforeEach(() => {
  h.inserts.length = 0;
});

describe('ingestArticles + guard', () => {
  it('rejects only the offending items, keeps the rest (no rollback), and never echoes title/url of rejected items', async () => {
    const batch = [
      good(),
      good({ title: '[대외비] 다음 분기 계획', url: 'https://example.com/secret-title-marker' }),
      good({ summary: 'contact hong.gildong@lge.com for details', url: 'https://example.com/secret-url-marker' }),
      good({ url: 'https://intranet.lge.com/x', title: 'internal page' }),
      good({ title: 'Another public article', url: 'https://example.com/b' }),
      'not an object',
    ];
    const r = await ingestArticles({ source: 'rss', articles: batch });
    expect(r.inserted).toBe(2);
    const rejected = r.errors.filter((e) => e.error.startsWith('internal_data_rejected:'));
    expect(rejected.map((e) => e.index)).toEqual([1, 2, 3]);
    expect(rejected[0]!.error).toBe('internal_data_rejected:classification_label');
    expect(rejected[1]!.error).toBe('internal_data_rejected:internal_domain,email_detected');
    for (const e of rejected) {
      expect(e.title).toBeUndefined();
      expect(e.url).toBeUndefined();
    }
    expect(JSON.stringify(r)).not.toContain('secret-title-marker');
    expect(JSON.stringify(r)).not.toContain('secret-url-marker');
    expect(JSON.stringify(r)).not.toContain('hong.gildong');
    // 형식 오류 항목은 기존 규약대로 처리된다
    expect(r.errors.some((e) => e.index === 5)).toBe(true);
  });

  it('does not reject ordinary news wording (false-positive guard)', async () => {
    const ctx = createGuardContext({});
    const ok = [
      good({ summary: '회사는 계약 내용을 비공개로 했으며 사내 교육도 진행했다.' }),
      good({ title: 'Proprietary stack: 12kg payload, 2000 units, 300만원 단가' }),
      good({ summary: 'Restricted export rules and an NDA were mentioned. Contact press@example.com' }),
    ];
    // 이메일은 ingest 에서도 거부(7번)하므로 마지막 항목만 거부 대상이다
    expect(guardIngestItem(ok[0], ctx)).toEqual([]);
    expect(guardIngestItem(ok[1], ctx)).toEqual([]);
    expect(guardIngestItem(ok[2], ctx)).toEqual(['email_detected']);
  });

  it('checks alerts title/summary too', () => {
    const ctx = createGuardContext({});
    expect(guardIngestItem(good({ alerts: [{ type: 'funding', title: 'ok', summary: 'Confidential — roadmap' }] }), ctx)).toEqual(['classification_label']);
  });

  it('operator env patterns and term hashes apply to ingest items as well', () => {
    const ctx = createGuardContext({ ARGOS_I_INTERNAL_PATTERNS: 'zeta-\\d+' });
    expect(guardIngestItem(good({ title: 'zeta-9 launch' }), ctx)).toEqual(['internal_pattern']);
  });
});

describe('ingest classification labels: header/bracket only (regression)', () => {
  const ctx = createGuardContext({});
  it.each([
    '현대차, 극비리에 로봇 프로젝트 추진',
    '삼성전자 휴머노이드 대외비 문건 유출 논란',
    'Leaked memo marked internal use only reveals Tesla plans',
    '机密文件泄露 机器人公司',
  ])('passes news sentence: %s', (v) => {
    expect(guardIngestItem(good({ title: v }), ctx)).toEqual([]);
    expect(guardIngestItem(good({ summary: v }), ctx)).toEqual([]);
  });
  it.each(['[대외비] 다음 분기 계획', 'Internal Only — roadmap', '[Internal Use Only] memo', 'Confidential: plan'])('still rejects header/bracket form: %s', (v) => {
    expect(guardIngestItem(good({ title: v }), ctx)).toEqual(['classification_label']);
  });
});

describe('POST /api/ingest/articles source guard', () => {
  const OLD = process.env.INGEST_API_KEY;
  it('rejects the whole batch when source itself carries an internal marker (codes only), accepts a normal source', async () => {
    process.env.INGEST_API_KEY = h.key;
    const app = Fastify();
    await app.register(ingestRoutes, { prefix: '/api/ingest' });
    const post = (source: string) =>
      app.inject({ method: 'POST', url: '/api/ingest/articles', headers: { authorization: `Bearer ${h.key}` }, payload: { source, articles: [good()] } });
    const bad = await post('[Internal Only] feed');
    expect(bad.statusCode).toBe(400);
    expect(bad.json()).toEqual({ error: 'internal_data_rejected', reasons: ['classification_label'] });
    const ok = await post('claude-routine');
    expect(ok.statusCode).toBe(200);
    expect(ok.json().inserted).toBe(1);
    await app.close();
    if (OLD === undefined) delete process.env.INGEST_API_KEY;
    else process.env.INGEST_API_KEY = OLD;
  });
});
