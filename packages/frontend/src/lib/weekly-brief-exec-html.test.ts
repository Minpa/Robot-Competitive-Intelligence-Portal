/**
 * v3 다운로드 HTML — 금지 문자열 0개, 결정론, href·img 규칙, 스파크라인(xmlns/url( 없음), 초안 문구 유무,
 * 목차 앵커 유효, undefined/NaN/모델명 없음, 그리고 v1·v2 출력이 변경 전과 바이트 단위로 같은지(golden)
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { WeeklyExecutiveResponse } from '@/types/weekly-brief';
import { buildWeeklyBriefHtml } from './weekly-brief-html';
import { buildExecutiveHtml } from './weekly-brief-exec-html';
import { planExecSections } from './weekly-brief-exec';
import { normalizeWeeklyBrief } from './weekly-brief-format';
import { makeEmptyReport, makeFullReport, makePartialReport, makeSparseReport } from './weekly-brief-test-fixtures';
import full from './__fixtures__/weekly-exec-full.json';
import partial from './__fixtures__/weekly-exec-partial.json';
import sparse from './__fixtures__/weekly-exec-sparse.json';
import empty from './__fixtures__/weekly-exec-empty.json';

const META = { pageUrl: 'https://argos.example.com/share/weekly/2026-10-19' };
const FORBIDDEN = ['<script', '<link', '@import', 'url(', 'http://', 'javascript:', 'data:', '<iframe', '<object', '<embed', '<form', 'onerror', 'onclick', 'onload', 'xmlns=', '<foreignobject', '<use', 'xlink:href'];
const MODEL_RE = new RegExp(['clau' + 'de', 'op' + 'us', 'hai' + 'ku', 'son' + 'net', 'gp' + 't-', 'sample-model'].join('|'), 'i');
const SVG_ALLOWED = new Set(['svg', 'title', 'polyline', 'circle', 'line']);

const samples = { full, partial, sparse, empty } as Record<string, unknown>;
const brief = (name: string) => normalizeWeeklyBrief(samples[name] as never) as WeeklyExecutiveResponse;
const html = (name: string, draft = false) => buildWeeklyBriefHtml(brief(name), { ...META, draft });

function ids(h: string): Set<string> {
  return new Set([...h.matchAll(/\bid="([^"]*)"/g)].map((m) => m[1]!));
}

function expectClean(h: string) {
  const lower = h.toLowerCase();
  for (const f of FORBIDDEN) expect(lower.includes(f), `forbidden "${f}"`).toBe(false);
  expect(/\bsrc\s*=/i.test(h.replace(/<img\b[^>]*>/gi, '')), 'src= outside <img>').toBe(false);
  for (const img of h.match(/<img\b[^>]*>/gi) ?? []) {
    const m = /\bsrc="([^"]*)"/.exec(img);
    expect(m, img).not.toBeNull();
    expect(m![1]!.startsWith('https://i.ytimg.com/'), m![1]).toBe(true);
    expect(img).toContain('loading="eager"'); // v3 정적 HTML 은 eager 필수(lazy 없음, 인쇄 시 썸네일 누락 방지, PM 결정)
    expect(img).not.toContain('loading="lazy"');
    expect(img).toContain('referrerpolicy="no-referrer"');
  }
  const known = ids(h);
  for (const a of h.match(/<a\b[^>]*>/gi) ?? []) {
    const m = /\bhref="([^"]*)"/.exec(a);
    expect(m, a).not.toBeNull();
    const href = m![1]!;
    if (href.startsWith('#')) {
      expect(href, a).toMatch(/^#[a-z0-9-]+$/);
      expect(known.has(href.slice(1)), `dead anchor ${href}`).toBe(true);
      expect(a).not.toContain('target=');
    } else {
      expect(href.startsWith('https://'), href).toBe(true);
      expect(a).toContain('target="_blank"');
      expect(a).toContain('rel="noopener noreferrer"');
    }
  }
  for (const m of h.matchAll(/\bhref="([^"]*)"/gi)) expect(m[1]!.startsWith('https://') || m[1]!.startsWith('#'), m[1]).toBe(true);
  for (const svg of h.match(/<svg\b[\s\S]*?<\/svg>/gi) ?? []) {
    for (const tag of svg.matchAll(/<([a-z][a-z0-9]*)/gi)) expect(SVG_ALLOWED.has(tag[1]!.toLowerCase()), `svg tag ${tag[1]}`).toBe(true);
    for (const num of svg.match(/points="([^"]*)"/)![1]!.split(/[ ,]/)) expect(/^-?\d+(\.\d)?$/.test(num), `coordinate ${num}`).toBe(true);
    expect(svg).not.toMatch(/\bhref\b|xmlns|url\(|<image|<use|foreignobject/i);
  }
}

function visibleText(h: string): string {
  return h.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]*>/g, ' ');
}

describe.each(['full', 'partial', 'sparse', 'empty'])('v3 HTML (%s)', (name) => {
  const out = html(name);

  it('has none of the forbidden strings and follows the href / img / svg rules', () => {
    expectClean(out);
    expect(out.startsWith('<!doctype html>')).toBe(true);
  });

  it('is deterministic: same input, same output, and the input is not mutated', () => {
    const before = JSON.stringify(samples[name]);
    expect(html(name)).toBe(out);
    expect(JSON.stringify(samples[name])).toBe(before);
  });

  it('shows no model name, undefined, NaN or null text, no editing UI, and no admin-only elements', () => {
    expect(out).not.toMatch(MODEL_RE);
    const text = visibleText(out);
    expect(text).not.toMatch(/\bundefined\b|\bNaN\b|\bnull\b|\[object/);
    expect(out).not.toMatch(/<textarea|<button|contenteditable|data-testid|publish-bar|exec-editable/i);
  });

  it('every TOC anchor has a section with that id and the TOC lists exactly the visible sections', () => {
    const sections = planExecSections(brief(name).payload);
    const tocIds = [...out.matchAll(/<div class="toc-d">([\s\S]*?)<\/div>/g)].flatMap((m) => [...m[1]!.matchAll(/href="#([^"]+)"/g)].map((x) => x[1]!));
    expect(tocIds).toEqual(sections.map((s) => s.id));
    for (const id of tocIds) expect(ids(out).has(id)).toBe(true);
  });
});

describe('v3 HTML content', () => {
  const out = html('full');

  it('has the executive structure: cover with reading time and no stat cards, six numbered sections', () => {
    expect(out).toContain('읽는 시간 약');
    expect(out).not.toContain('class="stats"');
    for (const title of ['이번 주 결론', '경쟁사 역량 변화와 우리와의 격차', '기술 방향 신호', '사업·공급망 움직임', '리더 판단이 필요한 질문', '근거 자료 (부록)']) expect(out).toContain(title);
    for (const id of ['sec-conclusions', 'sec-gap', 'sec-tech', 'sec-business', 'sec-questions', 'sec-evidence']) expect(out).toContain(`id="${id}"`);
  });

  it('role labels, direction badges, "우리 위치 미등록", sparklines and the collection line are present', () => {
    expect(out).toContain('무엇이 바뀌었나');
    expect(out).toContain('왜 중요한가');
    expect(out).toContain('그래서 무엇을');
    expect(out).toContain('경쟁사 우위');
    expect(out).toContain('우리 위치 미등록');
    expect(out).toMatch(/<svg class="spark"/);
    expect(out.match(/이번 주 수집: 영상 \d+건/g)).toHaveLength(1);
    // 수집 건수 문구는 부록 맨 끝에만 있고 그 뒤에는 섹션 닫힘과 푸터뿐
    const idx = out.indexOf('이번 주 수집:');
    expect(out.slice(idx)).toMatch(/^[^<]*<\/p><\/div><p class="totop">/);
  });

  it('breaks section pages in print and keeps cards whole', () => {
    expect(out).toContain('.sec{break-before:page');
    expect(out).toMatch(/\.card[^{]*\{[^}]*break-inside:avoid/);
  });

  it('the partial sample says some sentences are rule based; sparse/empty show their notices', () => {
    expect(html('partial')).toContain('일부 문장은 규칙 기반으로 생성되었습니다.');
    expect(html('empty')).toContain('이번 주 수집된 데이터가 부족합니다');
    expect(html('sparse')).toContain('비교 기준이 되는 우리 위치 데이터를 불러오지 못했습니다');
    expect(html('sparse')).toContain('이번 주 새로 판단이 필요한 변화는 확인되지 않았습니다');
  });

  it('escapes hostile text and breaks forbidden tokens that merely appear inside text', () => {
    const evil = JSON.parse(JSON.stringify(samples.full)) as { payload: { conclusions: { headline: string; lines: { text: string }[] }[] } };
    evil.payload.conclusions[0]!.headline = '<script>alert(1)</script> javascript:alert(1) data:text/html';
    evil.payload.conclusions[0]!.lines[0]!.text = 'onclick=x onerror=y url(evil) http://evil.example @import';
    const h = buildWeeklyBriefHtml(evil as never, META);
    expectClean(h);
    expect(h).not.toContain('<script');
  });
});

describe('draft notice', () => {
  it('is on the first body line only when the download comes from a draft', () => {
    const d = html('full', true);
    const p = html('full', false);
    expect(d).toContain('미발행 초안입니다. 발행 전 내용입니다');
    expect(p).not.toContain('미발행 초안');
    expect(d.indexOf('미발행 초안입니다')).toBeLessThan(d.indexOf('class="page"'));
    expectClean(d);
    // 초안 문구를 제외하면 같은 문서다
    expect(d.replace(/<p class="draftnote">[^<]*<\/p>/, '')).toBe(p);
    expect(buildExecutiveHtml(brief('full'), { draft: true })).toBe(d);
  });
});

describe('v1 and v2 outputs are byte-identical to the pre-v3 builder (golden)', () => {
  const golden = (name: string) => fs.readFileSync(path.resolve(__dirname, '__golden__', name), 'utf-8');
  const cases: [string, () => unknown][] = [
    ['v2-full.html', makeFullReport],
    ['v2-sparse.html', makeSparseReport],
    ['v2-empty.html', makeEmptyReport],
    ['v2-partial.html', makePartialReport],
  ];
  it.each(cases)('%s', (file, make) => {
    const out = buildWeeklyBriefHtml(make() as never, META);
    expect(out.length).toBe(golden(file).length);
    expect(out === golden(file)).toBe(true);
  });

  it('the draft flag never changes v1 or v2 output', () => {
    expect(buildWeeklyBriefHtml(makeFullReport() as never, { ...META, draft: true })).toBe(golden('v2-full.html'));
  });
});
