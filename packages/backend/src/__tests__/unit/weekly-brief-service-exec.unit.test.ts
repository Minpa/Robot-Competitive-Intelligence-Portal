/**
 * weekly-brief.service v3(임원판) — 초안 저장·발행·내리기·편집·재생성 규칙, 존재 확인, REQUIRE_REVIEW, 훅, 트랜잭션 롤백
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/index.js', async () => {
  const schema = await import('../../db/schema.js');
  return { ...schema, db: {} };
});
vi.mock('../../services/data-migration.service.js', () => ({ dataMigrationService: { get: vi.fn(async () => null), upsert: vi.fn(async () => undefined) } }));
vi.mock('../../services/ai-usage.service.js', () => ({
  aiUsageService: { getClaudeCreditInfo: vi.fn(), logUsage: vi.fn() },
  resolveClaudeMonthlyLimitUsd: () => 50,
  estimateCost: () => 0.01,
}));

import {
  __resetWeeklyBriefStateForTests,
  getAdminEdits,
  getDraftSummary,
  hasUnpublishedChanges,
  listDrafts,
  publishDraft,
  resolveRequireReview,
  resolveWeeklyBriefFormat,
  runWeeklyBrief,
  saveEdits,
  setWeeklyBriefSuccessHook,
  startWeeklyBriefGeneration,
  unpublishDraft,
  type DraftRepo,
  type DraftRow,
  type StoredBriefRow,
  type WeeklyBriefDeps,
} from '../../services/weekly-brief.service.js';
import { summarizeExec } from '../../services/weekly-brief-summarize-exec.js';
import { getWeekRange } from '../../services/weekly-brief-period.js';
import { makeExecCollectedFull } from '../fixtures/weekly-exec-collected.fixture.js';
import { makeFakeExecClient } from '../fixtures/weekly-exec-fake-ai.js';
import type { WeeklyExecutivePayload } from '../../types/weekly-brief.js';

const NOW = new Date('2026-10-25T23:00:00Z');
const WEEK = '2026-10-19';

/** 메모리 초안 저장소 — 트랜잭션은 예외 시 이전 상태로 되돌린다 */
function memoryRepo() {
  const drafts = new Map<string, DraftRow>();
  const published = new Map<string, StoredBriefRow>();
  const repo: DraftRepo & { failPublishWrite?: boolean } = {
    async get(w) {
      return drafts.get(w) ? structuredClone(drafts.get(w)!) : null;
    },
    async getForUpdate(_ex, w) {
      return repo.get(w);
    },
    async list() {
      return [...drafts.values()].map((d) => structuredClone(d)).sort((a, b) => b.weekStart.localeCompare(a.weekStart));
    },
    async upsert(_ex, row) {
      drafts.set(row.weekStart, structuredClone(row));
    },
    async update(_ex, w, patch) {
      drafts.set(w, { ...drafts.get(w)!, ...structuredClone(patch) });
    },
    async writePublished(_ex, row) {
      if (repo.failPublishWrite) throw new Error('db down');
      published.set(row.weekStart, structuredClone(row));
    },
    async deletePublished(_ex, w) {
      published.delete(w);
    },
    async transaction(fn) {
      const snapD = structuredClone([...drafts.entries()]);
      const snapP = structuredClone([...published.entries()]);
      try {
        return await fn({});
      } catch (e) {
        drafts.clear();
        published.clear();
        snapD.forEach(([k, v]) => drafts.set(k, v));
        snapP.forEach(([k, v]) => published.set(k, v));
        throw e;
      }
    },
  };
  return { repo, drafts, published };
}

