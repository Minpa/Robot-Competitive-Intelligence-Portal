/**
 * DataGeneratorService - AI 기반 초기 데이터 대량 생성 파이프라인
 *
 * ExternalAIAgentService를 활용하여 주제별로 AI에 질의하고,
 * 결과를 AnalyzedData 형태로 변환하여 DB에 저장합니다.
 *
 * 합법성: AI API를 정상 호출하여 합성된 분석 결과를 받는 것이며,
 * 특정 사이트 크롤링이 아닙니다. 모든 데이터에 'ai-generated' 태그를 부여합니다.
 */

import { externalAIAgent } from './external-ai-agent.service.js';
import { saveAnalyzedData } from './text-analyzer.service.js';
import type { AISearchRequest, AISearchResponse } from './external-ai-agent.service.js';
import type { AnalyzedData } from './text-analyzer.service.js';

export interface GenerationTopic {
  query: string;
  targetTypes: AISearchRequest['targetTypes'];
  region?: string;
}

export interface GenerationResult {
  topic: string;
  provider: string;
  companiesSaved: number;
  productsSaved: number;
  articlesSaved: number;
  keywordsSaved: number;
  errors: string[];
}

export interface BatchResult {
  totalTopics: number;
  completed: number;
  failed: number;
  results: GenerationResult[];
  totalCost: string;
}

/**
 * AISearchResponse → AnalyzedData 변환
 */
function convertToAnalyzedData(response: AISearchResponse): AnalyzedData {
  const companies = response.facts
    .filter(f => f.category === 'company')
    .map(f => {
      // description에서 국가 정보 추출 시도
      const countryMatch = f.description.match(/\b(USA|China|Japan|Korea|Germany|Switzerland|Denmark|France|Spain|Canada|UK|Israel|India)\b/i);
      return {
        name: f.name,
        country: countryMatch?.[1] ?? 'Unknown',
        category: 'robotics',
        description: f.description,
      };
    });

  const products = response.facts
    .filter(f => f.category === 'product')
    .map(f => {
      // description에서 회사명 추출 시도
      const companyFact = response.facts.find(
        cf => cf.category === 'company' && f.description.includes(cf.name)
      );
      // description에서 날짜 추출 시도
      const dateMatch = f.description.match(/(\d{4})[-/](\d{1,2})/);
      const yearMatch = f.description.match(/(\d{4})년?/);
      // type 추출
      const typeKeywords: Record<string, string> = {
        humanoid: 'humanoid',
        cobot: 'cobot',
        quadruped: 'quadruped',
        industrial: 'industrial',
        service: 'service',
        logistics: 'logistics',
        amr: 'amr',
        actuator: 'actuator',
        soc: 'soc',
        foundation: 'foundation_model',
      };
      let productType = 'service';
      for (const [keyword, type] of Object.entries(typeKeywords)) {
        if (f.description.toLowerCase().includes(keyword) || f.name.toLowerCase().includes(keyword)) {
          productType = type;
          break;
        }
      }

      return {
        name: f.name,
        companyName: companyFact?.name || 'Unknown',
        type: productType,
        releaseDate: dateMatch ? `${dateMatch[1]!}-${dateMatch[2]!.padStart(2, '0')}` : yearMatch ? yearMatch[1]! : undefined,
        description: f.description,
      };
    });

  const keywords = response.facts
    .filter(f => ['keyword', 'technology', 'market', 'workforce'].includes(f.category))
    .map(f => f.name);

  // AI 생성 기사로 요약 저장
  const articles = [{
    title: `[AI 분석] ${response.summary.substring(0, 60)}...`,
    source: 'ai-generated',
    summary: response.summary,
    category: 'technology',
    productType: 'robot',
  }];

  return { companies, products, articles, keywords, summary: response.summary };
}

