/**
 * 합법적 데이터 수집 서비스
 */

import { createHash } from 'crypto';

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

// arXiv API
export class ArxivCollector {
  private baseUrl = 'http://export.arxiv.org/api/query';
  private lastRequest = 0;

  async fetchRoboticsResearch(maxResults = 50): Promise<CollectionResult> {
    try {
      await this.delay(3000);
      const query = encodeURIComponent('cat:cs.RO OR cat:cs.AI');
      const url = `${this.baseUrl}?search_query=${query}&start=0&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;

      const response = await fetch(url, { headers: { 'User-Agent': 'RCIPBot/1.0' } });
      if (!response.ok) throw new Error(`arXiv API error: ${response.status}`);

      const xml = await response.text();
      const items = this.parse(xml);
      return { source: 'arxiv', success: true, count: items.length, items };
    } catch (error) {
      return { source: 'arxiv', success: false, count: 0, items: [], error: String(error) };
    }
  }

  private parse(xml: string): CollectedData[] {
    const items: CollectedData[] = [];
    const regex = /<entry>([\s\S]*?)<\/entry>/g;
    let m;
    while ((m = regex.exec(xml)) !== null) {
      const entry = m[1] ?? '';
      const id = this.tag(entry, 'id');
      const title = this.tag(entry, 'title');
      if (id && title) {
        items.push({
          id: createHash('md5').update(id).digest('hex'),
          source: 'arxiv',
          type: 'research_paper',
          title: title.replace(/\s+/g, ' ').trim(),
          url: id,
          metadata: { abstract: (this.tag(entry, 'summary') ?? '').substring(0, 500) },
          collectedAt: new Date(),
        });
      }
    }
    return items;
  }

  private tag(xml: string, name: string): string | null {
    const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
    return m && m[1] ? m[1] : null;
  }

  private async delay(ms: number): Promise<void> {
    const elapsed = Date.now() - this.lastRequest;
    if (elapsed < ms) await new Promise(r => setTimeout(r, ms - elapsed));
    this.lastRequest = Date.now();
  }
}

// GitHub API
export class GitHubCollector {
  private lastRequest = 0;

  async fetchRoboticsRepos(maxResults = 30): Promise<CollectionResult> {
    try {
      await this.delay(2000);
      const url = `https://api.github.com/search/repositories?q=robotics&sort=stars&order=desc&per_page=${maxResults}`;
      const headers: Record<string, string> = { 'User-Agent': 'RCIPBot/1.0', 'Accept': 'application/vnd.github.v3+json' };
      if (process.env.GITHUB_TOKEN) headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;

      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);

      const json = await response.json();
      const data = json as { items?: Array<{ html_url: string; full_name: string; description?: string; stargazers_count: number; language?: string }> };
      const items: CollectedData[] = (data.items ?? []).map(repo => ({
        id: createHash('md5').update(repo.html_url).digest('hex'),
        source: 'github' as const,
        type: 'repository',
        title: repo.full_name,
        url: repo.html_url,
        metadata: { description: repo.description ?? '', stars: repo.stargazers_count, language: repo.language ?? '' },
        collectedAt: new Date(),
      }));
      return { source: 'github', success: true, count: items.length, items };
    } catch (error) {
      return { source: 'github', success: false, count: 0, items: [], error: String(error) };
    }
  }

  private async delay(ms: number): Promise<void> {
    const elapsed = Date.now() - this.lastRequest;
    if (elapsed < ms) await new Promise(r => setTimeout(r, ms - elapsed));
    this.lastRequest = Date.now();
  }
}

// SEC EDGAR API
export class SecEdgarCollector {
  private ciks = ['0001757143', '0001819493'];
  private lastRequest = 0;

