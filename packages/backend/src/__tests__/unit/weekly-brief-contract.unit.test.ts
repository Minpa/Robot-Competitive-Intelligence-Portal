/**
 * 백엔드와 프론트의 types/weekly-brief.ts 가 (주석·공백을 제외하고) 동일한지 — 드리프트 방지
 * + 샘플 픽스처가 타입 계약과 맞는지
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { weeklyBriefEmptySample, weeklyBriefPartialSample, weeklyBriefSample } from '../fixtures/weekly-brief.fixture.js';
import { expectReportShape } from '../fixtures/expect-report-shape.js';
import { REPORT_SAMPLE_NAMES, backendSamplesDir, frontendSamplesDir, generateReportSamples, serializeSample } from '../fixtures/generate-weekly-report-samples.js';
import { narrativeCharCount } from '../../services/weekly-brief-compose-report.js';
import { isWeeklyReportPayload, isWeeklyReportResponse, weeklyBriefSchemaVersionOf, type WeeklyBriefV1Response, type WeeklyReportResponse } from '../../types/weekly-brief.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendFile = path.resolve(here, '../../types/weekly-brief.ts');
const frontendFile = path.resolve(here, '../../../../frontend/src/types/weekly-brief.ts');

/** 블록 주석, 줄 주석, 공백을 모두 제거한 비교용 문자열 */
function normalize(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
    .replace(/\s+/g, '');
}

describe('weekly-brief type contract', () => {
  it('backend and frontend types/weekly-brief.ts are identical apart from comments and whitespace', () => {
    const be = normalize(fs.readFileSync(backendFile, 'utf-8'));
    const fe = normalize(fs.readFileSync(frontendFile, 'utf-8'));
    expect(be.length).toBeGreaterThan(500);
    expect(fe).toBe(be);
  });

  it('normalize drops comments but keeps code (self-check)', () => {
    expect(normalize('a /* c */ b // d\n c')).toBe('abc');
    expect(normalize("const u = 'http://x';")).toBe("constu='http://x';");
  });
});

