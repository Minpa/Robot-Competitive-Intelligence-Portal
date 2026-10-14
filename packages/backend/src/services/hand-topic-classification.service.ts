/**
 * HandTopicClassificationService — 핸드 논문·영상 기술 서브토픽 분류 배치 (Claude Haiku 5.5)
 *
 * 이벤트성 관리자 배치. 타임라인 스코프 행(논문 + 영상, domainFocus 'none' 제외) 중 현재 버전으로 분류되지 않은 건을
 * 10~20건 묶음으로 Haiku 5.5에 보내 extracted_metadata.handTopics 에 병합 저장한다.
 *
 * 안전 원칙:
 *  - 입력은 제목·설명·초록 발췌·AI 요약·태그뿐 (articles.content / 자막 전문 미사용).
 *  - AI 실패/파싱 실패를 off_topic 으로 취급하지 않는다 (미분류 유지 + handTopicsAttempts +1, 3회 도달 시 자동 재시도 중단).
 *  - 저장은 `|| jsonb_build_object(...)` 단일 UPDATE 병합이라 geminiAnalysis/domainFocus/aiTags 를 건드리지 않는다.
 *  - 상태는 인메모리. 마커가 DB에 있으므로 재실행은 멱등(남은 건만 이어서 처리).
 */

import Anthropic from '@anthropic-ai/sdk';
import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { aiUsageService } from './ai-usage.service.js';
import { getDomainFocus, type ArticleRow } from './tech-trend-report.service.js';
import { effortParams, extractText, resolveHandTopicModel, warnOnAbnormalStop } from './anthropic-models.js';
import {
  HAND_TOPIC_VERSION,
  buildHandTopicPrompt,
  getHandTopics,
  getHandTopicsAttempts,
  isVideoRow,
  parseHandTopicBatch,
  toTopicInput,
  OFF_TOPIC_ID,
  type InputLevel,
} from './hand-topics.js';
import { techTrendTimelineService, MAX_CLASSIFY_ATTEMPTS } from './tech-trend-timeline.service.js';

// ─────────────────────────────────────────────────────────────────────────────
// 상수 / 설정
// ─────────────────────────────────────────────────────────────────────────────

export const CLASSIFY_SUPPORTED_DOMAINS = ['hand'] as const;

/** 서브토픽 분류 모델 — 기본 Haiku 5.5. 시사점/해설(종합) 모델 설정을 상속하지 않는다. */
export const HAND_TOPIC_MODEL = resolveHandTopicModel();

export const BATCH_SIZE_MIN = 10;
export const BATCH_SIZE_MAX = 20;
export const BATCH_SIZE_DEFAULT = 15;
export const MAX_PER_RUN_DEFAULT = 1000;
/** 연속 이 개수의 묶음이 API 오류로 실패하면 중단 */
export const MAX_CONSECUTIVE_BATCH_FAILURES = 3;
/** Haiku 5.5 는 사고 토큰이 max_tokens 에 포함되므로 여유 있게 잡는다 */
export const CLASSIFY_MAX_TOKENS = 6000;

/** 묶음 크기 — 10~20 범위로 보정, 비정상 값은 기본 15 */
export function resolveBatchSize(raw: string | undefined): number {
  const n = parseInt(raw ?? '', 10);
  if (!Number.isFinite(n) || n <= 0) return BATCH_SIZE_DEFAULT;
  return Math.min(BATCH_SIZE_MAX, Math.max(BATCH_SIZE_MIN, n));
}

