import { FastifyInstance } from 'fastify';
import { companyRoutes } from './companies.js';
import { productRoutes } from './products.js';
import { articleRoutes } from './articles.js';
import { keywordsRoutes } from './keywords.js';
import { searchRoutes } from './search.js';
import { dashboardRoutes } from './dashboard.js';
import { exportRoutes } from './export.js';
import { adminRoutes } from './admin.js';
import { authRoutes } from './auth.js';
import { analyzeRoutes } from './analyze.js';

export async function registerRoutes(fastify: FastifyInstance) {
  fastify.register(companyRoutes, { prefix: '/api/companies' });
  fastify.register(productRoutes, { prefix: '/api/products' });
  fastify.register(articleRoutes, { prefix: '/api/articles' });
  fastify.register(keywordsRoutes, { prefix: '/api/keywords' });
  fastify.register(searchRoutes, { prefix: '/api/search' });
  fastify.register(dashboardRoutes, { prefix: '/api/dashboard' });
  fastify.register(exportRoutes, { prefix: '/api/export' });
  fastify.register(adminRoutes, { prefix: '/api/admin' });
  fastify.register(authRoutes, { prefix: '/api/auth' });
  fastify.register(analyzeRoutes, { prefix: '/api/analyze' });
}
