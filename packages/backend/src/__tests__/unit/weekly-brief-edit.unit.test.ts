/**
 * 편집 모듈 — applyEdits 순수성, 되돌리기(null), 알 수 없는 경로 거부, 거부/경고 구분, 이력 상한 50
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../db/index.js', () => ({ db: {} }));

import {
  EDIT_HISTORY_MAX,
  EDIT_LIMITS,
  appendHistory,
  applyEdits,
  baseTextAt,
  makeHistoryEntry,
  mergeEdits,
  parseEditPath,
  publishViolations,
  validateEdits,
} from '../../services/weekly-brief-edit.js';
import { composeExec, buildExecPlan, finalizeExec } from '../../services/weekly-brief-compose-exec.js';
import { fakeExecAi, makeExecCollectedFull, REPORT_NOW } from '../fixtures/weekly-exec-collected.fixture.js';
import type { WeeklyExecutivePayload } from '../../types/weekly-brief.js';

function aiPayload(): WeeklyExecutivePayload {
  const plan = buildExecPlan(makeExecCollectedFull());
  return finalizeExec(plan, fakeExecAi(plan), REPORT_NOW).payload;
}

describe('parseEditPath', () => {
  it('accepts exactly the whitelisted fields', () => {
    expect(parseEditPath('conclusions.c:gap-x-hand_dof.headline')?.kind).toBe('conclusion_headline');
    expect(parseEditPath('conclusions.c1.lines.2')?.kind).toBe('conclusion_line');
    expect(parseEditPath('gaps.summary.0')?.kind).toBe('gap_summary');
    expect(parseEditPath('gaps.rows.gap:a:hand_dof.lines.1')?.kind).toBe('gap_row_line');
    expect(parseEditPath('tech.signals.t1.lines.0')?.kind).toBe('tech_line');
    expect(parseEditPath('business.moves.b1.lines.0')?.kind).toBe('business_line');
    expect(parseEditPath('questions.q2.text')?.kind).toBe('question_text');
    expect(parseEditPath('questions.q2.rationale.0')?.kind).toBe('question_rationale');
    expect(parseEditPath('evidence.papers.p1.implication')?.kind).toBe('paper_implication');
  });

  it.each([
    'conclusions.c1.rank',
    'conclusions.c1.evidence.0.url',
    'gaps.rows.g1.competitorValue.value',
    'gaps.rows.g1.position',
    'tech.signals.t1.series.0',
    'evidence.videos.v1.url',
    'meta.warnings.0',
    'header.counts.articles',
    'conclusions.c1.lines.x',
    'conclusions.c1.lines',
    '',
  ])('rejects %s', (p) => {
    expect(parseEditPath(p)).toBeNull();
  });
});

describe('validateEdits', () => {
  const ai = aiPayload();
  const c = ai.conclusions[0]!;
  const line = `conclusions.${c.id}.lines.1`;
  const limits = EDIT_LIMITS;

  it('accepts a valid edit with no warnings', () => {
    const r = validateEdits(ai, { [line]: '수정한 문장입니다.' });
    expect(r).toEqual({ ok: true, edits: { [line]: '수정한 문장입니다.' }, warnings: [] });
  });

  it('rejects unknown ids, out-of-range indexes and non-whitelisted fields with unknown_path', () => {
    for (const p of ['conclusions.nope.lines.0', `conclusions.${c.id}.lines.99`, 'questions.q99.text', `conclusions.${c.id}.rank`]) {
      expect(validateEdits(ai, { [p]: '문장입니다.' })).toMatchObject({ ok: false, code: 'unknown_path', path: p });
    }
  });

  it.each([
    ['<script>alert(1)</script>입니다.', 'forbidden_char'],
    ['https://example.com 을 보세요.', 'forbidden_char'],
    ['www.example.com 을 보세요.', 'forbidden_char'],
    ['두 줄입니다.\n둘째 줄입니다.', 'forbidden_char'],
    ['**굵게** 씁니다.', 'forbidden_char'],
    ['   ', 'empty'],
    ['', 'empty'],
    ['가'.repeat(201), 'too_long'],
  ])('rejects %j with %s', (text, code) => {
    expect(validateEdits(ai, { [line]: text })).toMatchObject({ ok: false, code });
  });

  it('enforces per-field limits: headline 50, question 200, implication 100', () => {
    expect(limits).toEqual({ sentence: 200, headline: 50, question: 200, implication: 100 });
    expect(validateEdits(ai, { [`conclusions.${c.id}.headline`]: '가'.repeat(51) })).toMatchObject({ ok: false, code: 'too_long' });
    expect(validateEdits(ai, { [`conclusions.${c.id}.headline`]: '가'.repeat(50) })).toMatchObject({ ok: true });
    const paper = ai.evidence.papers[0];
    if (paper) expect(validateEdits(ai, { [`evidence.papers.${paper.id}.implication`]: '가'.repeat(101) })).toMatchObject({ ok: false, code: 'too_long' });
  });

  it('warns (but accepts) honorific violations, banned words, unknown numbers, collection counts', () => {
    const r = validateEdits(ai, { [line]: '값이 99999로 올랐다. 반드시 영상 30건 수집.' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.warnings).toHaveLength(1);
      expect(r.warnings[0]!.codes).toEqual(expect.arrayContaining(['ending', 'banned', 'number', 'collection']));
    }
  });

  it('warns on direction contradiction using the server position of the gap row', () => {
    const row = ai.gaps.rows.find((g) => g.position === 'competitor_ahead')!;
    const r = validateEdits(ai, { [`gaps.rows.${row.id}.lines.0`]: '이 축에서는 우리가 앞섭니다.' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings[0]!.codes).toContain('direction');
  });

  it('a headline (noun phrase) never gets the honorific-ending warning, but the other warnings still apply', () => {
    const id = ai.conclusions[0]!.id;
    expect(validateEdits(ai, { [`conclusions.${id}.headline`]: '손 자유도 격차 확대' })).toEqual({ ok: true, edits: { [`conclusions.${id}.headline`]: '손 자유도 격차 확대' }, warnings: [] });
    const r = validateEdits(ai, { [`conclusions.${id}.headline`]: '전망 99999' });
    expect(r.ok && r.warnings[0]!.codes).toEqual(expect.arrayContaining(['banned', 'number']));
    expect(r.ok && r.warnings[0]!.codes).not.toContain('ending');
  });

  it('null reverts to the AI text; an edit equal to the AI text is also a revert', () => {
    const base = baseTextAt(ai, line)!;
    expect(validateEdits(ai, { [line]: null })).toMatchObject({ ok: true, edits: { [line]: null } });
    expect(validateEdits(ai, { [line]: base })).toMatchObject({ ok: true, edits: { [line]: null } });
  });

  it('is all-or-nothing: one bad path rejects the whole request', () => {
    const r = validateEdits(ai, { [line]: '좋은 문장입니다.', 'conclusions.zzz.lines.0': '나쁜 경로입니다.' });
    expect(r.ok).toBe(false);
  });
});

describe('applyEdits', () => {
  const ai = aiPayload();
  const c = ai.conclusions[0]!;
  const line = `conclusions.${c.id}.lines.1`;

  it('is pure: the AI payload and the edits are not mutated', () => {
    const before = JSON.stringify(ai);
    const edits = { [line]: '편집한 문장입니다.' };
    const editsBefore = JSON.stringify(edits);
    const out = applyEdits(ai, edits);
    expect(JSON.stringify(ai)).toBe(before);
    expect(JSON.stringify(edits)).toBe(editsBefore);
    expect(out).not.toBe(ai);
    expect(out.conclusions[0]!.lines[1]!.text).toBe('편집한 문장입니다.');
    expect(ai.conclusions[0]!.lines[1]!.text).not.toBe('편집한 문장입니다.');
  });

  it('applies every editable field kind and leaves numbers, links and evidence untouched', () => {
    const edits: Record<string, string> = {
      [`conclusions.${c.id}.headline`]: '새 헤드라인',
      [`questions.${ai.questions[0]!.id}.text`]: '새 질문을 해 볼까요?',
      [`questions.${ai.questions[0]!.id}.rationale.0`]: '새 근거 문장입니다.',
      [`gaps.rows.${ai.gaps.rows[0]!.id}.lines.0`]: '새 격차 문장입니다.',
      [`tech.signals.${ai.tech.signals[0]!.id}.lines.0`]: '새 기술 문장입니다.',
      'gaps.summary.0': '새 요약입니다.',
    };
    const out = applyEdits(ai, edits);
    expect(out.conclusions[0]!.headline).toBe('새 헤드라인');
    expect(out.questions[0]!.text).toBe('새 질문을 해 볼까요?');
    expect(out.gaps.rows[0]!.lines[0]).toBe('새 격차 문장입니다.');
    expect(out.tech.signals[0]!.lines[0]).toBe('새 기술 문장입니다.');
    expect(out.gaps.summary[0]).toBe('새 요약입니다.');
    expect(out.gaps.rows.map((g) => g.competitorValue)).toEqual(ai.gaps.rows.map((g) => g.competitorValue));
    expect(out.conclusions.map((x) => x.evidence)).toEqual(ai.conclusions.map((x) => x.evidence));
    expect(out.tech.signals.map((s) => s.series)).toEqual(ai.tech.signals.map((s) => s.series));
  });

  it('ignores paths that do not exist in the AI payload and adds no editor/edited markers', () => {
    const out = applyEdits(ai, { 'conclusions.nope.lines.0': '무시됩니다.' });
    expect(JSON.stringify(out)).toBe(JSON.stringify(ai));
    const keys = new Set<string>();
    const collect = (v: unknown) => {
      if (Array.isArray(v)) v.forEach(collect);
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) (keys.add(k), collect(x));
    };
    collect(applyEdits(ai, { [line]: '편집입니다.' }));
    for (const k of ['edited', 'editedBy', 'editedAt', 'history', 'editRev', 'publishedBy']) expect(keys.has(k)).toBe(false);
  });
});

describe('mergeEdits, history and publish re-validation', () => {
  it('mergeEdits adds, overwrites and removes (null) keys', () => {
    expect(mergeEdits({ a: '1', b: '2' }, { a: null, c: '3', b: '4' })).toEqual({ b: '4', c: '3' });
  });

  it('history keeps at most 50 entries, dropping the oldest first', () => {
    let h: ReturnType<typeof appendHistory> = [];
    for (let i = 0; i < 60; i++) h = appendHistory(h, makeHistoryEntry({ at: new Date(2026, 0, 1, 0, i), by: 'a@x.com', action: 'edit', paths: [`p${i}`] }));
    expect(h).toHaveLength(EDIT_HISTORY_MAX);
    expect(h[0]!.paths[0]).toBe('p10');
    expect(h[49]!.paths[0]).toBe('p59');
  });

  it('history entries clip the before text to 400 chars', () => {
    const e = makeHistoryEntry({ at: new Date(), by: null, action: 'regenerate', paths: ['x'], before: { x: '가'.repeat(900) } });
    expect(Array.from(e.before.x!).length).toBe(400);
    expect(e.by).toBeNull();
  });

  it('publishViolations re-checks reject rules for stored edits', () => {
    const ai = aiPayload();
    const p = `conclusions.${ai.conclusions[0]!.id}.lines.0`;
    expect(publishViolations(ai, { [p]: '정상 문장입니다.' })).toEqual([]);
    expect(publishViolations(ai, { [p]: '<b>나쁨</b>' })).toEqual([{ path: p, code: 'forbidden_char' }]);
    expect(publishViolations(ai, { 'conclusions.zzz.lines.0': '경로가 없습니다.' })).toEqual([{ path: 'conclusions.zzz.lines.0', code: 'unknown_path' }]);
  });

  it('composeExec output feeds the edit pipeline end to end', () => {
    const r = composeExec(makeExecCollectedFull(), null, REPORT_NOW);
    expect(r.payload.conclusions.length).toBeGreaterThan(0);
  });
});
