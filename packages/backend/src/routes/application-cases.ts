import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { applicationCaseService } from '../services/index.js';

export async function applicationCaseRoutes(fastify: FastifyInstance) {
  // List cases with filters
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as Record<string, string>;
      const filters = {
        robotId: query.robotId,
        environmentType: query.environmentType,
        taskType: query.taskType,
        deploymentStatus: query.deploymentStatus,
      };

      const pagination = {
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 20,
      };

      const result = await applicationCaseService.listCases(filters, pagination);
      return result;
    } catch (error) {
      console.error('Error listing cases:', error);
      reply.status(500).send({ error: 'Failed to list cases' });
    }
  });

  // Get environment-task matrix
  fastify.get('/matrix', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const matrix = await applicationCaseService.getEnvironmentTaskMatrix();
      return matrix;
    } catch (error) {
      console.error('Error getting matrix:', error);
      reply.status(500).send({ error: 'Failed to get matrix' });
    }
  });

  // Get deployment status distribution
  fastify.get('/deployment-distribution', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const distribution = await applicationCaseService.getDeploymentStatusDistribution();
      return distribution;
    } catch (error) {
      console.error('Error getting deployment distribution:', error);
      reply.status(500).send({ error: 'Failed to get deployment distribution' });
    }
  });

  // Get demo timeline
  fastify.get('/timeline', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as Record<string, string>;
      const startDate = query.startDate ? new Date(query.startDate) : undefined;
      const endDate = query.endDate ? new Date(query.endDate) : undefined;
      const timeline = await applicationCaseService.getDemoTimeline(startDate, endDate);
      return timeline;
    } catch (error) {
      console.error('Error getting timeline:', error);
      reply.status(500).send({ error: 'Failed to get timeline' });
    }
  });

  // Get recent demos
  fastify.get('/recent', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as Record<string, string>;
      const limit = Number(query.limit) || 5;
      const demos = await applicationCaseService.getRecentDemos(limit);
      return demos;
    } catch (error) {
      console.error('Error getting recent demos:', error);
      reply.status(500).send({ error: 'Failed to get recent demos' });
    }
  });

  // Get cases by robot
  fastify.get('/robot/:robotId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { robotId } = request.params as { robotId: string };
      const cases = await applicationCaseService.listCasesByRobot(robotId);
      return cases;
    } catch (error) {
      console.error('Error getting cases by robot:', error);
      reply.status(500).send({ error: 'Failed to get cases by robot' });
    }
  });

  // Get cases by environment
  fastify.get('/environment/:environmentType', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { environmentType } = request.params as { environmentType: string };
      const cases = await applicationCaseService.listCasesByEnvironment(environmentType);
      return cases;
    } catch (error) {
      console.error('Error getting cases by environment:', error);
      reply.status(500).send({ error: 'Failed to get cases by environment' });
    }
  });

  // Get cases by task
  fastify.get('/task/:taskType', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { taskType } = request.params as { taskType: string };
      const cases = await applicationCaseService.listCasesByTask(taskType);
      return cases;
    } catch (error) {
      console.error('Error getting cases by task:', error);
      reply.status(500).send({ error: 'Failed to get cases by task' });
    }
  });

  // Get case by ID
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const appCase = await applicationCaseService.getCase(id);
      if (!appCase) {
        return reply.status(404).send({ error: 'Case not found' });
      }
      return appCase;
    } catch (error) {
      console.error('Error getting case:', error);
      reply.status(500).send({ error: 'Failed to get case' });
    }
  });

  // Create case
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const appCase = await applicationCaseService.createCase(request.body as any);
      reply.status(201).send(appCase);
    } catch (error) {
      console.error('Error creating case:', error);
      reply.status(500).send({ error: 'Failed to create case' });
    }
  });

  // Update case
  fastify.put('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const appCase = await applicationCaseService.updateCase(id, request.body as any);
      if (!appCase) {
        return reply.status(404).send({ error: 'Case not found' });
      }
      return appCase;
    } catch (error) {
      console.error('Error updating case:', error);
      reply.status(500).send({ error: 'Failed to update case' });
    }
  });

  // Delete case
  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      await applicationCaseService.deleteCase(id);
      reply.status(204).send();
    } catch (error) {
      console.error('Error deleting case:', error);
      reply.status(500).send({ error: 'Failed to delete case' });
    }
  });
}
