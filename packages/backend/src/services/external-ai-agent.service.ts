/**
 * ExternalAIAgent - 외부 AI 기반 검색·요약 서비스
 *
 * ChatGPT/Claude API를 사용하여 구조화된 팩트/메타데이터를 반환한다.
 * 기사 원문 텍스트는 반환하지 않으며, 구조화된 팩트만 추출한다.
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import type { ParseResult } from './article-parser.service.js';
import { aiUsageService } from './ai-usage.service.js';

// ── Interfaces ──

export interface AISearchRequest {
  query: string;
  targetTypes: ('company' | 'product' | 'component' | 'application' | 'workforce' | 'market' | 'technology' | 'keyword')[];
  timeRange: { start: string; end: string };
  region: string;
  provider: 'chatgpt' | 'claude';
  /** 웹 검색을 활성화하여 실시간 최신 정보를 가져올지 여부 (기본: false) */
  webSearch?: boolean;
}

export interface AISearchResponse {
  summary: string;
  facts: StructuredFact[];
  sources: SourceReference[];
}

export interface StructuredFact {
  category: 'company' | 'product' | 'component' | 'application' | 'workforce' | 'market' | 'technology' | 'keyword';
  name: string;
  description: string;
  confidence: number;
}

export interface SourceReference {
  domain: string;
  title: string;
}

// ── Citation tag stripping ──

/**
 * Claude Sonnet 4 + web_search가 description에 삽입하는 <cite index="..."> 태그 제거.
 * 내부 텍스트는 보존하고 태그만 제거.
 */
export function stripCitationTags(text: string): string {
  if (!text) return text;
  // <cite ...>...</cite> — 열림/닫힘 모두 제거, 내부 텍스트 유지
  let s = text.replace(/<cite\b[^>]*>/gi, '').replace(/<\/cite>/gi, '');
  // 다른 잔여 HTML 태그도 제거 (description은 plain text여야 함)
  s = s.replace(/<\/?[a-z][a-z0-9]*\b[^>]*>/gi, '');
  // 연속 공백·줄바꿈 정리
  s = s.replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
  return s;
}

// ── Entity name sanitization ──

/**
 * AI가 뉴스 헤드라인을 name으로 넣는 걸 막기 위한 정제 함수.
 * 꼬리에 붙은 동작 서술(출시·도입·발표 등)과 숫자 단위 서술(1만대 출하 등)을 제거.
 *
 * 원칙: "확실한 뉴스 헤드라인 꼬리"만 제거. 제품 모델 번호, 영문 코드명, 약어는 건드리지 않음.
 * - "Samsung Exynos 2100" → 그대로 (2100은 모델 번호)
 * - "A100 (SXM)" → 그대로 (SXM은 폼팩터)
 * - "Unitree H2 북미 출시" → "Unitree H2" (출시는 동사)
 */
