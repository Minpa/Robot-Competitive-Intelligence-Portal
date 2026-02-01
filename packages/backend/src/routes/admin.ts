import type { FastifyInstance } from 'fastify';
import { adminCrawlerService } from '../services/admin-crawler.service.js';
import { analyzeArticle } from '../services/ai-analyzer.service.js';
import { CreateCrawlTargetSchema, UpdateCrawlTargetSchema, RateLimitConfigSchema } from '../types/dto.js';

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
}
