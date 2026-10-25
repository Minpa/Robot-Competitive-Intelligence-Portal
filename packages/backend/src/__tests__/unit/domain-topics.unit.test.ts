import { describe, it, expect } from 'vitest';
import {
  ACTUATOR_TOPICS,
  ACTUATOR_TOPIC_VERSION,
  DOMAIN_TAXONOMIES,
  TIMELINE_DOMAINS,
  buildDomainTopicPrompt,
  getDomainTopics,
  getDomainTopicsAttempts,
  getTaxonomy,
  getTopicDef,
  isTimelineDomain,
  parseDomainTopicBatch,
} from '../../services/domain-topics.js';
import {
  HAND_TOPICS,
  HAND_TOPIC_VERSION,
  HAND_CORE_TOPIC_IDS,
  HAND_TOPIC_IDS_WITH_OTHER,
  buildHandTopicPrompt,
  parseHandTopicBatch,
  toPaperTopicInput,
  toVideoTopicInput,
  getHandTopics,
} from '../../services/hand-topics.js';
import { resolveDomainTopicModel, resolveHandTopicModel, HAIKU_5_5_MODEL } from '../../services/anthropic-models.js';
import type { ArticleRow } from '../../services/tech-trend-report.service.js';

const N = (...ns: number[]) => new Set(ns);

function paper(extra: Partial<ArticleRow> = {}): ArticleRow {
  return {
    id: 'p1',
    title: 'Quasi-direct-drive &amp; backdrivable actuator',
    summary: 'a'.repeat(900),
    source: 'arxiv',
    productType: null,
    publishedAt: '2026-09-01T00:00:00.000Z',
    extractedMetadata: {},
    ...extra,
  };
}

function video(meta: Record<string, unknown> = {}): ArticleRow {
  return {
    id: 'v1',
    title: 'Humanoid actuator teardown',
    productType: 'video',
    source: 'youtube',
    publishedAt: '2026-09-01T00:00:00.000Z',
    extractedMetadata: meta,
  };
}

const ACTUATOR_CORE = [
  'qdd_direct_drive',
  'harmonic_strain_wave',
  'cycloidal_planetary',
  'linear_screw',
  'series_elastic_compliance',
  'hydraulic_pneumatic_soft',
  'motor_design',
  'sensing_control',
  'integration_modular',
  'manufacturing_cost',
];

describe('domain registry', () => {
  it('supports hand and actuator', () => {
    expect(TIMELINE_DOMAINS).toEqual(['hand', 'actuator']);
    expect(isTimelineDomain('hand')).toBe(true);
    expect(isTimelineDomain('actuator')).toBe(true);
    for (const d of ['rfm', 'expo', 'production', 'HAND', '']) expect(isTimelineDomain(d), d).toBe(false);
  });

  it('hand taxonomy reuses HAND_TOPICS by reference with the same ids and version', () => {
    const t = getTaxonomy('hand');
    expect(t.topics).toBe(HAND_TOPICS);
    expect(t.version).toBe(HAND_TOPIC_VERSION);
    expect([...t.coreIds]).toEqual([...HAND_CORE_TOPIC_IDS]);
    expect([...t.idsWithOther]).toEqual([...HAND_TOPIC_IDS_WITH_OTHER]);
    expect(t.labelKo).toBe('핸드');
    expect(DOMAIN_TAXONOMIES.hand).toBe(t);
  });
});

describe('actuator taxonomy v1', () => {
  const t = getTaxonomy('actuator');

  it('has the 10 specified core ids + other + off_topic (12 ids, unique, in order)', () => {
    expect(ACTUATOR_TOPIC_VERSION).toBe(1);
    expect(t.version).toBe(1);
    expect(ACTUATOR_TOPICS).toHaveLength(12);
    expect(t.allIds).toHaveLength(12);
    expect(new Set(t.allIds).size).toBe(12);
    expect([...t.coreIds]).toEqual(ACTUATOR_CORE);
    expect([...t.idsWithOther]).toEqual([...ACTUATOR_CORE, 'other']);
    expect(t.allIds[11]).toBe('off_topic');
  });

  it('has non-empty Korean labels, short labels and definitions, and distinct ids from hand', () => {
    for (const d of ACTUATOR_TOPICS) {
      expect(d.label.length).toBeGreaterThan(0);
      expect(d.shortLabel.length).toBeGreaterThan(0);
      expect(d.definition.length).toBeGreaterThan(0);
      expect(/[가-힣]/.test(d.label)).toBe(true);
    }
    const handIds = new Set(HAND_CORE_TOPIC_IDS);
    for (const id of t.coreIds) expect(handIds.has(id), id).toBe(false);
    expect(getTopicDef('actuator', 'qdd_direct_drive')?.label).toContain('QDD');
    expect(getTopicDef('actuator', 'nope')).toBeUndefined();
    expect(getTopicDef('hand', 'tactile_force')?.label).toBe('촉각·힘 센싱');
  });
});

