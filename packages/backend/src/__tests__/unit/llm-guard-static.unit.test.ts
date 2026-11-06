/**
 * 정적 테스트 (argos-i-full-db-static 방식): 소스 파일을 읽어 규칙을 검사한다.
 *  - 모든 LLM 호출 파일은 공통 가드(llm-input-guard / llm-output-guard)를 import 하고 실제로 쓴다. 예외는 사유와 함께 아래 목록에 등록한다.
 *  - 가드 모듈은 순수하다 (DB·네트워크·SDK import 없음), 모델 식별자 없음, 로그에 프롬프트·응답 원문을 넘기지 않는다.
 *  - 크롤러에 복제한 가드 파일은 백엔드 원본과 바이트 단위로 같다 (PM 결정 Q18).
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PACKAGES = path.resolve(here, '../../../..');
const BACKEND_SRC = path.join(PACKAGES, 'backend/src');
const CRAWLER_SRC = path.join(PACKAGES, 'crawler/src');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === '__tests__' || name === 'node_modules') continue;
      walk(full, out);
    } else if (full.endsWith('.ts') && !full.endsWith('.test.ts') && !full.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

const rel = (f: string) => path.relative(PACKAGES, f).split(path.sep).join('/');
const read = (f: string) => readFileSync(f, 'utf8');

/** 주석 제거 (설명 문장에 나오는 SDK 이름이나 console 예시가 규칙에 걸리지 않도록) */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/** 실제 SDK import 또는 호출. `import type` 과 `generateContentHash` 같은 이름은 제외한다 */
const LLM_CALL_RE = /^import\s+(?!type\b)[^;]*from\s+'(?:@anthropic-ai\/sdk|openai|@google\/genai)'|\bmessages\.create\s*\(|\bchat\.completions\.create\s*\(|\bgenerateContent\s*\(|\bresponses\.create\s*\(/m;
const GUARD_IMPORT_RE = /from\s+'\.{1,2}\/(?:[\w-]+\/)*llm-(?:input|output)-guard\.js'/;
/** 가드 모듈을 import 만 하고 유틸(stripCiteTags 등)만 쓰는 파일을 걸러내기 위해, 실제 방어 진입점 호출을 요구한다 */
const GUARD_USE_RE = /\b(?:sanitizeExternalText|sanitizeOutputText|sanitizeObject|sanitizeAnalyzedData|applyRule|buildUserMessage|safeHttpsUrl|safeEventUrl)\s*\(/;

/**
 * 가드 미적용 예외 목록 — 이번 단계(1단계)에서 하지 않기로 한 2순위·3순위 지점과 기준선.
 * 새 LLM 호출 파일을 만들면 가드를 적용하거나, 여기에 사유와 함께 등록해야 테스트가 통과한다.
 */
export const GUARD_EXCEPTIONS: Readonly<Record<string, string>> = {
  // 2순위 (명세 7장)
  'backend/src/services/tech-trend-report.service.ts': 'P9 기술 트렌드 리포트 — 2순위(stripCiteTags 단일화만 적용)',
  'backend/src/services/tech-trend-analysis.service.ts': 'P10 도메인 포커스 판정 — 2순위',
  'backend/src/services/hand-topic-classification.service.ts': 'P8 핸드/도메인 토픽 분류 — 2순위(토픽 id 화이트리스트 검증 있음)',
  'backend/src/services/application-case-extraction.service.ts': 'P11 적용 사례 추출 — 2순위(ci_staging 승인 대기열이 방어선)',
  'backend/src/services/video-content-analysis.service.ts': 'P12 Gemini 영상 분석 — 2순위(fileUri 검증·systemInstruction 은 후속)',
  'backend/src/services/article-parser.service.ts': 'P14 기사 파서 — 2순위',
  'backend/src/services/article-analyzer.service.ts': 'P15 기사 분석기 — 2순위',
  'backend/src/services/insight-cards.service.ts': 'P19 인사이트 카드 — 2순위',
  'backend/src/services/insight-generator.service.ts': 'P20 주간 인사이트 — 2순위',
  'backend/src/services/strategic-ai-agent.service.ts': 'P21 전략 AI 에이전트 — 2순위',
  // 3순위
  'backend/src/services/tech-trend-timeline-insight.service.ts': 'L1 시계열 AI 해설 — 3순위(집계 입력)',
  'backend/src/issues/services/askService.ts': 'L2 이슈 Ask — 3순위(인증 사용자 입력, enum 검증)',
  'backend/src/services/ppt-generator.service.ts': 'L3 PPT 생성 — 3순위(집계 숫자 입력)',
  'backend/src/services/designer/coaching.service.ts': 'L4 설계 코칭 — 3순위(내부 도구 입력)',
  'backend/src/services/designer/vacuum-arm/review.service.ts': 'L4 진공 암 설계 리뷰 — 3순위(내부 도구 입력)',
  // 기준선 (수정 금지)
  'backend/src/services/weekly-brief-summarize.ts': 'W1 주간 브리프 v2 — 자체 문장 가드(weekly-brief-text-guard) 사용, 1단계에서 수정 금지(PM 결정 Q2)',
  'backend/src/services/weekly-brief-summarize-report.ts': 'W1 주간 브리프 리포트 — 자체 문장 가드 사용, 수정 금지(PM 결정 Q2)',
  // SDK 타입/헬퍼만 있는 파일
  'backend/src/services/anthropic-models.ts': '호출 없음 — 응답 텍스트 추출·거부 판정 헬퍼(SDK 타입 import 만)',
};

const GUARD_MODULES = ['llm-input-guard.ts', 'llm-output-guard.ts', 'llm-guard-prompts.ts', 'llm-guard-metrics.ts'];
const COPIED_TO_CRAWLER = [...GUARD_MODULES, 'ops-log.util.ts'];

const allFiles = [...walk(BACKEND_SRC), ...walk(CRAWLER_SRC)];
const llmFiles = allFiles.filter((f) => LLM_CALL_RE.test(code(read(f))));

describe('every LLM call file uses the common guard (AC-16)', () => {
  it('finds the known call sites (sanity: the scan is not empty)', () => {
    const names = llmFiles.map(rel);
    expect(names).toContain('backend/src/services/video-tagging.service.ts');
    expect(names).toContain('backend/src/routes/events.ts');
    expect(names).toContain('crawler/src/services/ai-analyzer.service.ts');
    expect(names.length).toBeGreaterThan(20);
  });

  for (const f of llmFiles) {
    const name = rel(f);
    if (name in GUARD_EXCEPTIONS) continue;
    it(`${name} imports and uses llm-input-guard / llm-output-guard`, () => {
      const src = code(read(f));
      expect(GUARD_IMPORT_RE.test(src)).toBe(true);
      expect(GUARD_USE_RE.test(src)).toBe(true);
      expect(src).toMatch(/composeSystemPrompt\s*\(|UNTRUSTED_WEB_NOTICE/);
    });
  }

  it('every exception is still an LLM call file (no stale entries) and has a reason', () => {
    const names = new Set(llmFiles.map(rel));
    for (const [file, reason] of Object.entries(GUARD_EXCEPTIONS)) {
      if (file.endsWith('anthropic-models.ts')) continue; // 호출 없는 헬퍼
      expect(names.has(file), `${file} is not an LLM call file anymore — remove it from GUARD_EXCEPTIONS`).toBe(true);
      expect(reason.length).toBeGreaterThan(10);
    }
  });

  it('the weekly brief files are not touched by this work (they do not use the new common guard modules)', () => {
    for (const f of ['weekly-brief-summarize.ts', 'weekly-brief-summarize-report.ts', 'weekly-brief-text-guard.ts']) {
      expect(code(read(path.join(BACKEND_SRC, 'services', f)))).not.toMatch(/llm-(?:input|output)-guard|llm-guard-/);
    }
  });

  it('exceptions that are 1st-priority points do not exist (P1~P7, P13, P16~P18 are all guarded)', () => {
    const firstPriority = ['video-tagging', 'paper-summary', 'spec-enrichment', 'text-analyzer', 'event-video-brief', 'event-ces-demo', 'event-company-report', 'external-ai-agent', 'monthly-brief', 'routes/events', 'crawler/src/services/ai-analyzer'];
    for (const file of Object.keys(GUARD_EXCEPTIONS)) {
      for (const p of firstPriority) expect(file).not.toContain(p);
    }
  });
});

describe('guard modules are pure (AC-1)', () => {
  for (const m of GUARD_MODULES) {
    it(`${m} imports only sibling guard modules, ops-log.util and node:crypto`, () => {
      const src = code(read(path.join(BACKEND_SRC, 'services', m)));
      const imports = [...src.matchAll(/from\s+'([^']+)'/g)].map((x) => x[1]!);
      for (const i of imports) {
        expect(['./llm-input-guard.js', './llm-output-guard.js', './llm-guard-prompts.js', './llm-guard-metrics.js', './ops-log.util.js', 'node:crypto']).toContain(i);
      }
      expect(src).not.toMatch(/drizzle|\bdb\b\.|from '\.\.\/db|fetch\(|axios|@anthropic-ai|openai|@google\/genai|process\.env/);
    });
  }
});

describe('no model identifiers, secrets or raw text in the new modules (AC-14, AC-21)', () => {
  const files = [...GUARD_MODULES.map((m) => path.join(BACKEND_SRC, 'services', m)), path.join(PACKAGES, '../scripts/scan-llm-stored-text.ts')];
  for (const f of files) {
    it(`${path.basename(f)} has no model names and does not log prompt/response text`, () => {
      const src = code(read(f));
      expect(src).not.toMatch(/\b(?:claude|gpt|gemini|o1|o3)-[\w.-]+|\b(?:haiku|sonnet|opus)\b/i);
      expect(src).not.toMatch(/sk-[A-Za-z0-9]{10,}|api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i);
      // 스캔 스크립트의 오류 로그는 태그 문자열에 'text' 가 들어 있을 뿐 본문을 남기지 않는다 (보고서 출력은 formatReport 가 id 와 필드명만 만든다)
      if (!f.endsWith('scan-llm-stored-text.ts')) {
        const consoleCalls = [...src.matchAll(/console\.\w+\(([^;]*)\)/g)].map((m) => m[1]!);
        for (const c of consoleCalls) expect(c).not.toMatch(/\b(?:prompt|raw|text|response|content|system)\b/);
      }
    });
  }

  it('the log line goes through formatLogLine with the LlmGuard tag', () => {
    expect(code(read(path.join(BACKEND_SRC, 'services/llm-guard-metrics.ts')))).toContain("formatLogLine('LlmGuard'");
  });

  it('files that build prompts never interpolate process.env into template strings', () => {
    for (const f of llmFiles) {
      if (rel(f) in GUARD_EXCEPTIONS) continue;
      const src = code(read(f));
      expect(src, rel(f)).not.toMatch(/\$\{[^}]*process\.env/);
    }
  });
});

describe('crawler copies of the guard files are identical to the backend originals (Q18)', () => {
  const sha = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex');
  for (const m of COPIED_TO_CRAWLER) {
    it(`${m}`, () => {
      expect(sha(path.join(CRAWLER_SRC, 'services', m))).toBe(sha(path.join(BACKEND_SRC, 'services', m)));
    });
  }
});
