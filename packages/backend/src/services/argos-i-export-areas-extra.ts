/**
 * ARGOS_I 내보내기 — P1 영역(키워드·적용 사례·점수·비전 원가·제품·경쟁 알림·집계)과
 * PM 결정 §14-6 으로 포함된 영역(전략 워룸·LG 휴머노이드 모델·현장 이벤트·규제·데이터 품질), 그리고 overview 빌더. 순수 함수.
 *
 * 개인 식별·내부 운영 필드(*_by, assignee, 읽음 상태, 비용, 로고/이미지 URL, 업로드 원문)는 어느 영역에서도 선택하지 않는다.
 */

import type { AreaContent, AreaDef, AreaResultSummary, BuildCtx } from './argos-i-export-areas-types.js';
import {
  TEXT_LIMITS,
  cleanList,
  cleanText,
  cmpNum,
  cmpStr,
  cmpText,
  groupBy,
  intOrNull,
  iso,
  kstDateTimeOfIso,
  kstYmdOfIso,
  numOrNull,
  safeUrl,
  sanitizeDeep,
  str,
  tallyText,
  toIsoUtc,
  toYmd,
  type MdSection,
  type Row,
} from './argos-i-export-util.js';

const nonNull = <T>(v: T | null | undefined): v is T => v !== null && v !== undefined;

// ─────────────────────────────────────────────────────────────────────────────
// keywords
// ─────────────────────────────────────────────────────────────────────────────

export interface KeywordsRaw {
  keywords: Row[];
  stats: Row[];
}

function buildKeywords(raw: KeywordsRaw): AreaContent {
  const statsBy = groupBy(raw.stats, (s) => String(s.keyword_id));
  const items = raw.keywords
    .map((k) => {
      const stats = (statsBy.get(String(k.id)) ?? [])
        .map((s) => ({
          periodType: str(s, 'period_type', 20) ?? '',
          periodStart: toYmd(s.period_start),
          periodEnd: toYmd(s.period_end),
          count: intOrNull(s.count),
          delta: intOrNull(s.delta),
          deltaPercent: numOrNull(s.delta_percent),
        }))
        .sort((a, b) => cmpStr(a.periodType, b.periodType) || cmpStr(b.periodStart ?? '', a.periodStart ?? ''));
      return { id: String(k.id), term: str(k, 'term', 255) ?? '', category: str(k, 'category', 100), language: str(k, 'language', 10), stats };
    })
    .sort((a, b) => cmpText(a.term, b.term) || cmpStr(a.language, b.language) || cmpStr(a.id, b.id));
  const latest = (i: (typeof items)[number], type: string) => i.stats.find((s) => s.periodType === type) ?? null;
  const section: MdSection = {
    heading: '키워드 목록',
    columns: ['키워드', '분류', '언어', '최근 주 건수', '최근 주 증감(건)', '최근 주 증감(%)', '최근 월 건수', '최근 월 증감(%)', '통계 행(개)'],
    rows: items.map((i) => {
      const w = latest(i, 'week');
      const m = latest(i, 'month');
      return [i.term, i.category, i.language, w?.count ?? null, w?.delta ?? null, w?.deltaPercent ?? null, m?.count ?? null, m?.deltaPercent ?? null, i.stats.length];
    }),
  };
  return {
    data: { items },
    summary: [
      `키워드 ${items.length}개, 통계 행 ${raw.stats.length}개`,
      `통계 보유 키워드 ${items.filter((i) => i.stats.length > 0).length}개`,
      `분류별: ${tallyText(items.map((i) => i.category))}`,
    ],
    sections: [section],
  };
}

export const KEYWORDS_AREA: AreaDef<KeywordsRaw> = {
  id: 'keywords',
  titleKo: '키워드',
  priority: 'P1',
  areaSchemaVersion: 1,
  sourceTables: ['keywords', 'keyword_stats'],
  derivedFrom: [],
  units: { count: '건', delta: '건(직전 기간 대비)', deltaPercent: '%', periodStart: 'YYYY-MM-DD', periodEnd: 'YYYY-MM-DD' },
  build: buildKeywords,
};

// ─────────────────────────────────────────────────────────────────────────────
// application-cases
// ─────────────────────────────────────────────────────────────────────────────

export interface ApplicationCasesRaw {
  /** application_cases + robot_name + company_id + company_name */
  cases: Row[];
}

function buildApplicationCases(raw: ApplicationCasesRaw): AreaContent {
  const items = raw.cases
    .map((c) => ({
      id: String(c.id),
      robot: { id: c.robot_id ? String(c.robot_id) : null, name: str(c, 'robot_name', 255) },
      company: { id: c.company_id ? String(c.company_id) : null, name: str(c, 'company_name', 255) },
      environmentType: str(c, 'environment_type', 50),
      taskType: str(c, 'task_type', 50),
      taskDescription: str(c, 'task_description', TEXT_LIMITS.note),
      deploymentStatus: str(c, 'deployment_status', 50),
      demoEvent: str(c, 'demo_event', 255),
      demoDate: toYmd(c.demo_date),
      videoUrl: safeUrl(c.video_url),
      notes: str(c, 'notes', TEXT_LIMITS.note),
    }))
    .sort((a, b) => cmpStr(b.demoDate ?? '', a.demoDate ?? '') || cmpStr(a.id, b.id));
  const cell = new Map<string, number>();
  for (const i of items) {
    const k = `${i.environmentType ?? 'unknown'}|${i.taskType ?? 'unknown'}`;
    cell.set(k, (cell.get(k) ?? 0) + 1);
  }
  const matrix = [...cell.entries()]
    .map(([k, n]) => {
      const [environmentType, taskType] = k.split('|');
      return { environmentType: environmentType!, taskType: taskType!, count: n };
    })
    .sort((a, b) => cmpStr(a.environmentType, b.environmentType) || cmpStr(a.taskType, b.taskType));
  const dist = new Map<string, number>();
  for (const i of items) dist.set(i.deploymentStatus ?? 'unknown', (dist.get(i.deploymentStatus ?? 'unknown') ?? 0) + 1);
  const deploymentDistribution = [...dist.entries()].map(([status, n]) => ({ status, count: n })).sort((a, b) => cmpStr(a.status, b.status));
  const section: MdSection = {
    heading: '적용 사례 목록 (시연일 최신순)',
    columns: ['시연일(KST)', '로봇', '기업', '환경', '작업', '도입 단계', '행사', '영상', '비고'],
    rows: items.map((i) => [i.demoDate, i.robot.name, i.company.name, i.environmentType, i.taskType, i.deploymentStatus, i.demoEvent, i.videoUrl ? { text: '영상', url: i.videoUrl } : null, i.notes]),
  };
  return {
    data: { items, matrix, deploymentDistribution },
    summary: [
      `적용 사례 ${items.length}건 (로봇 ${new Set(items.map((i) => i.robot.id).filter(nonNull)).size}종)`,
      `도입 단계별: ${tallyText(items.map((i) => i.deploymentStatus))}`,
      `환경별: ${tallyText(items.map((i) => i.environmentType))}`,
      `작업별: ${tallyText(items.map((i) => i.taskType))}`,
    ],
    sections: [section],
    notes: ['영상 후보 큐(관리자 검수 대기)는 포함하지 않는다.'],
  };
}

