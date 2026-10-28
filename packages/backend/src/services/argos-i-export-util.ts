/**
 * ARGOS_I 내보내기 공용 순수 유틸 — 정제(원문 전재 방지), 시각/날짜, MD 표, 직렬화, sha256.
 *
 * 결정론 원칙: 이 모듈은 현재 시각·난수를 읽지 않는다 (시각은 항상 인자로 받는다).
 * 파일시스템에도 쓰지 않는다.
 */

import { createHash } from 'node:crypto';
import { safeHttpsUrl } from './weekly-brief-compose.js';

export const EXPORT_TIMEZONE = 'Asia/Seoul';
export const KST_OFFSET_MS = 9 * 3_600_000;

/** 자유 텍스트 길이 상한 (4.5) */
export const TEXT_LIMITS = {
  title: 500,
  summary: 400,
  newsSummary: 300,
  keyPoint: 200,
  evidence: 200,
  note: 400,
  generic: 1000,
  cell: 600,
} as const;

/** 원문 전재 방지: 어느 영역의 JSON 에도 이 키를 싣지 않는다 (pass-through 영역의 안전망) */
export const FORBIDDEN_KEYS: ReadonlySet<string> = new Set(['content', 'description', 'originalText', 'abstract']);

// ─────────────────────────────────────────────────────────────────────────────
// 해시 / 직렬화
// ─────────────────────────────────────────────────────────────────────────────

export function sha256Hex(data: string | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

/** 압축형(들여쓰기 없음) + 끝 개행 1개. UTF-8(BOM 없음), LF. */
export function serializeJson(value: unknown): string {
  return `${JSON.stringify(value)}\n`;
}

export function toBuffer(text: string): Buffer {
  return Buffer.from(text, 'utf-8');
}

// ─────────────────────────────────────────────────────────────────────────────
// 시각 / 날짜 (프로세스 TZ 무관)
// ─────────────────────────────────────────────────────────────────────────────

const ISO_LIKE_RE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:[.,](\d+))?)?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$/;
const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * 시각 값 → ISO 8601 UTC(`...Z`, 밀리초) 문자열. 해석할 수 없으면 null.
 * 존재 구간: Date 인스턴스, epoch ms, 'YYYY-MM-DD[T ]HH:MM:SS[.ffffff][Z|±hh[:mm]]'.
 * 오프셋이 없는 값(PostgreSQL `timestamp`)은 UTC 로 저장돼 있으므로 UTC 로 해석한다.
 */
export function toIsoUtc(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) {
    const t = v.getTime();
    return Number.isNaN(t) ? null : new Date(t).toISOString();
  }
  if (typeof v === 'number') {
    return Number.isFinite(v) ? new Date(v).toISOString() : null;
  }
  if (typeof v !== 'string') return null;
  const s = v.trim();
  const m = ISO_LIKE_RE.exec(s);
  if (m) {
    const [, y, mo, d, h, mi, sec = '00', frac = '0', zone] = m;
    const ms = Number((frac + '000').slice(0, 3));
    let offsetMin = 0;
    if (zone && zone !== 'Z') {
      const sign = zone.startsWith('-') ? -1 : 1;
      const digits = zone.slice(1).replace(':', '');
      const oh = Number(digits.slice(0, 2));
      const om = Number(digits.slice(2, 4) || '0');
      offsetMin = sign * (oh * 60 + om);
    }
    const utc = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(sec), ms) - offsetMin * 60_000;
    return Number.isNaN(utc) ? null : new Date(utc).toISOString();
  }
  if (YMD_RE.test(s)) {
    const t = Date.parse(`${s}T00:00:00.000Z`);
    return Number.isNaN(t) ? null : new Date(t).toISOString();
  }
  return null;
}

/** 'YYYY-MM-DD' 날짜 전용 값. Date·ISO 문자열이 오면 앞 10자(UTC 달력 기준)만 쓰지 않고 형식이 맞을 때만 반환한다. */
export function toYmd(v: unknown): string | null {
  if (typeof v === 'string') {
    const m = /^(\d{4}-\d{2}-\d{2})(?:$|[T ])/.exec(v.trim());
    return m ? m[1]! : null;
  }
  return null;
}