export function sanitizeEntityName(raw: string): string {
  let s = raw.trim();

  // 따옴표 제거
  s = s.replace(/^[\"'"'「『]|[\"'"'」』]$/g, '');

  // 괄호 내용 제거는 조건부:
  //   - 한글 포함 → 번역/도시명으로 간주해 제거 ("Galaxy General (은하범용로봇)" → "Galaxy General")
  //   - 명시적 국가 코드/명 → 제거 ("Humanoid (UK)" → "Humanoid")
  //   - 그 외 ASCII 코드명/약어는 유지 ("A100 (SXM)", "Mobile Industrial Robots (MiR)")
  // 주의: `[A-Z]{2,3}` 같은 generic 패턴 사용 금지 — SXM, MiR, HRX 같은 엔지니어링 약어가 국가로 오인됨.
  const COUNTRY_CODES = new Set([
    'USA', 'US', 'UK', 'JP', 'CN', 'KR', 'EU', 'DE', 'FR', 'IT', 'ES',
    'CA', 'AU', 'IN', 'SG', 'IL', 'NO', 'SE', 'FI', 'DK', 'NL', 'CH', 'AT', 'GB',
    'Korea', 'Japan', 'China', 'Germany', 'France', 'Italy', 'Spain',
    'Canada', 'Australia', 'India', 'Singapore', 'Israel', 'Norway',
    'Sweden', 'Finland', 'Denmark', 'Netherlands', 'Switzerland', 'Austria',
    'Taiwan', 'Hong Kong', 'Vietnam', 'Thailand',
  ]);
  const parenMatch = s.match(/\s*\(([^)]*)\)\s*$/);
  if (parenMatch && parenMatch[1]) {
    const inside = parenMatch[1].trim();
    const hasKorean = /[가-힣]/.test(inside);
    const isCountry = COUNTRY_CODES.has(inside);
    if (hasKorean || isCountry) {
      s = s.replace(/\s*\([^)]*\)\s*$/, '').trim();
    }
  }

  // 꼬리에 붙은 한국어 서술 동사·명사구 제거 (뉴스 헤드라인 패턴)
  // 중요: 패턴은 반드시 "동사(출시/도입 등)" 또는 "년 마커(2024년)"를 명시적으로 요구 —
  //       제품 모델의 4자리 숫자(Exynos 2100, Dimensity 9400)를 보호하기 위함.
  // 순서: 복합 패턴(2-word 이상)을 먼저 매칭하도록 위쪽 배치. 단일-동사 패턴이 조각을 먼저 먹으면
  //       복합 패턴이 영영 매칭되지 않는다.
  const tailPatterns = [
    // === 복합 패턴 먼저 (더 긴 매칭 우선) ===
    // 대규모/대량 + 동사 + 상태 (3-word) — "XPeng IRON 대량 생산 준비" → "XPeng IRON"
    /\s+(대규모|대량)\s+(생산|배치|투자)\s+(준비|완료|계획|시작)\s*$/,
    // 생산/배치/판매/공급 + 준비·계획·예정·목표 ("Tesla Gen 3 생산 준비" → "Tesla Gen 3")
    /\s+(생산|배치|판매|공급)\s+(준비|계획|예정|목표|시작|체결)\s*$/,
    // 대규모/대량 + 동사 (2-word) — "Unitree 로보틱스 대량 생산" → "Unitree 로보틱스"
    /\s+(대규모|대량)\s*(생산|배치|투자)\s*$/,
    // 숫자 + 단위 + 동사 (1만대 출하 달성)
    /\s+\d+(만|억|조|백만|천만)?\s*(대|원|달러|위안|엔|대수|건)\s*(누적)?\s*(출하|생산|판매|투자|펀딩|매출|계약)\s*(달성|돌파|확보|체결)?\s*$/,
    // 펀딩 라운드 (시리즈 C 펀딩)
    /\s+시리즈\s*[A-Z]\s*(펀딩|투자|라운드|클로징)?\s*$/,
    // CES/MWC + 연도 + 동사
    /\s+CES\s*\d{4}\s*(출시|공개|발표|참가)?\s*$/,
    // 금액 + 시리즈
    /\s+(1조|\d+억)\s*(달러|원|위안|엔)\s*(시리즈\s*[A-Z])?\s*$/,
    // 휴머노이드 꼬리
    /\s+휴머노이드\s*(로봇)?\s*(도입|선정|출시|채택)?\s*$/,
    // 해외/국내 + 동사
    /\s+(해외|국내)\s*(투자|진출|확장)\s*(유치|완료)?\s*$/,
    // 연도 — 반드시 "년" 마커 있거나 동사 뒤따라야 함 (2024, 2100 같은 bare 숫자는 보호)
    /\s+\d{4}년\s*(\d+월)?\s*(출시|발표|공개|런칭)?\s*$/,
    /\s+\d{4}\s*년\s*(\d+월)?\s*$/,

    // === 단일 동사 (마지막) ===
    /\s+(북미|아시아|유럽|중국|미국|일본|한국|글로벌|해외|국내|상용|본격|초기)?\s*(출시|런칭|공개|발표|도입|채택|확장|진출|선정|조성|달성|확보|유치|완료|시작|준비|결정|체결|서명|공급|제휴|파트너십|밸류에이션|계약|오픈|개시|론칭)\s*(준비|완료|예정|계획|체결)?\s*$/,
  ];
  let prev;
  do {
    prev = s;
    for (const pat of tailPatterns) s = s.replace(pat, '').trim();
  } while (prev !== s);

  // 끝에 쉼표/세미콜론 제거 ("Dimensity 9400," → "Dimensity 9400")
  s = s.replace(/[,;、]+\s*$/, '').trim();

  // 연속 공백 정리
  s = s.replace(/\s+/g, ' ').trim();

  return s;
}

/**
 * name이 유효한 엔티티명인지 검증. 뉴스 헤드라인처럼 보이면 reject.
 */
export function isValidEntityName(name: string, _category: string): boolean {
  if (!name) return false;
  if (name.length === 0) return false;
  if (name.length > 60) return false; // 60자 초과는 헤드라인으로 간주

  // 한국어 동작 서술 동사 포함 시 reject (sanitize 후에도 남아있다면 문제)
  if (/(출시|런칭|공개|발표|도입|채택|확장|진출|선정|조성|달성|확보|유치|완료|체결|제휴|파트너십|펀딩|투자\s*유치)$/.test(name)) {
    return false;
  }

  // 6 단어 초과는 문장일 가능성
  const wordCount = name.split(/\s+/).length;
  if (wordCount > 6) return false;

  // 10자 이상 연속된 한국어 서술이면 reject
  if (/[가-힣]{10,}/.test(name.replace(/\s+/g, ''))) return false;

  return true;
}