export const APPLICATION_CASES_AREA: AreaDef<ApplicationCasesRaw> = {
  id: 'application-cases',
  titleKo: '적용 사례',
  priority: 'P1',
  areaSchemaVersion: 1,
  sourceTables: ['application_cases', 'humanoid_robots', 'companies'],
  derivedFrom: [],
  units: { demoDate: 'YYYY-MM-DD', count: '건' },
  build: buildApplicationCases,
};

// ─────────────────────────────────────────────────────────────────────────────
// scores
// ─────────────────────────────────────────────────────────────────────────────

export interface ScoresRaw {
  /** 각 행에 robot_name 포함 */
  poc: Row[];
  rfm: Row[];
  positioning: Row[];
  history: Row[];
}

function buildScores(raw: ScoresRaw): AreaContent {
  const robotKey = (r: Row) => ({ robotId: r.robot_id ? String(r.robot_id) : null, robot: str(r, 'robot_name', 255) });
  const poc = raw.poc
    .map((r) => ({
      ...robotKey(r),
      payload: intOrNull(r.payload_score),
      operationTime: intOrNull(r.operation_time_score),
      fingerDof: intOrNull(r.finger_dof_score),
      formFactor: intOrNull(r.form_factor_score),
      pocDeployment: intOrNull(r.poc_deployment_score),
      costEfficiency: intOrNull(r.cost_efficiency_score),
      evaluatedAt: iso(r, 'evaluated_at'),
    }))
    .sort((a, b) => cmpText(a.robot, b.robot) || cmpStr(a.robotId, b.robotId));
  const rfm = raw.rfm
    .map((r) => ({
      ...robotKey(r),
      rfmModelName: str(r, 'rfm_model_name', 255),
      generality: intOrNull(r.generality_score),
      realWorldData: intOrNull(r.real_world_data_score),
      edgeInference: intOrNull(r.edge_inference_score),
      multiRobotCollab: intOrNull(r.multi_robot_collab_score),
      openSource: intOrNull(r.open_source_score),
      commercialMaturity: intOrNull(r.commercial_maturity_score),
      evaluatedAt: iso(r, 'evaluated_at'),
    }))
    .sort((a, b) => cmpText(a.robot, b.robot) || cmpText(a.rfmModelName, b.rfmModelName) || cmpStr(a.robotId, b.robotId));
  const positioning = raw.positioning
    .map((r) => ({
      id: String(r.id),
      chartType: str(r, 'chart_type', 50) ?? '',
      ...robotKey(r),
      label: str(r, 'label', 255),
      x: numOrNull(r.x_value),
      y: numOrNull(r.y_value),
      bubbleSize: numOrNull(r.bubble_size),
      colorGroup: str(r, 'color_group', 50),
    }))
    .sort((a, b) => cmpStr(a.chartType, b.chartType) || cmpText(a.label, b.label) || cmpStr(a.id, b.id));
  const history = raw.history
    .map((r) => ({ ...robotKey(r), snapshotMonth: str(r, 'snapshot_month', 7), combinedScore: numOrNull(r.combined_score) }))
    .sort((a, b) => cmpStr(b.snapshotMonth, a.snapshotMonth) || cmpText(a.robot, b.robot) || cmpStr(a.robotId, b.robotId));
  const sections: MdSection[] = [
    {
      heading: '산업용 PoC 팩터 점수',
      columns: ['로봇', '페이로드(점수 1~10)', '가동시간(점수 1~10)', '손가락 DoF(점수 1~10)', '폼팩터(점수 1~10)', 'PoC 배치(점수 1~10)', '원가 효율(점수 1~10)'],
      rows: poc.map((p) => [p.robot, p.payload, p.operationTime, p.fingerDof, p.formFactor, p.pocDeployment, p.costEfficiency]),
    },
    {
      heading: 'RFM 역량 점수',
      columns: ['로봇', 'RFM 모델', '범용성(점수 1~5)', '실세계 데이터(점수 1~5)', '엣지 추론(점수 1~5)', '멀티로봇 협업(점수 1~5)', '오픈소스(점수 1~5)', '상용 성숙도(점수 1~5)'],
      rows: rfm.map((r) => [r.robot, r.rfmModelName, r.generality, r.realWorldData, r.edgeInference, r.multiRobotCollab, r.openSource, r.commercialMaturity]),
    },
    {
      heading: '포지셔닝(버블 차트) 데이터',
      columns: ['차트', '라벨', 'X 값', 'Y 값', '버블 크기', '색 그룹'],
      rows: positioning.map((p) => [p.chartType, p.label, p.x, p.y, p.bubbleSize, p.colorGroup]),
    },
    {
      heading: '월별 종합 점수 이력',
      columns: ['스냅샷 월', '로봇', '종합 점수(점)'],
      rows: history.map((h) => [h.snapshotMonth, h.robot, h.combinedScore]),
    },
  ];
  return {
    data: { poc, rfm, positioning, history },
    summary: [
      `PoC 점수 ${poc.length}대, RFM 점수 ${rfm.length}건`,
      `포지셔닝 데이터 ${positioning.length}건 (차트 ${new Set(positioning.map((p) => p.chartType)).size}종)`,
      `월별 이력 ${history.length}건`,
      '점수 척도: PoC 팩터는 1~10, RFM 팩터는 1~5 정수',
    ],
    sections,
  };
}

export const SCORES_AREA: AreaDef<ScoresRaw> = {
  id: 'scores',
  titleKo: '역량 점수',
  priority: 'P1',
  areaSchemaVersion: 1,
  sourceTables: ['poc_scores', 'rfm_scores', 'positioning_data', 'score_history', 'humanoid_robots'],
  derivedFrom: [],
  units: { pocScores: '점수(1~10)', rfmScores: '점수(1~5)', combinedScore: '점', evaluatedAt: 'ISO 8601 UTC' },
  build: buildScores,
};

// ─────────────────────────────────────────────────────────────────────────────
// vision-cost
// ─────────────────────────────────────────────────────────────────────────────

export interface VisionCostRaw {
  bomParts: Row[];
  robotCosts: Row[];
}

