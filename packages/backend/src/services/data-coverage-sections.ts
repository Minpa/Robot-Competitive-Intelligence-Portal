/**
 * 데이터 커버리지 — 쿼리 결과(Res<...>)를 7개 구역의 지표·표로 만드는 순수 빌더. DB 접근 금지.
 * 지표 ID 는 스냅샷 키이므로 바꾸지 않는다(변경 시 스냅샷 schemaVersion 조정 필요).
 */

import type {
  CoverageCellValue,
  CoverageKind,
  CoverageMetric,
  CoverageReason,
  CoverageSection,
  CoverageSectionId,
  CoverageTable,
  CoverageTableColumn,
  CoverageTableRow,
} from '../types/data-coverage.js';
import {
  BACKLOG_IMPOSSIBLE_TEXT,
  SOURCE_GROUPS,
  buildSectionStatus,
  classifySource,
  computeBacklogEta,
  computeRatio,
  findZeroChannels90d,
  foldIngestRows,
  projectMonthEnd,
  sanitizeErrorMessage,
  severityForAtLeastOne,
  severityForAuditAge,
  severityForProjected,
  severityForRunAge,
  severityForUsedPct,
  sortChannels,
  type DupKind,
  type DupResult,
  type Qa1Row,
  type Severity,
} from './data-coverage-aggregate.js';
import type {
  AiProviderRow,
  AiTagRow,
  AutoCompaniesData,
  CiData,
  CiLayerRow,
  CiStagingData,
  ComponentsData,
  CrawlData,
  CrawlErrorRow,
  FieldNulls,
  HandBenchmarkData,
  Qa2Row,
  Res,
  RobotCounts,
  SourcingData,
  SupplierData,
} from './data-coverage-queries.js';
import type { AuditReport } from './data-audit.service.js';

export const TABLE_ROW_LIMIT = 50;

// ── 입력 ──

export interface CollectorEntry {
  finishedAt: string | null;
  trigger: string | null;
  ok: boolean | null;
  durationMs: number | null;
  saved: number | null;
  errorCount: number | null;
  [k: string]: unknown;
}

export interface CollectLast {
  updatedAt: string | null;
  config: Record<string, boolean | null>;
  collectors: Record<string, CollectorEntry | undefined>;
}

export interface CoverageLimits {
  claudeMonthlyLimitUsd: number;
  videoTaggingDailyLimit: number;
  paperSummaryDailyLimit: number;
  geminiBatchLimit: number;
}

export interface GeminiScopeView {
  domainFilter: readonly string[];
  sinceDays: number;
  requireDemoSignal: boolean;
  maxAttempts: number;
}

export interface CoverageBundles {
  qa1: Res<Qa1Row[]>;
  qa2: Res<Qa2Row[]>;
  qa6: Res<DupResult>;
  robots: Res<RobotCounts>;
  bodyFields: Res<FieldNulls>;
  handFields: Res<FieldNulls>;
  powerFields: Res<FieldNulls>;
  components: Res<ComponentsData>;
  supplier: Res<SupplierData>;
  sourcing: Res<SourcingData>;
  ci: Res<CiData>;
  ciByLayer: Res<CiLayerRow[]>;
  ciStaging: Res<CiStagingData>;
  handBenchmark: Res<HandBenchmarkData>;
  aiProvider: Res<AiProviderRow[]>;
  aiTag: Res<AiTagRow[]>;
  aiLoggedTags: Res<{ tag: string; calls: number }[]>;
  autoCompanies: Res<AutoCompaniesData>;
  crawl: Res<CrawlData>;
  crawlErrors: Res<CrawlErrorRow[]>;
  /** 수집 실행 요약(collect:last). 마커가 없으면 data=null */
  collect: Res<CollectLast | null>;
  /** 최신 감사 리포트(읽기 전용). 없으면 data=null */
  audit: Res<AuditReport | null>;
}

export interface SectionInputs {
  now: Date;
  monthStart: Date;
  bundles: CoverageBundles;
  limits: CoverageLimits;
  geminiScope: GeminiScopeView;
}

// ── 지표 레지스트리(§5) ──

interface MetricDef {
  section: CoverageSectionId;
  id: string;
  label: string;
  kind: CoverageKind;
  good: CoverageMetric['goodDirection'];
}

const REG: MetricDef[] = [];
const D = (section: CoverageSectionId, id: string, label: string, kind: CoverageKind, good: MetricDef['good'] = 'neutral') => {
  REG.push({ section, id, label, kind, good });
};
const FOCUS_DOMAINS = [
  ['hand', '핸드'],
  ['actuator', '액추에이터'],
] as const;

