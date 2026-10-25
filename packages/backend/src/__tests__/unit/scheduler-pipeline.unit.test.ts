/**
 * scheduler.service — tech-trend-pipeline 태스크 등록/수동 트리거/가드, 기존 4개 태스크 불변
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const h = vi.hoisted(() => ({
  schedule: vi.fn(),
  runPipeline: vi.fn(),
}));

vi.mock('node-cron', () => ({ default: { schedule: h.schedule } }));
vi.mock('../../db/index.js', () => ({ db: {}, pipelineRuns: {}, pipelineStepLogs: {} }));
vi.mock('../../services/scoring-pipeline.service.js', () => ({ scoringPipelineService: {} }));
vi.mock('../../services/data-audit.service.js', () => ({ dataAuditService: {} }));
vi.mock('../../services/strategic-ai-agent.service.js', () => ({ strategicAIAgentService: {} }));
vi.mock('../../services/war-room-lg-robot.service.js', () => ({ warRoomLgRobotService: {} }));
vi.mock('../../services/video-tagging.service.js', () => ({ videoTaggingService: {} }));
vi.mock('../../services/video-db-sync.service.js', () => ({ videoDbSyncService: {} }));
vi.mock('../../services/spec-enrichment.service.js', () => ({ specEnrichmentService: {} }));
vi.mock('../../services/paper-summary.service.js', () => ({ paperSummaryService: {} }));
vi.mock('../../services/application-case-extraction.service.js', () => ({ applicationCaseExtractionService: {} }));
vi.mock('../../services/video-content-analysis.service.js', () => ({ videoContentAnalysisService: {} }));
vi.mock('../../services/event-video-brief.service.js', () => ({ eventVideoBriefService: {} }));
vi.mock('../../services/tech-trend-pipeline.service.js', () => ({
  runTechTrendPipeline: h.runPipeline,
  DEFAULT_PIPELINE_CRON: '30 5 * * *',
  PIPELINE_TASK_NAME: 'tech-trend-pipeline',
}));

async function load() {
  vi.resetModules();
  const mod = await import('../../services/scheduler.service.js');
  return mod.schedulerService;
}

const cronCalls = () => h.schedule.mock.calls.map((c) => ({ expr: c[0] as string, fn: c[1] as () => Promise<void>, opts: c[2] }));

beforeEach(() => {
  h.schedule.mockReset().mockImplementation(() => ({ stop: vi.fn() }));
  h.runPipeline.mockReset().mockResolvedValue(null);
  delete process.env.CRON_TECH_TREND_PIPELINE;
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('scheduler: tech-trend-pipeline', () => {
  it('registers 5 tasks; pipeline defaults to 30 5 * * * in KST; existing 4 unchanged', async () => {
    const s = await load();
    s.init();
    const status = s.getStatus().tasks;
    expect(status.map((t) => t.name)).toEqual(['scoring', 'audit', 'briefing', 'video-tagging', 'tech-trend-pipeline']);
    expect(Object.fromEntries(status.map((t) => [t.name, t.cron]))).toEqual({
      scoring: '0 2 * * 1', audit: '0 3 * * 1', briefing: '0 4 * * 1', 'video-tagging': '0 4 * * *', 'tech-trend-pipeline': '30 5 * * *',
    });
    for (const c of cronCalls()) expect(c.opts).toMatchObject({ timezone: 'Asia/Seoul' });
  });

  it('CRON_TECH_TREND_PIPELINE overrides the schedule', async () => {
    process.env.CRON_TECH_TREND_PIPELINE = '15 6 * * *';
    const s = await load();
    s.init();
    expect(s.getStatus().tasks.find((t) => t.name === 'tech-trend-pipeline')?.cron).toBe('15 6 * * *');
  });

  it('the cron handler runs the pipeline with reason=cron', async () => {
    const s = await load();
    s.init();
    const pipelineCron = cronCalls().find((c) => c.expr === '30 5 * * *')!;
    await pipelineCron.fn();
    expect(h.runPipeline).toHaveBeenCalledWith({ reason: 'cron' });
    expect(s.isTaskRunning('tech-trend-pipeline')).toBe(false);
  });

  it('trigger() reaches the pipeline (switch case) with manual / startup reason', async () => {
    const s = await load();
    s.init();
    expect(await s.trigger('tech-trend-pipeline')).toMatchObject({ success: true });
    await vi.waitFor(() => expect(h.runPipeline).toHaveBeenCalledWith({ reason: 'manual' }));
    await vi.waitFor(() => expect(s.isTaskRunning('tech-trend-pipeline')).toBe(false));
    await s.trigger('tech-trend-pipeline', 'startup');
    await vi.waitFor(() => expect(h.runPipeline).toHaveBeenLastCalledWith({ reason: 'startup' }));
  });

  it('does not start a second run while one is in progress (trigger and cron)', async () => {
    const s = await load();
    s.init();
    let release!: () => void;
    h.runPipeline.mockImplementation(() => new Promise<null>((r) => { release = () => r(null); }));
    expect((await s.trigger('tech-trend-pipeline')).success).toBe(true);
    await vi.waitFor(() => expect(h.runPipeline).toHaveBeenCalledTimes(1));
    expect(s.isTaskRunning('tech-trend-pipeline')).toBe(true);
    expect(await s.trigger('tech-trend-pipeline')).toEqual({ success: false, message: 'Task tech-trend-pipeline is already running' });
    await cronCalls().find((c) => c.expr === '30 5 * * *')!.fn();
    expect(h.runPipeline).toHaveBeenCalledTimes(1);
    release();
    await vi.waitFor(() => expect(s.isTaskRunning('tech-trend-pipeline')).toBe(false));
  });

  it('isTaskRunning is false for unknown tasks; unknown trigger is rejected', async () => {
    const s = await load();
    s.init();
    expect(s.isTaskRunning('nope')).toBe(false);
    expect((await s.trigger('nope')).success).toBe(false);
  });
});
