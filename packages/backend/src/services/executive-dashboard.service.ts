/**
 * ExecutiveDashboardService - 경영진 대시보드 10개 뷰
 *
 * v1.2: GlobalFilterParams 지원 + ViewCacheService 통합
 * Requirements: 9.78, 9.79, 9.85
 */

import { db, humanoidRobots, applicationCases, companies, bodySpecs, computingSpecs, workforceData, keywords, articles, talentTrends } from '../db/index.js';
import { eq, gte, lte, desc, and, inArray, type SQL } from 'drizzle-orm';
import { aggregationService } from './aggregation.service.js';
import { viewCacheService } from './view-cache.service.js';

export interface GlobalFilterParams {
  startDate?: string;
  endDate?: string;
  region?: string[];
  segment?: string[];
}

// ── Interfaces for new views ──────────────────────────────────────

export interface SegmentHeatmapCell {
  environment: string;
  locomotion: string;
  robotCount: number;
  taskTypeBreakdown: Record<string, number>;
}

export interface SegmentDrawerRobot {
  id: string;
  name: string;
  companyName: string;
  commercializationStage: string | null;
  dofCount: number | null;
  payloadKg: number | null;
  mainSoc: string | null;
}

export interface SegmentDrawerData {
  robots: SegmentDrawerRobot[];
  totalCount: number;
}

export interface TimelineTrendData {
  month: string;           // "2024-01"
  eventCount: number;
  cumulativeProducts: number;
}

export interface TalentProductScatterData {
  companyId: string;
  companyName: string;
  workforceSize: number;
  productCount: number;
  valuation: number | null;
  region: string;
}

export class ExecutiveDashboardService {

  // ── Filter helpers ──────────────────────────────────────────────

