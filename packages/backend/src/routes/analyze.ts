import { FastifyInstance } from 'fastify';
import { textAnalyzerService, AnalyzedData } from '../services/text-analyzer.service.js';

export async function analyzeRoutes(fastify: FastifyInstance) {
  // 텍스트 분석 (저장하지 않고 미리보기)
  fastify.post<{ Body: { text: string } }>('/preview', async (request, reply) => {
    try {
      const { text } = request.body;
      
      if (!text || text.trim().length < 10) {
        return reply.status(400).send({ error: '텍스트가 너무 짧습니다.' });
      }

      const result = await textAnalyzerService.analyzeText(text);
      return result;
    } catch (error) {
      return reply.status(500).send({ error: (error as Error).message });
    }
  });

  // 텍스트 분석 후 DB 저장
  fastify.post<{ Body: { text: string } }>('/save', async (request, reply) => {
    try {
      const { text } = request.body;
      
      if (!text || text.trim().length < 10) {
        return reply.status(400).send({ error: '텍스트가 너무 짧습니다.' });
      }

      // 분석
      const analyzed = await textAnalyzerService.analyzeText(text);
      
      // 저장
      const saveResult = await textAnalyzerService.saveAnalyzedData(analyzed);

      return {
        analyzed,
        saved: saveResult,
      };
    } catch (error) {
      return reply.status(500).send({ error: (error as Error).message });
    }
  });

  // 분석된 데이터만 저장 (이미 분석된 결과를 받아서 저장)
  fastify.post<{ Body: AnalyzedData }>('/save-analyzed', async (request, reply) => {
    try {
      const data = request.body;
      const saveResult = await textAnalyzerService.saveAnalyzedData(data);
      return saveResult;
    } catch (error) {
      return reply.status(500).send({ error: (error as Error).message });
    }
  });
}
