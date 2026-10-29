#!/usr/bin/env node
/**
 * ARGOS_I 전체 DB 덤프 pull (1회성 초기 적재용) — Node 18+, 외부 의존성 없음. 압축 해제는 시스템 `unzip` 을 쓴다.
 *
 * ARGOS 의 `GET /api/argos-i/export/full-db.zip` 을 받아 `unzip -t` 로 완전성을 확인하고, 풀어서 manifest.json 기준으로
 * 테이블별 바이트·sha256 을 검증한 뒤 적재 스크립트에 넘길 디렉터리 경로를 출력한다. 일일 번들(argos-i-pull.mjs)과는 별개다.
 * 덤프에는 수집 원문이 포함되어 있다 — 사내 이전 한정, 외부 재배포 금지, 적재 후 삭제.
 *
 * 사용법
 *   export ARGOS_I_EXPORT_TOKEN='<TOKEN>'              # 필수. 인자로 받지 않는다 (ps 에 노출 방지)
 *   node scripts/argos-i-pull-full-db.mjs              # 전체 덤프
 *   node scripts/argos-i-pull-full-db.mjs --tables articles,companies   # 분할 다운로드 (zip32Risk 이거나 응답 시간 제한이 의심될 때)
 *   node scripts/argos-i-pull-full-db.mjs --keep-zip   # 검증 후에도 ZIP 보관
 *   node scripts/argos-i-pull-full-db.mjs --no-extract # 받아서 unzip -t 만 (해제·sha256 검증 생략, ZIP 보관)
 *   node scripts/argos-i-pull-full-db.mjs --retries 3  # 실패 시 처음부터 다시 받는 횟수 (기본 2)
 *   node scripts/argos-i-pull-full-db.mjs --help
 *
 * 환경변수
 *   ARGOS_I_BASE_URL          기본 https://robot-info-api.up.railway.app
 *   ARGOS_I_EXPORT_TOKEN      필수 (Bearer 토큰)
 *   ARGOS_I_FULL_DB_OUT_DIR   기본 ./argos-i-full-db-data  →  <out>/argos-i-full-db/<YYYYMMDDTHHMMSSZ>/
 *
 * 서버 쪽에서 ARGOS_I_FULL_DB_ENABLED=true 가 설정되어 있어야 한다 (아니면 종료 코드 2).
 * 서버 부하를 피하려고 KST 03:00~07:30(크롤러·태깅·파이프라인·일일 번들) 시간대는 피한다.
 *
 * 종료 코드
 *   0  성공 (마지막 줄 근처에 적재 스크립트에 넘길 디렉터리 경로를 출력)
 *   1  일반 오류 (잘못된 인자, 잘못된 tables, unzip 없음, 디스크 오류)
 *   2  인증 실패·비활성 (401, 503 argos_i_export_disabled / full_db_disabled, manifest enabled=false) — 재시도하지 않는다
 *   4  체크섬 불일치 또는 manifest.json 없음(불완전 ZIP) — 재시도 소진 후
 *   5  재시도 소진 (429 / 5xx / 네트워크)
 *   6  다른 덤프가 진행 중 (409) — 잠시 뒤 다시 실행
 *
 * 토큰은 출력·로그에 남기지 않는다. ZIP 은 파일로 스트리밍 저장하며 메모리에 올리지 않는다.
 */

import { execFile } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

export const EXIT = { OK: 0, GENERAL: 1, AUTH: 2, INTEGRITY: 4, RETRIES: 5, BUSY: 6 };
const SAFE_TABLE_RE = /^[a-z_][a-z0-9_]{0,62}$/;

export class PullError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

