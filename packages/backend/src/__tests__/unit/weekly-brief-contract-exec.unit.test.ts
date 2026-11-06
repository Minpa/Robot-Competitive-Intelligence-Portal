/**
 * v3 타입 계약 — 판별 함수, 샘플 픽스처(백엔드·프론트 복사본 일치, 생성기와 일치), 금지 키·문자열 길이·모델명 없음
 * (백엔드/프론트 types/weekly-brief.ts 동일성은 weekly-brief-contract.unit.test.ts 가 검사한다)
 */
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

vi.mock('../../db/index.js', () => ({ db: {} }));

import { EXEC_SAMPLE_NAMES, backendExecSamplesDir, frontendExecSamplesDir, generateExecSamples, serializeExecSample } from '../fixtures/generate-weekly-exec-samples.js';
import {
  WEEKLY_BRIEF_EXECUTIVE_SCHEMA_VERSION,
  isWeeklyExecutivePayload,
  isWeeklyExecutiveResponse,
  isWeeklyReportPayload,
  weeklyBriefSchemaVersionOf,
  type WeeklyExecutiveResponse,
} from '../../types/weekly-brief.js';
import { narrativeCharCount } from '../../services/weekly-brief-compose-exec.js';

const read = (dir: string, f: string) => fs.readFileSync(path.join(dir, f), 'utf-8');
const MODEL_IDENTIFIER_RE = new RegExp(['clau' + 'de-', 'op' + 'us', 'hai' + 'ku', 'son' + 'net', 'gp' + 't-'].join('|'), 'i');
const samples = Object.fromEntries(EXEC_SAMPLE_NAMES.map((n) => [n, JSON.parse(read(backendExecSamplesDir, `${n}.json`)) as WeeklyExecutiveResponse])) as Record<(typeof EXEC_SAMPLE_NAMES)[number], WeeklyExecutiveResponse>;

function walk(v: unknown, cb: (key: string | null, value: unknown) => void, key: string | null = null): void {
  cb(key, v);
  if (Array.isArray(v)) v.forEach((x) => walk(x, cb, key));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, cb, k);
}

describe('v3 type guards', () => {
  it('discriminates by payload.schemaVersion', () => {
    expect(WEEKLY_BRIEF_EXECUTIVE_SCHEMA_VERSION).toBe(3);
    expect(weeklyBriefSchemaVersionOf(samples.full.payload)).toBe(3);
    expect(isWeeklyExecutivePayload(samples.full.payload)).toBe(true);
    expect(isWeeklyExecutiveResponse(samples.full)).toBe(true);
    expect(isWeeklyReportPayload(samples.full.payload)).toBe(false);
    expect(isWeeklyExecutivePayload({ schemaVersion: 2 })).toBe(false);
    expect(isWeeklyExecutivePayload({})).toBe(false);
    expect(isWeeklyExecutivePayload(null)).toBe(false);
  });
});

describe('v3 sample fixtures', () => {
  it('has the six section keys and no cover figures', () => {
    for (const n of EXEC_SAMPLE_NAMES) {
      const p = samples[n].payload;
      for (const k of ['conclusions', 'gaps', 'tech', 'business', 'questions', 'evidence', 'meta', 'header']) expect(p, `${n}.${k}`).toHaveProperty(k);
      expect(p.schemaVersion).toBe(3);
    }
  });

  it('every string is <= 400 chars, none are empty, and there are no forbidden keys, model names, secrets, undefined/NaN', () => {
    for (const n of EXEC_SAMPLE_NAMES) {
      walk(samples[n].payload, (key, value) => {
        if (key && ['content', 'description', 'abstract', 'originalText'].includes(key)) throw new Error(`${n}: forbidden key ${key}`);
        if (typeof value === 'string') {
          expect(Array.from(value).length, `${n}.${key}`).toBeLessThanOrEqual(400);
          expect(value.length, `${n}.${key} empty`).toBeGreaterThan(0);
        }
        if (typeof value === 'number') expect(Number.isFinite(value), `${n}.${key} not finite`).toBe(true);
      });
      const text = JSON.stringify(samples[n].payload);
      expect(text).not.toMatch(MODEL_IDENTIFIER_RE);
      expect(text).not.toContain('sample-model');
      expect(text).not.toMatch(/api[_-]?key|secret|token/i);
      expect(text).not.toMatch(/\bundefined\b|\bNaN\b|"null"/);
    }
  });

  it('full sample respects section counts: conclusions <= 5, questions 2-4, gaps <= 6, signals <= 6, videos 6-8, articles 6-8, papers <= 5', () => {
    const p = samples.full.payload;
    expect(p.conclusions.length).toBeGreaterThanOrEqual(3);
    expect(p.conclusions.length).toBeLessThanOrEqual(5);
    expect(p.questions.length).toBeGreaterThanOrEqual(2);
    expect(p.questions.length).toBeLessThanOrEqual(4);
    expect(p.gaps.rows.length).toBeLessThanOrEqual(6);
    expect(p.tech.signals.length).toBeLessThanOrEqual(6);
    expect(p.evidence.videos.length).toBeGreaterThanOrEqual(6);
    expect(p.evidence.videos.length).toBeLessThanOrEqual(8);
    expect(p.evidence.articles.length).toBeGreaterThanOrEqual(6);
    expect(p.evidence.articles.length).toBeLessThanOrEqual(8);
    expect(p.evidence.papers.length).toBeLessThanOrEqual(5);
    expect(narrativeCharCount(p)).toBeGreaterThan(1000);
  });

  it('hrefs in payload evidence are https only', () => {
    for (const n of EXEC_SAMPLE_NAMES) {
      walk(samples[n].payload, (key, value) => {
        if ((key === 'url' || key === 'sourceUrl' || key === 'thumbnail') && typeof value === 'string') expect(value.startsWith('https://')).toBe(true);
      });
    }
  });

  it('the samples committed for the frontend are byte-identical to the backend ones and to what the pipeline generates now', async () => {
    const fresh = await generateExecSamples();
    for (const n of EXEC_SAMPLE_NAMES) {
      const be = read(backendExecSamplesDir, `${n}.json`);
      expect(read(frontendExecSamplesDir, `weekly-exec-${n}.json`), `${n}: frontend copy`).toBe(be);
      expect(serializeExecSample(fresh[n]), `${n}: stale sample - rerun: npx tsx src/__tests__/fixtures/generate-weekly-exec-samples.ts`).toBe(be);
    }
  });
});
