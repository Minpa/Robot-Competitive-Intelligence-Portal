import { describe, it, expect } from 'vitest';
import {
  parseDomainFocus,
  parseHaikuFocusBatch,
  buildFocusJudgePrompt,
  toFocusJudgeItem,
  selectGeminiTargets,
  selectJudgeTargets,
  reduceRunState,
  initialRunState,
  type AnalysisRunState,
} from '../../services/tech-trend-analysis.service.js';
import type { ArticleRow } from '../../services/tech-trend-report.service.js';

function row(id: string, meta: Record<string, unknown> = {}, extra: Partial<ArticleRow> = {}): ArticleRow {
  return {
    id,
    title: `Video ${id}`,
    url: `https://www.youtube.com/watch?v=${id.padEnd(11, 'x')}`,
    productType: 'video',
    source: 'youtube',
    publishedAt: '2026-10-01T00:00:00.000Z',
    extractedMetadata: meta,
    ...extra,
  };
}

describe('parseDomainFocus (re-exported)', () => {
  it('parses a valid object and normalizes level', () => {
    expect(parseDomainFocus({ hand: 'primary', reason: '근거' })).toEqual({ level: 'primary', reason: '근거' });
    expect(parseDomainFocus({ hand: ' None ' })?.level).toBe('none');
  });
  it('returns null for invalid input', () => {
    expect(parseDomainFocus({ hand: 'maybe' })).toBeNull();
    expect(parseDomainFocus(null)).toBeNull();
    expect(parseDomainFocus([])).toBeNull();
  });
});

describe('parseHaikuFocusBatch', () => {
  const ids = new Set(['a', 'b', 'c']);

  it('parses a clean JSON response', () => {
    const out = parseHaikuFocusBatch(
      JSON.stringify({ results: [{ id: 'a', hand: 'primary', reason: 'r1' }, { id: 'b', hand: 'none', reason: 'r2' }] }),
      ids
    );
    expect(out).toEqual([
      { id: 'a', level: 'primary', reason: 'r1' },
      { id: 'b', level: 'none', reason: 'r2' },
    ]);
  });

  it('recovers JSON wrapped in code fences / commentary and strips cite tags', () => {
    const text =
      '다음은 결과입니다.\n```json\n{"results":[{"id":"c","hand":"secondary","reason":"<cite>근거</cite> 있음"}]}\n```\n끝';
    const out = parseHaikuFocusBatch(text, ids);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: 'c', level: 'secondary' });
    expect(out[0].reason).not.toContain('<cite');
  });

  it('drops unknown ids', () => {
    const out = parseHaikuFocusBatch(
      JSON.stringify({ results: [{ id: 'zzz', hand: 'primary', reason: '' }, { id: 'a', hand: 'primary', reason: '' }] }),
      ids
    );
    expect(out.map((r) => r.id)).toEqual(['a']);
  });

  it('drops only items with an invalid level and keeps the rest', () => {
    const out = parseHaikuFocusBatch(
      JSON.stringify({ results: [{ id: 'a', hand: 'sorta', reason: '' }, { id: 'b', hand: 'secondary', reason: '' }] }),
      ids
    );
    expect(out.map((r) => r.id)).toEqual(['b']);
  });

  it('returns an empty array when the whole response is broken', () => {
    expect(parseHaikuFocusBatch('not json at all', ids)).toEqual([]);
    expect(parseHaikuFocusBatch('{"results": "nope"}', ids)).toEqual([]);
    expect(parseHaikuFocusBatch('', ids)).toEqual([]);
  });

  it('caps reason at 120 chars', () => {
    const out = parseHaikuFocusBatch(
      JSON.stringify({ results: [{ id: 'a', hand: 'none', reason: 'x'.repeat(300) }] }),
      ids
    );
    expect(out[0].reason).toHaveLength(120);
  });
});

describe('buildFocusJudgePrompt / toFocusJudgeItem', () => {
  it('builds item fields with caps and decoded title', () => {
    const item = toFocusJudgeItem(
      row(
        'a',
        {
          description: 'd'.repeat(500),
          geminiAnalysis: {
            summaryKo: 's'.repeat(500),
            task: 't',
            capabilities: Array.from({ length: 12 }, (_, i) => `c${i}`),
            technicalAnalysis: { manipulation: 'm', hardware: 'h' },
          },
        },
        { title: 'Dex &amp; Hand' }
      )
    );
    expect(item.title).toBe('Dex & Hand');
    expect(item.description).toHaveLength(300);
    expect(item.summaryKo).toHaveLength(400);
    expect(item.capabilities).toHaveLength(8);
    expect(item.manipulation).toBe('m');
    expect(item.hardware).toBe('h');
  });

  it('prompt contains criteria, ambiguity rule and response schema', () => {
    const p = buildFocusJudgePrompt([toFocusJudgeItem(row('a', { geminiAnalysis: { summaryKo: 'x' } }))]);
    expect(p).toContain('primary');
    expect(p).toContain('secondary');
    expect(p).toContain('none');
    expect(p).toContain('애매하면');
    expect(p).toContain('"results"');
    expect(p).toContain('[영상 1건]');
  });
});

