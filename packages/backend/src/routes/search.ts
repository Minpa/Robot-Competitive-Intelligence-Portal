import type { FastifyInstance } from 'fastify';
import { searchService } from '../services/search.service.js';
import { db, companies, articles, humanoidRobots } from '../db/index.js';
import { ilike, or } from 'drizzle-orm';

async function dbFallbackSearch(query: string, limit: number = 10) {
  const pattern = `%${query}%`;

  const [companyResults, robotResults, articleResults] = await Promise.all([
    db.select({
      id: companies.id,
      name: companies.name,
      country: companies.country,
      description: companies.description,
    })
      .from(companies)
      .where(
        or(
          ilike(companies.name, pattern),
          ilike(companies.description, pattern),
          ilike(companies.mainBusiness, pattern),
        )
      )
      .limit(limit),

    db.select({
      id: humanoidRobots.id,
      name: humanoidRobots.name,
      purpose: humanoidRobots.purpose,
      locomotionType: humanoidRobots.locomotionType,
      description: humanoidRobots.description,
    })
      .from(humanoidRobots)
      .where(
        or(
          ilike(humanoidRobots.name, pattern),
          ilike(humanoidRobots.description, pattern),
        )
      )
      .limit(limit),

    db.select({
      id: articles.id,
      title: articles.title,
      source: articles.source,
      summary: articles.summary,
    })
      .from(articles)
      .where(
        or(
          ilike(articles.title, pattern),
          ilike(articles.summary, pattern),
        )
      )
      .limit(limit),
  ]);

  return {
    companies: {
      hits: companyResults.map((c) => ({ id: c.id, score: 1, source: c })),
      total: companyResults.length,
    },
    robots: {
      hits: robotResults.map((r) => ({ id: r.id, score: 1, source: r })),
      total: robotResults.length,
    },
    articles: {
      hits: articleResults.map((a) => ({ id: a.id, score: 1, source: a })),
      total: articleResults.length,
    },
    totalHits: companyResults.length + robotResults.length + articleResults.length,
  };
}

export async function searchRoutes(fastify: FastifyInstance) {
  // Global search
  fastify.get('/', async (request) => {
    const { q, limit } = request.query as { q?: string; limit?: string };

    if (!q) {
      return { error: 'Query parameter "q" is required' };
    }

    const searchLimit = limit ? parseInt(limit) : 10;

    const result = await searchService.search(q, {
      limit: searchLimit,
    });

    if (!result) {
      // Fallback to database search when Elasticsearch is unavailable
      return await dbFallbackSearch(q, searchLimit);
    }

    return result;
  });

  // Search companies
  fastify.get('/companies', async (request) => {
    const query = request.query as Record<string, string>;
    
    const result = await searchService.searchCompanies(
      query.q || '',
      {
        country: query.country,
        category: query.category,
      },
      {
        page: parseInt(query.page || '1'),
        pageSize: parseInt(query.pageSize || '20'),
      }
    );

    if (!result) {
      return { error: 'Search service unavailable', fallback: true };
    }

    return result;
  });

  // Search products
  fastify.get('/products', async (request) => {
    const query = request.query as Record<string, string>;
    
    const result = await searchService.searchProducts(
      query.q || '',
      {
        companyId: query.companyId,
        type: query.type,
        status: query.status,
        releaseYear: query.releaseYear ? parseInt(query.releaseYear) : undefined,
        priceMin: query.priceMin ? parseFloat(query.priceMin) : undefined,
        priceMax: query.priceMax ? parseFloat(query.priceMax) : undefined,
        dofMin: query.dofMin ? parseInt(query.dofMin) : undefined,
        dofMax: query.dofMax ? parseInt(query.dofMax) : undefined,
        payloadMin: query.payloadMin ? parseFloat(query.payloadMin) : undefined,
        payloadMax: query.payloadMax ? parseFloat(query.payloadMax) : undefined,
        keywords: query.keywords ? query.keywords.split(',') : undefined,
      },
      {
        page: parseInt(query.page || '1'),
        pageSize: parseInt(query.pageSize || '20'),
        sortBy: query.sortBy,
        sortOrder: (query.sortOrder as 'asc' | 'desc') || 'desc',
      }
    );

    if (!result) {
      return { error: 'Search service unavailable', fallback: true };
    }

    return result;
  });

  // Search articles
  fastify.get('/articles', async (request) => {
    const query = request.query as Record<string, string>;
    
    const result = await searchService.searchArticles(
      query.q || '',
      {
        companyId: query.companyId,
        productId: query.productId,
        source: query.source,
        language: query.language,
        publishedAfter: query.publishedAfter,
        publishedBefore: query.publishedBefore,
        keywords: query.keywords ? query.keywords.split(',') : undefined,
      },
      {
        page: parseInt(query.page || '1'),
        pageSize: parseInt(query.pageSize || '20'),
        sortBy: query.sortBy,
        sortOrder: (query.sortOrder as 'asc' | 'desc') || 'desc',
      }
    );

    if (!result) {
      return { error: 'Search service unavailable', fallback: true };
    }

    return result;
  });

  // Autocomplete
  fastify.get('/autocomplete', async (request) => {
    const { prefix, type } = request.query as { prefix?: string; type?: string };
    
    if (!prefix) {
      return [];
    }

    return searchService.autocomplete(
      prefix,
      type as 'company' | 'product' | 'article' | undefined
    );
  });
}
