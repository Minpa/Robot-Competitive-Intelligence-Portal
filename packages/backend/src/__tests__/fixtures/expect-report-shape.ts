/**
 * v2 payload 구조가 types/weekly-brief.ts 의 WeeklyReportPayload 와 일치하는지(런타임 검사) — 계약·통합 테스트 공용
 */
import { expect } from 'vitest';

const isStr = (v: unknown) => typeof v === 'string';
const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const strOrNull = (v: unknown) => v === null || isStr(v);
const DOMAIN_KEYS = ['hand', 'actuator', 'rfm', 'expo', 'production'];
const SECTION_KEYS = ['highlights', 'domains', 'companies', 'papers', 'trends', 'watch'];

function walkStrings(v: unknown, fn: (s: string, path: string) => void, path = ''): void {
  if (typeof v === 'string') fn(v, path);
  else if (Array.isArray(v)) v.forEach((x, i) => walkStrings(x, fn, `${path}[${i}]`));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkStrings(x, fn, `${path}.${k}`);
}

function walkKeys(v: unknown, fn: (k: string) => void): void {
  if (Array.isArray(v)) v.forEach((x) => walkKeys(x, fn));
  else if (v && typeof v === 'object')
    for (const [k, x] of Object.entries(v)) {
      fn(k);
      walkKeys(x, fn);
    }
}

export const REPORT_PAYLOAD_KEYS = ['articles', 'ciSummary', 'companies', 'domains', 'header', 'highlights', 'meta', 'papers', 'schemaVersion', 'trends', 'videos', 'watchPoints'];

