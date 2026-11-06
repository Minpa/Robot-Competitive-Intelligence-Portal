/**
 * v3 화면 컴포넌트 — 서버 렌더(renderToStaticMarkup)로 확인한다.
 *  - 비관리자 DOM 에는 편집 요소가 전혀 없다
 *  - 편집 모드: 글자 수 카운터, 되돌리기, 편집 점 표시, 입력 점검 메시지
 *  - 발행 바(배지 3종, 저장·발행·내리기), 확인 다이얼로그(변경 수·경고·미등록 축), 배너(강조 색)
 *  - 목차 앵커 유효, 스파크라인에 xmlns/url( 없음, 인쇄 시 편집 UI 숨김 클래스
 */
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { WeeklyBriefAdminEdits, WeeklyExecutiveResponse } from '@/types/weekly-brief';
import { normalizeWeeklyBrief } from '@/lib/weekly-brief-format';
import { editPath, planExecSections } from '@/lib/weekly-brief-exec';
import { ExecReport } from './ExecReport';
import { DraftBanner } from './DraftBanner';
import { EditableLine } from './EditableLine';
import { PublishBar, PublishDialog } from './PublishBar';
import { Sparkline } from './Sparkline';
import { ExecEditContext, type ExecEditApi, type WeeklyBriefEditor } from '../useWeeklyBriefEdit';
import full from '@/lib/__fixtures__/weekly-exec-full.json';
import sparse from '@/lib/__fixtures__/weekly-exec-sparse.json';
import empty from '@/lib/__fixtures__/weekly-exec-empty.json';

const FULL = normalizeWeeklyBrief(full as never) as WeeklyExecutiveResponse;
const SPARSE = normalizeWeeklyBrief(sparse as never) as WeeklyExecutiveResponse;
const EMPTY = normalizeWeeklyBrief(empty as never) as WeeklyExecutiveResponse;

const render = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

/** data-testid 를 가진 <button> 태그가 disabled 인가 (속성 순서와 무관) */
function isDisabled(markup: string, testId: string): boolean {
  const tag = [...markup.matchAll(/<button\b[^>]*>/g)].map((m) => m[0]).find((t) => t.includes(`data-testid="${testId}"`));
  if (!tag) throw new Error(`button ${testId} not found`);
  return /\sdisabled(=|\s|>)/.test(tag);
}

function editApi(over: Partial<Omit<ExecEditApi, 'valueOf'>> & { local?: Record<string, string> } = {}): ExecEditApi {
  const local = over.local ?? {};
  const base = (path: string, text: string) => local[path] ?? text;
  return {
    enabled: true,
    limits: { sentence: 200, headline: 50, question: 200, implication: 100 },
    valueOf: base,
    isEdited: (path, text) => path in local && local[path] !== text,
    problemOf: (path, text) => (base(path, text).includes('<') ? '"<" 문자는 쓸 수 없습니다' : null),
    set: () => undefined,
    revert: () => undefined,
    ...over,
  };
}

