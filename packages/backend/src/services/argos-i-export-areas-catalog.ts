/**
 * ARGOS_I 내보내기 — 카탈로그성 영역(기업·로봇·부품·액추에이터·벤치마크·CI) 빌더. 순수 함수.
 *
 * 입력 행은 PostgreSQL `to_jsonb(row)` 결과(snake_case)다. 시각은 JS Date 로 해석하지 않고 toIsoUtc 로 문자열 처리한다.
 * 출력 필드는 전부 화이트리스트 방식으로 고른다 (알 수 없는 신규 컬럼이 조용히 내보내지지 않는다).
 */

import {
  ACTUATOR_MAP_SCHEMA_VERSION,
  type ActuatorMapBody,
  type ActuatorMapRobot,
} from './actuator-position-map.service.js';
import type { AreaContent, AreaDef, BuildCtx } from './argos-i-export-areas-types.js';
import {
  TEXT_LIMITS,
  boolOrNull,
  cleanList,
  cleanText,
  cmpNum,
  cmpStr,
  cmpText,
  groupBy,
  intOrNull,
  iso,
  kstYmdOfIso,
  numOrNull,
  rangeText,
  safeUrl,
  sanitizeDeep,
  str,
  tallyText,
  toYmd,
  type MdSection,
  type Row,
} from './argos-i-export-util.js';

const byId = (a: { id: string }, b: { id: string }) => cmpStr(a.id, b.id);

// ─────────────────────────────────────────────────────────────────────────────
// companies
// ─────────────────────────────────────────────────────────────────────────────

export interface CompaniesRaw {
  companies: Row[];
  workforce: Row[];
  talent: Row[];
}

function buildCompanies(raw: CompaniesRaw): AreaContent {
  const workforceBy = new Map(raw.workforce.map((w) => [String(w.company_id), w]));
  const talentBy = groupBy(raw.talent, (t) => String(t.company_id));
  const items = raw.companies
    .map((c) => {
      const id = String(c.id);
      const w = workforceBy.get(id);
      const trend = (talentBy.get(id) ?? [])
        .map((t) => ({
          year: intOrNull(t.year),
          totalHeadcount: intOrNull(t.total_headcount),
          humanoidTeamSize: intOrNull(t.humanoid_team_size),
          jobPostingCount: intOrNull(t.job_posting_count),
          source: str(t, 'source', 255),
        }))
        .sort((a, b) => cmpNum(a.year, b.year));
      return {
        id,
        name: str(c, 'name', 255) ?? '',
        country: str(c, 'country', 100),
        city: str(c, 'city', 100),
        foundingYear: intOrNull(c.founding_year),
        category: str(c, 'category', 100),
        mainBusiness: str(c, 'main_business', 255),
        homepageUrl: safeUrl(c.homepage_url),
        description: str(c, 'description', TEXT_LIMITS.note),
        valuationUsd: numOrNull(c.valuation_usd),
        workforce: w
          ? {
              totalHeadcountMin: intOrNull(w.total_headcount_min),
              totalHeadcountMax: intOrNull(w.total_headcount_max),
              humanoidTeamSize: intOrNull(w.humanoid_team_size),
              jobDistribution: sanitizeDeep(w.job_distribution),
              recordedAt: iso(w, 'recorded_at'),
              source: str(w, 'source', 255),
            }
          : null,
        talentTrend: trend,
      };
    })
    .sort((a, b) => cmpText(a.name, b.name) || cmpStr(a.id, b.id));

  const countries = new Set(items.map((i) => i.country).filter(Boolean));
  const section: MdSection = {
    heading: '기업 목록',
    columns: ['기업', '국가', '도시', '설립(연도)', '분류', '주요 사업', '기업가치(USD)', '인력(명)', '휴머노이드 팀(명)', '홈페이지'],
    rows: items.map((i) => [
      i.name,
      i.country,
      i.city,
      i.foundingYear,
      i.category,
      i.mainBusiness,
      i.valuationUsd,
      i.workforce ? rangeText(i.workforce.totalHeadcountMin, i.workforce.totalHeadcountMax) : null,
      i.workforce?.humanoidTeamSize ?? null,
      i.homepageUrl ? { text: '링크', url: i.homepageUrl } : null,
    ]),
  };
  return {
    data: { items },
    summary: [
      `수록 기업 ${items.length}개 (국가 ${countries.size}개국)`,
      `인력 데이터 보유 기업 ${items.filter((i) => i.workforce).length}개`,
      `기업가치(USD) 보유 기업 ${items.filter((i) => i.valuationUsd !== null).length}개`,
      `연도별 인력 추이 기록 ${items.reduce((n, i) => n + i.talentTrend.length, 0)}건`,
      `분류별 기업 수: ${tallyText(items.map((i) => i.category))}`,
    ],
    sections: [section],
  };
}

export const COMPANIES_AREA: AreaDef<CompaniesRaw> = {
  id: 'companies',
  titleKo: '기업',
  priority: 'P0',
  areaSchemaVersion: 1,
  sourceTables: ['companies', 'workforce_data', 'talent_trends'],
  derivedFrom: [],
  units: { valuationUsd: 'USD', headcount: '명', foundingYear: '연도(서기)', recordedAt: 'ISO 8601 UTC' },
  build: buildCompanies,
};

// ─────────────────────────────────────────────────────────────────────────────
// robots
// ─────────────────────────────────────────────────────────────────────────────

export interface RobotsRaw {
  robots: Row[];
  body: Row[];
  hand: Row[];
  computing: Row[];
  sensors: Row[];
  power: Row[];
  links: Row[];
}

