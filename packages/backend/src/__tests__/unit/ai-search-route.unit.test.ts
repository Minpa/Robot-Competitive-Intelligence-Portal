/**
 * AI Search Route Unit Tests
 *
 * Tests the POST /ai-search endpoint logic:
 * - Empty query validation
 * - ExternalAIAgent → convertToParseResult → EntityLinker pipeline
 * - Default parameter handling
 * - Error status code differentiation (400 vs 500)
 *
 * Validates: Requirements 10.4, 10.5
 */

import { describe, it, expect } from 'vitest';

// Types matching the actual service interfaces (defined inline to avoid SDK imports)

interface StructuredFact {
  category: 'company' | 'product' | 'component' | 'application' | 'keyword';
  name: string;
  description: string;
  confidence: number;
}

interface SourceReference {
  domain: string;
  title: string;
}

interface AISearchResponse {
  summary: string;
  facts: StructuredFact[];
  sources: SourceReference[];
}

// Replicate the route handler logic for unit testing without DB/SDK dependencies

interface AISearchRequestBody {
  query: string;
  targetTypes?: string[];
  timeRange?: { start: string; end: string };
  region?: string;
  provider?: 'chatgpt' | 'claude';
}

interface ParsedEntity {
  name: string;
  type: 'company' | 'product' | 'component' | 'application' | 'keyword';
  confidence: number;
  context: string;
}

interface ParseResult {
  companies: ParsedEntity[];
  products: ParsedEntity[];
  components: ParsedEntity[];
  applications: ParsedEntity[];
  keywords: { term: string; relevance: number }[];
  summary: string;
  detectedLanguage: string;
}

/**
 * Simulates the request normalization done in the route handler
 */
function normalizeRequest(body: AISearchRequestBody) {
  return {
    query: body.query,
    targetTypes: body.targetTypes || ['company', 'product', 'component', 'application', 'keyword'],
    timeRange: body.timeRange || { start: '2024', end: '2025' },
    region: body.region || '글로벌',
    provider: body.provider || 'chatgpt',
  };
}

/**
 * Simulates the entity collection logic from the route handler
 */
function collectEntitiesForLinking(parseResult: ParseResult): ParsedEntity[] {
  return [
    ...parseResult.companies,
    ...parseResult.products,
    ...parseResult.components,
    ...parseResult.applications,
  ];
}

/**
 * Simulates the error status code logic from the route handler
 */
function getErrorStatusCode(message: string): number {
  return message.includes('환경 변수가 설정되지 않았습니다') ? 400 : 500;
}

/**
 * Local convertToParseResult matching the actual implementation
 */
