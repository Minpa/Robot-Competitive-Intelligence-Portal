/**
 * 주간 브리프 v2 서술 가드 — 순수 함수 (DB·AI 접근 없음).
 *
 * AI 가 돌려준 서술을 문장 단위로 검증한다.
 *   1) 텍스트 정책: `<`, http/www, 줄바꿈, 마크다운 기호(`**`, 백틱, `#`)가 든 문장 폐기
 *   2) 금칙어(WEEKLY_BRIEF_BANNED_PHRASES): 그 요소의 입력 텍스트에 같은 말이 있으면 예외
 *   3) 숫자 가드: 허용 집합(서버 숫자 + 입력 텍스트의 숫자 + 공통 집합)에 없는 숫자가 든 문장 폐기
 *   4) 고유명사 가드(영문 토큰이 입력에 없음): 기본 warn(통계만), enforce 이면 문장 폐기
 *   5) 길이: 상한 20% 이내 초과는 문장 경계에서 자르고, 그보다 많이 넘거나 한 문장도 안 들어가면 폐기
 *   6) 최소 길이: 폐기 후 남은 서술이 짧으면 요소 전체를 실패로 돌려준다(호출자가 규칙 문장으로 대체)
 *
 * 숫자는 정규화(쉼표 제거, 후행 0 제거)해서 비교한다. "48만", "1.2K", "480,000" 같은 표기 변형은 numberForms 가 허용 집합에 넣는다.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────────────────────────────────

/** 금칙어 — 추측·전망·과장 표현. 입력 텍스트에 같은 말이 있으면 예외 */
export const WEEKLY_BRIEF_BANNED_PHRASES: readonly string[] = [
  '전망',
  '예상',
  '예측',
  '것으로 보인다',
  '것으로 보입니다',
  '것으로 보여',
  '가능성이 높',
  '가능성이 크',
  '혁신적',
  '획기적',
  '압도적',
  '독보적',
  '최초',
  '폭발적',
  '기대된다',
  '기대됩니다',
  '게임 체인저',
];

export const TEXT_GUARD = {
  /** 개수·서수 표현용 작은 정수 상한 */
  smallIntMax: 10,
  /** 길이 상한 초과 허용 비율 (이내면 문장 경계에서 자름) */
  overflowTolerance: 0.2,
} as const;

export type EntityGuardMode = 'off' | 'warn' | 'enforce';

/** WEEKLY_BRIEF_ENTITY_GUARD — off | warn(기본) | enforce */
export function resolveEntityGuardMode(env: Readonly<Record<string, string | undefined>> = process.env): EntityGuardMode {
  const v = env.WEEKLY_BRIEF_ENTITY_GUARD?.trim().toLowerCase();
  return v === 'off' || v === 'enforce' ? v : 'warn';
}

// ─────────────────────────────────────────────────────────────────────────────
// 문장 분리
// ─────────────────────────────────────────────────────────────────────────────

const TERMINATORS = new Set(['.', '!', '?', '。', '！', '？']);
const CLOSERS = new Set(['"', "'", '”', '’', ')', ']', '」', '』', '）']);
/** 마침표가 문장 끝이 아닌 약어 */
const ABBREVIATIONS = new Set(['inc', 'ltd', 'co', 'corp', 'vs', 'e.g', 'i.e', 'dr', 'mr', 'mrs', 'ms', 'no', 'fig', 'approx', 'st', 'jr', 'sr', 'al', 'cf']);

export function charLength(s: string): number {
  return Array.from(s).length;
}

/**
 * 문장 단위로 나눈다. 종결부호(. ! ? 。) 뒤에 공백이 오거나 문자열 끝일 때만 경계이고,
 * 소수점·버전·도메인(3.5, v1.2, arXiv.org)과 약어(Inc., vs., e.g.), 이니셜(A. Kim), 목록 번호(1. )는 분리하지 않는다.
 */
