import type { FastifyInstance } from 'fastify';
import { keywordService } from '../services/keyword.service.js';
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
    const trending = await keywordService.getTrending({
      periodType: query.periodType || 'week',
      limit: parseInt(query.limit || '10'),
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
    return keywordService.getArticleKeywords(articleId);
  });

  // Get keywords for product
  fastify.get('/product/:productId', async (request) => {
    const { productId } = request.params as { productId: string };
    return keywordService.getProductKeywords(productId);
  });
}