describe('non-admin DOM (no edit context)', () => {
  const out = render(h(ExecReport, { brief: FULL }));

  it('renders no editing elements at all', () => {
    expect(out).not.toMatch(/<textarea|editable-line|exec-editable|edit-counter|publish-bar|publish-badge|AI 초안으로 되돌리기|편집 모드|data-edited/);
  });

  it('renders the sections, numbering and the cover without stat cards', () => {
    for (const t of ['이번 주 결론', '경쟁사 역량 변화와 우리와의 격차', '기술 방향 신호', '사업·공급망 움직임', '리더 판단이 필요한 질문', '근거 자료 (부록)']) expect(out).toContain(t);
    expect(out).toContain('data-testid="reading-time"');
    expect(out).not.toContain('data-testid="weekly-stats"');
    expect(out).toContain('data-testid="exec-oneliner"');
  });

  it('TOC anchors all exist (nothing dead) and equal the visible sections', () => {
    const ids = new Set([...out.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]!));
    const hrefs = [...out.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]!);
    for (const href of hrefs) expect(ids.has(href), href).toBe(true);
    const tocHrefs = [...(out.match(/data-testid="toc-chips"[\s\S]*?<\/div>/)?.[0] ?? '').matchAll(/href="#([^"]+)"/g)].map((m) => m[1]!);
    expect(tocHrefs).toEqual(planExecSections(FULL.payload).map((s) => s.id));
  });

  it('numbers conclusions and questions per item and labels the sentence roles', () => {
    expect(out).toMatch(/aria-label="결론 1"/);
    expect(out).toMatch(/aria-label="질문 1"/);
    expect(out).toContain('무엇이 바뀌었나');
    expect(out).toContain('왜 중요한가');
    expect(out).toContain('그래서 무엇을');
  });

  it('gap cards show server labels, the unregistered notice, and the coverage line', () => {
    expect(out).toContain('경쟁사 우위');
    expect(out).toContain('data-testid="gap-ours-missing"');
    expect(out).toContain('우리 위치 미등록');
    expect(out).toContain('data-testid="gap-coverage"');
  });

  it('tech signals have an inline sparkline with a text alternative, direction glyph and text', () => {
    expect(out).toContain('data-testid="sparkline"');
    expect(out).toMatch(/8주 추이: [\d., %]+/);
    expect(out).toMatch(/▲|▼/);
    expect(out).toMatch(/상승|하락/);
  });

  it('appendix ends with the collection line', () => {
    const idx = out.indexOf('data-testid="collection-line"');
    expect(idx).toBeGreaterThan(0);
    expect(out.slice(idx)).toContain('이번 주 수집: 영상');
  });

  it('shows the print-hiding classes on interactive chrome and keeps cards unbroken', () => {
    expect(out).toContain('no-print');
    expect(out).toContain('report-card');
  });

  it('never prints the model name, undefined or NaN', () => {
    expect(out).not.toMatch(/sample-model|undefined|NaN/);
  });
});

describe('sparse and empty weeks', () => {
  it('sparse: conclusions/gap/tech show their empty-state lines; sections without data are hidden', () => {
    const out = render(h(ExecReport, { brief: SPARSE }));
    expect(out).toContain('이번 주 새로 판단이 필요한 변화는 확인되지 않았습니다');
    expect(out).toContain('비교 기준이 되는 우리 위치 데이터를 불러오지 못했습니다');
    expect(out).toContain('뚜렷한 방향 변화는 확인되지 않았습니다');
    expect(out).not.toContain('id="sec-questions"');
    expect(out).not.toContain('id="sec-business"');
  });

  it('empty: only the cover, the notice and the footer', () => {
    const out = render(h(ExecReport, { brief: EMPTY }));
    expect(out).toContain('data-testid="exec-empty"');
    expect(out).toContain('이번 주 수집된 데이터가 부족합니다');
    expect(out).not.toContain('<section');
    expect(out).not.toContain('data-testid="exec-toc"');
  });
});

