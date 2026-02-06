import OpenAI from 'openai';
import { db, companies, products, articles, keywords } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { createHash } from 'crypto';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface AnalyzedData {
  companies: Array<{
    name: string;
    country: string;
    category: string;
    description?: string;
  }>;
  products: Array<{
    name: string;
    companyName: string;
    type: string;
    releaseDate?: string;
    description?: string;
  }>;
  articles: Array<{
    title: string;
    source: string;
    url?: string;
    summary: string;
    category: string;
    productType: string;
  }>;
  keywords: string[];
  summary: string;
}

export interface SaveResult {
  companiesSaved: number;
  productsSaved: number;
  articlesSaved: number;
  keywordsSaved: number;
  errors: string[];
}

/**
 * 텍스트를 AI로 분석하여 구조화된 데이터 추출
 */
export async function analyzeText(text: string): Promise<AnalyzedData> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const systemPrompt = `You are a robotics industry analyst. Analyze the given text and extract ALL structured data thoroughly.

IMPORTANT: Extract as many items as possible. Be thorough and comprehensive.

Extract the following information in JSON format:

1. companies: Array of ALL companies mentioned
   - name: company name
   - country: country (use "USA", "Japan", "China", "Germany", "Switzerland", "Denmark", "Korea", "Unknown" etc.)
   - category: "robotics", "AI", "semiconductor", "actuator", "automation"

2. products: Array of ALL products/models mentioned (BE THOROUGH - extract every product name)
   - name: product/model name (e.g., "Optimus", "Digit", "G1", "RT-1", "RT-2", "UR10", "π₀")
   - companyName: company that makes it
   - type: one of "humanoid", "service", "logistics", "industrial", "quadruped", "cobot", "amr", "foundation_model", "actuator", "soc"
   - releaseDate: year or date if mentioned (e.g., "2024", "2023-06")
   - description: brief description

3. articles: If this is news content, extract article info
   - title, source, url, summary, category, productType

4. keywords: Important technical keywords (max 15)

5. summary: Brief Korean summary (2-3 sentences)

CRITICAL: For robotics content, products include:
- Robot models (Optimus, Digit, Atlas, Spot, G1, H1, etc.)
- Foundation models (RT-1, RT-2, RT-X, π₀, PaLM-E, etc.)
- Cobot series (UR3, UR5, UR10, etc.)
- Actuator products (Harmonic Drive series, etc.)

Respond ONLY with valid JSON. No markdown, no explanation.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text.substring(0, 16000) },
      ],
      max_tokens: 4000,
      temperature: 0.1,
    });

    const result = response.choices[0]?.message?.content || '{}';
    
    // JSON 파싱 시도
    let parsed: AnalyzedData;
    try {
      // 마크다운 코드 블록 제거
      const cleanJson = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      console.error('[TextAnalyzer] JSON parse failed:', result);
      parsed = {
        companies: [],
        products: [],
        articles: [],
        keywords: [],
        summary: '분석 결과를 파싱할 수 없습니다.',
      };
    }

    return {
      companies: parsed.companies || [],
      products: parsed.products || [],
      articles: parsed.articles || [],
      keywords: parsed.keywords || [],
      summary: parsed.summary || '',
    };
  } catch (error) {
    console.error('[TextAnalyzer] Analysis failed:', error);
    throw new Error('AI 분석 중 오류가 발생했습니다.');
  }
}

/**
 * 분석된 데이터를 DB에 저장
 */
export async function saveAnalyzedData(data: AnalyzedData): Promise<SaveResult> {
  const result: SaveResult = {
    companiesSaved: 0,
    productsSaved: 0,
    articlesSaved: 0,
    keywordsSaved: 0,
    errors: [],
  };

  const companyIdMap = new Map<string, string>();

  // 1. 회사 저장
  for (const company of data.companies) {
    try {
      // 중복 체크
      const existing = await db.select().from(companies)
        .where(eq(companies.name, company.name))
        .limit(1);

      const existingCompany = existing[0];
      if (existingCompany) {
        companyIdMap.set(company.name, existingCompany.id);
        continue;
      }

      const [inserted] = await db.insert(companies).values({
        name: company.name,
        country: company.country || 'Unknown',
        category: company.category || 'robotics',
        description: company.description,
      }).returning({ id: companies.id });

      if (inserted) {
        companyIdMap.set(company.name, inserted.id);
        result.companiesSaved++;
      }
    } catch (err) {
      result.errors.push(`Company "${company.name}": ${(err as Error).message}`);
    }
  }

  // 2. 제품 저장
  for (const product of data.products) {
    try {
      // 회사 ID 찾기
      let companyId = companyIdMap.get(product.companyName);
      if (!companyId) {
        const [company] = await db.select().from(companies)
          .where(eq(companies.name, product.companyName))
          .limit(1);
        companyId = company?.id;
      }

      if (!companyId) {
        // 회사가 없으면 생성
        const [newCompany] = await db.insert(companies).values({
          name: product.companyName,
          country: 'Unknown',
          category: 'robotics',
        }).returning({ id: companies.id });
        companyId = newCompany?.id;
        if (companyId) {
          companyIdMap.set(product.companyName, companyId);
          result.companiesSaved++;
        }
      }

      if (!companyId) continue;

      // 중복 체크
      const existing = await db.select().from(products)
        .where(eq(products.name, product.name))
        .limit(1);

      if (existing.length > 0) {
        // 기존 제품이 있으면 releaseDate 업데이트
        const existingProduct = existing[0];
        if (existingProduct && product.releaseDate) {
          await db.update(products)
            .set({ 
              releaseDate: product.releaseDate,
              type: product.type || existingProduct.type,
            })
            .where(eq(products.id, existingProduct.id));
          result.productsSaved++;
        }
        continue;
      }

      await db.insert(products).values({
        companyId,
        name: product.name,
        type: product.type || 'service',
        releaseDate: product.releaseDate || null,
        status: 'announced',
      });

      result.productsSaved++;
    } catch (err) {
      result.errors.push(`Product "${product.name}": ${(err as Error).message}`);
    }
  }

  // 3. 기사 저장
  for (const article of data.articles) {
    try {
      const contentHash = createHash('md5')
        .update(article.title + article.source)
        .digest('hex');

      // 중복 체크
      const existing = await db.select().from(articles)
        .where(eq(articles.contentHash, contentHash))
        .limit(1);

      if (existing.length > 0) continue;

      await db.insert(articles).values({
        title: article.title,
        source: article.source || 'manual',
        url: article.url || '',
        summary: article.summary,
        category: article.category || 'other',
        productType: article.productType || 'none',
        contentHash,
        language: 'ko',
      });

      result.articlesSaved++;
    } catch (err) {
      result.errors.push(`Article "${article.title}": ${(err as Error).message}`);
    }
  }

  // 4. 키워드 저장
  for (const keyword of data.keywords) {
    try {
      // 중복 체크
      const existing = await db.select().from(keywords)
        .where(and(
          eq(keywords.term, keyword),
          eq(keywords.language, 'ko')
        ))
        .limit(1);

      if (existing.length > 0) continue;

      await db.insert(keywords).values({
        term: keyword,
        language: 'ko',
        category: 'extracted',
      });

      result.keywordsSaved++;
    } catch (err) {
      result.errors.push(`Keyword "${keyword}": ${(err as Error).message}`);
    }
  }

  return result;
}

export const textAnalyzerService = {
  analyzeText,
  saveAnalyzedData,
};
