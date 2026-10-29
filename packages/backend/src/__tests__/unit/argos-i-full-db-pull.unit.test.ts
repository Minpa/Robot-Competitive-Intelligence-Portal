/**
 * scripts/argos-i-pull-full-db.mjs / .sh, scripts/argos-i-import-full-db.mjs — 도움말·인자·불완전 ZIP 판정 (네트워크·DB 없음)
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
// @ts-expect-error 순수 ESM 스크립트 모듈 (타입 선언 없음)
import * as pull from '../../../../../scripts/argos-i-pull-full-db.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');
const MJS = join(ROOT, 'scripts', 'argos-i-pull-full-db.mjs');
const SH = join(ROOT, 'scripts', 'argos-i-pull-full-db.sh');
const IMPORT = join(ROOT, 'scripts', 'argos-i-import-full-db.mjs');

const cleanEnv = () => {
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env.ARGOS_I_EXPORT_TOKEN;
  delete env.DATABASE_URL;
  return env;
};

describe('--help', () => {
  it('pull .mjs prints usage and exits 0', () => {
    const r = spawnSync('node', [MJS, '--help'], { encoding: 'utf-8', env: cleanEnv() });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Usage: node scripts/argos-i-pull-full-db.mjs');
    expect(r.stdout).toContain('Exit codes');
  });
  it('pull .sh prints the header and exits 0', () => {
    const r = spawnSync('bash', [SH, '--help'], { encoding: 'utf-8', env: cleanEnv() });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('종료 코드');
    expect(r.stdout).toContain('--tables');
  });
  it('import script prints usage with the exit-code table and exits 0 without a database', () => {
    const r = spawnSync('node', [IMPORT, '--help'], { encoding: 'utf-8', env: cleanEnv() });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('--mode truncate --yes');
    expect(r.stdout).toContain('DATABASE_URL');
  });
});

describe('exit codes without network or database', () => {
  it('both pull scripts exit 2 when the token is not set, and 1 for unknown arguments', () => {
    for (const [cmd, file] of [['node', MJS], ['bash', SH]] as const) {
      expect(spawnSync(cmd, [file], { encoding: 'utf-8', env: cleanEnv() }).status).toBe(2);
      expect(spawnSync(cmd, [file, '--bogus'], { encoding: 'utf-8', env: { ...cleanEnv(), ARGOS_I_EXPORT_TOKEN: 'test-token-not-real-0123456789abcdef' } }).status).toBe(1);
      expect(spawnSync(cmd, [file, '--tables', 'Bad-Name'], { encoding: 'utf-8', env: { ...cleanEnv(), ARGOS_I_EXPORT_TOKEN: 'test-token-not-real-0123456789abcdef' } }).status).toBe(1);
    }
  });
  it('the import script exits 1 for a missing directory / missing --yes and 3 for a directory without manifest.json', () => {
    expect(spawnSync('node', [IMPORT], { encoding: 'utf-8', env: cleanEnv() }).status).toBe(1);
    expect(spawnSync('node', [IMPORT, '/nonexistent-dump-dir', '--mode', 'truncate'], { encoding: 'utf-8', env: cleanEnv() }).status).toBe(1);
    expect(spawnSync('node', [IMPORT, ROOT, '--verify-only'], { encoding: 'utf-8', env: cleanEnv() }).status).toBe(3);
  });
});

describe('parseArgs', () => {
  it('defaults', () => {
    expect(pull.parseArgs([])).toEqual({ tables: null, keepZip: false, noExtract: false, retries: 2, help: false });
  });
  it('parses options', () => {
    expect(pull.parseArgs(['--tables', 'a,b,a', '--keep-zip', '--no-extract', '--retries', '4'])).toEqual({ tables: ['a', 'b'], keepZip: true, noExtract: true, retries: 4, help: false });
    expect(pull.parseArgs(['--tables=x', '--retries=0']).retries).toBe(0);
    expect(pull.parseArgs(['--help']).help).toBe(true);
  });
  it.each([[['--tables']], [['--tables', 'Bad;name']], [['--retries', 'x']], [['--retries', '99']], [['--nope']]])('rejects %j with exit code 1', (argv) => {
    try {
      pull.parseArgs(argv);
      throw new Error('should have thrown');
    } catch (e: any) {
      expect(e.code).toBe(1);
    }
  });
});

describe('isCompleteDumpListing (incomplete ZIP detection)', () => {
  const root = 'argos-i-full-db/20261029T031245Z';
  const full = [`${root}/README.md`, `${root}/schema.json`, `${root}/tables/a.jsonl`, `${root}/manifest.json`];
  it('is complete only when manifest.json is the last entry under one dump folder', () => {
    expect(pull.isCompleteDumpListing(full)).toBe(true);
    expect(pull.isCompleteDumpListing([...full, ''])).toBe(true);
    expect(pull.isCompleteDumpListing(full.slice(0, 3))).toBe(false); // manifest 없음 = 중단된 덤프
    expect(pull.isCompleteDumpListing([`${root}/manifest.json`, `${root}/tables/a.jsonl`])).toBe(false); // manifest 가 마지막이 아님
    expect(pull.isCompleteDumpListing([])).toBe(false);
    expect(pull.isCompleteDumpListing([...full.slice(0, 3), 'other/manifest.json'])).toBe(false);
    expect(pull.isCompleteDumpListing([`${root}/README.md`, 'evil/../x', `${root}/manifest.json`])).toBe(false);
  });
});

describe('static properties of the scripts', () => {
  const mjs = readFileSync(MJS, 'utf-8');
  const sh = readFileSync(SH, 'utf-8');
  const imp = readFileSync(IMPORT, 'utf-8');

  it('the node pull script streams the download to disk and never buffers the ZIP in memory', () => {
    expect(mjs).toContain('Readable.fromWeb(res.body)');
    expect(mjs).toContain('createWriteStream');
    expect(mjs).not.toMatch(/arrayBuffer\(\)/);
    expect(mjs).toContain('execFile'); // 셸 없이 인자 배열
    expect(mjs).not.toMatch(/(?<![.\w])exec\(|execSync|spawnSync\(|shell:\s*true/);
  });

  it('the shell pull script passes the token through curl config on stdin, not as an argument, and never prints it', () => {
    expect(sh).toContain("printf 'header = \"Authorization: Bearer %s\"\\n' \"$ARGOS_I_EXPORT_TOKEN\"");
    expect(sh).toContain('curl -sS -K -');
    expect(sh).not.toMatch(/-H\s+["']?Authorization/);
    expect(sh).not.toMatch(/(echo|log|die)[^\n]*\$ARGOS_I_EXPORT_TOKEN/);
  });

  it('neither pull script prints the token, and the import script only reads DATABASE_URL from the environment', () => {
    expect(mjs).not.toMatch(/console\.(log|error|warn)\([^\n]*token/i);
    expect(imp).toContain('process.env.DATABASE_URL');
    expect(imp).not.toMatch(/--database-url|--password/);
  });
});
