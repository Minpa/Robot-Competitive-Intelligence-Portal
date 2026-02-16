import type { FastifyInstance } from 'fastify';
import { keywordService } from '../services/keyword.service.js';
import { keywordExtractionService } from '../services/keyword-extraction.service.js';
import { keywordStatsService } from '../services/keyword-stats.service.js';
import { keywordAnalyticsService } from '../services/keyword-analytics.service.js';
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

  // ============================================
  // 키워드 분석 API (새로 추가)
  // ============================================

  // Top 키워드 분석 데이터
  fastify.get('/analytics/top', async (request) => {
    const query = request.query as Record<string, string>;
    const analytics = await keywordAnalyticsService.getTopKeywords({
      limit: parseInt(query.limit || '20'),
      category: query.category,
      sortBy: (query.sortBy as 'count' | 'growth' | 'coverage') || 'count',
    });
    return analytics;
  });

  // 키워드 포지션 맵 데이터 (2D 산점도)
  fastify.get('/analytics/position-map', async () => {
    return keywordAnalyticsService.getKeywordPositionMap();
  });

  // 월간 키워드 브리프
  fastify.get('/analytics/brief', async () => {
    return keywordAnalyticsService.generateMonthlyBrief();
  });

  // 키워드 트렌드 라인 (선택한 키워드들의 월별 추이)
  fastify.get('/analytics/trend-lines', async (request) => {
    const query = request.query as Record<string, string>;
    const keywordIds = query.ids?.split(',').filter(Boolean) || [];
    if (keywordIds.length === 0) {
      return { months: [], series: [] };
    }
    return keywordAnalyticsService.getKeywordTrendLines(keywordIds);
  });

  // 키워드 상세 인사이트
  fastify.get('/analytics/:keywordId', async (request) => {
    const { keywordId } = request.params as { keywordId: string };
    const insight = await keywordAnalyticsService.getKeywordInsight(keywordId);
    if (!insight) {
      return { error: 'Keyword not found' };
    }
    return insight;
  });
}
