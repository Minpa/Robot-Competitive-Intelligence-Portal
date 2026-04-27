import type { FastifyInstance } from 'fastify';
import { adminCrawlerService } from '../services/admin-crawler.service.js';
import { analyzeArticle } from '../services/ai-analyzer.service.js';
import { aiUsageService } from '../services/ai-usage.service.js';
import { dataGeneratorService } from '../services/data-generator.service.js';
import { CreateCrawlTargetSchema, UpdateCrawlTargetSchema, RateLimitConfigSchema } from '../types/dto.js';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export async function adminRoutes(fastify: FastifyInstance) {
  // Crawl Targets
  fastify.get('/crawl-targets', async () => {
    return adminCrawlerService.listTargets();
  });

  fastify.get<{ Params: { id: string } }>('/crawl-targets/:id', async (request, reply) => {
    const target = await adminCrawlerService.getTarget(request.params.id);
    if (!target) {
      reply.status(404).send({ error: 'Crawl target not found' });
      return;
    }
    return target;
  });

  fastify.post('/crawl-targets', async (request, reply) => {
    try {
      const data = CreateCrawlTargetSchema.parse(request.body);
      const target = await adminCrawlerService.createTarget(data);
      reply.status(201).send(target);
    } catch (error) {
      reply.status(400).send({ error: (error as Error).message });
    }
  });

  fastify.put<{ Params: { id: string } }>('/crawl-targets/:id', async (request, reply) => {
    try {
      const data = UpdateCrawlTargetSchema.parse(request.body);
      const target = await adminCrawlerService.updateTarget(request.params.id, data);
      if (!target) {
        reply.status(404).send({ error: 'Crawl target not found' });
        return;
      }
      return target;
    } catch (error) {
      reply.status(400).send({ error: (error as Error).message });
    }
  });

  fastify.delete<{ Params: { id: string } }>('/crawl-targets/:id', async (request, reply) => {
    const deleted = await adminCrawlerService.deleteTarget(request.params.id);
    if (!deleted) {
      reply.status(404).send({ error: 'Crawl target not found' });
      return;
    }
    reply.status(204).send();
  });

  // Rate limit configuration
  fastify.put<{ Params: { id: string } }>('/crawl-targets/:id/rate-limit', async (request, reply) => {
    try {
      const rateLimit = RateLimitConfigSchema.parse(request.body);
      const target = await adminCrawlerService.updateRateLimit(request.params.id, rateLimit);
      if (!target) {
        reply.status(404).send({ error: 'Crawl target not found' });
        return;
      }
      return target;
    } catch (error) {
      reply.status(400).send({ error: (error as Error).message });
    }
  });

  // Enable/disable target
  fastify.post<{ Params: { id: string } }>('/crawl-targets/:id/enable', async (request, reply) => {
    const target = await adminCrawlerService.setTargetEnabled(request.params.id, true);
    if (!target) {
      reply.status(404).send({ error: 'Crawl target not found' });
      return;
    }
    return target;
  });

  fastify.post<{ Params: { id: string } }>('/crawl-targets/:id/disable', async (request, reply) => {
    const target = await adminCrawlerService.setTargetEnabled(request.params.id, false);
    if (!target) {
      reply.status(404).send({ error: 'Crawl target not found' });
      return;
    }
    return target;
  });

  // Manual crawl trigger
  fastify.post<{ Params: { id: string } }>('/crawl-targets/:id/trigger', async (request, reply) => {
    const target = await adminCrawlerService.getTarget(request.params.id);
    if (!target) {
      reply.status(404).send({ error: 'Crawl target not found' });
      return;
    }
    const job = await adminCrawlerService.triggerManualCrawl(request.params.id);
    return { job, message: 'Crawl job created' };
  });

  // Crawl Jobs
  fastify.get('/crawl-jobs', async (request) => {
    const query = request.query as Record<string, string>;
    return adminCrawlerService.listJobs({
      status: query.status,
      limit: query.limit ? parseInt(query.limit) : 50,
      offset: query.offset ? parseInt(query.offset) : 0,
    });
  });

  fastify.get<{ Params: { targetId: string } }>('/crawl-targets/:targetId/jobs', async (request) => {
    const query = request.query as Record<string, string>;
    return adminCrawlerService.getJobsForTarget(
      request.params.targetId,
      query.limit ? parseInt(query.limit) : 20
    );
  });

  // Crawl Errors
  fastify.get('/crawl-errors', async (request) => {
    const query = request.query as Record<string, string>;
    return adminCrawlerService.getErrors({
      jobId: query.jobId,
      errorType: query.errorType,
      limit: query.limit ? parseInt(query.limit) : 100,
      offset: query.offset ? parseInt(query.offset) : 0,
    });
  });

  fastify.get('/crawl-errors/stats', async () => {
    return adminCrawlerService.getErrorStats();
  });

  // Trigger all crawls
  fastify.post('/crawl-all', async () => {
    return adminCrawlerService.triggerAllCrawls();
  });

  // AI Analysis endpoints
  fastify.get('/ai-analysis/status', async () => {
    const unanalyzedCount = await adminCrawlerService.getUnanalyzedArticleCount();
    return { unanalyzedCount };
  });

  fastify.get('/ai-analysis/unanalyzed', async (request) => {
    const query = request.query as Record<string, string>;
    const limit = query.limit ? parseInt(query.limit) : 50;
    const articles = await adminCrawlerService.getUnanalyzedArticles(limit);
    return { articles, count: articles.length };
  });

  fastify.post<{ Params: { id: string } }>('/ai-analysis/articles/:id', async (request, reply) => {
    const body = request.body as { summary: string; category: string; productType?: string };
    if (!body.summary || !body.category) {
      reply.status(400).send({ error: 'summary and category are required' });
      return;
    }
    await adminCrawlerService.updateArticleAnalysis(
      request.params.id, 
      body.summary, 
      body.category,
      body.productType || 'none'
    );
    return { success: true };
  });

  // Run AI analysis on a single article using GPT-4o-mini
  fastify.post<{ Params: { id: string } }>('/ai-analysis/analyze/:id', async (request, reply) => {
    const articles = await adminCrawlerService.getUnanalyzedArticles(100);
    const article = articles.find(a => a.id === request.params.id);
    
    if (!article) {
      reply.status(404).send({ error: 'Article not found or already analyzed' });
      return;
    }

    const analysis = await analyzeArticle(article.title, article.content || '');
    await adminCrawlerService.updateArticleAnalysis(
      article.id, 
      analysis.summary, 
      analysis.category,
      analysis.productType
    );
    
    return { success: true, analysis };
  });

  // Run AI analysis on all unanalyzed articles
  fastify.post('/ai-analysis/analyze-all', async () => {
    const articles = await adminCrawlerService.getUnanalyzedArticles(100);
    
    if (articles.length === 0) {
      return { success: true, analyzed: 0, message: 'No articles to analyze' };
    }

    let analyzed = 0;
    const results: Array<{ id: string; title: string; category: string; productType: string }> = [];

    for (const article of articles) {
      try {
        const analysis = await analyzeArticle(article.title, article.content || '');
        await adminCrawlerService.updateArticleAnalysis(
          article.id, 
          analysis.summary, 
          analysis.category,
          analysis.productType
        );
        results.push({ 
          id: article.id, 
          title: article.title, 
          category: analysis.category,
          productType: analysis.productType
        });
        analyzed++;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`[AI] Failed to analyze article ${article.id}:`, error);
      }
    }

    return { success: true, analyzed, total: articles.length, results };
  });

  // ── AI 사용량 추적 ──────────────────────────────────────────────

  // GET /api/admin/ai-usage/summary — provider별 사용량 요약
  fastify.get('/ai-usage/summary', async (request) => {
    const query = request.query as Record<string, string>;
    const summary = await aiUsageService.getSummary(query.startDate, query.endDate);
    return { summary };
  });

  // GET /api/admin/ai-usage/claude-credit — Claude API 크레딧 상세 정보
  fastify.get('/ai-usage/claude-credit', async () => {
    return aiUsageService.getClaudeCreditInfo();
  });

  // GET /api/admin/ai-usage/logs — 최근 호출 로그
  fastify.get('/ai-usage/logs', async (request) => {
    const query = request.query as Record<string, string>;
    const limit = query.limit ? parseInt(query.limit) : 50;
    const logs = await aiUsageService.getRecentLogs(limit);
    return { logs };
  });

  // ── DB 마이그레이션 ──────────────────────────────────────────────

  // POST /api/admin/migrate — DB 마이그레이션 실행
  fastify.post('/migrate', async (_request, reply) => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      return reply.status(500).send({ error: 'DATABASE_URL이 설정되지 않았습니다.' });
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const drizzleDir = path.join(__dirname, '../../drizzle');

    // dist에서 실행될 때 drizzle 폴더 경로 보정
    const resolvedDir = fs.existsSync(drizzleDir)
      ? drizzleDir
      : path.join(__dirname, '../../../drizzle');

    if (!fs.existsSync(resolvedDir)) {
      return reply.status(500).send({ error: `마이그레이션 폴더를 찾을 수 없습니다: ${resolvedDir}` });
    }

    const client = new pg.Client({ connectionString });
    const results: { file: string; status: string; error?: string }[] = [];

    try {
      await client.connect();

      const files = fs.readdirSync(resolvedDir)
        .filter((f: string) => f.endsWith('.sql'))
        .sort();

      for (const file of files) {
        const sql = fs.readFileSync(path.join(resolvedDir, file), 'utf-8');
        const statements = sql.split('--> statement-breakpoint');

        let fileStatus = 'success';
        let fileError: string | undefined;

        for (const statement of statements) {
          const trimmed = statement.trim();
          if (!trimmed) continue;
          try {
            await client.query(trimmed);
          } catch (err: any) {
            if (!err.message.includes('already exists') && !err.message.includes('duplicate key')) {
              fileStatus = 'error';
              fileError = err.message;
            }
          }
        }

        results.push({ file, status: fileStatus, ...(fileError && { error: fileError }) });
      }

      return {
        success: true,
        message: `${files.length}개 마이그레이션 파일 처리 완료`,
        results,
      };
    } catch (err) {
      return reply.status(500).send({ error: `마이그레이션 실패: ${(err as Error).message}` });
    } finally {
      await client.end();
    }
  });

  // ── Data Generator: AI 기반 초기 데이터 대량 생성 ──

  // 기본 주제 목록 조회
  fastify.get('/data-generator/topics', async () => {
    return dataGeneratorService.getDefaultTopics();
  });

  // 단일 주제 데이터 생성
  fastify.post('/data-generator/generate', async (request, reply) => {
    try {
      const body = request.body as {
        query: string;
        targetTypes?: string[];
        region?: string;
        provider?: 'chatgpt' | 'claude';
        webSearch?: boolean;
      };

      if (!body.query) {
        return reply.status(400).send({ error: 'query is required' });
      }

      const result = await dataGeneratorService.generateForTopic(
        {
          query: body.query,
          targetTypes: (body.targetTypes || ['company', 'product', 'technology']) as any,
          region: body.region,
        },
        body.provider || 'claude',
        body.webSearch || false
      );

      return result;
    } catch (err) {
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // 배치 데이터 생성 (기본 주제 전체) — 비동기 잡: jobId를 즉시 반환
  fastify.post('/data-generator/batch', async (request, reply) => {
    try {
      const body = request.body as {
        provider?: 'chatgpt' | 'claude';
        webSearch?: boolean;
        mode?: 'confirmed' | 'forecast';
      };

      const mode = body?.mode === 'forecast' ? 'forecast' : 'confirmed';
      const { jobId } = await dataGeneratorService.startBatch(
        body?.provider || 'claude',
        body?.webSearch || false,
        undefined,
        mode
      );

      return { jobId };
    } catch (err) {
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // 휴머노이드 로봇 테이블 통계 (타임라인 노출 진단용)
  fastify.get('/data-generator/robot-stats', async () => {
    return dataGeneratorService.getRobotStats();
  });

  // announcement_year가 NULL인 로봇들의 연도를 description에서 재추출하여 백필
  fastify.post('/data-generator/backfill-years', async () => {
    return dataGeneratorService.backfillAnnouncementYears();
  });

  // 뉴스 헤드라인이 이름으로 들어간 무효 엔티티 조회
  fastify.get('/data-generator/invalid-entities', async () => {
    return dataGeneratorService.findInvalidEntities();
  });

  // 뉴스 헤드라인이 이름으로 들어간 무효 엔티티 삭제
  fastify.post('/data-generator/cleanup-invalid-entities', async () => {
    return dataGeneratorService.cleanupInvalidEntities();
  });

  // 공식 발표 근거 없는 가짜 휴머노이드 로봇(Atlas Pro, HUBO 2 등) 삭제
  fastify.post('/data-generator/cleanup-fabricated-robots', async () => {
    return dataGeneratorService.cleanupFabricatedRobots();
  });

  // 기업 국가 정보 Unknown/불일치 수정 (Figure AI → USA 등)
  fastify.post('/data-generator/fix-company-countries', async () => {
    return dataGeneratorService.fixCompanyCountries();
  });

  // description/summary에서 <cite> 및 HTML 태그 제거
  fastify.post('/data-generator/cleanup-citation-tags', async () => {
    return dataGeneratorService.cleanupCitationTags();
  });

  // 알려진 로봇의 정확한 발표 분기로 업데이트
  fastify.post('/data-generator/fix-robot-quarters', async () => {
    return dataGeneratorService.fixRobotQuarters();
  });

  // 배치 잡 상태 조회 (폴링용)
  fastify.get('/data-generator/batch/status/:jobId', async (request, reply) => {
    try {
      const { jobId } = request.params as { jobId: string };
      const state = await dataGeneratorService.getJobStatus(jobId);
      if (!state) {
        return reply.status(404).send({ error: '잡을 찾을 수 없습니다.' });
      }
      return state;
    } catch (err) {
      return reply.status(500).send({ error: (err as Error).message });
    }
  });
}
