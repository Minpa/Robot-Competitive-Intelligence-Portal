import { v4 as uuidv4 } from 'uuid';
import PQueue from 'p-queue';
import { HttpClient } from './http-client.js';
import { contentParser } from './content-parser.js';
import { robotsParser } from './robots-parser.js';
import type {
  CrawlJobConfig,
  CrawlResult,
  CrawlError,
  CollectedItem,
  TargetUrl,
  JobStatusInfo,
} from '../types.js';

export class CrawlerService {
  private jobs: Map<string, JobStatusInfo> = new Map();
  private httpClient: HttpClient;

  constructor() {
    this.httpClient = new HttpClient();
  }

  /**
   * Execute a crawl job for specified targets
   * Property 4: Crawl Job Resilience - continues on individual failures
   * robots.txt를 준수하여 크롤링합니다.
   */
  async executeCrawlJob(jobConfig: CrawlJobConfig): Promise<CrawlResult> {
    const jobId = uuidv4();
    const startedAt = new Date();

    // Initialize job status
    this.jobs.set(jobId, {
      jobId,
      status: 'running',
      progress: 0,
      startedAt,
    });

    const result: CrawlResult = {
      jobId,
      successCount: 0,
      failureCount: 0,
      duplicateCount: 0,
      skippedByRobots: 0, // robots.txt로 인해 건너뛴 URL 수
      errors: [],
      collectedItems: [],
    };

    // Set rate limit from config
    if (jobConfig.rateLimit) {
      this.httpClient.setRateLimit(jobConfig.rateLimit);
    }

    // Create queue for concurrent processing with rate limiting
    const queue = new PQueue({
      concurrency: 2,
      interval: jobConfig.rateLimit?.delayBetweenRequests || 2000,
      intervalCap: 1,
    });

    const totalUrls = jobConfig.targetUrls.length;
    let processedCount = 0;

    // Process each URL
    const tasks = jobConfig.targetUrls.map((target) =>
      queue.add(async () => {
        try {
          // robots.txt 사전 확인
          const robotsCheck = await robotsParser.isAllowed(target.url);
          
          if (!robotsCheck.allowed) {
            console.log(`[Crawler] Skipped (robots.txt): ${target.url} - ${robotsCheck.reason}`);
            result.skippedByRobots = (result.skippedByRobots || 0) + 1;
            return;
          }

          const item = await this.crawlUrl(target, jobConfig.timeout, jobConfig.retryCount);

          if (item) {
            result.collectedItems.push(item);
            result.successCount++;
          }
        } catch (error) {
          const errorMessage = (error as Error).message;
          
          // robots.txt 차단은 에러로 카운트하지 않음
          if (errorMessage.includes('Blocked by robots.txt')) {
            result.skippedByRobots = (result.skippedByRobots || 0) + 1;
            console.log(`[Crawler] Skipped (robots.txt): ${target.url}`);
            return;
          }

          const crawlError = this.createCrawlError(target.url, error as Error);
          result.errors.push(crawlError);
          result.failureCount++;

          console.error(`[Crawler] Failed to crawl ${target.url}: ${crawlError.message}`);
        } finally {
          processedCount++;
          this.updateJobProgress(jobId, processedCount / totalUrls);
        }
      })
    );

    // Wait for all tasks to complete
    await Promise.all(tasks);

    // Update job status
    this.jobs.set(jobId, {
      jobId,
      status: 'completed',
      progress: 1,
      startedAt,
      completedAt: new Date(),
      result,
    });

    console.log(
      `[Crawler] Job ${jobId} completed: ${result.successCount} success, ${result.failureCount} failures, ${result.skippedByRobots || 0} skipped by robots.txt`
    );

    return result;
  }

  /**
   * Crawl a single URL
   */
  private async crawlUrl(
    target: TargetUrl,
    _timeout: number,
    retryCount: number
  ): Promise<CollectedItem | null> {
    console.log(`[Crawler] Crawling: ${target.url}`);

    const html = await this.httpClient.fetch(target.url, retryCount);
    const item = contentParser.parse(html, target.url, target.pattern);

    return item;
  }

  /**
   * Create a CrawlError from an exception
   */
  private createCrawlError(url: string, error: Error): CrawlError {
    let errorType: CrawlError['errorType'] = 'network';

    if (error.message.includes('timeout')) {
      errorType = 'timeout';
    } else if (error.message.includes('rate limit') || error.message.includes('429')) {
      errorType = 'rate_limit';
    } else if (error.message.includes('parse') || error.message.includes('selector')) {
      errorType = 'parsing';
    }

    return {
      url,
      errorType,
      message: error.message,
      timestamp: new Date(),
    };
  }

  /**
   * Update job progress
   */
  private updateJobProgress(jobId: string, progress: number): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.progress = progress;
      this.jobs.set(jobId, job);
    }
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): JobStatusInfo | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Cancel a running job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'running') {
      job.status = 'cancelled';
      this.jobs.set(jobId, job);
      return true;
    }
    return false;
  }

  /**
   * List all jobs
   */
  listJobs(): JobStatusInfo[] {
    return Array.from(this.jobs.values());
  }
}

export const crawlerService = new CrawlerService();
