import { createHash } from 'crypto';

/**
 * Pure helpers used by the ingest pipeline (src/services/ingest.service.ts).
 * No DB / network access — safe to unit test directly.
 */

/**
 * Normalizes a URL for content-hash purposes: trims whitespace, lowercases,
 * strips any #fragment, and removes a trailing slash.
 */
export function normalizeUrl(url: string): string {
  let result = url.trim().toLowerCase();

  const hashIndex = result.indexOf('#');
  if (hashIndex !== -1) {
    result = result.slice(0, hashIndex);
  }

  result = result.replace(/\/+$/, '');

  return result;
}

/**
 * Returns the UTC calendar date (YYYY-MM-DD) portion of an ISO datetime string.
 */
export function dateOnlyUtc(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/**
 * content_hash = sha256(normalizeUrl(url) + '|' + dateOnlyUtc(publishedAt)), hex-encoded (64 chars).
 * Same URL + same published date (UTC) always produces the same hash, regardless of
 * time-of-day, case, trailing slash, or URL fragment.
 */
export function computeIngestContentHash(url: string, publishedAt: string): string {
  const normalizedUrl = normalizeUrl(url);
  const day = dateOnlyUtc(publishedAt);
  return createHash('sha256').update(`${normalizedUrl}|${day}`).digest('hex');
}

export interface TruncateResult {
  value: string;
  truncated: boolean;
  /** Original length before truncation (equals value.length when not truncated). */
  from: number;
}

/**
 * Truncates a string to at most `max` characters. Values at exactly `max`
 * characters are left untouched (not truncated).
 */
export function truncateToLimit(value: string, max: number): TruncateResult {
  if (value.length <= max) {
    return { value, truncated: false, from: value.length };
  }
  return { value: value.slice(0, max), truncated: true, from: value.length };
}

export interface RobotNameRef {
  id: string;
  name: string;
}

/**
 * Resolves a free-text robot name to a robot id:
 * 1. Case-insensitive exact match, if any.
 * 2. Otherwise, the first case-insensitive partial (substring, either direction) match.
 * 3. Otherwise null.
 */
export function pickRobotIdByName(robotName: string | undefined | null, robots: RobotNameRef[]): string | null {
  if (!robotName) {
    return null;
  }

  const needle = robotName.trim().toLowerCase();
  if (!needle) {
    return null;
  }

  const exact = robots.find((robot) => robot.name.toLowerCase() === needle);
  if (exact) {
    return exact.id;
  }

  const partial = robots.find((robot) => {
    const name = robot.name.toLowerCase();
    return name.includes(needle) || needle.includes(name);
  });

  return partial ? partial.id : null;
}
