/**
 * 일일 기술 트렌드 파이프라인 — 도메인별로 (1) Gemini 영상 분석·판정 → (2) 서브토픽 분류를 순차 실행한다.
 *
 * - 서비스(tech-trend-analysis / hand-topic-classification)는 수정하지 않고 공개 start()/getStatus()/isConfigured() 만 쓴다.
 *   MAX_PER_RUN 등 상한은 서비스가 읽는 값을 그대로 쓴다 (여기서 우회/재정의하지 않는다).
 * - 완료 감지는 getStatus().running === false 폴링. 분석 완료 후 10초 유예(캐시 무효화 대기) 뒤 분류를 시작한다.
 * - 실행 결과는 data_migrations 'pipeline:last' 에 upsert. 어떤 경우에도 throw 하지 않는다.
 */

import {
  ANALYZE_SUPPORTED_DOMAINS,
  techTrendAnalysisService,
  type AnalysisRunState,
} from './tech-trend-analysis.service.js';
import {
  CLASSIFY_SUPPORTED_DOMAINS,
  getTopicClassificationService,
  type ClassifyRunState,
} from './hand-topic-classification.service.js';
import { videoContentAnalysisService } from './video-content-analysis.service.js';
import { dataMigrationService } from './data-migration.service.js';
import type { TimelineDomain } from './domain-topics.js';
import { formatLogLine } from './ops-log.util.js';

const TAG = 'TechTrendPipeline';

export const PIPELINE_TASK_NAME = 'tech-trend-pipeline';
export const PIPELINE_MARKER_KEY = 'pipeline:last';
export const DEFAULT_PIPELINE_CRON = '30 5 * * *';
export const DEFAULT_AUTO_DOMAINS = 'actuator,hand';
/** 분석 종료 후 캐시 무효화(finish 이벤트 이후 await)가 끝나도록 두는 유예 */
export const ANALYSIS_GRACE_MS = 10_000;
export const STATUS_POLL_MS = 5_000;
export const BUSY_POLL_MS = 30_000;

export type PipelineReason = 'cron' | 'startup' | 'manual';
export type PipelineStatus = 'ok' | 'partial' | 'skipped' | 'failed';

export type StepResult = Record<string, unknown>;

export interface DomainResult {
  domain: TimelineDomain;
  analysis: StepResult | null;
  classify: StepResult | null;
  error?: string;
}

export interface PipelineResult {
  status: PipelineStatus;
  reason: PipelineReason;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  skipped?: 'busy';
  domains: DomainResult[];
  config: { domains: TimelineDomain[]; days: number };
}

// ─────────────────────────────────────────────────────────────────────────────
// 설정 파싱 (순수)
// ─────────────────────────────────────────────────────────────────────────────

type Env = Record<string, string | undefined>;

/**
 * TECH_TREND_AUTO_DOMAINS — 쉼표 구분, 나열 순서 유지, 중복 제거.
 * 분석·분류 둘 다 지원하는 도메인만 유효. 미설정이면 기본 'actuator,hand', 빈 값이면 빈 배열(비활성).
 */
export function parseAutoDomains(
  raw: string | undefined,
  warn: (msg: string) => void = (m) => console.warn(formatLogLine(TAG, { warn: m })),
): TimelineDomain[] {
  const value = raw === undefined ? DEFAULT_AUTO_DOMAINS : raw;
  const valid = (CLASSIFY_SUPPORTED_DOMAINS as readonly string[]).filter((d) =>
    (ANALYZE_SUPPORTED_DOMAINS as readonly string[]).includes(d),
  );
  const out: TimelineDomain[] = [];
  for (const part of value.split(',').map((s) => s.trim()).filter(Boolean)) {
    if (!valid.includes(part)) {
      warn(`unsupported domain "${part}" ignored in TECH_TREND_AUTO_DOMAINS`);
      continue;
    }
    if (!out.includes(part as TimelineDomain)) out.push(part as TimelineDomain);
  }
  return out;
}

