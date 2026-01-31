import cron, { ScheduledTask } from 'node-cron';
import { eq } from 'drizzle-orm';
import { getDb, crawlTargets, articles, crawlJobs } from '../db/index.js';
import { crawlerService } from './crawler.service.js';
import { analyzeArticle } from './ai-analyzer.service.js';
import { createHash } from 'crypto';
import type { TargetUrl } from '../types.js';

export class AutoCrawlerService {
  private tasks: Map<string, ScheduledTask> = new Map();
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('[AutoCrawler] Initializing...');

    try {
      const db = getDb();
      const targets = await db
        .select()
        .from(crawlTargets)
        .where(eq(crawlTargets.enabled, true));

      console.log(`[AutoCrawler] Found ${targets.length} enabled crawl targets`);

      for (const target of targets) {
        this.scheduleTarget(target);
      }

      setTimeout(() => {
        this.runInitialCrawl();
      }, 30000);

      this.isInitialized = true;
      console.log('[AutoCrawler] Initialization complete');
    } catch (error) {
      console.error('[AutoCrawler] Failed to initialize:', error);
    }
  }

  private scheduleTarget(target: typeof crawlTargets.$inferSelect): void {
    const cronExpr = target.cronExpression || '0 0 * * *';

    try {
      const task = cron.schedule(cronExpr, async () => {
        console.log(`[AutoCrawler] Running scheduled crawl for: ${target.domain}`);
        await this.crawlTarget(target);
      });

      this.tasks.set(target.id, task);
      console.log(`[AutoCrawler] Scheduled: ${target.domain} (${cronExpr})`);
    } catch (error) {
      console.error(`[AutoCrawler] Failed to schedule ${target.domain}:`, error);
    }
  }

  private async runInitialCrawl(): Promise<void> {
    console.log('[AutoCrawler] Starting initial crawl...');

    try {
      const db = getDb();
      const targets = await db
        .select()
        .from(crawlTargets)
        .where(eq(crawlTargets.enabled, true));

      const testTargets = targets.slice(0, 3);

      for (const target of testTargets) {
        await this.crawlTarget(target);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      console.log('[AutoCrawler] Initial crawl complete');
    } catch (error) {
      console.error('[AutoCrawler] Initial crawl failed:', error);
    }
  }

  async crawlTarget(target: typeof crawlTargets.$inferSelect): Promise<void> {
    const db = getDb();
    const urls = target.urls || [];
    const patterns = target.patterns || [];

    if (urls.length === 0) {
      console.log(`[AutoCrawler] No URLs for ${target.domain}, skipping`);
      return;
    }

    const targetUrls: TargetUrl[] = urls.map((url) => ({
      url,
      domain: target.domain,
      pattern: patterns[0] || {
        type: 'article' as const,
        selectors: { title: 'h1', content: 'article', publishDate: 'time' },
      },
    }));

    const [job] = await db
      .insert(crawlJobs)
      .values({
        targetId: target.id,
        status: 'running',
        startedAt: new Date(),
      })
      .returning();

    try {
      const result = await crawlerService.executeCrawlJob({
        targetUrls,
        rateLimit: target.rateLimit || {
          requestsPerMinute: 10,
          requestsPerHour: 100,
          delayBetweenRequests: 3000,
        },
        timeout: 30000,
        retryCount: 2,
      });

      let savedCount = 0;
      for (const item of result.collectedItems) {
        try {
          const contentHash = createHash('sha256')
            .update(item.url + item.title)
            .digest('hex');

          // AI 분석: 요약 및 카테고리 분류
          const analysis = await analyzeArticle(
            item.title || 'Untitled',
            item.content || ''
          );

          await db
            .insert(articles)
            .values({
              title: item.title || 'Untitled',
              source: target.domain,
              url: item.url,
              content: item.content,
              summary: analysis.summary,
              category: analysis.category,
              contentHash,
              collectedAt: new Date(),
            })
            .onConflictDoNothing();

          savedCount++;
        } catch (err) {
          // Skip duplicates
        }
      }

      await db
        .update(crawlJobs)
        .set({
          status: 'completed',
          completedAt: new Date(),
          successCount: result.successCount,
          failureCount: result.failureCount,
        })
        .where(eq(crawlJobs.id, job!.id));

      await db
        .update(crawlTargets)
        .set({ lastCrawled: new Date() })
        .where(eq(crawlTargets.id, target.id));

      console.log(
        `[AutoCrawler] ${target.domain}: ${result.successCount} success, ${savedCount} saved, ${result.failureCount} failed`
      );
    } catch (error) {
      await db
        .update(crawlJobs)
        .set({
          status: 'failed',
          completedAt: new Date(),
        })
        .where(eq(crawlJobs.id, job!.id));

      console.error(`[AutoCrawler] Failed to crawl ${target.domain}:`, error);
    }
  }

  stop(): void {
    for (const [id, task] of this.tasks) {
      task.stop();
      console.log(`[AutoCrawler] Stopped task: ${id}`);
    }
    this.tasks.clear();
  }
}

export const autoCrawlerService = new AutoCrawlerService();
