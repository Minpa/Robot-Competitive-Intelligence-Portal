/**
 * 기사 분석 파이프라인 API 라우트
 * 
 * POST /api/analysis/parse - 기사 파싱
 * POST /api/analysis/link - 엔티티 링킹
 * POST /api/analysis/save - 검증 + 저장
 * POST /api/analysis/validate - 검증만
 * POST /api/analysis/ai-search - AI 기반 검색·요약
 */

import { FastifyInstance } from 'fastify';
import { articleParserService } from '../services/article-parser.service.js';
import { entityLinkerService } from '../services/entity-linker.service.js';
import { articleDBWriterService } from '../services/article-db-writer.service.js';
import { validationRulesEngine } from '../services/validation-rules.service.js';
import { pipelineLogger } from '../services/pipeline-logger.service.js';
import { externalAIAgent, convertToParseResult } from '../services/external-ai-agent.service.js';
import type { ParsedEntity } from '../services/article-parser.service.js';
import type { ArticleSaveRequest } from '../services/article-db-writer.service.js';
import type { LinkConfirmation } from '../services/entity-linker.service.js';
import type { AISearchRequest } from '../services/external-ai-agent.service.js';

export async function analysisRoutes(fastify: FastifyInstance) {
  /**
   * POST /parse - 기사 원문 파싱
   */
  fastify.post<{ Body: { text: string; lang?: string; options?: Record<string, boolean> } }>(
    '/parse',
    async (request, reply) => {
      const runId = await pipelineLogger.startRun();
      try {
        const { text, lang, options } = request.body;
        await pipelineLogger.startStep(runId, 'parse', 1);

        const result = await articleParserService.parse(text, lang, options);

        await pipelineLogger.completeStep(runId, 'parse', 1, 0);
        return { runId, result };
      } catch (error) {
        await pipelineLogger.failStep(runId, 'parse', error as Error);
        return reply.status(400).send({ error: (error as Error).message, runId });
      }
    }
  );

  /**
   * POST /link - 엔티티 링킹 (후보 검색)
   */
  fastify.post<{ Body: { entities: ParsedEntity[] } }>(
    '/link',
    async (request, reply) => {
      try {
        const { entities } = request.body;
        if (!entities || entities.length === 0) {
          return reply.status(400).send({ error: '엔티티 목록이 비어있습니다.' });
        }

        const result = await entityLinkerService.findCandidates(entities);
        return result;
      } catch (error) {
        return reply.status(500).send({ error: (error as Error).message });
      }
    }
  );

  /**
   * POST /link/confirm - 링킹 확정 (기존 연결 + 신규 생성)
   */
  fastify.post<{ Body: LinkConfirmation }>(
    '/link/confirm',
    async (request, reply) => {
      try {
        const result = await entityLinkerService.confirmLinks(request.body);
        return result;
      } catch (error) {
        return reply.status(500).send({ error: (error as Error).message });
      }
    }
  );

  /**
   * POST /validate - 엔티티 검증만 수행
   */
  fastify.post<{ Body: { entityType: string; data: Record<string, unknown> } }>(
    '/validate',
    async (request, reply) => {
      try {
        const { entityType, data } = request.body;
        const result = validationRulesEngine.validate(entityType, data);
        return result;
      } catch (error) {
        return reply.status(500).send({ error: (error as Error).message });
      }
    }
  );

  /**
   * POST /save - 검증 + 기사 저장
   */
  fastify.post<{ Body: ArticleSaveRequest & { entities?: { type: string; data: Record<string, unknown> }[] } }>(
    '/save',
    async (request, reply) => {
      try {
        const { entities, ...saveRequest } = request.body;

        // 엔티티 검증
        if (entities && entities.length > 0) {
          for (const entity of entities) {
            const validation = validationRulesEngine.validate(entity.type, entity.data);
            if (!validation.isValid) {
              return reply.status(400).send({
                error: '검증 실패',
                validation,
              });
            }
          }
        }

        const result = await articleDBWriterService.save(saveRequest);
        if (!result.isNew) {
          return reply.status(409).send({ error: '중복 기사입니다.', result });
        }

        return result;
      } catch (error) {
        return reply.status(500).send({ error: (error as Error).message });
      }
    }
  );

  /**
   * POST /ai-search - AI 기반 검색·요약
   *
   * ExternalAIAgent로 검색 → ParseResult 변환 → EntityLinker 후보 검색 → 통합 결과 반환
   */
  fastify.post<{ Body: AISearchRequest }>(
    '/ai-search',
    async (request, reply) => {
      try {
        const { query, targetTypes, timeRange, region, provider } = request.body;

        if (!query || query.trim().length === 0) {
          return reply.status(400).send({ error: '검색 질의가 비어있습니다.' });
        }

        // 1. ExternalAIAgent로 검색·요약
        const aiResponse = await externalAIAgent.search({
          query,
          targetTypes: targetTypes || ['company', 'product', 'component', 'application', 'keyword'],
          timeRange: timeRange || { start: '2024', end: '2025' },
          region: region || '글로벌',
          provider: provider || 'chatgpt',
        });

        // 2. AISearchResponse → ParseResult 변환
        const parseResult = convertToParseResult(aiResponse);

        // 3. EntityLinker로 후보 검색
        const allEntities = [
          ...parseResult.companies,
          ...parseResult.products,
          ...parseResult.components,
          ...parseResult.applications,
        ];

        const linkResult = allEntities.length > 0
          ? await entityLinkerService.findCandidates(allEntities)
          : { candidates: {}, unmatched: [] };

        // 4. 통합 결과 반환
        return {
          result: {
            summary: parseResult.summary,
            companies: parseResult.companies,
            products: parseResult.products,
            components: parseResult.components,
            applications: parseResult.applications,
            keywords: parseResult.keywords,
            detectedLanguage: parseResult.detectedLanguage,
          },
          linkResult,
          sources: aiResponse.sources,
        };
      } catch (error) {
        const message = (error as Error).message;
        const statusCode = message.includes('환경 변수가 설정되지 않았습니다') ? 400 : 500;
        return reply.status(statusCode).send({ error: message });
      }
    }
  );
}
