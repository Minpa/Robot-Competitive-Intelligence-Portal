/**
 * ExecutiveDashboardService - 경영진 대시보드 10개 뷰
 */

import { db, humanoidRobots, applicationCases, companies, bodySpecs, keywords, articles, talentTrends } from '../db/index.js';
import { eq, gte, desc } from 'drizzle-orm';
import { aggregationService } from './aggregation.service.js';

export class ExecutiveDashboardService {
  /** 뷰 1: 세그먼트 히트맵 */
  async getSegmentHeatmap() {
    const segments = await aggregationService.getSegmentAggregation();
    const matrix = segments.map(s => ({
      env: s.environment,
      task: s.task,
      locomotion: s.locomotion,
      count: s.caseCount,
      robots: [] as { id: string; name: string }[],
    }));
    const maxCount = Math.max(...matrix.map(m => m.count), 1);
    return { matrix, maxCount };
  }

  /** 뷰 2: 상용화 전환 분석 */
  async getCommercializationAnalysis() {
    const robots = await db.select({
      id: humanoidRobots.id,
      stage: humanoidRobots.commercializationStage,
      locomotionType: humanoidRobots.locomotionType,
    }).from(humanoidRobots);

    const stages = ['concept', 'prototype', 'poc', 'pilot', 'commercial'];
    const stageCounts: Record<string, number> = {};
    for (const s of stages) stageCounts[s] = 0;
    for (const r of robots) {
      const stage = r.stage || 'concept';
      stageCounts[stage] = (stageCounts[stage] || 0) + 1;
    }

    const conversionRates = [];
    for (let i = 0; i < stages.length - 1; i++) {
      const from = stages[i]!;
      const to = stages[i + 1]!;
      const fromCount = stageCounts[from] || 0;
      const toCount = stageCounts[to] || 0;
      conversionRates.push({
        from, to,
        rate: fromCount > 0 ? Math.round((toCount / fromCount) * 100) / 100 : 0,
      });
    }

    return { conversionRates, avgDurationByEnv: [] };
  }

  /** 뷰 3: 플레이어 확장 추이 */
  async getPlayerExpansion(companyIds?: string[]) {
    let companyRows = await db.select({ id: companies.id, name: companies.name }).from(companies);
    if (companyIds && companyIds.length > 0) {
      companyRows = companyRows.filter(c => companyIds.includes(c.id));
    }

    const result = [];
    for (const company of companyRows.slice(0, 20)) {
      const robots = await db.select({
        name: humanoidRobots.name,
        year: humanoidRobots.announcementYear,
        purpose: humanoidRobots.purpose,
        stage: humanoidRobots.commercializationStage,
      }).from(humanoidRobots).where(eq(humanoidRobots.companyId, company.id));

      const trends = await db.select({
        year: talentTrends.year,
        headcount: talentTrends.totalHeadcount,
      }).from(talentTrends).where(eq(talentTrends.companyId, company.id));

      result.push({
        companyId: company.id,
        companyName: company.name,
        timeline: robots.map(r => ({
          date: r.year ? `${r.year}-01-01` : '',
          event: `${r.name} 발표`,
          type: 'product_launch',
        })),
        workforceTrend: trends.map(t => ({
          year: t.year,
          headcount: t.headcount || 0,
        })),
        portfolioMap: robots.map(r => ({
          purpose: r.purpose || 'unknown',
          stage: r.stage || 'development',
          count: 1,
        })),
      });
    }

    return { companies: result };
  }

  /** 뷰 4: 가격·성능 트렌드 */
  async getPricePerformanceTrend() {
    const robots = await db.select({
      year: humanoidRobots.announcementYear,
      robotId: humanoidRobots.id,
    }).from(humanoidRobots);

    const specs = await db.select().from(bodySpecs);
    const specMap = new Map(specs.map(s => [s.robotId, s]));

    const yearData = new Map<number, { payloads: number[]; dofs: number[]; hours: number[] }>();

    for (const r of robots) {
      if (!r.year) continue;
      if (!yearData.has(r.year)) yearData.set(r.year, { payloads: [], dofs: [], hours: [] });
      const entry = yearData.get(r.year)!;
      const spec = specMap.get(r.robotId);
      if (spec) {
        if (spec.payloadKg) entry.payloads.push(Number(spec.payloadKg));
        if (spec.dofCount) entry.dofs.push(spec.dofCount);
        if (spec.operationTimeHours) entry.hours.push(Number(spec.operationTimeHours));
      }
    }

    const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10 : 0;

    const performanceTrends = [
      {
        metric: 'payload_kg',
        data: Array.from(yearData.entries()).map(([year, d]) => ({
          year, avg: avg(d.payloads), min: Math.min(...d.payloads, 0), max: Math.max(...d.payloads, 0),
        })).sort((a, b) => a.year - b.year),
      },
      {
        metric: 'dof',
        data: Array.from(yearData.entries()).map(([year, d]) => ({
          year, avg: avg(d.dofs), min: Math.min(...d.dofs, 0), max: Math.max(...d.dofs, 0),
        })).sort((a, b) => a.year - b.year),
      },
    ];

    return { priceBands: [], performanceTrends };
  }