function makeDeps(mem: ReturnType<typeof memoryRepo>, over: Partial<WeeklyBriefDeps> = {}, env: Record<string, string> = {}) {
  const fake = makeFakeExecClient();
  const calls = { collectExec: 0, summarizeExec: 0 };
  const deps: WeeklyBriefDeps = {
    now: () => NOW,
    env,
    timeoutMs: 5_000,
    getExistingStatus: async (w) => mem.published.get(w)?.status ?? null,
    withLock: async (fn) => ({ locked: true, value: await fn({}) }),
    collect: async () => {
      throw new Error('v1/v2 collect must not run for the executive format');
    },
    summarize: async () => {
      throw new Error('unused');
    },
    summarizeReport: async () => {
      throw new Error('unused');
    },
    collectExec: async () => {
      calls.collectExec++;
      return makeExecCollectedFull();
    },
    summarizeExec: async (weekStart, plan) => {
      calls.summarizeExec++;
      return summarizeExec(weekStart, plan, { client: fake.client as any, env: { WEEKLY_BRIEF_MODEL: 'test-model-x' }, getCreditInfo: async () => ({ monthlyLimitUsd: 50, currentMonthUsageUsd: 0 }), logUsage: async () => undefined, log: () => {} });
    },
    writeRow: async (_ex, row) => {
      mem.published.set(row.weekStart, row);
    },
    getDraft: async (w) => mem.repo.get(w),
    writeDraft: async (ex, row) => mem.repo.upsert(ex, row),
    saveLast: async () => undefined,
    log: () => {},
    ...over,
  };
  return { deps, calls, fake };
}

beforeEach(() => {
  __resetWeeklyBriefStateForTests();
  setWeeklyBriefSuccessHook(null);
});

describe('config', () => {
  it('format: executive by default, report/poster accepted, unknown => executive; REQUIRE_REVIEW defaults to true', () => {
    expect(resolveWeeklyBriefFormat({})).toBe('executive');
    expect(resolveWeeklyBriefFormat({ WEEKLY_BRIEF_FORMAT: 'report' })).toBe('report');
    expect(resolveWeeklyBriefFormat({ WEEKLY_BRIEF_FORMAT: 'POSTER' })).toBe('poster');
    expect(resolveWeeklyBriefFormat({ WEEKLY_BRIEF_FORMAT: 'xyz' })).toBe('executive');
    expect(resolveRequireReview({})).toBe(true);
    expect(resolveRequireReview({ WEEKLY_BRIEF_REQUIRE_REVIEW: 'false' })).toBe(false);
    expect(resolveRequireReview({ WEEKLY_BRIEF_REQUIRE_REVIEW: 'TRUE' })).toBe(true);
  });
});

describe('generation with REQUIRE_REVIEW=true (default)', () => {
  it('saves only a draft: weekly_briefs untouched, no ARGOS_I hook, v3 payload, tokens summed', async () => {
    const mem = memoryRepo();
    const { deps, calls, fake } = makeDeps(mem);
    const hook = vi.fn();
    setWeeklyBriefSuccessHook(hook);
    const out = await runWeeklyBrief({ reason: 'cron' }, deps);
    expect(out).toMatchObject({ outcome: 'created', weekStart: WEEK });
    expect(['ok', 'partial']).toContain(out.status);
    expect(calls).toEqual({ collectExec: 1, summarizeExec: 1 });
    expect(fake.calls.map((c) => c.call).sort()).toEqual(['A', 'B', 'C', 'D']);
    expect(mem.published.size).toBe(0);
    expect(hook).not.toHaveBeenCalled();
    const d = mem.drafts.get(WEEK)!;
    expect(d.publishState).toBe('draft');
    expect(d.editRev).toBe(0);
    expect(d.edits).toEqual({});
    expect((d.aiPayload as WeeklyExecutivePayload).schemaVersion).toBe(3);
    expect(d.inputTokens).toBeGreaterThan(0);
    expect(d.outputTokens).toBeGreaterThan(0);
    expect(hasUnpublishedChanges(d)).toBe(true);
  });

  it('REQUIRE_REVIEW=false publishes immediately like v2 and fires the hook once', async () => {
    const mem = memoryRepo();
    const { deps } = makeDeps(mem, {}, { WEEKLY_BRIEF_REQUIRE_REVIEW: 'false' });
    const hook = vi.fn();
    setWeeklyBriefSuccessHook(hook);
    const out = await runWeeklyBrief({ reason: 'cron' }, deps);
    expect(out.outcome).toBe('created');
    expect(mem.drafts.size).toBe(0);
    expect((mem.published.get(WEEK)!.payload as any).schemaVersion).toBe(3);
    expect(hook).toHaveBeenCalledTimes(1);
  });

  it('a draft counts as "exists": cron and startup catch-up skip the week without calling the AI', async () => {
    const mem = memoryRepo();
    const a = makeDeps(mem);
    await runWeeklyBrief({ reason: 'cron' }, a.deps);
    const b = makeDeps(mem);
    const again = await runWeeklyBrief({ reason: 'startup' }, b.deps);
    expect(again.outcome).toBe('skipped_exists');
    expect(b.calls.collectExec).toBe(0);
    const start = await startWeeklyBriefGeneration({ weekStart: WEEK }, b.deps);
    expect(start).toMatchObject({ started: false, skipped: 'exists' });
  });

  it('a failed result is not saved as a draft', async () => {
    const mem = memoryRepo();
    const { deps } = makeDeps(mem, {
      collectExec: async () => {
        throw new Error('db down');
      },
    });
    const out = await runWeeklyBrief({ reason: 'manual' }, deps);
    expect(out.outcome).toBe('failed');
    expect(mem.drafts.size).toBe(0);
    expect(mem.published.get(WEEK)?.status).toBe('failed');
  });
});

