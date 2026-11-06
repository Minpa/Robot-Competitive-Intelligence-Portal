/**
 * 소급 점검: DB 에 이미 저장된 LLM 산출 텍스트를 읽기 전용으로 스캔한다 (프롬프트 인젝션 방어 작업).
 *
 * - 읽기 전용: SELECT 만 실행하고 트랜잭션도 READ ONLY 로 연다. DB 를 변경하지 않고 파일도 만들지 않는다 (표준출력만).
 * - 보고 수준(PM 결정 Q7): 지점·필드별 건수와 샘플 식별자(article id / view 이름 / 로봇 id + 필드명)만 출력한다. 본문은 출력하지 않는다.
 * - 검사: URL / 이메일 / 전화번호, 지시문 패턴(detectInjection), 지시문 에코·유출(detectOutputLeak), 제어문자·zero-width·방향제어,
 *   HTML 태그·마크다운 링크, 비정상 길이.
 *
 * 실행 (운영 DB 실행은 PM 승인 후):
 *   cd packages/backend && DATABASE_URL=... npx tsx ../../scripts/scan-llm-stored-text.ts [--limit 2000] [--since 2026-09-01] [--samples 5]
 */
import pg from 'pg';
import { detectInjection, INVISIBLE_CHARS_RE } from '../packages/backend/src/services/llm-input-guard.js';
import { detectOutputLeak, extractIdentifiers } from '../packages/backend/src/services/llm-output-guard.js';

export type CheckName = 'url' | 'email' | 'phone' | 'injection' | 'leak' | 'invisible' | 'html' | 'mdLink' | 'tooLong';
export const CHECKS: readonly CheckName[] = ['url', 'email', 'phone', 'injection', 'leak', 'invisible', 'html', 'mdLink', 'tooLong'];

/** 필드별 정상 길이 상한 — 넘으면 tooLong. 정의되지 않은 필드는 DEFAULT_MAX_LEN */
const DEFAULT_MAX_LEN = 2000;
const FIELD_MAX_LEN: Record<string, number> = {
  aiSummaryKo: 400,
  titleKo: 300,
  summary: 4000,
};

export interface Finding {
  /** 'articles' | 'view_cache' | 'body_specs' ... */
  source: string;
  /** 필드 경로 (예: aiSummaryKo, geminiAnalysis.summaryKo) */
  field: string;
  /** article id / view 이름 / 로봇 id — 본문은 아님 */
  id: string;
  checks: CheckName[];
}

const URL_RE = /(?:https?|ftp):\/\/[^\s<>"'`]{1,2000}|\bwww\.[^\s<>"'`]{1,2000}/i;
const EMAIL_RE = /[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,255}\.[A-Za-z]{2,24}/;
const HTML_RE = /<\/?[a-zA-Z!][^>]{0,200}>?/;
const MD_LINK_RE = /!?\[[^\]\n]{0,300}\]\([^)\s]{0,2000}\)/;

/** 문자열 하나를 검사해 걸린 항목을 돌려준다 (본문은 돌려주지 않는다) */
export function checkText(text: string, field = ''): CheckName[] {
  const out: CheckName[] = [];
  if (typeof text !== 'string' || !text) return out;
  const t = text.length > 100_000 ? text.slice(0, 100_000) : text;
  if (URL_RE.test(t)) out.push('url');
  if (EMAIL_RE.test(t)) out.push('email');
  const ids = extractIdentifiers(t);
  if ([...ids].some((i) => /^\+?\d{7,}$/.test(i))) out.push('phone');
  if (detectInjection(t).hits.length > 0) out.push('injection');
  if (detectOutputLeak(t)) out.push('leak');
  if (new RegExp(INVISIBLE_CHARS_RE.source).test(t)) out.push('invisible');
  if (HTML_RE.test(t)) out.push('html');
  if (MD_LINK_RE.test(t)) out.push('mdLink');
  const max = FIELD_MAX_LEN[field] ?? DEFAULT_MAX_LEN;
  if (Array.from(text).length > max) out.push('tooLong');
  return out;
}

/** 중첩 값의 문자열을 (경로, 값) 으로 펼친다. 깊이·개수 상한 */
export function* walkStrings(value: unknown, path = '', depth = 0): Generator<[string, string]> {
  if (typeof value === 'string') {
    yield [path, value];
    return;
  }
  if (depth >= 6 || value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const v of value.slice(0, 200)) yield* walkStrings(v, path, depth + 1);
    return;
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>).slice(0, 100)) {
    yield* walkStrings(v, path ? `${path}.${k}` : k, depth + 1);
  }
}

/** extracted_metadata 에서 AI 산출 필드만 고른다 (eventBrief_*, cesDemo_* 접두 포함) */
export function pickAiFields(meta: unknown): Array<[string, unknown]> {
  if (!meta || typeof meta !== 'object') return [];
  const out: Array<[string, unknown]> = [];
  for (const [k, v] of Object.entries(meta as Record<string, unknown>)) {
    if (['aiTags', 'aiSummaryKo', 'titleKo', 'geminiAnalysis', 'handTopics', 'domainTopics', 'eventBrief', 'cesDemo'].includes(k) || k.startsWith('eventBrief_') || k.startsWith('cesDemo_')) {
      out.push([k, v]);
    }
  }
  return out;
}

export function scanValue(source: string, id: string, rootField: string, value: unknown): Finding[] {
  const findings: Finding[] = [];
  for (const [path, str] of walkStrings(value, rootField)) {
    // 필드명은 경로의 첫 토막 기준으로 길이 상한을 찾고, 이벤트 키 접미(eventBrief_wrc2026)는 일반화한다
    const generic = path.replace(/^(eventBrief|cesDemo)_[A-Za-z0-9]+/, '$1');
    const checks = checkText(str, path.split('.')[0] ?? path);
    if (checks.length > 0) findings.push({ source, field: generic, id, checks });
  }
  return findings;
}

