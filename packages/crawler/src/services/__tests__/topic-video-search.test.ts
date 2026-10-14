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

  it('has 11 hand queries', () => {
    const hand = TOPIC_SEARCHES.find((c) => c.domain === 'hand');
    expect(hand?.queries).toHaveLength(11);
  });
});
