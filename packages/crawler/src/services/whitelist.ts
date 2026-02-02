/**
 * 크롤링 허용 화이트리스트
 * 
 * 공식 언론사 및 합법적 배포처만 포함
 * - 저작권 침해물이 아닌 정상 콘텐츠만 링크
 * - 각 사이트의 robots.txt 및 이용약관 준수 여부 확인됨
 * 
 * 추가 기준:
 * 1. 공식 언론사 또는 기업 공식 사이트
 * 2. robots.txt에서 크롤링 허용
 * 3. 이용약관에서 링크 제공 금지하지 않음
 */

export interface WhitelistEntry {
  domain: string;
  name: string;
  type: 'news' | 'company' | 'research' | 'industry';
  robotsChecked: boolean;
  termsChecked: boolean;
  notes?: string;
}

export const CRAWL_WHITELIST: WhitelistEntry[] = [
  // === 로봇 전문 뉴스 ===
  {
    domain: 'therobotreport.com',
    name: 'The Robot Report',
    type: 'news',
    robotsChecked: true,
    termsChecked: true,
    notes: '로봇 산업 전문 뉴스',
  },
  {
    domain: 'roboticsbusinessreview.com',
    name: 'Robotics Business Review',
    type: 'news',
    robotsChecked: true,
    termsChecked: true,
  },
  {
    domain: 'spectrum.ieee.org',
    name: 'IEEE Spectrum',
    type: 'research',
    robotsChecked: true,
    termsChecked: true,
    notes: '기술 연구 저널',
  },

  // === 한국 뉴스 ===
  {
    domain: 'irobotnews.com',
    name: '로봇신문',
    type: 'news',
    robotsChecked: true,
    termsChecked: true,
    notes: '한국 로봇 전문 뉴스',
  },
  {
    domain: 'hellot.net',
    name: '헬로티',
    type: 'news',
    robotsChecked: true,
    termsChecked: true,
    notes: '산업 기술 뉴스',
  },
  {
    domain: 'etnews.com',
    name: '전자신문',
    type: 'news',
    robotsChecked: true,
    termsChecked: true,
    notes: 'IT/전자 전문 뉴스',
  },

  // === 기업 공식 사이트 (보도자료) ===
  {
    domain: 'bostondynamics.com',
    name: 'Boston Dynamics',
    type: 'company',
    robotsChecked: true,
    termsChecked: true,
    notes: '공식 보도자료만 수집',
  },
  {
    domain: 'figure.ai',
    name: 'Figure AI',
    type: 'company',
    robotsChecked: true,
    termsChecked: true,
  },
  {
    domain: 'unitree.com',
    name: 'Unitree Robotics',
    type: 'company',
    robotsChecked: true,
    termsChecked: true,
  },
  {
    domain: 'agilityrobotics.com',
    name: 'Agility Robotics',
    type: 'company',
    robotsChecked: true,
    termsChecked: true,
  },

  // === 연구/학술 ===
  {
    domain: 'arxiv.org',
    name: 'arXiv',
    type: 'research',
    robotsChecked: true,
    termsChecked: true,
    notes: '오픈 액세스 논문 (CC 라이선스)',
  },
];

/**
 * 도메인이 화이트리스트에 있는지 확인
 */
export function isWhitelisted(url: string): { allowed: boolean; entry?: WhitelistEntry; reason: string } {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    
    const entry = CRAWL_WHITELIST.find(e => 
      hostname === e.domain || hostname.endsWith('.' + e.domain)
    );

    if (entry) {
      return {
        allowed: true,
        entry,
        reason: `Whitelisted: ${entry.name} (${entry.type})`,
      };
    }

    return {
      allowed: false,
      reason: `Domain not in whitelist: ${hostname}`,
    };
  } catch {
    return {
      allowed: false,
      reason: 'Invalid URL',
    };
  }
}

/**
 * 화이트리스트 통계
 */
export function getWhitelistStats(): { total: number; byType: Record<string, number> } {
  const byType: Record<string, number> = {};
  
  for (const entry of CRAWL_WHITELIST) {
    byType[entry.type] = (byType[entry.type] || 0) + 1;
  }

  return {
    total: CRAWL_WHITELIST.length,
    byType,
  };
}
