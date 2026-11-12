/**
 * ARGOS_I 요청 스키마 · 정규화(canonical JSON) · 해시 (순수).
 *
 * zod strict 스키마로 봉투와 종류별 params 를 검증한다. 검증 실패는 값·키 이름·zod 메시지를 담지 않는
 * 사유 코드(unknown_key / invalid_type_or_shape / source_not_public)로만 돌려준다.
 * 모든 파라미터는 형식 검증(id, slug, enum, 숫자)을 통과해야 한다. 자유 텍스트는 `note` 하나뿐이다.
 */

import { createHash } from 'crypto';
import { z } from 'zod';
import type { GuardReasonCode } from './argos-i-guard-rules.js';

export const REQUEST_TYPES = ['add_source', 'analyze', 'query'] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];
/** v2 예약 — v1 에서는 400 unsupported_type */
export const RESERVED_REQUEST_TYPES = ['regenerate_brief', 'watch_register'] as const;
/** DB CHECK 에 들어가는 전체 type 값 */
export const DB_REQUEST_TYPES = [...REQUEST_TYPES, ...RESERVED_REQUEST_TYPES] as const;

export const ENVELOPE_KEYS = ['type', 'params', 'note', 'sourcePublic'] as const;

export const TECH_DOMAINS = ['hand', 'rfm', 'actuator', 'expo', 'production'] as const;
export const TOPIC_DAYS = [7, 14, 30, 60, 90] as const;
/** docs/argos-i-interface.md §8.0 열거값 사전의 시장 세그먼트 */
export const MARKET_SEGMENTS = ['tier1_oem', 'tier2_legged', 'research_edu', 'industrial_cobot', 'service', 'captive', 'other'] as const;

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const YT_VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
export const YT_CHANNEL_ID_RE = /^(?:UC[A-Za-z0-9_-]{22}|@[A-Za-z0-9._-]{3,30})$/;
export const ARXIV_ID_RE = /^(?:\d{4}\.\d{4,5}(?:v\d+)?|[a-z]+(?:-[a-z]+)*\/\d{7}(?:v\d+)?)$/;
export const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9_-]{8,64}$/;
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

const KST_OFFSET_MS = 9 * 3_600_000;
const DAY_MS = 86_400_000;

export interface ParsedRequest {
  type: RequestType;
  params: Record<string, unknown>;
  note?: string;
}

export interface EnvelopeParse {
  value?: ParsedRequest;
  reasons: Set<GuardReasonCode>;
  /** type 이 v2 예약 값 */
  unsupported: boolean;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
}

/** 정규화된 안정 직렬화 — 키를 정렬한다 (undefined 는 생략) */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map((v) => (v === undefined ? 'null' : stableStringify(v))).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

