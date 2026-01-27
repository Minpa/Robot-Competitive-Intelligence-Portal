import { FastifyInstance } from 'fastify';
import { articleService } from '../services/index.js';
import {
  CreateArticleSchema,
  UpdateArticleSchema,
  ArticleFiltersSchema,
  PaginationSchema,
} from '../types/dto.js';

export async function articleRoutes(fastify: FastifyInstance) {
  // List articles
  fastify.get('/', async (request) => {
    const filters = ArticleFiltersSchema.parse(request.query);
    const pagination = PaginationSchema.parse(request.query);
    return articleService.list(filters, pagination);
  });

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
}
