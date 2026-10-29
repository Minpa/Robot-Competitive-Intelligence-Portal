import { describe, it, expect } from 'vitest';
import {
  EXCLUDED_COLUMN_ALLOWLIST,
  EXCLUDED_TABLES,
  FULL_DB_LOCK_KEY,
  classifyColumnByName,
  getNoLoadByDefaultReason,
  getTableExclusionReason,
  isAllowlistedColumn,
  isExcludedTable,
  isFullDbEnabled,
  isScrubJsonColumn,
  isScrubbedJsonKey,
  matchExcludedColumnPattern,
  resolveFullDbBatchRows,
  resolveFullDbTimeoutMs,
  resolveFullDbZipLevel,
} from '../../services/argos-i-full-db-config.js';
import { ARGOS_I_EXPORT_LOCK_KEY } from '../../services/argos-i-export-config.js';

describe('excluded tables', () => {
  it.each(['users', 'allowed_emails', 'audit_logs', 'ai_usage_logs', 'argos_i_exports', 'argos_i_export_files'])('%s is excluded', (name) => {
    expect(isExcludedTable(name)).toBe(true);
    expect(getTableExclusionReason(name)).toBeTruthy();
  });

  it('has exactly the six blocklisted names', () => {
    expect(EXCLUDED_TABLES.map((t) => t.name).sort()).toEqual(['ai_usage_logs', 'allowed_emails', 'argos_i_export_files', 'argos_i_exports', 'audit_logs', 'users']);
  });

  it('excludes __drizzle* tables and any non-public schema', () => {
    expect(isExcludedTable('__drizzle_migrations')).toBe(true);
    expect(isExcludedTable('articles', 'pg_catalog')).toBe(true);
    expect(getTableExclusionReason('articles', 'other')).toBe('non_public_schema');
  });

  it('includes unknown and normal tables automatically', () => {
    for (const n of ['articles', 'companies', 'brand_new_table', 'data_migrations', 'user_prefs']) expect(isExcludedTable(n)).toBe(false);
  });

  it('data_migrations is included but marked no-load-by-default', () => {
    expect(getNoLoadByDefaultReason('data_migrations')).toContain('적재하지 말 것');
    expect(getNoLoadByDefaultReason('articles')).toBeNull();
  });
});

describe('column name rule', () => {
  it.each([
    ['password_hash', 'password'],
    ['client_secret', 'secret'],
    ['access_token', 'token'],
    ['input_tokens', 'token'],
    ['api_key', 'api_key'],
    ['openaiApiKey'.toLowerCase(), 'apikey'],
    ['credentials_json', 'credential'],
    ['PASSWORD', 'password'],
  ])('%s matches %s', (col, pattern) => {
    expect(matchExcludedColumnPattern(col)).toBe(pattern);
  });

  it.each(['description', 'content_hash', 'title', 'content_type', 'created_at'])('%s does not match', (col) => {
    expect(matchExcludedColumnPattern(col)).toBeNull();
  });

  it('allowlist keeps the four LLM usage columns', () => {
    expect(EXCLUDED_COLUMN_ALLOWLIST).toHaveLength(4);
    for (const [t, c] of EXCLUDED_COLUMN_ALLOWLIST) {
      expect(isAllowlistedColumn(t, c)).toBe(true);
      expect(classifyColumnByName(t, c)).toEqual({ kind: 'allowlisted', pattern: 'token' });
    }
    expect(isAllowlistedColumn('weekly_briefs', 'input_tokens')).toBe(true);
    expect(isAllowlistedColumn('issue_ai_call_log', 'output_tokens')).toBe(true);
  });

  it('the same column name in a non-allowlisted table is still excluded', () => {
    expect(classifyColumnByName('ai_usage_logs', 'input_tokens')).toEqual({ kind: 'excluded', pattern: 'token' });
    expect(classifyColumnByName('some_table', 'output_tokens')).toEqual({ kind: 'excluded', pattern: 'token' });
    expect(classifyColumnByName('users', 'password_hash')).toEqual({ kind: 'excluded', pattern: 'password' });
    expect(classifyColumnByName('articles', 'title')).toEqual({ kind: 'ok' });
  });
});

