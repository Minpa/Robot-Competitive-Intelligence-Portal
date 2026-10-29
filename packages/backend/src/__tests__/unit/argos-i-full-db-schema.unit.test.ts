import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import {
  buildSchemaJson,
  closeExclusionOverFks,
  computeSchemaFingerprint,
  findLatestDrizzleSql,
  introspectSchema,
  planDump,
  topoSortTables,
  type RawColumn,
  type RawForeignKey,
  type RawSchema,
  type RawUniqueIndex,
} from '../../services/argos-i-full-db-schema.js';

// ── 가짜 스키마 빌더 ─────────────────────────────────────────────────────────

interface ColSpec {
  name: string;
  udt?: string;
  nullable?: boolean;
  def?: string | null;
  generated?: boolean;
}
interface TableSpec {
  name: string;
  cols: (string | ColSpec)[];
  pk?: string[];
}

function makeSchema(tables: TableSpec[], fks: Array<{ t: string; cols: string[]; ref: string; refCols?: string[]; del?: string; name?: string; refSchema?: string }> = [], uniques: Array<{ t: string; name: string; cols: string[]; partial?: boolean; expr?: boolean }> = [], sequences: RawSchema['sequences'] = []): RawSchema {
  const columns: RawColumn[] = [];
  const uniqueIndexes: RawUniqueIndex[] = [];
  for (const t of tables) {
    t.cols.forEach((c, i) => {
      const s: ColSpec = typeof c === 'string' ? { name: c } : c;
      const udt = s.udt ?? 'text';
      columns.push({
        table: t.name,
        name: s.name,
        ordinalPosition: i + 1,
        dataType: udt === 'text' ? 'text' : udt,
        udtName: udt,
        formatType: udt === 'int4' ? 'integer' : udt,
        isNullable: s.nullable ?? true,
        default: s.def ?? null,
        isGenerated: s.generated ?? false,
        isIdentity: false,
        identityGeneration: null,
      });
    });
    if (t.pk) uniqueIndexes.push({ table: t.name, name: `${t.name}_pkey`, isPrimary: true, isPartial: false, hasExpression: false, columns: t.pk });
  }
  for (const u of uniques) uniqueIndexes.push({ table: u.t, name: u.name, isPrimary: false, isPartial: u.partial ?? false, hasExpression: u.expr ?? false, columns: u.cols });
  const foreignKeys: RawForeignKey[] = fks.map((f, i) => ({
    name: f.name ?? `${f.t}_fk${i}`,
    table: f.t,
    columns: f.cols,
    refSchema: f.refSchema ?? 'public',
    refTable: f.ref,
    refColumns: f.refCols ?? ['id'],
    onDeleteCode: f.del ?? 'n',
  }));
  return { tables: tables.map((t) => t.name), columns, foreignKeys, uniqueIndexes, sequences };
}

const idCol: ColSpec = { name: 'id', udt: 'uuid', nullable: false, def: 'gen_random_uuid()' };

describe('planDump: table selection', () => {
  it('excludes the blocklist and auto-includes unknown new tables', () => {
    const raw = makeSchema(
      ['users', 'allowed_emails', 'audit_logs', 'ai_usage_logs', 'argos_i_exports', 'argos_i_export_files', '__drizzle_migrations', 'articles', 'brand_new_thing', 'data_migrations'].map((name) => ({ name, cols: [idCol], pk: ['id'] })),
    );
    const plan = planDump(raw);
    expect(plan.loadOrder).toEqual(['articles', 'brand_new_thing', 'data_migrations']);
    expect(plan.excludedTables.map((t) => t.name)).toEqual(['__drizzle_migrations', 'ai_usage_logs', 'allowed_emails', 'argos_i_export_files', 'argos_i_exports', 'audit_logs', 'users']);
    expect(plan.excludedTables.every((t) => t.reason.length > 0)).toBe(true);
  });

  it('data_migrations is included with loadByDefault=false and a reason', () => {
    const plan = planDump(makeSchema([{ name: 'data_migrations', cols: [{ name: 'key', nullable: false }], pk: ['key'] }, { name: 'articles', cols: [idCol], pk: ['id'] }]));
    const dm = plan.tables.find((t) => t.name === 'data_migrations')!;
    expect(dm.loadByDefault).toBe(false);
    expect(dm.loadByDefaultReason).toContain('적재하지 말 것');
    expect(plan.tables.find((t) => t.name === 'articles')!.loadByDefault).toBe(true);
  });
});