// ingest
D('ingest', 'ingest.total', '전체 기사 수', 'count', 'up');
D('ingest', 'ingest.zeroChannels90d', '최근 90일 0건 채널 수', 'count', 'down');
// collectRun
D('collectRun', 'run.lastFinishedAt', '마지막 수집 종료 시각', 'datetime');
D('collectRun', 'run.ageHours', '마지막 수집 후 경과 시간', 'hours');
D('collectRun', 'run.youtube.channelsProcessed', 'YouTube 처리 채널 수', 'count', 'up');
D('collectRun', 'run.youtube.channelsSkipped', 'YouTube 스킵 채널 수', 'count', 'down');
D('collectRun', 'run.quota.exhausted', 'YouTube 쿼터 소진 감지', 'bool');
D('collectRun', 'run.quota.searchCalls', '검색 호출 수', 'count');
D('collectRun', 'run.quota.estimatedUnits', '추정 쿼터 사용 단위', 'count');
for (const [k, l] of [
  ['youtubeApiKeyConfigured', 'YouTube API 키 설정 여부'],
  ['githubTokenConfigured', 'GitHub 토큰 설정 여부'],
  ['htmlCrawlerEnabled', 'HTML 크롤러 활성 여부'],
  ['legalCollectDisabled', '레거시 수집 비활성 여부'],
  ['collectOnStartup', '기동 시 수집 여부'],
] as const) D('collectRun', `run.config.${k}`, l, 'bool');
// analysis
D('analysis', 'analysis.video.total', '영상 수', 'count');
D('analysis', 'analysis.video.tagged', '태깅된 영상', 'count', 'up');
D('analysis', 'analysis.video.tagRate', '영상 태깅률', 'ratio', 'up');
D('analysis', 'analysis.video.untagged', '태깅 대기(백로그)', 'count', 'down');
D('analysis', 'analysis.video.taggedLlm', 'LLM 태깅 영상', 'count', 'up');
D('analysis', 'analysis.video.taggedHeuristic', '휴리스틱 태깅 영상', 'count');
D('analysis', 'analysis.video.taggedUnknownMethod', '방식 미상 태깅 영상', 'count');
D('analysis', 'analysis.video.llmRate', 'LLM 태깅 비율', 'ratio', 'up');
D('analysis', 'analysis.video.heuristicRate', '휴리스틱 태깅 비율', 'ratio', 'down');
D('analysis', 'analysis.gemini.scopeTotal', 'Gemini 범위 내 영상', 'count');
D('analysis', 'analysis.gemini.scopeAnalyzed', 'Gemini 분석 완료', 'count', 'up');
D('analysis', 'analysis.gemini.scopePending', 'Gemini 분석 대기', 'count', 'down');
D('analysis', 'analysis.gemini.scopeExhausted', 'Gemini 시도 한도 도달', 'count', 'down');
D('analysis', 'analysis.gemini.scopeRate', '범위 내 Gemini 분석률', 'ratio', 'up');
D('analysis', 'analysis.gemini.analyzedAll', '전체 Gemini 분석 영상', 'count', 'up');
D('analysis', 'analysis.gemini.summaryKoRate', '영상 한국어 요약 보유율', 'ratio', 'up');
D('analysis', 'analysis.paper.total', '논문 수', 'count');
D('analysis', 'analysis.paper.summarized', '요약된 논문', 'count', 'up');
D('analysis', 'analysis.paper.rate', '논문 요약률', 'ratio', 'up');
D('analysis', 'analysis.paper.backlog', '논문 요약 대기(백로그)', 'count', 'down');
D('analysis', 'analysis.paper.rate30d', '최근 30일 수집 논문 요약률', 'ratio', 'up');
for (const [d, l] of FOCUS_DOMAINS) {
  D('analysis', `analysis.focus.${d}.judged`, `${l} 판정 영상`, 'count', 'up');
  D('analysis', `analysis.focus.${d}.primary`, `${l} 주요(primary) 영상`, 'count');
  D('analysis', `analysis.focus.${d}.secondary`, `${l} 부수(secondary) 영상`, 'count');
  D('analysis', `analysis.focus.${d}.none`, `${l} 무관(none) 영상`, 'count');
  D('analysis', `analysis.focus.${d}.rateApprox`, `${l} 판정 비율(근사)`, 'ratio', 'up');
  D('analysis', `analysis.focus.${d}.papersJudged`, `${l} 판정 논문`, 'count', 'up');
  D('analysis', `analysis.topics.${d}.classified`, `${l} 서브토픽 분류 건수`, 'count', 'up');
  D('analysis', `analysis.topics.${d}.rate`, `${l} 서브토픽 분류 비율`, 'ratio', 'up');
}
D('analysis', 'analysis.article.keyPointsRate', '기사 핵심 포인트 보유율', 'ratio', 'up');
D('analysis', 'analysis.article.keyPoints30d', '최근 30일 게시 기사 핵심 포인트 보유율', 'ratio', 'up');
D('analysis', 'analysis.robotTagGap.videos', '로봇 태그 미연결 영상', 'count', 'down');
// aiCost
D('aiCost', 'cost.claude.usedMonth', 'Claude 월 누적', 'usd', 'down');
D('aiCost', 'cost.claude.limit', 'Claude 월 한도', 'usd');
D('aiCost', 'cost.claude.usedPct', 'Claude 한도 대비 사용률', 'ratio', 'down');
D('aiCost', 'cost.claude.projectedMonthEnd', 'Claude 월말 예상', 'usd', 'down');
D('aiCost', 'cost.month.totalAllProviders', '전 공급자 월 누적', 'usd', 'down');
D('aiCost', 'cost.loggedTags.missing', '비용 미기록 작업 수', 'count', 'down');
// specs
D('specs', 'specs.robots.total', '로봇 수(전체)', 'count');
D('specs', 'specs.robots.confirmed', '확정 로봇 수', 'count');
D('specs', 'specs.robots.forecast', '예측 로봇 수', 'count');
D('specs', 'specs.robots.noBodySpecs', '신체 스펙 행 없는 확정 로봇', 'count', 'down');
D('specs', 'specs.audit.totalRobots', '감사 대상 로봇 수', 'count');
D('specs', 'specs.audit.averageCompleteness', '감사 평균 완성도', 'ratio', 'up');
D('specs', 'specs.audit.staleRobotCount', '감사 stale 로봇 수', 'count', 'down');
D('specs', 'specs.audit.runAt', '감사 기준 시각', 'datetime');
D('specs', 'specs.supplier.total', '공급사 제품 수', 'count');
D('specs', 'specs.sourcing.unconfirmed', '조달 태세 확인 불가', 'count', 'down');
D('specs', 'specs.ci.competitors', 'CI 활성 경쟁사 수', 'count');
D('specs', 'specs.ci.items', 'CI 항목 수', 'count');
D('specs', 'specs.ci.expectedCells', 'CI 기대 셀 수', 'count');
D('specs', 'specs.ci.filledCells', 'CI 채워진 셀', 'count', 'up');
D('specs', 'specs.ci.emptyCells', 'CI 빈 셀', 'count', 'down');
D('specs', 'specs.ci.emptyRate', 'CI 빈 셀 비율', 'ratio', 'down');
D('specs', 'specs.ci.lowConfidenceRate', 'CI D·F 신뢰도 비율', 'ratio', 'down');
D('specs', 'specs.ciStaging.pending', 'CI 스테이징 대기', 'count', 'down');
D('specs', 'specs.handBenchmark.competitors', '핸드 벤치마크 경쟁사', 'count');
D('specs', 'specs.handBenchmark.missingCells', '핸드 벤치마크 빈 셀', 'count', 'down');
// quality
D('quality', 'quality.entityTitles.total', '엔티티 포함 제목', 'count', 'down');
D('quality', 'quality.companyNull.total', '회사 미연결 기사', 'ratio', 'down');
D('quality', 'quality.publishedNull.total', '게시일 없는 기사', 'ratio', 'down');
for (const [k, l] of [
  ['urlNorm', '정규화 URL'],
  ['arxivId', 'arXiv ID'],
  ['videoId', '영상 ID'],
] as const) {
  D('quality', `quality.dup.${k}`, `${l} 중복(제거 가능 행)`, 'count', 'down');
  D('quality', `quality.dup.${k}.groups`, `${l} 중복 그룹`, 'count', 'down');
  D('quality', `quality.dup.${k}.rows`, `${l} 중복 그룹 소속 행`, 'count', 'down');
  D('quality', `quality.dup.${k}.redundant`, `${l} 제거 가능 행`, 'count', 'down');
}
D('quality', 'quality.dup.unparsableUrl', 'URL 파싱 불가 행', 'count', 'down');
D('quality', 'quality.autoCompanies.count', '자동 생성 회사', 'count', 'down');
D('quality', 'quality.robotTagGap', '로봇 태그 미연결 영상', 'count', 'down');
// crawlTargets
D('crawlTargets', 'crawl.targets.total', '크롤 타깃 수', 'count');
D('crawlTargets', 'crawl.targets.enabled', '활성 타깃', 'count');
D('crawlTargets', 'crawl.targets.disabled', '비활성 타깃', 'count');
D('crawlTargets', 'crawl.targets.neverCrawled', '한 번도 수집되지 않은 타깃', 'count', 'down');
D('crawlTargets', 'crawl.targets.lastCrawledMax', '가장 최근 수집 시각', 'datetime');
D('crawlTargets', 'crawl.jobs.stuckRunning', '정체된 running 잡', 'count', 'down');
D('crawlTargets', 'crawl.jobs.last30d', '최근 30일 잡 처리 건수 합', 'count');
D('crawlTargets', 'crawl.sealedState', '봉인 상태', 'text');

const TABLE_REG: { section: CoverageSectionId; id: string; label: string }[] = [];
const T = (section: CoverageSectionId, id: string, label: string) => TABLE_REG.push({ section, id, label });
T('ingest', 'ingest.byGroup', '소스군별 수집량');
T('ingest', 'ingest.byProductType', '제품유형별 수집량');
T('ingest', 'ingest.byChannel', 'YouTube 채널별 수집량');
T('ingest', 'ingest.zeroChannels90d.list', '최근 90일 0건 채널');
T('collectRun', 'run.collectors', '수집기별 마지막 실행');
T('collectRun', 'run.legal.bySource', '레거시 수집기 소스별 결과');
T('collectRun', 'run.youtube.skippedChannels', '스킵된 YouTube 채널');
T('analysis', 'analysis.gemini.byDomain', '도메인별 분석 현황');
T('analysis', 'analysis.gemini.outOfScope', 'Gemini 범위 밖 사유');
T('aiCost', 'cost.byProvider', '공급자별(이번 달)');
T('aiCost', 'cost.byTag', '작업별 비용(이번 달)');
T('aiCost', 'cost.loggedTags', '비용 기록 여부(최근 30일)');
T('aiCost', 'cost.backlogEta', '백로그 소진 예상');
T('specs', 'specs.bodyFields', '신체 스펙 필드별 결측');
T('specs', 'specs.handFields', '핸드 스펙 필드별 결측');
T('specs', 'specs.powerFields', '전원 스펙 필드별 결측');
T('specs', 'specs.audit.missingBySection', '감사: 스펙 구역별 완성도 0 로봇');
T('specs', 'specs.components.countByType', '부품 수(유형별)');
T('specs', 'specs.components.specKeys', '부품 스펙 키별 채움');
T('specs', 'specs.supplier.fields', '공급사 제품 필드별 결측');
T('specs', 'specs.sourcing', '조달 태세 분포');
T('specs', 'specs.ci.confidence', 'CI 신뢰도 분포');
T('specs', 'specs.ci.byLayer', 'CI 레이어별 빈 셀');
T('quality', 'quality.bySource', '소스군별 품질');
T('quality', 'quality.language', '언어 분포');
T('quality', 'quality.dup.samples', '중복 샘플');
T('quality', 'quality.autoCompanies.samples', '자동 생성 회사 샘플');
T('crawlTargets', 'crawl.jobsByStatus', '크롤 잡 상태 분포');
T('crawlTargets', 'crawl.errorsTop', '최근 30일 오류 상위');

export const METRIC_REGISTRY: readonly MetricDef[] = REG;
export const TABLE_REGISTRY: readonly { section: CoverageSectionId; id: string; label: string }[] = TABLE_REG;
const DEF_BY_ID = new Map(REG.map((d) => [d.id, d]));