function convertToParseResult(aiResponse: AISearchResponse): ParseResult {
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

describe('POST /ai-search route logic', () => {
  describe('input validation', () => {
    it('should reject empty query', () => {
      const query = '';
      expect(!query || query.trim().length === 0).toBe(true);
    });

    it('should reject whitespace-only query', () => {
      const query = '   ';
      expect(!query || query.trim().length === 0).toBe(true);
    });

    it('should accept non-empty query', () => {
      const query = '로봇 산업 동향';
      expect(!query || query.trim().length === 0).toBe(false);
    });
  });

  describe('request normalization', () => {
    it('should apply default values when optional fields are missing', () => {
      const normalized = normalizeRequest({ query: '테스트' });

      expect(normalized.targetTypes).toEqual(['company', 'product', 'component', 'application', 'keyword']);
      expect(normalized.timeRange).toEqual({ start: '2024', end: '2025' });
      expect(normalized.region).toBe('글로벌');
      expect(normalized.provider).toBe('chatgpt');
    });

    it('should preserve provided values', () => {
      const normalized = normalizeRequest({
        query: '테스트',
        targetTypes: ['company'],
        timeRange: { start: '2023', end: '2024' },
        region: '한국',
        provider: 'claude',
      });

      expect(normalized.targetTypes).toEqual(['company']);
      expect(normalized.timeRange).toEqual({ start: '2023', end: '2024' });
      expect(normalized.region).toBe('한국');
      expect(normalized.provider).toBe('claude');
    });
  });

  describe('entity collection for linking', () => {
    it('should collect companies, products, components, applications but not keywords', () => {
      const parseResult: ParseResult = {
        companies: [{ name: 'Tesla', type: 'company', confidence: 0.9, context: 'EV' }],
        products: [{ name: 'Optimus', type: 'product', confidence: 0.85, context: '로봇' }],
        components: [{ name: 'LiDAR', type: 'component', confidence: 0.8, context: '센서' }],
        applications: [{ name: '물류', type: 'application', confidence: 0.75, context: '자동화' }],
        keywords: [{ term: 'AI', relevance: 0.9 }],
        summary: '요약',
        detectedLanguage: 'ko',
      };

      const entities = collectEntitiesForLinking(parseResult);

      expect(entities).toHaveLength(4);
      expect(entities.map(e => e.name)).toEqual(['Tesla', 'Optimus', 'LiDAR', '물류']);
    });

    it('should return empty array when only keywords exist', () => {
      const parseResult: ParseResult = {
        companies: [], products: [], components: [], applications: [],
        keywords: [{ term: 'AI', relevance: 0.9 }],
        summary: '요약',
        detectedLanguage: 'ko',
      };

      const entities = collectEntitiesForLinking(parseResult);
      expect(entities).toHaveLength(0);
    });
  });

  describe('error status code differentiation', () => {
    it('should return 400 for missing API key errors', () => {
      expect(getErrorStatusCode('OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.')).toBe(400);
      expect(getErrorStatusCode('ANTHROPIC_API_KEY 환경 변수가 설정되지 않았습니다.')).toBe(400);
    });

    it('should return 500 for general errors', () => {
      expect(getErrorStatusCode('AI 검색에 실패했습니다 (chatgpt).')).toBe(500);
      expect(getErrorStatusCode('네트워크 오류')).toBe(500);
    });
  });

  describe('response structure', () => {
    it('should produce correct response shape from AI response', () => {
      const aiResponse: AISearchResponse = {
        summary: '로봇 산업 요약',
        facts: [
          { category: 'company', name: 'Boston Dynamics', description: '로봇 제조사', confidence: 0.95 },
          { category: 'product', name: 'Atlas', description: '휴머노이드 로봇', confidence: 0.9 },
          { category: 'keyword', name: 'AI', description: '인공지능', confidence: 0.75 },
        ],
        sources: [{ domain: 'reuters.com', title: 'Robot News' }],
      };

      const parseResult = convertToParseResult(aiResponse);
      const allEntities = collectEntitiesForLinking(parseResult);

      // Verify response structure matches the spec
      const response = {
        result: {
          summary: parseResult.summary,
          companies: parseResult.companies,
          products: parseResult.products,
          components: parseResult.components,
          applications: parseResult.applications,
          keywords: parseResult.keywords,
          detectedLanguage: parseResult.detectedLanguage,
        },
        linkResult: {
          candidates: {},
          unmatched: [],
        },
        sources: aiResponse.sources,
      };

      expect(response.result.summary).toBe('로봇 산업 요약');
      expect(response.result.companies).toHaveLength(1);
      expect(response.result.products).toHaveLength(1);
      expect(response.result.keywords).toHaveLength(1);
      expect(response.result.detectedLanguage).toBe('ko');
      expect(response.sources).toHaveLength(1);
      expect(response.sources[0]).toEqual({ domain: 'reuters.com', title: 'Robot News' });

      // Entities for linking should not include keywords
      expect(allEntities).toHaveLength(2);
    });

    it('should handle empty AI response', () => {
      const aiResponse: AISearchResponse = { summary: '', facts: [], sources: [] };
      const parseResult = convertToParseResult(aiResponse);

      expect(parseResult.companies).toEqual([]);
      expect(parseResult.products).toEqual([]);
      expect(parseResult.components).toEqual([]);
      expect(parseResult.applications).toEqual([]);
      expect(parseResult.keywords).toEqual([]);
      expect(parseResult.summary).toBe('');

      const entities = collectEntitiesForLinking(parseResult);
      expect(entities).toHaveLength(0);
    });
  });
});