function buildRobots(raw: RobotsRaw): AreaContent {
  const one = (rows: Row[]) => new Map(rows.map((r) => [String(r.robot_id), r]));
  const bodyBy = one(raw.body);
  const handBy = one(raw.hand);
  const compBy = one(raw.computing);
  const sensBy = one(raw.sensors);
  const powBy = one(raw.power);
  const linksBy = groupBy(raw.links, (l) => String(l.robot_id));

  const items = raw.robots
    .map((r) => {
      const id = String(r.id);
      const b = bodyBy.get(id);
      const h = handBy.get(id);
      const c = compBy.get(id);
      const s = sensBy.get(id);
      const p = powBy.get(id);
      const dataType = r.data_type === 'forecast' ? 'forecast' : 'confirmed';
      return {
        id,
        name: str(r, 'name', 255) ?? '',
        company: { id: r.company_id ? String(r.company_id) : null, name: str(r, 'company_name', 255), country: str(r, 'company_country', 100) },
        announcementYear: intOrNull(r.announcement_year),
        announcementQuarter: intOrNull(r.announcement_quarter),
        status: str(r, 'status', 50),
        purpose: str(r, 'purpose', 50),
        locomotionType: str(r, 'locomotion_type', 50),
        handType: str(r, 'hand_type', 50),
        commercializationStage: str(r, 'commercialization_stage', 50),
        region: str(r, 'region', 50),
        dataType,
        forecast:
          dataType === 'forecast'
            ? {
                rationale: str(r, 'forecast_rationale', TEXT_LIMITS.note),
                sources:
                  typeof r.forecast_sources === 'string'
                    ? cleanList(r.forecast_sources.split(';'), TEXT_LIMITS.evidence, 20)
                    : [],
                confidence: str(r, 'forecast_confidence', 10),
              }
            : null,
        body: b
          ? {
              heightCm: numOrNull(b.height_cm),
              weightKg: numOrNull(b.weight_kg),
              payloadKg: numOrNull(b.payload_kg),
              dofCount: intOrNull(b.dof_count),
              maxSpeedMps: numOrNull(b.max_speed_mps),
              operationTimeHours: numOrNull(b.operation_time_hours),
            }
          : null,
        hand: h
          ? {
              handType: str(h, 'hand_type', 50),
              fingerCount: intOrNull(h.finger_count),
              handDof: intOrNull(h.hand_dof),
              gripForceN: numOrNull(h.grip_force_n),
              isInterchangeable: boolOrNull(h.is_interchangeable),
            }
          : null,
        computing: c
          ? {
              mainSoc: str(c, 'main_soc', 255),
              topsMin: numOrNull(c.tops_min),
              topsMax: numOrNull(c.tops_max),
              architectureType: str(c, 'architecture_type', 50),
            }
          : null,
        sensors: s
          ? {
              cameras: sanitizeDeep(s.cameras),
              depthSensor: str(s, 'depth_sensor', 255),
              lidar: str(s, 'lidar', 255),
              imu: str(s, 'imu', 255),
              forceTorque: str(s, 'force_torque', 255),
              touchSensors: sanitizeDeep(s.touch_sensors),
            }
          : null,
        power: p
          ? {
              batteryType: str(p, 'battery_type', 100),
              capacityWh: numOrNull(p.capacity_wh),
              operationTimeHours: numOrNull(p.operation_time_hours),
              chargingMethod: str(p, 'charging_method', 100),
            }
          : null,
        components: (linksBy.get(id) ?? [])
          .map((l) => ({
            componentId: String(l.component_id),
            type: str(l, 'type', 50),
            name: str(l, 'name', 255),
            vendor: str(l, 'vendor', 255),
            usageLocation: str(l, 'usage_location', 100),
            quantity: intOrNull(l.quantity),
          }))
          .sort((a, b) => cmpStr(a.type, b.type) || cmpText(a.name, b.name) || cmpStr(a.componentId, b.componentId)),
        updatedAt: iso(r, 'updated_at'),
      };
    })
    .sort((a, b) => cmpText(a.name, b.name) || cmpText(a.company.name, b.company.name) || cmpStr(a.id, b.id));

  const confirmed = items.filter((i) => i.dataType === 'confirmed').length;
  const companies = new Set(items.map((i) => i.company.id).filter(Boolean));
  const section: MdSection = {
    heading: '로봇 목록',
    columns: [
      '로봇', '기업', '국가', '구분', '발표(연/분기)', '상태', '용도', '이동 방식', '키(cm)', '무게(kg)', '페이로드(kg)', '자유도(DoF)',
      '속도(m/s)', '가동(h)', '손 자유도(DoF)', '그립력(N)', '연산(TOPS)', '용량(Wh)',
    ],
    rows: items.map((i) => [
      i.name,
      i.company.name,
      i.company.country,
      i.dataType === 'forecast' ? '전망' : '확정',
      i.announcementYear === null ? null : `${i.announcementYear}${i.announcementQuarter ? `/Q${i.announcementQuarter}` : ''}`,
      i.status,
      i.purpose,
      i.locomotionType,
      i.body?.heightCm ?? null,
      i.body?.weightKg ?? null,
      i.body?.payloadKg ?? null,
      i.body?.dofCount ?? null,
      i.body?.maxSpeedMps ?? null,
      i.body?.operationTimeHours ?? i.power?.operationTimeHours ?? null,
      i.hand?.handDof ?? null,
      i.hand?.gripForceN ?? null,
      i.computing ? rangeText(i.computing.topsMin, i.computing.topsMax) : null,
      i.power?.capacityWh ?? null,
    ]),
  };
  return {
    data: { items },
    summary: [
      `로봇 ${items.length}대 (확정 ${confirmed}대, 전망 ${items.length - confirmed}대)`,
      `제조 기업 ${companies.size}개`,
      `상용화 단계별: ${tallyText(items.map((i) => i.commercializationStage))}`,
      `이동 방식별: ${tallyText(items.map((i) => i.locomotionType))}`,
      `신체 스펙 보유 ${items.filter((i) => i.body).length}대, 손 스펙 보유 ${items.filter((i) => i.hand).length}대, 연산 스펙 보유 ${items.filter((i) => i.computing).length}대`,
    ],
    sections: [section],
    notes: ['전망(forecast) 로봇은 공개 확정 정보가 아닌 ARGOS 의 예측이며 `dataType` 과 `forecast` 필드로 구분한다.'],
  };
}

