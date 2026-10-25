/**
 * /api/articles/tech-trends/:domain/timeline|timeline/insight|classify|classify/status 라우트의 도메인 분기 —
 * DB·인증·무거운 서비스는 가짜로 대체하고 fastify.inject 로 상태 코드와 전달 도메인을 검증한다.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

vi.mock('../../db/index.js', async () => {
  const schema = await import('../../db/schema.js');
  return {
    ...schema,
    db: {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }),
      insert: () => ({ values: () => ({ onConflictDoUpdate: async () => {} }) }),
      update: () => ({ set: () => ({ where: async () => {} }) }),
      execute: async () => {},
    },
  };
});
vi.mock('../../services/index.js', () => ({ articleService: {} }));
vi.mock('../../routes/auth.js', () => ({
  authMiddleware: async () => {},
  requireRole: () => async () => {},
}));

import { articleRoutes } from '../../routes/articles.js';
import { techTrendTimelineService } from '../../services/tech-trend-timeline.service.js';
import { techTrendTimelineInsightService } from '../../services/tech-trend-timeline-insight.service.js';
import { getTopicClassificationService } from '../../services/hand-topic-classification.service.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify();
  await app.register(articleRoutes);
  await app.ready();
});
afterAll(async () => {
  await app.close();
});
beforeEach(() => {
  vi.restoreAllMocks();
});

const BODY = (domain: 'hand' | 'actuator') =>
  ({
    domain,
    generatedAt: 'x',
    period: null,
    topics: [],
    buckets: [],
    heatmap: { granularity: 'month', columns: [], rows: [] },
    classification: { total: 0, classified: 0, offTopic: 0, unclassified: 0, failed: 0, ratio: 0, version: 1, papers: { total: 0, classified: 0 }, videos: { total: 0, classified: 0 } },
    scope: { videosExcludedByFocus: 0, videosPendingJudgement: 0, beforeRangeDropped: 0, truncated: false },
    cached: false,
  }) as unknown as Awaited<ReturnType<typeof techTrendTimelineService.getTimeline>>;

describe('GET /tech-trends/:domain/timeline', () => {
  it('400 for unknown and unsupported (rfm/expo/production) domains', async () => {
    expect((await app.inject({ method: 'GET', url: '/tech-trends/bogus/timeline' })).statusCode).toBe(400);
    for (const d of ['rfm', 'expo', 'production']) {
      const res = await app.inject({ method: 'GET', url: `/tech-trends/${d}/timeline` });
      expect(res.statusCode, d).toBe(400);
      expect(res.json()).toEqual({ error: 'Timeline not supported for this domain' });
    }
  });

  it('passes the domain through for hand and actuator', async () => {
    const spy = vi.spyOn(techTrendTimelineService, 'getTimeline').mockImplementation(async (d) => BODY(d ?? 'hand'));
    const act = await app.inject({ method: 'GET', url: '/tech-trends/actuator/timeline' });
    expect(act.statusCode).toBe(200);
    expect(act.json().domain).toBe('actuator');
    const hand = await app.inject({ method: 'GET', url: '/tech-trends/hand/timeline' });
    expect(hand.json().domain).toBe('hand');
    expect(spy.mock.calls.map((c) => c[0])).toEqual(['actuator', 'hand']);
  });
});

describe('GET /tech-trends/:domain/timeline/insight', () => {
  it('400 for rfm, passes actuator through', async () => {
    expect((await app.inject({ method: 'GET', url: '/tech-trends/rfm/timeline/insight' })).statusCode).toBe(400);
    const spy = vi.spyOn(techTrendTimelineInsightService, 'getInsight').mockResolvedValue({ status: 'no_api_key', insight: null });
    const res = await app.inject({ method: 'GET', url: '/tech-trends/actuator/timeline/insight' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'no_api_key', insight: null });
    expect(spy).toHaveBeenCalledWith('actuator');
  });
});

describe('POST /tech-trends/:domain/classify and GET classify/status', () => {
  it('400 for rfm on both routes', async () => {
    expect((await app.inject({ method: 'POST', url: '/tech-trends/rfm/classify' })).statusCode).toBe(400);
    expect((await app.inject({ method: 'GET', url: '/tech-trends/rfm/classify/status' })).statusCode).toBe(400);
    expect((await app.inject({ method: 'POST', url: '/tech-trends/nope/classify' })).json()).toEqual({ error: 'Invalid domain' });
  });

  it('uses the actuator service instance for actuator', async () => {
    const act = getTopicClassificationService('actuator');
    const hand = getTopicClassificationService('hand');
    const startAct = vi.spyOn(act, 'start').mockResolvedValue({ ok: true, queued: 3, total: 3 });
    const startHand = vi.spyOn(hand, 'start').mockResolvedValue({ ok: true, queued: 1, total: 1 });
    const res = await app.inject({ method: 'POST', url: '/tech-trends/actuator/classify' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ queued: 3, total: 3 });
    expect(startAct).toHaveBeenCalledTimes(1);
    expect(startHand).not.toHaveBeenCalled();

    const status = await app.inject({ method: 'GET', url: '/tech-trends/actuator/classify/status' });
    expect(status.statusCode).toBe(200);
    expect(status.json()).toMatchObject({ running: false });
  });

  it('503 when Anthropic is not configured', async () => {
    vi.spyOn(getTopicClassificationService('actuator'), 'start').mockResolvedValue({ ok: false, reason: 'anthropic_not_configured' });
    const res = await app.inject({ method: 'POST', url: '/tech-trends/actuator/classify' });
    expect(res.statusCode).toBe(503);
  });
});
