import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface PublicDataSummary {
  summary: string;
  keyPoints: string[];
  sourceType: 'arxiv' | 'sec_edgar' | 'patent' | 'github';
}

/**
 * 공개 데이터 AI 요약
 * 
 * 허용 소스:
 * - arXiv: 초록 요약 (CC 라이선스, 연구 목적)
 * - SEC EDGAR: 공시 요약 (Public Domain)
 * - USPTO: 특허 요약 (공공 정보)
 * - GitHub: 리포 설명 요약 (메타데이터)
 * 
 * 원칙:
 * - 짧은 설명 + 출처 링크 수준
 * - 원문을 대체하지 않음
 */
export async function summarizePublicData(
  title: string,
  content: string,
  sourceType: PublicDataSummary['sourceType'],
  sourceUrl: string
): Promise<PublicDataSummary> {
  // API 키가 없으면 기본 응답
  if (!process.env.OPENAI_API_KEY) {
    console.log('[AI] OpenAI API key not configured');
    return {
      summary: content.substring(0, 200) + '...',
      keyPoints: [],
      sourceType,
    };
  }

  try {
    const systemPrompt = `You are a research assistant summarizing public data for trend analysis.
Rules:
- Provide a brief summary (2-3 sentences max)
- Extract 2-3 key points
- This is for internal research purposes only
- Always remind users to check the original source
- Language: Korean`;

    const userPrompt = `Summarize this ${sourceType} data:
Title: ${title}
Content: ${content.substring(0, 1000)}
Source: ${sourceUrl}

Provide a brief Korean summary and key points.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 300,
      temperature: 0.3,
    });

    const result = response.choices[0]?.message?.content || '';
    
    // 간단한 파싱
    const lines = result.split('\n').filter(l => l.trim());
    const summary = lines[0] || content.substring(0, 200);
    const keyPoints = lines.slice(1).filter(l => l.startsWith('-') || l.startsWith('•')).map(l => l.replace(/^[-•]\s*/, ''));

    return {
      summary,
      keyPoints: keyPoints.slice(0, 3),
      sourceType,
    };
  } catch (error) {
    console.error('[AI] Summary failed:', error);
    return {
      summary: content.substring(0, 200) + '...',
      keyPoints: [],
      sourceType,
    };
  }
}

/**
 * 트렌드 분석 (여러 데이터 종합)
 */
export async function analyzeTrends(
  items: Array<{ title: string; sourceType: string; date?: string }>
): Promise<{ trends: string[]; summary: string }> {
  if (!process.env.OPENAI_API_KEY || items.length === 0) {
    return { trends: [], summary: '데이터가 부족합니다.' };
  }

  try {
    const titles = items.slice(0, 20).map(i => `[${i.sourceType}] ${i.title}`).join('\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { 
          role: 'system', 
          content: 'You are a robotics industry analyst. Identify trends from the given data titles. Respond in Korean. Be concise.' 
        },
        { 
          role: 'user', 
          content: `Analyze these recent robotics-related items and identify 3-5 key trends:\n\n${titles}` 
        },
      ],
      max_tokens: 400,
      temperature: 0.5,
    });

    const result = response.choices[0]?.message?.content || '';
    const lines = result.split('\n').filter(l => l.trim());
    
    return {
      trends: lines.filter(l => l.match(/^\d+\.|^-|^•/)).slice(0, 5),
      summary: lines[0] || '트렌드 분석 결과',
    };
  } catch (error) {
    console.error('[AI] Trend analysis failed:', error);
    return { trends: [], summary: '분석 중 오류가 발생했습니다.' };
  }
}

// 기존 기사 분석 함수 (비활성화 유지)
export interface ArticleAnalysis {
  summary: string;
  category: 'product' | 'technology' | 'industry' | 'other';
  productType: 'robot' | 'rfm' | 'soc' | 'actuator' | 'none';
}

/**
 * @deprecated 뉴스 기사 분석은 저작권 이슈로 비활성화
 */
export async function analyzeArticle(
  _title: string,
  _content: string
): Promise<ArticleAnalysis> {
  console.log('[AI] News article analysis disabled for copyright protection');
  return { summary: '', category: 'other', productType: 'none' };
}
