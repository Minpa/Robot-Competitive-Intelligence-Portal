import { FastifyInstance } from 'fastify';
import { companyService } from '../services/index.js';
import {
  CreateCompanySchema,
  UpdateCompanySchema,
  CompanyFiltersSchema,
  PaginationSchema,
} from '../types/dto.js';

export async function companyRoutes(fastify: FastifyInstance) {
  // List companies
  fastify.get('/', async (request) => {
    const filters = CompanyFiltersSchema.parse(request.query);
    const pagination = PaginationSchema.parse(request.query);
    return companyService.list(filters, pagination);
  });

  // Get company by ID
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const company = await companyService.getById(request.params.id);
    if (!company) {
      reply.status(404).send({ error: 'Company not found' });
      return;
    }
    return company;
  });

  // Create company
  fastify.post('/', async (request, reply) => {
    try {
      const data = CreateCompanySchema.parse(request.body);
      const company = await companyService.create(data);
      reply.status(201).send(company);
    } catch (error) {
      reply.status(400).send({ error: (error as Error).message });
    }
  });

  // Update company
  fastify.put<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try {
      const data = UpdateCompanySchema.parse(request.body);
      const company = await companyService.update(request.params.id, data);
      if (!company) {
        reply.status(404).send({ error: 'Company not found' });
        return;
      }
      return company;
    } catch (error) {
      reply.status(400).send({ error: (error as Error).message });
    }
  });

  // Delete company
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const deleted = await companyService.delete(request.params.id);
    if (!deleted) {
      reply.status(404).send({ error: 'Company not found' });
      return;
    }
    reply.status(204).send();
  });

  // Search companies
  fastify.get<{ Querystring: { q: string } }>('/search', async (request) => {
    return companyService.search(request.query.q || '');
  });
}