/** ISO UTC → KST 달력 날짜 'YYYY-MM-DD' */
export function kstYmdOfIso(iso: string | null | undefined): string | null {
  const t = iso ? Date.parse(iso) : NaN;
  if (Number.isNaN(t)) return null;
  return new Date(t + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** ISO UTC → 'YYYY-MM-DD HH:mm' (KST) */
export function kstDateTimeOfIso(iso: string | null | undefined): string | null {
  const t = iso ? Date.parse(iso) : NaN;
  if (Number.isNaN(t)) return null;
  const s = new Date(t + KST_OFFSET_MS).toISOString();
  return `${s.slice(0, 10)} ${s.slice(11, 16)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 텍스트 정제
// ─────────────────────────────────────────────────────────────────────────────

export function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (m, n) => {
      const code = Number(n);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
    })
    .replace(/&#x([0-9a-f]+);/gi, (m, n) => {
      const code = parseInt(n, 16);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
    })
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

export function stripCiteTags(s: string): string {
  return s
    .replace(/<\/?cite\b[^>]*>?/g, '')
    .replace(/<\/?c(?:i(?:t(?:e)?)?)?$/, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/** 문자(코드포인트) 단위로 자르고, 넘으면 말줄임 `…` 을 붙여 총 max 자로 맞춘다. */
export function truncateChars(s: string, max: number): string {
  const chars = Array.from(s);
  return chars.length <= max ? s : chars.slice(0, Math.max(0, max - 1)).join('') + '…';
}

// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b-\u200f\u2028\u2029\ufeff]/g;

/**
 * 자유 텍스트 정제: HTML 엔티티 복원 → 인용 태그 제거 → HTML 태그 제거 → 남은 꺾쇠 중화(`＜` `＞`)
 * → 위험 패턴 무력화(`javascript:`, `on*=`) → 제어문자 삭제 → 공백 정규화 → 길이 상한.
 * 비어 있으면 null.
 */
export function cleanText(v: unknown, max: number = TEXT_LIMITS.generic): string | null {
  if (typeof v !== 'string') return null;
  let s = decodeHtmlEntities(v);
  s = stripCiteTags(s);
  s = s.replace(CONTROL_RE, '');
  // 완전한 태그와 끝에서 닫히지 않은 태그를 제거한다 (두 번 반복: 복원된 엔티티가 만든 태그까지)
  for (let i = 0; i < 2; i++) s = s.replace(/<\/?[a-zA-Z!][^>]*>?/g, ' ');
  s = s.replace(/</g, '＜').replace(/>/g, '＞');
  s = s.replace(/(javascript|vbscript)\s*:/gi, '$1 :').replace(/\bon(error|load|click|mouseover|focus)\s*=/gi, 'on$1 =');
  s = s.replace(/\s+/g, ' ').trim();
  if (!s) return null;
  return truncateChars(s, max);
}

/** 문자열 목록 정제 — 빈 값 제거, 항목 길이·개수 상한 */
export function cleanList(v: unknown, itemMax: number, maxItems: number): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const it of v) {
    const t = cleanText(it, itemMax);
    if (t) out.push(t);
    if (out.length >= maxItems) break;
  }
  return out;
}

export function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

export function intOrNull(v: unknown): number | null {
  const n = numOrNull(v);
  return n === null ? null : Math.trunc(n);
}

export function boolOrNull(v: unknown): boolean | null {
  return typeof v === 'boolean' ? v : null;
}

/** https + 자격증명 없음만 통과 (weekly-brief-compose.safeHttpsUrl 재사용) */
export function safeUrl(v: unknown): string | null {
  return typeof v === 'string' ? safeHttpsUrl(v.trim()) : null;
}

const URL_SCHEME_RE = /^\s*(https?:|javascript:|data:|vbscript:|file:|ftp:)/i;

/**
 * pass-through JSON(캐시·주간 브리프 payload 등) 정제 — 키는 알파벳순으로 고정하고,
 * 원문 키(FORBIDDEN_KEYS)를 제거하며, 문자열은 cleanText, URL 은 https 만 남기고, NaN/Infinity 는 null.
 */
export function sanitizeDeep(value: unknown, maxString: number = TEXT_LIMITS.generic, depth = 0): unknown {
  if (depth > 12) return null;
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (URL_SCHEME_RE.test(value)) return safeUrl(value);
    return cleanText(value, maxString);
  }
  if (Array.isArray(value)) {
    return value.map((x) => sanitizeDeep(x, maxString, depth + 1)).filter((x) => x !== null);
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      if (FORBIDDEN_KEYS.has(key)) continue;
      const cleaned = sanitizeDeep((value as Record<string, unknown>)[key], maxString, depth + 1);
      out[key] = cleaned;
    }
    return out;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 정렬
// ─────────────────────────────────────────────────────────────────────────────

/** 로케일 비의존 문자열 비교 (코드 유닛 순서) */
export function cmpStr(a: string | null | undefined, b: string | null | undefined): number {
  const x = a ?? '';
  const y = b ?? '';
  return x < y ? -1 : x > y ? 1 : 0;
}

/** 대소문자 무시 + 동률이면 원문 비교 */
export function cmpText(a: string | null | undefined, b: string | null | undefined): number {
  return cmpStr((a ?? '').toLowerCase(), (b ?? '').toLowerCase()) || cmpStr(a, b);
}

export function cmpNum(a: number | null | undefined, b: number | null | undefined): number {
  const x = a ?? Number.NEGATIVE_INFINITY;
  const y = b ?? Number.NEGATIVE_INFINITY;
  return x < y ? -1 : x > y ? 1 : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Markdown
// ─────────────────────────────────────────────────────────────────────────────

export type MdCell = string | number | boolean | null | undefined | { text: string; url: string | null };

export interface MdSection {
  heading: string;
  columns: string[];
  rows: MdCell[][];
  note?: string;
}

/** 셀 텍스트 이스케이프: 파이프·개행·탭 치환, 꺾쇠는 HTML 엔티티, 제어문자 삭제, 최대 600자 */
export function mdEscape(v: string, max: number = TEXT_LIMITS.cell): string {
  const s = v
    .replace(CONTROL_RE, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\|/g, '¦')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return truncateChars(s, max);
}

export function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return '-';
  if (Number.isInteger(n)) return String(n);
  return String(Number(n.toFixed(2)));
}

/** https 링크만 `[텍스트](url)`, 그 외는 텍스트만 */
export function renderCell(c: MdCell): string {
  if (c === null || c === undefined) return '-';
  if (typeof c === 'boolean') return c ? '예' : '아니오';
  if (typeof c === 'number') return Number.isFinite(c) ? fmtNum(c) : '-';
  if (typeof c === 'string') {
    const t = mdEscape(c);
    return t === '' ? '-' : t;
  }
  const label = mdEscape(c.text.replace(/[[\]]/g, ' ')) || '-';
  const url = safeUrl(c.url);
  if (!url) return label;
  const safe = url.replace(/\s/g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\|/g, '%7C').replace(/</g, '%3C').replace(/>/g, '%3E');
  return `[${label}](${safe})`;
}

export function renderMdTable(columns: string[], rows: MdCell[][]): string {
  const head = `| ${columns.map((c) => mdEscape(c)).join(' | ')} |`;
  const sep = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((r) => `| ${columns.map((_, i) => renderCell(r[i])).join(' | ')} |`);
  return [head, sep, ...body].join('\n');
}

/** 필드 접근 도우미 — to_jsonb 로 받은 행(snake_case) 전용 */
export type Row = Record<string, any>;

export function str(row: Row, key: string, max: number = TEXT_LIMITS.generic): string | null {
  return cleanText(row[key], max);
}

export function iso(row: Row, key: string): string | null {
  return toIsoUtc(row[key]);
}

export function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort(cmpStr);
}

// ─────────────────────────────────────────────────────────────────────────────
// 집계 도우미
// ─────────────────────────────────────────────────────────────────────────────

export function groupBy<T>(items: readonly T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    const arr = m.get(k);
    if (arr) arr.push(it);
    else m.set(k, [it]);
  }
  return m;
}

/** 값별 건수, 많은 순 → 키 순. 빈 값은 '미상' */
export function tally(values: readonly (string | null | undefined)[]): { key: string; n: number }[] {
  const m = new Map<string, number>();
  for (const v of values) {
    const k = v && v.length > 0 ? v : '미상';
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].map(([key, n]) => ({ key, n })).sort((a, b) => b.n - a.n || cmpStr(a.key, b.key));
}

export function tallyText(values: readonly (string | null | undefined)[], top = 5): string {
  const t = tally(values).slice(0, top);
  return t.length === 0 ? '없음' : t.map((x) => `${x.key} ${x.n}건`).join(', ');
}

/** min~max 문자열 (둘 중 하나만 있으면 그 값, 둘 다 없으면 null) */
export function rangeText(min: number | null, max: number | null): string | null {
  if (min === null && max === null) return null;
  if (min !== null && max !== null && min !== max) return `${min}~${max}`;
  return String(min ?? max);
}
