import type { FastifyInstance } from 'fastify';
import Anthropic from '@anthropic-ai/sdk';
import { authMiddleware, requireRole } from './auth.js';
import { buildUserMessage, stripCiteTags } from '../services/llm-input-guard.js';
import { safeHttpsUrl, sanitizeOutputText, sanitizeTag } from '../services/llm-output-guard.js';
import { composeSystemPrompt } from '../services/llm-guard-prompts.js';
import { recordOutputReject } from '../services/llm-guard-metrics.js';

const adminOnly = [authMiddleware, requireRole('admin')];
const POINT = 'event_discovery';

export interface DiscoveredEvent {
  id: string;
  name: string;
  type: '전시' | '학회' | '세미나';
  date_start: string;
  date_end: string;
  location: string;
  country: string;
  url: string;
  tags: string[];
  relevance_score: 1 | 2 | 3 | 4 | 5;
}

const VALID_TYPES = new Set(['전시', '학회', '세미나']);
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cache: { events: DiscoveredEvent[]; expiresAt: number } | null = null;

/** 테스트용: 5분 캐시 비우기 */
export function resetEventCache(): void {
  cache = null;
}

const SYSTEM_PROMPT = `You discover upcoming and recent robotics, AI, and humanoid-robot industry events worldwide.

Return ONLY a valid JSON array of event objects (no markdown fence, no preamble, no trailing text). Each event MUST have these exact fields:
- id: string (unique slug, kebab-case, e.g. "ces-2027")
- name: string (full official event name, no abbreviation)
- type: "전시" | "학회" | "세미나" (Korean: exhibition / conference / seminar — choose one)
- date_start: string (ISO date "YYYY-MM-DD")
- date_end: string (ISO date "YYYY-MM-DD"; same as date_start if single-day)
- location: string ("City, Country")
- country: string (ISO country name in English)
- url: string (official event URL — must be a real https URL you found via web search)
- tags: string[] (3-6 tags like "humanoid", "AI", "industrial-automation", "service-robotics", "computer-vision")
- relevance_score: 1-5 integer (5 = directly relevant to LG CLOiD humanoid robot strategy; 1 = tangentially related)

Find 8-12 events occurring within the next 9 months from today. Prioritize:
- Major robotics exhibitions (CES, Automate, IREX, ROSCon, IEEE ICRA, IROS, RoboBusiness)
- Humanoid-robot focused events
- Korea-relevant events (KIROS, Korea Robot World, etc.)
- AI conferences with robotics tracks (NeurIPS robotics workshops, etc.)

Use web search to verify dates and URLs. Do NOT hallucinate URLs.`;

/** 시스템 영역: 지시문 + 공통 문구 (웹 검색 결과도 데이터임을 명시) */
const GUARDED_SYSTEM_PROMPT = composeSystemPrompt(SYSTEM_PROMPT, { lang: 'en', webSearch: true, allowUrlField: true });

/** 한 문자열 필드 정제 (HTML·URL 제거, 유출 폐기). 폐기되면 null */
function cleanField(raw: unknown, maxChars: number): string | null {
  if (typeof raw !== 'string') return null;
  const r = sanitizeOutputText(stripCiteTags(raw), { maxChars });
  if (r.text === null) {
    if (r.reason !== 'empty') recordOutputReject(POINT, r.reason ?? 'schema');
    return null;
  }
  if (r.flags.includes('url_removed') || r.flags.includes('link_removed')) recordOutputReject(POINT, 'url');
  return r.text;
}

