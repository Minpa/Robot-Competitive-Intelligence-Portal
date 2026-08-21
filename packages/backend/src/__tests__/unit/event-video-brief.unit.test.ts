import { describe, it, expect } from 'vitest';
import { parseEventBrief, getEventConfig, parseEventTrendSummary } from '../../services/event-video-brief.service.js';

describe('parseEventBrief', () => {
  it('caps lists at 3 items and 120 chars each', () => {
    const text = JSON.stringify({
      mainProducts: ['a'.repeat(200), 'b', 'c', 'd'],
      demoContents: ['x', 'y', 'z', 'w'],
      insights: ['i'.repeat(150)],
    });
    const brief = parseEventBrief(text, 'test-model');
    expect(brief).not.toBeNull();
    expect(brief!.mainProducts).toHaveLength(3);
    expect(brief!.mainProducts[0].length).toBe(120);
    expect(brief!.demoContents).toHaveLength(3);
    expect(brief!.insights[0].length).toBe(120);
    expect(brief!.model).toBe('test-model');
    expect(typeof brief!.briefedAt).toBe('string');
  });

  it('filters non-string and empty entries', () => {
    const text = JSON.stringify({
      mainProducts: ['ok', 42, '', '   ', null],
      demoContents: [],
      insights: ['fine'],
    });
    const brief = parseEventBrief(text, 'm');
    expect(brief!.mainProducts).toEqual(['ok']);
    expect(brief!.demoContents).toEqual([]);
    expect(brief!.insights).toEqual(['fine']);
  });

  it('returns null when all three sections are empty (treated as failure)', () => {
    const text = JSON.stringify({ mainProducts: [], demoContents: [], insights: [] });
    expect(parseEventBrief(text, 'm')).toBeNull();
  });

  it('recovers JSON embedded in surrounding text', () => {
    const text = '설명입니다 {"mainProducts":["p"],"demoContents":[],"insights":[]} 끝';
    const brief = parseEventBrief(text, 'm');
    expect(brief!.mainProducts).toEqual(['p']);
  });

  it('returns null for unparseable text', () => {
    expect(parseEventBrief('not json at all', 'm')).toBeNull();
  });
});

describe('getEventConfig', () => {
  it('returns wrc2026 config and null for unknown keys', () => {
    expect(getEventConfig('wrc2026')?.label).toContain('WRC 2026');
    expect(getEventConfig('nope')).toBeNull();
  });
});

describe('parseEventTrendSummary', () => {
  it('truncates headline to 120 chars and caps points at 6 items x 160 chars', () => {
    const text = JSON.stringify({
      headline: 'h'.repeat(200),
      points: Array.from({ length: 8 }, (_, i) => `p${i}-`.repeat(50)),
    });
    const parsed = parseEventTrendSummary(text);
    expect(parsed).not.toBeNull();
    expect(parsed!.headline.length).toBe(120);
    expect(parsed!.points).toHaveLength(6);
    for (const p of parsed!.points) {
      expect(p.length).toBeLessThanOrEqual(160);
    }
  });

  it('returns null when headline is missing and points is empty', () => {
    const text = JSON.stringify({ points: [] });
    expect(parseEventTrendSummary(text)).toBeNull();
  });

  it('recovers JSON embedded in surrounding text', () => {
    const text = '분석 결과입니다\n{"headline":"핵심 트렌드 요약","points":["포인트 1","포인트 2"]}\n끝.';
    const parsed = parseEventTrendSummary(text);
    expect(parsed).not.toBeNull();
    expect(parsed!.headline).toBe('핵심 트렌드 요약');
    expect(parsed!.points).toEqual(['포인트 1', '포인트 2']);
  });
});
