/**
 * 주간 브리프 v3 편집 — 편집본 병합(applyEdits), 편집 검증(validateEdits), 이력 항목 생성. 순수 함수 (DB 접근 없음).
 *
 * 편집은 "id 경로 → 문자열" 맵이다. 예: { "conclusions.c:gap-atlas-hand_dof.lines.2": "…", "questions.q2.text": "…" }.
 *  - 편집 가능: 결론 headline·lines[].text, 격차 summary[]·rows[].lines[], 기술 signals[].lines[], 사업 moves[].lines[], 질문 text·rationale[], 논문 implication.
 *  - 편집 불가: 숫자, 격차 방향·값, 근거 링크·목록, 도메인, 상태, 항목 추가·삭제·순서 변경.
 *  - 값이 null 이면 AI 원문으로 되돌린다. 항목 id 와 문장 위치가 AI 원문에 없으면 거부한다.
 *  - 거부(400): `<`, URL, 개행, 마크다운 기호, 길이 초과, 빈 문자열. 경고만(저장 허용): 합니다체 위반, 금칙어, 서버 숫자에 없는 숫자, 방향 모순, 수집 건수 문구.
 *  - 항목 id 에는 '.' 이 없다(경로 구분자).
 */

import { buildAllowed, charLength, editWarnings, smallIntegers, violatesTextPolicy, type EditWarningCode, type ExecGapPosition } from './weekly-brief-text-guard.js';
import type { WeeklyBriefEditHistoryEntry, WeeklyBriefEditLimits, WeeklyExecutivePayload } from '../types/weekly-brief.js';

export const EDIT_LIMITS: WeeklyBriefEditLimits = { sentence: 200, headline: 50, question: 200, implication: 100 };
/** 요약 문장 상한 (격차 summary) */
export const EDIT_SUMMARY_LIMIT = 220;
export const EDIT_HISTORY_MAX = 50;
/** 이력 before 텍스트 상한 */
export const HISTORY_TEXT_MAX = 400;

export type EditErrorCode = 'too_long' | 'forbidden_char' | 'unknown_path' | 'empty' | 'invalid_value';

export interface ParsedEditPath {
  kind: 'conclusion_headline' | 'conclusion_line' | 'gap_summary' | 'gap_row_line' | 'tech_line' | 'business_line' | 'question_text' | 'question_rationale' | 'paper_implication';
  id: string | null;
  index: number | null;
  limit: number;
}

function toIndex(s: string | undefined): number | null {
  return s !== undefined && /^\d{1,3}$/.test(s) ? Number(s) : null;
}

/** 경로 문자열을 해석한다. 편집 가능한 형태가 아니면 null */
export function parseEditPath(path: string): ParsedEditPath | null {
  const t = path.split('.');
  const L = EDIT_LIMITS;
  const [a, b, c, d, e] = t;
  if (a === 'conclusions' && b && c === 'headline' && t.length === 3) return { kind: 'conclusion_headline', id: b, index: null, limit: L.headline };
  if (a === 'conclusions' && b && c === 'lines' && toIndex(d) !== null && t.length === 4) return { kind: 'conclusion_line', id: b, index: toIndex(d), limit: L.sentence };
  if (a === 'gaps' && b === 'summary' && toIndex(c) !== null && t.length === 3) return { kind: 'gap_summary', id: null, index: toIndex(c), limit: EDIT_SUMMARY_LIMIT };
  if (a === 'gaps' && b === 'rows' && c && d === 'lines' && toIndex(e) !== null && t.length === 5) return { kind: 'gap_row_line', id: c, index: toIndex(e), limit: L.sentence };
  if (a === 'tech' && b === 'signals' && c && d === 'lines' && toIndex(e) !== null && t.length === 5) return { kind: 'tech_line', id: c, index: toIndex(e), limit: L.sentence };
  if (a === 'business' && b === 'moves' && c && d === 'lines' && toIndex(e) !== null && t.length === 5) return { kind: 'business_line', id: c, index: toIndex(e), limit: L.sentence };
  if (a === 'questions' && b && c === 'text' && t.length === 3) return { kind: 'question_text', id: b, index: null, limit: L.question };
  if (a === 'questions' && b && c === 'rationale' && toIndex(d) !== null && t.length === 4) return { kind: 'question_rationale', id: b, index: toIndex(d), limit: L.sentence };
  if (a === 'evidence' && b === 'papers' && c && d === 'implication' && t.length === 4) return { kind: 'paper_implication', id: c, index: null, limit: L.implication };
  return null;
}

