/**
 * Entity Alias API 라우트
 *
 * GET  /                — 별칭 목록 조회 (entityType/entityId 필터)
 * POST /                — 별칭 등록 (Admin 전용)
 * DELETE /:aliasId      — 별칭 삭제 (Admin 전용)
 * POST /bulk            — 벌크 별칭 등록 (Admin 전용)
 * GET  /fuzzy-match     — pg_trgm fuzzy 매칭 테스트
 *
 * Requirements: 5.43, 5.49
 */

import type { FastifyInstance } from 'fastify';
import { entityAliasService } from '../services/index.js';
import { authMiddleware, requireRole } from './auth.js';

export async function entityAliasRoutes(fastify: FastifyInstance) {
  // GET / — 별칭 목록 조회
  fastify.get('/', async (request, reply) => {
    const query = request.query as Record<string, string>;
    const { entityType, entityId } = query;

    if (!entityType) {
      reply.status(400).send({
        error: 'entityType query parameter is required',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    if (!entityId) {
      reply.status(400).send({
        error: 'entityId query parameter is required',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const aliases = await entityAliasService.getAliasesByEntity(
      entityType,
      entityId,
    );
    return aliases;
  });

  // GET /fuzzy-match — pg_trgm fuzzy 매칭 테스트
  fastify.get('/fuzzy-match', async (request, reply) => {
    const query = request.query as Record<string, string>;
    const { query: searchQuery, entityType } = query;

    if (!searchQuery) {
      reply.status(400).send({
        error: 'query parameter is required',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const results = await entityAliasService.fuzzyMatch(
      searchQuery,
      entityType as 'company' | 'robot' | undefined,
    );
    return results;
  });

  // POST / — 별칭 등록 (Admin 전용)
  fastify.post(
    '/',
    { preHandler: [authMiddleware, requireRole('admin')] },
    async (request, reply) => {
      const body = request.body as {
        entityType: string;
        entityId: string;
        aliasName: string;
        language?: string;
      };

      if (!body.entityType || !body.entityId || !body.aliasName) {
        reply.status(400).send({
          error: 'entityType, entityId, and aliasName are required',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      const alias = await entityAliasService.createAlias({
        entityType: body.entityType as 'company' | 'robot',
        entityId: body.entityId,
        aliasName: body.aliasName,
        language: body.language ?? null,
      });

      reply.status(201).send(alias);
    },
  );

  // DELETE /:aliasId — 별칭 삭제 (Admin 전용)
  fastify.delete<{ Params: { aliasId: string } }>(
    '/:aliasId',
    { preHandler: [authMiddleware, requireRole('admin')] },
    async (request, reply) => {
      await entityAliasService.deleteAlias(request.params.aliasId);
      reply.status(204).send();
    },
  );

  // POST /bulk — 벌크 별칭 등록 (Admin 전용)
  fastify.post(
    '/bulk',
    { preHandler: [authMiddleware, requireRole('admin')] },
    async (request, reply) => {
      const body = request.body as {
        aliases: {
          entityType: string;
          entityId: string;
          aliasName: string;
          language?: string;
        }[];
      };

      if (!body.aliases || !Array.isArray(body.aliases) || body.aliases.length === 0) {
        reply.status(400).send({
          error: 'aliases array is required and must not be empty',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      const mapped = body.aliases.map((a) => ({
        entityType: a.entityType as 'company' | 'robot',
        entityId: a.entityId,
        aliasName: a.aliasName,
        language: a.language ?? null,
      }));

      const createdCount = await entityAliasService.bulkCreateAliases(mapped);
      reply.status(201).send({ createdCount });
    },
  );
}