describe('planDump: columns', () => {
  it('excludes name-rule columns and records them, keeps allowlisted ones', () => {
    const raw = makeSchema([
      { name: 'weekly_briefs', cols: [idCol, { name: 'input_tokens', udt: 'int4', nullable: false, def: '0' }, { name: 'output_tokens', udt: 'int4', nullable: false, def: '0' }, 'cost_usd'], pk: ['id'] },
      { name: 'issue_ai_call_log', cols: [idCol, { name: 'input_tokens', udt: 'int4' }, { name: 'output_tokens', udt: 'int4' }], pk: ['id'] },
      { name: 'integrations', cols: [idCol, 'api_key', { name: 'webhook_secret' }, 'name', 'description'], pk: ['id'] },
    ]);
    const plan = planDump(raw);
    const cols = (n: string) => plan.tables.find((t) => t.name === n)!.columns.map((c) => c.name);
    expect(cols('weekly_briefs')).toEqual(['id', 'input_tokens', 'output_tokens', 'cost_usd']);
    expect(cols('issue_ai_call_log')).toEqual(['id', 'input_tokens', 'output_tokens']);
    expect(cols('integrations')).toEqual(['id', 'name', 'description']);
    expect(plan.excludedColumns).toEqual([
      { table: 'integrations', column: 'api_key', pattern: 'api_key', reason: 'name_rule:api_key' },
      { table: 'integrations', column: 'webhook_secret', pattern: 'secret', reason: 'name_rule:secret' },
    ]);
    expect(plan.allowlistedColumns.map((a) => `${a.table}.${a.column}`).sort()).toEqual([
      'issue_ai_call_log.input_tokens',
      'issue_ai_call_log.output_tokens',
      'weekly_briefs.input_tokens',
      'weekly_briefs.output_tokens',
    ]);
  });

  it('excludes generated columns with reason generated', () => {
    const plan = planDump(makeSchema([{ name: 't', cols: [idCol, { name: 'g', generated: true }, 'a'], pk: ['id'] }]));
    expect(plan.tables[0]!.columns.map((c) => c.name)).toEqual(['id', 'a']);
    expect(plan.excludedColumns).toEqual([{ table: 't', column: 'g', reason: 'generated' }]);
  });

  it('a required (NOT NULL, no default) excluded column excludes the whole table', () => {
    const plan = planDump(makeSchema([{ name: 'creds', cols: [idCol, { name: 'access_token', nullable: false }], pk: ['id'] }, { name: 'ok', cols: [idCol], pk: ['id'] }]));
    expect(plan.loadOrder).toEqual(['ok']);
    expect(plan.excludedTables).toEqual([{ name: 'creds', reason: 'required_column_excluded:access_token' }]);
    expect(plan.excludedColumns).toEqual([]);
  });

  it('NOT NULL with a default does not exclude the table', () => {
    const plan = planDump(makeSchema([{ name: 't', cols: [idCol, { name: 'secret_mode', nullable: false, def: "'x'" }], pk: ['id'] }]));
    expect(plan.loadOrder).toEqual(['t']);
    expect(plan.excludedColumns).toHaveLength(1);
  });

  it('records dumpEncoding, scrub flag, text fallback columns and sequences', () => {
    const raw = makeSchema(
      [
        { name: 'regulatory_sources', cols: [idCol, { name: 'config', udt: 'jsonb' }, { name: 'tags', udt: '_text' }, { name: 'ip', udt: 'inet' }, { name: 'n', udt: 'int4', nullable: false, def: "nextval('x_seq'::regclass)" }], pk: ['id'] },
      ],
      [],
      [],
      [{ table: 'regulatory_sources', column: 'n', sequenceName: 'public.x_seq' }],
    );
    const t = planDump(raw).tables[0]!;
    expect(t.columns.find((c) => c.name === 'config')).toMatchObject({ dumpEncoding: 'json', scrub: true });
    expect(t.columns.find((c) => c.name === 'tags')!.dumpEncoding).toBe('array_json');
    expect(t.columns.find((c) => c.name === 'ip')!.dumpEncoding).toBe('text_cast');
    expect(t.sequences).toEqual([{ column: 'n', sequenceName: 'public.x_seq' }]);
    const plan = planDump(raw);
    expect(plan.textFallbackColumns).toEqual([{ table: 'regulatory_sources', column: 'ip', udtName: 'inet' }]);
    expect(plan.scrubbedColumns).toEqual([{ table: 'regulatory_sources', column: 'config' }]);
  });
});