export const ROBOTS_AREA: AreaDef<RobotsRaw> = {
  id: 'robots',
  titleKo: '휴머노이드 로봇',
  priority: 'P0',
  areaSchemaVersion: 1,
  sourceTables: ['humanoid_robots', 'companies', 'body_specs', 'hand_specs', 'computing_specs', 'sensor_specs', 'power_specs', 'robot_components', 'components'],
  derivedFrom: [],
  units: {
    heightCm: 'cm', weightKg: 'kg', payloadKg: 'kg', maxSpeedMps: 'm/s', operationTimeHours: 'h', gripForceN: 'N',
    topsMin: 'TOPS', topsMax: 'TOPS', capacityWh: 'Wh', dofCount: 'DoF', handDof: 'DoF', announcementYear: '연도(서기)',
  },
  build: buildRobots,
};

// ─────────────────────────────────────────────────────────────────────────────
// components
// ─────────────────────────────────────────────────────────────────────────────

export interface ComponentsRaw {
  components: Row[];
  links: Row[];
  /** id, announcement_year */
  robots: Row[];
}

function specNum(specs: Record<string, any> | null | undefined, key: string): number | null {
  return numOrNull(specs?.[key]);
}

function buildComponents(raw: ComponentsRaw): AreaContent {
  const linksBy = groupBy(raw.links, (l) => String(l.component_id));
  const yearByRobot = new Map(raw.robots.map((r) => [String(r.id), intOrNull(r.announcement_year)]));
  const items = raw.components
    .map((c) => {
      const id = String(c.id);
      return {
        id,
        type: str(c, 'type', 50) ?? '',
        name: str(c, 'name', 255) ?? '',
        vendor: str(c, 'vendor', 255),
        specifications: sanitizeDeep(c.specifications, 200),
        linkedRobots: (linksBy.get(id) ?? [])
          .map((l) => ({ robotId: String(l.robot_id), usageLocation: str(l, 'usage_location', 100), quantity: intOrNull(l.quantity) }))
          .sort((a, b) => cmpStr(a.robotId, b.robotId)),
      };
    })
    .sort((a, b) => cmpStr(a.type, b.type) || cmpText(a.name, b.name) || cmpStr(a.id, b.id));
  const specsOf = (c: (typeof items)[number]) => (c.specifications ?? {}) as Record<string, any>;

  const torqueDensity = items
    .filter((c) => c.type === 'actuator')
    .map((c) => ({ c, torque: specNum(specsOf(c), 'maxTorqueNm'), weight: specNum(specsOf(c), 'weightKg') }))
    .filter((x) => x.torque && x.weight)
    .map((x) => ({
      componentId: x.c.id,
      name: x.c.name,
      vendor: x.c.vendor,
      weightKg: x.weight,
      maxTorqueNm: x.torque,
      torqueDensityNmPerKg: Number((x.torque! / x.weight!).toFixed(4)),
    }));
  const socPerformance = items
    .filter((c) => c.type === 'soc')
    .map((c) => {
      const s = specsOf(c);
      const power = numOrNull(s.powerConsumption) ?? (Number.parseFloat(String(s.tdpWatts ?? '')) || null);
      const tops = specNum(s, 'topsMax') ?? specNum(s, 'topsMin') ?? specNum(s, 'tops');
      return { componentId: c.id, name: c.name, vendor: c.vendor, powerW: power, tops, processNode: cleanText(s.processNode, 50) };
    });
  const byYear = new Map<number, { sum: number; max: number; n: number }>();
  for (const c of items.filter((x) => x.type === 'soc')) {
    const tops = specNum(specsOf(c), 'topsMax') ?? specNum(specsOf(c), 'topsMin');
    if (!tops) continue;
    for (const l of c.linkedRobots) {
      const year = yearByRobot.get(l.robotId);
      if (!year) continue;
      const e = byYear.get(year) ?? { sum: 0, max: 0, n: 0 };
      e.sum += tops;
      e.max = Math.max(e.max, tops);
      e.n += 1;
      byYear.set(year, e);
    }
  }
  const topsTimeline = [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, e]) => ({ year, avgTops: Number((e.sum / e.n).toFixed(2)), maxTops: e.max, count: e.n }));
  const computingLocation = { onboard: 0, edge: 0, cloud: 0, hybrid: 0 };
  for (const c of items.filter((x) => x.type === 'soc')) {
    const loc = specsOf(c).location;
    if (typeof loc === 'string' && Object.prototype.hasOwnProperty.call(computingLocation, loc)) {
      computingLocation[loc as keyof typeof computingLocation] += 1;
    }
  }
  const vendors = new Set(items.map((i) => i.vendor).filter(Boolean));
  const section: MdSection = {
    heading: '부품 목록',
    columns: ['유형', '부품', '공급사', '정격 토크(Nm)', '최대 토크(Nm)', '무게(kg)', '연산(TOPS)', '용량(Wh)', '탑재 로봇 수'],
    rows: items.map((c) => {
      const s = specsOf(c);
      const topsMin = specNum(s, 'topsMin');
      const topsMax = specNum(s, 'topsMax');
      return [
        c.type, c.name, c.vendor, specNum(s, 'ratedTorqueNm'), specNum(s, 'maxTorqueNm'), specNum(s, 'weightKg'),
        rangeText(topsMin, topsMax), specNum(s, 'capacityWh'), c.linkedRobots.length,
      ];
    }),
  };
  return {
    data: {
      items,
      analytics: { torqueDensity, socPerformance, topsTimeline, computingLocation },
    },
    summary: [
      `부품 ${items.length}종 (공급사 ${vendors.size}곳)`,
      `유형별: ${tallyText(items.map((i) => i.type), 4)}`,
      `토크 밀도 산출 가능 액추에이터 ${torqueDensity.length}종`,
      `SoC ${socPerformance.length}종, 연도별 연산 성능 집계 ${topsTimeline.length}개 연도`,
      `로봇과 연결된 부품 연결 ${raw.links.length}건`,
    ],
    sections: [section],
    notes: ['토크 밀도(Nm/kg) = 최대 토크(Nm) / 무게(kg). 연산 성능은 TOPS, 전력은 W 이다.'],
  };
}

export const COMPONENTS_AREA: AreaDef<ComponentsRaw> = {
  id: 'components',
  titleKo: '부품',
  priority: 'P0',
  areaSchemaVersion: 1,
  sourceTables: ['components', 'robot_components', 'humanoid_robots'],
  derivedFrom: [],
  units: {
    ratedTorqueNm: 'Nm', maxTorqueNm: 'Nm', speedRpm: 'rpm', weightKg: 'kg', topsMin: 'TOPS', topsMax: 'TOPS', tops: 'TOPS',
    capacityWh: 'Wh', powerW: 'W', torqueDensityNmPerKg: 'Nm/kg', avgTops: 'TOPS', maxTops: 'TOPS',
  },
  build: buildComponents,
};

