import { createHash } from 'crypto';
import { eq, ilike, sql, desc, and, inArray } from 'drizzle-orm';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
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
import { entityLinkerService, type LinkCandidate } from './entity-linker.service.js';

// AI 클라이언트 초기화
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

export type AIModel = 'gpt-4o' | 'claude';

export interface ArticleAnalysisResult {
  summary: string;
  keyPoints: string[];
  mentionedCompanies: EntityMatch[];
  mentionedRobots: EntityMatch[];
  extractedTechnologies: string[];
  marketInsights: string[];
  keywords: { term: string; relevance: number }[];
  entityLinks: {
    companies: LinkCandidate[];
    robots: LinkCandidate[];
  };
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
   * Analyze article content using AI (GPT-4o or Claude)
   * Uses EntityLinkerService pg_trgm matching for company/robot entity linking
   */
  async analyzeArticle(content: string, language: string = 'ko', model: AIModel = 'gpt-4o'): Promise<ArticleAnalysisResult> {
    // Extract potential entity names from content for pg_trgm matching
    const potentialNames = this.extractPotentialEntityNames(content);

    // Use EntityLinkerService pg_trgm fuzzy matching for companies
    const companyLinkCandidates: LinkCandidate[] = [];
    const mentionedCompanies: EntityMatch[] = [];
    const seenCompanyIds = new Set<string>();

    for (const name of potentialNames) {
      const candidates = await entityLinkerService.fuzzyMatch(name, 'company');
      for (const candidate of candidates) {
        if (!seenCompanyIds.has(candidate.entityId)) {
          seenCompanyIds.add(candidate.entityId);
          companyLinkCandidates.push(candidate);
          mentionedCompanies.push({
            mentionedName: candidate.matchedVia === 'alias' && candidate.aliasName
              ? candidate.aliasName
              : name,
            matchedEntity: { id: candidate.entityId, name: candidate.entityName },
            confidence: candidate.similarityScore,
          });
        }
      }
    }

    // Use EntityLinkerService pg_trgm fuzzy matching for robots
    const robotLinkCandidates: LinkCandidate[] = [];
    const mentionedRobots: EntityMatch[] = [];
    const seenRobotIds = new Set<string>();

    for (const name of potentialNames) {
      const candidates = await entityLinkerService.fuzzyMatch(name, 'product');
      for (const candidate of candidates) {
        if (!seenRobotIds.has(candidate.entityId)) {
          seenRobotIds.add(candidate.entityId);
          robotLinkCandidates.push(candidate);
          mentionedRobots.push({
            mentionedName: candidate.matchedVia === 'alias' && candidate.aliasName
              ? candidate.aliasName
              : name,
            matchedEntity: { id: candidate.entityId, name: candidate.entityName },
            confidence: candidate.similarityScore,
          });
        }
      }
    }

    // Extract keywords (simple implementation)
    const extractedKeywords = this.extractKeywords(content, language);

    // AI 분석 수행
    const aiAnalysis = await this.performAIAnalysis(content, language, model);

    return {
      summary: aiAnalysis.summary,
      keyPoints: aiAnalysis.keyPoints,
      mentionedCompanies,
      mentionedRobots,
      extractedTechnologies: aiAnalysis.technologies,
      marketInsights: aiAnalysis.insights,
      keywords: extractedKeywords,
      entityLinks: {
        companies: companyLinkCandidates,
        robots: robotLinkCandidates,
      },
    };
  }

  /**
   * Extract potential entity names from article content for pg_trgm matching.
   * Uses a combination of capitalized phrases, known patterns, and word n-grams.
   */
  private extractPotentialEntityNames(content: string): string[] {
    const names = new Set<string>();

    // 1) Extract capitalized multi-word phrases (e.g., "Boston Dynamics", "Tesla Optimus")
    const capitalizedPattern = /\b([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)+)\b/g;
    let match;
    while ((match = capitalizedPattern.exec(content)) !== null) {
      const phrase = match[1]!.trim();
      if (phrase.length >= 3 && phrase.length <= 100) {
        names.add(phrase);
      }
    }

    // 2) Extract single capitalized words (potential company/robot names)
    const singleCapPattern = /\b([A-Z][a-zA-Z]{2,})\b/g;
    while ((match = singleCapPattern.exec(content)) !== null) {
      const word = match[1]!.trim();
      // Skip common English words
      const commonWords = new Set([
        'The', 'This', 'That', 'These', 'Those', 'What', 'When', 'Where', 'Which',
        'Who', 'How', 'And', 'But', 'For', 'Not', 'With', 'From', 'Into', 'About',
        'After', 'Before', 'Between', 'During', 'Through', 'Under', 'Over',
      ]);
      if (!commonWords.has(word)) {
        names.add(word);
      }
    }

    // 3) Extract Korean entity-like phrases (2~6 characters, typically company/product names)
    const koreanPattern = /([가-힣]{2,6}(?:\s[가-힣]{2,6})*)/g;
    while ((match = koreanPattern.exec(content)) !== null) {
      const phrase = match[1]!.trim();
      // Skip very common Korean words
      const commonKorean = new Set([
        '그리고', '하지만', '그래서', '때문에', '이것은', '그것은', '있다', '없다',
        '한다', '된다', '이다', '아니다', '것이다', '대한', '위한', '통해',
      ]);
      if (phrase.length >= 2 && !commonKorean.has(phrase)) {
        names.add(phrase);
      }
    }

    return Array.from(names);
  }