describe('planDump: foreign keys to excluded tables', () => {
  it('nullable FK to an excluded table is nullified and recorded', () => {
    const raw = makeSchema(
      [
        { name: 'users', cols: [idCol], pk: ['id'] },
        { name: 'articles', cols: [idCol, { name: 'submitted_by', udt: 'uuid' }], pk: ['id'] },
      ],
      [{ t: 'articles', cols: ['submitted_by'], ref: 'users' }],
    );
    const plan = planDump(raw);
    expect(plan.nullifiedFkColumns).toEqual([{ table: 'articles', column: 'submitted_by', refTable: 'users' }]);
    const col = plan.tables[0]!.columns.find((c) => c.name === 'submitted_by')!;
    expect(col.nullified).toBe(true);
    expect(plan.tables[0]!.foreignKeys[0]).toMatchObject({ refTable: 'users', refExcluded: true });
  });

  it('NOT NULL FK to an excluded table excludes the table, and the exclusion closes over chained NOT NULL FKs', () => {
    const raw = makeSchema(
      [
        { name: 'users', cols: [idCol], pk: ['id'] },
        { name: 'prefs', cols: [idCol, { name: 'user_id', udt: 'uuid', nullable: false }], pk: ['id'] },
        { name: 'pref_items', cols: [idCol, { name: 'pref_id', udt: 'uuid', nullable: false }], pk: ['id'] },
        { name: 'pref_notes', cols: [idCol, { name: 'item_id', udt: 'uuid', nullable: true }], pk: ['id'] },
        { name: 'free', cols: [idCol], pk: ['id'] },
      ],
      [
        { t: 'prefs', cols: ['user_id'], ref: 'users' },
        { t: 'pref_items', cols: ['pref_id'], ref: 'prefs' },
        { t: 'pref_notes', cols: ['item_id'], ref: 'pref_items' },
      ],
    );
    const plan = planDump(raw);
    // pref_notes 의 FK 는 nullable 이므로 제외되지 않고 NULL 처리된다
    expect(plan.loadOrder).toEqual(['free', 'pref_notes']);
    const reasons = Object.fromEntries(plan.excludedTables.map((t) => [t.name, t.reason]));
    expect(reasons.prefs).toBe('not_null_fk_to_excluded:users');
    expect(reasons.pref_items).toBe('not_null_fk_to_excluded:prefs');
    expect(reasons.pref_notes).toBeUndefined();
    expect(plan.nullifiedFkColumns).toEqual([{ table: 'pref_notes', column: 'item_id', refTable: 'pref_items' }]);
  });

  it('a nullable FK to a table that became excluded by closure is nullified, not excluded', () => {
    const raw = makeSchema(
      [
        { name: 'users', cols: [idCol], pk: ['id'] },
        { name: 'prefs', cols: [idCol, { name: 'user_id', udt: 'uuid', nullable: false }], pk: ['id'] },
        { name: 'pref_notes', cols: [idCol, { name: 'pref_id', udt: 'uuid', nullable: true }], pk: ['id'] },
      ],
      [
        { t: 'prefs', cols: ['user_id'], ref: 'users' },
        { t: 'pref_notes', cols: ['pref_id'], ref: 'prefs' },
      ],
    );
    const plan = planDump(raw);
    expect(plan.loadOrder).toEqual(['pref_notes']);
    expect(plan.nullifiedFkColumns).toEqual([{ table: 'pref_notes', column: 'pref_id', refTable: 'prefs' }]);
  });

  it('closeExclusionOverFks reports newly excluded tables and treats a composite FK with any NOT NULL column as NOT NULL', () => {
    const raw = makeSchema(
      [
        { name: 'users', cols: [idCol] },
        { name: 'child', cols: [{ name: 'a', nullable: true }, { name: 'b', nullable: false }] },
      ],
      [{ t: 'child', cols: ['a', 'b'], ref: 'users', refCols: ['id', 'id2'] }],
    );
    const excluded = new Map([['users', 'x']]);
    const added = closeExclusionOverFks({ tables: raw.tables, foreignKeys: raw.foreignKeys, columns: raw.columns, excluded });
    expect(added).toEqual(['child']);
    expect(excluded.get('child')).toBe('not_null_fk_to_excluded:users');
  });
});

