/**
 * ARGOS_I 전체 DB 덤프 — 스키마 조회(SQL)와 덤프 계획 수립(순수 함수).
 *
 * information_schema / pg_catalog 만 읽는다. 계획(planDump)은 I/O 없이 가짜 입력으로 테스트할 수 있다.
 *   - 제외 테이블(블록리스트) · 이름 규칙 컬럼 제외(허용 목록 예외) · 생성 컬럼 제외
 *   - 제외 테이블을 가리키는 FK: nullable 이면 NULL 처리, NOT NULL 이면 그 테이블도 제외(폐쇄 반복)
 *   - FK 위상 정렬(부모 먼저, 같은 단계는 이름 순), 순환·자기참조 탐지
 *   - conflictTarget(PK 우선, 없으면 NOT NULL 전용 비부분·비식 유니크 인덱스)
 */

import { createHash } from 'crypto';
import { existsSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  FULL_DB_DUMP_FORMAT_VERSION,
  classifyColumnByName,
  getNoLoadByDefaultReason,
  getTableExclusionReason,
  isScrubJsonColumn,
} from './argos-i-full-db-config.js';
import { dumpEncodingForUdt, type DumpColumn, type DumpEncoding } from './argos-i-full-db-rows.js';

// ─────────────────────────────────────────────────────────────────────────────
// 조회 결과 형식
// ─────────────────────────────────────────────────────────────────────────────

export interface RawColumn {
  table: string;
  name: string;
  ordinalPosition: number;
  dataType: string;
  udtName: string;
  formatType: string;
  isNullable: boolean;
  default: string | null;
  isGenerated: boolean;
  isIdentity: boolean;
  identityGeneration: string | null;
}

export interface RawForeignKey {
  name: string;
  table: string;
  columns: string[];
  refSchema: string;
  refTable: string;
  refColumns: string[];
  /** 'a' NO ACTION, 'r' RESTRICT, 'c' CASCADE, 'n' SET NULL, 'd' SET DEFAULT */
  onDeleteCode: string;
}

export interface RawUniqueIndex {
  table: string;
  name: string;
  isPrimary: boolean;
  isPartial: boolean;
  hasExpression: boolean;
  columns: string[];
}

export interface RawSequence {
  table: string;
  column: string;
  sequenceName: string;
}

export interface RawSchema {
  /** public 스키마의 BASE TABLE 이름 */
  tables: string[];
  columns: RawColumn[];
  foreignKeys: RawForeignKey[];
  uniqueIndexes: RawUniqueIndex[];
  sequences: RawSequence[];
}

