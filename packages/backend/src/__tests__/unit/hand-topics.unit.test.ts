import { describe, it, expect } from 'vitest';
import {
  HAND_TOPICS,
  HAND_TOPIC_VERSION,
  HAND_CORE_TOPIC_IDS,
  HAND_TOPIC_IDS_WITH_OTHER,
  buildHandTopicPrompt,
  parseHandTopicBatch,
  toPaperTopicInput,
  toVideoTopicInput,
  toTopicInput,
  getHandTopics,
  getHandTopicsAttempts,
} from '../../services/hand-topics.js';
import type { ArticleRow } from '../../services/tech-trend-report.service.js';

const N = (...ns: number[]) => new Set(ns);

function paper(extra: Partial<ArticleRow> = {}): ArticleRow {
  return {
    id: 'p1',
    title: 'Dexterous &amp; Robust Hand &quot;Control&quot;',
    summary: 'a'.repeat(900),
    source: 'arxiv',
    productType: null,
    publishedAt: '2026-09-01T00:00:00.000Z',
    extractedMetadata: {},
    ...extra,
  };
}

function video(meta: Record<string, unknown> = {}, extra: Partial<ArticleRow> = {}): ArticleRow {
  return {
    id: 'v1',
    title: 'Humanoid hand demo &amp; more',
    productType: 'video',
    source: 'youtube',
    publishedAt: '2026-09-01T00:00:00.000Z',
    extractedMetadata: meta,
    ...extra,
  };
}

describe('taxonomy integrity', () => {
  it('has 10 core topics + other + off_topic with unique ids', () => {
    const ids = HAND_TOPICS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(HAND_CORE_TOPIC_IDS).toHaveLength(10);
    expect(ids).toContain('other');
    expect(ids).toContain('off_topic');
    expect(ids).toHaveLength(12);
    expect(HAND_TOPIC_IDS_WITH_OTHER).toHaveLength(11);
    expect(HAND_TOPIC_IDS_WITH_OTHER[10]).toBe('other');
    expect(HAND_TOPIC_VERSION).toBe(1);
  });

  it('has non-empty labels, short labels and definitions', () => {
    for (const t of HAND_TOPICS) {
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.shortLabel.length).toBeGreaterThan(0);
      expect(t.definition.length).toBeGreaterThan(0);
    }
  });

  it('prompt contains every id, JSON-only instruction and the safety rules', () => {
    const prompt = buildHandTopicPrompt([toPaperTopicInput(paper(), 1)]);
    for (const t of HAND_TOPICS) expect(prompt).toContain(t.id);
    expect(prompt).toContain('추측');
    expect(prompt).toContain('마크다운');
    expect(prompt).toContain('<cite>');
    expect(prompt).toContain('JSON으로만');
    expect(prompt).toContain('"results"');
    // 애매하면 other, off_topic 단독
    expect(prompt).toMatch(/애매하면 off_topic이 아니라 other/);
  });

  it('prompt states that tactile-sensing items stay in hand scope as tactile_force (never off_topic)', () => {
    const prompt = buildHandTopicPrompt([
      toPaperTopicInput(paper({ title: 'Tactile sensing for robot arm manipulation', summary: 'tactile skin on an arm' }), 1),
    ]);
    expect(prompt).toContain('촉각(tactile) 센싱을 다루는 항목은 일반 팔 조작·범용 정책 논문이라도 핸드 범위에 포함');
    expect(prompt).toContain('tactile_force로 분류');
    expect(prompt).toMatch(/off_topic 금지/);
    // 입력 항목 자체는 그대로 전달된다
    expect(prompt).toContain('Tactile sensing for robot arm manipulation');
  });

  it('a well-formed tactile_force answer for that item is kept as-is (not turned into off_topic)', () => {
    const out = parseHandTopicBatch('{"results":[{"n":1,"primary":"tactile_force","topics":["tactile_force"]}]}', N(1));
    expect(out).toEqual([{ n: 1, primary: 'tactile_force', topics: ['tactile_force'] }]);
  });
});

