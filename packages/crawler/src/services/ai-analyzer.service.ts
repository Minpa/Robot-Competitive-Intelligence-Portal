import OpenAI from 'openai';
import { LLM_INPUT_LIMITS, buildUserMessage, sanitizeExternalText } from './llm-input-guard.js';
import { parseJsonStrict, sanitizeOutputText, enumOnly } from './llm-output-guard.js';
import { composeSystemPrompt, JSON_ONLY_NOTICE, NO_URL_NOTICE } from './llm-guard-prompts.js';
import { recordInputGuard, recordOutputReject } from './llm-guard-metrics.js';

const POINT = 'news_summary';
const SUMMARY_MAX_CHARS = 600;
const CATEGORIES = ['product', 'technology', 'industry', 'other'] as const;

let sharedClient: OpenAI | null = null;
/** 기본 client 는 첫 사용 시 환경 설정으로 만든다 (현재 동작과 동일). 테스트는 opts.client 로 주입한다 */
function getClient(): OpenAI {
  if (!sharedClient) sharedClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return sharedClient;
}

export interface ArticleAnalysis {
  summary: string;
  category: 'product' | 'technology' | 'industry' | 'other';
}

const SYSTEM_INSTRUCTIONS = `당신은 로봇 산업 전문 분석가입니다. 사용자 메시지의 데이터 블록(title, content)에 있는 기사를 분석하여 다음을 수행하세요:

1. 요약: 한국어로 2-3문장으로 핵심 내용을 요약
2. 카테고리 분류:
   - product: 새로운 로봇 제품 출시, 제품 업데이트, 제품 스펙 관련
   - technology: 새로운 기술, AI, 센서, 알고리즘, 연구 논문 관련
   - industry: 시장 동향, 투자, M&A, 파트너십, 규제 관련
   - other: 위 카테고리에 해당하지 않는 경우

${JSON_ONLY_NOTICE} ${NO_URL_NOTICE}
JSON 형식으로만 응답하세요:
{"summary": "요약 내용", "category": "카테고리"}`;

/**
 * Analyze article content using GPT-4o-mini
 * - Generates a concise Korean summary (2-3 sentences)
 * - Classifies into category: product, technology, industry, other
 *
 * 외부 텍스트(제목·본문)는 정제한 사본을 user 데이터 블록에만 넣고, 지시문은 system 에만 둔다.
 * 출력은 category enum 검증 + summary URL 제거/유출 폐기/길이 상한을 거친다.
 */
export async function analyzeArticle(
  title: string,
  content: string,
  opts: { client?: OpenAI } = {}
): Promise<ArticleAnalysis> {
  // Skip if no API key configured (주입된 client 가 있으면 그것을 쓴다)
  if (!opts.client && !process.env.OPENAI_API_KEY) {
    console.log('[AI] OPENAI_API_KEY not configured, skipping analysis');
    return {
      summary: '',
      category: 'other',
    };
  }

  // 본문은 토큰 절약을 위해 최대 2000자 (기존과 동일 상한)
  const cleanTitle = sanitizeExternalText(title, { maxChars: LLM_INPUT_LIMITS.title });
  const cleanContent = sanitizeExternalText(content, { maxChars: LLM_INPUT_LIMITS.body });
  recordInputGuard(POINT, [cleanTitle, cleanContent]);

  const system = composeSystemPrompt(SYSTEM_INSTRUCTIONS);

  try {
    const response = await (opts.client ?? getClient()).chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: buildUserMessage('news_summary', { title: cleanTitle.text, content: cleanContent.text }) },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error('Empty response from OpenAI');
    }

    // Parse JSON response (스키마 밖 키는 쓰지 않는다)
    const parsed = parseJsonStrict(result, 'object') as { summary?: unknown; category?: unknown } | null;
    if (!parsed) {
      recordOutputReject(POINT, 'schema');
      return { summary: '', category: 'other' };
    }

    // Validate category
    const category = enumOnly(parsed.category, CATEGORIES) ?? 'other';
    if (parsed.category !== undefined && category === 'other' && parsed.category !== 'other') recordOutputReject(POINT, 'enum');

    const summary = sanitizeOutputText(parsed.summary, { maxChars: SUMMARY_MAX_CHARS, systemText: system });
    if (summary.text === null && parsed.summary !== undefined && parsed.summary !== '') recordOutputReject(POINT, summary.reason ?? 'schema');
    if (summary.flags.includes('url_removed')) recordOutputReject(POINT, 'url');

    console.log(`[AI] Analyzed: titleLength=${title.length} -> ${category}`);

    return {
      summary: summary.text ?? '',
      category,
    };
  } catch (error) {
    console.error('[AI] Analysis failed:', error);
    return {
      summary: '',
      category: 'other',
    };
  }
}

/**
 * Batch analyze multiple articles
 */
export async function analyzeArticles(
  articles: Array<{ title: string; content: string }>
): Promise<ArticleAnalysis[]> {
  const results: ArticleAnalysis[] = [];
  
  for (const article of articles) {
    const analysis = await analyzeArticle(article.title, article.content);
    results.push(analysis);
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return results;
}
