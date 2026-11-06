/**
 * 데이터 커버리지 픽스처 — 합성 쿼리 결과(Res)를 실제 빌더에 통과시켜 ok / partial / empty 응답을 만든다.
 * 빌더와 지표 레지스트리가 어긋나면 계약 테스트가 깨진다.
 */
import type { DataCoverageResponse } from '../../types/data-coverage.js';
import type { Qa1Row } from '../../services/data-coverage-aggregate.js';
import { emptyFocus } from '../../services/data-coverage-aggregate.js';
import type { Qa2Row, Res } from '../../services/data-coverage-queries.js';
import { buildSections, type CoverageBundles, type SectionInputs } from '../../services/data-coverage-sections.js';

const ok = <T>(data: T): Res<T> => ({ ok: true, data });
export const fail = (reason: 'timeout' | 'query_failed' | 'too_large' = 'query_failed', message = 'boom'): Res<never> => ({ ok: false, reason, message });

export const NOW = new Date('2026-11-06T03:00:00.000Z');

const qa1Row = (o: Partial<Qa1Row>): Qa1Row => ({
  source: 'arxiv', productType: 'none', language: 'en', channel: null, thirdParty: null,
  total: 0, c7: 0, c30: 0, c90: 0, lastCollectedAt: null, companyNull: 0, publishedNull: 0, entityTitle: 0, koTitle: 0, cjkTitle: 0,
  arxivSummary: 0, arxivSummary30: 0, newsTotal: 0, newsKeyPoints: 0, news30Total: 0, news30KeyPoints: 0,
  focusHand: emptyFocus(), focusActuator: emptyFocus(), handTopics: 0, actuatorTopics: 0, ...o,
});

const qa2Row = (o: Partial<Qa2Row>): Qa2Row => ({
  domain: 'robot', total: 0, tagged: 0, taggedLlm: 0, taggedHeuristic: 0, geminiAnalyzed: 0, geminiSummaryKo: 0,
  scopeTotal: 0, scopeAnalyzed: 0, scopePending: 0, scopeExhausted: 0, noTags: 0, tooOld: 0,
  focusHand: emptyFocus(), focusActuator: emptyFocus(), focusRecent90: 0, handTopics: 0, actuatorTopics: 0, robotsNonempty: 0, robotsUntagged: 0, ...o,
});

