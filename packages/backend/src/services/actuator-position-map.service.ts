/**
 * ActuatorPositionMapService — 액추에이터 관점 경쟁사 포지션·공급망 맵 데이터.
 *
 * humanoid_robots + body_specs + hand_specs + companies + robot_components→components(type='actuator')
 * + ci_values('구동 방식', '액추에이터 공급사', '자체 생산 여부', '관절 토크', '가격대') 를 조인해
 *  - 로봇별 포지션 맵 행 (제어 난이도 입력값·액추에이터 타입 라벨·가격 범위)
 *  - 공급사 제품 목록 (products type='actuator' + robot_components 에 연결되지 않은 components)
 *  - 공급망 엣지 (로봇 → 공급사 / 자체 생산)
 * 를 반환한다. 제어 난이도 지수 계산은 프런트(가중치 가변)에서 하고, 서버는 기본 가중치만 내려준다.
 *
 * 조달 태세(actuator_sourcing, 로봇당 1행 재판정), 공개 채택 사례(actuator_adoptions), 공급사 타깃 시장
 * (actuator_vendor_markets)을 함께 조립한다. 세 테이블은 없을 수 있으므로(마이그레이션 전) 조회 실패는 빈 값으로 처리한다.
 *
 * 순수 함수(정규화·파싱·기본 난이도·조달 태세·세그먼트 분류)는 export 해 단위 테스트한다. DB 접근은 클래스 메서드에만 있다.
 * 캐시: view_cache 테이블(10분) + 인플라이트 공유. 응답 형태가 바뀌면 schemaVersion 을 올려 구캐시를 재계산한다.
 */

import { eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  actuatorAdoptions,
  actuatorSourcing,
  actuatorVendorMarkets,
  bodySpecs,
  ciCompetitors,
  ciItems,
  ciValues,
  companies,
  components,
  handSpecs,
  humanoidRobots,
  products,
  productSpecs,
  robotComponents,
  viewCache,
  type ComponentSpecs,
  type DynamicSpecs,
} from '../db/schema.js';
import {
  SOURCING_KINDS,
  MARKET_SEGMENTS,
  sameVendor,
  vendorKey,
  modelMatches,
  sanitizeSourcingEvidence,
  sanitizeSourcingVendors,
  sanitizeAdoptionSources,
  type SourcingKind,
  type SourcingLevel,
  type MarketSegment,
  type AdoptionSegment,
} from '../db/actuator-update.util.js';

// 공급사 키·매칭 함수는 util 에 있다 (적용 스크립트와 공유). 서비스에서도 그대로 쓸 수 있게 다시 내보낸다.
export { vendorKey, sameVendor, modelMatches };
export type { SourcingKind, SourcingLevel, MarketSegment, AdoptionSegment };

// ── 공개 타입 (frontend/src/types/actuator-map.ts 와 1:1) ────────────────────

export type ActuatorMapRegion = 'na' | 'cn' | 'eu' | 'kr' | 'jp' | 'other';

export const ACTUATOR_TYPE_LABELS = [
  '유압→전기 전환',
  '하모닉(스트레인웨이브)',
  '사이클로이드·유성',
  '직구동/QDD',
  '리니어·스크류',
  '소프트·텐던',
  '커스텀 전기(상세 미공개)',
  '미확인',
] as const;
export type ActuatorTypeLabel = (typeof ACTUATOR_TYPE_LABELS)[number];

/** 조달 태세 4단계 (SourcingKind 5종을 화면용으로 접은 값) */
export type SourcingPosture = 'in_house' | 'in_house_sells' | 'external' | 'unknown';

export interface SourcingEvidenceItem {
  claim: string;
  source: string;
  url: string | null;
  grade: string;
  date: string | null;
}

export interface SourcingExternalVendor {
  vendor: string;
  role: string | null;
  grade: string | null;
  url: string | null;
  /** module = 통합 관절·모듈 단위 공급, component = 모터·감속기 등 부품 단위 공급 */
  level: SourcingLevel;
}

export interface RobotSourcing {
  posture: SourcingPosture;
  kind: SourcingKind;
  sellsExternally: boolean | null;
  evidenceGrade: string | null;
  evidence: SourcingEvidenceItem[];
  externalVendors: SourcingExternalVendor[];
  noteKo: string | null;
  /** regrade = 재판정 레코드 기준, derived = 재판정 레코드 없음(보수적 폴백) */
  basis: 'regrade' | 'derived';
  /** 모듈(통합 관절) 층은 자체 설계이고 모터·감속기 등 부품 층만 외부 조달 — posture 는 in_house 로 둔다 */
  componentSourcing: boolean;
}

export interface DifficultyWeights {
  /** 보행 방식 (바퀴 0 · 하이브리드 0.5 · 이족 1) */
  L: number;
  /** 전신 자유도 (10→0, 50→1) */
  D: number;
  /** 손 자유도 (0→0, 24→1) */
  H: number;
  /** 최고 속도 (0→0, 5 m/s→1) */
  S: number;
}

export const DIFFICULTY_DEFAULT: DifficultyWeights = { L: 40, D: 25, H: 20, S: 15 };

export interface RobotActuator {
  name: string;
  vendor: string | null;
  inHouse: boolean;
  type: ActuatorTypeLabel;
  torqueNm: number | null;
  weightKg: number | null;
  quantity: number;
  usageLocation: string | null;
  /** 'components' = robot_components 조인, 'ci' = CI 매트릭스 항목 */
  source: 'components' | 'ci';
  confidence: string;
}

export interface RobotPrice {
  min: number;
  max: number;
  conf: string;
  src: string;
}

export interface ActuatorMapRobot {
  id: string;
  name: string;
  company: string;
  companyId: string;
  region: ActuatorMapRegion;
  locomotion: 'bipedal' | 'wheeled' | 'hybrid' | 'unknown';
  stage: string | null;
  year: number | null;
  forecast: boolean;
  isLG: boolean;
  height: number | null;
  weight: number | null;
  payload: number | null;
  dof: number | null;
  handDof: number | null;
  speed: number | null;
  /** body_specs 가 없거나 핵심 값(DOF)이 비어 X축을 계산할 수 없는 로봇 — 프런트에서 표에만 표시 */
  incomplete: boolean;
  actuators: RobotActuator[];
  actuatorTypeLabel: ActuatorTypeLabel;
  /** 타입 라벨의 근거 (툴팁용) */
  actuatorTypeNote: string;
  price: RobotPrice | null;
  sources: string[];
  sourcing: RobotSourcing;
}

export interface ActuatorSupplierProduct {
  vendor: string;
  country: string | null;
  model: string;
  type: string;
  peakTorqueNm: number | null;
  continuousTorqueNm: number | null;
  weightKg: number | null;
  diameterMm: number | null;
  priceUsd: number | null;
  status: string | null;
  targetMarket: string | null;
  /** 'products' | 'components' */
  source: 'products' | 'components';
  /** dynamicSpecs.diameterRangeMm ("40-120") 파싱 결과 */
  diameterRangeMm: { min: number; max: number } | null;
  integrationLevel: string | null;
  isLG: boolean;
  /** 대표 세그먼트 */
  segment: MarketSegment;
  /** 적중한 전체 세그먼트 (우선순위 순) */
  segments: MarketSegment[];
  segmentBasis: 'override' | 'vendor_segments' | 'adoptions' | 'keywords' | 'none';
  /** 이 제품에 매칭된 수요 사례 id */
  adoptionIds: string[];
}

export interface ActuatorSupplyEdge {
  robotId: string;
  robotName: string;
  company: string;
  vendor: string;
  inHouse: boolean;
  type: ActuatorTypeLabel;
  quantity: number;
  confidence: string;
  /** self = 자체 확인된 로봇의 자체 엣지, unverified = 자체로 보이나 로봇 조달 태세가 확인 불가, external = 외부 조달 */
  basis: 'self' | 'external' | 'unverified';
  /** 엣지가 속한 로봇의 조달 태세 */
  posture: SourcingPosture;
  role: string | null;
  /** 외부 공급 층 (자체 엣지·CI 파생 엣지는 module) */
  level: SourcingLevel;
}

