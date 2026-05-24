// ARGOS Issue Tracking — /ask 의도 분류 + lookup 조립 + task 초안 enrichment (spec §7.2~7.4).
import Anthropic from '@anthropic-ai/sdk';
import { desc, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { companies, issueTickets, issueAiCallLog } from '../../db/schema.js';

type Intent = 'lookup' | 'task' | 'ambiguous';

interface AskResult {
  intent: Intent;
  confidence: number;
  answer?: any;
  draft?: any;
  fallback?: { action: string; label: string };
}

const MODEL = 'claude-opus-4-7'; // 프로젝트 표준
const DAILY_BUDGET = Number(process.env.ANTHROPIC_DAILY_TOKEN_BUDGET || 500000);

async function aiBudgetExhausted(): Promise<boolean> {
  try {
    const r = await db.select({
      total: sql<number>`coalesce(sum(input_tokens + output_tokens), 0)`,
    }).from(issueAiCallLog).where(sql`at > now() - interval '24 hours'`);
    return Number(r[0]?.total ?? 0) >= DAILY_BUDGET;
  } catch { return false; }
}

async function logAiCall(opts: {
  userId: string | null; endpoint: string; inputTokens: number; outputTokens: number;
  success: boolean; error?: string;
}) {
  try {
    await db.insert(issueAiCallLog).values({
      callerUserId: opts.userId, endpoint: opts.endpoint, model: MODEL,
      inputTokens: opts.inputTokens, outputTokens: opts.outputTokens,
      success: opts.success, error: opts.error,
    });
  } catch { /* silent */ }
}

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// 1) 키워드 기반 fallback (Claude 미가용·예산 소진 시)
async function keywordFallback(query: string): Promise<AskResult> {
  const like = `%${query.split(/\s+/)[0] ?? query}%`;
  const [comps, tixs] = await Promise.all([
    db.select({ id: companies.id, name: companies.name, country: companies.country })
      .from(companies).where(sql`${companies.name} ILIKE ${like}`).limit(5),
    db.select({ id: issueTickets.id, code: issueTickets.code, title: issueTickets.title, status: issueTickets.status })
      .from(issueTickets).where(sql`${issueTickets.title} ILIKE ${like}`).limit(5),
  ]);
  return {
    intent: 'lookup', confidence: 0.4,
    answer: {
      summary: 'AI 미가용 — 키워드 검색 결과',
      competitors: comps,
      recentArticles: [],
      relatedTickets: tixs,
    },
    fallback: { action: 'create_ticket', label: '이 정보로 부족 — 이슈로 발행 →' },
  };
}

// 2) 의도 분류 + 기본 답변 — Claude 1콜
async function classifyAndDraft(query: string, userId: string): Promise<AskResult> {
  const client = getClient();
  if (!client) return keywordFallback(query);
  if (await aiBudgetExhausted()) return keywordFallback(query);

  // 관련 회사·티켓 사전 조회 (context for Claude)
  const lower = query.toLowerCase();
  const [comps, tixs] = await Promise.all([
    db.select({ id: companies.id, name: companies.name, country: companies.country })
      .from(companies)
      .where(sql`lower(${companies.name}) ILIKE ${'%' + lower + '%'}`)
      .limit(8),
    db.select({ id: issueTickets.id, code: issueTickets.code, title: issueTickets.title, status: issueTickets.status })
      .from(issueTickets)
      .where(sql`lower(${issueTickets.title}) ILIKE ${'%' + lower + '%'}`)
      .orderBy(desc(issueTickets.createdAt))
      .limit(8),
  ]);

  const sys = `당신은 ARGOS 워룸의 이슈 트래커 도우미입니다.
사용자 질의를 받아 의도를 분류하고 JSON 만 출력하세요.

intent:
- "lookup": 단순 조회/검색 (예: "Figure 03 정보", "최근 경쟁사 동향")
- "task": 행동 필요 (예: "Figure 03 대응 방안 검토", "이번 주 안에 ~ 해줘")
- "ambiguous": 둘 다 가능 (모호)

출력 JSON 형식 (다른 텍스트 금지):
{
  "intent": "lookup"|"task"|"ambiguous",
  "confidence": 0.0~1.0,
  "summary": "조회 요약 1~2문장 (lookup/ambiguous 일 때)",
  "task_title": "20자 이내 (task/ambiguous 일 때)",
  "task_description": "초안 본문 1~3문장 (task/ambiguous 일 때)",
  "priority": "H"|"M"|"L",
  "type_recommended": "task"|"research"|"response"|"epic",
  "due_days": 1~30 (task 일 때 권장 마감일까지 일수),
  "competitor_keywords": ["...","..."] (이름으로 매칭 시도 — 회사 ID 매칭은 호출자가 처리)
}`;

  const ctxBlocks = [
    `사내에 검색된 회사 후보:\n${comps.map(c => `- ${c.name} (${c.country})`).join('\n') || '(없음)'}`,
    `사내에 검색된 관련 티켓:\n${tixs.map(t => `- ${t.code} ${t.title} [${t.status}]`).join('\n') || '(없음)'}`,
  ].join('\n\n');

  try {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 800,
      system: sys,
      messages: [{ role: 'user', content: `질의: ${query}\n\n참고 컨텍스트:\n${ctxBlocks}` }],
    });
    const text = (resp.content[0] as any)?.text ?? '';
    await logAiCall({
      userId, endpoint: 'ask',
      inputTokens: resp.usage.input_tokens, outputTokens: resp.usage.output_tokens,
      success: true,
    });
    // JSON 추출 (앞뒤 백틱·텍스트 허용)
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('AI 응답 파싱 실패');
    const parsed = JSON.parse(m[0]);
    const intent: Intent = ['lookup', 'task', 'ambiguous'].includes(parsed.intent) ? parsed.intent : 'lookup';
    const confidence = Math.min(1, Math.max(0, Number(parsed.confidence ?? 0.6)));
    const result: AskResult = { intent, confidence };
    if (intent === 'lookup' || intent === 'ambiguous') {
      result.answer = {
        summary: String(parsed.summary ?? '검색 결과 요약을 준비 중입니다.'),
        competitors: comps, recentArticles: [], relatedTickets: tixs,
      };
      result.fallback = { action: 'create_ticket', label: '이 정보로 부족 — 이슈로 발행 →' };
    }
    if (intent === 'task' || intent === 'ambiguous') {
      const days = Math.max(1, Math.min(30, Number(parsed.due_days ?? 7)));
      const due = new Date(Date.now() + days * 864e5);
      // 회사 키워드로 competitor 매칭
      const compKw: string[] = Array.isArray(parsed.competitor_keywords) ? parsed.competitor_keywords : [];
      const matched = comps.filter(c => compKw.some(k => c.name.toLowerCase().includes(String(k).toLowerCase())));
      result.draft = {
        title: String(parsed.task_title ?? query).slice(0, 200),
        description: String(parsed.task_description ?? ''),
        priority: ['H', 'M', 'L'].includes(parsed.priority) ? parsed.priority : 'M',
        priorityRationale: '',
        suggestedOwnerId: null,
        ownerRationale: '',
        type_recommended: ['task', 'research', 'response', 'epic'].includes(parsed.type_recommended) ? parsed.type_recommended : 'task',
        linkedCompetitorIds: matched.map(c => c.id),
        linkedStrategyDocIds: [],
        suggestedDueAt: due.toISOString(),
        suggestedActions: [],
        suggested_links: [], // v1
      };
    }
    return result;
  } catch (e: any) {
    await logAiCall({ userId, endpoint: 'ask', inputTokens: 0, outputTokens: 0, success: false, error: e?.message });
    return keywordFallback(query);
  }
}

