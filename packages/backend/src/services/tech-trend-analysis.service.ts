/**
 * TechTrendAnalysisService — 기술 트렌드 리포트(핸드) 영상 전체 Gemini 분석 + 핸드 관련성 판정
 *
 * 이벤트성 관리자 배치. 리포트 대상 영상(기간 + matchesDomainVideo)을 전역 DOMAIN_FILTER/SINCE_DAYS와
 * 무관하게 Gemini로 분석하고, 결과(또는 Claude Haiku 5.5 폴백)로 "핸드/그리퍼/손 조작이 주제인지"를 판정해
 * extracted_metadata.domainFocus.hand 에 저장한다. 'none' 영상은 리포트에서 제외된다.
 *
 * 안전 원칙:
 *  - 공개 YouTube watch URL만 Gemini에 전달 (다운로드 없음), 자막 전문/장문 전사 저장 없음.
 *  - 판정 실패/파싱 실패는 절대 'none'으로 취급하지 않는다 (미판정 유지).
 *  - 상태는 인메모리. 마커가 DB에 있으므로 재실행은 멱등(이어서 처리).
 */

import Anthropic from '@anthropic-ai/sdk';
import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { aiUsageService } from './ai-usage.service.js';
import { decodeHtmlEntities } from './event-video-brief.service.js';
import { effortParams, extractText, resolveFocusModel, warnOnAbnormalStop } from './anthropic-models.js';
import {
  videoContentAnalysisService,
  isPublicYoutubeWatchUrl,
  MAX_ATTEMPTS,
  parseDomainFocus,
  HAND_FOCUS_LEVELS,
  type HandFocusLevel,
  type PendingVideo,
  type GeminiVideoAnalysis,
} from './video-content-analysis.service.js';
import {
  techTrendReportService,
  getDomainFocus,
  stripCiteTags,
  type ArticleRow,
  type TechTrendDomain,
} from './tech-trend-report.service.js';

export { parseDomainFocus };

// ─────────────────────────────────────────────────────────────────────────────
// 상수 / 설정
// ─────────────────────────────────────────────────────────────────────────────

export const ANALYZE_SUPPORTED_DOMAINS: readonly TechTrendDomain[] = ['hand'];

/** 핸드 관련성 판정 모델 — 기본 Haiku 5.5. 시사점/해설(종합) 모델 설정을 상속하지 않는다. */
export const FOCUS_MODEL = resolveFocusModel();

