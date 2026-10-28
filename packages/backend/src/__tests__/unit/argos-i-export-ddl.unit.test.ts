/**
 * argos-i-export.ddl.ts — 0030 SQL 과 런타임 ensure 가 같은 문장을 쓰는지, IF NOT EXISTS 인지
 */
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const h = vi.hoisted(() => ({ executed: [] as unknown[] }));
vi.mock('../../db/index.js', () => ({
  db: { execute: vi.fn(async (q: unknown) => { h.executed.push(q); }) },
}));

import { ARGOS_I_EXPORT_DDL_STATEMENTS, ensureArgosIExportTables, runArgosIExportDdl } from '../../db/argos-i-export.ddl.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const sqlFile = path.resolve(here, '../../../drizzle/0030_add_argos_i_exports.sql');

const squash = (s: string) => s.replace(/\s+/g, ' ').trim();

describe('ARGOS_I export DDL', () => {
  it('declares argos_i_exports with the contract columns, IF NOT EXISTS', () => {
    expect(ARGOS_I_EXPORT_DDL_STATEMENTS).toHaveLength(2);
    const ddl = squash(ARGOS_I_EXPORT_DDL_STATEMENTS[0]!);
    expect(ddl).toMatch(/^CREATE TABLE IF NOT EXISTS argos_i_exports/);
    for (const col of [
      'export_date DATE PRIMARY KEY',
      "status VARCHAR(10) NOT NULL CHECK (status IN ('ok','partial'))",
      'schema_version INTEGER NOT NULL',
      'generated_at TIMESTAMPTZ NOT NULL',
      'as_of TIMESTAMPTZ NOT NULL',
      'reason VARCHAR(16) NOT NULL',
      'file_count INTEGER NOT NULL',
      'total_bytes BIGINT NOT NULL',
      'bundle_sha256 CHAR(64) NOT NULL',
      'duration_ms INTEGER NOT NULL',
      "warnings JSONB NOT NULL DEFAULT '[]'::jsonb",
    ]) {
      expect(ddl).toContain(col);
    }
  });

  it('declares argos_i_export_files with bytea content, FK cascade and composite PK', () => {
    const ddl = squash(ARGOS_I_EXPORT_DDL_STATEMENTS[1]!);
    expect(ddl).toMatch(/^CREATE TABLE IF NOT EXISTS argos_i_export_files/);
    for (const col of [
      'export_date DATE NOT NULL REFERENCES argos_i_exports(export_date) ON DELETE CASCADE',
      'path VARCHAR(100) NOT NULL',
      'area VARCHAR(40)',
      "format VARCHAR(8) NOT NULL CHECK (format IN ('md','json'))",
      'content BYTEA NOT NULL',
      'sha256 CHAR(64) NOT NULL',
      'byte_size INTEGER NOT NULL',
      'record_count INTEGER',
      'PRIMARY KEY (export_date, path)',
    ]) {
      expect(ddl).toContain(col);
    }
  });

  it('the reason column fits every allowed reason (weekly-brief is 12 chars)', () => {
    const ddl = squash(ARGOS_I_EXPORT_DDL_STATEMENTS[0]!);
    const m = /reason VARCHAR\((\d+)\)/.exec(ddl);
    expect(Number(m![1])).toBeGreaterThanOrEqual('weekly-brief'.length);
  });

  it('drizzle/0030 contains exactly the same statements as the runtime ensure', () => {
    const sqlText = fs.readFileSync(sqlFile, 'utf-8');
    const statements = sqlText
      .split('--> statement-breakpoint')
      .map((s) => s.replace(/^--.*$/gm, '').replace(/;\s*$/, '').trim())
      .filter(Boolean);
    expect(statements.map(squash)).toEqual(ARGOS_I_EXPORT_DDL_STATEMENTS.map(squash));
  });

  it('is not registered in the drizzle journal (same as 0027~0029)', () => {
    const journal = fs.readFileSync(path.resolve(here, '../../../drizzle/meta/_journal.json'), 'utf-8');
    expect(journal).not.toContain('0030_add_argos_i_exports');
  });

  it('ensureArgosIExportTables runs each statement; runArgosIExportDdl works on any executor', async () => {
    h.executed.length = 0;
    await ensureArgosIExportTables();
    expect(h.executed).toHaveLength(2);
    const tx = { execute: vi.fn(async () => undefined) };
    await runArgosIExportDdl(tx);
    expect(tx.execute).toHaveBeenCalledTimes(2);
  });
});
