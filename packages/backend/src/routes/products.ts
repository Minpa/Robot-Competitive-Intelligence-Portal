import { FastifyInstance } from 'fastify';
import { productService, productSpecService, productDetailService } from '../services/index.js';
import {
  CreateProductSchema,
  UpdateProductSchema,
  CreateProductSpecSchema,
  UpdateProductSpecSchema,
  ProductFiltersSchema,
  PaginationSchema,
} from '../types/dto.js';

export async function productRoutes(fastify: FastifyInstance) {
  // List products
  fastify.get('/', async (request) => {
    const filters = ProductFiltersSchema.parse(request.query);
    const pagination = PaginationSchema.parse(request.query);
    return productService.list(filters, pagination);
  });

  // Get product by ID
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const product = await productService.getById(request.params.id);
    if (!product) {
      reply.status(404).send({ error: 'Product not found' });
      return;
    }
    return product;
  });

  // Get product with full details (aggregated view)
  fastify.get<{ Params: { id: string } }>('/:id/details', async (request, reply) => {
    const details = await productDetailService.getProductDetail(request.params.id);
    if (!details) {
      reply.status(404).send({ error: 'Product not found' });
      return;
    }
    return details;
  });

  // Get product timeline
  fastify.get<{ Params: { id: string } }>('/:id/timeline', async (request) => {
    const query = request.query as Record<string, string>;
    return productDetailService.getProductTimeline(request.params.id, {
      startDate: query.startDate,
      endDate: query.endDate,
      limit: query.limit ? parseInt(query.limit) : undefined,
    });
  });

  // Compare products
  fastify.get('/compare', async (request) => {
    const { ids } = request.query as { ids?: string };
    if (!ids) {
      return { error: 'Product IDs required (comma-separated)' };
    }
    const productIds = ids.split(',').map(id => id.trim());
    return productDetailService.compareProducts(productIds);
  });

  // Create product
  fastify.post('/', async (request, reply) => {
    try {
      const data = CreateProductSchema.parse(request.body);
      const product = await productService.create(data);
      reply.status(201).send(product);
    } catch (error) {
      reply.status(400).send({ error: (error as Error).message });
    }
  });

  // Update product
  fastify.put<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try {
      const data = UpdateProductSchema.parse(request.body);
      const product = await productService.update(request.params.id, data);
      if (!product) {
        reply.status(404).send({ error: 'Product not found' });
        return;
      }
      return product;
    } catch (error) {
      reply.status(400).send({ error: (error as Error).message });
    }
  });

  // Delete product
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const deleted = await productService.delete(request.params.id);
    if (!deleted) {
      reply.status(404).send({ error: 'Product not found' });
      return;
    }
    reply.status(204).send();
  });

  // Get products by company
  fastify.get<{ Params: { companyId: string } }>(
    '/by-company/:companyId',
    async (request) => {
      return productService.getByCompany(request.params.companyId);
    }
  );

  // Product specs
  fastify.get<{ Params: { id: string } }>('/:id/spec', async (request, reply) => {
    const spec = await productSpecService.getByProductId(request.params.id);
    if (!spec) {
      reply.status(404).send({ error: 'Product spec not found' });
      return;
    }
    return spec;
  });

  fastify.post<{ Params: { id: string } }>('/:id/spec', async (request, reply) => {
    try {
      const body = request.body as Record<string, unknown>;
      const data = CreateProductSpecSchema.parse({
        ...body,
        productId: request.params.id,
      });
      const spec = await productSpecService.create(data);
      reply.status(201).send(spec);
    } catch (error) {
      reply.status(400).send({ error: (error as Error).message });
    }
  });

  fastify.put<{ Params: { id: string } }>('/:id/spec', async (request, reply) => {
    try {
      const data = UpdateProductSpecSchema.parse(request.body);
      const spec = await productSpecService.update(request.params.id, data);
      if (!spec) {
        reply.status(404).send({ error: 'Product spec not found' });
        return;
      }
      return spec;
    } catch (error) {
      reply.status(400).send({ error: (error as Error).message });
    }
  });
}
