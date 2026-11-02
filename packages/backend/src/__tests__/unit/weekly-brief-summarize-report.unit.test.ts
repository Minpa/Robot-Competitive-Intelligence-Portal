/**
 * weekly-brief-summarize-report — 4회 병렬 호출, 입력 다듬기·프롬프트 상한, 예산 가드, 사용량 기록, 섹션 격리 폴백
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect, vi } from 'vitest';
import {
  PROMPT_LADDER,
  REPORT_MAX_TOKENS,
  REPORT_PROMPT_CHAR_LIMIT,
  REPORT_REQUEST_OPTIONS,
  buildReportPrompt,
  estimateGenerationCostUsd,
  hasCallInput,
  parseJsonObject,
  promptText,
  rescueTruncatedJson,
  resolveRunBudgetUsd,
  summarizeReport,
  type ReportSummarizeDeps,
} from '../../services/weekly-brief-summarize-report.js';
import { buildReportPlan, finalizeReport, type ReportPlan } from '../../services/weekly-brief-compose-report.js';
import {
  RAW_ABSTRACT_MARKER,
  RAW_DESCRIPTION_MARKER,
  RAW_SUMMARY_MARKER,
  REPORT_NOW,
  makeCollectedEmpty,
  makeCollectedFull,
  makeCollectedSparse,
} from '../fixtures/weekly-report-collected.fixture.js';
import { makeFakeReportClient, type FakeAiOptions } from '../fixtures/weekly-report-fake-ai.js';
import type { AIUsageLogEntry } from '../../services/ai-usage.service.js';

/** 모델 식별자 검색 패턴 — 이 파일 자체에 식별자 문자열이 남지 않도록 조각을 이어 만든다 */
const MODEL_IDENTIFIER_RE = new RegExp(['clau' + 'de-', 'op' + 'us', 'hai' + 'ku', 'son' + 'net', 'gp' + 't-'].join('|'), 'i');

const here = path.dirname(fileURLToPath(import.meta.url));
const WEEK = '2026-10-19';

function plan(mk = makeCollectedFull): ReportPlan {
  return buildReportPlan(mk(), { showArticleSummary: true });
}

function harness(opts: FakeAiOptions = {}, over: Partial<ReportSummarizeDeps> = {}) {
  const { client, calls } = makeFakeReportClient(opts);
  const usage: AIUsageLogEntry[] = [];
  const deps: ReportSummarizeDeps = {
    client: client as any,
    env: { WEEKLY_BRIEF_MODEL: 'test-model-x' },
    getCreditInfo: async () => ({ monthlyLimitUsd: 50, currentMonthUsageUsd: 1 }),
    logUsage: async (e) => {
      usage.push(e);
    },
    log: () => {},
    ...over,
  };
  return { deps, calls, usage };
}

