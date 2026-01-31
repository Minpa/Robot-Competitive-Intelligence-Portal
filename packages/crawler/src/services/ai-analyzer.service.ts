import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ArticleAnalysis {
  summary: string;
  category: 'product' | 'technology' | 'industry' | 'other';
}

/**
 * Analyze article content using GPT-4o-mini
 * - Generates a concise Korean summary (2-3 sentences)
 * - Classifies into category: product, technology, industry, other
 */
export async function analyzeArticle(
  title: string,
  content: string
): Promise<ArticleAnalysis> {
  // Skip if no API key configured
  if (!process.env.OPENAI_API_KEY) {
    console.log('[AI] OPENAI_API_KEY not configured, skipping analysis');
    return {
      summary: '',
      category: 'other',
    };
  }

  // Truncate content to save tokens (max ~2000 chars)
  const truncatedContent = content.slice(0, 2000);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `당신은 로봇 산업 전문 분석가입니다. 기사를 분석하여 다음을 수행하세요:

1. 요약: 한국어로 2-3문장으로 핵심 내용을 요약
2. 카테고리 분류:
   - product: 새로운 로봇 제품 출시, 제품 업데이트, 제품 스펙 관련
   - technology: 새로운 기술, AI, 센서, 알고리즘, 연구 논문 관련
   - industry: 시장 동향, 투자, M&A, 파트너십, 규제 관련
   - other: 위 카테고리에 해당하지 않는 경우

JSON 형식으로만 응답하세요:
{"summary": "요약 내용", "category": "카테고리"}`,
        },
        {
          role: 'user',
          content: `제목: ${title}\n\n내용: ${truncatedContent}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error('Empty response from OpenAI');
    }

    // Parse JSON response
    const parsed = JSON.parse(result);
    
    // Validate category
    const validCategories = ['product', 'technology', 'industry', 'other'];
    const category = validCategories.includes(parsed.category) 
      ? parsed.category 
      : 'other';

    console.log(`[AI] Analyzed: "${title.slice(0, 50)}..." -> ${category}`);

    return {
      summary: parsed.summary || '',
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
