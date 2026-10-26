/**
 * weekly-brief.ddl.ts — 0029 SQL 과 런타임 ensure 가 같은 문장을 쓰는지, IF NOT EXISTS 인지
 */
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const h = vi.hoisted(() => ({ executed: [] as unknown[] }));
vi.mock('../../db/index.js', () => ({
  db: { execute: vi.fn(async (q: unknown) => { h.executed.push(q); }) },
}));

import { WEEKLY_BRIEF_DDL_STATEMENTS, ensureWeeklyBriefTables, runWeeklyBriefDdl } from '../../db/weekly-brief.ddl.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const sqlFile = path.resolve(here, '../../../drizzle/0029_add_weekly_briefs.sql');

const squash = (s: string) => s.replace(/\s+/g, ' ').trim();

describe('weekly brief DDL', () => {
  it('declares weekly_briefs with the contract columns, IF NOT EXISTS', () => {
    expect(WEEKLY_BRIEF_DDL_STATEMENTS).toHaveLength(1);
    const ddl = squash(WEEKLY_BRIEF_DDL_STATEMENTS[0]!);
    expect(ddl).toMatch(/^CREATE TABLE IF NOT EXISTS weekly_briefs/);
    for (const col of [
      'week_start DATE PRIMARY KEY',
      'period_start TIMESTAMPTZ NOT NULL',
      'period_end TIMESTAMPTZ NOT NULL',
      'generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()',
      "status VARCHAR(10) NOT NULL CHECK (status IN ('ok','partial','failed'))",
      "payload JSONB NOT NULL DEFAULT '{}'::jsonb",
      "stats JSONB NOT NULL DEFAULT '{}'::jsonb",
      'model VARCHAR(100)',
      'input_tokens INTEGER NOT NULL DEFAULT 0',
      'output_tokens INTEGER NOT NULL DEFAULT 0',
      'cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0',
      'error TEXT',
    ]) {
      expect(ddl).toContain(col);
    }
  });

  it('drizzle/0029 contains exactly the same statements as the runtime ensure', () => {
    const sqlText = fs.readFileSync(sqlFile, 'utf-8');
    const statements = sqlText
      .split('--> statement-breakpoint')
      .map((s) => s.replace(/^--.*$/gm, '').replace(/;\s*$/, '').trim())
      .filter(Boolean);
    expect(statements.map(squash)).toEqual(WEEKLY_BRIEF_DDL_STATEMENTS.map(squash));
  });

  it('is not registered in the drizzle journal (same as 0027/0028)', () => {
    const journal = fs.readFileSync(path.resolve(here, '../../../drizzle/meta/_journal.json'), 'utf-8');
    expect(journal).not.toContain('0029_add_weekly_briefs');
  });

  it('ensureWeeklyBriefTables runs each statement; runWeeklyBriefDdl works on any executor', async () => {
    h.executed.length = 0;
    await ensureWeeklyBriefTables();
    expect(h.executed).toHaveLength(1);
    const tx = { execute: vi.fn(async () => undefined) };
    await runWeeklyBriefDdl(tx);
    expect(tx.execute).toHaveBeenCalledTimes(1);
  });
});