describe('planDump: conflictTarget', () => {
  it('prefers the primary key, then the lexicographically first fully NOT NULL plain unique index, else null', () => {
    const raw = makeSchema(
      [
        { name: 'with_pk', cols: [idCol, { name: 'k', nullable: false }], pk: ['id'] },
        { name: 'link', cols: [{ name: 'a', udt: 'uuid', nullable: false }, { name: 'b', udt: 'uuid', nullable: false }, { name: 'c', udt: 'uuid', nullable: true }] },
        { name: 'nokey', cols: ['x'] },
      ],
      [],
      [
        { t: 'with_pk', name: 'with_pk_k_uniq', cols: ['k'] },
        { t: 'link', name: 'z_link_uniq', cols: ['a', 'c'] }, // nullable column -> rejected
        { t: 'link', name: 'y_partial', cols: ['a'], partial: true }, // partial -> rejected
        { t: 'link', name: 'x_expr', cols: ['a'], expr: true }, // expression -> rejected
        { t: 'link', name: 'm_link_b', cols: ['b'] },
        { t: 'link', name: 'a_link_ab', cols: ['a', 'b'] },
      ],
    );
    const by = Object.fromEntries(planDump(raw).tables.map((t) => [t.name, t]));
    expect(by.with_pk!.conflictTarget).toEqual({ kind: 'primary_key', name: 'with_pk_pkey', columns: ['id'] });
    expect(by.link!.conflictTarget).toEqual({ kind: 'unique_index', name: 'a_link_ab', columns: ['a', 'b'] });
    expect(by.nokey!.conflictTarget).toBeNull();
  });
});

describe('topoSortTables', () => {
  it('puts parents first and orders each level by name', () => {
    const { order, cycles } = topoSortTables(
      ['d', 'c', 'b', 'a', 'z'],
      [
        { from: 'b', to: 'a' },
        { from: 'c', to: 'a' },
        { from: 'd', to: 'b' },
        { from: 'd', to: 'c' },
      ],
    );
    expect(order).toEqual(['a', 'z', 'b', 'c', 'd']);
    expect(cycles).toEqual([]);
  });

  it('is deterministic regardless of input order', () => {
    const edges = [
      { from: 'b', to: 'a' },
      { from: 'c', to: 'b' },
    ];
    expect(topoSortTables(['c', 'b', 'a'], edges).order).toEqual(topoSortTables(['a', 'c', 'b'], [...edges].reverse()).order);
  });

  it('detects cycles and self references as cycle groups and still orders everything', () => {
    const { order, cycles } = topoSortTables(
      ['p', 'a', 'b', 'c', 'self', 'child'],
      [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
        { from: 'c', to: 'a' },
        { from: 'self', to: 'self' },
        { from: 'a', to: 'p' },
        { from: 'child', to: 'a' },
      ],
    );
    expect(cycles).toEqual([['a', 'b', 'c'], ['self']]);
    expect(order.indexOf('p')).toBeLessThan(order.indexOf('a'));
    expect(order.indexOf('child')).toBeGreaterThan(order.indexOf('c'));
    expect([...order].sort()).toEqual(['a', 'b', 'c', 'child', 'p', 'self']);
  });

  it('ignores edges to tables outside the set', () => {
    expect(topoSortTables(['a', 'b'], [{ from: 'a', to: 'users' }]).order).toEqual(['a', 'b']);
  });
});

describe('planDump: self reference is reported as a cycle', () => {
  it('cycles lists the group and the table is still dumped', () => {
    const plan = planDump(
      makeSchema([{ name: 'tree', cols: [idCol, { name: 'parent_id', udt: 'uuid' }], pk: ['id'] }], [{ t: 'tree', cols: ['parent_id'], ref: 'tree' }]),
    );
    expect(plan.cycles).toEqual([['tree']]);
    expect(plan.loadOrder).toEqual(['tree']);
    expect(plan.nullifiedFkColumns).toEqual([]);
  });
});

// ── 실제 스키마 구조를 본뜬 고정 픽스처 ───────────────────────────────────────

interface Compact {
  tables: string[];
  columns: [string, string, number, string, string, boolean, boolean, boolean][];
  foreignKeys: { t: string; n: string; c: string[]; rs: string; rt: string; rc: string[]; d: string }[];
  uniqueIndexes: { t: string; n: string; p: boolean; pp: boolean; e: boolean; c: string[] }[];
  sequences: { t: string; c: string; s: string }[];
}

