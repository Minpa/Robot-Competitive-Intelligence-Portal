/**
 * 합법적 데이터 수집 서비스
 * 
 * 모든 데이터 소스는 공식 API를 사용하며,
 * 각 서비스의 이용약관과 Rate Limit을 준수합니다.
 */

import { createHash } from 'crypto';

// ============================================
// 공통 타입 정의
// ============================================

export interface CollectedData {
  id: string;
  source: 'arxiv' | 'github' | 'sec_edgar' | 'patent';
  type: string;
  title: string;
  url: string;
  metadata: Record<string, unknown>;
  collectedAt: Date;
}

export interface CollectionResult {
  source: string;
  success: boolean;
  count: number;
  items: CollectedData[];
  error?: string;
}

// ============================================
// arXiv API 클라이언트
// 공식 API: https://arxiv.org/help/api
// 메타데이터만 수집 (제목, 저자, 초록, 링크)
// ============================================

export class ArxivCollector {
  private baseUrl = 'http://export.arxiv.org/api/query';
  private userAgent = 'RCIPBot/1.0 (Research Purpose; contact@example.com)';
  
  // Rate limit: 1 request per 3 seconds (arXiv 권장)
  private requestDelay = 3000;
  private lastRequest = 0;

  /**
   * 로봇공학 관련 최신 논문 수집
   * 카테고리: cs.RO (Robotics), cs.AI, cs.LG
   */
  async fetchRoboticsResearch(maxResults = 50): Promise<CollectionResult> {
    try {
      await this.respectRateLimit();

      const query = encodeURIComponent('cat:cs.RO OR cat:cs.AI');
      const url = `${this.baseUrl}?search_query=${query}&start=0&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;

      const response = await fetch(url, {
        headers: { 'User-Agent': this.userAgent },
      });

      if (!response.ok) {
        throw new Error(`arXiv API error: ${response.status}`);
      }

      const xml = await response.text();
      const items = this.parseArxivResponse(xml);

      console.log(`[arXiv] Collected ${items.length} papers`);

      return {
        source: 'arxiv',
        success: true,
        count: items.length,
        items,
      };
    } catch (error) {
      console.error('[arXiv] Collection failed:', error);
      return {
        source: 'arxiv',
        success: false,
        count: 0,
        items: [],
        error: (error as Error).message,
      };
    }
  }

  private parseArxivResponse(xml: string): CollectedData[] {
    const items: CollectedData[] = [];
    
    // 간단한 XML 파싱 (entry 태그 추출)
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;

    while ((match = entryRegex.exec(xml)) !== null) {
      const entry = match[1];
      
      const id = this.extractTag(entry, 'id');
      const title = this.extractTag(entry, 'title')?.replace(/\s+/g, ' ').trim();
      const summary = this.extractTag(entry, 'summary')?.replace(/\s+/g, ' ').trim();
      const published = this.extractTag(entry, 'published');
      const authors = this.extractAuthors(entry);
      const categories = this.extractCategories(entry);

      if (id && title) {
        items.push({
          id: createHash('md5').update(id).digest('hex'),
          source: 'arxiv',
          type: 'research_paper',
          title,
          url: id,
          metadata: {
            abstract: summary?.substring(0, 500), // 초록 일부만 저장
            authors,
            categories,
            publishedDate: published,
            // PDF 링크는 제공하지 않음 (라이선스 이슈)
          },
          collectedAt: new Date(),
        });
      }
    }

    return items;
  }

  private extractTag(xml: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`);
    const match = xml.match(regex);
    return match ? match[1] : null;
  }

  private extractAuthors(entry: string): string[] {
    const authors: string[] = [];
    const authorRegex = /<author>[\s\S]*?<name>([^<]+)<\/name>[\s\S]*?<\/author>/g;
    let match;
    while ((match = authorRegex.exec(entry)) !== null) {
      authors.push(match[1].trim());
    }
    return authors;
  }

  private extractCategories(entry: string): string[] {
    const categories: string[] = [];
    const catRegex = /<category[^>]*term="([^"]+)"/g;
    let match;
    while ((match = catRegex.exec(entry)) !== null) {
      categories.push(match[1]);
    }
    return categories;
  }

  private async respectRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequest;
    if (elapsed < this.requestDelay) {
      await new Promise(resolve => setTimeout(resolve, this.requestDelay - elapsed));
    }
    this.lastRequest = Date.now();
  }
}

// ============================================
// GitHub API 클라이언트
// 공식 API: https://docs.github.com/en/rest
// Rate limit: 60 req/hour (미인증), 5000 req/hour (인증)
// ============================================

export class GitHubCollector {
  private baseUrl = 'https://api.github.com';
  private userAgent = 'RCIPBot/1.0';
  private token?: string;

  // Rate limit: 미인증 60 req/hour = 1 req/minute
  private requestDelay = 2000;
  private lastRequest = 0;

  constructor(token?: string) {
    this.token = token || process.env.GITHUB_TOKEN;
  }

