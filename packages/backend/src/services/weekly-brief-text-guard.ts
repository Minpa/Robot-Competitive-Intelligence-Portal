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

import { WEEKLY_WORDING } from '../types/weekly-brief-wording.js';

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

/** v3 에서 추가한 분석 도구 말투 금칙어 — 용어집(WEEKLY_WORDING)과 같은 목록. v1·v2 가드는 쓰지 않는다 */
export const WEEKLY_BRIEF_JARGON_PHRASES: readonly string[] = WEEKLY_WORDING.jargonBanned;

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

/** v3 용 금칙어 검사 — v2 목록 + 과잉 단정 3개 + 분석 도구 말투(관측·격차·신호·판정, 입력 텍스트에 있으면 예외) */
export function findBannedPhraseV3(sentence: string, inputText: string = ''): string | null {
  const v2 = findBannedPhrase(sentence, inputText);
  if (v2) return v2;
  for (const phrase of [...WEEKLY_BRIEF_OVERCLAIM_PHRASES, ...WEEKLY_BRIEF_JARGON_PHRASES]) {
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
 * 격식체(~니다), 해요체(~세요, ~어요, ~아요, ~해요, ~예요, ~에요, ~죠, ~네요), 그 밖의 ~요. 의문형(~까요, ~니까)은 허용하지 않는다(요구·질문형 가드 R1).
 * ~됨/~함/~임/~음 같은 명사형 종결과 평어체 ~다. 는 허용 목록에 없으므로 자동으로 폐기된다.
 */
export const POLITE_ENDING_RE = /(?:니다|세요|어요|아요|해요|예요|에요|죠|네요|요)$/;

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

// ── v3 어조 2차: 요구형·질문형(R1), 제안형 말끝(R2), 대상 없는 말끝 문장(R3)

/** R1: 물음표와 질문 어미 */
const QUESTION_FORM_RES: readonly RegExp[] = [/까요\s*$/u, /(?:할까|볼까|하실까)\S*\s*$/u];
/** R1: 요구·의무 표현 */
const REQUEST_PHRASES: readonly string[] = ['요청드립니다', '요청합니다', '부탁드립니다', '바랍니다', '바라겠습니다', '해 주세요', '해 주십시오', '해 주시기', '하세요', '하십시오', '하셔야', '해야 합니다', '요청드리겠습니다', '부탁드리겠습니다'];
/** R1: 승인류 — 동사와 결합한 경우만 (뉴스 속 "FDA 승인 획득" 같은 일반 사용은 걸리지 않는다) */
const APPROVAL_REQUEST_RE = /(?:승인|허가|재가|결재)(?:을|를)?\s*(?:요청|부탁|바라|받아|해\s*주)/u;

/** 요구형·질문형(물음표, ~까요, 요청·부탁·바람, 해 주세요, 해야 합니다, 승인 요청)인가 */
export function isRequestForm(sentence: string): boolean {
  const t = sentence.trim();
  if (/[?？]/u.test(t)) return true;
  if (QUESTION_FORM_RES.some((re) => re.test(stripSentenceTail(t)))) return true;
  if (REQUEST_PHRASES.some((p) => t.includes(p))) return true;
  return APPROVAL_REQUEST_RE.test(t);
}

/** 대상 없는 권유 어미(~볼 만합니다, ~참고할 만, ~지켜볼 만) — plain 범위에서도 폐기한다(제안은 제안 줄과 확인 사항에서 제안형 어미로만 쓴다) */
const SOFT_SUGGESTION_RE = /(?:볼\s*만(?:합니다|하다|한)|참고할\s*만|지켜볼\s*만)/u;

/** 제안형 허용 어미 정규식 — 용어집 proposalEndings 에서 만든다. stripSentenceTail 을 거친 본문에 쓴다 */
export const PROPOSAL_ENDING_RE = new RegExp(`(?:${WEEKLY_WORDING.proposalEndings.map((e) => e.replace(/\s+/g, '\\s*')).join('|')})$`, 'u');

/** 제안형 어미(~볼 필요가 있을 것 같습니다 / 있어 보입니다 / 있겠습니다)로 끝나는가 */
export function endsWithProposal(sentence: string): boolean {
  return PROPOSAL_ENDING_RE.test(stripSentenceTail(sentence));
}

/** 대상 판정에서 제외하는 일반어 */
const GENERIC_TERMS: ReadonlySet<string> = new Set(['자료', '사양', '내용', '관련', '부분', '사항', '여부', '정보', '수치', '결과', '동향']);
const PARTICLE_TAIL = /(?:에서는|에서|으로|으로는|까지|부터|에게|와의|과의|이다|은|는|이|가|을|를|의|에|로|와|과|도|만)$/u;

/**
 * 입력 텍스트에서 뽑은 한글 용어(어절 끝 조사 제거, 3자 이상, 일반어 제외).
 * "촉각 센서 통합"처럼 짧은 어절이 이어진 이름은 인접한 두 어절을 붙인 구("촉각 센서")도 용어로 본다.
 */
export function koreanTerms(inputText: string): string[] {
  const out = new Set<string>();
  const words: string[] = [];
  for (const w of inputText.split(/[\s,()'"·/:;]+/u)) {
    const m = /^([가-힣]+)/u.exec(w);
    if (!m) {
      words.push('');
      continue;
    }
    const stripped = m[1]!.replace(PARTICLE_TAIL, '');
    words.push(stripped.length >= 2 ? stripped : m[1]!);
  }
  words.forEach((term, i) => {
    if (charLength(term) >= 3 && !GENERIC_TERMS.has(term)) out.add(term);
    const next = words[i + 1];
    if (term && next && !(GENERIC_TERMS.has(term) && GENERIC_TERMS.has(next)) && charLength(term + next) >= 3) out.add(`${term} ${next}`);
  });
  return [...out];
}

/**
 * R3: 제안형 말끝 앞의 내용(remainder)에 확인 대상이 있는가.
 * remainder 가 공백 제외 12자 이상이고, 숫자·영문 토큰(2자 이상)·입력 텍스트의 한글 용어 중 하나가 있어야 한다.
 */
export function hasProposalTarget(sentence: string, inputText: string): boolean {
  const body = stripSentenceTail(sentence);
  const remainder = body.replace(/[가-힣]*\s*볼\s*필요가\s*(?:있을\s*것\s*같습니다|있어\s*보입니다|있겠습니다)$/u, '');
  if (charLength(remainder.replace(/\s+/g, '')) < 12) return false;
  if (/\d/.test(remainder) || /[A-Za-z]{2,}/.test(remainder)) return true;
  return koreanTerms(inputText).some((t) => remainder.includes(t));
}

/**
 * 숫자-대상 가드: 숫자가 있으면 그 숫자가 무엇인지 말하는 대상(영문 이름·입력의 한글 용어·"로봇 N기" 류)이 같은 문장에 있어야 한다.
 */
export function numberHasTarget(sentence: string, inputText: string): boolean {
  if (!/\d/.test(sentence)) return true;
  if (/(?:로봇|제조사|공급사|사례|회사|항목)[^.]{0,6}\d|\d[\d,.]*\s*(?:기|곳|건|개|명)\s*(?:의\s*)?(?:로봇|제조사|공급사|사례|회사|항목)/u.test(sentence)) return true;
  const letters = sentence.match(/[A-Za-z]{2,}[A-Za-z0-9-]*/g) ?? [];
  if (letters.some((w) => inputText.toLowerCase().includes(w.toLowerCase()))) return true;
  return koreanTerms(inputText).some((t) => sentence.includes(t));
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

export type ExecGapMovement = 'competitor_closing' | 'competitor_receding' | 'steady' | 'first_seen';

/**
 * 변화 모순 문구 — (position, movement) 별로 movementLabelKo 라벨과 반대로 말하는 표현.
 * competitor_ahead·closing 은 "차이가 더 벌어지는 중", receding 은 "줄어드는 중";
 * we_ahead·closing 은 "경쟁사가 따라오는 중", receding 은 "우리가 더 앞서는 중";
 * parity·closing 은 "경쟁사 쪽으로 기우는 중", receding 은 "우리 쪽으로 기우는 중".
 */
const NARROWING = /줄어들|줄어드|줄었|좁혀|좁아|따라잡|따라오/u;
const WIDENING = /벌어지|벌어졌|벌어진|확대|커지|커졌/u;
export const MOVEMENT_CONTRADICTION_PATTERNS: Readonly<Record<'competitor_ahead' | 'we_ahead' | 'parity', Readonly<Record<'competitor_closing' | 'competitor_receding' | 'steady', readonly RegExp[]>>>> = {
  competitor_ahead: { competitor_closing: [NARROWING], competitor_receding: [WIDENING], steady: [NARROWING, WIDENING] },
  we_ahead: { competitor_closing: [WIDENING, /우리가\s*더\s*앞서/u], competitor_receding: [NARROWING, /경쟁사가\s*(?:더\s*)?앞서/u], steady: [NARROWING, WIDENING] },
  parity: { competitor_closing: [/우리\s*쪽으로\s*기우/u], competitor_receding: [/경쟁사\s*쪽으로\s*기우/u], steady: [/기우/u] },
};

/** 문장이 서버 movement(position 과 함께 해석)와 모순되는가. first_seen 이나 값이 없으면 검사하지 않는다 */
export function contradictsMovement(sentence: string, position: ExecGapPosition | null | undefined, movement: ExecGapMovement | null | undefined): boolean {
  if (!position || !movement || movement === 'first_seen') return false;
  return MOVEMENT_CONTRADICTION_PATTERNS[position][movement].some((re) => re.test(sentence));
}

/** 문장이 position 과 모순되는가 */
export function contradictsPosition(sentence: string, position: ExecGapPosition | null | undefined): boolean {
  if (!position) return false;
  return DIRECTION_CONTRADICTION_PATTERNS[position].some((re) => re.test(sentence));
}

export type ExecSentenceProblem = 'policy' | 'request' | 'ending' | 'proposal_ending' | 'proposal_misplaced' | 'no_target' | 'banned' | 'collection' | 'direction' | 'number' | 'entity' | 'too_long' | 'empty';

/** plain: 사실 서술(제안형 어미 금지) · proposal: 제안 줄과 확인 사항 text(제안형 어미 필수, 대상 필수) */
export type ExecGuardScope = 'plain' | 'proposal';

export interface ExecGuardSpec {
  /** 문장당 글자 수 상한 (기본 200) */
  maxChars?: number;
  allowed: ReadonlySet<string>;
  inputText?: string;
  entityMode?: EntityGuardMode;
  /** 격차 행 서술이면 서버 position */
  position?: ExecGapPosition | null;
  /** 격차 행 서술이면 서버 movement (position 과 함께 해석) */
  movement?: ExecGapMovement | null;
  /** 기본 plain */
  scope?: ExecGuardScope;
  /** 숫자가 든 문장에 대상(제품명·축 이름·"로봇 N기" 류)이 없으면 폐기 — 사업 동향·차이 카드 서술 */
  requireNumberTarget?: boolean;
}

export interface ExecGuardStats {
  sentences: number;
  dropped: Record<ExecSentenceProblem, number>;
  entityWarnings: number;
}

export const EXEC_SENTENCE_MAX = 200;

function emptyExecStats(): ExecGuardStats {
  return { sentences: 0, dropped: { policy: 0, request: 0, ending: 0, proposal_ending: 0, proposal_misplaced: 0, no_target: 0, banned: 0, collection: 0, direction: 0, number: 0, entity: 0, too_long: 0, empty: 0 }, entityWarnings: 0 };
}

export function execDroppedTotal(s: ExecGuardStats): number {
  return Object.values(s.dropped).reduce((a, b) => a + b, 0);
}

/** 문장 하나에 대한 v3 검사 — 첫 번째로 걸린 사유(없으면 null). 길이는 별도 */
export function execSentenceProblem(sentence: string, spec: ExecGuardSpec, inputTokens: Set<string> | null): ExecSentenceProblem | null {
  if (violatesTextPolicy(sentence)) return 'policy';
  if (isRequestForm(sentence)) return 'request';
  if (!endsWithPolite(sentence)) return 'ending';
  const proposal = endsWithProposal(sentence);
  if ((spec.scope ?? 'plain') === 'proposal') {
    if (!proposal) return 'proposal_ending';
    if (!hasProposalTarget(sentence, spec.inputText ?? '')) return 'no_target';
  } else if (proposal || SOFT_SUGGESTION_RE.test(stripSentenceTail(sentence))) return 'proposal_misplaced';
  if (findBannedPhraseV3(sentence, spec.inputText ?? '')) return 'banned';
  if (mentionsCollectionCount(sentence)) return 'collection';
  if (contradictsPosition(sentence, spec.position) || contradictsMovement(sentence, spec.position, spec.movement)) return 'direction';
  if (disallowedNumbers(sentence, spec.allowed).length > 0) return 'number';
  if (spec.requireNumberTarget && !numberHasTarget(sentence, spec.inputText ?? '')) return 'no_target';
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

export type EditWarningCode = 'ending' | 'banned' | 'number' | 'direction' | 'collection' | 'request' | 'no_target';

/**
 * 관리자 편집 문장의 경고(저장은 허용) — 요구·질문형, 합니다체·제안형 말끝 위반, 대상 없는 문장, 금칙어, 서버 숫자 집합에 없는 숫자, 방향 모순, 수집 건수 문구.
 * scope: proposal(제안 줄·확인 사항 text)은 제안형 어미와 대상이 필요하고, plain 은 제안형 어미를 쓰면 안 된다. headline 은 제목용(요구·질문형 R1 과 금칙어·숫자·방향·수집 건수만 본다).
 */
export function editWarnings(
  text: string,
  allowed: ReadonlySet<string>,
  position?: ExecGapPosition | null,
  movement?: ExecGapMovement | null,
  scope: ExecGuardScope | 'headline' = 'plain',
  inputText: string = '',
): EditWarningCode[] {
  const out: EditWarningCode[] = [];
  const sentences = splitSentences(text);
  const list = sentences.length > 0 ? sentences : [text];
  if (list.some((s) => isRequestForm(s))) out.push('request');
  const plain = list.filter((s) => !isRequestForm(s));
  // 제목(headline)은 명사구라 합니다체·제안형 말끝을 점검하지 않는다(요구·질문형 R1 과 기존 금칙어·숫자 경고는 그대로)
  if (scope !== 'headline' && plain.some((s) => !endsWithPolite(s) || (scope === 'proposal' ? !endsWithProposal(s) : endsWithProposal(s)))) out.push('ending');
  if (scope === 'proposal' && plain.some((s) => endsWithProposal(s) && !hasProposalTarget(s, inputText))) out.push('no_target');
  if (findBannedPhraseV3(text)) out.push('banned');
  if (disallowedNumbers(text, allowed).length > 0) out.push('number');
  if (list.some((s) => contradictsPosition(s, position) || contradictsMovement(s, position, movement))) out.push('direction');
  if (mentionsCollectionCount(text)) out.push('collection');
  return out;
}
