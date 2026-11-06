import { describe, it, expect, afterEach } from 'vitest';
import { topicVideoSearchService } from '../topic-video-search.service.js';
import { eventVideoSearchService } from '../event-video-search.service.js';

const saved = process.env.YOUTUBE_API_KEY;
afterEach(() => {
  if (saved === undefined) delete process.env.YOUTUBE_API_KEY;
  else process.env.YOUTUBE_API_KEY = saved;
});

describe('collector results keep their existing fields and add the quota observability fields', () => {
  it('topic search (no API key): existing fields intact, new fields zero/false', async () => {
    delete process.env.YOUTUBE_API_KEY;
    const r = await topicVideoSearchService.collectAll();
    expect(r).toMatchObject({ queriesRun: 0, videosSeen: 0, videosInserted: 0, videosMerged: 0, errors: [], searchCalls: 0, quotaExhausted: false, estimatedQuotaUnits: 0 });
    expect(Object.keys(r.perDomain).sort()).toEqual(['actuator', 'expo', 'hand', 'production', 'rfm']);
  });

  it('event search (no API key): existing fields intact, new fields zero/false', async () => {
    delete process.env.YOUTUBE_API_KEY;
    const r = await eventVideoSearchService.collectAll();
    expect(r).toEqual({ queriesRun: 0, videosSeen: 0, videosInserted: 0, errors: [], searchCalls: 0, quotaExhausted: false, estimatedQuotaUnits: 0 });
  });
});