  /**
   * 로봇공학 관련 인기 리포지터리 수집
   */
  async fetchRoboticsRepos(maxResults = 50): Promise<CollectionResult> {
    try {
      await this.respectRateLimit();

      const queries = ['robotics', 'ros', 'robot-arm', 'humanoid-robot', 'autonomous-robot'];
      const allItems: CollectedData[] = [];

      for (const query of queries) {
        if (allItems.length >= maxResults) break;

        const url = `${this.baseUrl}/search/repositories?q=${query}+in:name,description&sort=stars&order=desc&per_page=10`;
        
        const headers: Record<string, string> = {
          'User-Agent': this.userAgent,
          'Accept': 'application/vnd.github.v3+json',
        };
        
        if (this.token) {
          headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(url, { headers });

        if (!response.ok) {
          if (response.status === 403) {
            console.warn('[GitHub] Rate limit exceeded, stopping');
            break;
          }
          throw new Error(`GitHub API error: ${response.status}`);
        }

        const data = await response.json();
        
        for (const repo of data.items || []) {
          if (allItems.length >= maxResults) break;
          
          allItems.push({
            id: createHash('md5').update(repo.html_url).digest('hex'),
            source: 'github',
            type: 'repository',
            title: repo.full_name,
            url: repo.html_url,
            metadata: {
              description: repo.description,
              stars: repo.stargazers_count,
              forks: repo.forks_count,
              language: repo.language,
              topics: repo.topics,
              updatedAt: repo.updated_at,
              // 코드 내용은 수집하지 않음
            },
            collectedAt: new Date(),
          });
        }

        await this.respectRateLimit();
      }

      console.log(`[GitHub] Collected ${allItems.length} repositories`);

      return {
        source: 'github',
        success: true,
        count: allItems.length,
        items: allItems,
      };
    } catch (error) {
      console.error('[GitHub] Collection failed:', error);
      return {
        source: 'github',
        success: false,
        count: 0,
        items: [],
        error: (error as Error).message,
      };
    }
  }

  private async respectRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequest;
    if (elapsed < this.requestDelay) {
      await new Promise(resolve => setTimeout(resolve, this.requestDelay - elapsed));
    }
    this.lastRequest = Date.now();
  }
}

// ============================================
// SEC EDGAR 클라이언트
// 공식 가이드: https://www.sec.gov/os/webmaster-faq
// 필수: User-Agent에 이메일 포함, 10 req/sec 이하
// ============================================

export class SecEdgarCollector {
  private baseUrl = 'https://data.sec.gov';
  // SEC 필수 요구사항: User-Agent에 연락처 포함
  private userAgent = 'RCIPBot/1.0 (contact@example.com)';
  
  // SEC 권장: 10 requests per second 이하
  private requestDelay = 200;
  private lastRequest = 0;

  // 로봇 관련 기업 CIK (Central Index Key)
  private robotCompanyCiks = [
    '0001757143', // Intuitive Surgical
    '0001819493', // Symbotic
    '0001855631', // Aurora Innovation
    // 추가 기업은 여기에
  ];