describe('buildDomainTopicPrompt', () => {
  const items = [toPaperTopicInput(paper(), 1), toVideoTopicInput(video({ description: 'ok' }), 2)];

  it("hand prompt is byte-identical to buildHandTopicPrompt", () => {
    expect(buildDomainTopicPrompt('hand', items)).toBe(buildHandTopicPrompt(items));
    expect(buildDomainTopicPrompt('hand', items)).toContain('로봇 핸드 기술 리포트');
    expect(buildDomainTopicPrompt('hand', items)).not.toContain('관절 구동계');
  });

  it('actuator prompt injects the domain label and every actuator id, keeps the safety rules and JSON-only output', () => {
    const p = buildDomainTopicPrompt('actuator', items);
    expect(p).toContain('로봇 액추에이터(관절 구동계) 기술 리포트');
    for (const d of ACTUATOR_TOPICS) {
      expect(p).toContain(d.id);
      expect(p).toContain(d.label);
      expect(p).toContain(d.definition);
    }
    for (const id of HAND_CORE_TOPIC_IDS) expect(p).not.toContain(`- ${id} (`);
    expect(p).toContain('추측');
    expect(p).toContain('마크다운');
    expect(p).toContain('<cite>');
    expect(p).toContain('JSON으로만');
    expect(p).toContain('"results"');
    expect(p).toMatch(/애매하면 off_topic이 아니라 other/);
    expect(p).toContain('motor skills');
    expect(p).toContain('sensing_control로 분류');
    // 입력 항목 전달
    expect(p).toContain('Quasi-direct-drive & backdrivable actuator');
    expect(p).toContain('Humanoid actuator teardown');
  });

  it('never reads articles.content or transcripts', () => {
    const p = { ...paper(), content: 'SECRET-FULL-TEXT' } as ArticleRow & { content: string };
    const v = video({ transcript: 'SECRET-TRANSCRIPT', description: 'ok' });
    const prompt = buildDomainTopicPrompt('actuator', [toPaperTopicInput(p, 1), toVideoTopicInput(v, 2)]);
    expect(prompt).not.toContain('SECRET');
  });
});

describe('parseDomainTopicBatch', () => {
  it('hand delegates to parseHandTopicBatch', () => {
    const text = '{"results":[{"n":1,"primary":"tactile_force","topics":["tactile_force","sim2real"]}]}';
    expect(parseDomainTopicBatch('hand', text, N(1))).toEqual(parseHandTopicBatch(text, N(1)));
    // hand 체계에서 actuator id 는 무효
    expect(parseDomainTopicBatch('hand', '{"results":[{"n":1,"primary":"qdd_direct_drive","topics":["qdd_direct_drive"]}]}', N(1))).toEqual([]);
  });

  it('actuator accepts actuator ids and rejects hand ids, with the same normalization rules', () => {
    const text = JSON.stringify({
      results: [
        { n: 1, primary: 'QDD_Direct_Drive', topics: ['qdd_direct_drive', 'tactile_force', 'sensing_control', 'motor_design', 'linear_screw'] },
        { n: 2, primary: 'off_topic', topics: ['off_topic', 'motor_design'] },
        { n: '3', primary: 'bogus', topics: ['harmonic_strain_wave'] },
        { n: 4, primary: 'dexterous_hw', topics: ['dexterous_hw'] },
      ],
    });
    expect(parseDomainTopicBatch('actuator', text, N(1, 2, 3, 4))).toEqual([
      { n: 1, primary: 'qdd_direct_drive', topics: ['qdd_direct_drive', 'sensing_control', 'motor_design'] },
      { n: 2, primary: 'off_topic', topics: ['off_topic'] },
      { n: 3, primary: 'harmonic_strain_wave', topics: ['harmonic_strain_wave'] },
    ]);
  });

  it('recovers from code fences for actuator too', () => {
    const text = '```json\n{"results":[{"n":1,"primary":"<cite>linear_screw</cite>","topics":["linear_screw"]}]}\n```';
    expect(parseDomainTopicBatch('actuator', text, N(1))).toEqual([{ n: 1, primary: 'linear_screw', topics: ['linear_screw'] }]);
  });
});