  /**
   * Build WHERE conditions for humanoidRobots table based on filters.
   */
  private buildRobotFilters(filters?: GlobalFilterParams): SQL | undefined {
    if (!filters) return undefined;
    const conditions: SQL[] = [];

    if (filters.region && filters.region.length > 0) {
      conditions.push(inArray(humanoidRobots.region, filters.region));
    }
    if (filters.segment && filters.segment.length > 0) {
      conditions.push(inArray(humanoidRobots.purpose, filters.segment));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  /**
   * Build WHERE conditions for articles table based on date filters.
   */
  private buildArticleDateFilters(filters?: GlobalFilterParams): SQL | undefined {
    if (!filters) return undefined;
    const conditions: SQL[] = [];

    if (filters.startDate) {
      conditions.push(gte(articles.publishedAt, new Date(filters.startDate)));
    }
    if (filters.endDate) {
      conditions.push(lte(articles.publishedAt, new Date(filters.endDate)));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  /**
   * Build WHERE conditions for applicationCases table based on segment filters.
   */
  private buildCaseFilters(filters?: GlobalFilterParams): SQL | undefined {
    if (!filters) return undefined;
    const conditions: SQL[] = [];

    if (filters.segment && filters.segment.length > 0) {
      conditions.push(inArray(applicationCases.environmentType, filters.segment));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  /**
   * Determine whether to use cache or compute directly.
   * Filtered queries skip cache; unfiltered queries use ViewCacheService.
   */
  private async cachedOrCompute<T>(viewName: string, filters: GlobalFilterParams | undefined, computeFn: () => Promise<T>): Promise<T> {
    if (filters && Object.keys(filters).some(k => {
      const v = filters[k as keyof GlobalFilterParams];
      return v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true);
    })) {
      // Filtered — skip cache, compute directly
      return computeFn();
    }
    // Unfiltered — use ViewCacheService
    const result = await viewCacheService.getOrCompute(viewName, computeFn);
    return result.data;
  }

  // ── Views ───────────────────────────────────────────────────────

  /** 뷰 1: 세그먼트 히트맵 (env × locomotion 2D + task type drill-down) */
  async getSegmentHeatmap(filters?: GlobalFilterParams): Promise<{ matrix: SegmentHeatmapCell[]; maxCount: number }> {
    return this.cachedOrCompute('segment-heatmap', filters, async () => {
      const ENVIRONMENTS = ['industrial', 'home', 'service'] as const;
      const LOCOMOTIONS = ['bipedal', 'wheeled', 'hybrid'] as const;

      // Query robots with their purpose and locomotion, applying filters
      const robotFilter = this.buildRobotFilters(filters);
      const robotQuery = db.select({
        id: humanoidRobots.id,
        purpose: humanoidRobots.purpose,
        locomotionType: humanoidRobots.locomotionType,
      }).from(humanoidRobots);

      const robots = robotFilter
        ? await robotQuery.where(robotFilter)
        : await robotQuery;

      // Build robot ID set for filtered robots
      const robotIds = new Set(robots.map(r => r.id));

      // Query application cases for task type breakdown
      const allCases = robotIds.size > 0
        ? await db.select({
            robotId: applicationCases.robotId,
            taskType: applicationCases.taskType,
          }).from(applicationCases)
            .where(inArray(applicationCases.robotId, Array.from(robotIds)))
        : [];

      // Build robot → purpose/locomotion map
      const robotMap = new Map(robots.map(r => [r.id, { purpose: r.purpose, locomotion: r.locomotionType }]));

      // Build 3×3 matrix with task type breakdown
      const cellMap = new Map<string, { robotIds: Set<string>; taskTypes: Record<string, number> }>();

      // Initialize all 9 cells
      for (const env of ENVIRONMENTS) {
        for (const loc of LOCOMOTIONS) {
          cellMap.set(`${env}|${loc}`, { robotIds: new Set(), taskTypes: {} });
        }
      }

      // Populate cells from robots
      for (const robot of robots) {
        const env = robot.purpose || 'unknown';
        const loc = robot.locomotionType || 'unknown';
        const key = `${env}|${loc}`;
        const cell = cellMap.get(key);
        if (cell) {
          cell.robotIds.add(robot.id);
        }
      }

      // Populate task type breakdown from application cases
      for (const c of allCases) {
        const info = robotMap.get(c.robotId);
        if (!info) continue;
        const key = `${info.purpose || 'unknown'}|${info.locomotion || 'unknown'}`;
        const cell = cellMap.get(key);
        if (cell) {
          const taskType = c.taskType || 'other';
          cell.taskTypes[taskType] = (cell.taskTypes[taskType] || 0) + 1;
        }
      }

      const matrix: SegmentHeatmapCell[] = [];
      for (const env of ENVIRONMENTS) {
        for (const loc of LOCOMOTIONS) {
          const cell = cellMap.get(`${env}|${loc}`)!;
          matrix.push({
            environment: env,
            locomotion: loc,
            robotCount: cell.robotIds.size,
            taskTypeBreakdown: cell.taskTypes,
          });
        }
      }

      const maxCount = Math.max(...matrix.map(m => m.robotCount), 1);
      return { matrix, maxCount };
    });
  }

  /** 셀 드릴다운: 특정 env × locomotion의 로봇 목록 (+ optional taskType filter) */
  async getSegmentDrawerRobots(
    environment: string,
    locomotion: string,
    taskType?: string,
    filters?: GlobalFilterParams,
  ): Promise<SegmentDrawerData> {
    // Drawer data is not cached (per design: segment_drawer TTL=0)
    const conditions: SQL[] = [
      eq(humanoidRobots.purpose, environment),
      eq(humanoidRobots.locomotionType, locomotion),
    ];

    // Apply global filters
    if (filters?.region && filters.region.length > 0) {
      conditions.push(inArray(humanoidRobots.region, filters.region));
    }

    const robots = await db.select({
      id: humanoidRobots.id,
      name: humanoidRobots.name,
      companyId: humanoidRobots.companyId,
      commercializationStage: humanoidRobots.commercializationStage,
    }).from(humanoidRobots)
      .where(and(...conditions));

    // If taskType filter is provided, narrow down by applicationCases
    let filteredRobotIds: Set<string> | null = null;
    if (taskType) {
      const cases = await db.select({
        robotId: applicationCases.robotId,
      }).from(applicationCases)
        .where(eq(applicationCases.taskType, taskType));
      filteredRobotIds = new Set(cases.map(c => c.robotId));
    }

    const matchedRobots = filteredRobotIds
      ? robots.filter(r => filteredRobotIds!.has(r.id))
      : robots;

    // Fetch specs for matched robots
    const robotIds = matchedRobots.map(r => r.id);
    const [bodySpecRows, computingSpecRows, companyRows] = await Promise.all([
      robotIds.length > 0
        ? db.select({ robotId: bodySpecs.robotId, dofCount: bodySpecs.dofCount, payloadKg: bodySpecs.payloadKg })
            .from(bodySpecs).where(inArray(bodySpecs.robotId, robotIds))
        : Promise.resolve([]),
      robotIds.length > 0
        ? db.select({ robotId: computingSpecs.robotId, mainSoc: computingSpecs.mainSoc })
            .from(computingSpecs).where(inArray(computingSpecs.robotId, robotIds))
        : Promise.resolve([]),
      db.select({ id: companies.id, name: companies.name }).from(companies),
    ]);

    const bodyMap = new Map(bodySpecRows.map(s => [s.robotId, s]));
    const compMap = new Map(computingSpecRows.map(s => [s.robotId, s]));
    const companyMap = new Map(companyRows.map(c => [c.id, c.name]));

    const result: SegmentDrawerRobot[] = matchedRobots.map(r => {
      const body = bodyMap.get(r.id);
      const comp = compMap.get(r.id);
      return {
        id: r.id,
        name: r.name,
        companyName: companyMap.get(r.companyId) || 'Unknown',
        commercializationStage: r.commercializationStage,
        dofCount: body?.dofCount ?? null,
        payloadKg: body?.payloadKg ? Number(body.payloadKg) : null,
        mainSoc: comp?.mainSoc ?? null,
      };
    });

    return {
      robots: result,
      totalCount: result.length,
    };
  }

  /** 뷰 2: 상용화 전환 분석 */
  async getCommercializationAnalysis(filters?: GlobalFilterParams) {
    return this.cachedOrCompute('segment-heatmap', filters, async () => {
      const robotFilter = this.buildRobotFilters(filters);

      const query = db.select({
        id: humanoidRobots.id,
        stage: humanoidRobots.commercializationStage,
        locomotionType: humanoidRobots.locomotionType,
      }).from(humanoidRobots);

      const robots = robotFilter
        ? await query.where(robotFilter)
        : await query;

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
    });
  }

  /** 뷰 3: 플레이어 확장 추이 */
  async getPlayerExpansion(companyIds?: string[], filters?: GlobalFilterParams) {
    return this.cachedOrCompute('player-expansion', filters, async () => {
      let companyRows = await db.select({ id: companies.id, name: companies.name }).from(companies);
      if (companyIds && companyIds.length > 0) {
        companyRows = companyRows.filter(c => companyIds.includes(c.id));
      }

      const result = [];
      for (const company of companyRows.slice(0, 20)) {
        const robotQuery = db.select({
          name: humanoidRobots.name,
          year: humanoidRobots.announcementYear,
          purpose: humanoidRobots.purpose,
          stage: humanoidRobots.commercializationStage,
        }).from(humanoidRobots).where(eq(humanoidRobots.companyId, company.id));

        const robotFilter = this.buildRobotFilters(filters);
        const robots = robotFilter
          ? await db.select({
              name: humanoidRobots.name,
              year: humanoidRobots.announcementYear,
              purpose: humanoidRobots.purpose,
              stage: humanoidRobots.commercializationStage,
            }).from(humanoidRobots).where(and(eq(humanoidRobots.companyId, company.id), robotFilter))
          : await robotQuery;

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
    });
  }

  /** 뷰 4: 가격·성능 트렌드 */
  async getPricePerformanceTrend(filters?: GlobalFilterParams) {
    return this.cachedOrCompute('technology-radar', filters, async () => {
      const robotFilter = this.buildRobotFilters(filters);

      const robotQuery = db.select({
        year: humanoidRobots.announcementYear,
        robotId: humanoidRobots.id,
      }).from(humanoidRobots);

      const robots = robotFilter
        ? await robotQuery.where(robotFilter)
        : await robotQuery;

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
    });
  }

  /** 뷰 5: 부품 채택 트렌드 */
  async getComponentTrend(filters?: GlobalFilterParams) {
    return this.cachedOrCompute('technology-radar', filters, async () => {
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
    });
  }

  /** 뷰 6: 키워드 포지션 맵 */
  async getKeywordPositionMap(filters?: GlobalFilterParams) {
    return this.cachedOrCompute('insight-hub', filters, async () => {
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
    });
  }

  /** 뷰 7: 산업별 도입 현황 */
  async getIndustryAdoption(filters?: GlobalFilterParams) {
    return this.cachedOrCompute('segment-heatmap', filters, async () => {
      const caseFilter = this.buildCaseFilters(filters);

      const query = db.select({
        env: applicationCases.environmentType,
        task: applicationCases.taskType,
        status: applicationCases.deploymentStatus,
        robotId: applicationCases.robotId,
      }).from(applicationCases);

      const cases = caseFilter
        ? await query.where(caseFilter)
        : await query;

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
    });
  }

  /** 뷰 8: 지역별 경쟁 구도 */
  async getRegionalCompetition(filters?: GlobalFilterParams) {
    return this.cachedOrCompute('regional-share', filters, async () => {
      const robotFilter = this.buildRobotFilters(filters);

      const query = db.select({
        region: humanoidRobots.region,
        companyId: humanoidRobots.companyId,
        id: humanoidRobots.id,
      }).from(humanoidRobots);

      const robots = robotFilter
        ? await query.where(robotFilter)
        : await query;

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
    });
  }

  /** 뷰 9: 핵심 기술 축 */
  async getTechAxis(filters?: GlobalFilterParams) {
    return this.cachedOrCompute('technology-radar', filters, async () => {
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
    });
  }

  /** 뷰 10: Top 10 이벤트 */
  async getTopEvents(period: 'month' | 'quarter' | '6months' = 'month', filters?: GlobalFilterParams) {
    return this.cachedOrCompute('top-events', filters, async () => {
      const days = period === 'month' ? 30 : period === 'quarter' ? 90 : 180;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Build conditions: base date filter + optional date range from GlobalFilterParams
      const conditions: SQL[] = [gte(articles.createdAt, since)];
      const dateFilter = this.buildArticleDateFilters(filters);
      if (dateFilter) conditions.push(dateFilter);

      const recentArticles = await db.select({
        id: articles.id,
        title: articles.title,
        publishedAt: articles.publishedAt,
        companyId: articles.companyId,
        summary: articles.summary,
      }).from(articles)
        .where(and(...conditions))
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
    });
  }

  // ── New v1.2 views ──────────────────────────────────────────────

  /** 뷰 11: 타임라인 트렌드 — 월별 이벤트 수(바) + 누적 제품 수(라인) */
  async getTimelineTrend(filters?: GlobalFilterParams): Promise<TimelineTrendData[]> {
    return this.cachedOrCompute('timeline-trend', filters, async () => {
      // 1. Query articles for monthly event counts
      const dateConditions: SQL[] = [];
      const dateFilter = this.buildArticleDateFilters(filters);
      if (dateFilter) dateConditions.push(dateFilter);

      const articleRows = dateConditions.length > 0
        ? await db.select({ publishedAt: articles.publishedAt }).from(articles).where(and(...dateConditions))
        : await db.select({ publishedAt: articles.publishedAt }).from(articles);

      // 2. Query humanoidRobots for product announcements by year
      const robotFilter = this.buildRobotFilters(filters);
      const robotQuery = db.select({
        announcementYear: humanoidRobots.announcementYear,
      }).from(humanoidRobots);

      const robotRows = robotFilter
        ? await robotQuery.where(robotFilter)
        : await robotQuery;

      // 3. Build monthly event counts
      const eventsByMonth = new Map<string, number>();
      for (const a of articleRows) {
        if (!a.publishedAt) continue;
        const month = `${a.publishedAt.getFullYear()}-${String(a.publishedAt.getMonth() + 1).padStart(2, '0')}`;
        eventsByMonth.set(month, (eventsByMonth.get(month) || 0) + 1);
      }

      // 4. Build yearly product counts (for cumulative)
      const productsByYear = new Map<number, number>();
      for (const r of robotRows) {
        if (!r.announcementYear) continue;
        productsByYear.set(r.announcementYear, (productsByYear.get(r.announcementYear) || 0) + 1);
      }

      // 5. Determine month range
      const allMonths = new Set<string>();
      for (const month of eventsByMonth.keys()) allMonths.add(month);

      // Add months from robot announcement years
      for (const year of productsByYear.keys()) {
        for (let m = 1; m <= 12; m++) {
          allMonths.add(`${year}-${String(m).padStart(2, '0')}`);
        }
      }

      // If no data at all, return empty with indicator
      if (allMonths.size === 0) {
        return [];
      }

      const sortedMonths = Array.from(allMonths).sort();

      // 6. Build cumulative product counts by month
      const sortedYears = Array.from(productsByYear.keys()).sort((a, b) => a - b);
      const cumulativeByMonth = new Map<string, number>();

      // Calculate cumulative up to each year boundary
      const yearCumulative = new Map<number, number>();
      let runningTotal = 0;
      for (const year of sortedYears) {
        runningTotal += productsByYear.get(year) || 0;
        yearCumulative.set(year, runningTotal);
      }

      // For each month, find the cumulative product count
      // Products are counted by announcement year, so all months in a year share the same cumulative
      for (const month of sortedMonths) {
        const year = parseInt(month.split('-')[0]!);
        // Find cumulative up to this year
        let cumulative = 0;
        for (const [y, count] of yearCumulative) {
          if (y <= year) cumulative = count;
        }
        cumulativeByMonth.set(month, cumulative);
      }

      // 7. Build result
      return sortedMonths.map(month => ({
        month,
        eventCount: eventsByMonth.get(month) || 0,
        cumulativeProducts: cumulativeByMonth.get(month) || 0,
      }));
    });
  }

  /** 뷰 12: 인력 vs 제품 산점도 — workforce_data + humanoid_robot 모두 보유한 회사만 */
  async getTalentProductScatter(filters?: GlobalFilterParams): Promise<TalentProductScatterData[]> {
    return this.cachedOrCompute('talent-product', filters, async () => {
      // 1. Get all companies with workforce data
      const wfRows = await db.select({
        companyId: workforceData.companyId,
        totalHeadcountMin: workforceData.totalHeadcountMin,
        totalHeadcountMax: workforceData.totalHeadcountMax,
      }).from(workforceData);

      const wfMap = new Map(wfRows.map(w => [w.companyId, w]));
      const companiesWithWorkforce = new Set(wfRows.map(w => w.companyId));

      // 2. Count humanoid robots per company (with optional filters)
      const robotFilter = this.buildRobotFilters(filters);
      const robotQuery = db.select({
        companyId: humanoidRobots.companyId,
        id: humanoidRobots.id,
      }).from(humanoidRobots);

      const robotRows = robotFilter
        ? await robotQuery.where(robotFilter)
        : await robotQuery;

      const productCountByCompany = new Map<string, number>();
      for (const r of robotRows) {
        productCountByCompany.set(r.companyId, (productCountByCompany.get(r.companyId) || 0) + 1);
      }

      // 3. Only include companies that have BOTH workforce data AND at least 1 robot
      const eligibleCompanyIds = Array.from(companiesWithWorkforce).filter(
        id => (productCountByCompany.get(id) || 0) > 0
      );

      if (eligibleCompanyIds.length === 0) return [];

      // 4. Get company details
      const companyRows = await db.select({
        id: companies.id,
        name: companies.name,
        country: companies.country,
        valuationUsd: companies.valuationUsd,
      }).from(companies)
        .where(inArray(companies.id, eligibleCompanyIds));

      // 5. Build scatter data
      return companyRows.map(c => {
        const wf = wfMap.get(c.id);
        const headcountMin = wf?.totalHeadcountMin || 0;
        const headcountMax = wf?.totalHeadcountMax || 0;
        // Use average of min/max, or max if min is 0
        const workforceSize = headcountMin > 0
          ? Math.round((headcountMin + headcountMax) / 2)
          : headcountMax;

        return {
          companyId: c.id,
          companyName: c.name,
          workforceSize,
          productCount: productCountByCompany.get(c.id) || 0,
          valuation: c.valuationUsd ? Number(c.valuationUsd) : null,
          region: c.country || 'unknown',
        };
      });
    });
  }
}

export const executiveDashboardService = new ExecutiveDashboardService();