describe('call structure', () => {
  it('runs A, B, C and D in parallel with explicit max_tokens and request options', async () => {
    let inflight = 0;
    let maxInflight = 0;
    const { client, calls } = makeFakeReportClient();
    const wrapped = {
      messages: {
        create: async (p: any, o: any) => {
          inflight++;
          maxInflight = Math.max(maxInflight, inflight);
          await new Promise((r) => setTimeout(r, 15));
          try {
            return await client.messages.create(p, o);
          } finally {
            inflight--;
          }
        },
      },
    };
    const { deps, usage } = harness({}, { client: wrapped as any });
    const r = await summarizeReport(WEEK, plan(), deps);
    expect(maxInflight).toBe(4);
    expect(calls.map((c) => c.call).sort()).toEqual(['A', 'B', 'C', 'D']);
    for (const c of calls) {
      expect(c.params.max_tokens).toBe(REPORT_MAX_TOKENS[c.call]);
      expect(c.options).toEqual({ timeout: 120_000, maxRetries: 1 });
      expect(c.params.model).toBe('test-model-x');
      expect(c.params.thinking).toBeUndefined();
    }
    expect(REPORT_MAX_TOKENS).toEqual({ A: 5000, B: 4000, C: 5000, D: 2500 });
    expect(REPORT_REQUEST_OPTIONS).toEqual({ timeout: 120_000, maxRetries: 1 });
    expect(r.calls.every((c) => c.ok)).toBe(true);
    expect(r.ai.failed).toEqual({});
    expect(r.skipped).toBeNull();
    // 호출당 1행의 사용량 기록 (질의 태그 A/B/C/D)
    expect(usage.map((u) => u.query).sort()).toEqual(['A', 'B', 'C', 'D'].map((s) => `[weekly-brief] ${WEEK} ${s}`));
    expect(usage.every((u) => u.provider === 'claude' && u.model === 'test-model-x' && u.webSearch === false)).toBe(true);
    // 합계 = 호출 합
    expect(r.inputTokens).toBe(usage.reduce((n, u) => n + u.inputTokens, 0));
    expect(r.outputTokens).toBe(usage.reduce((n, u) => n + u.outputTokens, 0));
    expect(r.costUsd).toBeCloseTo(r.calls.reduce((n, c) => n + c.costUsd, 0), 10);
    expect(r.model).toBe('test-model-x');
  });

  it('thinking blocks and fenced JSON in the response are tolerated; no retry call is made after a parse failure', async () => {
    const { deps, calls } = harness({ fail: { A: 'garbage' } });
    const r = await summarizeReport(WEEK, plan(), deps);
    expect(calls.filter((c) => c.call === 'A')).toHaveLength(1);
    expect(r.ai.failed.A).toBe('parse_error');
    expect(r.ai.B).not.toBeNull();
    expect(calls).toHaveLength(4);
  });

  it('skips calls that have no input: all-quiet domains skip B, no companies/papers skip C, no titles skip D, no data skips everything', async () => {
    const sparse = plan(makeCollectedSparse); // 도메인 전부 quiet, 회사 없음, 논문 1건
    expect(hasCallInput('B', sparse)).toBe(false);
    const h = harness();
    const r = await summarizeReport(WEEK, sparse, h.deps);
    expect(h.calls.map((c) => c.call).sort()).toEqual(['A', 'C', 'D']);
    expect(r.calls.map((c) => c.section).sort()).toEqual(['A', 'C', 'D']);

    const empty = plan(makeCollectedEmpty);
    const h2 = harness();
    const r2 = await summarizeReport(WEEK, empty, h2.deps);
    expect(h2.calls).toHaveLength(0);
    expect(r2.calls).toEqual([]);
    expect(r2.skipped).toBeNull();
    expect(r2.ai.batchWarnings).toEqual([]);

    const w = makeCollectedFull();
    w.companies = [];
    w.companyDirectory = [];
    w.rows = w.rows.filter((r) => r.source !== 'arxiv').map((r) => ({ ...r, companyId: null }));
    const noC = buildReportPlan(w, {});
    expect(hasCallInput('C', noC)).toBe(false);
  });
});

