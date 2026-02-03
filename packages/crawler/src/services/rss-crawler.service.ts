import Parser from 'rss-parser';
import { createHash } from 'crypto';
import type { CollectedItem } from '../types.js';

/**
 * RSS 피드 기반 크롤러
 * 
 * 법적으로 안전한 데이터 수집:
 * - RSS는 언론사가 공식 제공하는 데이터
 * - 제목, 링크, 발행일만 수집
 * - 본문 수집 안 함
 */

export interface RssFeed {
  name: string;
  url: string;
  category: 'robot' | 'ai' | 'tech' | 'industry';
  language: 'en' | 'ko';
}

// 로봇/AI 관련 공식 RSS 피드 목록
export const RSS_FEEDS: RssFeed[] = [
  // === 로봇 전문 ===
  {
    name: 'The Robot Report',
    url: 'https://www.therobotreport.com/feed/',
    category: 'robot',
    language: 'en',
  },
  {
    name: 'IEEE Spectrum Robotics',
    url: 'https://spectrum.ieee.org/feeds/topic/robotics.rss',
    category: 'robot',
    language: 'en',
  },
  {
    name: 'Robotics Business Review',
    url: 'https://www.roboticsbusinessreview.com/feed/',
    category: 'robot',
    language: 'en',
  },
  
  // === AI/Tech ===
  {
    name: 'MIT Technology Review - AI',
    url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed',
    category: 'ai',
    language: 'en',
  },
  {
    name: 'VentureBeat AI',
    url: 'https://venturebeat.com/category/ai/feed/',
    category: 'ai',
    language: 'en',
  },
  
  // === 기업 공식 블로그 ===
  {
    name: 'Boston Dynamics Blog',
    url: 'https://bostondynamics.com/blog/feed/',
    category: 'robot',
    language: 'en',
  },
  
  // === arXiv (오픈 액세스) ===
  {
    name: 'arXiv Robotics',
    url: 'https://rss.arxiv.org/rss/cs.RO',
    category: 'robot',
    language: 'en',
  },
];

export class RssCrawlerService {
  private parser: Parser;

  constructor() {
    this.parser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'RCIPBot/1.0 (RSS Reader)',
      },
    });
  }

  /**
   * 모든 RSS 피드에서 기사 수집
   */
  async fetchAllFeeds(): Promise<{
    items: CollectedItem[];
    errors: { feed: string; error: string }[];
  }> {
    const items: CollectedItem[] = [];
    const errors: { feed: string; error: string }[] = [];

    for (const feed of RSS_FEEDS) {
      try {
        console.log(`[RSS] Fetching: ${feed.name}`);
        const feedItems = await this.fetchFeed(feed);
        items.push(...feedItems);
        console.log(`[RSS] ${feed.name}: ${feedItems.length} items`);
      } catch (error) {
        const errorMsg = (error as Error).message;
        console.error(`[RSS] Failed to fetch ${feed.name}: ${errorMsg}`);
        errors.push({ feed: feed.name, error: errorMsg });
      }
    }

    console.log(`[RSS] Total: ${items.length} items, ${errors.length} errors`);
    return { items, errors };
  }

  /**
   * 단일 RSS 피드에서 기사 수집
   */
  async fetchFeed(feed: RssFeed): Promise<CollectedItem[]> {
    const result = await this.parser.parseURL(feed.url);
    const items: CollectedItem[] = [];

    for (const entry of result.items || []) {
      if (!entry.link || !entry.title) continue;

      const item: CollectedItem = {
        url: entry.link,
        type: 'article',
        title: entry.title,
        // 본문은 저장하지 않음 (저작권 보호)
        content: undefined,
        publishDate: entry.pubDate || entry.isoDate,
        contentHash: this.generateHash(entry.link),
        collectedAt: new Date(),
      };

      items.push(item);
    }

    return items;
  }

  /**
   * URL 기반 해시 생성 (중복 체크용)
   */
  private generateHash(url: string): string {
    return createHash('md5').update(url).digest('hex');
  }

  /**
   * 피드 목록 조회
   */
  getFeeds(): RssFeed[] {
    return RSS_FEEDS;
  }

  /**
   * 카테고리별 피드 조회
   */
  getFeedsByCategory(category: RssFeed['category']): RssFeed[] {
    return RSS_FEEDS.filter(f => f.category === category);
  }
}

export const rssCrawlerService = new RssCrawlerService();
