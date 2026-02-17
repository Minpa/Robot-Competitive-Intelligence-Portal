/**
 * PipelineLogger - 파이프라인 실행 로깅 서비스
 * 
 * pipeline_runs, pipeline_step_logs 테이블에 기록
 * startRun, startStep, completeStep, failStep, getSummary 메서드
 */

import { db, pipelineRuns, pipelineStepLogs } from '../db/index.js';
import { eq, and } from 'drizzle-orm';

export interface PipelineStepLog {
  stepName: string;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  inputCount: number;
  successCount: number;
  failureCount: number;
  error?: { message: string; stack?: string };
}

export interface PipelineRunSummary {
  runId: string;
  startedAt: Date;
  completedAt: Date;
  totalDurationMs: number;
  steps: PipelineStepLog[];
  status: 'success' | 'partial_failure' | 'failure';
}

export class PipelineLogger {
  /**
   * 새 파이프라인 실행 시작
   */
  async startRun(triggeredBy?: string): Promise<string> {
    const [run] = await db.insert(pipelineRuns).values({
      status: 'running',
      triggeredBy: triggeredBy || null,
    }).returning({ id: pipelineRuns.id });
    return run!.id;
  }

  /**
   * 파이프라인 단계 시작
   */
  async startStep(runId: string, stepName: string, inputCount: number): Promise<void> {
    await db.insert(pipelineStepLogs).values({
      runId,
      stepName,
      inputCount,
    });
  }

  /**
   * 파이프라인 단계 완료
   */
  async completeStep(runId: string, stepName: string, successCount: number, failureCount: number): Promise<void> {
    const now = new Date();
    const [step] = await db
      .select({ id: pipelineStepLogs.id, startedAt: pipelineStepLogs.startedAt })
      .from(pipelineStepLogs)
      .where(and(eq(pipelineStepLogs.runId, runId), eq(pipelineStepLogs.stepName, stepName)))
      .limit(1);

    if (step) {
      const durationMs = now.getTime() - new Date(step.startedAt).getTime();
      await db.update(pipelineStepLogs)
        .set({ completedAt: now, durationMs, successCount, failureCount })
        .where(eq(pipelineStepLogs.id, step.id));
    }
  }

  /**
   * 파이프라인 단계 실패
   */
  async failStep(runId: string, stepName: string, error: Error): Promise<void> {
    const now = new Date();
    const [step] = await db
      .select({ id: pipelineStepLogs.id, startedAt: pipelineStepLogs.startedAt })
      .from(pipelineStepLogs)
      .where(and(eq(pipelineStepLogs.runId, runId), eq(pipelineStepLogs.stepName, stepName)))
      .limit(1);

    if (step) {
      const durationMs = now.getTime() - new Date(step.startedAt).getTime();
      await db.update(pipelineStepLogs)
        .set({
          completedAt: now,
          durationMs,
          failureCount: 1,
          errorMessage: error.message,
          errorStack: error.stack || null,
        })
        .where(eq(pipelineStepLogs.id, step.id));
    }
  }

  /**
   * 파이프라인 실행 완료 및 요약 반환
   */
  async getSummary(runId: string): Promise<PipelineRunSummary> {
    const [runRow] = await db.select().from(pipelineRuns).where(eq(pipelineRuns.id, runId));
    const steps = await db.select().from(pipelineStepLogs).where(eq(pipelineStepLogs.runId, runId));

    const now = new Date();
    const startedAt = runRow ? new Date(runRow.startedAt) : now;
    const totalDurationMs = now.getTime() - startedAt.getTime();

    // 상태 결정
    const hasFailure = steps.some(s => s.errorMessage);
    const allFailed = steps.length > 0 && steps.every(s => s.errorMessage);
    let status: PipelineRunSummary['status'] = 'success';
    if (allFailed) status = 'failure';
    else if (hasFailure) status = 'partial_failure';

    // 실행 완료 업데이트
    await db.update(pipelineRuns)
      .set({ status, completedAt: now, totalDurationMs })
      .where(eq(pipelineRuns.id, runId));

    return {
      runId,
      startedAt,
      completedAt: now,
      totalDurationMs,
      steps: steps.map(s => ({
        stepName: s.stepName,
        startedAt: new Date(s.startedAt),
        completedAt: s.completedAt ? new Date(s.completedAt) : undefined,
        durationMs: s.durationMs || undefined,
        inputCount: s.inputCount || 0,
        successCount: s.successCount || 0,
        failureCount: s.failureCount || 0,
        error: s.errorMessage ? { message: s.errorMessage, stack: s.errorStack || undefined } : undefined,
      })),
      status,
    };
  }
}

export const pipelineLogger = new PipelineLogger();