// ─────────────────────────────────────────────────────────────────────────────
// actuator-map / actuator-sourcing  (actuatorPositionMapService.getMap() 결과를 재사용, 추가 쿼리 없음)
// ─────────────────────────────────────────────────────────────────────────────

export type ActuatorMapRaw = Omit<ActuatorMapBody, 'generatedAt'> & { generatedAt?: string; cached?: boolean };

/** 키 순서를 고정한다 — 캐시(jsonb)에서 읽은 객체와 새로 계산한 객체의 키 순서가 달라 바이트가 흔들리는 것을 막는다 */
function pickKeys<K extends string>(obj: Record<string, any> | null | undefined, keys: readonly K[]): Record<K, number | null> | null {
  if (!obj) return null;
  const out = {} as Record<K, number | null>;
  for (const k of keys) out[k] = numOrNull(obj[k]);
  return out;
}

const DIFFICULTY_KEYS = ['L', 'D', 'H', 'S'] as const;
const MAP_STATS_KEYS = ['robots', 'complete', 'incomplete', 'suppliers', 'edges', 'adoptions'] as const;
const SOURCING_STATS_KEYS = ['robots', 'inHouse', 'inHouseSells', 'external', 'externalMixed', 'unknown', 'unknownPresumed', 'regraded', 'derived', 'componentSourcing'] as const;

function pickSources(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return list.map((u) => safeUrl(u)).filter((u): u is string => u !== null).sort(cmpStr);
}

function mapRobotItem(r: ActuatorMapRobot) {
  return {
    id: String(r.id),
    name: cleanText(r.name, 255) ?? '',
    company: cleanText(r.company, 255),
    companyId: r.companyId ? String(r.companyId) : null,
    region: r.region,
    locomotion: r.locomotion,
    stage: cleanText(r.stage, 50),
    year: intOrNull(r.year),
    forecast: r.forecast === true,
    isLG: r.isLG === true,
    height: numOrNull(r.height),
    weight: numOrNull(r.weight),
    payload: numOrNull(r.payload),
    dof: intOrNull(r.dof),
    handDof: intOrNull(r.handDof),
    speed: numOrNull(r.speed),
    incomplete: r.incomplete === true,
    actuators: (r.actuators ?? [])
      .map((a) => ({
        name: cleanText(a.name, 255) ?? '',
        vendor: cleanText(a.vendor, 255),
        inHouse: a.inHouse === true,
        type: a.type,
        torqueNm: numOrNull(a.torqueNm),
        weightKg: numOrNull(a.weightKg),
        quantity: intOrNull(a.quantity),
        usageLocation: cleanText(a.usageLocation, 100),
        source: a.source,
        confidence: cleanText(a.confidence, 8),
      }))
      .sort((a, b) => cmpText(a.name, b.name) || cmpText(a.vendor, b.vendor) || cmpStr(a.usageLocation, b.usageLocation)),
    actuatorTypeLabel: r.actuatorTypeLabel,
    actuatorTypeNote: cleanText(r.actuatorTypeNote, TEXT_LIMITS.evidence),
    price: r.price
      ? { min: numOrNull(r.price.min), max: numOrNull(r.price.max), conf: cleanText(r.price.conf, 8), src: cleanText(r.price.src, TEXT_LIMITS.evidence) }
      : null,
    sources: pickSources(r.sources),
  };
}

function buildActuatorMap(raw: ActuatorMapRaw): AreaContent {
  const robots = (raw.robots ?? []).map(mapRobotItem).sort((a, b) => cmpText(a.name, b.name) || cmpStr(a.id, b.id));
  const suppliers = (raw.suppliers ?? [])
    .map((s) => ({
      vendor: cleanText(s.vendor, 255) ?? '',
      country: cleanText(s.country, 100),
      model: cleanText(s.model, 255) ?? '',
      type: cleanText(s.type, 100),
      peakTorqueNm: numOrNull(s.peakTorqueNm),
      continuousTorqueNm: numOrNull(s.continuousTorqueNm),
      weightKg: numOrNull(s.weightKg),
      diameterMm: numOrNull(s.diameterMm),
      priceUsd: numOrNull(s.priceUsd),
      status: cleanText(s.status, 50),
      targetMarket: cleanText(s.targetMarket, 255),
      source: s.source,
      diameterRangeMm: s.diameterRangeMm ? { min: numOrNull(s.diameterRangeMm.min), max: numOrNull(s.diameterRangeMm.max) } : null,
      integrationLevel: cleanText(s.integrationLevel, 50),
      isLG: s.isLG === true,
      segment: s.segment,
      segments: [...(s.segments ?? [])],
      segmentBasis: s.segmentBasis,
      adoptionIds: [...(s.adoptionIds ?? [])].map(String).sort(cmpStr),
    }))
    .sort((a, b) => cmpText(a.vendor, b.vendor) || cmpText(a.model, b.model) || cmpStr(a.source, b.source));
  const edges = (raw.edges ?? [])
    .map((e) => ({
      robotId: String(e.robotId),
      robotName: cleanText(e.robotName, 255),
      company: cleanText(e.company, 255),
      vendor: cleanText(e.vendor, 255) ?? '',
      inHouse: e.inHouse === true,
      type: e.type,
      quantity: intOrNull(e.quantity),
      confidence: cleanText(e.confidence, 8),
      basis: e.basis,
      posture: e.posture,
      role: cleanText(e.role, 100),
      level: e.level,
    }))
    .sort((a, b) => cmpStr(a.robotId, b.robotId) || cmpText(a.vendor, b.vendor) || cmpStr(a.basis, b.basis) || cmpStr(a.type, b.type));
  const complete = robots.filter((r) => !r.incomplete).length;
  const section: MdSection = {
    heading: '로봇별 액추에이터 포지션',
    columns: ['로봇', '기업', '구분', '이동', '구동 방식', '키(cm)', '무게(kg)', '페이로드(kg)', '자유도(DoF)', '손 자유도(DoF)', '속도(m/s)', '가격(USD)', '액추에이터 수', '데이터 불완전'],
    rows: robots.map((r) => [
      r.name, r.company, r.forecast ? '전망' : '확정', r.locomotion, r.actuatorTypeLabel, r.height, r.weight, r.payload, r.dof, r.handDof, r.speed,
      r.price ? rangeText(r.price.min, r.price.max) : null, r.actuators.length, r.incomplete,
    ]),
  };
  const supplierSection: MdSection = {
    heading: '액추에이터 공급 제품',
    columns: ['공급사', '모델', '유형', '피크 토크(Nm)', '연속 토크(Nm)', '무게(kg)', '직경(mm)', '가격(USD)', '대표 세그먼트'],
    rows: suppliers.map((s) => [s.vendor, s.model, s.type, s.peakTorqueNm, s.continuousTorqueNm, s.weightKg, s.diameterMm, s.priceUsd, s.segment]),
  };
  return {
    data: {
      difficultyDefault: pickKeys(raw.difficultyDefault, DIFFICULTY_KEYS),
      typeOrder: [...(raw.typeOrder ?? [])],
      segmentOrder: [...(raw.segmentOrder ?? [])],
      stats: pickKeys(raw.stats, MAP_STATS_KEYS),
      robots,
      suppliers,
      edges,
    },
    summary: [
      `로봇 ${robots.length}대 (스펙 완전 ${complete}대, 불완전 ${robots.length - complete}대)`,
      `액추에이터 공급 제품 ${suppliers.length}종`,
      `공급 관계(엣지) ${edges.length}건`,
      `구동 방식별: ${tallyText(robots.map((r) => r.actuatorTypeLabel), 4)}`,
      `제어 난이도 지수 기본 가중치: 보행 ${raw.difficultyDefault?.L ?? '-'}, 전신 자유도 ${raw.difficultyDefault?.D ?? '-'}, 손 자유도 ${raw.difficultyDefault?.H ?? '-'}, 속도 ${raw.difficultyDefault?.S ?? '-'} (합 100 기준 가중치)`,
    ],
    sections: [section, supplierSection],
    notes: ['제어 난이도 지수는 서버가 계산하지 않는다. `difficultyDefault` 가중치와 로봇별 입력값(보행 방식·자유도·손 자유도·속도)을 제공하므로 수신 측에서 산출한다.'],
  };
}