function buildVisionCost(raw: VisionCostRaw): AreaContent {
  const bomParts = raw.bomParts
    .map((p) => ({
      id: String(p.id),
      partName: str(p, 'part_name', 255) ?? '',
      partType: str(p, 'part_type', 50),
      unitPriceMin: intOrNull(p.unit_price_min),
      unitPriceMax: intOrNull(p.unit_price_max),
      unitPriceMid: intOrNull(p.unit_price_mid),
      priceUnit: str(p, 'price_unit', 30),
      sourceReliability: str(p, 'source_reliability', 10),
      exampleRobot: str(p, 'example_robot', 255),
    }))
    .sort((a, b) => cmpStr(a.partType, b.partType) || cmpText(a.partName, b.partName) || cmpStr(a.id, b.id));
  const robotCosts = raw.robotCosts
    .map((c) => ({
      id: String(c.id),
      robotLabel: str(c, 'robot_label', 255) ?? '',
      company: str(c, 'company_name', 100),
      releaseYear: intOrNull(c.release_year),
      isForecast: c.is_forecast === true,
      cameraCostUsd: intOrNull(c.camera_cost_usd),
      lidarDepthCostUsd: intOrNull(c.lidar_depth_cost_usd),
      computeCostUsd: intOrNull(c.compute_cost_usd),
      totalCostUsd: intOrNull(c.total_cost_usd),
      performanceLevel: numOrNull(c.performance_level),
      reliabilityGrade: str(c, 'reliability_grade', 10),
    }))
    .sort((a, b) => cmpNum(a.releaseYear, b.releaseYear) || cmpText(a.robotLabel, b.robotLabel) || cmpStr(a.id, b.id));
  return {
    data: { bomParts, robotCosts },
    summary: [
      `BOM 부품 단가 ${bomParts.length}종, 로봇별 비전 시스템 원가 ${robotCosts.length}건`,
      `원가 실적 ${robotCosts.filter((c) => !c.isForecast).length}건, 전망 ${robotCosts.filter((c) => c.isForecast).length}건`,
      '금액은 모두 USD, 성능 수준은 P1~P5 (소수 허용), 신뢰 등급은 A~E',
    ],
    sections: [
      {
        heading: 'BOM 부품 단가',
        columns: ['부품', '유형', '최소 단가(USD)', '최대 단가(USD)', '중간 단가(USD)', '단가 기준', '신뢰 등급', '대표 로봇'],
        rows: bomParts.map((p) => [p.partName, p.partType, p.unitPriceMin, p.unitPriceMax, p.unitPriceMid, p.priceUnit, p.sourceReliability, p.exampleRobot]),
      },
      {
        heading: '로봇별 비전 시스템 원가',
        columns: ['로봇', '기업', '출시(연도)', '구분', '카메라(USD)', 'LiDAR·Depth(USD)', '컴퓨트(USD)', '합계(USD)', '성능 수준(P1~P5)', '신뢰 등급'],
        rows: robotCosts.map((c) => [c.robotLabel, c.company, c.releaseYear, c.isForecast ? '전망' : '실적', c.cameraCostUsd, c.lidarDepthCostUsd, c.computeCostUsd, c.totalCostUsd, c.performanceLevel, c.reliabilityGrade]),
      },
    ],
  };
}

export const VISION_COST_AREA: AreaDef<VisionCostRaw> = {
  id: 'vision-cost',
  titleKo: '비전 센서 원가',
  priority: 'P1',
  areaSchemaVersion: 1,
  sourceTables: ['vision_sensor_bom_parts', 'vision_sensor_robot_costs'],
  derivedFrom: [],
  units: { usd: 'USD', unitPrice: 'USD(priceUnit 당)', performanceLevel: 'P1~P5', releaseYear: '연도(서기)' },
  build: buildVisionCost,
};

// ─────────────────────────────────────────────────────────────────────────────
// products
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductsRaw {
  /** products + company_name */
  products: Row[];
  specs: Row[];
}

function buildProducts(raw: ProductsRaw): AreaContent {
  const specBy = new Map(raw.specs.map((s) => [String(s.product_id), s]));
  const items = raw.products
    .map((p) => {
      const s = specBy.get(String(p.id));
      return {
        id: String(p.id),
        company: { id: p.company_id ? String(p.company_id) : null, name: str(p, 'company_name', 255) },
        name: str(p, 'name', 255) ?? '',
        series: str(p, 'series', 100),
        type: str(p, 'type', 50),
        releaseDate: toYmd(p.release_date),
        targetMarket: str(p, 'target_market', 255),
        status: str(p, 'status', 50),
        spec: s
          ? {
              dof: intOrNull(s.dof),
              payloadKg: numOrNull(s.payload_kg),
              speedMps: numOrNull(s.speed_mps),
              batteryMinutes: intOrNull(s.battery_minutes),
              priceMin: numOrNull(s.price_min),
              priceMax: numOrNull(s.price_max),
              priceCurrency: str(s, 'price_currency', 10),
              arms: intOrNull(s.arms),
              hands: str(s, 'hands', 50),
              mobility: str(s, 'mobility', 50),
              heightCm: numOrNull(s.height_cm),
              dynamicSpecs: sanitizeDeep(s.dynamic_specs, 200),
            }
          : null,
      };
    })
    .sort((a, b) => cmpText(a.company.name, b.company.name) || cmpText(a.name, b.name) || cmpStr(a.id, b.id));
  const section: MdSection = {
    heading: '제품 목록',
    columns: ['기업', '제품', '시리즈', '유형', '출시일', '상태', '자유도(DoF)', '페이로드(kg)', '속도(m/s)', '배터리(분)', '키(cm)', '가격(통화 표기)'],
    rows: items.map((i) => [
      i.company.name, i.name, i.series, i.type, i.releaseDate, i.status, i.spec?.dof ?? null, i.spec?.payloadKg ?? null, i.spec?.speedMps ?? null,
      i.spec?.batteryMinutes ?? null, i.spec?.heightCm ?? null,
      i.spec && (i.spec.priceMin !== null || i.spec.priceMax !== null)
        ? `${i.spec.priceMin ?? '-'}~${i.spec.priceMax ?? '-'} ${i.spec.priceCurrency ?? ''}`.trim()
        : null,
    ]),
  };
  return {
    data: { items },
    summary: [
      `제품 ${items.length}종 (스펙 보유 ${items.filter((i) => i.spec).length}종)`,
      `유형별: ${tallyText(items.map((i) => i.type))}`,
      `상태별: ${tallyText(items.map((i) => i.status))}`,
    ],
    sections: [section],
    notes: ['SoC·액추에이터 제품의 `dynamicSpecs` 단위: tops=TOPS, npuTops=TOPS, torqueNm=Nm, rpmMax=rpm, tdpWatts=W(문자열 범위 가능).'],
  };
}

export const PRODUCTS_AREA: AreaDef<ProductsRaw> = {
  id: 'products',
  titleKo: '제품',
  priority: 'P1',
  areaSchemaVersion: 1,
  sourceTables: ['products', 'product_specs', 'companies'],
  derivedFrom: [],
  units: { payloadKg: 'kg', speedMps: 'm/s', batteryMinutes: '분', heightCm: 'cm', priceMin: 'priceCurrency', priceMax: 'priceCurrency', dof: 'DoF', 'dynamicSpecs.tops': 'TOPS', 'dynamicSpecs.torqueNm': 'Nm', 'dynamicSpecs.rpmMax': 'rpm' },
  build: buildProducts,
};

// ─────────────────────────────────────────────────────────────────────────────
// competitive-alerts
// ─────────────────────────────────────────────────────────────────────────────

export interface CompetitiveAlertsRaw {
  /** competitive_alerts + robot_name */
  rows: Row[];
}

function buildCompetitiveAlerts(raw: CompetitiveAlertsRaw): AreaContent {
  const items = raw.rows
    .map((r) => ({
      id: String(r.id),
      type: str(r, 'type', 50) ?? '',
      severity: str(r, 'severity', 20),
      title: str(r, 'title', TEXT_LIMITS.title) ?? '',
      summary: str(r, 'summary', TEXT_LIMITS.summary),
      robot: r.robot_id ? { id: String(r.robot_id), name: str(r, 'robot_name', 255) } : null,
      triggerData: sanitizeDeep(r.trigger_data, 300),
      createdAt: iso(r, 'created_at'),
    }))
    .sort((a, b) => cmpStr(b.createdAt ?? '', a.createdAt ?? '') || cmpStr(a.id, b.id));
  const section: MdSection = {
    heading: '경쟁 알림 (최신순)',
    columns: ['발생일(KST)', '유형', '심각도', '제목', '로봇', '요약'],
    rows: items.map((i) => [kstYmdOfIso(i.createdAt), i.type, i.severity, i.title, i.robot?.name ?? null, i.summary]),
  };
  return {
    data: { items },
    summary: [`경쟁 알림 ${items.length}건`, `유형별: ${tallyText(items.map((i) => i.type))}`, `심각도별: ${tallyText(items.map((i) => i.severity))}`],
    sections: [section],
    notes: ['읽음 여부·읽은 사용자는 사용자별 상태이므로 포함하지 않는다.'],
  };
}

