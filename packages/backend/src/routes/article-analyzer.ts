import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { articleAnalyzerService, type AIModel } from '../services/index.js';
import { authMiddleware, requireRole } from './auth.js';

/** 로그인 사용자 (조회, LLM 미리보기) */
const loggedIn = [authMiddleware];
/** 관리자 (저장·수정·삭제) */
const adminOnly = [authMiddleware, requireRole('admin')];

export async function articleAnalyzerRoutes(fastify: FastifyInstance) {
  // Analyze article (preview before saving)
  fastify.post('/analyze', { preHandler: loggedIn }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { content, language, model } = request.body as { 
        content: string; 
        language?: string;
        model?: AIModel;
      };
      
      if (!content) {
        return reply.status(400).send({ error: 'Content is required' });
      }

      // Check for duplicate first
      const { isDuplicate, existingId } = await articleAnalyzerService.checkDuplicate(content);
      
      if (isDuplicate) {
        return {
          isDuplicate: true,
          existingId,
          message: '동일한 내용의 기사가 이미 존재합니다.',
        };
      }

      const analysis = await articleAnalyzerService.analyzeArticle(
        content, 
        language || 'ko',
        model || 'gpt-4o'
      );
      
      return {
        isDuplicate: false,
        analysis,
      };
    } catch (error) {
      console.error('Error analyzing article:', error);
      reply.status(500).send({ error: 'Failed to analyze article' });
    }
  });

  // Submit article (save to database)
  fastify.post('/submit', { preHandler: adminOnly }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // authMiddleware 가 검증한 사용자
      const submittedBy: string | undefined = request.user?.userId;

      const result = await articleAnalyzerService.submitArticle(request.body as any, submittedBy);
      
      if (!result.success) {
        return reply.status(400).send(result);
      }

      reply.status(201).send(result);
    } catch (error) {
      console.error('Error submitting article:', error);
      reply.status(500).send({ error: 'Failed to submit article' });
    }
  });

  // List articles
  fastify.get('/', { preHandler: loggedIn }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as Record<string, string>;
      const filters = {
        companyId: query.companyId,
        robotId: query.robotId,
        language: query.language,
        category: query.category,
        search: query.search,
      };

      const pagination = {
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 20,
      };

      const result = await articleAnalyzerService.listArticles(filters, pagination);
      return result;
    } catch (error) {
      console.error('Error listing articles:', error);
      reply.status(500).send({ error: 'Failed to list articles' });
    }
  });

  // Get articles by robot
  fastify.get('/robot/:robotId', { preHandler: loggedIn }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { robotId } = request.params as { robotId: string };
      const query = request.query as Record<string, string>;
      const limit = Number(query.limit) || 10;
      const articles = await articleAnalyzerService.getArticlesByRobot(robotId, limit);
      return articles;
    } catch (error) {
      console.error('Error getting articles by robot:', error);
      reply.status(500).send({ error: 'Failed to get articles by robot' });
    }
  });

  // Get articles by company
  fastify.get('/company/:companyId', { preHandler: loggedIn }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.params as { companyId: string };
      const query = request.query as Record<string, string>;
      const limit = Number(query.limit) || 10;
      const articles = await articleAnalyzerService.getArticlesByCompany(companyId, limit);
      return articles;
    } catch (error) {
      console.error('Error getting articles by company:', error);
      reply.status(500).send({ error: 'Failed to get articles by company' });
    }
  });

  // Get article by ID
  fastify.get('/:id', { preHandler: loggedIn }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const article = await articleAnalyzerService.getArticle(id);
      if (!article) {
        return reply.status(404).send({ error: 'Article not found' });
      }
      return article;
    } catch (error) {
      console.error('Error getting article:', error);
      reply.status(500).send({ error: 'Failed to get article' });
    }
  });

  // Update article
  fastify.put('/:id', { preHandler: adminOnly }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const article = await articleAnalyzerService.updateArticle(id, request.body as any);
      if (!article) {
        return reply.status(404).send({ error: 'Article not found' });
      }
      return article;
    } catch (error) {
      console.error('Error updating article:', error);
      reply.status(500).send({ error: 'Failed to update article' });
    }
  });

  // Delete article
  fastify.delete('/:id', { preHandler: adminOnly }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      await articleAnalyzerService.deleteArticle(id);
      reply.status(204).send();
    } catch (error) {
      console.error('Error deleting article:', error);
      reply.status(500).send({ error: 'Failed to delete article' });
    }
  });
}
