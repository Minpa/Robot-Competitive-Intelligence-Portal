/**
 * 핸드 벤치마크 시드 파일 린트 — 배포 후 조용한 시드 실패(`[HandBenchmark] seed 실패`)를 사전에 막는다.
 * DDL 제약: slug <= 50, name/manufacturer <= 255, country <= 100, image_url <= 500, raw_value <= 100, 점수 integer.
 */
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

vi.mock('../../db/index.js', async () => {
  const schema = await import('../../db/schema.js');
  return { ...schema, db: {} };
});

import { computeHandBenchmarkMarkerKey, HAND_BENCHMARK_LOCK_KEY, HAND_BENCHMARK_MARKER_PREFIX } from '../../services/hand-benchmark.service.js';

const SEED_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../db/seed-data');
const AXIS_KEYS = ['dof', 'payload', 'gripForce', 'responseSpeed', 'tactileChannels', 'weightEfficiency'];
const BRAINCO_FILE = 'hand-benchmark-v1_1-brainco.json';

interface Seed {
  version: string;
  mode?: string;
  axes?: Array<Record<string, unknown>>;
  competitors: Array<{
    slug: string; name: string; manufacturer: string; country?: string; category?: string; imageUrl?: string | null; sortOrder?: number;
    scores: Array<{ axisKey: string; currentScore: number; targetScore: number; rawValue?: string; rationale?: string }>;
  }>;
}

const files = fs.readdirSync(SEED_DIR).filter((f) => /^hand-benchmark-.*\.json$/.test(f)).sort();
const seeds = files.map((f) => ({ file: f, data: JSON.parse(fs.readFileSync(path.join(SEED_DIR, f), 'utf-8')) as Seed }));
const all = seeds.flatMap((s) => s.data.competitors.map((c) => ({ file: s.file, c })));

describe('hand-benchmark seed files', () => {
  it('finds v1 and the BrainCo file, BrainCo sorted after v1 (JS default sort)', () => {
    expect(files).toContain('hand-benchmark-v1.json');
    expect(files).toContain(BRAINCO_FILE);
    expect(files.indexOf(BRAINCO_FILE)).toBeGreaterThan(files.indexOf('hand-benchmark-v1.json'));
  });

  it('slug is unique across files and sortOrder is unique overall', () => {
    const slugs = all.map((x) => x.c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const orders = all.map((x) => x.c.sortOrder);
    expect(orders.every((o) => Number.isInteger(o))).toBe(true);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it.each(all.map((x) => [x.c.slug, x] as const))('%s: fields satisfy DDL limits and score rules', (_slug, { c }) => {
    expect(c.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(c.slug.length).toBeLessThanOrEqual(50);
    expect(c.name.length).toBeGreaterThan(0);
    expect(c.name.length).toBeLessThanOrEqual(255);
    expect(c.manufacturer.length).toBeGreaterThan(0);
    expect(c.manufacturer.length).toBeLessThanOrEqual(255);
    expect((c.country ?? '').length).toBeLessThanOrEqual(100);
    expect(['dexterous', 'industrial-5f']).toContain(c.category);
    expect((c.imageUrl ?? '').length).toBeLessThanOrEqual(500);
    expect(c.scores.map((s) => s.axisKey).sort()).toEqual([...AXIS_KEYS].sort());
    for (const s of c.scores) {
      for (const v of [s.currentScore, s.targetScore]) {
        expect(Number.isInteger(v), `${c.slug}.${s.axisKey}`).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(10);
      }
      expect(s.targetScore, `${c.slug}.${s.axisKey} target>=current`).toBeGreaterThanOrEqual(s.currentScore);
      expect((s.rawValue ?? '').length, `${c.slug}.${s.axisKey} rawValue`).toBeLessThanOrEqual(100);
    }
  });

  it('axes, when present, match the v1 definitions exactly (key + definition)', () => {
    const v1 = seeds.find((s) => s.file === 'hand-benchmark-v1.json')!.data;
    expect(v1.axes!.map((a) => a.key)).toEqual(AXIS_KEYS);
    for (const s of seeds) {
      if (!s.data.axes || s.data.axes.length === 0) continue;
      expect(s.data.axes, s.file).toEqual(v1.axes);
    }
  });

  it('BrainCo file: upsert mode, Revo 3 U21T and Revo 2 Tactile only (no legacy Revo 1)', () => {
    const b = seeds.find((s) => s.file === BRAINCO_FILE)!.data;
    expect(b.mode).toBe('upsert');
    expect(b.version).toBe('v1.1');
    expect(b.competitors.map((c) => c.slug).sort()).toEqual(['brainco-revo2-tactile', 'brainco-revo3-u21t']);
    for (const c of b.competitors) {
      expect(c.country).toBe('중국');
      expect(c.category).toBe('dexterous');
      expect(c.manufacturer).toBe('BrainCo (强脑科技)');
      expect(c.imageUrl ?? null).toBeNull();
      expect(c.sortOrder!).toBeGreaterThan(8);
      for (const s of c.scores) expect((s.rationale ?? '').length).toBeGreaterThan(0);
    }
  });

  it('only the BrainCo file uses upsert mode; v1 stays insert-only', () => {
    const modes = Object.fromEntries(seeds.map((s) => [s.file, s.data.mode ?? null]));
    expect(modes['hand-benchmark-v1.json']).toBeNull();
    expect(modes[BRAINCO_FILE]).toBe('upsert');
  });
});

describe('upsert marker key / lock', () => {
  it('has the form hand-benchmark:<file>:<sha12> and changes with the file bytes', () => {
    const raw = fs.readFileSync(path.join(SEED_DIR, BRAINCO_FILE));
    const key = computeHandBenchmarkMarkerKey(BRAINCO_FILE, raw);
    expect(key).toMatch(/^hand-benchmark:hand-benchmark-v1_1-brainco\.json:[0-9a-f]{12}$/);
    expect(key.length).toBeLessThanOrEqual(200); // data_migrations.key VARCHAR(200)
    expect(computeHandBenchmarkMarkerKey(BRAINCO_FILE, raw)).toBe(key);
    expect(computeHandBenchmarkMarkerKey(BRAINCO_FILE, Buffer.concat([raw, Buffer.from(' ')]))).not.toBe(key);
    expect(key.startsWith(HAND_BENCHMARK_MARKER_PREFIX)).toBe(true);
    expect(key.startsWith('actuator-update:')).toBe(false);
  });

  it('uses an advisory lock key distinct from the actuator (724301) and weekly brief (724302) locks', () => {
    expect(HAND_BENCHMARK_LOCK_KEY).toBe(724303);
  });
});
