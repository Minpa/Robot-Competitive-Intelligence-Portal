import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { humanoidRobotService } from '../services/index.js';
import { db, humanoidRobots, applicationCases, companies } from '../db/index.js';
import { eq, and, sql, inArray } from 'drizzle-orm';

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
        field: (query.sortField as 'name' | 'company' | 'announcementYear' | 'commercializationStage' | 'competitiveness') || 'name',
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

  // Check duplicate robots (same company, similar name)
  fastify.get('/check-duplicates', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      return await humanoidRobotService.findDuplicates();
    } catch (error) {
      console.error('Error checking duplicates:', error);
      reply.status(500).send({ error: 'Failed to check duplicates' });
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

  // Get robots grouped by announcement year (for timeline drill-down)
  fastify.get('/by-year/:year', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { year } = request.params as { year: string };
      const yearNum = Number(year);
      if (isNaN(yearNum)) {
        return reply.status(400).send({ error: 'Invalid year' });
      }
      const result = await humanoidRobotService.listRobots(
        { announcementYearMin: yearNum, announcementYearMax: yearNum },
        { page: 1, limit: 100 },
        { field: 'name', direction: 'asc' }
      );
      return result.data.map(r => ({
        id: r.robot.id,
        name: r.robot.name,
        companyName: r.company?.name || null,
        purpose: r.robot.purpose,
        commercializationStage: r.robot.commercializationStage,
        status: r.robot.status,
      }));
    } catch (error) {
      console.error('Error getting robots by year:', error);
      reply.status(500).send({ error: 'Failed to get robots by year' });
    }
  });

  // Get robots by year filtered by category (for timeline drill-down)
  fastify.get('/by-year/:year/:category', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { year, category } = request.params as { year: string; category: string };
      const yearNum = Number(year);
      if (isNaN(yearNum)) {
        return reply.status(400).send({ error: 'Invalid year' });
      }

      if (category === 'newProducts') {
        // 신규 제품: robots announced in this year
        const result = await humanoidRobotService.listRobots(
          { announcementYearMin: yearNum, announcementYearMax: yearNum },
          { page: 1, limit: 100 },
          { field: 'name', direction: 'asc' }
        );
        return result.data.map(r => ({
          id: r.robot.id,
          name: r.robot.name,
          companyName: r.company?.name || null,
          purpose: r.robot.purpose,
          commercializationStage: r.robot.commercializationStage,
          status: r.robot.status,
        }));
      }

      if (category === 'pocs') {
        // PoC: application_cases with status pilot/poc in this year
        const yearStart = `${yearNum}-01-01`;
        const yearEnd = `${yearNum}-12-31`;
        const cases = await db
          .select({
            robotId: applicationCases.robotId,
            robotName: humanoidRobots.name,
            companyName: companies.name,
            purpose: humanoidRobots.purpose,
            commercializationStage: humanoidRobots.commercializationStage,
            status: humanoidRobots.status,
          })
          .from(applicationCases)
          .innerJoin(humanoidRobots, eq(applicationCases.robotId, humanoidRobots.id))
          .leftJoin(companies, eq(humanoidRobots.companyId, companies.id))
          .where(and(
            sql`${applicationCases.demoDate} >= ${yearStart}`,
            sql`${applicationCases.demoDate} <= ${yearEnd}`,
            inArray(applicationCases.deploymentStatus, ['pilot', 'poc'])
          ));

        // Deduplicate by robot
        const seen = new Set<string>();
        return cases.filter(c => {
          if (seen.has(c.robotId)) return false;
          seen.add(c.robotId);
          return true;
        }).map(c => ({
          id: c.robotId,
          name: c.robotName,
          companyName: c.companyName || null,
          purpose: c.purpose,
          commercializationStage: c.commercializationStage,
          status: c.status,
        }));
      }

      if (category === 'productions') {
        // 양산: application_cases with status production in this year
        const yearStart = `${yearNum}-01-01`;
        const yearEnd = `${yearNum}-12-31`;
        const cases = await db
          .select({
            robotId: applicationCases.robotId,
            robotName: humanoidRobots.name,
            companyName: companies.name,
            purpose: humanoidRobots.purpose,
            commercializationStage: humanoidRobots.commercializationStage,
            status: humanoidRobots.status,
          })
          .from(applicationCases)
          .innerJoin(humanoidRobots, eq(applicationCases.robotId, humanoidRobots.id))
          .leftJoin(companies, eq(humanoidRobots.companyId, companies.id))
          .where(and(
            sql`${applicationCases.demoDate} >= ${yearStart}`,
            sql`${applicationCases.demoDate} <= ${yearEnd}`,
            eq(applicationCases.deploymentStatus, 'production')
          ));

        const seen = new Set<string>();
        return cases.filter(c => {
          if (seen.has(c.robotId)) return false;
          seen.add(c.robotId);
          return true;
        }).map(c => ({
          id: c.robotId,
          name: c.robotName,
          companyName: c.companyName || null,
          purpose: c.purpose,
          commercializationStage: c.commercializationStage,
          status: c.status,
        }));
      }

      return reply.status(400).send({ error: 'Invalid category. Use: pocs, productions, newProducts' });
    } catch (error) {
      console.error('Error getting robots by year/category:', error);
      reply.status(500).send({ error: 'Failed to get robots by year/category' });
    }
  });

  // Evolution timeline: robots grouped by company with year progression
  fastify.get('/evolution-timeline', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as Record<string, string>;
      const regionFilter = query.region; // optional filter

      const conditions = [];
      if (regionFilter) {
        conditions.push(eq(humanoidRobots.region, regionFilter));
      }

      const rows = await db
        .select({
          robotId: humanoidRobots.id,
          robotName: humanoidRobots.name,
          announcementYear: humanoidRobots.announcementYear,
          announcementQuarter: humanoidRobots.announcementQuarter,
          purpose: humanoidRobots.purpose,
          stage: humanoidRobots.commercializationStage,
          region: humanoidRobots.region,
          description: humanoidRobots.description,
          dataType: humanoidRobots.dataType,
          forecastRationale: humanoidRobots.forecastRationale,
          forecastSources: humanoidRobots.forecastSources,
          forecastConfidence: humanoidRobots.forecastConfidence,
          companyId: companies.id,
          companyName: companies.name,
          companyCountry: companies.country,
        })
        .from(humanoidRobots)
        .innerJoin(companies, eq(humanoidRobots.companyId, companies.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(companies.name, humanoidRobots.announcementYear);

      // Group by company
      const companyMap = new Map<string, {
        companyId: string;
        companyName: string;
        companyCountry: string | null;
        robots: {
          id: string;
          name: string;
          year: number | null;
          quarter: number | null;
          purpose: string | null;
          stage: string | null;
          description: string | null;
          dataType: string | null;
          forecastRationale: string | null;
          forecastSources: string | null;
          forecastConfidence: string | null;
        }[];
      }>();

      for (const row of rows) {
        if (!companyMap.has(row.companyId)) {
          companyMap.set(row.companyId, {
            companyId: row.companyId,
            companyName: row.companyName,
            companyCountry: row.companyCountry,
            robots: [],
          });
        }
        companyMap.get(row.companyId)!.robots.push({
          id: row.robotId,
          name: row.robotName,
          year: row.announcementYear,
          quarter: row.announcementQuarter ?? 1,
          purpose: row.purpose,
          stage: row.stage,
          description: row.description,
          dataType: row.dataType,
          forecastRationale: row.forecastRationale,
          forecastSources: row.forecastSources,
          forecastConfidence: row.forecastConfidence,
        });
      }

      // Only include companies with at least one robot that has a year
      const companies_list = Array.from(companyMap.values())
        .filter(c => c.robots.some(r => r.year != null))
        .sort((a, b) => {
          const aMin = Math.min(...a.robots.filter(r => r.year != null).map(r => r.year!));
          const bMin = Math.min(...b.robots.filter(r => r.year != null).map(r => r.year!));
          return aMin - bMin;
        });

      // Compute year range
      const allYears = rows.filter(r => r.announcementYear != null).map(r => r.announcementYear!);
      const minYear = allYears.length > 0 ? Math.min(...allYears) : 2019;
      const maxYear = allYears.length > 0 ? Math.max(...allYears) : new Date().getFullYear();

      return {
        companies: companies_list,
        yearRange: { min: minYear, max: Math.max(maxYear, new Date().getFullYear()) },
        totalRobots: rows.length,
      };
    } catch (error) {
      console.error('Error getting evolution timeline:', error);
      reply.status(500).send({ error: 'Failed to get evolution timeline' });
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
