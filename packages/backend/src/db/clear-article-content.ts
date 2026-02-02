import { db, articles } from './index.js';
import { sql } from 'drizzle-orm';

/**
 * 기존 기사의 content와 summary 데이터 삭제
 * 저작권 보호를 위해 본문 및 AI 요약 제거
 */
async function clearArticleContent() {
  console.log('Clearing article content and summary for copyright protection...');

  // content와 summary를 NULL로 설정
  const result = await db
    .update(articles)
    .set({
      content: null,
      summary: null,
    })
    .returning({ id: articles.id });

  console.log(`Cleared content/summary from ${result.length} articles`);

  // 통계 확인
  const stats = await db
    .select({
      total: sql<number>`count(*)`,
      withContent: sql<number>`count(content)`,
      withSummary: sql<number>`count(summary)`,
    })
    .from(articles);

  console.log('\n=== Article Statistics ===');
  console.log(`Total articles: ${stats[0]?.total}`);
  console.log(`With content: ${stats[0]?.withContent}`);
  console.log(`With summary: ${stats[0]?.withSummary}`);

  console.log('\nContent clearing completed!');
  process.exit(0);
}

clearArticleContent().catch((err) => {
  console.error('Failed to clear content:', err);
  process.exit(1);
});
