import { describe, it, expect } from 'vitest';
import { convertToParseResult, AISearchResponse, StructuredFact } from '../../services/external-ai-agent.service.js';

describe('convertToParseResult', () => {
  it('should convert facts into correct categories', () => {
    const aiResponse: AISearchResponse = {
      summary: '로봇 산업 요약',
      facts: [
        { category: 'company', name: 'Boston Dynamics', description: '로봇 제조사', confidence: 0.95 },
        { category: 'product', name: 'Atlas', description: '휴머노이드 로봇', confidence: 0.9 },
        { category: 'component', name: 'LiDAR 센서', description: '3D 센서', confidence: 0.85 },
        { category: 'application', name: '물류 자동화', description: '창고 자동화', confidence: 0.8 },
        { category: 'keyword', name: 'AI', description: '인공지능', confidence: 0.75 },
      ],
      sources: [{ domain: 'reuters.com', title: 'Robot News' }],
    };

    const result = convertToParseResult(aiResponse);

    expect(result.companies).toHaveLength(1);
    expect(result.companies[0]).toEqual({
      name: 'Boston Dynamics', type: 'company', confidence: 0.95, context: '로봇 제조사',
    });

    expect(result.products).toHaveLength(1);
    expect(result.products[0]).toEqual({
      name: 'Atlas', type: 'product', confidence: 0.9, context: '휴머노이드 로봇',
    });

    expect(result.components).toHaveLength(1);
    expect(result.components[0]).toEqual({
      name: 'LiDAR 센서', type: 'component', confidence: 0.85, context: '3D 센서',
    });

    expect(result.applications).toHaveLength(1);
    expect(result.applications[0]).toEqual({
      name: '물류 자동화', type: 'application', confidence: 0.8, context: '창고 자동화',
    });

    expect(result.keywords).toHaveLength(1);
    expect(result.keywords[0]).toEqual({ term: 'AI', relevance: 0.75 });

    expect(result.summary).toBe('로봇 산업 요약');
    expect(result.detectedLanguage).toBe('ko');
  });

  it('should handle empty facts array', () => {
    const aiResponse: AISearchResponse = {
      summary: '',
      facts: [],
      sources: [],
    };

    const result = convertToParseResult(aiResponse);

    expect(result.companies).toEqual([]);
    expect(result.products).toEqual([]);
    expect(result.components).toEqual([]);
    expect(result.applications).toEqual([]);
    expect(result.keywords).toEqual([]);
    expect(result.summary).toBe('');
    expect(result.detectedLanguage).toBe('ko');
  });

  it('should handle multiple facts in the same category', () => {
    const aiResponse: AISearchResponse = {
      summary: '요약',
      facts: [
        { category: 'company', name: 'Tesla', description: 'EV 제조사', confidence: 0.9 },
        { category: 'company', name: 'NVIDIA', description: 'GPU 제조사', confidence: 0.85 },
      ],
      sources: [],
    };

    const result = convertToParseResult(aiResponse);

    expect(result.companies).toHaveLength(2);
    expect(result.products).toHaveLength(0);
  });

  it('should preserve total fact count across all categories', () => {
    const facts: StructuredFact[] = [
      { category: 'company', name: 'A', description: '', confidence: 0.5 },
      { category: 'product', name: 'B', description: '', confidence: 0.5 },
      { category: 'component', name: 'C', description: '', confidence: 0.5 },
      { category: 'application', name: 'D', description: '', confidence: 0.5 },
      { category: 'keyword', name: 'E', description: '', confidence: 0.5 },
      { category: 'keyword', name: 'F', description: '', confidence: 0.5 },
    ];

    const aiResponse: AISearchResponse = { summary: '', facts, sources: [] };
    const result = convertToParseResult(aiResponse);

    const totalConverted =
      result.companies.length +
      result.products.length +
      result.components.length +
      result.applications.length +
      result.keywords.length;

    expect(totalConverted).toBe(facts.length);
  });
});
