import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { registerRoutes } from './routes/index.js';
import { aiUsageService } from './services/ai-usage.service.js';
import { fixSocPowerConsumption } from './db/fix-soc-startup.js';
import { ciUpdateService } from './services/ci-update.service.js';
import { benchmarkService } from './services/benchmark.service.js';
import { seedCiData } from './db/seed-ci.js';
import { schedulerService } from './services/scheduler.service.js';

const fastify = Fastify({
  logger: true,
});

// File uploads (used for Excel import, etc.)
fastify.register(multipart, {
  attachFieldsToBody: true,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max
  },
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
    await aiUsageService.ensureTable();
    await fixSocPowerConsumption();
    await ciUpdateService.ensureTables();
    await benchmarkService.ensureTables();
    await seedCiData();
    await fastify.listen({ port, host: '0.0.0.0' });
    schedulerService.init();
    console.log(`Backend server running on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
