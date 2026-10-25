/**
 * TechTrendReportService — 단위기술 축 공유용 리포트 (최근 N일)
 *
 * 프런트 TechDomainView의 DOMAIN_CONFIGS 판정 규칙을 1:1로 이식해 서버에서
 * 영상 + 논문(또는 기사)을 선별하고, Claude로 "주요 시사점"을 생성해
 * view_cache에 24시간 캐시한다. 리포트 본문(영상/논문)은 매 요청 DB에서 조회하며
 * 시사점(insight) 객체만 캐시한다.
 *
 * 모델 프로필:
 *  - hand (RICH):  Claude Opus 5.5 + effort high, 영상/논문 60/60, 시사점 5~7개 × 300자, ref 코드 기반 근거(pointEvidence),
 *                  캐시 키 v2, 10분 실패 쿨다운, 만료 캐시 즉시 반환 + 백그라운드 재생성(stale-while-revalidate).
 *  - 그 외 4개 도메인 (LEGACY): Claude Haiku 4.5, 프롬프트·한도·캐시 키(v1) 모두 종전과 동일.
 *
 * 안전 원칙:
 *  - 공개 메타데이터(제목·썸네일 URL·링크·초록 발췌)만 노출, 원문 복제 없음.
 *  - 시사점 생성 실패/미설정은 insight=null로 응답 (리포트는 항상 200).
 */

import Anthropic from '@anthropic-ai/sdk';
import { sql, and, eq, like } from 'drizzle-orm';
import { db } from '../db/index.js';
import { articles, viewCache } from '../db/schema.js';
import { aiUsageService } from './ai-usage.service.js';
import { decodeHtmlEntities } from './event-video-brief.service.js';
import {
  OPUS_REQUEST_OPTIONS,
  effortParams,
  extractText,
  isInCooldown,
  isRefusal,
  resolveLegacyReportModel,
  resolveReportModel,
  warnOnAbnormalStop,
  type AnthropicMessagesClient,
  type EffortLevel,
  type MessageRequestOptions,
} from './anthropic-models.js';

// ─────────────────────────────────────────────────────────────────────────────
// 상수 / 설정
// ─────────────────────────────────────────────────────────────────────────────

export const TECH_TREND_DOMAINS = ['hand', 'rfm', 'actuator', 'expo', 'production'] as const;
export type TechTrendDomain = (typeof TECH_TREND_DOMAINS)[number];

/** hand(RICH) 시사점 모델 — 기본 Opus 5.5 */
const RICH_REPORT_MODEL = resolveReportModel();
/** 그 외 도메인(LEGACY) 시사점 모델 — 기본 Haiku 4.5 */
const LEGACY_REPORT_MODEL = resolveLegacyReportModel();
const REPORT_TTL_HOURS = (() => {
  const n = Number(process.env.TECH_TREND_REPORT_TTL_HOURS);
  return Number.isFinite(n) && n > 0 ? n : 24;
})();
const REPORT_TTL_MS = REPORT_TTL_HOURS * 3_600_000;

const QUERY_LIMIT = 1500;
export const VIDEO_LIST_CAP = 100;
export const PAPER_LIST_CAP = 60;
const ABSTRACT_SNIPPET_LEN = 220;
const VIDEO_SUMMARY_LEN = 400;

export type InsightProfileKind = 'legacy' | 'rich';

/** 시사점 생성 프로필 — 도메인별로 모델·호출 파라미터·프롬프트 캡·파서 한도·캐시 버전이 다르다. */
export interface InsightProfile {
  kind: InsightProfileKind;
  maxTokens: number;
  /** null이면 output_config 미전송 */
  effort: EffortLevel | null;
  requestOptions?: MessageRequestOptions;
  promptVideoCap: number;
  promptPaperCap: number;
  promptSummaryCap: number;
  promptAbstractCap: number;
  headlineMax: number;
  pointsMax: number;
  pointMax: number;
  cacheVersion: 'v1' | 'v2';
}

export const INSIGHT_PROFILES: Record<InsightProfileKind, InsightProfile> = {
  legacy: {
    kind: 'legacy',
    maxTokens: 1500,
    effort: null,
    promptVideoCap: 40,
    promptPaperCap: 40,
    promptSummaryCap: 200,
    promptAbstractCap: 300,
    headlineMax: 120,
    pointsMax: 5,
    pointMax: 220,
    cacheVersion: 'v1',
  },
  rich: {
    kind: 'rich',
    maxTokens: 16_000,
    effort: 'high',
    requestOptions: OPUS_REQUEST_OPTIONS,
    promptVideoCap: 60,
    promptPaperCap: 60,
    promptSummaryCap: 300,
    promptAbstractCap: 500,
    headlineMax: 200,
    pointsMax: 7,
    pointMax: 300,
    cacheVersion: 'v2',
  },
};

/** hand만 RICH(Opus) 프로필 */
export function insightProfileFor(domain: TechTrendDomain): InsightProfile {
  return domain === 'hand' ? INSIGHT_PROFILES.rich : INSIGHT_PROFILES.legacy;
}

export function insightModelFor(profile: InsightProfile): string {
  return profile.kind === 'rich' ? RICH_REPORT_MODEL : LEGACY_REPORT_MODEL;
}

/** 시사점 캐시 키 — hand는 v2, 그 외는 v1 */
export function insightCacheKey(domain: TechTrendDomain, days: number): string {
  return `tech-trend-report:${insightProfileFor(domain).cacheVersion}:${domain}:${days}`;
}

/** 도메인의 모든 days 캐시 키를 가리키는 LIKE 패턴 */
export function insightCachePattern(domain: TechTrendDomain): string {
  return `tech-trend-report:${insightProfileFor(domain).cacheVersion}:${domain}:%`;
}

/** 프롬프트 전용 초록 길이 (화면 노출용 abstractSnippet 220자와 별개, 모델 입력에만 사용) */
const PROMPT_ABSTRACT_LEN = INSIGHT_PROFILES.rich.promptAbstractCap;

const NON_NEWS_SOURCES = ['arxiv', 'github', 'sec_edgar', 'patent'];

