import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireIngestKey } from './ingest-auth.js';
import { ingestArticles } from '../services/ingest.service.js';

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
