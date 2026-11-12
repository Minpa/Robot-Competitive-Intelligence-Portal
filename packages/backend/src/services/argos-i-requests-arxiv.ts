/**
 * arXiv 메타 조회 (공식 API https://export.arxiv.org/api/query, 읽기 전용). 제목·초록(500자)·링크·게시일만 읽는다.
 */

import { UpstreamError } from './argos-i-requests-handlers/types.js';

export interface ArxivEntry {
  /** API 가 돌려준 abs 링크(버전 포함). crawler 가 저장하는 url 과 같은 형태 */
  entryId: string;
  arxivId: string;
  title: string;
  summary: string;
  publishedAt: string | null;
}

export interface ArxivClient {
  getEntry(id: string): Promise<ArxivEntry | null>;
}

const decodeXml = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

const tag = (xml: string, name: string): string | null => {
  const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`).exec(xml);
  return m ? decodeXml(m[1]!).replace(/\s+/g, ' ').trim() : null;
};

/** Atom 응답의 첫 entry 를 파싱한다. entry 가 없거나 오류 entry 면 null */
export function parseArxivEntry(xml: string): ArxivEntry | null {
  const m = /<entry>([\s\S]*?)<\/entry>/.exec(xml);
  if (!m) return null;
  const e = m[1]!;
  const entryId = tag(e, 'id');
  const title = tag(e, 'title');
  if (!entryId || !title || !/arxiv\.org\/abs\//.test(entryId) || title.toLowerCase() === 'error') return null;
  const arxivId = entryId.replace(/^.*\/abs\//, '').replace(/v\d+$/, '');
  return { entryId, arxivId, title, summary: (tag(e, 'summary') ?? '').slice(0, 500), publishedAt: tag(e, 'published') };
}

export function createArxivClient(fetchImpl: typeof fetch = fetch, timeoutMs = 8000): ArxivClient {
  return {
    async getEntry(id) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const res = await fetchImpl(`https://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`, {
          signal: ctrl.signal,
          headers: { 'User-Agent': 'ARGOSBot/1.0 (metadata only)' },
        });
        if (!res.ok) throw new UpstreamError(res.status >= 500 || res.status === 429);
        return parseArxivEntry(await res.text());
      } catch (err) {
        if (err instanceof UpstreamError) throw err;
        throw new UpstreamError(true);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
