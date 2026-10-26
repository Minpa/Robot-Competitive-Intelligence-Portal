/**
 * 주간 브리프 계약 타입.
 *
 * 이 파일은 `packages/frontend/src/types/weekly-brief.ts` 와 내용이 동일해야 한다
 * (weekly-brief-contract.unit.test.ts 가 주석·공백을 제거한 뒤 비교한다). 한쪽만 수정하지 말 것.
 */

export const WEEKLY_BRIEF_SCHEMA_VERSION = 1;
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

export interface WeeklyBriefResponse {
  weekStart: string;
  status: 'ok' | 'partial';
  generatedAt: string;
  model: string | null;
  /** 존재하는 이웃 주(ok/partial)만. 없으면 null */
  prevWeekStart: string | null;
  nextWeekStart: string | null;
  /** tokens, cost, error, stats 는 비노출 */
  payload: WeeklyBriefPayload;
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
  };
}

/** POST /api/admin/weekly-brief/generate 응답 (202 또는 200) */
export type WeeklyBriefGenerateResponse =
  | { started: true; weekStart: string; force: boolean; startedAt: string }
  | { started: false; skipped: 'exists'; weekStart: string };
