/**
 * 기사 분석 스텁 (비활성).
 *
 * 뉴스 기사 AI 분석은 저작권 이슈로 비활성화되어 있다. 크롤러가 수집 시점에 요약·분류한다(packages/crawler 의 ai-analyzer.service).
 * 이전에 이 파일에 있던 summarizePublicData / analyzeTrends 는 호출처가 없는 데드 코드여서 삭제했다
 * (프롬프트 인젝션 방어 작업 — 외부 텍스트를 모델에 보내는 미사용 경로를 남기지 않는다).
 */

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