export const SECTION_ORDER: readonly { id: CoverageSectionId; titleKo: string }[] = [
  { id: 'ingest', titleKo: '소스별 수집량' },
  { id: 'collectRun', titleKo: '수집 실행' },
  { id: 'analysis', titleKo: '분석률' },
  { id: 'aiCost', titleKo: 'AI 비용' },
  { id: 'specs', titleKo: '스펙 채움률' },
  { id: 'quality', titleKo: '데이터 품질' },
  { id: 'crawlTargets', titleKo: '크롤 타깃' },
];

// ── 빌더 도구 ──

interface Out {
  value: number | string | boolean | null;
  numerator?: number | null;
  denominator?: number | null;
  severity?: Severity;
  note?: string | null;
  /** 값을 낼 수 없는 정상 사유(해당 없음) */
  na?: Exclude<CoverageReason, null>;
}

/** 여러 Res 를 묶는다. 하나라도 실패하면 첫 실패를 돌려준다. */
export function all<T extends unknown[]>(...rs: { [K in keyof T]: Res<T[K]> }): Res<T> {
  const data: unknown[] = [];
  for (const r of rs as Res<unknown>[]) {
    if (!r.ok) return r;
    data.push(r.data);
  }
  return { ok: true, data: data as T };
}

class SectionBuilder {
  metrics: CoverageMetric[] = [];
  tables: CoverageTable[] = [];
  notes: string[] = [];
  constructor(readonly id: CoverageSectionId) {}

  private base(id: string): CoverageMetric {
    const def = DEF_BY_ID.get(id);
    if (!def) throw new Error(`unknown metric id: ${id}`);
    return {
      id,
      label: def.label,
      kind: def.kind,
      value: null,
      numerator: null,
      denominator: null,
      status: 'ok',
      reason: null,
      errorMessage: null,
      baseline: null,
      delta: null,
      goodDirection: def.good,
      severity: 'ok',
      note: null,
    };
  }

  failed(id: string, reason: Exclude<CoverageReason, null>, message: string | null): void {
    this.metrics.push({ ...this.base(id), status: 'failed', reason, errorMessage: message ? sanitizeErrorMessage(message) : null });
  }

  /** res 가 실패면 실패 지표, 아니면 fn 결과로 채운다. fn 이 던지면 query_failed. */
  m<T>(id: string, res: Res<T>, fn: (d: T) => Out): void {
    if (!res.ok) return this.failed(id, res.reason, res.message);
    try {
      const o = fn(res.data);
      const b = this.base(id);
      if (o.na) {
        this.metrics.push({ ...b, status: 'na', reason: o.na, numerator: o.numerator ?? null, denominator: o.denominator ?? null, note: o.note ?? null });
        return;
      }
      this.metrics.push({
        ...b,
        value: o.value,
        numerator: o.numerator ?? null,
        denominator: o.denominator ?? null,
        severity: o.severity ?? 'ok',
        note: o.note ?? null,
      });
    } catch (err) {
      this.failed(id, 'query_failed', err instanceof Error ? err.message : String(err));
    }
  }

  /** 다른 구역의 지표에 의존하는 값 — 의존 쿼리가 실패하면 dependency_failed */
  dep<T>(id: string, res: Res<T>, fn: (d: T) => Out): void {
    if (!res.ok) return this.failed(id, 'dependency_failed', res.message);
    this.m(id, res, fn);
  }

  ratio<T>(id: string, res: Res<T>, fn: (d: T) => [number, number], extra?: (d: T) => Partial<Out>): void {
    this.m(id, res, (d) => {
      const [num, den] = fn(d);
      const r = computeRatio(num, den);
      const x = extra ? extra(d) : {};
      if (r.na) return { value: null, numerator: num, denominator: den, na: 'no_data', ...x };
      return { value: r.value, numerator: num, denominator: den, ...x };
    });
  }

  /** 표. rows 가 상한을 넘으면 앞쪽 TABLE_ROW_LIMIT 개만 싣는다. */
  t<T>(
    id: string,
    res: Res<T>,
    columns: CoverageTableColumn[],
    fn: (d: T) => { rows: CoverageTableRow[]; totalRows?: number; diffable?: boolean },
    opts: { naReason?: Exclude<CoverageReason, null>; naWhen?: (d: T) => boolean } = {},
  ): void {
    const def = TABLE_REG.find((x) => x.id === id);
    const label = def?.label ?? id;
    const empty: CoverageTable = { id, label, columns, rows: [], totalRows: 0, truncated: false, diffable: false, status: 'ok', reason: null };
    if (!res.ok) {
      this.tables.push({ ...empty, status: 'failed', reason: res.reason });
      return;
    }
    try {
      if (opts.naWhen?.(res.data)) {
        this.tables.push({ ...empty, status: 'na', reason: opts.naReason ?? 'no_data' });
        return;
      }
      const o = fn(res.data);
      const total = o.totalRows ?? o.rows.length;
      this.tables.push({
        ...empty,
        rows: o.rows.slice(0, TABLE_ROW_LIMIT),
        totalRows: total,
        truncated: total > TABLE_ROW_LIMIT,
        diffable: o.diffable ?? false,
      });
    } catch {
      this.tables.push({ ...empty, status: 'failed', reason: 'query_failed' });
    }
  }

  done(titleKo: string): CoverageSection {
    const status = buildSectionStatus(this.metrics, this.tables);
    return {
      id: this.id,
      titleKo,
      status,
      reason: status === 'na' ? 'no_data' : null,
      metrics: this.metrics,
      tables: this.tables,
      notes: this.notes,
    };
  }
}

const col = (key: string, label: string, kind: CoverageKind = 'count'): CoverageTableColumn => ({ key, label, kind });
const row = (key: string, cells: Record<string, CoverageCellValue>): CoverageTableRow => ({ key, cells });
const sum = <T>(xs: readonly T[], f: (x: T) => number) => xs.reduce((s, x) => s + f(x), 0);

/** 섹션 전체 실패 대체 — 등록된 모든 지표·표를 failed 로 채운다 */
export function failedSection(id: CoverageSectionId, titleKo: string, reason: Exclude<CoverageReason, null>, message: string): CoverageSection {
  const b = new SectionBuilder(id);
  for (const d of REG.filter((x) => x.section === id)) b.failed(d.id, reason, message);
  for (const t of TABLE_REG.filter((x) => x.section === id)) {
    b.tables.push({ id: t.id, label: t.label, columns: [], rows: [], totalRows: 0, truncated: false, diffable: false, status: 'failed', reason });
  }
  const s = b.done(titleKo);
  return { ...s, status: 'failed', reason };
}

// ── 수집 실행 요약 파서(크롤러가 쓴 값은 신뢰하지 않고 화이트리스트로만 읽는다) ──

const COLLECT_CONFIG_KEYS = ['youtubeApiKeyConfigured', 'githubTokenConfigured', 'htmlCrawlerEnabled', 'legalCollectDisabled', 'collectOnStartup'] as const;
const COLLECT_COLLECTORS = ['legal', 'arxivHand', 'arxivActuator', 'youtube', 'eventSearch', 'topicSearch'] as const;
const CHANNELS_MAX = 500;

const asStr = (v: unknown, max = 200): string | null => (typeof v === 'string' ? v.slice(0, max) : null);
const asNum = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const asBool = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export function parseCollectLast(summary: unknown): CollectLast | null {
  if (!isObj(summary)) return null;
  const config: Record<string, boolean | null> = {};
  const rawCfg = isObj(summary['config']) ? summary['config'] : {};
  for (const k of COLLECT_CONFIG_KEYS) config[k] = asBool(rawCfg[k]);
  const collectors: Record<string, CollectorEntry | undefined> = {};
  const rawCols = isObj(summary['collectors']) ? summary['collectors'] : {};
  for (const k of COLLECT_COLLECTORS) {
    const e = rawCols[k];
    if (!isObj(e)) continue;
    const entry: CollectorEntry = {
      finishedAt: asStr(e['finishedAt'], 40),
      trigger: asStr(e['trigger'], 20),
      ok: asBool(e['ok']),
      durationMs: asNum(e['durationMs']),
      saved: asNum(e['saved']),
      errorCount: asNum(e['errorCount']),
    };
    for (const nk of ['channelsProcessed', 'channelsSkipped', 'searchCalls', 'estimatedQuotaUnits'] as const) {
      const v = asNum(e[nk]);
      if (v !== null) entry[nk] = v;
    }
    const q = asBool(e['quotaExhausted']);
    if (q !== null) entry['quotaExhausted'] = q;
    if (Array.isArray(e['skippedChannels'])) {
      entry['skippedChannels'] = e['skippedChannels']
        .slice(0, CHANNELS_MAX)
        .map((x) => (typeof x === 'string' ? { name: x.slice(0, 120) } : isObj(x) ? { name: asStr(x['name'], 120) ?? '', reason: asStr(x['reason'], 120) } : null))
        .filter((x) => x !== null);
    }
    if (Array.isArray(e['channels'])) {
      entry['channels'] = e['channels']
        .slice(0, CHANNELS_MAX)
        .filter(isObj)
        .map((c) => ({ name: asStr(c['name'], 120) ?? '', official: c['official'] === true, status: asStr(c['status'], 20), fetched: asNum(c['fetched']), inserted: asNum(c['inserted']) }));
    }
    if (Array.isArray(e['bySource'])) {
      entry['bySource'] = e['bySource']
        .slice(0, 20)
        .filter(isObj)
        .map((r) => ({ source: asStr(r['source'], 40), success: asBool(r['success']), count: asNum(r['count']), error: asStr(r['error'], 200) }));
    }
    collectors[k] = entry;
  }
  return { updatedAt: asStr(summary['updatedAt'], 40), config, collectors };
}

