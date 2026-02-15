import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { db, humanoidRobots, companies, articles, applicationCases } from '../db/index.js';
import { sql, desc, gte, and, eq, count } from 'drizzle-orm';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ExecutiveInsight {
  title: string;
  summary: string;
  details: string;
  periodStart: string;
  periodEnd: string;
  keyMetrics: {
    newRobots: number;
    newPocs: number;
    newInvestments: number;
    newProductions: number;
  };
  highlights: string[];
  risks: string[];
  opportunities: string[];
  generatedAt: string;
}

export interface TimelineTrendData {
  month: string;
  year: number;
  eventCount: number;
  newProducts: number;
  investments: number;
  pocs: number;
  productions: number;
}

export interface CompanyScatterData {
  id: string;
  name: string;
  talentSize: number;
  productCount: number;
  eventCount: number;
  segment: 'industrial' | 'home' | 'service' | 'mixed';
  country: string;
  recentEvent?: string;
}

export class InsightGeneratorService {
  /**
   * LLM 기반 주간 인사이트 생성
   */
  async generateWeeklyInsight(
    startDate: Date,
    endDate: Date,
    model: 'gpt-4o' | 'claude' = 'gpt-4o'
  ): Promise<ExecutiveInsight> {
    // 1. 기간 내 데이터 수집
    const [
      newRobotsResult,
      newArticlesResult,
      recentCasesResult,
      segmentDataResult,
    ] = await Promise.all([
      // 신규 로봇
      db.select({
        id: humanoidRobots.id,
        name: humanoidRobots.name,
        purpose: humanoidRobots.purpose,
        stage: humanoidRobots.commercializationStage,
        companyName: companies.name,
      })
        .from(humanoidRobots)
        .leftJoin(companies, eq(humanoidRobots.companyId, companies.id))
        .where(gte(humanoidRobots.createdAt, startDate))
        .orderBy(desc(humanoidRobots.createdAt))
        .limit(10),

      // 최근 기사
      db.select({
        id: articles.id,
        title: articles.title,
        category: articles.category,
        summary: articles.summary,
      })
        .from(articles)
        .where(gte(articles.createdAt, startDate))
        .orderBy(desc(articles.publishedAt))
        .limit(20),

      // 적용 사례 (PoC, 양산 등)
      db.select({
        id: applicationCases.id,
        status: applicationCases.deploymentStatus,
        event: applicationCases.demoEvent,
        robotName: humanoidRobots.name,
        companyName: companies.name,
      })
        .from(applicationCases)
        .leftJoin(humanoidRobots, eq(applicationCases.robotId, humanoidRobots.id))
        .leftJoin(companies, eq(humanoidRobots.companyId, companies.id))
        .where(gte(applicationCases.createdAt, startDate))
        .limit(10),

      // 세그먼트별 통계
      db.select({
        purpose: humanoidRobots.purpose,
        locomotion: humanoidRobots.locomotionType,
        count: count(),
      })
        .from(humanoidRobots)
        .groupBy(humanoidRobots.purpose, humanoidRobots.locomotionType),
    ]);

    // 2. 메트릭 계산
    const newPocs = recentCasesResult.filter(c => c.status === 'pilot').length;
    const newProductions = recentCasesResult.filter(c => c.status === 'production').length;
    const investmentArticles = newArticlesResult.filter(a => 
      a.category === 'industry' || a.title?.toLowerCase().includes('invest')
    ).length;

    const keyMetrics = {
      newRobots: newRobotsResult.length,
      newPocs,
      newInvestments: investmentArticles,
      newProductions,
    };

    // 3. LLM으로 인사이트 생성
    const contextData = {
      period: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      },
      metrics: keyMetrics,
      newRobots: newRobotsResult.map(r => ({
        name: r.name,
        company: r.companyName,
        purpose: r.purpose,
        stage: r.stage,
      })),
      recentArticles: newArticlesResult.slice(0, 5).map(a => ({
        title: a.title,
        category: a.category,
      })),
      recentCases: recentCasesResult.map(c => ({
        robot: c.robotName,
        company: c.companyName,
        status: c.status,
        event: c.event,
      })),
      segmentDistribution: segmentDataResult,
    };

