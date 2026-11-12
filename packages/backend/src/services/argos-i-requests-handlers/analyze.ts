/**
 * analyze 처리기 — 기존 분석 서비스를 호출한다 (서비스는 의존성 주입, 테스트는 가짜).
 *
 *  - video   : videoContentAnalysisService.analyzeSingle 만 호출. 기존 분석이 있고 force 가 아니면 캐시 결과(비용 0)
 *  - company : 해당 회사의 body_specs 빈 로봇 최대 5건을 단건 보강 → ci_staging(pending)에만 적재. 결과에 스펙 값은 싣지 않는다
 *  - robot   : 단건 보강 1건 (동일)
 *  - topic   : techTrendReportService.getReport 만 호출 (캐시 적중이면 비용 0)
 *
 * 입력은 params 뿐이다. id·slug 는 DB 행으로 해석한 뒤 서비스에 id 로 넘긴다 (요청 문자열을 프롬프트에 쓰지 않는다).
 * 결과의 모델 식별자는 기존 영상 영역 규칙에 따라 싣지 않는다.
 */

import { cleanEnum, cleanItems, cleanLink, cleanNumber, cleanObject, cleanText, numberRule, textRule, type ResultCtx } from '../argos-i-requests-result.js';
import type { CostEstimates } from '../argos-i-requests-config.js';
import { failOutcome, okOutcome, outcomeFromError, type HandlerOutcome, type RequestHandler } from './types.js';

export const COMPANY_ENRICH_MAX_ROBOTS = 5;
const AUTONOMY = ['autonomous', 'teleoperated', 'assisted', 'unclear'] as const;

export interface ArticleLite {
  id: string;
  title: string;
  url: string;
  /** extracted_metadata.geminiAnalysis (있으면) */
  geminiAnalysis: Record<string, unknown> | null;
}

export interface AnalyzeDeps {
  estimates: CostEstimates;
  allowedHosts(): Promise<string[]>;
  video: {
    isConfigured(): boolean;
    analyzeSingle(articleId: string): Promise<{ ok: true; analysis: Record<string, unknown> } | { ok: false; error: string }>;
    findArticleById(id: string): Promise<ArticleLite | null>;
    findArticleByVideoId(videoId: string): Promise<ArticleLite | null>;
  };
  specs: {
    isConfigured(): boolean;
    enrichRobot(robotId: string): Promise<{ status: string; fields: string[] }>;
  };
  catalog: {
    findCompanyBySlug(slug: string): Promise<{ id: string; name: string } | null>;
    findRobotBySlug(slug: string): Promise<{ id: string; name: string } | null>;
    /** body_specs 가 없는 회사 로봇 (최대 limit) */
    robotsMissingSpecs(companyId: string, limit: number): Promise<Array<{ id: string; name: string }>>;
    slugOfRobot(name: string): string;
  };
  topic: {
    isCacheFresh(domain: string, days: number): Promise<boolean>;
    getReport(domain: string, days: number): Promise<TopicReportLike>;
  };
}

