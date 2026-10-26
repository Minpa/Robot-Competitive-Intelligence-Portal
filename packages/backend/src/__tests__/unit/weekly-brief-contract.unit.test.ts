/**
 * 백엔드와 프론트의 types/weekly-brief.ts 가 (주석·공백을 제외하고) 동일한지 — 드리프트 방지
 * + 샘플 픽스처가 타입 계약과 맞는지
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { weeklyBriefEmptySample, weeklyBriefPartialSample, weeklyBriefSample } from '../fixtures/weekly-brief.fixture.js';

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
    ['ok', weeklyBriefSample],
    ['empty', weeklyBriefEmptySample],
    ['partial', weeklyBriefPartialSample],
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
    const ok = weeklyBriefSample.payload;
    expect(ok.keyMessages[0]!.kind).toBe('stat');
    expect(ok.topVideo).not.toBeNull();
    expect(ok.videos).toHaveLength(8);
    expect(ok.articles).toHaveLength(12);
    expect(ok.ciChanges).toHaveLength(4);
    expect(ok.keywords).toHaveLength(8);
    expect(ok.papers).toHaveLength(6);
    const empty = weeklyBriefEmptySample.payload;
    expect(empty.keyMessages).toEqual([]);
    expect(empty.topVideo).toBeNull();
    expect([empty.ciChanges, empty.keywords, empty.videos, empty.articles, empty.papers].every((a) => a.length === 0)).toBe(true);
    expect(weeklyBriefEmptySample.status).toBe('partial');
    expect(weeklyBriefPartialSample.payload.keyMessages.every((m) => m.generatedBy === 'rule')).toBe(true);
  });

  it('every link in the samples is something the HTML builder may emit (https only, youtube/ytimg hosts)', () => {
    for (const s of [weeklyBriefSample, weeklyBriefPartialSample]) {
      for (const v of [...(s.payload.topVideo ? [s.payload.topVideo] : []), ...s.payload.videos]) {
        if (v.url) expect(v.url).toMatch(/^https:\/\/(www\.youtube\.com|youtube\.com|youtu\.be)\//);
        if (v.thumbnail) expect(v.thumbnail).toMatch(/^https:\/\/i\.ytimg\.com\//);
      }
      for (const a of s.payload.articles) expect(a.url).toMatch(/^https:\/\//);
      for (const p of s.payload.papers) expect(p.url).toMatch(/^https:\/\/arxiv\.org\//);
    }
  });
});