// ── 구역 1: ingest ──

const CHANNEL_NOTE = '수집 실행 요약 없음: 한 번도 수집되지 않은 채널은 누락될 수 있음';

function buildIngest(inp: SectionInputs): CoverageSection {
  const b = new SectionBuilder('ingest');
  const { qa1, collect } = inp.bundles;
  b.notes.push('수집 시각(collected_at) 기준 집계입니다.');
  b.m('ingest.total', qa1, (rows) => ({ value: foldIngestRows(rows).total }));
  b.t(
    'ingest.byGroup',
    qa1,
    [col('total', '전체'), col('c7', '7일'), col('c30', '30일'), col('lastCollectedAt', '마지막 수집', 'datetime')],
    (rows) => {
      const f = foldIngestRows(rows);
      return {
        diffable: true,
        rows: SOURCE_GROUPS.map((g) => row(g, { total: f.byGroup[g].total, c7: f.byGroup[g].c7, c30: f.byGroup[g].c30, lastCollectedAt: f.byGroup[g].lastCollectedAt })),
      };
    },
  );
  b.t('ingest.byProductType', qa1, [col('total', '전체'), col('c7', '7일'), col('c30', '30일')], (rows) => {
    const f = foldIngestRows(rows);
    const list = [...f.byProductType.entries()].sort((a, c) => c[1].total - a[1].total || a[0].localeCompare(c[0]));
    return { diffable: true, rows: list.map(([k, v]) => row(k, { total: v.total, c7: v.c7, c30: v.c30 })) };
  });
  b.t(
    'ingest.byChannel',
    qa1,
    [col('thirdParty', '제3자', 'bool'), col('total', '전체'), col('c7', '7일'), col('c30', '30일'), col('lastCollectedAt', '마지막 수집', 'datetime')],
    (rows) => {
      const list = sortChannels(foldIngestRows(rows).byChannel);
      return {
        totalRows: list.length,
        rows: list.slice(0, TABLE_ROW_LIMIT).map((c) =>
          row(c.channel, { thirdParty: c.official === 0 && c.thirdParty > 0, total: c.total, c7: c.c7, c30: c.c30, lastCollectedAt: c.lastCollectedAt }),
        ),
      };
    },
  );

  // 설정 채널 목록(수집 실행 요약). 요약이 없거나 읽기 실패면 DB 기반 집합만 쓴다
  const configured: string[] | null =
    collect.ok && collect.data
      ? ((collect.data.collectors['youtube']?.['channels'] as { name?: unknown; official?: unknown }[] | undefined) ?? [])
          .filter((c) => c && c.official === true && typeof c.name === 'string')
          .map((c) => String(c.name))
      : null;
  const hasConfigured = configured !== null && configured.length > 0;
  const zero = (rows: Qa1Row[]) => findZeroChannels90d(foldIngestRows(rows).byChannel, hasConfigured ? configured : null);
  b.m('ingest.zeroChannels90d', qa1, (rows) => ({ value: zero(rows).length }));
  b.t('ingest.zeroChannels90d.list', qa1, [col('total', '전체 수집'), col('lastCollectedAt', '마지막 수집', 'datetime')], (rows) => {
    const list = zero(rows);
    return { totalRows: list.length, rows: list.map((z) => row(z.name, { total: z.total, lastCollectedAt: z.lastCollectedAt })) };
  });
  if (!hasConfigured) b.notes.push(CHANNEL_NOTE);
  return b.done('소스별 수집량');
}

// ── 구역 2: collectRun ──

const COLLECTOR_ORDER = ['legal', 'arxivHand', 'arxivActuator', 'youtube', 'eventSearch', 'topicSearch'] as const;
const LEGAL_SOURCES = ['arxiv', 'github', 'sec_edgar', 'patent'] as const;
const QUOTA_UNITS_PER_SEARCH = 100;

const numOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function buildCollectRun(inp: SectionInputs): CoverageSection {
  const b = new SectionBuilder('collectRun');
  const collect = inp.bundles.collect;
  b.notes.push('YouTube 쿼터 잔량은 API 로 조회할 수 없어 표시하지 않습니다. 소진 감지와 추정 사용량만 표시합니다.');
  if (collect.ok && collect.data === null) {
    b.notes.push('수집 실행 요약(collect:last)이 아직 없습니다. 크롤러 배포 전이거나 아직 실행되지 않았습니다.');
    for (const d of REG.filter((x) => x.section === 'collectRun')) {
      b.metrics.push({
        id: d.id, label: d.label, kind: d.kind, value: null, numerator: null, denominator: null, status: 'na', reason: 'no_data',
        errorMessage: null, baseline: null, delta: null, goodDirection: d.good, severity: 'ok', note: null,
      });
    }
    for (const t of TABLE_REG.filter((x) => x.section === 'collectRun')) {
      b.tables.push({ id: t.id, label: t.label, columns: [], rows: [], totalRows: 0, truncated: false, diffable: false, status: 'na', reason: 'no_data' });
    }
    return { ...b.done('수집 실행'), status: 'na', reason: 'no_data' };
  }

  const data: Res<CollectLast> = collect.ok ? { ok: true, data: collect.data as CollectLast } : collect;
  const entry = (c: CollectLast, k: string) => c.collectors[k];

  b.t(
    'run.collectors',
    data,
    [col('finishedAt', '종료 시각', 'datetime'), col('trigger', '트리거', 'text'), col('ok', '성공', 'bool'), col('saved', '저장 건수'), col('errorCount', '오류 수')],
    (c) => ({
      rows: COLLECTOR_ORDER.map((k) => {
        const e = entry(c, k);
        return row(k, { finishedAt: e?.finishedAt ?? null, trigger: e?.trigger ?? null, ok: e?.ok ?? null, saved: e?.saved ?? null, errorCount: e?.errorCount ?? null });
      }),
    }),
  );
  const finishedList = (c: CollectLast) =>
    COLLECTOR_ORDER.map((k) => entry(c, k)?.finishedAt)
      .filter((x): x is string => typeof x === 'string' && !Number.isNaN(Date.parse(x)))
      .sort((a, z) => Date.parse(z) - Date.parse(a));
  b.m('run.lastFinishedAt', data, (c) => {
    const l = finishedList(c)[0];
    return l ? { value: l } : { value: null, na: 'no_data' };
  });
  b.m('run.ageHours', data, (c) => {
    const l = finishedList(c)[0];
    if (!l) return { value: null, na: 'no_data' };
    const hours = Math.max(0, (inp.now.getTime() - Date.parse(l)) / 3_600_000);
    return { value: Math.round(hours * 10) / 10, severity: severityForRunAge(hours) };
  });
  b.t('run.legal.bySource', data, [col('success', '성공', 'bool'), col('count', '건수'), col('error', '오류', 'text')], (c) => {
    const list = (entry(c, 'legal')?.['bySource'] as { source?: unknown; success?: unknown; count?: unknown; error?: unknown }[] | undefined) ?? [];
    return {
      rows: LEGAL_SOURCES.map((s) => {
        const r = list.find((x) => x && x.source === s);
        return row(s, { success: typeof r?.success === 'boolean' ? r.success : null, count: numOrNull(r?.count), error: typeof r?.error === 'string' ? sanitizeErrorMessage(r.error, 200) : null });
      }),
    };
  });

  const yt = (c: CollectLast) => entry(c, 'youtube');
  b.m('run.youtube.channelsProcessed', data, (c) => {
    const v = numOrNull(yt(c)?.['channelsProcessed']);
    return v === null ? { value: null, na: 'no_data' } : { value: v };
  });
  b.m('run.youtube.channelsSkipped', data, (c) => {
    const v = numOrNull(yt(c)?.['channelsSkipped']);
    return v === null ? { value: null, na: 'no_data' } : { value: v, severity: severityForAtLeastOne(v) };
  });
  b.t('run.youtube.skippedChannels', data, [col('reason', '사유', 'text')], (c) => {
    const list = (yt(c)?.['skippedChannels'] as unknown[] | undefined) ?? [];
    const rows = list.map((x) => {
      const o = typeof x === 'string' ? { name: x } : (x as { name?: unknown; reason?: unknown });
      return row(String(o?.name ?? '').slice(0, 120), { reason: typeof (o as { reason?: unknown })?.reason === 'string' ? sanitizeErrorMessage((o as { reason: string }).reason, 120) : null });
    });
    return { totalRows: rows.length, rows };
  }, { naWhen: (c) => yt(c) === undefined });

  const quotaEntries = (c: CollectLast) => (['youtube', 'eventSearch', 'topicSearch'] as const).map((k) => entry(c, k)).filter((e): e is CollectorEntry => !!e);
  b.m('run.quota.exhausted', data, (c) => {
    const es = quotaEntries(c);
    if (es.length === 0) return { value: null, na: 'no_data' };
    const hit = es.some((e) => e['quotaExhausted'] === true);
    return { value: hit, severity: hit ? 'warn' : 'ok' };
  });
  b.m('run.quota.searchCalls', data, (c) => {
    const es = quotaEntries(c).filter((e) => numOrNull(e['searchCalls']) !== null);
    return es.length === 0 ? { value: null, na: 'no_data' } : { value: sum(es, (e) => e['searchCalls'] as number) };
  });
  b.m('run.quota.estimatedUnits', data, (c) => {
    const es = quotaEntries(c).filter((e) => numOrNull(e['estimatedQuotaUnits']) !== null || numOrNull(e['searchCalls']) !== null);
    if (es.length === 0) return { value: null, na: 'no_data' };
    return {
      value: sum(es, (e) => numOrNull(e['estimatedQuotaUnits']) ?? (e['searchCalls'] as number) * QUOTA_UNITS_PER_SEARCH),
      note: `검색 호출당 ${QUOTA_UNITS_PER_SEARCH} 단위 가정`,
    };
  });
  for (const k of ['youtubeApiKeyConfigured', 'githubTokenConfigured', 'htmlCrawlerEnabled', 'legalCollectDisabled', 'collectOnStartup'] as const) {
    b.m(`run.config.${k}`, data, (c) => {
      const v = c.config[k];
      return typeof v === 'boolean' ? { value: v } : { value: null, na: 'no_data' };
    });
  }
  return b.done('수집 실행');
}