export const COMPETITIVE_ALERTS_AREA: AreaDef<CompetitiveAlertsRaw> = {
  id: 'competitive-alerts',
  titleKo: '경쟁 알림',
  priority: 'P1',
  areaSchemaVersion: 1,
  sourceTables: ['competitive_alerts', 'humanoid_robots'],
  derivedFrom: [],
  units: { createdAt: 'ISO 8601 UTC' },
  build: buildCompetitiveAlerts,
};

// ─────────────────────────────────────────────────────────────────────────────
// aggregations (LLM 없는 결정론적 집계 — 대시보드 "전략 카드"의 대체)
// ─────────────────────────────────────────────────────────────────────────────

export interface AggregationsRaw {
  /** robot_id, environment_type, task_type, demo_date, locomotion_type */
  cases: Row[];
  /** id, announcement_year */
  robots: Row[];
  /** id, name, type, specifications, adoption_count */
  components: Row[];
  /** id, term, article_count (keyword_stats 합 + article_keywords 건수), 상위 N */
  keywords: Row[];
}

function buildAggregations(raw: AggregationsRaw): AreaContent {
  const seg = new Map<string, { environment: string; task: string; locomotion: string; robots: Set<string>; cases: number }>();
  for (const c of raw.cases) {
    const environment = cleanText(c.environment_type, 50) ?? 'unknown';
    const task = cleanText(c.task_type, 50) ?? 'unknown';
    const locomotion = cleanText(c.locomotion_type, 50) ?? 'unknown';
    const k = `${environment}|${task}|${locomotion}`;
    const e = seg.get(k) ?? { environment, task, locomotion, robots: new Set<string>(), cases: 0 };
    e.robots.add(String(c.robot_id));
    e.cases += 1;
    seg.set(k, e);
  }
  const segments = [...seg.values()]
    .map((e) => ({ environment: e.environment, task: e.task, locomotion: e.locomotion, robotCount: e.robots.size, caseCount: e.cases }))
    .sort((a, b) => b.caseCount - a.caseCount || cmpStr(a.environment, b.environment) || cmpStr(a.task, b.task) || cmpStr(a.locomotion, b.locomotion));

  const years = new Map<number, { launches: number; applications: number }>();
  const bump = (y: number, key: 'launches' | 'applications') => {
    const e = years.get(y) ?? { launches: 0, applications: 0 };
    e[key] += 1;
    years.set(y, e);
  };
  for (const r of raw.robots) {
    const y = intOrNull(r.announcement_year);
    if (y !== null && y >= 1990) bump(y, 'launches');
  }
  for (const c of raw.cases) {
    const ymd = toYmd(c.demo_date);
    if (ymd) bump(Number(ymd.slice(0, 4)), 'applications');
  }
  const yearly = [...years.entries()].sort((a, b) => a[0] - b[0]).map(([year, e]) => ({ year, launches: e.launches, applications: e.applications }));

  const components = raw.components
    .map((c) => {
      const s = (c.specifications ?? {}) as Record<string, unknown>;
      const perf: Record<string, number> = {};
      const torque = numOrNull(s.ratedTorqueNm);
      const tMin = numOrNull(s.topsMin);
      const tMax = numOrNull(s.topsMax);
      if (torque !== null) perf.torqueNm = torque;
      if (tMin !== null) perf.topsMin = tMin;
      if (tMax !== null) perf.topsMax = tMax;
      return { componentId: String(c.id), componentName: str(c, 'name', 255) ?? '', componentType: str(c, 'type', 50) ?? '', adoptionCount: intOrNull(c.adoption_count) ?? 0, avgPerformance: perf };
    })
    .sort((a, b) => b.adoptionCount - a.adoptionCount || cmpText(a.componentName, b.componentName) || cmpStr(a.componentId, b.componentId));
  const keywords = raw.keywords
    .map((k) => ({ keywordId: String(k.id), term: str(k, 'term', 255) ?? '', articleCount: intOrNull(k.article_count) ?? 0 }))
    .sort((a, b) => b.articleCount - a.articleCount || cmpText(a.term, b.term) || cmpStr(a.keywordId, b.keywordId));

  const sections: MdSection[] = [
    {
      heading: '환경 × 작업 × 이동 방식 세그먼트',
      columns: ['환경', '작업', '이동 방식', '로봇(대)', '사례(건)'],
      rows: segments.map((s) => [s.environment, s.task, s.locomotion, s.robotCount, s.caseCount]),
    },
    { heading: '연도별 집계', columns: ['연도', '발표 로봇(대)', '적용 사례(건)'], rows: yearly.map((y) => [y.year, y.launches, y.applications]) },
    {
      heading: '부품 채택 집계',
      columns: ['부품', '유형', '채택 로봇(대)', '정격 토크(Nm)', '연산 하한(TOPS)', '연산 상한(TOPS)'],
      rows: components.map((c) => [c.componentName, c.componentType, c.adoptionCount, c.avgPerformance.torqueNm ?? null, c.avgPerformance.topsMin ?? null, c.avgPerformance.topsMax ?? null]),
    },
    { heading: '키워드 언급 집계', columns: ['키워드', '언급(건)'], rows: keywords.map((k) => [k.term, k.articleCount]) },
  ];
  return {
    data: { segments, yearly, components, keywords },
    summary: [
      `레코드 합계 ${segments.length + yearly.length + components.length + keywords.length}건 (세그먼트·연도별·부품·키워드 표 행 수의 합)`,
      `세그먼트 ${segments.length}개 (사례 ${raw.cases.length}건)`,
      `연도별 집계 ${yearly.length}개 연도`,
      `부품 채택 집계 ${components.length}종`,
      `키워드 언급 집계 상위 ${keywords.length}개`,
    ],
    sections,
    countAllSections: true,
    notes: ['대시보드 인사이트 카드(실시간 AI 생성)는 내보낼 수 없어, 같은 원천의 결정론적 수치 집계로 대체한 영역이다. 키워드는 언급 건수 상위만 포함한다. 레코드 수는 아래 모든 표(세그먼트·연도별·부품·키워드)의 행 수 합이다.'],
  };
}

export const AGGREGATIONS_AREA: AreaDef<AggregationsRaw> = {
  id: 'aggregations',
  titleKo: '집계 지표',
  priority: 'P1',
  areaSchemaVersion: 1,
  sourceTables: ['application_cases', 'humanoid_robots', 'components', 'robot_components', 'keywords', 'keyword_stats', 'article_keywords'],
  derivedFrom: [],
  units: { robotCount: '대', caseCount: '건', launches: '대', applications: '건', adoptionCount: '대', articleCount: '건', torqueNm: 'Nm', topsMin: 'TOPS', topsMax: 'TOPS' },
  build: buildAggregations,
};

// ─────────────────────────────────────────────────────────────────────────────
// strategy-warroom (PM 결정 §14-6)
// ─────────────────────────────────────────────────────────────────────────────

export interface StrategyWarRoomRaw {
  partners: Row[];
  evaluations: Row[];
  domains: Row[];
  /** domain_robot_fit + robot_name */
  fits: Row[];
  goals: Row[];
  /** strategic_briefings + robot_name */
  briefings: Row[];
}

