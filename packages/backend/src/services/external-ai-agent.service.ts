/**
 * ExternalAIAgent - 외부 AI 기반 검색·요약 서비스
 *
 * ChatGPT/Claude API를 사용하여 구조화된 팩트/메타데이터를 반환한다.
 * 기사 원문 텍스트는 반환하지 않으며, 구조화된 팩트만 추출한다.
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import type { ParseResult } from './article-parser.service.js';

// ── Interfaces ──

export interface AISearchRequest {
  query: string;
  targetTypes: ('company' | 'product' | 'component' | 'application' | 'keyword')[];
  timeRange: { start: string; end: string };
  region: string;
  provider: 'chatgpt' | 'claude';
}

export interface AISearchResponse {
  summary: string;
  facts: StructuredFact[];
  sources: SourceReference[];
}

export interface StructuredFact {
  category: 'company' | 'product' | 'component' | 'application' | 'keyword';
  name: string;
  description: string;
  confidence: number;
}

export interface SourceReference {
  domain: string;
  title: string;
}

// ── Service ──

export class ExternalAIAgentService {
  /**
   * AI 기반 검색·요약 수행
   */
  async search(request: AISearchRequest): Promise<AISearchResponse> {
    this.validateApiKey(request.provider);

    const prompt = this.buildPrompt(request);
    let raw: string;

    try {
      raw = request.provider === 'chatgpt'
        ? await this.callOpenAI(prompt)
        : await this.callClaude(prompt);
    } catch (firstError) {
      // 1회 재시도
      console.warn(`[ExternalAIAgent] ${request.provider} API 호출 실패, 재시도 중...`, firstError);
      try {
        raw = request.provider === 'chatgpt'
          ? await this.callOpenAI(prompt)
          : await this.callClaude(prompt);
      } catch (retryError) {
        console.error(`[ExternalAIAgent] 재시도 실패`, retryError);
        throw new Error(
          `AI 검색에 실패했습니다 (${request.provider}). 잠시 후 다시 시도해주세요.`
        );
      }
    }

    return this.parseResponse(raw);
  }

  /**
   * AI에 전달할 프롬프트 구성
   */
  private buildPrompt(request: AISearchRequest): string {
    const targetTypeLabels: Record<string, string> = {
      company: '기업/회사',
      product: '제품/로봇',
      component: '부품 (SoC, 액추에이터, 센서 등)',
      application: '적용 사례/환경',
      keyword: '핵심 키워드/기술 트렌드',
    };

    const targetDescriptions = request.targetTypes
      .map(t => targetTypeLabels[t] || t)
      .join(', ');

    return `당신은 로봇 산업 전문 리서치 분석가입니다.

아래 질의에 대해 구조화된 팩트와 메타데이터만 반환하세요.

**중요 규칙:**
- 기사 원문 텍스트를 절대 포함하지 마세요.
- 각 팩트는 요약된 설명(1~2문장)만 포함하세요.
- 반드시 아래 JSON 형식으로만 응답하세요.

**질의:** ${request.query}

**분석 대상 유형:** ${targetDescriptions}

**시간 범위:** ${request.timeRange.start} ~ ${request.timeRange.end}

**지역:** ${request.region}

**응답 JSON 형식:**
{
  "summary": "전체 요약 (한국어, 2~3문장)",
  "facts": [
    {
      "category": "company | product | component | application | keyword",
      "name": "엔티티 이름",
      "description": "요약된 팩트 설명 (1~2문장, 원문 텍스트 금지)",
      "confidence": 0.0~1.0
    }
  ],
  "sources": [
    {
      "domain": "출처 도메인 (예: reuters.com)",
      "title": "참고 자료 제목"
    }
  ]
}

대상 유형(${request.targetTypes.join(', ')})에 해당하는 팩트만 포함하세요.
confidence는 정보의 신뢰도를 나타냅니다 (0.9+: 확실, 0.7~0.9: 높음, 0.5~0.7: 보통).`;
  }

  /**
   * OpenAI API 호출 (ChatGPT)
   */
  private async callOpenAI(prompt: string): Promise<string> {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '당신은 로봇 산업 전문 리서치 분석가입니다. 반드시 유효한 JSON으로만 응답하세요.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 3000,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI 응답이 비어있습니다.');
    }
    return content;
  }

  /**
   * Anthropic API 호출 (Claude)
   */
  private async callClaude(prompt: string): Promise<string> {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [
        { role: 'user', content: `${prompt}\n\n반드시 유효한 JSON으로만 응답하세요. 다른 텍스트는 포함하지 마세요.` },
      ],
    });

    const textBlock = response.content.find(block => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('Claude 응답이 비어있습니다.');
    }
    return textBlock.text;
  }

  /**
   * AI 응답 JSON 파싱
   */
  private parseResponse(raw: string): AISearchResponse {
    // JSON 블록이 ```json ... ``` 으로 감싸져 있을 수 있음
    let jsonStr = raw.trim();
    const jsonBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch && jsonBlockMatch[1]) {
      jsonStr = jsonBlockMatch[1].trim();
    }

    try {
      const data = JSON.parse(jsonStr) as Record<string, unknown>;

      const validCategories = new Set(['company', 'product', 'component', 'application', 'keyword']);

      const facts: StructuredFact[] = (Array.isArray(data.facts) ? data.facts : [])
        .filter((f: any) => f && typeof f.name === 'string' && f.name.length > 0)
        .map((f: any) => ({
          category: validCategories.has(f.category) ? f.category : 'keyword',
          name: String(f.name),
          description: String(f.description || ''),
          confidence: Math.max(0, Math.min(1, Number(f.confidence) || 0.5)),
        }));

      const sources: SourceReference[] = (Array.isArray(data.sources) ? data.sources : [])
        .filter((s: any) => s && typeof s.domain === 'string')
        .map((s: any) => ({
          domain: String(s.domain),
          title: String(s.title || ''),
        }));

      return {
        summary: typeof data.summary === 'string' ? data.summary : '',
        facts,
        sources,
      };
    } catch (error) {
      console.error('[ExternalAIAgent] JSON 파싱 실패:', error);
      throw new Error('AI 응답을 파싱할 수 없습니다. 다시 시도해주세요.');
    }
  }

  /**
   * API 키 존재 여부 확인
   */
  private validateApiKey(provider: 'chatgpt' | 'claude'): void {
    if (provider === 'chatgpt' && !process.env.OPENAI_API_KEY) {
      throw new Error(
        'OPENAI_API_KEY 환경 변수가 설정되지 않았습니다. .env 파일에 OPENAI_API_KEY를 추가해주세요.'
      );
    }
    if (provider === 'claude' && !process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        'ANTHROPIC_API_KEY 환경 변수가 설정되지 않았습니다. .env 파일에 ANTHROPIC_API_KEY를 추가해주세요.'
      );
    }
  }
}

