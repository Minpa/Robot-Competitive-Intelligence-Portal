/**
 * ARGOS_I 내보내기 — 콘텐츠성 영역(영상·논문·뉴스·기술 트렌드·주간 브리프·외부 출처·이벤트 분석물) 빌더. 순수 함수.
 *
 * 원문 전재 금지: articles.content / description / originalText / 논문 초록(summary)은 어떤 출력에도 싣지 않는다.
 *  - description 과 논문 summary 는 "도메인 분류 판정(정규식)" 입력으로만 수집 단계에서 받아 이 모듈 안에서 소비하고 버린다.
 *  - 출력 필드는 화이트리스트로 고른다.
 */

import {
  TECH_TREND_DOMAINS,
  DOMAIN_REPORT_CONFIGS,
  getDomainFocus,
  hasDomainFocus,
  matchesDomainSecondary,
  matchesDomainVideo,
  type ArticleRow,
  type TechTrendDomain,
} from './tech-trend-report.service.js';
import { articleDomainBadge, resolveArxivId, resolveThumbnail, resolveVideoUrl, safeArxivUrl, normalizeStoredPayload } from './weekly-brief-compose.js';
import { addDaysYmd, isoWeekInfo } from './weekly-brief-period.js';
import { WEEKLY_BRIEF_SCHEMA_VERSION, type WeeklyBriefPayload } from '../types/weekly-brief.js';
import type { AreaContent, AreaDef } from './argos-i-export-areas-types.js';
import {
  TEXT_LIMITS,
  boolOrNull,
  cleanList,
  cleanText,
  cmpStr,
  intOrNull,
  kstDateTimeOfIso,
  kstYmdOfIso,
  numOrNull,
  safeUrl,
  sanitizeDeep,
  tallyText,
  toIsoUtc,
  toYmd,
  type MdSection,
  type Row,
} from './argos-i-export-util.js';

/** collect 가 articles 에서 읽은 슬림 행 (시각은 ISO UTC 문자열) */
export interface RawArticle {
  id: string;
  title: string | null;
  url: string | null;
  /** 뉴스: 앞 300자. 논문: 도메인 분류 판정 전용(출력 금지). 영상: 사용하지 않음 */
  summary: string | null;
  source: string | null;
  productType: string | null;
  category: string | null;
  language: string | null;
  companyId: string | null;
  companyName: string | null;
  publishedAt: string | null;
  collectedAt: string | null;
  /** extracted_metadata 의 슬림 projection */
  meta: Record<string, any>;
  robotIds?: string[];
}

const VIDEO_ID_RE = /^[\w-]{11}$/;
const FOCUS_LEVELS = new Set(['primary', 'secondary', 'none']);
const AUTONOMY = new Set(['autonomous', 'teleoperated', 'assisted', 'unclear']);

const nonNull = <T>(v: T | null | undefined): v is T => v !== null && v !== undefined;

function toArticleRow(r: RawArticle, productType: string | null = r.productType): ArticleRow {
  return {
    id: r.id,
    title: cleanText(r.title, TEXT_LIMITS.title) ?? '',
    url: r.url,
    summary: r.summary,
    source: r.source,
    productType,
    extractedMetadata: r.meta ?? {},
  };
}

function tallyTop(values: readonly string[], top: number): { term: string; count: number }[] {
  const m = new Map<string, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()]
    .map(([term, count]) => ({ term, count }))
    .sort((x, y) => y.count - x.count || cmpStr(x.term, y.term))
    .slice(0, top);
}

/** 영상이 속하는 기술 축 — matchesDomainVideo + (hand·actuator 는 AI 가 none 으로 판정한 영상 제외) */
export function videoTechDomains(row: ArticleRow): TechTrendDomain[] {
  return TECH_TREND_DOMAINS.filter((d) => matchesDomainVideo(d, row) && (!hasDomainFocus(d) || getDomainFocus(d, row) !== 'none'));
}

function pickFocus(meta: Record<string, any>): { hand: { level: string; source: string | null } | null; actuator: { level: string; source: string | null } | null } | null {
  const df = meta.domainFocus;
  if (!df || typeof df !== 'object') return null;
  const one = (d: any) =>
    d && typeof d === 'object' && FOCUS_LEVELS.has(d.level) ? { level: String(d.level), source: cleanText(d.source, 20) } : null;
  const hand = one(df.hand);
  const actuator = one(df.actuator);
  return hand || actuator ? { hand, actuator } : null;
}

function pickTopics(v: any): { topics: string[]; primary: string | null } | null {
  if (!v || typeof v !== 'object') return null;
  const topics = cleanList(v.topics, 60, 10);
  return topics.length > 0 ? { topics, primary: cleanText(v.primary, 60) } : null;
}