function buildStrategyWarRoom(raw: StrategyWarRoomRaw): AreaContent {
  const evalsBy = groupBy(raw.evaluations, (e) => String(e.partner_id));
  const partners = raw.partners
    .map((p) => ({
      id: String(p.id),
      name: str(p, 'name', 255) ?? '',
      category: str(p, 'category', 50),
      subCategory: str(p, 'sub_category', 100),
      country: str(p, 'country', 100),
      description: str(p, 'description', TEXT_LIMITS.note),
      websiteUrl: safeUrl(p.website_url),
      techCapability: intOrNull(p.tech_capability),
      lgCompatibility: intOrNull(p.lg_compatibility),
      marketShare: numOrNull(p.market_share),
      evaluations: (evalsBy.get(String(p.id)) ?? [])
        .map((e) => ({
          techScore: intOrNull(e.tech_score),
          qualityScore: intOrNull(e.quality_score),
          costScore: intOrNull(e.cost_score),
          deliveryScore: intOrNull(e.delivery_score),
          supportScore: intOrNull(e.support_score),
          overallScore: numOrNull(e.overall_score),
          comments: str(e, 'comments', TEXT_LIMITS.note),
          evaluatedAt: iso(e, 'evaluated_at'),
        }))
        .sort((a, b) => cmpStr(b.evaluatedAt ?? '', a.evaluatedAt ?? '')),
    }))
    .sort((a, b) => cmpText(a.name, b.name) || cmpStr(a.id, b.id));
  const applicationDomains = raw.domains
    .map((d) => ({
      id: String(d.id),
      name: str(d, 'name', 255) ?? '',
      marketSizeBillionUsd: numOrNull(d.market_size_billion_usd),
      cagrPercent: numOrNull(d.cagr_percent),
      somBillionUsd: numOrNull(d.som_billion_usd),
      keyTasks: cleanList(d.key_tasks, TEXT_LIMITS.evidence, 30),
      entryBarriers: cleanList(d.entry_barriers, TEXT_LIMITS.evidence, 30),
      lgExistingBusiness: numOrNull(d.lg_existing_business),
      lgReadiness: numOrNull(d.lg_readiness),
      description: str(d, 'description', TEXT_LIMITS.note),
    }))
    .sort((a, b) => cmpText(a.name, b.name) || cmpStr(a.id, b.id));
  const domainRobotFit = raw.fits
    .map((f) => ({
      domainId: String(f.domain_id),
      robotId: String(f.robot_id),
      robot: str(f, 'robot_name', 255),
      fitScore: numOrNull(f.fit_score),
      fitDetails: sanitizeDeep(f.fit_details, 300),
      calculatedAt: iso(f, 'calculated_at'),
    }))
    .sort((a, b) => cmpStr(a.domainId, b.domainId) || cmpStr(a.robotId, b.robotId));
  const strategicGoals = raw.goals
    .map((g) => ({
      id: String(g.id),
      title: str(g, 'title', TEXT_LIMITS.title) ?? '',
      description: str(g, 'description', TEXT_LIMITS.note),
      metricType: str(g, 'metric_type', 100),
      targetValue: numOrNull(g.target_value),
      currentValue: numOrNull(g.current_value),
      deadline: toYmd(g.deadline),
      status: str(g, 'status', 50),
      requiredActions: cleanList(g.required_actions, TEXT_LIMITS.evidence, 30),
    }))
    .sort((a, b) => cmpStr(a.deadline ?? '9999', b.deadline ?? '9999') || cmpStr(a.id, b.id));
  const strategicBriefings = raw.briefings
    .map((b) => ({
      id: String(b.id),
      lgRobotId: String(b.lg_robot_id),
      robot: str(b, 'robot_name', 255),
      triggerType: str(b, 'trigger_type', 20),
      aiModel: str(b, 'ai_model', 100),
      createdAt: iso(b, 'created_at'),
      briefingData: sanitizeDeep(b.briefing_data, 500),
    }))
    .sort((a, b) => cmpStr(b.createdAt ?? '', a.createdAt ?? '') || cmpStr(a.id, b.id));
  const sections: MdSection[] = [
    {
      heading: '파트너',
      columns: ['파트너', '분류', '세부 분류', '국가', '기술 역량(점수 1~10)', 'LG 적합도(점수 1~10)', '시장 점유율(비율 0~1)', '평가 수(건)'],
      rows: partners.map((p) => [p.name, p.category, p.subCategory, p.country, p.techCapability, p.lgCompatibility, p.marketShare, p.evaluations.length]),
    },
    {
      heading: '사업화 분야',
      columns: ['분야', '시장 규모(십억 USD)', '연평균 성장률(%)', '확보 가능 시장(십억 USD)', 'LG 기존 사업(비율 0~1)', 'LG 준비도(비율 0~1)'],
      rows: applicationDomains.map((d) => [d.name, d.marketSizeBillionUsd, d.cagrPercent, d.somBillionUsd, d.lgExistingBusiness, d.lgReadiness]),
    },
    {
      heading: '전략 목표',
      columns: ['목표', '지표', '목표 값', '현재 값', '기한', '상태'],
      rows: strategicGoals.map((g) => [g.title, g.metricType, g.targetValue, g.currentValue, g.deadline, g.status]),
    },
    {
      heading: '전략 AI 브리핑 (생성 시각 최신순, 본문은 JSON 참조)',
      columns: ['생성(KST)', '로봇', '트리거', '모델'],
      rows: strategicBriefings.map((b) => [kstDateTimeOfIso(b.createdAt), b.robot, b.triggerType, b.aiModel]),
    },
    {
      heading: '분야-로봇 적합도',
      columns: ['분야 ID', '로봇', '적합도(비율 0~1)'],
      rows: domainRobotFit.map((f) => [f.domainId, f.robot, f.fitScore]),
    },
  ];
  return {
    data: { partners, applicationDomains, domainRobotFit, strategicGoals, strategicBriefings },
    summary: [
      `파트너 ${partners.length}곳 (평가 ${partners.reduce((n, p) => n + p.evaluations.length, 0)}건)`,
      `사업화 분야 ${applicationDomains.length}개, 분야-로봇 적합도 ${domainRobotFit.length}건`,
      `전략 목표 ${strategicGoals.length}건 (상태별: ${tallyText(strategicGoals.map((g) => g.status))})`,
      `전략 AI 브리핑 ${strategicBriefings.length}건`,
    ],
    sections,
    notes: ['이 영역은 LG 내부 평가·전략 성격의 데이터를 포함한다. 평가자·작성자 식별 정보와 AI 비용은 제외했다.'],
  };
}

export const STRATEGY_WARROOM_AREA: AreaDef<StrategyWarRoomRaw> = {
  id: 'strategy-warroom',
  titleKo: '전략 워룸',
  priority: 'P2',
  areaSchemaVersion: 1,
  sourceTables: ['partners', 'partner_evaluations', 'application_domains', 'domain_robot_fit', 'strategic_goals', 'strategic_briefings', 'humanoid_robots'],
  derivedFrom: [],
  units: { score: '점수(1~10)', marketSize: '십억 USD', cagrPercent: '%', ratio: '비율(0~1)', createdAt: 'ISO 8601 UTC' },
  build: buildStrategyWarRoom,
};

// ─────────────────────────────────────────────────────────────────────────────
// lg-humanoid-models (PM 결정 §14-6)
// ─────────────────────────────────────────────────────────────────────────────

