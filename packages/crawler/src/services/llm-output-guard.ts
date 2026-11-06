/**
 * LLM 출력 검증·저장 전 sanitize — 순수 함수 (DB·네트워크·SDK 의존 없음).
 *
 * 모델 출력은 신뢰하지 않는다. DB 쓰기 직전에 이 모듈로 필드별 규칙(길이·enum·범위·URL·유출)을 통과시키고,
 * 통과 못 한 필드는 폐기(저장하지 않음)한다. 불량 전체면 호출자가 폴백(휴리스틱/템플릿)을 쓴다.
 *
 * URL 정책(PM 결정 Q4): 요약/태그/브리프 문자열은 URL 토큰만 제거한다(문장 폐기 아님). URL 필드(이벤트 url, 텍스트 분석 articles[].url)만
 * https + 공개 호스트 형식 검증을 통과해야 한다.
 *
 * 이 파일은 packages/crawler/src/services/ 에 동일 내용으로 복제되어 있다 (llm-guard-static 테스트가 해시 동일성을 검사).
 */

import { INVISIBLE_CHARS_RE, cutChars, decodeHtmlEntities, stripCiteTags, stripHtml, flattenMarkdown } from './llm-input-guard.js';
import { UNTRUSTED_DATA_NOTICE, UNTRUSTED_DATA_NOTICE_EN, UNTRUSTED_DATA_NOTICE_URL_FIELD, UNTRUSTED_DATA_NOTICE_EN_URL_FIELD } from './llm-guard-prompts.js';

// ─────────────────────────────────────────────────────────────────────────────
// JSON 추출 / 스키마
// ─────────────────────────────────────────────────────────────────────────────