describe('editing', () => {
  async function seeded() {
    const mem = memoryRepo();
    await runWeeklyBrief({ reason: 'cron' }, makeDeps(mem).deps);
    const d = mem.drafts.get(WEEK)!;
    const ai = d.aiPayload as WeeklyExecutivePayload;
    const path = `conclusions.${ai.conclusions[0]!.id}.lines.1`;
    return { mem, d, ai, path };
  }

  it('saves an edit: rev+1, history entry, ai_payload unchanged, effective text applied', async () => {
    const { mem, ai, path } = await seeded();
    const aiBefore = JSON.stringify(ai);
    const r = await saveEdits(WEEK, { rev: 0, edits: { [path]: '관리자가 고친 문장입니다.' }, by: 'admin@example.com' }, mem.repo, NOW);
    expect(r).toMatchObject({ ok: true, rev: 1, warnings: [] });
    const d = mem.drafts.get(WEEK)!;
    expect(d.editRev).toBe(1);
    expect(d.editedBy).toBe('admin@example.com');
    expect(d.history).toHaveLength(1);
    expect(d.history[0]).toMatchObject({ action: 'edit', by: 'admin@example.com', paths: [path] });
    expect(d.history[0]!.before[path]).toBe(ai.conclusions[0]!.lines[1]!.text);
    expect(JSON.stringify(d.aiPayload)).toBe(aiBefore);
    const view = await getAdminEdits(WEEK, mem.repo);
    expect(view.ok && view.value.effective.payload.schemaVersion === 3 && (view.value.effective.payload as WeeklyExecutivePayload).conclusions[0]!.lines[1]!.text).toBe('관리자가 고친 문장입니다.');
    expect(view.ok && view.value.limits).toEqual({ sentence: 200, headline: 50, question: 200, implication: 100 });
  });

  it('rev mismatch => rev_conflict and nothing changes; stale second save conflicts', async () => {
    const { mem, path } = await seeded();
    expect(await saveEdits(WEEK, { rev: 5, edits: { [path]: '문장입니다.' }, by: null }, mem.repo)).toEqual({ ok: false, error: 'rev_conflict' });
    await saveEdits(WEEK, { rev: 0, edits: { [path]: '첫 편집입니다.' }, by: null }, mem.repo);
    expect(await saveEdits(WEEK, { rev: 0, edits: { [path]: '두 번째입니다.' }, by: null }, mem.repo)).toEqual({ ok: false, error: 'rev_conflict' });
    expect(mem.drafts.get(WEEK)!.edits[path]).toBe('첫 편집입니다.');
  });

  it('invalid edits are rejected whole (unknown path, <, URL, too long) and warnings do not block saving', async () => {
    const { mem, path } = await seeded();
    expect(await saveEdits(WEEK, { rev: 0, edits: { 'conclusions.zzz.lines.0': '문장입니다.' }, by: null }, mem.repo)).toMatchObject({ ok: false, error: 'invalid_edit', code: 'unknown_path' });
    expect(await saveEdits(WEEK, { rev: 0, edits: { [path]: '<i>나쁨</i>' }, by: null }, mem.repo)).toMatchObject({ ok: false, error: 'invalid_edit', code: 'forbidden_char' });
    expect(await saveEdits(WEEK, { rev: 0, edits: { [path]: '가'.repeat(300) }, by: null }, mem.repo)).toMatchObject({ ok: false, error: 'invalid_edit', code: 'too_long' });
    expect(mem.drafts.get(WEEK)!.editRev).toBe(0);
    const warn = await saveEdits(WEEK, { rev: 0, edits: { [path]: '평어체로 썼다 9999' }, by: null }, mem.repo);
    expect(warn).toMatchObject({ ok: true, rev: 1 });
    expect(warn.ok && warn.warnings[0]!.codes).toEqual(expect.arrayContaining(['ending', 'number']));
  });

  it('null reverts to the AI text', async () => {
    const { mem, path } = await seeded();
    await saveEdits(WEEK, { rev: 0, edits: { [path]: '고친 문장입니다.' }, by: null }, mem.repo);
    const r = await saveEdits(WEEK, { rev: 1, edits: { [path]: null }, by: null }, mem.repo);
    expect(r).toMatchObject({ ok: true, rev: 2 });
    expect(mem.drafts.get(WEEK)!.edits).toEqual({});
  });

  it('keeps at most 50 history entries', async () => {
    const { mem, path } = await seeded();
    for (let i = 0; i < 55; i++) await saveEdits(WEEK, { rev: i, edits: { [path]: `편집 ${i}번입니다.` }, by: null }, mem.repo);
    expect(mem.drafts.get(WEEK)!.history).toHaveLength(50);
    expect(mem.drafts.get(WEEK)!.editRev).toBe(55);
  });

  it('returns not_found for a week without a draft', async () => {
    const mem = memoryRepo();
    expect(await saveEdits(WEEK, { rev: 0, edits: {}, by: null }, mem.repo)).toEqual({ ok: false, error: 'not_found' });
    expect(await getAdminEdits(WEEK, mem.repo)).toEqual({ ok: false, error: 'not_found' });
  });
});