export interface LgHumanoidModelsRaw {
  models: Row[];
  eeCategories: Row[];
  cellRequirements: Row[];
}

function buildLgHumanoidModels(raw: LgHumanoidModelsRaw): AreaContent {
  const models = raw.models
    .map((m) => ({
      id: intOrNull(m.id),
      modelName: str(m, 'model_name', 100) ?? '',
      codeName: str(m, 'code_name', 100),
      formFactor: str(m, 'form_factor', 50),
      isPotential: m.is_potential === true,
      releasePhase: str(m, 'release_phase', 50),
      releaseTargetDate: toYmd(m.release_target_date),
      basicInfo: sanitizeDeep(m.basic_info, 300),
      physical: sanitizeDeep(m.physical, 300),
      locomotion: sanitizeDeep(m.locomotion, 300),
      manipulation: sanitizeDeep(m.manipulation, 300),
      perception: sanitizeDeep(m.perception, 300),
      aiCompute: sanitizeDeep(m.ai_compute, 300),
      safety: sanitizeDeep(m.safety, 300),
      commercial: sanitizeDeep(m.commercial, 300),
      eeOptions: sanitizeDeep(m.ee_options, 300),
      customFields: sanitizeDeep(m.custom_fields, 300),
      notes: str(m, 'notes', TEXT_LIMITS.note),
      updatedAt: iso(m, 'updated_at'),
    }))
    .sort((a, b) => cmpText(a.modelName, b.modelName) || cmpNum(a.id, b.id));
  const eeCategories = raw.eeCategories
    .map((c) => ({
      code: str(c, 'code', 20) ?? '',
      nameKo: str(c, 'name_ko', 50),
      description: str(c, 'description', TEXT_LIMITS.note),
      benchmarkExamples: str(c, 'benchmark_examples', TEXT_LIMITS.note),
      displayOrder: intOrNull(c.display_order),
    }))
    .sort((a, b) => cmpNum(a.displayOrder, b.displayOrder) || cmpStr(a.code, b.code));
  const cellRequirements = raw.cellRequirements
    .map((c) => ({
      taskIdx: intOrNull(c.task_idx),
      industryIdx: intOrNull(c.industry_idx),
      lv: intOrNull(c.lv),
      tier1Codes: cleanList(c.tier1_codes, 20, 20),
      tier2Codes: cleanList(c.tier2_codes, 20, 20),
      tier3Codes: cleanList(c.tier3_codes, 20, 20),
      rationale: str(c, 'rationale', TEXT_LIMITS.note),
      benchmarkEe: str(c, 'benchmark_ee', 200),
    }))
    .sort((a, b) => cmpNum(a.taskIdx, b.taskIdx) || cmpNum(a.industryIdx, b.industryIdx) || cmpNum(a.lv, b.lv));
  const sections: MdSection[] = [
    {
      heading: 'LG 휴머노이드 모델',
      columns: ['모델', '코드명', '폼팩터', '잠재 모델', '출시 단계', '출시 목표일', '비고'],
      rows: models.map((m) => [m.modelName, m.codeName, m.formFactor, m.isPotential, m.releasePhase, m.releaseTargetDate, m.notes]),
    },
    {
      heading: '엔드이펙터(EE) 카테고리',
      columns: ['코드', '이름', '순서', '설명'],
      rows: eeCategories.map((c) => [c.code, c.nameKo, c.displayOrder, c.description]),
    },
    {
      heading: '셀별 EE 요구사항',
      columns: ['작업 인덱스', '산업 인덱스', '레벨(Lv)', '1순위 EE', '2순위 EE', '3순위 EE', '근거'],
      rows: cellRequirements.map((c) => [c.taskIdx, c.industryIdx, c.lv, c.tier1Codes.join(', ') || null, c.tier2Codes.join(', ') || null, c.tier3Codes.join(', ') || null, c.rationale]),
    },
  ];
  return {
    data: { models, eeCategories, cellRequirements },
    summary: [
      `LG 휴머노이드 모델 ${models.length}종 (잠재 모델 ${models.filter((m) => m.isPotential).length}종)`,
      `EE 카테고리 ${eeCategories.length}개, 셀별 EE 요구사항 ${cellRequirements.length}건`,
    ],
    sections,
    notes: ['모델의 세부 스펙(basicInfo·physical 등)은 JSON 에만 있다. 작성자 정보는 제외했다.'],
  };
}

export const LG_HUMANOID_MODELS_AREA: AreaDef<LgHumanoidModelsRaw> = {
  id: 'lg-humanoid-models',
  titleKo: 'LG 휴머노이드 모델·EE 요구사항',
  priority: 'P2',
  areaSchemaVersion: 1,
  sourceTables: ['humanoid_models', 'ee_categories', 'cell_ee_requirements'],
  derivedFrom: [],
  units: { releaseTargetDate: 'YYYY-MM-DD', lv: '레벨(정수)', updatedAt: 'ISO 8601 UTC' },
  build: buildLgHumanoidModels,
};

// ─────────────────────────────────────────────────────────────────────────────
// coverage-field-events (PM 결정 §14-6)
// ─────────────────────────────────────────────────────────────────────────────

export interface CoverageFieldEventsRaw {
  rows: Row[];
}

function buildCoverageFieldEvents(raw: CoverageFieldEventsRaw): AreaContent {
  const items = raw.rows
    .map((r) => ({
      id: intOrNull(r.id),
      subcellKey: str(r, 'subcell_key', 120) ?? '',
      cellId: str(r, 'cell_id', 100),
      lv: intOrNull(r.lv),
      eventDate: toYmd(r.event_date),
      kind: str(r, 'kind', 32),
      status: str(r, 'status', 32),
      site: str(r, 'site', 200),
      source: str(r, 'source', 300),
      note: str(r, 'note', TEXT_LIMITS.note),
      nextStep: str(r, 'next_step', TEXT_LIMITS.note),
      priorityRank: intOrNull(r.priority_rank),
      createdAt: iso(r, 'created_at'),
      updatedAt: iso(r, 'updated_at'),
    }))
    .sort((a, b) => cmpStr(b.eventDate ?? '', a.eventDate ?? '') || cmpNum(a.id, b.id));
  const section: MdSection = {
    heading: '현장 이벤트 (일자 최신순)',
    columns: ['일자', '서브셀', '레벨(Lv)', '종류', '상태', '현장', '출처', '메모', '다음 단계', '우선순위(★1~4)'],
    rows: items.map((i) => [i.eventDate, i.subcellKey, i.lv, i.kind, i.status, i.site, i.source, i.note, i.nextStep, i.priorityRank]),
  };
  return {
    data: { items },
    summary: [`현장 이벤트 ${items.length}건 (서브셀 ${new Set(items.map((i) => i.subcellKey)).size}개)`, `종류별: ${tallyText(items.map((i) => i.kind))}`, `상태별: ${tallyText(items.map((i) => i.status))}`],
    sections: [section],
    notes: ['서브셀의 현재 상태는 서브셀별 가장 최근 이벤트의 상태다. 작성자 정보는 제외했다.'],
  };
}

export const COVERAGE_FIELD_EVENTS_AREA: AreaDef<CoverageFieldEventsRaw> = {
  id: 'coverage-field-events',
  titleKo: '커버리지 현장 이벤트',
  priority: 'P2',
  areaSchemaVersion: 1,
  sourceTables: ['coverage_field_events'],
  derivedFrom: [],
  units: { eventDate: 'YYYY-MM-DD', priorityRank: '★1~4(작을수록 우선)', lv: '레벨(정수)' },
  build: buildCoverageFieldEvents,
};

