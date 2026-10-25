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
import { aiUsageService } from './ai-usage.service.js';

const MODEL = process.env.GEMINI_VIDEO_MODEL || 'gemini-flash-latest';
const BATCH_LIMIT = Math.max(1, parseInt(process.env.GEMINI_VIDEO_CONTENT_ANALYSIS_BATCH_LIMIT || '20', 10));
export const MAX_ATTEMPTS = Math.max(1, parseInt(process.env.GEMINI_VIDEO_MAX_ATTEMPTS || '2', 10));
const DOMAIN_FILTER = (process.env.GEMINI_VIDEO_DOMAIN_FILTER || 'robot')
  .split(',')
  .map((d) => d.trim())
  .filter(Boolean);
const REQUIRE_DEMO_SIGNAL = process.env.GEMINI_VIDEO_REQUIRE_DEMO_SIGNAL !== 'false';
const CONCURRENCY = Math.max(1, parseInt(process.env.GEMINI_VIDEO_CONCURRENCY || '2', 10));
// 동향 브리핑 목적이므로 최근 게시 영상만 분석/노출 (과거 아카이브 소급 분석 방지)
const SINCE_DAYS = Math.max(1, parseInt(process.env.GEMINI_VIDEO_SINCE_DAYS || '180', 10));

// 공개 YouTube watch URL만 허용 (다운로드 없이 fileUri로 그대로 전달)
export const YOUTUBE_WATCH_URL_RE = /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/i;

export function isPublicYoutubeWatchUrl(url: string | null | undefined): boolean {
  return typeof url === 'string' && YOUTUBE_WATCH_URL_RE.test(url);
}

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
  /**
   * 도메인 관련성 판정 (focus 프롬프트 사용 시에만 존재). geminiAnalysis 마커에는 저장하지 않는다.
   * 판정 도메인 키(hand 또는 actuator) 하나만 채워진다 — 예: { hand: 'primary', reason } / { actuator: 'none', reason }.
   */
  domainFocus?: { hand?: HandFocusLevel; actuator?: HandFocusLevel; reason: string };
}

export type HandFocusLevel = 'primary' | 'secondary' | 'none';
export const HAND_FOCUS_LEVELS: HandFocusLevel[] = ['primary', 'secondary', 'none'];
/** 관련성 판정(focus 프롬프트)을 지원하는 도메인 */
export type FocusDomain = 'hand' | 'actuator';
const FOCUS_REASON_MAX = 120;

export interface PendingVideo {
  id: string;
  title: string;
  url: string;
}

export interface AnalyzeVideoResult {
  analysis: GeminiVideoAnalysis;
  inputTokens: number;
  outputTokens: number;
}

const AUTONOMY_VALUES: GeminiVideoAnalysis['autonomy'][] = ['autonomous', 'teleoperated', 'assisted', 'unclear'];

export const PROMPT_KO = `이 영상은 로봇 데모 영상이다. 영상 내용을 분석해 아래 JSON 스키마로만 응답하라.
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

/**
 * 기술 트렌드 리포트(핸드)용 변형 프롬프트 — 로봇 데모가 아닐 수 있다는 전제 + 핸드 관련성 판정 필드.
 * 영상 전달 방식(fileUri)과 JSON 전용 응답 지시는 PROMPT_KO와 동일하다.
 */
const PROMPT_HAND_KO = `이 영상은 로봇 관련 영상으로 수집되었으나 실제 로봇 데모가 아닐 수도 있다. 영상 내용을 분석해 아래 JSON 스키마로만 응답하라.
자막 전문이나 장문 전사를 포함하지 말고, 오직 사실에 근거한 간결한 한국어 요약만 작성하라. 추측·과장 금지.
영상에 로봇이 실제로 나오지 않으면 task는 "로봇 데모 아님", capabilities는 빈 배열로 두고, summaryKo에는 영상의 주제를 사실대로 한 문장으로 작성하라.

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
  },
  "domainFocus": {
    "hand": "primary|secondary|none 중 하나 — 로봇 핸드/그리퍼/손 조작 관련성",
    "reason": "판정 근거 1문장 (120자 이내)"
  }
}
keyMoments는 최대 6개, timestampSec는 영상 시작 기준 초 단위 정수로 추정하라.
technicalAnalysis의 모든 값은 반드시 영상에서 실제로 보이거나 들리는 것에 근거해야 한다. 추측하지 말고, 확인할 수 없으면 해당 필드를 null 또는 빈 배열로, maturity는 "unclear"로 응답하라. 자막 전문이나 장문 전사를 포함하지 말라.