  async fetchRoboticsFilings(maxResults = 20): Promise<CollectionResult> {
    try {
      const items: CollectedData[] = [];
      for (const cik of this.ciks) {
        if (items.length >= maxResults) break;
        await this.delay(200);
        const url = `https://data.sec.gov/submissions/CIK${cik.padStart(10, '0')}.json`;
        const response = await fetch(url, { headers: { 'User-Agent': 'RCIPBot/1.0 (contact@example.com)' } });
        if (!response.ok) continue;

        const json = await response.json();
        const data = json as { name?: string; filings?: { recent?: { form?: string[]; accessionNumber?: string[]; filingDate?: string[]; primaryDocument?: string[] } } };
        const filings = data.filings?.recent;
        if (!filings?.form) continue;

        for (let i = 0; i < Math.min(5, filings.form.length) && items.length < maxResults; i++) {
          const form = filings.form[i] ?? '';
          if (!['10-K', '10-Q', '8-K'].includes(form)) continue;
          const acc = filings.accessionNumber?.[i] ?? '';
          const doc = filings.primaryDocument?.[i] ?? '';
          const filingUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${acc.replace(/-/g, '')}/${doc}`;
          items.push({
            id: createHash('md5').update(filingUrl).digest('hex'),
            source: 'sec_edgar',
            type: 'sec_filing',
            title: `${data.name ?? 'Unknown'} - ${form}`,
            url: filingUrl,
            metadata: { formType: form, filingDate: filings.filingDate?.[i] ?? '' },
            collectedAt: new Date(),
          });
        }
      }
      return { source: 'sec_edgar', success: true, count: items.length, items };
    } catch (error) {
      return { source: 'sec_edgar', success: false, count: 0, items: [], error: String(error) };
    }
  }

  private async delay(ms: number): Promise<void> {
    const elapsed = Date.now() - this.lastRequest;
    if (elapsed < ms) await new Promise(r => setTimeout(r, ms - elapsed));
    this.lastRequest = Date.now();
  }
}

// USPTO Patent API
export class PatentCollector {
  private lastRequest = 0;

  async fetchRoboticsPatents(maxResults = 30): Promise<CollectionResult> {
    try {
      await this.delay(1000);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const dateStr = sixMonthsAgo.toISOString().split('T')[0];

      const response = await fetch('https://api.patentsview.org/patents/query', {
        method: 'POST',
        headers: { 'User-Agent': 'RCIPBot/1.0', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: { _and: [{ _gte: { patent_date: dateStr } }, { _text_any: { patent_title: 'robot' } }] },
          f: ['patent_number', 'patent_title', 'patent_date'],
          o: { per_page: maxResults },
        }),
      });

      if (!response.ok) throw new Error(`USPTO API error: ${response.status}`);

      const json = await response.json();
      const data = json as { patents?: Array<{ patent_number: string; patent_title: string; patent_date: string }> };
      const items: CollectedData[] = (data.patents ?? []).map(p => ({
        id: createHash('md5').update(p.patent_number).digest('hex'),
        source: 'patent' as const,
        type: 'patent',
        title: p.patent_title,
        url: `https://patents.google.com/patent/US${p.patent_number}`,
        metadata: { patentNumber: p.patent_number, filingDate: p.patent_date },
        collectedAt: new Date(),
      }));
      return { source: 'patent', success: true, count: items.length, items };
    } catch (error) {
      return { source: 'patent', success: false, count: 0, items: [], error: String(error) };
    }
  }

  private async delay(ms: number): Promise<void> {
    const elapsed = Date.now() - this.lastRequest;
    if (elapsed < ms) await new Promise(r => setTimeout(r, ms - elapsed));
    this.lastRequest = Date.now();
  }
}

// 통합 수집기
export class LegalDataCollector {
  private arxiv = new ArxivCollector();
  private github = new GitHubCollector();
  private sec = new SecEdgarCollector();
  private patent = new PatentCollector();

  async collectAll(): Promise<{ results: CollectionResult[]; totalCount: number }> {
    const results = await Promise.all([
      this.arxiv.fetchRoboticsResearch(30),
      this.github.fetchRoboticsRepos(30),
      this.sec.fetchRoboticsFilings(20),
      this.patent.fetchRoboticsPatents(30),
    ]);
    return { results, totalCount: results.reduce((s, r) => s + r.count, 0) };
  }

  collectArxiv(n = 50) { return this.arxiv.fetchRoboticsResearch(n); }
  collectGitHub(n = 50) { return this.github.fetchRoboticsRepos(n); }
  collectSecEdgar(n = 30) { return this.sec.fetchRoboticsFilings(n); }
  collectPatents(n = 50) { return this.patent.fetchRoboticsPatents(n); }
}

export const legalDataCollector = new LegalDataCollector();