export interface ActuatorAdoptionCase {
  id: string;
  robotName: string;
  company: string;
  country: string | null;
  segment: AdoptionSegment;
  marketSegment: MarketSegment;
  /** module = 통합 관절·모듈 단위 채택, component = 모터·감속기 등 부품 단위 채택 */
  level: SourcingLevel;
  robotClass: string | null;
  actuatorVendor: string;
  vendorKey: string;
  actuatorModel: string | null;
  usage: string | null;
  evidenceGrade: string | null;
  sources: { url: string; title: string | null }[];
  noteKo: string | null;
  year: number | null;
}

export interface VendorTargetMarket {
  vendor: string;
  vendorKey: string;
  targetMarketsKo: string[];
  segments: MarketSegment[] | null;
  grade: string | null;
  url: string | null;
}

export interface SourcingStats {
  /** forecast 제외 로봇 수 */
  robots: number;
  inHouse: number;
  inHouseSells: number;
  external: number;
  /** external 중 kind 가 mixed 인 로봇 (externalMixed ⊂ external) */
  externalMixed: number;
  unknown: number;
  /** unknown 중 자체 개발 추정(in_house_presumed) 로봇 (unknownPresumed ⊂ unknown) */
  unknownPresumed: number;
  regraded: number;
  derived: number;
  /** 부품 층만 외부 조달이라 in_house 로 분류된 로봇 */
  componentSourcing: number;
}

export const ACTUATOR_MAP_SCHEMA_VERSION = 2 as const;

/** 시장 세그먼트 표시 순서 */
export const MARKET_SEGMENT_ORDER: MarketSegment[] = ['tier1_oem', 'tier2_legged', 'research_edu', 'industrial_cobot', 'service', 'captive', 'other'];

export interface ActuatorMapBody {
  schemaVersion: typeof ACTUATOR_MAP_SCHEMA_VERSION;
  generatedAt: string;
  difficultyDefault: DifficultyWeights;
  typeOrder: ActuatorTypeLabel[];
  robots: ActuatorMapRobot[];
  suppliers: ActuatorSupplierProduct[];
  edges: ActuatorSupplyEdge[];
  adoptions: ActuatorAdoptionCase[];
  vendorMarkets: VendorTargetMarket[];
  sourcingStats: SourcingStats;
  segmentOrder: MarketSegment[];
  stats: { robots: number; complete: number; incomplete: number; suppliers: number; edges: number; adoptions: number };
}

export interface ActuatorMapResponse extends ActuatorMapBody {
  cached: boolean;
}

// ── 순수 함수 ────────────────────────────────────────────────────────────────

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** 제어 난이도 지수 0~10 — 프런트 공식과 동일 (가중치 합으로 정규화) */
export function computeDifficulty(
  r: { locomotion: string | null; dof: number | null; handDof: number | null; speed: number | null },
  w: DifficultyWeights = DIFFICULTY_DEFAULT
): number {
  const L = r.locomotion === 'bipedal' ? 1 : r.locomotion === 'hybrid' ? 0.5 : 0;
  const D = clamp01(((r.dof ?? 0) - 10) / 40);
  const H = clamp01((r.handDof ?? 0) / 24);
  const S = clamp01((r.speed ?? 0) / 5);
  const sum = w.L + w.D + w.H + w.S || 1;
  return (10 * (w.L * L + w.D * D + w.H * H + w.S * S)) / sum;
}

const NA_COUNTRIES = /^(usa|us|u\.s\.a?\.?|united states|canada|mexico|🇺🇸|🇨🇦)$/i;
const CN_COUNTRIES = /^(china|prc|hong kong|🇨🇳)$/i;
const KR_COUNTRIES = /^(korea|south korea|republic of korea|🇰🇷)$/i;
const JP_COUNTRIES = /^(japan|🇯🇵)$/i;
const EU_COUNTRIES =
  /^(norway|germany|uk|united kingdom|france|spain|italy|switzerland|netherlands|sweden|denmark|finland|austria|belgium|poland|czech|portugal|ireland|europe|🇳🇴|🇩🇪|🇬🇧|🇫🇷|🇪🇸|🇮🇹|🇨🇭)$/i;

/** humanoid_robots.region 우선, 없으면 companies.country 로 보완 */
export function normalizeRegion(robotRegion: string | null | undefined, country: string | null | undefined): ActuatorMapRegion {
  const r = (robotRegion ?? '').trim().toLowerCase();
  if (r === 'north_america' || r === 'na' || r === 'us' || r === 'usa') return 'na';
  if (r === 'china' || r === 'cn') return 'cn';
  if (r === 'europe' || r === 'eu') return 'eu';
  if (r === 'korea' || r === 'kr') return 'kr';
  if (r === 'japan' || r === 'jp') return 'jp';
  const c = (country ?? '').trim();
  if (NA_COUNTRIES.test(c)) return 'na';
  if (CN_COUNTRIES.test(c)) return 'cn';
  if (KR_COUNTRIES.test(c)) return 'kr';
  if (JP_COUNTRIES.test(c)) return 'jp';
  if (EU_COUNTRIES.test(c)) return 'eu';
  return 'other';
}

export function isLGCompany(name: string | null | undefined): boolean {
  if (!name) return false;
  return /(^|[^a-z])lg([^a-z]|$)/i.test(name) || /엘지|LG전자/.test(name);
}

/**
 * 자유 텍스트(components.specifications.actuatorType, CI '구동 방식' 값, 설명)를 타입 라벨로 정규화.
 * 근거가 없으면 null (호출자가 '미확인' 또는 '커스텀 전기' 로 결정).
 */
export function classifyActuatorText(text: string | null | undefined): ActuatorTypeLabel | null {
  if (!text) return null;
  const t = text.toLowerCase();
  const hydraulic = /유압|hydraulic/.test(t);
  const electric = /전기|electric|모터|motor|액추에이터|actuator/.test(t);
  if (hydraulic && electric) return '유압→전기 전환';
  if (/하모닉|harmonic|스트레인|strain.?wave/.test(t)) return '하모닉(스트레인웨이브)';
  if (/사이클로이드|cycloid|유성|planetary|\brv\b|rv감속|rv 감속/.test(t)) return '사이클로이드·유성';
  if (/직구동|direct.?drive|qdd|준직구동|quasi.?direct|프로프리오|proprioceptive/.test(t)) return '직구동/QDD';
  if (/리니어|linear|스크류|screw|볼스크류|ball.?screw|롤러스크류|roller.?screw/.test(t)) return '리니어·스크류';
  if (/소프트|soft|텐던|tendon|케이블 구동|cable.?driven|와이어 구동/.test(t)) return '소프트·텐던';
  if (hydraulic) return '유압→전기 전환';
  if (/커스텀|custom|자체|in-house|독자|proprietary|전기|electric/.test(t)) return '커스텀 전기(상세 미공개)';
  return null;
}

/**
 * CI '가격대' 텍스트 → USD 범위. "$20K-$30K (목표)" → {20000,30000}, "비공개 (추정 $150K-$200K)" → {150000,200000},
 * "$16,000" → {16000,16000}. "$499/월" 같은 월 구독가는 제외. 금액이 없으면 null.
 */
export function parsePriceRange(text: string | null | undefined): { min: number; max: number } | null {
  if (!text) return null;
  const re = /\$\s*([\d][\d,]*(?:\.\d+)?)\s*([kKmM])?(\s*\/\s*(?:월|mo|month|yr|year|년))?/g;
  const values: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[3]) continue; // 월/연 구독가 제외
    const num = Number((m[1] ?? '').replace(/,/g, ''));
    if (!Number.isFinite(num) || num <= 0) continue;
    const unit = (m[2] ?? '').toLowerCase();
    values.push(unit === 'k' ? num * 1_000 : unit === 'm' ? num * 1_000_000 : num);
  }
  if (values.length === 0) return null;
  return { min: Math.min(...values), max: Math.max(...values) };
}

/**
 * 로봇 설명(humanoid_robots.description)에서 판매 가격만 추출 — 가격 키워드가 있어야 하고,
 * 수주잔고·투자액 같은 큰 금액(≥ $5M)은 제외한다. "수주잔고 8억 위안(~$112M)" → null, "$90K 가격대" → {90000,90000}.
 */
