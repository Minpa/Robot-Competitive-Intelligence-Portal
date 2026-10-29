#!/usr/bin/env node
/**
 * ARGOS_I 전체 DB 덤프 적재 (1회성 초기 적재용) — Node 18+, 의존성은 pg 뿐.
 *
 * ARGOS 의 `GET /api/argos-i/export/full-db.zip` 으로 받아 푼 덤프 디렉터리(argos-i-full-db/<YYYYMMDDTHHMMSSZ>/)를
 * ARGOS_I 의 PostgreSQL 에 옮긴다. 원문이 포함된 사내 이전용 데이터이므로 외부로 반출하지 않는다.
 *
 * 실행 위치: 저장소 루트에서, `npm ci` 를 마친 뒤 (pg 는 루트 package.json 의 dependencies 이며 루트 node_modules 에서 해석된다).
 *
 *   DATABASE_URL=postgres://... node scripts/argos-i-import-full-db.mjs <덤프 디렉터리> --dry-run
 *   DATABASE_URL=postgres://... node scripts/argos-i-import-full-db.mjs <덤프 디렉터리> --mode truncate --yes
 *   node scripts/argos-i-import-full-db.mjs <덤프 디렉터리> --verify-only        # 체크섬 검증만 (DB 불필요)
 *
 * 첫 적재는 `--mode truncate --yes` 를 권장한다 (기동 시 시드와 유니크 키가 충돌한다). 옵션과 종료 코드는 --help.
 * DB 접속 정보는 환경변수 DATABASE_URL 로만 받는다 (ps 에 보이지 않도록 인자로 받지 않는다). 비밀번호·행 데이터는 출력하지 않는다.
 *
 * 종료 코드: 0 성공 / 1 인자·버전·pg 미설치 / 2 DB 접속·권한 / 3 체크섬·manifest 손상 / 4 건너뛴 테이블 있음 / 5 테이블 적재 실패 / 6 행 수 불일치
 */

import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EXIT,
  ImportError,
  MAX_BATCH_BYTES,
  SQL_TABLES_WITH_USER_TRIGGERS,
  buildInsertStatement,
  buildSetvalStatement,
  buildTriggerToggleStatements,
  buildTruncateStatement,
  computeCascadeCollateral,
  decideExitCode,
  decodeRow,
  describeDatabaseUrl,
  effectiveBatchRows,
  explainTableError,
  formatSummary,
  parseArgs,
  planTables,
  quoteIdent,
  readJsonlLines,
  shouldToggleUserTriggers,
  triggerWarning,
  usage,
  validateManifest,
  verifyDumpDirectory,
} from './lib/argos-i-full-db-import-lib.mjs';

const log = (msg) => console.log(`[argos-i-import] ${msg}`);
const warn = (msg) => console.warn(`[argos-i-import] WARN: ${msg}`);

const SQL_TARGET_COLUMNS = `
SELECT c.table_name, c.column_name, c.udt_name,
       pg_catalog.format_type(a.atttypid, a.atttypmod) AS format_type,
       (c.is_nullable = 'YES') AS is_nullable, (c.column_default IS NOT NULL) AS has_default,
       (c.is_generated = 'ALWAYS') AS is_generated, (c.is_identity = 'YES') AS is_identity
FROM information_schema.columns c
JOIN pg_catalog.pg_namespace n ON n.nspname = c.table_schema
JOIN pg_catalog.pg_class cl ON cl.relnamespace = n.oid AND cl.relname = c.table_name AND cl.relkind IN ('r', 'p')
JOIN pg_catalog.pg_attribute a ON a.attrelid = cl.oid AND a.attname = c.column_name AND NOT a.attisdropped
WHERE c.table_schema = 'public'
ORDER BY c.table_name, c.ordinal_position`;

const SQL_TARGET_FKS = `
SELECT cl.relname AS table_name, rcl.relname AS ref_table
FROM pg_catalog.pg_constraint con
JOIN pg_catalog.pg_class cl ON cl.oid = con.conrelid
JOIN pg_catalog.pg_namespace n ON n.oid = cl.relnamespace
JOIN pg_catalog.pg_class rcl ON rcl.oid = con.confrelid
JOIN pg_catalog.pg_namespace rn ON rn.oid = rcl.relnamespace
WHERE con.contype = 'f' AND n.nspname = 'public' AND rn.nspname = 'public'`;

