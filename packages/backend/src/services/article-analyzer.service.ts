import { createHash } from 'crypto';
import { eq, ilike, sql, desc, and, inArray } from 'drizzle-orm';
import {
  db,
  articles,
  articleRobotTags,
  humanoidRobots,
  companies,
  keywords,
  articleKeywords,
  type ExtractedMetadata,
} from '../db/index.js';

export interface ArticleAnalysisResult {
  summary: string;
  keyPoints: string[];
  mentionedCompanies: EntityMatch[];
  mentionedRobots: EntityMatch[];
  extractedTechnologies: string[];
  marketInsights: string[];
  keywords: { term: string; relevance: number }[];
}

export interface EntityMatch {
  mentionedName: string;
  matchedEntity?: { id: string; name: string };
  confidence: number;
}

export interface SubmitArticleDto {
  title: string;
  source: string;
  url?: string;
  content: string;
  language?: string;
  confirmedCompanyIds?: string[];
  confirmedRobotIds?: string[];
  summary?: string;
  extractedMetadata?: ExtractedMetadata;
}

export interface ArticleFilters {
  companyId?: string;
  robotId?: string;
  language?: string;
  category?: string;
  search?: string;
}

export class ArticleAnalyzerService {
  /**
   * Generate content hash for duplicate detection
   */
  generateContentHash(content: string): string {
    return createHash('sha256').update(content.trim().toLowerCase()).digest('hex');
  }