  /**
   * 로봇 관련 기업 공시 수집
   */
  async fetchRoboticsFilings(maxResults = 30): Promise<CollectionResult> {
    try {
      const allItems: CollectedData[] = [];

      for (const cik of this.robotCompanyCiks) {
        if (allItems.length >= maxResults) break;

        await this.respectRateLimit();

        const url = `${this.baseUrl}/submissions/CIK${cik.padStart(10, '0')}.json`;
        
        const response = await fetch(url, {
          headers: { 'User-Agent': this.userAgent },
        });

        if (!response.ok) {
          console.warn(`[SEC] Failed to fetch CIK ${cik}: ${response.status}`);
          continue;
        }

        const data = await response.json();
        const filings = data.filings?.recent;

        if (!filings) continue;

        // 최근 10개 공시만 수집
        const count = Math.min(10, filings.form?.length || 0);
        
        for (let i = 0; i < count && allItems.length < maxResults; i++) {
          const form = filings.form[i];
          const accessionNumber = filings.accessionNumber[i];
          const filingDate = filings.filingDate[i];
          const primaryDocument = filings.primaryDocument[i];

          // 중요 공시만 필터링 (10-K, 10-Q, 8-K)
          if (!['10-K', '10-Q', '8-K'].includes(form)) continue;

          const filingUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionNumber.replace(/-/g, '')}/${primaryDocument}`;

          allItems.push({
            id: createHash('md5').update(filingUrl).digest('hex'),
            source: 'sec_edgar',
            type: 'sec_filing',
            title: `${data.name} - ${form}`,
            url: filingUrl,
            metadata: {
              companyName: data.name,
              cik,
              formType: form,
              filingDate,
              // 문서 내용은 수집하지 않음 (링크만 제공)
            },
            collectedAt: new Date(),
          });
        }
      }

      console.log(`[SEC EDGAR] Collected ${allItems.length} filings`);

      return {
        source: 'sec_edgar',
        success: true,
        count: allItems.length,
        items: allItems,
      };
    } catch (error) {
      console.error('[SEC EDGAR] Collection failed:', error);
      return {
        source: 'sec_edgar',
        success: false,
        count: 0,
        items: [],
        error: (error as Error).message,
      };
    }
  }

  private async respectRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequest;
    if (elapsed < this.requestDelay) {
      await new Promise(resolve => setTimeout(resolve, this.requestDelay - elapsed));
    }
    this.lastRequest = Date.now();
  }
}

// ============================================
// USPTO 특허 API 클라이언트
// 공식 API: https://developer.uspto.gov/
// ============================================

export class UsptpPatentCollector {
  private baseUrl = 'https://api.patentsview.org/patents/query';
  private userAgent = 'RCIPBot/1.0';
  
  // Rate limit 준수
  private requestDelay = 1000;
  private lastRequest = 0;

  /**
   * 로봇 관련 특허 수집
   */
  async fetchRoboticsPatents(maxResults = 50): Promise<CollectionResult> {
    try {
      await this.respectRateLimit();

      // 로봇 관련 CPC 분류 코드로 검색
      const query = {
        _and: [
          { _gte: { patent_date: this.getDateMonthsAgo(6) } },
          {
            _or: [
              { _text_any: { patent_title: 'robot' } },
              { _text_any: { patent_title: 'robotic' } },
              { _text_any: { patent_title: 'humanoid' } },
              { _text_any: { patent_title: 'autonomous vehicle' } },
            ],
          },
        ],
      };

      const fields = [
        'patent_number',
        'patent_title',
        'patent_date',
        'patent_abstract',
        'assignee_organization',
        'inventor_first_name',
        'inventor_last_name',
      ];

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'User-Agent': this.userAgent,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: query,
          f: fields,
          o: { per_page: maxResults },
        }),
      });

      if (!response.ok) {
        throw new Error(`USPTO API error: ${response.status}`);
      }

      const data = await response.json();
      const items: CollectedData[] = [];

      for (const patent of data.patents || []) {
        const patentNumber = patent.patent_number;
        const patentUrl = `https://patents.google.com/patent/US${patentNumber}`;

        items.push({
          id: createHash('md5').update(patentNumber).digest('hex'),
          source: 'patent',
          type: 'patent',
          title: patent.patent_title,
          url: patentUrl,
          metadata: {
            patentNumber,
            filingDate: patent.patent_date,
            abstract: patent.patent_abstract?.substring(0, 500),
            assignee: patent.assignees?.[0]?.assignee_organization,
            inventors: patent.inventors?.map((i: { inventor_first_name: string; inventor_last_name: string }) => 
              `${i.inventor_first_name} ${i.inventor_last_name}`
            ),
            // 전체 명세서는 수집하지 않음
          },
          collectedAt: new Date(),
        });
      }

      console.log(`[USPTO] Collected ${items.length} patents`);

      return {
        source: 'patent',
        success: true,
        count: items.length,
        items,
      };
    } catch (error) {
      console.error('[USPTO] Collection failed:', error);
      return {
        source: 'patent',
        success: false,
        count: 0,
        items: [],
        error: (error as Error).message,
      };
    }
  }

  private getDateMonthsAgo(months: number): string {
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    return date.toISOString().split('T')[0];
  }

  private async respectRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequest;
    if (elapsed < this.requestDelay) {
      await new Promise(resolve => setTimeout(resolve, this.requestDelay - elapsed));
    }
    this.lastRequest = Date.now();
  }
}

// ============================================
// 통합 데이터 수집기
// ============================================

export class LegalDataCollector {
  private arxiv = new ArxivCollector();
  private github = new GitHubCollector();
  private secEdgar = new SecEdgarCollector();
  private uspto = new UsptpPatentCollector();

  /**
   * 모든 소스에서 데이터 수집
   */
  async collectAll(): Promise<{
    results: CollectionResult[];
    totalCount: number;
    successCount: number;
  }> {
    console.log('[LegalDataCollector] Starting collection from all sources...');

    const results = await Promise.all([
      this.arxiv.fetchRoboticsResearch(30),
      this.github.fetchRoboticsRepos(30),
      this.secEdgar.fetchRoboticsFilings(20),
      this.uspto.fetchRoboticsPatents(30),
    ]);

    const totalCount = results.reduce((sum, r) => sum + r.count, 0);
    const successCount = results.filter(r => r.success).length;

    console.log(`[LegalDataCollector] Collection complete: ${totalCount} items from ${successCount}/${results.length} sources`);

    return { results, totalCount, successCount };
  }

  /**
   * 개별 소스 수집
   */
  async collectArxiv(maxResults = 50) {
    return this.arxiv.fetchRoboticsResearch(maxResults);
  }

  async collectGitHub(maxResults = 50) {
    return this.github.fetchRoboticsRepos(maxResults);
  }

  async collectSecEdgar(maxResults = 30) {
    return this.secEdgar.fetchRoboticsFilings(maxResults);
  }

  async collectPatents(maxResults = 50) {
    return this.uspto.fetchRoboticsPatents(maxResults);
  }
}

export const legalDataCollector = new LegalDataCollector();
