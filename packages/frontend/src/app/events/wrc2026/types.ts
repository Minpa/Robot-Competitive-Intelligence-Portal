/**
 * WRC 2026 특집 페이지 공용 타입 — 백엔드 event-video-brief.service.ts의
 * EventVideoBrief / EventTrendSummary / EventStats와 필드를 맞춘다.
 * (구형 v1 브리프·구형 트렌드 캐시(points: string[])도 그대로 렌더링 가능하도록 하위호환 유지)
 */

export interface EventBrief {
  mainProducts: string[];
  demoContents: string[];
  insights: string[];
  briefedAt: string | null;
  highlight?: string | null;
  companies?: string[];
  techKeywords?: string[];
  briefVersion?: 1 | 2;
}

export interface EventVideo {
  id: string;
  title: string;
  titleKo?: string | null;
  url: string;
  thumbnail: string | null;
  channel: string | null;
  publishedAt: string | null;
  brief: EventBrief | null;
  thirdParty?: boolean;
  taskTypes?: string[];
}

/** 트렌드 포인트 v2 — 근거 영상 id 포함 */
export interface EventTrendPoint {
  text: string;
  videoIds: string[];
}

export interface EventTrendSummary {
  headline: string;
  points: (string | EventTrendPoint)[]; // 종합 트렌드. 구형 캐시(string[]) 하위호환
  techPoints?: (string | EventTrendPoint)[]; // 기술 관점 트렌드 — v2 신규 필드, 구형 캐시엔 없음
  basedOn: number;
  generatedAt: string;
  trendVersion?: 2;
}

export interface EventStats {
  totalVideos: number;
  briefedVideos: number;
  categoryDistribution: { category: string; count: number }[];
  topCompanies: { name: string; count: number }[];
  topKeywords: { name: string; count: number }[];
  uniqueCompanyCount: number;
  uniqueKeywordCount: number;
  /** 주간(월요일 시작, UTC) 업로드 건수 — weekStart asc, 빈 주도 0으로 채워 연속 */
  weeklyUploads: { weekStart: string; count: number }[];
  /** 브리프 techKeywords를 고정 기술 축으로 분류한 분포. 고정 축 순서, count 0인 축 제외 */
  techAxes: { axis: string; count: number; keywords: { name: string; count: number }[] }[];
}

/** 트렌드 포인트(문자열 또는 v2 객체)에서 표시용 텍스트만 추출 */
export function getTrendPointText(p: string | EventTrendPoint): string {
  return typeof p === 'string' ? p : p.text;
}

/** 트렌드 포인트(문자열 또는 v2 객체)에서 근거 영상 id 목록만 추출(구형 문자열은 빈 배열) */
export function getTrendPointVideoIds(p: string | EventTrendPoint): string[] {
  return typeof p === 'string' ? [] : p.videoIds;
}

/** CES 부스 시연 전환 가능성 분석 — 백엔드 event-ces-demo.service.ts의 CesDemoAnalysis와 필드를 맞춘다 */
export interface CesDemoAnalysis {
  teleop: boolean;
  audience: boolean;
  difficulty: number; // 1~5, 5가 가장 어려움
  publicFriendly: number; // 1~5, 5가 가장 쉬움
  funFactor: number; // 1~5, 5가 가장 재미있음
  demoIdea: string;
  analyzedAt: string;
  model: string;
}

export interface CesDemoVideo {
  id: string;
  title: string;
  titleKo: string | null;
  url: string;
  thumbnail: string | null;
  cesDemo: CesDemoAnalysis;
}

export interface CesInsight {
  points: string[];
  generatedAt: string;
  model: string;
}