// ── 구역 3: analysis ──

function inScope(domain: string | null, scope: GeminiScopeView): boolean {
  if (scope.domainFilter.length === 0) return true;
  return domain !== null && scope.domainFilter.includes(domain);
}

function buildAnalysis(inp: SectionInputs): CoverageSection {
  const b = new SectionBuilder('analysis');
  const { qa1, qa2 } = inp.bundles;
  const scope = inp.geminiScope;
  b.notes.push('도메인 판정 비율은 근사치입니다. 기술 트렌드의 스코프 판정(matchesDomainVideo)을 SQL 로 재현할 수 없어 domain 메타 기준 분모를 씁니다.');
  b.notes.push(`Gemini 범위는 서비스 설정(도메인 ${scope.domainFilter.length > 0 ? scope.domainFilter.join(',') : '전체'}, 게시 ${scope.sinceDays}일 이내, 시도 한도 ${scope.maxAttempts}회, 데모 신호 ${scope.requireDemoSignal ? '필수' : '불필요'})와 같은 값입니다.`);

  const total = (rows: Qa2Row[]) => sum(rows, (r) => r.total);
  const tagged = (rows: Qa2Row[]) => sum(rows, (r) => r.tagged);
  const llm = (rows: Qa2Row[]) => sum(rows, (r) => r.taggedLlm);
  const heur = (rows: Qa2Row[]) => sum(rows, (r) => r.taggedHeuristic);
  const scoped = (rows: Qa2Row[]) => rows.filter((r) => inScope(r.domain, scope));
  b.m('analysis.video.total', qa2, (r) => ({ value: total(r) }));
  b.m('analysis.video.tagged', qa2, (r) => ({ value: tagged(r) }));
  b.ratio('analysis.video.tagRate', qa2, (r) => [tagged(r), total(r)]);
  b.m('analysis.video.untagged', qa2, (r) => ({ value: total(r) - tagged(r) }));
  b.m('analysis.video.taggedLlm', qa2, (r) => ({ value: llm(r) }));
  b.m('analysis.video.taggedHeuristic', qa2, (r) => ({ value: heur(r) }));
  b.m('analysis.video.taggedUnknownMethod', qa2, (r) => ({ value: tagged(r) - llm(r) - heur(r) }));
  b.ratio('analysis.video.llmRate', qa2, (r) => [llm(r), tagged(r)]);
  b.ratio('analysis.video.heuristicRate', qa2, (r) => [heur(r), tagged(r)]);

  b.m('analysis.gemini.scopeTotal', qa2, (r) => ({ value: sum(scoped(r), (x) => x.scopeTotal) }));
  b.m('analysis.gemini.scopeAnalyzed', qa2, (r) => ({ value: sum(scoped(r), (x) => x.scopeAnalyzed) }));
  b.m('analysis.gemini.scopePending', qa2, (r) => ({ value: sum(scoped(r), (x) => x.scopePending) }));
  b.m('analysis.gemini.scopeExhausted', qa2, (r) => ({ value: sum(scoped(r), (x) => x.scopeExhausted) }));
  b.ratio('analysis.gemini.scopeRate', qa2, (r) => [sum(scoped(r), (x) => x.scopeAnalyzed), sum(scoped(r), (x) => x.scopeTotal)]);
  b.m('analysis.gemini.analyzedAll', qa2, (r) => ({ value: sum(r, (x) => x.geminiAnalyzed) }));
  b.ratio('analysis.gemini.summaryKoRate', qa2, (r) => [sum(r, (x) => x.geminiSummaryKo), sum(r, (x) => x.geminiAnalyzed)]);
  b.t(
    'analysis.gemini.byDomain',
    qa2,
    [col('total', '영상 수'), col('tagged', '태깅'), col('geminiAnalyzed', '분석 완료'), col('scopePending', '범위 내 대기')],
    (rows) => ({
      diffable: true,
      rows: [...rows]
        .sort((a, c) => c.total - a.total || String(a.domain).localeCompare(String(c.domain)))
        .map((r) => row(r.domain ?? '(none)', { total: r.total, tagged: r.tagged, geminiAnalyzed: r.geminiAnalyzed, scopePending: inScope(r.domain, scope) ? r.scopePending : 0 })),
    }),
  );
  b.t('analysis.gemini.outOfScope', qa2, [col('count', '건수')], (rows) => ({
    diffable: true,
    rows: [
      row('domainMismatch', { count: sum(rows.filter((r) => !inScope(r.domain, scope)), (r) => r.total) }),
      row('noTags', { count: sum(scoped(rows), (r) => r.noTags) }),
      row('tooOld', { count: sum(scoped(rows), (r) => r.tooOld) }),
    ],
  }));

  const arxivRows = (rows: Qa1Row[]) => rows.filter((r) => classifySource(r.source) === 'arxiv');
  const pTotal = (rows: Qa1Row[]) => sum(arxivRows(rows), (r) => r.total);
  const pSum = (rows: Qa1Row[]) => sum(arxivRows(rows), (r) => r.arxivSummary);
  b.m('analysis.paper.total', qa1, (r) => ({ value: pTotal(r) }));
  b.m('analysis.paper.summarized', qa1, (r) => ({ value: pSum(r) }));
  b.ratio('analysis.paper.rate', qa1, (r) => [pSum(r), pTotal(r)]);
  b.m('analysis.paper.backlog', qa1, (r) => ({ value: pTotal(r) - pSum(r) }));
  b.ratio('analysis.paper.rate30d', qa1, (r) => [sum(arxivRows(r), (x) => x.arxivSummary30), sum(arxivRows(r), (x) => x.c30)]);

  for (const [d] of FOCUS_DOMAINS) {
    const key = d === 'hand' ? 'focusHand' : 'focusActuator';
    const topicKey = d === 'hand' ? 'handTopics' : 'actuatorTopics';
    const vid = (rows: Qa2Row[]) => rows.filter((r) => r.domain === d);
    b.m(`analysis.focus.${d}.judged`, qa2, (r) => ({ value: sum(r, (x) => x[key].judged) }));
    b.m(`analysis.focus.${d}.primary`, qa2, (r) => ({ value: sum(r, (x) => x[key].primary) }));
    b.m(`analysis.focus.${d}.secondary`, qa2, (r) => ({ value: sum(r, (x) => x[key].secondary) }));
    b.m(`analysis.focus.${d}.none`, qa2, (r) => ({ value: sum(r, (x) => x[key].none) }));
    b.ratio(`analysis.focus.${d}.rateApprox`, qa2, (r) => [sum(r, (x) => x[key].judged), sum(vid(r), (x) => x.focusRecent90)], () => ({
      note: '근사: 분모는 domain 메타 기준 최근 90일 게시 영상',
    }));
    b.m(`analysis.focus.${d}.papersJudged`, qa1, (r) => ({ value: sum(arxivRows(r), (x) => x[key].judged) }));
    const both = all<[Qa2Row[], Qa1Row[]]>(qa2, qa1);
    b.m(`analysis.topics.${d}.classified`, both, ([v, p]) => ({ value: sum(v, (x) => x[topicKey]) + sum(arxivRows(p), (x) => x[topicKey]) }));
    b.ratio(
      `analysis.topics.${d}.rate`,
      both,
      ([v, p]) => [
        sum(v, (x) => x[topicKey]) + sum(arxivRows(p), (x) => x[topicKey]),
        sum(v, (x) => x[key].primary + x[key].secondary) + sum(arxivRows(p), (x) => x[key].primary + x[key].secondary),
      ],
    );
  }

  b.ratio('analysis.article.keyPointsRate', qa1, (r) => [sum(r, (x) => x.newsKeyPoints), sum(r, (x) => x.newsTotal)]);
  b.ratio('analysis.article.keyPoints30d', qa1, (r) => [sum(r, (x) => x.news30KeyPoints), sum(r, (x) => x.news30Total)]);
  b.m('analysis.robotTagGap.videos', qa2, (r) => ({ value: sum(r, (x) => x.robotsUntagged), denominator: sum(r, (x) => x.robotsNonempty) }));
  return b.done('분석률');
}

