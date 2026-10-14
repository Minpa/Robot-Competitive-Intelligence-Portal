import { describe, it, expect } from 'vitest';
import {
  selectClassificationTargets,
  initialClassifyState,
  reduceClassifyState,
  chunk,
  resolveBatchSize,
  resolveMaxPerRun,
  MAX_CONSECUTIVE_BATCH_FAILURES,
  type ClassifyRunState,
} from '../../services/hand-topic-classification.service.js';
import { HAND_TOPIC_VERSION } from '../../services/hand-topics.js';
import type { ArticleRow } from '../../services/tech-trend-report.service.js';

function classified(topics: string[], primary: string, version = HAND_TOPIC_VERSION) {
  return { topics, primary, classifiedAt: '2026-10-01T00:00:00.000Z', version };
}

function paper(id: string, date: string, meta: Record<string, unknown> = {}): ArticleRow {
  return { id, title: `Paper ${id}`, source: 'arxiv', publishedAt: date, extractedMetadata: meta };
}

function video(id: string, date: string, meta: Record<string, unknown> = {}): ArticleRow {
  return { id, title: `Video ${id}`, productType: 'video', source: 'youtube', publishedAt: date, extractedMetadata: meta };
}

describe('selectClassificationTargets', () => {
  it('skips rows already classified with the current version, includes old versions and unclassified', () => {
    const rows = [
      paper('a', '2026-09-01T00:00:00Z', { handTopics: classified(['sim2real'], 'sim2real') }),
      paper('b', '2026-09-02T00:00:00Z', { handTopics: classified(['sim2real'], 'sim2real', HAND_TOPIC_VERSION - 1) }),
      paper('c', '2026-09-03T00:00:00Z'),
      paper('d', '2026-09-04T00:00:00Z', { handTopics: 'garbage' }),
    ];
    const { targets } = selectClassificationTargets(rows, { cap: 100 });
    expect(targets.map((r) => r.id).sort()).toEqual(['b', 'c', 'd']);
  });

  it('treats off_topic stored rows as classified', () => {
    const rows = [paper('a', '2026-09-01T00:00:00Z', { handTopics: classified(['off_topic'], 'off_topic') })];
    expect(selectClassificationTargets(rows, { cap: 100 }).targets).toHaveLength(0);
  });

  it('excludes rows with attempts >= 3 but keeps attempts 2', () => {
    const rows = [
      paper('a', '2026-09-01T00:00:00Z', { handTopicsAttempts: 3 }),
      paper('b', '2026-09-02T00:00:00Z', { handTopicsAttempts: 2 }),
      paper('c', '2026-09-03T00:00:00Z', { handTopicsAttempts: 5 }),
    ];
    expect(selectClassificationTargets(rows, { cap: 100 }).targets.map((r) => r.id)).toEqual(['b']);
  });

  it("excludes videos with domainFocus.hand 'none' and counts them; keeps unjudged/primary/secondary", () => {
    const rows = [
      video('n', '2026-09-01T00:00:00Z', { domainFocus: { hand: { level: 'none' } } }),
      video('p', '2026-09-02T00:00:00Z', { domainFocus: { hand: { level: 'primary' } } }),
      video('s', '2026-09-03T00:00:00Z', { domainFocus: { hand: { level: 'secondary' } } }),
      video('u', '2026-09-04T00:00:00Z'),
    ];
    const { targets, skippedExcluded } = selectClassificationTargets(rows, { cap: 100 });
    expect(skippedExcluded).toBe(1);
    expect(targets.map((r) => r.id).sort()).toEqual(['p', 's', 'u']);
  });

  it('applies the cap on newest-first order across papers and videos', () => {
    const rows = [
      paper('old', '2026-06-01T00:00:00Z'),
      video('v-new', '2026-10-05T00:00:00Z'),
      paper('p-mid', '2026-08-01T00:00:00Z'),
      video('v-mid', '2026-09-01T00:00:00Z'),
    ];
    const { targets } = selectClassificationTargets(rows, { cap: 3 });
    expect(targets.map((r) => r.id)).toEqual(['v-new', 'v-mid', 'p-mid']);
  });

  it('supports overriding version (re-classification trigger)', () => {
    const rows = [paper('a', '2026-09-01T00:00:00Z', { handTopics: classified(['other'], 'other', 1) })];
    expect(selectClassificationTargets(rows, { cap: 10, version: 1 }).targets).toHaveLength(0);
    expect(selectClassificationTargets(rows, { cap: 10, version: 2 }).targets).toHaveLength(1);
  });
});

