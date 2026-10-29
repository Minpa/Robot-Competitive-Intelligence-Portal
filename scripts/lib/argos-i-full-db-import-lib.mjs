/**
 * ARGOS_I 전체 DB 덤프 적재 — 순수 로직 (pg 비의존, 테스트 대상).
 *
 * scripts/argos-i-import-full-db.mjs 가 이 모듈을 쓴다. 여기에는 인자 파싱, 체크섬 검증, 계획 수립, 행 역변환,
 * SQL 생성(INSERT·TRUNCATE·setval), 요약 포맷이 있다.
 *
 * ⚠ 값 역변환(decodeValue)은 백엔드 argos-i-full-db-rows.ts 의 serializeValue 의 정확한 역함수여야 한다.
 *   인코딩을 바꾸면 양쪽과 테스트(argos-i-full-db-import-lib.unit.test.ts 의 라운드트립)를 함께 바꾼다.
 * ⚠ SQL 에 들어가는 식별자·타입 이름은 항상 "대상 DB 에서 조회한 값"만 쓴다. 덤프 파일(schema.json)의 formatType·이름은
 *   SQL 에 직접 넣지 않는다 (덤프는 신뢰하지 않는다).
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const EXIT = { OK: 0, ARGS: 1, DB: 2, CHECKSUM: 3, SKIPPED: 4, TABLE_FAILED: 5, COUNT_MISMATCH: 6 };

/** 이 스크립트가 해석할 수 있는 덤프 형식 */
export const SUPPORTED_DUMP_FORMAT_VERSIONS = [1];
/** PG 파라미터 상한 65535 에서 여유를 둔 값 */
export const MAX_PARAMS_PER_STATEMENT = 60000;
export const DEFAULT_BATCH_ROWS = 500;
/** INSERT 한 문장에 담는 JSONL 텍스트 상한 */
export const MAX_BATCH_BYTES = 8 * 1024 * 1024;

const TABLE_NAME_RE = /^[a-z_][a-z0-9_]{0,62}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;