export function parseDescriptionPrice(text: string | null | undefined): { min: number; max: number } | null {
  if (!text) return null;
  if (!/가격|판매|구독|price|priced|cost|msrp|retail/i.test(text)) return null;
  const range = parsePriceRange(text);
  if (!range || range.max >= 5_000_000) return null;
  return range;
}

/** '자체 생산 여부' 값 → boolean | null (판단 불가) */
export function parseInHouse(text: string | null | undefined): boolean | null {
  if (!text) return null;
  const t = text.toLowerCase();
  if (/비공개|unknown|미확인|정보 없음/.test(t)) return null;
  if (/아니|외부|외주|구매|no\b|third|공급사/.test(t) && !/자체|in-house|자사/.test(t)) return false;
  if (/자체|in-house|inhouse|자사|내재화|독자|yes|예|o\b|자체 생산/.test(t)) return true;
  return null;
}

/** CI '액추에이터 공급사' 값 → 공급사 이름 배열 (쉼표·슬래시·가운뎃점 구분, 괄호 보조 설명 제거) */
export function parseVendorList(text: string | null | undefined): string[] {
  if (!text) return [];
  if (/^(비공개|미공개|unknown|정보 없음|n\/a|-)$/i.test(text.trim())) return [];
  return text
    .split(/[,/·;+&]|\s및\s|\sand\s/)
    .map((s) => s.replace(/\([^)]*\)/g, '').trim())
    .filter((s) => s.length > 0 && !/^(비공개|미공개|unknown|정보 없음)$/i.test(s));
}

/** 벤더가 로봇 제조사 자신인지 — 첫 토큰 포함 비교 (Unitree ⊂ Unitree Robotics, Fourier ⊂ Fourier Intelligence) */
export function isSameCompany(vendor: string | null | undefined, company: string | null | undefined): boolean {
  if (!vendor || !company) return false;
  const v = vendor.trim().toLowerCase();
  const c = company.trim().toLowerCase();
  if (!v || !c) return false;
  if (v === c || v.includes(c) || c.includes(v)) return true;
  const vt = v.split(/\s+/)[0] ?? '';
  const ct = c.split(/\s+/)[0] ?? '';
  return vt.length >= 3 && vt === ct;
}

const num = (v: string | number | null | undefined): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

const specNum = (v: unknown): number | null => (typeof v === 'number' || typeof v === 'string' ? num(v) : null);

function normalizeLocomotion(v: string | null | undefined): ActuatorMapRobot['locomotion'] {
  const t = (v ?? '').toLowerCase();
  if (t === 'bipedal' || t === 'biped' || t === 'legged') return 'bipedal';
  if (t === 'wheeled' || t === 'wheel') return 'wheeled';
  if (t === 'hybrid' || t === 'wheel-leg' || t === 'wheel_leg') return 'hybrid';
  return 'unknown';
}

/** CI 항목 이름 — 서비스가 조회하는 항목 (존재하지 않으면 무시) */
export const CI_ITEM_NAMES = ['구동 방식', '액추에이터 공급사', '자체 생산 여부', '관절 토크', '가격대'] as const;
type CiItemName = (typeof CI_ITEM_NAMES)[number];

export interface CiRobotFacts {
  competitorName: string;
  manufacturer: string;
  values: Partial<Record<CiItemName, { value: string; confidence: string; source: string | null }>>;
}

/** 공급사 제품 타입 추정 — 공급사명/모델/시리즈/회사 설명 텍스트 기반 */
export function inferSupplierType(text: string): string {
  const label = classifyActuatorText(text);
  if (label && label !== '커스텀 전기(상세 미공개)') return label;
  if (/motor|모터|bldc|brushless|\bdc\b/i.test(text)) return '모터·기어박스(BLDC)';
  return label ?? '미확인';
}

/** components(type=actuator) 의 vendor → actuatorType 라벨 맵 (공급사 제품 타입 보강용) */
export function vendorTypeMap(rows: { vendor: string | null; specifications: ComponentSpecs | null }[]): Map<string, ActuatorTypeLabel> {
  const out = new Map<string, ActuatorTypeLabel>();
  for (const r of rows) {
    const t = classifyActuatorText(typeof r.specifications?.actuatorType === 'string' ? r.specifications.actuatorType : null);
    if (r.vendor && t && !out.has(r.vendor.toLowerCase())) out.set(r.vendor.toLowerCase(), t);
  }
  return out;
}

export function lookupVendorType(map: Map<string, ActuatorTypeLabel>, vendor: string): ActuatorTypeLabel | null {
  for (const [k, v] of map) if (isSameCompany(k, vendor)) return v;
  return null;
}

// ── 조달 태세 ────────────────────────────────────────────────────────────────

/**
 * 재판정 종류 → 조달 태세 4단계.
 *  - in_house_confirmed: 외판(true)이면 in_house_sells, 아니면 in_house
 *  - external → external
 *  - mixed: 모듈(통합 관절) 층 외부 공급사가 하나라도 있거나 공급사 정보가 없으면 external(외부 조달·혼합),
 *           외부 공급사가 전부 부품(component) 층이면 모듈 층은 자체 설계이므로 in_house
 *  - in_house_presumed, unknown → unknown (in_house_presumed 는 외판 true 여도 unknown)
 */
export function postureOf(
  kind: SourcingKind,
  sellsExternally: boolean | null | undefined,
  externalVendors: { level?: SourcingLevel | null }[] = []
): SourcingPosture {
  switch (kind) {
    case 'in_house_confirmed':
      return sellsExternally === true ? 'in_house_sells' : 'in_house';
    case 'external':
      return 'external';
    case 'mixed':
      return externalVendors.length > 0 && externalVendors.every((v) => v.level === 'component') ? 'in_house' : 'external';
    default:
      return 'unknown';
  }
}

/** actuator_sourcing 행 (DB 조회 결과 — jsonb 컬럼은 방어적으로 다시 정규화한다) */
export interface SourcingRow {
  robotId: string;
  sourcing: string;
  sellsExternally: boolean | null;
  evidenceGrade: string | null;
  evidence: unknown;
  externalVendors: unknown;
  noteKo: string | null;
}

const isSourcingKind = (v: string): v is SourcingKind => (SOURCING_KINDS as readonly string[]).includes(v);

/**
 * 로봇의 조달 태세 확정. 재판정 행이 있으면 postureOf 규칙(basis 'regrade').
 * 없으면 폴백(basis 'derived'): 외부 공급사가 명시된(inHouse === false, 공급사명 있음, '(공급사 미상)' 아님) 액추에이터가
 * 하나라도 있으면 external, 아니면 무조건 unknown — 근거 없이 자체 개발로 보지 않는다.
 */
export function resolveSourcing(row: SourcingRow | null, actuators: RobotActuator[], company: string): RobotSourcing {
  if (row) {
    const kind: SourcingKind = isSourcingKind(row.sourcing) ? row.sourcing : 'unknown';
    const externalVendors: SourcingExternalVendor[] = sanitizeSourcingVendors(row.externalVendors).map((v) => ({
      vendor: v.vendor,
      role: v.role,
      grade: v.grade,
      url: v.url,
      level: v.level,
    }));
    const evidence: SourcingEvidenceItem[] = sanitizeSourcingEvidence(row.evidence).map((e) => ({
      claim: e.claim,
      source: e.source ?? '',
      url: e.url,
      grade: e.grade ?? 'D',
      date: e.date,
    }));
    const posture = postureOf(kind, row.sellsExternally, externalVendors);
    return {
      posture,
      kind,
      sellsExternally: row.sellsExternally ?? null,
      evidenceGrade: row.evidenceGrade ?? null,
      evidence,
      externalVendors,
      noteKo: row.noteKo ?? null,
      basis: 'regrade',
      componentSourcing: kind === 'mixed' && posture === 'in_house',
    };
  }
  const explicit = actuators.filter(
    (a) => !a.inHouse && !!a.vendor && a.vendor.trim() !== '' && !a.vendor.includes('(공급사 미상)') && !isSameCompany(a.vendor, company)
  );
  const external = explicit.length > 0;
  const vendors: SourcingExternalVendor[] = [];
  for (const a of explicit) {
    if (vendors.some((v) => sameVendor(v.vendor, a.vendor))) continue;
    vendors.push({ vendor: (a.vendor ?? '').trim(), role: null, grade: a.confidence ?? null, url: null, level: 'module' });
  }
  return {
    posture: external ? 'external' : 'unknown',
    kind: external ? 'external' : 'unknown',
    sellsExternally: null,
    evidenceGrade: null,
    evidence: [],
    externalVendors: vendors,
    noteKo: null,
    basis: 'derived',
    componentSourcing: false,
  };
}

