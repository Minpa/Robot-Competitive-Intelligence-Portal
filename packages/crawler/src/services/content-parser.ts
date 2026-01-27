import * as cheerio from 'cheerio';
import { createHash } from 'crypto';
import type { CrawlPattern, CollectedItem } from '../types.js';

export class ContentParser {
  /**
   * Parse HTML content based on pattern selectors
   */
  parse(html: string, url: string, pattern: CrawlPattern): CollectedItem {
    const $ = cheerio.load(html);
    const selectors = pattern.selectors;

    const title = this.extractText($, selectors.title);
    const content = this.extractContent($, selectors.content);
    const publishDate = this.extractText($, selectors.publishDate);
    const price = this.extractText($, selectors.price);
    const specs = this.extractSpecs($, selectors.specs);

    // Generate content hash for deduplication
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

  /**
   * Extract text from selector
   */
  private extractText($: cheerio.CheerioAPI, selector?: string): string | null {
    if (!selector) return null;

    try {
      const element = $(selector).first();
      return element.text().trim() || null;
    } catch {
      return null;
    }
  }

  /**
   * Extract main content, handling multiple possible selectors
   */
  private extractContent($: cheerio.CheerioAPI, selector?: string): string | null {
    if (!selector) {
      // Try common content selectors
      const commonSelectors = [
        'article',
        '.article-content',
        '.post-content',
        '.entry-content',
        'main',
        '.content',
      ];

      for (const sel of commonSelectors) {
        const content = $(sel).first().text().trim();
        if (content && content.length > 100) {
          return this.cleanContent(content);
        }
      }

      // Fallback to body
      return this.cleanContent($('body').text().trim());
    }

    try {
      const content = $(selector).first().text().trim();
      return this.cleanContent(content);
    } catch {
      return null;
    }
  }

  /**
   * Extract specs from multiple selectors
   */
  private extractSpecs(
    $: cheerio.CheerioAPI,
    specSelectors?: Record<string, string>
  ): Record<string, string> {
    const specs: Record<string, string> = {};

    if (!specSelectors) return specs;

    for (const [key, selector] of Object.entries(specSelectors)) {
      try {
        const value = $(selector).first().text().trim();
        if (value) {
          specs[key] = value;
        }
      } catch {
        // Skip failed selectors
      }
    }

    return specs;
  }

  /**
   * Clean extracted content
   */
  private cleanContent(content: string): string {
    return content
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim()
      .substring(0, 50000); // Limit content length
  }

  /**
   * Generate SHA-256 hash for content
   */
  generateContentHash(content: string): string {
    const normalized = content.trim().replace(/\r\n/g, '\n');
    return createHash('sha256').update(normalized, 'utf8').digest('hex');
  }

  /**
   * Extract links from page
   */
  extractLinks($: cheerio.CheerioAPI, baseUrl: string, pattern?: string): string[] {
    const links: string[] = [];
    const base = new URL(baseUrl);

    $('a[href]').each((_, element) => {
      try {
        const href = $(element).attr('href');
        if (!href) return;

        const absoluteUrl = new URL(href, base).toString();

        // Filter by pattern if provided
        if (pattern && !absoluteUrl.includes(pattern)) return;

        // Only include same-domain links
        if (new URL(absoluteUrl).hostname === base.hostname) {
          links.push(absoluteUrl);
        }
      } catch {
        // Skip invalid URLs
      }
    });

    return [...new Set(links)]; // Remove duplicates
  }
}

export const contentParser = new ContentParser();
