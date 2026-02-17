import { db } from './index.js';
import { keywords, keywordStats } from './schema.js';

/**
 * 키워드 시드 데이터
 * - 휴머노이드 로봇 관련 키워드 추가
 * - 월별 통계 데이터 생성
 * - 제품-키워드 연결
 */
async function seedKeywords() {
  console.log('Seeding keyword data...');

  // 1. 기존 키워드 통계 삭제 후 새로 추가
  await db.delete(keywordStats);
  await db.delete(keywords);

  // 2. 키워드 목록 (휴머노이드 로봇 산업 관련)
  const keywordData = [
    // 기술 키워드
    { term: 'humanoid robots', language: 'en', category: 'technology' },
    { term: 'shared AI brain', language: 'en', category: 'technology' },
    { term: 'robot fleet control', language: 'en', category: 'technology' },
    { term: 'robot foundation model', language: 'en', category: 'technology' },
    { term: 'physical AI', language: 'en', category: 'technology' },
    { term: 'robot cs SoC', language: 'en', category: 'technology' },
    { term: 'safety-grade SoC', language: 'en', category: 'technology' },
    { term: 'motor control MCU', language: 'en', category: 'technology' },
    { term: 'GaN actuation', language: 'en', category: 'technology' },
    { term: 'edge AI robotics', language: 'en', category: 'technology' },
    { term: 'bipedal locomotion', language: 'en', category: 'technology' },
    { term: 'dexterous manipulation', language: 'en', category: 'technology' },
    { term: 'force feedback', language: 'en', category: 'technology' },
    { term: 'whole-body control', language: 'en', category: 'technology' },
    { term: 'sim-to-real transfer', language: 'en', category: 'technology' },
    // 시장 키워드
    { term: 'warehouse automation', language: 'en', category: 'market' },
    { term: 'manufacturing robots', language: 'en', category: 'market' },
    { term: 'service robots', language: 'en', category: 'market' },
    { term: 'home robots', language: 'en', category: 'market' },
    { term: 'robot as a service', language: 'en', category: 'market' },
    // 한국어 키워드
    { term: '휴머노이드 로봇', language: 'ko', category: 'technology' },
    { term: '로봇 자율주행', language: 'ko', category: 'technology' },
    { term: '물류 자동화', language: 'ko', category: 'market' },
    { term: '협동 로봇', language: 'ko', category: 'market' },
    { term: '서비스 로봇', language: 'ko', category: 'market' },
  ];

  const insertedKeywords = await db.insert(keywords).values(keywordData).returning();
  console.log(`Keywords seeded: ${insertedKeywords.length}`);

  // 3. 월별 통계 데이터 생성 (최근 18개월)
  const now = new Date();
  const statsData: {
    keywordId: string;
    periodType: string;
    periodStart: string;
    periodEnd: string;
    count: number;
    delta: number;
    deltaPercent: string;
  }[] = [];

  for (const kw of insertedKeywords) {
    // 키워드별 기본 인기도 설정 (랜덤 + 카테고리 가중치)
    const basePopularity = Math.floor(Math.random() * 30) + 5;
    const categoryMultiplier = kw.category === 'technology' ? 1.5 : 1.0;
    
    // 특정 키워드에 트렌드 부여
    let trendMultiplier = 1.0;
    if (kw.term.includes('AI') || kw.term.includes('foundation')) {
      trendMultiplier = 1.8; // AI 관련 급상승
    } else if (kw.term.includes('humanoid')) {
      trendMultiplier = 1.5; // 휴머노이드 상승
    } else if (kw.term.includes('MCU') || kw.term.includes('motor')) {
      trendMultiplier = 0.7; // 하락 트렌드
    }

    for (let i = 17; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      // 시간에 따른 트렌드 적용 (최근일수록 트렌드 효과 강화)
      const timeWeight = 1 + ((17 - i) / 17) * (trendMultiplier - 1);
      const seasonalVariation = 1 + Math.sin((monthStart.getMonth() / 12) * Math.PI * 2) * 0.2;
      
      const count = Math.max(1, Math.round(
        basePopularity * categoryMultiplier * timeWeight * seasonalVariation + 
        (Math.random() - 0.5) * 10
      ));

      // 이전 달 대비 변화량 계산
      const prevCount = statsData.length > 0 && statsData[statsData.length - 1]?.keywordId === kw.id
        ? statsData[statsData.length - 1]?.count || count
        : count;
      const delta = count - prevCount;
      const deltaPercent = prevCount > 0 ? ((delta / prevCount) * 100).toFixed(2) : '0';

      statsData.push({
        keywordId: kw.id,
        periodType: 'month',
        periodStart: monthStart.toISOString().split('T')[0] || '',
        periodEnd: monthEnd.toISOString().split('T')[0] || '',
        count,
        delta,
        deltaPercent,
      });
    }
  }

  // 배치로 삽입
  const batchSize = 100;
  for (let i = 0; i < statsData.length; i += batchSize) {
    const batch = statsData.slice(i, i + batchSize);
    await db.insert(keywordStats).values(batch);
  }
  console.log(`Keyword stats seeded: ${statsData.length}`);

  console.log('\n✅ Keyword seed completed successfully!');
}

seedKeywords()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