export function splitSentences(text: string): string[] {
  const chars = Array.from(text);
  const out: string[] = [];
  let buf = '';
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]!;
    buf += c;
    if (!TERMINATORS.has(c)) continue;
    let k = i + 1;
    while (k < chars.length && CLOSERS.has(chars[k]!)) k++;
    const boundary = k >= chars.length || /\s/.test(chars[k]!);
    if (!boundary) continue;
    if (c === '.') {
      const word = /([A-Za-z][A-Za-z.]*|\d+)$/.exec(buf.slice(0, -1))?.[1] ?? '';
      const lower = word.toLowerCase();
      if (ABBREVIATIONS.has(lower)) continue;
      if (/^[A-Z]$/.test(word)) continue; // 이니셜
      if (/^\d+$/.test(word) && /^\s*\d+$/.test(buf.slice(0, -1))) continue; // 문장 첫머리 목록 번호
    }
    buf += chars.slice(i + 1, k).join('');
    i = k - 1;
    const s = buf.trim();
    if (s) out.push(s);
    buf = '';
  }
  const rest = buf.trim();
  if (rest) out.push(rest);
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 숫자
// ─────────────────────────────────────────────────────────────────────────────

const THOUSANDS_RE = /^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/;

/** 숫자 토큰 정규형 — 쉼표 제거, 후행 0 제거, 선행 0 제거. 숫자가 아니면 null */
export function canonNumber(token: string): string | null {
  const t = token.replace(/[.,]+$/, '');
  if (!t) return null;
  const n = Number(THOUSANDS_RE.test(t) ? t.replace(/,/g, '') : t);
  if (!Number.isFinite(n)) return null;
  return String(n);
}

/**
 * 문자열의 숫자 토큰(정규형). 천 단위 쉼표(1,234)는 하나의 수로, 그 외 쉼표(1,2,3)는 나열로 본다.
 * 끝의 마침표·쉼표는 문장부호로 보고 버린다. 날짜(2026-10-22)는 세 수로 나뉜다.
 */
export function extractNumbers(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []) {
    const parts = THOUSANDS_RE.test(raw) ? [raw] : raw.split(',').filter((p) => p.length > 0);
    for (const p of parts) {
      const c = canonNumber(p);
      if (c !== null) out.push(c);
    }
  }
  return out;
}

/**
 * 숫자 하나가 문장에 나올 수 있는 표기들(정규형). 부호는 무시한다.
 * 천 단위 쉼표·소수 1자리·반올림에 더해 조회수 표기(formatViews 의 K/M, 한국어 만/억)를 허용한다.
 */
export function numberForms(n: number): string[] {
  if (!Number.isFinite(n)) return [];
  const abs = Math.abs(n);
  const out = new Set<string>();
  const add = (v: number) => {
    const c = canonNumber(String(v));
    if (c !== null) out.add(c);
    const c1 = canonNumber(v.toFixed(1));
    if (c1 !== null) out.add(c1);
    out.add(String(Math.round(v)));
  };
  add(abs);
  if (abs >= 1000) add(abs / 1e3); // 1.2K
  if (abs >= 1e5) add(abs / 1e6); // 1.2M
  if (abs >= 1e4) add(abs / 1e4); // 48만
  if (abs >= 1e7) add(abs / 1e8); // 1.2억
  return [...out];
}

export interface AllowedParts {
  /** 서버 숫자 — 모든 표기 변형을 허용 */
  numbers?: ReadonlyArray<number | null | undefined>;
  /** 입력 텍스트 — 안의 숫자 토큰을 허용 */
  texts?: ReadonlyArray<string | null | undefined>;
  /** 이미 문자열로 포맷된 숫자("28", "1,234") */
  strings?: ReadonlyArray<string | null | undefined>;
}

/** 허용 숫자 집합(정규형)을 만든다 */
export function buildAllowed(...parts: AllowedParts[]): Set<string> {
  const set = new Set<string>();
  for (const p of parts) {
    for (const n of p.numbers ?? []) if (typeof n === 'number') for (const f of numberForms(n)) set.add(f);
    for (const t of p.texts ?? []) if (t) for (const tok of extractNumbers(t)) set.add(tok);
    for (const s of p.strings ?? []) if (s) for (const tok of extractNumbers(s)) set.add(tok);
  }
  return set;
}

