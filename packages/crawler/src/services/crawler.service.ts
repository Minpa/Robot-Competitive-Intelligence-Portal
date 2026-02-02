import { v4 as uuidv4 } from 'uuid';
import PQueue from 'p-queue';
import { HttpClient } from './http-client.js';
import { contentParser } from './content-parser.js';
import { robotsParser } from './robots-parser.js';
import { isWhitelisted } from './whitelist.js';
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
   * 
   * 법적 안전성을 위한 3단계 검증:
   * 1. 화이트리스트 확인 (공식 언론사/합법 사이트만)
   * 2. robots.txt 준수
   * 3. Rate limiting
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
      skippedByRobots: 0,
      skippedByWhitelist: 0, // 화이트리스트 미포함으로 건너뛴 URL
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
          // 1단계: 화이트리스트 확인
          const whitelistCheck = isWhitelisted(target.url);
          if (!whitelistCheck.allowed) {
            console.log(`[Crawler] Skipped (not whitelisted): ${target.url} - ${whitelistCheck.reason}`);
            result.skippedByWhitelist = (result.skippedByWhitelist || 0) + 1;
            return;
          }

          // 2단계: robots.txt 확인
          const robotsCheck = await robotsParser.isAllowed(target.url);
          if (!robotsCheck.allowed) {
            console.log(`[Crawler] Skipped (robots.txt): ${target.url} - ${robotsCheck.reason}`);
            result.skippedByRobots = (result.skippedByRobots || 0) + 1;
            return;
          }

          // 3단계: 크롤링 실행
          const item = await this.crawlUrl(target, jobConfig.timeout, jobConfig.retryCount);

          if (item) {
            result.collectedItems.push(item);
            result.successCount++;
          }
        } catch (error) {
          const errorMessage = (error as Error).message;
          
          if (errorMessage.includes('Blocked by robots.txt')) {
            result.skippedByRobots = (result.skippedByRobots || 0) + 1;
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
      `[Crawler] Job ${jobId} completed: ${result.successCount} success, ${result.failureCount} failures, ` +
      `${result.skippedByRobots || 0} blocked by robots.txt, ${result.skippedByWhitelist || 0} not whitelisted`
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
