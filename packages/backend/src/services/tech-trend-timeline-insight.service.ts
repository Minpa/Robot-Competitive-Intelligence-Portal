/**
 * TechTrendTimelineInsightService — 시계열 기술 트렌드 AI 해설 (연구→제품화 선후행 포함)
 *
 * 서버가 결정적으로 계산한 수치(월별 건수, 추세, 선후행 판정, 대표 제목)만 입력으로 주고 AI는 서술만 한다.
 *  - 후보 외 토픽, 입력에 없는 제목, AI가 지어낸 선후행 relation 은 파서에서 걸러내거나 서버값으로 덮어쓴다.
 *  - 조회수·인기 지표는 입력/출력에 쓰지 않는다 (대표 선정 정렬에만 내부 사용).
 *  - 게이트 미충족/키 없음/생성 실패는 status 로 알리고 항상 200. 해설 실패가 차트 표시를 막지 않는다.
 *  - view_cache 'tech-trend-timeline-insight:v2:hand' 24h 캐시, 키별 in-flight Promise 로 동시 중복 생성 방지.
 *  - 모델은 Claude Opus 5.5 (effort high). 만료된 캐시는 stale 로 즉시 반환하고 백그라운드에서 재생성하며(SWR),
 *    생성 실패(예외·파싱 실패·refusal·잘림)는 10분간 재호출하지 않는다.
 */

import Anthropic from '@anthropic-ai/sdk';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { viewCache } from '../db/schema.js';
import { aiUsageService } from './ai-usage.service.js';
import { stripCiteTags, techTrendReportService } from './tech-trend-report.service.js';
import {
  OPUS_REQUEST_OPTIONS,
  effortParams,
  extractText,
  isInCooldown,
  isRefusal,
  resolveTimelineModel,
  warnOnAbnormalStop,
  type AnthropicMessagesClient,
} from './anthropic-models.js';
import {
  techTrendTimelineService,
  selectRepresentatives,
  timelineInsightCacheKey,
  LOW_VOLUME_MONTHLY_AVG,
  type TimelineSnapshot,
  type TimelineBody,
  type LeadLagRelation,
  type TrendLabel,
} from './tech-trend-timeline.service.js';
import { OTHER_TOPIC_ID } from './hand-topics.js';
import { getTaxonomy, type TimelineDomain } from './domain-topics.js';

// ─────────────────────────────────────────────────────────────────────────────
// 상수 / 설정 (임계값은 이 한 곳에 모은다)
// ─────────────────────────────────────────────────────────────────────────────

export const INSIGHT_GATE = {
  /** 분류율 하한 */
  minRatio: 0.8,
  /** 분류 건수 하한 */
  minClassified: 20,
  /** 완료 월 하한 */
  minCompleteMonths: 3,
} as const;

/** 월 수가 이 값 미만이면 "기간이 짧아 단정 금지" 플래그 */
export const SHORT_PERIOD_MONTHS = 6;
export const RISING_CANDIDATE_MAX = 5;
export const DECLINING_CANDIDATE_MAX = 5;
/** 프롬프트에 넣는 토픽·소스별 대표 제목 상한 */
export const REP_TITLES_PER_SOURCE = 5;
/** 출력(rising 항목)에서 소스별로 인용할 수 있는 제목 상한 */
export const CITED_TITLES_PER_SOURCE = 3;

export const INSIGHT_LIMITS = {
  overview: 700,
  risingEvidence: 350,
  risingMax: 5,
  decliningNote: 240,
  decliningMax: 4,
  leadLagNote: 240,
  leadLagMax: 6,
  lgItem: 350,
  lgMax: 4,
} as const;

