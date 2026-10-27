import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HAND_COLORS, HAND_STRATEGIES } from './hand-config';

const here = path.dirname(fileURLToPath(import.meta.url));
const SEED_DIR = path.resolve(here, '../../../backend/src/db/seed-data');
const SRC = path.resolve(here, '..');

interface Seed {
  competitors: Array<{ slug: string; name: string; manufacturer: string }>;
}
const seedFiles = ['hand-benchmark-v1.json', 'hand-benchmark-v1_1-brainco.json'];
const competitors = seedFiles.flatMap((f) => (JSON.parse(fs.readFileSync(path.join(SEED_DIR, f), 'utf-8')) as Seed).competitors);

describe('hand-config coverage of the seeded hands', () => {
  it('reads both seed files (v1 + BrainCo)', () => {
    expect(competitors.length).toBeGreaterThanOrEqual(10);
    expect(competitors.map((c) => c.slug)).toEqual(expect.arrayContaining(['shadow-e3m5', 'brainco-revo3-u21t', 'brainco-revo2-tactile']));
  });

  it('every seeded slug has a HAND_COLORS entry', () => {
    for (const c of competitors) expect(HAND_COLORS[c.slug], c.slug).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('every seeded slug has a non-empty HAND_STRATEGIES entry', () => {
    for (const c of competitors) expect(HAND_STRATEGIES[c.slug]?.length ?? 0, c.slug).toBeGreaterThan(10);
  });

  it('HAND_COLORS values are unique (chips, radar polygons and leaderboard headers stay distinguishable)', () => {
    const values = Object.values(HAND_COLORS).map((v) => v.toLowerCase());
    expect(new Set(values).size).toBe(values.length);
  });

  it('HandImage has a gradient entry for every seeded manufacturer string', () => {
    const src = fs.readFileSync(path.join(SRC, 'components/hands/HandImage.tsx'), 'utf-8');
    for (const c of competitors) expect(src, c.manufacturer).toContain(`'${c.manufacturer}'`);
  });
});

describe('no hard-coded hand count', () => {
  it.each(['components/ci-update/PerfectHandBenchmark.tsx', 'app/compare/hand-benchmark/page.tsx'])('%s has no literal "8종"', (rel) => {
    expect(fs.readFileSync(path.join(SRC, rel), 'utf-8')).not.toContain('8종');
  });
});
