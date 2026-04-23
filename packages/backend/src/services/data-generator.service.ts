/**
 * DataGeneratorService - AI 기반 초기 데이터 대량 생성 파이프라인
 *
 * ExternalAIAgentService를 활용하여 주제별로 AI에 질의하고,
 * 결과를 AnalyzedData 형태로 변환하여 DB에 저장합니다.
 *
 * 합법성: AI API를 정상 호출하여 합성된 분석 결과를 받는 것이며,
 * 특정 사이트 크롤링이 아닙니다. 모든 데이터에 'ai-generated' 태그를 부여합니다.
 */

import { externalAIAgent, sanitizeEntityName, isValidEntityName } from './external-ai-agent.service.js';
import { saveAnalyzedData } from './text-analyzer.service.js';
import type { AISearchRequest, AISearchResponse } from './external-ai-agent.service.js';
import type { AnalyzedData } from './text-analyzer.service.js';
import { db, humanoidRobots, companies, products, dataGeneratorJobs } from '../db/index.js';
import { eq, desc, inArray } from 'drizzle-orm';

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

  const companyFacts = response.facts.filter(f => f.category === 'company');
  const products = response.facts
    .filter(f => f.category === 'product')
    .map(f => {
      // description 또는 제품 이름에서 회사명 매칭 시도 (긴 이름부터 — "Figure AI"가 "Figure"보다 우선)
      const haystack = `${f.description} ${f.name}`;
      const companyFact = [...companyFacts]
        .sort((a, b) => b.name.length - a.name.length)
        .find(cf => haystack.toLowerCase().includes(cf.name.toLowerCase()));
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
 * 제품 설명·이름 텍스트에서 발표 연도·분기 추출.
 * 우선순위: "Q{1-4} YYYY" > "YYYY-MM" > 영문/한글 월 이름 근처의 연도 > 최신 연도만
 */
function extractAnnouncementDate(text: string): { year: number | null; quarter: number | null } {
  const t = text;

  // "Q1 2024" or "2024 Q1"
  const qMatch = t.match(/\b(?:Q([1-4])\s*(20\d{2})|(20\d{2})\s*Q([1-4]))\b/i);
  if (qMatch) {
    const year = parseInt((qMatch[2] || qMatch[3])!, 10);
    const quarter = parseInt((qMatch[1] || qMatch[4])!, 10);
    if (year >= 2015 && year <= 2035) return { year, quarter };
  }

  // "2024-03" or "2024-03-15"
  const ymMatch = t.match(/\b(20\d{2})-(\d{1,2})(?:-\d{1,2})?\b/);
  if (ymMatch) {
    const year = parseInt(ymMatch[1]!, 10);
    const month = parseInt(ymMatch[2]!, 10);
    if (year >= 2015 && year <= 2035 && month >= 1 && month <= 12) {
      return { year, quarter: Math.ceil(month / 3) };
    }
  }

  const lower = t.toLowerCase();
  const monthMap: Record<string, number> = {
    january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4,
    may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8,
    september: 9, sep: 9, october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
    '1월': 1, '2월': 2, '3월': 3, '4월': 4, '5월': 5, '6월': 6,
    '7월': 7, '8월': 8, '9월': 9, '10월': 10, '11월': 11, '12월': 12,
  };

  // 연도 기반 검색 — 최신 연도 선호 (announced in, to be released, etc.)
  const yearMatches = Array.from(lower.matchAll(/\b(20[1-3]\d)\b/g))
    .map(m => ({ year: parseInt(m[1]!, 10), index: m.index ?? 0 }))
    .filter(y => y.year >= 2015 && y.year <= 2035);
  if (yearMatches.length === 0) return { year: null, quarter: null };

  const latest = yearMatches.reduce((a, b) => (b.year > a.year ? b : a));
  let quarter: number | null = null;
  const window = lower.substring(Math.max(0, latest.index - 40), Math.min(lower.length, latest.index + 40));
  for (const [monthName, m] of Object.entries(monthMap)) {
    if (window.includes(monthName)) {
      quarter = Math.ceil(m / 3);
      break;
    }
  }
  return { year: latest.year, quarter };
}

/**
 * AI 응답에서 humanoid_robots 테이블에 저장할 로봇 추출 및 저장.
 * analyzedProducts는 convertToAnalyzedData에서 이미 company 매칭이 해결된 제품 리스트.
 */
async function saveHumanoidRobots(
  response: AISearchResponse,
  analyzedProducts: AnalyzedData['products']
): Promise<{ saved: number; skipped: { reason: string; name: string }[] }> {
  let saved = 0;
  const skipped: { reason: string; name: string }[] = [];

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

  // product 이름으로 원본 fact 찾기 위한 맵 (추출 텍스트 소스로 활용)
  const factByName = new Map<string, { name: string; description: string }>();
  for (const f of response.facts.filter(f => f.category === 'product')) {
    factByName.set(f.name, f);
  }

  for (const product of analyzedProducts) {
    const fact = factByName.get(product.name);
    const description = product.description || fact?.description || '';
    const desc = (description + ' ' + product.name).toLowerCase();

    const isRobot = /humanoid|로봇|robot|android|avatar|휴머노이드/i.test(desc);
    if (!isRobot) {
      skipped.push({ reason: 'not_robot', name: product.name });
      continue;
    }

    const existing = await db.select().from(humanoidRobots).where(eq(humanoidRobots.name, product.name)).limit(1);
    if (existing.length > 0) {
      skipped.push({ reason: 'duplicate', name: product.name });
      continue;
    }

    // analyzedProduct.companyName은 convertToAnalyzedData에서 매칭된 이름 — saveAnalyzedData가 DB에 생성해둠
    if (!product.companyName || product.companyName === 'Unknown') {
      skipped.push({ reason: 'no_company_match', name: product.name });
      continue;
    }
    const comp = await db.select().from(companies).where(eq(companies.name, product.companyName)).limit(1);
    if (comp.length === 0) {
      skipped.push({ reason: 'company_not_in_db', name: product.name });
      continue;
    }
    const companyId = comp[0]!.id;

    let locomotionType = 'bipedal';
    for (const [kw, type] of Object.entries(locomotionKeywords)) {
      if (desc.includes(kw)) { locomotionType = type; break; }
    }
    let purpose = 'service';
    for (const [kw, type] of Object.entries(purposeKeywords)) {
      if (desc.includes(kw)) { purpose = type; break; }
    }

    // 연도·분기 추출 — 없으면 NULL (타임라인에는 안 나타나지만, 그래도 DB에는 저장)
    const { year, quarter } = extractAnnouncementDate(description + ' ' + product.name + ' ' + (product.releaseDate ?? ''));

    try {
      await db.insert(humanoidRobots).values({
        companyId,
        name: product.name,
        announcementYear: year,
        announcementQuarter: quarter,
        purpose,
        locomotionType,
        handType: 'multi_finger',
        commercializationStage: 'prototype',
        region: 'global',
        description,
      });
      saved++;
    } catch (err) {
      skipped.push({ reason: `db_error: ${(err as Error).message}`, name: product.name });
    }
  }

  if (skipped.length > 0) {
    const counts = skipped.reduce((acc, s) => { acc[s.reason] = (acc[s.reason] ?? 0) + 1; return acc; }, {} as Record<string, number>);
    console.log(`[DataGenerator] saveHumanoidRobots: ${saved} saved, ${skipped.length} skipped —`, counts);
    const dropped = skipped.filter(s => s.reason !== 'duplicate' && s.reason !== 'not_robot');
    if (dropped.length > 0) {
      console.log(`[DataGenerator] dropped robots:`, dropped.slice(0, 10));
    }
  } else {
    console.log(`[DataGenerator] saveHumanoidRobots: ${saved} saved`);
  }

  return { saved, skipped };
}

// 기본 주제 목록 — 오늘 날짜 기준으로 동적 생성 (최근 90일 포커스)
function buildDefaultTopics(): GenerationTopic[] {
  const today = new Date();
  const ninetyDaysAgo = new Date(today);
  ninetyDaysAgo.setDate(today.getDate() - 90);
  const todayStr = today.toISOString().split('T')[0];
  const sinceStr = ninetyDaysAgo.toISOString().split('T')[0];

  return [
    {
      query: `오늘은 ${todayStr}입니다. ${sinceStr} 이후 (최근 90일 이내) 발표된 휴머노이드 로봇 업계 뉴스를 분석해주세요. 새로 공개된 제품, 신규 런칭, 시리즈 펀딩 클로징, 파트너십, 고용/채용 공고, 대량 배치 계약 등에 초점을 맞춰주세요. CES 2026(1월), MWC(2-3월) 같은 이미 끝난 이벤트의 발표는 제외하고, 정말 이번 달 또는 지난 달에 나온 신규 뉴스를 우선적으로 찾아주세요.`,
      targetTypes: ['company', 'product', 'market', 'technology'],
    },
    {
      query: `오늘은 ${todayStr}입니다. ${sinceStr} 이후 (최근 90일 이내) 휴머노이드 로봇 실제 배치·적용 사례, 신규 PoC, 파일럿 확장, 상용 계약을 분석해주세요. 물류·제조·건설·의료·서비스 분야에서 진짜로 새롭게 발표된 케이스만 포함해주세요.`,
      targetTypes: ['application', 'company', 'market'],
    },
  ];
}

export interface CollectionContext {
  lastCollectedAt: Date | null;
  knownCompanies: string[];
  knownProducts: string[];
}

class DataGeneratorService {
  /**
   * 이전 완료된 배치 잡에서 수집된 엔티티 목록과 마지막 수집 시각을 반환.
   * 다음 배치 실행 시 AI에 이미 알고 있는 엔티티를 제외하도록 지시할 때 사용.
   */
  async getCollectionContext(maxJobs = 5, maxNamesPerCategory = 80): Promise<CollectionContext> {
    const rows = await db
      .select()
      .from(dataGeneratorJobs)
      .where(eq(dataGeneratorJobs.status, 'completed'))
      .orderBy(desc(dataGeneratorJobs.finishedAt))
      .limit(maxJobs);

    if (rows.length === 0) {
      return { lastCollectedAt: null, knownCompanies: [], knownProducts: [] };
    }

    const companySet = new Set<string>();
    const productSet = new Set<string>();
    for (const row of rows) {
      const results = (row.results as GenerationResult[]) || [];
      for (const r of results) {
        for (const n of r.companyNames ?? []) if (n) companySet.add(n);
        for (const n of r.productNames ?? []) if (n) productSet.add(n);
      }
    }

    const lastCollectedAt = rows[0]?.finishedAt ?? null;

    return {
      lastCollectedAt,
      knownCompanies: Array.from(companySet).slice(0, maxNamesPerCategory),
      knownProducts: Array.from(productSet).slice(0, maxNamesPerCategory),
    };
  }

  /**
   * CollectionContext를 topic.query에 주입하여 AI가 기존 항목을 건너뛰도록 유도.
   * context가 없어도 오늘 날짜 기준 최신성 지시는 항상 포함한다.
   */
  private applyCollectionContext(topic: GenerationTopic, context: CollectionContext | undefined, defaultStart: string): { query: string; timeRangeStart: string } {
    const parts: string[] = [topic.query];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]!;

    // 항상: 오늘 날짜 고정 + "정말 최근" 강한 지시
    parts.push(`\n\n**오늘 날짜:** ${todayStr}. \"최신\"은 오늘로부터 30일 이내의 뉴스·발표만 의미합니다. 3개월 이상 된 뉴스(예: CES 2026 발표, MWC 2026)는 \"최신\"이 아닙니다.`);

    if (context?.lastCollectedAt) {
      const sinceStr = context.lastCollectedAt.toISOString().split('T')[0];
      parts.push(`\n\n**마지막 수집:** ${sinceStr}. 이 날짜 이후에 새로 나온 정보만 포함해주세요. 그 이전 정보는 이미 DB에 있습니다.`);
    }

    const excluded: string[] = [];
    if (context && context.knownCompanies.length > 0) excluded.push(`기업 (${context.knownCompanies.length}): ${context.knownCompanies.join(', ')}`);
    if (context && context.knownProducts.length > 0) excluded.push(`제품 (${context.knownProducts.length}): ${context.knownProducts.join(', ')}`);
    if (excluded.length > 0) {
      parts.push(`\n\n**이미 수집된 항목 (제외):**\n${excluded.join('\n')}\n\n위 목록에 없는 신규 기업·제품·뉴스·사례를 우선적으로 분석해주세요. 목록에 있는 항목이더라도 **업데이트된 최신 정보(새로운 모델, 버전, 발표)**가 있다면 포함하세요.`);
    }

    // timeRange.start: 기본값은 오늘-90일. 이전 수집이 있으면 (lastCollectedAt - 30)부터.
    const ninety = new Date(today);
    ninety.setDate(today.getDate() - 90);
    let timeRangeStart = ninety.toISOString().split('T')[0]!;

    if (context?.lastCollectedAt) {
      const buffered = new Date(context.lastCollectedAt);
      buffered.setDate(buffered.getDate() - 30);
      const bufferedStr = buffered.toISOString().split('T')[0]!;
      if (bufferedStr > timeRangeStart) timeRangeStart = bufferedStr;
    }

    // defaultStart보다 앞서가지 않도록 (하한)
    if (timeRangeStart < defaultStart) timeRangeStart = defaultStart;

    return { query: parts.join(''), timeRangeStart };
  }

  /**
   * 단일 주제로 데이터 생성 및 저장
   */
  async generateForTopic(
    topic: GenerationTopic,
    provider: 'chatgpt' | 'claude' = 'claude',
    webSearch: boolean = false,
    context?: CollectionContext
  ): Promise<GenerationResult> {
    const defaultStart = '2023-01-01';
    const defaultEnd = new Date().toISOString().split('T')[0]!;
    const { query, timeRangeStart } = this.applyCollectionContext(topic, context, defaultStart);

    const request: AISearchRequest = {
      query,
      targetTypes: topic.targetTypes,
      timeRange: { start: timeRangeStart, end: defaultEnd },
      region: topic.region || 'global',
      provider,
      webSearch,
    };

    try {
      const aiResponse = await externalAIAgent.search(request);
      const analyzedData = convertToAnalyzedData(aiResponse);
      const saveResult = await saveAnalyzedData(analyzedData);
      const robotResult = await saveHumanoidRobots(aiResponse, analyzedData.products);

      return {
        topic: topic.query.substring(0, 80),
        provider,
        ...saveResult,
        robotsSaved: robotResult.saved,
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
    const topicList = topics || buildDefaultTopics();

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

    // 이전 수집 히스토리로부터 이미 알고 있는 엔티티 목록과 마지막 수집 시각을 로드
    const context = await this.getCollectionContext();
    if (context.lastCollectedAt || context.knownCompanies.length > 0 || context.knownProducts.length > 0) {
      console.log(
        `[DataGenerator] Job ${jobId} using collection context: since=${context.lastCollectedAt?.toISOString() ?? 'none'}, known companies=${context.knownCompanies.length}, products=${context.knownProducts.length}`
      );
    }

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

      const result = await this.generateForTopic(topic, provider, webSearch, context);
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
    return buildDefaultTopics();
  }

  /**
   * AI 배치가 country='Unknown'으로 생성한 기업들을 알려진 본사 국가로 수정.
   * 또한 'Korea' 같은 비표준 표기를 'South Korea'로 통일.
   */
  async fixCompanyCountries(): Promise<{ updated: number; changes: { name: string; from: string; to: string }[] }> {
    const knownCountries: Record<string, string> = {
      'Tesla': 'USA',
      'Figure AI': 'USA',
      'Foundation': 'USA',
      'Foundation Robotics': 'USA',
      'Apptronik': 'USA',
      'Agility Robotics': 'USA',
      'Boston Dynamics': 'USA',
      'Diligent Robotics': 'USA',
      'Savioke': 'USA',
      '1X Technologies': 'Norway',
      'Unitree Robotics': 'China',
      'UBTECH': 'China',
      'Xiaomi': 'China',
      'Fourier Intelligence': 'China',
      'Kepler Robotics': 'China',
      'Kepler Robot': 'China',
      'Agibot': 'China',
      'LimX Dynamics': 'China',
      'Rebodis': 'China',
      'Honda': 'Japan',
      'Toyota': 'Japan',
      'SoftBank Robotics': 'Japan',
      'Rainbow Robotics': 'South Korea',
      'KAIST': 'South Korea',
      'LG Electronics': 'South Korea',
      'Samsung': 'South Korea',
      'Sanctuary AI': 'Canada',
      'PAL Robotics': 'Spain',
      'NEURA Robotics': 'Germany',
      'Engineered Arts': 'UK',
      'Humanoid': 'UK',
      'Mentee Robotics': 'Israel',
      'Aeolus Robotics': 'Taiwan',
    };

    const changes: { name: string; from: string; to: string }[] = [];

    // Pass 1: Unknown → 알려진 국가로 (이름 매칭 기준)
    for (const [name, correctCountry] of Object.entries(knownCountries)) {
      const rows = await db
        .select({ id: companies.id, country: companies.country })
        .from(companies)
        .where(eq(companies.name, name));
      for (const row of rows) {
        if (row.country !== correctCountry) {
          await db
            .update(companies)
            .set({ country: correctCountry, updatedAt: new Date() })
            .where(eq(companies.id, row.id));
          changes.push({ name, from: row.country, to: correctCountry });
        }
      }
    }

    return { updated: changes.length, changes };
  }

  /**
   * 공식 발표 근거 없이 DB에 남아있는 가짜 휴머노이드 로봇 이름 목록을 삭제.
   * 이전 seed 버전에서 insert됐던 행들을 정리한다.
   */
  async cleanupFabricatedRobots(): Promise<{ deleted: number; names: string[] }> {
    const fabricated = [
      'G1 Pro',
      'Optimus Production',
      'Atlas Pro',
      'Digit v3',
      'Phoenix Gen 8',
      'HUBO 2',
    ];
    const result = await db
      .delete(humanoidRobots)
      .where(inArray(humanoidRobots.name, fabricated))
      .returning({ id: humanoidRobots.id, name: humanoidRobots.name });
    return { deleted: result.length, names: result.map(r => r.name) };
  }

  /**
   * 이전 배치에서 뉴스 헤드라인이 엔티티 이름으로 들어간 것들을 찾아 정리.
   * isValidEntityName 실패 또는 sanitize 결과가 원본과 다른 companies/products를 반환.
   */
  async findInvalidEntities(): Promise<{
    invalidCompanies: { id: string; name: string; suggestedName: string; reason: string }[];
    invalidProducts: { id: string; name: string; suggestedName: string; reason: string }[];
  }> {
    const allCompanies = await db.select({ id: companies.id, name: companies.name }).from(companies);
    const allProducts = await db.select({ id: products.id, name: products.name }).from(products);

    const check = (name: string) => {
      const sanitized = sanitizeEntityName(name);
      const validOriginal = isValidEntityName(name, 'company');
      const validSanitized = isValidEntityName(sanitized, 'company');
      if (validOriginal && sanitized === name) return null;
      if (!validSanitized) return { suggestedName: sanitized, reason: 'invalid_headline' };
      return { suggestedName: sanitized, reason: 'sanitizable' };
    };

    const invalidCompanies = allCompanies
      .map(c => ({ ...c, ...(check(c.name) ?? {}) }))
      .filter((c: any) => c.suggestedName !== undefined) as any;
    const invalidProducts = allProducts
      .map(p => ({ ...p, ...(check(p.name) ?? {}) }))
      .filter((p: any) => p.suggestedName !== undefined) as any;

    return { invalidCompanies, invalidProducts };
  }

  /**
   * 뉴스 헤드라인이 이름으로 저장된 companies/products를 삭제.
   * FK로 연결된 products/articles 등은 cascade로 함께 삭제됨 (schema 기준).
   */
  async cleanupInvalidEntities(): Promise<{ deletedCompanies: number; deletedProducts: number }> {
    const { invalidCompanies, invalidProducts } = await this.findInvalidEntities();

    let deletedCompanies = 0;
    let deletedProducts = 0;

    if (invalidProducts.length > 0) {
      const ids = invalidProducts.map((p: any) => p.id);
      const res = await db.delete(products).where(inArray(products.id, ids)).returning({ id: products.id });
      deletedProducts = res.length;
    }
    if (invalidCompanies.length > 0) {
      const ids = invalidCompanies.map((c: any) => c.id);
      const res = await db.delete(companies).where(inArray(companies.id, ids)).returning({ id: companies.id });
      deletedCompanies = res.length;
    }

    return { deletedCompanies, deletedProducts };
  }

  /**
   * humanoid_robots 테이블 상태 조회 — 타임라인에 노출되는 비율 확인용
   */
  async getRobotStats(): Promise<{
    total: number;
    withYear: number;
    withoutYear: number;
    sampleMissing: { id: string; name: string; description: string | null }[];
  }> {
    const allRows = await db.select({
      id: humanoidRobots.id,
      name: humanoidRobots.name,
      announcementYear: humanoidRobots.announcementYear,
      description: humanoidRobots.description,
    }).from(humanoidRobots);

    const withYear = allRows.filter(r => r.announcementYear != null).length;
    const withoutYear = allRows.length - withYear;
    const sampleMissing = allRows
      .filter(r => r.announcementYear == null)
      .slice(0, 20)
      .map(r => ({ id: r.id, name: r.name, description: r.description }));

    return { total: allRows.length, withYear, withoutYear, sampleMissing };
  }

  /**
   * announcement_year가 NULL인 로봇들의 description에서 연도·분기를 재추출하여 업데이트.
   * 배치에서 수집되었지만 extractAnnouncementDate가 당시 없었거나 실패했던 로봇을 복구.
   */
  async backfillAnnouncementYears(): Promise<{
    processed: number;
    updated: number;
    stillMissing: number;
    updates: { name: string; year: number; quarter: number | null }[];
  }> {
    const rows = await db.select({
      id: humanoidRobots.id,
      name: humanoidRobots.name,
      description: humanoidRobots.description,
    }).from(humanoidRobots);

    const missing = rows.filter(r => r.description);
    const updates: { name: string; year: number; quarter: number | null }[] = [];
    let updated = 0;

    // announcement_year 컬럼을 별도로 체크하기 위해 재조회
    const currentYears = await db.select({
      id: humanoidRobots.id,
      year: humanoidRobots.announcementYear,
    }).from(humanoidRobots);
    const yearMap = new Map(currentYears.map(r => [r.id, r.year]));

    for (const row of missing) {
      if (yearMap.get(row.id) != null) continue; // 이미 연도 있음

      const { year, quarter } = extractAnnouncementDate((row.description ?? '') + ' ' + row.name);
      if (year == null) continue;

      await db
        .update(humanoidRobots)
        .set({ announcementYear: year, announcementQuarter: quarter, updatedAt: new Date() })
        .where(eq(humanoidRobots.id, row.id));

      updated++;
      updates.push({ name: row.name, year, quarter });
    }

    const stillMissing = missing.filter(r => yearMap.get(r.id) == null).length - updated;
    return { processed: missing.length, updated, stillMissing, updates };
  }
}

export const dataGeneratorService = new DataGeneratorService();
