/**
 * GET /api/actuator-map 응답 정규화 — 구 응답(조달 태세·수요 사례 필드 없음)도 안전하게 처리한다.
 * useActuatorMap 의 queryFn 이 호출하고, 이후 컴포넌트·HTML 빌더는 정규화된 값만 받는다.
 * 순수 함수이며 입력을 변경하지 않는다.
 */

import type {
  ActuatorAdoptionCase,
  ActuatorMapResponse,
  ActuatorMapRobot,
  ActuatorSupplierProduct,
  ActuatorSupplyEdge,
  AdoptionSegment,
  MarketSegment,
  RobotSourcing,
  SourcingExternalVendor,
  SourcingKind,
  SourcingLevel,
  SourcingPosture,
  SourcingStats,
  VendorTargetMarket,
} from '@/types/actuator-map';
import { isMarketSegment, resolveSegmentOrder } from './actuator-sourcing';

const KINDS: SourcingKind[] = ['in_house_confirmed', 'in_house_presumed', 'external', 'mixed', 'unknown'];
const POSTURES: SourcingPosture[] = ['in_house', 'in_house_sells', 'external', 'unknown'];
const ADOPTION_SEGMENTS: AdoptionSegment[] = [
  'humanoid_tier1',
  'humanoid_tier2',
  'research_platform',
  'service_robot',
  'quadruped',
  'exoskeleton',
  'robot_arm',
  'industrial',
];
/** 수요 사례 세그먼트 → 시장 세그먼트 (서버 매핑과 동일; marketSegment 가 빠진 응답용) */
const ADOPTION_TO_MARKET: Record<AdoptionSegment, MarketSegment> = {
  humanoid_tier1: 'tier1_oem',
  humanoid_tier2: 'tier2_legged',
  quadruped: 'tier2_legged',
  research_platform: 'research_edu',
  robot_arm: 'industrial_cobot',
  industrial: 'industrial_cobot',
  service_robot: 'service',
  exoskeleton: 'service',
};