// ── 구역 4: aiCost ──

const LOGGED_TAGS = ['video-tagging', 'paper-summary', 'spec-enrichment'] as const;
const PROVIDERS = ['claude', 'gemini', 'chatgpt'] as const;

function buildAiCost(inp: SectionInputs): CoverageSection {
  const b = new SectionBuilder('aiCost');
  const { aiProvider, aiTag, aiLoggedTags, qa1, qa2 } = inp.bundles;
  const limit = inp.limits.claudeMonthlyLimitUsd;
  b.notes.push('서버 기준 월(서버 시간대의 1일 00:00 이후)로 집계합니다. 주간 브리프 예산 가드와 같은 경계입니다.');
  b.notes.push('이 화면은 AI 를 호출하지 않으며 사용량 로그를 읽기만 합니다.');

  const claudeUsed = (rows: AiProviderRow[]) => rows.find((r) => r.provider === 'claude')?.costUsd ?? 0;
  b.m('cost.claude.usedMonth', aiProvider, (r) => ({ value: claudeUsed(r) }));
  b.m('cost.claude.limit', aiProvider, () => ({ value: limit }));
  b.ratio('cost.claude.usedPct', aiProvider, (r) => [claudeUsed(r), limit], (r) => ({ severity: severityForUsedPct(claudeUsed(r) / limit) }));
  b.m('cost.claude.projectedMonthEnd', aiProvider, (r) => {
    const p = projectMonthEnd(claudeUsed(r), inp.now);
    return p.na ? { value: null, na: 'no_data', note: '월 1일은 추정하지 않습니다' } : { value: p.value, severity: severityForProjected(p.value, limit) };
  });
  b.m('cost.month.totalAllProviders', aiProvider, (r) => ({ value: sum(r, (x) => x.costUsd) }));

  b.t(
    'cost.byProvider',
    aiProvider,
    [col('calls', '호출 수'), col('inputTokens', '입력 토큰'), col('outputTokens', '출력 토큰'), col('costUsd', '비용', 'usd'), col('monthlyLimitUsd', '월 한도', 'usd')],
    (rows) => {
      const names = [...PROVIDERS, ...rows.map((r) => r.provider).filter((p) => !(PROVIDERS as readonly string[]).includes(p))];
      return {
        diffable: true,
        rows: names.map((p) => {
          const r = rows.find((x) => x.provider === p);
          return row(p, { calls: r?.calls ?? 0, inputTokens: r?.inputTokens ?? 0, outputTokens: r?.outputTokens ?? 0, costUsd: r?.costUsd ?? 0, monthlyLimitUsd: p === 'claude' ? limit : null });
        }),
      };
    },
  );
  b.t(
    'cost.byTag',
    aiTag,
    [col('calls', '호출 수'), col('inputTokens', '입력 토큰'), col('outputTokens', '출력 토큰'), col('costUsd', '비용', 'usd'), col('share', '비중', 'ratio')],
    (rows) => ({
      diffable: true,
      rows: rows.map((r) => row(r.tag, { calls: r.calls, inputTokens: r.inputTokens, outputTokens: r.outputTokens, costUsd: r.costUsd, share: r.totalCostUsd > 0 ? r.costUsd / r.totalCostUsd : null })),
    }),
  );

  const missing = (rows: { tag: string; calls: number }[]) => LOGGED_TAGS.filter((t) => !rows.some((r) => r.tag === t && r.calls > 0));
  b.m('cost.loggedTags.missing', aiLoggedTags, (rows) => {
    const miss = missing(rows);
    return miss.length > 0
      ? { value: miss.length, note: `비용 미기록 작업: ${miss.map((t) => `[${t}]`).join(', ')} (최근 30일 로그 0건)`, severity: 'ok' }
      : { value: 0 };
  });
  b.t('cost.loggedTags', aiLoggedTags, [col('calls30d', '최근 30일 호출'), col('state', '상태', 'text')], (rows) => ({
    rows: LOGGED_TAGS.map((t) => {
      const calls = rows.find((r) => r.tag === t)?.calls ?? 0;
      return row(`[${t}]`, { calls30d: calls, state: calls > 0 ? '기록 중' : '비용 미기록' });
    }),
  }));

  // 백로그 소진 예상 — 분석 구역의 쿼리에 의존한다
  const dep = all<[Qa1Row[], Qa2Row[]]>(qa1, qa2);
  const scope = inp.geminiScope;
  b.t(
    'cost.backlogEta',
    dep,
    [col('backlog', '백로그'), col('dailyLimit', '일일 처리 상한'), col('inflowPerDay', '일평균 유입(30일)'), col('etaDays', '예상 소진일수'), col('etaNote', '비고', 'text')],
    ([a, v]) => {
      const videoC30 = sum(a.filter((r) => r.productType === 'video'), (r) => r.c30);
      const arxiv = a.filter((r) => classifySource(r.source) === 'arxiv');
      const items = [
        { key: 'videoTagging', backlog: sum(v, (r) => r.total - r.tagged), limit: inp.limits.videoTaggingDailyLimit, inflow: videoC30 / 30 },
        { key: 'paperSummary', backlog: sum(arxiv, (r) => r.total - r.arxivSummary), limit: inp.limits.paperSummaryDailyLimit, inflow: sum(arxiv, (r) => r.c30) / 30 },
        { key: 'geminiVideo', backlog: sum(v.filter((r) => inScope(r.domain, scope)), (r) => r.scopePending), limit: inp.limits.geminiBatchLimit, inflow: videoC30 / 30 },
      ];
      return {
        diffable: true,
        rows: items.map((it) => {
          const eta = computeBacklogEta(it.backlog, it.limit, it.inflow);
          return row(it.key, {
            backlog: it.backlog,
            dailyLimit: it.limit,
            inflowPerDay: Math.round(it.inflow * 10) / 10,
            etaDays: eta.days,
            etaNote: eta.kind === 'impossible' ? BACKLOG_IMPOSSIBLE_TEXT : eta.kind === 'empty' ? '백로그 없음' : '',
          });
        }),
      };
    },
  );
  if (!dep.ok) b.notes.push('백로그 소진 예상은 분석 구역의 측정에 의존합니다. 해당 측정이 실패해 표시하지 못했습니다.');
  b.notes.push('Gemini 영상 분석의 유입은 영상 전체 수집량 기준 근사입니다.');
  return b.done('AI 비용');
}

// ── 구역 5: specs ──

