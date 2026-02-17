import { FastifyInstance } from 'fastify';
import { insightCardsGenerator } from '../services/insight-cards.service.js';
import { monthlyBriefGenerator } from '../services/monthly-brief.service.js';
import { aggregationService } from '../services/aggregation.service.js';

export async function insightsRoutes(fastify: FastifyInstance) {
  fastify.get('/cards', async () => {
    return insightCardsGenerator.generateCards();
  });

  fastify.post('/monthly-brief', async (request, reply) => {
    try {
      const [segments, yearly, comps, kws] = await Promise.all([
        aggregationService.getSegmentAggregation(),
        aggregationService.getYearlyAggregation(),
        aggregationService.getComponentAggregation(),
        aggregationService.getKeywordAggregation('month'),
      ]);

      const result = await monthlyBriefGenerator.generate({
        segments, yearly, components: comps, keywords: kws,
      });

      // PPTX 다운로드인 경우
      if (request.headers.accept === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
        reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
        reply.header('Content-Disposition', 'attachment; filename="monthly-brief.pptx"');
        return reply.send(result.pptxBuffer);
      }

      return {
        markdown: result.markdown,
        generatedAt: result.generatedAt,
        period: result.period,
        hasPptx: result.pptxBuffer.length > 0,
      };
    } catch (error) {
      return reply.status(500).send({ error: (error as Error).message });
    }
  });
}
