/**
 * 주간 브리프 계약 타입.
 *
 * 이 파일은 `packages/frontend/src/types/weekly-brief.ts` 와 내용이 동일해야 한다
 * (weekly-brief-contract.unit.test.ts 가 주석·공백을 제거한 뒤 비교한다). 한쪽만 수정하지 말 것.
 */

export const WEEKLY_BRIEF_SCHEMA_VERSION = 1;
/** 장문 리포트 형식(v2) payload 의 schemaVersion — ARGOS_I weekly-briefs 영역의 areaSchemaVersion 도 이 값을 따른다 */
export const WEEKLY_BRIEF_REPORT_SCHEMA_VERSION = 2;
export type WeeklyBriefStatusCode = 'ok' | 'partial' | 'failed';
export type BriefDomainKey = 'hand' | 'actuator' | 'rfm' | 'expo' | 'production';

export interface WeeklyBriefCounts {
  /** 뉴스성 기사 (영상 제외, source 가 arxiv/github/sec_edgar/patent 가 아닌 것) */
  articles: number;
  /** 영상 (product_type='video') */
  videosNew: number;
  /** geminiAnalyzedAt 이 구간 내인 영상 (발행일 무관) */
  videosAnalyzed: number;
  /** 구간 내 논문 수 (source='arxiv') */
  papers: number;
  /** 구간 내 갱신된 ci_values 고유 수 */
  ciUpdates: number;
  /** competitive_alerts.created_at 이 구간 내인 수 */
  alerts: number;
  /** humanoid_robots(data_type='confirmed').created_at 이 구간 내인 수 */
  newRobots?: number;
}

/** 전주 대비 %, 소수 1자리. 전주 값이 0이면 null */
export interface WeeklyBriefDeltas {
  articles: number | null;
  videosNew: number | null;
  videosAnalyzed: number | null;
  papers: number | null;
  ciUpdates: number | null;
  alerts: number | null;
}

export interface WeeklyBriefHeader {
  /** 'YYYY-MM-DD' (월, KST) */
  weekStart: string;
  /** 'YYYY-MM-DD' (일, KST) */
  weekEnd: string;
  isoYear: number;
  weekNumber: number;
  /** ISO UTC */
  periodStartAt: string;
  periodEndAt: string;
  generatedAt: string;
  counts: WeeklyBriefCounts;
  deltas: WeeklyBriefDeltas;
}

export interface WeeklyEvidence {
  type: 'video' | 'article' | 'ci' | 'keyword';
  id: string;
  title: string;
  /** keyword 는 null. 표시 전 https 검증 필수 */
  url: string | null;
  /** 채널·출처·회사 등 보조 표기 */
  label?: string | null;
}

export interface WeeklyKeyMessage {
  /** 후보 id 예: 'domain_share:actuator' */
  id: string;
  candidateType: 'domain_share' | 'keyword_surge' | 'ci_change' | 'top_company' | 'volume_change';
  kind: 'stat' | 'cause_effect';
  /** AI 또는 규칙 문장, 최대 60자 (숫자 포함 가능, 후보 숫자만) */
  headline: string;
  /** value/unit = 서버, caption = 문장 최대 50자 */
  bigNumber: { value: string; unit: string; caption: string };
  /** 서버 산출 예 {value:'+4.2', unit:'%p', label:'지난주 대비'} */
  delta?: { value: string; unit: string; label: string } | null;
  /** 서버 생성 근거 한 줄 예 '근거: 도메인 태그 집계 (영상 29 · 기사·논문 71)' */
  basis: string;
  /** 최대 3 */
  evidence: WeeklyEvidence[];
  /** AI 보조 문장 최대 80자 */
  note?: string | null;
  generatedBy: 'ai' | 'rule';
}

export interface WeeklyVideoItem {
  id: string;
  title: string;
  channel: string | null;
  publishedAt: string | null;
  views: number | null;
  url: string | null;
  thumbnail: string | null;
  analyzed: boolean;
  domain: BriefDomainKey | null;
}

export interface WeeklyTopVideo extends WeeklyVideoItem {
  durationSec: number | null;
  analysisLine: string | null;
}

export interface WeeklyCiChange {
  id: string;
  company: string;
  robot: string | null;
  layer: string | null;
  item: string;
  /** 각 최대 120자 */
  before: string | null;
  after: string;
  confidence: 'A' | 'B' | 'C' | 'D' | 'F';
  sourceName: string | null;
  sourceUrl: string | null;
  changedAt: string;
}