// 기본 주제 목록 - 휴머노이드 로봇 산업 전반을 커버
const DEFAULT_TOPICS: GenerationTopic[] = [
  // 주요 기업 & 제품
  {
    query: '2024-2025년 주요 휴머노이드 로봇 기업과 제품 현황. Tesla Optimus, Figure, Agility Digit, Unitree, UBTECH, Fourier, Apptronik Apollo 등 각 기업의 최신 제품, 출시일, 스펙, 가격대를 상세히 분석해줘.',
    targetTypes: ['company', 'product', 'technology'],
  },
  {
    query: '중국 휴머노이드 로봇 시장 분석. Unitree G1/H1, UBTECH Walker, Fourier GR-1/GR-2, Xiaomi CyberOne, Galbot, Agibot 등 중국 기업들의 제품, 기술력, 시장 전략을 분석해줘.',
    targetTypes: ['company', 'product', 'market'],
    region: 'China',
  },
  {
    query: '일본/한국 로봇 기업 현황. Honda, Toyota, SoftBank Robotics, Kawasaki, Rainbow Robotics, Hyundai Robotics, Doosan Robotics 등의 최신 제품과 시장 포지션을 분석해줘.',
    targetTypes: ['company', 'product', 'market'],
    region: 'Asia',
  },
  // 부품 & SoC
  {
    query: '로봇용 SoC/프로세서 시장 분석. NVIDIA Jetson, Qualcomm RB5/RB3, Intel Myriad, Hailo, Kneron, Rockchip 등 로봇에 사용되는 AI 칩셋의 TOPS, 전력, 가격, 적용 사례를 분석해줘.',
    targetTypes: ['product', 'component', 'technology'],
  },
  {
    query: '로봇용 액추에이터/모터 시장 분석. Harmonic Drive, Maxon, Faulhaber, Moog, 중국 액추에이터 기업들의 제품, 토크, RPM, 가격대를 분석해줘.',
    targetTypes: ['company', 'product', 'component'],
  },
  // 적용 사례 & 시장
  {
    query: '휴머노이드 로봇 적용 사례 분석. 물류(Amazon, Agility), 제조(BMW, Mercedes), 건설, 의료, 서비스 분야별 실제 배치 사례, PoC 결과, 투자 현황을 분석해줘.',
    targetTypes: ['application', 'company', 'market'],
  },
  {
    query: '로봇 산업 투자 동향 2023-2025. Figure AI, 1X Technologies, Apptronik, Sanctuary AI 등 주요 투자 라운드, 밸류에이션, 투자자 정보를 분석해줘.',
    targetTypes: ['company', 'market', 'workforce'],
  },
  // AI & 소프트웨어
  {
    query: '로봇 AI 파운데이션 모델 분석. RT-1, RT-2, RT-X, π₀, PaLM-E, Octo, OpenVLA 등 로봇 학습 모델의 아키텍처, 성능, 적용 사례를 분석해줘.',
    targetTypes: ['product', 'technology', 'keyword'],
  },
  // 유럽 시장
  {
    query: '유럽 로봇 기업 현황. ABB, KUKA, Universal Robots, PAL Robotics, Franka Emika, Agile Robots 등의 제품, 시장 점유율, 기술 방향을 분석해줘.',
    targetTypes: ['company', 'product', 'market'],
    region: 'Europe',
  },
  // 센서 & 비전
  {
    query: '로봇용 센서/비전 시스템 분석. LiDAR(Velodyne, Ouster), 카메라(Intel RealSense, Stereolabs ZED), 촉각 센서, IMU 등 로봇 센싱 기술과 주요 제품을 분석해줘.',
    targetTypes: ['product', 'component', 'technology'],
  },
];

class DataGeneratorService {
  /**
   * 단일 주제로 데이터 생성 및 저장
   */
  async generateForTopic(
    topic: GenerationTopic,
    provider: 'chatgpt' | 'claude' = 'claude',
    webSearch: boolean = false
  ): Promise<GenerationResult> {
    const request: AISearchRequest = {
      query: topic.query,
      targetTypes: topic.targetTypes,
      timeRange: { start: '2023-01-01', end: '2025-12-31' },
      region: topic.region || 'global',
      provider,
      webSearch,
    };

    try {
      const aiResponse = await externalAIAgent.search(request);
      const analyzedData = convertToAnalyzedData(aiResponse);
      const saveResult = await saveAnalyzedData(analyzedData);

      return {
        topic: topic.query.substring(0, 80),
        provider,
        ...saveResult,
      };
    } catch (error) {
      return {
        topic: topic.query.substring(0, 80),
        provider,
        companiesSaved: 0,
        productsSaved: 0,
        articlesSaved: 0,
        keywordsSaved: 0,
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * 기본 주제 목록으로 배치 데이터 생성
   */
  async generateBatch(
    provider: 'chatgpt' | 'claude' = 'claude',
    webSearch: boolean = false,
    topics?: GenerationTopic[]
  ): Promise<BatchResult> {
    const topicList = topics || DEFAULT_TOPICS;
    const results: GenerationResult[] = [];
    let completed = 0;
    let failed = 0;

    for (const topic of topicList) {
      console.log(`[DataGenerator] Processing: ${topic.query.substring(0, 60)}...`);

      const result = await this.generateForTopic(topic, provider, webSearch);
      results.push(result);

      if (result.errors.length > 0 && result.companiesSaved === 0 && result.productsSaved === 0) {
        failed++;
        console.error(`[DataGenerator] Failed: ${result.errors[0]}`);
      } else {
        completed++;
        console.log(`[DataGenerator] Saved: ${result.companiesSaved} companies, ${result.productsSaved} products, ${result.keywordsSaved} keywords`);
      }

      // API rate limit 방지: 3초 대기
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    return {
      totalTopics: topicList.length,
      completed,
      failed,
      results,
      totalCost: 'Check AI usage dashboard for actual cost',
    };
  }

  /**
   * 기본 주제 목록 반환 (프론트엔드에서 확인용)
   */
  getDefaultTopics(): GenerationTopic[] {
    return DEFAULT_TOPICS;
  }
}

export const dataGeneratorService = new DataGeneratorService();
