import { parseDocument } from 'htmlparser2';
import { selectAll, selectOne } from 'css-select';
import { textContent, getAttributeValue } from 'domutils';
import { createHash } from 'crypto';
import type { CrawlPattern, CollectedItem } from '../types.js';
import type { Element, Document } from 'domhandler';

export class ContentParser {
  /**
   * 기사 메타데이터만 추출 (본문 제외 - 저작권 보호)
   * 제목, URL, 날짜 등 사실 정보만 수집
   */
  parse(html: string, url: string, pattern: CrawlPattern): CollectedItem {
    const doc = parseDocument(html);
    const selectors = pattern.selectors;

    const title = this.extractText(doc, selectors.title);
    const publishDate = this.extractText(doc, selectors.publishDate);
    const price = this.extractText(doc, selectors.price);
    const specs = this.extractSpecs(doc, selectors.specs);

    // 본문 대신 제목+URL로 해시 생성 (중복 체크용)
    const contentHash = this.generateContentHash(title || url);

    return {
      url,
      type: pattern.type,
      title: title || undefined,
      // content 제거 - 저작권 보호를 위해 본문 저장하지 않음
      publishDate: publishDate || undefined,
      price: price || undefined,
      specs: Object.keys(specs).length > 0 ? specs : undefined,
      contentHash,
      collectedAt: new Date(),
    };
  }

  private extractText(doc: Document, selector?: string): string | null {
    if (!selector) return null;

    try {
      const element = selectOne(selector, doc);
      if (element) {
        return textContent(element).trim() || null;
      }
      return null;
    } catch {
      return null;
    }
  }

  private extractSpecs(doc: Document, specSelectors?: Record<string, string>): Record<string, string> {
    const specs: Record<string, string> = {};

    if (!specSelectors) return specs;

    for (const [key, selector] of Object.entries(specSelectors)) {
      try {
        const element = selectOne(selector, doc);
        if (element) {
          const value = textContent(element).trim();
          if (value) {
            specs[key] = value;
          }
        }
      } catch {
        continue;
      }
    }

    return specs;
  }

  generateContentHash(content: string): string {
    const normalized = content.trim().replace(/\r\n/g, '\n');
    return createHash('sha256').update(normalized, 'utf8').digest('hex');
  }

  extractLinks(doc: Document, baseUrl: string, pattern?: string): string[] {
    const links: string[] = [];
    const base = new URL(baseUrl);

    const anchors = selectAll('a[href]', doc) as unknown as Element[];
    for (const anchor of anchors) {
      try {
        const href = getAttributeValue(anchor, 'href');
        if (!href) continue;

        const absoluteUrl = new URL(href, base).toString();

        if (pattern && !absoluteUrl.includes(pattern)) continue;

        if (new URL(absoluteUrl).hostname === base.hostname) {
          links.push(absoluteUrl);
        }
      } catch {
        continue;
      }
    }

    return [...new Set(links)];
  }
}

export const contentParser = new ContentParser();
