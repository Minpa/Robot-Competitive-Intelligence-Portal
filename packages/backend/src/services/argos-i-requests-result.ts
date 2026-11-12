/**
 * ARGOS_I 요청 결과 정제 (순수) — 공개 데이터·파생 요약·링크만 담는다. 원문 전재 금지.
 *
 * 모든 문자열은 sanitizeOutputText(400자 이내)와 sanitizeObject 로 정제하고, 링크는 허용 호스트의 https 만 통과시킨다.
 * 목록은 항목 수를 자르고, 숫자는 범위로 자르며, enum 은 허용 값만 남긴다. 정제 후에도 64KB 를 넘으면 result_too_large 다.
 */

import { RESULT_MAX_BYTES } from './argos-i-requests-config.js';
import { clampNumber, enumOnly, safeHttpsUrl, sanitizeObject, sanitizeOutputText, type FieldRule } from './llm-output-guard.js';

export const RESULT_TEXT_MAX = 400;

export interface ResultCtx {
  /** 링크 허용 호스트 (등록 도메인) */
  allowedHosts: readonly string[];
}

/** 400자 이내 정제 문자열. 폐기되면 null */
export function cleanText(v: unknown, max: number = RESULT_TEXT_MAX): string | null {
  return sanitizeOutputText(v, { maxChars: Math.min(max, RESULT_TEXT_MAX) }).text;
}

/** 허용 호스트 https 링크만. 아니면 null */
export function cleanLink(v: unknown, ctx: ResultCtx): string | null {
  return safeHttpsUrl(v, { allowedHosts: ctx.allowedHosts });
}

export function cleanNumber(v: unknown, min: number, max: number): number | null {
  const n = clampNumber(v, min, max, Number.NaN);
  return Number.isNaN(n) ? null : n;
}

export function cleanEnum<T extends string>(v: unknown, allowed: readonly T[]): T | null {
  return enumOnly(v, allowed);
}

export const textRule = (max: number = RESULT_TEXT_MAX): FieldRule => ({ type: 'text', max: Math.min(max, RESULT_TEXT_MAX) });
export const urlRule = (ctx: ResultCtx): FieldRule => ({ type: 'url', allowedHosts: ctx.allowedHosts });
export const numberRule = (min: number, max: number, integer = false): FieldRule => ({ type: 'number', min, max, integer });

/** 객체 하나를 shape 로 정제한다 (스키마에 없는 키는 버림, 규칙을 통과한 키만 남김) */
export function cleanObject(raw: unknown, shape: Readonly<Record<string, FieldRule>>): Record<string, unknown> {
  return sanitizeObject(raw, shape).value;
}

/** 배열을 최대 n 개로 자르고 각 항목을 mapper 로 정제한다. mapper 가 null 이면 항목을 버린다 */
export function cleanItems<T>(raw: unknown, max: number, mapper: (item: unknown) => T | null): T[] {
  if (!Array.isArray(raw)) return [];
  const out: T[] = [];
  for (const it of raw) {
    const m = mapper(it);
    if (m !== null) out.push(m);
    if (out.length >= max) break;
  }
  return out;
}

export type FinalizeResult = { ok: true; result: unknown; bytes: number } | { ok: false; code: 'result_too_large' };

/** 직렬화 크기 상한(64KB) 검사 */
export function finalizeResult(result: unknown, maxBytes: number = RESULT_MAX_BYTES): FinalizeResult {
  let bytes: number;
  try {
    bytes = Buffer.byteLength(JSON.stringify(result) ?? 'null', 'utf8');
  } catch {
    return { ok: false, code: 'result_too_large' };
  }
  return bytes > maxBytes ? { ok: false, code: 'result_too_large' } : { ok: true, result, bytes };
}