export function sha256Hex(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

export function kstYmdOf(d: Date): string {
  return new Date(d.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

function isValidYmdString(s: string): boolean {
  if (!YMD_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

// ─────────────────────────────────────────────────────────────────────────────
// params 스키마
// ─────────────────────────────────────────────────────────────────────────────

const slug = z.string().regex(SLUG_RE);
const urlString = z.string().min(1).max(2048);

function exactlyOne(keys: [string, string]) {
  return (v: Record<string, unknown>, ctx: z.RefinementCtx) => {
    const n = keys.filter((k) => v[k] !== undefined).length;
    if (n !== 1) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'exactly_one' });
  };
}

function buildParamSchemas(now: Date): Record<RequestType, Record<string, z.ZodTypeAny>> {
  const today = kstYmdOf(now);
  const oldest = kstYmdOf(new Date(now.getTime() - 90 * DAY_MS));
  return {
    add_source: {
      youtube_video: z
        .object({ kind: z.literal('youtube_video'), id: z.string().regex(YT_VIDEO_ID_RE).optional(), url: urlString.optional() })
        .strict()
        .superRefine(exactlyOne(['id', 'url'])),
      youtube_channel: z.object({ kind: z.literal('youtube_channel'), id: z.string().regex(YT_CHANNEL_ID_RE) }).strict(),
      arxiv: z.object({ kind: z.literal('arxiv'), id: z.string().regex(ARXIV_ID_RE) }).strict(),
      article_url: z.object({ kind: z.literal('article_url'), url: urlString }).strict(),
    },
    analyze: {
      video: z
        .object({
          target: z.literal('video'),
          id: z.string().refine((s) => UUID_RE.test(s) || YT_VIDEO_ID_RE.test(s)),
          force: z.boolean().default(false),
        })
        .strict(),
      company: z.object({ target: z.literal('company'), slug }).strict(),
      robot: z.object({ target: z.literal('robot'), slug }).strict(),
      topic: z
        .object({
          target: z.literal('topic'),
          domain: z.enum(TECH_DOMAINS),
          days: z.number().refine((n) => (TOPIC_DAYS as readonly number[]).includes(n)),
        })
        .strict(),
    },
    query: {
      company_recent: z.object({ query: z.literal('company_recent'), company: slug, weeks: z.number().int().min(1).max(8).default(8) }).strict(),
      robot_actuators: z.object({ query: z.literal('robot_actuators'), robot: slug }).strict(),
      hand_benchmark_top: z.object({ query: z.literal('hand_benchmark_top'), limit: z.number().int().min(1).max(20).default(10) }).strict(),
      actuator_suppliers_by_segment: z.object({ query: z.literal('actuator_suppliers_by_segment'), segment: z.enum(MARKET_SEGMENTS) }).strict(),
      ci_changes_since: z
        .object({
          query: z.literal('ci_changes_since'),
          since: z.string().refine((s) => isValidYmdString(s) && s >= oldest && s <= today),
          company: slug.optional(),
          limit: z.number().int().min(1).max(100).default(50),
        })
        .strict(),
    },
  };
}

/** 종류별 서브키가 들어 있는 params 필드 이름 */
const SUBKEY_FIELD: Record<RequestType, string> = { add_source: 'kind', analyze: 'target', query: 'query' };

export function subKeyOf(type: string, params: unknown): string | null {
  if (!(type in SUBKEY_FIELD) || !isPlainObject(params)) return null;
  const v = params[SUBKEY_FIELD[type as RequestType]];
  return typeof v === 'string' ? v : null;
}

function reasonsFromZod(error: z.ZodError, into: Set<GuardReasonCode>): void {
  for (const issue of error.issues) {
    into.add(issue.code === z.ZodIssueCode.unrecognized_keys ? 'unknown_key' : 'invalid_type_or_shape');
  }
}

/**
 * 봉투와 params 를 검증한다. 입력은 이미 JSON 으로 파싱된 값이다.
 * 반환의 reasons 에는 코드만 있다 (키 이름·값 없음). now 는 `since` 범위 검증에만 쓴다.
 */
export function parseRequestEnvelope(body: unknown, now: Date = new Date()): EnvelopeParse {
  const reasons = new Set<GuardReasonCode>();
  if (!isPlainObject(body)) {
    reasons.add('invalid_type_or_shape');
    return { reasons, unsupported: false };
  }
  if (Object.keys(body).some((k) => !(ENVELOPE_KEYS as readonly string[]).includes(k))) reasons.add('unknown_key');

  if (body.sourcePublic !== true) reasons.add('source_not_public');

  const type = body.type;
  let unsupported = false;
  let knownType: RequestType | null = null;
  if (typeof type === 'string' && (REQUEST_TYPES as readonly string[]).includes(type)) knownType = type as RequestType;
  else if (typeof type === 'string' && (RESERVED_REQUEST_TYPES as readonly string[]).includes(type)) unsupported = true;
  else reasons.add('invalid_type_or_shape');

  const noteRaw = body.note;
  let note: string | undefined;
  if (noteRaw !== undefined) {
    if (typeof noteRaw !== 'string') reasons.add('invalid_type_or_shape');
    else note = noteRaw;
  }

  let params: Record<string, unknown> | undefined;
  if (knownType) {
    const p = body.params;
    if (!isPlainObject(p)) {
      reasons.add('invalid_type_or_shape');
    } else {
      const sub = p[SUBKEY_FIELD[knownType]];
      const schema = typeof sub === 'string' ? buildParamSchemas(now)[knownType][sub] : undefined;
      if (!schema) {
        // 서브키가 없거나 알 수 없다 — 다른 키가 있었다면 알 수 없는 키 사유도 같이 낸다
        reasons.add('invalid_type_or_shape');
      } else {
        const r = schema.safeParse(p);
        if (r.success) params = r.data as Record<string, unknown>;
        else reasonsFromZod(r.error, reasons);
      }
    }
  } else if (unsupported && body.params !== undefined && !isPlainObject(body.params)) {
    reasons.add('invalid_type_or_shape');
  }

  if (reasons.size === 0 && knownType && params) {
    return { value: { type: knownType, params, ...(note !== undefined ? { note: note.trim() } : {}) }, reasons, unsupported: false };
  }
  return { reasons, unsupported };
}

// ─────────────────────────────────────────────────────────────────────────────
// canonical / 해시
// ─────────────────────────────────────────────────────────────────────────────

/** 저장·멱등 비교에 쓰는 정규화 본문 (sourcePublic 은 증명 필드라 저장하지 않는다) */
export function canonicalize(req: ParsedRequest): { canonical: ParsedRequest; canonicalJson: string; payloadHash: string } {
  const canonical: ParsedRequest = { type: req.type, params: req.params, ...(req.note ? { note: req.note } : {}) };
  const canonicalJson = stableStringify(canonical);
  return { canonical, canonicalJson, payloadHash: sha256Hex(canonicalJson) };
}

/** 거부된 본문의 식별용 짧은 해시 — 본문 정렬 직렬화의 sha256 앞 8자 (값 복원 불가) */
export function hash8Of(value: unknown): string {
  let text: string;
  try {
    text = stableStringify(value);
  } catch {
    text = '';
  }
  return sha256Hex(text).slice(0, 8);
}

export function idempotencyHashOf(headerValue: string): string {
  return sha256Hex(`idem:${headerValue}`);
}