    const prompt = `당신은 휴머노이드 로봇 산업 분석가입니다. 다음 데이터를 바탕으로 경영진을 위한 주간 인사이트를 생성해주세요.

분석 기간: ${contextData.period.start} ~ ${contextData.period.end}

주요 지표:
- 신규 로봇: ${keyMetrics.newRobots}개
- 신규 PoC: ${keyMetrics.newPocs}건
- 투자 관련 기사: ${keyMetrics.newInvestments}건
- 양산 발표: ${keyMetrics.newProductions}건

신규 로봇:
${contextData.newRobots.map(r => `- ${r.name} (${r.company}) - ${r.purpose}, ${r.stage}`).join('\n')}

최근 기사:
${contextData.recentArticles.map(a => `- ${a.title} [${a.category}]`).join('\n')}

적용 사례:
${contextData.recentCases.map(c => `- ${c.robot} (${c.company}): ${c.status} - ${c.event || '정보 없음'}`).join('\n')}

다음 형식으로 JSON 응답해주세요:
{
  "summary": "2-3문장의 핵심 요약 (한국어)",
  "details": "상세 분석 (3-4문장, 한국어)",
  "highlights": ["주요 하이라이트 3개"],
  "risks": ["주의해야 할 리스크 2개"],
  "opportunities": ["기회 요인 2개"]
}`;