export interface DomainReportConfig {
  /** 표시명 (프런트 titleKo) */
  label: string;
  /** 영상 필터: 수집 시 부여된 채널 도메인 */
  videoDomain: string;
  /** 영상 보조 필터: 로봇 완제품 채널 영상 중 이 태그가 있으면 포함 */
  extraTaskTypes?: string[];
  extraTechTags?: string[];
  /** 영상 보조 필터: 제목+설명 키워드 매칭 (주제 축용) */
  videoTextRegex?: RegExp;
  /** 보조 자료 종류: 논문(arXiv) 또는 뉴스 기사 */
  second: 'papers' | 'news';
  /** 논문 필터 (제목+초록) — second가 papers일 때 */
  paperRegex?: RegExp;
  /** 기사 필터 (제목+요약) — second가 news일 때 */
  newsRegex?: RegExp;
  /** 영상 채널 도메인 제한 (설정 시 이 도메인 채널의 영상만 포함) */
  videoChannelDomains?: string[];
  /** 영상 제외 필터 (키노트·인터뷰 등) */
  excludeVideoRegex?: RegExp;
}

/** 프런트 components/tech/TechDomainView.tsx DOMAIN_CONFIGS 와 1:1 (정규식 포함) */
export const DOMAIN_REPORT_CONFIGS: Record<TechTrendDomain, DomainReportConfig> = {
  hand: {
    label: '핸드 트렌드',
    videoDomain: 'hand',
    extraTaskTypes: ['파지/조작'],
    second: 'papers',
    paperRegex: /\bhand\b|gripper|finger|tactile|dexter|grasp|manipulat|in-hand/i,
  },
  rfm: {
    label: 'RFM 트렌드',
    videoDomain: 'rfm',
    extraTechTags: ['VLA', '파운데이션모델', '강화학습', 'End-to-End'],
    second: 'papers',
    paperRegex:
      /foundation model|vision.language.action|\bVLA\b|imitation learning|reinforcement learning|diffusion policy|world model|embodied|manipulation policy|sim.to.real/i,
  },
  actuator: {
    label: '액추에이터 트렌드',
    videoDomain: 'actuator',
    second: 'papers',
    paperRegex:
      /actuator|\bmotor\b|gearbox|harmonic drive|transmission|joint torque|quasi.direct|proprioceptive|series elastic/i,
  },
  expo: {
    label: '전시회 트렌드',
    videoDomain: 'expo',
    videoTextRegex:
      /\bCES\b|\bexpo\b|exhibition|booth|\bIROS\b|\bICRA\b|hannover|world robot conference|\bWRC\b|trade show|robocup|automatica|automate 20|world artificial intelligence/i,
    videoChannelDomains: ['robot'],
    second: 'news',
    newsRegex:
      /\bCES\b|\bexpo\b|exhibition|booth|\bIROS\b|\bICRA\b|hannover|world robot conference|\bWRC\b|\bGTC\b|trade show|robocup|전시회|박람회/i,
  },
  production: {
    label: '양산 트렌드',
    videoDomain: 'production',
    videoTextRegex:
      /mass.?produc|production (line|ramp|facility|capacity)|start of production|robofab|botq|factory tour|manufacturing (line|facility|plant)|assembly line for|robot factory|생산라인|양산/i,
    videoChannelDomains: ['robot'],
    second: 'news',
    newsRegex:
      /mass.?produc|production (line|ramp|capacity|target|start)|units? (per|a) (week|month|year)|\d[\d,]* units|annual capacity|manufacturing (facility|capacity|plant)|robofab|botq|start.{0,12}production|deliver(y|ies|ed)|shipment|price[sd]? at|양산|생산능력|생산라인|출하|납품/i,
    excludeVideoRegex: /keynote|earnings|shareholder|annual meeting|interview|podcast|webinar|웨비나|기조연설/i,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────────────────────────

/** DB 행(또는 테스트용 최소 형태). extractedMetadata는 느슨한 JSON. */
export interface ArticleRow {
  id: string;
  title: string;
  url?: string | null;
  summary?: string | null;
  publishedAt?: Date | string | null;
  collectedAt?: Date | string | null;
  source?: string | null;
  productType?: string | null;
  extractedMetadata?: Record<string, any> | null;
}

export interface ReportVideo {
  id: string;
  /** HTML 엔티티 복원된 원제 (번역 없음) */
  title: string;
  channel: string | null;
  thirdParty: boolean;
  publishedAt: string | null;
  url: string | null;
  videoId: string | null;
  thumbnail: string | null;
  views: number | null;
  /** Gemini 분석 요약 (≤400자) — 분석 결과가 있을 때만 */
  summaryKo: string | null;
  taskTypes: string[];
  techTags: string[];
  /** 도메인 관련성 판정 — null이면 아직 판정 전("분석 대기"). none(제외)은 목록에 나오지 않는다. */
  domainFocus: 'primary' | 'secondary' | null;
}

export interface ReportPaper {
  id: string;
  title: string;
  publishedAt: string | null;
  url: string | null;
  arxivId: string | null;
  /** 초록 앞 220자 + '…' (원어) */
  abstractSnippet: string | null;
}

export interface ReportStats {
  videoCount: number;
  paperCount: number;
  channelCount: number;
  topChannels: { name: string; count: number }[];
  topKeywords: { keyword: string; count: number }[];
}

/** 시사점의 근거 항목 — 서버가 입력 데이터(영상/논문)에서 채운 값만 담는다. */
export interface EvidenceRef {
  kind: 'video' | 'paper';
  title: string;
  url: string | null;
  /** 영상=채널명, 논문=`arXiv:{id}` */
  label: string | null;
}

export interface TrendInsight {
  headline: string;
  points: string[];
  /** points[i]의 근거. 존재하면 길이가 points와 같다 (hand 한정). 내부 배열은 비어 있을 수 있다. */
  pointEvidence?: EvidenceRef[][];
  keywords: string[];
  model: string;
  generatedAt: string;
  cached: boolean;
  /** 만료된 캐시를 즉시 반환하고 백그라운드에서 재생성 중일 때 true */
  stale?: boolean;
}

export interface TechTrendReport {
  domain: TechTrendDomain;
  domainLabel: string;
  secondKind: 'papers' | 'news';
  days: number;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  stats: ReportStats;
  insight: TrendInsight | null;
  videos: ReportVideo[];
  papers: ReportPaper[];
  truncated: { videos: boolean; papers: boolean };
  /** 도메인 관련성 판정 집계 (hand·actuator 외 도메인은 항상 0) */
  focus: { excluded: number; pending: number };
}

/** 프롬프트 입력용 논문 — promptAbstract(공백 정규화 ≤500자)는 모델 입력 전용이며 응답 JSON에는 싣지 않는다. */
export interface PromptPaper extends ReportPaper {
  promptAbstract?: string | null;
}

export interface InsightPromptInput {
  domain: TechTrendDomain;
  domainLabel: string;
  days: number;
  videos: ReportVideo[];
  papers: PromptPaper[];
}

export interface InsightPromptBuild {
  prompt: string;
  /** ref 코드(V1.., P1..) → 입력 항목 정보. LEGACY는 빈 맵. */
  refs: Map<string, EvidenceRef>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 순수 함수
// ─────────────────────────────────────────────────────────────────────────────

/** event-company-report.service.ts와 동일 로직, 순환 의존 방지 복제 */
export function stripCiteTags(s: string): string {
  return s
    .replace(/<\/?cite\b[^>]*>?/g, '') // 완전한 태그 + 끝에서 '>' 없이 잘린 태그
    .replace(/<\/?c(?:i(?:t(?:e)?)?)?$/, '') // 캡 절단으로 남은 짧은 조각 (예: "</ci")
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function toIso(v: Date | string | null | undefined): string | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  const t = d.getTime();
  return Number.isNaN(t) ? null : d.toISOString();
}

function rowTime(v: string | null): number {
  if (!v) return 0;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function videoText(row: ArticleRow): string {
  const meta = row.extractedMetadata ?? {};
  return `${row.title} ${typeof meta.description === 'string' ? meta.description : ''}`;
}

/**
 * 영상이 해당 축에 속하는지 — 프런트 TechDomainView와 동일한 순서:
 * excludeVideoRegex → topic → videoChannelDomains → domain → extraTaskTypes → extraTechTags → videoTextRegex
 */
export function matchesDomainVideo(domain: TechTrendDomain, row: ArticleRow): boolean {
  const config = DOMAIN_REPORT_CONFIGS[domain];
  const meta = row.extractedMetadata ?? {};
  // 키노트·인터뷰 등 제외
  if (config.excludeVideoRegex?.test(videoText(row))) return false;
  // 주제 검색 수집 영상: 이 축의 검색으로 수집된 영상은 채널 도메인 제한을 우회해 바로 포함
  // topic(첫 값) 또는 topics(다중 토픽 합집합) 중 하나라도 일치하면 포함
  if (
    meta.topic === config.videoDomain ||
    (Array.isArray(meta.topics) && meta.topics.includes(config.videoDomain))
  ) {
    return true;
  }
  // 채널 도메인 제한: 지정된 도메인 채널의 영상만 후보로
  if (config.videoChannelDomains && !config.videoChannelDomains.includes(meta.domain ?? '')) {
    return false;
  }
  if (meta.domain === config.videoDomain) return true;
  const taskTypes: unknown = meta.aiTags?.taskTypes;
  const techTags: unknown = meta.aiTags?.techTags;
  if (config.extraTaskTypes?.some((t) => Array.isArray(taskTypes) && taskTypes.includes(t))) return true;
  if (config.extraTechTags?.some((t) => Array.isArray(techTags) && techTags.includes(t))) return true;
  if (config.videoTextRegex?.test(videoText(row))) return true;
  return false;
}

/** 보조 자료(논문 또는 기사)가 해당 축에 속하는지 — 프런트와 동일 */
export function matchesDomainSecondary(domain: TechTrendDomain, row: ArticleRow): boolean {
  const config = DOMAIN_REPORT_CONFIGS[domain];
  const text = `${row.title} ${row.summary ?? ''}`;
  if (config.second === 'news') {
    return (
      row.productType !== 'video' &&
      !NON_NEWS_SOURCES.includes(row.source ?? '') &&
      (config.newsRegex?.test(text) ?? false)
    );
  }
  return config.paperRegex?.test(text) ?? false;
}

function getVideoId(row: ArticleRow): string | null {
  const meta = row.extractedMetadata ?? {};
  if (typeof meta.videoId === 'string' && meta.videoId) return meta.videoId;
  const url = row.url ?? '';
  const m = url.match(/[?&]v=([\w-]{11})/) ?? url.match(/youtu\.be\/([\w-]{11})/);
  return m?.[1] ?? null;
}

function capStrings(raw: unknown, maxItems: number): string[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[])
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .slice(0, maxItems);
}

export type DomainFocusLevel = 'primary' | 'secondary' | 'none';

/** 메타데이터의 도메인 관련성 판정 읽기 — 없거나 enum 밖이면 null (미판정) */
export function getDomainFocus(domain: TechTrendDomain, row: ArticleRow): DomainFocusLevel | null {
  const level: unknown = row.extractedMetadata?.domainFocus?.[domain]?.level;
  return level === 'primary' || level === 'secondary' || level === 'none' ? level : null;
}

/** 도메인 관련성(domainFocus.{domain}) 판정·제외를 적용하는 도메인 — 시계열·서브토픽 분류 지원 도메인과 같다 */
export const FOCUS_DOMAINS: readonly TechTrendDomain[] = ['hand', 'actuator'];

export function hasDomainFocus(domain: TechTrendDomain): boolean {
  return FOCUS_DOMAINS.includes(domain);
}

/** hand·actuator 리포트에서 AI가 'none'(도메인과 무관)으로 판정한 영상만 제외한다. 미판정은 유지. 그 외 도메인은 제외 없음. */
export function filterByDomainFocus(
  domain: TechTrendDomain,
  rows: ArticleRow[]
): { kept: ArticleRow[]; excludedCount: number } {
  if (!hasDomainFocus(domain)) return { kept: rows, excludedCount: 0 };
  const kept = rows.filter((r) => getDomainFocus(domain, r) !== 'none');
  return { kept, excludedCount: rows.length - kept.length };
}

/**
 * 시사점 프롬프트용 영상 선별 — primary → secondary → 미판정 순, 같은 그룹 안에서는 입력 순서(최신순) 유지.
 */
export function prioritizeVideosForPrompt(videos: ReportVideo[], cap: number): ReportVideo[] {
  const rank = (v: ReportVideo) => (v.domainFocus === 'primary' ? 0 : v.domainFocus === 'secondary' ? 1 : 2);
  return videos
    .map((v, i) => ({ v, i }))
    .sort((a, b) => rank(a.v) - rank(b.v) || a.i - b.i)
    .slice(0, cap)
    .map((x) => x.v);
}

/** DB 행 → 리포트 영상 항목 */
export function toReportVideo(row: ArticleRow, domain: TechTrendDomain = 'hand'): ReportVideo {
  const meta = row.extractedMetadata ?? {};
  const videoId = getVideoId(row);
  const thumbnail =
    typeof meta.thumbnail === 'string' && meta.thumbnail
      ? meta.thumbnail
      : videoId
        ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
        : null;
  const rawSummary: unknown = meta.geminiAnalysis?.summaryKo;
  const summaryKo =
    typeof rawSummary === 'string' && rawSummary.trim().length > 0
      ? rawSummary.trim().slice(0, VIDEO_SUMMARY_LEN)
      : null;
  const focus = getDomainFocus(domain, row);
  return {
    id: row.id,
    title: decodeHtmlEntities(row.title ?? ''),
    channel: typeof meta.channel === 'string' && meta.channel ? meta.channel : null,
    thirdParty: meta.thirdParty === true,
    publishedAt: toIso(row.publishedAt),
    url: row.url ?? null,
    videoId,
    thumbnail,
    views: typeof meta.views === 'number' && Number.isFinite(meta.views) ? meta.views : null,
    summaryKo,
    taskTypes: capStrings(meta.aiTags?.taskTypes, 4),
    techTags: capStrings(meta.aiTags?.techTags, 4),
    domainFocus: focus === 'primary' || focus === 'secondary' ? focus : null,
  };
}

const ARXIV_ID_RE = /\/abs\/(\d{4}\.\d{4,5}(?:v\d+)?)/;

/** DB 행 → 리포트 논문(또는 기사) 항목. 기사는 arxivId null. */
export function toReportPaper(row: ArticleRow): ReportPaper {
  const url = row.url ?? null;
  const arxivId = url ? (url.match(ARXIV_ID_RE)?.[1] ?? null) : null;
  const summary = (row.summary ?? '').trim();
  const abstractSnippet = summary
    ? summary.length > ABSTRACT_SNIPPET_LEN
      ? `${summary.slice(0, ABSTRACT_SNIPPET_LEN)}…`
      : summary
    : null;
  return {
    id: row.id,
    title: decodeHtmlEntities(row.title ?? ''),
    publishedAt: toIso(row.publishedAt ?? row.collectedAt),
    url,
    arxivId,
    abstractSnippet,
  };
}

/** 상한 적용 전 전체 목록으로 집계한다. */
export function computeReportStats(videos: ReportVideo[], papers: ReportPaper[]): ReportStats {
  const channelCounts = new Map<string, number>();
  const keywordCounts = new Map<string, number>();
  for (const v of videos) {
    if (v.channel) channelCounts.set(v.channel, (channelCounts.get(v.channel) ?? 0) + 1);
    for (const tag of v.techTags) {
      keywordCounts.set(tag, (keywordCounts.get(tag) ?? 0) + 1);
    }
  }
  const byCountDesc = <T extends { count: number }>(a: T, b: T, name: (x: T) => string) =>
    b.count - a.count || name(a).localeCompare(name(b));
  const topChannels = [...channelCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => byCountDesc(a, b, (x) => x.name))
    .slice(0, 5);
  const topKeywords = [...keywordCounts.entries()]
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => byCountDesc(a, b, (x) => x.keyword))
    .slice(0, 8);
  return {
    videoCount: videos.length,
    paperCount: papers.length,
    channelCount: channelCounts.size,
    topChannels,
    topKeywords,
  };
}

/** 시사점 생성 조건: 영상+논문 3건 이상 */
export function shouldGenerateInsight(videoCount: number, paperCount: number): boolean {
  return videoCount + paperCount >= 3;
}

/** 프롬프트 전용 초록 — 공백 정규화 후 ≤500자. 화면 노출용 abstractSnippet(220자)과 별개이며 모델 입력에만 쓴다. */
export function toPromptAbstract(row: ArticleRow): string | null {
  const text = (row.summary ?? '').replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, PROMPT_ABSTRACT_LEN) : null;
}

/** 핸드 외 4개 도메인 프롬프트 — 종전 문구와 한 글자도 다르지 않아야 한다. */
function buildLegacyPrompt(input: InsightPromptInput, profile: InsightProfile): string {
  const videos = prioritizeVideosForPrompt(input.videos, profile.promptVideoCap).map((v) => ({
    title: v.title,
    channel: v.channel ?? '',
    publishedAt: v.publishedAt ? v.publishedAt.slice(0, 10) : '',
    summaryKo: v.summaryKo ? v.summaryKo.slice(0, profile.promptSummaryCap) : '',
    techTags: v.techTags,
  }));
  const papers = input.papers.slice(0, profile.promptPaperCap).map((p) => ({
    title: p.title,
    publishedAt: p.publishedAt ? p.publishedAt.slice(0, 10) : '',
    abstract: p.abstractSnippet ? p.abstractSnippet.slice(0, profile.promptAbstractCap) : '',
  }));

  return `다음은 최근 ${input.days}일간 수집된 ${input.domainLabel} 분야 영상 메타데이터와 arXiv 논문 목록이다. LG 로봇 전략팀 공유용 리포트의 '주요 시사점'을 한국어로 작성하라.

규칙:
- 주어진 데이터에 명시된 내용만 근거로 삼는다. 추측·일반론·외부 지식 금지.
- 시사점은 3~5개, 각 220자 이내.
- 영상과 논문을 교차해 어떤 업체/랩이 무엇을 보였고 기술적으로 어떤 방향이 부상하는지에 집중한다.
- 조회수·인기·마케팅 언급 금지.
- 핵심 기술 키워드는 최대 8개, 각 24자 이내.
- 마크다운 기호(#, **, -)와 인용 태그(<cite>) 사용 금지.

[영상 ${videos.length}건]
${JSON.stringify(videos)}

[논문 ${papers.length}편]
${JSON.stringify(papers)}

JSON으로만 응답하라. 다른 텍스트 없이:
{"headline":"한 문장 총평","points":["시사점1","시사점2","시사점3"],"keywords":["키워드1","키워드2"]}`;
}

/** 핸드(RICH) 프롬프트 + ref 코드 맵 — 영상 V1.., 논문 P1.. (프롬프트에 실린 순서) */
function buildRichPrompt(input: InsightPromptInput, profile: InsightProfile): InsightPromptBuild {
  const refs = new Map<string, EvidenceRef>();
  const videos = prioritizeVideosForPrompt(input.videos, profile.promptVideoCap).map((v, i) => {
    const ref = `V${i + 1}`;
    refs.set(ref, { kind: 'video', title: v.title, url: v.url, label: v.channel });
    return {
      ref,
      title: v.title,
      channel: v.channel ?? '',
      publishedAt: v.publishedAt ? v.publishedAt.slice(0, 10) : '',
      summaryKo: v.summaryKo ? v.summaryKo.slice(0, profile.promptSummaryCap) : '',
      techTags: v.techTags,
    };
  });
  const papers = input.papers.slice(0, profile.promptPaperCap).map((p, i) => {
    const ref = `P${i + 1}`;
    refs.set(ref, { kind: 'paper', title: p.title, url: p.url, label: p.arxivId ? `arXiv:${p.arxivId}` : null });
    return {
      ref,
      title: p.title,
      publishedAt: p.publishedAt ? p.publishedAt.slice(0, 10) : '',
      abstract: (p.promptAbstract ?? p.abstractSnippet ?? '').slice(0, profile.promptAbstractCap),
    };
  });

  const prompt = `다음은 최근 ${input.days}일간 수집된 ${input.domainLabel} 분야 영상 메타데이터와 arXiv 논문 목록이다. 각 항목에는 근거 표기용 ref 코드(영상 V숫자, 논문 P숫자)가 붙어 있다. LG 로봇 전략팀 공유용 리포트의 '주요 시사점'을 한국어로 작성하라.

규칙:
- 주어진 데이터에 명시된 내용만 근거로 삼는다. 추측·일반론·외부 지식 금지. 다만 데이터에서 읽어낼 수 있는 비교·대조·패턴의 해석은 허용하며, 해석 문장은 "~로 보인다"처럼 해석임을 드러낸다.
- 시사점은 5~7개, 각 ${profile.pointMax}자 이내. 서로 겹치지 않는 관점을 다룬다. 예: 부상하는 기술 방향, 업체·랩별 접근 차이, 영상(제품화)과 논문(연구) 사이의 정합과 간극, 센싱·구동·제어·학습 등 구성요소별 변화, 데이터에서 보이지 않는 공백, 전략팀이 계속 지켜볼 관찰 포인트(데이터 범위 안에서만).
- 각 시사점은 (1) 관찰된 사실(어떤 업체/랩이 무엇을 보였는가)과 (2) 그 기술적 의미 또는 방향을 모두 담는다. 가능하면 영상과 논문을 교차한다.
- 각 시사점의 refs에 근거가 된 항목의 ref 코드를 1~4개 적는다. 입력에 없는 코드를 만들지 않는다. text 안에는 ref 코드를 쓰지 않는다.
- 총평(headline)은 1~2문장, ${profile.headlineMax}자 이내.
- 조회수·인기·마케팅 언급 금지.
- 핵심 기술 키워드는 최대 8개, 각 24자 이내.
- 마크다운 기호(#, **, -)와 인용 태그(<cite>) 사용 금지.

[영상 ${videos.length}건]
${JSON.stringify(videos)}

[논문 ${papers.length}편]
${JSON.stringify(papers)}

JSON으로만 응답하라. 다른 텍스트 없이:
{"headline":"총평","points":[{"text":"시사점 본문","refs":["V3","P12"]}],"keywords":["키워드1","키워드2"]}`;
  return { prompt, refs };
}

/** 프롬프트와 ref 맵을 함께 만든다 — hand만 RICH, 나머지는 종전 프롬프트(빈 ref 맵). */
export function buildInsightPromptWithRefs(input: InsightPromptInput): InsightPromptBuild {
  const profile = insightProfileFor(input.domain);
  if (profile.kind === 'rich') return buildRichPrompt(input, profile);
  return { prompt: buildLegacyPrompt(input, profile), refs: new Map() };
}

export function buildInsightPrompt(input: InsightPromptInput): string {
  return buildInsightPromptWithRefs(input).prompt;
}

export interface ParseInsightOptions {
  headlineMax?: number;
  pointsMax?: number;
  pointMax?: number;
  /**
   * 지정하면 근거 모드: points 항목으로 {text, refs[]} 객체를 허용하고, 본문 속 ref 표기를 제거하며,
   * refs를 이 맵으로 검증해 pointEvidence 를 만든다. 생략하면 종전 동작(문자열 points만).
   */
  refs?: ReadonlyMap<string, EvidenceRef>;
}

export interface ParsedTrendInsight {
  headline: string;
  points: string[];
  pointEvidence?: EvidenceRef[][];
  keywords: string[];
}

/** 시사점 하나에 붙일 수 있는 근거 최대 개수 */
export const MAX_REFS_PER_POINT = 4;

const REF_CODE_RE = /^[VP]\d{1,3}$/;
/** 본문에 섞인 ref 표기: [V3], (P12), [V3, P12] */
const INLINE_REF_RE = /\s*[[(（]\s*[VP]\d{1,3}(?:\s*[,，、/]\s*[VP]\d{1,3})*\s*[\])）]/g;

/** 근거 모드 텍스트 정리 — 인용 태그, 본문 속 ref 표기, 마크다운 기호 제거 (일반 단어 "V2"는 보존) */
function cleanRichText(s: string): string {
  return stripCiteTags(s)
    .replace(INLINE_REF_RE, '')
    .replace(/[*#`]/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function resolveEvidenceRefs(raw: unknown, refs: ReadonlyMap<string, EvidenceRef>): EvidenceRef[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: EvidenceRef[] = [];
  for (const item of raw as unknown[]) {
    if (typeof item !== 'string') continue;
    const code = item.trim().toUpperCase();
    if (!REF_CODE_RE.test(code) || seen.has(code)) continue;
    const found = refs.get(code);
    if (!found) continue;
    seen.add(code);
    out.push({ ...found });
    if (out.length >= MAX_REFS_PER_POINT) break;
  }
  return out;
}

/** Anthropic 응답에서 {headline, points[], keywords[]} 파싱 (주변 텍스트 포함 응답도 복원) */
export function parseTrendInsight(text: string, options?: ParseInsightOptions): ParsedTrendInsight | null {
  const tryParse = (raw: string): Record<string, unknown> | null => {
    try {
      const v = JSON.parse(raw) as unknown;
      return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  };
  let parsed = tryParse(text.trim());
  if (!parsed) {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) parsed = tryParse(m[0]);
  }
  if (!parsed) return null;

  const refs = options?.refs;
  const headlineMax = options?.headlineMax ?? INSIGHT_PROFILES.legacy.headlineMax;
  const pointMax = options?.pointMax ?? INSIGHT_PROFILES.legacy.pointMax;
  const pointsMax = options?.pointsMax ?? INSIGHT_PROFILES.legacy.pointsMax;
  const clean = refs ? cleanRichText : stripCiteTags;

  const headline = typeof parsed.headline === 'string' ? clean(parsed.headline).slice(0, headlineMax) : '';

  // points 와 pointEvidence 는 같은 목록에서 파생해 인덱스가 항상 정렬된다
  const items: { text: string; evidence: EvidenceRef[] }[] = [];
  for (const raw of Array.isArray(parsed.points) ? (parsed.points as unknown[]) : []) {
    let rawText: string | null = null;
    let rawRefs: unknown = [];
    if (typeof raw === 'string') {
      rawText = raw;
    } else if (refs && raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const o = raw as Record<string, unknown>;
      if (typeof o.text === 'string') {
        rawText = o.text;
        rawRefs = o.refs;
      }
    }
    if (rawText === null) continue;
    const pointText = clean(rawText).slice(0, pointMax);
    if (pointText.length === 0) continue;
    items.push({ text: pointText, evidence: refs ? resolveEvidenceRefs(rawRefs, refs) : [] });
    if (items.length >= pointsMax) break;
  }

  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const k of Array.isArray(parsed.keywords) ? (parsed.keywords as unknown[]) : []) {
    if (typeof k !== 'string') continue;
    const cleaned = stripCiteTags(k).slice(0, 24);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    keywords.push(cleaned);
    if (keywords.length >= 8) break;
  }

  if (items.length < 1) return null;
  const points = items.map((i) => i.text);
  if (!refs) return { headline, points, keywords };
  return { headline, points, pointEvidence: items.map((i) => i.evidence), keywords };
}

// ─────────────────────────────────────────────────────────────────────────────
// 서비스
// ─────────────────────────────────────────────────────────────────────────────

type CachedInsight = Omit<TrendInsight, 'cached' | 'stale'>;

/** 캐시된 시사점이 사용 가능한지 — points가 비어있지 않은 배열 (pointEvidence가 없으면 레거시 형태로 취급) */
export function isUsableCachedInsight(data: unknown): data is CachedInsight {
  if (!data || typeof data !== 'object') return false;
  const points = (data as { points?: unknown }).points;
  return Array.isArray(points) && points.length > 0;
}

interface DomainReportData {
  allVideos: ReportVideo[];
  allPapers: ReportPaper[];
  /** allPapers와 같은 순서, 프롬프트 전용 초록(promptAbstract) 포함 */
  promptPapers: PromptPaper[];
  excludedCount: number;
}

export class TechTrendReportService {
  private anthropicClient: AnthropicMessagesClient | null;
  /** 동일 (domain, days) 시사점 동시 생성 방지 — warm/SWR/일반 요청이 겹쳐도 호출은 1회 */
  private inflight = new Map<string, Promise<CachedInsight | null>>();
  /** RICH(Opus) 호출 실패 시각 (캐시 키별) — 10분간 재호출하지 않는다 */
  private failedAt = new Map<string, number>();

  constructor(client?: AnthropicMessagesClient | null) {
    if (client !== undefined) this.anthropicClient = client;
    else this.anthropicClient = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
  }

  async getReport(domain: TechTrendDomain, days: number): Promise<TechTrendReport> {
    const config = DOMAIN_REPORT_CONFIGS[domain];
    const now = new Date();
    const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const { allVideos, allPapers, promptPapers, excludedCount } = await this.loadDomainData(domain, days);

    const stats = computeReportStats(allVideos, allPapers);
    const videos = allVideos.slice(0, VIDEO_LIST_CAP);
    const papers = allPapers.slice(0, PAPER_LIST_CAP);
    const pending = hasDomainFocus(domain) ? allVideos.filter((v) => v.domainFocus === null).length : 0;

    const insight = await this.getInsight(domain, days, config.label, allVideos, promptPapers);

    return {
      domain,
      domainLabel: config.label,
      secondKind: config.second,
      days,
      periodStart: periodStart.toISOString(),
      periodEnd: now.toISOString(),
      generatedAt: now.toISOString(),
      stats,
      insight,
      videos,
      papers,
      truncated: { videos: allVideos.length > VIDEO_LIST_CAP, papers: allPapers.length > PAPER_LIST_CAP },
      focus: { excluded: excludedCount, pending },
    };
  }

  /** 리포트 본문 데이터 조회·선별 (getReport와 warm 재생성이 공유) */
  private async loadDomainData(domain: TechTrendDomain, days: number): Promise<DomainReportData> {
    const config = DOMAIN_REPORT_CONFIGS[domain];
    const [videoRows, secondaryRows] = await Promise.all([
      this.fetchVideoRows(days),
      config.second === 'papers' ? this.fetchPaperRows(days) : this.fetchNewsRows(days),
    ]);

    const { kept: keptVideoRows, excludedCount } = filterByDomainFocus(
      domain,
      videoRows.filter((r) => matchesDomainVideo(domain, r))
    );
    const allVideos = keptVideoRows
      .map((r) => toReportVideo(r, domain))
      .sort((a, b) => {
        // publishedAt desc, null 뒤
        if (!a.publishedAt && !b.publishedAt) return 0;
        if (!a.publishedAt) return 1;
        if (!b.publishedAt) return -1;
        return rowTime(b.publishedAt) - rowTime(a.publishedAt);
      });
    const paperEntries = secondaryRows
      .filter((r) => matchesDomainSecondary(domain, r))
      .map((r) => ({ paper: toReportPaper(r), promptAbstract: toPromptAbstract(r) }))
      .sort((a, b) => rowTime(b.paper.publishedAt) - rowTime(a.paper.publishedAt));
    return {
      allVideos,
      allPapers: paperEntries.map((e) => e.paper),
      promptPapers: paperEntries.map((e) => ({ ...e.paper, promptAbstract: e.promptAbstract })),
      excludedCount,
    };
  }

  /** 도메인 영상 대상 행 (기간 + matchesDomainVideo) — 판정 제외(none) 전의 원본 행. 분석 배치의 대상 선정용. */
  async getDomainVideoRows(domain: TechTrendDomain, days: number): Promise<ArticleRow[]> {
    const rows = await this.fetchVideoRows(days);
    return rows.filter((r) => matchesDomainVideo(domain, r));
  }

  /**
   * 시사점 캐시 무효화 — days별 캐시 키(hand: tech-trend-report:v2:hand:{days}, 그 외: v1) 전부의 cachedAt을 과거로 민다.
   * 다음 getReport 호출(또는 warmHandInsight)에서 새 데이터로 시사점이 재생성된다. 오류는 로그만 남긴다.
   */
  async invalidateInsightCache(domain: TechTrendDomain): Promise<void> {
    try {
      await db
        .update(viewCache)
        .set({ cachedAt: new Date(0) })
        .where(like(viewCache.viewName, insightCachePattern(domain)));
    } catch (err) {
      console.error(`[TechTrendReport] insight cache invalidation failed for ${domain}:`, (err as Error).message);
    }
  }

  // ── DB 조회 ──────────────────────────────────────────────────────────────

  private periodCondition(days: number) {
    return sql`COALESCE(${articles.publishedAt}, ${articles.collectedAt}) > now() - (${days}::int * interval '1 day')`;
  }

  private async fetchVideoRows(days: number): Promise<ArticleRow[]> {
    return db
      .select({
        id: articles.id,
        title: articles.title,
        url: articles.url,
        summary: articles.summary,
        publishedAt: articles.publishedAt,
        collectedAt: articles.collectedAt,
        source: articles.source,
        productType: articles.productType,
        extractedMetadata: articles.extractedMetadata,
      })
      .from(articles)
      .where(and(eq(articles.productType, 'video'), this.periodCondition(days)))
      .orderBy(sql`${articles.publishedAt} DESC NULLS LAST`)
      .limit(QUERY_LIMIT) as Promise<ArticleRow[]>;
  }

  private async fetchPaperRows(days: number): Promise<ArticleRow[]> {
    return db
      .select({
        id: articles.id,
        title: articles.title,
        url: articles.url,
        summary: articles.summary,
        publishedAt: articles.publishedAt,
        collectedAt: articles.collectedAt,
        source: articles.source,
        productType: articles.productType,
        extractedMetadata: articles.extractedMetadata,
      })
      .from(articles)
      .where(and(eq(articles.source, 'arxiv'), this.periodCondition(days)))
      .orderBy(sql`COALESCE(${articles.publishedAt}, ${articles.collectedAt}) DESC`)
      .limit(QUERY_LIMIT) as Promise<ArticleRow[]>;
  }

  private async fetchNewsRows(days: number): Promise<ArticleRow[]> {
    return db
      .select({
        id: articles.id,
        title: articles.title,
        url: articles.url,
        summary: articles.summary,
        publishedAt: articles.publishedAt,
        collectedAt: articles.collectedAt,
        source: articles.source,
        productType: articles.productType,
        extractedMetadata: articles.extractedMetadata,
      })
      .from(articles)
      .where(
        and(
          sql`COALESCE(${articles.productType}, '') <> 'video'`,
          sql`${articles.source} NOT IN ('arxiv', 'github', 'sec_edgar', 'patent')`,
          this.periodCondition(days)
        )
      )
      .orderBy(sql`COALESCE(${articles.publishedAt}, ${articles.collectedAt}) DESC`)
      .limit(QUERY_LIMIT) as Promise<ArticleRow[]>;
  }

  // ── 시사점 (24h 캐시) ────────────────────────────────────────────────────

  private async readCacheRow(cacheKey: string): Promise<{ data: CachedInsight; cachedAt: Date } | null> {
    try {
      const [row] = await db.select().from(viewCache).where(eq(viewCache.viewName, cacheKey)).limit(1);
      if (!row) return null;
      const data: unknown = row.data;
      if (!isUsableCachedInsight(data)) return null;
      return { data, cachedAt: row.cachedAt };
    } catch {
      // 캐시 조회 실패는 무시하고 재생성 진행
      return null;
    }
  }

  private inCooldown(cacheKey: string): boolean {
    return isInCooldown(this.failedAt.get(cacheKey), Date.now());
  }

  /**
   * 시사점 조회.
   *  1) 신선한 캐시 → 즉시 반환
   *  2) hand(RICH)이고 만료된 캐시가 있으면 → 만료 캐시를 stale:true 로 즉시 반환 + 백그라운드 재생성(인플라이트 가드·쿨다운 적용)
   *  3) 캐시가 전혀 없으면 → 블로킹 생성 (hand는 실패 시 10분 쿨다운)
   * 핸드 외 도메인은 종전대로 만료 시 블로킹 재생성한다.
   */
  async getInsight(
    domain: TechTrendDomain,
    days: number,
    domainLabel: string,
    videos: ReportVideo[],
    papers: PromptPaper[]
  ): Promise<TrendInsight | null> {
    const profile = insightProfileFor(domain);
    const cacheKey = insightCacheKey(domain, days);

    const row = await this.readCacheRow(cacheKey);
    if (row && Date.now() - row.cachedAt.getTime() < REPORT_TTL_MS) {
      return { ...row.data, cached: true };
    }

    const canGenerate = this.anthropicClient !== null && shouldGenerateInsight(videos.length, papers.length);

    if (row && profile.kind === 'rich') {
      if (canGenerate && !this.inCooldown(cacheKey)) {
        void this.runGeneration(cacheKey, domain, days, domainLabel, videos, papers);
      }
      return { ...row.data, cached: true, stale: true };
    }

    if (!canGenerate) return null;
    if (profile.kind === 'rich' && this.inCooldown(cacheKey)) return null;

    const generated = await this.runGeneration(cacheKey, domain, days, domainLabel, videos, papers);
    return generated ? { ...generated, cached: false } : null;
  }

  /**
   * hand days=30 시사점 사전 생성 — 분석/분류 배치 종료 후 호출한다.
   * 캐시가 이미 신선하면(다른 트리거가 먼저 생성) 호출하지 않고, 동시에 호출돼도 인플라이트 가드로 1회만 생성한다.
   */
  async warmHandInsight(days = 30): Promise<void> {
    if (!this.anthropicClient) return;
    const cacheKey = insightCacheKey('hand', days);
    const row = await this.readCacheRow(cacheKey);
    if (row && Date.now() - row.cachedAt.getTime() < REPORT_TTL_MS) return;
    if (this.inCooldown(cacheKey)) return;
    const { allVideos, promptPapers } = await this.loadDomainData('hand', days);
    if (!shouldGenerateInsight(allVideos.length, promptPapers.length)) return;
    await this.runGeneration(cacheKey, 'hand', days, DOMAIN_REPORT_CONFIGS.hand.label, allVideos, promptPapers);
  }

  /** 캐시 키별 인플라이트 가드를 거쳐 생성 (generateInsight는 예외를 던지지 않는다) */
  private runGeneration(
    cacheKey: string,
    domain: TechTrendDomain,
    days: number,
    domainLabel: string,
    videos: ReportVideo[],
    papers: PromptPaper[]
  ): Promise<CachedInsight | null> {
    let pending = this.inflight.get(cacheKey);
    if (!pending) {
      pending = this.generateInsight(cacheKey, domain, days, domainLabel, videos, papers).finally(() =>
        this.inflight.delete(cacheKey)
      );
      this.inflight.set(cacheKey, pending);
    }
    return pending;
  }

  private async generateInsight(
    cacheKey: string,
    domain: TechTrendDomain,
    days: number,
    domainLabel: string,
    videos: ReportVideo[],
    papers: PromptPaper[]
  ): Promise<CachedInsight | null> {
    if (!this.anthropicClient) return null;
    const profile = insightProfileFor(domain);
    const model = insightModelFor(profile);
    const tag = `${domain}/${days}d`;
    // RICH(Opus) 호출 실패는 10분 쿨다운, LEGACY는 종전대로 쿨다운 없음
    const fail = (): null => {
      if (profile.kind === 'rich') this.failedAt.set(cacheKey, Date.now());
      return null;
    };
    try {
      const { prompt, refs } = buildInsightPromptWithRefs({ domain, domainLabel, days, videos, papers });
      const response = await this.anthropicClient.messages.create(
        {
          model,
          max_tokens: profile.maxTokens,
          messages: [{ role: 'user', content: prompt }],
          ...(profile.effort ? effortParams(model, profile.effort) : {}),
        },
        profile.requestOptions
      );

      // 파싱 성공 여부와 무관하게 응답을 받았으면 비용을 기록한다
      aiUsageService
        .logUsage({
          provider: 'claude',
          model,
          webSearch: false,
          inputTokens: response.usage?.input_tokens ?? 0,
          outputTokens: response.usage?.output_tokens ?? 0,
          query: `[tech-trend-report] ${domain}/${days}d`,
        })
        .catch(() => {});

      if (isRefusal(response.stop_reason)) {
        console.warn(`[TechTrendReport] insight refused by model for ${tag} (model=${model})`);
        return fail();
      }
      warnOnAbnormalStop('TechTrendReport', model, response);

      const parsed = parseTrendInsight(
        extractText(response.content),
        profile.kind === 'rich'
          ? { headlineMax: profile.headlineMax, pointsMax: profile.pointsMax, pointMax: profile.pointMax, refs }
          : undefined
      );
      if (!parsed) {
        console.error(`[TechTrendReport] insight parse failed for ${tag}`);
        return fail();
      }

      const insight: CachedInsight = {
        headline: parsed.headline,
        points: parsed.points,
        ...(parsed.pointEvidence ? { pointEvidence: parsed.pointEvidence } : {}),
        keywords: parsed.keywords,
        model,
        generatedAt: new Date().toISOString(),
      };

      try {
        await db
          .insert(viewCache)
          .values({ viewName: cacheKey, data: insight, ttlMs: REPORT_TTL_MS })
          .onConflictDoUpdate({
            target: viewCache.viewName,
            set: { data: insight, cachedAt: new Date(), ttlMs: REPORT_TTL_MS },
          });
      } catch {
        // 캐시 저장 실패는 치명적이지 않음
      }

      this.failedAt.delete(cacheKey);
      return insight;
    } catch (err) {
      console.error(`[TechTrendReport] insight generation failed for ${tag}:`, (err as Error).message);
      return fail();
    }
  }
}

export const techTrendReportService = new TechTrendReportService();