export interface WeeklyKeyword {
  keywordId: string;
  term: string;
  count: number;
  prevCount: number;
  deltaPct: number | null;
  direction: 'up' | 'down' | 'new' | 'flat';
}

export interface WeeklyArticleItem {
  id: string;
  title: string;
  source: string;
  publishedAt: string | null;
  url: string;
  summaryLine: string | null;
  domain: BriefDomainKey | null;
}

export interface WeeklyPaperItem {
  id: string;
  title: string;
  /** 앞 3명 + "외 n명" 또는 문자열 원문(최대 120자) */
  authors: string | null;
  publishedAt: string | null;
  /** https + 호스트 arxiv.org 만 */
  url: string;
  arxivId: string | null;
  domain: BriefDomainKey | null;
  summaryLine: string | null;
}

export interface WeeklyBriefPayload {
  schemaVersion: 1;
  header: WeeklyBriefHeader;
  /** 0~3 */
  keyMessages: WeeklyKeyMessage[];
  topVideo: WeeklyTopVideo | null;
  /** 0~4 */
  ciChanges: WeeklyCiChange[];
  ciSummary: { updates: number; companies: number };
  /** 0~8, [0]=대표(큰 숫자) */
  keywords: WeeklyKeyword[];
  /** 0~8 (topVideo 제외) */
  videos: WeeklyVideoItem[];
  /** 0~12 */
  articles: WeeklyArticleItem[];
  /** 0~8 (구 payload 에는 없을 수 있음 — 읽을 때 [] 로 정규화) */
  papers: WeeklyPaperItem[];
  meta: { aiUsed: boolean; ruleBasedMessages: number; warnings: string[]; truncated: boolean };
}

// ─────────────────────────────────────────────────────────────────────────────
// v2: 장문 리포트 (schemaVersion 2)
//  - 모든 문자열은 400자 이하, 키 이름에 content/description/abstract/originalText 를 쓰지 않는다 (ARGOS_I sanitizeDeep).
//  - 숫자·링크·근거는 서버가 만들고, AI 는 서술(narrative/blurb/meaning/why/note)과 제목 번역(titleKo)만 쓴다.
// ─────────────────────────────────────────────────────────────────────────────

export type WeeklyReportCandidateType = WeeklyKeyMessage['candidateType'] | 'top_video' | 'volume_summary';
export type WeeklyGeneratedBy = 'ai' | 'rule';

/** 하이라이트·관찰 포인트의 근거 (서버가 id 로 매핑) */
export interface WeeklyReportEvidence {
  type: 'video' | 'paper' | 'article' | 'ci' | 'keyword';
  id: string;
  /** 최대 120자 */
  title: string;
  /** keyword 는 null. 표시 전 https 검증 필수 */
  url: string | null;
  label?: string | null;
}

export interface WeeklyHighlightFigure {
  /** 최대 24자 */
  value: string;
  /** 최대 4자, 단위가 없으면 null (빈 문자열을 쓰지 않는다 — ARGOS_I 정제에서 null 로 바뀐다) */
  unit: string | null;
  /** 최대 50자 */
  caption: string;
  delta?: { value: string; unit: string; label: string } | null;
}

export interface WeeklyHighlight {
  /** 후보 id 예: 'domain_share:actuator' */
  id: string;
  candidateType: WeeklyReportCandidateType;
  /** 최대 40자 (서술) */
  headline: string;
  /** 최대 260자, 2~3문장 (서술) */
  body: string;
  figure: WeeklyHighlightFigure | null;
  /** 최대 120자, 서버 생성 근거 한 줄 */
  basis: string;
  /** 1~3 */
  evidence: WeeklyReportEvidence[];
  generatedBy: WeeklyGeneratedBy;
}

/** 도메인·회사의 근거 카드 — 제목·출처·파생 요약 한 줄·링크 */
export interface WeeklyEvidenceCard {
  type: 'video' | 'paper' | 'article';
  id: string;
  /** 최대 120자 원제 */
  title: string;
  /** 최대 80자 한글 제목(번역). 없으면 null */
  titleKo: string | null;
  /** 최대 60자 (영상은 채널, 논문은 arXiv) */
  source: string;
  publishedAt: string | null;
  /** 최대 120자 파생 요약 한 줄 */
  line: string | null;
  url: string | null;
}