domainFocus.hand 판정 기준:
- primary: 로봇 핸드·그리퍼·손가락·촉각 센서·덱스터러스 조작(손 조작) 자체가 영상의 주제이며 화면에서 핵심으로 다뤄진다.
- secondary: 전신·이동 로봇이나 휴머노이드의 작업 영상이지만, 손(핸드·그리퍼)을 이용한 조작이 의미 있는 구간으로 등장한다.
- none: 로봇 핸드·그리퍼·손 조작이 실질적으로 나오지 않거나 부수적으로 스치는 정도다. 예: 보행·주행·춤, 시설 소개, 키노트·인터뷰, 로봇이 아닌 영상.
영상에 실제로 보이는 것을 기준으로 판단하고 제목·채널명만으로 판단하지 말라. 애매하면 none이 아니라 secondary로 답하라.
JSON 객체만 응답하고 다른 텍스트는 포함하지 말라.`;

/**
 * 기술 트렌드 리포트(액추에이터)용 변형 프롬프트 — PROMPT_HAND_KO 와 같은 구조에 domainFocus.actuator 판정 기준만 다르다.
 * 핸드 프롬프트 문자열은 건드리지 않는다.
 */
const PROMPT_ACTUATOR_KO = `이 영상은 로봇 관련 영상으로 수집되었으나 실제 로봇 데모가 아닐 수도 있다. 영상 내용을 분석해 아래 JSON 스키마로만 응답하라.
자막 전문이나 장문 전사를 포함하지 말고, 오직 사실에 근거한 간결한 한국어 요약만 작성하라. 추측·과장 금지.
영상에 로봇이 실제로 나오지 않으면 task는 "로봇 데모 아님", capabilities는 빈 배열로 두고, summaryKo에는 영상의 주제를 사실대로 한 문장으로 작성하라.

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
    "hardware": "영상에서 확인되는 하드웨어 단서 — 액추에이터, 모터, 감속기, 관절 모듈, 센서 등 (200자 이내, 모르면 null)",
    "controlNotes": "제어 방식에 대한 단서 — 지연, 부자연스러운 동작, 원격조작 흔적 등 (200자 이내, 모르면 null)",
    "technicalHighlights": ["영상에서 확인되는 기술적으로 인상적인 포인트, 최대 4개, 각 80자 이내"],
    "limitations": ["영상에서 확인되는 기술적 한계나 아쉬운 점, 최대 3개, 각 80자 이내"],
    "maturity": "staged-demo|lab|pilot-field|production|unclear 중 하나 — 기술 성숙도",
    "maturityEvidence": "성숙도 판단 근거 1문장 (150자 이내, 모르면 null)"
  },
  "domainFocus": {
    "actuator": "primary|secondary|none 중 하나 — 로봇 액추에이터/모터/감속기/관절 구동계 관련성",
    "reason": "판정 근거 1문장 (120자 이내)"
  }
}
keyMoments는 최대 6개, timestampSec는 영상 시작 기준 초 단위 정수로 추정하라.
technicalAnalysis의 모든 값은 반드시 영상에서 실제로 보이거나 들리는 것에 근거해야 한다. 추측하지 말고, 확인할 수 없으면 해당 필드를 null 또는 빈 배열로, maturity는 "unclear"로 응답하라. 자막 전문이나 장문 전사를 포함하지 말라.