describe('parseHandTopicBatch', () => {
  it('parses clean JSON', () => {
    const text = JSON.stringify({
      results: [
        { n: 1, primary: 'dexterous_hw', topics: ['dexterous_hw', 'tactile_force'] },
        { n: 2, primary: 'off_topic', topics: ['off_topic'] },
      ],
    });
    expect(parseHandTopicBatch(text, N(1, 2))).toEqual([
      { n: 1, primary: 'dexterous_hw', topics: ['dexterous_hw', 'tactile_force'] },
      { n: 2, primary: 'off_topic', topics: ['off_topic'] },
    ]);
  });

  it('recovers from code fences and surrounding prose and strips <cite>', () => {
    const text =
      '분류 결과입니다.\n```json\n{"results":[{"n":1,"primary":"<cite>sim2real</cite>","topics":["sim2real"]}]}\n```\n이상입니다.';
    expect(parseHandTopicBatch(text, N(1))).toEqual([{ n: 1, primary: 'sim2real', topics: ['sim2real'] }]);
  });

  it('accepts a top-level array (also inside a fence)', () => {
    const text = '```\n[{"n":1,"primary":"grasp_planning","topics":["grasp_planning"]}]\n```';
    expect(parseHandTopicBatch(text, N(1))).toEqual([{ n: 1, primary: 'grasp_planning', topics: ['grasp_planning'] }]);
  });

  it('accepts numeric-string n', () => {
    expect(parseHandTopicBatch('{"results":[{"n":"2","primary":"other","topics":["other"]}]}', N(2))).toHaveLength(1);
  });

  it('drops unknown n and keeps only the first of duplicate n', () => {
    const text = JSON.stringify({
      results: [
        { n: 9, primary: 'other', topics: ['other'] },
        { n: 1, primary: 'sim2real', topics: ['sim2real'] },
        { n: 1, primary: 'teleop_data', topics: ['teleop_data'] },
      ],
    });
    const out = parseHandTopicBatch(text, N(1, 2));
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ n: 1, primary: 'sim2real' });
  });

  it('drops unknown topic ids and truncates to 3 topics', () => {
    const text = JSON.stringify({
      results: [
        {
          n: 1,
          primary: 'dexterous_hw',
          topics: ['bogus', 'dexterous_hw', 'tactile_force', 'sim2real', 'teleop_data', 'dexterous_hw'],
        },
      ],
    });
    const out = parseHandTopicBatch(text, N(1));
    expect(out[0]?.topics).toEqual(['dexterous_hw', 'tactile_force', 'sim2real']);
  });

  it('prepends primary when missing from topics and keeps at most 3', () => {
    const text = JSON.stringify({
      results: [{ n: 1, primary: 'durability_cost', topics: ['dexterous_hw', 'tactile_force', 'sim2real'] }],
    });
    const out = parseHandTopicBatch(text, N(1));
    expect(out[0]?.primary).toBe('durability_cost');
    expect(out[0]?.topics).toEqual(['durability_cost', 'dexterous_hw', 'tactile_force']);
  });

  it('uses topics[0] when primary is invalid', () => {
    const text = '{"results":[{"n":1,"primary":"nonsense","topics":["sim2real","teleop_data"]}]}';
    expect(parseHandTopicBatch(text, N(1))[0]).toEqual({ n: 1, primary: 'sim2real', topics: ['sim2real', 'teleop_data'] });
  });

  it('collapses off_topic mixed with other ids into off_topic alone', () => {
    const text = '{"results":[{"n":1,"primary":"sim2real","topics":["sim2real","off_topic"]}]}';
    expect(parseHandTopicBatch(text, N(1))[0]).toEqual({ n: 1, primary: 'off_topic', topics: ['off_topic'] });
    const text2 = '{"results":[{"n":1,"primary":"off_topic","topics":["sim2real"]}]}';
    expect(parseHandTopicBatch(text2, N(1))[0]).toEqual({ n: 1, primary: 'off_topic', topics: ['off_topic'] });
  });

  it('discards items without any valid topic and returns [] for broken responses', () => {
    expect(parseHandTopicBatch('{"results":[{"n":1,"primary":"x","topics":["y"]}]}', N(1))).toEqual([]);
    expect(parseHandTopicBatch('{"results":[{"n":1}]}', N(1))).toEqual([]);
    expect(parseHandTopicBatch('not json at all', N(1))).toEqual([]);
    expect(parseHandTopicBatch('{"results": [ {"n": 1,', N(1))).toEqual([]);
    expect(parseHandTopicBatch('', N(1))).toEqual([]);
    expect(parseHandTopicBatch('{"foo":1}', N(1))).toEqual([]);
  });
});