describe('getDomainTopics / getDomainTopicsAttempts', () => {
  const handGood = { topics: ['tactile_force'], primary: 'tactile_force', classifiedAt: 'x', version: HAND_TOPIC_VERSION };
  const actGood = { topics: ['linear_screw', 'motor_design'], primary: 'linear_screw', classifiedAt: 'x', version: ACTUATOR_TOPIC_VERSION };

  it('hand reads the legacy handTopics key exactly like getHandTopics', () => {
    const row = { extractedMetadata: { handTopics: handGood, handTopicsAttempts: 2 } };
    expect(getDomainTopics('hand', row)).toEqual(getHandTopics(row));
    expect(getDomainTopics('hand', row)).not.toBeNull();
    expect(getDomainTopicsAttempts('hand', row)).toBe(2);
    // handTopics 는 actuator 체계에서 읽히지 않는다
    expect(getDomainTopics('actuator', row)).toBeNull();
    expect(getDomainTopicsAttempts('actuator', row)).toBe(0);
  });

  it('actuator reads domainTopics.actuator and domainTopicsAttempts.actuator', () => {
    const row = {
      extractedMetadata: {
        handTopics: handGood,
        domainTopics: { actuator: actGood },
        domainTopicsAttempts: { actuator: 1 },
      },
    };
    expect(getDomainTopics('actuator', row)).toMatchObject({ topics: ['linear_screw', 'motor_design'], primary: 'linear_screw' });
    expect(getDomainTopicsAttempts('actuator', row)).toBe(1);
    // 두 체계는 서로 독립
    expect(getDomainTopics('hand', row)).toMatchObject({ primary: 'tactile_force' });
    expect(getDomainTopicsAttempts('hand', row)).toBe(0);
  });

  it('rejects wrong versions, hand ids under the actuator key and malformed bags', () => {
    expect(getDomainTopics('actuator', { extractedMetadata: { domainTopics: { actuator: { ...actGood, version: 2 } } } })).toBeNull();
    expect(getDomainTopics('actuator', { extractedMetadata: { domainTopics: { actuator: { ...actGood, version: 2 } } } }, 2)).not.toBeNull();
    expect(
      getDomainTopics('actuator', {
        extractedMetadata: { domainTopics: { actuator: { ...actGood, topics: ['tactile_force'], primary: 'tactile_force' } } },
      })
    ).toBeNull();
    expect(getDomainTopics('actuator', { extractedMetadata: { domainTopics: 'x' } })).toBeNull();
    expect(getDomainTopics('actuator', { extractedMetadata: { domainTopics: [actGood] } })).toBeNull();
    expect(getDomainTopics('actuator', { extractedMetadata: null })).toBeNull();
    expect(getDomainTopicsAttempts('actuator', { extractedMetadata: { domainTopicsAttempts: 'x' } })).toBe(0);
    expect(getDomainTopicsAttempts('actuator', { extractedMetadata: { domainTopicsAttempts: { actuator: 'x' } } })).toBe(0);
  });
});

describe('resolveDomainTopicModel', () => {
  it('hand is unchanged; actuator reads ACTUATOR_TOPIC_MODEL then falls back to the hand chain', () => {
    expect(resolveDomainTopicModel('hand', {})).toBe(resolveHandTopicModel({}));
    expect(resolveDomainTopicModel('hand', { HAND_TOPIC_MODEL: 'h' })).toBe('h');
    expect(resolveDomainTopicModel('actuator', {})).toBe(HAIKU_5_5_MODEL);
    expect(resolveDomainTopicModel('actuator', { ACTUATOR_TOPIC_MODEL: 'a', HAND_TOPIC_MODEL: 'h' })).toBe('a');
    expect(resolveDomainTopicModel('actuator', { HAND_TOPIC_MODEL: 'h' })).toBe('h');
    expect(resolveDomainTopicModel('actuator', { TECH_TREND_FOCUS_MODEL: 'f' })).toBe('f');
    expect(resolveDomainTopicModel('actuator', { TECH_TREND_REPORT_MODEL: 'opus' })).toBe(HAIKU_5_5_MODEL);
  });
});
