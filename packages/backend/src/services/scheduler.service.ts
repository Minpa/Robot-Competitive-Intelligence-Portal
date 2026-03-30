/**
 * SchedulerService - 주기적 자동화 스케줄러
 *
 * node-cron 기반으로 스코어링, 데이터 감사, 전략 브리핑을
 * 주간 자동 실행한다. 서버 시작 시 미실행 작업 보충 실행.
 */

import cron from 'node-cron';
import { desc, eq } from 'drizzle-orm';
import { db, pipelineRuns, pipelineStepLogs } from '../db/index.js';
import { scoringPipelineService } from './scoring-pipeline.service.js';
import { dataAuditService } from './data-audit.service.js';
import { strategicAIAgentService } from './strategic-ai-agent.service.js';
import { warRoomLgRobotService } from './war-room-lg-robot.service.js';

// ── Types ──

interface ScheduledTask {
  name: string;
  label: string;
  cron: string;
  lastRun: Date | null;
  nextRun: Date | null;
  isRunning: boolean;
  job: cron.ScheduledTask | null;
}

export interface SchedulerStatus {
  tasks: {
    name: string;
    label: string;
    cron: string;
    lastRun: string | null;
    nextRun: string | null;
    isRunning: boolean;
  }[];
}

export interface PipelineHistoryEntry {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  totalDurationMs: number | null;
  steps: {
    stepName: string;
    status: string;
    durationMs: number | null;
    successCount: number | null;
    failureCount: number | null;
    errorMessage: string | null;
  }[];
}

// ── Default schedules (env-overridable) ──

const SCHEDULE_SCORING = process.env.CRON_SCORING || '0 2 * * 1';       // Mon 02:00
const SCHEDULE_AUDIT = process.env.CRON_AUDIT || '0 3 * * 1';           // Mon 03:00
const SCHEDULE_BRIEFING = process.env.CRON_BRIEFING || '0 4 * * 1';     // Mon 04:00

class SchedulerService {
  private tasks: Map<string, ScheduledTask> = new Map();
  private initialized = false;

  /**
   * Initialize scheduler — call once after server starts
   */
  init() {
    if (this.initialized) return;
    this.initialized = true;

    // Register tasks
    this.registerTask('scoring', '스코어링 파이프라인', SCHEDULE_SCORING, () => this.runScoring());
    this.registerTask('audit', '데이터 감사', SCHEDULE_AUDIT, () => this.runAudit());
    this.registerTask('briefing', '전략 AI 브리핑', SCHEDULE_BRIEFING, () => this.runBriefing());

    console.log('[Scheduler] Initialized with 3 tasks');
  }

  private registerTask(name: string, label: string, cronExpr: string, handler: () => Promise<void>) {
    const job = cron.schedule(cronExpr, async () => {
      const task = this.tasks.get(name);
      if (!task || task.isRunning) return;

      task.isRunning = true;
      console.log(`[Scheduler] Starting task: ${name}`);
      try {
        await handler();
        task.lastRun = new Date();
        console.log(`[Scheduler] Completed task: ${name}`);
      } catch (err) {
        console.error(`[Scheduler] Task failed: ${name}`, err);
      } finally {
        task.isRunning = false;
      }
    }, { scheduled: true, timezone: 'Asia/Seoul' });

    this.tasks.set(name, {
      name,
      label,
      cron: cronExpr,
      lastRun: null,
      nextRun: null,
      isRunning: false,
      job,
    });
  }

  /**
   * Manually trigger a task by name
   */
  async trigger(taskName: string): Promise<{ success: boolean; message: string }> {
    const task = this.tasks.get(taskName);
    if (!task) {
      return { success: false, message: `Unknown task: ${taskName}` };
    }
    if (task.isRunning) {
      return { success: false, message: `Task ${taskName} is already running` };
    }

    task.isRunning = true;
    // Run async — don't await so the API responds immediately
    const run = async () => {
      try {
        switch (taskName) {
          case 'scoring': await this.runScoring(); break;
          case 'audit': await this.runAudit(); break;
          case 'briefing': await this.runBriefing(); break;
        }
        task.lastRun = new Date();
      } catch (err) {
        console.error(`[Scheduler] Manual trigger failed: ${taskName}`, err);
      } finally {
        task.isRunning = false;
      }
    };
    run().catch(() => {});

    return { success: true, message: `Task ${taskName} triggered` };
  }

  /**
   * Get status of all scheduled tasks
   */
  getStatus(): SchedulerStatus {
    const tasks = Array.from(this.tasks.values()).map(t => ({
      name: t.name,
      label: t.label,
      cron: t.cron,
      lastRun: t.lastRun?.toISOString() || null,
      nextRun: null as string | null,
      isRunning: t.isRunning,
    }));
    return { tasks };
  }

  /**
   * Get recent pipeline execution history
   */
  async getPipelineHistory(limit = 20): Promise<PipelineHistoryEntry[]> {
    const runs = await db
      .select()
      .from(pipelineRuns)
      .orderBy(desc(pipelineRuns.startedAt))
      .limit(limit);

    const entries: PipelineHistoryEntry[] = [];

    for (const run of runs) {
      const steps = await db
        .select({
          stepName: pipelineStepLogs.stepName,
          completedAt: pipelineStepLogs.completedAt,
          durationMs: pipelineStepLogs.durationMs,
          successCount: pipelineStepLogs.successCount,
          failureCount: pipelineStepLogs.failureCount,
          errorMessage: pipelineStepLogs.errorMessage,
        })
        .from(pipelineStepLogs)
        .where(eq(pipelineStepLogs.runId, run.id));

      entries.push({
        id: run.id,
        status: run.status,
        startedAt: run.startedAt.toISOString(),
        completedAt: run.completedAt?.toISOString() || null,
        totalDurationMs: run.totalDurationMs,
        steps: steps.map(s => ({
          stepName: s.stepName,
          status: s.completedAt ? (s.errorMessage ? 'error' : 'success') : 'running',
          durationMs: s.durationMs,
          successCount: s.successCount,
          failureCount: s.failureCount,
          errorMessage: s.errorMessage,
        })),
      });
    }

    return entries;
  }

  // ── Task Implementations ──

  private async runScoring() {
    await scoringPipelineService.runFullPipeline('scheduler');
  }

  private async runAudit() {
    await dataAuditService.runFullAudit();
  }

  private async runBriefing() {
    try {
      const lgRobots = await warRoomLgRobotService.getLgRobots();
      for (const robot of lgRobots) {
        await strategicAIAgentService.generateBriefing(robot.id, 'scheduled');
      }
    } catch (err) {
      console.error('[Scheduler] Briefing generation failed:', err);
    }
  }
}

export const schedulerService = new SchedulerService();
