/**
 * argos-i-requests.ddl.ts — 0032 SQL 과 런타임 ensure 가 같은 문장인지, journal 미등록, 컬럼명이 덤프 제외 패턴에 걸리지 않는지,
 * 기동 시 ensure 가 호출되는지
 */
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const h = vi.hoisted(() => ({ executed: [] as unknown[] }));
vi.mock('../../db/index.js', () => ({
  db: { execute: vi.fn(async (q: unknown) => { h.executed.push(q); }) },
}));

import { ARGOS_I_REQUESTS_DDL_STATEMENTS, ensureArgosIRequestTables, runArgosIRequestsDdl } from '../../db/argos-i-requests.ddl.js';
import { EXCLUDED_COLUMN_PATTERNS, EXCLUDED_TABLES } from '../../services/argos-i-full-db-config.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const sqlFile = path.resolve(here, '../../../drizzle/0032_add_argos_i_requests.sql');
const squash = (s: string) => s.replace(/\s+/g, ' ').trim();

describe('ARGOS_I requests DDL', () => {
  it('declares argos_i_requests with the contract columns, IF NOT EXISTS', () => {
    const ddl = squash(ARGOS_I_REQUESTS_DDL_STATEMENTS[0]!);
    expect(ddl).toMatch(/^CREATE TABLE IF NOT EXISTS argos_i_requests/);
    for (const col of [
      'id UUID PRIMARY KEY DEFAULT gen_random_uuid()',
      "type VARCHAR(20) NOT NULL CHECK (type IN ('add_source','analyze','query','regenerate_brief','watch_register'))",
      'params JSONB NOT NULL',
      'note VARCHAR(200)',
      "status VARCHAR(16) NOT NULL CHECK (status IN ('queued','needs_approval','running','done','failed','rejected','cancelled','unsupported'))",
      'approval_required BOOLEAN NOT NULL DEFAULT FALSE',
      'approval_reason VARCHAR(40)',
      'approved_by VARCHAR(100)',
      'approved_at TIMESTAMPTZ',
      'result JSONB',
      'error_code VARCHAR(40)',
      'attempts INTEGER NOT NULL DEFAULT 0',
      'cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0',
      'cost_provider VARCHAR(10)',
      'payload_hash CHAR(64) NOT NULL',
      'idempotency_hash CHAR(64)',
      "requested_by VARCHAR(20) NOT NULL DEFAULT 'argos-i'",
      'created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()',
      'started_at TIMESTAMPTZ',
      'finished_at TIMESTAMPTZ',
    ]) {
      expect(ddl).toContain(col);
    }
  });

  it('declares the indexes (status+created, created, partial unique idempotency) and the reject-stats table', () => {
    const all = ARGOS_I_REQUESTS_DDL_STATEMENTS.map(squash).join('\n');
    expect(all).toContain('ON argos_i_requests (status, created_at)');
    expect(all).toContain('ON argos_i_requests (created_at)');
    expect(all).toContain('CREATE UNIQUE INDEX IF NOT EXISTS argos_i_requests_idem_uniq ON argos_i_requests (idempotency_hash) WHERE idempotency_hash IS NOT NULL');
    expect(all).toContain('CREATE TABLE IF NOT EXISTS argos_i_request_rejects ( day DATE NOT NULL, reason_code VARCHAR(40) NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, reason_code) )');
    for (const s of ARGOS_I_REQUESTS_DDL_STATEMENTS) expect(squash(s)).toMatch(/^CREATE (UNIQUE )?(TABLE|INDEX) IF NOT EXISTS/);
  });

  it('drizzle/0032 contains exactly the same statements as the runtime ensure', () => {
    const sqlText = fs.readFileSync(sqlFile, 'utf-8');
    const statements = sqlText
      .split('--> statement-breakpoint')
      .map((s) => s.replace(/^--.*$/gm, '').replace(/;\s*$/, '').trim())
      .filter(Boolean);
    expect(statements.map(squash)).toEqual(ARGOS_I_REQUESTS_DDL_STATEMENTS.map(squash));
  });

  it('is not registered in the drizzle journal', () => {
    const journal = fs.readFileSync(path.resolve(here, '../../../drizzle/meta/_journal.json'), 'utf-8');
    expect(journal).not.toContain('0032_add_argos_i_requests');
  });

  it('no column name matches the full-DB dump auto-exclusion patterns', () => {
    const cols = [...ARGOS_I_REQUESTS_DDL_STATEMENTS.join('\n').matchAll(/^\s{2}([a-z_]+) [A-Z]/gm)].map((m) => m[1]!);
    expect(cols.length).toBeGreaterThan(20);
    for (const c of cols) for (const p of EXCLUDED_COLUMN_PATTERNS) expect(c).not.toContain(p);
  });

  it('both tables are excluded from the full DB dump', () => {
    const names = EXCLUDED_TABLES.map((t) => t.name);
    expect(names).toContain('argos_i_requests');
    expect(names).toContain('argos_i_request_rejects');
  });

  it('ensureArgosIRequestTables runs each statement; runArgosIRequestsDdl works on any executor', async () => {
    h.executed.length = 0;
    await ensureArgosIRequestTables();
    expect(h.executed).toHaveLength(ARGOS_I_REQUESTS_DDL_STATEMENTS.length);
    const tx = { execute: vi.fn(async () => undefined) };
    await runArgosIRequestsDdl(tx);
    expect(tx.execute).toHaveBeenCalledTimes(ARGOS_I_REQUESTS_DDL_STATEMENTS.length);
  });

  it('index.ts calls ensureArgosIRequestTables at startup (non-fatal)', () => {
    const src = fs.readFileSync(path.resolve(here, '../../index.ts'), 'utf-8');
    expect(src).toContain("import { ensureArgosIRequestTables } from './db/argos-i-requests.ddl.js'");
    expect(src).toMatch(/await ensureArgosIRequestTables\(\)\.catch/);
  });
});