/** AI 원문(payload)에서 경로가 가리키는 텍스트. 없으면 undefined */
export function baseTextAt(ai: WeeklyExecutivePayload, path: string): string | undefined {
  const p = parseEditPath(path);
  if (!p) return undefined;
  switch (p.kind) {
    case 'conclusion_headline':
      return ai.conclusions.find((c) => c.id === p.id)?.headline;
    case 'conclusion_line':
      return ai.conclusions.find((c) => c.id === p.id)?.lines[p.index!]?.text;
    case 'gap_summary':
      return ai.gaps.summary[p.index!];
    case 'gap_row_line':
      return ai.gaps.rows.find((g) => g.id === p.id)?.lines[p.index!];
    case 'tech_line':
      return ai.tech.signals.find((s) => s.id === p.id)?.lines[p.index!];
    case 'business_line':
      return ai.business.moves.find((m) => m.id === p.id)?.lines[p.index!];
    case 'question_text':
      return ai.questions.find((q) => q.id === p.id)?.text;
    case 'question_rationale':
      return ai.questions.find((q) => q.id === p.id)?.rationale[p.index!];
    case 'paper_implication':
      return ai.evidence.papers.find((x) => x.id === p.id)?.implication;
  }
}

/** 경로가 가리키는 격차 행의 서버 position (방향 모순 경고용) */
function positionAt(ai: WeeklyExecutivePayload, path: string): ExecGapPosition | null {
  const p = parseEditPath(path);
  if (p?.kind !== 'gap_row_line') return null;
  return ai.gaps.rows.find((g) => g.id === p.id)?.position ?? null;
}

/** 편집 경고용 서버 숫자 집합 — 서술 필드를 제외한 payload 의 모든 숫자 + 작은 정수 */
export function payloadAllowedNumbers(ai: WeeklyExecutivePayload): Set<string> {
  const blank = JSON.parse(JSON.stringify(ai)) as WeeklyExecutivePayload;
  for (const c of blank.conclusions) {
    c.headline = '';
    c.lines = [];
  }
  blank.gaps.summary = [];
  for (const g of blank.gaps.rows) g.lines = [];
  for (const s of blank.tech.signals) s.lines = [];
  for (const m of blank.business.moves) m.lines = [];
  for (const q of blank.questions) {
    q.text = '';
    q.rationale = [];
  }
  for (const p of blank.evidence.papers) p.implication = '';
  return buildAllowed({ texts: [JSON.stringify(blank)], numbers: smallIntegers(20) });
}

export interface EditViolation {
  path: string;
  code: EditErrorCode;
}

export interface EditWarning {
  path: string;
  codes: EditWarningCode[];
}

export type ValidateResult =
  | { ok: true; edits: Record<string, string | null>; warnings: EditWarning[] }
  | { ok: false; code: EditErrorCode; path: string };

/** 편집 한 건의 거부 규칙 (서버 저장·발행 모두 사용). 통과하면 null */
export function rejectReason(text: unknown, limit: number): EditErrorCode | null {
  if (typeof text !== 'string') return 'invalid_value';
  if (text.trim().length === 0) return 'empty';
  if (violatesTextPolicy(text)) return 'forbidden_char';
  if (charLength(text) > limit) return 'too_long';
  return null;
}

/**
 * 들어온 편집 맵을 검증한다. 하나라도 거부 사유가 있으면 전체를 거부한다(저장하지 않는다).
 * 경고(합니다체 위반 등)는 저장을 막지 않고 warnings 로 돌려준다. 값이 null 이거나 AI 원문과 같으면 되돌리기로 본다.
 */
export function validateEdits(ai: WeeklyExecutivePayload, incoming: Record<string, string | null>): ValidateResult {
  const allowed = payloadAllowedNumbers(ai);
  const out: Record<string, string | null> = {};
  const warnings: EditWarning[] = [];
  for (const [path, value] of Object.entries(incoming)) {
    const parsed = parseEditPath(path);
    const base = parsed ? baseTextAt(ai, path) : undefined;
    if (!parsed || base === undefined) return { ok: false, code: 'unknown_path', path };
    if (value === null) {
      out[path] = null;
      continue;
    }
    const reason = rejectReason(value, parsed.limit);
    if (reason) return { ok: false, code: reason, path };
    if (value === base) {
      out[path] = null;
      continue;
    }
    out[path] = value;
    // 헤드라인은 명사구라 합니다체 종결을 요구하지 않는다
    const codes = editWarnings(value, allowed, positionAt(ai, path)).filter((c) => !(c === 'ending' && parsed.kind === 'conclusion_headline'));
    if (codes.length > 0) warnings.push({ path, codes });
  }
  return { ok: true, edits: out, warnings };
}

