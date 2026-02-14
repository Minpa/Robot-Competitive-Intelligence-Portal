import { eq, and, sql, desc } from 'drizzle-orm';
import {
  db,
  keywords,
  articleKeywords,
} from '../db/index.js';

export interface ExtractedKeyword {
  term: string;
  language: 'ko' | 'en';
  relevance: number;
  frequency: number;
  category?: string;
}

export interface KeywordStatsDelta {
  keywordId: string;
  term: string;
  currentCount: number;
  previousCount: number;
  delta: number;
  deltaPercent: number;
}

// 휴머노이드 로봇 관련 키워드 사전
const ROBOT_KEYWORDS = {
  ko: [
    // 로봇 유형
    '휴머노이드', '로봇', '이족보행', '양팔', '다관절', '협동로봇', '서비스로봇',
    // 기술
    '액추에이터', '센서', '인공지능', 'AI', '머신러닝', '딥러닝', '강화학습',
    '컴퓨터 비전', '자연어처리', 'LLM', '대규모 언어모델',
    // 부품
    '모터', '감속기', '하모닉 드라이브', '사이클로이드', '토크센서', '힘센서',
    'IMU', '라이다', 'LiDAR', '뎁스카메라', 'RGB카메라', '촉각센서',
    // 회사
    '테슬라', '옵티머스', '피규어', 'Figure', '보스턴 다이나믹스', '아틀라스',
    '유니트리', '샤오미', '현대로보틱스', '삼성', 'LG', '네이버', '카카오',
    '1X', 'Agility', 'Digit', 'Apptronik', 'Apollo', 'Sanctuary AI',
    // 적용 분야
    '물류', '제조', '의료', '서비스', '가정용', '산업용', '창고', '공장',
    // 스펙
    'DoF', '자유도', '페이로드', '배터리', '운영시간', '속도', '토크',
    // 시장/비즈니스
    '상용화', '양산', '파일럿', 'PoC', '시연', '투자', '펀딩', 'IPO',
  ],
  en: [
    // Robot types
    'humanoid', 'robot', 'bipedal', 'biped', 'dual-arm', 'multi-joint', 'cobot', 'service robot',
    // Technology
    'actuator', 'sensor', 'artificial intelligence', 'AI', 'machine learning', 'deep learning',
    'reinforcement learning', 'computer vision', 'NLP', 'LLM', 'large language model',
    'foundation model', 'transformer', 'neural network',
    // Components
    'motor', 'gearbox', 'harmonic drive', 'cycloidal', 'torque sensor', 'force sensor',
    'IMU', 'LiDAR', 'depth camera', 'RGB camera', 'tactile sensor', 'encoder',
    // Companies
    'Tesla', 'Optimus', 'Figure', 'Boston Dynamics', 'Atlas', 'Unitree',
    'Xiaomi', 'Hyundai', 'Samsung', '1X', 'Agility', 'Digit', 'Apptronik', 'Apollo',
    'Sanctuary AI', 'Fourier Intelligence', 'UBTECH',
    // Applications
    'logistics', 'manufacturing', 'healthcare', 'service', 'home', 'industrial',
    'warehouse', 'factory', 'retail', 'hospitality',
    // Specs
    'DoF', 'degrees of freedom', 'payload', 'battery', 'runtime', 'speed', 'torque',
    'TOPS', 'compute', 'SoC',
    // Market/Business
    'commercialization', 'mass production', 'pilot', 'PoC', 'demo', 'investment',
    'funding', 'IPO', 'valuation',
  ],
};

// 카테고리 매핑
const KEYWORD_CATEGORIES: Record<string, string[]> = {
  technology: ['AI', '인공지능', 'machine learning', '머신러닝', 'deep learning', '딥러닝', 
    'reinforcement learning', '강화학습', 'computer vision', '컴퓨터 비전', 'NLP', 'LLM',
    'transformer', 'neural network', 'foundation model'],
  component: ['actuator', '액추에이터', 'motor', '모터', 'sensor', '센서', 'gearbox', '감속기',
    'harmonic drive', '하모닉 드라이브', 'IMU', 'LiDAR', '라이다', 'camera', '카메라',
    'encoder', 'torque sensor', '토크센서'],
  company: ['Tesla', '테슬라', 'Figure', '피규어', 'Boston Dynamics', '보스턴 다이나믹스',
    'Unitree', '유니트리', 'Agility', 'Apptronik', 'Sanctuary AI', '1X', 'UBTECH'],
  application: ['logistics', '물류', 'manufacturing', '제조', 'healthcare', '의료',
    'warehouse', '창고', 'factory', '공장', 'retail', 'hospitality'],
  business: ['commercialization', '상용화', 'investment', '투자', 'funding', '펀딩',
    'IPO', 'pilot', '파일럿', 'PoC', 'demo', '시연'],
};