describe('publish / unpublish', () => {
  async function seeded() {
    const mem = memoryRepo();
    await runWeeklyBrief({ reason: 'cron' }, makeDeps(mem).deps);
    const ai = mem.drafts.get(WEEK)!.aiPayload as WeeklyExecutivePayload;
    return { mem, ai, path: `conclusions.${ai.conclusions[0]!.id}.lines.1` };
  }

  it('publishes the effective payload into weekly_briefs, marks the draft published, and calls the hook after commit', async () => {
    const { mem, path } = await seeded();
    await saveEdits(WEEK, { rev: 0, edits: { [path]: '발행될 문장입니다.' }, by: 'a@x.com' }, mem.repo);
    const hook = vi.fn(() => {
      expect(mem.published.has(WEEK)).toBe(true); // 커밋 뒤에 호출
    });
    setWeeklyBriefSuccessHook(hook);
    const r = await publishDraft(WEEK, { rev: 1, by: 'a@x.com' }, mem.repo, NOW);
    expect(r).toMatchObject({ ok: true, publishState: 'published' });
    expect(hook).toHaveBeenCalledTimes(1);
    const pub = mem.published.get(WEEK)!;
    expect((pub.payload as any).conclusions[0].lines[1].text).toBe('발행된 문장입니다.'.replace('발행된', '발행될'));
    expect(JSON.stringify(pub.payload)).not.toMatch(/editedBy|edit_rev|editRev|"history"|publishedBy/);
    const d = mem.drafts.get(WEEK)!;
    expect(d).toMatchObject({ publishState: 'published', publishedRev: 1, publishedBy: 'a@x.com' });
    expect(hasUnpublishedChanges(d)).toBe(false);
    expect(d.history.at(-1)!.action).toBe('publish');
  });

  it('is idempotent when the same rev is already published (no second write, no second hook)', async () => {
    const { mem } = await seeded();
    const hook = vi.fn();
    setWeeklyBriefSuccessHook(hook);
    await publishDraft(WEEK, { rev: 0, by: null }, mem.repo, NOW);
    const r2 = await publishDraft(WEEK, { rev: 0, by: null }, mem.repo, new Date(NOW.getTime() + 1000));
    expect(r2).toMatchObject({ ok: true, publishState: 'published' });
    expect(hook).toHaveBeenCalledTimes(1);
  });

  it('rev_conflict, not_found and guard_failed (re-validation on publish)', async () => {
    const { mem, path } = await seeded();
    expect(await publishDraft(WEEK, { rev: 9, by: null }, mem.repo)).toEqual({ ok: false, error: 'rev_conflict' });
    expect(await publishDraft('2026-01-05', { rev: 0, by: null }, mem.repo)).toEqual({ ok: false, error: 'not_found' });
    // 저장 경로를 우회해 나쁜 편집이 들어간 경우 (예: 수동 DB 수정) 발행이 막힌다
    mem.drafts.set(WEEK, { ...mem.drafts.get(WEEK)!, edits: { [path]: '<script>x</script>' } });
    const r = await publishDraft(WEEK, { rev: 0, by: null }, mem.repo);
    expect(r).toMatchObject({ ok: false, error: 'guard_failed', violations: [{ path, code: 'forbidden_char' }] });
    expect(mem.published.size).toBe(0);
  });

  it('a failed write rolls the transaction back: the draft stays unpublished and no hook fires', async () => {
    const { mem } = await seeded();
    const hook = vi.fn();
    setWeeklyBriefSuccessHook(hook);
    mem.repo.failPublishWrite = true;
    await expect(publishDraft(WEEK, { rev: 0, by: null }, mem.repo)).rejects.toThrow('db down');
    expect(mem.drafts.get(WEEK)!.publishState).toBe('draft');
    expect(mem.published.size).toBe(0);
    expect(hook).not.toHaveBeenCalled();
  });

  it('a hook failure does not undo the publication', async () => {
    const { mem } = await seeded();
    setWeeklyBriefSuccessHook(() => {
      throw new Error('export failed');
    });
    const r = await publishDraft(WEEK, { rev: 0, by: null }, mem.repo);
    expect(r.ok).toBe(true);
    expect(mem.published.has(WEEK)).toBe(true);
  });

  it('editing after publishing shows "published with unpublished changes"; re-publishing updates weekly_briefs', async () => {
    const { mem, path } = await seeded();
    await publishDraft(WEEK, { rev: 0, by: null }, mem.repo);
    await saveEdits(WEEK, { rev: 0, edits: { [path]: '발행 뒤 고친 문장입니다.' }, by: null }, mem.repo);
    const d = mem.drafts.get(WEEK)!;
    expect(d.publishState).toBe('published');
    expect(hasUnpublishedChanges(d)).toBe(true);
    expect((mem.published.get(WEEK)!.payload as any).conclusions[0].lines[1].text).not.toBe('발행 뒤 고친 문장입니다.');
    await publishDraft(WEEK, { rev: 1, by: null }, mem.repo);
    expect((mem.published.get(WEEK)!.payload as any).conclusions[0].lines[1].text).toBe('발행 뒤 고친 문장입니다.');
  });

  it('unpublish deletes the published row, returns the draft to draft state and records history; unknown week => not_found', async () => {
    const { mem } = await seeded();
    await publishDraft(WEEK, { rev: 0, by: null }, mem.repo);
    const r = await unpublishDraft(WEEK, { by: 'a@x.com' }, mem.repo, NOW);
    expect(r).toEqual({ ok: true, publishState: 'draft', changed: true });
    expect(mem.published.has(WEEK)).toBe(false);
    const d = mem.drafts.get(WEEK)!;
    expect(d.publishState).toBe('draft');
    expect(d.history.at(-1)).toMatchObject({ action: 'unpublish', by: 'a@x.com' });
    expect(await unpublishDraft(WEEK, { by: null }, mem.repo)).toEqual({ ok: true, publishState: 'draft', changed: false });
    expect(await unpublishDraft('2026-01-05', { by: null }, mem.repo)).toEqual({ ok: false, error: 'not_found' });
  });
});

