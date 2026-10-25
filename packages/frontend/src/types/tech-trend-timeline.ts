/**
 * 기술 시계열 트렌드 타입 (hand·actuator) — backend/src/services/tech-trend-timeline.service.ts,
 * tech-trend-timeline-insight.service.ts, hand-topic-classification.service.ts 응답과 1:1.
 * 프런트는 이 응답을 그리기만 한다 (집계/추세/선후행 계산은 서버). 토픽 라벨은 응답의 topics[].label/shortLabel 을 쓴다.
 */

/** 시계열·서브토픽 분류·관련성 판정을 지원하는 도메인 — backend domain-topics.ts TIMELINE_DOMAINS 와 동일 */
export const TIMELINE_DOMAINS = ['hand', 'actuator'] as const;
export type TimelineDomain = (typeof TIMELINE_DOMAINS)[number];

export function isTimelineDomain(d: string): d is TimelineDomain {
  return (TIMELINE_DOMAINS as readonly string[]).includes(d);
}

/** 도메인별 화면 문구 — "{noun} 무관", "{noun} 관련 데이터" 등에 쓰는 명사 */
export const TIMELINE_DOMAIN_LABELS: Record<TimelineDomain, { noun: string; videoScope: string }> = {
  hand: { noun: '핸드', videoScope: '핸드 리포트 대상 영상' },
  actuator: { noun: '액추에이터', videoScope: '액추에이터 리포트 대상 영상' },
};

/** 시계열 도메인이면 해당 명사, 아니면 기본값(핸드) */
export function timelineDomainNoun(domain: string): string {
  return isTimelineDomain(domain) ? TIMELINE_DOMAIN_LABELS[domain].noun : TIMELINE_DOMAIN_LABELS.hand.noun;
}

export type TimelineGranularity = 'month' | 'quarter';
export type TrendLabel = 'rising' | 'falling' | 'steady' | 'insufficient';
export type LeadLagRelation = 'paper_leads' | 'video_leads' | 'concurrent' | 'undetermined';

export interface TopicCount {
  any: number;
  primary: number;
}

export interface TrendStat {
  recent: number;
  prior: number;
  delta: number;
  rate: number | null;
  label: TrendLabel;
  emerging: boolean;
  firstMonth: string | null;
  peakMonth: string | null;
}

export interface TimelineTopic {
  id: string;
  label: string;
  shortLabel: string;
  order: number;
  colorIndex: number | null;
  totals: { papers: TopicCount; videos: TopicCount };
  monthlyAvg: number;
  lowVolume: boolean;
  trend: { papers: TrendStat; videos: TrendStat; combined: TrendStat };
  leadLag: { relation: LeadLagRelation; lagMonths: number | null };
}

export interface SourceBucket {
  total: number;
  unclassified: number;
  offTopic: number;
  byTopic: Record<string, TopicCount>;
}

export interface TimelineBucket {
  month: string;
  partial: boolean;
  beforeCollection: boolean;
  papers: SourceBucket;
  videos: SourceBucket;
}

export interface TimelineHeatmap {
  granularity: TimelineGranularity;
  columns: { key: string; label: string; partial: boolean }[];
  rows: {
    topicId: string;
    papers: { any: number[]; primary: number[] };
    videos: { any: number[]; primary: number[] };
  }[];
}

export interface TimelineClassification {
  total: number;
  classified: number;
  offTopic: number;
  unclassified: number;
  failed: number;
  ratio: number;
  version: number;
  papers: { total: number; classified: number };
  videos: { total: number; classified: number };
}

export interface TimelinePeriod {
  startMonth: string;
  endMonth: string;
  monthCount: number;
  completeMonthCount: number;
  collectionStartedAt: string | null;
  granularity: TimelineGranularity;
}

/** GET /api/articles/tech-trends/{hand|actuator}/timeline */
export interface TechTrendTimeline {
  domain: TimelineDomain;
  generatedAt: string;
  cached: boolean;
  period: TimelinePeriod | null;
  topics: TimelineTopic[];
  buckets: TimelineBucket[];
  heatmap: TimelineHeatmap;
  classification: TimelineClassification;
  scope: {
    videosExcludedByFocus: number;
    videosPendingJudgement: number;
    beforeRangeDropped: number;
    truncated: boolean;
  };
}

export type TimelineInsightStatus =
  | 'ok'
  | 'insufficient_classification'
  | 'insufficient_period'
  | 'no_api_key'
  | 'generation_failed';

export interface TimelineTopicMetrics {
  recent: number;
  prior: number;
  delta: number;
  papers: { recent: number; prior: number };
  videos: { recent: number; prior: number };
}

export interface TimelineInsight {
  overview: string;
  rising: {
    topicId: string;
    label: string;
    evidence: string;
    paperTitles: string[];
    videoTitles: string[];
    metrics: TimelineTopicMetrics;
  }[];
  declining: { topicId: string; label: string; note: string; metrics: TimelineTopicMetrics }[];
  leadLag: {
    topicId: string;
    label: string;
    relation: LeadLagRelation;
    lagMonths: number | null;
    note: string;
  }[];
  lgImplications: string[];
  model: string;
  generatedAt: string;
  cached: boolean;
  /** 만료된 캐시를 먼저 보여주고 백그라운드에서 갱신 중 */
  stale?: boolean;
}

/** GET /api/articles/tech-trends/{domain}/timeline/insight (항상 200) */
export interface TechTrendTimelineInsightResponse {
  status: TimelineInsightStatus;
  insight: TimelineInsight | null;
}

/** GET /api/articles/tech-trends/{domain}/classify/status (관리자) — 도메인 공용(이름은 핸드 시절 호환) */
export interface HandTopicClassificationStatus {
  running: boolean;
  total: number;
  processed: number;
  classified: number;
  offTopic: number;
  unresolved: number;
  skippedExcluded: number;
  aborted: boolean;
  consecutiveFailures: number;
  startedAt: string | null;
  finishedAt: string | null;
}

/** POST /api/articles/tech-trends/{domain}/classify 응답 */
export interface HandTopicClassifyResponse {
  queued: number;
  total: number;
  alreadyRunning?: boolean;
}