export function okBundles(): CoverageBundles {
  return {
    qa1: ok([
      qa1Row({ source: 'arxiv', total: 400, c7: 20, c30: 80, c90: 200, lastCollectedAt: '2026-11-05T20:00:00.000Z', arxivSummary: 300, arxivSummary30: 70, companyNull: 400, publishedNull: 2, entityTitle: 3,
        focusHand: { judged: 50, primary: 20, secondary: 10, none: 20 }, focusActuator: { judged: 30, primary: 10, secondary: 5, none: 15 }, handTopics: 28, actuatorTopics: 12 }),
      qa1Row({ source: 'github', total: 60, c7: 5, c30: 20, c90: 40, lastCollectedAt: '2026-11-04T01:00:00.000Z', companyNull: 60 }),
      qa1Row({ source: 'sec_edgar', total: 10, c7: 0, c30: 1, c90: 3, companyNull: 2 }),
      qa1Row({ source: 'patent', total: 7, c7: 0, c30: 0, c90: 1 }),
      qa1Row({ source: 'YouTube — Boston Dynamics', productType: 'video', channel: 'Boston Dynamics', total: 120, c7: 6, c30: 25, c90: 60, lastCollectedAt: '2026-11-05T19:00:00.000Z', companyNull: 10, koTitle: 1 }),
      qa1Row({ source: 'YouTube — Old Channel', productType: 'video', channel: 'Old Channel', total: 15, c7: 0, c30: 0, c90: 0, lastCollectedAt: '2026-05-01T00:00:00.000Z' }),
      qa1Row({ source: 'YouTube — Random Reviewer', productType: 'video', channel: 'Random Reviewer', thirdParty: 'true', total: 9, c7: 1, c30: 4, c90: 6 }),
      qa1Row({ source: 'TechCrunch', productType: 'robot', language: 'en', total: 200, c7: 14, c30: 50, c90: 120, newsTotal: 200, newsKeyPoints: 120, news30Total: 45, news30KeyPoints: 40, entityTitle: 9, cjkTitle: 2 }),
      qa1Row({ source: 'Korea Herald', productType: 'robot', language: 'ko', total: 20, newsTotal: 20, newsKeyPoints: 5, koTitle: 20 }),
    ]),
    qa2: ok([
      qa2Row({ domain: 'robot', total: 100, tagged: 90, taggedLlm: 60, taggedHeuristic: 28, geminiAnalyzed: 30, geminiSummaryKo: 28, scopeTotal: 70, scopeAnalyzed: 25, scopePending: 40, scopeExhausted: 5, noTags: 10, tooOld: 20, robotsNonempty: 40, robotsUntagged: 6 }),
      qa2Row({ domain: 'hand', total: 50, tagged: 45, taggedLlm: 30, taggedHeuristic: 15, geminiAnalyzed: 10, geminiSummaryKo: 10, focusHand: { judged: 40, primary: 18, secondary: 12, none: 10 }, focusRecent90: 48, handTopics: 25 }),
      qa2Row({ domain: 'actuator', total: 20, tagged: 15, taggedLlm: 15, geminiAnalyzed: 2, geminiSummaryKo: 2, focusActuator: { judged: 10, primary: 4, secondary: 2, none: 4 }, focusRecent90: 18, actuatorTopics: 5 }),
      qa2Row({ domain: null, total: 5, tagged: 0 }),
    ]),
    qa6: ok({
      rowsScanned: 840,
      urlNorm: { groups: 4, rowsInGroups: 9, redundantRows: 5 },
      arxivId: { groups: 2, rowsInGroups: 4, redundantRows: 2 },
      videoId: { groups: 1, rowsInGroups: 2, redundantRows: 1 },
      unparsableUrl: 1,
      samples: [{ kind: 'urlNorm', key: 'https://example.com/a', size: 3, ids: ['a1', 'a2', 'a3'] }],
    }),
    robots: ok({ total: 40, confirmed: 34, forecast: 6, noBodySpecs: 3 }),
    bodyFields: ok({ total: 34, nulls: { height_cm: 2, weight_kg: 4, payload_kg: 10, dof_count: 5, max_speed_mps: 12, operation_time_hours: 15 } }),
    handFields: ok({ total: 34, nulls: { hand_type: 3, finger_count: 9, hand_dof: 14, grip_force_n: 25 } }),
    powerFields: ok({ total: 34, nulls: { battery_type: 12, capacity_wh: 20, operation_time_hours: 18, charging_method: 22 } }),
    components: ok({
      byType: [{ type: 'actuator', count: 50, emptySpecs: 4 }, { type: 'soc', count: 12, emptySpecs: 0 }],
      specKeys: [{ type: 'actuator', key: 'actuatorType', count: 40 }, { type: 'actuator', key: 'weightKg', count: 30 }, { type: 'soc', key: 'topsMax', count: 10 }],
    }),
    supplier: ok({ total: 30, missing: { torque: 5, weight: 8, diameter: 12, price: 25 } }),
    sourcing: ok({ rows: [{ sourcing: 'unknown', count: 10 }, { sourcing: 'external', count: 8 }, { sourcing: 'in_house_presumed', count: 4 }], unsourced: 2 }),
    ci: ok({ competitors: 10, items: 100, byConfidence: [{ confidence: 'A', count: 100 }, { confidence: 'B', count: 200 }, { confidence: 'D', count: 300 }, { confidence: 'F', count: 50 }, { confidence: null, count: 5 }] }),
    ciByLayer: ok([{ slug: 'hw', name: 'HW', expected: 500, filled: 400, low: 120 }, { slug: 'sw', name: 'SW', expected: 500, filled: 255, low: 230 }]),
    ciStaging: ok({ pending: 7, byType: [{ updateType: 'value_update', count: 7 }], oldestCreatedAt: '2026-10-01T00:00:00.000Z' }),
    handBenchmark: ok({ competitors: 8, axes: 6, scores: 40 }),
    aiProvider: ok([{ provider: 'claude', calls: 120, inputTokens: 800000, outputTokens: 200000, costUsd: 12.5 }, { provider: 'gemini', calls: 40, inputTokens: 300000, outputTokens: 20000, costUsd: 1.2 }]),
    aiTag: ok([{ tag: 'weekly-brief', calls: 20, inputTokens: 500000, outputTokens: 100000, costUsd: 8, totalCostUsd: 13.7 }, { tag: '(untagged)', calls: 3, inputTokens: 1, outputTokens: 1, costUsd: 0.5, totalCostUsd: 13.7 }]),
    aiLoggedTags: ok([{ tag: 'video-tagging', calls: 12 }]),
    autoCompanies: ok({ count: 3, total: 200, samples: [{ name: 'Acme Robotics', articles: 4, robots: 0 }] }),
    crawl: ok({
      targets: { total: 12, enabled: 11, disabled: 1, neverCrawled: 12, lastCrawledMax: null },
      jobsByStatus: [{ status: 'completed', total: 3, last7d: 0 }, { status: 'weird', total: 1, last7d: 0 }],
      stuckRunning: 0,
      last30d: { jobs: 0, success: 0, failure: 0, duplicate: 0 },
    }),
    crawlErrors: ok([{ errorType: 'timeout', message: 'GET https://x.test/a', count: 4 }]),
    collect: ok({
      updatedAt: '2026-11-06T01:00:00.000Z',
      config: { youtubeApiKeyConfigured: true, githubTokenConfigured: false, htmlCrawlerEnabled: false, legalCollectDisabled: false, collectOnStartup: true },
      collectors: {
        legal: { finishedAt: '2026-11-06T00:10:00.000Z', trigger: 'cron', ok: true, durationMs: 4000, saved: 12, errorCount: 0, bySource: [{ source: 'arxiv', success: true, count: 8, error: null }, { source: 'github', success: true, count: 4, error: null }] },
        arxivHand: { finishedAt: '2026-11-06T00:12:00.000Z', trigger: 'cron', ok: true, durationMs: 1000, saved: 3, errorCount: 0 },
        youtube: {
          finishedAt: '2026-11-06T00:20:00.000Z', trigger: 'cron', ok: true, durationMs: 9000, saved: 20, errorCount: 1, channelsProcessed: 40, channelsSkipped: 2, searchCalls: 0, quotaExhausted: false,
          skippedChannels: [{ name: 'Ghost Channel', reason: 'handle_unresolved' }],
          channels: [{ name: 'Boston Dynamics', official: true, status: 'ok', fetched: 10, inserted: 2 }, { name: 'Ghost Channel', official: true, status: 'skipped', fetched: 0, inserted: 0 }],
        },
        eventSearch: { finishedAt: '2026-11-06T00:25:00.000Z', trigger: 'cron', ok: true, durationMs: 500, saved: 1, errorCount: 0, quotaExhausted: false, searchCalls: 3, estimatedQuotaUnits: 300 },
        topicSearch: { finishedAt: '2026-11-06T00:30:00.000Z', trigger: 'cron', ok: true, durationMs: 800, saved: 2, errorCount: 0, quotaExhausted: false, searchCalls: 5, estimatedQuotaUnits: 500 },
      },
    }),
    audit: ok({
      runId: null, runAt: '2026-11-03T18:00:00.000Z', totalRobots: 40, criticalCount: 2, warningCount: 10, okCount: 28, averageCompleteness: 62.5,
      topMissingSpecs: [{ specType: 'sensor', missingCount: 20 }, { specType: 'hand', missingCount: 5 }], staleRobotCount: 9, robotResults: [],
    }),
  };
}

