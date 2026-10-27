import { describe, it, expect } from 'vitest';
import { YOUTUBE_CHANNELS } from '../youtube-collector.service.js';

describe('YOUTUBE_CHANNELS', () => {
  it('has exactly one BrainCo channel in the hand domain', () => {
    const b = YOUTUBE_CHANNELS.filter((c) => c.company === 'BrainCo');
    expect(b).toHaveLength(1);
    expect(b[0]!.domain).toBe('hand');
    expect(b[0]!.channelName).toBe('BrainCo');
  });

  it('BrainCo has a confirmed channelId or a handle (never guessed values: no name-search fallback without a handle)', () => {
    const b = YOUTUBE_CHANNELS.find((c) => c.company === 'BrainCo')!;
    expect(Boolean(b.channelId) || Boolean(b.handle)).toBe(true);
    if (b.channelId) {
      expect(b.channelId).toMatch(/^UC[\w-]{22}$/);
      expect(b.channelId).toHaveLength(24);
      expect(b.channelId).toBe('UCW4m4Zy44IkDtY-rp0wN75g');
    }
  });

  it('has no duplicate handles (when set), channelNames or channelIds', () => {
    const handles = YOUTUBE_CHANNELS.map((c) => c.handle).filter((h): h is string => !!h).map((h) => h.toLowerCase());
    expect(new Set(handles).size).toBe(handles.length);
    const names = YOUTUBE_CHANNELS.map((c) => c.channelName.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
    const ids = YOUTUBE_CHANNELS.map((c) => c.channelId).filter((i): i is string => !!i);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^UC[\w-]{22}$/);
  });

  it('every channel with a null handle has a channelId', () => {
    for (const c of YOUTUBE_CHANNELS) {
      if (!c.handle) expect(c.channelId, c.channelName).toBeTruthy();
    }
  });

  describe('BrainCo onlyMatching gate (BCI / prosthetic / education content must be filtered out)', () => {
    const gate = () => new RegExp(YOUTUBE_CHANNELS.find((c) => c.company === 'BrainCo')!.onlyMatching!, 'i');

    it('is defined and compiles as a case-insensitive RegExp', () => {
      expect(YOUTUBE_CHANNELS.find((c) => c.company === 'BrainCo')!.onlyMatching).toBeTruthy();
      expect(() => gate()).not.toThrow();
    });

    it('matches dexterous hand content', () => {
      for (const t of ['BrainCo Revo 2 dexterous hand', 'Revo 3 U21T demo', 'Revo2 Basic unboxing', '灵巧手 实机演示', 'Humanoid robot hand test', 'Tactile fingertip sensing']) {
        expect(gate().test(t), t).toBe(true);
      }
    });

    it('does not match headband / education / Revo 1 prosthetic content', () => {
      for (const t of ['BrainCo Focus headband', 'BrainCo FocusCalm for students', 'Revo 1 prosthetic hand', 'Bionic arm user story']) {
        expect(gate().test(t), t).toBe(false);
      }
    });
  });
});
