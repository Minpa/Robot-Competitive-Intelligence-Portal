import { parseDocument } from 'htmlparser2';
import { selectAll, selectOne } from 'css-select';
import { textContent, getElementsByTagName, getAttributeValue } from 'domutils';
import { createHash } from 'crypto';
import type { CrawlPattern, CollectedItem } from '../types.js';
import type { Element, Document } from 'domhandler';

export class ContentParser {
  parse(html: string, url: string, pattern: CrawlPattern): CollectedItem {
    const doc = parseDocument(html);
    const selectors = pattern.selectors;

    const title = this.extractText(doc, selectors.title);
    const content = this.extractContent(doc, selectors.content);
    const publishDate = this.extractText(doc, selectors.publishDate);
    const price = this.extractText(doc, selectors.price);
    const specs = this.extractSpecs(doc, selectors.specs);

    const contentHash = this.generateContentHash(content || title || url);

    return {
      url,
      type: pattern.type,
      title: title || undefined,
      content: content || undefined,
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

  private extractContent(doc: Document, selector?: string): string | null {
    if (!selector) {
      const commonSelectors = ['article', 'main', '.content', '.post-content', '.entry-content'];

      for (const sel of commonSelectors) {
        try {
          const element = selectOne(sel, doc);
          if (element) {
            const content = textContent(element).trim();
            if (content && content.length > 100) {
              return this.cleanContent(content);
            }
          }
        } catch {
          continue;
        }
      }

      const body = getElementsByTagName('body', doc)[0];
      if (body) {
        return this.cleanContent(textContent(body).trim());
      }
      return null;
    }

    try {
      const element = selectOne(selector, doc);
      if (element) {
        return this.cleanContent(textContent(element).trim());
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

  private cleanContent(content: string): string {
    return content
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim()
      .substring(0, 50000);
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
