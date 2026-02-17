/**
 * 엔티티 검토 API - 최근 생성된 엔티티의 품질 검토
 */

import { FastifyInstance } from 'fastify';
import { db, companies, humanoidRobots, components, keywords, applicationCases } from '../db/index.js';
import { gte, sql } from 'drizzle-orm';
import { validationRulesEngine } from '../services/validation-rules.service.js';

interface ReviewEntity {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  issues: { field: string; message: string; severity: 'error' | 'warning' }[];
}

export async function reviewRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { period?: string; type?: string } }>(
    '/entities',
    async (request) => {
      const { period = '30d', type } = request.query;
      const days = period === '7d' ? 7 : period === 'all' ? 365 * 10 : 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const results: ReviewEntity[] = [];

      // 회사 검토
      if (!type || type === 'company') {
        const rows = await db.select().from(companies).where(gte(companies.createdAt, since));
        for (const row of rows) {
          const validation = validationRulesEngine.validate('company', row as any);
          const issues = [
            ...validation.errors.map(e => ({ field: e.field, message: e.message, severity: 'error' as const })),
            ...validation.warnings.map(w => ({ field: w.field, message: w.message, severity: 'warning' as const })),
          ];
          results.push({ id: row.id, name: row.name, type: 'company', createdAt: row.createdAt.toISOString(), issues });
        }
      }

      // 로봇 검토
      if (!type || type === 'robot') {
        const rows = await db.select().from(humanoidRobots).where(gte(humanoidRobots.createdAt, since));
        for (const row of rows) {
          const validation = validationRulesEngine.validate('humanoid_robot', row as any);
          const issues = [
            ...validation.errors.map(e => ({ field: e.field, message: e.message, severity: 'error' as const })),
            ...validation.warnings.map(w => ({ field: w.field, message: w.message, severity: 'warning' as const })),
          ];
          results.push({ id: row.id, name: row.name, type: 'robot', createdAt: row.createdAt.toISOString(), issues });
        }
      }

      // 부품 검토
      if (!type || type === 'component') {
        const rows = await db.select().from(components).where(gte(components.createdAt, since));
        for (const row of rows) {
          const validation = validationRulesEngine.validate('component', row as any);
          const issues = [
            ...validation.errors.map(e => ({ field: e.field, message: e.message, severity: 'error' as const })),
            ...validation.warnings.map(w => ({ field: w.field, message: w.message, severity: 'warning' as const })),
          ];
          results.push({ id: row.id, name: row.name, type: 'component', createdAt: row.createdAt.toISOString(), issues });
        }
      }

      // 적용 사례 검토
      if (!type || type === 'application') {
        const rows = await db.select().from(applicationCases).where(gte(applicationCases.createdAt, since));
        for (const row of rows) {
          const validation = validationRulesEngine.validate('application_case', row as any);
          const issues = [
            ...validation.errors.map(e => ({ field: e.field, message: e.message, severity: 'error' as const })),
            ...validation.warnings.map(w => ({ field: w.field, message: w.message, severity: 'warning' as const })),
          ];
          results.push({
            id: row.id,
            name: row.taskDescription || `Case ${row.id.substring(0, 8)}`,
            type: 'application',
            createdAt: row.createdAt.toISOString(),
            issues,
          });
        }
      }

      const withIssues = results.filter(r => r.issues.length > 0);
      const withoutIssues = results.filter(r => r.issues.length === 0);

      return {
        total: results.length,
        withIssues: withIssues.length,
        entities: [...withIssues, ...withoutIssues],
      };
    }
  );
}