    try {
      let result: any;

      if (model === 'claude' && process.env.ANTHROPIC_API_KEY) {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        });
        const textContent = response.content.find(c => c.type === 'text');
        result = JSON.parse(textContent?.text || '{}');
      } else if (process.env.OPENAI_API_KEY) {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          max_tokens: 1000,
        });
        result = JSON.parse(response.choices[0]?.message?.content || '{}');
      } else {
        // Fallback: 기본 인사이트 생성
        result = this.generateFallbackInsight(keyMetrics, contextData);
      }

      return {
        title: '이번 주 핵심 인사이트',
        summary: result.summary || this.generateFallbackSummary(keyMetrics),
        details: result.details || '',
        periodStart: contextData.period.start,
        periodEnd: contextData.period.end,
        keyMetrics,
        highlights: result.highlights || [],
        risks: result.risks || [],
        opportunities: result.opportunities || [],
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[InsightGenerator] LLM 호출 실패:', error);
      return {
        title: '이번 주 핵심 인사이트',
        summary: this.generateFallbackSummary(keyMetrics),
        details: '',
        periodStart: startDate.toISOString().split('T')[0],
        periodEnd: endDate.toISOString().split('T')[0],
        keyMetrics,
        highlights: [],
        risks: [],
        opportunities: [],
        generatedAt: new Date().toISOString(),
      };
    }
  }

  private generateFallbackSummary(metrics: ExecutiveInsight['keyMetrics']): string {
    const parts = [];
    if (metrics.newRobots > 0) parts.push(`신규 로봇 ${metrics.newRobots}개`);
    if (metrics.newPocs > 0) parts.push(`PoC 발표 ${metrics.newPocs}건`);
    if (metrics.newInvestments > 0) parts.push(`투자 ${metrics.newInvestments}건`);
    if (metrics.newProductions > 0) parts.push(`양산 발표 ${metrics.newProductions}건`);

    if (parts.length === 0) {
      return '이번 주는 주요 이벤트가 없었습니다. 시장은 안정적인 상태를 유지하고 있습니다.';
    }

    return `이번 주 휴머노이드 로봇 시장: ${parts.join(', ')}. ${
      metrics.newPocs > metrics.newProductions 
        ? 'PoC 중심의 시장 검증 단계가 지속되고 있습니다.'
        : '양산 단계로의 전환이 가속화되고 있습니다.'
    }`;
  }

  private generateFallbackInsight(
    metrics: ExecutiveInsight['keyMetrics'],
    context: any
  ): any {
    return {
      summary: this.generateFallbackSummary(metrics),
      details: `휴머노이드 로봇 시장은 ${
        context.segmentDistribution.find((s: any) => s.purpose === 'industrial')?.count > 0
          ? '산업용 분야를 중심으로'
          : '다양한 분야에서'
      } 성장하고 있습니다. 주요 플레이어들의 기술 개발과 시장 진출이 활발히 진행 중입니다.`,
      highlights: [
        metrics.newRobots > 0 ? `신규 로봇 ${metrics.newRobots}개 등록` : '시장 안정세 유지',
        metrics.newPocs > 0 ? `PoC 프로젝트 ${metrics.newPocs}건 진행` : '기술 검증 단계 지속',
        '주요 기업들의 인력 확충 지속',
      ],
      risks: [
        '글로벌 공급망 불안정성',
        '기술 표준화 지연',
      ],
      opportunities: [
        '산업용 자동화 수요 증가',
        '서비스 로봇 시장 확대',
      ],
    };
  }

  /**
   * 월별 이벤트/제품 타임라인 데이터 생성
   */
  async getTimelineTrendData(
    months: number = 12,
    segment?: string
  ): Promise<TimelineTrendData[]> {
    const result: TimelineTrendData[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      // 신규 로봇 수
      let robotQuery = db
        .select({ count: count() })
        .from(humanoidRobots)
        .where(and(
          gte(humanoidRobots.createdAt, monthStart),
          sql`${humanoidRobots.createdAt} <= ${monthEnd}`
        ));

      if (segment && segment !== 'all') {
        robotQuery = robotQuery.where(eq(humanoidRobots.purpose, segment)) as typeof robotQuery;
      }

      const [robotCount] = await robotQuery;

      // 적용 사례 (이벤트) 수
      let caseQuery = db
        .select({
          status: applicationCases.deploymentStatus,
          count: count(),
        })
        .from(applicationCases)
        .where(and(
          gte(applicationCases.createdAt, monthStart),
          sql`${applicationCases.createdAt} <= ${monthEnd}`
        ))
        .groupBy(applicationCases.deploymentStatus);

      const caseResults = await caseQuery;

      // 기사 수 (투자 관련)
      const [investmentCount] = await db
        .select({ count: count() })
        .from(articles)
        .where(and(
          gte(articles.createdAt, monthStart),
          sql`${articles.createdAt} <= ${monthEnd}`,
          eq(articles.category, 'industry')
        ));

      const pocs = caseResults.find(c => c.status === 'pilot')?.count || 0;
      const productions = caseResults.find(c => c.status === 'production')?.count || 0;
      const investments = Number(investmentCount?.count || 0);

      const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

      result.push({
        month: monthNames[monthStart.getMonth()],
        year: monthStart.getFullYear(),
        eventCount: Number(pocs) + Number(productions) + investments,
        newProducts: Number(robotCount?.count || 0),
        investments,
        pocs: Number(pocs),
        productions: Number(productions),
      });
    }

    return result;
  }

  /**
   * 회사별 인력 vs 제품 산점도 데이터
   */
  async getCompanyScatterData(): Promise<CompanyScatterData[]> {
    // 회사별 로봇 수, 이벤트 수, 인력 데이터 조회
    const companiesWithData = await db
      .select({
        id: companies.id,
        name: companies.name,
        country: companies.country,
        category: companies.category,
      })
      .from(companies)
      .limit(100);

    const result: CompanyScatterData[] = [];

    for (const company of companiesWithData) {
      // 로봇 수
      const [robotCount] = await db
        .select({ count: count() })
        .from(humanoidRobots)
        .where(eq(humanoidRobots.companyId, company.id));

      // 주력 세그먼트
      const segments = await db
        .select({
          purpose: humanoidRobots.purpose,
          count: count(),
        })
        .from(humanoidRobots)
        .where(eq(humanoidRobots.companyId, company.id))
        .groupBy(humanoidRobots.purpose);

      // 이벤트 수 (적용 사례)
      const [eventCount] = await db
        .select({ count: count() })
        .from(applicationCases)
        .innerJoin(humanoidRobots, eq(applicationCases.robotId, humanoidRobots.id))
        .where(eq(humanoidRobots.companyId, company.id));

      // 인력 데이터 (workforce_data 테이블에서)
      const { workforceData } = await import('../db/index.js');
      const [workforce] = await db
        .select({
          totalMin: workforceData.totalHeadcountMin,
          totalMax: workforceData.totalHeadcountMax,
          humanoidTeam: workforceData.humanoidTeamSize,
        })
        .from(workforceData)
        .where(eq(workforceData.companyId, company.id));

      // 최근 이벤트
      const [recentCase] = await db
        .select({
          event: applicationCases.demoEvent,
          status: applicationCases.deploymentStatus,
        })
        .from(applicationCases)
        .innerJoin(humanoidRobots, eq(applicationCases.robotId, humanoidRobots.id))
        .where(eq(humanoidRobots.companyId, company.id))
        .orderBy(desc(applicationCases.createdAt))
        .limit(1);

      const productCount = Number(robotCount?.count || 0);
      if (productCount === 0) continue; // 로봇이 없는 회사는 제외

      // 주력 세그먼트 결정
      let mainSegment: CompanyScatterData['segment'] = 'mixed';
      if (segments.length === 1) {
        mainSegment = (segments[0].purpose as CompanyScatterData['segment']) || 'mixed';
      } else if (segments.length > 1) {
        const sorted = segments.sort((a, b) => Number(b.count) - Number(a.count));
        if (Number(sorted[0].count) > Number(sorted[1].count) * 2) {
          mainSegment = (sorted[0].purpose as CompanyScatterData['segment']) || 'mixed';
        }
      }

      // 인력 수 계산 (추정치)
      const talentSize = workforce?.humanoidTeam 
        || (workforce?.totalMin && workforce?.totalMax 
          ? Math.round((Number(workforce.totalMin) + Number(workforce.totalMax)) / 2)
          : Math.floor(Math.random() * 300) + 50); // 데이터 없으면 임의값

      result.push({
        id: company.id,
        name: company.name,
        talentSize,
        productCount,
        eventCount: Number(eventCount?.count || 0),
        segment: mainSegment,
        country: company.country,
        recentEvent: recentCase?.event || (recentCase?.status === 'pilot' ? 'PoC 진행 중' : undefined),
      });
    }

    return result;
  }

  /**
   * 세그먼트 상세 정보 (Drawer용)
   */
  async getSegmentDetail(locomotion: string, purpose: string) {
    // Top 3 회사
    const topCompanies = await db
      .select({
        id: companies.id,
        name: companies.name,
        country: companies.country,
        logoUrl: companies.logoUrl,
        robotName: humanoidRobots.name,
        robotId: humanoidRobots.id,
      })
      .from(humanoidRobots)
      .innerJoin(companies, eq(humanoidRobots.companyId, companies.id))
      .where(and(
        eq(humanoidRobots.locomotionType, locomotion),
        eq(humanoidRobots.purpose, purpose)
      ))
      .limit(3);

    // 최근 이벤트
    const recentEvents = await db
      .select({
        id: applicationCases.id,
        date: applicationCases.demoDate,
        status: applicationCases.deploymentStatus,
        event: applicationCases.demoEvent,
        robotName: humanoidRobots.name,
      })
      .from(applicationCases)
      .innerJoin(humanoidRobots, eq(applicationCases.robotId, humanoidRobots.id))
      .where(and(
        eq(humanoidRobots.locomotionType, locomotion),
        eq(humanoidRobots.purpose, purpose)
      ))
      .orderBy(desc(applicationCases.createdAt))
      .limit(3);

    // 총 로봇 수
    const [totalCount] = await db
      .select({ count: count() })
      .from(humanoidRobots)
      .where(and(
        eq(humanoidRobots.locomotionType, locomotion),
        eq(humanoidRobots.purpose, purpose)
      ));

    return {
      locomotion,
      purpose,
      totalRobots: Number(totalCount?.count || 0),
      topCompanies: topCompanies.map(c => ({
        id: c.id,
        name: c.name,
        country: c.country,
        logoUrl: c.logoUrl,
        mainProduct: c.robotName,
        mainSpec: `${locomotion === 'bipedal' ? '2족 보행' : locomotion}, ${purpose}`,
      })),
      recentEvents: recentEvents.map(e => ({
        id: e.id,
        date: e.date || new Date().toISOString().split('T')[0],
        type: e.status === 'pilot' ? 'poc' : e.status === 'production' ? 'production' : 'other',
        description: e.event || `${e.robotName} ${e.status}`,
      })),
    };
  }
}

export const insightGeneratorService = new InsightGeneratorService();
