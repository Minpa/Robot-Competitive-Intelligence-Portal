/**
 * VideoContentAnalysisService — Gemini 기반 영상 내용 상세 분석
 *
 * 공개 YouTube 데모 영상 URL을 Gemini API(gemini-flash-latest)에 전달해
 * 작업/환경/자율성/능력/핵심 순간/한국어 요약을 추출한다.
 *
 * 안전 원칙:
 *  - 영상 파일/프레임을 다운로드·저장하지 않는다. 공개 YouTube watch URL만 전달한다.
 *  - 자막 전문·장문 전사는 저장하지 않는다. 파생 텍스트 요약만 길이 캡을 걸어 저장한다.
 *  - GEMINI_API_KEY 없으면 모든 진입점이 no-op이다.
 */

import { GoogleGenAI } from '@google/genai';
import { sql, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { articles } from '../db/schema.js';

const MODEL = process.env.GEMINI_VIDEO_MODEL || 'gemini-flash-latest';
const BATCH_LIMIT = Math.max(1, parseInt(process.env.GEMINI_VIDEO_CONTENT_ANALYSIS_BATCH_LIMIT || '20', 10));
const MAX_ATTEMPTS = Math.max(1, parseInt(process.env.GEMINI_VIDEO_MAX_ATTEMPTS || '2', 10));
const DOMAIN_FILTER = (process.env.GEMINI_VIDEO_DOMAIN_FILTER || 'robot')
  .split(',')
  .map((d) => d.trim())
  .filter(Boolean);
const REQUIRE_DEMO_SIGNAL = process.env.GEMINI_VIDEO_REQUIRE_DEMO_SIGNAL !== 'false';
const CONCURRENCY = Math.max(1, parseInt(process.env.GEMINI_VIDEO_CONCURRENCY || '2', 10));

// 공개 YouTube watch URL만 허용 (다운로드 없이 fileUri로 그대로 전달)
const YOUTUBE_WATCH_URL_RE = /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/i;

export type TechnicalMaturity = 'staged-demo' | 'lab' | 'pilot-field' | 'production' | 'unclear';

export interface GeminiTechnicalAnalysis {
  locomotion: string | null; // ≤200자
  manipulation: string | null; // ≤200자
  hardware: string | null; // ≤200자
  controlNotes: string | null; // ≤200자
  technicalHighlights: string[]; // ≤4개, 각 ≤80자
  limitations: string[]; // ≤3개, 각 ≤80자
  maturity: TechnicalMaturity;
  maturityEvidence: string | null; // ≤150자
}

export interface GeminiVideoAnalysis {
  task: string;
  environment: string;
  autonomy: 'autonomous' | 'teleoperated' | 'assisted' | 'unclear';
  autonomyEvidence?: string;
  robotCount: number | null;
  durationSec: number | null;
  capabilities: string[];
  keyMoments: { timestampSec: number; description: string }[];
  summaryKo: string;
  model: string;
  analyzedAt: string;
  technicalAnalysis?: GeminiTechnicalAnalysis;
}

interface PendingVideo {
  id: string;
  title: string;
  url: string;
}

const AUTONOMY_VALUES: GeminiVideoAnalysis['autonomy'][] = ['autonomous', 'teleoperated', 'assisted', 'unclear'];

const PROMPT_KO = `이 영상은 로봇 데모 영상이다. 영상 내용을 분석해 아래 JSON 스키마로만 응답하라.
자막 전문이나 장문 전사를 포함하지 말고, 오직 사실에 근거한 간결한 한국어 요약만 작성하라. 추측·과장 금지.

스키마:
{
  "task": "영상에서 로봇이 수행하는 핵심 작업 (한 문장)",
  "environment": "촬영 환경/장소 (한 문장)",
  "autonomy": "autonomous|teleoperated|assisted|unclear 중 하나 — 로봇의 자율성 수준",
  "autonomyEvidence": "자율성 판단 근거 (200자 이내)",
  "robotCount": "영상에 등장하는 로봇 수 (숫자, 모르면 null)",
  "durationSec": "작업 수행 구간 길이(초, 모르면 null)",
  "capabilities": ["영상에서 확인되는 능력 키워드, 최대 8개, 각 40자 이내"],
  "keyMoments": [{"timestampSec": 0, "description": "핵심 순간 설명(80자 이내)"}],
  "summaryKo": "사실 기반 한국어 요약 (400자 이내)",
  "technicalAnalysis": {
    "locomotion": "이동방식 (보행 게이트, 바퀴, 궤도 등)과 이동 품질에 대한 관찰 (200자 이내, 모르면 null)",
    "manipulation": "조작/파지 동작과 그 정확도·안정성에 대한 관찰 (200자 이내, 모르면 null)",
    "hardware": "영상에서 확인되는 하드웨어 단서 — 액추에이터, 센서, 그리퍼 형태 등 (200자 이내, 모르면 null)",
    "controlNotes": "제어 방식에 대한 단서 — 지연, 부자연스러운 동작, 원격조작 흔적 등 (200자 이내, 모르면 null)",
    "technicalHighlights": ["영상에서 확인되는 기술적으로 인상적인 포인트, 최대 4개, 각 80자 이내"],
    "limitations": ["영상에서 확인되는 기술적 한계나 아쉬운 점, 최대 3개, 각 80자 이내"],
    "maturity": "staged-demo|lab|pilot-field|production|unclear 중 하나 — 기술 성숙도",
    "maturityEvidence": "성숙도 판단 근거 1문장 (150자 이내, 모르면 null)"
  }
}
keyMoments는 최대 6개, timestampSec는 영상 시작 기준 초 단위 정수로 추정하라.
technicalAnalysis의 모든 값은 반드시 영상에서 실제로 보이거나 들리는 것에 근거해야 한다. 추측하지 말고, 확인할 수 없으면 해당 필드를 null 또는 빈 배열로, maturity는 "unclear"로 응답하라. 자막 전문이나 장문 전사를 포함하지 말라.
JSON 객체만 응답하고 다른 텍스트는 포함하지 말라.`;

function truncate(s: unknown, max: number): string {
  if (typeof s !== 'string') return '';
  return s.slice(0, max);
}

const MATURITY_VALUES: TechnicalMaturity[] = ['staged-demo', 'lab', 'pilot-field', 'production', 'unclear'];

function nullableTruncate(s: unknown, max: number): string | null {
  if (typeof s !== 'string' || s.length === 0) return null;
  return s.slice(0, max);
}

function parseTechnicalAnalysis(raw: unknown): GeminiTechnicalAnalysis | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const r = raw as Record<string, unknown>;

  const technicalHighlights = Array.isArray(r.technicalHighlights)
    ? (r.technicalHighlights as unknown[])
        .filter((c): c is string => typeof c === 'string')
        .map((c) => truncate(c, 80))
        .slice(0, 4)
    : [];

  const limitations = Array.isArray(r.limitations)
    ? (r.limitations as unknown[])
        .filter((c): c is string => typeof c === 'string')
        .map((c) => truncate(c, 80))
        .slice(0, 3)
    : [];

  const maturityRaw = typeof r.maturity === 'string' ? r.maturity : 'unclear';
  const maturity: TechnicalMaturity = MATURITY_VALUES.includes(maturityRaw as TechnicalMaturity)
    ? (maturityRaw as TechnicalMaturity)
    : 'unclear';

  return {
    locomotion: nullableTruncate(r.locomotion, 200),
    manipulation: nullableTruncate(r.manipulation, 200),
    hardware: nullableTruncate(r.hardware, 200),
    controlNotes: nullableTruncate(r.controlNotes, 200),
    technicalHighlights,
    limitations,
    maturity,
    maturityEvidence: nullableTruncate(r.maturityEvidence, 150),
  };
}