const arr = <T>(v: T[] | null | undefined): T[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const level = (v: unknown): SourcingLevel => (v === 'component' ? 'component' : 'module');

export function defaultSourcing(): RobotSourcing {
  return {
    posture: 'unknown',
    kind: 'unknown',
    sellsExternally: null,
    evidenceGrade: null,
    evidence: [],
    externalVendors: [],
    noteKo: null,
    basis: 'derived',
    componentSourcing: false,
  };
}

export function normalizeSourcing(raw: Partial<RobotSourcing> | null | undefined): RobotSourcing {
  if (!raw || typeof raw !== 'object') return defaultSourcing();
  const d = defaultSourcing();
  return {
    posture: POSTURES.includes(raw.posture as SourcingPosture) ? (raw.posture as SourcingPosture) : d.posture,
    kind: KINDS.includes(raw.kind as SourcingKind) ? (raw.kind as SourcingKind) : d.kind,
    sellsExternally: typeof raw.sellsExternally === 'boolean' ? raw.sellsExternally : null,
    evidenceGrade: str(raw.evidenceGrade),
    evidence: arr(raw.evidence)
      .filter((e) => e && typeof e === 'object')
      .map((e) => ({
        claim: typeof e.claim === 'string' ? e.claim : '',
        source: typeof e.source === 'string' ? e.source : '',
        url: str(e.url),
        grade: typeof e.grade === 'string' ? e.grade : '',
        date: str(e.date),
      })),
    externalVendors: arr(raw.externalVendors)
      .filter((v): v is SourcingExternalVendor => !!v && typeof v === 'object' && typeof v.vendor === 'string')
      .map((v) => ({ vendor: v.vendor, role: str(v.role), grade: str(v.grade), url: str(v.url), level: level(v.level) })),
    noteKo: str(raw.noteKo),
    basis: raw.basis === 'regrade' ? 'regrade' : 'derived',
    componentSourcing: raw.componentSourcing === true,
  };
}

function normalizeRobot(r: ActuatorMapRobot): ActuatorMapRobot {
  return {
    ...r,
    actuators: arr(r.actuators),
    sources: arr(r.sources),
    sourcing: normalizeSourcing(r.sourcing),
  };
}

function normalizeSupplier(s: ActuatorSupplierProduct): ActuatorSupplierProduct {
  const segments = arr(s.segments).filter(isMarketSegment);
  const segment: MarketSegment = isMarketSegment(s.segment) ? s.segment : (segments[0] ?? 'other');
  const dr = s.diameterRangeMm;
  return {
    ...s,
    diameterRangeMm:
      dr && typeof dr === 'object' && num(dr.min) != null && num(dr.max) != null ? { min: dr.min, max: dr.max } : null,
    integrationLevel: str(s.integrationLevel),
    isLG: s.isLG === true,
    segment,
    segments: segments.length ? segments : [segment],
    segmentBasis:
      s.segmentBasis === 'override' || s.segmentBasis === 'vendor_segments' || s.segmentBasis === 'keywords' || s.segmentBasis === 'adoptions' || s.segmentBasis === 'none' ? s.segmentBasis : 'none',
    adoptionIds: arr(s.adoptionIds).filter((x): x is string => typeof x === 'string'),
  };
}

function normalizeEdge(e: ActuatorSupplyEdge, robotPosture: Map<string, SourcingPosture>, robotVendors: Map<string, SourcingExternalVendor[]>): ActuatorSupplyEdge {
  const basis: ActuatorSupplyEdge['basis'] =
    e.basis === 'self' || e.basis === 'external' || e.basis === 'unverified'
      ? e.basis
      : e.inHouse
        ? (robotPosture.get(e.robotId) ?? 'unknown') === 'unknown'
          ? 'unverified'
          : 'self'
        : 'external';
  let lv: SourcingLevel;
  if (e.level === 'component' || e.level === 'module') lv = e.level;
  else {
    // 서버가 엣지 level 을 주지 않은 경우: 로봇의 externalVendors 에서 같은 공급사를 찾아 따른다
    const vs = robotVendors.get(e.robotId) ?? [];
    const hit = vs.find((v) => v.vendor.trim().toLowerCase() === (e.vendor ?? '').trim().toLowerCase());
    lv = hit ? hit.level : 'module';
  }
  return {
    ...e,
    basis,
    posture: POSTURES.includes(e.posture) ? e.posture : (robotPosture.get(e.robotId) ?? 'unknown'),
    role: str(e.role),
    level: lv,
  };
}

function normalizeAdoption(c: ActuatorAdoptionCase, i: number): ActuatorAdoptionCase {
  const segment: AdoptionSegment = ADOPTION_SEGMENTS.includes(c.segment) ? c.segment : 'industrial';
  return {
    ...c,
    id: str(c.id) ?? `adoption-${i}`,
    country: str(c.country),
    segment,
    marketSegment: isMarketSegment(c.marketSegment) ? c.marketSegment : (ADOPTION_TO_MARKET[segment] ?? 'other'),
    level: level(c.level),
    robotClass: str(c.robotClass),
    vendorKey: str(c.vendorKey) ?? (c.actuatorVendor ?? '').trim().toLowerCase(),
    actuatorModel: str(c.actuatorModel),
    usage: str(c.usage),
    evidenceGrade: str(c.evidenceGrade),
    sources: arr(c.sources)
      .filter((s) => s && typeof s === 'object' && typeof s.url === 'string')
      .map((s) => ({ url: s.url, title: str(s.title) })),
    noteKo: str(c.noteKo),
    year: num(c.year),
  };
}

function normalizeVendorMarket(v: VendorTargetMarket): VendorTargetMarket {
  const segs = arr(v.segments).filter(isMarketSegment);
  return {
    ...v,
    vendorKey: str(v.vendorKey) ?? (v.vendor ?? '').trim().toLowerCase(),
    targetMarketsKo: arr(v.targetMarketsKo).filter((x): x is string => typeof x === 'string'),
    segments: segs.length ? segs : null,
    grade: str(v.grade),
    url: str(v.url),
  };
}

/** 서버 sourcingStats 가 없을 때 로봇 배열에서 같은 규칙으로 계산 */
function deriveSourcingStats(robots: ActuatorMapRobot[]): SourcingStats {
  const st: SourcingStats = {
    robots: 0,
    inHouse: 0,
    inHouseSells: 0,
    external: 0,
    externalMixed: 0,
    unknown: 0,
    unknownPresumed: 0,
    componentSourcing: 0,
    regraded: 0,
    derived: 0,
  };
  for (const r of robots) {
    if (r.forecast) continue;
    const s = r.sourcing;
    st.robots++;
    if (s.posture === 'in_house') st.inHouse++;
    else if (s.posture === 'in_house_sells') st.inHouseSells++;
    else if (s.posture === 'external') {
      st.external++;
      if (s.kind === 'mixed') st.externalMixed++;
    } else {
      st.unknown++;
      if (s.kind === 'in_house_presumed') st.unknownPresumed++;
    }
    if (s.componentSourcing) st.componentSourcing++;
    if (s.basis === 'regrade') st.regraded++;
    else st.derived++;
  }
  return st;
}

/**
 * 원본 응답을 정규화한다. null/undefined/비객체는 그대로 null 을 돌려 호출부가 오류 상태로 처리하게 한다.
 * 누락 필드: 로봇 sourcing → unknown/derived, 공급사 segment → 'other', 배열 → [], 통계 → 로봇 배열에서 계산.
 */
export function normalizeActuatorMap(raw: ActuatorMapResponse | null | undefined): ActuatorMapResponse {
  if (!raw || typeof raw !== 'object') throw new Error('actuator-map: empty response');
  const robots = arr(raw.robots).map(normalizeRobot);
  const posture = new Map(robots.map((r) => [r.id, r.sourcing.posture] as const));
  const vendors = new Map(robots.map((r) => [r.id, r.sourcing.externalVendors] as const));
  const suppliers = arr(raw.suppliers).map(normalizeSupplier);
  const edges = arr(raw.edges).map((e) => normalizeEdge(e, posture, vendors));
  const adoptions = arr(raw.adoptions).map(normalizeAdoption);
  const vendorMarkets = arr(raw.vendorMarkets).map(normalizeVendorMarket);
  const derived = deriveSourcingStats(robots);
  const given = raw.sourcingStats && typeof raw.sourcingStats === 'object' ? raw.sourcingStats : null;
  const sourcingStats: SourcingStats = given
    ? { ...derived, ...Object.fromEntries(Object.entries(given).filter(([, v]) => typeof v === 'number')) }
    : derived;
  const rs = raw.stats ?? ({} as Partial<ActuatorMapResponse['stats']>);
  const incomplete = robots.filter((r) => r.incomplete).length;
  const stats: ActuatorMapResponse['stats'] = {
    robots: num(rs.robots) ?? robots.length,
    complete: num(rs.complete) ?? robots.length - incomplete,
    incomplete: num(rs.incomplete) ?? incomplete,
    suppliers: num(rs.suppliers) ?? suppliers.length,
    edges: num(rs.edges) ?? edges.length,
    adoptions: num(rs.adoptions) ?? adoptions.length,
  };
  return {
    ...raw,
    typeOrder: arr(raw.typeOrder),
    robots,
    suppliers,
    edges,
    stats,
    schemaVersion: typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 1,
    adoptions,
    vendorMarkets,
    sourcingStats,
    segmentOrder: resolveSegmentOrder(raw.segmentOrder),
  };
}