/** 코드펜스를 벗기고 첫 여는 괄호~마지막 닫는 괄호를 JSON 으로 파싱한다. 실패하면 null (모델 원문을 돌려주지 않는다) */
export function parseJsonStrict(text: string, kind: 'object' | 'array' = 'object'): unknown | null {
  if (typeof text !== 'string') return null;
  const cleaned = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const open = kind === 'object' ? '{' : '[';
  const close = kind === 'object' ? '}' : ']';
  const a = cleaned.indexOf(open);
  const b = cleaned.lastIndexOf(close);
  if (a === -1 || b <= a) return null;
  try {
    const v = JSON.parse(cleaned.slice(a, b + 1)) as unknown;
    if (kind === 'array') return Array.isArray(v) ? v : null;
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

export type RejectReason = 'schema' | 'url' | 'leak' | 'identifier' | 'enum' | 'range' | 'empty';

export type FieldRule =
  | { type: 'text'; max: number; min?: number; keepNewlines?: boolean; allowMarkdown?: boolean }
  | { type: 'tag'; max?: number }
  | { type: 'enum'; allowed: readonly string[] }
  | { type: 'number'; min: number; max: number; integer?: boolean }
  | { type: 'url'; allowedHosts?: readonly string[] }
  | { type: 'list'; item: FieldRule; maxItems: number };

export interface RuleContext {
  /** 입력에 있던 식별자 집합 — 출력에 이 밖의 이메일/전화번호가 있으면 필드를 폐기한다 */
  inputIdentifiers?: ReadonlySet<string>;
  /** 시스템 프롬프트 본문 — 에코 탐지용 */
  systemText?: string;
  /** 필드가 폐기될 때 호출 (지표용) */
  onReject?: (reason: RejectReason, field: string) => void;
}

export type RuleResult = { ok: true; value: unknown } | { ok: false; reason: RejectReason };

export function applyRule(value: unknown, rule: FieldRule, ctx: RuleContext = {}, field = ''): RuleResult {
  const fail = (reason: RejectReason): RuleResult => {
    ctx.onReject?.(reason, field);
    return { ok: false, reason };
  };
  switch (rule.type) {
    case 'text': {
      if (typeof value !== 'string') return fail('schema');
      const r = sanitizeOutputText(value, {
        maxChars: rule.max,
        keepNewlines: rule.keepNewlines,
        allowMarkdown: rule.allowMarkdown,
        inputIdentifiers: ctx.inputIdentifiers,
        systemText: ctx.systemText,
      });
      if (r.text === null) return fail(r.reason ?? 'empty');
      if (rule.min !== undefined && Array.from(r.text).length < rule.min) return fail('empty');
      return { ok: true, value: r.text };
    }
    case 'tag': {
      const t = sanitizeTag(value, rule.max ?? 40);
      return t === null ? fail('schema') : { ok: true, value: t };
    }
    case 'enum': {
      const v = enumOnly(value, rule.allowed);
      return v === null ? fail('enum') : { ok: true, value: v };
    }
    case 'number': {
      if (typeof value !== 'number' && typeof value !== 'string') return fail('schema');
      const n = typeof value === 'number' ? value : value.trim() === '' ? NaN : Number(value);
      if (!Number.isFinite(n)) return fail('schema');
      if (n < rule.min || n > rule.max) return fail('range');
      return { ok: true, value: rule.integer ? Math.trunc(n) : n };
    }
    case 'url': {
      if (typeof value !== 'string') return fail('schema');
      const u = safeHttpsUrl(value, { allowedHosts: rule.allowedHosts });
      return u === null ? fail('url') : { ok: true, value: u };
    }
    case 'list': {
      if (!Array.isArray(value)) return fail('schema');
      const out: unknown[] = [];
      for (const it of value) {
        const r = applyRule(it, rule.item, { ...ctx, onReject: undefined }, field);
        if (r.ok) out.push(r.value);
        if (out.length >= rule.maxItems) break;
      }
      return { ok: true, value: out };
    }
  }
}

export interface SanitizeObjectResult {
  value: Record<string, unknown>;
  /** 스키마에 없어 버려진 키 개수 */
  unknownKeys: number;
  /** 규칙을 통과하지 못해 폐기된 키 */
  dropped: string[];
}

/**
 * 객체를 스키마(shape)로 정제한다. 스키마에 없는 키는 버리고, 규칙을 통과한 키만 남긴다.
 * 필수 키 판단은 호출자가 value 에서 한다 (없으면 폐기/폴백).
 */
export function sanitizeObject(raw: unknown, shape: Readonly<Record<string, FieldRule>>, ctx: RuleContext = {}): SanitizeObjectResult {
  const value: Record<string, unknown> = {};
  const dropped: string[] = [];
  let unknownKeys = 0;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { value, unknownKeys, dropped };
  const src = raw as Record<string, unknown>;
  for (const k of Object.keys(src)) {
    if (!Object.prototype.hasOwnProperty.call(shape, k) || k === '__proto__') unknownKeys++;
  }
  for (const [k, rule] of Object.entries(shape)) {
    if (!Object.prototype.hasOwnProperty.call(src, k) || src[k] === undefined || src[k] === null) continue;
    const r = applyRule(src[k], rule, ctx, k);
    if (r.ok) value[k] = r.value;
    else dropped.push(k);
  }
  return { value, unknownKeys, dropped };
}

// ─────────────────────────────────────────────────────────────────────────────
// 식별자 (URL / 이메일 / 전화번호)
// ─────────────────────────────────────────────────────────────────────────────

const URL_TOKEN_RE = /(?:https?|ftp):\/\/[^\s<>"'`)\]}]{1,2000}|\bwww\.[^\s<>"'`)\]}]{1,2000}/gi;
const EMAIL_RE = /[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,255}\.[A-Za-z]{2,24}/g;
const PHONE_RE = /\+\d{1,3}[\s.-]?\(?\d{1,4}\)?(?:[\s.-]?\d{2,4}){2,4}|\b0\d{1,2}[-. ]\d{3,4}[-. ]\d{4}\b|\(\d{2,4}\)[ -]?\d{3,4}[- ]\d{4}/g;

function normIdentifier(s: string): string {
  return s.toLowerCase().replace(/[.,;:!?]+$/, '');
}

/** 텍스트에 든 URL·이메일·전화번호(정규화)를 모은다. 출력의 식별자가 입력에 있었는지 비교할 때 쓴다 */
export function extractIdentifiers(text: string): Set<string> {
  const out = new Set<string>();
  if (typeof text !== 'string') return out;
  const t = text.length > 200_000 ? text.slice(0, 200_000) : text;
  for (const re of [URL_TOKEN_RE, EMAIL_RE]) {
    for (const m of t.matchAll(new RegExp(re.source, re.flags))) out.add(normIdentifier(m[0]));
  }
  for (const m of t.matchAll(new RegExp(PHONE_RE.source, PHONE_RE.flags))) out.add(m[0].replace(/[^\d+]/g, ''));
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 유출 / 지시문 에코 탐지
// ─────────────────────────────────────────────────────────────────────────────

export const OUTPUT_LEAK_PATTERNS: readonly RegExp[] = [
  /\bignore\s{1,5}(?:all\s{1,5}|the\s{1,5})?(?:previous|prior|above)\s{1,5}(?:instructions?|prompts?)/i,
  /\bas\s{1,3}an?\s{1,3}(?:ai|language\s{1,3}model|assistant)\b/i,
  /\bi\s{1,3}(?:cannot|can'?t|am\s{1,3}unable\s{1,3}to|won'?t)\s{1,3}(?:help|assist|comply|provide|summari[sz]e|follow)/i,
  /\bsystem\s{1,3}prompt\b/i,
  /(?:^|\n)\s{0,3}(?:system|assistant|human)\s{0,2}:/i,
  /\[\/?INST\]|<\|(?:im_start|im_end)\|>/i,
  /untrusted_data|data_block_(?:open|close)/i,
  /수집된\s{0,2}외부\s{0,2}자료이며|Every piece of text inside the data block/i,
  /(?:AI|인공지능)\s{0,2}(?:로서|으로서|언어\s{0,2}모델)/,
  /(?:죄송합니다|죄송하지만)[^.\n]{0,40}(?:없습니다|어렵습니다|수 없)/,
  /이전\s{0,3}(?:의\s{0,3})?지시(?:를|사항)?\s{0,3}무시/,
  /系统提示|忽略(?:之前|以上)/,
  /システムプロンプト|以前の指示/,
];

/** 출력에 지시문 에코·시스템 프롬프트 유출 징후가 있는지. systemText 가 있으면 그 문장이 그대로 들어 있는지도 본다 */
export function detectOutputLeak(text: string, systemText?: string): boolean {
  if (typeof text !== 'string' || text.length === 0) return false;
  const t = text.length > 50_000 ? text.slice(0, 50_000) : text;
  for (const re of OUTPUT_LEAK_PATTERNS) if (re.test(t)) return true;
  const norm = t.replace(/\s+/g, ' ').toLowerCase();
  const sys = [UNTRUSTED_DATA_NOTICE, UNTRUSTED_DATA_NOTICE_EN, UNTRUSTED_DATA_NOTICE_URL_FIELD, UNTRUSTED_DATA_NOTICE_EN_URL_FIELD];
  if (systemText) sys.push(systemText);
  for (const s of sys) {
    for (const piece of s.split(/(?<=[.!?。])\s+|\n+/)) {
      const p = piece.replace(/\s+/g, ' ').trim().toLowerCase();
      if (p.length >= 18 && norm.includes(p)) return true;
    }
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// 텍스트 sanitize
// ─────────────────────────────────────────────────────────────────────────────

export interface OutputTextOptions {
  maxChars: number;
  keepNewlines?: boolean;
  /** 마크다운 서식(#, -, **)을 유지한다. 링크/이미지 구문과 HTML 은 그래도 제거 */
  allowMarkdown?: boolean;
  /** 유출 징후가 있으면 필드를 폐기한다 (기본 true) */
  rejectOnLeak?: boolean;
  inputIdentifiers?: ReadonlySet<string>;
  systemText?: string;
}

export interface OutputTextResult {
  /** 폐기되면 null */
  text: string | null;
  reason?: RejectReason;
  /** 'url_removed' | 'html' | 'truncated' | ... */
  flags: string[];
}

/**
 * 저장·표시 전 문자열 정제: 엔티티 복원 → 인용 태그/HTML 제거 → 보이지 않는 문자 제거 → 마크다운 링크 제거 → URL 토큰 제거
 * → 입력에 없던 이메일/전화번호 필드 폐기 → 꺾쇠 중화 → 유출 징후 폐기 → 길이 상한.
 */
export function sanitizeOutputText(raw: unknown, opts: OutputTextOptions): OutputTextResult {
  const flags: string[] = [];
  if (typeof raw !== 'string') return { text: null, reason: 'schema', flags };
  const maxChars = Math.max(1, Math.trunc(opts.maxChars));
  let s = raw.slice(0, Math.min(200_000, Math.max(maxChars * 6, 4000)));

  s = decodeHtmlEntities(decodeHtmlEntities(s));
  // 전각·호환 문자(ＨＴＴＰＳ：／／ 등)로 URL 탐지를 우회하지 못하도록 NFKC 로 정규화한 뒤 처리한다 (모델 출력은 저장용이므로 원문 형태 보존 대상이 아니다)
  try {
    s = s.normalize('NFKC');
  } catch {
    // 정규화 실패 시 그대로 진행
  }
  s = stripCiteTags(s);
  s = s.replace(INVISIBLE_CHARS_RE, (m) => (opts.keepNewlines && (m.charCodeAt(0) === 0x2028 || m.charCodeAt(0) === 0x2029) ? '\n' : ''));
  const beforeHtml = s;
  s = stripHtml(s);
  if (s !== beforeHtml) flags.push('html');

  // 마크다운 링크/이미지는 링크 텍스트만 남긴다 (서식 허용 모드에서도 동일)
  const beforeLinks = s;
  s = s.replace(/!?\[([^\]\n]{0,300})\]\(([^)\s]{0,2000})\)/g, '$1');
  if (s !== beforeLinks) flags.push('link_removed');
  if (!opts.allowMarkdown) s = flattenMarkdown(s).replace(/\*\*|__|`/g, '');

  // 식별자: 입력에 없던 이메일/전화번호가 있으면 필드 폐기, URL 토큰은 제거
  const ids = new Set<string>();
  for (const re of [EMAIL_RE, PHONE_RE]) for (const m of s.matchAll(new RegExp(re.source, re.flags))) ids.add(m[0]);
  if (ids.size > 0) {
    const known = opts.inputIdentifiers;
    for (const id of ids) {
      const key = normIdentifier(id);
      const phoneKey = key.replace(/[^\d+]/g, '');
      if (!known || (!known.has(key) && !known.has(phoneKey))) return { text: null, reason: 'identifier', flags };
    }
  }
  const beforeUrl = s;
  s = s.replace(new RegExp(URL_TOKEN_RE.source, URL_TOKEN_RE.flags), ' ');
  if (s !== beforeUrl) flags.push('url_removed');
  // 스킴만 남은 흔적 무력화
  s = s.replace(/\b(javascript|vbscript|data)\s*:/gi, '$1 :').replace(/\bon(error|load|click|mouseover|focus)\s*=/gi, 'on$1 =');
  s = s.replace(/</g, '＜').replace(/>/g, '＞');

  if (opts.keepNewlines) {
    s = s.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  } else {
    s = s.replace(/\s+/g, ' ').trim();
  }
  if (!s) return { text: null, reason: 'empty', flags };

  if (opts.rejectOnLeak !== false && detectOutputLeak(s, opts.systemText)) return { text: null, reason: 'leak', flags };

  const cut = cutChars(s, maxChars);
  if (cut.length < s.length) flags.push('truncated');
  s = cut.trim();
  if (!s) return { text: null, reason: 'empty', flags };
  return { text: s, flags };
}

// ─────────────────────────────────────────────────────────────────────────────
// enum / 숫자 / 목록 / 태그
// ─────────────────────────────────────────────────────────────────────────────

export function enumOnly<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** 목록 상한: 항목 수와 항목 길이를 자른다. 문자열이 아닌 항목은 버린다 */
export function capList(list: unknown, maxItems: number, itemMax: number): string[] {
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  for (const it of list) {
    if (typeof it !== 'string') continue;
    const t = cutChars(it.trim(), itemMax);
    if (t) out.push(t);
    if (out.length >= maxItems) break;
  }
  return out;
}

/** 허용 문자: 글자(모든 언어), 숫자, 공백, - . / + ( ) */
const TAG_ALLOWED_RE = /^[\p{L}\p{N} \-./+()]+$/u;

/**
 * 자유 문자열 태그(기술 태그, 로봇명) 검증: 문자 집합 제한 + 길이. 통과하지 못하면 null.
 * HTML/URL/마크다운/인젝션 문장이 들어갈 여지를 없앤다.
 */
export function sanitizeTag(value: unknown, max = 40): string | null {
  if (typeof value !== 'string') return null;
  const t = decodeHtmlEntities(value).replace(INVISIBLE_CHARS_RE, '').replace(/\s+/g, ' ').trim();
  if (!t || Array.from(t).length > max) return null;
  if (!TAG_ALLOWED_RE.test(t)) return null;
  if (/(?:https?:|www\.)/i.test(t) || /\.(?:com|net|org|io|ai|kr|cn|jp)\b/i.test(t)) return null;
  if (detectOutputLeak(t)) return null;
  return t;
}

export function sanitizeTagList(list: unknown, maxItems: number, max = 40): string[] {
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  for (const it of list) {
    const t = sanitizeTag(it, max);
    if (t && !out.includes(t)) out.push(t);
    if (out.length >= maxItems) break;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// URL
// ─────────────────────────────────────────────────────────────────────────────

const MAX_URL_LENGTH = 2000;

function isPrivateOrLocalHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.lan') || h.endsWith('.home') || h.endsWith('.corp')) return true;
  if (h.includes(':')) return true; // IPv6 리터럴
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(h)) return true; // IPv4 리터럴 (공개 IP 도 허용하지 않는다)
  if (/^\d+$/.test(h) || /^0x[0-9a-f]+$/i.test(h)) return true; // 정수/16진 IP 표기
  return false;
}

/**
 * https + 공개 호스트 형식만 통과. http/javascript/data/자격증명/사설 주소/localhost/IP 리터럴/2000자 초과는 null.
 * allowedHosts 가 있으면 호스트가 목록과 같거나 하위 도메인이어야 한다. 통과하면 정규화된 URL 문자열을 돌려준다.
 */
export function safeHttpsUrl(raw: unknown, opts: { allowedHosts?: readonly string[] } = {}): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s || s.length > MAX_URL_LENGTH) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x20\x7f-\x9f]/.test(s)) return null;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:') return null;
  if (u.username || u.password) return null;
  const host = u.hostname.replace(/\.$/, '');
  if (!host || isPrivateOrLocalHost(host)) return null;
  // 공개 도메인 형식: 점이 하나 이상, 라벨은 영숫자/하이픈, TLD 는 글자 2자 이상 (punycode 허용)
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,24}|xn--[a-z0-9-]{2,59})$/i.test(host)) return null;
  if (opts.allowedHosts && opts.allowedHosts.length > 0) {
    const h = host.toLowerCase();
    const ok = opts.allowedHosts.some((a) => {
      const al = a.toLowerCase();
      return h === al || h.endsWith(`.${al}`);
    });
    if (!ok) return null;
  }
  return u.toString();
}

// ─────────────────────────────────────────────────────────────────────────────
// 스펙 수치 물리 범위 (P4)
// ─────────────────────────────────────────────────────────────────────────────

/** 휴머노이드/로봇 상세 스펙 필드별 물리적으로 말이 되는 범위. 범위 밖이면 폐기 */
export const SPEC_RANGES = {
  heightCm: { min: 20, max: 300 },
  weightKg: { min: 0.5, max: 500 },
  payloadKg: { min: 0, max: 300 },
  dofCount: { min: 1, max: 100, integer: true },
  maxSpeedMps: { min: 0, max: 15 },
  operationTimeHours: { min: 0, max: 72 },
  fingerCount: { min: 1, max: 10, integer: true },
  handDof: { min: 1, max: 50, integer: true },
  topsMax: { min: 0, max: 100_000 },
  capacityWh: { min: 0, max: 100_000 },
} as const;

export type SpecRangeKey = keyof typeof SPEC_RANGES;

/** 범위 안의 숫자만 돌려준다 (문자열 숫자 허용). 아니면 null */
export function specNumber(key: SpecRangeKey, value: unknown): number | null {
  const range = SPEC_RANGES[key] as { min: number; max: number; integer?: boolean };
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  if (!Number.isFinite(n) || n < range.min || n > range.max) return null;
  return range.integer ? Math.trunc(n) : n;
}

// ─────────────────────────────────────────────────────────────────────────────
// 영상 URL
// ─────────────────────────────────────────────────────────────────────────────

/** 공개 YouTube watch URL 만 통과: https, youtube.com(www/m 허용), `watch?v=<11자 id>` 이고 id 뒤에는 `&` 파라미터만 허용 */
export function isStrictYoutubeWatchUrl(url: unknown): boolean {
  if (typeof url !== 'string' || url.length > 300) return false;
  return /^https:\/\/(?:www\.|m\.)?youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}(?:&[A-Za-z0-9_=%.&-]{0,200})?$/.test(url);
}
