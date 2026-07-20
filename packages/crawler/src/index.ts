import Fastify from 'fastify';
import cron from 'node-cron';
import { crawlerService } from './services/crawler.service.js';
import { schedulerService } from './services/scheduler.service.js';
import { errorLogger } from './services/error-logger.js';
import { legalDataCollector } from './services/legal-data-collector.js';
import { youtubeCollectorService } from './services/youtube-collector.service.js';
import type { CrawlJobConfig, TargetUrl } from './types.js';

const fastify = Fastify({ 
  logger: true,
  // Allow empty body for POST requests
  bodyLimit: 1048576,
});

// Add content type parser to allow empty body
fastify.addContentTypeParser('application/json', { parseAs: 'string' }, function (_req, body, done) {
  try {
    const json = body ? JSON.parse(body as string) : {};
    done(null, json);
  } catch (err) {
    done(err as Error, undefined);
  }
});

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', service: 'crawler', timestamp: new Date().toISOString() };
});

// ============================================================
// HTML 크롤링 관련 엔드포인트 — 법무 검토 전까지 봉인
// ENABLE_HTML_CRAWLER=true 를 명시적으로 설정한 경우에만 노출된다.
// (과거 법적 리스크로 크롤러 서비스를 내린 이력에 따른 안전장치.
//  이 게이트가 꺼져 있으면 배포된 서비스는 공식 API/RSS 수집(/legal/*)만 가능)
// ============================================================
const HTML_CRAWLER_ENABLED = process.env.ENABLE_HTML_CRAWLER === 'true';

if (HTML_CRAWLER_ENABLED) {
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
} // end HTML_CRAWLER_ENABLED gate

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
fastify.post('/legal/youtube', async () => youtubeCollectorService.collect());

// Start server
const start = async () => {
  try {
    // Railway 등 PaaS는 PORT를 주입하므로 CRAWLER_PORT → PORT → 3003 순으로 사용
    const port = parseInt(process.env.CRAWLER_PORT || process.env.PORT || '3003', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Crawler service running on port ${port}`);

    // 크롤러 비활성화 - 법적 검토 완료 후 활성화
    console.log('[Crawler] Auto-crawler is DISABLED for legal review');
    console.log(
      HTML_CRAWLER_ENABLED
        ? '[Crawler] WARNING: HTML crawler endpoints are ENABLED (ENABLE_HTML_CRAWLER=true)'
        : '[Crawler] Legal-safe mode: HTML crawler endpoints sealed — only official API/RSS collection (/legal/*) available'
    );
    // if (process.env.DATABASE_URL) {
    //   console.log('DATABASE_URL found, initializing auto-crawler...');
    //   await autoCrawlerService.initialize();
    // } else {
    //   console.log('DATABASE_URL not set, auto-crawler disabled');
    // }

    // 합법 데이터 수집기(공식 API: arXiv/GitHub/SEC/USPTO) 일일 크론
    // HTML 크롤러와 달리 공식 공개 API만 사용하므로 법적 검토 대상이 아님.
    // LEGAL_COLLECT_CRON으로 스케줄 변경, DISABLE_LEGAL_COLLECT=true로 비활성화.
    if (process.env.DATABASE_URL && process.env.DISABLE_LEGAL_COLLECT !== 'true') {
      const schedule = process.env.LEGAL_COLLECT_CRON || '0 3 * * *'; // 매일 03:00 KST
      cron.schedule(schedule, async () => {
        console.log('[LegalCollector] Daily collection starting...');
        try {
          const result = await legalDataCollector.collectAll();
          console.log('[LegalCollector] Daily collection done:', JSON.stringify(result));
        } catch (err) {
          console.error('[LegalCollector] Daily collection failed:', err);
        }
        try {
          await youtubeCollectorService.collect(); // 공식 채널 데모 영상 (채널 RSS)
        } catch (err) {
          console.error('[YouTube] Daily collection failed:', err);
        }
      }, { scheduled: true, timezone: 'Asia/Seoul' });
      console.log(`[LegalCollector] Daily cron scheduled (${schedule}, Asia/Seoul)`);
    } else {
      console.log('[LegalCollector] Cron disabled (no DATABASE_URL or DISABLE_LEGAL_COLLECT=true)');
    }
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

export { crawlerService, schedulerService, errorLogger };
export * from './types.js';
