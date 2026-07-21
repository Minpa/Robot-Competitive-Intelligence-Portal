import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { registerRoutes } from './routes/index.js';
import { aiUsageService } from './services/ai-usage.service.js';
import { fixSocPowerConsumption } from './db/fix-soc-startup.js';
import { ciUpdateService } from './services/ci-update.service.js';
import { benchmarkService } from './services/benchmark.service.js';
import { seedCiData } from './db/seed-ci.js';
import { dataGeneratorService } from './services/data-generator.service.js';
import { coverageFieldService } from './services/coverage-field.service.js';
import { handBenchmarkService } from './services/hand-benchmark.service.js';
import { schedulerService } from './services/scheduler.service.js';

const fastify = Fastify({
  logger: true,
});

// File uploads (used for Excel import, etc.)
fastify.register(multipart, {
  attachFieldsToBody: true,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max
  },
});

// Allow empty body for POST requests
fastify.addContentTypeParser('application/json', { parseAs: 'string' }, function (_req, body, done) {
  try {
    const json = body ? JSON.parse(body as string) : {};
    done(null, json);
  } catch (err) {
    done(err as Error, undefined);
  }
});

fastify.register(cors, {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// Register API routes
registerRoutes(fastify);

fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001', 10);
    await aiUsageService.ensureTable();
    await fixSocPowerConsumption();
    await ciUpdateService.ensureTables();
    await benchmarkService.ensureTables();
    await seedCiData();
    await coverageFieldService.ensureTables();
    const cfs = await coverageFieldService.seedFromFiles().catch((err) => {
      console.warn('[CoverageField] seed 실패:', err?.message ?? err);
      return null;
    });
    if (cfs && (cfs.inserted > 0 || cfs.skipped > 0)) {
      console.log(`[CoverageField] ${cfs.files} file(s), inserted ${cfs.inserted}, skipped ${cfs.skipped}`);
    }
    await handBenchmarkService.ensureTables();
    const hbs = await handBenchmarkService.seedFromFile().catch((err) => {
      console.warn('[HandBenchmark] seed 실패:', err?.message ?? err);
      return null;
    });
    if (hbs && (hbs.axes > 0 || hbs.competitors > 0 || hbs.scores > 0)) {
      console.log(`[HandBenchmark] axes +${hbs.axes}, hands +${hbs.competitors}, scores +${hbs.scores} (${hbs.files} file)`);
    }
    const staleJobs = await dataGeneratorService.reconcileStaleJobs().catch(() => 0);
    if (staleJobs > 0) console.log(`[DataGenerator] Reconciled ${staleJobs} stale job(s) as failed`);
    const fabricated = await dataGeneratorService.cleanupFabricatedRobots().catch(() => null);
    if (fabricated && fabricated.deleted > 0) {
      console.log(`[DataGenerator] Removed ${fabricated.deleted} fabricated robot(s): ${fabricated.names.join(', ')}`);
    }
    const countries = await dataGeneratorService.fixCompanyCountries().catch(() => null);
    if (countries && countries.updated > 0) {
      console.log(`[DataGenerator] Fixed ${countries.updated} company country(ies):`, countries.changes.slice(0, 10));
    }
    const citations = await dataGeneratorService.cleanupCitationTags().catch(() => null);
    if (citations && (citations.humanoidRobots + citations.companies + citations.articles) > 0) {
      console.log(`[DataGenerator] Stripped citation/HTML tags from:`, citations);
    }
    const quarters = await dataGeneratorService.fixRobotQuarters().catch(() => null);
    if (quarters && quarters.updated > 0) {
      console.log(`[DataGenerator] Fixed ${quarters.updated} robot quarter(s):`, quarters.changes);
    }
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Backend server running on port ${port}`);

    // 주간 자동화(스코어링/감사/브리핑) + 일일 영상 태깅 크론 가동 — DISABLE_SCHEDULER=true로 비활성화 가능
    if (process.env.DISABLE_SCHEDULER !== 'true') {
      schedulerService.init();

      // 기동 60초 후 미태깅 영상 태깅 1회 실행 (배포 직후 백로그 해소용, 멱등)
      if (process.env.TAG_VIDEOS_ON_STARTUP !== 'false') {
        setTimeout(() => {
          import('./services/video-tagging.service.js')
            .then(({ videoTaggingService }) => videoTaggingService.run(200))
            .then((r) => console.log('[VideoTagging] Startup run done:', JSON.stringify(r)))
            .catch((err) => console.error('[VideoTagging] Startup run failed:', err));
        }, 60_000);
        console.log('[VideoTagging] Startup run scheduled in 60s');
      }
    } else {
      console.log('[Scheduler] Disabled via DISABLE_SCHEDULER env');
    }
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