function positiveInt(v: string | undefined, fallback: number): number {
  const n = parseInt(v ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const MAX_PER_RUN = positiveInt(process.env.TECH_TREND_ANALYSIS_MAX_PER_RUN, 150);
const CONCURRENCY = positiveInt(process.env.TECH_TREND_ANALYSIS_CONCURRENCY, 3);
const MAX_INPUT_TOKENS = positiveInt(process.env.TECH_TREND_ANALYSIS_MAX_INPUT_TOKENS, 20_000_000);
const JUDGE_BATCH_SIZE = 10;
/** Haiku 5.5 는 사고 토큰이 max_tokens 에 포함되므로 여유 있게 잡는다 */
export const JUDGE_MAX_TOKENS = 6000;
const REASON_MAX = 120;
const GEMINI_USAGE_TAG = '[tech-trend-analysis:hand]';

// ─────────────────────────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalysisRunState {
  running: boolean;
  total: number;
  processed: number;
  analyzed: number;
  judged: number;
  excluded: number;
  failed: number;
  skipped: number;
  quotaHit: boolean;
  budgetHit: boolean;
  judgeSkipped: boolean;
  startedAt: string | null;
  finishedAt: string | null;
}

export type RunEvent =
  | { type: 'start'; total: number; now: string }
  /** Gemini 분석 성공 — judged가 있으면 같은 응답에서 판정까지 저장된 것 */
  | { type: 'geminiOk'; judged: HandFocusLevel | null }
  | { type: 'geminiFailed' }
  /** 429 — attempts 미증가, failed 미증가, 남은 호출 중단 */
  | { type: 'quota' }
  | { type: 'budget' }
  /** 공개 watch URL이 아니라 건너뛴 영상 (total에 포함되지 않음) */
  | { type: 'skipped'; count: number }
  /** Gemini 성공했으나 유효한 판정이 없어 Haiku 폴백으로 넘어간 영상 수만큼 total 증가 */
  | { type: 'fallback'; count: number }
  | { type: 'judgeOk'; level: HandFocusLevel }
  /** Haiku 응답에서 판정을 얻지 못한 항목 (미판정 유지, failed 아님) */
  | { type: 'judgeUnresolved'; count: number }
  | { type: 'judgeSkipped' }
  | { type: 'finish'; now: string };

export interface FocusJudgeItem {
  id: string;
  title: string;
  description: string;
  summaryKo: string;
  task: string;
  manipulation: string;
  hardware: string;
  capabilities: string[];
}

export interface HaikuFocusResult {
  id: string;
  level: HandFocusLevel;
  reason: string;
}

export type StartResult =
  | { ok: false; reason: 'gemini_not_configured' }
  | { ok: true; alreadyRunning?: true; queued: number; total: number };

// ─────────────────────────────────────────────────────────────────────────────
// 순수 함수
// ─────────────────────────────────────────────────────────────────────────────

export function initialRunState(): AnalysisRunState {
  return {
    running: false,
    total: 0,
    processed: 0,
    analyzed: 0,
    judged: 0,
    excluded: 0,
    failed: 0,
    skipped: 0,
    quotaHit: false,
    budgetHit: false,
    judgeSkipped: false,
    startedAt: null,
    finishedAt: null,
  };
}

/** 진행 상태 리듀서 — processed는 total을 넘지 않는다. */
export function reduceRunState(state: AnalysisRunState, event: RunEvent): AnalysisRunState {
  const bump = (s: AnalysisRunState, n: number): AnalysisRunState => ({
    ...s,
    processed: Math.min(s.total, s.processed + n),
  });
  const judgedBy = (s: AnalysisRunState, level: HandFocusLevel): AnalysisRunState => ({
    ...s,
    judged: s.judged + 1,
    excluded: s.excluded + (level === 'none' ? 1 : 0),
  });

  switch (event.type) {
    case 'start':
      return { ...initialRunState(), running: true, total: event.total, startedAt: event.now };
    case 'geminiOk': {
      let next = bump({ ...state, analyzed: state.analyzed + 1 }, 1);
      if (event.judged) next = judgedBy(next, event.judged);
      return next;
    }
    case 'geminiFailed':
      return bump({ ...state, failed: state.failed + 1 }, 1);
    case 'quota':
      return { ...state, quotaHit: true, skipped: state.skipped + 1 };
    case 'budget':
      return { ...state, budgetHit: true };
    case 'skipped':
      return { ...state, skipped: state.skipped + event.count };
    case 'fallback':
      return { ...state, total: state.total + event.count };
    case 'judgeOk':
      return bump(judgedBy(state, event.level), 1);
    case 'judgeUnresolved':
      return bump(state, event.count);
    case 'judgeSkipped':
      return { ...state, judgeSkipped: true };
    case 'finish':
      return { ...state, running: false, finishedAt: event.now };
    default:
      return state;
  }
}

function hasGeminiAnalysis(row: ArticleRow): boolean {
  const g = row.extractedMetadata?.geminiAnalysis;
  return typeof g === 'object' && g !== null;
}

function attemptsOf(row: ArticleRow): number {
  const n = Number(row.extractedMetadata?.geminiAnalysisAttempts ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Phase 1 대상 선정 — 미분석 + attempts < maxAttempts + 공개 watch URL, 입력 순서(최신순) 유지, cap 적용.
 * 공개 watch URL이 아닌 행은 skipped로만 센다(attempts 미증가).
 * 전역 DOMAIN_FILTER/REQUIRE_DEMO_SIGNAL/SINCE_DAYS는 적용하지 않는다.
 */
export function selectGeminiTargets(
  rows: ArticleRow[],
  opts: { maxAttempts: number; cap: number }
): { targets: PendingVideo[]; skipped: number } {
  const targets: PendingVideo[] = [];
  let skipped = 0;
  for (const r of rows) {
    if (hasGeminiAnalysis(r)) continue;
    if (attemptsOf(r) >= opts.maxAttempts) continue;
    if (!isPublicYoutubeWatchUrl(r.url)) {
      skipped++;
      continue;
    }
    if (targets.length >= opts.cap) continue;
    targets.push({ id: r.id, title: r.title, url: r.url as string });
  }
  return { targets, skipped };
}

/** Phase 2 대상 선정 — 분석은 끝났고 hand 판정은 아직 없는 행 */
export function selectJudgeTargets(rows: ArticleRow[]): ArticleRow[] {
  return rows.filter((r) => hasGeminiAnalysis(r) && getDomainFocus('hand', r) === null);
}

function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.slice(0, max) : '';
}

/** 행 → Haiku 판정 입력 */
export function toFocusJudgeItem(row: ArticleRow): FocusJudgeItem {
  const meta = row.extractedMetadata ?? {};
  const g = (meta.geminiAnalysis ?? {}) as Record<string, any>;
  const ta = (g.technicalAnalysis ?? {}) as Record<string, any>;
  return {
    id: row.id,
    title: decodeHtmlEntities(row.title ?? ''),
    description: str(meta.description, 300),
    summaryKo: str(g.summaryKo, 400),
    task: str(g.task, 200),
    manipulation: str(ta.manipulation, 200),
    hardware: str(ta.hardware, 200),
    capabilities: Array.isArray(g.capabilities)
      ? (g.capabilities as unknown[]).filter((c): c is string => typeof c === 'string').slice(0, 8)
      : [],
  };
}

export function buildFocusJudgePrompt(items: FocusJudgeItem[]): string {
  return `다음은 로봇 영상의 메타데이터와 Gemini 분석 요약이다. 각 영상이 로봇 핸드/그리퍼/손 조작 기술 리포트에 속하는지 판정하라.

판정 기준:
- primary: 로봇 핸드·그리퍼·손가락·촉각 센서·덱스터러스 조작(손 조작) 자체가 영상의 주제이며 핵심으로 다뤄진다.
- secondary: 전신·이동 로봇이나 휴머노이드의 작업 영상이지만, 손(핸드·그리퍼)을 이용한 조작이 의미 있는 구간으로 등장한다.
- none: 로봇 핸드·그리퍼·손 조작이 실질적으로 나오지 않거나 부수적으로 스치는 정도다. 예: 보행·주행·춤, 시설 소개, 키노트·인터뷰, 로봇이 아닌 영상.

규칙:
- 주어진 텍스트에 명시된 내용만 근거로 삼는다. 추측·외부 지식 금지.
- 근거가 부족하거나 애매하면 none이 아니라 secondary로 답한다.
- reason은 한국어 1문장, 120자 이내.
- 마크다운과 인용 태그(<cite>) 사용 금지.

[영상 ${items.length}건]
${JSON.stringify(items)}

JSON으로만 응답하라. 다른 텍스트 없이:
{"results":[{"id":"영상 id","hand":"primary|secondary|none","reason":"판정 근거"}]}`;
}

/** Haiku 판정 응답 파싱 — 입력에 없는 id와 잘못된 level 항목은 버리고 나머지는 유지 */
export function parseHaikuFocusBatch(text: string, validIds: Set<string>): HaikuFocusResult[] {
  const tryParse = (raw: string): unknown => {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };
  let parsed = tryParse(text.trim());
  if (!parsed || typeof parsed !== 'object') {
    const m = text.match(/\{[\s\S]*\}/);
    parsed = m ? tryParse(m[0]) : null;
  }
  if (!parsed || typeof parsed !== 'object') return [];

  const list: unknown = Array.isArray(parsed) ? parsed : (parsed as Record<string, unknown>).results;
  if (!Array.isArray(list)) return [];

  const seen = new Set<string>();
  const out: HaikuFocusResult[] = [];
  for (const item of list as unknown[]) {
    if (typeof item !== 'object' || item === null) continue;
    const r = item as Record<string, unknown>;
    if (typeof r.id !== 'string' || !validIds.has(r.id) || seen.has(r.id)) continue;
    if (typeof r.hand !== 'string') continue;
    const level = r.hand.trim().toLowerCase() as HandFocusLevel;
    if (!HAND_FOCUS_LEVELS.includes(level)) continue;
    const reason = typeof r.reason === 'string' ? stripCiteTags(r.reason).slice(0, REASON_MAX) : '';
    seen.add(r.id);
    out.push({ id: r.id, level, reason });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 서비스
// ─────────────────────────────────────────────────────────────────────────────

class TechTrendAnalysisService {
  private anthropicClient: Anthropic | null = null;
  private states = new Map<TechTrendDomain, AnalysisRunState>();
  /** 도메인별 배치 in-flight 가드 (버튼 연타·다중 탭 시 동일 영상 중복 분석 방지) */
  private runningBatches = new Set<TechTrendDomain>();

  constructor() {
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
  }

  getStatus(domain: TechTrendDomain): AnalysisRunState {
    return this.states.get(domain) ?? initialRunState();
  }

  private emit(domain: TechTrendDomain, event: RunEvent): void {
    this.states.set(domain, reduceRunState(this.getStatus(domain), event));
  }

  /** 배치 시작 — 대상 선정까지 동기 처리하고 실제 분석은 백그라운드로 실행한다. */
  async start(domain: TechTrendDomain, days: number): Promise<StartResult> {
    if (!videoContentAnalysisService.isConfigured()) {
      return { ok: false, reason: 'gemini_not_configured' };
    }
    if (this.runningBatches.has(domain)) {
      console.warn(`[TechTrendAnalysis] ${domain}: batch already running — duplicate request ignored`);
      return { ok: true, alreadyRunning: true, queued: 0, total: this.getStatus(domain).total };
    }
    // await 이전에 가드를 걸어 동시 요청 레이스를 막는다
    this.runningBatches.add(domain);

    let started = false;
    try {
      const rows = await techTrendReportService.getDomainVideoRows(domain, days);
      const { targets, skipped } = selectGeminiTargets(rows, { maxAttempts: MAX_ATTEMPTS, cap: MAX_PER_RUN });
      const judgeRows = selectJudgeTargets(rows);
      const total = targets.length + judgeRows.length;

      if (total === 0) {
        this.states.set(domain, {
          ...initialRunState(),
          skipped,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
        });
        return { ok: true, queued: 0, total: 0 };
      }

      this.emit(domain, { type: 'start', total, now: new Date().toISOString() });
      if (skipped > 0) this.emit(domain, { type: 'skipped', count: skipped });
      started = true;
      void this.runBatch(domain, targets, rows, judgeRows);
      return { ok: true, queued: total, total };
    } finally {
      // 시작에 실패했거나 대상이 없으면 여기서 가드 해제 (시작된 배치는 runBatch의 finally가 해제)
      if (!started) this.runningBatches.delete(domain);
    }
  }

  private async runBatch(
    domain: TechTrendDomain,
    targets: PendingVideo[],
    rows: ArticleRow[],
    judgeRows: ArticleRow[]
  ): Promise<void> {
    try {
      // ── Phase 1: Gemini 전체 분석 ──
      const rowById = new Map(rows.map((r) => [r.id, r]));
      const fallbackRows: ArticleRow[] = [];
      let inputTokens = 0;
      let stop = false;

      for (let i = 0; i < targets.length && !stop; i += CONCURRENCY) {
        if (inputTokens >= MAX_INPUT_TOKENS) {
          this.emit(domain, { type: 'budget' });
          console.warn(`[TechTrendAnalysis] ${domain}: input token budget reached (${inputTokens}) — stopping Gemini calls`);
          break;
        }
        const group = targets.slice(i, i + CONCURRENCY);
        const results = await Promise.all(
          group.map(async (video) => ({
            video,
            res: await videoContentAnalysisService.analyzeVideo(video, {
              focusDomain: 'hand',
              usageTag: GEMINI_USAGE_TAG,
            }),
          }))
        );

        for (const { video, res } of results) {
          try {
            if (res === 'quota') {
              stop = true;
              this.emit(domain, { type: 'quota' });
              continue;
            }
            if (!res) {
              await videoContentAnalysisService.recordFailedAttempt(video.id);
              this.emit(domain, { type: 'geminiFailed' });
              continue;
            }
            inputTokens += res.inputTokens;
            await videoContentAnalysisService.persistAnalysis(video.id, res.analysis);
            const focus = res.analysis.domainFocus;
            if (focus) {
              await this.saveDomainFocus(video.id, focus.hand, focus.reason, 'gemini');
              this.emit(domain, { type: 'geminiOk', judged: focus.hand });
            } else {
              this.emit(domain, { type: 'geminiOk', judged: null });
              // 유효한 판정이 없으면 같은 실행 안에서 Haiku 폴백
              const row = rowById.get(video.id);
              if (row) fallbackRows.push(withGeminiAnalysis(row, res.analysis));
            }
          } catch (err) {
            console.error(`[TechTrendAnalysis] ${domain}: post-processing failed for ${video.id}:`, (err as Error).message);
            this.emit(domain, { type: 'geminiFailed' });
          }
        }
      }

      // ── Phase 2: Haiku 판정 (기분석 + Phase 1 폴백) ──
      const toJudge = [...judgeRows, ...fallbackRows];
      if (fallbackRows.length > 0) this.emit(domain, { type: 'fallback', count: fallbackRows.length });
      if (toJudge.length > 0) {
        if (!this.anthropicClient) {
          this.emit(domain, { type: 'judgeSkipped' });
          console.warn(`[TechTrendAnalysis] ${domain}: ANTHROPIC_API_KEY not configured — judging skipped`);
        } else {
          for (let i = 0; i < toJudge.length; i += JUDGE_BATCH_SIZE) {
            await this.judgeBatch(domain, toJudge.slice(i, i + JUDGE_BATCH_SIZE));
          }
        }
      }
    } catch (err) {
      console.error(`[TechTrendAnalysis] ${domain}: batch failed:`, (err as Error).message);
    } finally {
      this.emit(domain, { type: 'finish', now: new Date().toISOString() });
      this.runningBatches.delete(domain);
      const s = this.getStatus(domain);
      console.log(
        `[TechTrendAnalysis] ${domain}: done — analyzed ${s.analyzed}, judged ${s.judged}, excluded ${s.excluded}, failed ${s.failed}, skipped ${s.skipped}, quotaHit ${s.quotaHit}, budgetHit ${s.budgetHit}`
      );
      if (s.analyzed > 0 || s.judged > 0) {
        await techTrendReportService.invalidateInsightCache(domain);
        // focus 판정으로 시계열 스코프 자체가 바뀌므로 타임라인·해설 캐시도 무효화 (hand 한정)
        if (domain === 'hand') {
          try {
            const { techTrendTimelineService } = await import('./tech-trend-timeline.service.js');
            await techTrendTimelineService.invalidate();
          } catch (err) {
            console.error(`[TechTrendAnalysis] ${domain}: timeline cache invalidation failed:`, (err as Error).message);
          }
          // 무효화 직후 시사점·시계열 해설을 백그라운드로 미리 재생성 (실패해도 배치 결과에 영향 없음)
          void import('./tech-trend-timeline-insight.service.js')
            .then((m) => m.warmHandInsights())
            .catch((err) =>
              console.error(`[TechTrendAnalysis] ${domain}: insight warm-up failed:`, (err as Error).message)
            );
        }
      }
    }
  }

  /** Haiku로 10건 묶음 판정 — 실패/파싱 실패 항목은 미판정으로 둔다(attempts 마커 불변) */
  private async judgeBatch(domain: TechTrendDomain, batch: ArticleRow[]): Promise<void> {
    if (!this.anthropicClient) return;
    const items = batch.map(toFocusJudgeItem);
    const validIds = new Set(items.map((i) => i.id));
    let resolved = 0;
    try {
      const response = await this.anthropicClient.messages.create({
        model: FOCUS_MODEL,
        max_tokens: JUDGE_MAX_TOKENS,
        messages: [{ role: 'user', content: buildFocusJudgePrompt(items) }],
        ...effortParams(FOCUS_MODEL, 'low'),
      });
      aiUsageService
        .logUsage({
          provider: 'claude',
          model: FOCUS_MODEL,
          webSearch: false,
          inputTokens: response.usage?.input_tokens ?? 0,
          outputTokens: response.usage?.output_tokens ?? 0,
          query: `[tech-trend-focus] ${domain} ${items.length}건`,
        })
        .catch(() => {});

      warnOnAbnormalStop('TechTrendAnalysis', FOCUS_MODEL, response);
      const combined = extractText(response.content);
      for (const r of parseHaikuFocusBatch(combined, validIds)) {
        try {
          await this.saveDomainFocus(r.id, r.level, r.reason, 'haiku');
          this.emit(domain, { type: 'judgeOk', level: r.level });
          resolved++;
        } catch (err) {
          console.error(`[TechTrendAnalysis] ${domain}: saving judgement failed for ${r.id}:`, (err as Error).message);
        }
      }
    } catch (err) {
      console.error(`[TechTrendAnalysis] ${domain}: judge batch failed:`, (err as Error).message);
    }
    const unresolved = items.length - resolved;
    if (unresolved > 0) this.emit(domain, { type: 'judgeUnresolved', count: unresolved });
  }

  /** extracted_metadata.domainFocus.hand 만 병합 저장 (다른 도메인 키 보존) */
  private async saveDomainFocus(
    articleId: string,
    level: HandFocusLevel,
    reason: string,
    source: 'gemini' | 'haiku'
  ): Promise<void> {
    const value = JSON.stringify({
      level,
      reason: reason.slice(0, REASON_MAX),
      judgedAt: new Date().toISOString(),
      source,
    });
    await db.execute(sql`
      UPDATE articles
      SET extracted_metadata = jsonb_set(
        COALESCE(extracted_metadata, '{}'::jsonb),
        '{domainFocus}',
        COALESCE(extracted_metadata->'domainFocus', '{}'::jsonb)
          || jsonb_build_object('hand', ${value}::jsonb),
        true
      )
      WHERE id = ${articleId}
    `);
  }
}

function withGeminiAnalysis(row: ArticleRow, analysis: GeminiVideoAnalysis): ArticleRow {
  const { domainFocus: _d, ...stored } = analysis;
  return { ...row, extractedMetadata: { ...(row.extractedMetadata ?? {}), geminiAnalysis: stored } };
}

export const techTrendAnalysisService = new TechTrendAnalysisService();
