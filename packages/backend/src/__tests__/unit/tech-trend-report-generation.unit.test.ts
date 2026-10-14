/**
 * TechTrendReportService 생성 흐름 테스트 — DB·Anthropic 클라이언트를 모두 가짜로 주입한다 (실제 API 호출 없음).
 * 요청 파라미터(Opus/effort/thinking 없음), 응답 직후 사용량 기록, refusal, 10분 쿨다운,
 * stale-while-revalidate, warm(사전 생성) 인플라이트 가드를 검증한다.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const dbState = vi.hoisted(() => ({
  cacheRows: [] as unknown[],
  articleRows: [] as unknown[],
  inserted: [] as { viewName: string; data: Record<string, unknown> }[],
  events: [] as string[],
}));

vi.mock('../../db/index.js', async () => {
  const schema = await import('../../db/schema.js');
  return {
    ...schema,
    db: {
      select: () => ({
        from: (table: unknown) => ({
          where: () => ({
            limit: async () => (table === schema.viewCache ? dbState.cacheRows : dbState.articleRows),
            orderBy: () => ({
              limit: async () => (table === schema.articles ? dbState.articleRows : []),
            }),
          }),
        }),
      }),
      insert: () => ({
        values: (v: { viewName: string; data: Record<string, unknown> }) => ({
          onConflictDoUpdate: async () => {
            dbState.inserted.push(v);
            dbState.events.push('cache-write');
          },
        }),
      }),
    },
  };
});

vi.mock('../../services/ai-usage.service.js', () => ({
  aiUsageService: { logUsage: vi.fn(async () => {}) },
}));

import { aiUsageService } from '../../services/ai-usage.service.js';
import {
  TechTrendReportService,
  type ReportVideo,
  type PromptPaper,
} from '../../services/tech-trend-report.service.js';
import type { AnthropicMessagesClient, MessageResponseLike } from '../../services/anthropic-models.js';

const logUsage = vi.mocked(aiUsageService.logUsage);

const T0 = new Date('2026-10-14T12:00:00.000Z');
const HOUR = 3_600_000;
const COOLDOWN = 10 * 60_000;

function videos(n = 2): ReportVideo[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `v${i}`,
    title: `Demo ${i}`,
    channel: `Chan${i}`,
    thirdParty: false,
    publishedAt: '2026-10-01T00:00:00.000Z',
    url: `https://www.youtube.com/watch?v=abcdefghij${i}`,
    videoId: `abcdefghij${i}`,
    thumbnail: null,
    views: null,
    summaryKo: '요약',
    taskTypes: [],
    techTags: [],
    domainFocus: 'primary' as const,
  }));
}

function papers(n = 2): PromptPaper[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    title: `Paper ${i}`,
    publishedAt: '2026-10-02T00:00:00.000Z',
    url: `https://arxiv.org/abs/2610.0000${i}`,
    arxivId: `2610.0000${i}`,
    abstractSnippet: 'abstract',
    promptAbstract: 'abstract',
  }));
}

const GOOD_JSON = JSON.stringify({
  headline: '총평',
  points: [
    { text: '첫 시사점', refs: ['V1', 'P1'] },
    { text: '둘째 시사점 [V2]', refs: ['V99'] },
  ],
  keywords: ['촉각'],
});

function response(partial: Partial<MessageResponseLike> & { text?: string } = {}): MessageResponseLike {
  const { text = GOOD_JSON, ...rest } = partial;
  return {
    content: [
      { type: 'thinking' },
      { type: 'text', text },
    ],
    stop_reason: 'end_turn',
    usage: { input_tokens: 1000, output_tokens: 5000 },
    ...rest,
  };
}

function makeClient(impl: () => Promise<MessageResponseLike>) {
  const create = vi.fn<Parameters<AnthropicMessagesClient['messages']['create']>, Promise<MessageResponseLike>>(impl);
  const client: AnthropicMessagesClient = { messages: { create } };
  return { client, create };
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

function staleRow(extra: Record<string, unknown> = {}) {
  return {
    viewName: 'tech-trend-report:v2:hand:30',
    data: { headline: 'old', points: ['old point'], keywords: [], model: 'claude-opus-5-5', generatedAt: '2026-10-10T00:00:00.000Z', ...extra },
    cachedAt: new Date(T0.getTime() - 48 * HOUR),
    ttlMs: 24 * HOUR,
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(T0);
  dbState.cacheRows = [];
  dbState.articleRows = [];
  dbState.inserted = [];
  dbState.events = [];
  logUsage.mockClear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('hand insight request (Opus 5.5)', () => {
  it('sends model/max_tokens/effort/options as specified, with no thinking, budget_tokens or prefill', async () => {
    const { client, create } = makeClient(async () => response());
    const svc = new TechTrendReportService(client);
    const out = await svc.getInsight('hand', 30, '핸드 트렌드', videos(), papers());

    expect(create).toHaveBeenCalledTimes(1);
    const [params, options] = create.mock.calls[0]!;
    expect(params.model).toBe('claude-opus-5-5');
    expect(params.max_tokens).toBe(16000);
    expect(params.max_tokens).toBeLessThanOrEqual(21_333);
    expect(params.output_config).toEqual({ effort: 'high' });
    expect(params).not.toHaveProperty('thinking');
    expect(JSON.stringify(params)).not.toContain('budget_tokens');
    expect(params.messages).toHaveLength(1);
    expect(params.messages[0]!.role).toBe('user');
    expect(options).toEqual({ timeout: 240000, maxRetries: 1 });

    expect(out).not.toBeNull();
    expect(out!.cached).toBe(false);
    expect(out!.model).toBe('claude-opus-5-5');
    expect(out!.stale).toBeUndefined();
  });

  it('parses only the text block (thinking blocks ignored) and aligns pointEvidence with server-verified refs', async () => {
    const { client } = makeClient(async () => response());
    const svc = new TechTrendReportService(client);
    const out = (await svc.getInsight('hand', 30, '핸드 트렌드', videos(), papers()))!;
    expect(out.points).toEqual(['첫 시사점', '둘째 시사점']);
    expect(out.pointEvidence).toHaveLength(2);
    expect(out.pointEvidence![0]).toEqual([
      { kind: 'video', title: 'Demo 0', url: 'https://www.youtube.com/watch?v=abcdefghij0', label: 'Chan0' },
      { kind: 'paper', title: 'Paper 0', url: 'https://arxiv.org/abs/2610.00000', label: 'arXiv:2610.00000' },
    ]);
    expect(out.pointEvidence![1]).toEqual([]);
    // 저장된 캐시: v2 키, 응답과 같은 내용
    expect(dbState.inserted).toHaveLength(1);
    expect(dbState.inserted[0]!.viewName).toBe('tech-trend-report:v2:hand:30');
    expect(dbState.inserted[0]!.data.pointEvidence).toEqual(out.pointEvidence);
  });

  it('logs usage right after the response, before the cache write, and also when parsing fails', async () => {
    logUsage.mockImplementationOnce(async () => {
      dbState.events.push('log-usage');
    });
    const { client } = makeClient(async () => response());
    await new TechTrendReportService(client).getInsight('hand', 30, '핸드', videos(), papers());
    expect(dbState.events).toEqual(['log-usage', 'cache-write']);
    expect(logUsage).toHaveBeenCalledTimes(1);
    expect(logUsage.mock.calls[0]![0]).toMatchObject({
      provider: 'claude',
      model: 'claude-opus-5-5',
      inputTokens: 1000,
      outputTokens: 5000,
      query: '[tech-trend-report] hand/30d',
    });

    logUsage.mockClear();
    const bad = makeClient(async () => response({ text: '죄송합니다' }));
    const out = await new TechTrendReportService(bad.client).getInsight('hand', 30, '핸드', videos(), papers());
    expect(out).toBeNull();
    expect(logUsage).toHaveBeenCalledTimes(1);
  });
});

describe('legacy domains keep the previous request shape', () => {
  it('rfm: Haiku 4.5, max_tokens 1500, no output_config, v1 cache key, blocking regeneration even with an expired cache', async () => {
    dbState.cacheRows = [{ ...staleRow(), viewName: 'tech-trend-report:v1:rfm:30' }];
    const { client, create } = makeClient(async () =>
      response({ text: JSON.stringify({ headline: 'h', points: ['a', 'b', 'c'], keywords: ['k'] }) })
    );
    const out = await new TechTrendReportService(client).getInsight('rfm', 30, 'RFM 트렌드', videos(), papers());
    const [params, options] = create.mock.calls[0]!;
    expect(params.model).toBe('claude-haiku-4-5-20251001');
    expect(params.max_tokens).toBe(1500);
    expect(params).not.toHaveProperty('output_config');
    expect(params).not.toHaveProperty('thinking');
    expect(options).toBeUndefined();
    expect(out!.cached).toBe(false);
    expect(out!.stale).toBeUndefined();
    expect(out!.pointEvidence).toBeUndefined();
    expect(dbState.inserted[0]!.viewName).toBe('tech-trend-report:v1:rfm:30');
  });
});

describe('refusal / failure handling and 10-minute cooldown', () => {
  it('treats stop_reason=refusal as a failure: logs usage, no parse, no cache write, then cools down', async () => {
    const { client, create } = makeClient(async () => response({ stop_reason: 'refusal' }));
    const svc = new TechTrendReportService(client);
    expect(await svc.getInsight('hand', 30, '핸드', videos(), papers())).toBeNull();
    expect(logUsage).toHaveBeenCalledTimes(1);
    expect(dbState.inserted).toHaveLength(0);

    // 쿨다운 중 재호출 없음
    vi.setSystemTime(new Date(T0.getTime() + COOLDOWN - 1000));
    expect(await svc.getInsight('hand', 30, '핸드', videos(), papers())).toBeNull();
    expect(create).toHaveBeenCalledTimes(1);

    // 10분 경과 후 다시 시도
    vi.setSystemTime(new Date(T0.getTime() + COOLDOWN + 1000));
    await svc.getInsight('hand', 30, '핸드', videos(), papers());
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('cools down after a parse failure and after an exception, and never caches failures', async () => {
    const parseFail = makeClient(async () => response({ text: 'not json' }));
    const a = new TechTrendReportService(parseFail.client);
    await a.getInsight('hand', 30, '핸드', videos(), papers());
    await a.getInsight('hand', 30, '핸드', videos(), papers());
    expect(parseFail.create).toHaveBeenCalledTimes(1);

    const thrown = makeClient(async () => {
      throw new Error('boom');
    });
    const b = new TechTrendReportService(thrown.client);
    expect(await b.getInsight('hand', 30, '핸드', videos(), papers())).toBeNull();
    expect(await b.getInsight('hand', 30, '핸드', videos(), papers())).toBeNull();
    expect(thrown.create).toHaveBeenCalledTimes(1);
    expect(dbState.inserted).toHaveLength(0);
  });

  it('clears the cooldown after a success', async () => {
    let call = 0;
    const { client, create } = makeClient(async () => (++call === 1 ? response({ text: 'bad' }) : response()));
    const svc = new TechTrendReportService(client);
    await svc.getInsight('hand', 30, '핸드', videos(), papers());
    vi.setSystemTime(new Date(T0.getTime() + COOLDOWN + 1000));
    expect(await svc.getInsight('hand', 30, '핸드', videos(), papers())).not.toBeNull();
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('does not apply the cooldown to missing key / unmet gate', async () => {
    const noKey = new TechTrendReportService(null);
    expect(await noKey.getInsight('hand', 30, '핸드', videos(), papers())).toBeNull();
    const { client, create } = makeClient(async () => response());
    const svc = new TechTrendReportService(client);
    expect(await svc.getInsight('hand', 30, '핸드', videos(1), papers(1))).toBeNull();
    expect(create).not.toHaveBeenCalled();
    // 게이트 미충족이 쿨다운으로 남지 않는다
    expect(await svc.getInsight('hand', 30, '핸드', videos(), papers())).not.toBeNull();
    expect(create).toHaveBeenCalledTimes(1);
  });
});

describe('stale-while-revalidate', () => {
  it('returns the expired cache immediately as stale and regenerates once in the background', async () => {
    dbState.cacheRows = [staleRow()];
    const gate = deferred<MessageResponseLike>();
    const { client, create } = makeClient(() => gate.promise);
    const svc = new TechTrendReportService(client);

    const first = await svc.getInsight('hand', 30, '핸드', videos(), papers());
    expect(first).toMatchObject({ points: ['old point'], cached: true, stale: true });
    expect(create).toHaveBeenCalledTimes(1);

    // 재생성이 끝나기 전의 추가 요청도 stale 을 받고 호출은 늘지 않는다
    const second = await svc.getInsight('hand', 30, '핸드', videos(), papers());
    expect(second).toMatchObject({ cached: true, stale: true });
    expect(create).toHaveBeenCalledTimes(1);

    gate.resolve(response());
    await flush();
    expect(dbState.inserted).toHaveLength(1);
    expect(dbState.inserted[0]!.data.points).toEqual(['첫 시사점', '둘째 시사점']);
  });

  it('does not regenerate while in cooldown but still serves the stale cache', async () => {
    dbState.cacheRows = [staleRow()];
    const { client, create } = makeClient(async () => response({ text: 'bad' }));
    const svc = new TechTrendReportService(client);
    await svc.getInsight('hand', 30, '핸드', videos(), papers());
    await flush();
    expect(create).toHaveBeenCalledTimes(1);

    const again = await svc.getInsight('hand', 30, '핸드', videos(), papers());
    expect(again).toMatchObject({ cached: true, stale: true });
    await flush();
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('serves a fresh cache without calling the API or marking it stale', async () => {
    dbState.cacheRows = [{ ...staleRow(), cachedAt: new Date(T0.getTime() - HOUR) }];
    const { client, create } = makeClient(async () => response());
    const out = await new TechTrendReportService(client).getInsight('hand', 30, '핸드', videos(), papers());
    expect(out).toMatchObject({ cached: true });
    expect(out!.stale).toBeUndefined();
    expect(create).not.toHaveBeenCalled();
  });

  it('blocks on generation only when there is no cache row at all (and an empty-points row counts as none)', async () => {
    dbState.cacheRows = [staleRow({ points: [] })];
    const { client, create } = makeClient(async () => response());
    const out = await new TechTrendReportService(client).getInsight('hand', 30, '핸드', videos(), papers());
    expect(create).toHaveBeenCalledTimes(1);
    expect(out).toMatchObject({ cached: false });
    expect(out!.stale).toBeUndefined();
  });

  it('keeps serving legacy-shaped cache rows (no pointEvidence)', async () => {
    dbState.cacheRows = [staleRow()];
    const { client } = makeClient(() => new Promise<MessageResponseLike>(() => {}));
    const out = await new TechTrendReportService(client).getInsight('hand', 30, '핸드', videos(), papers());
    expect(out!.pointEvidence).toBeUndefined();
    expect(out!.points).toEqual(['old point']);
  });
});

describe('warmHandInsight', () => {
  function seedArticles() {
    dbState.articleRows = [
      ...Array.from({ length: 2 }, (_, i) => ({
        id: `wv${i}`,
        title: `Robot demo ${i}`,
        url: `https://www.youtube.com/watch?v=warmvideo${i}1`,
        summary: null,
        publishedAt: new Date('2026-10-01T00:00:00Z'),
        collectedAt: new Date('2026-10-01T00:00:00Z'),
        source: 'youtube',
        productType: 'video',
        extractedMetadata: { domain: 'hand', channel: 'WarmChan' },
      })),
      {
        id: 'wp0',
        title: 'Tactile gripper study',
        url: 'https://arxiv.org/abs/2610.12345',
        summary: 'A   gripper\nwith tactile sensing.',
        publishedAt: new Date('2026-10-02T00:00:00Z'),
        collectedAt: new Date('2026-10-02T00:00:00Z'),
        source: 'arxiv',
        productType: 'none',
        extractedMetadata: null,
      },
    ];
  }

  it('regenerates an expired hand days=30 insight, and concurrent triggers share one call', async () => {
    seedArticles();
    dbState.cacheRows = [staleRow()];
    const gate = deferred<MessageResponseLike>();
    const { client, create } = makeClient(() => gate.promise);
    const svc = new TechTrendReportService(client);

    const a = svc.warmHandInsight();
    const b = svc.warmHandInsight();
    await flush();
    expect(create).toHaveBeenCalledTimes(1);
    const prompt = String(create.mock.calls[0]![0].messages[0]!.content);
    expect(prompt).toContain('"ref":"V1"');
    expect(prompt).toContain('A gripper with tactile sensing.');

    gate.resolve(response());
    await Promise.all([a, b]);
    expect(create).toHaveBeenCalledTimes(1);
    expect(dbState.inserted).toHaveLength(1);
    expect(dbState.inserted[0]!.viewName).toBe('tech-trend-report:v2:hand:30');
  });

  it('does nothing when the cache is already fresh, the client is missing, or the gate is unmet', async () => {
    seedArticles();
    const { client, create } = makeClient(async () => response());

    dbState.cacheRows = [{ ...staleRow(), cachedAt: new Date(T0.getTime() - HOUR) }];
    await new TechTrendReportService(client).warmHandInsight();
    expect(create).not.toHaveBeenCalled();

    dbState.cacheRows = [];
    await new TechTrendReportService(null).warmHandInsight();
    expect(create).not.toHaveBeenCalled();

    dbState.articleRows = (dbState.articleRows as unknown[]).slice(0, 2);
    await new TechTrendReportService(client).warmHandInsight();
    expect(create).not.toHaveBeenCalled();
  });
});