export interface Report {
  scanned: Record<string, number>;
  /** `${source}|${field}` → check → count */
  counts: Map<string, Record<CheckName, number>>;
  /** `${source}|${field}|${check}` → 샘플 id */
  samples: Map<string, string[]>;
}

export function newReport(): Report {
  return { scanned: {}, counts: new Map(), samples: new Map() };
}

export function addFindings(report: Report, findings: Finding[], samplesPerBucket: number): void {
  for (const f of findings) {
    const key = `${f.source}|${f.field}`;
    let row = report.counts.get(key);
    if (!row) {
      row = Object.fromEntries(CHECKS.map((c) => [c, 0])) as Record<CheckName, number>;
      report.counts.set(key, row);
    }
    for (const c of f.checks) {
      row[c]++;
      const sk = `${key}|${c}`;
      const list = report.samples.get(sk) ?? [];
      if (list.length < samplesPerBucket && !list.includes(f.id)) list.push(f.id);
      report.samples.set(sk, list);
    }
  }
}

export function formatReport(report: Report): string {
  const lines: string[] = [];
  lines.push('== LLM 저장 텍스트 소급 점검 (읽기 전용) ==');
  lines.push(`스캔 행 수: ${Object.entries(report.scanned).map(([k, v]) => `${k}=${v}`).join(', ') || '(없음)'}`);
  lines.push('');
  lines.push(['지점|필드', ...CHECKS].join('\t'));
  for (const [key, row] of [...report.counts.entries()].sort()) {
    lines.push([key, ...CHECKS.map((c) => String(row[c]))].join('\t'));
  }
  if (report.counts.size === 0) lines.push('(문제 없음)');
  lines.push('');
  lines.push('샘플 식별자 (본문 미출력):');
  for (const [k, ids] of [...report.samples.entries()].sort()) lines.push(`  ${k}: ${ids.join(', ')}`);
  return lines.join('\n');
}

export function parseArgs(argv: string[]): { limit: number; since: string | null; samples: number } {
  const get = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const limit = Math.max(1, Math.min(100_000, parseInt(get('limit') ?? '2000', 10) || 2000));
  const sinceRaw = get('since');
  const since = sinceRaw && /^\d{4}-\d{2}-\d{2}$/.test(sinceRaw) ? sinceRaw : null;
  const samples = Math.max(1, Math.min(50, parseInt(get('samples') ?? '5', 10) || 5));
  return { limit, since, samples };
}

async function main(): Promise<void> {
  const { limit, since, samples } = parseArgs(process.argv.slice(2));
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const client = await pool.connect();
  const report = newReport();
  try {
    // 모든 조회는 읽기 전용 트랜잭션 안에서 실행한다
    await client.query('BEGIN READ ONLY');

    const arts = await client.query(
      `SELECT id::text AS id, summary, extracted_metadata FROM articles
       WHERE ($1::date IS NULL OR created_at >= $1::date)
       ORDER BY created_at DESC LIMIT $2`,
      [since, limit],
    );
    report.scanned.articles = arts.rowCount ?? 0;
    for (const row of arts.rows as Array<{ id: string; summary: string | null; extracted_metadata: unknown }>) {
      const findings: Finding[] = [];
      if (row.summary) findings.push(...scanValue('articles', row.id, 'summary', row.summary));
      for (const [k, v] of pickAiFields(row.extracted_metadata)) findings.push(...scanValue('articles.extracted_metadata', row.id, k, v));
      addFindings(report, findings, samples);
    }

    const cache = await client.query(
      `SELECT view_name, data FROM view_cache WHERE ($1::date IS NULL OR cached_at >= $1::date) ORDER BY cached_at DESC LIMIT $2`,
      [since, limit],
    );
    report.scanned.view_cache = cache.rowCount ?? 0;
    for (const row of cache.rows as Array<{ view_name: string; data: unknown }>) {
      // 캐시 이름의 도메인·버전 접미는 지점 구분에 쓰지 않도록 첫 토막(`:` 앞)만 쓴다
      const prefix = row.view_name.split(':')[0] ?? row.view_name;
      addFindings(report, scanValue(`view_cache:${prefix}`, row.view_name, '', row.data), samples);
    }

    for (const [table, cols] of [
      ['body_specs', []],
      ['hand_specs', ['hand_type']],
      ['computing_specs', ['main_soc']],
      ['power_specs', ['battery_type', 'charging_method']],
    ] as Array<[string, string[]]>) {
      if (cols.length === 0) continue;
      const res = await client.query(`SELECT robot_id::text AS id, ${cols.join(', ')} FROM ${table} LIMIT $1`, [limit]);
      report.scanned[table] = res.rowCount ?? 0;
      for (const row of res.rows as Array<Record<string, unknown>>) {
        const findings: Finding[] = [];
        for (const c of cols) findings.push(...scanValue(table, String(row.id), c, row[c]));
        addFindings(report, findings, samples);
      }
    }

    await client.query('ROLLBACK');
  } finally {
    client.release();
    await pool.end();
  }
  console.log(formatReport(report));
}

// 직접 실행했을 때만 main (테스트에서 import 해도 DB 에 접속하지 않는다)
const invokedDirectly = typeof process.argv[1] === 'string' && /scan-llm-stored-text\.[cm]?[jt]s$/.test(process.argv[1]);
if (invokedDirectly) {
  main().catch((err) => {
    console.error('[scan-llm-stored-text] failed:', (err as Error).message);
    process.exit(1);
  });
}
