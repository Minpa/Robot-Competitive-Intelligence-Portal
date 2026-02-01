import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ArticleAnalysis {
  summary: string;
  category: 'product' | 'technology' | 'industry' | 'other';
  productType: 'robot' | 'rfm' | 'soc' | 'actuator' | 'none';
}

/**
 * Analyze article content using GPT-4o-mini
 */
export async function analyzeArticle(
  title: string,
  content: string
): Promise<ArticleAnalysis> {
  if (!process.env.OPENAI_API_KEY) {
    console.log('[AI] OPENAI_API_KEY not configured, skipping analysis');
    return { summary: '', category: 'other', productType: 'none' };
  }

  const truncatedContent = content.slice(0, 2000);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `당신은 로봇 산업 전문 분석가입니다. 기사를 분석하여 다음을 수행하세요:

1. 요약: 한국어로 2-3문장으로 핵심 내용을 요약

2. 카테고리 분류 (동향 관점):
   - product: 새로운 로봇 제품 출시, 제품 업데이트, 제품 스펙 관련
   - technology: 새로운 기술, AI, 센서, 알고리즘, 연구 논문 관련
   - industry: 시장 동향, 투자, M&A, 파트너십, 규제 관련
   - other: 위 카테고리에 해당하지 않는 경우

3. 제품 유형 분류 (제품 관점):
   - robot: 로봇 완제품 (휴머노이드, 서비스 로봇, 물류 로봇, 산업용 로봇 등)
   - rfm: Robot Foundation Model, VLA, VLM, 로봇 AI 모델 (RT-2, π0, GR00T, Octo 등)
   - soc: 로봇용 SoC, AI 칩, 프로세서 (Jetson, Qualcomm RB, Hailo 등)
   - actuator: 액츄에이터, 모터, 감속기 (Harmonic Drive, Maxon, Gyems 등)
   - none: 특정 제품 유형과 관련 없는 경우

JSON 형식으로만 응답하세요:
{"summary": "요약 내용", "category": "카테고리", "productType": "제품유형"}`,
        },
        {
          role: 'user',
          content: `제목: ${title}\n\n내용: ${truncatedContent}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 400,
    });

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error('Empty response from OpenAI');
    }

    const parsed = JSON.parse(result);
    const validCategories = ['product', 'technology', 'industry', 'other'];
    const validProductTypes = ['robot', 'rfm', 'soc', 'actuator', 'none'];
    const category = validCategories.includes(parsed.category) ? parsed.category : 'other';
    const productType = validProductTypes.includes(parsed.productType) ? parsed.productType : 'none';

    console.log(`[AI] Analyzed: "${title.slice(0, 50)}..." -> ${category}, ${productType}`);

    return {
      summary: parsed.summary || '',
      category,
      productType,
    };
  } catch (error) {
    console.error('[AI] Analysis failed:', error);
    return { summary: '', category: 'other', productType: 'none' };
  }
}