/** `(text, params) => rows` — pg Client/Pool 의 query 를 얇게 감싼 것 */
export type SqlExecutor = (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

const SQL_TABLES = `
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name`;

const SQL_COLUMNS = `
SELECT c.table_name, c.column_name, c.ordinal_position, c.data_type, c.udt_name,
       pg_catalog.format_type(a.atttypid, a.atttypmod) AS format_type,
       c.is_nullable, c.column_default, c.is_generated, c.is_identity, c.identity_generation
FROM information_schema.columns c
JOIN pg_catalog.pg_namespace n ON n.nspname = c.table_schema
JOIN pg_catalog.pg_class cl ON cl.relnamespace = n.oid AND cl.relname = c.table_name AND cl.relkind IN ('r', 'p')
JOIN pg_catalog.pg_attribute a ON a.attrelid = cl.oid AND a.attname = c.column_name AND NOT a.attisdropped
WHERE c.table_schema = 'public'
ORDER BY c.table_name, c.ordinal_position`;

const SQL_FOREIGN_KEYS = `
SELECT con.conname AS name, cl.relname AS table_name, rn.nspname AS ref_schema, rcl.relname AS ref_table,
       (SELECT array_agg(att.attname::text ORDER BY k.ord)
          FROM unnest(con.conkey) WITH ORDINALITY AS k(attnum, ord)
          JOIN pg_catalog.pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = k.attnum) AS columns,
       (SELECT array_agg(att.attname::text ORDER BY k.ord)
          FROM unnest(con.confkey) WITH ORDINALITY AS k(attnum, ord)
          JOIN pg_catalog.pg_attribute att ON att.attrelid = con.confrelid AND att.attnum = k.attnum) AS ref_columns,
       con.confdeltype::text AS on_delete
FROM pg_catalog.pg_constraint con
JOIN pg_catalog.pg_class cl ON cl.oid = con.conrelid
JOIN pg_catalog.pg_namespace n ON n.oid = cl.relnamespace
JOIN pg_catalog.pg_class rcl ON rcl.oid = con.confrelid
JOIN pg_catalog.pg_namespace rn ON rn.oid = rcl.relnamespace
WHERE con.contype = 'f' AND n.nspname = 'public'
ORDER BY cl.relname, con.conname`;

const SQL_UNIQUE_INDEXES = `
SELECT cl.relname AS table_name, ic.relname AS index_name, i.indisprimary AS is_primary,
       (i.indpred IS NOT NULL) AS is_partial, (i.indexprs IS NOT NULL) AS has_expression,
       (SELECT array_agg(att.attname::text ORDER BY k.ord)
          FROM unnest(i.indkey::int2[]) WITH ORDINALITY AS k(attnum, ord)
          JOIN pg_catalog.pg_attribute att ON att.attrelid = i.indrelid AND att.attnum = k.attnum
         WHERE k.attnum > 0 AND k.ord <= i.indnkeyatts) AS columns
FROM pg_catalog.pg_index i
JOIN pg_catalog.pg_class cl ON cl.oid = i.indrelid
JOIN pg_catalog.pg_namespace n ON n.oid = cl.relnamespace
JOIN pg_catalog.pg_class ic ON ic.oid = i.indexrelid
WHERE i.indisunique AND i.indisvalid AND n.nspname = 'public' AND cl.relkind IN ('r', 'p')
ORDER BY cl.relname, ic.relname`;

const SQL_SEQUENCES = `
SELECT c.table_name, c.column_name,
       pg_catalog.pg_get_serial_sequence(quote_ident(c.table_schema) || '.' || quote_ident(c.table_name), c.column_name) AS sequence_name
FROM information_schema.columns c
WHERE c.table_schema = 'public' AND (c.column_default LIKE 'nextval(%' OR c.is_identity = 'YES')
ORDER BY c.table_name, c.ordinal_position`;

const str = (v: unknown): string => String(v);
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

/** 읽기 전용 카탈로그 조회. 모든 쿼리는 호출자의 트랜잭션(스냅샷) 안에서 실행된다 */
export async function introspectSchema(exec: SqlExecutor): Promise<RawSchema> {
  const tables = (await exec(SQL_TABLES)).map((r) => str(r.table_name));
  const columns = (await exec(SQL_COLUMNS)).map(
    (r): RawColumn => ({
      table: str(r.table_name),
      name: str(r.column_name),
      ordinalPosition: Number(r.ordinal_position),
      dataType: str(r.data_type),
      udtName: str(r.udt_name),
      formatType: str(r.format_type),
      isNullable: r.is_nullable === 'YES',
      default: r.column_default === null || r.column_default === undefined ? null : str(r.column_default),
      isGenerated: r.is_generated === 'ALWAYS',
      isIdentity: r.is_identity === 'YES',
      identityGeneration: r.identity_generation === null || r.identity_generation === undefined ? null : str(r.identity_generation),
    }),
  );
  const foreignKeys = (await exec(SQL_FOREIGN_KEYS)).map(
    (r): RawForeignKey => ({
      name: str(r.name),
      table: str(r.table_name),
      columns: strArr(r.columns),
      refSchema: str(r.ref_schema),
      refTable: str(r.ref_table),
      refColumns: strArr(r.ref_columns),
      onDeleteCode: str(r.on_delete),
    }),
  );
  const uniqueIndexes = (await exec(SQL_UNIQUE_INDEXES)).map(
    (r): RawUniqueIndex => ({
      table: str(r.table_name),
      name: str(r.index_name),
      isPrimary: r.is_primary === true,
      isPartial: r.is_partial === true,
      hasExpression: r.has_expression === true,
      columns: strArr(r.columns),
    }),
  );
  const sequences = (await exec(SQL_SEQUENCES))
    .filter((r) => r.sequence_name !== null && r.sequence_name !== undefined)
    .map((r): RawSequence => ({ table: str(r.table_name), column: str(r.column_name), sequenceName: str(r.sequence_name) }));
  return { tables, columns, foreignKeys, uniqueIndexes, sequences };
}

// ─────────────────────────────────────────────────────────────────────────────
// 계획
// ─────────────────────────────────────────────────────────────────────────────

export type OnDeleteAction = 'NO ACTION' | 'RESTRICT' | 'CASCADE' | 'SET NULL' | 'SET DEFAULT';

const ON_DELETE: Record<string, OnDeleteAction> = {
  a: 'NO ACTION',
  r: 'RESTRICT',
  c: 'CASCADE',
  n: 'SET NULL',
  d: 'SET DEFAULT',
};

export interface PlannedColumn extends DumpColumn {
  ordinalPosition: number;
  dataType: string;
  formatType: string;
  isNullable: boolean;
  default: string | null;
  isGenerated: boolean;
  isIdentity: boolean;
  identityGeneration: string | null;
  dumpEncoding: DumpEncoding;
}

export interface PlannedForeignKey {
  name: string;
  columns: string[];
  refTable: string;
  refColumns: string[];
  onDelete: OnDeleteAction;
  refExcluded: boolean;
}

export interface ConflictTarget {
  kind: 'primary_key' | 'unique_index';
  name: string;
  columns: string[];
}

export interface PlannedTable {
  name: string;
  columns: PlannedColumn[];
  primaryKey: string[];
  conflictTarget: ConflictTarget | null;
  foreignKeys: PlannedForeignKey[];
  sequences: { column: string; sequenceName: string }[];
  loadByDefault: boolean;
  loadByDefaultReason: string | null;
}

export interface DumpPlan {
  /** loadOrder 순서 */
  tables: PlannedTable[];
  loadOrder: string[];
  cycles: string[][];
  excludedTables: { name: string; reason: string }[];
  excludedColumns: { table: string; column: string; pattern?: string; reason: string }[];
  allowlistedColumns: { table: string; column: string; pattern: string }[];
  nullifiedFkColumns: { table: string; column: string; refTable: string }[];
  scrubbedColumns: { table: string; column: string }[];
  textFallbackColumns: { table: string; column: string; udtName: string }[];
}

interface ClosureInput {
  tables: string[];
  foreignKeys: RawForeignKey[];
  columns: RawColumn[];
  /** 이미 제외된 테이블 → 사유 (이 맵을 갱신한다) */
  excluded: Map<string, string>;
}

/**
 * 제외 테이블을 NOT NULL FK 로 가리키는 테이블을 반복해서 제외한다(폐쇄). 입력 맵을 갱신하고 새로 제외된 이름을 돌려준다.
 * FK 의 컬럼 중 하나라도 NOT NULL 이면 NOT NULL FK 로 본다. nullable 이면 NULL 처리 대상이다.
 */
export function closeExclusionOverFks(input: ClosureInput): string[] {
  const colNullable = new Map<string, boolean>();
  for (const c of input.columns) colNullable.set(`${c.table}\0${c.name}`, c.isNullable);
  const added: string[] = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const fk of input.foreignKeys) {
      if (input.excluded.has(fk.table)) continue;
      const refExcluded = fk.refSchema !== 'public' || input.excluded.has(fk.refTable);
      if (!refExcluded) continue;
      const notNull = fk.columns.some((c) => colNullable.get(`${fk.table}\0${c}`) === false);
      if (notNull) {
        input.excluded.set(fk.table, `not_null_fk_to_excluded:${fk.refTable}`);
        added.push(fk.table);
        changed = true;
      }
    }
  }
  return added;
}

