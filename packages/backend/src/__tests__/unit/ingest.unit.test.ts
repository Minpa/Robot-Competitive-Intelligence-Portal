/**
 * Ingest API Unit Tests
 *
 * Tests for the ingest key check, batch-size validation schema, and alert
 * type whitelist used by the ingest batch API (docs/ingest/SPEC.md).
 * No database access.
 */

import { describe, it, expect } from 'vitest';
import { checkIngestKey } from '../../routes/ingest-auth.js';
import { IngestRequestSchema } from '../../routes/ingest.js';
import { isValidAlertType, resolveAlertSeverity } from '../../services/ingest.service.js';

describe('checkIngestKey', () => {
  const configuredKey = 'super-secret-ingest-key';

  it('returns "unauthorized" when no auth header is present', () => {
    expect(checkIngestKey({}, configuredKey)).toBe('unauthorized');
  });

  it('returns "unauthorized" for a wrong key', () => {
    expect(checkIngestKey({ authorization: 'Bearer wrong-key' }, configuredKey)).toBe('unauthorized');
    expect(checkIngestKey({ 'x-ingest-key': 'wrong-key' }, configuredKey)).toBe('unauthorized');
  });

  it('returns "ok" for a correct Authorization: Bearer <key> header', () => {
    expect(checkIngestKey({ authorization: `Bearer ${configuredKey}` }, configuredKey)).toBe('ok');
  });

  it('returns "ok" for a correct X-Ingest-Key header', () => {
    expect(checkIngestKey({ 'x-ingest-key': configuredKey }, configuredKey)).toBe('ok');
  });

  it('returns "disabled" when INGEST_API_KEY is not configured, regardless of headers', () => {
    expect(checkIngestKey({}, undefined)).toBe('disabled');
    expect(checkIngestKey({ authorization: `Bearer ${configuredKey}` }, undefined)).toBe('disabled');
    expect(checkIngestKey({ authorization: 'Bearer whatever' }, '')).toBe('disabled');
  });
});

describe('IngestRequestSchema batch size boundary', () => {
  it('accepts exactly 200 articles', () => {
    const result = IngestRequestSchema.safeParse({
      source: 'test-routine',
      articles: Array.from({ length: 200 }, () => ({})),
    });

    expect(result.success).toBe(true);
  });

  it('rejects 201 articles with a too_big issue on the articles field', () => {
    const result = IngestRequestSchema.safeParse({
      source: 'test-routine',
      articles: Array.from({ length: 201 }, () => ({})),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const tooBig = result.error.issues.some(
        (issue) => issue.code === 'too_big' && issue.path.length === 1 && issue.path[0] === 'articles'
      );
      expect(tooBig).toBe(true);
    }
  });

  it('rejects an empty articles array', () => {
    const result = IngestRequestSchema.safeParse({ source: 'test-routine', articles: [] });
    expect(result.success).toBe(false);
  });

  it('rejects a missing/invalid source', () => {
    const result = IngestRequestSchema.safeParse({ articles: [{}] });
    expect(result.success).toBe(false);
  });
});

describe('alert type whitelist', () => {
  it('accepts every whitelisted alert type', () => {
    expect(isValidAlertType('score_spike')).toBe(true);
    expect(isValidAlertType('mass_production')).toBe(true);
    expect(isValidAlertType('funding')).toBe(true);
    expect(isValidAlertType('partnership')).toBe(true);
  });

  it('rejects a value outside the whitelist', () => {
    expect(isValidAlertType('unknown_alert_type')).toBe(false);
    expect(isValidAlertType('')).toBe(false);
  });
});

describe('alert severity resolution', () => {
  it('accepts every whitelisted severity', () => {
    expect(resolveAlertSeverity('info')).toBe('info');
    expect(resolveAlertSeverity('warning')).toBe('warning');
    expect(resolveAlertSeverity('critical')).toBe('critical');
  });

  it('defaults to "info" when missing or invalid', () => {
    expect(resolveAlertSeverity(undefined)).toBe('info');
    expect(resolveAlertSeverity('urgent')).toBe('info');
  });
});