const log = (msg) => console.log(`[argos-i-pull-full-db] ${msg}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function usage() {
  return [
    'Usage: node scripts/argos-i-pull-full-db.mjs [--tables a,b] [--keep-zip] [--no-extract] [--retries N] [--help]',
    '',
    'Environment:',
    '  ARGOS_I_EXPORT_TOKEN     (required) Bearer token. Never pass it as an argument.',
    '  ARGOS_I_BASE_URL         default https://robot-info-api.up.railway.app',
    '  ARGOS_I_FULL_DB_OUT_DIR  default ./argos-i-full-db-data',
    '',
    'One-time initial load: the dump contains original text. Internal use only; delete it after loading.',
    'The server needs ARGOS_I_FULL_DB_ENABLED=true. Avoid KST 03:00-07:30.',
    '',
    'Exit codes: 0 ok, 1 error, 2 auth/disabled, 4 checksum mismatch or incomplete ZIP, 5 retries exhausted (429/5xx/network), 6 another dump in progress (409)',
  ].join('\n');
}

export function parseArgs(argv) {
  const out = { tables: null, keepZip: false, noExtract: false, retries: 2, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--keep-zip') out.keepZip = true;
    else if (a === '--no-extract') out.noExtract = true;
    else if (a === '--tables' || a.startsWith('--tables=')) {
      const v = a === '--tables' ? argv[++i] : a.slice('--tables='.length);
      const names = String(v ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (names.length === 0 || names.some((n) => !SAFE_TABLE_RE.test(n))) throw new PullError('--tables must be a comma-separated list of table names', EXIT.GENERAL);
      out.tables = [...new Set(names)];
    } else if (a === '--retries' || a.startsWith('--retries=')) {
      const v = a === '--retries' ? argv[++i] : a.slice('--retries='.length);
      if (!/^\d+$/.test(String(v)) || Number(v) > 10) throw new PullError('--retries must be an integer 0..10', EXIT.GENERAL);
      out.retries = Number(v);
    } else throw new PullError(`unknown argument: ${a}`, EXIT.GENERAL);
  }
  return out;
}

/** ZIP 엔트리 이름 목록이 완전한 덤프인지: argos-i-full-db/<ts>/ 아래이고 manifest.json 이 마지막 엔트리 */
export function isCompleteDumpListing(names) {
  const list = names.filter(Boolean);
  if (list.length === 0) return false;
  const last = list[list.length - 1];
  const m = /^(argos-i-full-db\/\d{8}T\d{6}Z)\/manifest\.json$/.exec(last);
  if (!m) return false;
  return list.every((n) => n.startsWith(`${m[1]}/`));
}

const sha256File = (file) =>
  new Promise((resolve, reject) => {
    const h = createHash('sha256');
    let bytes = 0;
    fs.createReadStream(file)
      .on('data', (c) => {
        h.update(c);
        bytes += c.length;
      })
      .on('error', reject)
      .on('end', () => resolve({ sha256: h.digest('hex'), bytes }));
  });

function run(cmd, args) {
  return new Promise((resolve) => {
    execFile(cmd, args, { maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => resolve({ err, stdout: String(stdout ?? ''), stderr: String(stderr ?? '') }));
  });
}

async function requireUnzip() {
  const r = await run('unzip', ['-v']);
  if (r.err && r.err.code === 'ENOENT') throw new PullError('system `unzip` is required (e.g. apt-get install unzip)', EXIT.GENERAL);
}

/** 서버 응답 본문에서 error 코드만 꺼낸다 */
async function readErrorCode(res) {
  try {
    const j = JSON.parse(await res.text());
    return typeof j.error === 'string' ? j.error.slice(0, 60) : null;
  } catch {
    return null;
  }
}

function classifyStatus(status, code) {
  if (status === 401) return { kind: 'fatal', code: EXIT.AUTH, message: 'authentication failed (HTTP 401): check ARGOS_I_EXPORT_TOKEN' };
  if (status === 503) {
    if (code === 'full_db_disabled') return { kind: 'fatal', code: EXIT.AUTH, message: 'full DB dump is disabled on the server (set ARGOS_I_FULL_DB_ENABLED=true, then redeploy)' };
    return { kind: 'fatal', code: EXIT.AUTH, message: 'export API is disabled on the server (ARGOS_I_EXPORT_TOKEN not configured)' };
  }
  if (status === 409) return { kind: 'fatal', code: EXIT.BUSY, message: 'another full DB dump is in progress (HTTP 409): try again in a minute' };
  if (status === 400) return { kind: 'fatal', code: EXIT.GENERAL, message: `bad request (HTTP 400${code ? `, ${code}` : ''}): check --tables` };
  if (status === 429 || status >= 500) return { kind: 'retry', message: `HTTP ${status}` };
  return { kind: 'fatal', code: EXIT.GENERAL, message: `unexpected HTTP ${status}` };
}

async function fetchPreview(base, token) {
  let res;
  try {
    res = await fetch(`${base}/api/argos-i/export/full-db/manifest`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
  } catch (err) {
    throw new PullError(`network error while reading the preview manifest (${err && err.cause && err.cause.code ? err.cause.code : err.name})`, EXIT.RETRIES);
  }
  if (res.status !== 200) {
    const c = classifyStatus(res.status, await readErrorCode(res));
    throw new PullError(c.message, c.kind === 'retry' ? EXIT.RETRIES : c.code);
  }
  return res.json();
}

function checkDisk(dir, estimatedBytes) {
  try {
    if (typeof fs.statfsSync !== 'function' || !estimatedBytes) return;
    const s = fs.statfsSync(dir);
    const free = Number(s.bavail) * Number(s.bsize);
    if (free < estimatedBytes * 3) log(`WARN: free disk space ${(free / 1e9).toFixed(1)} GB is less than 3x the estimated size (${(estimatedBytes / 1e9).toFixed(2)} GB)`);
  } catch {
    /* 확인할 수 없으면 건너뛴다 */
  }
}

/** 한 번의 시도: 다운로드 → unzip -t → (해제 → 검증). 재시도 가능한 실패는 PullError(RETRIES|INTEGRITY) */
async function attempt({ base, token, tables, workDir, noExtract }) {
  const query = tables ? `?tables=${encodeURIComponent(tables.join(','))}` : '';
  const zipPath = path.join(workDir, 'full-db.zip');
  let res;
  try {
    res = await fetch(`${base}/api/argos-i/export/full-db.zip${query}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/zip' } });
  } catch (err) {
    throw Object.assign(new PullError(`network error (${err && err.cause && err.cause.code ? err.cause.code : err.name})`, EXIT.RETRIES), { retryable: true });
  }
  if (res.status !== 200) {
    const retryAfter = Number(res.headers.get('retry-after'));
    const c = classifyStatus(res.status, await readErrorCode(res));
    if (c.kind === 'fatal') throw new PullError(c.message, c.code);
    throw Object.assign(new PullError(c.message, EXIT.RETRIES), { retryable: true, retryAfter: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null });
  }
  log('downloading the ZIP (streamed to disk)...');
  const t0 = Date.now();
  try {
    await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(zipPath, { mode: 0o600 }));
  } catch (err) {
    throw Object.assign(new PullError(`download interrupted (${err && err.code ? err.code : err.name})`, EXIT.RETRIES), { retryable: true });
  }
  const zipBytes = fs.statSync(zipPath).size;
  log(`downloaded ${(zipBytes / 1e6).toFixed(1)} MB in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  // 완전성: unzip -t 통과 + 마지막 엔트리가 manifest.json
  const t = await run('unzip', ['-tq', zipPath]);
  if (t.err) throw Object.assign(new PullError('unzip -t failed: the ZIP is incomplete or corrupt (the transfer was probably cut off)', EXIT.INTEGRITY), { retryable: true });
  const list = await run('unzip', ['-Z1', zipPath]);
  const names = list.stdout.split('\n');
  if (!isCompleteDumpListing(names)) throw Object.assign(new PullError('manifest.json is missing from the ZIP: the dump was aborted on the server', EXIT.INTEGRITY), { retryable: true });
  if (noExtract) return { zipPath, extracted: null };

  const extractDir = path.join(workDir, 'x');
  fs.mkdirSync(extractDir);
  const x = await run('unzip', ['-q', '-o', zipPath, '-d', extractDir]);
  if (x.err) throw new PullError(`unzip failed: ${String(x.stderr).slice(0, 200)}`, EXIT.GENERAL);
  const ts = /^argos-i-full-db\/(\d{8}T\d{6}Z)\//.exec(names.filter(Boolean).at(-1))[1];
  const dumpDir = path.join(extractDir, 'argos-i-full-db', ts);
  await verifyExtracted(dumpDir);
  return { zipPath, extracted: dumpDir, ts };
}

/** manifest.json 의 tables[] 와 README.md / schema.json 해시를 실제 파일과 대조한다 */
async function verifyExtracted(dumpDir) {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(dumpDir, 'manifest.json'), 'utf-8'));
  } catch {
    throw Object.assign(new PullError('manifest.json is missing or unreadable', EXIT.INTEGRITY), { retryable: true });
  }
  if (manifest.dumpFormatVersion !== 1) throw new PullError(`unsupported dumpFormatVersion ${manifest.dumpFormatVersion}; update the scripts`, EXIT.GENERAL);
  const problems = [];
  for (const [name, expected] of Object.entries(manifest.files ?? {})) {
    if (name !== 'README.md' && name !== 'schema.json') continue;
    const r = await sha256File(path.join(dumpDir, name)).catch(() => null);
    if (!r || r.sha256 !== expected) problems.push(name);
  }
  for (const t of manifest.tables ?? []) {
    if (!SAFE_TABLE_RE.test(t.name) || t.path !== `tables/${t.name}.jsonl`) throw new PullError(`unsafe table entry in manifest: ${String(t.name).slice(0, 64)}`, EXIT.GENERAL);
    const r = await sha256File(path.join(dumpDir, t.path)).catch(() => null);
    if (!r || r.sha256 !== t.sha256 || r.bytes !== t.jsonlBytes) problems.push(t.path);
  }
  if (problems.length > 0) throw Object.assign(new PullError(`checksum mismatch: ${problems.slice(0, 5).join(', ')}${problems.length > 5 ? ` (+${problems.length - 5})` : ''}`, EXIT.INTEGRITY), { retryable: true });
  log(`verified ${manifest.tables.length} tables, ${manifest.totals ? manifest.totals.rows : '?'} rows (README.md, schema.json, tables/*.jsonl)`);
}

async function main(argv) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(usage());
    return EXIT.OK;
  }
  const token = process.env.ARGOS_I_EXPORT_TOKEN;
  if (!token) throw new PullError('ARGOS_I_EXPORT_TOKEN is not set', EXIT.AUTH);
  const base = (process.env.ARGOS_I_BASE_URL || 'https://robot-info-api.up.railway.app').replace(/\/+$/, '');
  const outDir = path.resolve(process.env.ARGOS_I_FULL_DB_OUT_DIR || './argos-i-full-db-data');
  await requireUnzip();

  // 1) 사전 확인
  const preview = await fetchPreview(base, token);
  if (preview.enabled !== true) throw new PullError('full DB dump is disabled on the server (enabled=false): set ARGOS_I_FULL_DB_ENABLED=true and redeploy', EXIT.AUTH);
  const tableCount = Array.isArray(preview.tables) ? preview.tables.length : 0;
  log(`server: ${tableCount} tables, ~${preview.totals ? preview.totals.estimatedRows : '?'} rows (estimate), ~${preview.totals ? (preview.totals.estimatedBytes / 1e6).toFixed(1) : '?'} MB before compression`);
  if (preview.inProgress) log('WARN: another dump looks to be in progress; a 409 is likely');
  if (preview.zip32Risk) log('WARN: estimated size is above 3 GiB (ZIP32 limit risk): split the download with --tables a,b and repeat for the remaining tables');
  if (args.tables && Array.isArray(preview.tables)) {
    const known = new Set(preview.tables.map((t) => t.name));
    const unknown = args.tables.filter((n) => !known.has(n));
    if (unknown.length > 0) throw new PullError(`unknown or excluded tables: ${unknown.join(', ')}`, EXIT.GENERAL);
  }

  fs.mkdirSync(outDir, { recursive: true });
  checkDisk(outDir, preview.totals && preview.totals.estimatedBytes);

  // 2) 다운로드 + 검증 (실패하면 처음부터 다시)
  const maxAttempts = args.retries + 1;
  let result = null;
  let work = null;
  let lastErr = null;
  try {
    for (let n = 1; n <= maxAttempts; n++) {
      work = path.join(outDir, `.tmp-${randomBytes(4).toString('hex')}`);
      fs.mkdirSync(work, { mode: 0o700 });
      try {
        result = await attempt({ base, token, tables: args.tables, workDir: work, noExtract: args.noExtract });
        break;
      } catch (err) {
        lastErr = err;
        if (!(err instanceof PullError) || !err.retryable) throw err;
        log(`${err.message} (attempt ${n}/${maxAttempts})`);
        if (n < maxAttempts) {
          fs.rmSync(work, { recursive: true, force: true });
          work = null;
          const wait = err.retryAfter ? Math.min(err.retryAfter, 120) : 5 * n;
          log(`restarting from scratch in ${wait}s`);
          await sleep(wait * 1000);
        }
      }
    }
    if (!result) throw new PullError(lastErr ? `${lastErr.message}; giving up after ${maxAttempts} attempt(s)` : 'giving up', lastErr && lastErr.code === EXIT.INTEGRITY ? EXIT.INTEGRITY : EXIT.RETRIES);

    // 3) 최종 위치로 이동
    if (args.noExtract) {
      const finalZip = path.join(outDir, `argos-i-full-db_${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}.zip`);
      fs.renameSync(result.zipPath, finalZip);
      log(`ZIP verified with unzip -t (not extracted): ${finalZip}`);
      console.log(finalZip);
      return EXIT.OK;
    }
    const finalParent = path.join(outDir, 'argos-i-full-db');
    fs.mkdirSync(finalParent, { recursive: true });
    const finalDir = path.join(finalParent, result.ts);
    if (fs.existsSync(finalDir)) fs.rmSync(finalDir, { recursive: true, force: true });
    fs.renameSync(result.extracted, finalDir);
    if (args.keepZip) {
      const keep = path.join(outDir, `argos-i-full-db_${result.ts}.zip`);
      fs.renameSync(result.zipPath, keep);
      log(`kept ZIP: ${keep}`);
    }
    log('done. This data contains original text: internal use only; delete the files after loading.');
    log(`next: DATABASE_URL=<ARGOS_I DB> node scripts/argos-i-import-full-db.mjs ${finalDir} --dry-run`);
    console.log(finalDir);
    return EXIT.OK;
  } finally {
    if (work) fs.rmSync(work, { recursive: true, force: true });
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      if (err instanceof PullError) {
        console.error(`[argos-i-pull-full-db] ERROR: ${err.message}`);
        process.exit(err.code);
      }
      console.error(`[argos-i-pull-full-db] ERROR: ${err && err.message ? String(err.message).slice(0, 300) : String(err)}`);
      process.exit(EXIT.GENERAL);
    },
  );
}
