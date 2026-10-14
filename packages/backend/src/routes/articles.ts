import { FastifyInstance } from 'fastify';
import { articleService } from '../services/index.js';
import {
  CreateArticleSchema,
  UpdateArticleSchema,
  ArticleFiltersSchema,
  PaginationSchema,
  TechTrendReportQuerySchema,
} from '../types/dto.js';
import { authMiddleware, requireRole } from './auth.js';

const adminOnly = [authMiddleware, requireRole('admin')];

export async function articleRoutes(fastify: FastifyInstance) {
  // List articles
  fastify.get('/', async (request) => {
    const filters = ArticleFiltersSchema.parse(request.query);
    const pagination = PaginationSchema.parse(request.query);
    return articleService.list(filters, pagination);
  });

  // 기업별 수집 신선도 (커버리지 매트릭스)
  fastify.get('/freshness/by-company', async () => {
    return articleService.getCompanyFreshness();
  });

  // 데모 영상 트렌드 AI 요약 (최근 60일, 6시간 캐시)
  fastify.get('/video-trends/summary', async () => {
    const { videoTaggingService } = await import('../services/video-tagging.service.js');
    return videoTaggingService.getTrendSummary();
  });

  // 데모 영상 최근 7일 급상승 Top 10
  fastify.get('/video-trends/top', async () => {
    const { videoTaggingService } = await import('../services/video-tagging.service.js');
    return videoTaggingService.getTopTrendingVideos();
  });

  // 단위기술 축(핸드/RFM/액추에이터) 트렌드 AI 요약
  fastify.get<{ Params: { domain: string } }>('/tech-trends/:domain/summary', async (request, reply) => {
    const { domain } = request.params;
    if (!['hand', 'rfm', 'actuator', 'expo', 'production'].includes(domain)) {
      reply.status(400).send({ error: 'Invalid domain' });
      return;
    }
    const { videoTaggingService } = await import('../services/video-tagging.service.js');
    return videoTaggingService.getTechTrendSummary(
      domain as 'hand' | 'rfm' | 'actuator' | 'expo' | 'production'
    );
  });

  // 단위기술 축 공유용 리포트 — 최근 N일 영상 + 논문/기사 + AI 시사점 (24h 캐시)
  fastify.get<{ Params: { domain: string }; Querystring: { days?: string } }>(
    '/tech-trends/:domain/report',
    async (request, reply) => {
      const { domain } = request.params;
      const { TECH_TREND_DOMAINS, techTrendReportService } = await import(
        '../services/tech-trend-report.service.js'
      );
      if (!(TECH_TREND_DOMAINS as readonly string[]).includes(domain)) {
        reply.status(400).send({ error: 'Invalid domain' });
        return;
      }
      const parsed = TechTrendReportQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        reply.status(400).send({ error: 'Invalid query: days must be an integer between 7 and 90' });
        return;
      }
      return techTrendReportService.getReport(
        domain as (typeof TECH_TREND_DOMAINS)[number],
        parsed.data.days
      );
    }
  );

  // 핸드 리포트 대상 영상 전체 Gemini 분석 + 핸드 관련성 판정 (관리자, 이벤트성 배치) — 즉시 응답, 백그라운드 실행
  fastify.post<{ Params: { domain: string }; Querystring: { days?: string } }>(
    '/tech-trends/:domain/analyze',
    { preHandler: adminOnly },
    async (request, reply) => {
      const { domain } = request.params;
      const { TECH_TREND_DOMAINS } = await import('../services/tech-trend-report.service.js');
      if (!(TECH_TREND_DOMAINS as readonly string[]).includes(domain)) {
        reply.status(400).send({ error: 'Invalid domain' });
        return;
      }
      const { techTrendAnalysisService, ANALYZE_SUPPORTED_DOMAINS } = await import(
        '../services/tech-trend-analysis.service.js'
      );
      if (!(ANALYZE_SUPPORTED_DOMAINS as readonly string[]).includes(domain)) {
        reply.status(400).send({ error: 'Analysis not supported for this domain' });
        return;
      }
      const parsed = TechTrendReportQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        reply.status(400).send({ error: 'Invalid query: days must be an integer between 7 and 90' });
        return;
      }
      const result = await techTrendAnalysisService.start(
        domain as (typeof TECH_TREND_DOMAINS)[number],
        parsed.data.days
      );
      if (!result.ok) {
        reply.status(503).send({ error: 'GEMINI_API_KEY not configured' });
        return;
      }
      return result.alreadyRunning
        ? { alreadyRunning: true, queued: 0, total: result.total }
        : { queued: result.queued, total: result.total };
    }
  );

  // 분석 배치 진행 상태 (관리자 전용, 인메모리)
  fastify.get<{ Params: { domain: string } }>(
    '/tech-trends/:domain/analyze/status',
    { preHandler: adminOnly },
    async (request, reply) => {
      const { domain } = request.params;
      const { TECH_TREND_DOMAINS } = await import('../services/tech-trend-report.service.js');
      if (!(TECH_TREND_DOMAINS as readonly string[]).includes(domain)) {
        reply.status(400).send({ error: 'Invalid domain' });
        return;
      }
      const { techTrendAnalysisService } = await import('../services/tech-trend-analysis.service.js');
      return techTrendAnalysisService.getStatus(domain as (typeof TECH_TREND_DOMAINS)[number]);
    }
  );

  // 핸드 기술 시계열 트렌드 (수집 시작 이후 전체 기간) — 월별 서브토픽 집계 (10분 캐시), days 무관
  fastify.get<{ Params: { domain: string } }>('/tech-trends/:domain/timeline', async (request, reply) => {
    const { domain } = request.params;
    const { TECH_TREND_DOMAINS } = await import('../services/tech-trend-report.service.js');
    if (!(TECH_TREND_DOMAINS as readonly string[]).includes(domain)) {
      reply.status(400).send({ error: 'Invalid domain' });
      return;
    }
    const { TIMELINE_SUPPORTED_DOMAINS, techTrendTimelineService } = await import(
      '../services/tech-trend-timeline.service.js'
    );
    if (!(TIMELINE_SUPPORTED_DOMAINS as readonly string[]).includes(domain)) {
      reply.status(400).send({ error: 'Timeline not supported for this domain' });
      return;
    }
    return techTrendTimelineService.getTimeline();
  });

  // 시계열 AI 해설 — 항상 200 { status, insight }, 차트와 분리해 지연/실패가 차트에 영향 없도록 함 (24h 캐시)
  fastify.get<{ Params: { domain: string } }>('/tech-trends/:domain/timeline/insight', async (request, reply) => {
    const { domain } = request.params;
    const { TECH_TREND_DOMAINS } = await import('../services/tech-trend-report.service.js');
    if (!(TECH_TREND_DOMAINS as readonly string[]).includes(domain)) {
      reply.status(400).send({ error: 'Invalid domain' });
      return;
    }
    const { TIMELINE_SUPPORTED_DOMAINS } = await import('../services/tech-trend-timeline.service.js');
    if (!(TIMELINE_SUPPORTED_DOMAINS as readonly string[]).includes(domain)) {
      reply.status(400).send({ error: 'Timeline not supported for this domain' });
      return;
    }
    const { techTrendTimelineInsightService } = await import(
      '../services/tech-trend-timeline-insight.service.js'
    );
    return techTrendTimelineInsightService.getInsight();
  });

  // 핸드 논문·영상 서브토픽 분류 배치 (관리자, 이벤트성) — 즉시 응답, 백그라운드 실행
  fastify.post<{ Params: { domain: string } }>(
    '/tech-trends/:domain/classify',
    { preHandler: adminOnly },
    async (request, reply) => {
      const { domain } = request.params;
      const { TECH_TREND_DOMAINS } = await import('../services/tech-trend-report.service.js');
      if (!(TECH_TREND_DOMAINS as readonly string[]).includes(domain)) {
        reply.status(400).send({ error: 'Invalid domain' });
        return;
      }
      const { CLASSIFY_SUPPORTED_DOMAINS, handTopicClassificationService } = await import(
        '../services/hand-topic-classification.service.js'
      );
      if (!(CLASSIFY_SUPPORTED_DOMAINS as readonly string[]).includes(domain)) {
        reply.status(400).send({ error: 'Timeline not supported for this domain' });
        return;
      }
      const result = await handTopicClassificationService.start();
      if (!result.ok) {
        reply.status(503).send({ error: 'ANTHROPIC_API_KEY not configured' });
        return;
      }
      return result.alreadyRunning
        ? { alreadyRunning: true, queued: 0, total: result.total }
        : { queued: result.queued, total: result.total };
    }
  );

  // 분류 배치 진행 상태 (관리자 전용, 인메모리)
  fastify.get<{ Params: { domain: string } }>(
    '/tech-trends/:domain/classify/status',
    { preHandler: adminOnly },
    async (request, reply) => {
      const { domain } = request.params;
      const { TECH_TREND_DOMAINS } = await import('../services/tech-trend-report.service.js');
      if (!(TECH_TREND_DOMAINS as readonly string[]).includes(domain)) {
        reply.status(400).send({ error: 'Invalid domain' });
        return;
      }
      const { CLASSIFY_SUPPORTED_DOMAINS, handTopicClassificationService } = await import(
        '../services/hand-topic-classification.service.js'
      );
      if (!(CLASSIFY_SUPPORTED_DOMAINS as readonly string[]).includes(domain)) {
        reply.status(400).send({ error: 'Timeline not supported for this domain' });
        return;
      }
      return handTopicClassificationService.getStatus();
    }
  );

  // Get article by ID
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const article = await articleService.getById(request.params.id);
    if (!article) {
      reply.status(404).send({ error: 'Article not found' });
      return;
    }
    return article;
  });

  // Create article (with deduplication)
  fastify.post('/', async (request, reply) => {
    try {
      const data = CreateArticleSchema.parse(request.body);
      const result = await articleService.createWithDedup(data);

      if (result.isDuplicate) {
        reply.status(200).send({
          ...result.article,
          _duplicate: true,
          _existingId: result.existingId,
        });
        return;
      }

      reply.status(201).send(result.article);
    } catch (error) {
      reply.status(400).send({ error: (error as Error).message });
    }
  });

  // Update article
  fastify.put<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try {
      const data = UpdateArticleSchema.parse(request.body);
      const article = await articleService.update(request.params.id, data);
      if (!article) {
        reply.status(404).send({ error: 'Article not found' });
        return;
      }
      return article;
    } catch (error) {
      reply.status(400).send({ error: (error as Error).message });
    }
  });

  // Delete article
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const deleted = await articleService.delete(request.params.id);
    if (!deleted) {
      reply.status(404).send({ error: 'Article not found' });
      return;
    }
    reply.status(204).send();
  });

  // Get articles by product
  fastify.get<{ Params: { productId: string } }>(
    '/by-product/:productId',
    async (request) => {
      return articleService.getByProduct(request.params.productId);
    }
  );

  // Get articles by company
  fastify.get<{ Params: { companyId: string } }>(
    '/by-company/:companyId',
    async (request) => {
      return articleService.getByCompany(request.params.companyId);
    }
  );

  // Get article timeline
  fastify.get<{ Params: { entityType: string; entityId: string } }>(
    '/timeline/:entityType/:entityId',
    async (request, reply) => {
      const { entityType, entityId } = request.params;
      if (entityType !== 'product' && entityType !== 'company') {
        reply.status(400).send({ error: 'Invalid entity type' });
        return;
      }
      return articleService.getTimeline(entityId, entityType);
    }
  );

  // Check duplicate
  fastify.post<{ Body: { content: string } }>('/check-duplicate', async (request) => {
    const hash = articleService.generateContentHash(request.body.content);
    const isDuplicate = await articleService.checkDuplicate(hash);
    return { contentHash: hash, isDuplicate };
  });

  // Import articles via Excel upload (xlsx)
  fastify.post('/import-excel', async (request, reply) => {
    const file = await request.file();
    if (!file) {
      reply.status(400).send({ error: 'No file uploaded' });
      return;
    }

    const updateExisting = (request.body as any).updateExisting;
    const buffer = await file.toBuffer();

    try {
      const result = await articleService.importFromExcel(buffer, {
        updateExisting: updateExisting !== 'false',
      });
      return result;
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });
}