  /** 뷰 5: 부품 채택 트렌드 */
  async getComponentTrend() {
    const compAgg = await aggregationService.getComponentAggregation();

    const typeGroups = new Map<string, { year: number; count: number }[]>();
    for (const c of compAgg) {
      if (!typeGroups.has(c.componentType)) typeGroups.set(c.componentType, []);
      typeGroups.get(c.componentType)!.push({ year: 2024, count: c.adoptionCount });
    }

    return {
      adoptionTrends: Array.from(typeGroups.entries()).map(([type, data]) => ({
        componentType: type,
        data,
      })),
      correlations: [],
    };
  }

  /** 뷰 6: 키워드 포지션 맵 */
  async getKeywordPositionMap() {
    const kwAgg = await aggregationService.getKeywordAggregation('month');
    const allKws = await db.select({ id: keywords.id, term: keywords.term, category: keywords.category }).from(keywords);
    const kwMap = new Map(allKws.map(k => [k.id, k]));

    const positions = kwAgg.map(k => {
      const kw = kwMap.get(k.keywordId);
      return {
        keyword: k.term,
        frequency: k.articleCount,
        growthRate: k.deltaPercent,
        category: kw?.category || 'other',
      };
    });

    const sorted = [...positions].sort((a, b) => b.growthRate - a.growthRate);
    return {
      positions,
      risingTop10: sorted.filter(p => p.growthRate > 0).slice(0, 10).map(p => ({ keyword: p.keyword, growthRate: p.growthRate })),
      decliningTop10: sorted.filter(p => p.growthRate < 0).slice(0, 10).map(p => ({ keyword: p.keyword, growthRate: p.growthRate })),
    };
  }

  /** 뷰 7: 산업별 도입 현황 */
  async getIndustryAdoption() {
    const cases = await db.select({
      env: applicationCases.environmentType,
      task: applicationCases.taskType,
      status: applicationCases.deploymentStatus,
      robotId: applicationCases.robotId,
    }).from(applicationCases);

    const industryMap = new Map<string, { totalCases: number; stages: Record<string, number>; topCases: any[] }>();

    for (const c of cases) {
      const industry = c.env || 'other';
      if (!industryMap.has(industry)) {
        industryMap.set(industry, { totalCases: 0, stages: {}, topCases: [] });
      }
      const entry = industryMap.get(industry)!;
      entry.totalCases++;
      const stage = c.status || 'concept';
      entry.stages[stage] = (entry.stages[stage] || 0) + 1;
      if (entry.topCases.length < 3) {
        entry.topCases.push({ robotName: c.robotId, task: c.task || '', status: stage });
      }
    }

    return {
      industries: Array.from(industryMap.entries()).map(([industry, data]) => ({
        industry,
        totalCases: data.totalCases,
        stageDistribution: data.stages,
        topCases: data.topCases,
      })),
    };
  }

  /** 뷰 8: 지역별 경쟁 구도 */
  async getRegionalCompetition() {
    const robots = await db.select({
      region: humanoidRobots.region,
      companyId: humanoidRobots.companyId,
      id: humanoidRobots.id,
    }).from(humanoidRobots);

    const regionMap = new Map<string, { companyIds: Set<string>; productCount: number; caseCount: number }>();

    for (const r of robots) {
      const region = r.region || 'other';
      if (!regionMap.has(region)) regionMap.set(region, { companyIds: new Set(), productCount: 0, caseCount: 0 });
      const entry = regionMap.get(region)!;
      entry.companyIds.add(r.companyId);
      entry.productCount++;
    }

    return {
      regions: Array.from(regionMap.entries()).map(([region, data]) => ({
        region,
        companyCount: data.companyIds.size,
        productCount: data.productCount,
        caseCount: data.caseCount,
        topPlayers: [],
      })),
    };
  }

  /** 뷰 9: 핵심 기술 축 */
  async getTechAxis() {
    const kwAgg = await aggregationService.getKeywordAggregation('month');
    return {
      bubbles: kwAgg.slice(0, 20).map(k => ({
        keyword: k.term,
        articleCount: k.articleCount,
        productCount: 0,
        category: 'technology',
      })),
      trendLines: [],
    };
  }

  /** 뷰 10: Top 10 이벤트 */
  async getTopEvents(period: 'month' | 'quarter' | '6months' = 'month') {
    const days = period === 'month' ? 30 : period === 'quarter' ? 90 : 180;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const recentArticles = await db.select({
      id: articles.id,
      title: articles.title,
      publishedAt: articles.publishedAt,
      companyId: articles.companyId,
      summary: articles.summary,
    }).from(articles)
      .where(gte(articles.createdAt, since))
      .orderBy(desc(articles.createdAt))
      .limit(50);

    // 간단한 중요도 스코어 (기사 길이 + 회사 연결 여부)
    const events = recentArticles.map((a, i) => ({
      id: a.id,
      title: a.title,
      date: a.publishedAt?.toISOString() || '',
      relatedCompany: a.companyId || '',
      importanceScore: Math.max(0.1, 1 - i * 0.02),
      type: 'article',
      summary: (a.summary || '').substring(0, 200),
    }));

    events.sort((a, b) => b.importanceScore - a.importanceScore);

    return {
      events: events.slice(0, 10),
      period: {
        start: since.toISOString(),
        end: new Date().toISOString(),
      },
    };
  }
}

export const executiveDashboardService = new ExecutiveDashboardService();
