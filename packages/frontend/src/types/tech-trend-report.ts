/** GET /api/articles/tech-trends/:domain/report 응답 타입 (backend tech-trend-report.service.ts와 1:1) */

export type TechTrendDomain = 'hand' | 'rfm' | 'actuator' | 'expo' | 'production';

export interface ReportVideo {
  id: string;
  /** 원제 (HTML 엔티티 복원, 번역 없음) */
  title: string;
  channel: string | null;
  thirdParty: boolean;
  publishedAt: string | null;
  url: string | null;
  videoId: string | null;
  thumbnail: string | null;
  views: number | null;
  /** Gemini 분석 한 줄 요약 (≤200자) — 분석 결과가 있을 때만 */
  summaryKo: string | null;
  taskTypes: string[];
  techTags: string[];
  /** 핸드 관련성 판정 — null이면 아직 판정 전("분석 대기") */
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

/** 시사점의 근거 — 서버가 입력 데이터(영상/논문)에서 채운 값 */
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
  /** points[i]의 근거. 없거나 길이가 points와 다르면 근거 줄을 표시하지 않는다 (구 캐시 호환). */
  pointEvidence?: EvidenceRef[][];
  keywords: string[];
  model: string;
  generatedAt: string;
  cached: boolean;
  /** 만료된 캐시를 먼저 보여주고 백그라운드에서 갱신 중 */
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
  /** AI 판정으로 제외된 영상 수 / 제외 후 남은 영상 중 판정 전 영상 수 (hand 외 도메인은 0) */
  focus: { excluded: number; pending: number };
}

/** GET /api/articles/tech-trends/:domain/analyze/status 응답 (backend AnalysisRunState와 1:1) */
export interface TechTrendAnalysisStatus {
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

/** POST /api/articles/tech-trends/:domain/analyze 응답 */
export interface TechTrendAnalyzeResponse {
  queued: number;
  total: number;
  alreadyRunning?: boolean;
}
