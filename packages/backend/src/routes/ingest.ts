import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireIngestKey } from './ingest-auth.js';
import { ingestArticles } from '../services/ingest.service.js';
import { createGuardContext, guardIngestFields } from '../services/argos-i-inbound-guard.js';

const MAX_ARTICLES_PER_REQUEST = 200;

export const IngestRequestSchema = z.object({
  source: z.string().min(1).max(100),
  articles: z.array(z.unknown()).min(1).max(MAX_ARTICLES_PER_REQUEST),
});

/**
 * HTTPS batch ingest API — see docs/ingest/SPEC.md.
 *
 * Authenticated (requireIngestKey) endpoints used by external agents (e.g. Claude
 * Routine) to save articles/alerts over HTTPS, avoiding the need for raw DB access.
 */
export async function ingestRoutes(fastify: FastifyInstance) {
  // POST /articles — batch-ingest articles (+ optional alerts). Partial failures
  // still return 200 with per-article errors/warnings; the batch is never rolled back.
  fastify.post('/articles', { preHandler: requireIngestKey }, async (request, reply) => {
    const parsed = IngestRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      const tooLarge = parsed.error.issues.some(
        (issue) => issue.code === 'too_big' && issue.path.length === 1 && issue.path[0] === 'articles'
      );

      if (tooLarge) {
        reply.status(400).send({ error: 'Batch too large. Max 200 articles per request.' });
        return;
      }

      reply.status(400).send({
        error: 'Invalid request body',
        issues: parsed.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`),
      });
      return;
    }

    const { source, articles } = parsed.data;

    // 사내 정보 차단: source 는 배치 전체의 출처 표기라 표지가 있으면 배치를 받지 않는다 (사유 코드만 응답한다)
    const sourceReasons = guardIngestFields([{ value: source, kind: 'free' }], createGuardContext(process.env));
    if (sourceReasons.length > 0) {
      request.log.info(`[ingest] outcome=rejected scope=source reasons=${sourceReasons.join(',')}`);
      reply.status(400).send({ error: 'internal_data_rejected', reasons: sourceReasons });
      return;
    }

    const result = await ingestArticles({ source, articles });

    // Summary only — never log the API key or full payload.
    request.log.info(
      `[ingest] source=${source} inserted=${result.inserted} skipped=${result.skipped} errors=${result.errors.length}`
    );

    reply.status(200).send(result);
  });

  // GET /health — connectivity check for the calling agent (auth required).
  fastify.get('/health', { preHandler: requireIngestKey }, async () => {
    return { ok: true };
  });
}
