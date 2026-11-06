/**
 * LLM 입력 정제 — 순수 함수 (DB·네트워크·SDK 의존 없음).
 *
 * 외부에서 수집했거나 사용자가 넣은 텍스트를 LLM 에 보내기 전에 쓰는 도구 모음.
 *  - sanitizeExternalText: 제어문자/zero-width/방향제어 제거, HTML 제거, 마크다운 평탄화, 공백 정규화, 반복 압축, 길이 상한
 *  - detectInjection: 다국어 지시문 패턴 탐지 (탐지용 정규화 사본에서만 NFKC)
 *  - buildDataBlock / buildUserMessage: 외부 텍스트를 JSON 데이터 블록에만 넣는다
 *
 * 처리 방침(PM 결정 Q1): 탐지돼도 텍스트를 삭제하지 않는다. 플래그를 돌려주고, 원문 안의 해당 구간을 `[[…]]` 로 감싸 표시만 한다.
 * 정제는 LLM 에 보내는 사본에만 적용하고 DB 원본은 바꾸지 않는다.
 *
 * ReDoS 방지: 모든 정규식은 중첩 무제한 반복이 없고, 가변 구간은 상한(`{0,N}`)을 둔다. 입력은 길이 상한 안에서만 처리한다.
 *
 * 이 파일은 packages/crawler/src/services/ 에 동일 내용으로 복제되어 있다 (llm-guard-static 테스트가 해시 동일성을 검사).
 */

import { randomBytes } from 'node:crypto';
import { USER_REMINDER, makeDataBlockDelimiters, type DataBlockDelimiters } from './llm-guard-prompts.js';

// ─────────────────────────────────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────────────────────────────────

/** 필드별 입력 길이 상한 (문자=코드포인트). 지점마다 새로 정하지 않고 여기서 가져다 쓴다 */
export const LLM_INPUT_LIMITS = {
  title: 300,
  channel: 100,
  description: 500,
  abstract: 500,
  summary: 800,
  body: 2000,
  tag: 40,
  name: 120,
  label: 80,
  query: 500,
  text: 16000,
} as const;

/** 정규식 처리 전 안전 상한 — 이보다 긴 입력은 먼저 잘라낸다 */
const HARD_INPUT_CAP = 200_000;
/** 연속 반복을 이 횟수까지만 남긴다 */
const MAX_REPEAT_RUN = 3;

// ─────────────────────────────────────────────────────────────────────────────
// 기본 유틸 (중복 단일화 대상 — 기존 argos-i-export-util / event-video-brief / tech-trend-report / event-company-report 의 복제본을 대체)
// ─────────────────────────────────────────────────────────────────────────────

export function charLength(s: string): number {
  return Array.from(s).length;
}

/** 문자(코드포인트) 단위로 자르고, 넘으면 말줄임 `…` 을 붙여 총 max 자로 맞춘다. */
export function truncateChars(s: string, max: number): string {
  const chars = Array.from(s);
  return chars.length <= max ? s : chars.slice(0, Math.max(0, max - 1)).join('') + '…';
}

/** 말줄임 없이 코드포인트 단위로 자른다 */
export function cutChars(s: string, max: number): string {
  if (s.length <= max) return s; // UTF-16 길이가 max 이하면 코드포인트도 max 이하
  const chars = Array.from(s);
  return chars.length <= max ? s : chars.slice(0, Math.max(0, max)).join('');
}

/** HTML 엔티티(&#39; &amp; &#x27; 등)를 일반 문자로 복원 */
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

