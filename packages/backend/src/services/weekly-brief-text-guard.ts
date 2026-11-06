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

/** v3 에서 추가한 과잉 단정 금칙어 (PM-8) — findBannedPhraseV3 가 v2 목록과 함께 검사한다 */
export const WEEKLY_BRIEF_OVERCLAIM_PHRASES: readonly string[] = ['반드시', '확실히', '틀림없이'];

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

/** v3 용 금칙어 검사 — v2 목록 + 과잉 단정 3개 */
export function findBannedPhraseV3(sentence: string, inputText: string = ''): string | null {
  const v2 = findBannedPhrase(sentence, inputText);
  if (v2) return v2;
  for (const phrase of WEEKLY_BRIEF_OVERCLAIM_PHRASES) {
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


// ─────────────────────────────────────────────────────────────────────────────
// v3(임원판) 문장 가드 — 합니다체, 수집 건수 문구, 방향 모순
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 합니다체 허용 어미(allowlist). 마지막 어절이 다음 중 하나로 끝나야 한다.
 * 격식체(~니다, ~니까), 해요체(~세요, ~어요, ~아요, ~해요, ~예요, ~에요, ~죠, ~네요), 의문형(~까요), 그 밖의 ~요.
 * ~됨/~함/~임/~음 같은 명사형 종결과 평어체 ~다. 는 허용 목록에 없으므로 자동으로 폐기된다.
 */
export const POLITE_ENDING_RE = /(?:니다|니까|세요|어요|아요|해요|예요|에요|죠|네요|까요|요)$/;

/** 문장 끝의 문장부호·닫는 따옴표와 마지막 괄호 보조 설명을 걷어낸 본문 */
export function stripSentenceTail(sentence: string): string {
  let t = sentence.trim();
  for (let i = 0; i < 4; i++) {
    const before = t;
    t = t.replace(/[.!?。！？\s]+$/u, '').replace(/["'”’」』]+$/u, '');
    t = t.replace(/\s*\([^()]*\)$/u, '').replace(/\s*（[^（）]*）$/u, '');
    if (t === before) break;
  }
  return t.trim();
}

/** 합니다체(허용 어미)로 끝나는 문장인가 */
export function endsWithPolite(sentence: string): boolean {
  return POLITE_ENDING_RE.test(stripSentenceTail(sentence));
}

/** ~됨/~함/~임/~음 으로 끝나는 보고서체 */
export function endsWithNounForm(sentence: string): boolean {
  return /(?:됨|함|임|음)$/u.test(stripSentenceTail(sentence));
}

/**
 * 수집 건수 문구 — "영상 12건 수집", "수집된 기사 30건", "수집량 증가" 같은 문장.
 * 결론·격차·사업·질문 서술에서 금지하고, 수집 건수는 부록 맨 끝 collectionLine 한 줄에만 둔다.
 */
export const COLLECTION_COUNT_PATTERN =
  /(?:(?:영상|기사|뉴스|논문)[^.?!。]{0,24}\d[\d,]*\s*(?:건|편|개)[^.?!。]{0,20}(?:수집|집계|확보))|(?:(?:수집|집계)[^.?!。]{0,24}(?:영상|기사|뉴스|논문)[^.?!。]{0,24}\d[\d,]*\s*(?:건|편|개))|(?:\d[\d,]*\s*(?:건|편)[^.?!。]{0,10}(?:수집|집계))|수집량|수집 건수/u;

export function mentionsCollectionCount(sentence: string): boolean {
  return COLLECTION_COUNT_PATTERN.test(sentence);
}

export type ExecGapPosition = 'competitor_ahead' | 'parity' | 'we_ahead';

/** 방향 모순 문구 — position 별로 "그 방향이 아니라고 말하는" 표현 */
export const DIRECTION_CONTRADICTION_PATTERNS: Readonly<Record<ExecGapPosition, readonly RegExp[]>> = {
  competitor_ahead: [
    /우리(?:가|는|도|쪽이?)?[^.?!。]{0,8}(?:앞서|앞섭|앞선|앞섰|리드|우위)/u,
    /(?:우리|자사)[^.?!。]{0,10}우위를\s*점/u,
    /경쟁사(?:가|는|도)?[^.?!。]{0,8}(?:뒤처|뒤쳐|열세|밀리|밀립)/u,
  ],
  we_ahead: [
    /경쟁사(?:가|는|도)?[^.?!。]{0,8}(?:앞서|앞섭|앞선|앞섰|리드|우위)/u,
    /경쟁사[^.?!。]{0,10}우위를\s*점/u,
    /(?:우리|자사)(?:가|는|도|쪽이?)?[^.?!。]{0,8}(?:뒤처|뒤쳐|열세|밀리|밀립)/u,
  ],
  parity: [],
};

/** 문장이 position 과 모순되는가 */
export function contradictsPosition(sentence: string, position: ExecGapPosition | null | undefined): boolean {
  if (!position) return false;
  return DIRECTION_CONTRADICTION_PATTERNS[position].some((re) => re.test(sentence));
}

export type ExecSentenceProblem = 'policy' | 'ending' | 'banned' | 'collection' | 'direction' | 'number' | 'entity' | 'too_long' | 'empty';

export interface ExecGuardSpec {
  /** 문장당 글자 수 상한 (기본 200) */
  maxChars?: number;
  allowed: ReadonlySet<string>;
  inputText?: string;
  entityMode?: EntityGuardMode;
  /** 격차 행 서술이면 서버 position */
  position?: ExecGapPosition | null;
}

export interface ExecGuardStats {
  sentences: number;
  dropped: Record<ExecSentenceProblem, number>;
  entityWarnings: number;
}

export const EXEC_SENTENCE_MAX = 200;

function emptyExecStats(): ExecGuardStats {
  return { sentences: 0, dropped: { policy: 0, ending: 0, banned: 0, collection: 0, direction: 0, number: 0, entity: 0, too_long: 0, empty: 0 }, entityWarnings: 0 };
}

export function execDroppedTotal(s: ExecGuardStats): number {
  return Object.values(s.dropped).reduce((a, b) => a + b, 0);
}

/** 문장 하나에 대한 v3 검사 — 첫 번째로 걸린 사유(없으면 null). 길이는 별도 */
export function execSentenceProblem(sentence: string, spec: ExecGuardSpec, inputTokens: Set<string> | null): ExecSentenceProblem | null {
  if (violatesTextPolicy(sentence)) return 'policy';
  if (!endsWithPolite(sentence)) return 'ending';
  if (findBannedPhraseV3(sentence, spec.inputText ?? '')) return 'banned';
  if (mentionsCollectionCount(sentence)) return 'collection';
  if (contradictsPosition(sentence, spec.position)) return 'direction';
  if (disallowedNumbers(sentence, spec.allowed).length > 0) return 'number';
  if (inputTokens && spec.entityMode === 'enforce' && englishTokens(sentence).some((t) => !inputTokens.has(t))) return 'entity';
  return null;
}

/**
 * AI 가 돌려준 서술(문자열 또는 문자열 배열)을 문장 단위로 검증한다. 문제가 있는 문장만 폐기하고 남은 문장을 돌려준다.
 * 최소 문장 수 판단과 폴백은 호출자가 한다.
 */
export function guardExecSentences(raw: unknown, spec: ExecGuardSpec): { sentences: string[]; stats: ExecGuardStats } {
  const stats = emptyExecStats();
  const items: string[] = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : typeof raw === 'string' ? [raw] : [];
  const mode = spec.entityMode ?? 'warn';
  const inputTokens = mode === 'off' ? null : new Set(englishTokens(spec.inputText ?? ''));
  const max = spec.maxChars ?? EXEC_SENTENCE_MAX;
  const out: string[] = [];
  for (const item of items) {
    for (const s of splitSentences(item.trim())) {
      stats.sentences++;
      const problem = execSentenceProblem(s, { ...spec, entityMode: mode }, inputTokens);
      if (problem) {
        stats.dropped[problem]++;
        continue;
      }
      if (charLength(s) > max) {
        stats.dropped.too_long++;
        continue;
      }
      if (inputTokens && mode === 'warn' && englishTokens(s).some((t) => !inputTokens.has(t))) stats.entityWarnings++;
      out.push(s);
    }
  }
  return { sentences: out, stats };
}

export type EditWarningCode = 'ending' | 'banned' | 'number' | 'direction' | 'collection';

/** 관리자 편집 문장의 경고(저장은 허용) — 합니다체 위반, 금칙어, 서버 숫자 집합에 없는 숫자, 방향 모순, 수집 건수 문구 */
export function editWarnings(text: string, allowed: ReadonlySet<string>, position?: ExecGapPosition | null): EditWarningCode[] {
  const out: EditWarningCode[] = [];
  const sentences = splitSentences(text);
  const list = sentences.length > 0 ? sentences : [text];
  if (list.some((s) => !endsWithPolite(s))) out.push('ending');
  if (findBannedPhraseV3(text)) out.push('banned');
  if (disallowedNumbers(text, allowed).length > 0) out.push('number');
  if (list.some((s) => contradictsPosition(s, position))) out.push('direction');
  if (mentionsCollectionCount(text)) out.push('collection');
  return out;
}
