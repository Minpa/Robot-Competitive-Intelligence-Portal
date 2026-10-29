/**
 * 전체 DB 덤프 신규 소스의 정적 검사: 파일시스템 쓰기 금지, 토큰 로그 금지, 외부 AI SDK import 금지, 기존 라우트 파일 변경 범위
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILES = [
  'services/argos-i-full-db-config.ts',
  'services/argos-i-full-db-rows.ts',
  'services/argos-i-full-db-schema.ts',
  'services/argos-i-full-db-readme.ts',
  'services/argos-i-full-db-zip.ts',
  'services/argos-i-full-db.service.ts',
  'routes/argos-i-full-db.ts',
];
const read = (f: string) => readFileSync(join(SRC, f), 'utf-8');

describe.each(FILES)('%s', (file) => {
  const text = read(file);

  it('never writes to the filesystem', () => {
    expect(text).not.toMatch(/\b(writeFile|writeFileSync|appendFile|appendFileSync|createWriteStream|mkdtemp|mkdtempSync|tmpdir|mkdirSync|rmSync|unlinkSync|renameSync|copyFile)\b/);
    expect(text).not.toMatch(/from 'fs\/promises'|from 'node:fs\/promises'/);
  });

  it('does not import AI SDKs or call external services', () => {
    expect(text).not.toMatch(/@anthropic-ai\/sdk|from 'openai'|@google\/genai|(?<![.\w])fetch\(\s*['`"]|axios|node-fetch|undici/);
  });

  it('never passes the token variable to a log or response', () => {
    expect(text).not.toMatch(/ARGOS_I_EXPORT_TOKEN/);
    expect(text).not.toMatch(/getConfiguredTokens|redactTokens/);
    expect(text).not.toMatch(/headers\.authorization|request\.headers\b/i);
  });

  it('contains no model identifiers', () => {
    expect(text).not.toMatch(/claude|sonnet|opus|haiku|gpt-|gemini/i);
  });
});

describe('existing route file', () => {
  it('only gained the registerArgosIFullDbRoutes import and call', () => {
    const text = read('routes/argos-i.ts');
    expect(text.match(/registerArgosIFullDbRoutes/g)).toHaveLength(2);
    expect(text).toContain("import { registerArgosIFullDbRoutes } from './argos-i-full-db.js';");
    expect(text).toContain('registerArgosIFullDbRoutes(fastify);');
  });
});

describe('services use only read-only transaction statements', () => {
  it('no write SQL in the service or schema modules', () => {
    for (const f of ['services/argos-i-full-db.service.ts', 'services/argos-i-full-db-schema.ts']) {
      const text = read(f);
      expect(text).not.toMatch(/`\s*(INSERT|UPDATE|DELETE|TRUNCATE|DROP|ALTER|CREATE)\b/i);
      expect(text).not.toMatch(/'\s*(INSERT|UPDATE|DELETE|TRUNCATE|DROP|ALTER|CREATE)\s/i);
    }
    expect(read('services/argos-i-full-db.service.ts')).toContain('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  });
});

describe('docs and configuration files', () => {
  const root = join(SRC, '..', '..', '..');
  const doc = readFileSync(join(root, 'docs', 'argos-i-interface.md'), 'utf-8');

  it('docs/argos-i-interface.md has section 14 with 14.1~14.11, a TOC entry, the exception references and a changelog row', () => {
    for (let i = 1; i <= 11; i++) expect(doc).toContain(`### 14.${i} `);
    expect(doc).toContain('## 14. 초기 적재: 전체 DB 덤프');
    expect(doc).toContain('14. [초기 적재: 전체 DB 덤프](#14-초기-적재-전체-db-덤프)');
    expect(doc.split('\n').slice(0, 6).join('\n')).toContain('14절');
    const s13 = doc.slice(doc.indexOf('### 1.3 '), doc.indexOf('### 1.4 '));
    expect(s13).toContain('14절');
    const s12 = doc.slice(doc.indexOf('## 12. '), doc.indexOf('## 13. '));
    expect(s12).toContain('14절');
    expect(doc).toMatch(/\| 2026-10-29 \| 덤프 형식 v1 \| \*\*초기 적재용 전체 DB 덤프 추가\*\*/);
    expect(doc.indexOf('## 14. ')).toBeGreaterThan(doc.indexOf('### 13.3 변경 이력'));
  });

  it('the document never contains a real-looking token and uses <TOKEN> placeholders', () => {
    expect(doc).not.toMatch(/Bearer [A-Za-z0-9]{32,}/);
    expect(doc).toContain("ARGOS_I_EXPORT_TOKEN='<TOKEN>'");
  });

  it('.env.example lists the four full-DB variables and .gitignore covers both data directories', () => {
    const env = readFileSync(join(root, '.env.example'), 'utf-8');
    for (const k of ['ARGOS_I_FULL_DB_ENABLED', 'ARGOS_I_FULL_DB_BATCH_ROWS', 'ARGOS_I_FULL_DB_TIMEOUT_MIN', 'ARGOS_I_FULL_DB_ZIP_LEVEL']) expect(env).toMatch(new RegExp(`^# ${k}=`, 'm'));
    const ignore = readFileSync(join(root, '.gitignore'), 'utf-8');
    expect(ignore).toMatch(/^argos-i-data\/$/m);
    expect(ignore).toMatch(/^argos-i-full-db-data\/$/m);
  });
});