export class KeywordExtractionService {
  /**
   * 텍스트에서 키워드 추출
   */
  extractKeywords(text: string, language: 'ko' | 'en' = 'ko'): ExtractedKeyword[] {
    const normalizedText = text.toLowerCase();
    const keywordList = ROBOT_KEYWORDS[language];
    const extracted: ExtractedKeyword[] = [];

    for (const keyword of keywordList) {
      const keywordLower = keyword.toLowerCase();
      const regex = new RegExp(this.escapeRegex(keywordLower), 'gi');
      const matches = normalizedText.match(regex);
      
      if (matches && matches.length > 0) {
        const frequency = matches.length;
        const relevance = this.calculateRelevance(frequency, text.length, keyword);
        const category = this.getKeywordCategory(keyword);
        
        extracted.push({
          term: keyword,
          language,
          relevance,
          frequency,
          category,
        });
      }
    }

    // 관련성 점수로 정렬
    return extracted.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * 다국어 키워드 추출 (한국어 + 영어)
   */
  extractMultilingualKeywords(text: string): ExtractedKeyword[] {
    const koKeywords = this.extractKeywords(text, 'ko');
    const enKeywords = this.extractKeywords(text, 'en');
    
    // 중복 제거 및 병합
    const merged = new Map<string, ExtractedKeyword>();
    
    for (const kw of [...koKeywords, ...enKeywords]) {
      const key = kw.term.toLowerCase();
      if (!merged.has(key) || (merged.get(key)?.relevance ?? 0) < kw.relevance) {
        merged.set(key, kw);
      }
    }

    return Array.from(merged.values()).sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * 관련성 점수 계산
   */
  private calculateRelevance(frequency: number, textLength: number, keyword: string): number {
    // TF (Term Frequency) 기반 점수
    const tf = frequency / (textLength / 100); // 100자당 빈도
    
    // 키워드 중요도 가중치
    const importanceWeight = this.getKeywordImportance(keyword);
    
    // 최종 점수 (0-1 범위로 정규화)
    const rawScore = tf * importanceWeight;
    return Math.min(1, Math.max(0, rawScore));
  }

  /**
   * 키워드 중요도 가중치
   */
  private getKeywordImportance(keyword: string): number {
    const keywordLower = keyword.toLowerCase();
    
    // 회사명은 높은 가중치
    const companyKeywords = KEYWORD_CATEGORIES.company;
    if (companyKeywords && companyKeywords.some(k => k.toLowerCase() === keywordLower)) {
      return 1.5;
    }
    
    // 기술 키워드는 중간 가중치
    const techKeywords = KEYWORD_CATEGORIES.technology;
    if (techKeywords && techKeywords.some(k => k.toLowerCase() === keywordLower)) {
      return 1.2;
    }
    
    // 부품 키워드
    const componentKeywords = KEYWORD_CATEGORIES.component;
    if (componentKeywords && componentKeywords.some(k => k.toLowerCase() === keywordLower)) {
      return 1.1;
    }
    
    return 1.0;
  }

  /**
   * 키워드 카테고리 반환
   */
  private getKeywordCategory(keyword: string): string | undefined {
    const keywordLower = keyword.toLowerCase();
    
    for (const [category, keywords] of Object.entries(KEYWORD_CATEGORIES)) {
      if (keywords.some(k => k.toLowerCase() === keywordLower)) {
        return category;
      }
    }
    
    return undefined;
  }

  /**
   * 정규식 특수문자 이스케이프
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 추출된 키워드를 DB에 저장
   */
  async saveExtractedKeywords(
    articleId: string,
    extractedKeywords: ExtractedKeyword[]
  ): Promise<void> {
    for (const kw of extractedKeywords) {
      // 키워드 찾기 또는 생성
      let [keyword] = await db
        .select()
        .from(keywords)
        .where(and(
          eq(keywords.term, kw.term),
          eq(keywords.language, kw.language)
        ))
        .limit(1);

      if (!keyword) {
        const insertResult = await db
          .insert(keywords)
          .values({
            term: kw.term,
            language: kw.language,
            category: kw.category,
          })
          .returning();
        keyword = insertResult[0];
      }

      if (keyword) {
        // 기사-키워드 연결
        await db
          .insert(articleKeywords)
          .values({
            articleId,
            keywordId: keyword.id,
            frequency: kw.frequency,
            tfidfScore: String(kw.relevance),
          })
          .onConflictDoNothing();
      }
    }
  }

  /**
   * 기사의 키워드 조회
   */
  async getArticleKeywords(articleId: string): Promise<ExtractedKeyword[]> {
    const result = await db
      .select({
        term: keywords.term,
        language: keywords.language,
        category: keywords.category,
        frequency: articleKeywords.frequency,
        relevance: articleKeywords.tfidfScore,
      })
      .from(articleKeywords)
      .innerJoin(keywords, eq(articleKeywords.keywordId, keywords.id))
      .where(eq(articleKeywords.articleId, articleId));

    return result.map(r => ({
      term: r.term,
      language: (r.language || 'ko') as 'ko' | 'en',
      relevance: Number(r.relevance) || 0,
      frequency: r.frequency || 1,
      category: r.category || undefined,
    }));
  }

  /**
   * 전체 키워드 빈도 통계
   */
  async getKeywordFrequencyStats(options: {
    language?: string;
    category?: string;
    limit?: number;
  } = {}): Promise<{ term: string; totalFrequency: number; articleCount: number }[]> {
    const { language, category, limit = 50 } = options;

    const conditions = [];
    if (language) conditions.push(eq(keywords.language, language));
    if (category) conditions.push(eq(keywords.category, category));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db
      .select({
        term: keywords.term,
        totalFrequency: sql<number>`sum(${articleKeywords.frequency})::int`,
        articleCount: sql<number>`count(distinct ${articleKeywords.articleId})::int`,
      })
      .from(keywords)
      .innerJoin(articleKeywords, eq(keywords.id, articleKeywords.keywordId))
      .where(whereClause)
      .groupBy(keywords.term)
      .orderBy(desc(sql`sum(${articleKeywords.frequency})`))
      .limit(limit);

    return result.map(r => ({
      term: r.term,
      totalFrequency: r.totalFrequency ?? 0,
      articleCount: r.articleCount ?? 0,
    }));
  }
}

export const keywordExtractionService = new KeywordExtractionService();
