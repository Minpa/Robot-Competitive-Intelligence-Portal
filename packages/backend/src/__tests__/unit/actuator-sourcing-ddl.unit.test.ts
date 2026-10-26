/**
 * actuator-sourcing.ddl.ts — 0028 SQL 과 런타임 ensure 가 같은 문장을 쓰는지, 모두 IF NOT EXISTS 인지
 */
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const h = vi.hoisted(() => ({ executed: [] as unknown[] }));
vi.mock('../../db/index.js', () => ({
  db: { execute: vi.fn(async (q: unknown) => { h.executed.push(q); }) },
}));

import { ACTUATOR_SOURCING_DDL_STATEMENTS, ensureActuatorSourcingTables, runActuatorSourcingDdl } from '../../db/actuator-sourcing.ddl.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const sqlFile = path.resolve(here, '../../../drizzle/0028_add_actuator_sourcing.sql');

const squash = (s: string) => s.replace(/\s+/g, ' ').trim();

describe('actuator sourcing DDL', () => {
  it('declares the three tables and the vendor index, all IF NOT EXISTS', () => {
    expect(ACTUATOR_SOURCING_DDL_STATEMENTS).toHaveLength(4);
    for (const s of ACTUATOR_SOURCING_DDL_STATEMENTS) expect(s).toMatch(/IF NOT EXISTS/);
    const all = ACTUATOR_SOURCING_DDL_STATEMENTS.join('\n');
    for (const t of ['actuator_sourcing', 'actuator_adoptions', 'actuator_vendor_markets', 'actuator_adoptions_vendor_idx']) expect(all).toContain(t);
    expect(all).toContain('REFERENCES humanoid_robots(id) ON DELETE CASCADE');
    expect(all).toContain('case_key VARCHAR(400) NOT NULL UNIQUE');
  });

  it('drizzle/0028 contains exactly the same statements as the runtime ensure', () => {
    const sqlText = fs.readFileSync(sqlFile, 'utf-8');
    const statements = sqlText
      .split('--> statement-breakpoint')
      .map((s) => s.replace(/^--.*$/gm, '').replace(/;\s*$/, '').trim())
      .filter(Boolean);
    expect(statements.map(squash)).toEqual(ACTUATOR_SOURCING_DDL_STATEMENTS.map(squash));
  });

  it('ensureActuatorSourcingTables runs each statement; runActuatorSourcingDdl works on any executor', async () => {
    h.executed.length = 0;
    await ensureActuatorSourcingTables();
    expect(h.executed).toHaveLength(4);
    const tx = { execute: vi.fn(async () => undefined) };
    await runActuatorSourcingDdl(tx);
    expect(tx.execute).toHaveBeenCalledTimes(4);
  });
});
