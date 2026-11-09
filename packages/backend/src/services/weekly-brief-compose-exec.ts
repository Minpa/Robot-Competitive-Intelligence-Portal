/**
 * 주간 브리프 v3(임원판) 구성 — 순수 함수 모음 (DB·AI 접근 없음).
 *
 *   buildExecPlan(수집 결과)        : 서버가 계산한 격차·추세·사업 사실, 결론 후보 선정, 근거 매핑, AI 입력용 짧은 id 와 규칙 폴백 문장을 만든다.
 *   (summarize-exec 가 plan 으로 프롬프트를 만들고 AI 를 호출한다)
 *   finalizeExec(plan, ai, now)     : AI 응답을 구조 → 텍스트 정책 → 합니다체·수집 건수·방향 모순 → 금칙어·숫자 → 길이·문장 수 순으로 검증하고,
 *                                     탈락한 요소는 규칙 폴백으로 대체해 payload 와 상태를 확정한다.
 *
 * 원칙: 숫자·링크·근거·격차 방향은 전부 서버 값. AI 는 서술과 제목 번역만 쓴다. 원문(기사 본문·초록·description)은 쓰지 않는다.
 */

import {
  articleSummaryLines,
  clampPayloadStrings,
  paperSummaryLines,
  selectReportVideos,

} from './weekly-brief-compose-report.js';
import {
  CONFIDENCE_RANK,
  articleDomainBadge,
  articleEvidence,
  channelOf,
  classifyRow,
  computeCounts,
  meta,
  newestFirst,
  normalizeConfidence,
  normalizeSpaces,
  resolveThumbnail,
  safeArxivUrl,
  safeHttpsUrl,
  selectArticles,
  selectPapers,
  toIso,
  videoEvidence,
  videoDomainBadge,
  type BriefRow,
} from './weekly-brief-compose.js';
import {
  CI_AXIS_MAP,
  buildGapDraft,
  buildOurPosition,
  companyKeyOf,
  competitorFactsFromCiBenchmark,
  competitorFactsFromHandBenchmark,
  competitorFactsFromMap,
  computeCoverage,
  gapEvidence,
  gapRuleLines,
  newDataReason,
  parseCiPrevForAxis,
  selectGapDrafts,
  snapshotOf,
  type CompetitorFact,
  type GapDraft,
  type OurPosition,
  type WeekSignals,
} from './weekly-brief-position.js';
import { PROCUREMENT_MIN_DIFF, classifyCountSeries, procurementState, selectTrendSignals, trendWeekStarts, type TechSignalDraft } from './weekly-brief-trend.js';
import type { ExecCollected, SignalEvidenceRow } from './weekly-brief-collect.js';
import {
  EXEC_SENTENCE_MAX,
  buildAllowed,
  charLength,
  dateNumbers,
  disallowedNumbers,
  findBannedPhraseV3,
  guardExecSentences,
  guardTitleTranslation,
  resolveEntityGuardMode,
  smallIntegers,
  splitSentences,
  violatesTextPolicy,
  endsWithPolite,
  endsWithProposal,
  isRequestForm,
  type EntityGuardMode,
  type ExecGuardScope,
  type ExecGapMovement,
  type ExecGapPosition,
  type ExecGuardStats,
} from './weekly-brief-text-guard.js';
import { TITLE_KO_MAX } from './weekly-brief-text-guard.js';
import { isoWeekInfo } from './weekly-brief-period.js';
import { josa, withJosa } from './korean-josa.js';
import { METRIC_DEFINITIONS, CHIP_NOTE_MAX, isEstimatedGrade, techExplain } from './weekly-brief-metric-defs.js';
import { axisExplainKo, movementLabelKo } from '../types/weekly-brief-wording.js';
import type { ActuatorMapBody } from './actuator-position-map.service.js';
import type {
  BriefDomainKey,
  BusinessCategory,
  ExecActionKind,
  ExecArticle,
  ExecBusinessMove,
  ExecConclusion,
  ExecConclusionKind,
  ExecFactChip,
  ExecGapRow,
  ExecLine,
  ExecLineRole,
  ExecPaper,
  ExecQuestion,
  ExecQuestionKind,
  ExecSectionKey,
  ExecTechSignal,
  ExecVideo,
  WeeklyBriefDeltas,
  WeeklyBriefHeader,
  WeeklyBriefStatusCode,
  WeeklyExecutivePayload,
  WeeklyGeneratedBy,
  WeeklyReportEvidence,
  WeeklySectionSource,
} from '../types/weekly-brief.js';

// ─────────────────────────────────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────────────────────────────────

export const EXEC_LIMITS = {
  conclusions: { max: 5, perKind: 2, headline: 50, minLines: 3, maxLines: 6, line: EXEC_SENTENCE_MAX },
  gaps: { summaryMin: 2, summaryMax: 3, summaryChars: 220, minLines: 2, maxLines: 4, missingMaxLines: 2 },
  tech: { minLines: 2, maxLines: 4 },
  business: { moves: 6, picture: 6, factsPerMove: 4, minLines: 2, maxLines: 4 },
  questions: { min: 2, max: 4, text: 200, rationaleMax: 2, fallbackFill: 3 },
  videos: { max: 8, min: 6, bucketCap: 2, lines: 2, lineMax: 110, tags: 3 },
  papers: { candidates: 8, max: 5, min: 3, implication: 100, minScore: 2 },
  articles: { max: 8, min: 6, sourceCap: 2, line: 100 },
  evidencePerItem: 3,
  /** 규칙 폴백 요소 비율이 이 값을 넘으면 partial */
  partialRuleRatio: 0.25,
  /** 읽기 시간 계산: 글자 수 ÷ 분당 글자 수 */
  charsPerMinute: 600,
} as const;

export const CONCLUSION_BASE_SCORE = {
  gap: { aheadClosing: 100, aheadFirstSeen: 80, parityClosing: 70 },
  tech: { core: 70, other: 55 },
  business: { priced: 60, other: 45 },
  ci: 50,
  trustBonus: 10,
} as const;

/** 사업 후보 판정 용어 (영문·한글) */
export const BUSINESS_TERMS: Readonly<Record<Exclude<BusinessCategory, 'market'>, readonly string[]>> = {
  contract: ['계약', '공급', '납품', '수주', 'supply', 'supplier agreement', 'contract', 'order', 'deliver'],
  pricing: ['가격', '출시가', 'price', 'pricing', 'priced', 'msrp', 'cost'],
  mass_production: ['양산', 'mass production', 'volume production', 'production line', 'gigafactory'],
  sourcing: ['조달', '공급사', 'sourcing', 'vendor', 'procure'],
};

export const BUSINESS_CATEGORY_LABEL: Readonly<Record<BusinessCategory, string>> = {
  contract: '계약·공급',
  pricing: '가격',
  mass_production: '양산',
  sourcing: '조달',
  market: '시장',
};

const GAP_DOMAIN: Readonly<Record<string, BriefDomainKey | null>> = {
  torque_density: 'actuator',
  hand_dof: 'hand',
  grip_force: 'hand',
  tactile: 'hand',
  body_dof: null,
  payload: null,
  price: 'production',
};

export type ExecAiCall = 'A' | 'B' | 'C' | 'D';

export interface ExecAiInput {
  /** A: { conclusions, questions } */
  A: unknown | null;
  /** B: { summary, rows } */
  B: unknown | null;
  /** C: { signals, moves } */
  C: unknown | null;
  /** D: { papers, titles } */
  D: unknown | null;
  failed: Partial<Record<ExecAiCall, string>>;
  batchWarnings: string[];
  truncated: ExecAiCall[];
}

export const EMPTY_EXEC_AI: ExecAiInput = { A: null, B: null, C: null, D: null, failed: {}, batchWarnings: [], truncated: [] };

// ─────────────────────────────────────────────────────────────────────────────
// 플랜 타입
// ─────────────────────────────────────────────────────────────────────────────

export interface ExecGuard {
  allowed: Set<string>;
  inputText: string;
}

export interface EvidenceItem {
  ref: string;
  ev: WeeklyReportEvidence;
}

export interface GapPlan {
  /** AI 입력용 id (g1 …) */
  ref: string;
  draft: GapDraft;
  ruleLines: string[];
  /** 카드 제목 줄의 사실 문장 (서버 규칙 문장 — AI 문장이 가드를 통과하면 대체) */
  ruleHeadline: string;
  evidence: WeeklyReportEvidence[];
  guard: ExecGuard;
}

export interface TechPlan {
  /** AI 입력용 id (t1 …) */
  ref: string;
  draft: TechSignalDraft;
  ruleLines: string[];
  evidence: EvidenceItem[];
  guard: ExecGuard;
}

export interface BizPlan {
  /** AI 입력용 id (b1 …) */
  ref: string;
  id: string;
  category: BusinessCategory;
  company: string;
  vendor: string | null;
  facts: ExecFactChip[];
  /** AI 입력용 사실 한 줄 */
  fact: string;
  evidence: EvidenceItem[];
  guard: ExecGuard;
}

export interface CandidatePlan {
  /** AI 입력용 id (c1 …) */
  ref: string;
  id: string;
  kind: ExecConclusionKind;
  domain: BriefDomainKey | null;
  score: number;
  ruleHeadline: string;
  ruleLines: ExecLine[];
  gapRefs: string[];
  evidence: EvidenceItem[];
  /** AI 입력용 사실 (숫자·방향 라벨 포함) */
  facts: Record<string, string | number | null>;
  position: ExecGapPosition | null;
  movement?: ExecGapMovement | null;
  guard: ExecGuard;
}

export interface PaperPlan {
  /** AI 입력용 id (p1 …) */
  ref: string;
  paper: Omit<ExecPaper, 'implication' | 'frontierScore'>;
  aiLine: string | null;
}