function readJsonFile(file, label) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf-8');
  } catch {
    throw new ImportError(`${label} 을(를) 읽을 수 없습니다 (${path.basename(file)}): 덤프가 불완전하거나 디렉터리가 잘못되었습니다. manifest.json 이 없는 ZIP 은 중단된 덤프입니다`, EXIT.CHECKSUM);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new ImportError(`${label} 이(가) 올바른 JSON 이 아닙니다`, EXIT.CHECKSUM);
  }
}

function git7(cwd) {
  return new Promise((resolve) => {
    execFile('git', ['rev-parse', '--short=7', 'HEAD'], { cwd, timeout: 5000 }, (err, stdout) => resolve(err ? null : String(stdout).trim() || null));
  });
}

async function loadPg() {
  try {
    const mod = await import('pg');
    return mod.default ?? mod;
  } catch (err) {
    if (err && (err.code === 'ERR_MODULE_NOT_FOUND' || err.code === 'MODULE_NOT_FOUND')) {
      throw new ImportError("pg 모듈을 찾을 수 없습니다. 저장소 루트에서 'npm ci' 를 실행한 뒤, 저장소 루트에서 이 스크립트를 실행하세요.", EXIT.ARGS);
    }
    throw err;
  }
}

async function readTarget(client) {
  const tables = new Map();
  for (const r of (await client.query(SQL_TARGET_COLUMNS)).rows) {
    if (!tables.has(r.table_name)) tables.set(r.table_name, { columns: new Map() });
    tables.get(r.table_name).columns.set(r.column_name, {
      udtName: r.udt_name,
      formatType: r.format_type,
      isNullable: r.is_nullable,
      hasDefault: r.has_default,
      isGenerated: r.is_generated,
      isIdentity: r.is_identity,
    });
  }
  const fks = (await client.query(SQL_TARGET_FKS)).rows.map((r) => ({ table: r.table_name, refTable: r.ref_table }));
  const triggerTables = new Set((await client.query(SQL_TABLES_WITH_USER_TRIGGERS)).rows.map((r) => r.table_name));
  return { tables, fks, triggerTables };
}

async function loadTable(client, dir, entry, args, triggerTables) {
  const cols = entry.loadColumns;
  const perStmt = effectiveBatchRows(args.batchRows, cols.length);
  let batch = [];
  let batchBytes = 0;
  let loaded = 0;
  const flush = async () => {
    if (batch.length === 0) return;
    const stmt = buildInsertStatement({ table: entry.name, columns: cols, conflictTarget: entry.conflictTarget, mode: args.mode, rowCount: batch.length });
    const params = [];
    for (const row of batch) for (const v of row) params.push(v);
    await client.query(stmt.text, params);
    loaded += batch.length;
    batch = [];
    batchBytes = 0;
  };
  await client.query('BEGIN');
  try {
    if (args.mode === 'truncate') await client.query(buildTruncateStatement(entry.name));
    // upsert: BEFORE UPDATE 트리거(updated_at = now())가 ON CONFLICT DO UPDATE 로 값을 덮어쓰지 않게 이 트랜잭션 안에서 끈다.
    // 권한이 없으면(소유자 아님) 경고만 하고 계속한다.
    let triggersOff = false;
    const trg = shouldToggleUserTriggers(args.mode, entry.name, triggerTables) ? buildTriggerToggleStatements(entry.name) : null;
    if (trg) {
      await client.query(trg.savepoint);
      try {
        await client.query(trg.disable);
        await client.query(trg.release);
        triggersOff = true;
      } catch {
        await client.query(trg.rollbackToSavepoint);
        warn(triggerWarning(entry.name));
      }
    }
    for await (const line of readJsonlLines(fs.createReadStream(path.join(dir, entry.path)))) {
      batch.push(decodeRow(cols, JSON.parse(line)));
      batchBytes += line.length;
      if (batch.length >= perStmt || batchBytes >= MAX_BATCH_BYTES) await flush();
    }
    await flush();
    if (triggersOff) await client.query(trg.enable);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  }
  return loaded;
}

