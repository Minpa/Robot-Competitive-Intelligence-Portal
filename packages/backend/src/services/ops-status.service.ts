/**
 * 운영 가시성 — GET /api/admin/ops/status 응답 집계.
 * 비밀값은 포함하지 않는다(env 는 불리언/요약 값만). 일부 조회가 실패해도 해당 섹션만 { error } 로 채운다.
 */

import { computeActuatorDataKey, resolveDefaultDataDir } from '../db/apply-actuator-data-update.js';
import { dataMigrationService } from './data-migration.service.js';
import { parseMode } from './actuator-auto-apply.service.js';
import {
  PIPELINE_MARKER_KEY,
  PIPELINE_TASK_NAME,
  isStartupPipelineEnabled,
  parseAutoDomains,
  resolvePipelineCron,
} from './tech-trend-pipeline.service.js';
import { techTrendAnalysisService } from './tech-trend-analysis.service.js';
import { getTopicClassificationService } from './hand-topic-classification.service.js';
import { schedulerService } from './scheduler.service.js';

export const CRAWLER_BACKFILL_KEY = 'arxiv-backfill:actuator:12m';
export const CRAWLER_STATUS_HINT = '크롤러 서비스 GET /legal/arxiv-topic-backfill/status?domain=actuator';

type Section<T> = T | { error: string };

async function guard<T>(fn: () => Promise<T> | T): Promise<Section<T>> {
  try {
    return await fn();
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

const serializeRow = (r: { key: string; appliedAt: Date; summary: Record<string, unknown> }) => ({
  key: r.key,
  appliedAt: r.appliedAt instanceof Date ? r.appliedAt.toISOString() : r.appliedAt,
  summary: r.summary,
});

export async function getOpsStatus() {
  const domains = parseAutoDomains(process.env.TECH_TREND_AUTO_DOMAINS, () => {});

  const config = await guard(() => ({
    actuatorAutoApply: parseMode(process.env.ACTUATOR_DATA_AUTO_APPLY, () => {}),
    techTrendAutoDomains: domains,
    pipelineOnStartup: isStartupPipelineEnabled(),
    pipelineCron: resolvePipelineCron(),
    schedulerEnabled: process.env.DISABLE_SCHEDULER !== 'true',
  }));

  const dataMigrations = await guard(async () =>
    (await dataMigrationService.listRecent('actuator-update:', 20)).map(serializeRow),
  );

  const currentDataKey = await guard(async () => {
    const key = computeActuatorDataKey(resolveDefaultDataDir());
    return { key, applied: await dataMigrationService.has(key) };
  });

  const pipeline = await guard(async () => {
    const last = await guard(async () => (await dataMigrationService.get(PIPELINE_MARKER_KEY))?.summary ?? null);
    const live: Record<string, { analysis: unknown; classify: unknown }> = {};
    for (const d of domains) {
      live[d] = { analysis: techTrendAnalysisService.getStatus(d), classify: getTopicClassificationService(d).getStatus() };
    }
    return { last, running: schedulerService.isTaskRunning(PIPELINE_TASK_NAME), live };
  });

  const crawler = await guard(async () => {
    const marker = await dataMigrationService.get(CRAWLER_BACKFILL_KEY);
    return { actuatorBackfill: marker ? serializeRow(marker) : null, statusHint: CRAWLER_STATUS_HINT };
  });

  return { generatedAt: new Date().toISOString(), config, dataMigrations, currentDataKey, pipeline, crawler };
}
