/**
 * 핸드 기술 시계열 트렌드 타입 — backend/src/services/tech-trend-timeline.service.ts,
 * tech-trend-timeline-insight.service.ts, hand-topic-classification.service.ts 응답과 1:1.
 * 프런트는 이 응답을 그리기만 한다 (집계/추세/선후행 계산은 서버).
 */

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

/** GET /api/articles/tech-trends/hand/timeline */
export interface TechTrendTimeline {
  domain: 'hand';
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

/** GET /api/articles/tech-trends/hand/timeline/insight (항상 200) */
export interface TechTrendTimelineInsightResponse {
  status: TimelineInsightStatus;
  insight: TimelineInsight | null;
}

/** GET /api/articles/tech-trends/hand/classify/status (관리자) */
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

/** POST /api/articles/tech-trends/hand/classify 응답 */
export interface HandTopicClassifyResponse {
  queued: number;
  total: number;
  alreadyRunning?: boolean;
}