const FIELD_LABELS: Record<string, string> = {
  height_cm: '키(cm)', weight_kg: '무게(kg)', payload_kg: '가반하중(kg)', dof_count: '자유도', max_speed_mps: '최고속도(m/s)', operation_time_hours: '가동시간(h)',
  hand_type: '손 유형', finger_count: '손가락 수', hand_dof: '손 자유도', grip_force_n: '파지력(N)',
  battery_type: '배터리 종류', capacity_wh: '용량(Wh)', charging_method: '충전 방식',
};
const ACTUATOR_EXPECTED_KEYS = ['ratedTorqueNm', 'maxTorqueNm', 'speedRpm', 'weightKg', 'actuatorType', 'integrationLevel'] as const;
const SOURCING_KINDS = ['in_house_confirmed', 'in_house_presumed', 'external', 'mixed', 'unknown'] as const;
const CONFIDENCE_ORDER = ['A', 'B', 'C', 'D', 'F'] as const;

const daysBetween = (now: Date, iso: string) => (now.getTime() - Date.parse(iso)) / 86_400_000;

function fieldNullsTable(b: SectionBuilder, id: string, res: Res<FieldNulls>): void {
  b.t(id, res, [col('nullCount', '결측 수'), col('denominator', '분모'), col('nullRate', '결측 비율', 'ratio')], (d) => ({
    diffable: true,
    rows: Object.entries(d.nulls).map(([f, c]) => row(FIELD_LABELS[f] ?? f, { nullCount: c, denominator: d.total, nullRate: d.total > 0 ? c / d.total : null })),
  }));
}

function buildSpecs(inp: SectionInputs): CoverageSection {
  const b = new SectionBuilder('specs');
  const x = inp.bundles;
  b.notes.push('스펙 채움률의 분모는 확정(confirmed) 로봇만입니다. 예측(forecast) 로봇은 별도 건수로 표시합니다.');
  b.notes.push('감사 지표는 최근 감사 리포트(읽기 전용) 기준이며, 감사는 매주 월 03:00 KST 주기로 실행됩니다.');

  b.m('specs.robots.total', x.robots, (r) => ({ value: r.total }));
  b.m('specs.robots.confirmed', x.robots, (r) => ({ value: r.confirmed }));
  b.m('specs.robots.forecast', x.robots, (r) => ({ value: r.forecast }));
  b.m('specs.robots.noBodySpecs', x.robots, (r) => ({ value: r.noBodySpecs }));
  fieldNullsTable(b, 'specs.bodyFields', x.bodyFields);
  fieldNullsTable(b, 'specs.handFields', x.handFields);
  fieldNullsTable(b, 'specs.powerFields', x.powerFields);

  // 감사 (리포트 읽기)
  const audit = x.audit;
  const auditNa: Out = { value: null, na: 'no_data', note: '감사 미실행' };
  b.m('specs.audit.totalRobots', audit, (a) => (a ? { value: a.totalRobots } : auditNa));
  b.m('specs.audit.averageCompleteness', audit, (a) => (a ? { value: a.averageCompleteness / 100, numerator: null, denominator: null } : auditNa));
  b.m('specs.audit.staleRobotCount', audit, (a) => (a ? { value: a.staleRobotCount } : auditNa));
  b.m('specs.audit.runAt', audit, (a) => (a ? { value: a.runAt, severity: severityForAuditAge(daysBetween(inp.now, a.runAt)) } : auditNa));
  b.t('specs.audit.missingBySection', audit, [col('missingCount', '로봇 수')], (a) => ({
    diffable: true,
    rows: (a as AuditReport).topMissingSpecs.map((s) => row(s.specType, { missingCount: s.missingCount })),
  }), { naWhen: (a) => a === null });

  // 부품
  b.t('specs.components.countByType', x.components, [col('count', '부품 수'), col('emptySpecs', '스펙 비어 있음')], (c) => ({
    diffable: true,
    rows: c.byType.map((t) => row(t.type, { count: t.count, emptySpecs: t.emptySpecs })),
  }));
  b.t('specs.components.specKeys', x.components, [col('count', '건수'), col('rate', '유형 내 비율', 'ratio')], (c) => {
    const typeTotal = new Map(c.byType.map((t) => [t.type, t.count]));
    const rows = c.specKeys.map((k) => ({ type: k.type, key: k.key, count: k.count }));
    for (const key of ACTUATOR_EXPECTED_KEYS) {
      if (typeTotal.has('actuator') && !rows.some((r) => r.type === 'actuator' && r.key === key)) rows.push({ type: 'actuator', key, count: 0 });
    }
    rows.sort((a, z) => z.count - a.count || a.type.localeCompare(z.type) || a.key.localeCompare(z.key));
    const out = rows.map((r) => row(`${r.type}/${r.key}`, { count: r.count, rate: (typeTotal.get(r.type) ?? 0) > 0 ? r.count / (typeTotal.get(r.type) as number) : null }));
    return { diffable: true, totalRows: out.length, rows: out };
  });

  // 공급사
  b.m('specs.supplier.total', x.supplier, (s) => ({ value: s.total }));
  b.t('specs.supplier.fields', x.supplier, [col('nullCount', '결측 수'), col('denominator', '분모'), col('nullRate', '결측 비율', 'ratio')], (s) => ({
    diffable: true,
    rows: (
      [
        ['최대 토크', s.missing.torque],
        ['무게', s.missing.weight],
        ['직경', s.missing.diameter],
        ['가격', s.missing.price],
      ] as const
    ).map(([l, c]) => row(l, { nullCount: c, denominator: s.total, nullRate: s.total > 0 ? c / s.total : null })),
  }));

  // 조달 태세
  b.t('specs.sourcing', x.sourcing, [col('count', '로봇 수')], (s) => {
    const rows = SOURCING_KINDS.map((k) => row(k, { count: s.rows.find((r) => r.sourcing === k)?.count ?? 0 }));
    for (const r of s.rows) if (!(SOURCING_KINDS as readonly string[]).includes(r.sourcing)) rows.push(row(r.sourcing, { count: r.count }));
    rows.push(row('unsourced', { count: s.unsourced }));
    return { diffable: true, rows };
  });
  b.m('specs.sourcing.unconfirmed', x.sourcing, (s) => ({
    value: sum(s.rows.filter((r) => r.sourcing === 'unknown' || r.sourcing === 'in_house_presumed'), (r) => r.count),
    note: 'unknown + in_house_presumed',
  }));

  // CI
  b.m('specs.ci.competitors', x.ci, (c) => ({ value: c.competitors }));
  b.m('specs.ci.items', x.ci, (c) => ({ value: c.items }));
  b.m('specs.ci.expectedCells', x.ci, (c) => ({ value: c.competitors * c.items }));
  const filled = (c: CiData) => sum(c.byConfidence, (r) => r.count);
  b.m('specs.ci.filledCells', x.ci, (c) => ({ value: filled(c) }));
  b.m('specs.ci.emptyCells', x.ci, (c) => ({ value: Math.max(0, c.competitors * c.items - filled(c)) }));
  b.ratio('specs.ci.emptyRate', x.ci, (c) => [Math.max(0, c.competitors * c.items - filled(c)), c.competitors * c.items]);
  b.ratio('specs.ci.lowConfidenceRate', x.ci, (c) => [sum(c.byConfidence.filter((r) => r.confidence === 'D' || r.confidence === 'F'), (r) => r.count), filled(c)]);
  b.t('specs.ci.confidence', x.ci, [col('count', '셀 수'), col('share', '비율', 'ratio')], (c) => {
    const f = filled(c);
    const known = new Set<string | null>(CONFIDENCE_ORDER);
    const rows = CONFIDENCE_ORDER.map((k) => {
      const n = c.byConfidence.find((r) => r.confidence === k)?.count ?? 0;
      return row(k, { count: n, share: f > 0 ? n / f : null });
    });
    const other = sum(c.byConfidence.filter((r) => !known.has(r.confidence)), (r) => r.count);
    rows.push(row('(null)', { count: other, share: f > 0 ? other / f : null }));
    return { diffable: true, rows };
  });
  b.t('specs.ci.byLayer', x.ciByLayer, [col('expected', '기대'), col('filled', '채움'), col('empty', '빈 셀'), col('lowRate', 'D·F 비율', 'ratio')], (ls) => ({
    diffable: true,
    rows: ls.map((l) => row(l.slug, { expected: l.expected, filled: l.filled, empty: Math.max(0, l.expected - l.filled), lowRate: l.filled > 0 ? l.low / l.filled : null })),
  }));
  b.m('specs.ciStaging.pending', x.ciStaging, (s) => ({
    value: s.pending,
    note: s.oldestCreatedAt ? `가장 오래된 대기: ${s.oldestCreatedAt.slice(0, 10)} / ${s.byType.map((t) => `${t.updateType} ${t.count}`).join(', ')}` : null,
  }));
  b.m('specs.handBenchmark.competitors', x.handBenchmark, (h) => ({ value: h.competitors }));
  b.m('specs.handBenchmark.missingCells', x.handBenchmark, (h) => ({ value: Math.max(0, h.competitors * h.axes - h.scores) }));
  return b.done('스펙 채움률');
}

