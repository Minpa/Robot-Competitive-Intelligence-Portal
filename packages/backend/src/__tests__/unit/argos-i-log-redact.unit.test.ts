/**
 * redactArgosIQuery — ARGOS_I 경로의 요청 로그 URL 에서 쿼리 문자열을 가린다
 */
import { describe, it, expect } from 'vitest';
import { redactArgosIQuery } from '../../services/argos-i-export-config.js';

describe('redactArgosIQuery', () => {
  it('redacts the query string on /api/argos-i and /api/admin/argos-i paths', () => {
    expect(redactArgosIQuery('/api/argos-i/export/latest.zip?token=SECRET')).toBe('/api/argos-i/export/latest.zip?<redacted>');
    expect(redactArgosIQuery('/api/argos-i/export?a=1&token=SECRET')).toBe('/api/argos-i/export?<redacted>');
    expect(redactArgosIQuery('/api/admin/argos-i/status?token=SECRET')).toBe('/api/admin/argos-i/status?<redacted>');
    expect(redactArgosIQuery('/api/argos-i/export/latest.zip?')).toBe('/api/argos-i/export/latest.zip?<redacted>');
    expect(redactArgosIQuery('/api/argos-i?x=1')).toBe('/api/argos-i?<redacted>');
  });

  it('leaves ARGOS_I URLs without a query, and all other paths, unchanged', () => {
    expect(redactArgosIQuery('/api/argos-i/export/latest.zip')).toBe('/api/argos-i/export/latest.zip');
    expect(redactArgosIQuery('/api/robots?limit=10&token=x')).toBe('/api/robots?limit=10&token=x');
    expect(redactArgosIQuery('/health')).toBe('/health');
    expect(redactArgosIQuery('/api/argos-i-foo?x=1')).toBe('/api/argos-i-foo?x=1');
  });
});