describe('regeneration (force)', () => {
  async function seeded(opts: { publish?: boolean; edit?: boolean } = {}) {
    const mem = memoryRepo();
    await runWeeklyBrief({ reason: 'cron' }, makeDeps(mem).deps);
    const ai = mem.drafts.get(WEEK)!.aiPayload as WeeklyExecutivePayload;
    const path = `conclusions.${ai.conclusions[0]!.id}.lines.1`;
    if (opts.edit) await saveEdits(WEEK, { rev: 0, edits: { [path]: '편집한 문장입니다.' }, by: 'a@x.com' }, mem.repo);
    if (opts.publish) await publishDraft(WEEK, { rev: opts.edit ? 1 : 0, by: null }, mem.repo);
    return { mem, path };
  }

  it('a draft without edits is replaced by force (rev 0), with the AI called once', async () => {
    const { mem } = await seeded();
    const again = makeDeps(mem);
    const r = await startWeeklyBriefGeneration({ weekStart: WEEK, force: true }, again.deps);
    expect(r).toMatchObject({ started: true, force: true });
    await vi.waitFor(() => expect(again.calls.summarizeExec).toBe(1));
    await vi.waitFor(() => expect(mem.drafts.get(WEEK)!.generatedAt.getTime()).toBe(NOW.getTime()));
  });

  it('an edited draft needs discardEdits: 409 has_edits otherwise; discardEdits keeps the old edit text in history', async () => {
    const { mem, path } = await seeded({ edit: true });
    const blocked = makeDeps(mem);
    expect(await startWeeklyBriefGeneration({ weekStart: WEEK, force: true }, blocked.deps)).toMatchObject({ started: false, skipped: 'has_edits' });
    expect(blocked.calls.collectExec).toBe(0);
    const go = makeDeps(mem);
    expect(await startWeeklyBriefGeneration({ weekStart: WEEK, force: true, discardEdits: true, actor: 'a@x.com' }, go.deps)).toMatchObject({ started: true });
    await vi.waitFor(() => expect(mem.drafts.get(WEEK)!.editRev).toBe(0));
    await vi.waitFor(() => expect(mem.drafts.get(WEEK)!.history.some((h) => h.action === 'regenerate')).toBe(true));
    const d = mem.drafts.get(WEEK)!;
    expect(d.edits).toEqual({});
    const reg = d.history.find((h) => h.action === 'regenerate')!;
    expect(reg).toMatchObject({ by: 'a@x.com', paths: [path] });
    expect(reg.before[path]).toBe('편집한 문장입니다.');
  });

  it('regenerating a published week leaves weekly_briefs unchanged (users keep the old published brief)', async () => {
    const { mem } = await seeded({ publish: true });
    const publishedBefore = JSON.stringify(mem.published.get(WEEK));
    const go = makeDeps(mem);
    expect(await startWeeklyBriefGeneration({ weekStart: WEEK, force: true }, go.deps)).toMatchObject({ started: false, skipped: 'has_edits' });
    expect(await startWeeklyBriefGeneration({ weekStart: WEEK, force: true, discardEdits: true }, go.deps)).toMatchObject({ started: true });
    await vi.waitFor(() => expect(mem.drafts.get(WEEK)!.history.some((h) => h.action === 'regenerate')).toBe(true));
    // 발행 상태는 유지되고 새 초안은 "수정 사항 미반영" — 사용자는 이전 발행본을 계속 본다
    const d = mem.drafts.get(WEEK)!;
    expect(d.publishState).toBe('published');
    expect(d.editRev).toBe(0);
    expect(hasUnpublishedChanges(d)).toBe(true);
    expect(JSON.stringify(mem.published.get(WEEK))).toBe(publishedBefore);
    // 내리기가 가능하고 (published 상태), 새 초안을 발행하면 weekly_briefs 가 새 내용으로 바뀐다
    const re = await publishDraft(WEEK, { rev: 0, by: null }, mem.repo, NOW);
    expect(re).toMatchObject({ ok: true, publishState: 'published' });
    expect(JSON.stringify(mem.published.get(WEEK))).not.toBe(publishedBefore);
  });
});

describe('admin summaries', () => {
  it('lists drafts with age and unpublished state, and summarizes the oldest pending week', async () => {
    const mem = memoryRepo();
    await runWeeklyBrief({ reason: 'cron' }, makeDeps(mem).deps);
    const later = new Date(NOW.getTime() + 9 * 86_400_000);
    const list = await listDrafts(mem.repo, later);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ weekStart: WEEK, publishState: 'draft', hasUnpublishedChanges: true, publishedAt: null });
    expect(list[0]!.ageHours).toBe(216);
    expect(await getDraftSummary(mem.repo, later)).toEqual({ pending: 1, oldestWeekStart: WEEK, oldestAgeDays: 9 });
    await publishDraft(WEEK, { rev: 0, by: null }, mem.repo);
    expect(await getDraftSummary(mem.repo, later)).toEqual({ pending: 0, oldestWeekStart: null, oldestAgeDays: null });
  });

  it('week range of the stored draft matches the KST week', async () => {
    const mem = memoryRepo();
    await runWeeklyBrief({ reason: 'cron' }, makeDeps(mem).deps);
    const d = mem.drafts.get(WEEK)!;
    expect(d.periodStart.toISOString()).toBe(getWeekRange(WEEK).startUtc.toISOString());
  });
});
