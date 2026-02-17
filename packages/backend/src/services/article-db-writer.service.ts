/**
 * ArticleToDBWriterService - 기사 및 관계 데이터 트랜잭션 저장
 * 
 * content_hash 중복 체크, 단일 트랜잭션 처리
 * 기사 메타데이터 + 관계 테이블(article_companies, article_robot_tags, article_components, article_applications) 저장
 */

import { db, articles, articleCompanies, articleComponents, articleApplications, articleRobotTags, articleKeywords, keywords } from '../db/index.js';
import { eq } from 'drizzle-orm';

export interface ArticleSaveRequest {
  title: string;
  publishedAt?: Date;
  url?: string;
  source?: string;
  summary: string;
  contentHash: string;
  language?: string;
  linkedCompanyIds: string[];
  linkedRobotIds: string[];
  linkedComponentIds: string[];
  linkedApplicationIds: string[];
  keywords: { term: string; relevance: number }[];
}

export interface SaveResult {
  articleId: string;
  linkedEntities: {
    companies: number;
    robots: number;
    components: number;
    applications: number;
    keywords: number;
  };
  isNew: boolean;
}

export class ArticleToDBWriterService {
  /**
   * 기사 저장 (중복 체크 → 트랜잭션 저장)
   */
  async save(request: ArticleSaveRequest, submittedBy?: string): Promise<SaveResult> {
    // 중복 체크
    const isDuplicate = await this.checkDuplicate(request.contentHash);
    if (isDuplicate) {
      return {
        articleId: '',
        linkedEntities: { companies: 0, robots: 0, components: 0, applications: 0, keywords: 0 },
        isNew: false,
      };
    }

    return this.saveInTransaction(request, submittedBy);
  }

  /**
   * content_hash 중복 체크
   */
  async checkDuplicate(contentHash: string): Promise<boolean> {
    const [existing] = await db
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.contentHash, contentHash))
      .limit(1);
    return !!existing;
  }

  /**
   * 트랜잭션으로 기사 + 관계 테이블 저장
   */
  private async saveInTransaction(request: ArticleSaveRequest, submittedBy?: string): Promise<SaveResult> {
    const result = await (db as any).transaction(async (tx: any) => {
      // 1. 기사 레코드 저장
      const [article] = await tx.insert(articles).values({
        title: request.title,
        source: request.source || 'manual',
        url: request.url || '',
        publishedAt: request.publishedAt || null,
        summary: request.summary,
        contentHash: request.contentHash,
        language: request.language || 'ko',
        submittedBy: submittedBy || null,
      }).returning({ id: articles.id });

      const articleId = article.id;

      // 2. 회사 관계 저장
      for (const companyId of request.linkedCompanyIds) {
        await tx.insert(articleCompanies).values({ articleId, companyId });
      }

      // 3. 로봇 관계 저장
      for (const robotId of request.linkedRobotIds) {
        await tx.insert(articleRobotTags).values({ articleId, robotId });
      }

      // 4. 부품 관계 저장
      for (const componentId of request.linkedComponentIds) {
        await tx.insert(articleComponents).values({ articleId, componentId });
      }

      // 5. 적용 사례 관계 저장
      for (const applicationId of request.linkedApplicationIds) {
        await tx.insert(articleApplications).values({ articleId, applicationId });
      }

      // 6. 키워드 관계 저장
      let keywordCount = 0;
      for (const kw of request.keywords) {
        // 키워드 upsert (없으면 생성)
        let [existing] = await tx
          .select({ id: keywords.id })
          .from(keywords)
          .where(eq(keywords.term, kw.term))
          .limit(1);

        if (!existing) {
          [existing] = await tx.insert(keywords).values({
            term: kw.term,
            language: request.language || 'ko',
          }).returning({ id: keywords.id });
        }

        if (existing) {
          await tx.insert(articleKeywords).values({
            articleId,
            keywordId: existing.id,
            tfidfScore: String(kw.relevance),
          });
          keywordCount++;
        }
      }

      return {
        articleId,
        linkedEntities: {
          companies: request.linkedCompanyIds.length,
          robots: request.linkedRobotIds.length,
          components: request.linkedComponentIds.length,
          applications: request.linkedApplicationIds.length,
          keywords: keywordCount,
        },
        isNew: true,
      };
    });

    return result;
  }
}

export const articleDBWriterService = new ArticleToDBWriterService();
