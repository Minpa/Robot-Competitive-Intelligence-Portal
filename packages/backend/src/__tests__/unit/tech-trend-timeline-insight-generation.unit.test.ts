/**
 * TechTrendTimelineInsightService 생성 흐름 테스트 — DB·Anthropic 클라이언트·집계 서비스를 가짜로 대체한다 (실제 API 호출 없음).
 * Opus 요청 파라미터, refusal, 10분 쿨다운, stale-while-revalidate, warm 인플라이트 가드를 검증한다.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const dbState = vi.hoisted(() => ({
  cacheRows: [] as unknown[],
  inserted: [] as { viewName: string; data: Record<string, unknown> }[],
}));

vi.mock('../../db/index.js', async () => {
  const schema = await import('../../db/schema.js');
  return {
    ...schema,
    db: {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => dbState.cacheRows }) }) }),
      insert: () => ({
        values: (v: { viewName: string; data: Record<string, unknown> }) => ({
          onConflictDoUpdate: async () => {
            dbState.inserted.push(v);
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
import { TechTrendTimelineInsightService } from '../../services/tech-trend-timeline-insight.service.js';
import {
  buildTimelineSnapshot,
  techTrendTimelineService,
  TIMELINE_INSIGHT_CACHE_KEY,
  type TimelineSnapshot,
} from '../../services/tech-trend-timeline.service.js';
import { HAND_TOPIC_VERSION } from '../../services/hand-topics.js';
import type { ArticleRow } from '../../services/tech-trend-report.service.js';
import type { AnthropicMessagesClient, MessageResponseLike } from '../../services/anthropic-models.js';

const logUsage = vi.mocked(aiUsageService.logUsage);

const NOW = new Date('2026-10-14T12:00:00.000Z');
const HOUR = 3_600_000;
const COOLDOWN = 10 * 60_000;
const MONTHS = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];

function stored(primary: string) {
  return { handTopics: { topics: [primary], primary, classifiedAt: '2026-10-01T00:00:00Z', version: HAND_TOPIC_VERSION } };
}

function snapshot(): TimelineSnapshot {
  const spec: Record<string, { papers?: number[]; videos?: number[] }> = {
    tactile_force: { papers: [0, 1, 1, 3, 4, 0], videos: [0, 0, 1, 2, 3, 0] },
    dexterous_hw: { papers: [0, 0, 1, 2, 3, 0], videos: [0, 0, 0, 1, 2, 0] },
    teleop_data: { papers: [0, 0, 0, 1, 3, 0], videos: [0, 0, 0, 0, 3, 0] },
  };
  const papers: ArticleRow[] = [];
  const videos: ArticleRow[] = [];
  for (const [topic, s] of Object.entries(spec)) {
    (s.papers ?? []).forEach((n, mi) => {
      for (let k = 0; k < n; k++) {
        const date = `${MONTHS[mi]}-1${k % 9}T00:00:00Z`;
        papers.push({
          id: `p-${topic}-${mi}-${k}`,
          title: `Paper ${topic} ${MONTHS[mi]} n${k}`,
          summary: 'tactile gripper',
          source: 'arxiv',
          publishedAt: date,
          collectedAt: date,
          extractedMetadata: stored(topic),
        });
      }
    });
    (s.videos ?? []).forEach((n, mi) => {
      for (let k = 0; k < n; k++) {
        const date = `${MONTHS[mi]}-1${k % 9}T00:00:00Z`;
        videos.push({
          id: `v-${topic}-${mi}-${k}`,
          title: `Video ${topic} ${MONTHS[mi]} n${k}`,
          productType: 'video',
          source: 'youtube',
          publishedAt: date,
          collectedAt: date,
          extractedMetadata: { domain: 'hand', ...stored(topic) },
        });
      }
    });
  }
  return buildTimelineSnapshot({ papers, videos, videosExcludedByFocus: 0, videosPendingJudgement: 0 }, NOW);
}

const SNAP = snapshot();

const GOOD = JSON.stringify({
  overview: '전체 흐름 요약',
  rising: [{ topicId: 'tactile_force', evidence: '근거', paperTitles: [], videoTitles: [] }],
  declining: [],
  leadLag: [],
  lgImplications: ['a', 'b', 'c', 'd'],
});

function response(partial: Partial<MessageResponseLike> & { text?: string } = {}): MessageResponseLike {
  const { text = GOOD, ...rest } = partial;
  return {
    content: [{ type: 'thinking' }, { type: 'text', text }],
    stop_reason: 'end_turn',
    usage: { input_tokens: 5500, output_tokens: 9000 },
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

function cacheRow(ageHours: number) {
  return {
    viewName: TIMELINE_INSIGHT_CACHE_KEY,
    data: {
      overview: '이전 해설',
      rising: [],
      declining: [],
      leadLag: [],
      lgImplications: ['x'],
      model: 'claude-opus-5-5',
      generatedAt: '2026-10-10T00:00:00.000Z',
    },
    cachedAt: new Date(NOW.getTime() - ageHours * HOUR),
    ttlMs: 24 * HOUR,
  };
}

const spyGetTimeline = () => vi.spyOn(techTrendTimelineService, 'getTimeline');
const spyLoadSnapshot = () => vi.spyOn(techTrendTimelineService, 'loadSnapshot');
let getTimeline: ReturnType<typeof spyGetTimeline>;
let loadSnapshot: ReturnType<typeof spyLoadSnapshot>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  dbState.cacheRows = [];
  dbState.inserted = [];
  logUsage.mockClear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  getTimeline = spyGetTimeline().mockResolvedValue({ ...SNAP.body, cached: false });
  loadSnapshot = spyLoadSnapshot().mockResolvedValue(SNAP);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('timeline insight generation (Opus 5.5)', () => {
  it('sends Opus params (max_tokens 20000, effort high, no thinking/budget_tokens/prefill) and uses the v2 cache key', async () => {
    const { client, create } = makeClient(async () => response());
    const out = await new TechTrendTimelineInsightService(client).getInsight();

    expect(out.status).toBe('ok');
    expect(out.insight).toMatchObject({ cached: false, model: 'claude-opus-5-5' });
    expect(out.insight!.lgImplications).toEqual(['a', 'b', 'c', 'd']);
    const [params, options] = create.mock.calls[0]!;
    expect(params.model).toBe('claude-opus-5-5');
    expect(params.max_tokens).toBe(20000);
    expect(params.max_tokens).toBeLessThanOrEqual(21_333);
    expect(params.output_config).toEqual({ effort: 'high' });
    expect(params).not.toHaveProperty('thinking');
    expect(JSON.stringify(params)).not.toContain('budget_tokens');
    expect(params.messages).toHaveLength(1);
    expect(params.messages[0]!.role).toBe('user');
    expect(options).toEqual({ timeout: 240000, maxRetries: 1 });
    expect(dbState.inserted[0]!.viewName).toBe('tech-trend-timeline-insight:v2:hand');
    expect(logUsage.mock.calls[0]![0]).toMatchObject({
      model: 'claude-opus-5-5',
      inputTokens: 5500,
      outputTokens: 9000,
      query: '[tech-trend-timeline] hand',
    });
  });

  it('treats refusal as a failure (usage logged, nothing cached) and cools down for 10 minutes', async () => {
    const { client, create } = makeClient(async () => response({ stop_reason: 'refusal' }));
    const svc = new TechTrendTimelineInsightService(client);
    expect(await svc.getInsight()).toEqual({ status: 'generation_failed', insight: null });
    expect(logUsage).toHaveBeenCalledTimes(1);
    expect(dbState.inserted).toHaveLength(0);

    vi.setSystemTime(new Date(NOW.getTime() + COOLDOWN - 1000));
    expect(await svc.getInsight()).toEqual({ status: 'generation_failed', insight: null });
    expect(create).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date(NOW.getTime() + COOLDOWN + 1000));
    await svc.getInsight();
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('cools down after parse failures and exceptions, but not for a missing key', async () => {
    const bad = makeClient(async () => response({ text: 'nope' }));
    const a = new TechTrendTimelineInsightService(bad.client);
    await a.getInsight();
    await a.getInsight();
    expect(bad.create).toHaveBeenCalledTimes(1);

    const thrown = makeClient(async () => {
      throw new Error('boom');
    });
    const b = new TechTrendTimelineInsightService(thrown.client);
    await b.getInsight();
    await b.getInsight();
    expect(thrown.create).toHaveBeenCalledTimes(1);

    expect((await new TechTrendTimelineInsightService(null).getInsight()).status).toBe('no_api_key');
  });
});

describe('timeline insight stale-while-revalidate', () => {
  it('returns an expired cache immediately as stale and regenerates once in the background', async () => {
    dbState.cacheRows = [cacheRow(48)];
    const gate = deferred<MessageResponseLike>();
    const { client, create } = makeClient(() => gate.promise);
    const svc = new TechTrendTimelineInsightService(client);

    const first = await svc.getInsight();
    expect(first.status).toBe('ok');
    expect(first.insight).toMatchObject({ overview: '이전 해설', cached: true, stale: true });
    await flush();
    expect(create).toHaveBeenCalledTimes(1);

    const second = await svc.getInsight();
    expect(second.insight).toMatchObject({ cached: true, stale: true });
    await flush();
    expect(create).toHaveBeenCalledTimes(1);

    gate.resolve(response());
    await flush();
    expect(dbState.inserted).toHaveLength(1);
    expect(dbState.inserted[0]!.data.overview).toBe('전체 흐름 요약');
  });

  it('serves a fresh cache without API calls and without the stale flag', async () => {
    dbState.cacheRows = [cacheRow(1)];
    const { client, create } = makeClient(async () => response());
    const out = await new TechTrendTimelineInsightService(client).getInsight();
    expect(out.insight).toMatchObject({ cached: true });
    expect(out.insight!.stale).toBeUndefined();
    await flush();
    expect(create).not.toHaveBeenCalled();
    expect(getTimeline).not.toHaveBeenCalled();
  });

  it('serves stale during cooldown without regenerating', async () => {
    dbState.cacheRows = [cacheRow(48)];
    const { client, create } = makeClient(async () => response({ text: 'nope' }));
    const svc = new TechTrendTimelineInsightService(client);
    await svc.getInsight();
    await flush();
    expect(create).toHaveBeenCalledTimes(1);
    const again = await svc.getInsight();
    await flush();
    expect(again.insight).toMatchObject({ stale: true });
    expect(create).toHaveBeenCalledTimes(1);
  });
});

describe('timeline insight warmInsight', () => {
  it('regenerates an expired insight once even when triggered concurrently', async () => {
    dbState.cacheRows = [cacheRow(48)];
    const gate = deferred<MessageResponseLike>();
    const { client, create } = makeClient(() => gate.promise);
    const svc = new TechTrendTimelineInsightService(client);
    const a = svc.warmInsight();
    const b = svc.warmInsight();
    await flush();
    expect(create).toHaveBeenCalledTimes(1);
    gate.resolve(response());
    await Promise.all([a, b]);
    expect(create).toHaveBeenCalledTimes(1);
    expect(loadSnapshot).toHaveBeenCalledTimes(1);
    expect(dbState.inserted).toHaveLength(1);
  });

  it('does nothing when fresh, without a client, or during cooldown', async () => {
    const { client, create } = makeClient(async () => response({ text: 'nope' }));
    dbState.cacheRows = [cacheRow(1)];
    await new TechTrendTimelineInsightService(client).warmInsight();
    expect(create).not.toHaveBeenCalled();

    dbState.cacheRows = [];
    await new TechTrendTimelineInsightService(null).warmInsight();
    expect(create).not.toHaveBeenCalled();

    const svc = new TechTrendTimelineInsightService(client);
    await svc.warmInsight(); // 실패 -> 쿨다운
    await svc.warmInsight();
    expect(create).toHaveBeenCalledTimes(1);
  });
});