export const ACTUATOR_MAP_AREA: AreaDef<ActuatorMapRaw> = {
  id: 'actuator-map',
  titleKo: '액추에이터 포지션·공급망 맵',
  priority: 'P0',
  areaSchemaVersion: ACTUATOR_MAP_SCHEMA_VERSION,
  sourceTables: ['humanoid_robots', 'body_specs', 'hand_specs', 'companies', 'robot_components', 'components', 'products', 'product_specs', 'ci_values'],
  derivedFrom: ['actuator-position-map(view_cache)'],
  units: {
    height: 'cm', weight: 'kg', payload: 'kg', dof: 'DoF', handDof: 'DoF', speed: 'm/s', torqueNm: 'Nm', weightKg: 'kg',
    peakTorqueNm: 'Nm', continuousTorqueNm: 'Nm', diameterMm: 'mm', priceUsd: 'USD', price: 'USD', year: '연도(서기)',
  },
  build: buildActuatorMap,
};

const GRADE_LEGEND = '근거 등급: A 공식 ~ D 추정(CI). 자체 개발 확인은 근거 등급 A·B 만 인정하고, C·D 이거나 근거가 없으면 확인 불가로 둔다.';

function buildActuatorSourcing(raw: ActuatorMapRaw): AreaContent {
  const robots = [...(raw.robots ?? [])].sort((a, b) => cmpText(a.name, b.name) || cmpStr(a.id, b.id));
  const sourcing = robots.map((r) => {
    const s = r.sourcing;
    return {
      robotId: String(r.id),
      robotName: cleanText(r.name, 255) ?? '',
      company: cleanText(r.company, 255),
      forecast: r.forecast === true,
      posture: s.posture,
      kind: s.kind,
      sellsExternally: boolOrNull(s.sellsExternally),
      evidenceGrade: cleanText(s.evidenceGrade, 8),
      evidence: (s.evidence ?? []).map((e) => ({
        claim: cleanText(e.claim, TEXT_LIMITS.evidence) ?? '',
        source: cleanText(e.source, 255),
        url: safeUrl(e.url),
        grade: cleanText(e.grade, 8),
        date: toYmd(e.date),
      })),
      externalVendors: (s.externalVendors ?? []).map((v) => ({
        vendor: cleanText(v.vendor, 255) ?? '',
        role: cleanText(v.role, 100),
        grade: cleanText(v.grade, 8),
        url: safeUrl(v.url),
        level: v.level,
      })),
      componentSourcing: s.componentSourcing === true,
      noteKo: cleanText(s.noteKo, TEXT_LIMITS.note),
      basis: s.basis,
    };
  });
  const adoptions = (raw.adoptions ?? [])
    .map((a) => ({
      id: String(a.id),
      robotName: cleanText(a.robotName, 255) ?? '',
      company: cleanText(a.company, 255),
      country: cleanText(a.country, 100),
      segment: a.segment,
      marketSegment: a.marketSegment,
      level: a.level,
      robotClass: cleanText(a.robotClass, 100),
      actuatorVendor: cleanText(a.actuatorVendor, 255) ?? '',
      vendorKey: cleanText(a.vendorKey, 200),
      actuatorModel: cleanText(a.actuatorModel, 255),
      usage: cleanText(a.usage, TEXT_LIMITS.evidence),
      evidenceGrade: cleanText(a.evidenceGrade, 8),
      sources: (a.sources ?? [])
        .map((s) => ({ url: safeUrl(s.url), title: cleanText(s.title, TEXT_LIMITS.evidence) }))
        .filter((s) => s.url !== null),
      noteKo: cleanText(a.noteKo, TEXT_LIMITS.note),
      year: intOrNull(a.year),
    }))
    .sort(byId);
  const vendorMarkets = (raw.vendorMarkets ?? [])
    .map((v) => ({
      vendor: cleanText(v.vendor, 255) ?? '',
      vendorKey: cleanText(v.vendorKey, 200),
      targetMarketsKo: cleanList(v.targetMarketsKo, TEXT_LIMITS.evidence, 20),
      segments: v.segments ? [...v.segments] : null,
      grade: cleanText(v.grade, 8),
      url: safeUrl(v.url),
    }))
    .sort((a, b) => cmpStr(a.vendorKey, b.vendorKey));
  const section: MdSection = {
    heading: '로봇별 액추에이터 조달 태세',
    columns: ['로봇', '기업', '구분', '조달 태세', '세부 유형', '외부 판매', '근거 등급', '외부 공급사', '비고'],
    rows: sourcing.map((s) => [
      s.robotName, s.company, s.forecast ? '전망' : '확정', s.posture, s.kind, s.sellsExternally, s.evidenceGrade,
      s.externalVendors.map((v) => v.vendor).join(', ') || null, s.noteKo,
    ]),
  };
  const adoptionSection: MdSection = {
    heading: '외부 액추에이터 채택 사례',
    columns: ['로봇', '기업', '분류', '공급 단위', '액추에이터 공급사', '모델', '용도', '근거 등급', '연도'],
    rows: adoptions.map((a) => [a.robotName, a.company, a.segment, a.level, a.actuatorVendor, a.actuatorModel, a.usage, a.evidenceGrade, a.year]),
  };
  const st = raw.sourcingStats;
  return {
    data: { sourcing, adoptions, vendorMarkets, sourcingStats: pickKeys(st, SOURCING_STATS_KEYS) },
    summary: [
      `조달 태세 판정 로봇 ${sourcing.length}대 (전망 제외 ${st?.robots ?? '-'}대)`,
      `자체 개발 ${st?.inHouse ?? '-'}대, 자체 개발+외부 판매 ${st?.inHouseSells ?? '-'}대, 외부 조달 ${st?.external ?? '-'}대, 미확인 ${st?.unknown ?? '-'}대`,
      `재판정 기준 ${st?.regraded ?? '-'}대, 보수적 파생 ${st?.derived ?? '-'}대`,
      `외부 채택 사례 ${adoptions.length}건, 공급사 타깃 시장 ${vendorMarkets.length}곳`,
    ],
    sections: [section, adoptionSection],
    notes: [
      GRADE_LEGEND,
      '조달 태세(posture): in_house=자체 개발, in_house_sells=자체 개발 후 외부 판매, external=외부 조달, unknown=확인 불가. `basis`: regrade=재판정 레코드 기준, derived=재판정 레코드 없음(보수적 폴백).',
    ],
  };
}

