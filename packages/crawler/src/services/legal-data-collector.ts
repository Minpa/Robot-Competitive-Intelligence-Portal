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
// ============================================

export class ArxivCollector {
  private baseUrl = 'http://export.arxiv.org/api/query';
  private userAgent = 'RCIPBot/1.0 (Research Purpose)';
  private requestDelay = 3000;
  private lastRequest = 0;

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

      return { source: 'arxiv', success: true, count: items.length, items };
    } catch (error) {
      console.error('[arXiv] Collection failed:', error);
      return { source: 'arxiv', success: false, count: 0, items: [], error: (error as Error).message };
    }
  }

  private parseArxivResponse(xml: string): CollectedData[] {
    const items: CollectedData[] = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;

    while ((match = entryRegex.exec(xml)) !== null) {
      const entry = match[1];
      
      const id = this.extractTag(entry, 'id') || '';
      const title = (this.extractTag(entry, 'title') || '').replace(/\s+/g, ' ').trim();
      const summary = (this.extractTag(entry, 'summary') || '').replace(/\s+/g, ' ').trim();
      const published = this.extractTag(entry, 'published') || '';

      if (id && title) {
        items.push({
          id: createHash('md5').update(id).digest('hex'),
          source: 'arxiv',
          type: 'research_paper',
          title,
          url: id,
          metadata: {
            abstract: summary.substring(0, 500),
            publishedDate: published,
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
// ============================================

export class GitHubCollector {
  private baseUrl = 'https://api.github.com';
  private userAgent = 'RCIPBot/1.0';
  private token?: string;
  private requestDelay = 2000;
  private lastRequest = 0;

  constructor(token?: string) {
    this.token = token || process.env.GITHUB_TOKEN;
  }

  async fetchRoboticsRepos(maxResults = 50): Promise<CollectionResult> {
    try {
      await this.respectRateLimit();

      const url = `${this.baseUrl}/search/repositories?q=robotics+in:name,description&sort=stars&order=desc&per_page=${Math.min(maxResults, 30)}`;
      
      const headers: Record<string, string> = {
        'User-Agent': this.userAgent,
        'Accept': 'application/vnd.github.v3+json',
      };
      
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json() as { items?: Array<{ html_url: string; full_name: string; description: string; stargazers_count: number; forks_count: number; language: string; topics: string[]; updated_at: string }> };
      const items: CollectedData[] = [];
      
      for (const repo of data.items || []) {
        items.push({
          id: createHash('md5').update(repo.html_url).digest('hex'),
          source: 'github',
          type: 'repository',
          title: repo.full_name,
          url: repo.html_url,
          metadata: {
            description: repo.description || '',
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            language: repo.language || '',
            topics: repo.topics || [],
            updatedAt: repo.updated_at,
          },
          collectedAt: new Date(),
        });
      }

      console.log(`[GitHub] Collected ${items.length} repositories`);

      return { source: 'github', success: true, count: items.length, items };
    } catch (error) {
      console.error('[GitHub] Collection failed:', error);
      return { source: 'github', success: false, count: 0, items: [], error: (error as Error).message };
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
// ============================================

export class SecEdgarCollector {
  private baseUrl = 'https://data.sec.gov';
  private userAgent = 'RCIPBot/1.0 (contact@example.com)';
  private requestDelay = 200;
  private lastRequest = 0;

  private robotCompanyCiks = ['0001757143', '0001819493', '0001855631'];

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

        if (!response.ok) continue;

        const data = await response.json() as { name?: string; filings?: { recent?: { form?: string[]; accessionNumber?: string[]; filingDate?: string[]; primaryDocument?: string[] } } };
        const filings = data.filings?.recent;
        const companyName = data.name || 'Unknown';

        if (!filings?.form) continue;

        const count = Math.min(10, filings.form.length);
        
        for (let i = 0; i < count && allItems.length < maxResults; i++) {
          const form = filings.form[i];
          const accessionNumber = filings.accessionNumber?.[i] || '';
          const filingDate = filings.filingDate?.[i] || '';
          const primaryDocument = filings.primaryDocument?.[i] || '';

          if (!['10-K', '10-Q', '8-K'].includes(form)) continue;

          const filingUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionNumber.replace(/-/g, '')}/${primaryDocument}`;

          allItems.push({
            id: createHash('md5').update(filingUrl).digest('hex'),
            source: 'sec_edgar',
            type: 'sec_filing',
            title: `${companyName} - ${form}`,
            url: filingUrl,
            metadata: { companyName, cik, formType: form, filingDate },
            collectedAt: new Date(),
          });
        }
      }

      console.log(`[SEC EDGAR] Collected ${allItems.length} filings`);

      return { source: 'sec_edgar', success: true, count: allItems.length, items: allItems };
    } catch (error) {
      console.error('[SEC EDGAR] Collection failed:', error);
      return { source: 'sec_edgar', success: false, count: 0, items: [], error: (error as Error).message };
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
// ============================================

export class UsptpPatentCollector {
  private baseUrl = 'https://api.patentsview.org/patents/query';
  private userAgent = 'RCIPBot/1.0';
  private requestDelay = 1000;
  private lastRequest = 0;

  async fetchRoboticsPatents(maxResults = 50): Promise<CollectionResult> {
    try {
      await this.respectRateLimit();

      const query = {
        _and: [
          { _gte: { patent_date: this.getDateMonthsAgo(6) } },
          { _or: [
            { _text_any: { patent_title: 'robot' } },
            { _text_any: { patent_title: 'robotic' } },
          ]},
        ],
      };

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'User-Agent': this.userAgent, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: query,
          f: ['patent_number', 'patent_title', 'patent_date', 'patent_abstract'],
          o: { per_page: maxResults },
        }),
      });

      if (!response.ok) {
        throw new Error(`USPTO API error: ${response.status}`);
      }

      const data = await response.json() as { patents?: Array<{ patent_number: string; patent_title: string; patent_date: string; patent_abstract: string }> };
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
            abstract: (patent.patent_abstract || '').substring(0, 500),
          },
          collectedAt: new Date(),
        });
      }

      console.log(`[USPTO] Collected ${items.length} patents`);

      return { source: 'patent', success: true, count: items.length, items };
    } catch (error) {
      console.error('[USPTO] Collection failed:', error);
      return { source: 'patent', success: false, count: 0, items: [], error: (error as Error).message };
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

  async collectAll(): Promise<{ results: CollectionResult[]; totalCount: number; successCount: number }> {
    console.log('[LegalDataCollector] Starting collection...');

    const results = await Promise.all([
      this.arxiv.fetchRoboticsResearch(30),
      this.github.fetchRoboticsRepos(30),
      this.secEdgar.fetchRoboticsFilings(20),
      this.uspto.fetchRoboticsPatents(30),
    ]);

    const totalCount = results.reduce((sum, r) => sum + r.count, 0);
    const successCount = results.filter(r => r.success).length;

    console.log(`[LegalDataCollector] Complete: ${totalCount} items from ${successCount}/${results.length} sources`);

    return { results, totalCount, successCount };
  }

  async collectArxiv(maxResults = 50) { return this.arxiv.fetchRoboticsResearch(maxResults); }
  async collectGitHub(maxResults = 50) { return this.github.fetchRoboticsRepos(maxResults); }
  async collectSecEdgar(maxResults = 30) { return this.secEdgar.fetchRoboticsFilings(maxResults); }
  async collectPatents(maxResults = 50) { return this.uspto.fetchRoboticsPatents(maxResults); }
}

export const legalDataCollector = new LegalDataCollector();