  /**
   * Perform AI analysis using selected model
   */
  private async performAIAnalysis(
    content: string, 
    language: string, 
    model: AIModel
  ): Promise<{ summary: string; keyPoints: string[]; technologies: string[]; insights: string[] }> {
    const systemPrompt = `You are a robotics industry analyst. Analyze the given article and extract:
1. A concise summary (2-3 sentences)
2. Key points (3-5 bullet points)
3. Technologies mentioned
4. Market insights

Respond in ${language === 'ko' ? 'Korean' : 'English'}.
Format your response as JSON:
{
  "summary": "...",
  "keyPoints": ["...", "..."],
  "technologies": ["...", "..."],
  "insights": ["...", "..."]
}`;

    const userPrompt = `Analyze this article:\n\n${content.substring(0, 4000)}`;

    try {
      if (model === 'claude' && anthropic) {
        return await this.analyzeWithClaude(systemPrompt, userPrompt);
      } else if (openai) {
        return await this.analyzeWithGPT(systemPrompt, userPrompt);
      } else {
        // Fallback: no AI available
        console.log('[AI] No AI API configured, using fallback');
        return this.getFallbackAnalysis(content);
      }
    } catch (error) {
      console.error('[AI] Analysis failed:', error);
      return this.getFallbackAnalysis(content);
    }
  }

  /**
   * Analyze with GPT-4o
   */
  private async analyzeWithGPT(systemPrompt: string, userPrompt: string) {
    if (!openai) throw new Error('OpenAI not configured');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1000,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const result = response.choices[0]?.message?.content || '{}';
    return this.parseAIResponse(result);
  }

  /**
   * Analyze with Claude
   */
  private async analyzeWithClaude(systemPrompt: string, userPrompt: string) {
    if (!anthropic) throw new Error('Anthropic not configured');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
      ],
    });

    const textBlock = response.content.find(block => block.type === 'text');
    const result = textBlock?.type === 'text' ? textBlock.text : '{}';
    return this.parseAIResponse(result);
  }

  /**
   * Parse AI response JSON
   */
  private parseAIResponse(result: string): { summary: string; keyPoints: string[]; technologies: string[]; insights: string[] } {
    try {
      // JSON 블록 추출 (```json ... ``` 형식 처리)
      let jsonStr = result;
      const jsonMatch = result.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        jsonStr = jsonMatch[1];
      }
      
      const parsed = JSON.parse(jsonStr);
      return {
        summary: parsed.summary || '',
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
        technologies: Array.isArray(parsed.technologies) ? parsed.technologies : [],
        insights: Array.isArray(parsed.insights) ? parsed.insights : [],
      };
    } catch {
      return { summary: '', keyPoints: [], technologies: [], insights: [] };
    }
  }

  /**
   * Fallback analysis when AI is not available
   */
  private getFallbackAnalysis(content: string) {
    return {
      summary: content.length > 500 ? content.substring(0, 500) + '...' : content,
      keyPoints: [],
      technologies: [],
      insights: [],
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
   * Submit and save article metadata only (no original content stored)
   */
  async submitArticle(data: SubmitArticleDto, submittedBy?: string) {
    // Check for duplicate using title hash (since we don't store content)
    const titleHash = this.generateContentHash(data.title);
    
    const [existing] = await db
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.contentHash, titleHash))
      .limit(1);

    if (existing) {
      return {
        success: false,
        isDuplicate: true,
        existingId: existing.id,
        message: '동일한 제목의 기사가 이미 존재합니다.',
      };
    }

    // Create article with metadata only (no content, url, source stored)
    const insertResult = await db
      .insert(articles)
      .values({
        title: data.title,
        source: '', // Not storing source
        url: '', // Not storing URL
        content: '', // Not storing original content
        summary: data.summary,
        language: data.language || 'ko',
        contentHash: titleHash,
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

    return {
      success: true,
      isDuplicate: false,
      article,
      message: '메타데이터가 성공적으로 저장되었습니다.',
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
