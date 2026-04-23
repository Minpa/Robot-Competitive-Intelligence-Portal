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
import { db, humanoidRobots, companies, dataGeneratorJobs } from '../db/index.js';
import { eq } from 'drizzle-orm';

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
  robotsSaved: number;
  companyNames: string[];
  productNames: string[];
  articleTitles: string[];
  keywordTerms: string[];
  errors: string[];
}

export interface BatchResult {
  totalTopics: number;
  completed: number;
  failed: number;
  results: GenerationResult[];
  totalCost: string;
}

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface JobState {
  id: string;
  status: JobStatus;
  provider: string;
  webSearch: boolean;
  totalTopics: number;
  completed: number;
  failed: number;
  currentTopicIndex: number | null;
  currentTopicLabel: string | null;
  currentStep: string | null;
  results: GenerationResult[];
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
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

/**
 * AI 응답에서 humanoid_robots 테이블에 저장할 로봇 추출 및 저장
 */
async function saveHumanoidRobots(response: AISearchResponse): Promise<number> {
  let saved = 0;
  const productFacts = response.facts.filter(f => f.category === 'product');

  // locomotion type 추론
  const locomotionKeywords: Record<string, string> = {
    bipedal: 'bipedal', biped: 'bipedal', '2족': 'bipedal', '이족': 'bipedal',
    wheeled: 'wheeled', wheel: 'wheeled', '휠': 'wheeled', '바퀴': 'wheeled',
    hybrid: 'hybrid', '하이브리드': 'hybrid',
    quadruped: 'quadruped', '4족': 'quadruped', '사족': 'quadruped',
  };
  const purposeKeywords: Record<string, string> = {
    industrial: 'industrial', factory: 'industrial', manufacturing: 'industrial', '산업': 'industrial', '제조': 'industrial',
    service: 'service', hospital: 'service', hotel: 'service', retail: 'service', '서비스': 'service',
    home: 'home', domestic: 'home', '가정': 'home',
  };

  for (const fact of productFacts) {
    const desc = (fact.description + ' ' + fact.name).toLowerCase();

    // humanoid/robot 관련 키워드가 있는지 확인
    const isRobot = /humanoid|로봇|robot|android|avatar/i.test(desc);
    if (!isRobot) continue;

    // 이미 존재하는지 확인
    const existing = await db.select().from(humanoidRobots).where(eq(humanoidRobots.name, fact.name)).limit(1);
    if (existing.length > 0) continue;

    // 회사 찾기
    const companyFact = response.facts.find(cf => cf.category === 'company' && fact.description.includes(cf.name));
    let companyId: string | null = null;
    if (companyFact) {
      const comp = await db.select().from(companies).where(eq(companies.name, companyFact.name)).limit(1);
      if (comp.length > 0) companyId = comp[0]!.id;
    }
    if (!companyId) continue; // company_id는 NOT NULL

    // locomotion type 추론
    let locomotionType = 'bipedal';
    for (const [kw, type] of Object.entries(locomotionKeywords)) {
      if (desc.includes(kw)) { locomotionType = type; break; }
    }

    // purpose 추론
    let purpose = 'service';
    for (const [kw, type] of Object.entries(purposeKeywords)) {
      if (desc.includes(kw)) { purpose = type; break; }
    }

    try {
      await db.insert(humanoidRobots).values({
        companyId,
        name: fact.name,
        purpose,
        locomotionType,
        handType: 'multi_finger',
        commercializationStage: 'prototype',
        region: 'global',
        description: fact.description,
      });
      saved++;
    } catch {
      // 중복 등 무시
    }
  }
  return saved;
}

// 기본 주제 목록 - 핵심 2개 주제
const DEFAULT_TOPICS: GenerationTopic[] = [
  // 글로벌 휴머노이드 로봇 기업 & 제품 (미국+중국+일본/한국+유럽 통합)
  {
    query: '2024-2025년 글로벌 휴머노이드 로봇 기업과 제품 현황을 상세히 분석해줘. 미국(Tesla Optimus, Figure, Agility Digit, Apptronik Apollo), 중국(Unitree G1/H1, UBTECH Walker, Fourier GR-1/GR-2, Xiaomi CyberOne, Galbot, Agibot), 일본/한국(Honda, Toyota, SoftBank Robotics, Rainbow Robotics, Hyundai Robotics, Doosan Robotics), 유럽(ABB, KUKA, Universal Robots, PAL Robotics) 등 각 기업의 최신 제품, 출시일, 스펙, 가격대, 시장 포지션을 분석해줘.',
    targetTypes: ['company', 'product', 'market', 'technology'],
  },
  // 적용 사례 & 시장
  {
    query: '휴머노이드 로봇 적용 사례 분석. 물류(Amazon, Agility), 제조(BMW, Mercedes), 건설, 의료, 서비스 분야별 실제 배치 사례, PoC 결과, 투자 현황을 분석해줘.',
    targetTypes: ['application', 'company', 'market'],
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
      const robotsSaved = await saveHumanoidRobots(aiResponse);

      return {
        topic: topic.query.substring(0, 80),
        provider,
        ...saveResult,
        robotsSaved,
      };
    } catch (error) {
      return {
        topic: topic.query.substring(0, 80),
        provider,
        companiesSaved: 0,
        productsSaved: 0,
        articlesSaved: 0,
        keywordsSaved: 0,
        robotsSaved: 0,
        companyNames: [],
        productNames: [],
        articleTitles: [],
        keywordTerms: [],
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * 배치 잡을 DB에 생성하고 백그라운드에서 실행 시작. jobId를 즉시 반환.
   */
  async startBatch(
    provider: 'chatgpt' | 'claude' = 'claude',
    webSearch: boolean = false,
    topics?: GenerationTopic[]
  ): Promise<{ jobId: string }> {
    const topicList = topics || DEFAULT_TOPICS;

    const [job] = await db
      .insert(dataGeneratorJobs)
      .values({
        status: 'pending',
        provider,
        webSearch,
        totalTopics: topicList.length,
      })
      .returning({ id: dataGeneratorJobs.id });

    if (!job) throw new Error('배치 잡 생성 실패');

    // 백그라운드에서 실행 — await 하지 않음
    this.runBatchJob(job.id, topicList, provider, webSearch).catch(async (err) => {
      console.error('[DataGenerator] Background job crashed:', err);
      await db
        .update(dataGeneratorJobs)
        .set({
          status: 'failed',
          error: (err as Error).message || String(err),
          finishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(dataGeneratorJobs.id, job.id));
    });

    return { jobId: job.id };
  }

  /**
   * 백그라운드 잡 실행 — 주제별로 진행 상태를 DB에 실시간 반영
   */
  private async runBatchJob(
    jobId: string,
    topicList: GenerationTopic[],
    provider: 'chatgpt' | 'claude',
    webSearch: boolean
  ): Promise<void> {
    await db
      .update(dataGeneratorJobs)
      .set({ status: 'running', startedAt: new Date(), updatedAt: new Date() })
      .where(eq(dataGeneratorJobs.id, jobId));

    const results: GenerationResult[] = [];
    let completed = 0;
    let failed = 0;

    for (let i = 0; i < topicList.length; i++) {
      const topic = topicList[i]!;
      const topicLabel = topic.query.substring(0, 80);
      console.log(`[DataGenerator] Job ${jobId} topic ${i + 1}/${topicList.length}: ${topicLabel}...`);

      await db
        .update(dataGeneratorJobs)
        .set({
          currentTopicIndex: i,
          currentTopicLabel: topicLabel,
          currentStep: 'ai_call',
          updatedAt: new Date(),
        })
        .where(eq(dataGeneratorJobs.id, jobId));

      const result = await this.generateForTopic(topic, provider, webSearch);
      results.push(result);

      if (result.errors.length > 0 && result.companiesSaved === 0 && result.productsSaved === 0) {
        failed++;
        console.error(`[DataGenerator] Job ${jobId} topic ${i + 1} failed: ${result.errors[0]}`);
      } else {
        completed++;
        console.log(`[DataGenerator] Job ${jobId} topic ${i + 1} saved: ${result.companiesSaved} companies, ${result.productsSaved} products, ${result.keywordsSaved} keywords`);
      }

      await db
        .update(dataGeneratorJobs)
        .set({
          completed,
          failed,
          results: results as unknown[],
          updatedAt: new Date(),
        })
        .where(eq(dataGeneratorJobs.id, jobId));

      // API rate limit 방지 (30k input tokens/min 제한): 마지막 주제 이후에는 대기하지 않음
      if (i < topicList.length - 1) {
        await db
          .update(dataGeneratorJobs)
          .set({ currentStep: 'rate_limit_wait', updatedAt: new Date() })
          .where(eq(dataGeneratorJobs.id, jobId));
        await new Promise(resolve => setTimeout(resolve, 60000));
      }
    }

    await db
      .update(dataGeneratorJobs)
      .set({
        status: 'completed',
        currentStep: null,
        currentTopicIndex: null,
        currentTopicLabel: null,
        finishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(dataGeneratorJobs.id, jobId));
  }

  /**
   * 잡 상태 조회 (폴링용)
   */
  async getJobStatus(jobId: string): Promise<JobState | null> {
    const rows = await db.select().from(dataGeneratorJobs).where(eq(dataGeneratorJobs.id, jobId)).limit(1);
    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      status: row.status as JobStatus,
      provider: row.provider,
      webSearch: row.webSearch,
      totalTopics: row.totalTopics,
      completed: row.completed,
      failed: row.failed,
      currentTopicIndex: row.currentTopicIndex,
      currentTopicLabel: row.currentTopicLabel,
      currentStep: row.currentStep,
      results: (row.results as GenerationResult[]) || [],
      error: row.error,
      startedAt: row.startedAt ? row.startedAt.toISOString() : null,
      finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /**
   * 서버 재시작 후 고아 잡 정리 (running 상태로 남은 잡을 failed로 마킹)
   */
  async reconcileStaleJobs(): Promise<number> {
    const result = await db
      .update(dataGeneratorJobs)
      .set({
        status: 'failed',
        error: '서버 재시작으로 중단됨',
        finishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(dataGeneratorJobs.status, 'running'))
      .returning({ id: dataGeneratorJobs.id });
    return result.length;
  }

  /**
   * 기본 주제 목록 반환 (프론트엔드에서 확인용)
   */
  getDefaultTopics(): GenerationTopic[] {
    return DEFAULT_TOPICS;
  }
}

export const dataGeneratorService = new DataGeneratorService();
