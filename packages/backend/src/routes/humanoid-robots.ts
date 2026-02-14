import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { humanoidRobotService } from '../services/index.js';

export async function humanoidRobotRoutes(fastify: FastifyInstance) {
  // List robots with filters
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as Record<string, string>;
      const filters = {
        purpose: query.purpose,
        locomotionType: query.locomotionType,
        handType: query.handType,
        commercializationStage: query.commercializationStage,
        region: query.region,
        companyId: query.companyId,
        announcementYearMin: query.announcementYearMin ? Number(query.announcementYearMin) : undefined,
        announcementYearMax: query.announcementYearMax ? Number(query.announcementYearMax) : undefined,
        search: query.search,
      };

      const pagination = {
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 20,
      };

      const sort = {
        field: (query.sortField as 'name' | 'company' | 'announcementYear' | 'commercializationStage') || 'name',
        direction: (query.sortDirection as 'asc' | 'desc') || 'asc',
      };

      const result = await humanoidRobotService.listRobots(filters, pagination, sort);
      return result;
    } catch (error) {
      console.error('Error listing robots:', error);
      reply.status(500).send({ error: 'Failed to list robots' });
    }
  });

  // Search robots
  fastify.get('/search', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as Record<string, string>;
      const q = query.q;
      const limit = Number(query.limit) || 10;
      
      if (!q) {
        return [];
      }

      const robots = await humanoidRobotService.searchRobots(q, limit);
      return robots;
    } catch (error) {
      console.error('Error searching robots:', error);
      reply.status(500).send({ error: 'Failed to search robots' });
    }
  });

  // Get segment matrix
  fastify.get('/segment-matrix', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const matrix = await humanoidRobotService.getSegmentMatrix();
      return matrix;
    } catch (error) {
      console.error('Error getting segment matrix:', error);
      reply.status(500).send({ error: 'Failed to get segment matrix' });
    }
  });

  // Get hand type distribution
  fastify.get('/hand-distribution', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const distribution = await humanoidRobotService.getHandTypeDistribution();
      return distribution;
    } catch (error) {
      console.error('Error getting hand distribution:', error);
      reply.status(500).send({ error: 'Failed to get hand distribution' });
    }
  });

  // Get summary
  fastify.get('/summary', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const summary = await humanoidRobotService.getSummary();
      return summary;
    } catch (error) {
      console.error('Error getting summary:', error);
      reply.status(500).send({ error: 'Failed to get summary' });
    }
  });

  // Get robot by ID
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const robot = await humanoidRobotService.getRobot(id);
      if (!robot) {
        return reply.status(404).send({ error: 'Robot not found' });
      }
      return robot;
    } catch (error) {
      console.error('Error getting robot:', error);
      reply.status(500).send({ error: 'Failed to get robot' });
    }
  });

  // Get radar chart data
  fastify.get('/:id/radar', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const data = await humanoidRobotService.getRadarChartData(id);
      if (!data) {
        return reply.status(404).send({ error: 'Robot not found' });
      }
      return data;
    } catch (error) {
      console.error('Error getting radar data:', error);
      reply.status(500).send({ error: 'Failed to get radar data' });
    }
  });

  // Create robot
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const robot = await humanoidRobotService.createRobot(request.body as any);
      reply.status(201).send(robot);
    } catch (error) {
      console.error('Error creating robot:', error);
      reply.status(500).send({ error: 'Failed to create robot' });
    }
  });

  // Update robot
  fastify.put('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const robot = await humanoidRobotService.updateRobot(id, request.body as any);
      if (!robot) {
        return reply.status(404).send({ error: 'Robot not found' });
      }
      return robot;
    } catch (error) {
      console.error('Error updating robot:', error);
      reply.status(500).send({ error: 'Failed to update robot' });
    }
  });

  // Delete robot
  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      await humanoidRobotService.deleteRobot(id);
      reply.status(204).send();
    } catch (error) {
      console.error('Error deleting robot:', error);
      reply.status(500).send({ error: 'Failed to delete robot' });
    }
  });

  // Spec endpoints
  fastify.put('/:id/body-spec', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const spec = await humanoidRobotService.upsertBodySpec(id, request.body as any);
      return spec;
    } catch (error) {
      console.error('Error updating body spec:', error);
      reply.status(500).send({ error: 'Failed to update body spec' });
    }
  });

  fastify.put('/:id/hand-spec', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const spec = await humanoidRobotService.upsertHandSpec(id, request.body as any);
      return spec;
    } catch (error) {
      console.error('Error updating hand spec:', error);
      reply.status(500).send({ error: 'Failed to update hand spec' });
    }
  });

  fastify.put('/:id/computing-spec', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const spec = await humanoidRobotService.upsertComputingSpec(id, request.body as any);
      return spec;
    } catch (error) {
      console.error('Error updating computing spec:', error);
      reply.status(500).send({ error: 'Failed to update computing spec' });
    }
  });

  fastify.put('/:id/sensor-spec', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const spec = await humanoidRobotService.upsertSensorSpec(id, request.body as any);
      return spec;
    } catch (error) {
      console.error('Error updating sensor spec:', error);
      reply.status(500).send({ error: 'Failed to update sensor spec' });
    }
  });

  fastify.put('/:id/power-spec', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const spec = await humanoidRobotService.upsertPowerSpec(id, request.body as any);
      return spec;
    } catch (error) {
      console.error('Error updating power spec:', error);
      reply.status(500).send({ error: 'Failed to update power spec' });
    }
  });
}