// ─────────────────────────────────────────────────────────────────────────────
// regulations (PM 결정 §14-6: lg_impact*, 체크리스트 포함 / 원문·담당자·이메일·업로드 문서 제외)
// ─────────────────────────────────────────────────────────────────────────────

export interface RegulationsRaw {
  regulations: Row[];
  updates: Row[];
  checklist: Row[];
}

function buildRegulations(raw: RegulationsRaw): AreaContent {
  const regulations = raw.regulations
    .map((r) => ({
      id: String(r.id),
      title: str(r, 'title', TEXT_LIMITS.title) ?? '',
      titleKo: str(r, 'title_ko', TEXT_LIMITS.title),
      category: str(r, 'category', 50),
      region: str(r, 'region', 50),
      jurisdiction: str(r, 'jurisdiction', 100),
      status: str(r, 'status', 30),
      effectiveDate: toYmd(r.effective_date),
      lastAmendedDate: toYmd(r.last_amended_date),
      summary: str(r, 'summary', TEXT_LIMITS.summary),
      summaryKo: str(r, 'summary_ko', TEXT_LIMITS.summary),
      lgImpact: str(r, 'lg_impact', 20),
      lgImpactAnalysis: str(r, 'lg_impact_analysis', TEXT_LIMITS.summary),
      sourceUrl: safeUrl(r.source_url),
      sourceName: str(r, 'source_name', 255),
      tags: cleanList(r.tags, 60, 30),
    }))
    .sort((a, b) => cmpStr(a.region, b.region) || cmpText(a.title, b.title) || cmpStr(a.id, b.id));
  const updates = raw.updates
    .map((u) => ({
      id: String(u.id),
      regulationId: u.regulation_id ? String(u.regulation_id) : null,
      title: str(u, 'title', TEXT_LIMITS.title) ?? '',
      titleKo: str(u, 'title_ko', TEXT_LIMITS.title),
      updateType: str(u, 'update_type', 30),
      category: str(u, 'category', 50),
      region: str(u, 'region', 50),
      summary: str(u, 'summary', TEXT_LIMITS.summary),
      summaryKo: str(u, 'summary_ko', TEXT_LIMITS.summary),
      lgImpact: str(u, 'lg_impact', 20),
      lgActionRequired: str(u, 'lg_action_required', TEXT_LIMITS.summary),
      sourceUrl: safeUrl(u.source_url),
      sourceName: str(u, 'source_name', 255),
      publishedAt: iso(u, 'published_at'),
      detectedAt: iso(u, 'detected_at'),
    }))
    .sort((a, b) => cmpStr(b.publishedAt ?? b.detectedAt ?? '', a.publishedAt ?? a.detectedAt ?? '') || cmpStr(a.id, b.id));
  const checklist = raw.checklist
    .map((c) => ({
      id: String(c.id),
      regulationId: c.regulation_id ? String(c.regulation_id) : null,
      parentId: c.parent_id ? String(c.parent_id) : null,
      category: str(c, 'category', 50),
      region: str(c, 'region', 50),
      title: str(c, 'title', TEXT_LIMITS.title) ?? '',
      description: str(c, 'description', TEXT_LIMITS.note),
      priority: str(c, 'priority', 20),
      status: str(c, 'status', 30),
      dueDate: toYmd(c.due_date),
      progressPct: intOrNull(c.progress_pct),
      notes: str(c, 'notes', TEXT_LIMITS.note),
      industrialRegComparison: str(c, 'industrial_reg_comparison', TEXT_LIMITS.note),
      industrialRegWhyDifferent: str(c, 'industrial_reg_why_different', TEXT_LIMITS.note),
      industrialRegApproach: str(c, 'industrial_reg_approach', TEXT_LIMITS.note),
      sortOrder: intOrNull(c.sort_order),
    }))
    .sort((a, b) => cmpStr(a.region, b.region) || cmpStr(a.category, b.category) || cmpNum(a.sortOrder, b.sortOrder) || cmpStr(a.id, b.id));
  const sections: MdSection[] = [
    {
      heading: '규제',
      columns: ['지역', '규제', '분류', '상태', '시행일', 'LG 영향도', '출처', '요약'],
      rows: regulations.map((r) => [r.region, r.titleKo ?? r.title, r.category, r.status, r.effectiveDate, r.lgImpact, r.sourceUrl ? { text: r.sourceName ?? '출처', url: r.sourceUrl } : r.sourceName, r.summaryKo ?? r.summary]),
    },
    {
      heading: '규제 변경 피드',
      columns: ['게시일(KST)', '지역', '유형', '제목', 'LG 영향도', '필요 조치'],
      rows: updates.map((u) => [kstYmdOfIso(u.publishedAt ?? u.detectedAt), u.region, u.updateType, u.titleKo ?? u.title, u.lgImpact, u.lgActionRequired]),
    },
    {
      heading: '컴플라이언스 체크리스트',
      columns: ['지역', '분류', '항목', '우선순위', '상태', '기한', '진행률(%)'],
      rows: checklist.map((c) => [c.region, c.category, c.title, c.priority, c.status, c.dueDate, c.progressPct]),
    },
  ];
  return {
    data: { regulations, updates, checklist },
    summary: [
      `규제 ${regulations.length}건 (지역별: ${tallyText(regulations.map((r) => r.region))})`,
      `규제 변경 피드 ${updates.length}건, 체크리스트 ${checklist.length}건`,
      `LG 영향도별 규제: ${tallyText(regulations.map((r) => r.lgImpact))}`,
    ],
    sections,
    notes: ['규제 원문(original_text)과 업로드 문서는 포함하지 않는다. 체크리스트의 담당자·증빙 파일·읽음 상태도 제외했다. LG 영향도 판단은 ARGOS 의 AI 분석물이다.'],
  };
}

export const REGULATIONS_AREA: AreaDef<RegulationsRaw> = {
  id: 'regulations',
  titleKo: '규제·컴플라이언스',
  priority: 'P2',
  areaSchemaVersion: 1,
  sourceTables: ['regulations', 'regulatory_updates', 'compliance_checklist'],
  derivedFrom: [],
  units: { effectiveDate: 'YYYY-MM-DD', publishedAt: 'ISO 8601 UTC', progressPct: '%', lgImpact: 'critical|high|medium|low|none' },
  build: buildRegulations,
};

// ─────────────────────────────────────────────────────────────────────────────
// data-quality
// ─────────────────────────────────────────────────────────────────────────────

export interface DataQualityRaw {
  /** 최신 감사 리포트 1건 (없으면 null) */
  latest: Row | null;
}