describe('edit mode', () => {
  const c = FULL.payload.conclusions[0]!;
  const path = editPath.conclusionLine(c.id, 1);

  it('EditableLine renders plain text when the context is missing or disabled', () => {
    expect(render(h(EditableLine, { path, text: '문장입니다.' }))).toBe('<span>문장입니다.</span>');
    expect(render(h(ExecEditContext.Provider, { value: editApi({ enabled: false }) }, h(EditableLine, { path, text: '문장입니다.' })))).toBe('<span>문장입니다.</span>');
  });

  it('an editable sentence shows a counter (current/limit) and is a focusable button', () => {
    const out = render(h(ExecEditContext.Provider, { value: editApi() }, h(EditableLine, { path, text: '가나다라' })));
    expect(out).toContain('data-testid="editable-line"');
    expect(out).toContain('data-testid="edit-counter"');
    expect(out).toContain('>4/200<');
    expect(out).toContain('<button type="button"');
    expect(out).not.toContain('AI 초안으로 되돌리기');
  });

  it('an edited sentence is marked with a dot and offers "AI 초안으로 되돌리기"', () => {
    const out = render(h(ExecEditContext.Provider, { value: editApi({ local: { [path]: '고친 문장입니다.' } }) }, h(EditableLine, { path, text: '원래 문장입니다.' })));
    expect(out).toContain('data-edited="true"');
    expect(out).toContain('aria-label="편집됨"');
    expect(out).toContain('AI 초안으로 되돌리기');
    expect(out).toContain('고친 문장입니다.');
  });

  it('shows the server-style guard message immediately and announces it as an alert; the limit is path based', () => {
    const out = render(h(ExecEditContext.Provider, { value: editApi({ local: { [path]: '<b>x' } }) }, h(EditableLine, { path, text: '원래 문장입니다.' })));
    expect(out).toContain('role="alert"');
    expect(out).toContain('&quot;&lt;&quot; 문자는 쓸 수 없습니다');
    const headline = render(h(ExecEditContext.Provider, { value: editApi() }, h(EditableLine, { path: editPath.conclusionHeadline(c.id), text: '헤드라인' })));
    expect(headline).toContain('>4/50<');
  });

  it('the report renders every editable sentence as EditableLine in edit mode, and none outside it', () => {
    const on = render(h(ExecReport, { brief: FULL, edit: editApi() }));
    const n = (on.match(/data-testid="editable-line"/g) ?? []).length;
    const p = FULL.payload;
    const expected =
      p.conclusions.reduce((a, x) => a + 1 + x.lines.length, 0) +
      p.gaps.summary.length +
      p.gaps.rows.reduce((a, x) => a + x.lines.length, 0) +
      p.tech.signals.reduce((a, x) => a + x.lines.length, 0) +
      p.business.moves.reduce((a, x) => a + x.lines.length, 0) +
      p.questions.reduce((a, x) => a + 1 + x.rationale.length, 0) +
      p.evidence.papers.length;
    expect(n).toBe(expected);
    const off = render(h(ExecReport, { brief: FULL, edit: editApi({ enabled: false }) }));
    expect(off).not.toContain('editable-line');
  });

  it('edit chrome is hidden when printing (no-print on badge, bar, dialog)', () => {
    const badge = render(h(ExecReport, { brief: FULL, badge: { label: '미발행(초안)', tone: 'draft' } }));
    expect(badge).toMatch(/class="no-print m-0 mt-3" data-testid="publish-badge"/);
  });
});

function fakeEditor(over: Omit<Partial<WeeklyBriefEditor>, 'data'> & { data?: Partial<WeeklyBriefAdminEdits> } = {}): WeeklyBriefEditor {
  const { data, ...rest } = over;
  return {
    data: { weekStart: '2026-10-19', publishState: 'draft', rev: 0, hasUnpublishedChanges: true, aiPayload: FULL.payload, edits: {}, effective: FULL, history: [], limits: { sentence: 200, headline: 50, question: 200, implication: 100 }, ...data },
    editMode: true,
    setEditMode: () => undefined,
    unsavedCount: 0,
    savedCount: 0,
    warnings: [],
    notice: null,
    saving: false,
    publishing: false,
    save: () => undefined,
    publish: () => undefined,
    unpublish: () => undefined,
    api: editApi(),
    ...rest,
  } as WeeklyBriefEditor;
}

