/**
 * 주간 브리프 정적 HTML 공통 헬퍼 — v1(포스터) 빌더와 v2(리포트) 빌더가 함께 쓴다.
 * (weekly-brief-html.ts 가 두 빌더를 분기하므로, v2 빌더가 그 파일을 import 하면 순환이 된다 — 그래서 별도 모듈)
 *
 * 안전 원칙:
 *  - 모든 텍스트는 escapeHtml 을 거치고, 금지 문자열(javascript: 등)이 본문에 우연히 들어와도
 *    출력에 나타나지 않도록 폭 없는 공백(U+200B)으로 끊는다.
 *  - 외부 링크는 target="_blank" rel="noopener noreferrer".
 */

import { escapeHtml } from '@/lib/tech-trend-report-html';

/** 이스케이프 후에도 남을 수 있는 금지 토큰(본문에 우연히 포함된 경우)을 폭 없는 공백으로 끊는다 */
const FORBIDDEN_TOKEN_RE = /javascript:|data:|http:\/\/|url\(|@import|onerror|onclick|onload|src\s*=|href\s*=/gi;
/** 링크 값에 금지 토큰이 들어 있으면(예: 쿼리의 http://) 링크를 포기한다 */
const FORBIDDEN_HREF_RE = /javascript:|data:|http:\/\/|url\(|@import|onerror|onclick|onload|<|"/i;

export function defang(s: string): string {
  return s.replace(FORBIDDEN_TOKEN_RE, (m) => `${m[0]}​${m.slice(1)}`);
}

/** 텍스트 노드·속성값용 */
export function t(s: string | null | undefined): string {
  return defang(escapeHtml(s ?? ''));
}

export function okHref(h: string): string {
  return h && !FORBIDDEN_HREF_RE.test(h) ? h : '';
}

export function ext(href: string, inner: string, cls?: string): string {
  const c = cls ? ` class="${cls}"` : '';
  return `<a${c} href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
}

/** 링크가 안전하면 <a>, 아니면 텍스트 그대로 */
export function maybeLink(href: string, inner: string, cls?: string): string {
  const h = okHref(href);
  return h ? ext(h, inner, cls) : inner;
}
