/**
 * Ingest Hash / Truncate / Robot-Matching Unit Tests
 *
 * Pure-function tests for the ingest batch API (docs/ingest/SPEC.md).
 * No database access.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeUrl,
  dateOnlyUtc,
  computeIngestContentHash,
  truncateToLimit,
  pickRobotIdByName,
} from '../../services/ingest-hash.util.js';

describe('ingest-hash util', () => {
  describe('computeIngestContentHash', () => {
    it('produces the same hash for the same url + the same UTC day', () => {
      const h1 = computeIngestContentHash('https://example.com/a', '2026-09-15T00:00:00Z');
      const h2 = computeIngestContentHash('https://example.com/a', '2026-09-15T12:30:00Z');

      expect(h1).toBe(h2);
      expect(h1).toHaveLength(64);
      expect(/^[a-f0-9]{64}$/.test(h1)).toBe(true);
    });

    it('produces a different hash for the next day', () => {
      const h1 = computeIngestContentHash('https://example.com/a', '2026-09-15T23:59:59Z');
      const h2 = computeIngestContentHash('https://example.com/a', '2026-09-16T00:00:00Z');

      expect(h1).not.toBe(h2);
    });

    it('is insensitive to case, trailing slash, surrounding whitespace, and #fragment', () => {
      const base = computeIngestContentHash('https://Example.com/Article', '2026-09-15T00:00:00Z');
      const upperCase = computeIngestContentHash('HTTPS://EXAMPLE.COM/Article', '2026-09-15T00:00:00Z');
      const trailingSlash = computeIngestContentHash('https://example.com/Article/', '2026-09-15T00:00:00Z');
      const fragment = computeIngestContentHash('https://example.com/Article#section-2', '2026-09-15T00:00:00Z');
      const whitespace = computeIngestContentHash('  https://example.com/Article  ', '2026-09-15T00:00:00Z');

      expect(upperCase).toBe(base);
      expect(trailingSlash).toBe(base);
      expect(fragment).toBe(base);
      expect(whitespace).toBe(base);
    });

    it('treats different URLs as different content', () => {
      const h1 = computeIngestContentHash('https://example.com/a', '2026-09-15T00:00:00Z');
      const h2 = computeIngestContentHash('https://example.com/b', '2026-09-15T00:00:00Z');

      expect(h1).not.toBe(h2);
    });
  });

  describe('normalizeUrl', () => {
    it('trims, lowercases, strips fragment and trailing slash', () => {
      expect(normalizeUrl('  HTTPS://Example.com/Path/#frag  ')).toBe('https://example.com/path');
    });

    it('leaves an already-normalized url unchanged', () => {
      expect(normalizeUrl('https://example.com/path')).toBe('https://example.com/path');
    });
  });

  describe('dateOnlyUtc', () => {
    it('extracts the UTC calendar date from an ISO datetime string', () => {
      expect(dateOnlyUtc('2026-09-15T23:59:59Z')).toBe('2026-09-15');
      expect(dateOnlyUtc('2026-01-01T00:00:00.000Z')).toBe('2026-01-01');
    });
  });

  describe('truncateToLimit', () => {
    it('does not truncate a value exactly at the 500-char limit', () => {
      const value = 'a'.repeat(500);
      const result = truncateToLimit(value, 500);

      expect(result.truncated).toBe(false);
      expect(result.value).toBe(value);
      expect(result.value.length).toBe(500);
      expect(result.from).toBe(500);
    });

    it('truncates a value one character over the 500-char limit', () => {
      const value = 'a'.repeat(501);
      const result = truncateToLimit(value, 500);

      expect(result.truncated).toBe(true);
      expect(result.value.length).toBe(500);
      expect(result.from).toBe(501);
    });

    it('does not truncate a value exactly at the 255-char limit', () => {
      const value = 'b'.repeat(255);
      const result = truncateToLimit(value, 255);

      expect(result.truncated).toBe(false);
      expect(result.value.length).toBe(255);
    });

    it('truncates a value one character over the 255-char limit', () => {
      const value = 'b'.repeat(256);
      const result = truncateToLimit(value, 255);

      expect(result.truncated).toBe(true);
      expect(result.value.length).toBe(255);
      expect(result.from).toBe(256);
    });
  });

  describe('pickRobotIdByName', () => {
    const robots = [
      { id: 'robot-1', name: 'Figure 03' },
      { id: 'robot-2', name: 'Optimus Gen 2' },
      { id: 'robot-3', name: 'Atlas' },
    ];

    it('resolves a case-insensitive exact match', () => {
      expect(pickRobotIdByName('figure 03', robots)).toBe('robot-1');
      expect(pickRobotIdByName('ATLAS', robots)).toBe('robot-3');
    });

    it('falls back to a case-insensitive partial match when there is no exact match', () => {
      expect(pickRobotIdByName('Optimus', robots)).toBe('robot-2');
    });

    it('returns null when nothing matches, exactly or partially', () => {
      expect(pickRobotIdByName('Unitree G1', robots)).toBeNull();
    });

    it('returns null for an empty/undefined robot name', () => {
      expect(pickRobotIdByName(undefined, robots)).toBeNull();
      expect(pickRobotIdByName('', robots)).toBeNull();
      expect(pickRobotIdByName('   ', robots)).toBeNull();
    });
  });
});