/** 저장된 편집 맵에 새 편집을 합친다 (null 은 되돌리기 = 키 제거) */
export function mergeEdits(current: Readonly<Record<string, string>>, incoming: Readonly<Record<string, string | null>>): Record<string, string> {
  const next: Record<string, string> = { ...current };
  for (const [path, v] of Object.entries(incoming)) {
    if (v === null) delete next[path];
    else next[path] = v;
  }
  return next;
}

/**
 * 효과 payload = applyEdits(ai_payload, edits). 순수 함수이고 원본을 변경하지 않는다.
 * AI 원문에 없는 경로(방어)는 무시한다.
 */
export function applyEdits(ai: WeeklyExecutivePayload, edits: Readonly<Record<string, string>>): WeeklyExecutivePayload {
  const out = JSON.parse(JSON.stringify(ai)) as WeeklyExecutivePayload;
  for (const [path, text] of Object.entries(edits)) {
    const p = parseEditPath(path);
    if (!p || typeof text !== 'string' || baseTextAt(out, path) === undefined) continue;
    switch (p.kind) {
      case 'conclusion_headline':
        out.conclusions.find((c) => c.id === p.id)!.headline = text;
        break;
      case 'conclusion_line':
        out.conclusions.find((c) => c.id === p.id)!.lines[p.index!]!.text = text;
        break;
      case 'gap_summary':
        out.gaps.summary[p.index!] = text;
        break;
      case 'gap_row_line':
        out.gaps.rows.find((g) => g.id === p.id)!.lines[p.index!] = text;
        break;
      case 'tech_line':
        out.tech.signals.find((s) => s.id === p.id)!.lines[p.index!] = text;
        break;
      case 'business_line':
        out.business.moves.find((m) => m.id === p.id)!.lines[p.index!] = text;
        break;
      case 'question_text':
        out.questions.find((q) => q.id === p.id)!.text = text;
        break;
      case 'question_rationale':
        out.questions.find((q) => q.id === p.id)!.rationale[p.index!] = text;
        break;
      case 'paper_implication':
        out.evidence.papers.find((x) => x.id === p.id)!.implication = text;
        break;
    }
  }
  return out;
}

/** 발행 전 재검증 — 저장된 편집 중 거부 규칙에 걸리는 경로 목록 (경고는 막지 않는다) */
export function publishViolations(ai: WeeklyExecutivePayload, edits: Readonly<Record<string, string>>): EditViolation[] {
  const out: EditViolation[] = [];
  for (const [path, text] of Object.entries(edits)) {
    const parsed = parseEditPath(path);
    if (!parsed || baseTextAt(ai, path) === undefined) {
      out.push({ path, code: 'unknown_path' });
      continue;
    }
    const reason = rejectReason(text, parsed.limit);
    if (reason) out.push({ path, code: reason });
  }
  return out;
}

function clipHistory(s: string): string {
  const chars = Array.from(s);
  return chars.length <= HISTORY_TEXT_MAX ? s : chars.slice(0, HISTORY_TEXT_MAX - 1).join('') + '…';
}

/** 이력 항목 — before 에는 편집 직전의 효과 텍스트(≤400자)를 담는다 */
export function makeHistoryEntry(args: { at: Date; by: string | null; action: WeeklyBriefEditHistoryEntry['action']; paths: string[]; before?: Record<string, string> }): WeeklyBriefEditHistoryEntry {
  const before: Record<string, string> = {};
  for (const [k, v] of Object.entries(args.before ?? {})) before[k] = clipHistory(v);
  return { at: args.at.toISOString(), by: args.by, action: args.action, paths: args.paths, before };
}

/** 이력에 추가하고 최대 50건만 남긴다 (가장 오래된 항목부터 제거) */
export function appendHistory(history: readonly WeeklyBriefEditHistoryEntry[], entry: WeeklyBriefEditHistoryEntry): WeeklyBriefEditHistoryEntry[] {
  const next = [...history, entry];
  return next.length > EDIT_HISTORY_MAX ? next.slice(next.length - EDIT_HISTORY_MAX) : next;
}

/** 편집된(AI 원문과 다른) 문장 수 */
export function editedCount(edits: Readonly<Record<string, string>>): number {
  return Object.keys(edits).length;
}

/** 편집 직전 효과 텍스트 (이력의 before 용) */
export function effectiveTextBefore(ai: WeeklyExecutivePayload, edits: Readonly<Record<string, string>>, path: string): string | undefined {
  return edits[path] ?? baseTextAt(ai, path);
}