describe('input conversion', () => {
  it('caps paper abstract at 500 chars and decodes title entities', () => {
    const input = toPaperTopicInput(paper(), 3);
    expect(input.n).toBe(3);
    expect(input.kind).toBe('paper');
    expect(input.abstract).toHaveLength(500);
    expect(input.title).toBe('Dexterous & Robust Hand "Control"');
  });

  it('caps video fields (description 300, summaryKo 400, task/hardware/manipulation 200, techTags 4)', () => {
    const v = video({
      description: 'd'.repeat(1000),
      aiTags: { techTags: ['a', 'b', 'c', 'd', 'e', 'f'] },
      geminiAnalysis: {
        summaryKo: 's'.repeat(1000),
        task: 't'.repeat(1000),
        technicalAnalysis: { hardware: 'h'.repeat(1000), manipulation: 'm'.repeat(1000) },
      },
    });
    const input = toVideoTopicInput(v, 2);
    expect(input.kind).toBe('video');
    expect(input.title).toBe('Humanoid hand demo & more');
    expect(input.description).toHaveLength(300);
    expect(input.summaryKo).toHaveLength(400);
    expect(input.task).toHaveLength(200);
    expect(input.hardware).toHaveLength(200);
    expect(input.manipulation).toHaveLength(200);
    expect(input.techTags).toEqual(['a', 'b', 'c', 'd']);
  });

  it('never reads articles.content or transcripts', () => {
    const p = { ...paper(), content: 'SECRET-FULL-TEXT' } as ArticleRow & { content: string };
    const v = video({ transcript: 'SECRET-TRANSCRIPT', description: 'ok' }, { content: 'SECRET-FULL-TEXT' } as Partial<ArticleRow>);
    const prompt = buildHandTopicPrompt([toPaperTopicInput(p, 1), toVideoTopicInput(v, 2)]);
    expect(prompt).not.toContain('SECRET');
  });

  it("marks videos without Gemini analysis as 'basic' and with analysis as 'rich'", () => {
    expect(toTopicInput(video({}), 1).inputLevel).toBe('basic');
    expect(toTopicInput(video({ geminiAnalysis: { summaryKo: 'x' } }), 1).inputLevel).toBe('rich');
    expect(toTopicInput(paper(), 1).input.kind).toBe('paper');
    expect(toTopicInput(paper(), 1).inputLevel).toBe('rich');
    expect(toTopicInput(paper({ summary: '' }), 1).inputLevel).toBe('basic');
  });
});

describe('getHandTopics / getHandTopicsAttempts', () => {
  const good = {
    topics: ['tactile_force', 'sim2real'],
    primary: 'tactile_force',
    classifiedAt: '2026-10-01T00:00:00.000Z',
    version: HAND_TOPIC_VERSION,
    inputLevel: 'rich',
    model: 'm',
  };

  it('returns a valid stored value', () => {
    expect(getHandTopics({ extractedMetadata: { handTopics: good } })).toMatchObject({
      topics: ['tactile_force', 'sim2real'],
      primary: 'tactile_force',
      version: HAND_TOPIC_VERSION,
      inputLevel: 'rich',
    });
  });

  it('treats a different version as not classified (null)', () => {
    expect(getHandTopics({ extractedMetadata: { handTopics: { ...good, version: 0 } } })).toBeNull();
    expect(getHandTopics({ extractedMetadata: { handTopics: { ...good, version: 2 } } })).toBeNull();
    expect(getHandTopics({ extractedMetadata: { handTopics: { ...good, version: 0 } } }, 0)).not.toBeNull();
  });

  it('rejects malformed stored values', () => {
    const bad = (o: Record<string, unknown>) => getHandTopics({ extractedMetadata: { handTopics: { ...good, ...o } } });
    expect(bad({ topics: [] })).toBeNull();
    expect(bad({ topics: ['a', 'b', 'c', 'd'] })).toBeNull();
    expect(bad({ topics: ['bogus'], primary: 'bogus' })).toBeNull();
    expect(bad({ primary: 'sim2real_missing' })).toBeNull();
    expect(bad({ primary: 'dexterous_hw' })).toBeNull(); // primary not in topics
    expect(bad({ topics: ['off_topic', 'sim2real'], primary: 'off_topic' })).toBeNull();
    expect(bad({ topics: ['sim2real', 'sim2real'], primary: 'sim2real' })).toBeNull();
    expect(bad({ classifiedAt: 5 })).toBeNull();
    expect(getHandTopics({ extractedMetadata: { handTopics: 'x' } })).toBeNull();
    expect(getHandTopics({ extractedMetadata: null })).toBeNull();
    expect(getHandTopics({ extractedMetadata: {} })).toBeNull();
  });

  it('accepts off_topic stored alone', () => {
    expect(
      getHandTopics({ extractedMetadata: { handTopics: { ...good, topics: ['off_topic'], primary: 'off_topic' } } })
    ).not.toBeNull();
  });

  it('reads attempts defensively', () => {
    expect(getHandTopicsAttempts({ extractedMetadata: { handTopicsAttempts: 2 } })).toBe(2);
    expect(getHandTopicsAttempts({ extractedMetadata: { handTopicsAttempts: 'x' as unknown as number } })).toBe(0);
    expect(getHandTopicsAttempts({ extractedMetadata: null })).toBe(0);
  });
});
