import type { FastifyInstance } from 'fastify';
import { exportService } from '../services/export.service.js';
import { pptGeneratorService } from '../services/ppt-generator.service.js';
import { CompanyFiltersSchema, ProductFiltersSchema, ArticleFiltersSchema } from '../types/dto.js';

export async function exportRoutes(fastify: FastifyInstance) {
  // Export companies
  fastify.get('/companies', async (request, reply) => {
    const query = request.query as Record<string, string>;
    const filters = CompanyFiltersSchema.parse(query);
    const format = (query.format as 'csv' | 'json') || 'csv';
    
    const data = await exportService.exportCompanies(filters, { format });
    
    if (format === 'csv') {
      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', 'attachment; filename="companies.csv"');
    } else {
      reply.header('Content-Type', 'application/json');
      reply.header('Content-Disposition', 'attachment; filename="companies.json"');
    }
    
    return data;
  });

  // Export products
  fastify.get('/products', async (request, reply) => {
    const query = request.query as Record<string, string>;
    const filters = ProductFiltersSchema.parse(query);
    const format = (query.format as 'csv' | 'json') || 'csv';
    const includeSpecs = query.includeSpecs === 'true';
    
    const data = includeSpecs
      ? await exportService.exportProductsWithSpecs(filters, { format })
      : await exportService.exportProducts(filters, { format });
    
    if (format === 'csv') {
      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', 'attachment; filename="products.csv"');
    } else {
      reply.header('Content-Type', 'application/json');
      reply.header('Content-Disposition', 'attachment; filename="products.json"');
    }
    
    return data;
  });

  // Export articles
  fastify.get('/articles', async (request, reply) => {
    const query = request.query as Record<string, string>;
    const filters = ArticleFiltersSchema.parse(query);
    const format = (query.format as 'csv' | 'json') || 'csv';
    
    const data = await exportService.exportArticles(filters, { format });
    
    if (format === 'csv') {
      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', 'attachment; filename="articles.csv"');
    } else {
      reply.header('Content-Type', 'application/json');
      reply.header('Content-Disposition', 'attachment; filename="articles.json"');
    }
    
    return data;
  });

  // Generate HTML report
  fastify.post('/report', async (request, reply) => {
    const body = request.body as {
      title: string;
      sections: Array<{
        title: string;
        type: 'companies' | 'products' | 'articles';
        filters?: Record<string, unknown>;
      }>;
      theme?: 'light' | 'dark';
    };
    
    const html = await exportService.generateReport(body);
    
    reply.header('Content-Type', 'text/html');
    return html;
  });

  // Get PPT templates
  fastify.get('/ppt/templates', async () => {
    return pptGeneratorService.getTemplates();
  });

  // Generate PPT slides
  fastify.post('/ppt/generate', async (request) => {
    const body = request.body as {
      template: 'market_overview' | 'company_deep_dive' | 'tech_components' | 'use_case';
      theme: 'light' | 'dark';
      title: string;
      subtitle?: string;
      companyIds?: string[];
      robotIds?: string[];
      includeCharts?: boolean;
      includeTables?: boolean;
    };
    
    return pptGeneratorService.generateSlides(body);
  });
}
