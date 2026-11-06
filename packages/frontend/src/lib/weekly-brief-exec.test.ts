/**
 * v3 순수 로직 — 섹션 계획·목차·앵커(죽은 앵커 없음), 읽기 시간, 번호, 빈 상태, 차이 라벨, 스파크라인, 편집 경로·점검, 배너·배지
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EDIT_LIMITS,
  EXEC_CHARS_PER_MINUTE,
  EXEC_SECTION_IDS,
  buildExecToc,
  clientEditProblem,
  coverageLine,
  draftBannerModel,
  editLimitFor,
  editPath,
  estimateExecReadingMinutes,
  execBaseTextAt,
  execNarrativeChars,
  formatExecReadingTime,
  formatGapDiff,
  gapMovementBadge,
  gapPositionBadge,
  gapTone,
  gapWho,
  isExecEmpty,
  isoWeekNumberOf,
  pickAdminWeek,
  planExecSections,
  publishBadge,
  publishConfirmModel,
  sparklineAlt,
  sparklineModel,
  summarizeDrafts,
  weekEndOf,
} from '@/lib/weekly-brief-exec';
import { normalizeWeeklyBrief } from '@/lib/weekly-brief-format';
import type { WeeklyExecutivePayload, WeeklyExecutiveResponse } from '@/types/weekly-brief';
import full from './__fixtures__/weekly-exec-full.json';
import sparse from './__fixtures__/weekly-exec-sparse.json';
import empty from './__fixtures__/weekly-exec-empty.json';
import partial from './__fixtures__/weekly-exec-partial.json';

const F = (normalizeWeeklyBrief(full as never) as WeeklyExecutiveResponse).payload;
const S = (normalizeWeeklyBrief(sparse as never) as WeeklyExecutiveResponse).payload;
const E = (normalizeWeeklyBrief(empty as never) as WeeklyExecutiveResponse).payload;
const P = (normalizeWeeklyBrief(partial as never) as WeeklyExecutiveResponse).payload;
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

describe('planExecSections / buildExecToc', () => {
  it('full week shows all six sections numbered 01..06 with the documented anchors', () => {
    const s = planExecSections(F);
    expect(s.map((x) => x.id)).toEqual(['sec-conclusions', 'sec-gap', 'sec-tech', 'sec-business', 'sec-questions', 'sec-evidence']);
    expect(s.map((x) => x.number)).toEqual(['01', '02', '03', '04', '05', '06']);
    expect(Object.values(EXEC_SECTION_IDS)).toEqual(['sec-conclusions', 'sec-gap', 'sec-tech', 'sec-business', 'sec-questions', 'sec-evidence']);
  });

  it('the TOC lists exactly the visible sections (no dead anchors)', () => {
    for (const p of [F, S, E, P]) {
      const sections = planExecSections(p);
      expect(buildExecToc(sections).map((i) => i.id)).toEqual(sections.map((x) => x.id));
    }
  });

  it('hides business without chips/moves and questions when there are none; numbering follows the visible sections', () => {
    const p = clone(F);
    p.business = { picture: [], moves: [], asOf: null };
    p.questions = [];
    const s = planExecSections(p);
    expect(s.map((x) => x.id)).toEqual(['sec-conclusions', 'sec-gap', 'sec-tech', 'sec-evidence']);
    expect(s.map((x) => x.number)).toEqual(['01', '02', '03', '04']);
  });

  it('keeps business visible with only fact chips (no moves)', () => {
    const p = clone(F);
    p.business.moves = [];
    expect(planExecSections(p).some((x) => x.id === 'sec-business')).toBe(true);
  });

  it('a week without data shows no sections at all and is flagged empty; the sparse week keeps conclusions/gap/tech with their empty-state lines', () => {
    expect(isExecEmpty(E)).toBe(true);
    expect(planExecSections(E)).toEqual([]);
    expect(isExecEmpty(S)).toBe(false);
    expect(planExecSections(S).map((x) => x.key)).toEqual(['conclusions', 'gap', 'tech', 'evidence']);
  });

  it('section titles match the executive structure', () => {
    expect(planExecSections(F).map((x) => x.title)).toEqual(['이번 주 주요 내용', '경쟁사 동향과 우리 위치', '기술 흐름', '사업·공급망 동향', '함께 검토해 주실 사항', '참고 자료']);
  });
});

describe('reading time', () => {
  it('is ceil(narrative chars / 600) with a minimum of 1 minute', () => {
    expect(EXEC_CHARS_PER_MINUTE).toBe(600);
    const chars = execNarrativeChars(F);
    expect(estimateExecReadingMinutes(F)).toBe(Math.max(1, Math.ceil(chars / 600)));
    expect(estimateExecReadingMinutes(E)).toBe(1);
    expect(formatExecReadingTime(14)).toBe('읽는 시간 약 14분');
  });

  it('grows with the narrative (8,000 chars => 14 minutes)', () => {
    const p = clone(E);
    p.conclusions = [{ id: 'c', rank: 1, kind: 'gap_shift', domain: null, headline: '가', lines: [{ role: 'change', text: '가'.repeat(7999) }], actionKind: 'none', gapRefs: [], evidence: [], generatedBy: 'rule' }];
    expect(execNarrativeChars(p)).toBe(8000);
    expect(estimateExecReadingMinutes(p)).toBe(14);
  });
});

describe('gap labels', () => {
  const rows = F.gaps.rows;
  it('uses the server-fixed labels and never reverses them', () => {
    const compared = rows.find((r) => r.status === 'compared' && r.position === 'competitor_ahead')!;
    expect(gapPositionBadge(compared)).toBe('경쟁사가 앞서 있음');
    expect(gapTone(compared)).toBe('ahead');
    expect(gapMovementBadge(compared)).toBe(compared.labelKo.movement);
  });

  it('shows "우리 수치 미등록" and no movement badge for ours_missing rows', () => {
    const missing = rows.find((r) => r.status === 'ours_missing')!;
    expect(gapPositionBadge(missing)).toBe('우리 수치 미등록');
    expect(gapTone(missing)).toBe('missing');
    expect(gapMovementBadge(missing)).toBe('');
    expect(formatGapDiff(missing)).toBe('');
  });

  it('formats diffs by axis (price in dollars, benchmark in points, others with units)', () => {
    expect(formatGapDiff({ axisKey: 'price', unit: 'USD', diff: { abs: 30000, pct: 30 } })).toBe('$30,000 (30%)');
    expect(formatGapDiff({ axisKey: 'bench_dexterity', unit: '점', diff: { abs: 2, pct: 33.3 } })).toBe('2점 (33.3%)');
    expect(formatGapDiff({ axisKey: 'hand_dof', unit: 'DoF', diff: { abs: 10, pct: 83.3 } })).toBe('10 DoF (83.3%)');
    expect(gapWho({ competitor: { companyId: null, name: 'Tesla', robotName: 'Optimus' } })).toBe('Tesla Optimus');
    expect(gapWho({ competitor: { companyId: null, name: 'Tesla', robotName: 'Tesla' } })).toBe('Tesla');
  });

  it('coverage line lists registered and missing axes with the as-of date', () => {
    const line = coverageLine(F.gaps.coverage);
    expect(line).toContain('미등록');
    expect(line).toContain('핸드 그립력');
    expect(coverageLine({ registered: [], missing: [], asOf: null })).toBe('우리 수치가 등록된 항목 없음 · 미등록 항목 없음');
  });
});

describe('sparkline', () => {
  it('maps 8 values to one-decimal coordinates inside the box, with the last point at the end', () => {
    const m = sparklineModel([5, 5, 5, 5, 9, 9, 9, 9])!;
    expect(m.points.split(' ')).toHaveLength(8);
    expect(m.last.x).toBe(117);
    expect(m.min).toBe(5);
    expect(m.max).toBe(9);
    for (const pt of m.points.split(' ')) {
      const [x, y] = pt.split(',').map(Number) as [number, number];
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(m.width);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(m.height);
      expect(String(x)).toMatch(/^\d+(\.\d)?$/);
    }
  });

  it('a flat series is a horizontal line; fewer than 2 points has no model', () => {
    const m = sparklineModel([3, 3, 3, 3])!;
    expect(new Set(m.points.split(' ').map((p) => p.split(',')[1])).size).toBe(1);
    expect(sparklineModel([1])).toBeNull();
    expect(sparklineModel([])).toBeNull();
  });

  it('the text alternative lists every value with its unit', () => {
    expect(sparklineAlt('촉각', [1, 2.5], false)).toBe('촉각 8주 추이: 1%, 2.5%');
    expect(sparklineAlt('조달', [1, 2], true)).toBe('조달 8주 추이: 1건, 2건');
  });
});

describe('edit paths, limits and input checks', () => {
  const c = F.conclusions[0]!;
  const q = F.questions[0]!;

  it('builds the same path grammar the server uses and resolves the AI base text from it', () => {
    expect(execBaseTextAt(F, editPath.conclusionHeadline(c.id))).toBe(c.headline);
    expect(execBaseTextAt(F, editPath.conclusionLine(c.id, 1))).toBe(c.lines[1]!.text);
    expect(execBaseTextAt(F, editPath.questionText(q.id))).toBe(q.text);
    expect(execBaseTextAt(F, editPath.questionRationale(q.id, 0))).toBe(q.rationale[0]);
    expect(execBaseTextAt(F, editPath.gapSummary(0))).toBe(F.gaps.summary[0]);
    expect(execBaseTextAt(F, editPath.gapRowLine(F.gaps.rows[0]!.id, 0))).toBe(F.gaps.rows[0]!.lines[0]);
    expect(execBaseTextAt(F, editPath.techLine(F.tech.signals[0]!.id, 0))).toBe(F.tech.signals[0]!.lines[0]);
    expect(execBaseTextAt(F, editPath.businessLine(F.business.moves[0]!.id, 0))).toBe(F.business.moves[0]!.lines[0]);
    expect(execBaseTextAt(F, editPath.paperImplication(F.evidence.papers[0]!.id))).toBe(F.evidence.papers[0]!.implication);
    expect(execBaseTextAt(F, 'conclusions.zzz.lines.0')).toBeUndefined();
    expect(execBaseTextAt(F, `conclusions.${c.id}.rank`)).toBeUndefined();
  });

  it('applies the per-field limits (headline 50, question 200, implication 100, summary 220, sentence 200)', () => {
    expect(editLimitFor(editPath.conclusionHeadline('c'), DEFAULT_EDIT_LIMITS)).toBe(50);
    expect(editLimitFor(editPath.questionText('q'))).toBe(200);
    expect(editLimitFor(editPath.paperImplication('p'))).toBe(100);
    expect(editLimitFor(editPath.gapSummary(0))).toBe(220);
    expect(editLimitFor(editPath.conclusionLine('c', 0))).toBe(200);
    expect(editLimitFor(editPath.conclusionLine('c', 0), { sentence: 150, headline: 40, question: 150, implication: 80 })).toBe(150);
  });

  it('flags the same problems the server rejects, and nothing else', () => {
    expect(clientEditProblem('좋은 문장입니다.', 200)).toBeNull();
    expect(clientEditProblem('', 200)).toMatch(/빈 문장/);
    expect(clientEditProblem('   ', 200)).toMatch(/빈 문장/);
    expect(clientEditProblem('가\n나', 200)).toMatch(/줄바꿈/);
    expect(clientEditProblem('<b>', 200)).toMatch(/</);
    expect(clientEditProblem('https://x.com', 200)).toMatch(/URL/);
    expect(clientEditProblem('www.x.com', 200)).toMatch(/URL/);
    expect(clientEditProblem('**굵게**', 200)).toMatch(/마크다운/);
    expect(clientEditProblem('가'.repeat(51), 50)).toBe('50자를 넘었습니다');
    expect(clientEditProblem('가'.repeat(50), 50)).toBeNull();
    // 경고 대상(합니다체 위반, 숫자)은 입력 단계에서 막지 않는다
    expect(clientEditProblem('평어체로 썼다 9999', 200)).toBeNull();
  });
});

describe('status badge, banner and dialog model', () => {
  it('has three badge states', () => {
    expect(publishBadge({ publishState: 'draft', hasUnpublishedChanges: true })).toEqual({ label: '미발행(초안)', tone: 'draft' });
    expect(publishBadge({ publishState: 'published', hasUnpublishedChanges: true })).toEqual({ label: '발행됨 · 수정 사항 미반영', tone: 'pending' });
    expect(publishBadge({ publishState: 'published', hasUnpublishedChanges: false })).toEqual({ label: '발행됨', tone: 'published' });
  });

  it('the banner shows count, oldest week and age, turning stale at 7 days', () => {
    expect(draftBannerModel(null)).toBeNull();
    expect(draftBannerModel({ pending: 0, oldestWeekStart: null, oldestAgeDays: null })).toBeNull();
    expect(draftBannerModel({ pending: 2, oldestWeekStart: '2026-10-12', oldestAgeDays: 6 })).toEqual({ text: '발행 대기 중인 브리프가 2건 있습니다(가장 오래된 것: 2026-10-12, 6일 경과)', stale: false });
    expect(draftBannerModel({ pending: 1, oldestWeekStart: '2026-10-12', oldestAgeDays: 7 })?.stale).toBe(true);
  });

  it('summarizes the drafts list (pending = unpublished or published-with-pending-edits) and picks the admin working week', () => {
    const items = [
      { weekStart: '2026-10-19', hasUnpublishedChanges: true, ageHours: 50 },
      { weekStart: '2026-10-12', hasUnpublishedChanges: true, ageHours: 200 },
      { weekStart: '2026-10-05', hasUnpublishedChanges: false, ageHours: 400 },
    ];
    expect(summarizeDrafts(items)).toEqual({ pending: 2, oldestWeekStart: '2026-10-12', oldestAgeDays: 8 });
    expect(summarizeDrafts([])).toEqual({ pending: 0, oldestWeekStart: null, oldestAgeDays: null });
    // 주차 지정: 그 주에 초안이 있을 때만
    expect(pickAdminWeek('2026-10-12', items, '2026-10-12')).toBe('2026-10-12');
    expect(pickAdminWeek('2026-09-28', items, '2026-10-12')).toBeNull();
    // 최신 화면: 가장 최신 초안이 발행본보다 같거나 새로우면 그 초안
    expect(pickAdminWeek(undefined, items, '2026-10-12')).toBe('2026-10-19');
    expect(pickAdminWeek(undefined, items, '2026-10-26')).toBeNull();
    expect(pickAdminWeek(undefined, items, null)).toBe('2026-10-19');
    expect(pickAdminWeek(undefined, [], '2026-10-12')).toBeNull();
  });

  it('the publish dialog shows changed count, guard warnings and the unregistered-axis notice', () => {
    const m = publishConfirmModel({ changedCount: 3, warnings: [{ path: 'a.b', codes: ['ending', 'number'] }], missingAxes: 12 });
    expect(m.title).toBe('이 브리프를 발행할까요?');
    expect(m.lines[0]).toContain('3개');
    expect(m.lines.join(' ')).toContain('미등록');
    expect(m.lines.join(' ')).toContain('12개');
    expect(m.warnings).toHaveLength(2);
    expect(m.warnings[0]).toContain('합니다체');
    expect(publishConfirmModel({ changedCount: 0, warnings: [], missingAxes: 0 }).lines).toHaveLength(1);
  });
});

describe('week helpers', () => {
  it('computes the Sunday and the ISO week number from a Monday', () => {
    expect(weekEndOf('2026-10-19')).toBe('2026-10-25');
    expect(weekEndOf('2026-12-28')).toBe('2027-01-03');
    expect(isoWeekNumberOf('2026-10-19')).toBe(43);
    expect(isoWeekNumberOf('2026-12-28')).toBe(53);
    expect(isoWeekNumberOf('2027-01-04')).toBe(1);
  });
});

describe('fixtures', () => {
  it('partial sample keeps rule-based gap lines and the full sample has no leftover placeholders', () => {
    expect(P.gaps.rows.every((g) => g.generatedBy === 'rule')).toBe(true);
    const text = JSON.stringify(F);
    expect(text).not.toMatch(/undefined|NaN/);
    const p: WeeklyExecutivePayload = F;
    expect(p.schemaVersion).toBe(3);
  });
});