describe('failure isolation', () => {
  it.each([['throw', 'api_error'], ['garbage', 'parse_error'], ['refusal', 'refusal']] as const)('a %s on one call only fails that section', async (mode, reason) => {
    const h = harness({ fail: { B: mode } });
    const r = await summarizeReport(WEEK, plan(), h.deps);
    expect(r.ai.failed).toEqual({ B: reason });
    expect(r.ai.A).not.toBeNull();
    expect(r.ai.C).not.toBeNull();
    expect(r.ai.D).not.toBeNull();
    expect(r.ai.B).toBeNull();
    // 응답을 받은 호출은 파싱 실패여도 사용량이 기록된다 (throw 는 응답이 없으므로 제외)
    expect(h.usage).toHaveLength(mode === 'throw' ? 3 : 4);
    const p = plan();
    const out = finalizeReport(p, r.ai, REPORT_NOW);
    expect(out.payload.meta.warnings).toContain('ai_domains_failed');
    expect(out.payload.domains.filter((d) => d.status === 'active').every((d) => d.generatedBy === 'rule')).toBe(true);
    expect(out.payload.highlights.every((x) => x.generatedBy === 'ai')).toBe(true);
    expect(out.payload.companies.every((x) => x.generatedBy === 'ai')).toBe(true);
    expect(out.status).toBe('partial');
  });

  it('all calls failing yields all rule sentences and still renders', async () => {
    const h = harness({ fail: { A: 'throw', B: 'throw', C: 'throw', D: 'throw' } });
    const r = await summarizeReport(WEEK, plan(), h.deps);
    expect(Object.keys(r.ai.failed).sort()).toEqual(['A', 'B', 'C', 'D']);
    const out = finalizeReport(plan(), r.ai, REPORT_NOW);
    expect(out.status).toBe('partial');
    expect(out.payload.meta.aiUsed).toBe(false);
    expect(out.payload.highlights.length).toBeGreaterThan(0);
    expect(out.payload.meta.warnings).toEqual(expect.arrayContaining(['ai_highlights_failed', 'ai_domains_failed', 'ai_companies_failed']));
    expect(r.inputTokens).toBe(0);
    expect(r.costUsd).toBe(0);
  });

  it('a response cut at max_tokens is rescued up to the last complete element and flagged', async () => {
    const h = harness({ fail: { C: 'truncate' } });
    const r = await summarizeReport(WEEK, plan(), h.deps);
    expect(r.ai.truncated).toEqual(['C']);
    expect(r.ai.failed.C).toBeUndefined();
    const c = r.ai.C as any;
    expect(Array.isArray(c.companies)).toBe(true);
    expect(c.companies.length).toBeGreaterThan(0);
    const out = finalizeReport(plan(), r.ai, REPORT_NOW);
    expect(out.payload.meta.warnings).toContain('ai_truncated');
  });

  it('a truncated response that cannot be rescued falls back (parse_error) and still logs the usage', async () => {
    const client = { messages: { create: vi.fn(async () => ({ content: [{ type: 'text', text: '{"highlights":[{"candidateId":"h1","head' }], stop_reason: 'max_tokens', usage: { input_tokens: 10, output_tokens: 5000 } })) } };
    const usage: AIUsageLogEntry[] = [];
    const r = await summarizeReport(WEEK, plan(makeCollectedSparse), { client: client as any, env: {}, getCreditInfo: async () => ({ monthlyLimitUsd: 50, currentMonthUsageUsd: 0 }), logUsage: async (e) => void usage.push(e), log: () => {} });
    expect(r.ai.failed.A).toBe('parse_error');
    expect(r.ai.truncated).toContain('A');
    expect(usage.length).toBeGreaterThan(0);
  });
});

describe('guards before calling', () => {
  it('AI disabled / no key: no call, batch warning', async () => {
    const h = harness({}, { env: { WEEKLY_BRIEF_AI_ENABLED: 'false' } });
    const r = await summarizeReport(WEEK, plan(), h.deps);
    expect(h.calls).toHaveLength(0);
    expect(r.skipped).toBe('disabled');
    expect(r.ai.batchWarnings).toEqual(['ai_disabled']);

    const noKey = await summarizeReport(WEEK, plan(), { ...h.deps, env: {}, client: null });
    expect(noKey.skipped).toBe('not_configured');
    expect(noKey.ai.batchWarnings).toEqual(['ai_not_configured']);
  });

  it('budget guard: used + estimated cost > monthly limit skips every call and cannot be bypassed', async () => {
    const h = harness({}, { getCreditInfo: async () => ({ monthlyLimitUsd: 50, currentMonthUsageUsd: 49.9 }) });
    const r = await summarizeReport(WEEK, plan(), h.deps);
    expect(h.calls).toHaveLength(0);
    expect(r.skipped).toBe('budget_exceeded');
    expect(r.ai.batchWarnings).toEqual(['ai_budget_exceeded']);
    expect(r.budget!.estimatedUsd).toBeGreaterThan(0.1);

    // 사용액이 충분히 남아 있으면 호출한다
    const ok = harness({}, { getCreditInfo: async () => ({ monthlyLimitUsd: 50, currentMonthUsageUsd: 10 }) });
    expect((await summarizeReport(WEEK, plan(), ok.deps)).skipped).toBeNull();
    expect(ok.calls).toHaveLength(4);
  });

  it('a failing credit lookup does not block the calls', async () => {
    const h = harness({}, { getCreditInfo: async () => { throw new Error('db down'); } });
    const r = await summarizeReport(WEEK, plan(), h.deps);
    expect(r.skipped).toBeNull();
    expect(h.calls).toHaveLength(4);
  });

  it('run cap: an estimated maximum above WEEKLY_BRIEF_RUN_BUDGET_USD skips the calls', async () => {
    const h = harness({}, { env: { WEEKLY_BRIEF_MODEL: 'test-model-x', WEEKLY_BRIEF_RUN_BUDGET_USD: '0.05' } });
    const r = await summarizeReport(WEEK, plan(), h.deps);
    expect(h.calls).toHaveLength(0);
    expect(r.skipped).toBe('run_cap');
    expect(r.ai.batchWarnings).toEqual(['ai_run_cap']);
    expect(resolveRunBudgetUsd({})).toBe(0.6);
    expect(resolveRunBudgetUsd({ WEEKLY_BRIEF_RUN_BUDGET_USD: '1.5' })).toBe(1.5);
    expect(resolveRunBudgetUsd({ WEEKLY_BRIEF_RUN_BUDGET_USD: 'bad' })).toBe(0.6);
  });
});

