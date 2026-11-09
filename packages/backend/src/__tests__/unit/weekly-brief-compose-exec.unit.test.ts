/**
 * v3 구성 — 후보 점수·선택, 규칙 폴백, AI 응답 검증, 상태 판정, 최소 데이터 규칙, 금지 키·길이·undefined/NaN
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../db/index.js', () => ({ db: {} }));

import { buildExecPlan, composeExec, decideExecStatus, finalizeExec, narrativeCharCount } from '../../services/weekly-brief-compose-exec.js';
import { fakeExecAi, makeExecCollectedEmpty, makeExecCollectedFull, makeExecCollectedSparse, REPORT_NOW } from '../fixtures/weekly-exec-collected.fixture.js';
import { endsWithPolite, endsWithProposal } from '../../services/weekly-brief-text-guard.js';

const FORBIDDEN_KEYS = ['content', 'description', 'abstract', 'originalText'];

function walk(v: unknown, fn: (value: unknown, key: string | null) => void, key: string | null = null): void {
  fn(v, key);
  if (Array.isArray(v)) v.forEach((x) => walk(x, fn, key));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, fn, k);
}

describe('buildExecPlan (full week)', () => {
  const plan = buildExecPlan(makeExecCollectedFull());

  it('selects conclusion candidates by score, at most 5 and at most 2 per kind', () => {
    expect(plan.candidates.length).toBeGreaterThanOrEqual(3);
    expect(plan.candidates.length).toBeLessThanOrEqual(5);
    const perKind = new Map<string, number>();
    for (const c of plan.candidates) perKind.set(c.kind, (perKind.get(c.kind) ?? 0) + 1);
    for (const n of perKind.values()) expect(n).toBeLessThanOrEqual(2);
    const scores = plan.candidates.map((c) => c.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    for (const c of plan.candidates) expect(c.evidence.length).toBeGreaterThanOrEqual(1);
  });

  it('computes gap rows on the server: Atlas hand DoF is ahead and closing (22 vs prev 18 vs our 12)', () => {
    const row = plan.gaps.rows.find((g) => g.draft.id === 'gap:atlas-robotics:hand_dof');
    expect(row).toBeTruthy();
    expect(row!.draft.status).toBe('compared');
    expect(row!.draft.position).toBe('competitor_ahead');
    expect(row!.draft.movement).toBe('competitor_closing');
    expect(row!.draft.diff).toEqual({ abs: 10, pct: 83.3 });
    expect(row!.draft.prevCompetitorValue).toBe(18);
  });

  it('keeps a hand-benchmark axis as ours_missing because the LG hand row does not exist', () => {
    const miss = plan.gaps.rows.filter((g) => g.draft.status === 'ours_missing');
    expect(miss.length).toBeGreaterThan(0);
    for (const g of miss) {
      expect(g.draft.ourValue).toBeNull();
      expect(g.draft.diff).toBeNull();
      expect(g.draft.position).toBeNull();
      expect(g.ruleLines.join(' ')).toContain('우리 수치가 아직 등록되어 있지 않습니다');
    }
    expect(plan.gaps.coverage.missing).toEqual(expect.arrayContaining(['핸드 그립력', '촉각 채널 수']));
    expect(plan.gaps.coverage.registered).toEqual(expect.arrayContaining(['핸드 자유도']));
  });

  it('flat series and weak signals are not tech signals; every signal has evidence', () => {
    const ids = plan.tech.signals.map((t) => t.draft.id);
    expect(ids).toContain('subtopic:hand:tactile_force');
    expect(ids).not.toContain('subtopic:actuator:flat');
    for (const t of plan.tech.signals) {
      expect(t.evidence.length).toBeGreaterThan(0);
      expect(t.draft.series).toHaveLength(8);
    }
    expect(plan.tech.window).toEqual({ weeks: 8, recentWeeks: 4, asOfWeekStart: '2026-10-19' });
  });

  it('procurement is "observed" only with 2+ snapshots (previous + current here)', () => {
    expect(plan.tech.procurement).toEqual({ state: 'observed', snapshots: 2 });
    const first = buildExecPlan({ ...makeExecCollectedFull(), prev: { gapValues: {}, snapshots: [] } });
    expect(first.tech.procurement).toEqual({ state: 'accumulating', snapshots: 1 });
    const none = buildExecPlan(makeExecCollectedSparse());
    expect(none.tech.procurement).toEqual({ state: 'accumulating', snapshots: 0 });
  });

  it('appendix limits: videos 6-8 with a domain bucket cap, articles <= 2 per source, papers <= candidates', () => {
    expect(plan.videos.length).toBeGreaterThanOrEqual(6);
    expect(plan.videos.length).toBeLessThanOrEqual(8);
    const perSource = new Map<string, number>();
    for (const a of plan.articles) perSource.set(a.source, (perSource.get(a.source) ?? 0) + 1);
    for (const n of perSource.values()) expect(n).toBeLessThanOrEqual(2);
    expect(plan.articles.length).toBeLessThanOrEqual(8);
    expect(plan.papers.length).toBeLessThanOrEqual(8);
    expect(plan.collectionLine).toMatch(/^이번 주 ARGOS가 새로 수집한 자료: 영상 \d+건, 뉴스 \d+건, 논문 \d+건/);
  });

  it('business picture chips come from the map response', () => {
    const labels = plan.business.picture.map((c) => c.label);
    expect(labels).toEqual(expect.arrayContaining(['자체 조달 로봇', '외부 조달 로봇', '조달 방식 미확인', '공개 가격 중앙값']));
    expect(plan.business.picture.length).toBeLessThanOrEqual(6);
    // 설명 없는 숫자 금지: 모든 칩에 무엇을 센 것인지 설명하는 note 가 있다
    for (const c of plan.business.picture) expect((c.note ?? '').length, c.label).toBeGreaterThan(15);
    const own = plan.business.picture.find((c) => c.label === '자체 조달 로봇')!;
    expect(own.note).toMatch(/조사 대상 휴머노이드 로봇 \d+기 중 .*직접 설계·생산하는 로봇 수입니다/);
    expect(plan.business.picture.find((c) => c.label === '조달 방식 미확인')!.note).toContain('외부 조달이라는 뜻은 아닙니다');
    expect(plan.business.picture.find((c) => c.label === '공개 가격 중앙값')!.note).toMatch(/가격이 공개된 휴머노이드 \d+기의 공개 가격 중앙값\(USD\)/);
    expect(plan.business.asOf).toBe('2026-10-25');
  });
});

describe('finalizeExec with valid AI output', () => {
  const plan = buildExecPlan(makeExecCollectedFull());
  const res = finalizeExec(plan, fakeExecAi(plan), REPORT_NOW);
  const p = res.payload;

  it('produces a v3 payload with the six sections and no cover figures', () => {
    expect(p.schemaVersion).toBe(3);
    for (const k of ['conclusions', 'gaps', 'tech', 'business', 'questions', 'evidence', 'meta', 'header'] as const) expect(p).toHaveProperty(k);
    expect(p.conclusions.length).toBeGreaterThanOrEqual(3);
  });

  it('every conclusion has change/why/action among 3-6 polite sentences, rank 1..n', () => {
    p.conclusions.forEach((c, i) => {
      expect(c.rank).toBe(i + 1);
      expect(c.generatedBy).toBe('ai');
      expect(c.lines.length).toBeGreaterThanOrEqual(3);
      expect(c.lines.length).toBeLessThanOrEqual(6);
      const roles = new Set(c.lines.map((l) => l.role));
      for (const r of ['change', 'why', 'action']) expect(roles.has(r as never)).toBe(true);
      for (const l of c.lines) expect(endsWithPolite(l.text)).toBe(true);
      expect(c.headline.length).toBeLessThanOrEqual(50);
    });
  });

  it('questions end with a proposal ending (no question form) and carry 1-3 evidence items', () => {
    expect(p.questions.length).toBeGreaterThanOrEqual(2);
    expect(p.questions.length).toBeLessThanOrEqual(4);
    for (const q of p.questions) {
      expect(endsWithProposal(q.text)).toBe(true);
      expect(q.text).not.toMatch(/[?？]|까요/);
      expect(q.evidence.length).toBeGreaterThanOrEqual(1);
      expect(q.evidence.length).toBeLessThanOrEqual(3);
      expect(q.rationale.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('gap rows keep server labels and the ours_missing notice', () => {
    for (const g of p.gaps.rows) {
      expect(g.lines.length).toBeGreaterThanOrEqual(1);
      if (g.status === 'ours_missing') expect(g.lines.join(' ')).toMatch(/미등록|등록되어 있지 않/);
      else {
        expect(g.lines.length).toBeGreaterThanOrEqual(2);
        expect(g.labelKo.position).not.toBeNull();
      }
    }
  });

  it('papers: only AI-scored frontier papers (>= 2) with a one-line implication, titles translated', () => {
    expect(p.evidence.papers.length).toBeLessThanOrEqual(5);
    for (const paper of p.evidence.papers) {
      expect(paper.frontierScore).toBeGreaterThanOrEqual(2);
      expect(paper.implication.length).toBeGreaterThan(0);
      expect(paper.implication.length).toBeLessThanOrEqual(100);
      expect(paper.url.startsWith('https://arxiv.org/')).toBe(true);
    }
    expect(p.evidence.videos.some((v) => v.titleKo)).toBe(true);
  });

  it('all strings are <= 400 chars, no forbidden keys, no undefined/NaN/null text, no empty strings', () => {
    walk(p, (v, key) => {
      if (key && FORBIDDEN_KEYS.includes(key)) throw new Error(`forbidden key ${key}`);
      if (typeof v === 'string') {
        expect(Array.from(v).length).toBeLessThanOrEqual(400);
        expect(v.length).toBeGreaterThan(0);
        expect(v).not.toMatch(/\bundefined\b|\bNaN\b|\[object Object\]/);
      }
    });
  });

  it('no sentence in conclusions/gaps/business/questions mentions collection counts; they live only in the last appendix line', () => {
    const text = JSON.stringify([p.conclusions, p.gaps, p.business, p.questions, p.tech]);
    expect(text).not.toMatch(/수집/);
    expect(p.evidence.collectionLine).toContain('수집');
  });

  it('is ok when the AI path succeeded and nothing failed, and reports narrative size', () => {
    expect(['ok', 'partial']).toContain(res.status);
    expect(narrativeCharCount(p)).toBeGreaterThan(300);
  });
});

describe('AI validation and rule fallback', () => {
  const plan = buildExecPlan(makeExecCollectedFull());

  it('without AI every conclusion falls back to a rule sentence set and the status is partial', () => {
    const r = composeExec(makeExecCollectedFull(), null, REPORT_NOW);
    expect(r.status).toBe('partial');
    for (const c of r.payload.conclusions) {
      expect(c.generatedBy).toBe('rule');
      expect(c.lines.length).toBeGreaterThanOrEqual(1);
      expect(c.lines.length).toBeLessThanOrEqual(2);
      expect(c.actionKind).toBe('none');
    }
    // 규칙 폴백 확인 사항(T1~T3)만 있다
    for (const q of r.payload.questions) expect(q.generatedBy).toBe('rule');
    expect(r.payload.business.moves).toEqual([]);
    expect(r.payload.evidence.papers).toEqual([]);
    for (const g of r.payload.gaps.rows) expect(g.generatedBy).toBe('rule');
  });

  it('discards a conclusion with plain-form endings, missing action, or bad refs and falls back', () => {
    const ai = fakeExecAi(plan);
    const a = ai.A as { conclusions: { lines: { role: string; text: string }[]; refs: string[] }[] };
    a.conclusions[0]!.lines = [
      { role: 'change', text: '가격이 내려갔다.' },
      { role: 'why', text: '중요함.' },
      { role: 'action', text: '확인해야 합니다.' },
    ];
    a.conclusions[1]!.refs = ['e999'];
    const r = finalizeExec(plan, ai, REPORT_NOW);
    expect(r.payload.conclusions.find((c) => c.id === plan.candidates[0]!.id)!.generatedBy).toBe('rule');
    expect(r.payload.conclusions.find((c) => c.id === plan.candidates[1]!.id)!.generatedBy).toBe('rule');
    expect(r.payload.conclusions.find((c) => c.id === plan.candidates[2]!.id)!.generatedBy).toBe('ai');
    const discarded = (r.stats.aiDiscarded as { reason: string }[]).map((d) => d.reason);
    expect(discarded).toEqual(expect.arrayContaining(['lines_insufficient', 'no_valid_refs']));
  });

  it('drops collection-count, direction-contradiction, banned-word and unknown-number sentences', () => {
    const ai = fakeExecAi(plan);
    const row = plan.gaps.rows.find((g) => g.draft.position === 'competitor_ahead')!;
    const b = ai.B as { rows: { id: string; lines: string[] }[] };
    b.rows.find((x) => x.id === row.ref)!.lines = ['우리가 앞서 있습니다.', '영상 12건이 수집되었습니다.', '반드시 따라가야 합니다.', '수치는 9999입니다.', '경쟁사가 앞서 있습니다.'];
    const r = finalizeExec(plan, ai, REPORT_NOW);
    const out = r.payload.gaps.rows.find((g) => g.id === row.draft.id)!;
    // only one valid sentence remains (<2) => fallback to the rule line
    expect(out.generatedBy).toBe('rule');
    expect(out.lines.join(' ')).not.toContain('9999');
  });

  it('ours_missing rows need the registration notice, otherwise the rule line is used', () => {
    const ai = fakeExecAi(plan);
    const miss = plan.gaps.rows.find((g) => g.draft.status === 'ours_missing')!;
    const b = ai.B as { rows: { id: string; lines: string[] }[] };
    b.rows.find((x) => x.id === miss.ref)!.lines = ['경쟁사는 높은 수준입니다.'];
    const r = finalizeExec(plan, ai, REPORT_NOW);
    const out = r.payload.gaps.rows.find((g) => g.id === miss.draft.id)!;
    expect(out.generatedBy).toBe('rule');
    expect(out.lines.join(' ')).toContain('등록되어 있지 않습니다');
  });

  it('drops questions without evidence or with a non-question ending', () => {
    const ai = fakeExecAi(plan);
    const a = ai.A as { questions: { text: string; refs: string[] }[] };
    a.questions[0]!.refs = ['e999'];
    a.questions[1]!.text = '평가를 시작합니다.';
    const r = finalizeExec(plan, ai, REPORT_NOW);
    // AI 를 통과한 항목이 1개뿐이면 규칙 폴백(T1~T3)이 2개 이상이 되도록 채운다
    expect(r.payload.questions.filter((q) => q.generatedBy === 'ai')).toHaveLength(1);
    expect(r.payload.questions.length).toBeGreaterThanOrEqual(2);
    for (const q of r.payload.questions) expect(q.evidence.length).toBeGreaterThanOrEqual(1);
  });

  it('a failed call marks the section and the status is partial with a *_failed warning', () => {
    const r = finalizeExec(plan, fakeExecAi(plan, { skip: ['B'] }), REPORT_NOW);
    expect(r.payload.meta.warnings).toContain('ai_gaps_failed');
    expect(r.status).toBe('partial');
    expect(r.payload.gaps.rows.every((g) => g.generatedBy === 'rule')).toBe(true);
    expect(r.payload.conclusions.every((c) => c.generatedBy === 'ai')).toBe(true);
  });

  it('title translations with new numbers are rejected', () => {
    const ai = fakeExecAi(plan);
    const d = ai.D as { titles: { id: string; titleKo: string }[] };
    d.titles[0]!.titleKo = '숫자 999가 들어간 제목';
    const r = finalizeExec(plan, ai, REPORT_NOW);
    expect(r.payload.evidence.videos[0]!.titleKo).toBeNull();
  });
});

describe('minimum-data rules', () => {
  it('empty week: no data, partial, nothing to render but the cover, no AI input needed', () => {
    const r = composeExec(makeExecCollectedEmpty(), null, REPORT_NOW);
    expect(r.plan.noData).toBe(true);
    expect(r.status).toBe('partial');
    expect(r.payload.meta.warnings).toContain('no_data');
    expect(r.payload.conclusions).toEqual([]);
    expect(r.payload.questions).toEqual([]);
    expect(r.payload.gaps.rows).toEqual([]);
    expect(r.payload.tech.signals).toEqual([]);
    expect(r.payload.evidence.videos).toEqual([]);
    expect(JSON.stringify(r.payload)).not.toMatch(/undefined|NaN/);
  });

  it('sparse week with position failure: honest "could not load" summary, all axes missing, partial', () => {
    const r = composeExec(makeExecCollectedSparse(), null, REPORT_NOW);
    expect(r.payload.meta.warnings).toEqual(expect.arrayContaining(['position_failed']));
    expect(r.status).toBe('partial');
    expect(r.payload.gaps.rows).toEqual([]);
    expect(r.payload.gaps.summary).toEqual(['비교 기준이 되는 우리 쪽 수치를 불러오지 못했습니다.']);
    expect(r.payload.gaps.coverage.registered).toEqual([]);
    expect(r.payload.gaps.coverage.missing.length).toBeGreaterThan(5);
    expect(r.payload.meta.positionSnapshot).toBeNull();
  });
});

describe('decideExecStatus', () => {
  const src = { conclusions: 'ai', gaps: 'ai', tech: 'ai', business: 'ai', questions: 'ai', evidence: 'ai' } as never;
  it('rule ratio above 25% => partial; at 25% => ok', () => {
    expect(decideExecStatus({ noData: false, warnings: [], sectionSources: src, ruleElements: 2, totalElements: 8 })).toBe('ok');
    expect(decideExecStatus({ noData: false, warnings: [], sectionSources: src, ruleElements: 3, totalElements: 8 })).toBe('partial');
  });
  it('any *_failed warning or ai_disabled => partial; no_data => partial', () => {
    expect(decideExecStatus({ noData: false, warnings: ['position_failed'], sectionSources: src, ruleElements: 0, totalElements: 4 })).toBe('partial');
    expect(decideExecStatus({ noData: false, warnings: ['ai_disabled'], sectionSources: src, ruleElements: 0, totalElements: 4 })).toBe('partial');
    expect(decideExecStatus({ noData: true, warnings: [], sectionSources: src, ruleElements: 0, totalElements: 0 })).toBe('partial');
  });
});

describe('tone v2 and explanation rules', () => {
  const plan = buildExecPlan(makeExecCollectedFull());

  it('video evidence carries an ytimg thumbnail (<=400 chars); non-video evidence has none', () => {
    const all = [...plan.evidenceByRef.values(), ...plan.gaps.rows.flatMap((g) => g.evidence), ...plan.candidates.flatMap((c) => c.evidence.map((e) => e.ev))];
    const videos = all.filter((e) => e.type === 'video');
    expect(videos.length).toBeGreaterThan(0);
    for (const v of videos) {
      expect(v.thumbnail, v.id).toMatch(/^https:\/\/i\.ytimg\.com\//);
      expect((v.thumbnail ?? '').length).toBeLessThanOrEqual(400);
    }
    for (const e of all.filter((x) => x.type === 'article' || x.type === 'paper')) expect(e.publishedAt).toBeTruthy();
    for (const e of all.filter((x) => x.type === 'ci')) expect(e.thumbnail ?? null).toBeNull();
  });

  it('rule headlines are fact sentences, not analyst-tool phrases or proposals', () => {
    for (const c of plan.candidates) {
      expect(c.ruleHeadline).not.toMatch(/[?？]|필요|검토/);
      expect(c.ruleHeadline).not.toMatch(/격차|확대$|증가세|감소세/);
    }
  });

  it('gap summary is 2-3 sentences: an AI summary with one sentence is replaced by the rule summary', () => {
    const ai = fakeExecAi(plan);
    (ai.B as { summary: string[] }).summary = ['한 문장뿐입니다.'];
    const r = finalizeExec(plan, ai, REPORT_NOW);
    expect(r.payload.gaps.summary.length).toBeGreaterThanOrEqual(2);
    expect(r.payload.gaps.summary.length).toBeLessThanOrEqual(3);
    expect(r.payload.gaps.summary[0]).toContain('새로 공개되거나 갱신되었습니다');
    const none = composeExec(makeExecCollectedFull(), null, REPORT_NOW);
    expect(none.payload.gaps.summary.length).toBeGreaterThanOrEqual(2);
    const ok = finalizeExec(plan, fakeExecAi(plan), REPORT_NOW);
    expect(ok.payload.gaps.summary.length).toBeGreaterThanOrEqual(2);
    expect(ok.payload.gaps.summary.length).toBeLessThanOrEqual(3);
  });

  it('every gap row has a fact-sentence headline and no axis key or grade code leaks into it', () => {
    const r = finalizeExec(plan, fakeExecAi(plan), REPORT_NOW);
    for (const g of r.payload.gaps.rows) {
      expect(g.headline).toBeTruthy();
      expect(g.headline).not.toMatch(/hand_dof|torque_density|gap:|신뢰도/);
    }
  });

  it('AI questions ending with a question form are discarded as bad_text; proposal-ending ones are adopted', () => {
    const ai = fakeExecAi(plan);
    const a = ai.A as { questions: { text: string }[] };
    a.questions[0]!.text = 'Revo 3 사양을 직접 평가해 볼까요?';
    const r = finalizeExec(plan, ai, REPORT_NOW);
    expect((r.stats.aiDiscarded as { reason: string }[]).filter((d) => d.reason === 'bad_text')).toHaveLength(1);
    expect(r.payload.questions.filter((q) => q.generatedBy === 'ai')).toHaveLength(2);
    expect(r.payload.questions.every((q) => endsWithProposal(q.text))).toBe(true);
  });

  it('rule fallback questions (T1-T3) are used only when fewer than 2 AI questions pass, and satisfy every guard', () => {
    const full = finalizeExec(plan, fakeExecAi(plan), REPORT_NOW);
    expect(full.payload.questions.every((q) => q.generatedBy === 'ai')).toBe(true);
    const none = composeExec(makeExecCollectedFull(), null, REPORT_NOW);
    expect(none.payload.questions.length).toBeGreaterThanOrEqual(2);
    for (const q of none.payload.questions) {
      expect(q.generatedBy).toBe('rule');
      expect(endsWithProposal(q.text)).toBe(true);
      expect(q.text).not.toMatch(/[?？]|까요/);
      expect(q.evidence.length).toBeGreaterThanOrEqual(1);
      expect(q.rationale.length).toBeGreaterThanOrEqual(1);
      for (const r of q.rationale) expect(endsWithProposal(r)).toBe(false);
    }
    expect(none.payload.questions.map((q) => q.kind).every((k) => ['watch', 'evaluate'].includes(k))).toBe(true);
  });

  it('an AI action line without a target (D6) or with a plain-form sentence drops the conclusion to the rule fallback', () => {
    const ai = fakeExecAi(plan);
    const a = ai.A as { conclusions: { lines: { role: string; text: string }[] }[] };
    a.conclusions[0]!.lines.find((l) => l.role === 'action')!.text = '비교해 볼 필요가 있을 것 같습니다.';
    a.conclusions[1]!.lines.find((l) => l.role === 'action')!.text = '관련 사양을 비교해 볼 만합니다.';
    const r = finalizeExec(plan, ai, REPORT_NOW);
    expect(r.payload.conclusions.find((c) => c.id === plan.candidates[0]!.id)!.generatedBy).toBe('rule');
    expect(r.payload.conclusions.find((c) => c.id === plan.candidates[1]!.id)!.generatedBy).toBe('rule');
    expect(r.stats.guard).toMatchObject({ dropped: { no_target: expect.any(Number), proposal_ending: expect.any(Number) } });
  });

  it('proposal-style sentences on change/why lines are dropped (proposal_misplaced)', () => {
    const ai = fakeExecAi(plan);
    const a = ai.A as { conclusions: { lines: { role: string; text: string }[] }[] };
    a.conclusions[0]!.lines.push({ role: 'detail', text: '이번 변화의 구성을 확인해 볼 필요가 있을 것 같습니다.' });
    const r = finalizeExec(plan, ai, REPORT_NOW);
    const c = r.payload.conclusions.find((x) => x.id === plan.candidates[0]!.id)!;
    expect(c.lines.some((l) => l.role === 'detail' && l.text.includes('볼 필요가'))).toBe(false);
    expect((r.stats.guard as { dropped: Record<string, number> }).dropped.proposal_misplaced).toBeGreaterThan(0);
  });

  it('numbers in business/gap lines need a stated target (number-target guard)', () => {
    const ai = fakeExecAi(plan);
    const row = plan.gaps.rows.find((g) => g.draft.status === 'compared')!;
    const b = ai.B as { rows: { id: string; lines: string[] }[] };
    b.rows.find((x) => x.id === row.ref)!.lines = ['12가 확인됩니다.', '값은 22입니다.'];
    const r = finalizeExec(plan, ai, REPORT_NOW);
    expect(r.payload.gaps.rows.find((g) => g.id === row.draft.id)!.generatedBy).toBe('rule');
    expect((r.stats.guard as { dropped: Record<string, number> }).dropped.no_target).toBeGreaterThan(0);
  });

  it('tech signals carry a "이 주제는 …을 뜻합니다" explanation', () => {
    const r = finalizeExec(plan, fakeExecAi(plan), REPORT_NOW);
    expect(r.payload.tech.signals.length).toBeGreaterThan(0);
    for (const s of r.payload.tech.signals) expect(s.explain).toMatch(/^이 주제는 .+뜻합니다\.$/);
  });
});