/** 웹 검색 응답 텍스트에 섞여 나오는 인용 마크업(<cite index="...">...</cite>)과 길이 캡으로 잘린 태그 조각 제거 */
export function stripCiteTags(s: string): string {
  return s
    .replace(/<\/?cite\b[^>]*>?/g, '') // 완전한 태그 + 끝에서 '>' 없이 잘린 태그
    .replace(/<\/?c(?:i(?:t(?:e)?)?)?$/, '') // 캡 절단으로 남은 짧은 조각 (예: "</ci")
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// 문자 제거
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 제어문자(탭·줄바꿈 제외), DEL/C1, zero-width(200B-200F, 2060-2064, FEFF), soft hyphen(00AD),
 * 양방향 제어(202A-202E, 2066-2069), 줄/문단 구분(2028, 2029)
 */
// eslint-disable-next-line no-control-regex
export const INVISIBLE_CHARS_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u00ad\u200b-\u200f\u2028\u2029\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/g;
const LONE_SURROGATE_RE = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g;

export function stripInvisible(s: string): string {
  return s.replace(INVISIBLE_CHARS_RE, '').replace(LONE_SURROGATE_RE, '');
}

/** 대소문자 무시로 `<name ...> ... </name>` 구간을 선형 시간에 제거한다. 닫는 태그가 없으면 여는 태그만 제거 */
function stripElementBlocks(s: string, name: string): string {
  const lower = s.toLowerCase();
  const open = `<${name}`;
  const close = `</${name}`;
  let out = '';
  let pos = 0;
  let closeMissing = false;
  for (;;) {
    const start = lower.indexOf(open, pos);
    if (start === -1) break;
    // `<scripts` 같은 다른 태그명은 건너뛴다
    const after = lower[start + open.length];
    if (after !== undefined && /[a-z0-9]/.test(after)) {
      out += s.slice(pos, start + open.length);
      pos = start + open.length;
      continue;
    }
    out += s.slice(pos, start);
    if (closeMissing) {
      pos = start + open.length;
      continue;
    }
    const endTag = lower.indexOf(close, start + open.length);
    if (endTag === -1) {
      closeMissing = true;
      pos = start + open.length;
      continue;
    }
    const gt = lower.indexOf('>', endTag);
    pos = gt === -1 ? s.length : gt + 1;
    out += ' ';
  }
  return out + s.slice(pos);
}

function stripHtmlComments(s: string): string {
  let out = '';
  let pos = 0;
  // 닫는 `-->` 가 없다고 한 번 확인되면 이후에도 없으므로 다시 찾지 않는다 (선형 시간)
  let closeMissing = false;
  for (;;) {
    const start = s.indexOf('<!--', pos);
    if (start === -1) break;
    out += s.slice(pos, start);
    const end = closeMissing ? -1 : s.indexOf('-->', start + 4);
    if (end === -1) {
      closeMissing = true;
      // 닫히지 않은 주석: 시작 표식만 제거
      pos = start + 4;
      continue;
    }
    pos = end + 3;
    out += ' ';
  }
  return out + s.slice(pos);
}

/** HTML 제거: 주석, script/style 블록(내용 포함), 나머지 태그 */
export function stripHtml(s: string): string {
  let t = stripHtmlComments(s);
  t = stripElementBlocks(t, 'script');
  t = stripElementBlocks(t, 'style');
  // 완전한 태그와 끝에서 닫히지 않은 태그. 두 번: 복원된 엔티티가 만든 태그까지
  for (let i = 0; i < 2; i++) t = t.replace(/<\/?[a-zA-Z!][^>]*>?/g, ' ');
  return t;
}

/** 마크다운 구문을 텍스트로 평탄화: 코드펜스 표식, 헤딩, 이미지/링크 구문(링크 대상 제거) */
export function flattenMarkdown(s: string): string {
  return s
    .replace(/```[A-Za-z0-9_-]{0,20}/g, ' ')
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '')
    .replace(/!?\[([^\]\n]{0,300})\]\(([^)\s]{0,2000})\)/g, '$1');
}

// ─────────────────────────────────────────────────────────────────────────────
// 반복 압축
// ─────────────────────────────────────────────────────────────────────────────

function collapseRuns(parts: string[], max: number): { parts: string[]; changed: boolean } {
  const out: string[] = [];
  let run = 0;
  let changed = false;
  for (const p of parts) {
    if (out.length > 0 && out[out.length - 1] === p && p.trim() !== '') {
      run++;
      if (run >= max) {
        changed = true;
        continue;
      }
    } else {
      run = 0;
    }
    out.push(p);
  }
  return { parts: out, changed };
}

/** 같은 글자/토큰/문장이 반복되는 구간을 줄인다 (토큰 소모 공격 방지). 반복은 MAX_REPEAT_RUN 번까지만 남긴다 */
export function compressRepeats(s: string): { text: string; changed: boolean } {
  let changed = false;
  // 같은 글자 연속
  let t = s.replace(/(.)\1{9,}/gsu, (_m, c: string) => {
    changed = true;
    return c.repeat(MAX_REPEAT_RUN);
  });
  // 같은 문장 연속
  const sentences = t.split(/(?<=[.!?。！？])\s+/);
  if (sentences.length > MAX_REPEAT_RUN) {
    const r = collapseRuns(sentences, MAX_REPEAT_RUN);
    if (r.changed) {
      changed = true;
      t = r.parts.join(' ');
    }
  }
  // 같은 토큰 연속
  const tokens = t.split(/([ \t]+)/);
  if (tokens.length > MAX_REPEAT_RUN * 2) {
    const words = tokens.filter((_, i) => i % 2 === 0);
    const r = collapseRuns(words, MAX_REPEAT_RUN);
    if (r.changed) {
      changed = true;
      t = r.parts.join(' ');
    }
  }
  return { text: t, changed };
}

// ─────────────────────────────────────────────────────────────────────────────
// 인젝션 탐지
// ─────────────────────────────────────────────────────────────────────────────

export type InjectionCategory = 'override' | 'role' | 'exfil' | 'format' | 'url' | 'delimiter';

export interface InjectionPattern {
  id: string;
  category: InjectionCategory;
  re: RegExp;
}

/**
 * 지시문 패턴 상수 — 지점별로 바꾸지 않는다. 대소문자 무시, 탐지용 정규화(NFKC, 보이지 않는 문자 제거, 소문자) 사본에 적용한다.
 * 정상 문장("instruction following", "ignore the previous frame", "system prompt for VLA")은 걸리지 않도록 문맥을 요구한다.
 */
export const INJECTION_PATTERNS: readonly InjectionPattern[] = [
  // 영어 — 이전 지시 무시
  { id: 'en_ignore_previous', category: 'override', re: /\b(?:ignore|disregard|forget|override)\s{1,5}(?:all\s{1,5}|any\s{1,5}|the\s{1,5}|your\s{1,5}|my\s{1,5}){0,2}(?:previous|prior|above|earlier|preceding)\s{1,5}(?:instructions?|prompts?|rules?|directions?|context|messages?)/gi },
  { id: 'en_disregard_above', category: 'override', re: /\bdisregard\s{1,5}(?:everything\s{1,5})?(?:the\s{1,5})?above\b/gi },
  { id: 'en_new_instructions', category: 'override', re: /\bnew\s{1,3}instructions?\s{0,3}:/gi },
  { id: 'en_you_are_now', category: 'role', re: /\byou\s{1,3}are\s{1,3}now\s{1,3}(?:an?\s{1,3}|the\s{1,3})?(?:unrestricted|unfiltered|jailbroken|different|new|free|evil|dan\b|in\s{1,3}\w{1,20}\s{1,3}mode)/gi },
  { id: 'en_act_as_unrestricted', category: 'role', re: /\b(?:act|behave|respond)\s{1,3}as\s{1,3}(?:an?\s{1,3})?(?:unrestricted|unfiltered|jailbroken|system\s{1,3}administrator)/gi },
  { id: 'en_reveal_prompt', category: 'exfil', re: /\b(?:reveal|show|print|repeat|output|leak|tell\s{1,3}me)\s{1,5}(?:\w{1,15}\s{1,5}){0,3}(?:system\s{1,3}prompt|your\s{1,3}(?:prompt|instructions))/gi },
  { id: 'en_system_prompt_colon', category: 'exfil', re: /\bsystem\s{1,3}prompt\s{0,3}:/gi },
  { id: 'en_do_not_summarize', category: 'format', re: /\bdo\s{1,3}not\s{1,3}(?:summari[sz]e|translate|classify|tag)\b/gi },
  { id: 'en_respond_only_with', category: 'format', re: /\b(?:respond|reply|answer|output)\s{1,3}(?:only\s{1,3})?with\s{1,3}(?:only\s{1,3})?(?:the\s{1,3}(?:word|text|phrase|string)\s{1,3})?["'{\[]/gi },
  { id: 'en_respond_only', category: 'format', re: /\b(?:respond|reply|answer|output)\s{1,3}only\s{1,3}with\b/gi },
  { id: 'en_output_the_word', category: 'format', re: /\boutput\s{1,3}the\s{1,3}word\s{1,3}\S{1,30}/gi },
  { id: 'en_include_link', category: 'url', re: /\b(?:include|add|insert|append|put)\s{1,5}(?:this|the\s{1,3}following|that)\s{1,5}(?:link|url|email|phone)\b/gi },
  { id: 'en_include_in_every', category: 'url', re: /\b(?:link|url)\s{1,5}in\s{1,5}every\s{1,5}(?:summary|response|answer|output)/gi },

  // 한국어
  { id: 'ko_ignore_previous', category: 'override', re: /(?:이전|위|앞|기존)\s{0,3}(?:의\s{0,3})?(?:모든\s{0,3})?(?:지시|명령|지침|프롬프트)(?:사항)?(?:를|을|은|는)?\s{0,3}(?:모두\s{0,3}|전부\s{0,3})?무시/g },
  { id: 'ko_system_prompt', category: 'exfil', re: /시스템\s{0,2}프롬프트(?:를|을)?\s{0,3}(?:알려|보여|출력|공개|말해|반복)/g },
  { id: 'ko_from_now', category: 'role', re: /지금부터\s{0,3}(?:너는|넌|당신은|너의\s{0,2}역할)/g },
  { id: 'ko_output_only', category: 'format', re: /(?:다음\s{0,3}내용만|아래\s{0,3}내용만|오직\s{0,3}.{1,20}만)\s{0,3}(?:출력|응답|답변)/g },
  { id: 'ko_output_only_quote', category: 'format', re: /['"“‘][^'"”’\n]{1,30}['"”’]\s{0,3}(?:만|이라고만)\s{0,3}(?:출력|응답|답변|말)/g },
  { id: 'ko_include_link', category: 'url', re: /(?:링크|url|주소|https?:\/\/\S{1,200})\s{0,3}(?:를|을)?\s{0,3}(?:반드시\s{0,3})?(?:포함|삽입|추가)\s{0,3}(?:하라|해라|하세요|해\s{0,2}줘|할\s{0,2}것)/gi },

  // 중국어
  { id: 'zh_ignore_previous', category: 'override', re: /忽略\s{0,3}(?:之前|以上|上面|先前)\s{0,3}的?\s{0,3}(?:所有\s{0,3})?(?:指令|指示|提示|规则)/g },
  { id: 'zh_system_prompt', category: 'exfil', re: /系统\s{0,2}提示\s{0,3}[:：]/g },
  { id: 'zh_you_are', category: 'role', re: /你是\s{0,3}一个\s{0,3}(?:没有|无)\s{0,3}.{0,6}(?:限制|约束)|你现在是|从现在(?:开始|起)\s{0,3}你/g },

  // 일본어
  { id: 'ja_ignore_previous', category: 'override', re: /(?:以前|上記|先ほど)の\s{0,3}(?:指示|命令|プロンプト)を\s{0,3}(?:すべて\s{0,3})?無視/g },
  { id: 'ja_system_prompt', category: 'exfil', re: /システム\s{0,2}プロンプト(?:を)?\s{0,3}(?:表示|教え|出力|公開)/g },
  { id: 'ja_you_are_now', category: 'role', re: /あなたは\s{0,3}今から/g },

  // 역할 위조 / 구분자 위조
  { id: 'role_prefix', category: 'role', re: /(?:^|\n)[ \t]{0,3}(?:system|assistant|user|human)[ \t]{0,2}:/gi },
  { id: 'role_inst_tag', category: 'role', re: /\[\/?INST\]|<<\/?SYS>>/gi },
  { id: 'role_im_tag', category: 'role', re: /<\|(?:im_start|im_end|system|assistant|user|endoftext)\|>/gi },
  { id: 'role_eos_tag', category: 'role', re: /<\/s>/gi },
  { id: 'role_json_system', category: 'role', re: /["']role["']\s{0,3}:\s{0,3}["'](?:system|assistant)["']/gi },
  { id: 'delim_data_close', category: 'delimiter', re: /<\/?(?:data|untrusted_data|data_block)\b[^>]{0,40}>/gi },
  { id: 'delim_block_marker', category: 'delimiter', re: /<<<\s{0,2}DATA_BLOCK_(?:OPEN|CLOSE)/gi },
];

export interface InjectionHit {
  id: string;
  category: InjectionCategory;
}

/** 탐지용 정규화 사본: NFKC(전각→반각), 보이지 않는 문자 제거, 소문자. 저장/전달 텍스트에는 쓰지 않는다 */
export function detectionForm(text: string): string {
  let t = text;
  try {
    t = t.normalize('NFKC');
  } catch {
    // 정규화 실패 시 원문 사용
  }
  return stripInvisible(t).toLowerCase();
}

function freshRe(re: RegExp): RegExp {
  return new RegExp(re.source, re.flags);
}

/** 지시문 패턴 탐지. 텍스트는 바꾸지 않는다 */
export function detectInjection(text: string): { hits: InjectionHit[] } {
  const hits: InjectionHit[] = [];
  if (typeof text !== 'string' || text.length === 0) return { hits };
  const form = detectionForm(text.length > HARD_INPUT_CAP ? text.slice(0, HARD_INPUT_CAP) : text);
  for (const p of INJECTION_PATTERNS) {
    if (freshRe(p.re).test(form)) hits.push({ id: p.id, category: p.category });
  }
  return { hits };
}

/** 탐지된 구간을 `[[…]]` 로 감싼다 (삭제 없음). 정규화 사본에서만 걸리는 변형은 감싸지 못하고 플래그만 남는다 */
export function markInjection(text: string): string {
  const ranges: Array<[number, number]> = [];
  for (const p of INJECTION_PATTERNS) {
    const re = freshRe(p.re);
    let m: RegExpExecArray | null;
    let guard = 0;
    while ((m = re.exec(text)) !== null && guard++ < 50) {
      if (m[0].length === 0) {
        re.lastIndex++;
        continue;
      }
      ranges.push([m.index, m.index + m[0].length]);
    }
  }
  if (ranges.length === 0) return text;
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  let out = '';
  let pos = 0;
  for (const [a, b] of merged) {
    out += text.slice(pos, a) + '[[' + text.slice(a, b) + ']]';
    pos = b;
  }
  return out + text.slice(pos);
}

// ─────────────────────────────────────────────────────────────────────────────
// 정제 본체
// ─────────────────────────────────────────────────────────────────────────────

export interface SanitizeOptions {
  /** 문자(코드포인트) 단위 상한. LLM_INPUT_LIMITS 값을 쓴다 */
  maxChars: number;
  /** 줄바꿈 유지 (기본 false: 공백으로 합침) */
  keepNewlines?: boolean;
  /** 탐지 구간을 [[…]] 로 표시 (기본 true) */
  mark?: boolean;
}

export interface SanitizeResult {
  text: string;
  /** 'invisible' | 'html' | 'markdown' | 'repeat' | 'truncated' | 'injection:<category>' */
  flags: string[];
  truncated: boolean;
  hits: InjectionHit[];
}

export function sanitizeExternalText(raw: unknown, opts: SanitizeOptions): SanitizeResult {
  const flags: string[] = [];
  if (typeof raw !== 'string' || raw.length === 0) return { text: '', flags, truncated: false, hits: [] };
  const maxChars = Math.max(1, Math.trunc(opts.maxChars));

  // 정규식 처리 전 상한 — 정제로 줄어들 여유를 두되 무한정 처리하지 않는다
  let s = raw.slice(0, Math.min(HARD_INPUT_CAP, Math.max(maxChars * 4, 2000)));

  // 엔티티 이중 인코딩까지 복원 (&amp;lt; → &lt; → <)
  const decoded1 = decodeHtmlEntities(s);
  s = decodeHtmlEntities(decoded1);

  const beforeInvisible = s;
  s = stripInvisible(s);
  if (s !== beforeInvisible) flags.push('invisible');

  // 탐지는 HTML 제거 전 텍스트에서 한 번 한다 (주석·숨김 div 안의 지시문도 잡기 위해)
  const preHits = detectInjection(s).hits;

  const beforeHtml = s;
  s = stripHtml(s);
  if (s !== beforeHtml) flags.push('html');
  // 남은 꺾쇠는 중화한다 (모델 입력에서 태그처럼 보이지 않게)
  s = s.replace(/</g, '＜').replace(/>/g, '＞');

  const beforeMd = s;
  s = flattenMarkdown(s);
  if (s !== beforeMd) flags.push('markdown');

  if (opts.keepNewlines) {
    s = s.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  } else {
    s = s.replace(/\s+/g, ' ').trim();
  }

  const rep = compressRepeats(s);
  if (rep.changed) {
    flags.push('repeat');
    s = rep.text;
  }

  let truncated = false;
  if (s.length > maxChars) {
    const cut = cutChars(s, maxChars);
    if (cut.length < s.length) truncated = true;
    s = cut;
  }
  // 입력이 상한 처리 전에 잘렸다면 그것도 잘림으로 본다
  if (!truncated && raw.length > s.length * 4 && raw.length > HARD_INPUT_CAP) truncated = true;
  if (truncated) flags.push('truncated');

  // 최종 텍스트 기준으로 다시 탐지: 최종 텍스트 또는 HTML 제거 전 텍스트 중 하나라도 걸리면 플래그
  const postHits = detectInjection(s).hits;
  const seen = new Set<string>();
  const hits: InjectionHit[] = [];
  for (const h of [...preHits, ...postHits]) {
    if (seen.has(h.id)) continue;
    seen.add(h.id);
    hits.push(h);
  }
  for (const c of new Set(hits.map((h) => h.category))) flags.push(`injection:${c}`);

  if (hits.length > 0 && opts.mark !== false) {
    // 표시는 상한 안에서만 (표식이 길이 상한을 크게 넘기지 않도록 여유 4자/구간은 허용)
    s = markInjection(s);
  }

  return { text: s, flags, truncated, hits };
}

// ─────────────────────────────────────────────────────────────────────────────
// 데이터 블록
// ─────────────────────────────────────────────────────────────────────────────

/** JSON 직렬화 후 태그/구분자 위조에 쓰일 수 있는 문자를 유니코드 이스케이프로 바꾼다 (JSON 으로는 동일하게 파싱된다) */
export function safeJsonStringify(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function newNonce(): string {
  return randomBytes(6).toString('hex');
}

/**
 * 외부 텍스트를 `{ "task": name, "data": payload }` JSON 한 덩어리로 직렬화해 무작위 구분자 블록 하나로 감싼다.
 * 구분자 문자열이 데이터에 있으면 nonce 를 다시 만든다. 직렬화는 꺾쇠를 이스케이프하므로 데이터가 구분자를 흉내낼 수 없다.
 */
export function buildDataBlock(name: string, payload: unknown, nonceOverride?: string): string {
  const json = safeJsonStringify({ task: name, data: payload });
  let delims: DataBlockDelimiters = makeDataBlockDelimiters(nonceOverride ?? newNonce());
  for (let i = 0; i < 5 && (json.includes(delims.open) || json.includes(delims.close)); i++) {
    delims = makeDataBlockDelimiters(newNonce());
  }
  return `${delims.open}\n${json}\n${delims.close}`;
}

/** 사용자 메시지: 데이터 블록 + 끝의 고정 리마인더 한 줄. 지시문은 넣지 않는다 */
export function buildUserMessage(name: string, payload: unknown): string {
  return `${buildDataBlock(name, payload)}\n\n${USER_REMINDER}`;
}

/**
 * 항목 배열의 직렬화 길이가 budget 이하가 되도록 뒤쪽 항목을 줄인다 (주간 브리프 buildPrompt 방식).
 * 반환: 남긴 항목과 줄어든 개수
 */
export function fitItemsToBudget<T>(items: readonly T[], budget: number): { items: T[]; dropped: number } {
  const kept = [...items];
  while (kept.length > 0 && JSON.stringify(kept).length > budget) kept.pop();
  return { items: kept, dropped: items.length - kept.length };
}

/**
 * 중첩 구조 안의 모든 문자열을 sanitizeExternalText 로 정제한 사본을 돌려준다 (집계 JSON 처럼 구조가 정해진 입력용).
 * 깊이·키 수·배열 길이에 상한을 둔다. 지표용으로 정제 결과를 results 에 모은다.
 */
export function sanitizeDeepStrings(
  value: unknown,
  maxChars: number,
  results: SanitizeResult[] = [],
  depth = 0,
): unknown {
  if (typeof value === 'string') {
    const r = sanitizeExternalText(value, { maxChars });
    results.push(r);
    return r.text;
  }
  if (depth >= 6 || value === null || typeof value !== 'object') {
    return typeof value === 'number' || typeof value === 'boolean' || value === null ? value : undefined;
  }
  if (Array.isArray(value)) return value.slice(0, 200).map((v) => sanitizeDeepStrings(v, maxChars, results, depth + 1));
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(value as Record<string, unknown>).slice(0, 50)) {
    if (k === '__proto__') continue;
    out[sanitizeExternalText(k, { maxChars: 60, mark: false }).text] = sanitizeDeepStrings((value as Record<string, unknown>)[k], maxChars, results, depth + 1);
  }
  return out;
}
