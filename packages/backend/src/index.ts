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
import { dataMigrationService } from './services/data-migration.service.js';
import { autoApplyActuatorData } from './services/actuator-auto-apply.service.js';
import { ensureActuatorSourcingTables } from './db/actuator-sourcing.ddl.js';
import { ensureWeeklyBriefTables } from './db/weekly-brief.ddl.js';
import { ensureArgosIExportTables } from './db/argos-i-export.ddl.js';
import {
  WEEKLY_BRIEF_TASK_NAME,
  isStartupWeeklyBriefEnabled,
  resolveWeeklyBriefStartupDelayMs,
  runStartupWeeklyBriefIfDue,
  setWeeklyBriefSuccessHook,
} from './services/weekly-brief.service.js';
import { regenerateAfterWeeklyBrief, runStartupArgosIExportIfDue } from './services/argos-i-export.service.js';
import {
  ARGOS_I_EXPORT_TASK_NAME,
  isArgosITokenConfigured,
  isArgosITokenTooShort,
  isStartupArgosIExportEnabled,
  redactArgosIQuery,
  resolveArgosIStartupDelayMs,
} from './services/argos-i-export-config.js';
import {
  PIPELINE_TASK_NAME,
  isStartupPipelineEnabled,
  resolveStartupDelayMs,
  runStartupPipelineIfDue,
  setStartupChainRunning,
} from './services/tech-trend-pipeline.service.js';

