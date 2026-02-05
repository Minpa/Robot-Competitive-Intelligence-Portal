import { FastifyInstance } from 'fastify';

const CRAWLER_URL = process.env.CRAWLER_URL || 'http://localhost:3003';

export async function legalRoutes(fastify: FastifyInstance) {
  // Collect all public data
  fastify.post('/collect-public-data', async (_request, reply) => {
    try {
      const response = await fetch(`${CRAWLER_URL}/legal/collect-public-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        throw new Error(`Crawler error: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // Collect arXiv papers
  fastify.post('/arxiv', async (_request, reply) => {
    try {
      const response = await fetch(`${CRAWLER_URL}/legal/arxiv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        throw new Error(`Crawler error: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // Collect GitHub repos
  fastify.post('/github', async (_request, reply) => {
    try {
      const response = await fetch(`${CRAWLER_URL}/legal/github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        throw new Error(`Crawler error: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // Collect SEC EDGAR filings
  fastify.post('/sec-edgar', async (_request, reply) => {
    try {
      const response = await fetch(`${CRAWLER_URL}/legal/sec-edgar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        throw new Error(`Crawler error: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // Collect USPTO patents
  fastify.post('/patents', async (_request, reply) => {
    try {
      const response = await fetch(`${CRAWLER_URL}/legal/patents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        throw new Error(`Crawler error: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });
}