export const INSIGHT_MODEL = resolveTimelineModel();
/** 사고 토큰 포함 상한 — 비스트리밍 한도(21,333) 이하 */
export const INSIGHT_MAX_TOKENS = 20_000;
const INSIGHT_EFFORT = 'high';
const INSIGHT_TTL_MS = (() => {
  const pick = (v: string | undefined) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const hours =
    pick(process.env.TECH_TREND_TIMELINE_INSIGHT_TTL_HOURS) ?? pick(process.env.TECH_TREND_REPORT_TTL_HOURS) ?? 24;
  return hours * 3_600_000;
})();

// ─────────────────────────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────────────────────────

export type InsightStatus =
  | 'ok'
  | 'insufficient_classification'
  | 'insufficient_period'
  | 'no_api_key'
  | 'generation_failed';

export interface SourceMetrics {
  recent: number;
  prior: number;
}

export interface TopicMetrics {
  recent: number;
  prior: number;
  delta: number;
  papers: SourceMetrics;
  videos: SourceMetrics;
}

export interface InsightTopicInput {
  topicId: string;
  label: string;
  totals: { papers: number; videos: number };
  series: { papers: number[]; videos: number[] };
  trend: {
    label: TrendLabel;
    emerging: boolean;
    recent: number;
    prior: number;
    delta: number;
    firstMonth: string | null;
    peakMonth: string | null;
  };
  leadLag: { relation: LeadLagRelation; lagMonths: number | null };
  paperTitles: string[];
  videoTitles: string[];
  /** 서버 계산 수치 — 파싱 후 화면용으로 붙인다 (프롬프트에는 trend 로 이미 포함) */
  metrics: TopicMetrics;
}

export interface Candidate {
  topicId: string;
  label: string;
  metrics: TopicMetrics;
  /** 정렬용 */
  rate: number;
  total: number;
}

export interface InsightInput {
  period: { startMonth: string; endMonth: string; monthCount: number; completeMonthCount: number };
  granularity: 'month' | 'quarter';
  /** 월 수가 짧아 단정 금지 */
  shortPeriod: boolean;
  columns: string[];
  topics: InsightTopicInput[];
  risingCandidates: Candidate[];
  decliningCandidates: Candidate[];
  /** 입력에 포함된 대표 제목 전체 (파서가 인용 검증에 사용) */
  allowedTitles: string[];
}

export interface InsightRisingItem {
  topicId: string;
  label: string;
  evidence: string;
  paperTitles: string[];
  videoTitles: string[];
  metrics: TopicMetrics;
}

export interface InsightDecliningItem {
  topicId: string;
  label: string;
  note: string;
  metrics: TopicMetrics;
}

export interface InsightLeadLagItem {
  topicId: string;
  label: string;
  relation: LeadLagRelation;
  lagMonths: number | null;
  note: string;
}

export interface ParsedTimelineInsight {
  overview: string;
  rising: InsightRisingItem[];
  declining: InsightDecliningItem[];
  leadLag: InsightLeadLagItem[];
  lgImplications: string[];
}

export interface TimelineInsight extends ParsedTimelineInsight {
  model: string;
  generatedAt: string;
  cached: boolean;
  /** 만료된 캐시를 즉시 반환하고 백그라운드에서 재생성 중일 때 true */
  stale?: boolean;
}