/** 작은 정수(1~smallIntMax)와 요소 수 이하의 정수 */
export function smallIntegers(elementCount: number = 0): number[] {
  const max = Math.max(TEXT_GUARD.smallIntMax, Math.trunc(elementCount));
  return Array.from({ length: max }, (_, i) => i + 1);
}

/** 기간 'YYYY-MM-DD' 의 연·월·일 숫자 */
export function dateNumbers(ymd: string | null | undefined): number[] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd ?? '');
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [];
}

// ─────────────────────────────────────────────────────────────────────────────
// 고유명사(영문 토큰) 경고
// ─────────────────────────────────────────────────────────────────────────────

/** 영문 토큰(길이 3 이상, 소문자) */
export function englishTokens(text: string): string[] {
  return (text.match(/[A-Za-z][A-Za-z0-9]*(?:[-.][A-Za-z0-9]+)*/g) ?? []).map((t) => t.toLowerCase()).filter((t) => t.length >= 3);
}

// ─────────────────────────────────────────────────────────────────────────────
// 문장 검사
// ─────────────────────────────────────────────────────────────────────────────

export type SentenceProblem = 'policy' | 'banned' | 'number' | 'entity';

/** `<`, URL, 줄바꿈, 마크다운 기호 */
export function violatesTextPolicy(sentence: string): boolean {
  return /[<\r\n]/.test(sentence) || /http/i.test(sentence) || /www\./i.test(sentence) || sentence.includes('**') || sentence.includes('`') || sentence.includes('#');
}

/** 문장에 든 금칙어 중 입력 텍스트에 없는 것 (없으면 null) */
export function findBannedPhrase(sentence: string, inputText: string = ''): string | null {
  for (const phrase of WEEKLY_BRIEF_BANNED_PHRASES) {
    if (sentence.includes(phrase) && !inputText.includes(phrase)) return phrase;
  }
  return null;
}

/** 허용 집합에 없는 숫자 토큰 */
export function disallowedNumbers(sentence: string, allowed: ReadonlySet<string>): string[] {
  return extractNumbers(sentence).filter((n) => !allowed.has(n));
}

// ─────────────────────────────────────────────────────────────────────────────
// 요소 가드
// ─────────────────────────────────────────────────────────────────────────────

export interface GuardSpec {
  /** 글자 수 상한 */
  max: number;
  /** 폐기 후 최소 글자 수 — 미만이면 실패 */
  min: number;
  allowed: ReadonlySet<string>;
  /** 이 요소의 입력 텍스트 — 금칙어 예외와 고유명사 가드 기준 */
  inputText?: string;
  entityMode?: EntityGuardMode;
}

export type GuardFailReason = 'invalid_type' | 'empty' | 'all_dropped' | 'too_short' | 'too_long';

export interface GuardStats {
  /** 분리된 문장 수 */
  sentences: number;
  /** 폐기된 문장 수 (사유별) */
  dropped: Record<SentenceProblem, number>;
  /** 길이 때문에 잘려 나간 문장 수 */
  trimmed: number;
  /** 입력에 없는 영문 토큰이 든 문장 수 (warn 모드의 통계) */
  entityWarnings: number;
}

export type GuardResult =
  | { ok: true; text: string; stats: GuardStats }
  | { ok: false; reason: GuardFailReason; stats: GuardStats };

function emptyStats(): GuardStats {
  return { sentences: 0, dropped: { policy: 0, banned: 0, number: 0, entity: 0 }, trimmed: 0, entityWarnings: 0 };
}

export function droppedTotal(s: GuardStats): number {
  return s.dropped.policy + s.dropped.banned + s.dropped.number + s.dropped.entity + s.trimmed;
}

