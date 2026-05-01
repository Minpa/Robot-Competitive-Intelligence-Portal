/**
 * Spec-sheet route · vacuum-arm REQ-10 Phase B
 *
 * Spec §5.3 — POST /api/designer/vacuum-arm/spec-sheet
 *   Body: { product, payloadKg, room?, analysis, candidateName, authorName?, revisions?, review? }
 *   Response: SpecSheetPayload (the frontend renders + window.print()'s it)
 */

import type { FastifyInstance } from 'fastify';
import { buildSpecSheet } from '../../../services/designer/vacuum-arm/spec-sheet.service.js';
import type {
  BuildSpecSheetInput,
} from '../../../services/designer/vacuum-arm/spec-sheet.service.js';

export async function specSheetRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: BuildSpecSheetInput }>('/', async (request, reply) => {
    const body = request.body ?? ({} as BuildSpecSheetInput);
    if (!body.product || !body.product.base) {
      return reply.code(400).send({ error: 'product.base is required' });
    }
    if (!body.analysis) {
      return reply.code(400).send({ error: 'analysis snapshot is required' });
    }
    if (!body.candidateName) {
      return reply.code(400).send({ error: 'candidateName is required' });
    }

    const payload = await buildSpecSheet(body);
    return reply.send(payload);
  });
}
