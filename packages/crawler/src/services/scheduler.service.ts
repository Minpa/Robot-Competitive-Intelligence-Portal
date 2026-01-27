import cron, { ScheduledTask } from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { crawlerService } from './crawler.service.js';
import type { CrawlSchedule } from '../types.js';

// Re-export TargetUrl for external use
export type { TargetUrl } from '../types.js';

export class SchedulerService {
  private schedules: Map<string, CrawlSchedule> = new Map();
  private tasks: Map<string, ScheduledTask> = new Map();
  private lastCrawledTimestamps: Map<string, Date> = new Map();

  /**
   * Schedule a recurring crawl job
   */
  scheduleJob(schedule: Omit<CrawlSchedule, 'id'>): string {
    const id = uuidv4();
    const fullSchedule: CrawlSchedule = {
      ...schedule,
      id,
      nextRun: this.getNextRunTime(schedule.cronExpression),
    };

    this.schedules.set(id, fullSchedule);

    if (schedule.enabled) {
      this.startScheduledTask(fullSchedule);
    }

    console.log(`[Scheduler] Job scheduled: ${schedule.name} (${schedule.cronExpression})`);
    return id;
  }

  /**
   * Update existing schedule
   */
  updateSchedule(scheduleId: string, updates: Partial<CrawlSchedule>): CrawlSchedule | null {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return null;

    const updated: CrawlSchedule = {
      ...schedule,
      ...updates,
      id: scheduleId,
    };

    // Stop existing task if running
    this.stopScheduledTask(scheduleId);

    // Update schedule
    this.schedules.set(scheduleId, updated);

    // Restart if enabled
    if (updated.enabled) {
      this.startScheduledTask(updated);
    }

    return updated;
  }

  /**
   * Remove a scheduled job
   */
  removeSchedule(scheduleId: string): boolean {
    this.stopScheduledTask(scheduleId);
    return this.schedules.delete(scheduleId);
  }

  /**
   * Get all scheduled jobs
   */
  listSchedules(): CrawlSchedule[] {
    return Array.from(this.schedules.values());
  }

  /**
   * Trigger immediate execution
   * Property 5: Incremental Crawl Timestamp Tracking
   */
  async triggerNow(scheduleId: string): Promise<string | null> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return null;

    console.log(`[Scheduler] Manual trigger for: ${schedule.name}`);

    const result = await this.executeSchedule(schedule);
    return result.jobId;
  }

  /**
   * Get last crawled timestamp for a URL
   */
  getLastCrawled(url: string): Date | undefined {
    return this.lastCrawledTimestamps.get(url);
  }

  /**
   * Start a scheduled task
   */
  private startScheduledTask(schedule: CrawlSchedule): void {
    const task = cron.schedule(schedule.cronExpression, async () => {
      console.log(`[Scheduler] Executing scheduled job: ${schedule.name}`);
      await this.executeSchedule(schedule);
    });

    this.tasks.set(schedule.id, task);
  }

  /**
   * Stop a scheduled task
   */
  private stopScheduledTask(scheduleId: string): void {
    const task = this.tasks.get(scheduleId);
    if (task) {
      task.stop();
      this.tasks.delete(scheduleId);
    }
  }

  /**
   * Execute a schedule
   */
  private async executeSchedule(schedule: CrawlSchedule) {
    const startTime = new Date();

    // Update last run time
    schedule.lastRun = startTime;
    schedule.nextRun = this.getNextRunTime(schedule.cronExpression);
    this.schedules.set(schedule.id, schedule);

    // Execute crawl job
    const result = await crawlerService.executeCrawlJob({
      targetUrls: schedule.targetUrls,
      rateLimit: {
        requestsPerMinute: 30,
        requestsPerHour: 500,
        delayBetweenRequests: 2000,
      },
      timeout: 30000,
      retryCount: 3,
    });

    // Update last crawled timestamps for successful URLs
    for (const item of result.collectedItems) {
      this.lastCrawledTimestamps.set(item.url, item.collectedAt);
    }

    return result;
  }

  /**
   * Calculate next run time from cron expression
   */
  private getNextRunTime(cronExpression: string): Date {
    // Simple approximation - in production use a proper cron parser
    const now = new Date();
    const parts = cronExpression.split(' ');

    // Default to next week for weekly jobs
    if (parts[4] === '0') {
      // Sunday
      const nextSunday = new Date(now);
      nextSunday.setDate(now.getDate() + (7 - now.getDay()));
      nextSunday.setHours(0, 0, 0, 0);
      return nextSunday;
    }

    // Default to tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }
}

export const schedulerService = new SchedulerService();