function validIsoDate(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const t = Date.parse(`${v}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === v;
}

export function parseEventsFromResponse(text: string): DiscoveredEvent[] {
  let jsonStr = text.trim();
  // Strip markdown code fence if present
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch && fenceMatch[1]) {
    jsonStr = fenceMatch[1].trim();
  }
  // Extract array between first '[' and last ']'
  const arrStart = jsonStr.indexOf('[');
  const arrEnd = jsonStr.lastIndexOf(']');
  if (arrStart === -1 || arrEnd <= arrStart) {
    throw new Error('AI response did not contain a JSON array');
  }
  const arr = JSON.parse(jsonStr.slice(arrStart, arrEnd + 1));
  if (!Array.isArray(arr)) {
    throw new Error('Parsed JSON is not an array');
  }

  const out: DiscoveredEvent[] = [];
  for (const raw of arr) {
    if (!raw || typeof raw !== 'object') continue;
    const e = raw as Record<string, unknown>;
    // id 는 kebab-case 슬러그만 (캘린더 키/링크에 쓰인다)
    const id = typeof e.id === 'string' ? e.id.trim().toLowerCase() : '';
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(id)) {
      recordOutputReject(POINT, 'schema');
      continue;
    }
    const name = cleanField(e.name, 150);
    if (!name) continue;
    if (typeof e.type !== 'string' || !VALID_TYPES.has(e.type)) continue;
    if (!validIsoDate(e.date_start)) continue;

    const score = Math.min(5, Math.max(1, Math.round(Number(e.relevance_score)) || 3));

    // url 은 https + 공개 호스트 형식만 통과, 아니면 빈 문자열 (캘린더 링크로 쓰이므로 가장 중요한 필드)
    let url = '';
    if (typeof e.url === 'string' && e.url.trim()) {
      const safe = safeHttpsUrl(e.url);
      if (safe) url = safe;
      else recordOutputReject(POINT, 'url');
    }

    const tags: string[] = [];
    for (const t of Array.isArray(e.tags) ? e.tags : []) {
      const tag = sanitizeTag(t, 40);
      if (tag && !tags.includes(tag)) tags.push(tag);
      if (tags.length >= 6) break;
    }

    out.push({
      id,
      name,
      type: e.type as '전시' | '학회' | '세미나',
      date_start: e.date_start,
      date_end: validIsoDate(e.date_end) ? e.date_end : e.date_start,
      location: cleanField(e.location, 120) ?? '',
      country: cleanField(e.country, 60) ?? '',
      url,
      tags,
      relevance_score: score as 1 | 2 | 3 | 4 | 5,
    });
  }
  return out;
}

export async function eventRoutes(fastify: FastifyInstance, opts: { client?: Anthropic } = {}) {
  // Discover recent/upcoming events via Claude + web_search.
  // Caches results for 5 minutes to avoid repeated AI calls. 고비용(웹 검색) 호출이므로 관리자만.
  fastify.post('/refresh', { preHandler: adminOnly }, async (_request, reply) => {
    const now = Date.now();
    if (cache && cache.expiresAt > now) {
      return reply.send({ events: cache.events, cached: true, count: cache.events.length });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey && !opts.client) {
      return reply.code(500).send({ error: 'ANTHROPIC_API_KEY not configured' });
    }

    try {
      const anthropic = opts.client ?? new Anthropic({ apiKey });
      const response = await anthropic.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 4096,
        system: GUARDED_SYSTEM_PROMPT,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tools: [{ type: 'web_search_20250305' as any, name: 'web_search', max_uses: 5 } as any],
        messages: [
          {
            role: 'user',
            content: buildUserMessage('event_discovery', { today: new Date().toISOString().slice(0, 10), request: 'Find 8-12 upcoming and recent robotics/AI events worldwide and return a JSON array per the system instructions.' }),
          },
        ],
      });

      // Concatenate all text blocks (web_search returns mixed text/tool blocks)
      let text = '';
      for (const block of response.content) {
        if (block.type === 'text') text += block.text;
      }
      if (!text.trim()) {
        return reply.code(500).send({ error: 'AI returned empty response' });
      }

      const events = parseEventsFromResponse(text);
      cache = { events, expiresAt: now + CACHE_TTL_MS };
      return reply.send({ events, cached: false, count: events.length });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI refresh failed';
      fastify.log.error({ err }, '[events/refresh] failed');
      return reply.code(500).send({ error: msg });
    }
  });

  // GET endpoint to retrieve last cached AI-discovered events without
  // triggering a fresh fetch. Useful for fallback paths.
  fastify.get('/cached', async (_request, reply) => {
    if (!cache) return reply.send({ events: [], cached: false, count: 0 });
    return reply.send({ events: cache.events, cached: true, count: cache.events.length, expiresAt: cache.expiresAt });
  });
}