export function parseAnalysis(text: string, model: string): GeminiVideoAnalysis | null {
  const tryParse = (raw: string): Record<string, unknown> | null => {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
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

  const autonomyRaw = typeof parsed.autonomy === 'string' ? parsed.autonomy : 'unclear';
  const autonomy: GeminiVideoAnalysis['autonomy'] = AUTONOMY_VALUES.includes(
    autonomyRaw as GeminiVideoAnalysis['autonomy']
  )
    ? (autonomyRaw as GeminiVideoAnalysis['autonomy'])
    : 'unclear';

  const capabilities = Array.isArray(parsed.capabilities)
    ? (parsed.capabilities as unknown[])
        .filter((c): c is string => typeof c === 'string')
        .map((c) => truncate(c, 40))
        .slice(0, 8)
    : [];

  const keyMoments = Array.isArray(parsed.keyMoments)
    ? (parsed.keyMoments as unknown[])
        .filter(
          (m): m is { timestampSec: unknown; description: unknown } =>
            typeof m === 'object' && m !== null
        )
        .map((m) => ({
          timestampSec: Number.isFinite(Number((m as any).timestampSec))
            ? Math.max(0, Math.round(Number((m as any).timestampSec)))
            : 0,
          description: truncate((m as any).description, 80),
        }))
        .filter((m) => m.description.length > 0)
        .slice(0, 6)
    : [];

  const robotCount =
    typeof parsed.robotCount === 'number' && Number.isFinite(parsed.robotCount) ? parsed.robotCount : null;
  const durationSec =
    typeof parsed.durationSec === 'number' && Number.isFinite(parsed.durationSec) ? parsed.durationSec : null;

  return {
    task: truncate(parsed.task, 200),
    environment: truncate(parsed.environment, 200),
    autonomy,
    autonomyEvidence: truncate(parsed.autonomyEvidence, 200) || undefined,
    robotCount,
    durationSec,
    capabilities,
    keyMoments,
    summaryKo: truncate(parsed.summaryKo, 400),
    model,
    analyzedAt: new Date().toISOString(),
    technicalAnalysis: parseTechnicalAnalysis(parsed.technicalAnalysis),
  };
}

class VideoContentAnalysisService {
  private client: GoogleGenAI | null = null;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
  }

  /** Gemini 상세 분석 대기 중인 영상 조회 (신규 위주, robot 도메인, 배치 상한 내) */
  private async getPending(limit: number): Promise<PendingVideo[]> {
    const rows = await db
      .select({
        id: articles.id,
        title: articles.title,
        url: articles.url,
      })
      .from(articles)
      .where(
        and(
          sql`product_type = 'video'`,
          sql`(extracted_metadata->>'geminiAnalyzedAt') IS NULL`,
          DOMAIN_FILTER.length > 0
            ? sql`(extracted_metadata->>'domain') IN (${sql.join(
                DOMAIN_FILTER.map((d) => sql`${d}`),
                sql`, `
              )})`
            : sql`TRUE`,
          REQUIRE_DEMO_SIGNAL ? sql`(extracted_metadata->'aiTags') IS NOT NULL` : sql`TRUE`,
          sql`COALESCE((extracted_metadata->>'geminiAnalysisAttempts')::int, 0) < ${MAX_ATTEMPTS}`
        )
      )
      .orderBy(sql`published_at DESC NULLS LAST`)
      .limit(limit);

    return rows.map((r) => ({ id: r.id, title: r.title, url: r.url }));
  }

  /** 단일 영상 Gemini 분석 — 실패 시 null, 쿼터 소진 시 'quota' (재시도 카운트에서 제외) */
  private async analyzeOne(video: PendingVideo): Promise<GeminiVideoAnalysis | 'quota' | null> {
    if (!this.client) return null;
    try {
      const response = await this.client.models.generateContent({
        model: MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              { fileData: { fileUri: video.url, mimeType: 'video/*' } },
              { text: PROMPT_KO },
            ],
          },
        ],
        config: { responseMimeType: 'application/json' },
      });
      const text = response.text;
      if (!text) return null;
      return parseAnalysis(text, MODEL);
    } catch (err) {
      const msg = (err as Error).message ?? '';
      // 무료 티어 일일 쿼터/레이트리밋(429)은 영상 문제가 아니므로 attempts를 올리지 않는다
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        console.warn(`[VideoContentAnalysis] quota exhausted (429) — batch will stop early`);
        return 'quota';
      }
      console.error(`[VideoContentAnalysis] analyzeOne failed for ${video.id}:`, msg);
      return null;
    }
  }

  /** 배치 실행 — 신규 위주, 배치 상한 내에서만 처리 */
  async run(limit = BATCH_LIMIT): Promise<{ analyzed: number; failed: number; skipped: number }> {
    const res = { analyzed: 0, failed: 0, skipped: 0 };
    if (!this.client) return res;

    const pending = await this.getPending(limit);
    if (pending.length === 0) return res;

    let quotaHit = false;
    for (let i = 0; i < pending.length && !quotaHit; i += CONCURRENCY) {
      const batch = pending.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        batch.map(async (video) => ({ video, analysis: await this.analyzeOne(video) }))
      );

      for (const { video, analysis } of results) {
        if (analysis === 'quota') {
          // 쿼터 소진: attempts 미증가(불이익 없음) + 남은 배치 중단, 다음 실행 때 자연 재시도
          quotaHit = true;
          res.skipped++;
          continue;
        }
        if (analysis) {
          await db.execute(sql`
            UPDATE articles
            SET extracted_metadata = COALESCE(extracted_metadata, '{}'::jsonb)
              || jsonb_build_object(
                'geminiAnalysis', ${JSON.stringify(analysis)}::jsonb,
                'geminiAnalyzedAt', ${analysis.analyzedAt}::text
              )
            WHERE id = ${video.id}
          `);
          res.analyzed++;
        } else {
          await db.execute(sql`
            UPDATE articles
            SET extracted_metadata = COALESCE(extracted_metadata, '{}'::jsonb)
              || jsonb_build_object(
                'geminiAnalysisAttempts',
                COALESCE((extracted_metadata->>'geminiAnalysisAttempts')::int, 0) + 1
              )
            WHERE id = ${video.id}
          `);
          res.failed++;
        }
      }
    }

    console.log(`[VideoContentAnalysis] analyzed ${res.analyzed}, failed ${res.failed}, skipped ${res.skipped}`);
    return res;
  }

  /** 관리자 온디맨드 단건 분석 */
  async analyzeSingle(articleId: string): Promise<{ ok: true; analysis: GeminiVideoAnalysis } | { ok: false; error: string }> {
    if (!this.client) {
      return { ok: false, error: 'GEMINI_API_KEY not configured' };
    }

    const [row] = await db
      .select({ id: articles.id, title: articles.title, url: articles.url, productType: articles.productType })
      .from(articles)
      .where(sql`id = ${articleId}`)
      .limit(1);

    if (!row) {
      return { ok: false, error: 'Article not found' };
    }
    if (row.productType !== 'video' || !YOUTUBE_WATCH_URL_RE.test(row.url)) {
      return { ok: false, error: 'not a public YouTube video' };
    }

    const analysis = await this.analyzeOne({ id: row.id, title: row.title, url: row.url });
    if (analysis === 'quota') {
      return { ok: false, error: 'Gemini 일일 쿼터 소진 — 잠시 후(또는 내일) 다시 시도하거나 유료 티어(billing)를 활성화하세요.' };
    }
    if (!analysis) {
      await db.execute(sql`
        UPDATE articles
        SET extracted_metadata = COALESCE(extracted_metadata, '{}'::jsonb)
          || jsonb_build_object(
            'geminiAnalysisAttempts',
            COALESCE((extracted_metadata->>'geminiAnalysisAttempts')::int, 0) + 1
          )
        WHERE id = ${row.id}
      `);
      return { ok: false, error: 'Gemini analysis failed' };
    }

    await db.execute(sql`
      UPDATE articles
      SET extracted_metadata = COALESCE(extracted_metadata, '{}'::jsonb)
        || jsonb_build_object(
          'geminiAnalysis', ${JSON.stringify(analysis)}::jsonb,
          'geminiAnalyzedAt', ${analysis.analyzedAt}::text
        )
      WHERE id = ${row.id}
    `);

    return { ok: true, analysis };
  }

  /** Gemini로 상세 분석 완료된 영상 목록 (최신 분석순) — 트렌드 페이지 노출용 */
  async listAnalyzed(limit = 30) {
    const rows = await db
      .select({
        id: articles.id,
        title: articles.title,
        url: articles.url,
        publishedAt: articles.publishedAt,
        meta: articles.extractedMetadata,
      })
      .from(articles)
      .where(and(sql`product_type = 'video'`, sql`(extracted_metadata->'geminiAnalysis') IS NOT NULL`))
      .orderBy(sql`(extracted_metadata->>'geminiAnalyzedAt') DESC NULLS LAST`)
      .limit(limit);

    return rows.map((r) => {
      const meta = (r.meta ?? {}) as Record<string, any>;
      const g = (meta.geminiAnalysis ?? {}) as Record<string, any>;
      const videoId = typeof meta.videoId === 'string' ? meta.videoId : null;
      return {
        id: r.id,
        title: r.title,
        url: r.url,
        thumbnail:
          typeof meta.thumbnail === 'string'
            ? meta.thumbnail
            : videoId
              ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
              : null,
        channel: typeof meta.channel === 'string' ? meta.channel : null,
        publishedAt: r.publishedAt,
        task: typeof g.task === 'string' ? g.task : null,
        environment: typeof g.environment === 'string' ? g.environment : null,
        autonomy: typeof g.autonomy === 'string' ? g.autonomy : null,
        robotCount: typeof g.robotCount === 'number' ? g.robotCount : null,
        capabilities: Array.isArray(g.capabilities) ? g.capabilities.slice(0, 8) : [],
        summaryKo: typeof g.summaryKo === 'string' ? g.summaryKo : null,
        analyzedAt: typeof meta.geminiAnalyzedAt === 'string' ? meta.geminiAnalyzedAt : null,
        technicalAnalysis:
          typeof g.technicalAnalysis === 'object' && g.technicalAnalysis !== null
            ? {
                locomotion: typeof g.technicalAnalysis.locomotion === 'string' ? g.technicalAnalysis.locomotion : null,
                manipulation:
                  typeof g.technicalAnalysis.manipulation === 'string' ? g.technicalAnalysis.manipulation : null,
                hardware: typeof g.technicalAnalysis.hardware === 'string' ? g.technicalAnalysis.hardware : null,
                controlNotes:
                  typeof g.technicalAnalysis.controlNotes === 'string' ? g.technicalAnalysis.controlNotes : null,
                technicalHighlights: Array.isArray(g.technicalAnalysis.technicalHighlights)
                  ? g.technicalAnalysis.technicalHighlights.slice(0, 4)
                  : [],
                limitations: Array.isArray(g.technicalAnalysis.limitations)
                  ? g.technicalAnalysis.limitations.slice(0, 3)
                  : [],
                maturity: typeof g.technicalAnalysis.maturity === 'string' ? g.technicalAnalysis.maturity : 'unclear',
                maturityEvidence:
                  typeof g.technicalAnalysis.maturityEvidence === 'string' ? g.technicalAnalysis.maturityEvidence : null,
              }
            : null,
      };
    });
  }
}

export const videoContentAnalysisService = new VideoContentAnalysisService();
