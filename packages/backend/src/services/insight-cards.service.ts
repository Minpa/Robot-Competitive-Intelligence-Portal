/**
 * InsightCardsGenerator - 대시보드 인사이트 카드 생성
 * 
 * AggregationService 데이터 기반 + LLM 자연어 인사이트
 * LLM 실패 시 숫자 기반 폴백 카드 (최소 4개 보장)
 */

import OpenAI from 'openai';
import { aggregationService } from './aggregation.service.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface InsightCard {
  id: string;
  title: string;
  value: string | number;
  description: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
}

export class InsightCardsGenerator {
  async generateCards(): Promise<InsightCard[]> {
    const [segments, yearly, comps, kwAgg] = await Promise.all([
      aggregationService.getSegmentAggregation(),
      aggregationService.getYearlyAggregation(),
      aggregationService.getComponentAggregation(),
      aggregationService.getKeywordAggregation('month'),
    ]);

    const aggregationData = { segments, yearly, components: comps, keywords: kwAgg };

    if (process.env.OPENAI_API_KEY) {
      try {
        return await this.generateWithLLM(aggregationData);
      } catch (error) {
        console.error('[InsightCards] LLM failed, using fallback', error);
      }
    }

    return this.generateFallbackCards(aggregationData);
  }

  private async generateWithLLM(data: Record<string, unknown>): Promise<InsightCard[]> {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a robotics industry analyst. Generate 4-6 insight cards from aggregation data.
Return JSON array: [{"id":"card_1","title":"...","value":"...","description":"...","trend":"up|down|stable","trendValue":"..."}]
Language: Korean. Be concise.`,
        },
        { role: 'user', content: JSON.stringify(data).substring(0, 3000) },
      ],
      max_tokens: 1000,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content) as any;
    const cards = Array.isArray(parsed) ? parsed : parsed.cards || [];

    if (cards.length >= 4) return cards;
    return this.generateFallbackCards(data);
  }

  private generateFallbackCards(data: Record<string, unknown>): InsightCard[] {
    const segments = (data.segments || []) as any[];
    const yearly = (data.yearly || []) as any[];
    const comps = (data.components || []) as any[];
    const kws = (data.keywords || []) as any[];

    const totalRobots = new Set(segments.flatMap((s: any) => s.robotCount ? [s.environment] : [])).size || segments.length;
    const totalCases = segments.reduce((sum: number, s: any) => sum + (s.caseCount || 0), 0);
    const latestYear = yearly.length > 0 ? yearly[yearly.length - 1] : null;
    const totalComponents = comps.length;

    return [
      {
        id: 'card_robots',
        title: '활성 세그먼트',
        value: totalRobots,
        description: `${segments.length}개 세그먼트에서 로봇이 활동 중`,
        trend: 'stable' as const,
      },
      {
        id: 'card_cases',
        title: '총 적용 사례',
        value: totalCases,
        description: '전체 환경×작업 조합의 적용 사례 수',
        trend: totalCases > 10 ? 'up' as const : 'stable' as const,
      },
      {
        id: 'card_launches',
        title: latestYear ? `${latestYear.year}년 출시` : '연간 출시',
        value: latestYear?.launches || 0,
        description: '올해 발표/출시된 휴머노이드 로봇 수',
        trend: 'up' as const,
      },
      {
        id: 'card_components',
        title: '등록 부품',
        value: totalComponents,
        description: '데이터베이스에 등록된 부품 수',
        trend: 'stable' as const,
      },
      {
        id: 'card_keywords',
        title: '추적 키워드',
        value: kws.length,
        description: '모니터링 중인 산업 키워드 수',
        trend: 'stable' as const,
      },
    ];
  }
}

export const insightCardsGenerator = new InsightCardsGenerator();