/** 서버 집계 — forecast 가 아닌 로봇만 */
export function computeSourcingStats(robots: Pick<ActuatorMapRobot, 'forecast' | 'sourcing'>[]): SourcingStats {
  const stats: SourcingStats = {
    robots: 0, inHouse: 0, inHouseSells: 0, external: 0, externalMixed: 0, unknown: 0, unknownPresumed: 0,
    regraded: 0, derived: 0, componentSourcing: 0,
  };
  for (const r of robots) {
    if (r.forecast) continue;
    const s = r.sourcing;
    stats.robots += 1;
    if (s.posture === 'in_house') stats.inHouse += 1;
    else if (s.posture === 'in_house_sells') stats.inHouseSells += 1;
    else if (s.posture === 'external') {
      stats.external += 1;
      if (s.kind === 'mixed') stats.externalMixed += 1;
    } else {
      stats.unknown += 1;
      if (s.kind === 'in_house_presumed') stats.unknownPresumed += 1;
    }
    if (s.basis === 'regrade') stats.regraded += 1;
    else stats.derived += 1;
    if (s.componentSourcing) stats.componentSourcing += 1;
  }
  return stats;
}

// ── 시장 세그먼트 ────────────────────────────────────────────────────────────

/** 수요 사례 세그먼트 → 시장 세그먼트 */
export const ADOPTION_TO_MARKET_SEGMENT: Record<AdoptionSegment, MarketSegment> = {
  humanoid_tier1: 'tier1_oem',
  humanoid_tier2: 'tier2_legged',
  quadruped: 'tier2_legged',
  research_platform: 'research_edu',
  robot_arm: 'industrial_cobot',
  industrial: 'industrial_cobot',
  service_robot: 'service',
  exoskeleton: 'service',
};

export function marketSegmentOfAdoption(segment: AdoptionSegment): MarketSegment {
  return ADOPTION_TO_MARKET_SEGMENT[segment] ?? 'other';
}

/** 공급사·모델 텍스트(정규식)로 시장 세그먼트를 강제하는 예외. 앞에서부터 처음 맞는 것을 쓴다 */
export const SEGMENT_OVERRIDES: { pattern: RegExp; segments: MarketSegment[] }[] = [
  // LG AXIUM: 공개 로드맵(가정용 CLOiD 2026 → 외부 파트너 2027 → 산업용 고토크 2030) 기준 — 대표 service, 보조 industrial_cobot
  { pattern: /lg electronics.*axium/i, segments: ['service', 'industrial_cobot'] },
];

type KeywordSegment = Exclude<MarketSegment, 'captive' | 'other'>;

/** 키워드 규칙 — 규칙(정규식) 하나당 최대 1회 카운트. 키 순서가 동점 우선순위다 */
const SEGMENT_KEYWORD_RULES: Record<KeywordSegment, RegExp[]> = {
  tier1_oem: [/tier.?1|1군|mass.?production|contract\s*manufactur|위탁\s*제조/],
  tier2_legged: [/humanoid|휴머노이드/, /legged|quadruped|biped|보행|사족|이족/],
  research_edu: [/research|연구|academ|\blab\b/, /education|educational|교육|maker|메이커|student|formula student/],
  industrial_cobot: [
    /industrial|산업|manufactur|제조/,
    /cobot|collaborative|협동|robot arm|로봇 ?암|arm joints|positioner|machine tool|공작|semiconductor|반도체/,
  ],
  service: [
    /service|서비스|delivery|배송|home|household|가정|logistics|물류|warehouse|창고/,
    /agv|amr|medical|healthcare|의료|prosthetic|exoskeleton|외골격/,
  ],
};
const KEYWORD_SEGMENT_ORDER = Object.keys(SEGMENT_KEYWORD_RULES) as KeywordSegment[];

export interface SegmentClassification {
  /** 대표 세그먼트 — 항상 segments[0] */
  segment: MarketSegment;
  /** 대표를 맨 앞에 두고 나머지는 우선순위(MARKET_SEGMENT_ORDER) 순 */
  segments: MarketSegment[];
  basis: 'override' | 'vendor_segments' | 'adoptions' | 'keywords' | 'none';
}

/** 대표 세그먼트를 맨 앞에 두고 나머지(중복 제거)는 MARKET_SEGMENT_ORDER 순서로 */
function representativeFirst(rep: MarketSegment, all: MarketSegment[]): MarketSegment[] {
  const rest = MARKET_SEGMENT_ORDER.filter((s) => s !== rep && all.includes(s));
  return [rep, ...rest];
}

/** 수요 사례 1건이 제품 세그먼트 판정에 쓰이는 형태 */
export interface AdoptionSegmentVote {
  marketSegment: MarketSegment;
  /** 사례의 actuatorModel 이 이 제품과 실제로 매칭된 경우 true. 모델이 없거나 벤더 수준 문자열이면 false(동점 타이브레이커로만 사용) */
  modelSpecific: boolean;
}

/** 모델 미상이거나 시리즈·세트처럼 벤더 수준으로 적힌 모델 문자열 */
const VENDOR_LEVEL_MODEL = /series|시리즈|세트|등(?:\s|$)/i;
export function isVendorLevelModel(model: string | null | undefined): boolean {
  return model == null || model.trim() === '' || VENDOR_LEVEL_MODEL.test(model);
}

/** candidates(우선순위 순) 중 counts 가 가장 큰 것. 동률이면 앞(우선순위 높은 것). counts 가 모두 0 이면 null */
function mostFrequent(candidates: MarketSegment[], counts: Map<MarketSegment, number>): MarketSegment | null {
  let best: MarketSegment | null = null;
  let bestN = 0;
  for (const s of candidates) {
    const n = counts.get(s) ?? 0;
    if (n > bestN) { best = s; bestN = n; }
  }
  return best;
}

const countSegments = (votes: AdoptionSegmentVote[]): Map<MarketSegment, number> => {
  const m = new Map<MarketSegment, number>();
  for (const v of votes) m.set(v.marketSegment, (m.get(v.marketSegment) ?? 0) + 1);
  return m;
};

/**
 * 공급사 제품의 시장 세그먼트 분류 (순수). 우선순위:
 *  1) SEGMENT_OVERRIDES (정규식 `vendor model`)
 *  2) 공급사 제공 segments
 *  3) targetMarket 이 "(in-house)" 로 끝나면 captive (채택 사례가 있어도 captive 유지)
 *  4) 모델 특정 수요 사례(modelSpecific)의 marketSegment 최빈값 (basis 'adoptions'; 동점이면 우선순위 tier1_oem > tier2_legged > research_edu > industrial_cobot > service)
 *  5) 키워드 규칙 — 적중 수 최대가 대표. 동점이면 벤더 수준 사례(모델 미상·series·세트 등)의 최빈값, 그래도 동점이면 같은 우선순위. 없으면 other.
 * segments 는 항상 대표가 맨 앞이며, 나머지는 우선순위 순(4번은 사례 세그먼트 ∪ 키워드 적중).
 */