function loadRealStructure(): RawSchema {
  const file = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'argos-i-full-db-schema-structure.json');
  const c = JSON.parse(readFileSync(file, 'utf-8')) as Compact;
  return {
    tables: c.tables,
    columns: c.columns.map(([table, name, ordinalPosition, udtName, formatType, isNullable, hasDefault, isGenerated]) => ({
      table,
      name,
      ordinalPosition,
      dataType: udtName,
      udtName,
      formatType,
      isNullable,
      default: hasDefault ? 'default' : null,
      isGenerated,
      isIdentity: false,
      identityGeneration: null,
    })),
    foreignKeys: c.foreignKeys.map((f) => ({ name: f.n, table: f.t, columns: f.c, refSchema: f.rs, refTable: f.rt, refColumns: f.rc, onDeleteCode: f.d })),
    uniqueIndexes: c.uniqueIndexes.map((i) => ({ table: i.t, name: i.n, isPrimary: i.p, isPartial: i.pp, hasExpression: i.e, columns: i.c })),
    sequences: c.sequences.map((s) => ({ table: s.t, column: s.c, sequenceName: s.s })),
  };
}

describe('planDump against the real table/FK structure (fixture)', () => {
  const raw = loadRealStructure();
  const plan = planDump(raw);

  it('has no FK cycles and no self references', () => {
    expect(plan.cycles).toEqual([]);
  });

  it('excludes exactly the six blocklisted tables and includes everything else', () => {
    expect(plan.excludedTables.map((t) => t.name).sort()).toEqual(['ai_usage_logs', 'allowed_emails', 'argos_i_export_files', 'argos_i_exports', 'audit_logs', 'users']);
    expect(plan.tables).toHaveLength(raw.tables.length - 6);
  });

  it('orders parents before children (articles after companies and products)', () => {
    const idx = (n: string) => plan.loadOrder.indexOf(n);
    expect(idx('articles')).toBeGreaterThan(idx('companies'));
    expect(idx('articles')).toBeGreaterThan(idx('products'));
    expect(idx('article_keywords')).toBeGreaterThan(idx('articles'));
    // 모든 FK 에 대해 부모가 먼저
    for (const fk of raw.foreignKeys) {
      if (idx(fk.table) < 0 || idx(fk.refTable) < 0 || fk.table === fk.refTable) continue;
      expect(idx(fk.refTable), `${fk.table} -> ${fk.refTable}`).toBeLessThan(idx(fk.table));
    }
  });

  it('nullifies exactly the seven users-referencing columns', () => {
    expect(plan.nullifiedFkColumns.map((n) => `${n.table}.${n.column}`).sort()).toEqual([
      'articles.submitted_by',
      'competitive_alerts.read_by',
      'partner_evaluations.evaluated_by',
      'pipeline_runs.triggered_by',
      'spec_change_logs.changed_by',
      'strategic_goals.created_by',
      'whatif_scenarios.created_by',
    ]);
    expect(plan.nullifiedFkColumns.every((n) => n.refTable === 'users')).toBe(true);
  });

  it('name-rule hits are only the four allowlisted columns plus nothing else in included tables', () => {
    expect(plan.excludedColumns).toEqual([]);
    expect(plan.allowlistedColumns.map((a) => `${a.table}.${a.column}`).sort()).toEqual([
      'issue_ai_call_log.input_tokens',
      'issue_ai_call_log.output_tokens',
      'weekly_briefs.input_tokens',
      'weekly_briefs.output_tokens',
    ]);
  });

  it('has the seven key-less tables resolved through a unique index (pm_cells has a composite primary key) and 17 serial sequences', () => {
    const keyless = ['product_keywords', 'article_keywords', 'robot_components', 'article_robot_tags', 'article_companies', 'article_components', 'article_applications'];
    for (const n of keyless) {
      const t = plan.tables.find((x) => x.name === n)!;
      expect(t.primaryKey, n).toEqual([]);
      expect(t.conflictTarget?.kind, n).toBe('unique_index');
    }
    expect(plan.tables.find((t) => t.name === 'pm_cells')!.conflictTarget?.kind).toBe('primary_key');
    expect(plan.tables.every((t) => t.conflictTarget !== null)).toBe(true);
    expect(plan.tables.flatMap((t) => t.sequences)).toHaveLength(17);
  });

  it('regulatory_sources.config is scrubbed and data_migrations is not loaded by default', () => {
    expect(plan.scrubbedColumns).toEqual([{ table: 'regulatory_sources', column: 'config' }]);
    expect(plan.tables.filter((t) => !t.loadByDefault).map((t) => t.name)).toEqual(['data_migrations']);
  });

  it('only known udt types appear (no text fallback in the current schema)', () => {
    expect(plan.textFallbackColumns).toEqual([]);
    const udts = new Set(plan.tables.flatMap((t) => t.columns.map((c) => c.udtName)));
    expect([...udts].sort()).toEqual(['_text', 'bool', 'bpchar', 'bytea', 'date', 'int4', 'int8', 'jsonb', 'numeric', 'text', 'timestamp', 'timestamptz', 'uuid', 'varchar'].filter((u) => udts.has(u)));
  });
});