export interface WeeklyDomainFigures {
  videos: number;
  second: number;
  secondKind: 'paper' | 'article';
  /** videos + second (수집 건수 합) */
  total: number;
  /** 전체 수집 건수 대비 %, 소수 1자리 */
  sharePct: number;
  prevSharePct: number | null;
  deltaPp: number | null;
}

export interface WeeklyDomainBlock {
  key: BriefDomainKey;
  /** 최대 16자 */
  label: string;
  status: 'active' | 'quiet';
  figures: WeeklyDomainFigures;
  /** 최대 5개 */
  topTags: { tag: string; count: number }[];
  /** active 만. 200~400자 목표 (AI 서술 또는 규칙 문장) */
  narrative: string | null;
  /** active 3~5개, quiet 0~2개 */
  evidence: WeeklyEvidenceCard[];
  generatedBy: WeeklyGeneratedBy;
}

export interface WeeklyCompanyCi {
  id: string;
  item: string;
  layer: string | null;
  before: string | null;
  after: string;
  confidence: 'A' | 'B' | 'C' | 'D' | 'F';
  sourceName: string | null;
  sourceUrl: string | null;
  changedAt: string;
  /** 최대 80자 (서술) */
  meaning: string | null;
}

export interface WeeklyCompany {
  id: string;
  name: string;
  counts: { total: number; videos: number; articles: number; prevTotal: number; deltaPct: number | null };
  /** 최대 200자 (서술) */
  blurb: string;
  /** 0~3 */
  items: WeeklyEvidenceCard[];
  /** 0~2 */
  ciChanges: WeeklyCompanyCi[];
  generatedBy: WeeklyGeneratedBy;
}

export interface WeeklyReportVideo extends WeeklyVideoItem {
  titleKo: string | null;
  durationSec: number | null;
  /** 조회수 1위 한 개만 true (목록 첫 번째) */
  isTop: boolean;
  /** 0~3개, 각 110자 이하, 합계 300자 이하 (분석 요약에서 문장 단위로 재사용) */
  summaryLines: string[];
  /** 0~4개, 각 20자 이하 */
  tags: string[];
}

export interface WeeklyReportPaper {
  id: string;
  title: string;
  titleKo: string | null;
  authors: string | null;
  publishedAt: string | null;
  /** https + 호스트 arxiv.org 만 */
  url: string;
  arxivId: string | null;
  domain: BriefDomainKey | null;
  /** 0~2개, 각 120자 이하 — aiSummaryKo 에서만 (없으면 빈 배열) */
  summaryLines: string[];
  /** 최대 90자 (서술), 실패하면 null */
  whyItMatters: string | null;
}

export interface WeeklyReportArticle {
  id: string;
  title: string;
  titleKo: string | null;
  source: string;
  publishedAt: string | null;
  url: string;
  domain: BriefDomainKey | null;
  /** 0~2개, 각 100자 이하 — keyPoints 우선, 없으면 요약 첫 문장 */
  summaryLines: string[];
}

export interface WeeklyVolumeWeek {
  /** KST 월요일 'YYYY-MM-DD' */
  weekStart: string;
  videos: number;
  articles: number;
  papers: number;
}

export interface WeeklyReportTrends {
  volume: { weeks: WeeklyVolumeWeek[] };
  /** 최대 12 */
  keywords: WeeklyKeyword[];
  /** 최대 240자 (서술) 또는 null */
  keywordNote: string | null;
}

export interface WeeklyWatchPoint {
  id: string;
  /** 최대 40자 */
  title: string;
  /** 최대 180자 */
  body: string;
  /** 1~2 */
  evidence: WeeklyReportEvidence[];
  generatedBy: WeeklyGeneratedBy;
}

export type WeeklySectionSource = 'ai' | 'mixed' | 'rule' | 'none';
export type WeeklyReportSectionSourceKey = 'highlights' | 'domains' | 'companies' | 'papers' | 'trends' | 'watch';

