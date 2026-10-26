/**
 * 액추에이터 관점 경쟁사 포지션·공급망 맵 타입 — backend/src/services/actuator-position-map.service.ts 응답과 1:1.
 * 제어 난이도 지수는 프런트에서 가중치를 바꿔 계산한다 (서버는 기본 가중치 difficultyDefault 만 내려준다).
 */

export type ActuatorMapRegion = 'na' | 'cn' | 'eu' | 'kr' | 'jp' | 'other';

/** 조달 판정 원본 (재판정 레코드의 sourcing) */
export type SourcingKind = 'in_house_confirmed' | 'in_house_presumed' | 'external' | 'mixed' | 'unknown';
/** 조달 태세 4단계 — 자체 개발(확인) / 자체 개발+외판 / 외부 조달·혼합 / 확인 불가 */
export type SourcingPosture = 'in_house' | 'in_house_sells' | 'external' | 'unknown';
/** 시장 세그먼트 (tier1_oem = 1군 세트사 양산 공급·위탁제조) */
export type MarketSegment = 'tier1_oem' | 'tier2_legged' | 'research_edu' | 'industrial_cobot' | 'service' | 'captive' | 'other';
export type AdoptionSegment =
  | 'humanoid_tier1'
  | 'humanoid_tier2'
  | 'research_platform'
  | 'service_robot'
  | 'quadruped'
  | 'exoskeleton'
  | 'robot_arm'
  | 'industrial';
/** module = 모듈(통합 관절) 층, component = 부품(모터·감속기 등) 층 */
export type SourcingLevel = 'module' | 'component';

export type ActuatorTypeLabel =
  | '유압→전기 전환'
  | '하모닉(스트레인웨이브)'
  | '사이클로이드·유성'
  | '직구동/QDD'
  | '리니어·스크류'
  | '소프트·텐던'
  | '커스텀 전기(상세 미공개)'
  | '미확인';

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
  /** derived = 재판정 레코드 없음(보수적 폴백) */
  basis: 'regrade' | 'derived';
  /** 모듈 층은 자체 설계이고 부품(모터·감속기)만 외부 조달 — posture 는 in_house */
  componentSourcing: boolean;
}

export interface RobotActuator {
  name: string;
  vendor: string | null;
  inHouse: boolean;
  type: ActuatorTypeLabel;
  torqueNm: number | null;
  weightKg: number | null;
  quantity: number;
  usageLocation: string | null;
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
  /** body_specs 가 없어 X축을 계산할 수 없는 로봇 — 표에만 표시 */
  incomplete: boolean;
  actuators: RobotActuator[];
  actuatorTypeLabel: ActuatorTypeLabel;
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
  source: 'products' | 'components';
  diameterRangeMm: { min: number; max: number } | null;
  integrationLevel: string | null;
  isLG: boolean;
  /** 대표 세그먼트(색) */
  segment: MarketSegment;
  /** 전체 (우선순위 순) */
  segments: MarketSegment[];
  segmentBasis: 'override' | 'vendor_segments' | 'keywords' | 'adoptions' | 'none';
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
  /** self = 자체, external = 외부 조달, unverified = 자체로 보이지만 로봇 posture 가 확인 불가 */
  basis: 'self' | 'external' | 'unverified';
  posture: SourcingPosture;
  role: string | null;
  /** 없으면 module 로 간주 */
  level: SourcingLevel;
}

export interface AdoptionSource {
  url: string;
  title: string | null;
}

/** 외부 액추에이터를 쓰는 공개 채택 사례 (공급 계약 여부와는 별개) */
export interface ActuatorAdoptionCase {
  id: string;
  robotName: string;
  company: string;
  country: string | null;
  segment: AdoptionSegment;
  marketSegment: MarketSegment;
  level: SourcingLevel;
  robotClass: string | null;
  actuatorVendor: string;
  vendorKey: string;
  actuatorModel: string | null;
  usage: string | null;
  evidenceGrade: string | null;
  sources: AdoptionSource[];
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
  /** forecast 제외 */
  robots: number;
  inHouse: number;
  inHouseSells: number;
  external: number;
  /** external 의 부분집합 */
  externalMixed: number;
  unknown: number;
  /** unknown 의 부분집합 (자체 개발 추정) */
  unknownPresumed: number;
  /** posture 는 in_house 이지만 부품(모터·감속기)을 외부 조달하는 로봇 수 */
  componentSourcing: number;
  regraded: number;
  derived: number;
}

export interface ActuatorMapResponse {
  generatedAt: string;
  cached: boolean;
  difficultyDefault: DifficultyWeights;
  typeOrder: ActuatorTypeLabel[];
  robots: ActuatorMapRobot[];
  suppliers: ActuatorSupplierProduct[];
  edges: ActuatorSupplyEdge[];
  stats: { robots: number; complete: number; incomplete: number; suppliers: number; edges: number; adoptions: number };
  schemaVersion: number;
  adoptions: ActuatorAdoptionCase[];
  vendorMarkets: VendorTargetMarket[];
  sourcingStats: SourcingStats;
  segmentOrder: MarketSegment[];
}