export function classifyMarketSegments(
  product: { vendor: string; model: string; targetMarket: string | null },
  vendorMarket: { targetMarketsKo?: string[] | null; segments?: MarketSegment[] | null } | null,
  adoptions: AdoptionSegmentVote[] = []
): SegmentClassification {
  const id = `${product.vendor} ${product.model}`;
  for (const o of SEGMENT_OVERRIDES) {
    if (o.pattern.test(id)) {
      const rep = o.segments[0] ?? 'other';
      return { segment: rep, segments: [rep, ...o.segments.filter((s) => s !== rep)], basis: 'override' };
    }
  }
  const given = (vendorMarket?.segments ?? []).filter((s): s is MarketSegment => (MARKET_SEGMENTS as readonly string[]).includes(s));
  if (given.length > 0) return { segment: given[0]!, segments: [...given], basis: 'vendor_segments' };
  if (/\(in-house\)\s*$/i.test(product.targetMarket ?? '')) return { segment: 'captive', segments: ['captive'], basis: 'keywords' };

  const text = `${product.targetMarket ?? ''} ${(vendorMarket?.targetMarketsKo ?? []).join(' ')}`.toLowerCase();
  const hits = KEYWORD_SEGMENT_ORDER.map((seg) => ({ seg, count: SEGMENT_KEYWORD_RULES[seg].filter((re) => re.test(text)).length })).filter((h) => h.count > 0);

  const specificCounts = countSegments(adoptions.filter((a) => a.modelSpecific));
  const specificRep = mostFrequent(MARKET_SEGMENT_ORDER, specificCounts);
  if (specificRep) {
    return { segment: specificRep, segments: representativeFirst(specificRep, [...specificCounts.keys(), ...hits.map((h) => h.seg)]), basis: 'adoptions' };
  }

  if (hits.length === 0) return { segment: 'other', segments: ['other'], basis: 'none' };
  const max = Math.max(...hits.map((h) => h.count));
  const tied = hits.filter((h) => h.count === max).map((h) => h.seg);
  const rep = (tied.length > 1 ? mostFrequent(tied, countSegments(adoptions.filter((a) => !a.modelSpecific))) : null) ?? tied[0]!;
  return { segment: rep, segments: representativeFirst(rep, hits.map((h) => h.seg)), basis: 'keywords' };
}

/** dynamicSpecs.diameterRangeMm — "40-120", "Φ40–Φ120", "40~120" → {min, max}. 숫자 하나면 min=max, 없으면 null */
export function parseDiameterRange(text: unknown): { min: number; max: number } | null {
  if (typeof text !== 'string') return null;
  const nums = (text.match(/\d+(?:\.\d+)?/g) ?? []).map(Number).filter((n) => Number.isFinite(n) && n > 0);
  if (nums.length === 0) return null;
  const a = nums[0]!;
  const b = nums.length > 1 ? nums[1]! : a;
  return { min: Math.min(a, b), max: Math.max(a, b) };
}

/** 공급사 타깃 시장 조회 — 키 정확 일치 우선, 없으면 sameVendor */
export function findVendorMarket<T extends { vendor: string; vendorKey: string }>(markets: T[], vendor: string): T | null {
  const key = vendorKey(vendor);
  return markets.find((m) => m.vendorKey === key) ?? markets.find((m) => sameVendor(m.vendor, vendor)) ?? null;
}

/** 이 제품에 연결되는 수요 사례 — 같은 공급사이고 (사례 모델이 미상·벤더 수준 문자열(series·세트 등)이거나 모델 매칭). 벤더 수준 사례는 그 공급사 모든 제품에 붙는다 */
export function matchAdoptionIds(
  product: { vendor: string; model: string },
  adoptions: { id: string; actuatorVendor: string; actuatorModel: string | null }[]
): string[] {
  return adoptions
    .filter((c) => sameVendor(c.actuatorVendor, product.vendor) && (isVendorLevelModel(c.actuatorModel) || modelMatches(c.actuatorModel, product.model)))
    .map((c) => c.id);
}

/**
 * products(type='actuator') 와 같은 제품을 가리키는 components 행("Vendor Model" 이름의 쌍둥이)을 제외한다.
 * 적용 스크립트가 공급사 제품을 products + components 로 이중 기록하므로 그대로 합치면 제품이 2배로 보인다.
 * 같은 공급사(sameVendor)이고 모델명이 서로 포함 관계(modelMatches, 3자 이상)이면 쌍둥이로 본다.
 */
export function dedupeLooseComponents<T extends { vendor: string; model: string }>(
  products: { vendor: string; model: string }[],
  loose: T[]
): T[] {
  return loose.filter((c) => !products.some((p) => sameVendor(p.vendor, c.vendor) && modelMatches(p.model, c.model)));
}

export type SupplierProductBase = Omit<ActuatorSupplierProduct, 'segment' | 'segments' | 'segmentBasis' | 'adoptionIds'>;

/** 기본 제품 행에 세그먼트 분류와 수요 사례 연결을 붙인다 */
export function enrichSupplierProduct(
  base: SupplierProductBase,
  vendorMarkets: VendorTargetMarket[],
  adoptions: { id: string; actuatorVendor: string; actuatorModel: string | null; marketSegment: MarketSegment }[]
): ActuatorSupplierProduct {
  const adoptionIds = matchAdoptionIds(base, adoptions);
  const votes: AdoptionSegmentVote[] = adoptions
    .filter((c) => adoptionIds.includes(c.id))
    .map((c) => ({ marketSegment: c.marketSegment, modelSpecific: !isVendorLevelModel(c.actuatorModel) }));
  const cls = classifyMarketSegments(base, findVendorMarket(vendorMarkets, base.vendor), votes);
  return { ...base, segment: cls.segment, segments: cls.segments, segmentBasis: cls.basis, adoptionIds };
}

// ── 조립 (DB 행 → 응답) ──────────────────────────────────────────────────────

interface RobotRow {
  id: string;
  name: string;
  companyId: string;
  companyName: string | null;
  companyCountry: string | null;
  region: string | null;
  locomotionType: string | null;
  commercializationStage: string | null;
  announcementYear: number | null;
  dataType: string;
  description: string | null;
  heightCm: string | null;
  weightKg: string | null;
  payloadKg: string | null;
  dofCount: number | null;
  maxSpeedMps: string | null;
  handDof: number | null;
}

interface ActuatorComponentRow {
  id: string;
  name: string;
  vendor: string | null;
  specifications: ComponentSpecs | null;
}

interface RobotActuatorRow {
  robotId: string;
  name: string;
  vendor: string | null;
  specifications: ComponentSpecs | null;
  quantity: number | null;
  usageLocation: string | null;
}

/** CI 경쟁사 → 로봇 매칭 (이름 정확 일치 → 접두 일치 → 제조사 유일 로봇) */
export function matchCiToRobot(
  ci: { competitorName: string; manufacturer: string },
  robots: { id: string; name: string; company: string }[]
): string | null {
  const n = ci.competitorName.trim().toLowerCase();
  const exact = robots.find((r) => r.name.trim().toLowerCase() === n);
  if (exact) return exact.id;
  const prefix = robots.filter((r) => {
    const rn = r.name.trim().toLowerCase();
    return rn.startsWith(n) || n.startsWith(rn);
  });
  if (prefix.length === 1) return prefix[0]!.id;
  const sameCo = robots.filter((r) => isSameCompany(r.company, ci.manufacturer));
  if (sameCo.length === 1) return sameCo[0]!.id;
  return null;
}

/** CI '액추에이터 공급사' 에 공급사명 대신 적힌 "자체" 표기 */
const SELF_VENDOR_TOKEN = /^(자체|자사|독자|in-?house|self)$/i;