/** getReport 결과 중 쓰는 부분 */
export interface TopicReportLike {
  domain: string;
  days: number;
  stats: { videoCount: number; paperCount: number; channelCount: number; topChannels?: Array<{ name: string; count: number }>; topKeywords?: Array<{ keyword: string; count: number }> };
  insight: { points: string[]; cached: boolean } | null;
  videos: Array<{ title: string; url: string | null }>;
  papers: Array<{ title: string; url: string | null }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 분석 서비스 오류 문자열 → 처리 결과 (메시지 본문은 응답에 쓰지 않는다) */
export function outcomeFromAnalyzeError(error: string): HandlerOutcome {
  const e = error.toLowerCase();
  if (e.includes('not configured')) return failOutcome('provider_not_configured');
  if (e.includes('quota') || error.includes('쿼터')) return failOutcome('quota_exceeded', true);
  if (e.includes('not found')) return failOutcome('not_found');
  if (e.includes('not a public')) return failOutcome('invalid_target');
  return failOutcome('upstream_error', true);
}

function summarizeVideoAnalysis(a: Record<string, unknown>): Record<string, unknown> {
  const base = cleanObject(a, {
    task: textRule(),
    environment: textRule(),
    summaryKo: textRule(),
    robotCount: numberRule(0, 10_000, true),
    durationSec: numberRule(0, 86_400),
    analyzedAt: textRule(40),
  });
  const autonomy = cleanEnum(a.autonomy, AUTONOMY);
  const capabilities = cleanItems(a.capabilities, 8, (c) => cleanText(c, 40));
  const keyMoments = cleanItems(a.keyMoments, 8, (m) => {
    const o = cleanObject(m, { timestampSec: numberRule(0, 86_400), description: textRule(80) });
    return typeof o.description === 'string' ? o : null;
  });
  return { ...base, ...(autonomy ? { autonomy } : {}), capabilities, keyMoments };
}

export function createAnalyzeHandler(deps: AnalyzeDeps): RequestHandler {
  const enrich = async (robots: Array<{ id: string; name: string }>): Promise<HandlerOutcome> => {
    if (!deps.specs.isConfigured()) return failOutcome('provider_not_configured');
    const out: Array<{ slug: string; stagedFields: string[] }> = [];
    let attempted = 0;
    for (const r of robots) {
      attempted += 1;
      const res = await deps.specs.enrichRobot(r.id);
      if (res.status === 'not_configured') return failOutcome('provider_not_configured');
      if (res.status === 'staged') out.push({ slug: deps.catalog.slugOfRobot(r.name), stagedFields: res.fields.map((f) => cleanText(f, 40)).filter((f): f is string => !!f) });
    }
    // 스펙 값 자체는 결과에 싣지 않는다 (필드 이름만)
    return okOutcome({ stagedCount: out.length, robots: out }, deps.estimates.spec * attempted, 'claude');
  };

  return {
    async estimate(params) {
      switch (params.target) {
        case 'video': {
          const art = await findVideoArticle(deps, String(params.id));
          const cached = !!art?.geminiAnalysis && params.force !== true;
          return { costUsd: cached ? 0 : deps.estimates.video, provider: cached ? null : 'gemini', claude: false };
        }
        case 'company':
          return { costUsd: deps.estimates.spec * COMPANY_ENRICH_MAX_ROBOTS, provider: 'claude', claude: true };
        case 'robot':
          return { costUsd: deps.estimates.spec, provider: 'claude', claude: true };
        case 'topic': {
          const fresh = await deps.topic.isCacheFresh(String(params.domain), Number(params.days));
          return { costUsd: fresh ? 0 : deps.estimates.topic, provider: fresh ? null : 'claude', claude: !fresh };
        }
        default:
          return { costUsd: 0, provider: null, claude: false };
      }
    },

    async run(params): Promise<HandlerOutcome> {
      try {
        const ctx: ResultCtx = { allowedHosts: await deps.allowedHosts() };
        switch (params.target) {
          case 'video': {
            const art = await findVideoArticle(deps, String(params.id));
            if (!art) return failOutcome('not_found');
            const shape = (a: Record<string, unknown>) => ({
              articleId: art.id,
              title: cleanText(art.title, 400),
              url: cleanLink(art.url, ctx),
              geminiAnalysis: summarizeVideoAnalysis(a),
            });
            if (art.geminiAnalysis && params.force !== true) return okOutcome(shape(art.geminiAnalysis), 0, null);
            if (!deps.video.isConfigured()) return failOutcome('provider_not_configured');
            const r = await deps.video.analyzeSingle(art.id);
            if (!r.ok) return outcomeFromAnalyzeError(r.error);
            return okOutcome(shape(r.analysis), deps.estimates.video, 'gemini');
          }
          case 'company': {
            const company = await deps.catalog.findCompanyBySlug(String(params.slug));
            if (!company) return failOutcome('not_found');
            const robots = await deps.catalog.robotsMissingSpecs(company.id, COMPANY_ENRICH_MAX_ROBOTS);
            if (robots.length === 0) return okOutcome({ stagedCount: 0, robots: [] }, 0, null);
            return enrich(robots.slice(0, COMPANY_ENRICH_MAX_ROBOTS));
          }
          case 'robot': {
            const robot = await deps.catalog.findRobotBySlug(String(params.slug));
            if (!robot) return failOutcome('not_found');
            return enrich([robot]);
          }
          case 'topic': {
            const domain = String(params.domain);
            const days = Number(params.days);
            const report = await deps.topic.getReport(domain, days);
            const stats = cleanObject(report.stats, { videoCount: numberRule(0, 1_000_000, true), paperCount: numberRule(0, 1_000_000, true), channelCount: numberRule(0, 1_000_000, true) });
            const topChannels = cleanItems(report.stats.topChannels, 5, (c) => {
              const o = cleanObject(c, { name: textRule(80), count: numberRule(0, 1_000_000, true) });
              return typeof o.name === 'string' ? o : null;
            });
            const topKeywords = cleanItems(report.stats.topKeywords, 8, (k) => {
              const o = cleanObject(k, { keyword: textRule(60), count: numberRule(0, 1_000_000, true) });
              return typeof o.keyword === 'string' ? o : null;
            });
            const insightPoints = cleanItems(report.insight?.points, 8, (p) => cleanText(p, 400));
            const refs = cleanItems([...report.videos, ...report.papers], 20, (r) => {
              const o = r as { title?: unknown; url?: unknown };
              const url = cleanLink(o.url, ctx);
              const title = cleanText(o.title, 200);
              return url && title ? { title, url } : null;
            });
            const cached = report.insight?.cached ?? true;
            return okOutcome(
              {
                domain: cleanEnum(domain, ['hand', 'rfm', 'actuator', 'expo', 'production'] as const) ?? domain,
                days: cleanNumber(days, 1, 365) ?? days,
                stats: { ...stats, topChannels, topKeywords },
                insightPoints,
                refs,
              },
              cached ? 0 : deps.estimates.topic,
              cached ? null : 'claude',
            );
          }
          default:
            return failOutcome('invalid_target');
        }
      } catch (err) {
        return outcomeFromError(err);
      }
    },
  };
}

async function findVideoArticle(deps: AnalyzeDeps, id: string): Promise<ArticleLite | null> {
  return UUID_RE.test(id) ? deps.video.findArticleById(id) : deps.video.findArticleByVideoId(id);
}