const fastify = Fastify({
  logger: {
    serializers: {
      // 기본 req 직렬화와 같은 필드. ARGOS_I 경로만 URL 의 쿼리 문자열을 가린다 (?token= 등이 로그에 남지 않게).
      req(request) {
        return {
          method: request.method,
          url: redactArgosIQuery(request.url),
          hostname: request.hostname,
          remoteAddress: request.ip,
          remotePort: request.socket?.remotePort,
        };
      },
    },
  },
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
    // 데이터 적용/작업 완료 마커 테이블 (ci_layers 시드 이후). 실패해도 기동은 계속한다
    await dataMigrationService.ensureTable().catch((err) => {
      console.warn('[DataMigrations] ensureTable 실패:', err?.message ?? err);
    });
    // 액추에이터 조달 태세·수요 사례 테이블 (humanoid_robots 이후). 실패해도 기동은 계속한다
    await ensureActuatorSourcingTables().catch((err) => {
      console.warn('[ActuatorSourcing] ensureTables 실패:', err?.message ?? err);
    });
    // 주간 브리프 테이블 (실패해도 기동은 계속한다 — 수동 생성/조회만 영향)
    await ensureWeeklyBriefTables().catch((err) => {
      console.warn('[WeeklyBrief] ensureTables 실패:', err?.message ?? err);
    });
    // ARGOS_I 일일 스냅샷 테이블 (실패해도 기동은 계속한다 — 생성/다운로드만 영향)
    await ensureArgosIExportTables().catch((err) => {
      console.warn('[ArgosIExport] ensureTables 실패:', err?.message ?? err);
    });
    if (isArgosITokenTooShort()) console.warn('[ArgosIExport] warn=token_too_short minLength=32');
    else if (!isArgosITokenConfigured()) console.log('[ArgosIExport] token=not_configured api=disabled');
    // 주간 브리프 성공 직후 당일 번들을 재생성한다 (PM 결정: 월요일 브리프를 같은 날 번들에 반영). 순환 import 를 피하려고 여기서 연결한다
    setWeeklyBriefSuccessHook(() => {
      void regenerateAfterWeeklyBrief();
    });
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
    if (hbs && (hbs.axes > 0 || hbs.competitors > 0 || hbs.scores > 0 || hbs.updated)) {
      const upd = hbs.updated ? `, updated hands ${hbs.updated.competitors}/scores ${hbs.updated.scores}` : '';
      console.log(`[HandBenchmark] axes +${hbs.axes}, hands +${hbs.competitors}, scores +${hbs.scores}${upd} (${hbs.files} file)`);
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

    // 액추에이터 데이터 자동 적용 — listen 이후 비동기(헬스체크를 막지 않음). ACTUATOR_DATA_AUTO_APPLY 로만 제어(스케줄러 설정과 무관)
    setTimeout(() => void autoApplyActuatorData(), 5_000);

    // 주간 자동화(스코어링/감사/브리핑) + 일일 영상 태깅 크론 가동 — DISABLE_SCHEDULER=true로 비활성화 가능
    if (process.env.DISABLE_SCHEDULER !== 'true') {
      schedulerService.init();

      // 기동 60초 후 미태깅 영상 태깅 1회 실행 (배포 직후 백로그 해소용, 멱등)
      if (process.env.TAG_VIDEOS_ON_STARTUP !== 'false') {
        setTimeout(() => {
          setStartupChainRunning(true);
          import('./services/video-tagging.service.js')
            .then(({ videoTaggingService }) => videoTaggingService.run(1500))
            .then((r) => console.log('[VideoTagging] Startup run done:', JSON.stringify(r)))
            .then(() => import('./services/video-db-sync.service.js'))
            .then(({ videoDbSyncService }) => videoDbSyncService.run())
            .then((r) => console.log('[VideoDbSync] Startup run done:', JSON.stringify(r)))
            .then(() => import('./services/spec-enrichment.service.js'))
            .then(({ specEnrichmentService }) => specEnrichmentService.run())
            .then((r) => console.log('[SpecEnrich] Startup run done:', JSON.stringify(r)))
            .then(() => import('./services/paper-summary.service.js'))
            .then(({ paperSummaryService }) => paperSummaryService.run(1500))
            .then((r) => console.log('[PaperSummary] Startup run done:', JSON.stringify(r)))
            .then(() => import('./services/application-case-extraction.service.js'))
            .then(({ applicationCaseExtractionService }) => applicationCaseExtractionService.run(500))
            .then((r) => console.log('[AppCaseExtract] Startup run done:', JSON.stringify(r)))
            .then(() => import('./services/video-content-analysis.service.js'))
            .then(({ videoContentAnalysisService }) => videoContentAnalysisService.run())
            .then((r) => console.log('[VideoContentAnalysis] Startup run done:', JSON.stringify(r)))
            .then(() => import('./services/event-video-brief.service.js'))
            .then(({ eventVideoBriefService }) => eventVideoBriefService.run())
            .then((r) => console.log('[EventBrief] Startup run done:', JSON.stringify(r)))
            .catch((err) => console.error('[Startup pipeline] run failed:', err))
            .finally(() => setStartupChainRunning(false));
        }, 60_000);
        console.log('[VideoTagging] Startup run scheduled in 60s');
      }

      // 기술 트렌드 분석·분류 파이프라인 기동 1회 (직전 완료 후 MIN_GAP_HOURS 이내면 건너뜀)
      if (isStartupPipelineEnabled()) {
        const delayMs = resolveStartupDelayMs();
        setTimeout(() => {
          void runStartupPipelineIfDue(() => schedulerService.trigger(PIPELINE_TASK_NAME, 'startup'));
        }, delayMs);
        console.log(`[TechTrendPipeline] Startup run scheduled in ${Math.round(delayMs / 1000)}s`);
      }

      // 주간 브리프 기동 캐치업 — 지난주 브리프가 없고 월요일 08:00 KST 이후일 때만 (12시간 가드, 태깅 체인 대기)
      if (isStartupWeeklyBriefEnabled()) {
        const delayMs = resolveWeeklyBriefStartupDelayMs();
        setTimeout(() => {
          void runStartupWeeklyBriefIfDue(() => schedulerService.trigger(WEEKLY_BRIEF_TASK_NAME, 'startup'));
        }, delayMs);
        console.log(`[WeeklyBrief] Startup catch-up scheduled in ${Math.round(delayMs / 1000)}s`);
      }

      // ARGOS_I 일일 스냅샷 기동 캐치업 — 07:00 KST 이후이고 오늘 번들이 없을 때만 (3시간 가드, 상류 체인 대기)
      if (isStartupArgosIExportEnabled()) {
        const delayMs = resolveArgosIStartupDelayMs();
        setTimeout(() => {
          void runStartupArgosIExportIfDue(() => schedulerService.trigger(ARGOS_I_EXPORT_TASK_NAME, 'startup'));
        }, delayMs);
        console.log(`[ArgosIExport] Startup catch-up scheduled in ${Math.round(delayMs / 1000)}s`);
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