describe('json scrubbing config', () => {
  it('targets only regulatory_sources.config', () => {
    expect(isScrubJsonColumn('regulatory_sources', 'config')).toBe(true);
    expect(isScrubJsonColumn('articles', 'extracted_metadata')).toBe(false);
  });
  it('matches secret-like keys case-insensitively, including hyphenated forms', () => {
    for (const k of ['apikey', 'API_KEY', 'Authorization', 'x-api-key', 'bearerToken', 'Cookie', 'private-key', 'clientSecret', 'password']) expect(isScrubbedJsonKey(k), k).toBe(true);
    for (const k of ['selector', 'url', 'headers', 'timeout', 'description']) expect(isScrubbedJsonKey(k), k).toBe(false);
  });
});

describe('environment parsing', () => {
  it('switch is off by default and only the string true turns it on', () => {
    expect(isFullDbEnabled({})).toBe(false);
    expect(isFullDbEnabled({ ARGOS_I_FULL_DB_ENABLED: '' })).toBe(false);
    expect(isFullDbEnabled({ ARGOS_I_FULL_DB_ENABLED: '1' })).toBe(false);
    expect(isFullDbEnabled({ ARGOS_I_FULL_DB_ENABLED: 'false' })).toBe(false);
    expect(isFullDbEnabled({ ARGOS_I_FULL_DB_ENABLED: 'true' })).toBe(true);
    expect(isFullDbEnabled({ ARGOS_I_FULL_DB_ENABLED: ' TRUE ' })).toBe(true);
  });

  it('batch rows: default 1000, clamp 100..5000', () => {
    expect(resolveFullDbBatchRows({})).toBe(1000);
    expect(resolveFullDbBatchRows({ ARGOS_I_FULL_DB_BATCH_ROWS: '5' })).toBe(100);
    expect(resolveFullDbBatchRows({ ARGOS_I_FULL_DB_BATCH_ROWS: '999999' })).toBe(5000);
    expect(resolveFullDbBatchRows({ ARGOS_I_FULL_DB_BATCH_ROWS: 'abc' })).toBe(1000);
    expect(resolveFullDbBatchRows({ ARGOS_I_FULL_DB_BATCH_ROWS: '2500' })).toBe(2500);
  });

  it('timeout: default 60 min, clamp 5..240', () => {
    expect(resolveFullDbTimeoutMs({})).toBe(60 * 60_000);
    expect(resolveFullDbTimeoutMs({ ARGOS_I_FULL_DB_TIMEOUT_MIN: '1' })).toBe(5 * 60_000);
    expect(resolveFullDbTimeoutMs({ ARGOS_I_FULL_DB_TIMEOUT_MIN: '9999' })).toBe(240 * 60_000);
  });

  it('zip level: default 6, clamp 0..9, 0 allowed', () => {
    expect(resolveFullDbZipLevel({})).toBe(6);
    expect(resolveFullDbZipLevel({ ARGOS_I_FULL_DB_ZIP_LEVEL: '0' })).toBe(0);
    expect(resolveFullDbZipLevel({ ARGOS_I_FULL_DB_ZIP_LEVEL: '12' })).toBe(9);
    expect(resolveFullDbZipLevel({ ARGOS_I_FULL_DB_ZIP_LEVEL: '-3' })).toBe(0);
  });
});

describe('advisory lock key', () => {
  it('is 724305 and differs from 724301..724304', () => {
    expect(FULL_DB_LOCK_KEY).toBe(724305);
    expect([724301, 724302, 724303, 724304]).not.toContain(FULL_DB_LOCK_KEY);
    expect(ARGOS_I_EXPORT_LOCK_KEY).not.toBe(FULL_DB_LOCK_KEY);
  });
});
