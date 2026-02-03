import Fastify from 'fastify';
import { crawlerService } from './services/crawler.service.js';
import { schedulerService } from './services/scheduler.service.js';
import { errorLogger } from './services/error-logger.js';
import { legalDataCollector } from './services/legal-data-collector.js';
import type { CrawlJobConfig, TargetUrl } from './types.js';

const fastify = Fastify({ logger: true });

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', service: 'crawler', timestamp: new Date().toISOString() };
});

// Execute crawl job
fastify.post<{ Body: CrawlJobConfig }>('/crawl', async (request, reply) => {
  try {
    const result = await crawlerService.executeCrawlJob(request.body);

    // Log any errors
    if (result.errors.length > 0) {
      errorLogger.logJobErrors(result.errors, result.jobId);
    }

    return result;
  } catch (error) {
    reply.status(500).send({ error: (error as Error).message });
  }
});

// Get job status
fastify.get<{ Params: { jobId: string } }>('/jobs/:jobId', async (request, reply) => {
  const status = crawlerService.getJobStatus(request.params.jobId);
  if (!status) {
    reply.status(404).send({ error: 'Job not found' });
    return;
  }
  return status;
});

// List all jobs
fastify.get('/jobs', async () => {
  return crawlerService.listJobs();
});

// Schedule management
fastify.post<{
  Body: { name: string; cronExpression: string; targetUrls: TargetUrl[]; enabled?: boolean };
}>('/schedules', async (request) => {
  const id = schedulerService.scheduleJob({
    name: request.body.name,
    cronExpression: request.body.cronExpression,
    targetUrls: request.body.targetUrls,
    enabled: request.body.enabled ?? true,
  });
  return { id, message: 'Schedule created' };
});

fastify.get('/schedules', async () => {
  return schedulerService.listSchedules();
});

fastify.post<{ Params: { scheduleId: string } }>(
  '/schedules/:scheduleId/trigger',
  async (request, reply) => {
    const jobId = await schedulerService.triggerNow(request.params.scheduleId);
    if (!jobId) {
      reply.status(404).send({ error: 'Schedule not found' });
      return;
    }
    return { jobId, message: 'Job triggered' };
  }
);

fastify.delete<{ Params: { scheduleId: string } }>(
  '/schedules/:scheduleId',
  async (request, reply) => {
    const removed = schedulerService.removeSchedule(request.params.scheduleId);
    if (!removed) {
      reply.status(404).send({ error: 'Schedule not found' });
      return;
    }
    return { message: 'Schedule removed' };
  }
);

// Error logs
fastify.get<{
  Querystring: { jobId?: string; errorType?: string; limit?: string };
}>('/errors', async (request) => {
  return errorLogger.getErrors({
    jobId: request.query.jobId,
    errorType: request.query.errorType as any,
    limit: request.query.limit ? parseInt(request.query.limit) : 100,
  });
});

fastify.get('/errors/stats', async () => {
  return errorLogger.getStats();
});

// 합법적 데이터 수집 API
fastify.post('/legal/collect-public-data', async () => legalDataCollector.collectAll());
fastify.post('/legal/arxiv', async () => legalDataCollector.collectArxiv());
fastify.post('/legal/github', async () => legalDataCollector.collectGitHub());
fastify.post('/legal/sec-edgar', async () => legalDataCollector.collectSecEdgar());
fastify.post('/legal/patents', async () => legalDataCollector.collectPatents());

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.CRAWLER_PORT || '3003', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Crawler service running on port ${port}`);

    // 크롤러 비활성화 - 법적 검토 완료 후 활성화
    console.log('[Crawler] Auto-crawler is DISABLED for legal review');
    // if (process.env.DATABASE_URL) {
    //   console.log('DATABASE_URL found, initializing auto-crawler...');
    //   await autoCrawlerService.initialize();
    // } else {
    //   console.log('DATABASE_URL not set, auto-crawler disabled');
    // }
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

export { crawlerService, schedulerService, errorLogger };
export * from './types.js';