export function assembleRobot(
  row: RobotRow,
  actuatorRows: RobotActuatorRow[],
  ci: CiRobotFacts | null,
  sourcingRow: SourcingRow | null = null
): ActuatorMapRobot {
  const company = row.companyName ?? '(회사 미상)';
  const sources: string[] = ['humanoid_robots'];
  const hasBody = row.heightCm != null || row.weightKg != null || row.dofCount != null || row.maxSpeedMps != null;
  if (hasBody) sources.push('body_specs');
  if (row.handDof != null) sources.push('hand_specs');

  const actuators: RobotActuator[] = actuatorRows.map((a) => {
    const specs = a.specifications ?? {};
    const type =
      classifyActuatorText(typeof specs.actuatorType === 'string' ? specs.actuatorType : null) ??
      classifyActuatorText(a.name) ??
      '미확인';
    return {
      name: a.name,
      vendor: a.vendor,
      inHouse: isSameCompany(a.vendor, company),
      type,
      torqueNm: specNum(specs.maxTorqueNm) ?? specNum(specs.ratedTorqueNm),
      weightKg: specNum(specs.weightKg),
      quantity: a.quantity ?? 1,
      usageLocation: a.usageLocation,
      source: 'components',
      confidence: 'B',
    };
  });
  if (actuators.length > 0) sources.push('components/robot_components');

  // CI 공급사·자체 생산 → 가상 액추에이터 행 (토크는 '관절 토크' 항목에서)
  const ciDrive = ci?.values['구동 방식'];
  const ciVendor = ci?.values['액추에이터 공급사'];
  const ciInHouse = ci?.values['자체 생산 여부'];
  const ciTorque = ci?.values['관절 토크'];
  const ciPrice = ci?.values['가격대'];
  if (ci) sources.push('ci_values');

  const ciTypeFromDrive = classifyActuatorText(ciDrive?.value ?? null);
  const ciTorqueNm = ciTorque ? parseLeadingNumber(ciTorque.value) : null;
  const ciVendors = parseVendorList(ciVendor?.value);
  for (const v of ciVendors) {
    // CI 공급사 값 "자체 (회사명)" 의 괄호 제거 결과인 "자체" 는 외부 공급사가 아니라 제조사 자신이다
    const selfToken = SELF_VENDOR_TOKEN.test(v);
    const vendorName = selfToken ? company : v;
    if (actuators.some((a) => isSameCompany(a.vendor, vendorName))) continue;
    actuators.push({
      name: `${vendorName} (CI)`,
      vendor: vendorName,
      inHouse: selfToken || isSameCompany(v, company),
      type: ciTypeFromDrive ?? '미확인',
      torqueNm: ciTorqueNm,
      weightKg: null,
      quantity: 1,
      usageLocation: null,
      source: 'ci',
      confidence: ciVendor?.confidence ?? 'D',
    });
  }
  const inHouseFlag = parseInHouse(ciInHouse?.value);
  if (inHouseFlag === true && !actuators.some((a) => a.inHouse)) {
    actuators.push({
      name: '자체 액추에이터 (CI)',
      vendor: company,
      inHouse: true,
      type: ciTypeFromDrive ?? '커스텀 전기(상세 미공개)',
      torqueNm: ciTorqueNm,
      weightKg: null,
      quantity: 1,
      usageLocation: null,
      source: 'ci',
      confidence: ciInHouse?.confidence ?? 'D',
    });
  }

  // 타입 라벨: components 근거 > CI 구동 방식(+설명의 유압 언급) > 미확인
  let actuatorTypeLabel: ActuatorTypeLabel = '미확인';
  let actuatorTypeNote = 'DB에 구동 방식 기록 없음';
  const concrete = actuators.find((a) => a.source === 'components' && a.type !== '미확인');
  if (concrete) {
    actuatorTypeLabel = concrete.type;
    actuatorTypeNote = `components: ${concrete.name}${concrete.torqueNm != null ? ` (최대 ${concrete.torqueNm} Nm` : ''}${
      concrete.torqueNm != null ? (concrete.weightKg != null ? `, ${concrete.weightKg} kg)` : ')') : ''
    }${concrete.quantity > 1 ? ` × ${concrete.quantity}` : ''}`;
  } else if (ciDrive?.value) {
    const combined = classifyActuatorText(`${ciDrive.value} ${row.description ?? ''}`);
    actuatorTypeLabel = ciTypeFromDrive ?? combined ?? '미확인';
    if (ciTypeFromDrive === '커스텀 전기(상세 미공개)' && combined === '유압→전기 전환') actuatorTypeLabel = combined;
    actuatorTypeNote = `CI 구동 방식 "${ciDrive.value}" (${ciDrive.confidence})`;
  } else {
    const fromDesc = classifyActuatorText(row.description);
    if (fromDesc && fromDesc !== '커스텀 전기(상세 미공개)') {
      actuatorTypeLabel = fromDesc;
      actuatorTypeNote = 'humanoid_robots 설명에서 추정';
    }
  }

  // 가격: CI '가격대' → 로봇 설명의 $ 금액
  let price: RobotPrice | null = null;
  const ciRange = parsePriceRange(ciPrice?.value);
  if (ciRange) {
    price = { ...ciRange, conf: ciPrice?.confidence ?? 'D', src: `CI 가격대: ${ciPrice?.value ?? ''}` };
  } else {
    const descRange = parseDescriptionPrice(row.description);
    if (descRange) price = { ...descRange, conf: 'C', src: 'humanoid_robots 설명' };
  }

  const dof = row.dofCount;
  const incomplete = !hasBody || dof == null;
  if (sourcingRow) sources.push('actuator_sourcing');

  return {
    id: row.id,
    name: row.name,
    company,
    companyId: row.companyId,
    region: normalizeRegion(row.region, row.companyCountry),
    locomotion: normalizeLocomotion(row.locomotionType),
    stage: row.commercializationStage,
    year: row.announcementYear,
    forecast: row.dataType === 'forecast',
    isLG: isLGCompany(row.companyName),
    height: num(row.heightCm),
    weight: num(row.weightKg),
    payload: num(row.payloadKg),
    dof,
    handDof: row.handDof,
    speed: num(row.maxSpeedMps),
    incomplete,
    actuators,
    actuatorTypeLabel,
    actuatorTypeNote,
    price,
    sources,
    sourcing: resolveSourcing(sourcingRow, actuators, company),
  };
}