/** AI 서술 한 덩어리(문단)를 문장 단위로 검증·정리한다 */
export function guardNarrative(raw: unknown, spec: GuardSpec): GuardResult {
  const stats = emptyStats();
  if (typeof raw !== 'string') return { ok: false, reason: 'invalid_type', stats };
  const text = raw.trim();
  if (!text) return { ok: false, reason: 'empty', stats };

  const mode = spec.entityMode ?? 'warn';
  const input = spec.inputText ?? '';
  const inputTokens = mode === 'off' ? null : new Set(englishTokens(input));

  const sentences = splitSentences(text);
  stats.sentences = sentences.length;
  const kept: string[] = [];
  for (const s of sentences) {
    if (violatesTextPolicy(s)) {
      stats.dropped.policy++;
      continue;
    }
    if (findBannedPhrase(s, input)) {
      stats.dropped.banned++;
      continue;
    }
    if (disallowedNumbers(s, spec.allowed).length > 0) {
      stats.dropped.number++;
      continue;
    }
    if (inputTokens) {
      const unseen = englishTokens(s).some((t) => !inputTokens.has(t));
      if (unseen) {
        if (mode === 'enforce') {
          stats.dropped.entity++;
          continue;
        }
        stats.entityWarnings++;
      }
    }
    kept.push(s);
  }
  if (kept.length === 0) return { ok: false, reason: 'all_dropped', stats };

  let joined = kept.join(' ');
  let len = charLength(joined);
  if (len > spec.max) {
    if (len > spec.max * (1 + TEXT_GUARD.overflowTolerance)) return { ok: false, reason: 'too_long', stats };
    // 마지막 완결 문장에서 자른다
    while (kept.length > 0 && charLength(kept.join(' ')) > spec.max) {
      kept.pop();
      stats.trimmed++;
    }
    if (kept.length === 0) return { ok: false, reason: 'too_long', stats };
    joined = kept.join(' ');
    len = charLength(joined);
  }
  if (len < spec.min) return { ok: false, reason: 'too_short', stats };
  return { ok: true, text: joined, stats };
}

// ─────────────────────────────────────────────────────────────────────────────
// 제목 번역 가드
// ─────────────────────────────────────────────────────────────────────────────

export function hangulRatio(text: string): number {
  const chars = Array.from(text).filter((c) => /\S/.test(c));
  if (chars.length === 0) return 0;
  return chars.filter((c) => /[가-힣]/.test(c)).length / chars.length;
}

export type TitleFailReason = 'invalid_type' | 'empty' | 'policy' | 'number' | 'too_long' | 'no_hangul' | 'same_as_original';

export const TITLE_KO_MAX = 80;

/**
 * 제목 번역 검증: `<`·http·줄바꿈 금지, 원제에 없는 숫자가 있으면 폐기, 한글이 없거나 원제와 같으면 폐기(원제만 표시).
 * 80자를 넘으면 폐기한다(자르면 뜻이 바뀔 수 있다).
 */
export function guardTitleTranslation(raw: unknown, original: string, max: number = TITLE_KO_MAX): { ok: true; text: string } | { ok: false; reason: TitleFailReason } {
  if (typeof raw !== 'string') return { ok: false, reason: 'invalid_type' };
  const text = raw.replace(/\s+/g, ' ').trim();
  if (!text) return { ok: false, reason: 'empty' };
  const rawTrim = raw.trim();
  if (/[<\r\n]/.test(rawTrim) || /http/i.test(rawTrim)) return { ok: false, reason: 'policy' };
  if (charLength(text) > max) return { ok: false, reason: 'too_long' };
  const allowed = new Set(extractNumbers(original));
  if (extractNumbers(text).some((n) => !allowed.has(n))) return { ok: false, reason: 'number' };
  if (!/[가-힣]/.test(text)) return { ok: false, reason: 'no_hangul' };
  if (text === original.trim()) return { ok: false, reason: 'same_as_original' };
  return { ok: true, text };
}