export const ACTUATOR_SOURCING_AREA: AreaDef<ActuatorMapRaw> = {
  id: 'actuator-sourcing',
  titleKo: '액추에이터 조달 태세·채택 사례',
  priority: 'P0',
  areaSchemaVersion: 1,
  sourceTables: ['actuator_sourcing', 'actuator_adoptions', 'actuator_vendor_markets'],
  derivedFrom: ['actuator-position-map(view_cache)'],
  units: { year: '연도(서기)' },
  build: buildActuatorSourcing,
};

// ─────────────────────────────────────────────────────────────────────────────
// robot-benchmark / hand-benchmark
// ─────────────────────────────────────────────────────────────────────────────

export interface BenchmarkRaw {
  axes: Row[];
  competitors: Row[];
  scores: Row[];
}

function buildBenchmark(raw: BenchmarkRaw, opts: { hand: boolean }): AreaContent {
  const axes = raw.axes
    .map((a) => ({
      key: str(a, 'key', 50) ?? '',
      label: (str(a, 'label', 100) ?? '').replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\u200d\ufe0f]+\s*/u, ''),
      description: str(a, 'description', TEXT_LIMITS.note),
      perfectDef: str(a, 'perfect_def', TEXT_LIMITS.note),
      ...(opts.hand ? { unit: str(a, 'unit', 30) } : {}),
      sortOrder: intOrNull(a.sort_order) ?? 0,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || cmpStr(a.key, b.key))
    .map(({ sortOrder: _s, ...rest }) => rest);
  const scoresBy = groupBy(raw.scores, (s) => String(s.competitor_id));
  const competitors = raw.competitors
    .filter((c) => c.is_active !== false)
    .map((c) => {
      const scores: Record<string, unknown> = {};
      for (const s of [...(scoresBy.get(String(c.id)) ?? [])].sort((a, b) => cmpStr(a.axis_key, b.axis_key))) {
        scores[String(s.axis_key)] = {
          currentScore: intOrNull(s.current_score),
          targetScore: intOrNull(s.target_score),
          ...(opts.hand ? { rawValue: str(s, 'raw_value', 100) } : {}),
          rationale: str(s, 'rationale', TEXT_LIMITS.note),
        };
      }
      return {
        slug: str(c, 'slug', 50) ?? '',
        name: str(c, 'name', 255) ?? '',
        manufacturer: str(c, 'manufacturer', 255),
        country: str(c, 'country', 100),
        [opts.hand ? 'category' : 'stage']: str(c, opts.hand ? 'category' : 'stage', 50),
        scores,
        sortOrder: intOrNull(c.sort_order) ?? 0,
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || cmpStr(a.slug, b.slug))
    .map(({ sortOrder: _s, ...rest }) => rest);
  const axisKeys = axes.map((a) => a.key);
  const cur = (c: (typeof competitors)[number], k: string): number | null =>
    numOrNull(((c.scores as Record<string, any>)[k] ?? {}).currentScore);
  const avg = (c: (typeof competitors)[number]): number | null => {
    const vs = axisKeys.map((k) => cur(c, k)).filter((v): v is number => v !== null);
    return vs.length ? Number((vs.reduce((a, b) => a + b, 0) / vs.length).toFixed(2)) : null;
  };
  const ranked = competitors.map((c) => ({ c, avg: avg(c) })).sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1) || cmpStr(a.c.slug, b.c.slug));
  const section: MdSection = {
    heading: opts.hand ? '핸드 × 축 현재 점수(1~10)' : '경쟁 로봇 × 축 현재 점수(1~10)',
    columns: [opts.hand ? '핸드' : '로봇', '제조사', '국가', opts.hand ? '분류' : '단계', ...axes.map((a) => `${a.label}(점수 1~10)`), '평균(점수 1~10)'],
    rows: competitors.map((c) => [
      c.name, c.manufacturer, c.country, (c as Record<string, any>)[opts.hand ? 'category' : 'stage'],
      ...axisKeys.map((k) => cur(c, k)), avg(c),
    ]),
  };
  const top = ranked[0];
  return {
    data: { axes, competitors },
    summary: [
      `비교 대상 ${competitors.length}${opts.hand ? '종 핸드' : '개 로봇'}, 평가 축 ${axes.length}개`,
      top && top.avg !== null ? `현재 점수 평균 최고: ${top.c.name} ${top.avg}점 (1~10점 척도)` : '현재 점수 평균 최고: 없음',
      `점수 입력 ${raw.scores.length}건`,
      '점수 척도: 현재 점수·목표 점수 모두 0~10 정수, 10 이 해당 축의 완벽(Perfect) 기준',
    ],
    sections: [section],
    notes: opts.hand ? ['`rawValue` 는 "24 DoF" 같은 원본 수치 문자열이다.'] : [],
  };
}