export async function askEntry(query: string, userId: string): Promise<AskResult> {
  return classifyAndDraft(query, userId);
}

// 기존 티켓 재 enrichment — summary + suggestedActions 만 갱신
export async function enrichTicket(ticket: { id: string; title: string; description: string }, userId: string) {
  const client = getClient();
  if (!client || await aiBudgetExhausted()) {
    return { summary: '(AI 미가용)', actions: [] };
  }
  const sys = `티켓 본문을 1~2문장으로 요약하고, suggestedActions 3개 (step, rationale, estimatedEffortHours, requiresCompetitorData) JSON 으로 출력.
출력:
{ "summary": "...", "actions": [{"step":"...","rationale":"...","estimatedEffortHours":4,"requiresCompetitorData":true}, ...] }`;
  try {
    const resp = await client.messages.create({
      model: MODEL, max_tokens: 600, system: sys,
      messages: [{ role: 'user', content: `제목: ${ticket.title}\n본문: ${ticket.description}` }],
    });
    const text = (resp.content[0] as any)?.text ?? '';
    await logAiCall({ userId, endpoint: 'enrich',
      inputTokens: resp.usage.input_tokens, outputTokens: resp.usage.output_tokens, success: true });
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return { summary: '(파싱 실패)', actions: [] };
    const parsed = JSON.parse(m[0]);
    return { summary: String(parsed.summary ?? ''), actions: Array.isArray(parsed.actions) ? parsed.actions : [] };
  } catch (e: any) {
    await logAiCall({ userId, endpoint: 'enrich', inputTokens: 0, outputTokens: 0, success: false, error: e?.message });
    return { summary: '(AI 호출 실패)', actions: [] };
  }
}