function pickDomainTopics(meta: Record<string, any>): { hand: ReturnType<typeof pickTopics>; actuator: ReturnType<typeof pickTopics> } | null {
  const hand = pickTopics(meta.handTopics);
  const actuator = pickTopics(meta.domainTopics?.actuator);
  return hand || actuator ? { hand, actuator } : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// videos
// ─────────────────────────────────────────────────────────────────────────────

export interface VideosRaw {
  rows: RawArticle[];
}

function videoIdOf(r: RawArticle): string | null {
  const m = r.meta ?? {};
  if (typeof m.videoId === 'string' && VIDEO_ID_RE.test(m.videoId)) return m.videoId;
  const u = r.url ?? '';
  const found = /[?&]v=([\w-]{11})/.exec(u) ?? /youtu\.be\/([\w-]{11})/.exec(u);
  return found ? found[1]! : null;
}

function buildVideoItem(r: RawArticle) {
  const m = r.meta ?? {};
  const videoId = videoIdOf(r);
  const g = m.geminiAnalysis && typeof m.geminiAnalysis === 'object' ? m.geminiAnalysis : null;
  const tags = m.aiTags && typeof m.aiTags === 'object' ? m.aiTags : null;
  return {
    id: r.id,
    videoId,
    title: cleanText(r.title, TEXT_LIMITS.title) ?? '',
    channel: cleanText(m.channel, 200),
    thirdParty: boolOrNull(m.thirdParty),
    publishedAt: toIsoUtc(r.publishedAt),
    collectedAt: toIsoUtc(r.collectedAt),
    url: resolveVideoUrl(r.url, videoId),
    thumbnail: resolveThumbnail({ thumbnail: m.thumbnail, videoId: videoId ?? undefined }, r.url),
    views: (() => {
      const v = numOrNull(m.views);
      return v !== null && v >= 0 ? v : null;
    })(),
    domain: cleanText(m.domain, 40),
    topics: cleanList(m.topics, 40, 10),
    aiTags: tags
      ? {
          taskTypes: cleanList(tags.taskTypes, 60, 20),
          techTags: cleanList(tags.techTags, 60, 20),
          robots: cleanList(tags.robots, 100, 20),
          method: cleanText(tags.method, 40),
        }
      : null,
    geminiAnalysis: g
      ? {
          task: cleanText(g.task, 200),
          environment: cleanText(g.environment, 200),
          autonomy: AUTONOMY.has(g.autonomy) ? String(g.autonomy) : null,
          robotCount: intOrNull(g.robotCount),
          durationSec: intOrNull(g.durationSec),
          capabilities: cleanList(g.capabilities, 100, 20),
          keyMoments: (Array.isArray(g.keyMoments) ? g.keyMoments : [])
            .slice(0, 20)
            .map((k: any) => ({ timestampSec: intOrNull(k?.timestampSec), text: cleanText(k?.description, TEXT_LIMITS.keyPoint) }))
            .filter((k: { text: string | null }) => k.text !== null),
          summaryKo: cleanText(g.summaryKo, TEXT_LIMITS.summary),
          analyzedAt: toIsoUtc(g.analyzedAt ?? m.geminiAnalyzedAt),
        }
      : null,
    domainFocus: pickFocus(m),
    domainTopics: pickDomainTopics(m),
    techDomains: videoTechDomains(toArticleRow(r, 'video')),
  };
}

type VideoItem = ReturnType<typeof buildVideoItem>;

/**
 * 최근 7일(KST 달력 기준) 발행·조회수 보유 영상의 일평균 조회수 상위 10.
 * 경과 일수는 "발행일(KST)과 번들 날짜(KST)의 달력 일수 차이" 로 센다 — 같은 번들 날짜의 재생성은 같은 결과를 낸다 (시각 비의존).
 */
export function computeTrendingTop(items: readonly VideoItem[], bundleDate: string) {
  const DAY = 86_400_000;
  const base = Date.parse(`${bundleDate}T00:00:00.000Z`);
  return items
    .filter((v) => v.publishedAt && v.views !== null)
    .map((v) => {
      const ymd = kstYmdOfIso(v.publishedAt)!;
      const ageDays = Math.round((base - Date.parse(`${ymd}T00:00:00.000Z`)) / DAY);
      return { v, ageDays, growth: (v.views as number) / Math.max(ageDays, 1) };
    })
    .filter((x) => x.ageDays >= 0 && x.ageDays <= 7)
    .sort((a, b) => b.growth - a.growth || cmpStr(a.v.id, b.v.id))
    .slice(0, 10)
    .map((x) => ({
      id: x.v.id,
      videoId: x.v.videoId,
      title: x.v.title,
      channel: x.v.channel,
      url: x.v.url,
      thumbnail: x.v.thumbnail,
      views: x.v.views,
      growthViewsPerDay: Number(x.growth.toFixed(2)),
      publishedAt: x.v.publishedAt,
    }));
}

function buildVideos(raw: VideosRaw, ctx: { bundleDate: string }): AreaContent {
  const items = raw.rows
    .map(buildVideoItem)
    .sort((a, b) => cmpStr(b.publishedAt ?? '', a.publishedAt ?? '') || cmpStr(a.id, b.id));
  const trendingTop = computeTrendingTop(items, ctx.bundleDate);
  const channels = new Set(items.map((i) => i.channel).filter(nonNull));
  const analyzed = items.filter((i) => i.geminiAnalysis).length;
  const section: MdSection = {
    heading: '영상 목록 (발행일 최신순)',
    columns: ['발행일(KST)', '제목', '채널', '조회수(회, 수집 시점)', '도메인', '기술 축', '내용 분석', '자율성'],
    rows: items.map((i) => [
      kstYmdOfIso(i.publishedAt),
      i.url ? { text: i.title, url: i.url } : i.title,
      i.channel,
      i.views,
      i.domain,
      i.techDomains.join(', ') || null,
      i.geminiAnalysis !== null,
      i.geminiAnalysis?.autonomy ?? null,
    ]),
  };
  return {
    data: { items, trendingTop },
    summary: [
      `수집 영상 ${items.length}건 (기간 제한 없는 전체), 채널 ${channels.size}곳`,
      `내용 상세 분석 완료 ${analyzed}건 (${items.length ? Math.round((analyzed / items.length) * 100) : 0}%)`,
      `기술 축별 영상: ${TECH_TREND_DOMAINS.map((d) => `${d} ${items.filter((i) => i.techDomains.includes(d)).length}건`).join(', ')}`,
      `최근 7일(KST 달력 기준) 급상승 상위 ${trendingTop.length}건 (일평균 조회수 기준)`,
    ],
    sections: [section],
    notes: ['조회수는 수집 시점의 값이며 이후 변동은 반영되지 않는다. 영상 설명·자막 원문은 포함하지 않고 링크와 파생 요약만 제공한다.'],
  };
}

export const VIDEOS_AREA: AreaDef<VideosRaw> = {
  id: 'videos',
  titleKo: '영상',
  priority: 'P0',
  areaSchemaVersion: 1,
  sourceTables: ['articles'],
  derivedFrom: ['extracted_metadata.aiTags', 'extracted_metadata.geminiAnalysis', 'extracted_metadata.domainFocus'],
  units: { views: '회(수집 시점 값)', durationSec: '초', timestampSec: '초', growthViewsPerDay: '회/일', publishedAt: 'ISO 8601 UTC' },
  build: buildVideos,
};

// ─────────────────────────────────────────────────────────────────────────────
// papers
// ─────────────────────────────────────────────────────────────────────────────

export interface PapersRaw {
  rows: RawArticle[];
}

function authorsOf(v: unknown): string[] {
  if (Array.isArray(v)) return cleanList(v, 80, 20);
  if (typeof v === 'string') return cleanList(v.split(/\s*[,;]\s*|\s+and\s+/), 80, 20);
  return [];
}

function buildPaperItem(r: RawArticle) {
  const m = r.meta ?? {};
  const row = toArticleRow(r, null);
  return {
    id: r.id,
    arxivId: resolveArxivId(r.url, m),
    title: cleanText(r.title, TEXT_LIMITS.title) ?? '',
    authors: authorsOf(m.authors),
    publishedAt: toIsoUtc(r.publishedAt),
    collectedAt: toIsoUtc(r.collectedAt),
    url: safeArxivUrl(r.url),
    aiSummaryKo: cleanText(m.aiSummaryKo, TEXT_LIMITS.summary),
    domainFocus: pickFocus(m),
    domainTopics: pickDomainTopics(m),
    techDomains: TECH_TREND_DOMAINS.filter(
      (d) => DOMAIN_REPORT_CONFIGS[d].second === 'papers' && matchesDomainSecondary(d, row) && (!hasDomainFocus(d) || getDomainFocus(d, row) !== 'none'),
    ),
  };
}

function buildPapers(raw: PapersRaw): AreaContent {
  const items = raw.rows.map(buildPaperItem).sort((a, b) => cmpStr(b.publishedAt ?? '', a.publishedAt ?? '') || cmpStr(a.id, b.id));
  const withSummary = items.filter((i) => i.aiSummaryKo).length;
  const section: MdSection = {
    heading: '논문 목록 (발행일 최신순)',
    columns: ['발행일(KST)', '제목', '저자', 'arXiv ID', '기술 축', '한글 요약(AI 생성)'],
    rows: items.map((i) => [
      kstYmdOfIso(i.publishedAt),
      i.url ? { text: i.title, url: i.url } : i.title,
      i.authors.length > 3 ? `${i.authors.slice(0, 3).join(', ')} 외 ${i.authors.length - 3}명` : i.authors.join(', ') || null,
      i.arxivId,
      i.techDomains.join(', ') || null,
      i.aiSummaryKo,
    ]),
  };
  return {
    data: { items },
    summary: [
      `수집 논문 ${items.length}건 (arXiv, 기간 제한 없는 전체)`,
      `한글 요약(AI 생성) 보유 ${withSummary}건 (${items.length ? Math.round((withSummary / items.length) * 100) : 0}%)`,
      `기술 축별 논문: ${TECH_TREND_DOMAINS.filter((d) => DOMAIN_REPORT_CONFIGS[d].second === 'papers').map((d) => `${d} ${items.filter((i) => i.techDomains.includes(d)).length}건`).join(', ')}`,
    ],
    sections: [section],
    notes: ['논문 초록 원문은 포함하지 않는다. 링크(arxiv.org)로 원문에 접근하고, 한글 요약은 AI 가 생성한 파생물이다.'],
  };
}

export const PAPERS_AREA: AreaDef<PapersRaw> = {
  id: 'papers',
  titleKo: '논문',
  priority: 'P0',
  areaSchemaVersion: 1,
  sourceTables: ['articles'],
  derivedFrom: ['extracted_metadata.aiSummaryKo', 'extracted_metadata.domainFocus'],
  units: { publishedAt: 'ISO 8601 UTC' },
  build: buildPapers,
};

// ─────────────────────────────────────────────────────────────────────────────
// news
// ─────────────────────────────────────────────────────────────────────────────

export interface NewsRaw {
  rows: RawArticle[];
}

function buildNewsItem(r: RawArticle) {
  const m = r.meta ?? {};
  const row = toArticleRow(r, r.productType);
  return {
    id: r.id,
    title: cleanText(r.title, TEXT_LIMITS.title) ?? '',
    source: cleanText(r.source, 255),
    url: safeUrl(r.url),
    publishedAt: toIsoUtc(r.publishedAt),
    collectedAt: toIsoUtc(r.collectedAt),
    language: cleanText(r.language, 10),
    category: cleanText(r.category, 50),
    productType: cleanText(r.productType, 50),
    company: r.companyId ? { id: r.companyId, name: cleanText(r.companyName, 255) } : null,
    robotIds: [...new Set((r.robotIds ?? []).map(String))].sort(cmpStr),
    summary: cleanText(r.summary, TEXT_LIMITS.newsSummary),
    keyPoints: cleanList(m.keyPoints, TEXT_LIMITS.keyPoint, 10),
    marketInsights: cleanList(m.marketInsights, TEXT_LIMITS.keyPoint, 10),
    mentionedCompanies: cleanList(m.mentionedCompanies, 100, 30),
    mentionedRobots: cleanList(m.mentionedRobots, 100, 30),
    technologies: cleanList(m.technologies, 60, 30),
    domainBadge: articleDomainBadge(row),
  };
}

function buildNews(raw: NewsRaw): AreaContent {
  const items = raw.rows.map(buildNewsItem).sort((a, b) => cmpStr(b.publishedAt ?? b.collectedAt ?? '', a.publishedAt ?? a.collectedAt ?? '') || cmpStr(a.id, b.id));
  const section: MdSection = {
    heading: '뉴스 목록 (발행일 최신순)',
    columns: ['발행일(KST)', '제목', '출처', '기업', '분류', '도메인 배지', '요약'],
    rows: items.map((i) => [
      kstYmdOfIso(i.publishedAt ?? i.collectedAt),
      i.url ? { text: i.title, url: i.url } : i.title,
      i.source,
      i.company?.name ?? null,
      i.category,
      i.domainBadge,
      i.summary,
    ]),
  };
  return {
    data: { items },
    summary: [
      `수집 뉴스 ${items.length}건 (영상·논문·외부 출처 제외, 기간 제한 없는 전체)`,
      `분류별: ${tallyText(items.map((i) => i.category))}`,
      `언어별: ${tallyText(items.map((i) => i.language), 3)}`,
      `기업 연결 ${items.filter((i) => i.company).length}건, 로봇 태그 보유 ${items.filter((i) => i.robotIds.length > 0).length}건`,
    ],
    sections: [section],
    notes: ['기사 본문은 포함하지 않는다. 요약은 최대 300자이며 원문은 링크로 접근한다.'],
  };
}

export const NEWS_AREA: AreaDef<NewsRaw> = {
  id: 'news',
  titleKo: '뉴스',
  priority: 'P0',
  areaSchemaVersion: 1,
  sourceTables: ['articles', 'companies', 'article_robot_tags'],
  derivedFrom: ['extracted_metadata.keyPoints', 'extracted_metadata.marketInsights'],
  units: { publishedAt: 'ISO 8601 UTC' },
  build: buildNews,
};

// ─────────────────────────────────────────────────────────────────────────────
// tech-trends
// ─────────────────────────────────────────────────────────────────────────────

export interface CacheRow {
  viewName: string;
  /** ISO UTC */
  cachedAt: string;
  data: unknown;
}

export interface TechTrendsRaw {
  caches: CacheRow[];
  videos: RawArticle[];
  papers: RawArticle[];
  news: RawArticle[];
}

const STALE_AFTER_MS = 48 * 3_600_000;

function isStale(cachedAt: string | null, asOf: string): boolean {
  if (!cachedAt) return false;
  return Date.parse(asOf) - Date.parse(cachedAt) > STALE_AFTER_MS;
}

function summaryOf(row: CacheRow | undefined, asOf: string) {
  if (!row || !row.data || typeof row.data !== 'object') return { status: 'unavailable' as const };
  const d = row.data as Record<string, any>;
  const points = (Array.isArray(d.points) ? d.points : [])
    .map((p: any) => ({ title: cleanText(p?.title, 100), body: cleanText(p?.body, TEXT_LIMITS.summary) }))
    .filter((p: { title: string | null; body: string | null }) => p.title || p.body);
  const text = cleanText(d.text, TEXT_LIMITS.generic);
  if (!text && points.length === 0) return { status: 'unavailable' as const };
  const cachedAt = toIsoUtc(row.cachedAt);
  return {
    status: 'ok' as const,
    headline: cleanText(d.headline, TEXT_LIMITS.summary),
    points,
    text,
    generatedAt: cachedAt,
    cachedAt,
    stale: isStale(cachedAt, asOf),
    generatedBy: d.headline ? ('ai' as const) : ('rule' as const),
  };
}

function buildTechTrends(raw: TechTrendsRaw, ctx: { asOf: string }): AreaContent {
  const cacheBy = new Map(raw.caches.map((c) => [c.viewName, c]));
  const videoRows = raw.videos.map((r) => ({ r, row: toArticleRow(r, 'video') }));
  const paperRows = raw.papers.map((r) => toArticleRow(r, null));
  const newsRows = raw.news.map((r) => toArticleRow(r, r.productType));

  const domains = TECH_TREND_DOMAINS.map((d) => {
    const cfg = DOMAIN_REPORT_CONFIGS[d];
    const matched = videoRows.filter(({ row }) => videoTechDomains(row).includes(d));
    const channels = new Set(matched.map(({ r }) => cleanText(r.meta?.channel, 200)).filter(nonNull));
    const keywords = matched.flatMap(({ r }) => cleanList(r.meta?.aiTags?.techTags, 60, 20));
    const secondCount = (cfg.second === 'papers' ? paperRows : newsRows).filter(
      (row) => matchesDomainSecondary(d, row) && (cfg.second === 'news' || !hasDomainFocus(d) || getDomainFocus(d, row) !== 'none'),
    ).length;

    const re = new RegExp(`^tech-trend-report:(v\\d+):${d}:(\\d+)$`);
    const insights = raw.caches
      .map((c) => ({ c, m: re.exec(c.viewName) }))
      .filter((x): x is { c: CacheRow; m: RegExpExecArray } => x.m !== null && x.c.data !== null && typeof x.c.data === 'object')
      .map(({ c, m }) => {
        const data = c.data as Record<string, any>;
        const cachedAt = toIsoUtc(c.cachedAt);
        return {
          days: Number(m[2]),
          cacheVersion: m[1]!,
          headline: cleanText(data.headline, TEXT_LIMITS.summary),
          points: cleanList(data.points, TEXT_LIMITS.summary, 20),
          keywords: cleanList(data.keywords, 60, 20),
          model: cleanText(data.model, 100),
          generatedAt: toIsoUtc(data.generatedAt),
          cachedAt,
          stale: isStale(cachedAt, ctx.asOf),
          generatedBy: 'ai' as const,
        };
      })
      .filter((i) => i.points.length > 0)
      .sort((a, b) => a.days - b.days || cmpStr(a.cacheVersion, b.cacheVersion));

    const tl = cacheBy.get(`tech-trend-timeline:v1:${d}`);
    const tlData = tl && tl.data && typeof tl.data === 'object' ? (tl.data as Record<string, any>) : null;
    const timeline = tlData
      ? {
          status: 'ok' as const,
          cachedAt: toIsoUtc(tl!.cachedAt),
          sourceGeneratedAt: toIsoUtc(tlData.generatedAt),
          period: sanitizeDeep(tlData.period),
          scope: sanitizeDeep(tlData.scope),
          topics: sanitizeDeep(tlData.topics, 300),
          buckets: sanitizeDeep(tlData.buckets, 300),
          heatmap: sanitizeDeep(tlData.heatmap, 300),
          classification: sanitizeDeep(tlData.classification, 300),
        }
      : { status: 'unavailable' as const };

    const ti = cacheBy.get(`tech-trend-timeline-insight:v2:${d}`);
    const timelineInsight =
      ti && ti.data && typeof ti.data === 'object'
        ? {
            status: 'ok' as const,
            cachedAt: toIsoUtc(ti.cachedAt),
            stale: isStale(toIsoUtc(ti.cachedAt), ctx.asOf),
            generatedBy: 'ai' as const,
            insight: sanitizeDeep(ti.data, TEXT_LIMITS.summary),
          }
        : { status: 'unavailable' as const };

    return {
      id: d,
      label: cfg.label,
      secondKind: cfg.second,
      stats: {
        videoCount: matched.length,
        secondCount,
        channelCount: channels.size,
        topKeywords: tallyTop(keywords, 10),
      },
      insights: { status: insights.length > 0 ? ('ok' as const) : ('unavailable' as const), items: insights },
      timeline,
      timelineInsight,
      trendSummary: summaryOf(cacheBy.get(`video-trend-summary:v6:${d}`), ctx.asOf),
    };
  });
  const overall = summaryOf(cacheBy.get('video-trend-summary:v5'), ctx.asOf);

  const section: MdSection = {
    heading: '기술 축별 현황',
    columns: ['기술 축', '영상(건)', '논문·기사(건)', '채널(곳)', '상위 키워드', '시사점(건)', '시계열', '추이 요약'],
    rows: domains.map((d) => [
      `${d.label} (${d.id})`,
      d.stats.videoCount,
      `${d.stats.secondCount} (${d.secondKind === 'papers' ? '논문' : '기사'})`,
      d.stats.channelCount,
      d.stats.topKeywords.slice(0, 5).map((k) => `${k.term} ${k.count}`).join(', ') || null,
      d.insights.items.length,
      d.timeline.status === 'ok',
      d.trendSummary.status === 'ok',
    ]),
  };
  const insightSection: MdSection = {
    heading: '시사점 헤드라인 (AI 생성, 기간별 캐시)',
    columns: ['기술 축', '기간(일)', '헤드라인', '모델', '생성(KST)', '오래됨(48시간 초과)'],
    rows: domains.flatMap((d) =>
      d.insights.items.map((i) => [d.id, i.days, i.headline, i.model, kstDateTimeOfIso(i.generatedAt ?? i.cachedAt), i.stale]),
    ),
  };
  return {
    data: { domains, overallVideoTrendSummary: overall },
    summary: [
      `기술 축 ${domains.length}개 (${domains.map((d) => d.id).join(', ')})`,
      `영상 기준 집계 대상 ${videoRows.length}건, 논문 ${paperRows.length}건, 기사 ${newsRows.length}건`,
      `시사점 캐시 ${domains.reduce((n, d) => n + d.insights.items.length, 0)}건 (기간별), 시계열 캐시 ${domains.filter((d) => d.timeline.status === 'ok').length}개 축`,
      `전체 영상 트렌드 요약: ${overall.status === 'ok' ? '있음' : '없음'}`,
    ],
    sections: [section, insightSection],
    notes: [
      '시사점·요약은 ARGOS 가 이미 생성해 캐시에 보관한 AI 분석물을 읽기 전용으로 내보낸 것이며, 내보내기 중 새로 생성하지 않는다. 캐시가 없으면 `status: "unavailable"` 이다.',
      '`generatedBy`: ai=AI 생성, rule=규칙 기반 템플릿. `stale`=캐시 생성 후 48시간 초과(기준 시각 대비).',
    ],
  };
}

export const TECH_TRENDS_AREA: AreaDef<TechTrendsRaw> = {
  id: 'tech-trends',
  titleKo: '기술 트렌드',
  priority: 'P0',
  areaSchemaVersion: 1,
  sourceTables: ['view_cache', 'articles'],
  derivedFrom: ['tech-trend-report:*', 'tech-trend-timeline:v1:*', 'tech-trend-timeline-insight:v2:*', 'video-trend-summary:v5', 'video-trend-summary:v6:*'],
  units: { days: '일', videoCount: '건', secondCount: '건', channelCount: '곳', generatedAt: 'ISO 8601 UTC', cachedAt: 'ISO 8601 UTC' },
  build: buildTechTrends,
};

// ─────────────────────────────────────────────────────────────────────────────
// weekly-briefs
// ─────────────────────────────────────────────────────────────────────────────

export interface WeeklyBriefsRaw {
  /** week_start(YYYY-MM-DD 문자열), generated_at(ISO), status, model, payload */
  rows: Row[];
}

function buildWeeklyBriefs(raw: WeeklyBriefsRaw): AreaContent {
  const items = raw.rows
    .filter((r) => r.status === 'ok' || r.status === 'partial')
    .map((r) => {
      const weekStart = toYmd(r.week_start) ?? '';
      const iw = weekStart ? isoWeekInfo(weekStart) : { isoYear: null, weekNumber: null };
      const payload = sanitizeDeep(normalizeStoredPayload((r.payload ?? {}) as WeeklyBriefPayload), TEXT_LIMITS.summary) as Record<string, any> | null;
      return {
        weekStart,
        weekEnd: weekStart ? addDaysYmd(weekStart, 6) : null,
        isoYear: iw.isoYear,
        weekNumber: iw.weekNumber,
        status: r.status as 'ok' | 'partial',
        generatedAt: toIsoUtc(r.generated_at),
        model: cleanText(r.model, 100),
        payload,
      };
    })
    .sort((a, b) => cmpStr(b.weekStart, a.weekStart));
  const counts = (i: (typeof items)[number]) => (i.payload?.header?.counts ?? {}) as Record<string, number | undefined>;
  const section: MdSection = {
    heading: '주간 브리프 목록 (최신 주 먼저)',
    columns: ['주차(ISO)', '기간(KST)', '상태', '생성(KST)', '모델', '기사(건)', '영상(건)', '분석 영상(건)', '논문(건)', 'CI 갱신(건)', '알림(건)'],
    rows: items.map((i) => [
      i.isoYear === null ? null : `${i.isoYear}-W${String(i.weekNumber).padStart(2, '0')}`,
      i.weekStart ? `${i.weekStart} ~ ${i.weekEnd}` : null,
      i.status,
      kstDateTimeOfIso(i.generatedAt),
      i.model,
      counts(i).articles ?? null,
      counts(i).videosNew ?? null,
      counts(i).videosAnalyzed ?? null,
      counts(i).papers ?? null,
      counts(i).ciUpdates ?? null,
      counts(i).alerts ?? null,
    ]),
  };
  const messages: MdSection = {
    heading: '핵심 메시지',
    columns: ['주 시작일', '메시지', '생성 방식'],
    rows: items.flatMap((i) =>
      ((i.payload?.keyMessages ?? []) as { headline?: string; generatedBy?: string }[]).map((m) => [i.weekStart, m.headline ?? null, m.generatedBy ?? null]),
    ),
  };
  return {
    data: { items },
    summary: [
      `주간 브리프 ${items.length}주 (ok ${items.filter((i) => i.status === 'ok').length}, partial ${items.filter((i) => i.status === 'partial').length})`,
      `최신 주 ${items[0]?.weekStart || '없음'}`,
      `핵심 메시지 합계 ${messages.rows.length}건`,
    ],
    sections: [section, messages],
    notes: ['`payload` 는 주간 브리프 화면이 쓰는 구조 그대로이며(키는 알파벳순), 토큰·비용·오류·통계는 포함하지 않는다.'],
  };
}

export const WEEKLY_BRIEFS_AREA: AreaDef<WeeklyBriefsRaw> = {
  id: 'weekly-briefs',
  titleKo: '주간 브리프',
  priority: 'P0',
  areaSchemaVersion: WEEKLY_BRIEF_SCHEMA_VERSION,
  sourceTables: ['weekly_briefs'],
  derivedFrom: [],
  units: { generatedAt: 'ISO 8601 UTC', weekStart: 'YYYY-MM-DD(KST 월요일)', weekEnd: 'YYYY-MM-DD(KST 일요일)' },
  build: buildWeeklyBriefs,
};

// ─────────────────────────────────────────────────────────────────────────────
// external-sources (GitHub · SEC EDGAR · 특허) — 메타데이터·링크만
// ─────────────────────────────────────────────────────────────────────────────

export interface ExternalSourcesRaw {
  rows: RawArticle[];
}

function buildExternalSources(raw: ExternalSourcesRaw): AreaContent {
  const items = raw.rows
    .map((r) => ({
      id: r.id,
      title: cleanText(r.title, TEXT_LIMITS.title) ?? '',
      source: cleanText(r.source, 255),
      url: safeUrl(r.url),
      publishedAt: toIsoUtc(r.publishedAt),
      collectedAt: toIsoUtc(r.collectedAt),
      language: cleanText(r.language, 10),
      category: cleanText(r.category, 50),
      company: r.companyId ? { id: r.companyId, name: cleanText(r.companyName, 255) } : null,
    }))
    .sort((a, b) => cmpStr(b.publishedAt ?? b.collectedAt ?? '', a.publishedAt ?? a.collectedAt ?? '') || cmpStr(a.id, b.id));
  const section: MdSection = {
    heading: '외부 출처 목록 (발행일 최신순)',
    columns: ['발행일(KST)', '제목', '출처', '기업', '분류'],
    rows: items.map((i) => [kstYmdOfIso(i.publishedAt ?? i.collectedAt), i.url ? { text: i.title, url: i.url } : i.title, i.source, i.company?.name ?? null, i.category]),
  };
  return {
    data: { items },
    summary: [`외부 출처 항목 ${items.length}건 (GitHub·SEC EDGAR·특허)`, `출처별: ${tallyText(items.map((i) => i.source))}`],
    sections: [section],
    notes: ['메타데이터와 링크만 포함하며 본문·요약은 포함하지 않는다.'],
  };
}

export const EXTERNAL_SOURCES_AREA: AreaDef<ExternalSourcesRaw> = {
  id: 'external-sources',
  titleKo: '외부 출처(GitHub·SEC·특허)',
  priority: 'P2',
  areaSchemaVersion: 1,
  sourceTables: ['articles'],
  derivedFrom: [],
  units: { publishedAt: 'ISO 8601 UTC' },
  build: buildExternalSources,
};

// ─────────────────────────────────────────────────────────────────────────────
// event-briefs (view_cache 의 이벤트 분석물, 읽기 전용)
// ─────────────────────────────────────────────────────────────────────────────

export interface EventBriefsRaw {
  rows: CacheRow[];
}

const EVENT_KINDS: [string, string][] = [
  ['event-trend-', 'trend'],
  ['event-tech-insight-', 'tech-insight'],
  ['event-ces-insight-', 'ces-insight'],
];

function buildEventBriefs(raw: EventBriefsRaw, ctx: { asOf: string }): AreaContent {
  const items = raw.rows
    .map((r) => {
      const kind = EVENT_KINDS.find(([prefix]) => r.viewName.startsWith(prefix))?.[1];
      if (!kind) return null;
      const cachedAt = toIsoUtc(r.cachedAt);
      return {
        key: cleanText(r.viewName, 100) ?? '',
        kind,
        cachedAt,
        stale: isStale(cachedAt, ctx.asOf),
        data: sanitizeDeep(r.data, TEXT_LIMITS.summary),
      };
    })
    .filter(nonNull)
    .sort((a, b) => cmpStr(a.key, b.key));
  const section: MdSection = {
    heading: '이벤트 분석물',
    columns: ['키', '종류', '캐시 시각(KST)', '오래됨(48시간 초과)'],
    rows: items.map((i) => [i.key, i.kind, kstDateTimeOfIso(i.cachedAt), i.stale]),
  };
  return {
    data: { items },
    summary: [`이벤트 분석물 ${items.length}건`, `종류별: ${tallyText(items.map((i) => i.kind))}`],
    sections: [section],
    notes: ['ARGOS 가 캐시에 보관한 AI 분석물을 읽기 전용으로 그대로 내보낸다. 내보내기 중 새로 생성하지 않는다.'],
  };
}

export const EVENT_BRIEFS_AREA: AreaDef<EventBriefsRaw> = {
  id: 'event-briefs',
  titleKo: '이벤트 분석물',
  priority: 'P2',
  areaSchemaVersion: 1,
  sourceTables: ['view_cache'],
  derivedFrom: ['event-trend-*', 'event-tech-insight-*', 'event-ces-insight-*'],
  units: { cachedAt: 'ISO 8601 UTC' },
  build: buildEventBriefs,
};