export function inputsFor(bundles: CoverageBundles): SectionInputs {
  return {
    now: NOW,
    monthStart: new Date(2026, 10, 1),
    bundles,
    limits: { claudeMonthlyLimitUsd: 50, videoTaggingDailyLimit: 300, paperSummaryDailyLimit: 300, geminiBatchLimit: 20 },
    geminiScope: { domainFilter: ['robot'], sinceDays: 180, requireDemoSignal: true, maxAttempts: 2 },
  };
}

function wrap(sections: ReturnType<typeof buildSections>): DataCoverageResponse {
  return {
    schemaVersion: 1,
    generatedAt: NOW.toISOString(),
    cache: { hit: false, stale: false, ageSec: 0, ttlSec: 600 },
    partial: sections.some((s) => s.status === 'failed' || s.status === 'partial'),
    compare: { requestedDate: null, baselineDate: null, baselineTakenAt: null, availableDates: [], reason: 'no_snapshot' },
    sections,
  };
}

export const coverageOkSample: DataCoverageResponse = wrap(buildSections(inputsFor(okBundles())));

export const coveragePartialSample: DataCoverageResponse = wrap(
  buildSections(inputsFor({ ...okBundles(), qa2: fail('timeout', 'canceling statement due to statement timeout'), ciByLayer: fail() })),
);

export const coverageEmptySample: DataCoverageResponse = wrap(
  buildSections(
    inputsFor({
      ...okBundles(),
      qa1: ok([]),
      qa2: ok([]),
      qa6: ok({ rowsScanned: 0, urlNorm: { groups: 0, rowsInGroups: 0, redundantRows: 0 }, arxivId: { groups: 0, rowsInGroups: 0, redundantRows: 0 }, videoId: { groups: 0, rowsInGroups: 0, redundantRows: 0 }, unparsableUrl: 0, samples: [] }),
      collect: ok(null),
      audit: ok(null),
    }),
  ),
);