export interface WeeklyReportPayload {
  schemaVersion: 2;
  header: WeeklyBriefHeader;
  /** 3~5 (데이터가 없으면 0) */
  highlights: WeeklyHighlight[];
  /** 항상 5개, 순서 hand → actuator → rfm → expo → production */
  domains: WeeklyDomainBlock[];
  /** 0~8 */
  companies: WeeklyCompany[];
  /** 0~12 (첫 번째가 조회수 1위) */
  videos: WeeklyReportVideo[];
  /** 0~8 */
  papers: WeeklyReportPaper[];
  /** 0~12 */
  articles: WeeklyReportArticle[];
  ciSummary: { updates: number; companies: number };
  trends: WeeklyReportTrends;
  /** 0~5 */
  watchPoints: WeeklyWatchPoint[];
  meta: {
    aiUsed: boolean;
    ruleBasedSections: number;
    sectionSources: Record<WeeklyReportSectionSourceKey, WeeklySectionSource>;
    warnings: string[];
    truncated: boolean;
  };
}

interface WeeklyBriefResponseBase {
  weekStart: string;
  status: 'ok' | 'partial';
  generatedAt: string;
  model: string | null;
  /** 존재하는 이웃 주(ok/partial)만. 없으면 null */
  prevWeekStart: string | null;
  nextWeekStart: string | null;
}

/** v1(포스터) 브리프 응답. tokens, cost, error, stats 는 비노출 */
export interface WeeklyBriefV1Response extends WeeklyBriefResponseBase {
  payload: WeeklyBriefPayload;
}

/** v2(장문 리포트) 브리프 응답 */
export interface WeeklyReportResponse extends WeeklyBriefResponseBase {
  payload: WeeklyReportPayload;
}

/** 서버 응답 — payload.schemaVersion 으로 판별한다 (없으면 1) */
export type WeeklyBriefResponse = WeeklyBriefV1Response | WeeklyReportResponse;

/** payload 의 schemaVersion 숫자 (없거나 잘못되면 1) */
export function weeklyBriefSchemaVersionOf(payload: unknown): number {
  const v = (payload as { schemaVersion?: unknown } | null | undefined)?.schemaVersion;
  return typeof v === 'number' && Number.isFinite(v) ? v : 1;
}

export function isWeeklyReportPayload(payload: unknown): payload is WeeklyReportPayload {
  return weeklyBriefSchemaVersionOf(payload) === WEEKLY_BRIEF_REPORT_SCHEMA_VERSION;
}

export function isWeeklyReportResponse(brief: { payload: unknown }): brief is WeeklyReportResponse {
  return isWeeklyReportPayload(brief.payload);
}

export interface WeeklyBriefListItem {
  weekStart: string;
  weekEnd: string;
  isoYear: number;
  weekNumber: number;
  status: 'ok' | 'partial';
  generatedAt: string;
  counts: WeeklyBriefCounts;
}

export type WeeklyBriefRunReason = 'cron' | 'startup' | 'manual';

export interface WeeklyBriefRunStatus {
  running: boolean;
  phase: 'idle' | 'collecting' | 'summarizing' | 'persisting';
  current: { weekStart: string; reason: WeeklyBriefRunReason; force: boolean; startedAt: string } | null;
  /** 메모리 → 없으면 data_migrations 'weekly-brief:last' */
  lastRun: {
    weekStart: string;
    reason: WeeklyBriefRunReason;
    outcome: 'created' | 'skipped_exists' | 'skipped_locked' | 'failed';
    status: WeeklyBriefStatusCode | null;
    startedAt: string;
    finishedAt: string;
    durationMs: number;
    model: string | null;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    warnings: string[];
    error: string | null;
  } | null;
  /** DB 최신 행 */
  stored: {
    weekStart: string;
    generatedAt: string;
    status: WeeklyBriefStatusCode;
    costUsd: number;
    error: string | null;
    stats: Record<string, unknown>;
  } | null;
  /** '지금 생성' 기본 대상(직전 완료 주) */
  targetWeekStart: string;
  /** 대상 주에 ok/partial 행이 있는지 */
  targetExists: boolean;
  config: {
    cron: string;
    schedulerEnabled: boolean;
    startupCatchup: boolean;
    aiConfigured: boolean;
    aiEnabled: boolean;
    model: string;
    budget: { limitUsd: number; usedUsd: number | null };
    /** 생성 형식 — report(장문 리포트, 기본) 또는 poster(롤백용 포스터) */
    format: 'report' | 'poster';
    /** 1회 생성의 AI 비용 추정(USD, 현재 모델 단가 기준) */
    estimatedCostUsd: number;
  };
}

/** POST /api/admin/weekly-brief/generate 응답 (202 또는 200) */
export type WeeklyBriefGenerateResponse =
  | { started: true; weekStart: string; force: boolean; startedAt: string }
  | { started: false; skipped: 'exists'; weekStart: string };
