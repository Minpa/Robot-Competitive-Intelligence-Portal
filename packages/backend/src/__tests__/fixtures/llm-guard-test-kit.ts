/**
 * 지점별 가짜 클라이언트 테스트 도구 — 가짜 SDK client, 체인형 DB 목, 구조 단언 헬퍼.
 */
import { expect, vi } from 'vitest';
import { UNTRUSTED_DATA_NOTICE, UNTRUSTED_DATA_NOTICE_EN, UNTRUSTED_DATA_NOTICE_EN_URL_FIELD, UNTRUSTED_DATA_NOTICE_URL_FIELD, DATA_BLOCK_OPEN_PREFIX, DATA_BLOCK_CLOSE_PREFIX } from '../../services/llm-guard-prompts.js';

export interface RecordedCall {
  params: any;
  options?: any;
}

/** Anthropic messages.create 가짜: responses 를 순서대로 돌려주고 마지막 값을 반복한다 */
export function fakeAnthropic(responses: string | string[], calls: RecordedCall[] = []) {
  const queue = Array.isArray(responses) ? [...responses] : [responses];
  const create = vi.fn(async (params: any, options?: any) => {
    calls.push({ params, options });
    const text = queue.length > 1 ? queue.shift()! : queue[0]!;
    return { content: [{ type: 'text', text }], usage: { input_tokens: 1, output_tokens: 1 }, stop_reason: 'end_turn' };
  });
  return { client: { messages: { create } } as any, calls, create };
}

/** OpenAI chat.completions.create / responses.create 가짜 */
export function fakeOpenAI(response: string, calls: RecordedCall[] = []) {
  const create = vi.fn(async (params: any, options?: any) => {
    calls.push({ params, options });
    return { choices: [{ message: { content: response } }] };
  });
  const responsesCreate = vi.fn(async (params: any, options?: any) => {
    calls.push({ params, options });
    return { output_text: response };
  });
  return { client: { chat: { completions: { create } }, responses: { create: responsesCreate } } as any, calls, create, responsesCreate };
}

/** Gemini models.generateContent 가짜 */
export function fakeGemini(response: string, calls: RecordedCall[] = []) {
  const generateContent = vi.fn(async (params: any) => {
    calls.push({ params });
    return { text: response, usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 } };
  });
  return { client: { models: { generateContent } } as any, calls, generateContent };
}

// ── DB 목 ──

/** 어떤 메서드든 체인으로 이어지고, await 하면 result 로 풀리는 쿼리 빌더 목 */
export function chain(result: unknown, onValues?: (v: unknown) => void): any {
  const p: any = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === 'then') return (res: any, rej: any) => Promise.resolve(result).then(res, rej);
      if (prop === 'values') return (v: unknown) => {
        onValues?.(v);
        return p;
      };
      return () => p;
    },
    apply() {
      return p;
    },
  });
  return p;
}

export function makeDbMock() {
  const selectQueue: unknown[][] = [];
  const inserts: unknown[] = [];
  const executes: any[] = [];
  const updates: unknown[] = [];
  const db = {
    select: vi.fn(() => chain(selectQueue.shift() ?? [])),
    insert: vi.fn(() => chain([], (v) => inserts.push(v))),
    update: vi.fn(() => chain([], (v) => updates.push(v))),
    execute: vi.fn(async (q: unknown) => {
      executes.push(q);
      return { rows: [] };
    }),
  };
  return { db, selectQueue, inserts, executes, updates };
}

/** drizzle sql`...` 객체에서 바인딩된 값(문자열/숫자)을 모은다 */
export function sqlParams(q: any): unknown[] {
  const out: unknown[] = [];
  const visit = (chunks: any[]) => {
    for (const c of chunks ?? []) {
      if (c && typeof c === 'object' && Array.isArray(c.queryChunks)) visit(c.queryChunks);
      else if (c && typeof c === 'object' && 'value' in c && Array.isArray((c as any).value)) continue; // StringChunk
      else if (typeof c === 'string' || typeof c === 'number' || typeof c === 'boolean') out.push(c);
    }
  };
  visit(q?.queryChunks ?? []);
  return out;
}

/** JSON 문자열 파라미터 중 객체로 파싱되는 것 */
export function jsonParams(q: any): any[] {
  return sqlParams(q)
    .filter((p): p is string => typeof p === 'string')
    .map((p) => {
      try {
        return JSON.parse(p);
      } catch {
        return undefined;
      }
    })
    .filter((v) => v !== undefined);
}

// ── 구조 단언 ──

export interface PromptParts {
  system: string;
  user: string;
}

/**
 * §11.3 단언 1 (구조): 외부 텍스트(marker)는 사용자 메시지의 데이터 블록 안에만 있고, 시스템 영역에는 없으며,
 * 시스템 영역에 UNTRUSTED_DATA_NOTICE 가 있고, 구분자는 정확히 한 쌍이다.
 */
export function expectGuardedStructure(parts: PromptParts, marker: string, opts: { lang?: 'ko' | 'en'; marked?: boolean; urlField?: boolean } = {}) {
  const en = opts.lang === 'en';
  const notice = opts.urlField ? (en ? UNTRUSTED_DATA_NOTICE_EN_URL_FIELD : UNTRUSTED_DATA_NOTICE_URL_FIELD) : en ? UNTRUSTED_DATA_NOTICE_EN : UNTRUSTED_DATA_NOTICE;
  expect(parts.system).toContain(notice);
  expect(parts.system).not.toContain(marker);
  expect(parts.user).toContain(marker);
  const open = parts.user.split(DATA_BLOCK_OPEN_PREFIX).length - 1;
  const close = parts.user.split(DATA_BLOCK_CLOSE_PREFIX).length - 1;
  expect(open).toBe(1);
  expect(close).toBe(1);
  const openAt = parts.user.indexOf(DATA_BLOCK_OPEN_PREFIX);
  const closeAt = parts.user.indexOf(DATA_BLOCK_CLOSE_PREFIX);
  const markerAt = parts.user.indexOf(marker);
  expect(markerAt).toBeGreaterThan(openAt);
  expect(markerAt).toBeLessThan(closeAt);
}

/** 문자열(들)에 URL/HTML/스크립트가 없는지 */
export function expectClean(value: unknown) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  expect(text).not.toMatch(/https?:\/\//i);
  expect(text).not.toMatch(/<\s*\/?\s*(script|img|b|a|div)\b/i);
  expect(text).not.toMatch(/onerror\s*=/i);
  expect(text).not.toContain('phish.example');
}