describe('sample fixtures', () => {
  const REQUIRED_PAYLOAD_KEYS = ['schemaVersion', 'header', 'keyMessages', 'topVideo', 'ciChanges', 'ciSummary', 'keywords', 'videos', 'articles', 'papers', 'meta'];

  it.each([
    ['ok', weeklyBriefSample as WeeklyBriefV1Response],
    ['empty', weeklyBriefEmptySample as WeeklyBriefV1Response],
    ['partial', weeklyBriefPartialSample as WeeklyBriefV1Response],
  ] as const)('%s sample has the full payload shape and the limits of the contract', (_n, s) => {
    expect(Object.keys(s.payload)).toEqual(expect.arrayContaining(REQUIRED_PAYLOAD_KEYS));
    expect(s.payload.schemaVersion).toBe(1);
    expect(s.payload.keyMessages.length).toBeLessThanOrEqual(3);
    expect(s.payload.ciChanges.length).toBeLessThanOrEqual(4);
    expect(s.payload.keywords.length).toBeLessThanOrEqual(8);
    expect(s.payload.videos.length).toBeLessThanOrEqual(8);
    expect(s.payload.articles.length).toBeLessThanOrEqual(12);
    expect(s.payload.papers.length).toBeLessThanOrEqual(8);
    expect(typeof s.payload.header.counts.papers).toBe('number');
    expect(s.payload.header.deltas).toHaveProperty('papers');
    expect(s.payload.header.weekStart).toBe('2026-10-19');
    expect(s.payload.header.weekEnd).toBe('2026-10-25');
    expect(s.payload.header.weekNumber).toBe(43);
    expect(s.payload.header.periodStartAt).toBe('2026-10-18T15:00:00.000Z');
    expect(s.payload.header.periodEndAt).toBe('2026-10-25T14:59:59.999Z');
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });

  it('the ok sample exercises every section, the empty one none, the partial one mixes', () => {
    const ok = (weeklyBriefSample as WeeklyBriefV1Response).payload;
    expect(ok.keyMessages[0]!.kind).toBe('stat');
    expect(ok.topVideo).not.toBeNull();
    expect(ok.videos).toHaveLength(8);
    expect(ok.articles).toHaveLength(12);
    expect(ok.ciChanges).toHaveLength(4);
    expect(ok.keywords).toHaveLength(8);
    expect(ok.papers).toHaveLength(6);
    const empty = (weeklyBriefEmptySample as WeeklyBriefV1Response).payload;
    expect(empty.keyMessages).toEqual([]);
    expect(empty.topVideo).toBeNull();
    expect([empty.ciChanges, empty.keywords, empty.videos, empty.articles, empty.papers].every((a) => a.length === 0)).toBe(true);
    expect(weeklyBriefEmptySample.status).toBe('partial');
    expect((weeklyBriefPartialSample as WeeklyBriefV1Response).payload.keyMessages.every((m) => m.generatedBy === 'rule')).toBe(true);
  });

  it('every link in the samples is something the HTML builder may emit (https only, youtube/ytimg hosts)', () => {
    for (const s of [weeklyBriefSample as WeeklyBriefV1Response, weeklyBriefPartialSample as WeeklyBriefV1Response]) {
      for (const v of [...(s.payload.topVideo ? [s.payload.topVideo] : []), ...s.payload.videos]) {
        if (v.url) expect(v.url).toMatch(/^https:\/\/(www\.youtube\.com|youtube\.com|youtu\.be)\//);
        if (v.thumbnail) expect(v.thumbnail).toMatch(/^https:\/\/i\.ytimg\.com\//);
      }
      for (const a of s.payload.articles) expect(a.url).toMatch(/^https:\/\//);
      for (const p of s.payload.papers) expect(p.url).toMatch(/^https:\/\/arxiv\.org\//);
    }
  });
});

/** 모델 식별자 검색 패턴 — 이 파일 자체에 식별자 문자열이 남지 않도록 조각을 이어 만든다 */
const MODEL_IDENTIFIER_RE = new RegExp(['clau' + 'de-', 'op' + 'us', 'hai' + 'ku', 'son' + 'net', 'gp' + 't-'].join('|'), 'i');

describe('v2 (report) samples', () => {
  const read = (dir: string, file: string) => fs.readFileSync(path.join(dir, file), 'utf-8');
  const samples = Object.fromEntries(REPORT_SAMPLE_NAMES.map((n) => [n, JSON.parse(read(backendSamplesDir, `${n}.json`)) as WeeklyReportResponse])) as Record<(typeof REPORT_SAMPLE_NAMES)[number], WeeklyReportResponse>;

  it('discriminates by schemaVersion (missing = 1, 2 = report, newer = unknown)', () => {
    expect(weeklyBriefSchemaVersionOf({})).toBe(1);
    expect(weeklyBriefSchemaVersionOf({ schemaVersion: 1 })).toBe(1);
    expect(weeklyBriefSchemaVersionOf({ schemaVersion: 2 })).toBe(2);
    expect(weeklyBriefSchemaVersionOf({ schemaVersion: 3 })).toBe(3);
    expect(weeklyBriefSchemaVersionOf(null)).toBe(1);
    expect(isWeeklyReportPayload(samples.full.payload)).toBe(true);
    expect(isWeeklyReportPayload(weeklyBriefSample.payload)).toBe(false);
    expect(isWeeklyReportResponse(samples.full)).toBe(true);
    expect(isWeeklyReportResponse(weeklyBriefSample)).toBe(false);
    expect(isWeeklyReportPayload({ schemaVersion: 3 })).toBe(false);
  });

  it.each(REPORT_SAMPLE_NAMES.map((n) => [n]))('%s sample matches the v2 contract (limits, 400-char strings, forbidden keys, size) and survives a JSON round trip', (n) => {
    const s = samples[n as keyof typeof samples];
    expectReportShape(s.payload);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
    expect(s.payload.header.weekStart).toBe('2026-10-19');
    expect(s.payload.header.weekNumber).toBe(43);
    expect(s.payload.header.periodStartAt).toBe('2026-10-18T15:00:00.000Z');
  });

  it('full: every section is populated within the AC ranges (narrative 4,000-7,000 chars, lower bounds)', () => {
    const p = samples.full.payload;
    expect(samples.full.status).toBe('ok');
    expect(p.highlights.length).toBeGreaterThanOrEqual(3);
    expect(p.videos.length).toBeGreaterThanOrEqual(8);
    expect(p.articles.length).toBeGreaterThanOrEqual(8);
    expect(p.papers.length).toBeGreaterThanOrEqual(5);
    expect(p.watchPoints.length).toBeGreaterThanOrEqual(3);
    expect(p.companies.length).toBeGreaterThanOrEqual(5);
    expect(p.domains.every((d) => d.status === 'active')).toBe(true);
    const n = narrativeCharCount(p);
    expect(n).toBeGreaterThanOrEqual(4000);
    expect(n).toBeLessThanOrEqual(7000);
    for (const d of p.domains) {
      const len = Array.from(d.narrative!).length;
      expect(d.generatedBy === 'rule' || (len >= 200 && len <= 400)).toBe(true);
    }
    expect(p.trends.volume.weeks).toHaveLength(8);
    expect(p.meta.sectionSources).toEqual({ highlights: 'ai', domains: 'ai', companies: 'ai', papers: 'ai', trends: 'ai', watch: 'ai' });
  });

  it('partial: the domain call failed - domain text is rule, the rest keeps AI text, status partial', () => {
    const s = samples.partial;
    expect(s.status).toBe('partial');
    expect(s.payload.meta.warnings).toContain('ai_domains_failed');
    expect(s.payload.domains.every((d) => d.generatedBy === 'rule')).toBe(true);
    expect(s.payload.highlights.every((h) => h.generatedBy === 'ai')).toBe(true);
    expect(s.payload.meta.sectionSources.domains).toBe('rule');
  });

  it('sparse: three videos only, quiet domains, a minimal but complete report; empty: no data', () => {
    const sp = samples.sparse.payload;
    expect(sp.videos).toHaveLength(3);
    expect(sp.domains.every((d) => d.status === 'quiet')).toBe(true);
    expect(sp.highlights.length).toBeGreaterThanOrEqual(1);
    expect(sp.companies).toEqual([]);
    const e = samples.empty;
    expect(e.status).toBe('partial');
    expect(e.payload.meta.warnings).toContain('no_data');
    expect(e.payload.highlights).toEqual([]);
    expect(e.payload.videos).toEqual([]);
  });

  it('no model identifier, secret or token appears in the samples; the model field is the only place a model string lives', () => {
    for (const n of REPORT_SAMPLE_NAMES) {
      const payloadText = JSON.stringify(samples[n].payload);
      expect(payloadText).not.toMatch(MODEL_IDENTIFIER_RE);
      expect(payloadText).not.toContain('sample-model');
      expect(payloadText).not.toMatch(/api[_-]?key|secret|token/i);
    }
  });

  it('the samples committed for the frontend are byte-identical to the backend ones and to what the pipeline generates now', async () => {
    const fresh = await generateReportSamples();
    for (const n of REPORT_SAMPLE_NAMES) {
      const be = read(backendSamplesDir, `${n}.json`);
      expect(read(frontendSamplesDir, `weekly-report-${n}.json`), `${n}: frontend copy`).toBe(be);
      expect(serializeSample(fresh[n]), `${n}: stale sample - rerun: npx tsx src/__tests__/fixtures/generate-weekly-report-samples.ts`).toBe(be);
    }
  });
});
