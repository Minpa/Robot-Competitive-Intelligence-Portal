import { describe, it, expect } from 'vitest';
import { TOPIC_SEARCHES, estimateQuotaUnits, mergeTopics } from '../topic-video-search.service.js';

describe('mergeTopics', () => {
  it('sets topic and topics from the domain when nothing exists', () => {
    expect(mergeTopics({}, 'hand')).toEqual({ topic: 'hand', topics: ['hand'] });
  });

  it('keeps the existing topic and adds the new domain to topics', () => {
    expect(mergeTopics({ topic: 'rfm' }, 'hand')).toEqual({ topic: 'rfm', topics: ['rfm', 'hand'] });
  });

  it('unions existing topics[] with existing topic and the new domain', () => {
    expect(mergeTopics({ topic: 'rfm', topics: ['expo'] }, 'hand')).toEqual({
      topic: 'rfm',
      topics: ['expo', 'rfm', 'hand'],
    });
  });

  it('does not duplicate a domain that is already present', () => {
    expect(mergeTopics({ topic: 'hand', topics: ['hand', 'rfm'] }, 'hand')).toEqual({
      topic: 'hand',
      topics: ['hand', 'rfm'],
    });
  });
});

describe('TOPIC_SEARCHES', () => {
  it('stays within a 4000-unit quota budget for a single page', () => {
    expect(estimateQuotaUnits(TOPIC_SEARCHES, 1)).toBeLessThanOrEqual(4000);
  });

  it('scales quota linearly with pages', () => {
    const single = estimateQuotaUnits(TOPIC_SEARCHES, 1);
    expect(estimateQuotaUnits(TOPIC_SEARCHES, 3)).toBe(single * 3);
    expect(estimateQuotaUnits([{ domain: 'hand', queries: ['a', 'b'] }], 2)).toBe(400);
  });

  it('has no duplicate queries across the configuration', () => {
    const all = TOPIC_SEARCHES.flatMap((c) => c.queries.map((q) => q.trim().toLowerCase()));
    expect(new Set(all).size).toBe(all.length);
  });

  it('has 12 hand queries', () => {
    const hand = TOPIC_SEARCHES.find((c) => c.domain === 'hand');
    expect(hand?.queries).toHaveLength(12);
  });

  it('has a BrainCo hand query, and Revo 2/3 never appear without BrainCo (Revo2 is also the 1X NEO motor name)', () => {
    const hand = TOPIC_SEARCHES.find((c) => c.domain === 'hand')!;
    const brainco = hand.queries.filter((q) => /brainco/i.test(q));
    expect(brainco.length).toBeGreaterThanOrEqual(1);
    for (const q of TOPIC_SEARCHES.flatMap((c) => c.queries)) {
      for (const term of q.split('|').map((t) => t.trim())) {
        if (/\brevo\s?\d?\b/i.test(term)) expect(term, `"${term}" in "${q}"`).toMatch(/brainco/i);
      }
    }
  });

  it('keeps the total quota within budget with the BrainCo query (34 queries x 100 units)', () => {
    const n = TOPIC_SEARCHES.reduce((sum, c) => sum + c.queries.length, 0);
    expect(estimateQuotaUnits(TOPIC_SEARCHES, 1)).toBe(n * 100);
    expect(estimateQuotaUnits(TOPIC_SEARCHES, 1)).toBeLessThanOrEqual(4000);
  });

  it('has 12 English actuator queries covering the main actuator families', () => {
    const actuator = TOPIC_SEARCHES.find((c) => c.domain === 'actuator');
    expect(actuator?.queries).toHaveLength(12);
    const joined = actuator!.queries.join(' | ').toLowerCase();
    for (const term of ['quasi direct drive', 'harmonic drive', 'planetary', 'linear actuator', 'teardown', 'torque density', 'cycloidal', 'series elastic', 'joint module', 'factory']) {
      expect(joined, term).toContain(term);
    }
    for (const q of actuator!.queries) expect(q).toMatch(/^[\x20-\x7e]+$/); // 영어(ASCII) 위주
  });
});