export function expectReportShape(p: any): void {
  expect(Object.keys(p).sort()).toEqual(REPORT_PAYLOAD_KEYS);
  expect(p.schemaVersion).toBe(2);
  const h = p.header;
  for (const k of ['weekStart', 'weekEnd', 'periodStartAt', 'periodEndAt', 'generatedAt']) expect(isStr(h[k])).toBe(true);
  for (const k of ['articles', 'videosNew', 'videosAnalyzed', 'papers', 'ciUpdates', 'alerts']) {
    expect(isNum(h.counts[k])).toBe(true);
    expect(h.deltas[k] === null || isNum(h.deltas[k])).toBe(true);
  }

  // 한도
  expect(p.highlights.length).toBeLessThanOrEqual(5);
  expect(p.companies.length).toBeLessThanOrEqual(8);
  expect(p.videos.length).toBeLessThanOrEqual(12);
  expect(p.papers.length).toBeLessThanOrEqual(8);
  expect(p.articles.length).toBeLessThanOrEqual(12);
  expect(p.watchPoints.length).toBeLessThanOrEqual(5);
  expect(p.trends.keywords.length).toBeLessThanOrEqual(12);
  expect(p.domains.map((d: any) => d.key)).toEqual(DOMAIN_KEYS);

  const evidence = (e: any) => {
    expect(['video', 'paper', 'article', 'ci', 'keyword']).toContain(e.type);
    expect(isStr(e.id) && isStr(e.title) && strOrNull(e.url)).toBe(true);
    expect(e.label === undefined || strOrNull(e.label)).toBe(true);
    if (e.url) expect(e.url).toMatch(/^https:\/\//);
    expect(Array.from(e.title as string).length).toBeLessThanOrEqual(120);
  };
  for (const hl of p.highlights) {
    expect(['ai', 'rule']).toContain(hl.generatedBy);
    expect(['domain_share', 'keyword_surge', 'ci_change', 'top_company', 'volume_change', 'top_video', 'volume_summary']).toContain(hl.candidateType);
    expect(isStr(hl.id) && isStr(hl.headline) && isStr(hl.body) && isStr(hl.basis)).toBe(true);
    expect(Array.from(hl.headline as string).length).toBeLessThanOrEqual(40);
    expect(Array.from(hl.body as string).length).toBeLessThanOrEqual(260);
    expect(Array.from(hl.basis as string).length).toBeLessThanOrEqual(120);
    expect(hl.evidence.length).toBeGreaterThanOrEqual(1);
    expect(hl.evidence.length).toBeLessThanOrEqual(3);
    hl.evidence.forEach(evidence);
    if (hl.figure) {
      expect(isStr(hl.figure.value) && strOrNull(hl.figure.unit) && isStr(hl.figure.caption)).toBe(true);
      expect(Array.from(hl.figure.value as string).length).toBeLessThanOrEqual(24);
      expect(hl.figure.unit === null || Array.from(hl.figure.unit as string).length <= 4).toBe(true);
      expect(Array.from(hl.figure.caption as string).length).toBeLessThanOrEqual(50);
      if (hl.figure.delta) expect([hl.figure.delta.value, hl.figure.delta.unit, hl.figure.delta.label].every(isStr)).toBe(true);
    }
  }
  const card = (c: any) => {
    expect(['video', 'paper', 'article']).toContain(c.type);
    expect(isStr(c.id) && isStr(c.title) && isStr(c.source) && strOrNull(c.titleKo) && strOrNull(c.publishedAt) && strOrNull(c.line) && strOrNull(c.url)).toBe(true);
    expect(Array.from(c.title as string).length).toBeLessThanOrEqual(120);
    expect(Array.from(c.source as string).length).toBeLessThanOrEqual(60);
    expect(c.line === null || Array.from(c.line as string).length <= 120).toBe(true);
    expect(c.titleKo === null || Array.from(c.titleKo as string).length <= 80).toBe(true);
    if (c.url) expect(c.url).toMatch(/^https:\/\//);
  };
  for (const d of p.domains) {
    expect(Array.from(d.label as string).length).toBeLessThanOrEqual(16);
    expect(['active', 'quiet']).toContain(d.status);
    expect(['ai', 'rule']).toContain(d.generatedBy);
    const f = d.figures;
    expect([f.videos, f.second, f.total, f.sharePct].every(isNum)).toBe(true);
    expect(['paper', 'article']).toContain(f.secondKind);
    expect(f.prevSharePct === null || isNum(f.prevSharePct)).toBe(true);
    expect(f.deltaPp === null || isNum(f.deltaPp)).toBe(true);
    expect(d.topTags.length).toBeLessThanOrEqual(5);
    for (const t of d.topTags) expect(isStr(t.tag) && isNum(t.count)).toBe(true);
    d.evidence.forEach(card);
    if (d.status === 'active') {
      expect(isStr(d.narrative)).toBe(true);
      expect(Array.from(d.narrative as string).length).toBeLessThanOrEqual(400);
      expect(d.evidence.length).toBeGreaterThanOrEqual(3);
      expect(d.evidence.length).toBeLessThanOrEqual(5);
    } else {
      expect(d.narrative).toBeNull();
      expect(d.evidence.length).toBeLessThanOrEqual(2);
    }
  }
  for (const c of p.companies) {
    expect(isStr(c.id) && isStr(c.name) && isStr(c.blurb)).toBe(true);
    expect(Array.from(c.name as string).length).toBeLessThanOrEqual(60);
    expect(Array.from(c.blurb as string).length).toBeLessThanOrEqual(200);
    expect([c.counts.total, c.counts.videos, c.counts.articles, c.counts.prevTotal].every(isNum)).toBe(true);
    expect(c.counts.deltaPct === null || isNum(c.counts.deltaPct)).toBe(true);
    expect(c.items.length).toBeLessThanOrEqual(3);
    c.items.forEach(card);
    expect(c.ciChanges.length).toBeLessThanOrEqual(2);
    for (const k of c.ciChanges) {
      expect([k.id, k.item, k.after, k.changedAt].every(isStr) && strOrNull(k.layer) && strOrNull(k.before) && strOrNull(k.sourceName) && strOrNull(k.sourceUrl) && strOrNull(k.meaning)).toBe(true);
      expect(['A', 'B', 'C', 'D', 'F']).toContain(k.confidence);
      expect(k.meaning === null || Array.from(k.meaning as string).length <= 80).toBe(true);
    }
  }
  let tops = 0;
  p.videos.forEach((v: any, i: number) => {
    expect([v.id, v.title].every(isStr) && strOrNull(v.titleKo) && strOrNull(v.channel) && strOrNull(v.publishedAt) && strOrNull(v.url) && strOrNull(v.thumbnail)).toBe(true);
    expect(v.views === null || isNum(v.views)).toBe(true);
    expect(v.durationSec === null || isNum(v.durationSec)).toBe(true);
    expect(typeof v.analyzed).toBe('boolean');
    expect(typeof v.isTop).toBe('boolean');
    if (v.isTop) {
      tops++;
      expect(i).toBe(0);
    }
    expect(v.domain === null || DOMAIN_KEYS.includes(v.domain)).toBe(true);
    expect(v.summaryLines.length).toBeLessThanOrEqual(3);
    expect(v.summaryLines.reduce((n: number, s: string) => n + Array.from(s).length, 0)).toBeLessThanOrEqual(300);
    for (const s of v.summaryLines) expect(Array.from(s as string).length).toBeLessThanOrEqual(110);
    expect(v.tags.length).toBeLessThanOrEqual(4);
    for (const t of v.tags) expect(Array.from(t as string).length).toBeLessThanOrEqual(20);
    if (v.url) expect(v.url).toMatch(/^https:\/\/(www\.youtube\.com|youtube\.com|youtu\.be)\//);
    if (v.thumbnail) expect(v.thumbnail).toMatch(/^https:\/\/i\.ytimg\.com\//);
  });
  expect(tops).toBe(p.videos.length > 0 ? 1 : 0);
  for (const x of p.papers) {
    expect([x.id, x.title, x.url].every(isStr) && strOrNull(x.titleKo) && strOrNull(x.authors) && strOrNull(x.publishedAt) && strOrNull(x.arxivId) && strOrNull(x.whyItMatters)).toBe(true);
    expect(x.url).toMatch(/^https:\/\/arxiv\.org\//);
    expect(x.domain === null || DOMAIN_KEYS.includes(x.domain)).toBe(true);
    expect(x.summaryLines.length).toBeLessThanOrEqual(2);
    for (const s of x.summaryLines) expect(Array.from(s as string).length).toBeLessThanOrEqual(120);
    expect(x.whyItMatters === null || Array.from(x.whyItMatters as string).length <= 90).toBe(true);
  }
  for (const a of p.articles) {
    expect([a.id, a.title, a.source, a.url].every(isStr) && strOrNull(a.titleKo) && strOrNull(a.publishedAt)).toBe(true);
    expect(a.url).toMatch(/^https:\/\//);
    expect(a.domain === null || DOMAIN_KEYS.includes(a.domain)).toBe(true);
    expect(a.summaryLines.length).toBeLessThanOrEqual(2);
    for (const s of a.summaryLines) expect(Array.from(s as string).length).toBeLessThanOrEqual(100);
  }
  expect(isNum(p.ciSummary.updates) && isNum(p.ciSummary.companies)).toBe(true);
  expect(p.trends.volume.weeks.length).toBeLessThanOrEqual(8);
  for (const w of p.trends.volume.weeks) expect(isStr(w.weekStart) && isNum(w.videos) && isNum(w.articles) && isNum(w.papers)).toBe(true);
  for (const k of p.trends.keywords) {
    expect([k.keywordId, k.term].every(isStr) && isNum(k.count) && isNum(k.prevCount)).toBe(true);
    expect(['up', 'down', 'new', 'flat']).toContain(k.direction);
  }
  expect(p.trends.keywordNote === null || Array.from(p.trends.keywordNote as string).length <= 240).toBe(true);
  for (const w of p.watchPoints) {
    expect(isStr(w.id) && isStr(w.title) && isStr(w.body)).toBe(true);
    expect(Array.from(w.title as string).length).toBeLessThanOrEqual(40);
    expect(Array.from(w.body as string).length).toBeLessThanOrEqual(180);
    expect(w.evidence.length).toBeGreaterThanOrEqual(1);
    expect(w.evidence.length).toBeLessThanOrEqual(2);
    w.evidence.forEach(evidence);
    expect(['ai', 'rule']).toContain(w.generatedBy);
  }
  expect(typeof p.meta.aiUsed).toBe('boolean');
  expect(isNum(p.meta.ruleBasedSections)).toBe(true);
  expect(Object.keys(p.meta.sectionSources).sort()).toEqual([...SECTION_KEYS].sort());
  for (const s of Object.values(p.meta.sectionSources)) expect(['ai', 'mixed', 'rule', 'none']).toContain(s);
  expect(Array.isArray(p.meta.warnings)).toBe(true);
  expect(typeof p.meta.truncated).toBe('boolean');

  // ARGOS_I 제약: 모든 문자열 400자 이하, 금지 키 없음, 직렬화 250KB 이하
  walkStrings(p, (s, path) => {
    expect(Array.from(s).length, path).toBeLessThanOrEqual(400);
    expect(s.length, `${path} must not be an empty string`).toBeGreaterThan(0);
  });
  walkKeys(p, (k) => expect(['content', 'description', 'abstract', 'originalText']).not.toContain(k));
  expect(JSON.stringify(p).length).toBeLessThanOrEqual(250 * 1024);
}
