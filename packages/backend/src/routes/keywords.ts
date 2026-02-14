import type { FastifyInstance } from 'fastify';
import { keywordService } from '../services/keyword.service.js';
import { keywordExtractionService } from '../services/keyword-extraction.service.js';
import { keywordStatsService } from '../services/keyword-stats.service.js';
import { CreateKeywordSchema, PaginationSchema } from '../types/dto.js';

export async function keywordsRoutes(fastify: FastifyInstance) {
  // List keywords
  fastify.get('/', async (request) => {
    const query = request.query as Record<string, string>;
    const pagination = PaginationSchema.parse(query);
    
    const result = await keywordService.list({
      language: query.language,
      category: query.category,
      limit: pagination.pageSize,
      offset: (pagination.page - 1) * pagination.pageSize,
    });

    return {
      items: result.items,
      total: result.total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(result.total / pagination.pageSize),
    };
  });

  // Create keyword
  fastify.post('/', async (request, reply) => {
    const data = CreateKeywordSchema.parse(request.body);
    const keyword = await keywordService.findOrCreate(data);
    reply.status(201).send(keyword);
  });

  // Get trending keywords
  fastify.get('/trending', async (request) => {
    const query = request.query as Record<string, string>;
    const trending = await keywordStatsService.getTrendingKeywords({
      periodType: (query.periodType as 'week' | 'month') || 'week',
      limit: parseInt(query.limit || '20'),
      minCount: parseInt(query.minCount || '1'),
    });
    return trending;
  });

  // Get keyword stats
  fastify.get('/stats', async (request) => {
    const query = request.query as Record<string, string>;
    const stats = await keywordService.getStats({
      keywordId: query.keywordId,
      periodType: query.periodType,
      startDate: query.startDate,
      endDate: query.endDate,
      limit: parseInt(query.limit || '100'),
    });
    return stats;
  });

  // Get keywords for article
  fastify.get('/article/:articleId', async (request) => {
    const { articleId } = request.params as { articleId: string };
    return keywordExtractionService.getArticleKeywords(articleId);
  });

  // Get keywords for product
  fastify.get('/product/:productId', async (request) => {
    const { productId } = request.params as { productId: string };
    return keywordService.getProductKeywords(productId);
  });

  // Extract keywords from text (preview)
  fastify.post('/extract', async (request) => {
    const { text, language } = request.body as { text: string; language?: 'ko' | 'en' };
    
    if (!text) {
      return { error: 'Text is required' };
    }

    const keywords = language
      ? keywordExtractionService.extractKeywords(text, language)
      : keywordExtractionService.extractMultilingualKeywords(text);

    return {
      keywords,
      count: keywords.length,
    };
  });

  // Get keyword frequency stats
  fastify.get('/frequency', async (request) => {
    const query = request.query as Record<string, string>;
    const stats = await keywordExtractionService.getKeywordFrequencyStats({
      language: query.language,
      category: query.category,
      limit: parseInt(query.limit || '50'),
    });
    return stats;
  });

  // Get keyword history
  fastify.get('/:keywordId/history', async (request) => {
    const { keywordId } = request.params as { keywordId: string };
    const query = request.query as Record<string, string>;
    
    const history = await keywordStatsService.getKeywordHistory(keywordId, {
      periodType: (query.periodType as 'week' | 'month') || 'week',
      limit: parseInt(query.limit || '12'),
    });
    return history;
  });

  // Get category trends
  fastify.get('/trends/categories', async (request) => {
    const query = request.query as Record<string, string>;
    const trends = await keywordStatsService.getCategoryTrends(
      (query.periodType as 'week' | 'month') || 'week'
    );
    return trends;
  });

  // Recalculate stats (admin only)
  fastify.post('/stats/recalculate', async (request, reply) => {
    const query = request.query as Record<string, string>;
    const periodType = (query.periodType as 'week' | 'month') || 'week';
    
    try {
      const count = await keywordStatsService.recalculateAllStats(periodType);
      return { success: true, processedCount: count };
    } catch (error) {
      reply.status(500).send({ error: 'Failed to recalculate stats' });
    }
  });
}