// ── Service ──

export class ExternalAIAgentService {
  // 월간 비용 한도 (USD) — 약 10,000원
  private static MONTHLY_COST_LIMIT_USD = 14.0;

  /**
   * AI 기반 검색·요약 수행
   */
  async search(request: AISearchRequest): Promise<AISearchResponse> {
    this.validateApiKey(request.provider);

    // 월간 비용 한도 체크
    const currentMonthCost = await aiUsageService.getCurrentMonthCostUsd();
    if (currentMonthCost >= ExternalAIAgentService.MONTHLY_COST_LIMIT_USD) {
      throw new Error(
        `이번 달 AI 사용 비용이 한도($${ExternalAIAgentService.MONTHLY_COST_LIMIT_USD.toFixed(2)}, 약 ₩10,000)에 도달했습니다. 현재 사용액: $${currentMonthCost.toFixed(4)}. 다음 달에 다시 시도해주세요.`
      );
    }

    const prompt = this.buildPrompt(request);
    const useWebSearch = request.webSearch === true;
    let raw: string;

    const callFn = () => request.provider === 'chatgpt'
      ? (useWebSearch ? this.callOpenAIWithWebSearch(prompt) : this.callOpenAI(prompt))
      : (useWebSearch ? this.callClaudeWithWebSearch(prompt) : this.callClaude(prompt));

    try {
      raw = await callFn();
    } catch (firstError) {
      // 1회 재시도 (rate limit 대비 60초 대기)
      const firstMsg = (firstError as Error).message || String(firstError);
      console.warn(`[ExternalAIAgent] ${request.provider} API 호출 실패, 60초 후 재시도...`, firstMsg);
      await new Promise(resolve => setTimeout(resolve, 60000));
      try {
        raw = await callFn();
      } catch (retryError) {
        const retryMsg = (retryError as Error).message || String(retryError);
        console.error(`[ExternalAIAgent] 재시도 실패:`, retryMsg);
        throw new Error(
          `AI 검색 실패 (${request.provider}): ${retryMsg}`
        );
      }
    }

    // 사용량 기록 (비동기, 실패해도 무시)
    const model = request.provider === 'chatgpt' ? 'gpt-4o-mini' : 'claude-sonnet-4-20250514';
    const estimatedInputTokens = Math.ceil(prompt.length / 3);
    const estimatedOutputTokens = Math.ceil(raw.length / 3);
    aiUsageService.logUsage({
      provider: request.provider,
      model,
      webSearch: useWebSearch,
      inputTokens: estimatedInputTokens,
      outputTokens: estimatedOutputTokens,
      query: request.query,
    }).catch(() => {});

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
      workforce: '인력/채용 동향 (팀 규모, 직무 분포, 채용 트렌드)',
      market: '시장 전망/투자 (시장 규모, 투자 라운드, 밸류에이션)',
      technology: '기술 트렌드 (AI, 제어, 센싱, 자율주행 등)',
      keyword: '핵심 키워드/기술 트렌드',
    };

    const targetDescriptions = request.targetTypes
      .map(t => targetTypeLabels[t] || t)
      .join(', ');

    const webSearchNote = request.webSearch
      ? `\n**중요:** 웹 검색을 통해 최신 실시간 정보를 기반으로 답변하세요. 가능한 최근 뉴스와 발표를 포함하세요.`
      : '';