/**
 * 부모(FK 참조 대상)가 먼저 오도록 정렬한다. 같은 단계 안에서는 이름 오름차순(결정적).
 * 순환·자기참조는 SCC 로 묶어 cycles 로 돌려주고, 묶음은 하나의 단계로 취급한다(멤버는 이름 순).
 */
export function topoSortTables(tables: readonly string[], edges: readonly { from: string; to: string }[]): { order: string[]; cycles: string[][] } {
  const names = [...tables].sort();
  const set = new Set(names);
  const out = new Map<string, Set<string>>(); // child -> parents
  for (const n of names) out.set(n, new Set());
  const selfLoops = new Set<string>();
  for (const e of edges) {
    if (!set.has(e.from) || !set.has(e.to)) continue;
    if (e.from === e.to) selfLoops.add(e.from);
    else out.get(e.from)!.add(e.to);
  }

  // Tarjan SCC (반복 구현이 필요할 만큼 깊지 않다: 테이블 수는 수백)
  let index = 0;
  const idx = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccOf = new Map<string, number>();
  const sccs: string[][] = [];
  const strong = (v: string): void => {
    idx.set(v, index);
    low.set(v, index);
    index += 1;
    stack.push(v);
    onStack.add(v);
    for (const w of [...out.get(v)!].sort()) {
      if (!idx.has(w)) {
        strong(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v)!, idx.get(w)!));
      }
    }
    if (low.get(v) === idx.get(v)) {
      const comp: string[] = [];
      for (;;) {
        const w = stack.pop()!;
        onStack.delete(w);
        sccOf.set(w, sccs.length);
        comp.push(w);
        if (w === v) break;
      }
      sccs.push(comp.sort());
    }
  };
  for (const n of names) if (!idx.has(n)) strong(n);

  const cycles = sccs.filter((c) => c.length > 1 || selfLoops.has(c[0]!)).sort((a, b) => a[0]!.localeCompare(b[0]!));

  // SCC 응축 그래프에서 단계별(Kahn) 정렬
  const parents = sccs.map(() => new Set<number>());
  for (const [child, ps] of out) for (const p of ps) if (sccOf.get(child) !== sccOf.get(p)) parents[sccOf.get(child)!]!.add(sccOf.get(p)!);
  const done = new Set<number>();
  const order: string[] = [];
  while (done.size < sccs.length) {
    const ready = sccs
      .map((_, i) => i)
      .filter((i) => !done.has(i) && [...parents[i]!].every((p) => done.has(p)))
      .sort((a, b) => sccs[a]![0]!.localeCompare(sccs[b]![0]!));
    if (ready.length === 0) throw new Error('topo_sort_stuck');
    for (const i of ready) {
      order.push(...sccs[i]!);
      done.add(i);
    }
  }
  return { order, cycles };
}

