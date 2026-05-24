// ARGOS Issue Tracking — /ask 의도 분류 + lookup 조립 + task 초안 enrichment (spec §7.2~7.4).
//
// 아키텍처 (단일 Claude 콜):
//   1) Claude 가 자연어 질의 → JSON { intent, search_terms, task_draft? } 추출
//   2) 백엔드가 search_terms 로 카탈로그 DB 검색 (다중 필드 OR-ILIKE)
//   3) lookup: DB 결과를 구조화된 summary 로 합성 + 카드 리스트
//      task:   Claude 의 draft 를 그대로 + 매칭된 회사 ID 부착
//
// 하드코딩 stopwords 가 없으므로 임원의 다양한 질의 패턴에 견고함.
import Anthropic from '@anthropic-ai/sdk';
import { desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { companies, issueTickets, issueAiCallLog, humanoidRobots, products, articles } from '../../db/schema.js';
import { createTicket } from './ticketService.js';

type Intent = 'lookup' | 'task' | 'ambiguous';

interface AskResult {
  intent: Intent;
  confidence: number;
  answer?: any;
  draft?: any;
  fallback?: { action: string; label: string };
  autoCreatedTicket?: { code: string; title: string; reason: string };
}

const MODEL = 'claude-opus-4-7';
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

// ──────────────────────────────────────────────────────────────────
// DB 검색 — Claude 가 추출한 search_terms 로 다중 필드 OR-ILIKE
// ──────────────────────────────────────────────────────────────────
function ilikeAnyField(terms: string[], fields: any[]): SQL<unknown> | undefined {
  const conds: SQL<unknown>[] = [];
  for (const t of terms) {
    if (!t || t.trim().length < 1) continue;
    const pat = `%${t.trim()}%`;
    for (const f of fields) conds.push(ilike(f, pat));
  }
  if (conds.length === 0) return undefined;
  return or(...conds);
}

async function searchCatalog(terms: string[]) {
  const compWhere = ilikeAnyField(terms, [companies.name, companies.description, companies.mainBusiness]);
  const robotWhere = ilikeAnyField(terms, [humanoidRobots.name, humanoidRobots.description, companies.name]);
  const prodWhere = ilikeAnyField(terms, [products.name, products.series, companies.name]);
  const artWhere = ilikeAnyField(terms, [articles.title, articles.summary]);
  const tixWhere = ilikeAnyField(terms, [issueTickets.title, issueTickets.description, issueTickets.code]);

  const [comps, robots, prods, arts, tixs] = await Promise.all([
    compWhere
      ? db.select({ id: companies.id, name: companies.name, country: companies.country })
          .from(companies).where(compWhere).limit(8)
      : Promise.resolve([] as any[]),
    robotWhere
      ? db.select({
          id: humanoidRobots.id, name: humanoidRobots.name,
          companyId: humanoidRobots.companyId, companyName: companies.name,
          announcementYear: humanoidRobots.announcementYear,
          announcementQuarter: humanoidRobots.announcementQuarter,
          status: humanoidRobots.status, purpose: humanoidRobots.purpose,
          stage: humanoidRobots.commercializationStage,
          dataType: humanoidRobots.dataType,
          description: humanoidRobots.description,
        }).from(humanoidRobots)
          .leftJoin(companies, eq(companies.id, humanoidRobots.companyId))
          .where(robotWhere)
          .orderBy(desc(humanoidRobots.announcementYear), desc(humanoidRobots.announcementQuarter))
          .limit(8)
      : Promise.resolve([] as any[]),
    prodWhere
      ? db.select({
          id: products.id, name: products.name, type: products.type,
          companyId: products.companyId, companyName: companies.name,
          releaseDate: products.releaseDate, status: products.status,
        }).from(products)
          .leftJoin(companies, eq(companies.id, products.companyId))
          .where(prodWhere)
          .limit(8)
      : Promise.resolve([] as any[]),
    artWhere
      ? db.select({
          id: articles.id, title: articles.title, source: articles.source,
          url: articles.url, publishedAt: articles.publishedAt,
        }).from(articles)
          .where(artWhere)
          .orderBy(desc(articles.publishedAt))
          .limit(8)
      : Promise.resolve([] as any[]),
    tixWhere
      ? db.select({ id: issueTickets.id, code: issueTickets.code, title: issueTickets.title, status: issueTickets.status })
          .from(issueTickets)
          .where(tixWhere)
          .orderBy(desc(issueTickets.createdAt))
          .limit(8)
      : Promise.resolve([] as any[]),
  ]);
  return { comps, robots, prods, arts, tixs };
}

// 검색 결과를 자연어 summary 로 합성 (Claude 추가 호출 없이)
function buildLookupSummary(terms: string[], r: Awaited<ReturnType<typeof searchCatalog>>): string {
  const t = terms.filter(Boolean).join(', ') || '질의';
  const total = r.robots.length + r.prods.length + r.comps.length + r.arts.length + r.tixs.length;
  if (total === 0) return `사내 DB 에서 "${t}" 관련 데이터를 찾지 못했습니다. 이슈로 발행하면 팀이 조사를 시작합니다.`;

  const parts: string[] = [];
  if (r.robots.length > 0) {
    const top = r.robots.slice(0, 3).map(x => {
      const yq = x.announcementYear ? `${x.announcementYear}${x.announcementQuarter ? ' Q'+x.announcementQuarter : ''}` : '';
      return `${x.name}${x.companyName ? ` (${x.companyName})` : ''}${yq ? ` · ${yq}` : ''}`;
    }).join('; ');
    parts.push(`로봇 ${r.robots.length}건 — ${top}${r.robots.length > 3 ? ' 외' : ''}`);
  }
  if (r.prods.length > 0) {
    const top = r.prods.slice(0, 3).map(x => `${x.name}${x.companyName ? ` (${x.companyName})` : ''}`).join('; ');
    parts.push(`제품 ${r.prods.length}건 — ${top}${r.prods.length > 3 ? ' 외' : ''}`);
  }
  if (r.comps.length > 0) {
    parts.push(`회사 ${r.comps.length}건 — ${r.comps.slice(0, 3).map(x => x.name).join('; ')}${r.comps.length > 3 ? ' 외' : ''}`);
  }
  if (r.arts.length > 0) parts.push(`기사 ${r.arts.length}건`);
  if (r.tixs.length > 0) parts.push(`기존 티켓 ${r.tixs.length}건`);
  return `"${t}" 관련 사내 데이터 — ${parts.join(' · ')}. 상세는 아래 카드 참조.`;
}

// ──────────────────────────────────────────────────────────────────
// Fallback — Claude 미가용 시 단순 whitespace 분할 (휴리스틱 최소)
// ──────────────────────────────────────────────────────────────────
function naiveTerms(query: string): string[] {
  return query
    .split(/[\s,.!?+/\\()[\]{}'"·:;~`@#$%^&*=|<>]+/)
    .map(t => t.trim())
    .filter(t => t.length >= 2)
    .slice(0, 6);
}

async function noAiFallback(query: string): Promise<AskResult> {
  const terms = naiveTerms(query);
  const r = await searchCatalog(terms);
  return {
    intent: 'lookup', confidence: 0.3,
    answer: {
      summary: `(AI 미가용 — 단순 분할 검색) ${buildLookupSummary(terms, r)}`,
      competitors: r.comps, robots: r.robots, products: r.prods,
      recentArticles: r.arts, relatedTickets: r.tixs,
    },
    fallback: { action: 'create_ticket', label: '이 정보로 부족 — 이슈로 발행 →' },
  };
}

// ──────────────────────────────────────────────────────────────────
// 메인 — Claude 1콜: 의도 분류 + 검색 엔티티 추출 + task draft
// ──────────────────────────────────────────────────────────────────
async function classifyAndExtract(query: string, userId: string): Promise<AskResult> {
  const client = getClient();
  if (!client) return noAiFallback(query);
  if (await aiBudgetExhausted()) return noAiFallback(query);

  const sys = `당신은 ARGOS 워룸 휴머노이드 로봇 경쟁정보 시스템의 의도 분류·엔티티 추출 도우미입니다.
사용자(임원진) 자연어 질의를 받아 JSON 만 출력하세요. 설명·코드블록 금지.

작업:
1) intent 분류
   - "lookup": 단순 조회/검색 (예: "Atlas 정보", "Figure 03 사양", "최근 경쟁사 동향", "올해 출시 예정 로봇")
   - "task": 행동 필요 (예: "Atlas 대응 방안 검토", "이번 주 안에 NEO 가격 분석해줘", "보고서 만들어줘")
   - "ambiguous": 둘 다 가능
2) search_terms 추출 — DB 검색에 사용할 핵심 엔티티만
   - 회사명/로봇명/제품명 (영문 고유명사는 원문 보존, 예: "ATLAS", "Figure 03", "Optimus")
   - 의미 있는 명사 (예: "휴머노이드", "산업용", "촉각센서")
   - 한국어 조사·동사·어미·일반 부사 제외
   - 2~5개 권장
3) substantive: 임원이 진짜 정보를 찾으려는 질의인지 판단
   - true: "Atlas 정보", "올해 출시 예정 휴머노이드", "Optimus 가격" 같이 실제 조사 가치가 있는 질의
   - false: "test", "ㅋㅋ", "안녕", "뭐해" 같이 사소하거나 시스템 테스트성 질의
4) research_title (substantive=true 이고 intent=lookup 일 때만): 정보가 부족할 경우 자동 생성될 조사 티켓 제목 (20자 이내)
   예: "Atlas 최신 사양 조사", "Figure 03 가격 정책 조사"
5) task 또는 ambiguous 일 때만 task_* 필드 채움

출력 JSON 형식:
{
  "intent": "lookup"|"task"|"ambiguous",
  "confidence": 0.0~1.0,
  "search_terms": ["...","..."],
  "substantive": true|false,
  "research_title": "20자 이내 (substantive=true 이고 lookup/ambiguous 일 때)",
  "task_title": "20자 이내 (task/ambiguous)",
  "task_description": "초안 본문 1~3문장 (task/ambiguous)",
  "priority": "H"|"M"|"L",
  "type_recommended": "task"|"research"|"response"|"epic",
  "due_days": 1~30
}`;

  let parsed: any = null;
  let aiOk = false;
  try {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      system: sys,
      messages: [{ role: 'user', content: `질의: ${query}` }],
    });
    const text = (resp.content[0] as any)?.text ?? '';
    await logAiCall({
      userId, endpoint: 'ask',
      inputTokens: resp.usage.input_tokens, outputTokens: resp.usage.output_tokens,
      success: true,
    });
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('AI 응답 파싱 실패');
    parsed = JSON.parse(m[0]);
    aiOk = true;
  } catch (e: any) {
    await logAiCall({ userId, endpoint: 'ask', inputTokens: 0, outputTokens: 0, success: false, error: e?.message });
    return noAiFallback(query);
  }

  const intent: Intent = ['lookup', 'task', 'ambiguous'].includes(parsed.intent) ? parsed.intent : 'lookup';
  const confidence = Math.min(1, Math.max(0, Number(parsed.confidence ?? 0.7)));
  const searchTerms: string[] = Array.isArray(parsed.search_terms) && parsed.search_terms.length > 0
    ? parsed.search_terms.map((s: any) => String(s)).filter(Boolean).slice(0, 8)
    : naiveTerms(query); // Claude 가 비웠으면 fallback

  // DB 검색은 항상 수행 (lookup 답변 + task 의 회사 매칭에 사용)
  const r = await searchCatalog(searchTerms);

  const result: AskResult = { intent, confidence };

  if (intent === 'lookup' || intent === 'ambiguous') {
    result.answer = {
      summary: buildLookupSummary(searchTerms, r),
      competitors: r.comps,
      robots: r.robots,
      products: r.prods,
      recentArticles: r.arts,
      relatedTickets: r.tixs,
    };
    result.fallback = { action: 'create_ticket', label: '이 정보로 부족 — 이슈로 발행 →' };

    // 자동 research 티켓 생성 — 결과 0건이고 Claude 가 substantive=true 로 판단한 경우
    // 기존에 동일 검색어로 만들어진 자동 티켓이 있으면 중복 생성 방지
    const totalHits = r.comps.length + r.robots.length + r.prods.length + r.arts.length + r.tixs.length;
    const substantive = parsed.substantive === true;
    const researchTitle = parsed.research_title ? String(parsed.research_title).slice(0, 200) : '';
    if (substantive && researchTitle && totalHits === 0 && query.trim().length >= 3) {
      try {
        // 7일 이내 동일 제목 자동 티켓이 이미 있는지 체크 (중복 방지)
        const dup = await db.select({ code: issueTickets.code }).from(issueTickets)
          .where(sql`${issueTickets.title} = ${researchTitle} AND ${issueTickets.createdAt} > now() - interval '7 days'`)
          .limit(1);
        if (dup.length === 0) {
          const created = await createTicket(userId, {
            title: researchTitle,
            description: `[Ask 자동 생성 — 사내 DB 결과 없음]

임원 질의: ${query}

검색 키워드: ${searchTerms.join(', ')}

조사 결과를 코멘트로 첨부 후 상태를 'in_progress' → 'done' 으로 갱신해 주세요.`,
            priority: 'M',
            type: 'research',
          });
          result.autoCreatedTicket = {
            code: created.code,
            title: created.title,
            reason: '사내 DB 에 관련 정보가 없어 조사 티켓이 자동 생성되었습니다.',
          };
        } else {
          result.autoCreatedTicket = {
            code: dup[0]!.code,
            title: researchTitle,
            reason: '동일 조사 티켓이 최근 7일 내 이미 생성되어 있어 재사용합니다.',
          };
        }
      } catch { /* 실패 시 silently — fallback 버튼은 여전히 동작 */ }
    }
  }

  if ((intent === 'task' || intent === 'ambiguous') && aiOk) {
    const days = Math.max(1, Math.min(30, Number(parsed.due_days ?? 7)));
    const due = new Date(Date.now() + days * 864e5);
    // Claude search_terms 로 검색된 회사를 그대로 연결 (별도 keyword 매칭 불필요)
    result.draft = {
      title: String(parsed.task_title ?? query).slice(0, 200),
      description: String(parsed.task_description ?? ''),
      priority: ['H', 'M', 'L'].includes(parsed.priority) ? parsed.priority : 'M',
      priorityRationale: '',
      suggestedOwnerId: null,
      ownerRationale: '',
      type_recommended: ['task', 'research', 'response', 'epic'].includes(parsed.type_recommended) ? parsed.type_recommended : 'task',
      linkedCompetitorIds: r.comps.map(c => c.id),
      linkedStrategyDocIds: [],
      suggestedDueAt: due.toISOString(),
      suggestedActions: [],
      suggested_links: [],
    };
  }
  return result;
}

export async function askEntry(query: string, userId: string): Promise<AskResult> {
  return classifyAndExtract(query, userId);
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