describe('selectGeminiTargets', () => {
  const opts = { maxAttempts: 2, cap: 150 };

  it('excludes rows already analyzed', () => {
    const { targets } = selectGeminiTargets([row('a', { geminiAnalysis: { summaryKo: 'x' } }), row('b')], opts);
    expect(targets.map((t) => t.id)).toEqual(['b']);
  });

  it('excludes rows whose attempts reached the limit', () => {
    const { targets } = selectGeminiTargets(
      [row('a', { geminiAnalysisAttempts: 2 }), row('b', { geminiAnalysisAttempts: 1 })],
      opts
    );
    expect(targets.map((t) => t.id)).toEqual(['b']);
  });

  it('counts non public-watch URLs as skipped', () => {
    const { targets, skipped } = selectGeminiTargets(
      [row('a', {}, { url: 'https://youtu.be/abcdefghijk' }), row('b', {}, { url: null }), row('c')],
      opts
    );
    expect(targets.map((t) => t.id)).toEqual(['c']);
    expect(skipped).toBe(2);
  });

  it('applies the cap while preserving newest-first input order', () => {
    const rows = ['a', 'b', 'c', 'd'].map((id) => row(id));
    const { targets } = selectGeminiTargets(rows, { maxAttempts: 2, cap: 2 });
    expect(targets.map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('is unaffected by the global DOMAIN_FILTER (no aiTags needed)', () => {
    const { targets } = selectGeminiTargets([row('a', { domain: 'hand' })], opts);
    expect(targets).toHaveLength(1);
    expect(targets[0]).toMatchObject({ id: 'a', title: 'Video a' });
  });
});

describe('selectJudgeTargets', () => {
  it('selects only analyzed rows without a hand judgement', () => {
    const analyzed = { geminiAnalysis: { summaryKo: 'x' } };
    const rows = [
      row('unanalyzed'),
      row('needs', analyzed),
      row('judged', { ...analyzed, domainFocus: { hand: { level: 'none', reason: '', judgedAt: 'x', source: 'haiku' } } }),
      row('badjudge', { ...analyzed, domainFocus: { hand: { level: 'bogus' } } }),
    ];
    expect(selectJudgeTargets(rows).map((r) => r.id)).toEqual(['needs', 'badjudge']);
  });
});

describe('reduceRunState', () => {
  const NOW = '2026-10-14T00:00:00.000Z';
  const started = (total: number): AnalysisRunState => reduceRunState(initialRunState(), { type: 'start', total, now: NOW });

  it('start resets counters and marks running', () => {
    const s = started(5);
    expect(s).toMatchObject({ running: true, total: 5, processed: 0, startedAt: NOW, finishedAt: null });
  });

  it('increments counters per event', () => {
    let s = started(6);
    s = reduceRunState(s, { type: 'geminiOk', judged: 'primary' });
    s = reduceRunState(s, { type: 'geminiOk', judged: 'none' });
    s = reduceRunState(s, { type: 'geminiOk', judged: null });
    s = reduceRunState(s, { type: 'geminiFailed' });
    s = reduceRunState(s, { type: 'judgeOk', level: 'none' });
    expect(s).toMatchObject({ analyzed: 3, judged: 3, excluded: 2, failed: 1, processed: 5 });
  });

  it('never lets processed exceed total', () => {
    let s = started(1);
    s = reduceRunState(s, { type: 'geminiOk', judged: null });
    s = reduceRunState(s, { type: 'geminiFailed' });
    s = reduceRunState(s, { type: 'judgeUnresolved', count: 5 });
    expect(s.processed).toBe(1);
  });

  it('fallback increases total', () => {
    let s = started(2);
    s = reduceRunState(s, { type: 'fallback', count: 3 });
    expect(s.total).toBe(5);
  });

  it('finish sets running=false and finishedAt', () => {
    const s = reduceRunState(started(1), { type: 'finish', now: '2026-10-14T01:00:00.000Z' });
    expect(s.running).toBe(false);
    expect(s.finishedAt).toBe('2026-10-14T01:00:00.000Z');
  });

  it('quota sets quotaHit without increasing failed or processed', () => {
    const s = reduceRunState(started(3), { type: 'quota' });
    expect(s).toMatchObject({ quotaHit: true, failed: 0, processed: 0, skipped: 1 });
  });

  it('budget and judgeSkipped flags, skipped count', () => {
    let s = started(3);
    s = reduceRunState(s, { type: 'budget' });
    s = reduceRunState(s, { type: 'judgeSkipped' });
    s = reduceRunState(s, { type: 'skipped', count: 4 });
    expect(s).toMatchObject({ budgetHit: true, judgeSkipped: true, skipped: 4 });
  });

  it('initial status (never run) is idle with zero counters', () => {
    expect(initialRunState()).toMatchObject({ running: false, total: 0, startedAt: null, finishedAt: null });
  });
});
