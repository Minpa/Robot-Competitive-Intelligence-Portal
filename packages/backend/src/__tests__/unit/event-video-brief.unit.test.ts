import { describe, it, expect } from 'vitest';
import { parseEventBrief, getEventConfig } from '../../services/event-video-brief.service.js';

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
