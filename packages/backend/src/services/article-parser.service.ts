/**
 * ArticleParserService - LLM 기반 기사 파싱 서비스
 * 
 * 기사 원문에서 회사, 제품, 부품, 적용 사례, 키워드, 요약을 추출합니다.
 * 한국어/영어 자동 감지, confidence 점수 부여.
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MIN_TEXT_LENGTH = 20;

export interface ParseOptions {
  companies: boolean;
  products: boolean;
  components: boolean;
  applications: boolean;
  keywords: boolean;
  summary: boolean;
}

export interface ParsedEntity {
  name: string;
  type: 'company' | 'product' | 'component' | 'application' | 'keyword';
  confidence: number;
  context: string;
}

export interface ParseResult {
  companies: ParsedEntity[];
  products: ParsedEntity[];
  components: ParsedEntity[];
  applications: ParsedEntity[];
  keywords: { term: string; relevance: number }[];
  summary: string;
  detectedLanguage: string;
}

const DEFAULT_OPTIONS: ParseOptions = {
  companies: true,
  products: true,
  components: true,
  applications: true,
  keywords: true,
  summary: true,
};

export class ArticleParserService {
  /**
   * 기사 원문을 파싱하여 엔티티/키워드/요약 추출
   */
  async parse(rawText: string, lang?: string, options?: Partial<ParseOptions>): Promise<ParseResult> {
    // 빈 입력 / 최소 길이 검증
    if (!rawText || rawText.trim().length < MIN_TEXT_LENGTH) {
      throw new Error(`입력 텍스트가 너무 짧습니다. 최소 ${MIN_TEXT_LENGTH}자 이상이어야 합니다.`);
    }

    const detectedLanguage = lang || this.detectLanguage(rawText);
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    // LLM API 키가 없으면 regex 기반 폴백
    if (!process.env.OPENAI_API_KEY) {
      console.log('[ArticleParser] OpenAI API key not configured, using fallback');
      return this.fallbackParse(rawText, detectedLanguage, mergedOptions);
    }

    try {
      const prompt = this.buildPrompt(rawText, detectedLanguage, mergedOptions);
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: this.getSystemPrompt(detectedLanguage) },
          { role: 'user', content: prompt },
        ],
        max_tokens: 2000,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{}';
      return this.parseAIResponse(content, detectedLanguage);
    } catch (error) {
      console.error('[ArticleParser] LLM API failed, retrying once...', error);
      // 재시도 1회
      try {
        const prompt = this.buildPrompt(rawText, detectedLanguage, mergedOptions);
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: this.getSystemPrompt(detectedLanguage) },
            { role: 'user', content: prompt },
          ],
          max_tokens: 2000,
          temperature: 0.2,
          response_format: { type: 'json_object' },
        });
        const content = response.choices[0]?.message?.content || '{}';
        return this.parseAIResponse(content, detectedLanguage);
      } catch (retryError) {
        console.error('[ArticleParser] Retry failed, using fallback', retryError);
        return this.fallbackParse(rawText, detectedLanguage, mergedOptions);
      }
    }
  }

  /**
   * 언어 자동 감지 (한국어/영어)
   */
  detectLanguage(text: string): string {
    const koreanChars = (text.match(/[\uAC00-\uD7AF]/g) || []).length;
    const totalChars = text.replace(/\s/g, '').length || 1;
    return koreanChars / totalChars > 0.2 ? 'ko' : 'en';
  }

  private getSystemPrompt(lang: string): string {
    return `You are an expert robotics industry analyst. Extract structured entities from articles about humanoid robots, robotics components, and related industries.

Always respond in valid JSON format with the following structure:
{
  "companies": [{"name": "...", "confidence": 0.0-1.0, "context": "..."}],
  "products": [{"name": "...", "confidence": 0.0-1.0, "context": "..."}],
  "components": [{"name": "...", "confidence": 0.0-1.0, "context": "..."}],
  "applications": [{"name": "...", "confidence": 0.0-1.0, "context": "..."}],
  "keywords": [{"term": "...", "relevance": 0.0-1.0}],
  "summary": "..."
}

Rules:
- confidence: 0.9+ for explicitly mentioned, 0.7-0.9 for strongly implied, 0.5-0.7 for loosely related
- context: short excerpt from the original text where the entity was found
- keywords: industry-relevant terms (technology, market, application concepts)
- summary: 2-3 sentence summary in ${lang === 'ko' ? 'Korean' : 'English'}
- Focus on humanoid robots, robotics, AI, automation, SoC, actuators, sensors`;
  }

  private buildPrompt(text: string, lang: string, options: ParseOptions): string {
    const enabledSections = [];
    if (options.companies) enabledSections.push('companies (회사/기업)');
    if (options.products) enabledSections.push('products (제품/로봇)');
    if (options.components) enabledSections.push('components (부품: SoC, 액추에이터, 센서 등)');
    if (options.applications) enabledSections.push('applications (적용 사례/환경)');
    if (options.keywords) enabledSections.push('keywords (핵심 키워드)');
    if (options.summary) enabledSections.push('summary (요약)');

    return `Analyze the following ${lang === 'ko' ? 'Korean' : 'English'} article and extract:
${enabledSections.map(s => `- ${s}`).join('\n')}

For disabled sections, return empty arrays or empty string.

Article text:
---
${text.substring(0, 4000)}
---`;
  }

  private parseAIResponse(content: string, detectedLanguage: string): ParseResult {
    try {
      const data = JSON.parse(content) as any;

      const mapEntities = (arr: any[], type: ParsedEntity['type']): ParsedEntity[] =>
        (arr || []).map((e: any) => ({
          name: String(e.name || ''),
          type,
          confidence: Math.max(0, Math.min(1, Number(e.confidence) || 0.5)),
          context: String(e.context || ''),
        })).filter((e: ParsedEntity) => e.name.length > 0);

      return {
        companies: mapEntities(data.companies, 'company'),
        products: mapEntities(data.products, 'product'),
        components: mapEntities(data.components, 'component'),
        applications: mapEntities(data.applications, 'application'),
        keywords: (data.keywords || []).map((k: any) => ({
          term: String(k.term || ''),
          relevance: Math.max(0, Math.min(1, Number(k.relevance) || 0.5)),
        })).filter((k: { term: string }) => k.term.length > 0),
        summary: String(data.summary || ''),
        detectedLanguage,
      };
    } catch {
      console.error('[ArticleParser] Failed to parse AI response');
      return this.emptyResult(detectedLanguage);
    }
  }

  /**
   * LLM 없이 regex 기반 폴백 파싱
   */
  private fallbackParse(text: string, lang: string, options: ParseOptions): ParseResult {
    const result = this.emptyResult(lang);

    if (options.keywords) {
      // 대문자로 시작하는 단어 또는 한국어 명사 추출
      const words = text.match(/[A-Z][a-zA-Z]{2,}/g) || [];
      const uniqueWords = [...new Set(words)].slice(0, 10);
      result.keywords = uniqueWords.map(w => ({ term: w, relevance: 0.5 }));
    }

    if (options.summary) {
      const sentences = text.split(/[.!?。]\s*/);
      result.summary = sentences.slice(0, 2).join('. ').substring(0, 300);
    }

    return result;
  }

  private emptyResult(lang: string): ParseResult {
    return {
      companies: [],
      products: [],
      components: [],
      applications: [],
      keywords: [],
      summary: '',
      detectedLanguage: lang,
    };
  }
}

export const articleParserService = new ArticleParserService();
