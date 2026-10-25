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
 * 순수 함수(정규화·파싱·기본 난이도)는 export 해 단위 테스트한다. DB 접근은 클래스 메서드에만 있다.
 * 캐시: view_cache 테이블(10분) + 인플라이트 공유.
 */

import { eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
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
}

export interface ActuatorMapBody {
  generatedAt: string;
  difficultyDefault: DifficultyWeights;
  typeOrder: ActuatorTypeLabel[];
  robots: ActuatorMapRobot[];
  suppliers: ActuatorSupplierProduct[];
  edges: ActuatorSupplyEdge[];
  stats: { robots: number; complete: number; incomplete: number; suppliers: number; edges: number };
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

export function assembleRobot(row: RobotRow, actuatorRows: RobotActuatorRow[], ci: CiRobotFacts | null): ActuatorMapRobot {
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
    if (actuators.some((a) => isSameCompany(a.vendor, v))) continue;
    actuators.push({
      name: `${v} (CI)`,
      vendor: v,
      inHouse: isSameCompany(v, company),
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

export function buildEdges(robots: ActuatorMapRobot[]): ActuatorSupplyEdge[] {
  const edges: ActuatorSupplyEdge[] = [];
  for (const r of robots) {
    const seen = new Set<string>();
    for (const a of r.actuators) {
      const vendor = a.inHouse ? r.company : (a.vendor ?? '').trim() || '(공급사 미상)';
      const key = vendor.toLowerCase();
      const existing = edges.find((e) => e.robotId === r.id && e.vendor.toLowerCase() === key);
      if (existing) {
        existing.quantity += a.quantity;
        continue;
      }
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({
        robotId: r.id,
        robotName: r.name,
        company: r.company,
        vendor,
        inHouse: a.inHouse,
        type: a.type,
        quantity: a.quantity,
        confidence: a.confidence,
      });
    }
  }
  return edges;
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
        if (data && Array.isArray(data.robots) && Array.isArray(data.suppliers) && Array.isArray(data.edges)) {
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
    const [robotRows, actuatorRows, ciFacts, allActuatorComponents, companyRows] = await Promise.all([
      this.fetchRobots(),
      this.fetchRobotActuators(),
      this.fetchCiFacts(),
      this.fetchAllActuatorComponents(),
      db.select({ name: companies.name, country: companies.country }).from(companies),
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

    const robots = robotRows
      .map((r) => assembleRobot(r, actuatorsByRobot.get(r.id) ?? [], ciByRobot.get(r.id) ?? null))
      .sort((a, b) => a.company.localeCompare(b.company) || a.name.localeCompare(b.name));

    const suppliers: ActuatorSupplierProduct[] = [...supplierProducts, ...looseComponents].sort(
      (a, b) => a.vendor.localeCompare(b.vendor) || a.model.localeCompare(b.model)
    );
    const edges = buildEdges(robots);
    const complete = robots.filter((r) => !r.incomplete).length;

    const body: ActuatorMapBody = {
      generatedAt: new Date().toISOString(),
      difficultyDefault: { ...DIFFICULTY_DEFAULT },
      typeOrder: [...ACTUATOR_TYPE_LABELS],
      robots,
      suppliers,
      edges,
      stats: { robots: robots.length, complete, incomplete: robots.length - complete, suppliers: suppliers.length, edges: edges.length },
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

  private async fetchSupplierProducts(typeByVendor: Map<string, ActuatorTypeLabel>): Promise<ActuatorSupplierProduct[]> {
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
  ): Promise<ActuatorSupplierProduct[]> {
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
        };
      });
  }

}

export const actuatorPositionMapService = new ActuatorPositionMapService();