async function main(argv) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(usage());
    return EXIT.OK;
  }
  for (const w of args.warnings) warn(w);

  const dir = path.resolve(args.dir);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) throw new ImportError(`덤프 디렉터리가 없습니다: ${args.dir}`, EXIT.ARGS);
  const manifest = readJsonFile(path.join(dir, 'manifest.json'), 'manifest.json');
  const schema = readJsonFile(path.join(dir, 'schema.json'), 'schema.json');
  const manifestWarnings = validateManifest(manifest, schema);
  for (const w of manifestWarnings) warn(w);

  // 쓰기 전에 모든 파일의 sha256·크기를 대조한다
  log(`checksum 검증 중: ${manifest.tables.length}개 테이블 (${manifest.generatedAt})`);
  const problems = await verifyDumpDirectory(dir, manifest);
  if (problems.length > 0) {
    for (const p of problems) console.error(`[argos-i-import] CHECKSUM: ${p}`);
    throw new ImportError(`체크섬 검증 실패 (${problems.length}건): 쓰기 없이 종료합니다. 덤프를 다시 받으세요`, EXIT.CHECKSUM);
  }
  log('checksum OK');
  if (args.verifyOnly) return EXIT.OK;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new ImportError('환경변수 DATABASE_URL 이 필요합니다 (ARGOS_I DB). 인자로는 받지 않습니다', EXIT.ARGS);
  const pg = await loadPg();
  const targetLabel = describeDatabaseUrl(databaseUrl);

  const client = new pg.Client({ connectionString: databaseUrl });
  client.on('error', (e) => warn(`DB 연결 오류: ${String(e.message).slice(0, 200)}`));
  try {
    await client.connect();
    await client.query("SET TimeZone = 'UTC'");
  } catch (err) {
    throw new ImportError(`DB 접속 실패 (${targetLabel}): ${redact(String(err && err.message ? err.message : err), databaseUrl)}`, EXIT.DB);
  }

  let replicaSet = false;
  try {
    log(`대상 ${targetLabel}, mode=${args.mode}${args.dryRun ? ', dry-run' : ''}`);
    const target = await readTarget(client);

    // 키 없는 테이블(upsert)은 대상이 비어 있어야 일반 INSERT 한다
    const targetCounts = new Map();
    if (args.mode === 'upsert') {
      for (const t of schema.tables) {
        if (t.conflictTarget && t.conflictTarget.kind) continue;
        if (!target.tables.has(t.name)) continue;
        const r = await client.query(`SELECT EXISTS (SELECT 1 FROM ${quoteIdent('public')}.${quoteIdent(t.name)}) AS has_rows`);
        targetCounts.set(t.name, r.rows[0].has_rows ? 1 : 0);
      }
    }

    const { tables: plan, warnings } = planTables({ manifest, schema, target, args, targetCounts });
    const loadList = plan.filter((p) => p.status === 'load');

    const commit = await git7(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
    const dumpCommit = manifest.generator && manifest.generator.commit;
    if (commit && dumpCommit && commit !== dumpCommit) warnings.push(`소스 버전이 다릅니다 (덤프 ${dumpCommit}, 이 체크아웃 ${commit}): 스키마가 어긋나면 해당 테이블은 건너뜁니다`);

    // FK 순환은 --defer-fk 없이 적재할 수 없다 (쓰기 전에 판단)
    if (Array.isArray(schema.cycles) && schema.cycles.length > 0 && !args.deferFk) {
      const loadSet = new Set(loadList.map((p) => p.name));
      const hit = schema.cycles.filter((g) => g.some((n) => loadSet.has(n)));
      if (hit.length > 0) throw new ImportError(`FK 순환 그룹이 있어 --defer-fk 가 필요합니다 (슈퍼유저): ${hit.map((g) => g.join('+')).join(', ')}`, EXIT.ARGS);
    }

    // truncate: CASCADE 가 적재 대상 밖의 테이블을 비우면 중단한다
    if (args.mode === 'truncate') {
      const collateral = computeCascadeCollateral(target.fks, loadList.map((p) => p.name));
      if (collateral.length > 0) {
        throw new ImportError(
          `TRUNCATE ... CASCADE 가 적재 대상이 아닌 테이블까지 비웁니다: ${collateral.join(', ')}\n` +
            '이 테이블들을 함께 적재하도록 --tables 를 조정하거나(또는 --tables 없이 전체 적재), 대상 DB 의 FK 를 확인하세요. 쓰기 없이 종료합니다.',
          EXIT.ARGS,
        );
      }
    }

    const results = plan.map((p) => ({
      name: p.name,
      status: p.status === 'load' ? (args.dryRun ? 'plan' : 'pending') : p.status === 'skip_incompatible' ? 'skipped' : 'excluded',
      reason: p.reason,
      rowsExpected: p.rows,
    }));
    const skipped = results.some((r) => r.status === 'skipped');
    const t0 = Date.now();

    if (args.dryRun) {
      console.log(formatSummary({ target: targetLabel, mode: args.mode, dryRun: true, results, warnings }));
      return decideExitCode({ failed: false, countMismatch: false, skipped });
    }

    if (args.mode === 'truncate') {
      console.log('');
      console.log('!!! TRUNCATE 모드: 아래 테이블의 기존 데이터를 모두 삭제하고 덤프로 교체합니다 !!!');
      console.log(`    대상 DB: ${targetLabel}`);
      console.log(`    테이블 ${loadList.length}개 (--yes 로 확인됨)`);
      console.log('');
    }

    if (args.deferFk) {
      try {
        await client.query('SET session_replication_role = replica');
        replicaSet = true;
      } catch (err) {
        throw new ImportError(`--defer-fk 는 session_replication_role 을 바꿀 수 있는 권한(슈퍼유저)이 필요합니다: ${String(err.message).slice(0, 200)}`, EXIT.DB);
      }
    }

    // 테이블 단위 트랜잭션으로 loadOrder 순서 적재
    let failed = false;
    const loadedNames = [];
    for (const p of plan) {
      if (p.status !== 'load') continue;
      const r = results.find((x) => x.name === p.name);
      const s = Date.now();
      try {
        const n = await loadTable(client, dir, p, args, target.triggerTables);
        r.status = 'loaded';
        r.rowsLoaded = n;
        r.ms = Date.now() - s;
        loadedNames.push(p.name);
        log(`table=${p.name} rows=${n} ms=${r.ms}`);
      } catch (err) {
        r.status = 'failed';
        r.reason = explainTableError(err, args.mode);
        r.ms = Date.now() - s;
        failed = true;
        console.error(`[argos-i-import] FAILED table=${p.name}: ${r.reason}`);
        if (err && err.code === '57P01') throw new ImportError('DB 연결이 끊겼습니다', EXIT.DB);
        if (!args.continueOnError) break;
      }
    }

    // 시퀀스 재설정 (serial 컬럼): 시퀀스 이름은 대상 DB 의 pg_get_serial_sequence 로 찾는다
    for (const name of loadedNames) {
      const p = plan.find((x) => x.name === name);
      for (const seq of p.sequences) {
        const stmt = buildSetvalStatement({ table: name, column: seq.column });
        try {
          await client.query(stmt.text, stmt.values);
        } catch (err) {
          warn(`setval 실패 (${name}.${seq.column}): ${String(err.message).slice(0, 200)}`);
        }
      }
    }

    if (args.analyze) {
      for (const name of loadedNames) {
        try {
          await client.query(`ANALYZE ${quoteIdent('public')}.${quoteIdent(name)}`);
        } catch (err) {
          warn(`ANALYZE 실패 (${name}): ${String(err.message).slice(0, 200)}`);
        }
      }
    }

    // 행 수 검증: truncate 는 정확히 같아야 하고, upsert 는 manifest 이상이면 정상
    let countMismatch = false;
    for (const name of loadedNames) {
      const r = results.find((x) => x.name === name);
      const c = Number((await client.query(`SELECT count(*)::text AS n FROM ${quoteIdent('public')}.${quoteIdent(name)}`)).rows[0].n);
      r.count = c;
      const ok = args.mode === 'truncate' ? c === r.rowsExpected : c >= r.rowsExpected;
      if (!ok) {
        countMismatch = true;
        r.reason = `row_count_mismatch expected=${r.rowsExpected} actual=${c}`;
      }
    }

    console.log(formatSummary({ target: targetLabel, mode: args.mode, dryRun: false, results, warnings, totalMs: Date.now() - t0 }));
    if (failed) {
      const remaining = plan.filter((p) => p.status === 'load' && results.find((x) => x.name === p.name).status !== 'loaded').map((p) => p.name);
      log(`이전 테이블은 커밋된 상태입니다. 재개: --tables ${remaining.join(',')}`);
    }
    return decideExitCode({ failed, countMismatch, skipped });
  } finally {
    if (replicaSet) await client.query('RESET session_replication_role').catch(() => undefined);
    await client.end().catch(() => undefined);
  }
}

/** 오류 메시지에서 접속 문자열(비밀번호 포함 가능)을 가린다 */
function redact(text, url) {
  let out = text.split(url).join('<DATABASE_URL>');
  try {
    const u = new URL(url);
    if (u.password) out = out.split(decodeURIComponent(u.password)).join('***');
  } catch {
    /* ignore */
  }
  return out;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      if (err instanceof ImportError) {
        console.error(`[argos-i-import] ERROR: ${err.message}`);
        process.exit(err.code);
      }
      console.error(`[argos-i-import] ERROR: ${err && err.message ? String(err.message).slice(0, 500) : String(err)}`);
      process.exit(EXIT.ARGS);
    },
  );
}
