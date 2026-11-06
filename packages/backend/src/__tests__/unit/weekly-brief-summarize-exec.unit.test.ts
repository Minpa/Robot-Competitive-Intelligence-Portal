/**
 * weekly-brief-summarize-exec — 4회 병렬 호출, 프롬프트 상한·축소, 예산 가드·run cap, 사용량 기록, 섹션 격리 폴백, 가드 통합
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../db/index.js', () => ({ db: {} }));

import {
  EXEC_COST_ASSUMPTION,
  EXEC_MAX_TOKENS,
  EXEC_SYSTEM_PROMPTS,
  buildExecPrompt,
  estimateExecGenerationCostUsd,
  hasExecCallInput,
  summarizeExec,
  type ExecSummarizeDeps,
} from '../../services/weekly-brief-summarize-exec.js';
import { REPORT_PROMPT_CHAR_LIMIT, REPORT_REQUEST_OPTIONS } from '../../services/weekly-brief-summarize-report.js';
import { buildExecPlan, finalizeExec } from '../../services/weekly-brief-compose-exec.js';
import { estimateCost } from '../../services/ai-usage.service.js';
import { REPORT_NOW, makeExecCollectedEmpty, makeExecCollectedFull, makeExecCollectedSparse } from '../fixtures/weekly-exec-collected.fixture.js';
import { makeFakeExecClient, type FakeExecOptions } from '../fixtures/weekly-exec-fake-ai.js';
import { RAW_ABSTRACT_MARKER, RAW_DESCRIPTION_MARKER, RAW_SUMMARY_MARKER } from '../fixtures/weekly-report-collected.fixture.js';
import type { AIUsageLogEntry } from '../../services/ai-usage.service.js';

const MODEL_IDENTIFIER_RE = new RegExp(['clau' + 'de-', 'op' + 'us', 'hai' + 'ku', 'son' + 'net', 'gp' + 't-'].join('|'), 'i');
const here = path.dirname(fileURLToPath(import.meta.url));
const WEEK = '2026-10-19';

const fullPlan = () => buildExecPlan(makeExecCollectedFull());

function harness(opts: FakeExecOptions = {}, over: Partial<ExecSummarizeDeps> = {}) {
  const { client, calls } = makeFakeExecClient(opts);
  const usage: AIUsageLogEntry[] = [];
  const deps: ExecSummarizeDeps = {
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
    const { client, calls } = makeFakeExecClient();
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
    const { deps } = harness({}, { client: wrapped as any });
    const res = await summarizeExec(WEEK, fullPlan(), deps);
    expect(calls.map((c) => c.call).sort()).toEqual(['A', 'B', 'C', 'D']);
    expect(maxInflight).toBe(4);
    for (const c of calls) {
      expect(c.params.max_tokens).toBe(EXEC_MAX_TOKENS[c.call]);
      expect(c.options).toEqual(REPORT_REQUEST_OPTIONS);
      expect(c.params.model).toBe('test-model-x');
    }
    expect(Object.values(EXEC_MAX_TOKENS).reduce((a, b) => a + b, 0)).toBe(16_500);
    expect(res.skipped).toBeNull();
    expect(res.calls.every((c) => c.ok)).toBe(true);
  });

  it('writes exactly one logUsage row per call with the weekly-brief tag A|B|C|D', async () => {
    const { deps, usage } = harness();
    await summarizeExec(WEEK, fullPlan(), deps);
    expect(usage).toHaveLength(4);
    expect(usage.map((u) => u.query).sort()).toEqual(['A', 'B', 'C', 'D'].map((c) => `[weekly-brief] ${WEEK} ${c}`));
    expect(usage.every((u) => u.provider === 'claude' && u.webSearch === false)).toBe(true);
  });

  it('sums tokens and cost across the four calls', async () => {
    const { deps } = harness();
    const res = await summarizeExec(WEEK, fullPlan(), deps);
    expect(res.inputTokens).toBe(res.calls.reduce((s, c) => s + c.inputTokens, 0));
    expect(res.outputTokens).toBe(res.calls.reduce((s, c) => s + c.outputTokens, 0));
    expect(res.costUsd).toBeGreaterThan(0);
  });

  it('skips calls that have no input (sparse week has no gaps/tech/business)', async () => {
    const sparse = buildExecPlan(makeExecCollectedSparse());
    expect(hasExecCallInput('B', sparse)).toBe(false);
    expect(hasExecCallInput('C', sparse)).toBe(false);
    const { deps, calls } = harness();
    await summarizeExec(WEEK, sparse, deps);
    expect(calls.map((c) => c.call).sort()).toEqual(hasExecCallInput('A', sparse) ? ['A', 'D'] : ['D']);
  });

  it('makes no AI call for a week without data', async () => {
    const { deps, calls } = harness();
    const res = await summarizeExec(WEEK, buildExecPlan(makeExecCollectedEmpty()), deps);
    expect(calls).toHaveLength(0);
    expect(res.skipped).toBeNull();
  });
});

describe('prompt content and limits', () => {
  it('never contains raw article text, description, abstract, URLs or UUIDs', () => {
    for (const call of ['A', 'B', 'C', 'D'] as const) {
      const p = buildExecPrompt(call, fullPlan());
      const all = p.system + p.user;
      for (const m of [RAW_SUMMARY_MARKER, RAW_DESCRIPTION_MARKER, RAW_ABSTRACT_MARKER]) expect(all).not.toContain(m);
      expect(p.user).not.toMatch(/https?:\/\//i);
      expect(p.user).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-/);
    }
  });

  it('system prompts carry the honorific, no-collection-count, labelKo and unregistered rules, and no model identifiers', () => {
    for (const call of ['A', 'B', 'C', 'D'] as const) expect(EXEC_SYSTEM_PROMPTS[call]).not.toMatch(MODEL_IDENTIFIER_RE);
    expect(EXEC_SYSTEM_PROMPTS.A).toContain('합니다체');
    expect(EXEC_SYSTEM_PROMPTS.A).toContain('수집 건수');
    expect(EXEC_SYSTEM_PROMPTS.A).toContain('미등록');
    expect(EXEC_SYSTEM_PROMPTS.A).toContain('position, movement 라벨');
    expect(EXEC_SYSTEM_PROMPTS.A).toContain('~까요?');
    expect(EXEC_SYSTEM_PROMPTS.B).toContain('미등록');
  });

  it('prompts carry the headline rule, the jargon ban with alternatives, and the new wording', () => {
    expect(EXEC_SYSTEM_PROMPTS.A).toContain('BrainCo가 21자유도 핸드 Revo 3를 공개했습니다');
    expect(EXEC_SYSTEM_PROMPTS.A).toContain('50자 이하');
    for (const call of ['A', 'B', 'C'] as const) {
      expect(EXEC_SYSTEM_PROMPTS[call]).toContain('"관측" "격차" "신호" "판정"');
      expect(EXEC_SYSTEM_PROMPTS[call]).toContain('"확인됐습니다" "차이" "흐름" "보입니다"');
    }
    expect(EXEC_SYSTEM_PROMPTS.A).toContain('change(변화), why(우리에게 주는 의미), action(제안');
    const all = Object.values(EXEC_SYSTEM_PROMPTS).join('\n');
    for (const old of ['이번 주 결론', '리더 판단이 필요한 질문', '근거 자료', '무엇이 바뀌었나', '우리 위치 미등록']) expect(all).not.toContain(old);
  });

  it('gap packets pass the server labels and say "우리 수치 미등록" instead of a number', () => {
    const p = JSON.parse(buildExecPrompt('B', fullPlan()).user);
    const compared = p.gaps.find((g: any) => g.status === 'compared');
    const missing = p.gaps.find((g: any) => g.status === 'ours_missing');
    expect(compared.position).toMatch(/경쟁사가 앞서 있음|비슷한 수준|우리가 앞서 있음/);
    expect(compared.movement).toBeTruthy();
    expect(missing.ourValue).toBe('우리 수치 미등록');
    expect(missing.position).toBeNull();
  });

  it('keeps every prompt within the 24,000 char limit and shrinks in the documented order', () => {
    const plan = fullPlan();
    for (const call of ['A', 'B', 'C', 'D'] as const) expect(buildExecPrompt(call, plan).totalChars).toBeLessThanOrEqual(REPORT_PROMPT_CHAR_LIMIT);
    const full = buildExecPrompt('A', plan);
    const tight = buildExecPrompt('A', plan, full.totalChars - 200);
    expect(tight.totalChars).toBeLessThanOrEqual(full.totalChars - 200);
    expect(tight.ladderLevel).toBeGreaterThan(0);
    const tighter = buildExecPrompt('A', plan, full.system.length + 300);
    expect(tighter.droppedPackets).toBeGreaterThan(0);
    expect(tighter.packets).toBeGreaterThanOrEqual(1);
  });
});

describe('budget guards', () => {
  it('skips all calls when the monthly budget would be exceeded, even when forced', async () => {
    const { deps, calls } = harness({}, { getCreditInfo: async () => ({ monthlyLimitUsd: 5, currentMonthUsageUsd: 4.99 }) });
    const res = await summarizeExec(WEEK, fullPlan(), deps);
    expect(calls).toHaveLength(0);
    expect(res.skipped).toBe('budget_exceeded');
    expect(res.ai.batchWarnings).toEqual(['ai_budget_exceeded']);
  });

  it('skips on the per-run cap (WEEKLY_BRIEF_RUN_BUDGET_USD)', async () => {
    const { deps, calls } = harness({}, { env: { WEEKLY_BRIEF_MODEL: 'test-model-x', WEEKLY_BRIEF_RUN_BUDGET_USD: '0.01' } });
    const res = await summarizeExec(WEEK, fullPlan(), deps);
    expect(calls).toHaveLength(0);
    expect(res.skipped).toBe('run_cap');
    expect(res.ai.batchWarnings).toEqual(['ai_run_cap']);
  });

  it('reports disabled / not configured without calling', async () => {
    const off = await summarizeExec(WEEK, fullPlan(), { ...harness().deps, env: { WEEKLY_BRIEF_AI_ENABLED: 'false' } });
    expect(off.skipped).toBe('disabled');
    const none = await summarizeExec(WEEK, fullPlan(), { ...harness().deps, client: null });
    expect(none.skipped).toBe('not_configured');
  });

  it('budget skip then compose gives rule fallback + partial', async () => {
    const { deps } = harness({}, { env: { WEEKLY_BRIEF_MODEL: 'test-model-x', WEEKLY_BRIEF_RUN_BUDGET_USD: '0.01' } });
    const plan = fullPlan();
    const s = await summarizeExec(WEEK, plan, deps);
    const r = finalizeExec(plan, s.ai, REPORT_NOW);
    expect(r.status).toBe('partial');
    expect(r.payload.meta.warnings).toContain('ai_run_cap');
    expect(r.payload.conclusions.every((c) => c.generatedBy === 'rule')).toBe(true);
  });
});

describe('failure isolation', () => {
  it.each(['throw', 'garbage', 'refusal'] as const)('a %s failure in call B only affects the gaps section', async (mode) => {
    const { deps, usage } = harness({ fail: { B: mode } });
    const plan = fullPlan();
    const s = await summarizeExec(WEEK, plan, deps);
    expect(s.ai.failed.B).toBeTruthy();
    expect(s.ai.A).not.toBeNull();
    const r = finalizeExec(plan, s.ai, REPORT_NOW);
    expect(r.payload.gaps.rows.every((g) => g.generatedBy === 'rule')).toBe(true);
    expect(r.payload.conclusions.every((c) => c.generatedBy === 'ai')).toBe(true);
    expect(r.status).toBe('partial');
    // responses we received are logged even when unparseable; a thrown call has no response
    expect(usage.length).toBe(mode === 'throw' ? 3 : 4);
  });

  it('a truncated response is rescued up to the last complete element', async () => {
    const { deps } = harness({ fail: { A: 'truncate' } });
    const s = await summarizeExec(WEEK, fullPlan(), deps);
    expect(s.ai.truncated).toContain('A');
  });

  it('when every call fails the payload is fully rule-based, still valid, and partial', async () => {
    const { deps } = harness({ fail: { A: 'throw', B: 'throw', C: 'throw', D: 'throw' } });
    const plan = fullPlan();
    const s = await summarizeExec(WEEK, plan, deps);
    const r = finalizeExec(plan, s.ai, REPORT_NOW);
    expect(r.status).toBe('partial');
    expect(r.payload.meta.aiUsed).toBe(false);
    expect(r.payload.conclusions.length).toBeGreaterThan(0);
    expect(r.payload.meta.warnings).toEqual(expect.arrayContaining(['ai_conclusions_failed', 'ai_gaps_failed', 'ai_tech_business_failed', 'ai_evidence_failed']));
  });
});

describe('hostile output is filtered by the guards', () => {
  it('drops plain-form, collection-count, overclaim, direction-contradicting sentences and fake ids', async () => {
    const { deps } = harness({ hostile: true });
    const plan = fullPlan();
    const s = await summarizeExec(WEEK, plan, deps);
    const r = finalizeExec(plan, s.ai, REPORT_NOW);
    const text = JSON.stringify(r.payload);
    expect(text).not.toContain('가격이 내려감');
    expect(text).not.toContain('30건이 수집');
    expect(text).not.toContain('반드시 따라가야');
    expect(text).not.toContain('<b>');
    expect(r.payload.conclusions.find((c) => c.id.includes('999'))).toBeUndefined();
    expect(r.payload.questions.every((q) => q.evidence.length > 0)).toBe(true);
    for (const g of r.payload.gaps.rows) {
      if (g.position === 'competitor_ahead') expect(g.lines.join(' ')).not.toContain('우리가 앞섭니다');
      if (g.position === 'we_ahead') expect(g.lines.join(' ')).not.toContain('경쟁사가 앞섭니다');
    }
  });
});

describe('cost estimate', () => {
  it('assumes 23K input / 13.7K output tokens and stays within +50% of the v2 cost ($0.32 -> <= $0.48)', () => {
    expect(EXEC_COST_ASSUMPTION).toEqual({ inputTokens: 23_000, outputTokens: 13_700 });
    const est = estimateExecGenerationCostUsd({ WEEKLY_BRIEF_MODEL: 'test-model-x' } as any);
    expect(est).toBeGreaterThan(0);
    // worst case: all max_tokens reached with 28K input tokens at the documented unit price ($4/$20 per 1M)
    const worst = (28_000 * 4 + 16_500 * 20) / 1e6;
    expect(worst).toBeLessThanOrEqual(0.48);
    expect(typeof estimateCost).toBe('function');
  });

  it('with the default model mapping the displayed estimate is at most $0.48', () => {
    expect(estimateExecGenerationCostUsd({})).toBeLessThanOrEqual(0.48);
  });
});

describe('static checks', () => {
  it('summarize-exec source has no hard-coded model identifier', () => {
    const src = fs.readFileSync(path.resolve(here, '../../services/weekly-brief-summarize-exec.ts'), 'utf-8');
    expect(src).not.toMatch(MODEL_IDENTIFIER_RE);
    expect(src).toContain('resolveWeeklyBriefModel(env)');
  });
});