  /**
   * Check if article with same content exists
   */
  async checkDuplicate(content: string): Promise<{ isDuplicate: boolean; existingId?: string }> {
    const hash = this.generateContentHash(content);
    
    const [existing] = await db
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.contentHash, hash))
      .limit(1);

    return {
      isDuplicate: !!existing,
      existingId: existing?.id,
    };
  }

  /**
   * Analyze article content (placeholder for AI integration)
   * This will be connected to Claude API later
   */
  async analyzeArticle(content: string, language: string = 'ko'): Promise<ArticleAnalysisResult> {
    // Find mentioned companies
    const allCompanies = await db.select({ id: companies.id, name: companies.name }).from(companies);
    const mentionedCompanies: EntityMatch[] = [];
    
    for (const company of allCompanies) {
      if (content.toLowerCase().includes(company.name.toLowerCase())) {
        mentionedCompanies.push({
          mentionedName: company.name,
          matchedEntity: { id: company.id, name: company.name },
          confidence: 0.9,
        });
      }
    }

    // Find mentioned robots
    const allRobots = await db.select({ id: humanoidRobots.id, name: humanoidRobots.name }).from(humanoidRobots);
    const mentionedRobots: EntityMatch[] = [];
    
    for (const robot of allRobots) {
      if (content.toLowerCase().includes(robot.name.toLowerCase())) {
        mentionedRobots.push({
          mentionedName: robot.name,
          matchedEntity: { id: robot.id, name: robot.name },
          confidence: 0.9,
        });
      }
    }

    // Extract keywords (simple implementation - will be enhanced with NLP)
    const extractedKeywords = this.extractKeywords(content, language);

    // Placeholder summary (will be replaced with AI)
    const summary = content.length > 500 
      ? content.substring(0, 500) + '...' 
      : content;

    return {
      summary,
      keyPoints: [],
      mentionedCompanies,
      mentionedRobots,
      extractedTechnologies: [],
      marketInsights: [],
      keywords: extractedKeywords,
    };
  }

  /**
   * Simple keyword extraction (placeholder for NLP)
   */
  private extractKeywords(content: string, _language: string): { term: string; relevance: number }[] {
    const robotKeywords = [
      'humanoid', 'robot', 'actuator', 'sensor', 'AI', 'bipedal', 'manipulation',
      '휴머노이드', '로봇', '액추에이터', '센서', '인공지능', '이족보행', '매니퓰레이션',
      'Tesla', 'Optimus', 'Figure', 'Boston Dynamics', 'Atlas', 'Agility', 'Digit',
      '테슬라', '옵티머스', '피규어', '보스턴 다이나믹스', '아틀라스',
    ];

    const found: { term: string; relevance: number }[] = [];
    const contentLower = content.toLowerCase();

    for (const keyword of robotKeywords) {
      if (contentLower.includes(keyword.toLowerCase())) {
        const count = (contentLower.match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
        found.push({
          term: keyword,
          relevance: Math.min(1, count * 0.1),
        });
      }
    }

    return found.sort((a, b) => b.relevance - a.relevance).slice(0, 10);
  }

  /**
   * Submit and save article
   */
  async submitArticle(data: SubmitArticleDto, submittedBy?: string) {
    // Check for duplicate
    const { isDuplicate, existingId } = await this.checkDuplicate(data.content);
    
    if (isDuplicate) {
      return {
        success: false,
        isDuplicate: true,
        existingId,
        message: '동일한 내용의 기사가 이미 존재합니다.',
      };
    }

    const contentHash = this.generateContentHash(data.content);

    // Create article
    const insertResult = await db
      .insert(articles)
      .values({
        title: data.title,
        source: data.source,
        url: data.url || '',
        content: data.content,
        summary: data.summary,
        language: data.language || 'ko',
        contentHash,
        submittedBy,
        extractedMetadata: data.extractedMetadata,
        companyId: data.confirmedCompanyIds?.[0], // Primary company
      })
      .returning();

    const article = insertResult[0];
    if (!article) {
      return {
        success: false,
        isDuplicate: false,
        message: '기사 저장에 실패했습니다.',
      };
    }

    // Create robot tags
    if (data.confirmedRobotIds && data.confirmedRobotIds.length > 0) {
      await db.insert(articleRobotTags).values(
        data.confirmedRobotIds.map(robotId => ({
          articleId: article.id,
          robotId,
        }))
      );
    }

    // Extract and save keywords
    const extractedKeywords = this.extractKeywords(data.content, data.language || 'ko');
    for (const kw of extractedKeywords) {
      // Find or create keyword
      const existingKeywords = await db
        .select()
        .from(keywords)
        .where(and(eq(keywords.term, kw.term), eq(keywords.language, data.language || 'ko')))
        .limit(1);

      let keywordRecord = existingKeywords[0];

      if (!keywordRecord) {
        const newKeywords = await db
          .insert(keywords)
          .values({ term: kw.term, language: data.language || 'ko' })
          .returning();
        keywordRecord = newKeywords[0];
      }

      // Link keyword to article
      if (keywordRecord) {
        await db.insert(articleKeywords).values({
          articleId: article.id,
          keywordId: keywordRecord.id,
          frequency: 1,
          tfidfScore: String(kw.relevance),
        }).onConflictDoNothing();
      }
    }

    return {
      success: true,
      isDuplicate: false,
      article,
      message: '기사가 성공적으로 저장되었습니다.',
    };
  }

  /**
   * Get article by ID
   */
  async getArticle(id: string) {
    const [article] = await db
      .select()
      .from(articles)
      .where(eq(articles.id, id))
      .limit(1);

    if (!article) return null;

    // Get tagged robots
    const robotTags = await db
      .select({
        robot: humanoidRobots,
      })
      .from(articleRobotTags)
      .innerJoin(humanoidRobots, eq(articleRobotTags.robotId, humanoidRobots.id))
      .where(eq(articleRobotTags.articleId, id));

    // Get company
    let company = null;
    if (article.companyId) {
      [company] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, article.companyId))
        .limit(1);
    }

    // Get keywords
    const articleKws = await db
      .select({
        keyword: keywords,
        frequency: articleKeywords.frequency,
        relevance: articleKeywords.tfidfScore,
      })
      .from(articleKeywords)
      .innerJoin(keywords, eq(articleKeywords.keywordId, keywords.id))
      .where(eq(articleKeywords.articleId, id));

    return {
      article,
      company,
      taggedRobots: robotTags.map(t => t.robot),
      keywords: articleKws,
    };
  }

  /**
   * Update article
   */
  async updateArticle(id: string, data: Partial<SubmitArticleDto>) {
    const updateData: Record<string, unknown> = {};
    
    if (data.title) updateData.title = data.title;
    if (data.source) updateData.source = data.source;
    if (data.url) updateData.url = data.url;
    if (data.summary) updateData.summary = data.summary;
    if (data.extractedMetadata) updateData.extractedMetadata = data.extractedMetadata;

    const [article] = await db
      .update(articles)
      .set(updateData)
      .where(eq(articles.id, id))
      .returning();

    // Update robot tags if provided
    if (data.confirmedRobotIds) {
      // Remove existing tags
      await db.delete(articleRobotTags).where(eq(articleRobotTags.articleId, id));
      
      // Add new tags
      if (data.confirmedRobotIds.length > 0) {
        await db.insert(articleRobotTags).values(
          data.confirmedRobotIds.map(robotId => ({
            articleId: id,
            robotId,
          }))
        );
      }
    }

    return article;
  }

  /**
   * Delete article
   */
  async deleteArticle(id: string) {
    await db.delete(articles).where(eq(articles.id, id));
  }

  /**
   * List articles with filters
   */
  async listArticles(
    filters: ArticleFilters = {},
    pagination = { page: 1, limit: 20 }
  ) {
    const conditions = [];

    if (filters.companyId) {
      conditions.push(eq(articles.companyId, filters.companyId));
    }
    if (filters.language) {
      conditions.push(eq(articles.language, filters.language));
    }
    if (filters.category) {
      conditions.push(eq(articles.category, filters.category));
    }
    if (filters.search) {
      conditions.push(ilike(articles.title, `%${filters.search}%`));
    }

    // Handle robot filter separately (requires join)
    let robotArticleIds: string[] | null = null;
    if (filters.robotId) {
      const robotTags = await db
        .select({ articleId: articleRobotTags.articleId })
        .from(articleRobotTags)
        .where(eq(articleRobotTags.robotId, filters.robotId));
      robotArticleIds = robotTags.map(t => t.articleId);
      
      if (robotArticleIds.length === 0) {
        return {
          data: [],
          pagination: { page: pagination.page, limit: pagination.limit, total: 0, totalPages: 0 },
        };
      }
      conditions.push(inArray(articles.id, robotArticleIds));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(articles)
      .where(whereClause);
    const count = countResult[0]?.count ?? 0;

    const offset = (pagination.page - 1) * pagination.limit;
    const data = await db
      .select({
        article: articles,
        company: companies,
      })
      .from(articles)
      .leftJoin(companies, eq(articles.companyId, companies.id))
      .where(whereClause)
      .orderBy(desc(articles.createdAt))
      .limit(pagination.limit)
      .offset(offset);

    return {
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: count,
        totalPages: Math.ceil(count / pagination.limit),
      },
    };
  }

  /**
   * Get articles by robot
   */
  async getArticlesByRobot(robotId: string, limit = 10) {
    const robotTags = await db
      .select({ articleId: articleRobotTags.articleId })
      .from(articleRobotTags)
      .where(eq(articleRobotTags.robotId, robotId));

    if (robotTags.length === 0) return [];

    const articleList = await db
      .select()
      .from(articles)
      .where(inArray(articles.id, robotTags.map(t => t.articleId)))
      .orderBy(desc(articles.createdAt))
      .limit(limit);

    return articleList;
  }

  /**
   * Get articles by company
   */
  async getArticlesByCompany(companyId: string, limit = 10) {
    const articleList = await db
      .select()
      .from(articles)
      .where(eq(articles.companyId, companyId))
      .orderBy(desc(articles.createdAt))
      .limit(limit);

    return articleList;
  }
}

export const articleAnalyzerService = new ArticleAnalyzerService();
