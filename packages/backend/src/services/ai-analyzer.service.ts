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
 * AI 분석 기능 비활성화
 * 저작권 보호를 위해 기사 본문 분석을 수행하지 않습니다.
 * 
 * @deprecated 저작권 이슈로 인해 비활성화됨
 */
export async function analyzeArticle(
  _title: string,
  _content: string
): Promise<ArticleAnalysis> {
  // 저작권 보호를 위해 AI 분석 비활성화
  console.log('[AI] Article analysis disabled for copyright protection');
  return { 
    summary: '', 
    category: 'other', 
    productType: 'none' 
  };
}