describe('reduceClassifyState', () => {
  const started = (total = 30): ClassifyRunState =>
    reduceClassifyState(initialClassifyState(), { type: 'start', total, skippedExcluded: 2, now: 't0' });

  it('start resets and marks running', () => {
    const s = started();
    expect(s).toMatchObject({
      running: true,
      total: 30,
      processed: 0,
      classified: 0,
      offTopic: 0,
      unresolved: 0,
      skippedExcluded: 2,
      aborted: false,
      startedAt: 't0',
      finishedAt: null,
    });
  });

  it('batchOk counts classified / offTopic and treats the rest as unresolved', () => {
    const s = reduceClassifyState(started(), { type: 'batchOk', size: 15, classified: 10, offTopic: 3 });
    expect(s).toMatchObject({ processed: 15, classified: 10, offTopic: 3, unresolved: 2 });
  });

  it('never lets processed exceed total', () => {
    let s = started(20);
    s = reduceClassifyState(s, { type: 'batchOk', size: 15, classified: 15, offTopic: 0 });
    s = reduceClassifyState(s, { type: 'batchOk', size: 15, classified: 15, offTopic: 0 });
    expect(s.processed).toBe(20);
  });

  it('aborts after 3 consecutive failed batches and resets the streak on success', () => {
    let s = started(100);
    s = reduceClassifyState(s, { type: 'batchFailed', size: 15 });
    s = reduceClassifyState(s, { type: 'batchFailed', size: 15 });
    expect(s.aborted).toBe(false);
    s = reduceClassifyState(s, { type: 'batchOk', size: 15, classified: 15, offTopic: 0 });
    expect(s.consecutiveFailures).toBe(0);
    for (let i = 0; i < MAX_CONSECUTIVE_BATCH_FAILURES - 1; i++) {
      s = reduceClassifyState(s, { type: 'batchFailed', size: 15 });
      expect(s.aborted).toBe(false);
    }
    s = reduceClassifyState(s, { type: 'batchFailed', size: 15 });
    expect(s.aborted).toBe(true);
    expect(s.unresolved).toBe(15 * 5);
  });

  it('finish clears running and stamps finishedAt', () => {
    const s = reduceClassifyState(started(), { type: 'finish', now: 't1' });
    expect(s.running).toBe(false);
    expect(s.finishedAt).toBe('t1');
  });
});

describe('batching helpers', () => {
  it('splits into 15-sized batches with the remainder last', () => {
    const arr = Array.from({ length: 35 }, (_, i) => i);
    const parts = chunk(arr, 15);
    expect(parts.map((p) => p.length)).toEqual([15, 15, 5]);
    expect(parts.flat()).toEqual(arr);
    expect(chunk([], 15)).toEqual([]);
  });

  it('clamps batch size to 10..20 with default 15', () => {
    expect(resolveBatchSize(undefined)).toBe(15);
    expect(resolveBatchSize('abc')).toBe(15);
    expect(resolveBatchSize('3')).toBe(10);
    expect(resolveBatchSize('50')).toBe(20);
    expect(resolveBatchSize('12')).toBe(12);
  });

  it('defaults max per run to 1000', () => {
    expect(resolveMaxPerRun(undefined)).toBe(1000);
    expect(resolveMaxPerRun('250')).toBe(250);
    expect(resolveMaxPerRun('-1')).toBe(1000);
  });
});
