/**
 * 정적 검사 — note 는 저장소·라우트·관리자 라우트·서비스·스키마·번들 제외 규칙 파일로 한정된다.
 * AI 프롬프트 빌더(tech-trend-report / video-content-analysis / spec-enrichment / llm-*)와 articles 쓰기 경로(ingest, 처리기)에서 참조되지 않고,
 * 처리기 입력 타입에 note 가 없으며, 처리기(query)는 AI·사용량 모듈을 import 하지 않는다. 요청 본문 로그 금지, push 금지, 모델 식별자 금지 (AC-20, AC-23)
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(here, '../..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf-8');
const listTs = (dir: string): string[] =>
  fs.readdirSync(path.join(SRC, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? listTs(path.join(dir, e.name)) : e.name.endsWith('.ts') ? [path.join(dir, e.name)] : []));

/** 주석을 뺀 코드 */
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const mentionsNote = (src: string) => /\bnote\b/.test(code(src));

describe('note isolation', () => {
  const prompts = [
    'services/tech-trend-report.service.ts',
    'services/video-content-analysis.service.ts',
    'services/spec-enrichment.service.ts',
    'services/ingest.service.ts',
    'services/ingest-guard.util.ts',
    ...listTs('services').filter((f) => /services\/llm-[a-z-]+\.ts$/.test(f)),
  ];

  it.each(prompts)('%s never references the request note', (file) => {
    // 이 파일들은 note 라는 식별자를 requests 와 무관한 용도로 쓸 수 있으므로, 요청 note 접근 형태(`.note`, `note:`)만 본다
    const src = code(read(file));
    expect(src).not.toMatch(/argos-i-requests/);
    expect(src).not.toMatch(/\brequest\.note\b|\brow\.note\b|\bparsed\.note\b/);
  });

  it('handlers and the processor never reference note at all (their input type has no note)', () => {
    for (const f of [...listTs('services/argos-i-requests-handlers'), 'services/argos-i-requests-processor.ts', 'services/argos-i-requests-runtime.ts', 'services/argos-i-requests-result.ts']) {
      expect(mentionsNote(read(f)), f).toBe(false);
    }
    const types = read('services/argos-i-requests-handlers/types.ts');
    expect(types).toMatch(/run\(params: P\)/);
    expect(code(types)).not.toMatch(/\bnote\b/);
  });

  it('only the store, service, schema, guard, routes and admin routes touch note (whitelist)', () => {
    const whitelist = new Set([
      'services/argos-i-requests-store.ts',
      'services/argos-i-requests.service.ts',
      'services/argos-i-requests-schema.ts',
      'services/argos-i-inbound-guard.ts',
      'services/argos-i-guard-rules.ts',
      'routes/argos-i-requests.ts',
      'routes/argos-i.ts',
      'db/argos-i-requests.ddl.ts',
    ]);
    const files = [...listTs('services'), ...listTs('routes'), ...listTs('db')].filter((f) => /argos-i-(requests|inbound|guard)|routes\/argos-i/.test(f) && !f.includes('__tests__'));
    const offenders = files.filter((f) => !whitelist.has(f) && mentionsNote(read(f)));
    expect(offenders).toEqual([]);
  });

  it('the bundle collector and area never select or emit note (the requests area reads other columns only)', () => {
    expect(code(read('services/argos-i-export-areas-requests.ts'))).not.toMatch(/\bnote\b/);
    const collect = read('services/argos-i-export-collect.ts');
    const block = collect.slice(collect.indexOf('requests: async'), collect.indexOf("'data-quality': async"));
    expect(block).toContain('argos_i_requests');
    expect(block).not.toMatch(/\bnote\b|payload_hash|approved_by|idempotency/);
  });

  it('public (token) responses are built by view functions that omit note; only toAdminView has it', () => {
    const svc = read('services/argos-i-requests.service.ts');
    const pub = svc.slice(svc.indexOf('export function toPublicView'), svc.indexOf('export function toAdminView'));
    expect(pub).not.toMatch(/\bnote\b/);
    expect(svc.slice(svc.indexOf('export function toAdminView'))).toMatch(/note: row\.note/);
  });
});

describe('query handler is AI-free', () => {
  it('imports no AI / usage-logging / enrichment modules', () => {
    const src = code(read('services/argos-i-requests-handlers/query.ts'));
    for (const forbidden of ['ai-usage', 'logUsage', 'anthropic', 'gemini', 'openai', 'tech-trend-report', 'video-content-analysis', 'spec-enrichment', 'llm-']) {
      expect(src.toLowerCase(), forbidden).not.toContain(forbidden.toLowerCase());
    }
  });
});

describe('request/ingest code does not log bodies, push, or expose model identifiers', () => {
  const files = [...listTs('services').filter((f) => /argos-i-(requests|inbound|guard)/.test(f)), 'routes/argos-i-requests.ts', 'routes/argos-i-request-auth.ts'];

  it.each(files)('%s has no console/log call carrying request bodies or tokens', (f) => {
    const src = code(read(f));
    expect(src).not.toMatch(/console\.\w+\([^)]*(request\.body|req\.body|\.params\b|note|headers|authorization|TOKEN)/i);
    expect(src).not.toMatch(/log\.\w+\([^)]*(request\.body|\.params\b|note)/);
  });

  it.each(files)('%s has no outbound callbacks/webhooks to ARGOS_I (no push)', (f) => {
    const src = code(read(f));
    expect(src).not.toMatch(/webhook|callbackUrl|callback_url|ARGOS_I_BASE_URL/i);
  });

  it.each(files)('%s has no model identifier strings', (f) => {
    expect(read(f)).not.toMatch(/claude-[a-z0-9.-]+|gemini-[0-9a-z.-]+|gpt-[0-9a-z.-]+|opus-?\d|haiku-?\d|sonnet-?\d/i);
  });
});

describe('startup wiring', () => {
  it('scheduler registers the argos-i-requests task and logs 9 tasks', () => {
    const src = read('services/scheduler.service.ts');
    expect(src).toContain('ARGOS_I_REQUESTS_TASK_NAME');
    expect(src).toContain('Initialized with 9 tasks');
  });

  it('routes/index.ts registers the request plugin on its own prefix (separate encapsulation from the pull plugin)', () => {
    const src = read('routes/index.ts');
    expect(src).toContain("fastify.register(argosIRequestsRoutes, { prefix: '/api/argos-i/requests' })");
    expect(src).toContain("fastify.register(argosIRoutes, { prefix: '/api/argos-i' })");
  });

  it('the request plugin does not use the pull-token hook, and the pull plugin does not use the request-token hook', () => {
    expect(read('routes/argos-i-requests.ts')).not.toContain('requireArgosIToken');
    expect(read('routes/argos-i.ts')).not.toContain('requireArgosIRequestToken');
  });
});