function pickConflictTarget(table: string, columns: readonly PlannedColumn[], raw: RawSchema, primaryKey: string[]): ConflictTarget | null {
  const included = new Map(columns.map((c) => [c.name, c]));
  if (primaryKey.length > 0 && primaryKey.every((c) => included.has(c) && !included.get(c)!.nullified)) {
    const pk = raw.uniqueIndexes.find((i) => i.table === table && i.isPrimary);
    return { kind: 'primary_key', name: pk?.name ?? `${table}_pkey`, columns: primaryKey };
  }
  const candidates = raw.uniqueIndexes
    .filter((i) => i.table === table && !i.isPrimary && !i.isPartial && !i.hasExpression && i.columns.length > 0)
    .filter((i) => i.columns.every((c) => included.has(c) && !included.get(c)!.nullified && !included.get(c)!.isNullable))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const first = candidates[0];
  return first ? { kind: 'unique_index', name: first.name, columns: first.columns } : null;
}

/** 조회 결과 → 덤프 계획. 순수 함수 */
export function planDump(raw: RawSchema): DumpPlan {
  const excluded = new Map<string, string>();
  for (const t of raw.tables) {
    const reason = getTableExclusionReason(t);
    if (reason) excluded.set(t, reason);
  }

  const byTable = new Map<string, RawColumn[]>();
  for (const c of raw.columns) {
    if (!byTable.has(c.table)) byTable.set(c.table, []);
    byTable.get(c.table)!.push(c);
  }

  // 1) 컬럼 제외 판정 — 필수(NOT NULL, 기본값 없음) 컬럼이 제외되면 테이블 전체 제외
  const excludedColumns: DumpPlan['excludedColumns'] = [];
  const allowlistedColumns: DumpPlan['allowlistedColumns'] = [];
  const droppedColumns = new Set<string>();
  for (const t of raw.tables) {
    if (excluded.has(t)) continue;
    for (const c of byTable.get(t) ?? []) {
      if (c.isGenerated) {
        droppedColumns.add(`${t}\0${c.name}`);
        excludedColumns.push({ table: t, column: c.name, reason: 'generated' });
        continue;
      }
      const verdict = classifyColumnByName(t, c.name);
      if (verdict.kind === 'allowlisted') allowlistedColumns.push({ table: t, column: c.name, pattern: verdict.pattern });
      if (verdict.kind === 'excluded') {
        droppedColumns.add(`${t}\0${c.name}`);
        excludedColumns.push({ table: t, column: c.name, pattern: verdict.pattern, reason: `name_rule:${verdict.pattern}` });
        if (!c.isNullable && c.default === null && !c.isIdentity) excluded.set(t, `required_column_excluded:${c.name}`);
      }
    }
    // 덤프할 컬럼이 하나도 남지 않으면 SELECT 를 만들 수 없다
    if (!excluded.has(t) && (byTable.get(t) ?? []).every((c) => droppedColumns.has(`${t}\0${c.name}`))) excluded.set(t, 'no_dumpable_columns');
  }

  // 2) 제외 테이블을 NOT NULL FK 로 가리키는 테이블 제외(폐쇄)
  closeExclusionOverFks({ tables: raw.tables, foreignKeys: raw.foreignKeys, columns: raw.columns, excluded });

  // 테이블 전체가 제외된 경우 그 테이블의 컬럼 제외 기록은 남기지 않는다 (excludedTables 에 사유가 있다)
  const reportedExcludedColumns = excludedColumns.filter((e) => !excluded.has(e.table));

  const includedNames = raw.tables.filter((t) => !excluded.has(t));
  const includedSet = new Set(includedNames);

  // 3) FK 처리: 제외 테이블을 가리키는 nullable FK → 컬럼 NULL 처리
  const nullifiedKeys = new Set<string>();
  const nullifiedFkColumns: DumpPlan['nullifiedFkColumns'] = [];
  for (const fk of raw.foreignKeys) {
    if (!includedSet.has(fk.table)) continue;
    const refExcluded = fk.refSchema !== 'public' || !includedSet.has(fk.refTable);
    if (!refExcluded) continue;
    for (const col of fk.columns) {
      const key = `${fk.table}\0${col}`;
      if (nullifiedKeys.has(key) || droppedColumns.has(key)) continue;
      nullifiedKeys.add(key);
      nullifiedFkColumns.push({ table: fk.table, column: col, refTable: fk.refTable });
    }
  }

  // 4) 위상 정렬
  const edges = raw.foreignKeys.filter((fk) => includedSet.has(fk.table) && includedSet.has(fk.refTable) && fk.refSchema === 'public').map((fk) => ({ from: fk.table, to: fk.refTable }));
  const { order, cycles } = topoSortTables(includedNames, edges);

  // 5) 테이블별 계획
  const textFallbackColumns: DumpPlan['textFallbackColumns'] = [];
  const scrubbedColumns: DumpPlan['scrubbedColumns'] = [];
  const tables: PlannedTable[] = order.map((name) => {
    const columns: PlannedColumn[] = (byTable.get(name) ?? [])
      .filter((c) => !droppedColumns.has(`${name}\0${c.name}`))
      .map((c) => {
        const dumpEncoding = dumpEncodingForUdt(c.udtName);
        const nullified = nullifiedKeys.has(`${name}\0${c.name}`);
        const scrub = dumpEncoding === 'json' && isScrubJsonColumn(name, c.name);
        if (dumpEncoding === 'text_cast' && !nullified) textFallbackColumns.push({ table: name, column: c.name, udtName: c.udtName });
        if (scrub) scrubbedColumns.push({ table: name, column: c.name });
        const pc: PlannedColumn = {
          name: c.name,
          udtName: c.udtName,
          ordinalPosition: c.ordinalPosition,
          dataType: c.dataType,
          formatType: c.formatType,
          isNullable: c.isNullable,
          default: c.default,
          isGenerated: c.isGenerated,
          isIdentity: c.isIdentity,
          identityGeneration: c.identityGeneration,
          dumpEncoding,
        };
        if (nullified) pc.nullified = true;
        if (scrub) pc.scrub = true;
        return pc;
      });
    const pkIndex = raw.uniqueIndexes.find((i) => i.table === name && i.isPrimary);
    const primaryKey = pkIndex ? pkIndex.columns : [];
    const noLoad = getNoLoadByDefaultReason(name);
    return {
      name,
      columns,
      primaryKey,
      conflictTarget: pickConflictTarget(name, columns, raw, primaryKey),
      foreignKeys: raw.foreignKeys
        .filter((fk) => fk.table === name)
        .map((fk) => ({
          name: fk.name,
          columns: fk.columns,
          refTable: fk.refTable,
          refColumns: fk.refColumns,
          onDelete: ON_DELETE[fk.onDeleteCode] ?? 'NO ACTION',
          refExcluded: fk.refSchema !== 'public' || !includedSet.has(fk.refTable),
        })),
      sequences: raw.sequences.filter((s) => s.table === name && columns.some((c) => c.name === s.column)).map((s) => ({ column: s.column, sequenceName: s.sequenceName })),
      loadByDefault: noLoad === null,
      loadByDefaultReason: noLoad,
    };
  });

  const excludedTables = [...excluded.entries()].map(([name, reason]) => ({ name, reason })).sort((a, b) => (a.name < b.name ? -1 : 1));

  return {
    tables,
    loadOrder: order,
    cycles,
    excludedTables,
    excludedColumns: reportedExcludedColumns,
    allowlistedColumns: allowlistedColumns.filter((a) => !excluded.has(a.table)),
    nullifiedFkColumns,
    scrubbedColumns,
    textFallbackColumns,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// schema.json / 지문
// ─────────────────────────────────────────────────────────────────────────────

/** 포함 테이블·컬럼·타입의 정규화 JSON 의 sha256 (정보 제공용) */
export function computeSchemaFingerprint(plan: DumpPlan): string {
  const normalized = [...plan.tables]
    .sort((a, b) => (a.name < b.name ? -1 : 1))
    .map((t) => ({
      t: t.name,
      c: [...t.columns].sort((a, b) => a.ordinalPosition - b.ordinalPosition).map((c) => [c.name, c.udtName, c.formatType, c.isNullable]),
    }));
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

export interface SchemaJsonContext {
  generatedAt: Date;
}

/** ZIP 의 schema.json 본문 (객체). 직렬화는 호출자가 압축형으로 한다 */
export function buildSchemaJson(plan: DumpPlan, ctx: SchemaJsonContext): Record<string, unknown> {
  return {
    dumpFormatVersion: FULL_DB_DUMP_FORMAT_VERSION,
    generatedAt: ctx.generatedAt.toISOString(),
    loadOrder: plan.loadOrder,
    cycles: plan.cycles,
    tables: plan.tables.map((t) => ({
      name: t.name,
      columns: t.columns.map((c) => ({
        name: c.name,
        ordinalPosition: c.ordinalPosition,
        dataType: c.dataType,
        udtName: c.udtName,
        formatType: c.formatType,
        isNullable: c.isNullable,
        default: c.default,
        isGenerated: c.isGenerated,
        isIdentity: c.isIdentity,
        identityGeneration: c.identityGeneration,
        dumpEncoding: c.dumpEncoding,
      })),
      primaryKey: t.primaryKey,
      conflictTarget: t.conflictTarget ?? { kind: null, name: null, columns: [] },
      foreignKeys: t.foreignKeys,
      sequences: t.sequences,
      loadByDefault: t.loadByDefault,
    })),
  };
}

/** drizzle/ 디렉터리에서 번호가 가장 큰 SQL 파일명 (없거나 실패하면 null — 덤프를 막지 않는다) */
export function findLatestDrizzleSql(dir?: string): string | null {
  try {
    const base = dir ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'drizzle');
    if (!existsSync(base)) return null;
    const files = readdirSync(base)
      .filter((f) => /^\d+_.*\.sql$/.test(f))
      .sort();
    return files.length > 0 ? files[files.length - 1]! : null;
  } catch {
    return null;
  }
}