domainFocus.actuator 판정 기준:
- primary: 로봇 액추에이터·모터·감속기(하모닉·사이클로이드·유성)·리니어 구동·관절 모듈 자체(분해, 벤치 테스트, 토크·백드라이버빌리티 시험, 설계 설명)가 영상의 주제이며 화면에서 핵심으로 다뤄진다.
- secondary: 휴머노이드·레그드 로봇의 작업·보행 영상이지만, 관절 구동계(액추에이터·모터·감속기)의 성능·구조가 의미 있는 구간으로 설명되거나 보인다.
- none: 액추에이터·관절 구동계가 실질적으로 나오지 않거나 부수적으로 스치는 정도다. 예: 일반 로봇 작업 시연·춤, 소프트웨어·AI 설명, 시설 소개, 키노트·인터뷰, 자동차·드론·공작기계 모터, 로봇이 아닌 영상.
영상에 실제로 보이는 것을 기준으로 판단하고 제목·채널명만으로 판단하지 말라. 애매하면 none이 아니라 secondary로 답하라.
JSON 객체만 응답하고 다른 텍스트는 포함하지 말라.`;

/** 분석 프롬프트 빌더 — 인자가 없으면 기존 PROMPT_KO를 그대로 반환한다(스케줄 배치 동작 불변). */
export function buildAnalysisPrompt(focusDomain?: FocusDomain): string {
  if (focusDomain === 'hand') return PROMPT_HAND_KO;
  if (focusDomain === 'actuator') return PROMPT_ACTUATOR_KO;
  return PROMPT_KO;
}

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

/**
 * Gemini 응답의 domainFocus 객체 파싱 — 도메인 키(기본 hand)의 값이 없거나 enum 밖이면 null
 * (환각 값을 none으로 간주하지 않는다)
 */
export function parseDomainFocus(raw: unknown, domain: FocusDomain = 'hand'): { level: HandFocusLevel; reason: string } | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const v = r[domain];
  if (typeof v !== 'string') return null;
  const level = v.trim().toLowerCase() as HandFocusLevel;
  if (!HAND_FOCUS_LEVELS.includes(level)) return null;
  return { level, reason: truncate(r.reason, FOCUS_REASON_MAX).trim() };
}

/** focusDomain 을 생략하면 종전과 같이 domainFocus.hand 를 읽는다. */
export function parseAnalysis(text: string, model: string, focusDomain: FocusDomain = 'hand'): GeminiVideoAnalysis | null {
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

  const focus = parseDomainFocus(parsed.domainFocus, focusDomain);

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
    ...(focus ? { domainFocus: { [focusDomain]: focus.level, reason: focus.reason } } : {}),
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
          sql`COALESCE((extracted_metadata->>'geminiAnalysisAttempts')::int, 0) < ${MAX_ATTEMPTS}`,
          // 오래된 아카이브 영상으로 소급하지 않도록 게시일 하한 적용
          sql`published_at >= now() - make_interval(days => ${SINCE_DAYS})`
        )
      )
      .orderBy(sql`published_at DESC NULLS LAST`)
      .limit(limit);

    return rows.map((r) => ({ id: r.id, title: r.title, url: r.url }));
  }

  /** Gemini API 키 설정 여부 */
  isConfigured(): boolean {
    return this.client !== null;
  }

  /**
   * Gemini 호출 본체 — 분석 결과와 토큰 수를 함께 반환한다.
   * 실패/빈 응답 null, 쿼터 소진 'quota' (재시도 카운트에서 제외).
   */
  private async callGemini(
    video: PendingVideo,
    opts: { focusDomain?: FocusDomain; usageTag?: string } = {}
  ): Promise<AnalyzeVideoResult | 'quota' | null> {
    if (!this.client) return null;
    try {
      const response = await this.client.models.generateContent({
        model: MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              { fileData: { fileUri: video.url, mimeType: 'video/*' } },
              { text: buildAnalysisPrompt(opts.focusDomain) },
            ],
          },
        ],
        config: { responseMimeType: 'application/json' },
      });
      const usage = response.usageMetadata;
      const inputTokens = usage?.promptTokenCount ?? 0;
      const outputTokens = usage?.candidatesTokenCount ?? 0;
      aiUsageService.logUsage({
        provider: 'gemini',
        model: MODEL,
        webSearch: false,
        inputTokens,
        outputTokens,
        query: `${opts.usageTag ?? '[video-analysis]'} ${video.title.slice(0, 80)}`,
      }).catch(() => {});
      const text = response.text;
      if (!text) return null;
      const analysis = parseAnalysis(text, MODEL, opts.focusDomain ?? 'hand');
      if (!analysis) return null;
      return { analysis, inputTokens, outputTokens };
    } catch (err) {
      const msg = (err as Error).message ?? '';
      // 무료 티어 일일 쿼터/레이트리밋(429)은 영상 문제가 아니므로 attempts를 올리지 않는다
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        console.warn(`[VideoContentAnalysis] quota exhausted (429) — batch will stop early. detail: ${msg.slice(0, 500)}`);
        return 'quota';
      }
      console.error(`[VideoContentAnalysis] analyzeOne failed for ${video.id}:`, msg);
      return null;
    }
  }

  /** 단일 영상 Gemini 분석 — 실패 시 null, 쿼터 소진 시 'quota' (재시도 카운트에서 제외) */
  private async analyzeOne(video: PendingVideo): Promise<GeminiVideoAnalysis | 'quota' | null> {
    const res = await this.callGemini(video);
    if (res === 'quota' || res === null) return res;
    return res.analysis;
  }

  /**
   * 공개 분석 진입점(기술 트렌드 리포트 배치용) — 전역 DOMAIN_FILTER/SINCE_DAYS/getPending을 타지 않는다.
   * 토큰 수를 함께 반환해 호출 측이 예산 가드를 걸 수 있다.
   */
  async analyzeVideo(
    video: PendingVideo,
    opts: { focusDomain?: FocusDomain; usageTag?: string } = {}
  ): Promise<AnalyzeVideoResult | 'quota' | null> {
    return this.callGemini(video, opts);
  }

  /** 분석 결과 마커 저장 (geminiAnalysis + geminiAnalyzedAt). domainFocus는 마커에 중복 저장하지 않는다. */
  async persistAnalysis(articleId: string, analysis: GeminiVideoAnalysis): Promise<void> {
    const { domainFocus: _domainFocus, ...stored } = analysis;
    await db.execute(sql`
      UPDATE articles
      SET extracted_metadata = COALESCE(extracted_metadata, '{}'::jsonb)
        || jsonb_build_object(
          'geminiAnalysis', ${JSON.stringify(stored)}::jsonb,
          'geminiAnalyzedAt', ${analysis.analyzedAt}::text
        )
      WHERE id = ${articleId}
    `);
  }

  /** 분석 실패 시도 횟수 +1 */
  async recordFailedAttempt(articleId: string): Promise<void> {
    await db.execute(sql`
      UPDATE articles
      SET extracted_metadata = COALESCE(extracted_metadata, '{}'::jsonb)
        || jsonb_build_object(
          'geminiAnalysisAttempts',
          COALESCE((extracted_metadata->>'geminiAnalysisAttempts')::int, 0) + 1
        )
      WHERE id = ${articleId}
    `);
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
          await this.persistAnalysis(video.id, analysis);
          res.analyzed++;
        } else {
          await this.recordFailedAttempt(video.id);
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
    if (row.productType !== 'video' || !isPublicYoutubeWatchUrl(row.url)) {
      return { ok: false, error: 'not a public YouTube video' };
    }

    const analysis = await this.analyzeOne({ id: row.id, title: row.title, url: row.url });
    if (analysis === 'quota') {
      return { ok: false, error: 'Gemini 일일 쿼터 소진 — 잠시 후(또는 내일) 다시 시도하거나 유료 티어(billing)를 활성화하세요.' };
    }
    if (!analysis) {
      await this.recordFailedAttempt(row.id);
      return { ok: false, error: 'Gemini analysis failed' };
    }

    await this.persistAnalysis(row.id, analysis);

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
      .where(
        and(
          sql`product_type = 'video'`,
          sql`(extracted_metadata->'geminiAnalysis') IS NOT NULL`,
          // 이미 분석된 과거 영상은 데이터로만 보존하고 동향 목록에는 최근 게시분만 노출
          sql`published_at >= now() - make_interval(days => ${SINCE_DAYS})`
        )
      )
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
