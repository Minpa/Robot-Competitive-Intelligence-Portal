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

export interface TrendInsight {
  headline: string;
  points: string[];
  keywords: string[];
  model: string;
  generatedAt: string;
  cached: boolean;
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
}