describe('PublishBar', () => {
  it('draft: badge "미발행(초안)", counts, save disabled without changes, publish enabled, no unpublish button', () => {
    const out = render(h(PublishBar, { editor: fakeEditor(), missingAxes: 12 }));
    expect(out).toContain('미발행(초안)');
    expect(out).toContain('변경 문장 0개(저장 전)');
    expect(isDisabled(out, 'save-button')).toBe(true);
    expect(isDisabled(out, 'publish-button')).toBe(false);
    expect(out).not.toContain('unpublish-button');
    expect(out).toContain('no-print');
    expect(out).toContain('aria-live="polite"');
  });

  it('unsaved changes: save enabled, publish disabled until saved', () => {
    const out = render(h(PublishBar, { editor: fakeEditor({ unsavedCount: 2 }), missingAxes: 0 }));
    expect(out).toContain('변경 문장 2개(저장 전)');
    expect(isDisabled(out, 'save-button')).toBe(false);
    expect(isDisabled(out, 'publish-button')).toBe(true);
  });

  it('published + pending edits shows the "수정 사항 미반영" badge; fully published shows "발행됨" with 내리기', () => {
    const pending = render(h(PublishBar, { editor: fakeEditor({ data: { publishState: 'published', hasUnpublishedChanges: true } }), missingAxes: 0 }));
    expect(pending).toContain('발행됨 · 수정 사항 미반영');
    expect(pending).toContain('unpublish-button');
    const done = render(h(PublishBar, { editor: fakeEditor({ data: { publishState: 'published', hasUnpublishedChanges: false } }), missingAxes: 0 }));
    expect(done).toMatch(/data-testid="publish-bar-badge">발행됨</);
    expect(isDisabled(done, 'publish-button')).toBe(true);
  });

  it('shows saving state and the conflict notice in a live region', () => {
    const out = render(h(PublishBar, { editor: fakeEditor({ saving: true, notice: '다른 곳에서 수정되었습니다. 새로 불러옵니다' }), missingAxes: 0 }));
    expect(out).toContain('저장 중');
    expect(out).toContain('다른 곳에서 수정되었습니다. 새로 불러옵니다');
  });
});

describe('PublishDialog', () => {
  const props = { onCancel: () => undefined, onConfirm: () => undefined };
  it('is not rendered while closed', () => {
    expect(render(h(PublishDialog, { open: false, changedCount: 1, warnings: [], missingAxes: 0, ...props }))).toBe('');
  });

  it('lists the changed sentence count, guard warnings and the number of unregistered axes', () => {
    const out = render(h(PublishDialog, { open: true, changedCount: 4, warnings: [{ path: 'gaps.summary.0', codes: ['ending', 'direction'] }], missingAxes: 12, ...props }));
    expect(out).toContain('role="dialog"');
    expect(out).toContain('aria-modal="true"');
    expect(out).toContain('변경한 문장 4개');
    expect(out).toContain('우리 위치가 등록되지 않은 축이 12개');
    expect(out).toContain('가드 경고 2건');
    expect(out).toContain('합니다체가 아닌 문장이 있습니다');
    expect(out).toContain('격차 방향과 어긋나는 표현이 있습니다');
    expect(out).toContain('취소');
  });
});

describe('DraftBanner', () => {
  it('renders nothing without pending drafts', () => {
    expect(render(h(DraftBanner, { summary: { pending: 0, oldestWeekStart: null, oldestAgeDays: null } }))).toBe('');
    expect(render(h(DraftBanner, { summary: null }))).toBe('');
  });

  it('shows count, oldest week and elapsed days; stale at 7 days uses the emphasis color', () => {
    const normal = render(h(DraftBanner, { summary: { pending: 2, oldestWeekStart: '2026-10-12', oldestAgeDays: 3 } }));
    expect(normal).toContain('발행 대기 중인 브리프가 2건 있습니다(가장 오래된 것: 2026-10-12, 3일 경과)');
    expect(normal).toContain('data-stale="false"');
    const stale = render(h(DraftBanner, { summary: { pending: 1, oldestWeekStart: '2026-10-05', oldestAgeDays: 10 } }));
    expect(stale).toContain('data-stale="true"');
    expect(stale).toContain('text-neg');
  });
});

describe('Sparkline', () => {
  it('is a single-color inline SVG without xmlns or url()', () => {
    const out = render(h(Sparkline, { label: '촉각', series: [5, 5, 5, 5, 9, 9, 9, 9] }));
    expect(out).toContain('<svg');
    expect(out).toContain('<polyline');
    expect(out).toContain('<circle');
    expect(out).not.toMatch(/xmlns|url\(|<image|<use|foreignObject|linearGradient/i);
    expect(render(h(Sparkline, { label: 'x', series: [1] }))).toBe('');
  });
});