export const ROBOT_BENCHMARK_AREA: AreaDef<BenchmarkRaw> = {
  id: 'robot-benchmark',
  titleKo: '로봇 Perfect 벤치마크',
  priority: 'P0',
  areaSchemaVersion: 1,
  sourceTables: ['ci_benchmark_axes', 'ci_competitors', 'ci_benchmark_scores'],
  derivedFrom: [],
  units: { currentScore: '점수(0~10)', targetScore: '점수(0~10)' },
  build: (raw) => buildBenchmark(raw, { hand: false }),
};

export const HAND_BENCHMARK_AREA: AreaDef<BenchmarkRaw> = {
  id: 'hand-benchmark',
  titleKo: '핸드 Perfect 벤치마크',
  priority: 'P0',
  areaSchemaVersion: 1,
  sourceTables: ['hand_benchmark_axes', 'hand_competitors', 'hand_benchmark_scores'],
  derivedFrom: [],
  units: { currentScore: '점수(0~10)', targetScore: '점수(0~10)', rawValue: '원본 수치 문자열(축별 단위는 axes[].unit)' },
  build: (raw) => buildBenchmark(raw, { hand: true }),
};

// ─────────────────────────────────────────────────────────────────────────────
// ci-matrix
// ─────────────────────────────────────────────────────────────────────────────

export interface CiMatrixRaw {
  competitors: Row[];
  layers: Row[];
  categories: Row[];
  items: Row[];
  values: Row[];
  freshness: Row[];
}

