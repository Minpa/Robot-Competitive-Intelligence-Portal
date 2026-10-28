#!/usr/bin/env node
/**
 * ARGOS_I 일일 스냅샷 pull (파일 단위 다운로드) — Node 18+, 외부 의존성 없음.
 *
 * ARGOS 가 매일 KST 07:00 에 만드는 번들(영역별 MD+JSON)을 토큰 인증된 HTTPS 로 받아
 * 파일별 byteSize / sha256 을 검증한 뒤 원자적으로 교체한다. ARGOS 는 push 하지 않는다 (이 스크립트가 pull).
 *
 * 사용법
 *   export ARGOS_I_EXPORT_TOKEN='<TOKEN>'            # 필수. 인자로 받지 않는다 (ps 에 노출 방지)
 *   node scripts/argos-i-pull.mjs                     # 최신 번들
 *   node scripts/argos-i-pull.mjs --date 2026-10-29   # 특정 날짜 (보존 기간 30일 이내)
 *   node scripts/argos-i-pull.mjs --force             # 로컬에 같은 번들이 있어도 다시 받는다
 *   node scripts/argos-i-pull.mjs --help
 *
 * 환경변수
 *   ARGOS_I_BASE_URL     기본 https://robot-info-api.up.railway.app
 *   ARGOS_I_EXPORT_TOKEN 필수 (Bearer 토큰)
 *   ARGOS_I_OUT_DIR      기본 ./argos-i-data  →  <out>/<날짜>/..., <out>/LATEST
 *
 * 권장 cron (사내 서버 시간대 주의 — 아래는 서버가 KST 일 때. 월요일은 주간 브리프 반영을 위해 09:00 KST 이후 한 번 더 실행)
 *   0 8 * * *  cd /opt/argos-i && node scripts/argos-i-pull.mjs >> pull.log 2>&1
 *   0 9 * * 1  cd /opt/argos-i && node scripts/argos-i-pull.mjs >> pull.log 2>&1
 *
 * 종료 코드
 *   0  성공 또는 이미 최신(up to date)
 *   1  일반 오류
 *   2  인증 실패 / 비활성 (401 / 503) — 재시도하지 않는다
 *   3  받을 번들 없음 (404 no_bundle / 지정 날짜 없음)
 *   4  체크섬 불일치 (1회 재다운로드 후에도)
 *   5  재시도 소진 (429 / 5xx / 네트워크, 지수 백오프 2s·4s·8s·16s, 최대 5회)
 *
 * 토큰은 출력·로그에 남기지 않는다.
 */

import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EXIT = { OK: 0, GENERAL: 1, AUTH: 2, NO_BUNDLE: 3, CHECKSUM: 4, RETRIES: 5 };
const MAX_ATTEMPTS = 5;

class PullError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

const log = (msg) => console.log(`[argos-i-pull] ${msg}`);

function usage() {
  return [
    'Usage: node scripts/argos-i-pull.mjs [--date YYYY-MM-DD] [--force] [--help]',
    '',
    'Environment:',
    '  ARGOS_I_EXPORT_TOKEN  (required) Bearer token. Never pass it as an argument.',
    '  ARGOS_I_BASE_URL      default https://robot-info-api.up.railway.app',
    '  ARGOS_I_OUT_DIR       default ./argos-i-data',
    '',
    'Exit codes: 0 ok/up to date, 1 error, 2 auth/disabled, 3 no bundle, 4 checksum mismatch, 5 retries exhausted',
  ].join('\n');
}

export function parseArgs(argv) {
  const out = { date: null, force: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--force') out.force = true;
    else if (a === '--date') {
      out.date = argv[++i] ?? '';
    } else if (a.startsWith('--date=')) out.date = a.slice('--date='.length);
    else throw new PullError(`unknown argument: ${a}`, EXIT.GENERAL);
  }
  if (out.date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(out.date)) throw new PullError('--date must be YYYY-MM-DD', EXIT.GENERAL);
  return out;
}

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** GET with exponential backoff (2s, 4s, 8s, 16s; max 5 attempts). 401/503 → AUTH, 404 → returned to the caller, other 4xx → GENERAL. */
async function get(base, token, urlPath) {
  let lastErr = 'unknown';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res;
    try {
      res = await fetch(`${base}${urlPath}`, { headers: { Authorization: `Bearer ${token}`, Accept: '*/*' } });
    } catch (err) {
      lastErr = `network error (${err && err.cause && err.cause.code ? err.cause.code : err.name})`;
    }
    if (res) {
      if (res.status === 200) return { status: 200, body: Buffer.from(await res.arrayBuffer()), headers: res.headers };
      if (res.status === 401 || res.status === 503) {
        throw new PullError(`authentication failed or export disabled (HTTP ${res.status})`, EXIT.AUTH);
      }
      if (res.status === 404) return { status: 404, body: Buffer.from(await res.arrayBuffer()), headers: res.headers };
      if (res.status !== 429 && res.status < 500) throw new PullError(`unexpected HTTP ${res.status} for ${urlPath}`, EXIT.GENERAL);
      lastErr = `HTTP ${res.status}`;
      const retryAfter = Number(res.headers.get('retry-after'));
      if (attempt < MAX_ATTEMPTS && Number.isFinite(retryAfter) && retryAfter > 0) {
        log(`${lastErr}; retry-after ${retryAfter}s (attempt ${attempt}/${MAX_ATTEMPTS})`);
        await sleep(Math.min(retryAfter, 120) * 1000);
        continue;
      }
    }
    if (attempt < MAX_ATTEMPTS) {
      const wait = 2 ** attempt * 1000;
      log(`${lastErr}; retrying in ${wait / 1000}s (attempt ${attempt}/${MAX_ATTEMPTS})`);
      await sleep(wait);
    }
  }
  throw new PullError(`retries exhausted: ${lastErr}`, EXIT.RETRIES);
}

