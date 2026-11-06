/**
 * 운영 자동화 로그 한 줄 포맷 — `[Tag] key=value key=value ...`
 * 문자열은 안전한 문자만이면 그대로, 아니면 JSON 으로 감싼다. 객체/배열은 한 줄 JSON. undefined 값은 생략한다.
 */

export type LogFieldValue = string | number | boolean | null | undefined | object;

function formatValue(v: LogFieldValue): string {
  if (v === null) return 'null';
  if (typeof v === 'string') return /^[\w:.,\-/]+$/.test(v) ? v : JSON.stringify(v);
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return JSON.stringify(v);
}

/** 필드는 전달된 키 순서를 유지한다. */
export function formatLogLine(tag: string, fields: Record<string, LogFieldValue>): string {
  const parts = Object.entries(fields)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${formatValue(v)}`);
  return parts.length > 0 ? `[${tag}] ${parts.join(' ')}` : `[${tag}]`;
}
