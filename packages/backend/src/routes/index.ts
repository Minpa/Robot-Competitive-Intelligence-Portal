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
import { humanoidRobotRoutes } from './humanoid-robots.js';
import { workforceRoutes } from './workforce.js';
import { componentRoutes } from './components.js';
import { applicationCaseRoutes } from './application-cases.js';
import { articleAnalyzerRoutes } from './article-analyzer.js';
import { analysisRoutes } from './analysis.js';
import { aggregationRoutes } from './aggregation.js';
import { insightsRoutes } from './insights.js';
import { reviewRoutes } from './review.js';
import { executiveRoutes } from './executive.js';
import { entityAliasRoutes } from './entity-aliases.js';
import { humanoidTrendRoutes } from './humanoid-trend.js';
import { visionCostRoutes } from './vision-cost.js';
import { scoringPipelineRoutes } from './scoring-pipeline.js';
import { warRoomRoutes } from './war-room.js';
import { seedScoresRoutes } from './seed-scores.js';
import { ciUpdateRoutes } from './ci-update.js';

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
  
  // 휴머노이드 로봇 전용 라우트
  fastify.register(humanoidRobotRoutes, { prefix: '/api/humanoid-robots' });
  fastify.register(workforceRoutes, { prefix: '/api/workforce' });
  fastify.register(componentRoutes, { prefix: '/api/components' });
  fastify.register(applicationCaseRoutes, { prefix: '/api/application-cases' });
  fastify.register(articleAnalyzerRoutes, { prefix: '/api/article-analyzer' });

  // 분석 파이프라인 라우트
  fastify.register(analysisRoutes, { prefix: '/api/analysis' });
  fastify.register(aggregationRoutes, { prefix: '/api/aggregation' });
  fastify.register(insightsRoutes, { prefix: '/api/insights' });
  fastify.register(reviewRoutes, { prefix: '/api/review' });
  fastify.register(executiveRoutes, { prefix: '/api/executive' });
  fastify.register(entityAliasRoutes, { prefix: '/api/entity-aliases' });

  // 휴머노이드 동향 대시보드 라우트
  fastify.register(humanoidTrendRoutes, { prefix: '/api/humanoid-trend' });

  // 비전 센서 원가 분석 라우트
  fastify.register(visionCostRoutes, { prefix: '/api/vision-cost' });

  // 스코어링 파이프라인 라우트
  fastify.register(scoringPipelineRoutes, { prefix: '/api/scoring-pipeline' });

  // 전략 워룸 라우트
  fastify.register(warRoomRoutes, { prefix: '/api/war-room' });

  // 스코어 시드 라우트 (일회성)
  fastify.register(seedScoresRoutes, { prefix: '/api/seed-scores' });

  // CI 업데이트 시스템 라우트
  fastify.register(ciUpdateRoutes, { prefix: '/api/ci-update' });
}