export function resolveMaxPerRun(raw: string | undefined): number {
  const n = parseInt(raw ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : MAX_PER_RUN_DEFAULT;
}

const BATCH_SIZE = resolveBatchSize(process.env.HAND_TOPIC_BATCH_SIZE);
const MAX_PER_RUN = resolveMaxPerRun(process.env.HAND_TOPIC_MAX_PER_RUN);

// ─────────────────────────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────────────────────────

export interface ClassifyRunState {
  running: boolean;
  total: number;
  processed: number;
  classified: number;
  offTopic: number;
  unresolved: number;
  skippedExcluded: number;
  aborted: boolean;
  /** 연속 실패 묶음 수 (3 도달 시 aborted) */
  consecutiveFailures: number;
  startedAt: string | null;
  finishedAt: string | null;
}

export type ClassifyEvent =
  | { type: 'start'; total: number; skippedExcluded: number; now: string }
  /** 응답을 받은 묶음 — size 중 classified/offTopic 외는 미해결 */
  | { type: 'batchOk'; size: number; classified: number; offTopic: number }
  /** API 오류로 응답을 못 받은 묶음 */
  | { type: 'batchFailed'; size: number }
  | { type: 'finish'; now: string };

export type ClassifyStartResult =
  | { ok: false; reason: 'anthropic_not_configured' }
  | { ok: true; alreadyRunning?: true; queued: number; total: number };

// ─────────────────────────────────────────────────────────────────────────────
// 순수 함수
// ─────────────────────────────────────────────────────────────────────────────

export function initialClassifyState(): ClassifyRunState {
  return {
    running: false,
    total: 0,
    processed: 0,
    classified: 0,
    offTopic: 0,
    unresolved: 0,
    skippedExcluded: 0,
    aborted: false,
    consecutiveFailures: 0,
    startedAt: null,
    finishedAt: null,
  };
}

/** 진행 상태 리듀서 — processed는 total을 넘지 않는다. */
export function reduceClassifyState(state: ClassifyRunState, event: ClassifyEvent): ClassifyRunState {
  const bump = (s: ClassifyRunState, n: number): ClassifyRunState => ({
    ...s,
    processed: Math.min(s.total, s.processed + n),
  });
  switch (event.type) {
    case 'start':
      return {
        ...initialClassifyState(),
        running: true,
        total: event.total,
        skippedExcluded: event.skippedExcluded,
        startedAt: event.now,
      };
    case 'batchOk': {
      const resolved = event.classified + event.offTopic;
      return bump(
        {
          ...state,
          classified: state.classified + event.classified,
          offTopic: state.offTopic + event.offTopic,
          unresolved: state.unresolved + Math.max(0, event.size - resolved),
          consecutiveFailures: 0,
        },
        event.size
      );
    }
    case 'batchFailed': {
      const failures = state.consecutiveFailures + 1;
      return bump(
        {
          ...state,
          unresolved: state.unresolved + event.size,
          consecutiveFailures: failures,
          aborted: state.aborted || failures >= MAX_CONSECUTIVE_BATCH_FAILURES,
        },
        event.size
      );
    }
    case 'finish':
      return { ...state, running: false, finishedAt: event.now };
    default:
      return state;
  }
}

function rowTime(r: ArticleRow): number {
  const v = r.publishedAt ?? r.collectedAt;
  if (!v) return 0;
  const t = (v instanceof Date ? v : new Date(v)).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * 분류 대상 선정 — 현재 버전으로 분류되지 않은 건(off_topic 으로 저장된 건도 "분류됨"),
 * handTopicsAttempts < maxAttempts, 영상은 domainFocus.hand !== 'none'.
 * 논문·영상을 최신순으로 섞어 cap 까지.
 */
export function selectClassificationTargets(
  rows: ArticleRow[],
  opts: { cap: number; maxAttempts?: number; version?: number }
): { targets: ArticleRow[]; skippedExcluded: number } {
  const maxAttempts = opts.maxAttempts ?? MAX_CLASSIFY_ATTEMPTS;
  const version = opts.version ?? HAND_TOPIC_VERSION;
  let skippedExcluded = 0;
  const pending: ArticleRow[] = [];
  for (const r of rows) {
    if (isVideoRow(r) && getDomainFocus('hand', r) === 'none') {
      skippedExcluded++;
      continue;
    }
    if (getHandTopics(r, version)) continue;
    if (getHandTopicsAttempts(r) >= maxAttempts) continue;
    pending.push(r);
  }
  pending.sort((a, b) => rowTime(b) - rowTime(a) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { targets: pending.slice(0, opts.cap), skippedExcluded };
}

/** 배열을 size 단위로 분할 (마지막 묶음은 나머지) */
export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 서비스
// ─────────────────────────────────────────────────────────────────────────────

class HandTopicClassificationService {
  private anthropicClient: Anthropic | null = null;
  private state: ClassifyRunState = initialClassifyState();
  /** in-flight 가드 (버튼 연타·다중 탭 시 중복 분류 방지) */
  private running = false;

  constructor() {
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
  }

  isConfigured(): boolean {
    return this.anthropicClient !== null;
  }

  getStatus(): ClassifyRunState {
    return this.state;
  }

  private emit(event: ClassifyEvent): void {
    this.state = reduceClassifyState(this.state, event);
  }

  /** 배치 시작 — 대상 선정까지 동기 처리하고 실제 분류는 백그라운드로 실행한다. */
  async start(): Promise<ClassifyStartResult> {
    if (!this.anthropicClient) return { ok: false, reason: 'anthropic_not_configured' };
    if (this.running) {
      console.warn('[HandTopic] batch already running — duplicate request ignored');
      return { ok: true, alreadyRunning: true, queued: 0, total: this.state.total };
    }
    // await 이전에 가드를 걸어 동시 요청 레이스를 막는다
    this.running = true;

    let started = false;
    try {
      const scope = await techTrendTimelineService.getScopeRows();
      const { targets, skippedExcluded } = selectClassificationTargets([...scope.papers, ...scope.videos], {
        cap: MAX_PER_RUN,
      });
      const now = new Date().toISOString();

      if (targets.length === 0) {
        this.state = { ...initialClassifyState(), skippedExcluded, startedAt: now, finishedAt: now };
        return { ok: true, queued: 0, total: 0 };
      }

      this.emit({ type: 'start', total: targets.length, skippedExcluded, now });
      started = true;
      void this.runBatch(targets);
      return { ok: true, queued: targets.length, total: targets.length };
    } finally {
      // 시작에 실패했거나 대상이 없으면 여기서 가드 해제 (시작된 배치는 runBatch의 finally가 해제)
      if (!started) this.running = false;
    }
  }

  private async runBatch(targets: ArticleRow[]): Promise<void> {
    try {
      for (const group of chunk(targets, BATCH_SIZE)) {
        await this.classifyBatch(group);
        if (this.state.aborted) {
          console.warn(
            `[HandTopic] ${MAX_CONSECUTIVE_BATCH_FAILURES} consecutive batch failures — aborting (processed ${this.state.processed}/${this.state.total})`
          );
          break;
        }
      }
    } catch (err) {
      console.error('[HandTopic] batch failed:', (err as Error).message);
    } finally {
      this.emit({ type: 'finish', now: new Date().toISOString() });
      this.running = false;
      const s = this.state;
      console.log(
        `[HandTopic] done — classified ${s.classified}, offTopic ${s.offTopic}, unresolved ${s.unresolved}, aborted ${s.aborted}`
      );
      if (s.classified > 0 || s.offTopic > 0) {
        await techTrendTimelineService.invalidate();
        // 무효화 직후 시사점·시계열 해설을 백그라운드로 미리 재생성 (실패해도 배치 결과에 영향 없음)
        void import('./tech-trend-timeline-insight.service.js')
          .then((m) => m.warmHandInsights())
          .catch((err) => console.error('[HandTopic] insight warm-up failed:', (err as Error).message));
      }
    }
  }

  /** 묶음 분류 — 응답을 못 받았거나 파싱 실패한 항목은 미분류로 두고 attempts +1 */
  private async classifyBatch(batch: ArticleRow[]): Promise<void> {
    if (!this.anthropicClient) return;
    const converted = batch.map((row, i) => ({ row, ...toTopicInput(row, i + 1) }));
    const validN = new Set(converted.map((c) => c.input.n));
    const resolvedN = new Set<number>();
    let classified = 0;
    let offTopic = 0;
    let apiFailed = false;

    try {
      const response = await this.anthropicClient.messages.create({
        model: HAND_TOPIC_MODEL,
        max_tokens: CLASSIFY_MAX_TOKENS,
        messages: [{ role: 'user', content: buildHandTopicPrompt(converted.map((c) => c.input)) }],
        ...effortParams(HAND_TOPIC_MODEL, 'low'),
      });
      aiUsageService
        .logUsage({
          provider: 'claude',
          model: HAND_TOPIC_MODEL,
          webSearch: false,
          inputTokens: response.usage?.input_tokens ?? 0,
          outputTokens: response.usage?.output_tokens ?? 0,
          query: `[hand-topic] hand ${batch.length}건`,
        })
        .catch(() => {});

      warnOnAbnormalStop('HandTopic', HAND_TOPIC_MODEL, response);
      const combined = extractText(response.content);
      for (const r of parseHandTopicBatch(combined, validN)) {
        const target = converted[r.n - 1];
        if (!target) continue;
        try {
          await this.saveHandTopics(target.row.id, r.topics, r.primary, target.inputLevel);
          resolvedN.add(r.n);
          if (r.primary === OFF_TOPIC_ID) offTopic++;
          else classified++;
        } catch (err) {
          console.error(`[HandTopic] saving failed for ${target.row.id}:`, (err as Error).message);
        }
      }
    } catch (err) {
      apiFailed = true;
      console.error('[HandTopic] classify batch failed:', (err as Error).message);
    }

    // 미해결 항목: 시도 횟수 +1 (off_topic 으로 취급하지 않는다)
    for (const c of converted) {
      if (resolvedN.has(c.input.n)) continue;
      try {
        await this.bumpAttempts(c.row.id);
      } catch (err) {
        console.error(`[HandTopic] attempts update failed for ${c.row.id}:`, (err as Error).message);
      }
    }

    if (apiFailed) this.emit({ type: 'batchFailed', size: batch.length });
    else this.emit({ type: 'batchOk', size: batch.length, classified, offTopic });
  }

  /** extracted_metadata.handTopics 만 병합 저장 (다른 키 보존) */
  private async saveHandTopics(
    articleId: string,
    topics: string[],
    primary: string,
    inputLevel: InputLevel
  ): Promise<void> {
    const value = JSON.stringify({
      topics,
      primary,
      classifiedAt: new Date().toISOString(),
      version: HAND_TOPIC_VERSION,
      inputLevel,
      model: HAND_TOPIC_MODEL,
    });
    await db.execute(sql`
      UPDATE articles
      SET extracted_metadata = COALESCE(extracted_metadata, '{}'::jsonb)
        || jsonb_build_object('handTopics', ${value}::jsonb)
      WHERE id = ${articleId}
    `);
  }

  private async bumpAttempts(articleId: string): Promise<void> {
    await db.execute(sql`
      UPDATE articles
      SET extracted_metadata = COALESCE(extracted_metadata, '{}'::jsonb)
        || jsonb_build_object(
          'handTopicsAttempts',
          COALESCE((extracted_metadata->>'handTopicsAttempts')::int, 0) + 1
        )
      WHERE id = ${articleId}
    `);
  }
}

export const handTopicClassificationService = new HandTopicClassificationService();