describe('input shaping', () => {
  const prompts = () => (['A', 'B', 'C', 'D'] as const).map((c) => buildReportPrompt(c, plan()));

  it('every prompt stays within 24,000 characters', () => {
    for (const p of prompts()) {
      expect(p.totalChars).toBeLessThanOrEqual(REPORT_PROMPT_CHAR_LIMIT);
      expect(p.totalChars).toBe(p.system.length + p.user.length);
    }
  });

  it('never sends original text: no summary column / description / abstract excerpts, URLs or UUIDs; ids are the short ones', () => {
    for (const p of prompts()) {
      const text = p.system + p.user;
      for (const marker of [RAW_SUMMARY_MARKER, RAW_DESCRIPTION_MARKER, RAW_ABSTRACT_MARKER, 'Second raw', 'More abstract']) expect(text).not.toContain(marker);
      expect(p.user).not.toMatch(/https?:\/\//i);
      expect(p.user).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i);
      expect(p.user).not.toMatch(/"(content|description|abstract|originalText|summary|url)"/);
    }
    const a = JSON.parse(prompts()[0]!.user);
    expect(a.candidates[0].id).toMatch(/^h\d+$/);
    expect(a.candidates[0].evidence[0].ref).toMatch(/^e\d+$/);
    expect(a.watchPool[0].id).toMatch(/^w\d+$/);
    const b = JSON.parse(prompts()[1]!.user);
    expect(b.domains[0].items[0].ref).toMatch(/^d\d+$/);
    const c = JSON.parse(prompts()[2]!.user);
    expect(c.companies[0].ref).toMatch(/^c\d+$/);
    expect(c.companies[0].items[0].ref).toMatch(/^i\d+$/);
    expect(c.companies[0].ci[0].ref).toMatch(/^k\d+$/);
    expect(c.papers[0].ref).toMatch(/^p\d+$/);
    const d = JSON.parse(prompts()[3]!.user);
    expect(d.titles[0].id).toMatch(/^t\d+$/);
    expect(d.titles.length).toBeLessThanOrEqual(32);
    for (const t of d.titles) expect(Array.from(t.title as string).length).toBeLessThanOrEqual(80);
  });

  it('an article line sent to the model comes only from keyPoints, never from the summary column', () => {
    const p = JSON.parse(buildReportPrompt('B', plan()).user);
    const lines = p.domains.flatMap((d: any) => d.items.filter((i: any) => i.type === 'article').map((i: any) => i.line));
    expect(lines.some((l: string | undefined) => l?.includes('전시회') || l?.includes('양산'))).toBe(true);
    expect(JSON.stringify(p)).not.toContain('article first sentence');
  });

  it('shrinks in order: items per packet (6→4→3→2), then line length (120→80→50), then lowest-score packets', () => {
    expect(PROMPT_LADDER.map((l) => [l.items, l.line])).toEqual([[6, 120], [4, 120], [3, 120], [2, 120], [2, 80], [2, 50]]);
    const big = plan();
    for (const d of big.domains) for (const c of d.cards) c.aiLine = '가'.repeat(120);
    for (const d of big.domains) for (const c of d.cards) c.card.title = 'T'.repeat(200);
    const full = buildReportPrompt('B', big);
    expect(full.ladderLevel).toBe(0);
    const sizes = [full.totalChars];
    for (const limit of [full.totalChars - 1, 4800, 3600, 2800, 2400, 2000, 1500]) {
      const p = buildReportPrompt('B', big, limit);
      sizes.push(p.totalChars);
      if (p.totalChars <= limit) expect(p.totalChars).toBeLessThanOrEqual(limit);
    }
    // 단계가 올라갈수록 줄어든다
    for (let i = 1; i < sizes.length; i++) expect(sizes[i]!).toBeLessThanOrEqual(sizes[i - 1]!);
    const lv = [full.totalChars - 1, 4800, 3600, 2800, 2400, 2000].map((l) => buildReportPrompt('B', big, l));
    const levels = lv.map((p) => p.ladderLevel);
    expect([...levels].sort((a, b) => a - b)).toEqual(levels);
    // 맨 끝에서 패킷을 제거한다 (최소 1개는 남는다)
    const tiny = buildReportPrompt('B', big, 100);
    expect(tiny.droppedPackets).toBe(big.domains.filter((d) => d.status === 'active').length - 1);
    expect(tiny.packets).toBe(1);
    expect(tiny.ladderLevel).toBe(PROMPT_LADDER.length);
  });

  it('A prompt keeps the items cap per candidate and C drops papers before companies', () => {
    const p = plan();
    const a = buildReportPrompt('A', p, 3200);
    const parsed = JSON.parse(a.user);
    for (const c of parsed.candidates) expect(c.evidence.length).toBeLessThanOrEqual(3);
    const cFull = JSON.parse(buildReportPrompt('C', p).user);
    expect(cFull.papers.length).toBe(p.papers.length);
    const small = buildReportPrompt('C', p, 800);
    const cs = JSON.parse(small.user);
    expect(cs.papers.length).toBeLessThan(p.papers.length);
  });

  it('promptText strips urls, tags, control characters and clips', () => {
    expect(promptText('See https://x.example/a?b=1 now <b>bold</b>\nnext\u0000 line', 100)).toBe('See now bold next line');
    expect(promptText('가'.repeat(100), 10)).toBe('가'.repeat(9) + '…');
    expect(promptText(null, 10)).toBe('');
  });
});

