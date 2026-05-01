/**
 * Review route · vacuum-arm REQ-10
 *
 * Spec §5 — POST /api/designer/vacuum-arm/review
 *   Body: { product, room?, payloadKg, analysis }
 *   Response: ReviewResult ({ summary, issues[], source, generatedAt, isMock })
 *
 * The frontend computes `analysis` once via /analyze and passes it back here
 * so we don't double-run physics.
 */

import type { FastifyInstance } from 'fastify';
import { generateReview } from '../../../services/designer/vacuum-arm/review.service.js';
import type {
  AnalysisSnapshot,
  ReviewInput,
} from '../../../services/designer/vacuum-arm/review.service.js';
import type {
  ProductConfig,
  RoomConfig,
} from '../../../services/designer/vacuum-arm/index.js';

interface ReviewBody {
  product: ProductConfig;
  room?: RoomConfig | null;
  payloadKg?: number;
  analysis: AnalysisSnapshot;
}

export async function reviewRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: ReviewBody }>('/', async (request, reply) => {
    const body = request.body ?? ({} as ReviewBody);
    if (!body.product || !body.product.base) {
      return reply.code(400).send({ error: 'product.base is required' });
    }
    if (!body.analysis) {
      return reply.code(400).send({ error: 'analysis snapshot is required' });
    }

    const input: ReviewInput = {
      product: body.product,
      room: body.room ?? null,
      payloadKg: body.payloadKg ?? 0,
      analysis: body.analysis,
    };

    const result = await generateReview(input);
    return reply.send(result);
  });
}