export const externalAIAgent = new ExternalAIAgentService();

/**
 * AISearchResponse → ParseResult 변환
 *
 * ExternalAIAgent의 응답을 ArticleParser의 ParseResult 형식으로 변환하여
 * EntityLinker와의 호환성을 유지한다.
 */
export function convertToParseResult(aiResponse: AISearchResponse): ParseResult {
  return {
    companies: aiResponse.facts
      .filter(f => f.category === 'company')
      .map(f => ({ name: f.name, type: 'company' as const, confidence: f.confidence, context: f.description })),
    products: aiResponse.facts
      .filter(f => f.category === 'product')
      .map(f => ({ name: f.name, type: 'product' as const, confidence: f.confidence, context: f.description })),
    components: aiResponse.facts
      .filter(f => f.category === 'component')
      .map(f => ({ name: f.name, type: 'component' as const, confidence: f.confidence, context: f.description })),
    applications: aiResponse.facts
      .filter(f => f.category === 'application')
      .map(f => ({ name: f.name, type: 'application' as const, confidence: f.confidence, context: f.description })),
    keywords: aiResponse.facts
      .filter(f => f.category === 'keyword')
      .map(f => ({ term: f.name, relevance: f.confidence })),
    summary: aiResponse.summary,
    detectedLanguage: 'ko',
  };
}