export class ImportError extends Error {
  /** @param {string} message @param {number} code 종료 코드 */
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 인자
// ─────────────────────────────────────────────────────────────────────────────

export function usage() {
  return [
    'ARGOS_I 전체 DB 덤프 적재 (1회성 초기 적재용)',
    '',
    '사용법 (저장소 루트에서, `npm ci` 를 마친 뒤. Node 18+, 의존성은 pg 뿐):',
    '  DATABASE_URL=postgres://... node scripts/argos-i-import-full-db.mjs <덤프 디렉터리> [옵션]',
    '',
    '<덤프 디렉터리> 는 압축을 푼 argos-i-full-db/<YYYYMMDDTHHMMSSZ>/ 폴더 (README.md, schema.json, tables/, manifest.json).',
    'DB 접속 정보는 환경변수 DATABASE_URL 로만 받는다 (ARGOS_I DB). 비밀번호는 인자로 받지도 출력하지도 않는다.',
    '',
    '⚠ 첫 적재라면 `--mode truncate --yes` 를 사용하세요. ARGOS_I 백엔드는 기동 시 시드(ci_*, hand_*, coverage 등)가 새 uuid 로 행을',
    '  넣으므로, 기본 모드(upsert)로 적재하면 같은 유니크 키(slug 등)와 충돌해 해당 테이블이 실패(종료 코드 5)한다.',
    '',
    'upsert 는 사용자 트리거를 적재 중 비활성화한다(테이블 트랜잭션 안에서 DISABLE TRIGGER USER → 적재 → ENABLE TRIGGER USER).',
    '  소유자 권한이 없으면 비활성화하지 못하고 경고만 출력하며, updated_at 류 컬럼이 now() 로 덮어써질 수 있다',
    '  (영향: coverage_field_events, humanoid_models). truncate 모드는 UPDATE 가 없으므로 트리거를 건드리지 않는다.',
    '',
    '옵션',
    '  --mode upsert|truncate  upsert(기본): PK(없으면 conflictTarget) 기준 INSERT ... ON CONFLICT DO UPDATE',
    '                          truncate: 테이블 단위 트랜잭션에서 TRUNCATE ... CASCADE 후 INSERT',
    '  --yes                   truncate 에 필수 (없으면 경고 후 종료 코드 1)',
    '  --tables a,b            지정 테이블만 (loadOrder 유지)',
    '  --skip a,b              건너뛸 테이블을 추가한다. data_migrations 는 항상 건너뛴다 (--tables 에 명시했을 때만 경고와 함께 적재)',
    '  --dry-run               쓰기 없이 계획만 출력 (DB 에는 읽기 쿼리로만 접속)',
    '  --batch-rows N          INSERT 당 행 수 (기본 500, 파라미터 60000개·8MiB 상한으로 자동 하향)',
    '  --defer-fk              세션 session_replication_role=replica (슈퍼유저 필요, 종료 시 원복). FK 순환이 있을 때 필요',
    '  --verify-only           체크섬 검증만 하고 종료 (DB 접속 없음)',
    '  --no-analyze            적재 후 ANALYZE 생략',
    '  --continue-on-error     한 테이블이 실패해도 다음 테이블 진행 (기본은 즉시 중단)',
    '  --help                  이 도움말',
    '',
    '종료 코드',
    '  0  성공. 선택한 테이블을 모두 적재했고 행 수가 일치',
    '  1  인자 오류, --yes 누락, 지원하지 않는 덤프 버전, pg 미설치, FK 순환(--defer-fk 필요)',
    '  2  DB 접속·권한 오류 (--defer-fk 권한 부족 포함)',
    '  3  체크섬/크기 불일치 또는 manifest 손상 (쓰기 전에 종료)',
    '  4  완료했으나 건너뛴 테이블 있음 (table_missing, columns_missing, type_mismatch, ...)',
    '  5  테이블 적재 실패 (해당 테이블은 롤백됨. 이전 테이블은 커밋된 상태이므로 --tables 로 재개)',
    '  6  적재 후 행 수 불일치 (truncate 모드)',
  ].join('\n');
}

function splitNames(value, flag) {
  const names = String(value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (names.length === 0) throw new ImportError(`${flag} 에 테이블 이름이 필요합니다`, EXIT.ARGS);
  for (const n of names) if (!TABLE_NAME_RE.test(n)) throw new ImportError(`${flag}: 잘못된 테이블 이름 '${n.slice(0, 64)}'`, EXIT.ARGS);
  return [...new Set(names)];
}

/**
 * @param {string[]} argv
 * @returns {{dir:string|null, mode:'upsert'|'truncate', yes:boolean, tables:string[]|null, skip:string[], dryRun:boolean, batchRows:number,
 *   deferFk:boolean, verifyOnly:boolean, analyze:boolean, continueOnError:boolean, help:boolean, warnings:string[]}}
 */
export function parseArgs(argv) {
  const out = {
    dir: null,
    mode: 'upsert',
    yes: false,
    tables: null,
    skip: [],
    dryRun: false,
    batchRows: DEFAULT_BATCH_ROWS,
    deferFk: false,
    verifyOnly: false,
    analyze: true,
    continueOnError: false,
    help: false,
    warnings: [],
  };
  const takeValue = (flag, i, inline) => {
    if (inline !== undefined) return [inline, i];
    if (i + 1 >= argv.length) throw new ImportError(`${flag} 에 값이 필요합니다`, EXIT.ARGS);
    return [argv[i + 1], i + 1];
  };
  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i];
    const eq = raw.startsWith('--') ? raw.indexOf('=') : -1;
    const flag = eq > 0 ? raw.slice(0, eq) : raw;
    const inline = eq > 0 ? raw.slice(eq + 1) : undefined;
    switch (flag) {
      case '--help':
      case '-h':
        out.help = true;
        break;
      case '--yes':
        out.yes = true;
        break;
      case '--dry-run':
        out.dryRun = true;
        break;
      case '--defer-fk':
        out.deferFk = true;
        break;
      case '--verify-only':
        out.verifyOnly = true;
        break;
      case '--no-analyze':
        out.analyze = false;
        break;
      case '--continue-on-error':
        out.continueOnError = true;
        break;
      case '--mode': {
        const [v, ni] = takeValue(flag, i, inline);
        i = ni;
        if (v !== 'upsert' && v !== 'truncate') throw new ImportError(`--mode 는 upsert 또는 truncate 여야 합니다 (받은 값: ${String(v).slice(0, 20)})`, EXIT.ARGS);
        out.mode = v;
        break;
      }
      case '--tables': {
        const [v, ni] = takeValue(flag, i, inline);
        i = ni;
        out.tables = splitNames(v, '--tables');
        break;
      }
      case '--skip': {
        const [v, ni] = takeValue(flag, i, inline);
        i = ni;
        out.skip = [...new Set([...out.skip, ...splitNames(v, '--skip')])];
        break;
      }
      case '--batch-rows': {
        const [v, ni] = takeValue(flag, i, inline);
        i = ni;
        if (!/^\d+$/.test(String(v)) || Number(v) < 1 || Number(v) > 100000) throw new ImportError('--batch-rows 는 1~100000 의 정수여야 합니다', EXIT.ARGS);
        out.batchRows = Number(v);
        break;
      }
      default:
        if (raw.startsWith('-')) throw new ImportError(`알 수 없는 옵션: ${raw.slice(0, 40)} (--help 참고)`, EXIT.ARGS);
        if (out.dir !== null) throw new ImportError('덤프 디렉터리는 하나만 지정할 수 있습니다', EXIT.ARGS);
        out.dir = raw;
    }
  }
  if (out.help) return out;
  if (out.dir === null) throw new ImportError('덤프 디렉터리가 필요합니다 (--help 참고)', EXIT.ARGS);
  if (out.mode === 'truncate' && !out.yes && !out.dryRun && !out.verifyOnly) {
    throw new ImportError(
      [
        '--mode truncate 는 대상 테이블의 기존 데이터를 모두 지웁니다 (TRUNCATE ... CASCADE).',
        '확인했다면 --yes 를 함께 지정하세요. 계획만 보려면 --dry-run 을 쓰세요.',
      ].join('\n'),
      EXIT.ARGS,
    );
  }
  // data_migrations 는 기본 skip (마커 키 충돌). --tables 에 명시했을 때만 경고와 함께 적재한다
  const explicitDm = out.tables !== null && out.tables.includes('data_migrations');
  if (explicitDm) out.warnings.push('data_migrations 를 명시적으로 적재합니다: 마커 키 충돌로 ARGOS_I 의 기동 동작이 어긋날 수 있습니다 (권장하지 않음)');
  else if (!out.skip.includes('data_migrations')) out.skip = [...out.skip, 'data_migrations'];
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 접속 정보 표시 (비밀번호 비노출)
// ─────────────────────────────────────────────────────────────────────────────

/** `host:port/dbname` 만 돌려준다. 사용자·비밀번호·쿼리는 제외한다. 해석 실패 시 일반 문구 */
export function describeDatabaseUrl(url) {
  try {
    const u = new URL(url);
    const db = decodeURIComponent(u.pathname.replace(/^\//, '')) || '(default)';
    return `${u.hostname || 'localhost'}${u.port ? `:${u.port}` : ''}/${db}`;
  } catch {
    return '(unparseable DATABASE_URL)';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// manifest / schema 검증
// ─────────────────────────────────────────────────────────────────────────────

const isInt = (v) => Number.isInteger(v) && v >= 0;

/**
 * manifest.json 과 schema.json 의 구조를 검증한다. 지원하지 않는 형식 버전은 종료 코드 1, 구조 손상은 3.
 * 반환: 경고 문자열 배열
 */
export function validateManifest(manifest, schema) {
  const bad = (msg) => new ImportError(`manifest/schema 손상: ${msg}`, EXIT.CHECKSUM);
  if (!manifest || typeof manifest !== 'object') throw bad('manifest.json 이 객체가 아닙니다');
  if (!schema || typeof schema !== 'object') throw bad('schema.json 이 객체가 아닙니다');
  for (const [label, v] of [['manifest.json', manifest.dumpFormatVersion], ['schema.json', schema.dumpFormatVersion]]) {
    if (!SUPPORTED_DUMP_FORMAT_VERSIONS.includes(v)) {
      throw new ImportError(`${label} 의 dumpFormatVersion=${String(v)} 은(는) 이 스크립트가 지원하지 않습니다 (지원: ${SUPPORTED_DUMP_FORMAT_VERSIONS.join(', ')}). 스크립트를 갱신하세요`, EXIT.ARGS);
    }
  }
  if (!Array.isArray(manifest.tables)) throw bad('manifest.tables 가 배열이 아닙니다');
  if (!Array.isArray(schema.tables) || !Array.isArray(schema.loadOrder)) throw bad('schema.tables / loadOrder 가 배열이 아닙니다');
  if (!manifest.files || !SHA256_RE.test(manifest.files['README.md'] ?? '') || !SHA256_RE.test(manifest.files['schema.json'] ?? '')) throw bad('manifest.files 의 sha256 이 없습니다');
  const schemaTables = new Map();
  for (const t of schema.tables) {
    if (!t || !TABLE_NAME_RE.test(t.name ?? '') || !Array.isArray(t.columns)) throw bad('schema.tables 항목이 올바르지 않습니다');
    for (const c of t.columns) if (typeof c.name !== 'string' || typeof c.udtName !== 'string') throw bad(`schema.tables.${t.name} 의 컬럼 정보가 올바르지 않습니다`);
    schemaTables.set(t.name, t);
  }
  const seen = new Set();
  for (const t of manifest.tables) {
    if (!t || !TABLE_NAME_RE.test(t.name ?? '')) throw bad('manifest.tables 의 테이블 이름이 올바르지 않습니다');
    if (t.path !== `tables/${t.name}.jsonl`) throw bad(`manifest.tables.${t.name}.path 가 올바르지 않습니다`);
    if (!isInt(t.rows) || !isInt(t.jsonlBytes) || !SHA256_RE.test(t.sha256 ?? '')) throw bad(`manifest.tables.${t.name} 의 rows/jsonlBytes/sha256 이 올바르지 않습니다`);
    if (seen.has(t.name)) throw bad(`manifest.tables 에 ${t.name} 가 중복되었습니다`);
    seen.add(t.name);
    if (!schemaTables.has(t.name)) throw bad(`schema.json 에 ${t.name} 가 없습니다`);
  }
  const order = new Map(schema.loadOrder.map((n, i) => [n, i]));
  let last = -1;
  for (const t of manifest.tables) {
    const idx = order.get(t.name);
    if (idx === undefined) throw bad(`schema.loadOrder 에 ${t.name} 가 없습니다`);
    if (idx < last) throw bad('manifest.tables 가 loadOrder 순서가 아닙니다');
    last = idx;
  }
  const warnings = [];
  if (manifest.selection === 'subset') warnings.push(`부분 덤프입니다 (${manifest.tables.length}개 테이블): 선택되지 않은 부모 테이블이 대상 DB 에 이미 있어야 FK 가 만족됩니다`);
  return warnings;
}

// ─────────────────────────────────────────────────────────────────────────────
// 체크섬
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 스트림(비동기 iterable of Buffer)을 읽어 sha256 과 바이트 수를 대조한다.
 * @returns {Promise<{ok:boolean, sha256:string, bytes:number}>}
 */
export async function verifyFileChecksum(stream, expected) {
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const chunk of stream) {
    const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
    hash.update(buf);
    bytes += buf.length;
  }
  const sha256 = hash.digest('hex');
  const bytesOk = expected.bytes === undefined || expected.bytes === null || expected.bytes === bytes;
  return { ok: sha256 === expected.sha256 && bytesOk, sha256, bytes };
}

/**
 * 덤프 디렉터리의 README.md, schema.json, tables/*.jsonl 을 manifest 와 대조한다.
 * @returns {Promise<string[]>} 문제 목록 (비어 있으면 통과)
 */
export async function verifyDumpDirectory(dir, manifest, onFile) {
  const problems = [];
  const check = async (rel, expected) => {
    const full = path.join(dir, rel);
    if (!fs.existsSync(full)) {
      problems.push(`${rel}: 파일이 없습니다`);
      return;
    }
    const r = await verifyFileChecksum(fs.createReadStream(full), expected);
    if (!r.ok) problems.push(`${rel}: sha256 또는 크기 불일치 (bytes=${r.bytes}${expected.bytes != null ? `, expected ${expected.bytes}` : ''})`);
    onFile?.(rel, r.ok);
  };
  await check('README.md', { sha256: manifest.files['README.md'] });
  await check('schema.json', { sha256: manifest.files['schema.json'] });
  for (const t of manifest.tables) await check(t.path, { sha256: t.sha256, bytes: t.jsonlBytes });
  return problems;
}

/** Buffer 청크 스트림 → JSONL 줄 (UTF-8 디코딩은 줄 단위로 하므로 멀티바이트가 청크 경계에 걸려도 안전하다) */
export async function* readJsonlLines(stream) {
  let pending = [];
  for await (const raw of stream) {
    const chunk = typeof raw === 'string' ? Buffer.from(raw) : raw;
    let start = 0;
    for (;;) {
      const idx = chunk.indexOf(0x0a, start);
      if (idx === -1) break;
      pending.push(chunk.subarray(start, idx));
      const buf = pending.length === 1 ? pending[0] : Buffer.concat(pending);
      pending = [];
      if (buf.length > 0) yield buf.toString('utf8');
      start = idx + 1;
    }
    if (start < chunk.length) pending.push(chunk.subarray(start));
  }
  if (pending.length > 0) {
    const buf = Buffer.concat(pending);
    if (buf.length > 0) yield buf.toString('utf8');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 값 역변환 (백엔드 argos-i-full-db-rows.ts 의 serializeValue 의 역함수)
// ─────────────────────────────────────────────────────────────────────────────

const JSON_SAFE_ARRAY_ELEMENTS = new Set(['text', 'varchar', 'bpchar', 'uuid', 'name', 'int2', 'int4', 'bool']);

/** 백엔드 dumpEncodingForUdt 와 같은 매핑이다 (테스트가 두 구현의 일치를 검증한다) */
export function dumpEncodingForUdt(udtName) {
  switch (udtName) {
    case 'bool':
      return 'boolean';
    case 'int2':
    case 'int4':
      return 'integer';
    case 'int8':
      return 'int8_string';
    case 'numeric':
      return 'numeric_string';
    case 'float4':
    case 'float8':
      return 'float';
    case 'text':
    case 'varchar':
    case 'bpchar':
    case 'uuid':
    case 'name':
      return 'string';
    case 'date':
      return 'date';
    case 'timestamp':
      return 'timestamp_utc';
    case 'timestamptz':
      return 'timestamptz_utc';
    case 'json':
    case 'jsonb':
      return 'json';
    case 'bytea':
      return 'bytea_base64';
    default:
      return udtName.startsWith('_') && JSON_SAFE_ARRAY_ELEMENTS.has(udtName.slice(1)) ? 'array_json' : 'text_cast';
  }
}

function decodeByEncoding(encoding, value) {
  if (value === null || value === undefined) return null;
  switch (encoding) {
    case 'boolean':
      return Boolean(value);
    case 'integer':
      return typeof value === 'number' ? value : Number(value);
    case 'int8_string':
    case 'numeric_string':
      // 문자열 그대로 (정밀도·scale 보존) — SQL 쪽에서 ::bigint / ::numeric(p,s) 로 캐스트한다
      return typeof value === 'string' ? value : String(value);
    case 'float':
      return value; // number 또는 'NaN' / 'Infinity' / '-Infinity' 문자열 (::float8 캐스트가 해석)
    case 'string':
    case 'date':
    case 'timestamp_utc':
    case 'timestamptz_utc':
    case 'text_cast':
      return typeof value === 'string' ? value : String(value);
    case 'json':
      // JSON null 스칼라는 센티널 → 문자열 'null'. 배열은 반드시 JSON.stringify (node-pg 는 JS 배열을 PG 배열로 직렬화한다)
      if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 1 && value.$jsonNull === true) return 'null';
      return JSON.stringify(value);
    case 'bytea_base64':
      if (value && typeof value === 'object' && typeof value.$bytea === 'string') return Buffer.from(value.$bytea, 'base64');
      throw new ImportError('bytea 값 형식이 올바르지 않습니다 ({"$bytea": base64} 필요)', EXIT.CHECKSUM);
    case 'array_json':
      if (!Array.isArray(value)) throw new ImportError('배열 컬럼 값이 JSON 배열이 아닙니다', EXIT.CHECKSUM);
      return value; // JS 배열 그대로 (node-pg 가 PG 배열로 직렬화, SQL 에서 ::text[] 등으로 캐스트)
    default:
      throw new ImportError(`알 수 없는 dumpEncoding: ${String(encoding).slice(0, 40)}`, EXIT.CHECKSUM);
  }
}

/** @param {string} udtName PG udt 이름 @param {unknown} value JSONL 값 → INSERT 파라미터 */
export function decodeValue(udtName, value) {
  return decodeByEncoding(dumpEncodingForUdt(udtName), value);
}

/**
 * JSONL 객체 한 행 → 컬럼 순서의 INSERT 파라미터 배열.
 * @param {{name:string, udtName:string, dumpEncoding?:string}[]} columns 적재할 컬럼
 */
export function decodeRow(columns, obj) {
  return columns.map((c) => decodeByEncoding(dumpEncodingForUdt(c.udtName), Object.prototype.hasOwnProperty.call(obj, c.name) ? obj[c.name] : null));
}

// ─────────────────────────────────────────────────────────────────────────────
// 계획
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 테이블별 적재 여부와 호환성을 판정한다.
 * @param {object} p
 * @param {object} p.manifest
 * @param {object} p.schema
 * @param {{tables: Map<string, {columns: Map<string, {udtName:string, formatType:string, isNullable:boolean, hasDefault:boolean, isGenerated:boolean, isIdentity:boolean}>}>}} p.target 대상 DB 의 구조
 * @param {ReturnType<typeof parseArgs>} p.args
 * @param {Map<string, number>} [p.targetCounts] 키 없는 테이블의 대상 행 수 (upsert 판정용)
 */
export function planTables({ manifest, schema, target, args, targetCounts = new Map() }) {
  const schemaByName = new Map(schema.tables.map((t) => [t.name, t]));
  const manifestNames = new Set(manifest.tables.map((t) => t.name));
  if (args.tables) {
    const unknown = args.tables.filter((n) => !manifestNames.has(n));
    if (unknown.length > 0) throw new ImportError(`덤프에 없는 테이블: ${unknown.join(', ')}`, EXIT.ARGS);
  }
  const explicit = args.tables ? new Set(args.tables) : null;
  const userSkip = new Set(args.skip);
  const plan = [];
  for (const m of manifest.tables) {
    const st = schemaByName.get(m.name);
    const base = {
      name: m.name,
      path: m.path,
      rows: m.rows,
      jsonlBytes: m.jsonlBytes,
      sha256: m.sha256,
      status: 'load',
      reason: null,
      loadColumns: [],
      conflictTarget: null,
      sequences: [],
    };
    if (explicit && !explicit.has(m.name)) {
      plan.push({ ...base, status: 'skip_user', reason: 'not_selected' });
      continue;
    }
    if (m.loadByDefault === false && !(explicit && explicit.has(m.name))) {
      plan.push({ ...base, status: 'skip_user', reason: 'not_loaded_by_default' });
      continue;
    }
    if (userSkip.has(m.name)) {
      plan.push({ ...base, status: 'skip_user', reason: 'skipped_by_option' });
      continue;
    }
    const tgt = target.tables.get(m.name);
    if (!tgt) {
      plan.push({ ...base, status: 'skip_incompatible', reason: 'table_missing' });
      continue;
    }
    const missing = st.columns.filter((c) => !tgt.columns.has(c.name)).map((c) => c.name);
    if (missing.length > 0) {
      plan.push({ ...base, status: 'skip_incompatible', reason: `columns_missing:[${missing.join(',')}]` });
      continue;
    }
    const mismatched = st.columns.filter((c) => tgt.columns.get(c.name).udtName !== c.udtName).map((c) => c.name);
    if (mismatched.length > 0) {
      plan.push({ ...base, status: 'skip_incompatible', reason: `type_mismatch:[${mismatched.join(',')}]` });
      continue;
    }
    const dumpNames = new Set(st.columns.map((c) => c.name));
    const generated = st.columns.filter((c) => tgt.columns.get(c.name).isGenerated).map((c) => c.name);
    if (generated.length > 0) {
      plan.push({ ...base, status: 'skip_incompatible', reason: `target_generated_columns:[${generated.join(',')}]` });
      continue;
    }
    const required = [...tgt.columns.entries()].filter(([n, c]) => !dumpNames.has(n) && !c.isNullable && !c.hasDefault && !c.isIdentity && !c.isGenerated).map(([n]) => n);
    if (required.length > 0) {
      plan.push({ ...base, status: 'skip_incompatible', reason: `target_required_column_missing:[${required.join(',')}]` });
      continue;
    }
    // 적재 컬럼: 대상 DB 에서 조회한 formatType 을 쓴다 (덤프의 값은 신뢰하지 않는다)
    const loadColumns = st.columns.map((c) => ({ name: c.name, udtName: c.udtName, dumpEncoding: dumpEncodingForUdt(c.udtName), formatType: tgt.columns.get(c.name).formatType }));
    let conflictTarget = null;
    const ct = st.conflictTarget;
    if (ct && Array.isArray(ct.columns) && ct.columns.length > 0 && ct.columns.every((n) => dumpNames.has(n))) conflictTarget = { kind: ct.kind, name: ct.name, columns: ct.columns.slice() };
    if (args.mode === 'upsert' && !conflictTarget && (targetCounts.get(m.name) ?? 0) > 0) {
      plan.push({ ...base, status: 'skip_incompatible', reason: 'no_key_target_not_empty' });
      continue;
    }
    plan.push({ ...base, loadColumns, conflictTarget, sequences: (st.sequences ?? []).filter((s) => tgt.columns.has(s.column)).map((s) => ({ column: s.column })) });
  }

  const warnings = [];
  const skippedIncompat = new Set(plan.filter((p) => p.status === 'skip_incompatible').map((p) => p.name));
  const loading = new Set(plan.filter((p) => p.status === 'load').map((p) => p.name));
  for (const st of schema.tables) {
    if (!loading.has(st.name)) continue;
    for (const fk of st.foreignKeys ?? []) {
      if (skippedIncompat.has(fk.refTable)) warnings.push(`${st.name} 는 건너뛴 테이블 ${fk.refTable} 를 FK 로 참조합니다 (${fk.name}): 적재 중 FK 위반이 날 수 있습니다`);
    }
  }
  return { tables: plan, warnings: [...new Set(warnings)] };
}

/**
 * TRUNCATE ... CASCADE 가 번지는 범위를 계산한다.
 * @param {{table:string, refTable:string}[]} fks 대상 DB 의 FK (table 이 refTable 을 참조)
 * @param {string[]} truncated 비울 테이블
 * @returns {string[]} 적재 대상 밖에서 CASCADE 로 비워질 테이블 (정렬됨)
 */
export function computeCascadeCollateral(fks, truncated) {
  const children = new Map();
  for (const fk of fks) {
    if (!children.has(fk.refTable)) children.set(fk.refTable, new Set());
    children.get(fk.refTable).add(fk.table);
  }
  const target = new Set(truncated);
  const reached = new Set();
  const queue = [...target];
  while (queue.length > 0) {
    const t = queue.pop();
    for (const c of children.get(t) ?? []) {
      if (!reached.has(c)) {
        reached.add(c);
        queue.push(c);
      }
    }
  }
  return [...reached].filter((t) => !target.has(t)).sort();
}

// ─────────────────────────────────────────────────────────────────────────────
// SQL 생성
// ─────────────────────────────────────────────────────────────────────────────

export function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

/** 대상 DB 에서 조회한 format_type 만 받는다. 방어적으로 세미콜론·주석·따옴표가 든 값은 거부한다 */
function safeFormatType(formatType) {
  if (typeof formatType !== 'string' || formatType.length === 0 || /[;\\']|--|\/\*/.test(formatType)) throw new ImportError('안전하지 않은 컬럼 타입 이름입니다', EXIT.ARGS);
  return formatType;
}

/** INSERT 한 문장에 담을 최대 행 수: min(요청 행 수, floor(60000 / 컬럼 수)), 최소 1 */
export function effectiveBatchRows(batchRows, columnCount) {
  return Math.max(1, Math.min(batchRows, Math.floor(MAX_PARAMS_PER_STATEMENT / Math.max(1, columnCount))));
}

/**
 * 다중 행 INSERT. 파라미터마다 대상 컬럼의 format_type 으로 명시 캐스트한다 ($n::timestamp, $n::jsonb, $n::numeric(15,2) ...).
 * upsert + conflictTarget: ON CONFLICT (키) DO UPDATE SET 비키컬럼 = EXCLUDED.컬럼 (비키 컬럼이 없으면 DO NOTHING).
 * @param {{table:string, columns:{name:string, formatType:string}[], conflictTarget:{columns:string[]}|null, mode:'upsert'|'truncate', rowCount:number}} p
 */
export function buildInsertStatement({ table, columns, conflictTarget, mode, rowCount }) {
  if (rowCount < 1) throw new ImportError('rowCount 는 1 이상이어야 합니다', EXIT.ARGS);
  if (rowCount * columns.length > 65535) throw new ImportError('파라미터가 65535개를 넘습니다 (effectiveBatchRows 로 행 수를 낮추세요)', EXIT.ARGS);
  const casts = columns.map((c) => `::${safeFormatType(c.formatType)}`);
  const tuples = [];
  let n = 1;
  for (let r = 0; r < rowCount; r++) {
    const ph = [];
    for (let c = 0; c < columns.length; c++) ph.push(`$${n++}${casts[c]}`);
    tuples.push(`(${ph.join(', ')})`);
  }
  let text = `INSERT INTO ${quoteIdent('public')}.${quoteIdent(table)} (${columns.map((c) => quoteIdent(c.name)).join(', ')}) VALUES ${tuples.join(', ')}`;
  if (mode === 'upsert' && conflictTarget && conflictTarget.columns.length > 0) {
    const keys = new Set(conflictTarget.columns);
    const nonKey = columns.filter((c) => !keys.has(c.name));
    text += ` ON CONFLICT (${conflictTarget.columns.map(quoteIdent).join(', ')}) `;
    text += nonKey.length > 0 ? `DO UPDATE SET ${nonKey.map((c) => `${quoteIdent(c.name)} = EXCLUDED.${quoteIdent(c.name)}`).join(', ')}` : 'DO NOTHING';
  }
  return { text, paramsPerRow: columns.length, paramCount: rowCount * columns.length };
}

export function buildTruncateStatement(table) {
  return `TRUNCATE TABLE ${quoteIdent('public')}.${quoteIdent(table)} CASCADE`;
}

/**
 * 시퀀스를 최대값으로 맞춘다. 시퀀스 이름은 덤프가 아니라 대상 DB 의 pg_get_serial_sequence 로 찾는다.
 * 행이 없으면 setval(…, 1, false) 로 1 을 가리키게 한다.
 */
export function buildSetvalStatement({ table, column }) {
  const qt = `${quoteIdent('public')}.${quoteIdent(table)}`;
  return {
    text: `SELECT setval(pg_get_serial_sequence($1, $2), COALESCE(MAX(${quoteIdent(column)}), 1), MAX(${quoteIdent(column)}) IS NOT NULL) AS value FROM ${qt}`,
    values: [qt, column],
  };
}

/**
 * 항목 배열을 행 수·크기 상한으로 나눈다.
 * @template T @param {T[]} items @param {{maxRows:number, maxBytes?:number, sizeOf?:(t:T)=>number}} o
 */
export function chunkRows(items, { maxRows, maxBytes = MAX_BATCH_BYTES, sizeOf = (t) => String(t).length }) {
  const out = [];
  let cur = [];
  let bytes = 0;
  for (const it of items) {
    const sz = sizeOf(it);
    if (cur.length > 0 && (cur.length >= maxRows || bytes + sz > maxBytes)) {
      out.push(cur);
      cur = [];
      bytes = 0;
    }
    cur.push(it);
    bytes += sz;
  }
  if (cur.length > 0) out.push(cur);
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 사용자 트리거 (upsert 의 ON CONFLICT DO UPDATE 가 BEFORE UPDATE 트리거를 발동시킨다)
// ─────────────────────────────────────────────────────────────────────────────

/** 대상 DB 에서 public 스키마의 사용자 트리거(내부 트리거 제외)를 가진 테이블 이름 */
export const SQL_TABLES_WITH_USER_TRIGGERS = `
SELECT DISTINCT c.relname AS table_name
FROM pg_catalog.pg_trigger t
JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE NOT t.tgisinternal AND t.tgenabled <> 'D' AND n.nspname = 'public'`;

/** 사용자 트리거를 끌지 판단한다: upsert 모드이고 그 테이블에 사용자 트리거가 있을 때만 */
export function shouldToggleUserTriggers(mode, table, triggerTables) {
  return mode === 'upsert' && triggerTables instanceof Set && triggerTables.has(table);
}

/**
 * 트리거 토글 SQL. 같은 트랜잭션 안에서 SAVEPOINT 로 감싸 권한 부족(소유자 아님)이어도 트랜잭션이 중단되지 않게 한다.
 * 순서: BEGIN → SAVEPOINT → DISABLE → (실패 시 ROLLBACK TO SAVEPOINT, 경고) → INSERT ... ON CONFLICT → ENABLE → COMMIT
 */
export function buildTriggerToggleStatements(table) {
  const qt = `${quoteIdent('public')}.${quoteIdent(table)}`;
  return {
    savepoint: 'SAVEPOINT argos_i_disable_triggers',
    disable: `ALTER TABLE ${qt} DISABLE TRIGGER USER`,
    rollbackToSavepoint: 'ROLLBACK TO SAVEPOINT argos_i_disable_triggers',
    release: 'RELEASE SAVEPOINT argos_i_disable_triggers',
    enable: `ALTER TABLE ${qt} ENABLE TRIGGER USER`,
  };
}

export function triggerWarning(table) {
  return `${table}: 사용자 트리거를 비활성화할 권한이 없어 updated_at 트리거가 값을 덮어쓸 수 있음 (테이블 소유자로 실행하세요)`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 오류 설명 · 요약
// ─────────────────────────────────────────────────────────────────────────────

/** 테이블 적재 오류를 한 줄로 설명한다. 행 데이터가 담긴 detail 은 출력하지 않는다 */
export function explainTableError(err, mode) {
  const code = err && err.code ? String(err.code) : null;
  const message = String(err && err.message ? err.message : err).replace(/\s+/g, ' ').slice(0, 300);
  const parts = [code ? `[${code}] ${message}` : message];
  if (err && err.constraint) parts.push(`(constraint: ${String(err.constraint).slice(0, 80)})`);
  if (code === '23505') {
    parts.push(mode === 'upsert' ? '유니크 위반: 첫 적재라면 --mode truncate --yes 를 사용하세요 (기동 시 시드가 만든 행과 키가 충돌합니다).' : '유니크 위반: 덤프에 중복 키가 있거나 대상 테이블이 비워지지 않았습니다.');
  } else if (code === '23503') {
    parts.push('FK 위반: 부모 테이블이 아직 적재되지 않았거나 건너뛰었습니다. loadOrder 순서로 전체를 적재하세요.');
  }
  return parts.join(' ');
}

const pad = (s, n) => String(s).padEnd(n);
const num = (n) => Number(n).toLocaleString('en-US');

/**
 * 요약 표. 비밀번호·행 데이터는 포함하지 않는다.
 * @param {{ target:string, mode:string, dryRun:boolean, results:{name:string,status:string,reason?:string|null,rowsExpected:number,rowsLoaded?:number,count?:number|null,ms?:number}[], warnings?:string[], totalMs?:number }} p
 */
export function formatSummary({ target, mode, dryRun, results, warnings = [], totalMs }) {
  const lines = [];
  lines.push(`ARGOS_I 전체 DB 적재 ${dryRun ? '계획 (dry-run, 쓰기 없음)' : '결과'}: 대상 ${target}, mode=${mode}`);
  // --tables 로 고르지 않은 테이블은 표에서 생략한다 (건수만 알린다)
  const shown = results.filter((r) => r.reason !== 'not_selected');
  const hiddenCount = results.length - shown.length;
  const w = Math.max(5, ...shown.map((r) => r.name.length));
  lines.push(`${pad('table', w)}  ${pad('status', 8)}  ${'expected'.padStart(10)}  ${'loaded'.padStart(10)}  ${'count'.padStart(10)}  ${'ms'.padStart(7)}  note`);
  for (const r of shown) {
    lines.push(
      `${pad(r.name, w)}  ${pad(r.status, 8)}  ${num(r.rowsExpected).padStart(10)}  ${(r.rowsLoaded === undefined ? '-' : num(r.rowsLoaded)).padStart(10)}  ${(r.count == null ? '-' : num(r.count)).padStart(10)}  ${(r.ms === undefined ? '-' : String(r.ms)).padStart(7)}  ${r.reason ?? ''}`,
    );
  }
  if (hiddenCount > 0) lines.push(`(--tables 로 선택하지 않은 ${hiddenCount}개 테이블은 생략)`);
  const by = (s) => results.filter((r) => r.status === s).length;
  lines.push(`적재 ${by('loaded') + by('plan')} / 건너뜀 ${by('skipped')} / 실패 ${by('failed')} / 제외(옵션) ${by('excluded')}${totalMs !== undefined ? ` / 소요 ${(totalMs / 1000).toFixed(1)}s` : ''}`);
  for (const w2 of warnings) lines.push(`경고: ${w2}`);
  return lines.join('\n');
}

/** 최종 종료 코드 결정: 5 > 6 > 4 > 0 */
export function decideExitCode({ failed, countMismatch, skipped }) {
  if (failed) return EXIT.TABLE_FAILED;
  if (countMismatch) return EXIT.COUNT_MISMATCH;
  if (skipped) return EXIT.SKIPPED;
  return EXIT.OK;
}