describe('buildSchemaJson / fingerprint', () => {
  const plan = planDump(loadRealStructure());
  const schema = buildSchemaJson(plan, { generatedAt: new Date('2026-10-29T03:12:45.000Z') }) as any;

  it('carries the contract fields', () => {
    expect(schema.dumpFormatVersion).toBe(1);
    expect(schema.generatedAt).toBe('2026-10-29T03:12:45.000Z');
    expect(schema.loadOrder).toEqual(plan.loadOrder);
    expect(schema.cycles).toEqual([]);
    expect(schema.tables.map((t: any) => t.name)).toEqual(plan.loadOrder);
    const t = schema.tables[0];
    expect(Object.keys(t).sort()).toEqual(['columns', 'conflictTarget', 'foreignKeys', 'loadByDefault', 'name', 'primaryKey', 'sequences']);
    expect(Object.keys(t.columns[0]).sort()).toEqual(['dataType', 'default', 'dumpEncoding', 'formatType', 'identityGeneration', 'isGenerated', 'isIdentity', 'isNullable', 'name', 'ordinalPosition', 'udtName']);
    expect(JSON.stringify(schema)).not.toContain('nullified');
  });

  it('the fingerprint is stable and changes when a column type changes', () => {
    const fp = computeSchemaFingerprint(plan);
    expect(fp).toMatch(/^[0-9a-f]{64}$/);
    expect(computeSchemaFingerprint(planDump(loadRealStructure()))).toBe(fp);
    const raw2 = loadRealStructure();
    raw2.columns[0]!.formatType = 'something_else';
    expect(computeSchemaFingerprint(planDump(raw2))).not.toBe(fp);
  });
});

describe('introspectSchema', () => {
  it('maps catalog rows into the raw schema and issues only read queries', async () => {
    const seen: string[] = [];
    const exec = async (text: string) => {
      seen.push(text);
      if (text.includes('FROM information_schema.tables')) return [{ table_name: 't1' }];
      if (text.includes('FROM information_schema.columns c\nJOIN')) {
        return [{ table_name: 't1', column_name: 'id', ordinal_position: 1, data_type: 'integer', udt_name: 'int4', format_type: 'integer', is_nullable: 'NO', column_default: "nextval('t1_id_seq'::regclass)", is_generated: 'NEVER', is_identity: 'NO', identity_generation: null }];
      }
      if (text.includes('pg_constraint')) return [{ name: 'fk', table_name: 't1', ref_schema: 'public', ref_table: 't0', columns: ['a'], ref_columns: ['id'], on_delete: 'c' }];
      if (text.includes('pg_index')) return [{ table_name: 't1', index_name: 't1_pkey', is_primary: true, is_partial: false, has_expression: false, columns: ['id'] }];
      if (text.includes('pg_get_serial_sequence')) return [{ table_name: 't1', column_name: 'id', sequence_name: 'public.t1_id_seq' }, { table_name: 't1', column_name: 'x', sequence_name: null }];
      return [];
    };
    const raw = await introspectSchema(exec);
    expect(raw.tables).toEqual(['t1']);
    expect(raw.columns[0]).toMatchObject({ table: 't1', name: 'id', isNullable: false, udtName: 'int4', isGenerated: false });
    expect(raw.foreignKeys[0]).toMatchObject({ columns: ['a'], refTable: 't0', onDeleteCode: 'c' });
    expect(raw.uniqueIndexes[0]).toMatchObject({ isPrimary: true, columns: ['id'] });
    expect(raw.sequences).toEqual([{ table: 't1', column: 'id', sequenceName: 'public.t1_id_seq' }]);
    for (const q of seen) expect(q).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE)\b/i);
    for (const q of seen) expect(q).not.toMatch(/FROM\s+(users|articles)\b/i);
  });
});

describe('findLatestDrizzleSql', () => {
  it('returns the highest numbered migration file of the repository, or null for a missing directory', () => {
    expect(findLatestDrizzleSql()).toMatch(/^\d{4}_.*\.sql$/);
    expect(findLatestDrizzleSql('/nonexistent/dir/for/test')).toBeNull();
  });
});
