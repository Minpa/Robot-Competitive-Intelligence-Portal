import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { componentService } from '../services/index.js';

export async function componentRoutes(fastify: FastifyInstance) {
  // List components with filters
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as Record<string, string>;
      const filters = {
        type: query.type,
        vendor: query.vendor,
        search: query.search,
      };

      const pagination = {
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 20,
      };

      const result = await componentService.listComponents(filters, pagination);
      return result;
    } catch (error) {
      console.error('Error listing components:', error);
      reply.status(500).send({ error: 'Failed to list components' });
    }
  });

  // Get torque density scatter data
  fastify.get('/charts/torque-scatter', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await componentService.getTorqueDensityScatterData();
      return data;
    } catch (error) {
      console.error('Error getting torque scatter data:', error);
      reply.status(500).send({ error: 'Failed to get torque scatter data' });
    }
  });

  // Get TOPS timeline data
  fastify.get('/charts/tops-timeline', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await componentService.getTopsTimelineData();
      return data;
    } catch (error) {
      console.error('Error getting TOPS timeline data:', error);
      reply.status(500).send({ error: 'Failed to get TOPS timeline data' });
    }
  });

  // Get computing location distribution
  fastify.get('/charts/computing-location', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await componentService.getComputingLocationDistribution();
      return data;
    } catch (error) {
      console.error('Error getting computing location distribution:', error);
      reply.status(500).send({ error: 'Failed to get computing location distribution' });
    }
  });

  // Get vendors by type
  fastify.get('/vendors/:type', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { type } = request.params as { type: string };
      const vendors = await componentService.getVendorsByType(type);
      return vendors;
    } catch (error) {
      console.error('Error getting vendors:', error);
      reply.status(500).send({ error: 'Failed to get vendors' });
    }
  });

  // Get components by robot
  fastify.get('/robot/:robotId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { robotId } = request.params as { robotId: string };
      const components = await componentService.getComponentsByRobot(robotId);
      return components;
    } catch (error) {
      console.error('Error getting components by robot:', error);
      reply.status(500).send({ error: 'Failed to get components by robot' });
    }
  });

  // Get component by ID
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const component = await componentService.getComponent(id);
      if (!component) {
        return reply.status(404).send({ error: 'Component not found' });
      }
      return component;
    } catch (error) {
      console.error('Error getting component:', error);
      reply.status(500).send({ error: 'Failed to get component' });
    }
  });

  // Create component
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const component = await componentService.createComponent(request.body as any);
      reply.status(201).send(component);
    } catch (error) {
      console.error('Error creating component:', error);
      reply.status(500).send({ error: 'Failed to create component' });
    }
  });

  // Update component
  fastify.put('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const component = await componentService.updateComponent(id, request.body as any);
      if (!component) {
        return reply.status(404).send({ error: 'Component not found' });
      }
      return component;
    } catch (error) {
      console.error('Error updating component:', error);
      reply.status(500).send({ error: 'Failed to update component' });
    }
  });

  // Delete component
  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      await componentService.deleteComponent(id);
      reply.status(204).send();
    } catch (error) {
      console.error('Error deleting component:', error);
      reply.status(500).send({ error: 'Failed to delete component' });
    }
  });

  // Link component to robot
  fastify.post('/robot/:robotId/link/:componentId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { robotId, componentId } = request.params as { robotId: string; componentId: string };
      const { usageLocation, quantity } = request.body as { usageLocation?: string; quantity?: number };
      const link = await componentService.linkComponentToRobot(robotId, componentId, usageLocation, quantity);
      reply.status(201).send(link);
    } catch (error) {
      console.error('Error linking component:', error);
      reply.status(500).send({ error: 'Failed to link component' });
    }
  });

  // Unlink component from robot
  fastify.delete('/robot/:robotId/link/:componentId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { robotId, componentId } = request.params as { robotId: string; componentId: string };
      await componentService.unlinkComponentFromRobot(robotId, componentId);
      reply.status(204).send();
    } catch (error) {
      console.error('Error unlinking component:', error);
      reply.status(500).send({ error: 'Failed to unlink component' });
    }
  });
}