// ── 구역 6: quality ──

function buildQuality(inp: SectionInputs): CoverageSection {
  const b = new SectionBuilder('quality');
  const { qa1, qa2, qa6, autoCompanies } = inp.bundles;
  b.notes.push('중복은 정규화 URL, arXiv ID(버전 제거), 영상 ID 세 종류를 독립 계산합니다(같은 행이 여러 종류에 포함될 수 있음). URL 정규화는 보수적이라 실제보다 적게 나올 수 있습니다.');
  b.notes.push('제목 한글·가나/한자 포함 건수는 언어 필드(전부 en 으로 고정)의 의심 신호입니다.');

  b.t(
    'quality.bySource',
    qa1,
    [
      col('total', '전체'), col('companyNull', '회사 미연결'), col('companyNullRate', '회사 미연결 비율', 'ratio'),
      col('publishedNull', '게시일 없음'), col('publishedNullRate', '게시일 없음 비율', 'ratio'),
      col('entityTitle', '엔티티 제목'), col('koTitle', '한글 제목'), col('cjkTitle', '가나·한자 제목'),
    ],
    (rows) => ({
      diffable: true,
      rows: SOURCE_GROUPS.map((g) => {
        const rs = rows.filter((r) => classifySource(r.source) === g);
        const total = sum(rs, (r) => r.total);
        const cn = sum(rs, (r) => r.companyNull);
        const pn = sum(rs, (r) => r.publishedNull);
        return row(g, {
          total, companyNull: cn, companyNullRate: total > 0 ? cn / total : null, publishedNull: pn, publishedNullRate: total > 0 ? pn / total : null,
          entityTitle: sum(rs, (r) => r.entityTitle), koTitle: sum(rs, (r) => r.koTitle), cjkTitle: sum(rs, (r) => r.cjkTitle),
        });
      }),
    }),
  );
  b.m('quality.entityTitles.total', qa1, (r) => ({ value: sum(r, (x) => x.entityTitle) }));
  b.ratio('quality.companyNull.total', qa1, (r) => [sum(r, (x) => x.companyNull), sum(r, (x) => x.total)]);
  b.ratio('quality.publishedNull.total', qa1, (r) => [sum(r, (x) => x.publishedNull), sum(r, (x) => x.total)]);
  b.t('quality.language', qa1, [col('count', '건수')], (rows) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.language ?? '(null)', (m.get(r.language ?? '(null)') ?? 0) + r.total);
    return { diffable: true, rows: [...m.entries()].sort((a, z) => z[1] - a[1] || a[0].localeCompare(z[0])).map(([k, v]) => row(k, { count: v })) };
  });

  const kinds: DupKind[] = ['urlNorm', 'arxivId', 'videoId'];
  for (const k of kinds) {
    b.m(`quality.dup.${k}`, qa6, (d) => ({ value: d[k].redundantRows, note: '값은 제거 가능 행 수(행 수 − 그룹 수)' }));
    b.m(`quality.dup.${k}.groups`, qa6, (d) => ({ value: d[k].groups }));
    b.m(`quality.dup.${k}.rows`, qa6, (d) => ({ value: d[k].rowsInGroups }));
    b.m(`quality.dup.${k}.redundant`, qa6, (d) => ({ value: d[k].redundantRows }));
  }
  b.m('quality.dup.unparsableUrl', qa6, (d) => ({ value: d.unparsableUrl }));
  b.t('quality.dup.samples', qa6, [col('kind', '종류', 'text'), col('size', '그룹 크기'), col('ids', '기사 ID', 'text')], (d) => ({
    rows: d.samples.map((s) => row(`${s.kind}:${s.key}`, { kind: s.kind, size: s.size, ids: s.ids.join(', ') })),
  }));
  b.m('quality.autoCompanies.count', autoCompanies, (a) => ({ value: a.count, denominator: a.total }));
  b.t('quality.autoCompanies.samples', autoCompanies, [col('articles', '연결 기사'), col('robots', '연결 로봇')], (a) => ({
    totalRows: a.count,
    rows: a.samples.map((s) => row(s.name, { articles: s.articles, robots: s.robots })),
  }));
  b.dep('quality.robotTagGap', qa2, (r) => ({ value: sum(r, (x) => x.robotsUntagged), denominator: sum(r, (x) => x.robotsNonempty) }));
  return b.done('데이터 품질');
}

// ── 구역 7: crawlTargets ──

const JOB_STATUSES = ['pending', 'running', 'completed', 'failed'] as const;

function buildCrawl(inp: SectionInputs): CoverageSection {
  const b = new SectionBuilder('crawlTargets');
  const { crawl, crawlErrors, collect } = inp.bundles;
  b.m('crawl.targets.total', crawl, (c) => ({ value: c.targets.total }));
  b.m('crawl.targets.enabled', crawl, (c) => ({ value: c.targets.enabled }));
  b.m('crawl.targets.disabled', crawl, (c) => ({ value: c.targets.disabled }));
  b.m('crawl.targets.neverCrawled', crawl, (c) => ({ value: c.targets.neverCrawled }));
  b.m('crawl.targets.lastCrawledMax', crawl, (c) => (c.targets.lastCrawledMax ? { value: c.targets.lastCrawledMax } : { value: null, na: 'no_data' }));
  b.t('crawl.jobsByStatus', crawl, [col('total', '전체'), col('last7d', '최근 7일')], (c) => {
    const rows = JOB_STATUSES.map((s) => {
      const r = c.jobsByStatus.find((x) => x.status === s);
      return row(s, { total: r?.total ?? 0, last7d: r?.last7d ?? 0 });
    });
    const others = c.jobsByStatus.filter((x) => !(JOB_STATUSES as readonly string[]).includes(x.status));
    rows.push(row('other', { total: sum(others, (r) => r.total), last7d: sum(others, (r) => r.last7d) }));
    return { diffable: true, rows };
  });
  b.m('crawl.jobs.stuckRunning', crawl, (c) => ({ value: c.stuckRunning, severity: severityForAtLeastOne(c.stuckRunning) }));
  b.m('crawl.jobs.last30d', crawl, (c) => ({
    value: c.last30d.success + c.last30d.failure + c.last30d.duplicate,
    note: `잡 ${c.last30d.jobs}건 / 성공 ${c.last30d.success} · 실패 ${c.last30d.failure} · 중복 ${c.last30d.duplicate}`,
  }));
  b.t('crawl.errorsTop', crawlErrors, [col('errorType', '유형', 'text'), col('message', '메시지', 'text'), col('count', '건수')], (rows) => ({
    rows: rows.map((r, i) => row(String(i + 1), { errorType: r.errorType, message: sanitizeErrorMessage(r.message, 100), count: r.count })),
  }));
  b.m('crawl.sealedState', crawl, (c) => {
    const enabled = collect.ok && collect.data ? collect.data.config['htmlCrawlerEnabled'] : undefined;
    let text = enabled === false ? 'HTML 크롤러 봉인(타깃은 수집되지 않음)' : enabled === true ? '활성' : '미확인';
    if (c.last30d.jobs === 0) text += ' / 수집 실적 없음';
    return { value: text };
  });
  return b.done('크롤 타깃');
}

// ── 조립 ──

const BUILDERS: Record<CoverageSectionId, (inp: SectionInputs) => CoverageSection> = {
  ingest: buildIngest,
  collectRun: buildCollectRun,
  analysis: buildAnalysis,
  aiCost: buildAiCost,
  specs: buildSpecs,
  quality: buildQuality,
  crawlTargets: buildCrawl,
};

/** 구역별 격리: 한 구역의 빌더가 던져도 나머지는 정상 */
export function buildSections(inp: SectionInputs): CoverageSection[] {
  return SECTION_ORDER.map(({ id, titleKo }) => {
    try {
      return BUILDERS[id](inp);
    } catch (err) {
      return failedSection(id, titleKo, 'query_failed', err instanceof Error ? err.message : String(err));
    }
  });
}

/** 모든 지표 ID(계약 테스트용) */
export const ALL_METRIC_IDS: readonly string[] = REG.map((d) => d.id);
