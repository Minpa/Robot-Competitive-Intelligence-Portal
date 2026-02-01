import axios from 'axios';

interface RobotsRule {
  userAgent: string;
  disallow: string[];
  allow: string[];
  crawlDelay?: number;
}

interface RobotsCache {
  rules: RobotsRule[];
  fetchedAt: number;
  sitemaps: string[];
}

/**
 * robots.txt 파서 및 준수 검사기
 * 웹 크롤링의 법적/윤리적 기준을 준수합니다.
 */
export class RobotsParser {
  private cache: Map<string, RobotsCache> = new Map();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간
  private readonly USER_AGENT = 'RCIPBot/1.0';
  private readonly TIMEOUT = 10000;

  /**
   * 특정 URL의 크롤링 허용 여부 확인
   */
  async isAllowed(url: string): Promise<{ allowed: boolean; crawlDelay?: number; reason?: string }> {
    try {
      const parsedUrl = new URL(url);
      const domain = `${parsedUrl.protocol}//${parsedUrl.host}`;
      const path = parsedUrl.pathname + parsedUrl.search;

      // robots.txt 가져오기 (캐시 활용)
      const robotsData = await this.fetchRobotsTxt(domain);
      
      if (!robotsData) {
        // robots.txt가 없으면 기본적으로 허용
        return { allowed: true, reason: 'No robots.txt found' };
      }

      // 규칙 확인 (우선순위: 특정 User-Agent > * > 기본 허용)
      const applicableRules = this.findApplicableRules(robotsData.rules);
      
      for (const rule of applicableRules) {
        // Allow 규칙 먼저 확인 (더 구체적인 규칙이 우선)
        for (const allowPath of rule.allow) {
          if (this.pathMatches(path, allowPath)) {
            return { 
              allowed: true, 
              crawlDelay: rule.crawlDelay,
              reason: `Explicitly allowed by ${rule.userAgent}` 
            };
          }
        }

        // Disallow 규칙 확인
        for (const disallowPath of rule.disallow) {
          if (this.pathMatches(path, disallowPath)) {
            return { 
              allowed: false, 
              crawlDelay: rule.crawlDelay,
              reason: `Disallowed by ${rule.userAgent}: ${disallowPath}` 
            };
          }
        }
      }

      // 규칙에 해당하지 않으면 허용
      const defaultRule = applicableRules[0];
      return { 
        allowed: true, 
        crawlDelay: defaultRule?.crawlDelay,
        reason: 'No matching disallow rule' 
      };
    } catch (error) {
      console.error(`[RobotsParser] Error checking ${url}:`, error);
      // 에러 시 보수적으로 허용 (하지만 로그 남김)
      return { allowed: true, reason: 'Error parsing robots.txt, allowing by default' };
    }
  }

  /**
   * robots.txt 가져오기 (캐시 활용)
   */
  private async fetchRobotsTxt(domain: string): Promise<RobotsCache | null> {
    const cached = this.cache.get(domain);
    const now = Date.now();

    // 캐시가 유효하면 반환
    if (cached && (now - cached.fetchedAt) < this.CACHE_TTL) {
      return cached;
    }

    try {
      const robotsUrl = `${domain}/robots.txt`;
      console.log(`[RobotsParser] Fetching: ${robotsUrl}`);

      const response = await axios.get(robotsUrl, {
        timeout: this.TIMEOUT,
        headers: {
          'User-Agent': this.USER_AGENT,
        },
        validateStatus: (status) => status < 500, // 4xx는 에러로 처리하지 않음
      });

      if (response.status === 404 || response.status === 403) {
        // robots.txt가 없거나 접근 불가 - 캐시에 빈 규칙 저장
        const emptyCache: RobotsCache = {
          rules: [],
          fetchedAt: now,
          sitemaps: [],
        };
        this.cache.set(domain, emptyCache);
        return null;
      }

      if (response.status !== 200) {
        return null;
      }

      const robotsData = this.parseRobotsTxt(response.data);
      robotsData.fetchedAt = now;
      this.cache.set(domain, robotsData);

      console.log(`[RobotsParser] Parsed ${domain}: ${robotsData.rules.length} rules`);
      return robotsData;
    } catch (error) {
      console.error(`[RobotsParser] Failed to fetch robots.txt for ${domain}:`, error);
      return null;
    }
  }

  /**
   * robots.txt 파싱
   */
  private parseRobotsTxt(content: string): RobotsCache {
    const lines = content.split('\n');
    const rules: RobotsRule[] = [];
    const sitemaps: string[] = [];
    
    let currentRule: RobotsRule | null = null;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      
      // 주석 및 빈 줄 무시
      if (!line || line.startsWith('#')) continue;

      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;

      const directive = line.substring(0, colonIndex).trim().toLowerCase();
      const value = line.substring(colonIndex + 1).trim();

      switch (directive) {
        case 'user-agent':
          // 새 User-Agent 블록 시작
          if (currentRule) {
            rules.push(currentRule);
          }
          currentRule = {
            userAgent: value.toLowerCase(),
            disallow: [],
            allow: [],
          };
          break;

        case 'disallow':
          if (currentRule && value) {
            currentRule.disallow.push(value);
          }
          break;

        case 'allow':
          if (currentRule && value) {
            currentRule.allow.push(value);
          }
          break;

        case 'crawl-delay':
          if (currentRule) {
            const delay = parseFloat(value);
            if (!isNaN(delay)) {
              currentRule.crawlDelay = delay * 1000; // 초 -> 밀리초
            }
          }
          break;

        case 'sitemap':
          if (value) {
            sitemaps.push(value);
          }
          break;
      }
    }

    // 마지막 규칙 추가
    if (currentRule) {
      rules.push(currentRule);
    }

    return { rules, fetchedAt: 0, sitemaps };
  }

  /**
   * 적용 가능한 규칙 찾기 (우선순위 순)
   */
  private findApplicableRules(rules: RobotsRule[]): RobotsRule[] {
    const botName = this.USER_AGENT.toLowerCase();
    const applicable: RobotsRule[] = [];

    // 1. 정확히 일치하는 User-Agent
    for (const rule of rules) {
      if (rule.userAgent === botName || botName.includes(rule.userAgent)) {
        applicable.push(rule);
      }
    }

    // 2. 와일드카드 (*) User-Agent
    for (const rule of rules) {
      if (rule.userAgent === '*') {
        applicable.push(rule);
      }
    }

    return applicable;
  }

  /**
   * 경로 매칭 (와일드카드 지원)
   */
  private pathMatches(path: string, pattern: string): boolean {
    if (!pattern) return false;

    // 빈 Disallow는 모든 것을 허용
    if (pattern === '') return false;

    // 정확한 매칭 또는 접두사 매칭
    if (pattern.endsWith('$')) {
      // $ 는 정확한 매칭
      return path === pattern.slice(0, -1);
    }

    // * 와일드카드 처리
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '\\?'));
      return regex.test(path);
    }

    // 접두사 매칭
    return path.startsWith(pattern);
  }

  /**
   * 캐시 클리어
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 특정 도메인의 캐시 클리어
   */
  clearDomainCache(domain: string): void {
    this.cache.delete(domain);
  }

  /**
   * User-Agent 반환
   */
  getUserAgent(): string {
    return this.USER_AGENT;
  }
}

export const robotsParser = new RobotsParser();