/** "최대 160 Nm" / "80Nm" → 160 / 80. 숫자가 없으면 null */
export function parseLeadingNumber(text: string | null | undefined): number | null {
  if (!text) return null;
  const m = /(\d[\d,]*(?:\.\d+)?)/.exec(text);
  if (!m) return null;
  const n = Number((m[1] ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/**
 * 로봇 → 공급사 엣지.
 *  - 액추에이터 행마다 엣지 1개(같은 로봇·같은 공급사는 수량 합산). 자체 엣지의 basis 는 로봇 조달 태세가 unknown 이면 'unverified', 아니면 'self'.
 *  - 조달 태세 재판정의 externalVendors 가 같은 로봇에 없으면 엣지를 추가한다(quantity 1, 등급 없으면 B, 타입은 같은 공급사 제품의 타입 또는 '미확인').
 *    이미 있으면 role/level 만 채운다.
 */
export function buildEdges(
  robots: ActuatorMapRobot[],
  suppliers: Pick<ActuatorSupplierProduct, 'vendor' | 'type'>[] = []
): ActuatorSupplyEdge[] {
  const edges: ActuatorSupplyEdge[] = [];
  const labels = ACTUATOR_TYPE_LABELS as readonly string[];
  for (const r of robots) {
    const posture: SourcingPosture = r.sourcing?.posture ?? 'unknown';
    const robotEdges: ActuatorSupplyEdge[] = [];
    for (const a of r.actuators) {
      const vendor = a.inHouse ? r.company : (a.vendor ?? '').trim() || '(공급사 미상)';
      const key = vendor.toLowerCase();
      const existing = robotEdges.find((e) => e.vendor.toLowerCase() === key);
      if (existing) {
        existing.quantity += a.quantity;
        continue;
      }
      robotEdges.push({
        robotId: r.id,
        robotName: r.name,
        company: r.company,
        vendor,
        inHouse: a.inHouse,
        type: a.type,
        quantity: a.quantity,
        confidence: a.confidence,
        basis: a.inHouse ? (posture === 'unknown' ? 'unverified' : 'self') : 'external',
        posture,
        role: null,
        level: 'module',
      });
    }
    for (const v of r.sourcing?.externalVendors ?? []) {
      const existing = robotEdges.find((e) => !e.inHouse && sameVendor(e.vendor, v.vendor));
      if (existing) {
        if (existing.role == null) existing.role = v.role;
        existing.level = v.level;
        continue;
      }
      const sameVendorType = suppliers.find((s) => sameVendor(s.vendor, v.vendor) && labels.includes(s.type))?.type;
      robotEdges.push({
        robotId: r.id,
        robotName: r.name,
        company: r.company,
        vendor: v.vendor,
        inHouse: false,
        type: (sameVendorType as ActuatorTypeLabel | undefined) ?? '미확인',
        quantity: 1,
        confidence: v.grade ?? 'B',
        basis: 'external',
        posture,
        role: v.role,
        level: v.level,
      });
    }
    edges.push(...robotEdges);
  }
  return edges;
}

/** actuator_adoptions 행 → API 사례 */
export function adoptionRowToCase(r: typeof actuatorAdoptions.$inferSelect): ActuatorAdoptionCase {
  const segment = r.segment as AdoptionSegment;
  return {
    id: r.id,
    robotName: r.robotName,
    company: r.company,
    country: r.country ?? null,
    segment,
    marketSegment: marketSegmentOfAdoption(segment),
    level: r.level === 'component' ? 'component' : 'module',
    robotClass: r.robotClass ?? null,
    actuatorVendor: r.actuatorVendor,
    vendorKey: vendorKey(r.actuatorVendor),
    actuatorModel: r.actuatorModel ?? null,
    usage: r.usageText ?? null,
    evidenceGrade: r.evidenceGrade ?? null,
    sources: sanitizeAdoptionSources(r.sources).map((s) => ({ url: s.url, title: s.title })),
    noteKo: r.noteKo ?? null,
    year: r.adoptedYear ?? null,
  };
}

/** actuator_vendor_markets 행 → API 공급사 타깃 시장 */
export function vendorMarketRowToModel(r: typeof actuatorVendorMarkets.$inferSelect): VendorTargetMarket {
  const segments = Array.isArray(r.segments) ? r.segments.filter((s): s is MarketSegment => (MARKET_SEGMENTS as readonly string[]).includes(s)) : null;
  return {
    vendor: r.vendor,
    vendorKey: r.vendorKey,
    targetMarketsKo: Array.isArray(r.targetMarketsKo) ? r.targetMarketsKo.filter((s): s is string => typeof s === 'string') : [],
    segments: segments && segments.length > 0 ? segments : null,
    grade: r.grade ?? null,
    url: r.url ?? null,
  };
}

// ── 서비스 ───────────────────────────────────────────────────────────────────

const CACHE_KEY = 'actuator-position-map';
const TTL_MS = 10 * 60 * 1000;

export class ActuatorPositionMapService {
  private inflight: Promise<ActuatorMapBody> | null = null;

  async getMap(): Promise<ActuatorMapResponse> {
    try {
      const [cached] = await db.select().from(viewCache).where(eq(viewCache.viewName, CACHE_KEY)).limit(1);
      if (cached && Date.now() - cached.cachedAt.getTime() < TTL_MS) {
        const data = cached.data as unknown as ActuatorMapBody;
        // 구버전(schemaVersion 없음) 캐시는 인정하지 않고 재계산한다
        if (
          data &&
          data.schemaVersion === ACTUATOR_MAP_SCHEMA_VERSION &&
          Array.isArray(data.robots) &&
          Array.isArray(data.suppliers) &&
          Array.isArray(data.edges)
        ) {
          return { ...data, cached: true };
        }
      }
    } catch {
      // 캐시 조회 실패는 무시하고 재계산
    }
    if (!this.inflight) {
      this.inflight = this.compute().finally(() => {
        this.inflight = null;
      });
    }
    const body = await this.inflight;
    return { ...body, cached: false };
  }

  async invalidate(): Promise<void> {
    try {
      await db.update(viewCache).set({ cachedAt: new Date(0) }).where(eq(viewCache.viewName, CACHE_KEY));
    } catch (err) {
      console.error('[ActuatorPositionMap] cache invalidation failed:', (err as Error).message);
    }
  }

  private async compute(): Promise<ActuatorMapBody> {
    const [robotRows, actuatorRows, ciFacts, allActuatorComponents, companyRows, sourcingRows, adoptions, vendorMarkets] = await Promise.all([
      this.fetchRobots(),
      this.fetchRobotActuators(),
      this.fetchCiFacts(),
      this.fetchAllActuatorComponents(),
      db.select({ name: companies.name, country: companies.country }).from(companies),
      this.fetchSourcingRows(),
      this.fetchAdoptions(),
      this.fetchVendorMarkets(),
    ]);
    const typeByVendor = vendorTypeMap(allActuatorComponents);
    const [supplierProducts, looseComponents] = await Promise.all([
      this.fetchSupplierProducts(typeByVendor),
      this.fetchLooseActuatorComponents(allActuatorComponents, companyRows),
    ]);

    const basic = robotRows.map((r) => ({ id: r.id, name: r.name, company: r.companyName ?? '' }));
    const ciByRobot = new Map<string, CiRobotFacts>();
    for (const f of ciFacts) {
      const id = matchCiToRobot(f, basic);
      if (id && !ciByRobot.has(id)) ciByRobot.set(id, f);
    }
    const actuatorsByRobot = new Map<string, RobotActuatorRow[]>();
    for (const a of actuatorRows) {
      const list = actuatorsByRobot.get(a.robotId) ?? [];
      list.push(a);
      actuatorsByRobot.set(a.robotId, list);
    }
    const sourcingByRobot = new Map(sourcingRows.map((s) => [s.robotId, s]));

    const robots = robotRows
      .map((r) => assembleRobot(r, actuatorsByRobot.get(r.id) ?? [], ciByRobot.get(r.id) ?? null, sourcingByRobot.get(r.id) ?? null))
      .sort((a, b) => a.company.localeCompare(b.company) || a.name.localeCompare(b.name));

    const suppliers: ActuatorSupplierProduct[] = [...supplierProducts, ...dedupeLooseComponents(supplierProducts, looseComponents)]
      .sort((a, b) => a.vendor.localeCompare(b.vendor) || a.model.localeCompare(b.model))
      .map((p) => enrichSupplierProduct(p, vendorMarkets, adoptions));
    const edges = buildEdges(robots, suppliers);
    const complete = robots.filter((r) => !r.incomplete).length;

    const body: ActuatorMapBody = {
      schemaVersion: ACTUATOR_MAP_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      difficultyDefault: { ...DIFFICULTY_DEFAULT },
      typeOrder: [...ACTUATOR_TYPE_LABELS],
      robots,
      suppliers,
      edges,
      adoptions,
      vendorMarkets,
      sourcingStats: computeSourcingStats(robots),
      segmentOrder: [...MARKET_SEGMENT_ORDER],
      stats: {
        robots: robots.length,
        complete,
        incomplete: robots.length - complete,
        suppliers: suppliers.length,
        edges: edges.length,
        adoptions: adoptions.length,
      },
    };

    try {
      await db
        .insert(viewCache)
        .values({ viewName: CACHE_KEY, data: body, ttlMs: TTL_MS })
        .onConflictDoUpdate({ target: viewCache.viewName, set: { data: body, cachedAt: new Date(), ttlMs: TTL_MS } });
    } catch {
      // 캐시 저장 실패는 치명적이지 않음
    }
    return body;
  }

  /** actuator_sourcing — 테이블이 없는 환경(마이그레이션 전)에서는 빈 배열 */
  private async fetchSourcingRows(): Promise<SourcingRow[]> {
    try {
      return await db
        .select({
          robotId: actuatorSourcing.robotId,
          sourcing: actuatorSourcing.sourcing,
          sellsExternally: actuatorSourcing.sellsExternally,
          evidenceGrade: actuatorSourcing.evidenceGrade,
          evidence: actuatorSourcing.evidence,
          externalVendors: actuatorSourcing.externalVendors,
          noteKo: actuatorSourcing.noteKo,
        })
        .from(actuatorSourcing);
    } catch {
      return [];
    }
  }

  /** actuator_adoptions — 테이블이 없으면 빈 배열 */
  private async fetchAdoptions(): Promise<ActuatorAdoptionCase[]> {
    try {
      const rows = await db.select().from(actuatorAdoptions);
      return rows
        .map(adoptionRowToCase)
        .sort(
          (a, b) =>
            a.company.localeCompare(b.company) ||
            a.robotName.localeCompare(b.robotName) ||
            a.actuatorVendor.localeCompare(b.actuatorVendor) ||
            (a.actuatorModel ?? '').localeCompare(b.actuatorModel ?? '')
        );
    } catch {
      return [];
    }
  }

  /** actuator_vendor_markets — 테이블이 없으면 빈 배열 */
  private async fetchVendorMarkets(): Promise<VendorTargetMarket[]> {
    try {
      const rows = await db.select().from(actuatorVendorMarkets);
      return rows.map(vendorMarketRowToModel).sort((a, b) => a.vendor.localeCompare(b.vendor));
    } catch {
      return [];
    }
  }

  private async fetchRobots(): Promise<RobotRow[]> {
    const rows = await db
      .select({
        id: humanoidRobots.id,
        name: humanoidRobots.name,
        companyId: humanoidRobots.companyId,
        companyName: companies.name,
        companyCountry: companies.country,
        region: humanoidRobots.region,
        locomotionType: humanoidRobots.locomotionType,
        commercializationStage: humanoidRobots.commercializationStage,
        announcementYear: humanoidRobots.announcementYear,
        dataType: humanoidRobots.dataType,
        description: humanoidRobots.description,
        heightCm: bodySpecs.heightCm,
        weightKg: bodySpecs.weightKg,
        payloadKg: bodySpecs.payloadKg,
        dofCount: bodySpecs.dofCount,
        maxSpeedMps: bodySpecs.maxSpeedMps,
        handDof: handSpecs.handDof,
      })
      .from(humanoidRobots)
      .leftJoin(companies, eq(companies.id, humanoidRobots.companyId))
      .leftJoin(bodySpecs, eq(bodySpecs.robotId, humanoidRobots.id))
      .leftJoin(handSpecs, eq(handSpecs.robotId, humanoidRobots.id));
    return rows;
  }

  private async fetchRobotActuators(): Promise<RobotActuatorRow[]> {
    return db
      .select({
        robotId: robotComponents.robotId,
        name: components.name,
        vendor: components.vendor,
        specifications: components.specifications,
        quantity: robotComponents.quantity,
        usageLocation: robotComponents.usageLocation,
      })
      .from(robotComponents)
      .innerJoin(components, eq(components.id, robotComponents.componentId))
      .where(eq(components.type, 'actuator'));
  }

  private async fetchCiFacts(): Promise<CiRobotFacts[]> {
    let rows: { competitorName: string; manufacturer: string; itemName: string; value: string | null; confidence: string | null; source: string | null }[];
    try {
      rows = await db
        .select({
          competitorName: ciCompetitors.name,
          manufacturer: ciCompetitors.manufacturer,
          itemName: ciItems.name,
          value: ciValues.value,
          confidence: ciValues.confidence,
          source: ciValues.source,
        })
        .from(ciValues)
        .innerJoin(ciItems, eq(ciItems.id, ciValues.itemId))
        .innerJoin(ciCompetitors, eq(ciCompetitors.id, ciValues.competitorId))
        .where(inArray(ciItems.name, [...CI_ITEM_NAMES]));
    } catch {
      // CI 테이블이 없는 환경(초기 마이그레이션 전)에서는 CI 보강 없이 진행
      return [];
    }
    const byCompetitor = new Map<string, CiRobotFacts>();
    for (const r of rows) {
      if (!r.value) continue;
      const key = `${r.competitorName}|${r.manufacturer}`;
      const facts = byCompetitor.get(key) ?? { competitorName: r.competitorName, manufacturer: r.manufacturer, values: {} };
      facts.values[r.itemName as CiItemName] = { value: r.value, confidence: r.confidence ?? 'D', source: r.source };
      byCompetitor.set(key, facts);
    }
    return [...byCompetitor.values()];
  }

  private async fetchSupplierProducts(typeByVendor: Map<string, ActuatorTypeLabel>): Promise<SupplierProductBase[]> {
    const rows = await db
      .select({
        vendor: companies.name,
        country: companies.country,
        companyDescription: companies.description,
        model: products.name,
        series: products.series,
        status: products.status,
        targetMarket: products.targetMarket,
        dynamicSpecs: productSpecs.dynamicSpecs,
        priceMin: productSpecs.priceMin,
        priceMax: productSpecs.priceMax,
      })
      .from(products)
      .innerJoin(companies, eq(companies.id, products.companyId))
      .leftJoin(productSpecs, eq(productSpecs.productId, products.id))
      .where(eq(products.type, 'actuator'));
    return rows.map((r) => {
      const ds: DynamicSpecs = r.dynamicSpecs ?? {};
      const text = [r.vendor, r.model, r.series, r.companyDescription, r.targetMarket, typeof ds.actuatorType === 'string' ? ds.actuatorType : '']
        .filter(Boolean)
        .join(' ');
      const fromSpec = classifyActuatorText(typeof ds.actuatorType === 'string' ? ds.actuatorType : null);
      const peak = specNum(ds.peakTorqueNm) ?? specNum(ds.maxTorqueNm) ?? specNum(ds.torqueNm);
      const cont = specNum(ds.continuousTorqueNm) ?? specNum(ds.ratedTorqueNm);
      const priceMin = num(r.priceMin);
      const priceMax = num(r.priceMax);
      return {
        vendor: r.vendor,
        country: r.country,
        model: r.model,
        type: fromSpec ?? lookupVendorType(typeByVendor, r.vendor) ?? inferSupplierType(text),
        peakTorqueNm: peak,
        continuousTorqueNm: cont,
        weightKg: specNum(ds.weightKg),
        diameterMm: specNum(ds.diameterMm),
        priceUsd: priceMin != null && priceMax != null ? Math.sqrt(priceMin * priceMax) : priceMin ?? priceMax ?? specNum(ds.priceUsd),
        status: r.status,
        targetMarket: r.targetMarket,
        source: 'products',
        diameterRangeMm: parseDiameterRange(ds.diameterRangeMm),
        integrationLevel: typeof ds.integrationLevel === 'string' ? ds.integrationLevel : null,
        isLG: isLGCompany(r.vendor),
      };
    });
  }

  private async fetchAllActuatorComponents(): Promise<ActuatorComponentRow[]> {
    return db
      .select({ id: components.id, name: components.name, vendor: components.vendor, specifications: components.specifications })
      .from(components)
      .where(eq(components.type, 'actuator'));
  }

  /** components(type='actuator') 중 robot_components 에 연결되지 않은 것 — 공급사 제품으로 취급 */
  private async fetchLooseActuatorComponents(
    all: ActuatorComponentRow[],
    companyRows: { name: string; country: string }[]
  ): Promise<SupplierProductBase[]> {
    if (all.length === 0) return [];
    const linked = await db
      .select({ componentId: robotComponents.componentId })
      .from(robotComponents)
      .innerJoin(components, eq(components.id, robotComponents.componentId))
      .where(eq(components.type, 'actuator'));
    const linkedIds = new Set(linked.map((l) => l.componentId));
    return all
      .filter((c) => !linkedIds.has(c.id))
      .map((c) => {
        const specs = c.specifications ?? {};
        const vendor = c.vendor ?? '(공급사 미상)';
        return {
          vendor,
          country: companyRows.find((co) => isSameCompany(co.name, vendor))?.country ?? null,
          model: c.name,
          type: classifyActuatorText(typeof specs.actuatorType === 'string' ? specs.actuatorType : null) ?? inferSupplierType(c.name),
          peakTorqueNm: specNum(specs.maxTorqueNm),
          continuousTorqueNm: specNum(specs.ratedTorqueNm),
          weightKg: specNum(specs.weightKg),
          diameterMm: specNum(specs.diameterMm),
          priceUsd: specNum(specs.priceUsd),
          status: null,
          targetMarket: typeof specs.integrationLevel === 'string' ? specs.integrationLevel : null,
          source: 'components',
          diameterRangeMm: parseDiameterRange(specs.diameterRangeMm),
          integrationLevel: typeof specs.integrationLevel === 'string' ? specs.integrationLevel : null,
          isLG: isLGCompany(vendor),
        };
      });
  }

}

export const actuatorPositionMapService = new ActuatorPositionMapService();
