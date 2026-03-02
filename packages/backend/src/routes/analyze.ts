import { FastifyInstance } from 'fastify';
import { textAnalyzerService, AnalyzedData, autoQueryAI } from '../services/text-analyzer.service.js';
import { scoringPipelineService } from '../services/scoring-pipeline.service.js';
import { db, humanoidRobots, companies } from '../db/index.js';
import { eq, inArray } from 'drizzle-orm';

/**
 * 분석된 데이터에서 회사명을 추출하고, 해당 회사에 연결된 humanoid robot ID 목록을 조회한다.
 */
async function findRobotIdsByAnalyzedData(data: AnalyzedData): Promise<string[]> {
  const companyNames = data.companies.map(c => c.name).filter(Boolean);
  if (companyNames.length === 0) return [];

  try {
    const rows = await db
      .select({ robotId: humanoidRobots.id })
      .from(humanoidRobots)
      .innerJoin(companies, eq(humanoidRobots.companyId, companies.id))
      .where(inArray(companies.name, companyNames));

    return rows.map(r => r.robotId);
  } catch {
    return [];
  }
}

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

      // 자동 스코어링 트리거: 연결된 로봇이 있으면 비동기(fire-and-forget)로 스코어링 실행
      const robotIds = await findRobotIdsByAnalyzedData(analyzed);
      if (robotIds.length > 0) {
        scoringPipelineService.runForRobots(robotIds, 'analyze_pipeline')
          .catch(err => console.error('Auto-scoring failed:', err));
      }

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

      // 자동 스코어링 트리거: 연결된 로봇이 있으면 비동기(fire-and-forget)로 스코어링 실행
      const robotIds = await findRobotIdsByAnalyzedData(data);
      if (robotIds.length > 0) {
        scoringPipelineService.runForRobots(robotIds, 'analyze_pipeline')
          .catch(err => console.error('Auto-scoring failed:', err));
      }

      return saveResult;
    } catch (error) {
      return reply.status(500).send({ error: (error as Error).message });
    }
  });

  // 자동 AI 질의 (GPT-4o에 직접 질의하여 JSON 생성)
  fastify.post<{ Body: { topic: string; customPrompt?: string } }>('/auto-query', async (request, reply) => {
    try {
      const { topic, customPrompt } = request.body;
      
      if (!topic && !customPrompt) {
        return reply.status(400).send({ error: '주제 또는 커스텀 프롬프트가 필요합니다.' });
      }

      const result = await autoQueryAI(topic, customPrompt);
      return result;
    } catch (error) {
      return reply.status(500).send({ error: (error as Error).message });
    }
  });
}
