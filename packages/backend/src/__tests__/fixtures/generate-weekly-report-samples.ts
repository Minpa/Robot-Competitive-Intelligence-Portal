/**
 * 주간 브리프 v2 샘플 응답(full / partial / sparse / empty) 생성기.
 *
 * 수집 픽스처(weekly-report-collected.fixture)를 가짜 AI 클라이언트로 요약해 실제 composeReport 파이프라인이 만든 값을 그대로 저장한다.
 * 값은 모두 가상이다. 결과 JSON 은 백엔드 fixtures/weekly-report-samples/ 와 프론트 src/lib/__fixtures__/ 에 같은 내용으로 둔다
 * (weekly-brief-contract.unit.test.ts 가 두 위치의 일치와 생성기 결과와의 일치를 검사한다).
 *
 * 다시 만들기:  npx tsx src/__tests__/fixtures/generate-weekly-report-samples.ts   (packages/backend 에서)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildReportPlan, finalizeReport } from '../../services/weekly-brief-compose-report.js';
import { summarizeReport } from '../../services/weekly-brief-summarize-report.js';
import type { WeeklyReportResponse } from '../../types/weekly-brief.js';
import { REPORT_NOW, makeCollectedEmpty, makeCollectedFull, makeCollectedSparse } from './weekly-report-collected.fixture.js';
import { makeFakeReportClient, type FakeAiOptions } from './weekly-report-fake-ai.js';

export type ReportSampleName = 'full' | 'partial' | 'sparse' | 'empty';
export const REPORT_SAMPLE_NAMES: readonly ReportSampleName[] = ['full', 'partial', 'sparse', 'empty'];

const SAMPLE_MODEL = 'sample-model';

async function build(collected: ReturnType<typeof makeCollectedFull>, fake: FakeAiOptions | null, neighbours: { prev: string | null; next: string | null }): Promise<WeeklyReportResponse> {
  const plan = buildReportPlan(collected, { showArticleSummary: true, entityMode: 'warn' });
  const ai = fake
    ? await summarizeReport('2026-10-19', plan, {
        client: makeFakeReportClient(fake).client as never,
        env: { WEEKLY_BRIEF_MODEL: SAMPLE_MODEL },
        getCreditInfo: async () => ({ monthlyLimitUsd: 50, currentMonthUsageUsd: 0 }),
        logUsage: async () => undefined,
        log: () => undefined,
      })
    : null;
  const result = finalizeReport(plan, ai?.ai ?? null, REPORT_NOW, { showArticleSummary: true });
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

export async function generateReportSamples(): Promise<Record<ReportSampleName, WeeklyReportResponse>> {
  return {
    // 모든 섹션이 가득 찬 ok
    full: await build(makeCollectedFull(), { rich: true }, { prev: '2026-10-12', next: null }),
    // 도메인 호출(B)이 실패해 도메인 서술만 규칙 문장인 partial
    partial: await build(makeCollectedFull(), { rich: true, fail: { B: 'throw' } }, { prev: '2026-10-12', next: '2026-10-26' }),
    // 영상 3건뿐인 희소한 주
    sparse: await build(makeCollectedSparse(), { rich: true }, { prev: null, next: null }),
    // 데이터 전무 (AI 호출 없음)
    empty: await build(makeCollectedEmpty(), null, { prev: null, next: null }),
  };
}

export const backendSamplesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'weekly-report-samples');
export const frontendSamplesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../frontend/src/lib/__fixtures__');

export function serializeSample(s: WeeklyReportResponse): string {
  return JSON.stringify(s, null, 2) + '\n';
}

async function main(): Promise<void> {
  const samples = await generateReportSamples();
  fs.mkdirSync(backendSamplesDir, { recursive: true });
  fs.mkdirSync(frontendSamplesDir, { recursive: true });
  for (const name of REPORT_SAMPLE_NAMES) {
    const text = serializeSample(samples[name]);
    fs.writeFileSync(path.join(backendSamplesDir, `${name}.json`), text);
    fs.writeFileSync(path.join(frontendSamplesDir, `weekly-report-${name}.json`), text);
    console.log(`wrote ${name} (${text.length} bytes)`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  void main();
}
