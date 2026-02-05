import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerRoutes } from './routes/index.js';

const fastify = Fastify({
  logger: true,
});

// Allow empty body for POST requests
fastify.addContentTypeParser('application/json', { parseAs: 'string' }, function (_req, body, done) {
  try {
    const json = body ? JSON.parse(body as string) : {};
    done(null, json);
  } catch (err) {
    done(err as Error, undefined);
  }
});

fastify.register(cors, {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// Register API routes
registerRoutes(fastify);

fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Backend server running on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