    return `당신은 로봇 산업 전문 리서치 분석가입니다.

아래 질의에 대해 구조화된 팩트와 메타데이터만 반환하세요.
${webSearchNote}
**중요 규칙:**
- 기사 원문 텍스트를 절대 포함하지 마세요.
- 각 팩트는 요약된 설명(1~2문장)만 포함하세요.
- 반드시 아래 JSON 형식으로만 응답하세요.

**⚠️ name 필드 규칙 (매우 중요):**
- name은 엔티티의 **고유 명칭만** (회사 이름 또는 제품 이름만) 포함해야 합니다.
- 뉴스 헤드라인, 설명, 동작(출시/도입/발표/투자 유치/북미 출시 등)은 절대 name에 포함하지 마세요.
- 한국어 조사·동사·부가 설명 금지.
- 최대 40자, 최대 4단어 이내.
- 올바른 예: "Unitree", "Figure AI", "Optimus Gen 2", "Atlas", "Digit"
- 잘못된 예: "Unitree H2 북미 출시" (→ "Unitree H2"), "SAIC Motor 휴머노이드 로봇 도입" (→ "SAIC Motor"), "Agibot 1만대 누적 출하 달성" (→ "Agibot"), "Figure AI 시리즈 C 펀딩" (→ "Figure AI")
- 뉴스·이벤트 내용은 반드시 description 필드에만 넣으세요.

**질의:** ${request.query}

**분석 대상 유형:** ${targetDescriptions}

**시간 범위:** ${request.timeRange.start} ~ ${request.timeRange.end}

**지역:** ${request.region}

**응답 JSON 형식:**
{
  "summary": "전체 요약 (한국어, 2~3문장)",
  "facts": [
    {
      "category": "company | product | component | application | workforce | market | technology | keyword",
      "name": "엔티티 고유명만 (예: 'Unitree', 'Optimus Gen 2') — 헤드라인·동사 절대 금지",
      "description": "요약된 팩트 설명 (1~2문장, 원문 텍스트 금지) — 뉴스 내용·동작은 여기에만",
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
   * OpenAI Responses API + web_search 도구 (실시간 웹 검색)
   */
  private async callOpenAIWithWebSearch(prompt: string): Promise<string> {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.responses.create({
      model: 'gpt-4o-mini',
      tools: [{ type: 'web_search_preview' }],
      instructions: '당신은 로봇 산업 전문 리서치 분석가입니다. 웹 검색을 통해 최신 정보를 수집한 후, 반드시 유효한 JSON으로만 응답하세요. JSON 외의 텍스트는 포함하지 마세요.',
      input: prompt,
    });

    // Responses API: output_text에서 텍스트 추출
    const text = response.output_text;
    if (!text) {
      throw new Error('OpenAI 웹 검색 응답이 비어있습니다.');
    }
    return text;
  }

  /**
   * Anthropic API + web_search 도구 (실시간 웹 검색)
   */
  private async callClaudeWithWebSearch(prompt: string): Promise<string> {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      tools: [{
        type: 'web_search_20250305' as any,
        name: 'web_search',
        max_uses: 3,
      } as any],
      messages: [
        { role: 'user', content: `${prompt}\n\n웹 검색을 통해 최신 정보를 수집한 후, 반드시 유효한 JSON으로만 응답하세요. 다른 텍스트는 포함하지 마세요.` },
      ],
    });

    // web_search 응답에서 text 블록 추출
    const textBlock = response.content.find(block => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('Claude 웹 검색 응답이 비어있습니다.');
    }
    return textBlock.text;
  }

  /**
   * AI 응답 JSON 파싱
   */
  private parseResponse(raw: string): AISearchResponse {
    let jsonStr = raw.trim();

    // 1) ```json ... ``` 코드블록 추출
    const jsonBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch && jsonBlockMatch[1]) {
      jsonStr = jsonBlockMatch[1].trim();
    }

    // 2) JSON 앞뒤에 텍스트가 붙어있는 경우: 첫 번째 '{' ~ 마지막 '}' 추출
    if (!jsonStr.startsWith('{')) {
      const firstBrace = jsonStr.indexOf('{');
      const lastBrace = jsonStr.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
      }
    }

    try {
      const data = JSON.parse(jsonStr) as Record<string, unknown>;

      const validCategories = new Set(['company', 'product', 'component', 'application', 'workforce', 'market', 'technology', 'keyword']);

      const facts: StructuredFact[] = (Array.isArray(data.facts) ? data.facts : [])
        .filter((f: any) => f && typeof f.name === 'string' && f.name.length > 0)
        .map((f: any) => {
          const sanitized = sanitizeEntityName(String(f.name));
          return {
            category: validCategories.has(f.category) ? f.category : 'keyword',
            name: sanitized,
            description: stripCitationTags(String(f.description || '')),
            confidence: Math.max(0, Math.min(1, Number(f.confidence) || 0.5)),
          };
        })
        .filter((f) => isValidEntityName(f.name, f.category));

      const sources: SourceReference[] = (Array.isArray(data.sources) ? data.sources : [])
        .filter((s: any) => s && typeof s.domain === 'string')
        .map((s: any) => ({
          domain: String(s.domain),
          title: String(s.title || ''),
        }));

      return {
        summary: stripCitationTags(typeof data.summary === 'string' ? data.summary : ''),
        facts,
        sources,
      };
    } catch (error) {
      console.error('[ExternalAIAgent] JSON 파싱 실패:', error, '\nRaw (first 500 chars):', raw.substring(0, 500));
      throw new Error(`AI 응답 파싱 실패: ${raw.substring(0, 120)}...`);
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
      .filter(f => ['keyword', 'workforce', 'market', 'technology'].includes(f.category))
      .map(f => ({ term: f.name, relevance: f.confidence })),
    summary: aiResponse.summary,
    detectedLanguage: 'ko',
  };
}

