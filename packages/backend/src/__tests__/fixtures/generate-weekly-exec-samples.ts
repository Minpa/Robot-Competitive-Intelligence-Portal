/**
 * 주간 브리프 v3(임원판) 샘플 응답(full / partial / sparse / empty) 생성기.
 *
 * 수집 픽스처(weekly-exec-collected.fixture)를 가짜 AI 클라이언트로 요약해 실제 buildExecPlan → finalizeExec 파이프라인이 만든 값을 그대로 저장한다.
 * 값은 모두 가상이다(실데이터 미측정). 결과 JSON 은 백엔드 fixtures/weekly-exec-samples/ 와 프론트 src/lib/__fixtures__/ 에 같은 내용으로 둔다
 * (weekly-brief-contract.unit.test.ts 가 두 위치의 일치와 생성기 결과와의 일치를 검사한다).
 *
 * 다시 만들기:  npx tsx src/__tests__/fixtures/generate-weekly-exec-samples.ts   (packages/backend 에서)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildExecPlan, finalizeExec } from '../../services/weekly-brief-compose-exec.js';
import { summarizeExec } from '../../services/weekly-brief-summarize-exec.js';
import type { WeeklyExecutiveResponse } from '../../types/weekly-brief.js';
import { REPORT_NOW, makeExecCollectedEmpty, makeExecCollectedFull, makeExecCollectedSparse } from './weekly-exec-collected.fixture.js';
import { makeFakeExecClient, type FakeExecOptions } from './weekly-exec-fake-ai.js';

export type ExecSampleName = 'full' | 'partial' | 'sparse' | 'empty';
export const EXEC_SAMPLE_NAMES: readonly ExecSampleName[] = ['full', 'partial', 'sparse', 'empty'];

const SAMPLE_MODEL = 'sample-model';

async function build(collected: ReturnType<typeof makeExecCollectedFull>, fake: FakeExecOptions | null, neighbours: { prev: string | null; next: string | null }): Promise<WeeklyExecutiveResponse> {
  const plan = buildExecPlan(collected, { showArticleSummary: true, entityMode: 'warn' });
  const ai = fake
    ? await summarizeExec('2026-10-19', plan, {
        client: makeFakeExecClient(fake).client as never,
        env: { WEEKLY_BRIEF_MODEL: SAMPLE_MODEL },
        getCreditInfo: async () => ({ monthlyLimitUsd: 50, currentMonthUsageUsd: 0 }),
        logUsage: async () => undefined,
        log: () => undefined,
      })
    : null;
  const result = finalizeExec(plan, ai?.ai ?? null, REPORT_NOW, { showArticleSummary: true });
  return {
    weekStart: '2026-10-19',
    status: result.status === 'ok' ? 'ok' : 'partial',
    generatedAt: REPORT_NOW.toISOString(),
    model: ai?.model ?? null,
    prevWeekStart: neighbours.prev,
    nextWeekStart: neighbours.next,
    payload: result.payload,
  };
}

export async function generateExecSamples(): Promise<Record<ExecSampleName, WeeklyExecutiveResponse>> {
  return {
    // 모든 섹션이 가득 찬 주
    full: await build(makeExecCollectedFull(), { rich: true }, { prev: '2026-10-12', next: null }),
    // 격차 호출(B)이 실패해 격차 서술만 규칙 문장인 partial
    partial: await build(makeExecCollectedFull(), { rich: true, fail: { B: 'throw' } }, { prev: '2026-10-12', next: '2026-10-26' }),
    // 영상 3건뿐이고 우리 위치 조회가 실패한 희소한 주
    sparse: await build(makeExecCollectedSparse(), { rich: true }, { prev: null, next: null }),
    // 데이터 전무 (AI 호출 없음)
    empty: await build(makeExecCollectedEmpty(), null, { prev: null, next: null }),
  };
}

export const backendExecSamplesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'weekly-exec-samples');
export const frontendExecSamplesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../frontend/src/lib/__fixtures__');

export function serializeExecSample(s: WeeklyExecutiveResponse): string {
  return JSON.stringify(s, null, 2) + '\n';
}

async function main(): Promise<void> {
  const samples = await generateExecSamples();
  fs.mkdirSync(backendExecSamplesDir, { recursive: true });
  fs.mkdirSync(frontendExecSamplesDir, { recursive: true });
  for (const name of EXEC_SAMPLE_NAMES) {
    const text = serializeExecSample(samples[name]);
    fs.writeFileSync(path.join(backendExecSamplesDir, `${name}.json`), text);
    fs.writeFileSync(path.join(frontendExecSamplesDir, `weekly-exec-${name}.json`), text);
    console.log(`wrote ${name} (${text.length} bytes)`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  void main();
}