export interface TitleTarget {
  ref: string;
  kind: 'video' | 'paper' | 'article';
  id: string;
  title: string;
}

export interface ExecPlanOptions {
  showArticleSummary?: boolean;
  entityMode?: EntityGuardMode;
  extraWarnings?: string[];
}

export interface ExecPlan {
  weekStart: string;
  weekEnd: string;
  period: string;
  isoYear: number;
  weekNumber: number;
  counts: WeeklyBriefHeader['counts'];
  deltas: WeeklyBriefDeltas;
  periodStartAt: string;
  periodEndAt: string;
  noData: boolean;
  truncated: boolean;
  inputWarnings: string[];
  candidates: CandidatePlan[];
  gaps: { rows: GapPlan[]; coverage: { registered: string[]; missing: string[]; asOf: string | null }; positionOk: boolean; guard: ExecGuard };
  tech: { signals: TechPlan[]; window: { weeks: number; recentWeeks: number; asOfWeekStart: string }; procurement: { state: 'accumulating' | 'observed'; snapshots: number } };
  business: { picture: ExecFactChip[]; moves: BizPlan[]; asOf: string | null };
  /** 모든 근거 (ref → 근거) */
  evidenceByRef: Map<string, WeeklyReportEvidence>;
  videos: ExecVideo[];
  papers: PaperPlan[];
  articles: ExecArticle[];
  titles: TitleTarget[];
  collectionLine: string;
  positionSnapshot: WeeklyExecutivePayload['meta']['positionSnapshot'];
  positionCoverage: { registered: number; missing: number };
  common: Set<string>;
  options: Required<Pick<ExecPlanOptions, 'showArticleSummary' | 'entityMode'>>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 작은 유틸
// ─────────────────────────────────────────────────────────────────────────────

function clip(s: string, max: number): string {
  const t = normalizeSpaces(s);
  const chars = Array.from(t);
  return chars.length <= max ? t : chars.slice(0, Math.max(0, max - 1)).join('') + '…';
}

/** 외부 텍스트(CI 값·제목) 정제 — 태그·URL·제어문자·꺾쇠 제거 */
function clean(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  const t = Array.from(v)
    .map((ch) => {
      const c = ch.codePointAt(0) ?? 0;
      return c < 32 || (c >= 0x7f && c <= 0x9f) || c === 0x2028 || c === 0x2029 || c === 0xfeff ? ' ' : ch;
    })
    .join('')
    .replace(/<[^>]*>?/g, ' ')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/[<>*`#]/g, ' ');
  return clip(t, max);
}

function url400(url: string | null | undefined): string | null {
  const u = safeHttpsUrl(url);
  return u && u.length <= 400 ? u : null;
}

function uniq<T>(list: readonly T[]): T[] {
  return [...new Set(list)];
}

const WON_PCT = (n: number) => `${Math.round(n * 10) / 10}`;

/** 요소 하나의 가드 — 서버 숫자·입력 텍스트·공통 허용 집합 */
function makeGuard(common: Set<string>, numbers: ReadonlyArray<number | null | undefined>, texts: ReadonlyArray<string | null | undefined>): ExecGuard {
  const allowed = buildAllowed({ numbers }, { texts });
  for (const c of common) allowed.add(c);
  return { allowed, inputText: texts.filter(Boolean).join(' ') };
}

class EvidenceRegistry {
  private byKey = new Map<string, string>();
  readonly byRef = new Map<string, WeeklyReportEvidence>();
  add(ev: WeeklyReportEvidence): EvidenceItem {
    const key = `${ev.type}:${ev.id}`;
    let ref = this.byKey.get(key);
    if (!ref) {
      ref = `e${this.byKey.size + 1}`;
      this.byKey.set(key, ref);
      this.byRef.set(ref, ev);
    }
    return { ref, ev };
  }
}

/** 근거 보조 필드(썸네일·채널·게시 시각) — 400자 이하, ytimg https 썸네일만 */
function evidenceExtras(thumbnail: string | null, channel: string | null, publishedAt: string | null): Pick<WeeklyReportEvidence, 'thumbnail' | 'channel' | 'publishedAt'> {
  return {
    thumbnail: thumbnail && thumbnail.length <= 400 ? thumbnail : null,
    channel: channel ? clip(channel, 60) : null,
    publishedAt: publishedAt && !Number.isNaN(new Date(publishedAt).getTime()) ? publishedAt : null,
  };
}

function rowEvidence(row: BriefRow): WeeklyReportEvidence | null {
  const kind = classifyRow(row);
  if (kind === 'video') return { ...videoEvidence(row), ...evidenceExtras(resolveThumbnail(meta(row), row.url), channelOf(row), row.ts) };
  if (kind === 'news') return { ...articleEvidence(row), ...evidenceExtras(null, null, row.ts) };
  if (kind === 'paper') return { type: 'paper', id: row.id, title: clip(row.title, 120), url: safeArxivUrl(row.url), label: 'arXiv', ...evidenceExtras(null, null, row.ts) };
  return null;
}

function trimEvidence(ev: WeeklyReportEvidence): WeeklyReportEvidence {
  return { ...ev, title: clip(ev.title, 120), url: url400(ev.url), label: ev.label ? clip(ev.label, 60) : null };
}

function signalRowEvidence(r: SignalEvidenceRow): WeeklyReportEvidence {
  return {
    type: r.kind,
    id: r.id,
    title: clip(r.title, 120),
    url: url400(r.url),
    label: r.kind === 'paper' ? 'arXiv' : r.source ? clip(r.source, 60) : null,
    ...evidenceExtras(r.kind === 'video' ? resolveThumbnail({ thumbnail: r.thumbnail, videoId: r.videoId }, r.url) : null, r.channel ?? null, r.publishedAt ?? null),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 플랜 구성
// ─────────────────────────────────────────────────────────────────────────────

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

/**
 * 사업·공급망 사실 칩 (맵 응답에서 계산, 6개 이하). 모든 칩은 "무엇을 센 것인지"를 설명하는 note 를 가진다 —
 * 정의 사전(METRIC_DEFINITIONS)에서 분모(조사 대상 로봇 수 등)를 서버 값으로 채워 만든다. note 가 없는 칩은 내보내지 않는다.
 */
export function buildBusinessPicture(map: ActuatorMapBody | null): ExecFactChip[] {
  if (!map) return [];
  const s = map.sourcingStats;
  const D = METRIC_DEFINITIONS;
  const chips: ExecFactChip[] = [];
  chips.push({ label: '자체 조달 로봇', value: `${s.inHouse + s.inHouseSells}기`, note: D.inHouse(s.robots) });
  chips.push({ label: '외부 조달 로봇', value: `${s.external}기`, note: D.external(s.robots, s.externalMixed) });
  chips.push({ label: '조달 방식 미확인', value: `${s.unknown}기`, note: D.unknown(s.robots) });
  if (s.inHouseSells > 0) chips.push({ label: '자체 생산·외판', value: `${s.inHouseSells}기`, note: D.inHouseSells() });
  const prices = map.robots.filter((r) => !r.forecast && !r.isLG && r.price).map((r) => (r.price!.min + r.price!.max) / 2);
  const med = median(prices);
  if (med !== null) chips.push({ label: '공개 가격 중앙값', value: `$${Math.round(med).toLocaleString('en-US')}`, note: D.medianPrice(prices.length) });
  if (map.adoptions.length > 0) chips.push({ label: '외부 채택 사례', value: `${map.adoptions.length}건`, note: D.adoptions() });
  if (map.vendorMarkets.length > 0) chips.push({ label: '시장 세그먼트 등록 공급사', value: `${map.vendorMarkets.length}곳`, note: D.vendorMarkets() });
  return chips.filter((c) => !!c.note).map((c) => ({ ...c, note: clip(c.note!, CHIP_NOTE_MAX) })).slice(0, EXEC_LIMITS.business.picture);
}

function businessCategoryOf(text: string): BusinessCategory {
  const t = text.toLowerCase();
  for (const cat of ['mass_production', 'contract', 'pricing', 'sourcing'] as const) {
    if (BUSINESS_TERMS[cat].some((term) => t.includes(term.toLowerCase()))) return cat;
  }
  return 'market';
}

function hasBusinessTerm(text: string): boolean {
  const t = text.toLowerCase();
  return Object.values(BUSINESS_TERMS).some((terms) => terms.some((term) => t.includes(term.toLowerCase())));
}

function ciSentence(c: { company: string; item: string; before: string | null; after: string; confidence: string | null }): string {
  const after = clean(c.after, 60);
  const before = c.before ? clean(c.before, 60) : null;
  const grade = normalizeConfidence(c.confidence);
  return before
    ? `${clean(c.company, 40)}의 ${clean(c.item, 30)} 항목이 '${before}'에서 '${after}'${josa(after, '으로/로')} 갱신되었습니다(신뢰도 ${grade}).`
    : `${clean(c.company, 40)}의 ${clean(c.item, 30)} 항목이 '${after}'${josa(after, '으로/로')} 확인되었습니다(신뢰도 ${grade}).`;
}

/** "누가 무엇을 새로 확인했습니다" 사실 문장 — 회사·제품·축·값으로 만든다 (차이 카드 제목 줄) */
export function gapFactSentence(d: Pick<GapDraft, 'competitor' | 'axisLabel' | 'competitorValue'>): string {
  const name = clean(d.competitor.name, 40);
  const robot = d.competitor.robotName && d.competitor.robotName !== d.competitor.name ? ` ${clean(d.competitor.robotName, 40)}` : '';
  return clip(`이번 주 새로 확인된 ${name}${robot}의 ${d.axisLabel} 수치는 ${d.competitorValue.display}입니다.`, 120);
}

/** 경쟁사 동향 요약 규칙 문장 2~3개 — 어떤 회사의 무엇이 새로 나왔고, 우리와 비교하면 전체적으로 어떤 상황인가 */
export function gapRuleSummary(rows: readonly Pick<GapPlan, 'draft'>[]): string[] {
  const names = uniq(rows.map((r) => clean(r.draft.competitor.name, 30)));
  const axes = uniq(rows.map((r) => r.draft.axisLabel));
  const nameText = names.slice(0, 3).join(', ') + (names.length > 3 ? ' 등' : '');
  const axisText = axes.slice(0, 3).join(', ') + (axes.length > 3 ? ' 등' : '');
  const out = [`이번 주 ${nameText}에서 ${axisText} 수치가 새로 공개되거나 갱신되었습니다.`];
  const compared = rows.filter((r) => r.draft.status === 'compared');
  const count = (pos: string) => compared.filter((r) => r.draft.position === pos).length;
  if (compared.length > 0) {
    out.push(`ARGOS에 등록된 우리 수치와 같은 기준으로 비교한 ${compared.length}개 항목 중 경쟁사가 앞선 것은 ${count('competitor_ahead')}개, 비슷한 수준은 ${count('parity')}개, 우리가 앞선 것은 ${count('we_ahead')}개입니다.`);
    const missing = rows.length - compared.length;
    if (missing > 0) out.push(`우리 수치가 아직 등록되지 않아 비교하지 못한 항목은 ${missing}개입니다.`);
  } else {
    out.push('비교 기준이 되는 우리 수치가 아직 등록되지 않아 이번 주 항목은 비교하지 못했습니다.');
  }
  return out;
}

export function buildExecPlan(input: ExecCollected, options: ExecPlanOptions = {}): ExecPlan {
  const base = input.base;
  const showArticleSummary = options.showArticleSummary ?? true;
  const entityMode = options.entityMode ?? resolveEntityGuardMode();
  const week = isoWeekInfo(base.range.weekStart);
  const { counts, deltas } = computeCounts(base);
  const reg = new EvidenceRegistry();
  const rows = base.rows;
  const rowsByCompany = new Map<string, BriefRow[]>();
  for (const r of rows) {
    if (!r.companyId) continue;
    const list = rowsByCompany.get(r.companyId) ?? [];
    list.push(r);
    rowsByCompany.set(r.companyId, list);
  }
  const directory = new Map((base.companyDirectory ?? []).map((c) => [c.companyId, c.name]));

  const common = buildAllowed({ numbers: [...smallIntegers(), ...dateNumbers(base.range.weekStart), ...dateNumbers(base.range.weekEnd), week.weekNumber, week.isoYear, 4, 8, 30, 5] });

  // ── 우리 위치와 CI 신호
  const our: OurPosition | null = input.position.map || input.position.ciBenchmark || input.position.handBenchmark ? buildOurPosition(input.position) : null;
  const positionOk = input.position.map !== null && !input.position.failures.includes('position');
  const ciAxes = new Map<string, Set<string>>();
  const ciByAxis = new Map<string, (typeof base.ciChanges)[number]>();
  const ciPrev = new Map<string, number>();
  for (const c of base.ciChanges) {
    const axis = CI_AXIS_MAP[c.item];
    if (!axis) continue;
    const ck = companyKeyOf(c.company);
    const set = ciAxes.get(ck) ?? new Set<string>();
    set.add(axis);
    ciAxes.set(ck, set);
    const key = `${ck}:${axis}`;
    if (!ciByAxis.has(key)) ciByAxis.set(key, c);
    const prevV = parseCiPrevForAxis(axis, c.before);
    if (prevV !== null && !ciPrev.has(key)) ciPrev.set(key, prevV);
  }
  const weekSignals: WeekSignals = {
    ciAxes,
    specUpdatedRobotIds: new Set(input.specUpdatedRobotIds),
    mentionedCompanyIds: new Set(rows.map((r) => r.companyId).filter((x): x is string => !!x)),
    rangeStartMs: base.range.startUtc.getTime(),
    rangeEndMs: base.range.endUtcExclusive.getTime(),
  };

  // ── 격차
  const benchLabels = Object.fromEntries((input.position.ciBenchmark?.axes ?? []).map((a) => [a.key, a.label]));
  const gapDrafts: GapDraft[] = [];
  if (our && positionOk) {
    const facts: CompetitorFact[] = [
      ...(input.position.map ? competitorFactsFromMap(input.position.map) : []),
      ...competitorFactsFromCiBenchmark(input.position.ciBenchmark),
      ...competitorFactsFromHandBenchmark(input.position.handBenchmark),
    ];
    for (const f of facts) {
      const reason = newDataReason(f, weekSignals);
      if (!reason) continue;
      const key = `${f.companyKey}:${f.axisKey}`;
      const ci = ciByAxis.get(key);
      const enriched: CompetitorFact = ci ? { ...f, grade: normalizeConfidence(ci.confidence), sourceUrl: url400(ci.sourceUrl) ?? f.sourceUrl } : f;
      const prev = input.prev.gapValues[`gap:${f.companyKey}:${f.axisKey}`] ?? ciPrev.get(key) ?? null;
      const d = buildGapDraft(enriched, our, prev, reason, benchLabels);
      if (d) gapDrafts.push(d);
    }
  }
  const selectedGaps = selectGapDrafts(gapDrafts);
  const gapPlans: GapPlan[] = selectedGaps.map((d, i) => {
    const ci = ciByAxis.get(`${d.id.split(':')[1]}:${d.axisKey}`);
    const evidence: WeeklyReportEvidence[] = [];
    if (ci) evidence.push({ type: 'ci', id: ci.valueId, title: clip(`${ci.company} ${ci.item}`, 120), url: url400(ci.sourceUrl), label: `신뢰도 ${normalizeConfidence(ci.confidence)}` });
    const companyRows = d.competitor.companyId ? (rowsByCompany.get(d.competitor.companyId) ?? []).sort(newestFirst) : [];
    for (const r of companyRows) {
      if (evidence.length >= 2) break;
      const ev = rowEvidence(r);
      if (ev) evidence.push(trimEvidence(ev));
    }
    if (evidence.length === 0) evidence.push(...gapEvidence(d));
    const numbers = [d.competitorValue.value, d.ourValue?.value, d.diff?.abs, d.diff?.pct, d.prevCompetitorValue];
    const texts = [d.competitorValue.display, d.ourValue?.display, d.competitorValue.grade, d.axisLabel, d.competitor.name, d.competitor.robotName];
    return { ref: `g${i + 1}`, draft: d, ruleLines: gapRuleLines(d), ruleHeadline: gapFactSentence(d), evidence, guard: makeGuard(common, numbers, [...texts, d.ourRef, axisExplainKo(d.axisKey, d.axisLabel, d.unit)]) };
  });
  const coverage = computeCoverage(positionOk ? our : null, Object.keys(benchLabels).length > 0 ? benchLabels : undefined);
  const gapsGuard = makeGuard(common, gapPlans.flatMap((g) => [g.draft.competitorValue.value, g.draft.ourValue?.value, g.draft.diff?.abs, g.draft.diff?.pct]), gapPlans.flatMap((g) => [g.draft.competitorValue.display, g.draft.ourValue?.display]));

  // ── 기술 방향
  const techPlans: TechPlan[] = [];
  const shareSignals = selectTrendSignals(input.trend.series);
  for (const s of shareSignals) {
    const evRows = input.signalEvidence[s.id] ?? [];
    const evidence = evRows.slice(0, EXEC_LIMITS.evidencePerItem).map((r) => reg.add(signalRowEvidence(r)));
    if (evidence.length === 0) continue;
    const rel = s.relChangePct;
    const verb = s.direction === 'rising' ? '증가' : '감소';
    const rule = s.recent !== null && s.prior !== null ? [`${s.label}의 최근 4주 점유율은 ${WON_PCT(s.recent)}%로 이전 4주 ${WON_PCT(s.prior)}%보다 ${verb}했습니다.`] : [];
    const guard = makeGuard(common, [...s.series, s.recent, s.prior, rel, rel === null ? null : Math.abs(rel), s.recent !== null && s.prior !== null ? Math.abs(s.recent - s.prior) : null], [s.label]);
    techPlans.push({ ref: '', draft: s, ruleLines: rule, evidence, guard });
  }
  // 조달 신호 (T-4a): CI 이력의 외부 조달 이동 건수
  const proc = input.trend.procurement;
  if (proc && proc.total >= 3) {
    const cls = classifyCountSeries(proc.counts);
    const ciRows = base.ciChanges.filter((c) => c.item === '자체 생산 여부' || c.item === '액추에이터 공급사').slice(0, EXEC_LIMITS.evidencePerItem);
    if (cls.direction !== 'steady' && ciRows.length > 0) {
      const evidence = ciRows.map((c) => reg.add({ type: 'ci', id: c.valueId, title: clip(`${c.company} ${c.item}`, 120), url: url400(c.sourceUrl), label: `신뢰도 ${normalizeConfidence(c.confidence)}` }));
      const label = '관절 모듈 외부 조달 이동';
      const draft: TechSignalDraft = { id: 'procurement:ci_history', kind: 'procurement', domain: 'actuator', label, direction: cls.direction, series: proc.counts, recent: cls.recent, prior: cls.prior, relChangePct: null, ref: {} };
      const verb = cls.direction === 'rising' ? '늘었습니다' : '줄었습니다';
      techPlans.push({
        ref: '',
        draft,
        ruleLines: [`외부 조달 쪽으로 바뀐 CI 변경은 최근 4주 ${cls.recent}건으로 이전 4주 ${cls.prior}건보다 ${verb}.`],
        evidence,
        guard: makeGuard(common, [...proc.counts, cls.recent, cls.prior, Math.abs(cls.recent - cls.prior)], [label]),
      });
    }
  }
  const techCapped = techPlans.slice(0, 6);
  techCapped.forEach((t, i) => (t.ref = `t${i + 1}`));
  const procurement = procurementState([...input.prev.snapshots, ...(snapshotOf(input.position.map) ? [snapshotOf(input.position.map)!] : [])]);

  // ── 사업·공급망
  const bizPlans: BizPlan[] = [];
  const bizGroups = new Map<string, { company: string; companyId: string | null; category: BusinessCategory; rows: BriefRow[]; ci: typeof base.ciChanges }>();
  for (const r of rows) {
    const kind = classifyRow(r);
    if (kind !== 'video' && kind !== 'news') continue;
    const dom = kind === 'video' ? videoDomainBadge(r) : articleDomainBadge(r);
    if (dom !== 'production' && dom !== 'actuator') continue;
    const m = meta(r);
    const text = `${r.title} ${Array.isArray(m.keyPoints) ? m.keyPoints.join(' ') : ''}`;
    if (!hasBusinessTerm(text)) continue;
    const company = r.companyId ? directory.get(r.companyId) : undefined;
    if (!company) continue;
    const cat = businessCategoryOf(text);
    const key = `${companyKeyOf(company)}:${cat}`;
    const g = bizGroups.get(key) ?? { company, companyId: r.companyId, category: cat, rows: [], ci: [] };
    g.rows.push(r);
    bizGroups.set(key, g);
  }
  for (const c of base.ciChanges) {
    if (!/biz|비즈|사업/i.test(c.layer ?? '')) continue;
    const cat = businessCategoryOf(`${c.item} ${c.after}`);
    const key = `${companyKeyOf(c.company)}:${cat}`;
    const g = bizGroups.get(key) ?? { company: c.company, companyId: null, category: cat, rows: [], ci: [] };
    g.ci.push(c);
    bizGroups.set(key, g);
  }
  const map = input.position.map;
  const pictureChips = buildBusinessPicture(map);
  const bizSorted = [...bizGroups.entries()]
    .map(([key, g]) => ({ key, g, score: (g.category === 'pricing' || g.category === 'contract' ? CONCLUSION_BASE_SCORE.business.priced : CONCLUSION_BASE_SCORE.business.other) + (g.ci.some((c) => ['A', 'B'].includes(normalizeConfidence(c.confidence))) ? CONCLUSION_BASE_SCORE.trustBonus : 0) }))
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))
    .slice(0, EXEC_LIMITS.business.moves);
  for (const { key, g } of bizSorted) {
    const evs: WeeklyReportEvidence[] = [];
    for (const c of g.ci.slice(0, 2)) evs.push({ type: 'ci', id: c.valueId, title: clip(`${c.company} ${c.item}`, 120), url: url400(c.sourceUrl), label: `신뢰도 ${normalizeConfidence(c.confidence)}` });
    for (const r of g.rows.sort(newestFirst)) {
      if (evs.length >= EXEC_LIMITS.evidencePerItem) break;
      const ev = rowEvidence(r);
      if (ev) evs.push(trimEvidence(ev));
    }
    if (evs.length === 0) continue;
    const facts: ExecFactChip[] = [];
    const robots = map ? map.robots.filter((r) => !r.isLG && !r.forecast && companyKeyOf(r.company) === companyKeyOf(g.company)) : [];
    const priced = robots.find((r) => r.price);
    if (priced?.price) facts.push({ label: '공개 가격', value: clip(`$${Math.round((priced.price.min + priced.price.max) / 2).toLocaleString('en-US')}`, 24), note: clip(METRIC_DEFINITIONS.robotPrice(clean(priced.name, 40), isEstimatedGrade(String(priced.price.conf ?? ''))), CHIP_NOTE_MAX) });
    const ext = robots.find((r) => r.sourcing.externalVendors.length > 0);
    const vendor = ext?.sourcing.externalVendors[0]?.vendor ? clip(ext.sourcing.externalVendors[0].vendor, 60) : null;
    if (vendor && map) {
      const n = map.adoptions.filter((a) => a.actuatorVendor.toLowerCase() === vendor.toLowerCase()).length;
      if (n > 0) facts.push({ label: `${clip(vendor, 20)} 외부 채택 사례`, value: `${n}건`, note: clip(METRIC_DEFINITIONS.vendorAdoptions(clip(vendor, 40)), CHIP_NOTE_MAX) });
    }
    if (ext) {
      const posture = ext.sourcing.posture === 'external' ? 'external' : ext.sourcing.posture === 'in_house' ? 'in_house' : 'unknown';
      facts.push({ label: '로봇의 조달 방식', value: posture === 'external' ? '외부 조달' : posture === 'in_house' ? '자체 개발' : '확인 불가', note: clip(METRIC_DEFINITIONS.posture(posture, isEstimatedGrade(ext.sourcing.evidenceGrade ?? null)), CHIP_NOTE_MAX) });
    }
    const factLine = `${clean(g.company, 40)} ${BUSINESS_CATEGORY_LABEL[g.category]} 관련 항목 ${evs.length}개 근거` + (g.ci[0] ? `. ${ciSentence(g.ci[0])}` : '');
    const evidence = evs.map((e) => reg.add(e));
    const numbers = [...facts, ...pictureChips].flatMap((f) => [f.label, f.value, f.note].map((x) => (x ? x : null)));
    bizPlans.push({
      ref: `b${bizPlans.length + 1}`,
      id: `biz:${key}`.replace(/\./g, '-'),
      category: g.category,
      company: clip(clean(g.company, 60), 60),
      vendor,
      facts: facts.slice(0, EXEC_LIMITS.business.factsPerMove),
      fact: clip(factLine, 240),
      evidence,
      guard: makeGuard(common, [], [...numbers.filter((x): x is string => typeof x === 'string'), factLine, g.company]),
    });
  }

  // ── 결론 후보
  const cands: Omit<CandidatePlan, 'ref'>[] = [];
  const gapUsed = new Set<string>();
  for (const g of gapPlans) {
    const d = g.draft;
    if (d.status !== 'compared' || d.priority > 2) continue;
    const baseScore = d.priority === 0 ? CONCLUSION_BASE_SCORE.gap.aheadClosing : d.priority === 1 ? CONCLUSION_BASE_SCORE.gap.aheadFirstSeen : CONCLUSION_BASE_SCORE.gap.parityClosing;
    const trust = d.competitorValue.grade === 'A' || d.competitorValue.grade === 'B' ? CONCLUSION_BASE_SCORE.trustBonus : 0;
    const who = d.competitor.robotName && d.competitor.robotName !== d.competitor.name ? `${d.competitor.name} ${d.competitor.robotName}` : d.competitor.name;
    gapUsed.add(d.id);
    cands.push({
      id: `c:${d.id.slice(4).replace(/:/g, '-')}`.replace(/\./g, '-'),
      kind: 'gap_shift',
      domain: GAP_DOMAIN[d.axisKey] ?? null,
      score: baseScore + trust,
      ruleHeadline: clip(`${clean(d.competitor.name, 24)}의 ${d.axisLabel} 수치가 새로 확인되었습니다`, 50),
      ruleLines: [
        { role: 'change', text: `${clean(who, 60)}의 ${d.axisLabel}은 ${d.competitorValue.display}입니다.` },
        { role: 'why', text: g.ruleLines[0] ?? '' },
      ].filter((l) => l.text) as ExecLine[],
      gapRefs: [d.id],
      evidence: g.evidence.slice(0, 3).map((e) => reg.add(e)),
      facts: {
        company: clean(who, 60),
        axis: d.axisLabel,
        competitorValue: d.competitorValue.display,
        ourValue: d.ourValue?.display ?? null,
        diff: d.diff ? `${d.diff.abs} (${d.diff.pct}%)` : null,
        position: d.labelKo.position,
        movement: d.labelKo.movement,
        grade: d.competitorValue.grade,
        prev: d.prevCompetitorValue,
        ourRef: d.ourValue ? (d.ourRef ?? null) : null,
        axisNote: axisExplainKo(d.axisKey, d.axisLabel, d.unit),
      },
      position: d.position,
      movement: d.movement,
      guard: g.guard,
    });
  }
  for (const t of techCapped) {
    const d = t.draft;
    const core = d.domain === 'hand' || d.domain === 'actuator';
    cands.push({
      id: `c:tech-${d.id.replace(/[^a-z0-9가-힣]+/gi, '-')}`.toLowerCase(),
      kind: 'tech_signal',
      domain: d.domain,
      score: core ? CONCLUSION_BASE_SCORE.tech.core : CONCLUSION_BASE_SCORE.tech.other,
      ruleHeadline: clip(`${d.label} 관련 자료 비율이 ${d.direction === 'rising' ? '높아졌습니다' : '낮아졌습니다'}`, 50),
      ruleLines: t.ruleLines.map((text) => ({ role: 'change' as const, text })),
      gapRefs: [],
      evidence: t.evidence,
      facts: { label: d.label, direction: d.direction === 'rising' ? '상승' : '하락', recent: d.recent, prior: d.prior, relChangePct: d.relChangePct, kind: d.kind, meaning: techExplain(d) },
      position: null,
      guard: t.guard,
    });
  }
  for (const b of bizPlans) {
    cands.push({
      id: `c:${b.id.replace(/^biz:/, 'biz-').replace(/:/g, '-')}`,
      kind: 'business_move',
      domain: b.category === 'sourcing' ? 'actuator' : 'production',
      score: b.category === 'pricing' || b.category === 'contract' ? CONCLUSION_BASE_SCORE.business.priced : CONCLUSION_BASE_SCORE.business.other,
      ruleHeadline: clip(`${b.company}의 ${BUSINESS_CATEGORY_LABEL[b.category]} 관련 동향이 확인되었습니다`, 50),
      ruleLines: [{ role: 'change', text: `${b.company}의 ${BUSINESS_CATEGORY_LABEL[b.category]} 관련 동향이 확인되었습니다.` }],
      gapRefs: [],
      evidence: b.evidence,
      facts: { company: b.company, category: BUSINESS_CATEGORY_LABEL[b.category], facts: b.facts.map((f) => `${f.label} ${f.value}`).join(' / ') || null },
      position: null,
      guard: b.guard,
    });
  }
  const strongCi = base.ciChanges
    .filter((c) => c.valueChanged && ['A', 'B'].includes(normalizeConfidence(c.confidence)))
    .filter((c) => !(CI_AXIS_MAP[c.item] && gapUsed.has(`gap:${companyKeyOf(c.company)}:${CI_AXIS_MAP[c.item]}`)))
    .sort((a, b) => CONFIDENCE_RANK[normalizeConfidence(a.confidence)]! - CONFIDENCE_RANK[normalizeConfidence(b.confidence)]! || b.changedAt.localeCompare(a.changedAt) || a.valueId.localeCompare(b.valueId))
    .slice(0, 3);
  for (const c of strongCi) {
    const text = `${c.company} ${c.item} ${c.before ?? ''} ${c.after}`;
    cands.push({
      id: `c:ci-${c.valueId.replace(/[^a-z0-9-]/gi, '').slice(0, 24)}`,
      kind: 'ci_change',
      domain: null,
      score: CONCLUSION_BASE_SCORE.ci + CONCLUSION_BASE_SCORE.trustBonus,
      ruleHeadline: clip(`${clean(c.company, 24)}의 ${clean(c.item, 14)} 정보가 갱신되었습니다`, 50),
      ruleLines: [{ role: 'change', text: ciSentence(c) }],
      gapRefs: [],
      evidence: [reg.add({ type: 'ci', id: c.valueId, title: clip(`${c.company} ${c.item}`, 120), url: url400(c.sourceUrl), label: `신뢰도 ${normalizeConfidence(c.confidence)}` })],
      facts: { company: clean(c.company, 40), item: clean(c.item, 30), before: c.before ? clean(c.before, 60) : null, after: clean(c.after, 60), grade: normalizeConfidence(c.confidence) },
      position: null,
      guard: makeGuard(common, [], [text]),
    });
  }
  const selected: Omit<CandidatePlan, 'ref'>[] = [];
  const perKind = new Map<ExecConclusionKind, number>();
  for (const c of [...cands].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))) {
    if (selected.length >= EXEC_LIMITS.conclusions.max) break;
    if ((perKind.get(c.kind) ?? 0) >= EXEC_LIMITS.conclusions.perKind) continue;
    if (selected.some((s) => s.id === c.id)) continue;
    perKind.set(c.kind, (perKind.get(c.kind) ?? 0) + 1);
    selected.push(c);
  }
  const candidates: CandidatePlan[] = selected.map((c, i) => ({ ...c, ref: `c${i + 1}` }));

  // ── 근거 자료 (부록)
  const videoRows = new Map(rows.map((r) => [r.id, r]));
  const allVideos = selectReportVideos(rows);
  const vPicked: typeof allVideos = [];
  const bucket = new Map<string, number>();
  for (const v of allVideos) {
    if (vPicked.length >= EXEC_LIMITS.videos.max) break;
    const b = v.domain ?? 'other';
    if ((bucket.get(b) ?? 0) >= EXEC_LIMITS.videos.bucketCap) continue;
    bucket.set(b, (bucket.get(b) ?? 0) + 1);
    vPicked.push(v);
  }
  for (const v of allVideos) {
    if (vPicked.length >= EXEC_LIMITS.videos.min) break;
    if (!vPicked.includes(v)) vPicked.push(v);
  }
  const videos: ExecVideo[] = vPicked.map((v) => ({
    id: v.id,
    title: v.title,
    titleKo: null,
    channel: v.channel,
    publishedAt: v.publishedAt,
    url: v.url,
    thumbnail: v.thumbnail,
    views: v.views,
    durationSec: v.durationSec,
    domain: v.domain,
    summaryLines: v.summaryLines.slice(0, EXEC_LIMITS.videos.lines),
    tags: v.tags.slice(0, EXEC_LIMITS.videos.tags),
  }));
  void videoRows;
  const rowById = new Map(rows.map((r) => [r.id, r]));
  const artItems = selectArticles(rows.filter((r) => !r.url || r.url.length <= 400), false);
  const aPicked: ExecArticle[] = [];
  const perSource = new Map<string, number>();
  for (const a of artItems) {
    if (aPicked.length >= EXEC_LIMITS.articles.max) break;
    if ((perSource.get(a.source) ?? 0) >= EXEC_LIMITS.articles.sourceCap) continue;
    perSource.set(a.source, (perSource.get(a.source) ?? 0) + 1);
    const row = rowById.get(a.id);
    const line = row ? articleSummaryLines(row, showArticleSummary)[0] : undefined;
    aPicked.push({ id: a.id, title: clip(a.title, 200), titleKo: null, source: clip(a.source || '출처 미상', 60), publishedAt: a.publishedAt, url: a.url, domain: a.domain, summaryLine: line ? clip(line, EXEC_LIMITS.articles.line) : null });
  }
  const paperItems = selectPapers(rows.filter((r) => !r.url || r.url.length <= 400), false)
    .map((p) => ({ p, row: rowById.get(p.id) }))
    .filter((x): x is { p: ReturnType<typeof selectPapers>[number]; row: BriefRow } => !!x.row && paperSummaryLines(x.row).length > 0)
    .slice(0, EXEC_LIMITS.papers.candidates);
  const papers: PaperPlan[] = paperItems.map(({ p, row }, i) => ({
    ref: `p${i + 1}`,
    paper: { id: p.id, title: clip(p.title, 200), titleKo: null, authors: p.authors, publishedAt: p.publishedAt, url: p.url, arxivId: p.arxivId, domain: p.domain },
    aiLine: clip(paperSummaryLines(row).join(' '), 160),
  }));
  const titles: TitleTarget[] = [];
  const addTitle = (kind: TitleTarget['kind'], id: string, title: string) => titles.push({ ref: `x${titles.length + 1}`, kind, id, title });
  for (const v of videos) addTitle('video', v.id, v.title);
  for (const p of papers) addTitle('paper', p.paper.id, p.paper.title);
  for (const a of aPicked) addTitle('article', a.id, a.title);

  // ── 집계 한 줄
  const dlt = (label: string, v: number | null) => (v === null ? null : `${label} ${v >= 0 ? '+' : ''}${v}%`);
  const deltaParts = [dlt('영상', deltas.videosNew), dlt('뉴스', deltas.articles), dlt('논문', deltas.papers)].filter(Boolean);
  const collectionLine = `이번 주 ARGOS가 새로 수집한 자료: 영상 ${counts.videosNew}건, 뉴스 ${counts.articles}건, 논문 ${counts.papers}건` + (deltaParts.length > 0 ? ` (지난주 수집량 대비 ${deltaParts.join(', ')})` : '');

  const noData = rows.length === 0 && base.ciChanges.length === 0 && gapPlans.length === 0 && techCapped.length === 0;
  const warnings = [...input.warnings, ...base.warnings];
  const unique = uniq(warnings);

  return {
    weekStart: base.range.weekStart,
    weekEnd: base.range.weekEnd,
    period: `${base.range.weekStart} ~ ${base.range.weekEnd}`,
    isoYear: week.isoYear,
    weekNumber: week.weekNumber,
    counts,
    deltas,
    periodStartAt: base.range.startUtc.toISOString(),
    periodEndAt: base.range.periodEndInclusive.toISOString(),
    noData,
    truncated: base.truncated,
    inputWarnings: unique,
    candidates,
    gaps: { rows: gapPlans, coverage, positionOk, guard: gapsGuard },
    tech: { signals: techCapped, window: { weeks: 8, recentWeeks: 4, asOfWeekStart: trendWeekStarts(base.range.weekStart)[7]! }, procurement },
    business: { picture: pictureChips, moves: bizPlans, asOf: map ? map.generatedAt.slice(0, 10) : null },
    evidenceByRef: reg.byRef,
    videos,
    papers,
    articles: aPicked,
    titles,
    collectionLine,
    positionSnapshot: snapshotOf(map),
    positionCoverage: { registered: coverage.registered.length, missing: coverage.missing.length },
    common,
    options: { showArticleSummary, entityMode },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 결과 확정 (AI 응답 검증 + 규칙 폴백)
// ─────────────────────────────────────────────────────────────────────────────

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}
function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
function refList(v: unknown): string[] {
  return asArray(v).filter((x): x is string => typeof x === 'string');
}

const ACTION_KINDS: readonly ExecActionKind[] = ['evaluate', 'contact', 'watch', 'decide', 'none'];
const QUESTION_KINDS: readonly ExecQuestionKind[] = ['evaluate', 'contact', 'decide', 'watch'];
const LINE_ROLES: readonly ExecLineRole[] = ['change', 'why', 'action', 'detail'];

interface Tally {
  elements: number;
  elementsFallback: number;
  dropped: Record<string, number>;
}

function addStats(t: Tally, s: ExecGuardStats): void {
  for (const [k, v] of Object.entries(s.dropped)) t.dropped[k] = (t.dropped[k] ?? 0) + v;
}

function sourceOf(flags: readonly boolean[]): WeeklySectionSource {
  if (flags.length === 0) return 'none';
  if (flags.every(Boolean)) return 'ai';
  if (flags.some(Boolean)) return 'mixed';
  return 'rule';
}

/** 헤드라인 검증: 정책·금칙어·숫자·길이 (합니다체 아님 — 명사구) */
function guardHeadline(raw: unknown, g: ExecGuard, max: number): string | null {
  if (typeof raw !== 'string') return null;
  const t = normalizeSpaces(raw);
  if (!t || charLength(t) > max) return null;
  if (violatesTextPolicy(t) || findBannedPhraseV3(t, g.inputText) || disallowedNumbers(t, g.allowed).length > 0) return null;
  // 제목은 사실 문장 — 물음표·요구형과 제안형 어미(~볼 필요가 있을 것 같습니다 등)를 쓰지 않는다
  if (isRequestForm(t) || endsWithProposal(t) || /필요$/.test(t.replace(/[.\s]+$/, ''))) return null;
  return t;
}

export interface ExecResult {
  payload: WeeklyExecutivePayload;
  status: Exclude<WeeklyBriefStatusCode, 'failed'>;
  stats: Record<string, unknown>;
  plan: ExecPlan;
}

export interface ExecStatusInput {
  noData: boolean;
  warnings: readonly string[];
  sectionSources: Record<ExecSectionKey, WeeklySectionSource>;
  ruleElements: number;
  totalElements: number;
}

export function decideExecStatus(input: ExecStatusInput): Exclude<WeeklyBriefStatusCode, 'failed'> {
  if (input.noData) return 'partial';
  if (input.warnings.some((w) => w.endsWith('_failed') || w === 'ai_disabled')) return 'partial';
  if (input.totalElements > 0 && input.ruleElements / input.totalElements > EXEC_LIMITS.partialRuleRatio) return 'partial';
  return 'ok';
}

export interface RuleQuestion {
  kind: ExecQuestionKind;
  text: string;
  rationale: string[];
  evidence: WeeklyReportEvidence[];
  conclusionRef: string | null;
  guard: ExecGuard;
}

/**
 * 확인 사항 규칙 폴백 템플릿 — T1 기술 흐름(점유율 증가·감소), T2 경쟁사 비교, T3 CI 갱신.
 * 값은 서버가 계산한 숫자·라벨만 쓴다. 호출자가 §가드를 통과시킨 것만 채택한다.
 */
export function ruleQuestionTemplates(plan: ExecPlan): RuleQuestion[] {
  const out: RuleQuestion[] = [];
  const candRefOf = (pred: (c: CandidatePlan) => boolean) => plan.candidates.find(pred)?.ref ?? null;
  // T1: 기술 흐름 (점유율 %만 — 조달 건수 신호는 제외)
  for (const t of plan.tech.signals) {
    const d = t.draft;
    if (d.kind === 'procurement' || d.recent === null || d.prior === null || t.evidence.length === 0) continue;
    const verb = d.direction === 'rising' ? '증가' : '감소';
    out.push({
      kind: 'watch',
      text: `'${d.label}' 관련 자료의 점유율이 다음 주에도 같은 방향으로 이어지는지 집계 결과를 확인해 볼 필요가 있을 것 같습니다.`,
      rationale: [`'${d.label}' 관련 자료가 전체 자료에서 차지하는 비율은 최근 4주 ${WON_PCT(d.recent)}%로 이전 4주 ${WON_PCT(d.prior)}%보다 ${verb}했습니다. 일시적인 변화인지 흐름인지는 아직 알 수 없습니다.`],
      evidence: t.evidence.map((e) => e.ev),
      conclusionRef: candRefOf((c) => c.kind === 'tech_signal' && c.facts.label === d.label),
      guard: t.guard,
    });
  }
  // T2: 경쟁사 비교 (경쟁사가 접근 중이거나 이번 주 처음 확인된 항목, 우리 수치가 없는 항목)
  for (const g of plan.gaps.rows) {
    const d = g.draft;
    if (g.evidence.length === 0) continue;
    const who = clean(d.competitor.robotName && d.competitor.robotName !== d.competitor.name ? `${d.competitor.name} ${d.competitor.robotName}` : d.competitor.name, 60);
    const ref = candRefOf((c) => c.gapRefs.includes(d.id));
    if (d.status === 'compared' && d.ourValue && (d.movement === 'competitor_closing' || d.movement === 'first_seen')) {
      const label = movementLabelKo(d.position, d.movement) ?? '';
      out.push({
        kind: 'evaluate',
        text: `${who}의 ${d.axisLabel} 수치(${d.competitorValue.display})를 공개 사양 자료와 대조해 볼 필요가 있을 것 같습니다.`,
        rationale: [`${who}의 ${withJosa(d.axisLabel, '은/는')} ${d.competitorValue.display}${josa(d.competitorValue.display, '이고/고')} 우리 쪽(${d.ourRef ?? '등록값'})은 ${d.ourValue.display}입니다. 비교 결과는 '${label}'${josa(label, '이/가') === '이' ? '이지만' : '지만'} 출처의 측정 조건은 아직 알 수 없습니다.`],
        evidence: g.evidence,
        conclusionRef: ref,
        guard: g.guard,
      });
    } else if (d.status === 'ours_missing') {
      out.push({
        kind: 'evaluate',
        text: `${who}의 ${d.axisLabel} 수치(${d.competitorValue.display})를 비교할 수 있도록 우리 쪽 ${d.axisLabel} 수치를 먼저 확인해 볼 필요가 있겠습니다.`,
        rationale: [`${who}의 ${withJosa(d.axisLabel, '은/는')} ${d.competitorValue.display}입니다. 우리 쪽 수치는 아직 등록되지 않았습니다.`],
        evidence: g.evidence,
        conclusionRef: ref,
        guard: g.guard,
      });
    }
  }
  // T3: CI 갱신 (신뢰도 A·B 후보만 — 후보 선정이 그렇다)
  for (const c of plan.candidates) {
    if (c.kind !== 'ci_change' || c.evidence.length === 0) continue;
    const f = c.facts;
    const before = typeof f.before === 'string' ? f.before : null;
    const grade = String(f.grade ?? '');
    out.push({
      kind: 'evaluate',
      text: `${f.company}의 ${withJosa(String(f.item), '이/가')} '${f.after}'${josa(String(f.after), '으로/로')} 갱신된 내용을 출처 원문과 대조해 볼 필요가 있을 것 같습니다.`,
      rationale: [`${f.company}의 ${withJosa(String(f.item), '이/가')} ${before ? `'${before}'에서 ` : ''}'${f.after}'${josa(String(f.after), '으로/로')} 갱신되었습니다${isEstimatedGrade(grade) ? '(추정치)' : ''}. 갱신 근거의 세부 조건은 요약만으로는 알 수 없습니다.`],
      evidence: c.evidence.map((e) => e.ev),
      conclusionRef: c.ref,
      guard: c.guard,
    });
  }
  return out;
}

export function finalizeExec(plan: ExecPlan, aiIn: ExecAiInput | null, now: Date, options: ExecPlanOptions = {}): ExecResult {
  const ai = aiIn ?? EMPTY_EXEC_AI;
  const entityMode = options.entityMode ?? plan.options.entityMode;
  const tally: Tally = { elements: 0, elementsFallback: 0, dropped: {} };
  const aiDiscarded: { section: string; id: string; reason: string }[] = [];
  const A = asRecord(ai.A);
  const B = asRecord(ai.B);
  const C = asRecord(ai.C);
  const D = asRecord(ai.D) ?? (Array.isArray(ai.D) ? { titles: ai.D } : null);

  const guardLines = (
    raw: unknown,
    g: ExecGuard,
    position: ExecGapPosition | null = null,
    movement: ExecGapMovement | null = null,
    scope: ExecGuardScope = 'plain',
    requireNumberTarget = false,
  ): string[] => {
    const r = guardExecSentences(raw, { allowed: g.allowed, inputText: g.inputText, entityMode, position, movement, scope, requireNumberTarget });
    addStats(tally, r.stats);
    return r.sentences;
  };

  // ── 결론
  const candByRef = new Map(plan.candidates.map((c) => [c.ref, c]));
  const aiEntries = new Map<string, { headline: string | null; lines: ExecLine[]; actionKind: ExecActionKind }>();
  const aiOrder: string[] = [];
  for (const item of asArray(A?.conclusions)) {
    const o = asRecord(item);
    const ref = typeof o?.candidateId === 'string' ? o.candidateId : '';
    const cand = candByRef.get(ref);
    if (!o || !cand) {
      aiDiscarded.push({ section: 'conclusions', id: ref || '*', reason: 'unknown_candidate' });
      continue;
    }
    if (aiEntries.has(ref)) {
      aiDiscarded.push({ section: 'conclusions', id: ref, reason: 'duplicate_id' });
      continue;
    }
    const actionKind = typeof o.actionKind === 'string' ? (o.actionKind as ExecActionKind) : 'none';
    if (!ACTION_KINDS.includes(actionKind)) {
      aiDiscarded.push({ section: 'conclusions', id: ref, reason: 'bad_action_kind' });
      continue;
    }
    const refs = refList(o.refs);
    const candRefs = new Set(cand.evidence.map((e) => e.ref));
    if (refs.length === 0 || !refs.some((r) => candRefs.has(r))) {
      aiDiscarded.push({ section: 'conclusions', id: ref, reason: 'no_valid_refs' });
      continue;
    }
    const lines: ExecLine[] = [];
    for (const l of asArray(o.lines)) {
      const lo = asRecord(l);
      const role = typeof lo?.role === 'string' && LINE_ROLES.includes(lo.role as ExecLineRole) ? (lo.role as ExecLineRole) : null;
      if (!lo || !role) continue;
      for (const s of guardLines(lo.text, cand.guard, cand.position, cand.movement ?? null, role === 'action' ? 'proposal' : 'plain')) lines.push({ role, text: s });
    }
    const roles = new Set(lines.map((l) => l.role));
    if (lines.length < EXEC_LIMITS.conclusions.minLines || !roles.has('change') || !roles.has('why') || !roles.has('action')) {
      aiDiscarded.push({ section: 'conclusions', id: ref, reason: 'lines_insufficient' });
      continue;
    }
    aiEntries.set(ref, { headline: guardHeadline(o.headline, cand.guard, EXEC_LIMITS.conclusions.headline), lines: lines.slice(0, EXEC_LIMITS.conclusions.maxLines), actionKind });
    aiOrder.push(ref);
  }
  const orderedRefs = [...aiOrder, ...plan.candidates.map((c) => c.ref).filter((r) => !aiEntries.has(r))];
  const conclusions: ExecConclusion[] = orderedRefs.map((ref, i) => {
    const cand = candByRef.get(ref)!;
    const entry = aiEntries.get(ref);
    tally.elements++;
    if (!entry) tally.elementsFallback++;
    return {
      id: cand.id,
      rank: i + 1,
      kind: cand.kind,
      domain: cand.domain,
      headline: entry?.headline ?? cand.ruleHeadline,
      lines: entry ? entry.lines : cand.ruleLines.slice(0, EXEC_LIMITS.conclusions.maxLines),
      actionKind: entry?.actionKind ?? 'none',
      gapRefs: cand.gapRefs.slice(0, 3),
      evidence: cand.evidence.slice(0, EXEC_LIMITS.evidencePerItem).map((e) => e.ev),
      generatedBy: entry ? 'ai' : 'rule',
    } satisfies ExecConclusion;
  });
  const conclusionIdByRef = new Map(plan.candidates.map((c) => [c.ref, c.id]));

  // ── 격차
  const gapAi = new Map<string, unknown>();
  const gapAiHeadline = new Map<string, unknown>();
  for (const item of asArray(B?.rows)) {
    const o = asRecord(item);
    if (o && typeof o.id === 'string') {
      gapAi.set(o.id, o.lines);
      gapAiHeadline.set(o.id, o.headline);
    }
  }
  const gapRows: ExecGapRow[] = plan.gaps.rows.map((g) => {
    const d = g.draft;
    tally.elements++;
    let lines: string[] = [];
    let by: WeeklyGeneratedBy = 'rule';
    if (gapAi.has(g.ref)) {
      const picked = guardLines(gapAi.get(g.ref), g.guard, d.position, d.movement, 'plain', true);
      const max = d.status === 'compared' ? EXEC_LIMITS.gaps.maxLines : EXEC_LIMITS.gaps.missingMaxLines;
      const min = d.status === 'compared' ? EXEC_LIMITS.gaps.minLines : 1;
      const mentionsMissing = d.status === 'compared' || picked.some((s) => /미등록|등록되어 있지 않|등록되지 않|등록된 수치가 없/.test(s));
      if (picked.length >= min && mentionsMissing) {
        lines = picked.slice(0, max);
        by = 'ai';
      } else aiDiscarded.push({ section: 'gaps', id: g.ref, reason: picked.length < min ? 'lines_insufficient' : 'missing_notice' });
    }
    if (by === 'rule') {
      lines = g.ruleLines;
      tally.elementsFallback++;
    }
    // 제목 줄 사실 문장 — AI 문장이 가드(합니다체·요구형 금지·회사 또는 축 이름 포함)를 통과하면 쓰고, 아니면 서버 규칙 문장
    let headline = g.ruleHeadline;
    const aiHead = gapAiHeadline.get(g.ref);
    if (by === 'ai' && typeof aiHead === 'string') {
      const picked = guardLines(aiHead, g.guard, d.position, d.movement, 'plain', true);
      const h = picked.length === 1 ? picked[0]! : '';
      if (h && charLength(h) <= 100 && (h.includes(d.competitor.name) || h.includes(d.axisLabel))) headline = h;
    }
    const { reason: _r, priority: _p, ...rest } = d;
    return { ...rest, headline, lines, evidence: g.evidence.slice(0, 2), generatedBy: by } satisfies ExecGapRow;
  });
  let gapSummary: string[] = [];
  let gapSummaryBy: WeeklyGeneratedBy | null = null;
  if (gapRows.length > 0) {
    // 요약은 2~3문장이어야 한다 — 문장이 모자라면 규칙 요약으로 대체한다
    const s = guardExecSentences(B?.summary, { allowed: plan.gaps.guard.allowed, inputText: plan.gaps.guard.inputText, entityMode, maxChars: EXEC_LIMITS.gaps.summaryChars });
    addStats(tally, s.stats);
    if (s.sentences.length >= EXEC_LIMITS.gaps.summaryMin) {
      gapSummary = s.sentences.slice(0, EXEC_LIMITS.gaps.summaryMax);
      gapSummaryBy = 'ai';
    } else {
      if (B?.summary !== undefined) aiDiscarded.push({ section: 'gaps', id: 'summary', reason: 'summary_too_short' });
      gapSummary = gapRuleSummary(plan.gaps.rows);
      gapSummaryBy = 'rule';
    }
  } else if (!plan.gaps.positionOk && !plan.noData) {
    gapSummary = ['비교 기준이 되는 우리 쪽 수치를 불러오지 못했습니다.'];
    gapSummaryBy = 'rule';
  }

  // ── 기술 방향
  const techAi = new Map<string, unknown>();
  for (const item of asArray(C?.signals)) {
    const o = asRecord(item);
    if (o && typeof o.id === 'string') techAi.set(o.id, o.lines);
  }
  const signals: ExecTechSignal[] = plan.tech.signals.map((t) => {
    const d = t.draft;
    tally.elements++;
    let lines: string[] = [];
    let by: WeeklyGeneratedBy = 'rule';
    if (techAi.has(t.ref)) {
      const picked = guardLines(techAi.get(t.ref), t.guard);
      if (picked.length >= EXEC_LIMITS.tech.minLines) {
        lines = picked.slice(0, EXEC_LIMITS.tech.maxLines);
        by = 'ai';
      } else aiDiscarded.push({ section: 'tech', id: t.ref, reason: 'lines_insufficient' });
    }
    if (by === 'rule') {
      lines = t.ruleLines;
      tally.elementsFallback++;
    }
    return {
      id: d.id.replace(/\./g, '-'),
      kind: d.kind,
      domain: d.domain,
      label: d.label,
      direction: d.direction,
      series: d.series,
      recent: d.recent,
      prior: d.prior,
      relChangePct: d.relChangePct,
      lines,
      evidence: t.evidence.map((e) => e.ev),
      generatedBy: by,
      explain: techExplain(d),
    } satisfies ExecTechSignal;
  });

  // ── 사업·공급망
  const bizAi = new Map<string, unknown>();
  for (const item of asArray(C?.moves)) {
    const o = asRecord(item);
    if (o && typeof o.id === 'string') bizAi.set(o.id, o.lines);
  }
  const moves: ExecBusinessMove[] = [];
  for (const b of plan.business.moves) {
    const picked = bizAi.has(b.ref) ? guardLines(bizAi.get(b.ref), b.guard, null, null, 'plain', true) : [];
    tally.elements++;
    if (picked.length < EXEC_LIMITS.business.minLines) {
      // 사업 서술은 규칙 폴백이 없다 — 항목을 생략한다
      tally.elementsFallback++;
      if (bizAi.has(b.ref)) aiDiscarded.push({ section: 'business', id: b.ref, reason: 'lines_insufficient' });
      continue;
    }
    moves.push({ id: b.id, category: b.category, company: b.company, vendor: b.vendor, facts: b.facts, lines: picked.slice(0, EXEC_LIMITS.business.maxLines), evidence: b.evidence.map((e) => e.ev), generatedBy: 'ai' });
  }

  // ── 질문
  const questions: ExecQuestion[] = [];
  {
    const questionAllowed = new Set<string>(plan.common);
    for (const c of plan.candidates) for (const n of c.guard.allowed) questionAllowed.add(n);
    const qGuard: ExecGuard = { allowed: questionAllowed, inputText: plan.candidates.map((c) => c.guard.inputText).join(' ') };
    const seenText = new Set<string>();
    for (const item of asArray(A?.questions)) {
      if (questions.length >= EXEC_LIMITS.questions.max) break;
      const o = asRecord(item);
      if (!o) continue;
      const kind = typeof o.kind === 'string' ? (o.kind as ExecQuestionKind) : null;
      if (!kind || !QUESTION_KINDS.includes(kind)) {
        aiDiscarded.push({ section: 'questions', id: '*', reason: 'bad_kind' });
        continue;
      }
      const textRaw = typeof o.text === 'string' ? normalizeSpaces(o.text) : '';
      const sentences = splitSentences(textRaw);
      const text = sentences.length === 1 ? sentences[0]! : '';
      if (!text || !endsWithProposal(text) || charLength(text) > EXEC_LIMITS.questions.text || !endsWithPolite(text)) {
        aiDiscarded.push({ section: 'questions', id: '*', reason: 'bad_text' });
        continue;
      }
      const g = guardExecSentences([text], { allowed: qGuard.allowed, inputText: qGuard.inputText, entityMode, maxChars: EXEC_LIMITS.questions.text, scope: 'proposal' });
      addStats(tally, g.stats);
      if (g.sentences.length !== 1 || seenText.has(text)) continue;
      const evidence: WeeklyReportEvidence[] = [];
      for (const r of refList(o.refs)) {
        const ev = plan.evidenceByRef.get(r);
        if (ev && !evidence.some((e) => e.type === ev.type && e.id === ev.id)) evidence.push(ev);
        if (evidence.length >= EXEC_LIMITS.evidencePerItem) break;
      }
      if (evidence.length === 0) {
        aiDiscarded.push({ section: 'questions', id: '*', reason: 'no_evidence' });
        continue;
      }
      const rationale = guardExecSentences(o.rationale, { allowed: qGuard.allowed, inputText: qGuard.inputText, entityMode });
      addStats(tally, rationale.stats);
      if (rationale.sentences.length === 0) {
        aiDiscarded.push({ section: 'questions', id: '*', reason: 'no_rationale' });
        continue;
      }
      const cid = typeof o.conclusionId === 'string' ? conclusionIdByRef.get(o.conclusionId) ?? null : null;
      seenText.add(text);
      questions.push({ id: `q${questions.length + 1}`, kind, text, rationale: rationale.sentences.slice(0, EXEC_LIMITS.questions.rationaleMax), conclusionId: cid, evidence, generatedBy: 'ai' });
    }
    // AI 를 통과한 항목이 2개 미만이면 규칙 폴백(T1~T3)으로 채운다. 폴백 문장도 같은 가드를 통과해야 한다
    if (questions.length < EXEC_LIMITS.questions.min) {
      for (const t of ruleQuestionTemplates(plan)) {
        if (questions.length >= EXEC_LIMITS.questions.fallbackFill) break;
        if (seenText.has(t.text)) continue;
        const gt = guardExecSentences([t.text], { allowed: t.guard.allowed, inputText: t.guard.inputText, entityMode, maxChars: EXEC_LIMITS.questions.text, scope: 'proposal' });
        const gr = guardExecSentences(t.rationale, { allowed: t.guard.allowed, inputText: t.guard.inputText, entityMode });
        addStats(tally, gt.stats);
        addStats(tally, gr.stats);
        if (gt.sentences.length !== 1 || gr.sentences.length < t.rationale.length || t.evidence.length === 0) continue;
        seenText.add(t.text);
        const cid = t.conclusionRef ? conclusionIdByRef.get(t.conclusionRef) ?? null : null;
        questions.push({ id: `q${questions.length + 1}`, kind: t.kind, text: t.text, rationale: gr.sentences.slice(0, EXEC_LIMITS.questions.rationaleMax), conclusionId: cid, evidence: t.evidence.slice(0, EXEC_LIMITS.evidencePerItem), generatedBy: 'rule' });
      }
    }
  }

  // ── 부록: 제목 번역·논문
  const translations = new Map<string, string>();
  {
    const byRef = new Map(plan.titles.map((t) => [t.ref, t]));
    let rejected = 0;
    for (const item of asArray(D?.titles)) {
      const o = asRecord(item);
      const target = byRef.get(typeof o?.id === 'string' ? o.id : typeof o?.ref === 'string' ? o.ref : '');
      if (!o || !target) continue;
      const r = guardTitleTranslation(o.titleKo, target.title, TITLE_KO_MAX);
      if (r.ok) translations.set(`${target.kind}:${target.id}`, r.text);
      else rejected++;
    }
    void rejected;
  }
  const ko = (kind: 'video' | 'paper' | 'article', id: string): string | null => translations.get(`${kind}:${id}`) ?? null;
  const papers: ExecPaper[] = [];
  {
    const byRef = new Map(plan.papers.map((p) => [p.ref, p]));
    const scored: { plan: PaperPlan; score: number; implication: string; order: number }[] = [];
    asArray(D?.papers).forEach((item, order) => {
      const o = asRecord(item);
      const p = byRef.get(typeof o?.ref === 'string' ? o.ref : '');
      const score = Number(o?.frontierScore);
      if (!o || !p || !Number.isFinite(score) || score < EXEC_LIMITS.papers.minScore || score > 3) return;
      if (scored.some((s) => s.plan.ref === p.ref)) return;
      const g = guardExecSentences(o.implication, { allowed: plan.common, inputText: p.aiLine ?? '', entityMode, maxChars: EXEC_LIMITS.papers.implication });
      addStats(tally, g.stats);
      const impl = g.sentences[0];
      if (!impl) return;
      scored.push({ plan: p, score: Math.round(score), implication: impl, order });
    });
    scored.sort((a, b) => b.score - a.score || a.order - b.order);
    for (const s of scored.slice(0, EXEC_LIMITS.papers.max)) papers.push({ ...s.plan.paper, titleKo: ko('paper', s.plan.paper.id), implication: s.implication, frontierScore: s.score });
  }
  const videos: ExecVideo[] = plan.videos.map((v) => ({ ...v, titleKo: ko('video', v.id) }));
  const articles: ExecArticle[] = plan.articles.map((a) => ({ ...a, titleKo: ko('article', a.id) }));

  // ── 메타·상태
  const warnings: string[] = [...plan.inputWarnings];
  const addWarn = (w: string) => {
    if (!warnings.includes(w)) warnings.push(w);
  };
  if (plan.truncated) addWarn('rows_truncated');
  for (const w of options.extraWarnings ?? []) addWarn(w);
  for (const w of ai.batchWarnings) addWarn(w);
  if (ai.batchWarnings.length === 0) {
    if (ai.failed.A) addWarn('ai_conclusions_failed');
    if (ai.failed.B) addWarn('ai_gaps_failed');
    if (ai.failed.C) addWarn('ai_tech_business_failed');
    if (ai.failed.D) addWarn('ai_evidence_failed');
  }
  if (ai.truncated.length > 0) addWarn('ai_truncated');
  if (plan.noData) addWarn('no_data');

  const flags = {
    conclusions: conclusions.map((c) => c.generatedBy === 'ai'),
    gaps: [...gapRows.map((g) => g.generatedBy === 'ai'), ...(gapSummaryBy ? [gapSummaryBy === 'ai'] : [])],
    tech: signals.map((s) => s.generatedBy === 'ai'),
    business: moves.map((m) => m.generatedBy === 'ai'),
    questions: questions.map((q) => q.generatedBy === 'ai'),
  };
  const sectionSources: Record<ExecSectionKey, WeeklySectionSource> = {
    conclusions: sourceOf(flags.conclusions),
    gaps: sourceOf(flags.gaps),
    tech: sourceOf(flags.tech),
    business: sourceOf(flags.business),
    questions: sourceOf(flags.questions),
    evidence: papers.length > 0 || translations.size > 0 ? 'ai' : 'none',
  };
  const ruleElements = flags.conclusions.filter((f) => !f).length + gapRows.filter((g) => g.generatedBy === 'rule').length + signals.filter((s) => s.generatedBy === 'rule').length + (plan.business.moves.length - moves.length);
  const totalElements = conclusions.length + gapRows.length + signals.length + plan.business.moves.length;
  const status = decideExecStatus({ noData: plan.noData, warnings, sectionSources, ruleElements, totalElements });
  const aiUsed = Object.values(flags).some((f) => f.some(Boolean)) || papers.length > 0 || translations.size > 0;
  const ruleBasedSections = (Object.keys(sectionSources) as ExecSectionKey[]).filter((k) => sectionSources[k] === 'rule').length;

  const payload: WeeklyExecutivePayload = {
    schemaVersion: 3,
    header: {
      weekStart: plan.weekStart,
      weekEnd: plan.weekEnd,
      isoYear: plan.isoYear,
      weekNumber: plan.weekNumber,
      periodStartAt: plan.periodStartAt,
      periodEndAt: plan.periodEndAt,
      generatedAt: now.toISOString(),
      counts: plan.counts,
      deltas: plan.deltas,
    },
    conclusions,
    gaps: { summary: gapSummary, rows: gapRows, coverage: plan.gaps.coverage },
    tech: { window: plan.tech.window, signals, procurement: plan.tech.procurement },
    business: { picture: plan.business.picture, moves, asOf: plan.business.asOf },
    questions,
    evidence: { videos, papers, articles, collectionLine: plan.collectionLine },
    meta: { aiUsed, ruleBasedSections, sectionSources, warnings, truncated: plan.truncated, positionSnapshot: plan.positionSnapshot, positionCoverage: plan.positionCoverage },
  };

  const stats: Record<string, unknown> = {
    format: 'executive',
    candidates: plan.candidates.map((c) => ({ id: c.id, kind: c.kind, score: c.score })),
    gaps: plan.gaps.rows.map((g) => ({ id: g.draft.id, status: g.draft.status, position: g.draft.position, movement: g.draft.movement, reason: g.draft.reason })),
    guard: { dropped: tally.dropped },
    aiDiscarded,
    sectionSources,
    ruleElements,
    totalElements,
    narrativeChars: narrativeCharCount(payload),
    truncated: plan.truncated,
  };
  return { payload: clampPayloadStrings(payload), status, stats, plan };
}

/** 서술 글자 수 합계 (결론·격차·기술·사업·질문·시사점) */
export function narrativeCharCount(p: WeeklyExecutivePayload): number {
  const len = (s: string | null | undefined) => (s ? charLength(s) : 0);
  return (
    p.conclusions.reduce((n, c) => n + len(c.headline) + c.lines.reduce((m, l) => m + len(l.text), 0), 0) +
    p.gaps.summary.reduce((n, s) => n + len(s), 0) +
    p.gaps.rows.reduce((n, g) => n + g.lines.reduce((m, l) => m + len(l), 0), 0) +
    p.tech.signals.reduce((n, s) => n + s.lines.reduce((m, l) => m + len(l), 0), 0) +
    p.business.moves.reduce((n, m2) => n + m2.lines.reduce((m, l) => m + len(l), 0), 0) +
    p.questions.reduce((n, q) => n + len(q.text) + q.rationale.reduce((m, l) => m + len(l), 0), 0) +
    p.evidence.papers.reduce((n, pp) => n + len(pp.implication), 0)
  );
}

/** 규칙 폴백만으로 확정 (AI 없음) */
export function composeExec(input: ExecCollected, ai: ExecAiInput | null, now: Date, options: ExecPlanOptions = {}): ExecResult {
  return finalizeExec(buildExecPlan(input, options), ai, now, options);
}

export { PROCUREMENT_MIN_DIFF, toIso };