function intEnv(raw: string | undefined, fallback: number, min: number, max: number): number {
  const n = parseInt(raw ?? '', 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** 분석 대상 기간(일) — 7~90 클램프, 기본 90 */
export function resolveAutoDays(raw: string | undefined): number {
  return intEnv(raw, 90, 7, 90);
}

export function resolvePipelineCron(env: Env = process.env): string {
  return env.CRON_TECH_TREND_PIPELINE || DEFAULT_PIPELINE_CRON;
}

export function isStartupPipelineEnabled(env: Env = process.env): boolean {
  return env.TECH_TREND_PIPELINE_ON_STARTUP !== 'false';
}

export function resolveStartupDelayMs(env: Env = process.env): number {
  return intEnv(env.TECH_TREND_PIPELINE_STARTUP_DELAY_SEC, 600, 0, 86_400) * 1000;
}

/** 직전 완료(finishedAt)로부터 minGapHours 이내면 기동 실행을 건너뛴다. 이력이 없으면 실행. */
export function shouldRunStartupPipeline(lastFinishedAt: Date | null, now: Date, minGapHours: number): boolean {
  if (!lastFinishedAt) return true;
  const gapMs = now.getTime() - lastFinishedAt.getTime();
  return gapMs >= minGapHours * 3_600_000;
}

/** pipeline:last 요약에서 "실제로 일을 한" 완료 시각(ok/partial 만). skipped/failed 는 간격 가드에 쓰지 않는다. */
export function lastCompletedAt(summary: Record<string, unknown> | null | undefined): Date | null {
  if (!summary) return null;
  if (summary.status !== 'ok' && summary.status !== 'partial') return null;
  const t = typeof summary.finishedAt === 'string' ? new Date(summary.finishedAt) : null;
  return t && !Number.isNaN(t.getTime()) ? t : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 의존성 (테스트에서 주입)
// ─────────────────────────────────────────────────────────────────────────────

export interface ClassifierLike {
  isConfigured(): boolean;
  start(): Promise<{ ok: false; reason: string } | { ok: true; alreadyRunning?: true; queued: number; total: number }>;
  getStatus(): ClassifyRunState;
}

export interface PipelineDeps {
  env: Env;
  now(): Date;
  geminiConfigured(): boolean;
  analysis: {
    start(domain: TimelineDomain, days: number): Promise<{ ok: false; reason: string } | { ok: true; alreadyRunning?: true; queued: number; total: number }>;
    getStatus(domain: TimelineDomain): AnalysisRunState;
  };
  classifier(domain: TimelineDomain): ClassifierLike;
  isTaskRunning(name: string): Promise<boolean> | boolean;
  saveResult(result: PipelineResult): Promise<void>;
  log: { info(line: string): void; warn(line: string): void; error(line: string): void };
}

/** 기동 시 태깅 체인(index.ts 의 60초 후 체인) 실행 여부 — Gemini 영상 분석과 겹치지 않도록 파이프라인이 대기한다. */
let startupChainRunning = false;
export function setStartupChainRunning(running: boolean): void {
  startupChainRunning = running;
}
export function isStartupChainRunning(): boolean {
  return startupChainRunning;
}

export const defaultDeps: PipelineDeps = {
  get env() { return process.env; },
  now: () => new Date(),
  geminiConfigured: () => videoContentAnalysisService.isConfigured(),
  analysis: techTrendAnalysisService,
  classifier: (d) => getTopicClassificationService(d),
  // scheduler.service 가 이 모듈을 import 하므로 순환을 피하려고 호출 시점에 로드한다
  isTaskRunning: async (name) => {
    const { schedulerService } = await import('./scheduler.service.js');
    return schedulerService.isTaskRunning(name);
  },
  saveResult: (result) => dataMigrationService.upsert(PIPELINE_MARKER_KEY, result as unknown as Record<string, unknown>),
  log: {
    info: (l) => console.log(l),
    warn: (l) => console.warn(l),
    error: (l) => console.error(l),
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 실행
// ─────────────────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** cond() 가 true 가 될 때까지 폴링. 시간 안에 true 면 true, 초과면 false. */
async function pollUntil(cond: () => boolean | Promise<boolean>, timeoutMs: number, intervalMs: number): Promise<boolean> {
  let waited = 0;
  while (true) {
    if (await cond()) return true;
    if (waited >= timeoutMs) return false;
    const step = Math.min(intervalMs, timeoutMs - waited);
    await sleep(step);
    waited += step;
  }
}

function analysisSnapshot(s: AnalysisRunState): StepResult {
  return {
    total: s.total, analyzed: s.analyzed, judged: s.judged, excluded: s.excluded, failed: s.failed,
    skipped: s.skipped, quotaHit: s.quotaHit, budgetHit: s.budgetHit, judgeSkipped: s.judgeSkipped,
  };
}

function classifySnapshot(s: ClassifyRunState): StepResult {
  return { total: s.total, classified: s.classified, offTopic: s.offTopic, unresolved: s.unresolved, aborted: s.aborted };
}

type StepOutcome = 'done' | 'skipped' | 'timeout' | 'error';

function outcomeOf(step: StepResult | null): StepOutcome {
  if (!step) return 'skipped';
  if ('error' in step) return 'error';
  if ('timeout' in step) return 'timeout';
  if ('skipped' in step && typeof step.skipped === 'string') return 'skipped';
  return 'done';
}

export function summarizeStatus(domains: DomainResult[]): PipelineStatus {
  const outcomes = domains.flatMap((d) => [outcomeOf(d.analysis), outcomeOf(d.classify)]);
  const bad = outcomes.filter((o) => o === 'error' || o === 'timeout').length + domains.filter((d) => d.error).length;
  const done = outcomes.filter((o) => o === 'done').length;
  if (bad > 0 && done === 0) return 'failed';
  if (bad > 0) return 'partial';
  if (done === 0) return 'skipped';
  return 'ok';
}

/**
 * 파이프라인 1회 실행. 어떤 경우에도 throw 하지 않는다.
 * 동시 실행 방지는 스케줄러 registerTask/trigger 의 isRunning 가드가 담당한다.
 */
export async function runTechTrendPipeline(
  opts: { reason: PipelineReason },
  deps: PipelineDeps = defaultDeps,
): Promise<PipelineResult | null> {
  const { env, log } = deps;
  const reason = opts.reason;
  const started = deps.now();
  try {
    const domains = parseAutoDomains(env.TECH_TREND_AUTO_DOMAINS, (m) => log.warn(formatLogLine(TAG, { warn: m })));
    if (domains.length === 0) {
      log.info(formatLogLine(TAG, { reason, status: 'skipped', detail: 'no domains (TECH_TREND_AUTO_DOMAINS empty)' }));
      return null;
    }
    const days = resolveAutoDays(env.TECH_TREND_AUTO_DAYS);
    const stepTimeoutMs = intEnv(env.TECH_TREND_PIPELINE_STEP_TIMEOUT_MIN, 90, 1, 1440) * 60_000;
    const busyWaitMs = intEnv(env.TECH_TREND_PIPELINE_BUSY_WAIT_MIN, 60, 0, 1440) * 60_000;
    const config = { domains, days };

    const finalize = async (partial: Omit<PipelineResult, 'finishedAt' | 'durationMs' | 'startedAt' | 'reason' | 'config'>): Promise<PipelineResult> => {
      const finished = deps.now();
      const result: PipelineResult = {
        ...partial,
        reason,
        startedAt: started.toISOString(),
        finishedAt: finished.toISOString(),
        durationMs: finished.getTime() - started.getTime(),
        config,
      };
      try {
        await deps.saveResult(result);
      } catch (err) {
        log.error(formatLogLine(TAG, { reason, status: 'error', detail: { saveResult: (err as Error).message } }));
      }
      log.info(formatLogLine(TAG, { reason, status: result.status, durationMs: result.durationMs, domains: domains.join(',') }));
      return result;
    };

    log.info(formatLogLine(TAG, { reason, status: 'started', detail: config }));

    // 다른 Gemini 작업(태깅 체인의 영상 분석 포함)이 끝나기를 대기
    const isBusy = async () => (await deps.isTaskRunning('video-tagging')) || isStartupChainRunning();
    if (await isBusy()) {
      log.warn(formatLogLine(TAG, { reason, status: 'waiting', detail: 'video-tagging/startup chain running' }));
      const free = await pollUntil(async () => !(await isBusy()), busyWaitMs, BUSY_POLL_MS);
      if (!free) {
        log.warn(formatLogLine(TAG, { reason, status: 'skipped', detail: 'busy' }));
        return await finalize({ status: 'skipped', skipped: 'busy', domains: [] });
      }
    }

    const results: DomainResult[] = [];
    for (const domain of domains) {
      const r: DomainResult = { domain, analysis: null, classify: null };
      const step = (name: 'analysis' | 'classify', status: string, detail?: unknown) => {
        const line = formatLogLine(TAG, { reason, domain, step: name, status, detail: detail as object | undefined });
        (status === 'error' || status === 'timeout' ? log.warn : log.info)(line);
      };
      try {
        // (a) 분석·판정
        let analysisBlocked = false;
        if (!deps.geminiConfigured()) {
          r.analysis = { skipped: 'gemini_not_configured' };
          step('analysis', 'skipped', r.analysis);
          log.warn(formatLogLine(TAG, { reason, domain, warn: 'GEMINI_API_KEY not configured — analysis skipped' }));
        } else {
          step('analysis', 'started');
          const s = await deps.analysis.start(domain, days);
          if (!s.ok) {
            r.analysis = { skipped: s.reason };
            step('analysis', 'skipped', r.analysis);
          } else if (s.alreadyRunning) {
            r.analysis = { skipped: 'already_running' };
            r.classify = { skipped: 'analysis_running' };
            step('analysis', 'skipped', r.analysis);
            analysisBlocked = true;
          } else {
            if (s.queued > 0) {
              const finished = await pollUntil(() => !deps.analysis.getStatus(domain).running, stepTimeoutMs, STATUS_POLL_MS);
              if (!finished) {
                r.analysis = { timeout: true, ...analysisSnapshot(deps.analysis.getStatus(domain)) };
                r.classify = { skipped: 'analysis_timeout' };
                step('analysis', 'timeout', r.analysis);
                analysisBlocked = true;
              } else {
                await sleep(ANALYSIS_GRACE_MS);
              }
            }
            if (!analysisBlocked) {
              r.analysis = { queued: s.queued, ...analysisSnapshot(deps.analysis.getStatus(domain)) };
              step('analysis', 'done', r.analysis);
            }
          }
        }
        if (analysisBlocked) {
          results.push(r);
          continue;
        }

        // (b) 서브토픽 분류
        const svc = deps.classifier(domain);
        if (!svc.isConfigured()) {
          r.classify = { skipped: 'anthropic_not_configured' };
          step('classify', 'skipped', r.classify);
          log.warn(formatLogLine(TAG, { reason, domain, warn: 'ANTHROPIC_API_KEY not configured — classify skipped' }));
        } else {
          step('classify', 'started');
          const s = await svc.start();
          if (!s.ok) {
            r.classify = { skipped: s.reason };
            step('classify', 'skipped', r.classify);
          } else if (s.alreadyRunning) {
            r.classify = { skipped: 'already_running' };
            step('classify', 'skipped', r.classify);
          } else {
            let timedOut = false;
            if (s.queued > 0) {
              const finished = await pollUntil(() => !svc.getStatus().running, stepTimeoutMs, STATUS_POLL_MS);
              timedOut = !finished;
            }
            r.classify = { queued: s.queued, ...(timedOut ? { timeout: true } : {}), ...classifySnapshot(svc.getStatus()) };
            step('classify', timedOut ? 'timeout' : 'done', r.classify);
          }
        }
      } catch (err) {
        r.error = err instanceof Error ? err.message : String(err);
        step(r.analysis ? 'classify' : 'analysis', 'error', { error: r.error });
      }
      results.push(r);
    }

    return await finalize({ status: summarizeStatus(results), domains: results });
  } catch (err) {
    log.error(formatLogLine(TAG, { reason, status: 'error', detail: { error: err instanceof Error ? err.message : String(err) } }));
    return null;
  }
}

/**
 * 기동 시 1회 실행 판정·예약 본체 (index.ts 의 setTimeout 콜백에서 호출).
 * trigger 는 scheduler.trigger('tech-trend-pipeline', 'startup') — 스케줄러의 isRunning 가드를 재사용한다.
 */
export async function runStartupPipelineIfDue(
  trigger: () => Promise<{ success: boolean; message: string }>,
  deps: { env?: Env; now?: () => Date; getLast?: () => Promise<Record<string, unknown> | null> } = {},
): Promise<'triggered' | 'skipped'> {
  const env = deps.env ?? process.env;
  const now = (deps.now ?? (() => new Date()))();
  try {
    if (parseAutoDomains(env.TECH_TREND_AUTO_DOMAINS).length === 0) {
      console.log(formatLogLine(TAG, { reason: 'startup', status: 'skipped', detail: 'no domains' }));
      return 'skipped';
    }
    const minGap = intEnv(env.TECH_TREND_PIPELINE_MIN_GAP_HOURS, 12, 0, 24 * 30);
    const getLast = deps.getLast ?? (async () => (await dataMigrationService.get(PIPELINE_MARKER_KEY))?.summary ?? null);
    const last = lastCompletedAt(await getLast());
    if (!shouldRunStartupPipeline(last, now, minGap)) {
      console.log(formatLogLine(TAG, { reason: 'startup', status: 'skipped', detail: { minGapHours: minGap, lastFinishedAt: last?.toISOString() } }));
      return 'skipped';
    }
    const r = await trigger();
    if (!r.success) {
      console.warn(formatLogLine(TAG, { reason: 'startup', status: 'skipped', detail: r.message }));
      return 'skipped';
    }
    return 'triggered';
  } catch (err) {
    console.error(formatLogLine(TAG, { reason: 'startup', status: 'error', detail: { error: (err as Error).message } }));
    return 'skipped';
  }
}