function buildDataQuality(raw: DataQualityRaw): AreaContent {
  const items = raw.latest
    ? [
        {
          id: raw.latest.id ? String(raw.latest.id) : null,
          auditedAt: iso(raw.latest, 'created_at'),
          totalRobots: intOrNull(raw.latest.total_robots),
          averageCompleteness: numOrNull(raw.latest.average_completeness),
          criticalCount: intOrNull(raw.latest.critical_count),
          warningCount: intOrNull(raw.latest.warning_count),
        },
      ]
    : [];
  const section: MdSection = {
    heading: '최신 데이터 감사 요약',
    columns: ['감사(KST)', '대상 로봇(대)', '평균 완성도(%)', '치명(건)', '경고(건)'],
    rows: items.map((i) => [kstDateTimeOfIso(i.auditedAt), i.totalRobots, i.averageCompleteness, i.criticalCount, i.warningCount]),
  };
  const i0 = items[0];
  return {
    data: { items },
    summary: i0
      ? [`평균 완성도 ${i0.averageCompleteness ?? '-'}% (대상 로봇 ${i0.totalRobots ?? '-'}대)`, `치명 ${i0.criticalCount ?? '-'}건, 경고 ${i0.warningCount ?? '-'}건`]
      : ['감사 리포트 없음'],
    sections: [section],
    notes: ['운영 정보 성격이라 최신 1건의 요약 수치만 제공한다.'],
  };
}

export const DATA_QUALITY_AREA: AreaDef<DataQualityRaw> = {
  id: 'data-quality',
  titleKo: '데이터 품질',
  priority: 'P2',
  areaSchemaVersion: 1,
  sourceTables: ['data_audit_reports'],
  derivedFrom: [],
  units: { averageCompleteness: '%', totalRobots: '대', criticalCount: '건', warningCount: '건', auditedAt: 'ISO 8601 UTC' },
  build: buildDataQuality,
};

// ─────────────────────────────────────────────────────────────────────────────
// overview — 다른 영역 결과를 메모리에서 합산 ("분석이 오늘 반영됐는가" 판단용)
// ─────────────────────────────────────────────────────────────────────────────

export interface OverviewRaw {
  /** source, product_type, n, last_collected_at */
  articleCounts: Row[];
  /** id, name, article_count, last_collected_at */
  companyFreshness: Row[];
  markers: { pipeline: Record<string, any> | null; weeklyBrief: Record<string, any> | null };
  insightCaches: { viewName: string; cachedAt: string }[];
  ciLastVerifiedAt: string | null;
  /** 서비스가 다른 영역 처리 후 주입 */
  areas: AreaResultSummary[];
}

function buildOverview(raw: OverviewRaw, ctx: BuildCtx): AreaContent {
  const areas = [...raw.areas].sort((a, b) => cmpStr(a.priority, b.priority) || cmpStr(a.id, b.id));
  const sources = raw.articleCounts
    .map((r) => ({ source: str(r, 'source', 255), productType: str(r, 'product_type', 50), count: intOrNull(r.n) ?? 0, lastCollectedAt: iso(r, 'last_collected_at') }))
    .sort((a, b) => cmpStr(a.source, b.source) || cmpStr(a.productType, b.productType));
  const companyFreshness = raw.companyFreshness
    .map((r) => ({ companyId: String(r.id), name: str(r, 'name', 255) ?? '', articleCount: intOrNull(r.article_count) ?? 0, lastCollectedAt: iso(r, 'last_collected_at') }))
    .sort((a, b) => cmpText(a.name, b.name) || cmpStr(a.companyId, b.companyId));
  const pl = raw.markers.pipeline;
  const wb = raw.markers.weeklyBrief;
  const pipeline = pl
    ? {
        status: cleanText(pl.status, 20),
        reason: cleanText(pl.reason, 20),
        startedAt: toIsoUtc(pl.startedAt),
        finishedAt: toIsoUtc(pl.finishedAt),
        durationMs: intOrNull(pl.durationMs),
        domains: (Array.isArray(pl.domains) ? pl.domains : [])
          .map((d: any) => ({ domain: cleanText(d?.domain, 20), error: cleanText(d?.error, TEXT_LIMITS.evidence) }))
          .filter((d: { domain: string | null }) => d.domain !== null)
          .sort((a: { domain: string | null }, b: { domain: string | null }) => cmpStr(a.domain, b.domain)),
      }
    : null;
  const weeklyBrief = wb
    ? { weekStart: toYmd(wb.weekStart), outcome: cleanText(wb.outcome, 20), status: cleanText(wb.status, 20), finishedAt: toIsoUtc(wb.finishedAt) }
    : null;
  const insightCaches = raw.insightCaches
    .map((c) => ({ key: cleanText(c.viewName, 100) ?? '', cachedAt: toIsoUtc(c.cachedAt) }))
    .sort((a, b) => cmpStr(a.key, b.key));
  const latestCollected = sources.map((s) => s.lastCollectedAt).filter(nonNull).sort(cmpStr).pop() ?? null;
  const section: MdSection = {
    heading: '영역별 현황',
    columns: ['영역', '이름', '우선순위', '상태', '레코드(건)'],
    rows: areas.map((a) => [a.id, a.titleKo, a.priority, a.status, a.recordCount]),
  };
  const sourceSection: MdSection = {
    heading: '출처별 최신 수집 시각',
    columns: ['출처', '유형', '건수(건)', '최근 수집(KST)'],
    rows: sources.map((s) => [s.source, s.productType, s.count, kstDateTimeOfIso(s.lastCollectedAt)]),
  };
  const analysisSection: MdSection = {
    heading: '분석 반영 현황',
    columns: ['항목', '상태', '완료·생성(KST)'],
    rows: [
      ['기술 트렌드 파이프라인', pipeline?.status ?? null, kstDateTimeOfIso(pipeline?.finishedAt)],
      ['주간 브리프(마지막 시도)', weeklyBrief?.status ?? null, kstDateTimeOfIso(weeklyBrief?.finishedAt)],
      ['CI 값 최종 검증', null, kstDateTimeOfIso(raw.ciLastVerifiedAt)],
      ...insightCaches.map((c) => [`캐시 ${c.key}`, null, kstDateTimeOfIso(c.cachedAt)] as (string | null)[]),
    ],
  };
  return {
    data: {
      areas: areas.map((a) => ({ id: a.id, titleKo: a.titleKo, priority: a.priority, status: a.status, recordCount: a.recordCount })),
      sources,
      companyFreshness,
      analysis: { pipeline, weeklyBrief, ciLastVerifiedAt: toIsoUtc(raw.ciLastVerifiedAt), insightCaches },
    },
    summary: [
      `번들 ${ctx.bundleDate} (KST): 영역 ${areas.length}개 (정상 ${areas.filter((a) => a.status === 'ok').length}, 데이터 없음 ${areas.filter((a) => a.status === 'empty').length}, 실패 ${areas.filter((a) => a.status === 'failed').length})`,
      `출처별 최신 수집 시각 중 가장 최근: ${kstDateTimeOfIso(latestCollected) ?? '없음'} (KST)`,
      pipeline ? `기술 트렌드 파이프라인: ${pipeline.status ?? '상태 미상'} (완료 ${kstDateTimeOfIso(pipeline.finishedAt) ?? '-'} KST)` : '기술 트렌드 파이프라인: 기록 없음',
      `기업 ${companyFreshness.length}곳의 수집 신선도 포함`,
    ],
    sections: [section, sourceSection, analysisSection],
  };
}

export const OVERVIEW_AREA: AreaDef<OverviewRaw> = {
  id: 'overview',
  titleKo: '개요·신선도',
  priority: 'P0',
  areaSchemaVersion: 1,
  sourceTables: ['articles', 'companies', 'ci_freshness', 'data_migrations', 'view_cache'],
  derivedFrom: ['다른 영역 결과(recordCount·status)'],
  units: { count: '건', lastCollectedAt: 'ISO 8601 UTC', durationMs: 'ms' },
  build: buildOverview,
};

export type { BuildCtx };