function readComplete(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, '.complete'), 'utf-8'));
  } catch {
    return null;
  }
}

/** 파일을 받아 byteSize / sha256 을 검증한다. 불일치면 1회 재다운로드, 그래도 불일치면 CHECKSUM(4). */
async function fetchVerified(base, token, urlPath, expect) {
  for (let pass = 1; pass <= 2; pass++) {
    const res = await get(base, token, urlPath);
    if (res.status === 404) throw new PullError(`not found: ${urlPath}`, EXIT.NO_BUNDLE);
    if ((expect.byteSize == null || res.body.length === expect.byteSize) && sha256(res.body) === expect.sha256) return res.body;
    if (pass === 1) log(`checksum mismatch for ${expect.label}; downloading once more`);
  }
  throw new PullError(`checksum mismatch: ${expect.label}`, EXIT.CHECKSUM);
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
  const outDir = path.resolve(process.env.ARGOS_I_OUT_DIR || './argos-i-data');

  // 1) manifest 조회
  const listRes = await get(base, token, '/api/argos-i/manifest');
  if (listRes.status === 404) throw new PullError('no bundle available', EXIT.NO_BUNDLE);
  const list = JSON.parse(listRes.body.toString('utf-8'));
  if (list.schemaVersion !== 1) throw new PullError(`unsupported schemaVersion ${list.schemaVersion}; stop and notify`, EXIT.GENERAL);

  // 2) 대상 날짜 결정 (기본: latest)
  const entry = args.date ? (list.bundles ?? []).find((b) => b.date === args.date) : list.latest;
  if (!entry) throw new PullError(args.date ? `no bundle for ${args.date} (retention is limited)` : 'no bundle available yet (latest is null)', EXIT.NO_BUNDLE);
  const date = entry.date;
  const finalDir = path.join(outDir, date);

  // 3) 이미 같은 번들이면 종료
  if (!args.force) {
    const done = readComplete(finalDir);
    if (done && done.bundleSha256 === entry.bundleSha256) {
      log(`up to date: ${date} (${entry.bundleSha256.slice(0, 12)})`);
      return EXIT.OK;
    }
  }

  // 4) 대상 날짜의 manifest.json 다운로드 + 번들 식별자 검증 (bundleSha256 = manifest.json 바이트의 sha256)
  const manifestBytes = await fetchVerified(base, token, `/api/argos-i/export/${date}/manifest.json`, {
    label: `${date}/manifest.json`,
    byteSize: null,
    sha256: entry.bundleSha256,
  });
  const manifest = JSON.parse(manifestBytes.toString('utf-8'));
  if (manifest.schemaVersion !== 1) throw new PullError(`unsupported bundle schemaVersion ${manifest.schemaVersion}; stop and notify`, EXIT.GENERAL);

  // 5) 임시 디렉터리에 files[] 를 각각 받아 검증
  fs.mkdirSync(outDir, { recursive: true });
  const tmpDir = path.join(outDir, `.tmp-${date}-${randomBytes(4).toString('hex')}`);
  fs.mkdirSync(tmpDir);
  try {
    fs.writeFileSync(path.join(tmpDir, 'manifest.json'), manifestBytes);
    let bytes = 0;
    for (const f of manifest.files) {
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(f.path) || f.path.includes('..')) throw new PullError(`unsafe path in manifest: ${f.path}`, EXIT.GENERAL);
      const body = await fetchVerified(base, token, `/api/argos-i/export/${date}/${f.path}`, { label: `${date}/${f.path}`, byteSize: f.byteSize, sha256: f.sha256 });
      fs.writeFileSync(path.join(tmpDir, f.path), body);
      bytes += body.length;
    }
    fs.writeFileSync(
      path.join(tmpDir, '.complete'),
      JSON.stringify({ date, bundleSha256: entry.bundleSha256, generatedAt: entry.generatedAt, status: entry.status, fileCount: manifest.files.length + 1, pulledAt: new Date().toISOString() }) + '\n',
    );

    // 6) 원자적 교체 (같은 파일시스템 안의 rename)
    let old = null;
    if (fs.existsSync(finalDir)) {
      old = path.join(outDir, `.old-${date}-${randomBytes(4).toString('hex')}`);
      fs.renameSync(finalDir, old);
    }
    fs.renameSync(tmpDir, finalDir);
    if (old) fs.rmSync(old, { recursive: true, force: true });
    const latestTmp = path.join(outDir, `.LATEST-${randomBytes(4).toString('hex')}`);
    fs.writeFileSync(latestTmp, `${date}\n`);
    fs.renameSync(latestTmp, path.join(outDir, 'LATEST'));
    log(`pulled ${date}: ${manifest.files.length + 1} files, ${bytes + manifestBytes.length} bytes, status=${manifest.status}, bundle=${entry.bundleSha256.slice(0, 12)}`);
    return EXIT.OK;
  } catch (err) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    throw err;
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      if (err instanceof PullError) {
        console.error(`[argos-i-pull] ERROR: ${err.message}`);
        process.exit(err.code);
      }
      console.error(`[argos-i-pull] ERROR: ${err && err.message ? err.message : String(err)}`);
      process.exit(EXIT.GENERAL);
    },
  );
}