function buildCiMatrix(raw: CiMatrixRaw): AreaContent {
  const competitors = raw.competitors
    .filter((c) => c.is_active !== false)
    .map((c) => ({
      id: String(c.id),
      slug: str(c, 'slug', 50) ?? '',
      name: str(c, 'name', 255) ?? '',
      manufacturer: str(c, 'manufacturer', 255),
      country: str(c, 'country', 100),
      stage: str(c, 'stage', 50),
      sortOrder: intOrNull(c.sort_order) ?? 0,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || cmpStr(a.slug, b.slug));
  const compIds = new Set(competitors.map((c) => c.id));
  const slugById = new Map(competitors.map((c) => [c.id, c.slug]));
  const valuesByItem = groupBy(raw.values.filter((v) => compIds.has(String(v.competitor_id))), (v) => String(v.item_id));
  const itemsByCat = groupBy(raw.items, (i) => String(i.category_id));
  const catsByLayer = groupBy(raw.categories, (c) => String(c.layer_id));
  const order = (a: Row, b: Row) => (intOrNull(a.sort_order) ?? 0) - (intOrNull(b.sort_order) ?? 0) || cmpStr(a.id, b.id);

  const flat: { layer: string; category: string; item: string; cells: Map<string, { value: string | null; confidence: string | null }> }[] = [];
  const layers = [...raw.layers].sort((a, b) => order(a, b) || cmpStr(a.slug, b.slug)).map((l) => {
    const categories = [...(catsByLayer.get(String(l.id)) ?? [])].sort(order).map((cat) => {
      const items = [...(itemsByCat.get(String(cat.id)) ?? [])].sort(order).map((it) => {
        const values = [...(valuesByItem.get(String(it.id)) ?? [])]
          .map((v) => ({
            competitor: slugById.get(String(v.competitor_id)) ?? '',
            value: str(v, 'value', TEXT_LIMITS.note),
            confidence: str(v, 'confidence', 1),
            source: str(v, 'source', TEXT_LIMITS.evidence),
            sourceUrl: safeUrl(v.source_url),
            sourceDate: toYmd(v.source_date),
            lastVerified: iso(v, 'last_verified'),
          }))
          .sort((a, b) => cmpStr(a.competitor, b.competitor));
        flat.push({
          layer: str(l, 'name', 100) ?? '',
          category: str(cat, 'name', 200) ?? '',
          item: str(it, 'name', 200) ?? '',
          cells: new Map(values.map((v) => [v.competitor, { value: v.value, confidence: v.confidence }])),
        });
        return { id: String(it.id), name: str(it, 'name', 200) ?? '', values };
      });
      return { id: String(cat.id), name: str(cat, 'name', 200) ?? '', items };
    });
    return { id: String(l.id), slug: str(l, 'slug', 30) ?? '', name: str(l, 'name', 100) ?? '', categories };
  });
  const layerSlugById = new Map(raw.layers.map((l) => [String(l.id), str(l, 'slug', 30) ?? '']));
  const freshness = raw.freshness
    .filter((f) => compIds.has(String(f.competitor_id)))
    .map((f) => ({
      layer: layerSlugById.get(String(f.layer_id)) ?? '',
      competitor: slugById.get(String(f.competitor_id)) ?? '',
      lastVerified: iso(f, 'last_verified'),
      nextReview: iso(f, 'next_review'),
      tier: intOrNull(f.tier),
    }))
    .sort((a, b) => cmpStr(a.layer, b.layer) || cmpStr(a.competitor, b.competitor));
  const valueCount = layers.reduce((n, l) => n + l.categories.reduce((m, c) => m + c.items.reduce((k, i) => k + i.values.length, 0), 0), 0);
  const section: MdSection = {
    heading: '항목 × 경쟁사 값 (괄호는 신뢰 등급 A~F)',
    columns: ['레이어', '카테고리', '항목', ...competitors.map((c) => c.name)],
    rows: flat.map((f) => [
      f.layer, f.category, f.item,
      ...competitors.map((c) => {
        const cell = f.cells.get(c.slug);
        return cell && cell.value ? `${cell.value}${cell.confidence ? ` [${cell.confidence}]` : ''}` : null;
      }),
    ]),
  };
  return {
    data: { competitors: competitors.map(({ sortOrder: _s, id: _i, ...rest }) => rest), layers: layers.map(({ id: _id, categories, ...l }) => ({
      ...l,
      categories: categories.map(({ id: _cid, items, ...c }) => ({ ...c, items: items.map(({ id: _iid, ...i }) => i) })),
    })), freshness },
    summary: [
      `비교 항목 ${flat.length}개 (레이어 ${layers.length}개), 경쟁 로봇 ${competitors.length}종`,
      `채워진 값 ${valueCount}건`,
      `신선도 추적 레이어×경쟁사 ${freshness.length}건`,
      '신뢰 등급: A 공식 ~ D 추정(CI), F 는 가장 낮은 등급 (등급 값은 A·B·C·D·F, 기본값 D)',
    ],
    sections: [section],
    notes: ['검수 대기열(ci_staging)은 포함하지 않는다. 비활성 경쟁사는 제외한다.'],
  };
}

export const CI_MATRIX_AREA: AreaDef<CiMatrixRaw> = {
  id: 'ci-matrix',
  titleKo: '경쟁사 CI 매트릭스',
  priority: 'P0',
  areaSchemaVersion: 1,
  sourceTables: ['ci_layers', 'ci_categories', 'ci_items', 'ci_competitors', 'ci_values', 'ci_freshness'],
  derivedFrom: [],
  units: { confidence: '등급(A~F)', lastVerified: 'ISO 8601 UTC', sourceDate: 'YYYY-MM-DD', tier: '1=주간, 2=월간, 3=분기 검토' },
  build: buildCiMatrix,
};

// ─────────────────────────────────────────────────────────────────────────────
// ci-changes
// ─────────────────────────────────────────────────────────────────────────────

export interface CiChangesRaw {
  history: Row[];
  alerts: Row[];
}

function buildCiChanges(raw: CiChangesRaw): AreaContent {
  const history = raw.history
    .map((h) => ({
      id: String(h.id),
      changedAt: iso(h, 'changed_at'),
      competitor: str(h, 'competitor', 255),
      layer: str(h, 'layer', 100),
      category: str(h, 'category', 200),
      item: str(h, 'item', 200),
      oldValue: str(h, 'old_value', TEXT_LIMITS.note),
      newValue: str(h, 'new_value', TEXT_LIMITS.note),
      oldConfidence: str(h, 'old_confidence', 1),
      newConfidence: str(h, 'new_confidence', 1),
      changeSource: str(h, 'change_source', 20),
      changeReason: str(h, 'change_reason', TEXT_LIMITS.evidence),
    }))
    .sort((a, b) => cmpStr(b.changedAt, a.changedAt) || cmpStr(a.id, b.id));
  const monitorAlerts = raw.alerts
    .map((a) => ({
      id: String(a.id),
      detectedAt: iso(a, 'detected_at'),
      competitor: str(a, 'competitor', 255),
      layer: str(a, 'layer', 100),
      sourceName: str(a, 'source_name', 200),
      sourceUrl: safeUrl(a.source_url),
      headline: str(a, 'headline', TEXT_LIMITS.title),
      summary: str(a, 'summary', TEXT_LIMITS.summary),
      status: str(a, 'status', 20),
    }))
    .sort((a, b) => cmpStr(b.detectedAt, a.detectedAt) || cmpStr(a.id, b.id));
  const kst = (i: string | null) => kstYmdOfIso(i);
  const section: MdSection = {
    heading: '값 변경 이력 (최신순)',
    columns: ['변경일(KST)', '경쟁사', '레이어', '카테고리', '항목', '이전 값', '이후 값', '이전 등급', '이후 등급', '변경 경로', '사유'],
    rows: history.map((h) => [kst(h.changedAt), h.competitor, h.layer, h.category, h.item, h.oldValue, h.newValue, h.oldConfidence, h.newConfidence, h.changeSource, h.changeReason]),
  };
  const alertSection: MdSection = {
    heading: '자동 수집 알림',
    columns: ['감지일(KST)', '경쟁사', '레이어', '출처', '제목', '상태'],
    rows: monitorAlerts.map((a) => [kst(a.detectedAt), a.competitor, a.layer, a.sourceUrl ? { text: a.sourceName ?? '출처', url: a.sourceUrl } : a.sourceName, a.headline, a.status]),
  };
  return {
    data: { history, monitorAlerts },
    summary: [
      `값 변경 이력 ${history.length}건 (최근 변경 ${history[0] ? kst(history[0].changedAt) : '없음'})`,
      `변경 경로별: ${tallyText(history.map((h) => h.changeSource))}`,
      `자동 수집 알림 ${monitorAlerts.length}건 (상태별: ${tallyText(monitorAlerts.map((a) => a.status))})`,
    ],
    sections: [section, alertSection],
  };
}

export const CI_CHANGES_AREA: AreaDef<CiChangesRaw> = {
  id: 'ci-changes',
  titleKo: 'CI 변경 이력·모니터 알림',
  priority: 'P0',
  areaSchemaVersion: 1,
  sourceTables: ['ci_value_history', 'ci_values', 'ci_items', 'ci_categories', 'ci_layers', 'ci_competitors', 'ci_monitor_alerts'],
  derivedFrom: [],
  units: { changedAt: 'ISO 8601 UTC', detectedAt: 'ISO 8601 UTC' },
  build: buildCiChanges,
};

export type { BuildCtx };
