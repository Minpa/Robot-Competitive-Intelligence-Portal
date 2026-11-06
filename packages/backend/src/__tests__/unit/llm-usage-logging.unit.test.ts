/**
 * 영상 태깅 / 논문 요약 / 스펙 보강 — 응답을 받은 호출마다 logUsage 1행 (태그 [video-tagging] [paper-summary] [spec-enrichment]).
 * 로깅은 호출 수를 늘리지 않고, 실패해도 본 흐름에 영향이 없다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fakeAnthropic, makeDbMock } from '../fixtures/llm-guard-test-kit.js';

const dbMock = vi.hoisted(() => ({ current: null as any }));
const usage = vi.hoisted(() => ({ logUsage: vi.fn(async (_e: unknown) => {}), getCurrentMonthCostUsd: vi.fn(async () => 0) }));

vi.mock('../../db/index.js', async () => {
  const schema = await import('../../db/schema.js');
  return { ...schema, db: new Proxy({}, { get: (_t, p) => (dbMock.current as any).db[p] }) };
});
vi.mock('../../services/ai-usage.service.js', () => ({ aiUsageService: usage }));

beforeEach(() => {
  dbMock.current = makeDbMock();
  vi.clearAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

const entry = (i = 0) => usage.logUsage.mock.calls[i]![0] as { provider: string; model: string; webSearch: boolean; inputTokens: number; outputTokens: number; query: string };

describe('usage logging for the three Claude pipelines', () => {
  it('video tagging logs one row per batch call, tag [video-tagging]', async () => {
    const { VideoTaggingService } = await import('../../services/video-tagging.service.js');
    const { client, create } = fakeAnthropic('[]');
    dbMock.current.selectQueue.push([{ id: 'v1', title: 'Robot walks', extractedMetadata: { channel: 'c', description: 'd' } }]);
    await new VideoTaggingService({ client }).run(50);
    expect(create).toHaveBeenCalledTimes(1);
    expect(usage.logUsage).toHaveBeenCalledTimes(1);
    expect(entry()).toMatchObject({ provider: 'claude', webSearch: false, inputTokens: 1, outputTokens: 1 });
    expect(entry().query.startsWith('[video-tagging]')).toBe(true);
  });

  it('paper summary logs one row per batch call, tag [paper-summary]', async () => {
    const { PaperSummaryService } = await import('../../services/paper-summary.service.js');
    const { client, create } = fakeAnthropic('[]');
    dbMock.current.selectQueue.push([{ id: 'p1', title: 't', summary: 'abstract' }]);
    await new PaperSummaryService({ client }).run(50);
    expect(create).toHaveBeenCalledTimes(1);
    expect(usage.logUsage).toHaveBeenCalledTimes(1);
    expect(entry().query.startsWith('[paper-summary]')).toBe(true);
    expect(entry().provider).toBe('claude');
  });

  it('spec enrichment logs one row per extraction call, tag [spec-enrichment]', async () => {
    const { SpecEnrichmentService } = await import('../../services/spec-enrichment.service.js');
    const { client, create } = fakeAnthropic('{}');
    const q = dbMock.current.selectQueue as unknown[][];
    q.push([{ id: 'r1', name: 'Atlas' }]);
    q.push([]);
    q.push([{ title: 'Atlas article', summary: 'x', meta: {} }]);
    q.push([]);
    await new SpecEnrichmentService({ client }).run(5);
    expect(create).toHaveBeenCalledTimes(1);
    expect(usage.logUsage).toHaveBeenCalledTimes(1);
    expect(entry().query.startsWith('[spec-enrichment]')).toBe(true);
  });

  it('a failing logUsage does not break the pipeline', async () => {
    usage.logUsage.mockRejectedValueOnce(new Error('db down'));
    const { PaperSummaryService } = await import('../../services/paper-summary.service.js');
    const { client } = fakeAnthropic('[{"id":"p1","ko":"요약입니다"}]');
    dbMock.current.selectQueue.push([{ id: 'p1', title: 't', summary: 'abstract' }]);
    const res = await new PaperSummaryService({ client }).run(50);
    expect(res.summarized).toBe(1);
  });

  it('no logging happens when the model client is absent', async () => {
    const { PaperSummaryService } = await import('../../services/paper-summary.service.js');
    await new PaperSummaryService({ client: null }).run(5);
    expect(usage.logUsage).not.toHaveBeenCalled();
  });
});
