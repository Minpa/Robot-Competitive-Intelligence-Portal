import { describe, it, expect } from 'vitest';
import { parseCesDemo, sortCesDemoVideos, isCesDemoCandidate } from '../../services/event-ces-demo.service.js';

describe('parseCesDemo', () => {
  it('maps a valid response to CesDemoAnalysis with model/analyzedAt', () => {
    const text = JSON.stringify({
      teleop: true,
      audience: false,
      difficulty: 3,
      publicFriendly: 4,
      funFactor: 5,
      demoIdea: '관람객이 직접 조종해보는 체험 부스로 구성',
    });
    const result = parseCesDemo(text, 'test-model');
    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      teleop: true,
      audience: false,
      difficulty: 3,
      publicFriendly: 4,
      funFactor: 5,
      demoIdea: '관람객이 직접 조종해보는 체험 부스로 구성',
      model: 'test-model',
    });
    expect(typeof result!.analyzedAt).toBe('string');
  });

  it('clamps scores to the 1~5 integer range (0 -> 1, 6.7 -> 5, 2.4 -> 2)', () => {
    const text = JSON.stringify({
      teleop: true,
      audience: true,
      difficulty: 0,
      publicFriendly: 6.7,
      funFactor: 2.4,
      demoIdea: '',
    });
    const result = parseCesDemo(text, 'm');
    expect(result).not.toBeNull();
    expect(result!.difficulty).toBe(1);
    expect(result!.publicFriendly).toBe(5);
    expect(result!.funFactor).toBe(2);
  });

  it('coerces string booleans ("true"/"false") for teleop/audience', () => {
    const text = JSON.stringify({
      teleop: 'true',
      audience: 'false',
      difficulty: 2,
      publicFriendly: 2,
      funFactor: 2,
      demoIdea: '',
    });
    const result = parseCesDemo(text, 'm');
    expect(result).not.toBeNull();
    expect(result!.teleop).toBe(true);
    expect(result!.audience).toBe(false);
  });

  it('defaults teleop/audience to false when missing', () => {
    const text = JSON.stringify({ difficulty: 2, publicFriendly: 2, funFactor: 2, demoIdea: '' });
    const result = parseCesDemo(text, 'm');
    expect(result).not.toBeNull();
    expect(result!.teleop).toBe(false);
    expect(result!.audience).toBe(false);
  });

  it('returns null when any of the three scores is uninterpretable', () => {
    const text = JSON.stringify({
      teleop: true,
      audience: true,
      difficulty: 'unknown',
      publicFriendly: 3,
      funFactor: 3,
      demoIdea: '',
    });
    expect(parseCesDemo(text, 'm')).toBeNull();
  });

  it('returns null when a required score is missing entirely', () => {
    const text = JSON.stringify({ teleop: true, audience: true, publicFriendly: 3, funFactor: 3 });
    expect(parseCesDemo(text, 'm')).toBeNull();
  });

  it('truncates demoIdea to 160 chars', () => {
    const text = JSON.stringify({
      teleop: true,
      audience: true,
      difficulty: 3,
      publicFriendly: 3,
      funFactor: 3,
      demoIdea: 'a'.repeat(200),
    });
    const result = parseCesDemo(text, 'm');
    expect(result!.demoIdea.length).toBe(160);
  });

  it('defaults demoIdea to empty string when missing', () => {
    const text = JSON.stringify({ teleop: true, audience: true, difficulty: 3, publicFriendly: 3, funFactor: 3 });
    const result = parseCesDemo(text, 'm');
    expect(result!.demoIdea).toBe('');
  });

  it('recovers JSON embedded in surrounding text', () => {
    const text =
      '분석 결과입니다\n' +
      JSON.stringify({ teleop: true, audience: false, difficulty: 2, publicFriendly: 4, funFactor: 4, demoIdea: 'x' }) +
      '\n끝.';
    const result = parseCesDemo(text, 'm');
    expect(result).not.toBeNull();
    expect(result!.demoIdea).toBe('x');
  });

  it('returns null for unparseable text', () => {
    expect(parseCesDemo('not json at all', 'm')).toBeNull();
  });
});

describe('sortCesDemoVideos', () => {
  const mk = (publicFriendly: number, funFactor: number, difficulty: number) => ({
    id: `${publicFriendly}-${funFactor}-${difficulty}`,
    cesDemo: {
      teleop: false,
      audience: false,
      difficulty,
      publicFriendly,
      funFactor,
      demoIdea: '',
      analyzedAt: '',
      model: 'm',
    },
  });

  it('sorts by (publicFriendly+funFactor) desc', () => {
    const videos = [mk(2, 2, 3), mk(5, 5, 3), mk(3, 3, 3)];
    const sorted = sortCesDemoVideos(videos);
    expect(sorted.map((v) => v.id)).toEqual(['5-5-3', '3-3-3', '2-2-3']);
  });

  it('breaks ties by difficulty asc', () => {
    const videos = [mk(3, 3, 5), mk(3, 3, 1), mk(3, 3, 3)];
    const sorted = sortCesDemoVideos(videos);
    expect(sorted.map((v) => v.id)).toEqual(['3-3-1', '3-3-3', '3-3-5']);
  });
});

describe('isCesDemoCandidate', () => {
  it('returns false when brief is null', () => {
    expect(isCesDemoCandidate({ brief: null, taskTypes: ['상호작용/데모쇼'] })).toBe(false);
  });

  it('returns true when taskTypes[0] is a candidate category', () => {
    expect(
      isCesDemoCandidate({ brief: { techKeywords: [], demoContents: [] }, taskTypes: ['상호작용/데모쇼'] })
    ).toBe(true);
    expect(isCesDemoCandidate({ brief: { techKeywords: [], demoContents: [] }, taskTypes: ['가사/서비스'] })).toBe(
      true
    );
    expect(isCesDemoCandidate({ brief: { techKeywords: [], demoContents: [] }, taskTypes: ['파지/조작'] })).toBe(
      true
    );
    expect(isCesDemoCandidate({ brief: { techKeywords: [], demoContents: [] }, taskTypes: ['전신 작업'] })).toBe(
      true
    );
  });

  it('returns true when techKeywords contain a matching keyword (텔레오퍼레이션)', () => {
    expect(
      isCesDemoCandidate({
        brief: { techKeywords: ['텔레오퍼레이션'], demoContents: [] },
        taskTypes: ['미분류'],
      })
    ).toBe(true);
  });

  it('returns true when demoContents contain a matching keyword (관람객이 직접 조종)', () => {
    expect(
      isCesDemoCandidate({
        brief: { techKeywords: [], demoContents: ['관람객이 직접 조종하는 체험형 부스'] },
        taskTypes: ['미분류'],
      })
    ).toBe(true);
  });

  it('returns false when neither taskType nor keywords match', () => {
    expect(
      isCesDemoCandidate({
        brief: { techKeywords: ['VLA', '모방학습'], demoContents: ['정적 전시'] },
        taskTypes: ['보행/이동'],
      })
    ).toBe(false);
  });
});