describe('parsing helpers', () => {
  it('parseJsonObject extracts the object from surrounding text', () => {
    expect(parseJsonObject('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseJsonObject('no json')).toBeNull();
    expect(parseJsonObject('[1,2]')).toBeNull();
  });
  it('rescueTruncatedJson keeps complete elements and drops the cut-off one', () => {
    const cut = '{"companies":[{"ref":"c1","blurb":"가나다 \\"인용\\" 입니다","ciMeanings":[]},{"ref":"c2","blurb":"둘째","ciMeanings":[]},{"ref":"c3","blu';
    const r = rescueTruncatedJson(cut) as any;
    expect(r.companies.map((c: any) => c.ref)).toEqual(['c1', 'c2']);
    expect(rescueTruncatedJson('{"a":[1,2,{"b":')).toBeNull();
    expect(rescueTruncatedJson('plain')).toBeNull();
  });
});

describe('cost and model handling', () => {
  it('estimates the confirm-dialog cost from the current model price (about $0.32 for the report format)', () => {
    expect(estimateGenerationCostUsd('report', {})).toBe(0.32);
    expect(estimateGenerationCostUsd('poster', {})).toBe(0.03);
    expect(estimateGenerationCostUsd('report', { WEEKLY_BRIEF_MODEL: 'unpriced-test-model' })).toBeGreaterThan(0);
  });

  it('the model comes from the environment only: no model identifier is hard-coded in the new modules', () => {
    for (const f of ['weekly-brief-summarize-report.ts', 'weekly-brief-compose-report.ts', 'weekly-brief-text-guard.ts']) {
      const src = fs.readFileSync(path.resolve(here, '../../services', f), 'utf-8');
      expect(src, f).not.toMatch(MODEL_IDENTIFIER_RE);
    }
  });
});