export interface InsightResponse {
  status: InsightStatus;
  insight: TimelineInsight | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 순수 함수: 게이트
// ─────────────────────────────────────────────────────────────────────────────

/** 해설 생성 게이트 — 모두 충족하면 'ok', 아니면 해당 status. */
export function evaluateInsightGate(input: {
  ratio: number;
  classified: number;
  completeMonths: number;
  hasApiKey: boolean;
}): Exclude<InsightStatus, 'generation_failed'> {
  if (input.completeMonths < INSIGHT_GATE.minCompleteMonths) return 'insufficient_period';
  if (input.ratio < INSIGHT_GATE.minRatio || input.classified < INSIGHT_GATE.minClassified) {
    return 'insufficient_classification';
  }
  if (!input.hasApiKey) return 'no_api_key';
  return 'ok';
}

// ─────────────────────────────────────────────────────────────────────────────
// 순수 함수: 입력 빌더
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 해설 입력 — lowVolume(월 평균 1 미만) 토픽과 other 는 제외. off_topic 은 애초에 집계에 없다.
 * 시리즈는 월 수가 12 이하면 월 단위, 초과면 분기 단위(히트맵 열과 동일).
 */
export function buildInsightInput(snapshot: TimelineSnapshot): InsightInput {
  const { body, items, months, completeMonths } = snapshot;
  const period = body.period;
  const columns = body.heatmap.columns.map((c) => c.label);
  const rowByTopic = new Map(body.heatmap.rows.map((r) => [r.topicId, r] as const));

  const topics: InsightTopicInput[] = [];
  const allowed = new Set<string>();
  for (const t of body.topics) {
    if (t.id === OTHER_TOPIC_ID || t.lowVolume) continue;
    const row = rowByTopic.get(t.id);
    const rangeInfo = { months, completeMonths };
    const take = (source: 'paper' | 'video') =>
      selectRepresentatives(items, t.id, source, rangeInfo)
        .slice(0, REP_TITLES_PER_SOURCE)
        .map((r) => r.title);
    const paperTitles = take('paper');
    const videoTitles = take('video');
    for (const title of [...paperTitles, ...videoTitles]) allowed.add(title);
    topics.push({
      topicId: t.id,
      label: t.label,
      totals: { papers: t.totals.papers.any, videos: t.totals.videos.any },
      series: { papers: row?.papers.any ?? [], videos: row?.videos.any ?? [] },
      trend: {
        label: t.trend.combined.label,
        emerging: t.trend.combined.emerging,
        recent: t.trend.combined.recent,
        prior: t.trend.combined.prior,
        delta: t.trend.combined.delta,
        firstMonth: t.trend.combined.firstMonth,
        peakMonth: t.trend.combined.peakMonth,
      },
      leadLag: t.leadLag,
      paperTitles,
      videoTitles,
      metrics: {
        recent: t.trend.combined.recent,
        prior: t.trend.combined.prior,
        delta: t.trend.combined.delta,
        papers: { recent: t.trend.papers.recent, prior: t.trend.papers.prior },
        videos: { recent: t.trend.videos.recent, prior: t.trend.videos.prior },
      },
    });
  }

  const rateOf = (id: string) => body.topics.find((x) => x.id === id)?.trend.combined.rate ?? 0;
  const avgOf = (id: string) => body.topics.find((x) => x.id === id)?.monthlyAvg ?? 0;
  const totalOf = (x: InsightTopicInput) => x.totals.papers + x.totals.videos;
  const toCandidate = (x: InsightTopicInput): Candidate => ({
    topicId: x.topicId,
    label: x.label,
    metrics: x.metrics,
    rate: rateOf(x.topicId),
    total: totalOf(x),
  });

  const risingCandidates = topics
    .filter((x) => x.trend.label === 'rising' || x.trend.emerging)
    .map(toCandidate)
    .sort((a, b) => b.metrics.delta - a.metrics.delta || b.rate - a.rate || b.total - a.total)
    .slice(0, RISING_CANDIDATE_MAX);

  const decliningCandidates = topics
    .filter(
      (x) =>
        x.trend.label === 'falling' ||
        (x.trend.label === 'steady' && x.trend.recent <= x.trend.prior && avgOf(x.topicId) >= LOW_VOLUME_MONTHLY_AVG)
    )
    .map(toCandidate)
    .sort((a, b) => a.metrics.delta - b.metrics.delta || b.total - a.total)
    .slice(0, DECLINING_CANDIDATE_MAX);

  return {
    period: {
      startMonth: period?.startMonth ?? '',
      endMonth: period?.endMonth ?? '',
      monthCount: period?.monthCount ?? 0,
      completeMonthCount: period?.completeMonthCount ?? 0,
    },
    granularity: body.heatmap.granularity,
    shortPeriod: (period?.monthCount ?? 0) < SHORT_PERIOD_MONTHS,
    columns,
    topics,
    risingCandidates,
    decliningCandidates,
    allowedTitles: [...allowed],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 순수 함수: 프롬프트 / 파서
// ─────────────────────────────────────────────────────────────────────────────

/** 프롬프트 첫 문장의 분야 표기 — hand 는 종전 '로봇 핸드' 그대로 */
export function insightSubjectLabel(domain: TimelineDomain): string {
  return getTaxonomy(domain).subjectKo;
}

export function buildTimelineInsightPrompt(input: InsightInput, domain: TimelineDomain = 'hand'): string {
  const unit = input.granularity === 'quarter' ? '분기' : '월';
  const subject = insightSubjectLabel(domain);
  const payload = {
    period: input.period,
    granularity: unit,
    columns: input.columns,
    shortPeriod: input.shortPeriod,
    topics: input.topics.map((t) => ({
      topicId: t.topicId,
      label: t.label,
      totals: t.totals,
      series: t.series,
      trend: t.trend,
      leadLag: t.leadLag,
      paperTitles: t.paperTitles,
      videoTitles: t.videoTitles,
    })),
    risingCandidates: input.risingCandidates.map((c) => c.topicId),
    decliningCandidates: input.decliningCandidates.map((c) => c.topicId),
  };
  const shortFlag = input.shortPeriod
    ? `\n- shortPeriod=true: 수집 기간이 ${SHORT_PERIOD_MONTHS}개월 미만이라 기간이 짧다. 단정 표현("확실히", "명백히", "~로 굳어졌다")을 금지하고 "~로 보인다", "참고용" 수준으로 서술한다.`
    : '';

  return `다음은 ${subject} 분야 논문(arXiv, 연구 신호)과 영상(제품화 신호)을 기술 서브토픽으로 분류해 ${unit}별로 집계한 결과다. LG 로봇 전략팀 공유용 '시계열 기술 트렌드 해설'을 한국어로 작성하라.

규칙:
- 주어진 데이터에 명시된 내용만 근거로 삼는다. 추측·일반론·외부 지식 금지.
- 건수는 입력 값을 그대로 인용한다. 새로 계산하거나 반올림하지 않는다.
- 제목을 인용할 때는 입력의 paperTitles/videoTitles에 있는 것만 원문 그대로 쓴다.
- 조회수·인기·마케팅 언급 금지.
- rising에는 risingCandidates에 있는 topicId만, declining에는 decliningCandidates에 있는 topicId만 넣는다. 후보에 없는 토픽을 넣지 않는다.
- leadLag의 relation은 입력 topics[].leadLag.relation 값을 그대로 쓰고, note는 그 판정과 모순되면 안 된다. undetermined면 note에 "판단 유보"라고 쓴다. paper_leads는 논문(연구)이 영상(제품화)보다 먼저, video_leads는 영상이 먼저 피크였다는 뜻이다.
- 선후행은 확정이 아니라 참고용으로 서술한다.
- lgImplications는 데이터 범위 안에서만 도출한다. LG 내부 제품·전략 정보는 사용하지 않는다.
- 근거 문장에는 입력의 건수(prior→recent)나 피크 월 같은 구체 수치를 함께 인용한다. 수치는 새로 계산하지 않는다.
- rising의 evidence에는 논문(연구) 신호와 영상(제품화) 신호를 모두 서술한다. 한쪽 신호만 있으면 그 사실을 명시한다.
- overview는 5~6문장으로 쓴다: 전체 흐름, 가장 큰 변화, 연구와 제품화 사이의 간극, 데이터의 한계(표본·기간) 순서.
- lgImplications는 ${INSIGHT_LIMITS.lgMax}개를 쓴다. 각 항목은 어느 토픽(이름)과 어떤 수치에서 도출했는지 문장 안에 밝힌다.
- 마크다운 기호(#, **, -)와 인용 태그(<cite>) 사용 금지.${shortFlag}

[집계 데이터]
${JSON.stringify(payload)}

JSON으로만 응답하라. 다른 텍스트 없이:
{"overview":"전체 흐름 5~6문장(${INSIGHT_LIMITS.overview}자 이내)","rising":[{"topicId":"후보 id","evidence":"근거 ${INSIGHT_LIMITS.risingEvidence}자 이내","paperTitles":["입력 제목"],"videoTitles":["입력 제목"]}],"declining":[{"topicId":"후보 id","note":"${INSIGHT_LIMITS.decliningNote}자 이내"}],"leadLag":[{"topicId":"토픽 id","relation":"입력 relation","note":"${INSIGHT_LIMITS.leadLagNote}자 이내"}],"lgImplications":["시사점1(${INSIGHT_LIMITS.lgItem}자 이내)","시사점2","시사점3","시사점4"]}
(rising 최대 ${INSIGHT_LIMITS.risingMax}개, declining 최대 ${INSIGHT_LIMITS.decliningMax}개, leadLag 최대 ${INSIGHT_LIMITS.leadLagMax}개, lgImplications ${INSIGHT_LIMITS.lgMax}개)`;
}

function tryParseObject(raw: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(raw) as unknown;
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** 인용 태그와 마크다운 기호(**, #, `, *) 제거 */
export function cleanInsightText(s: string): string {
  return stripCiteTags(s)
    .replace(/[*#`]/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function strList(v: unknown): string[] {
  return Array.isArray(v) ? (v as unknown[]).filter((x): x is string => typeof x === 'string') : [];
}

/**
 * 해설 응답 파싱 — 코드펜스/설명문 복원, 후보 외 topicId 폐기, 입력에 없는 제목 폐기,
 * leadLag.relation 은 서버 판정값으로 덮어쓴다. overview 가 비면 null.
 * 서버가 각 항목에 label 과 metrics(recent/prior/delta)를 붙인다.
 */
export function parseTimelineInsight(text: string, ctx: InsightInput): ParsedTimelineInsight | null {
  const stripped = stripCiteTags(text);
  let parsed = tryParseObject(stripped.trim());
  if (!parsed) {
    const m = stripped.match(/\{[\s\S]*\}/);
    if (m) parsed = tryParseObject(m[0]);
  }
  if (!parsed) return null;

  const overview = typeof parsed.overview === 'string' ? cleanInsightText(parsed.overview).slice(0, INSIGHT_LIMITS.overview) : '';
  if (!overview) return null;

  const allowedTitles = new Set(ctx.allowedTitles);
  const keepTitles = (v: unknown): string[] => {
    const out: string[] = [];
    for (const raw of strList(v)) {
      const title = stripCiteTags(raw).trim();
      if (allowedTitles.has(title) && !out.includes(title)) out.push(title);
      if (out.length >= CITED_TITLES_PER_SOURCE) break;
    }
    return out;
  };
  const objects = (v: unknown): Record<string, unknown>[] =>
    Array.isArray(v) ? (v as unknown[]).filter((x): x is Record<string, unknown> => !!x && typeof x === 'object') : [];

  const risingById = new Map(ctx.risingCandidates.map((c) => [c.topicId, c] as const));
  const decliningById = new Map(ctx.decliningCandidates.map((c) => [c.topicId, c] as const));
  const topicById = new Map(ctx.topics.map((t) => [t.topicId, t] as const));

  const rising: InsightRisingItem[] = [];
  for (const r of objects(parsed.rising)) {
    const id = typeof r.topicId === 'string' ? r.topicId.trim() : '';
    const cand = risingById.get(id);
    if (!cand || rising.some((x) => x.topicId === id)) continue;
    const evidence = typeof r.evidence === 'string' ? cleanInsightText(r.evidence).slice(0, INSIGHT_LIMITS.risingEvidence) : '';
    if (!evidence) continue;
    rising.push({
      topicId: id,
      label: cand.label,
      evidence,
      paperTitles: keepTitles(r.paperTitles),
      videoTitles: keepTitles(r.videoTitles),
      metrics: cand.metrics,
    });
    if (rising.length >= INSIGHT_LIMITS.risingMax) break;
  }

  const declining: InsightDecliningItem[] = [];
  for (const r of objects(parsed.declining)) {
    const id = typeof r.topicId === 'string' ? r.topicId.trim() : '';
    const cand = decliningById.get(id);
    if (!cand || declining.some((x) => x.topicId === id)) continue;
    const note = typeof r.note === 'string' ? cleanInsightText(r.note).slice(0, INSIGHT_LIMITS.decliningNote) : '';
    if (!note) continue;
    declining.push({ topicId: id, label: cand.label, note, metrics: cand.metrics });
    if (declining.length >= INSIGHT_LIMITS.decliningMax) break;
  }

  const leadLag: InsightLeadLagItem[] = [];
  for (const r of objects(parsed.leadLag)) {
    const id = typeof r.topicId === 'string' ? r.topicId.trim() : '';
    const topic = topicById.get(id);
    if (!topic || leadLag.some((x) => x.topicId === id)) continue;
    const note = typeof r.note === 'string' ? cleanInsightText(r.note).slice(0, INSIGHT_LIMITS.leadLagNote) : '';
    if (!note) continue;
    // AI가 쓴 relation 은 무시하고 서버 판정값으로 덮어쓴다
    leadLag.push({
      topicId: id,
      label: topic.label,
      relation: topic.leadLag.relation,
      lagMonths: topic.leadLag.lagMonths,
      note,
    });
    if (leadLag.length >= INSIGHT_LIMITS.leadLagMax) break;
  }

  const lgImplications = strList(parsed.lgImplications)
    .map((s) => cleanInsightText(s).slice(0, INSIGHT_LIMITS.lgItem))
    .filter((s) => s.length > 0)
    .slice(0, INSIGHT_LIMITS.lgMax);
  if (lgImplications.length === 0) return null;

  return { overview, rising, declining, leadLag, lgImplications };
}

// ─────────────────────────────────────────────────────────────────────────────
// 서비스
// ─────────────────────────────────────────────────────────────────────────────

/** 테스트에서 가짜 클라이언트를 주입할 수 있도록 messages.create 만 요구 */
export type AnthropicLike = AnthropicMessagesClient;

type CachedInsight = Omit<TimelineInsight, 'cached' | 'stale'>;

export class TechTrendTimelineInsightService {
  private client: AnthropicLike | null;
  private inflight = new Map<string, Promise<InsightResponse>>();
  /** 마지막 생성 실패 시각 (캐시 키별) — 10분간 재호출하지 않는다 */
  private failedAt = new Map<string, number>();

  constructor(client?: AnthropicLike | null) {
    if (client !== undefined) this.client = client;
    else this.client = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
  }

  private inCooldown(cacheKey: string): boolean {
    return isInCooldown(this.failedAt.get(cacheKey), Date.now());
  }

  async getInsight(domain: TimelineDomain = 'hand'): Promise<InsightResponse> {
    const cacheKey = timelineInsightCacheKey(domain);
    // 1) 캐시 적중이면 Anthropic 호출 없이 반환. 만료된 캐시가 있으면 즉시 stale 로 반환하고 백그라운드에서 재생성한다.
    const row = await this.readCacheRow(cacheKey);
    if (row && Date.now() - row.cachedAt.getTime() < INSIGHT_TTL_MS) {
      return { status: 'ok', insight: { ...row.data, cached: true } };
    }
    if (row) {
      void this.refreshStaleInBackground(domain);
      return { status: 'ok', insight: { ...row.data, cached: true, stale: true } };
    }

    // 2) 게이트 (캐시된 집계로 빠르게 판정)
    let timeline: TimelineBody;
    try {
      timeline = await techTrendTimelineService.getTimeline(domain);
    } catch (err) {
      console.error(`[TimelineInsight] ${domain}: timeline load failed:`, (err as Error).message);
      return { status: 'generation_failed', insight: null };
    }
    const gate = this.gate(timeline);
    if (gate !== 'ok') return { status: gate, insight: null };

    // 직전 실패 후 10분간은 재호출하지 않는다
    if (this.inCooldown(cacheKey)) return { status: 'generation_failed', insight: null };

    // 3) 생성 (키별 in-flight 로 동시 중복 생성 방지)
    return this.startGeneration(domain);
  }

  /** 만료 캐시를 반환한 뒤의 백그라운드 재생성 — 쿨다운·게이트(캐시된 집계로 판정)를 통과할 때만 생성한다. */
  private async refreshStaleInBackground(domain: TimelineDomain): Promise<void> {
    try {
      if (!this.client || this.inCooldown(timelineInsightCacheKey(domain))) return;
      const timeline = await techTrendTimelineService.getTimeline(domain);
      if (this.gate(timeline) !== 'ok') return;
      await this.startGeneration(domain);
    } catch (err) {
      console.error(`[TimelineInsight] ${domain}: background refresh failed:`, (err as Error).message);
    }
  }

  /**
   * 사전 생성 — 분류/분석 배치 종료 후 호출한다.
   * 캐시가 신선하거나 쿨다운 중이면 호출하지 않고, 동시 호출은 인플라이트 가드로 1회만 생성한다.
   */
  async warmInsight(domain: TimelineDomain = 'hand'): Promise<void> {
    if (!this.client) return;
    const cacheKey = timelineInsightCacheKey(domain);
    const row = await this.readCacheRow(cacheKey);
    if (row && Date.now() - row.cachedAt.getTime() < INSIGHT_TTL_MS) return;
    if (this.inCooldown(cacheKey)) return;
    await this.startGeneration(domain);
  }

  private startGeneration(domain: TimelineDomain): Promise<InsightResponse> {
    const cacheKey = timelineInsightCacheKey(domain);
    let pending = this.inflight.get(cacheKey);
    if (!pending) {
      pending = this.generate(domain).finally(() => this.inflight.delete(cacheKey));
      this.inflight.set(cacheKey, pending);
    }
    return pending;
  }

  /** 캐시 행 (만료 여부와 무관) — 형태가 유효한 경우만 */
  private async readCacheRow(cacheKey: string): Promise<{ data: CachedInsight; cachedAt: Date } | null> {
    try {
      const [cached] = await db.select().from(viewCache).where(eq(viewCache.viewName, cacheKey)).limit(1);
      if (cached) {
        const data = cached.data as unknown as CachedInsight;
        if (data && typeof data.overview === 'string' && Array.isArray(data.lgImplications)) {
          return { data, cachedAt: cached.cachedAt };
        }
      }
    } catch {
      // 캐시 조회 실패는 무시하고 재생성 진행
    }
    return null;
  }

  private async readCache(cacheKey: string): Promise<TimelineInsight | null> {
    const row = await this.readCacheRow(cacheKey);
    if (row && Date.now() - row.cachedAt.getTime() < INSIGHT_TTL_MS) return { ...row.data, cached: true };
    return null;
  }

  private gate(body: TimelineBody) {
    return evaluateInsightGate({
      ratio: body.classification.ratio,
      classified: body.classification.classified,
      completeMonths: body.period?.completeMonthCount ?? 0,
      hasApiKey: this.client !== null,
    });
  }

  private async generate(domain: TimelineDomain): Promise<InsightResponse> {
    if (!this.client) return { status: 'no_api_key', insight: null };
    const cacheKey = timelineInsightCacheKey(domain);
    const fail = (): InsightResponse => {
      this.failedAt.set(cacheKey, Date.now());
      return { status: 'generation_failed', insight: null };
    };
    try {
      // 직전 요청이 방금 캐시를 채웠을 수 있으므로 재확인
      const hit = await this.readCache(cacheKey);
      if (hit) return { status: 'ok', insight: hit };

      const snapshot = await techTrendTimelineService.loadSnapshot(domain);
      const gate = this.gate(snapshot.body);
      if (gate !== 'ok') return { status: gate, insight: null };

      const input = buildInsightInput(snapshot);
      const response = await this.client.messages.create(
        {
          model: INSIGHT_MODEL,
          max_tokens: INSIGHT_MAX_TOKENS,
          messages: [{ role: 'user', content: buildTimelineInsightPrompt(input, domain) }],
          ...effortParams(INSIGHT_MODEL, INSIGHT_EFFORT),
        },
        OPUS_REQUEST_OPTIONS
      );
      // 파싱 성공 여부와 무관하게 응답을 받았으면 비용을 기록한다
      aiUsageService
        .logUsage({
          provider: 'claude',
          model: INSIGHT_MODEL,
          webSearch: false,
          inputTokens: response.usage?.input_tokens ?? 0,
          outputTokens: response.usage?.output_tokens ?? 0,
          query: `[tech-trend-timeline] ${domain}`,
        })
        .catch(() => {});

      if (isRefusal(response.stop_reason)) {
        console.warn(`[TimelineInsight] ${domain}: insight refused by model (model=${INSIGHT_MODEL})`);
        return fail();
      }
      warnOnAbnormalStop('TimelineInsight', INSIGHT_MODEL, response);

      const parsed = parseTimelineInsight(extractText(response.content), input);
      if (!parsed) {
        console.error(`[TimelineInsight] ${domain}: parse failed`);
        return fail();
      }

      const insight: CachedInsight = { ...parsed, model: INSIGHT_MODEL, generatedAt: new Date().toISOString() };
      try {
        await db
          .insert(viewCache)
          .values({ viewName: cacheKey, data: insight, ttlMs: INSIGHT_TTL_MS })
          .onConflictDoUpdate({
            target: viewCache.viewName,
            set: { data: insight, cachedAt: new Date(), ttlMs: INSIGHT_TTL_MS },
          });
      } catch {
        // 캐시 저장 실패는 치명적이지 않음
      }
      this.failedAt.delete(cacheKey);
      return { status: 'ok', insight: { ...insight, cached: false } };
    } catch (err) {
      // 생성 실패는 캐시하지 않는다
      console.error(`[TimelineInsight] ${domain}: generation failed:`, (err as Error).message);
      return fail();
    }
  }
}

export const techTrendTimelineInsightService = new TechTrendTimelineInsightService();

/**
 * 도메인 시사점·시계열 해설을 백그라운드로 재생성한다 — 분석/분류 배치 종료 훅에서 `void` 로 호출.
 *  - hand: 30일 시사점(Opus, warmHandInsight) + 시계열 해설. 종전 warmHandInsights 와 동일.
 *  - 그 외(actuator): 리포트 시사점은 LEGACY 프로필(요청 시 블로킹 재생성)이라 시계열 해설만 미리 만든다.
 * 각 서비스의 인플라이트 가드와 "캐시가 신선하면 건너뜀" 규칙 덕분에 두 배치가 겹쳐도 생성은 1회만 일어난다.
 * 실패는 로그만 남기고 호출자(배치 결과)에 영향을 주지 않는다.
 */
export async function warmDomainInsights(domain: TimelineDomain): Promise<void> {
  const jobs: Promise<void>[] = [techTrendTimelineInsightService.warmInsight(domain)];
  if (domain === 'hand') jobs.unshift(techTrendReportService.warmHandInsight(30));
  const results = await Promise.allSettled(jobs);
  for (const r of results) {
    if (r.status === 'rejected') {
      console.error(`[WarmInsight] ${domain}: background regeneration failed:`, (r.reason as Error)?.message ?? r.reason);
    }
  }
}

/** 종전 이름 호환 — warmDomainInsights('hand') */
export async function warmHandInsights(): Promise<void> {
  return warmDomainInsights('hand');
}
