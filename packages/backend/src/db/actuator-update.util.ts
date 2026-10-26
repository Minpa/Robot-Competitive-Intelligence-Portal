/**
 * actuator-update.util.ts
 *
 * 순수 변환 함수 모음 — `update-actuator-data.ts`(DB 업서트 스크립트)가 사용한다.
 * DB 접근 없음. 단위 테스트: `src/__tests__/unit/actuator-update.unit.test.ts`
 *
 * 포함 내용
 *  - 입력 JSON 타입 (robots.json / suppliers.json / sourcing-regrade.json / demand-cases.json)
 *  - 이름 정규화·별칭 매칭 (회사 / 로봇 / CI 경쟁사)
 *  - 신뢰도(A~F) 비교 규칙 (스펙 덮어쓰기, CI 값 교체)
 *  - 단위 변환 / 숫자 파싱 / decimal 문자열 변환
 *  - JSON → 행 데이터 변환 (components, product_specs.dynamicSpecs, CI 값)
 */

// ============================================================
// 1. 입력 JSON 타입
// ============================================================

export type Confidence = 'A' | 'B' | 'C' | 'D' | 'F';

export const ACTUATOR_TYPES = [
  'direct_drive',
  'qdd',
  'harmonic',
  'cycloidal',
  'planetary',
  'bldc_gearbox',
  'linear_screw',
  'tendon',
  'hydraulic',
  'series_elastic',
  'servo',
  'unknown',
] as const;
export type ActuatorType = (typeof ACTUATOR_TYPES)[number];

export interface SourceRef {
  url: string;
  title?: string | null;
  publisher?: string | null;
  date?: string | null; // YYYY-MM-DD
  confidence?: string | null; // A~F
  fields?: string[] | null; // 이 출처가 뒷받침하는 필드 경로 (예: "body.heightCm", "actuators", "hand")
}

export interface ConflictRef {
  field: string;
  values: { value: unknown; url: string }[];
}

export interface RobotBodyInput {
  heightCm?: number | string | null;
  weightKg?: number | string | null;
  payloadKg?: number | string | null;
  dofCount?: number | string | null;
  maxSpeedMps?: number | string | null;
  operationTimeHours?: number | string | null;
  batteryWh?: number | string | null;
}

export interface RobotHandInput {
  handType?: string | null;
  fingerCount?: number | string | null;
  handDofPerHand?: number | string | null;
  gripForceN?: number | string | null;
  isInterchangeable?: boolean | null;
  tactile?: boolean | null;
}

export interface RobotActuatorInput {
  name?: string | null;
  vendor?: string | null;
  inHouse?: boolean | null;
  type?: string | null;
  usageLocation?: string | null;
  quantity?: number | string | null;
  peakTorqueNm?: number | string | null;
  ratedTorqueNm?: number | string | null;
  speedRpm?: number | string | null;
  weightKg?: number | string | null;
  gearRatio?: number | string | null;
  notes?: string | null;
}

export interface RobotPriceInput {
  min?: number | string | null;
  max?: number | string | null;
  currency?: string | null;
  note?: string | null;
}

export interface RobotInput {
  name: string;
  company: string;
  /** 조사 원문의 회사 표기 등 — 회사 매칭 후보로 함께 사용 */
  companyAliases?: string[] | null;
  aliases?: string[] | null;
  announcementYear?: number | null;
  announcementQuarter?: number | null;
  status?: string | null;
  purpose?: string | null;
  locomotionType?: string | null;
  handType?: string | null;
  commercializationStage?: string | null;
  region?: string | null;
  descriptionKo?: string | null;
  body?: RobotBodyInput | null;
  hand?: RobotHandInput | null;
  actuators?: RobotActuatorInput[] | null;
  price?: RobotPriceInput | null;
  sources?: SourceRef[] | null;
  conflicts?: ConflictRef[] | null;
  coverage?: unknown;
}

export interface RobotsFile {
  generatedAt?: string;
  method?: string;
  robots: RobotInput[];
}

export interface SupplierProductInput {
  vendor: string;
  vendorCountry?: string | null;
  model: string;
  series?: string | null;
  type?: string | null;
  peakTorqueNm?: number | string | null;
  continuousTorqueNm?: number | string | null;
  ratedSpeedRpm?: number | string | null;
  maxSpeedRpm?: number | string | null;
  weightKg?: number | string | null;
  diameterMm?: number | string | null;
  lengthMm?: number | string | null;
  gearRatio?: number | string | null;
  voltageV?: number | string | null;
  ratedPowerW?: number | string | null;
  integrationLevel?: string | null;
  builtInSensors?: string[] | null;
  backdrivable?: boolean | null;
  communication?: string | null;
  priceUsd?: number | string | null;
  releaseDate?: string | null;
  targetMarket?: string | null;
  status?: string | null;
  sources?: SourceRef[] | null;
  conflicts?: ConflictRef[] | null;
  /** 스키마 외 추가 필드(priceCny, peakForceN, ratedTorqueNm, noLoadSpeedRpm …)는 스펙 jsonb 에 그대로 보존 */
  [extra: string]: unknown;
}

export interface SuppliersFile {
  generatedAt?: string;
  method?: string;
  products: SupplierProductInput[];
}

/** 입력 파일의 최소 형태 검증 — 실패 시 사람이 읽을 수 있는 메시지 반환 */
export function validateRobotsFile(data: unknown): string[] {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') return ['robots.json: 최상위가 객체가 아닙니다'];
  const robots = (data as { robots?: unknown }).robots;
  if (!Array.isArray(robots)) return ['robots.json: "robots" 배열이 없습니다'];
  robots.forEach((r, i) => {
    if (!r || typeof r !== 'object') { errors.push(`robots[${i}]: 객체가 아닙니다`); return; }
    const rr = r as Partial<RobotInput>;
    if (!rr.name || typeof rr.name !== 'string') errors.push(`robots[${i}]: name 누락`);
    if (!rr.company || typeof rr.company !== 'string') errors.push(`robots[${i}] (${rr.name ?? '?'}): company 누락`);
    if (rr.actuators != null && !Array.isArray(rr.actuators)) errors.push(`robots[${i}] (${rr.name ?? '?'}): actuators가 배열이 아닙니다`);
  });
  return errors;
}

export function validateSuppliersFile(data: unknown): string[] {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') return ['suppliers.json: 최상위가 객체가 아닙니다'];
  const products = (data as { products?: unknown }).products;
  if (!Array.isArray(products)) return ['suppliers.json: "products" 배열이 없습니다'];
  products.forEach((p, i) => {
    if (!p || typeof p !== 'object') { errors.push(`products[${i}]: 객체가 아닙니다`); return; }
    const pp = p as Partial<SupplierProductInput>;
    if (!pp.vendor || typeof pp.vendor !== 'string') errors.push(`products[${i}]: vendor 누락`);
    if (!pp.model || typeof pp.model !== 'string') errors.push(`products[${i}] (${pp.vendor ?? '?'}): model 누락`);
  });
  return errors;
}

// ============================================================
// 2. 신뢰도 규칙 (상수)
// ============================================================

export const CONFIDENCE_RANK: Record<Confidence, number> = { A: 5, B: 4, C: 3, D: 2, F: 1 };

/** 출처 신뢰도가 없을 때 가정하는 값 */
export const DEFAULT_CONFIDENCE: Confidence = 'D';

/** body_specs / hand_specs 의 기존(비-null) 값을 덮어쓰려면 필요한 최소 신뢰도 */
export const MIN_OVERWRITE_CONFIDENCE: Confidence = 'B';

export function normalizeConfidence(c: string | null | undefined): Confidence {
  const u = (c ?? '').trim().toUpperCase();
  if (u === 'E') return 'F'; // 일부 수집기는 A~E 척도를 쓴다 → 최하 등급으로 취급
  return (u in CONFIDENCE_RANK ? u : DEFAULT_CONFIDENCE) as Confidence;
}

export function confidenceRank(c: string | null | undefined): number {
  return CONFIDENCE_RANK[normalizeConfidence(c)];
}

/** c1 ≥ c2 ? */
export function isConfidenceAtLeast(c1: string | null | undefined, c2: string | null | undefined): boolean {
  return confidenceRank(c1) >= confidenceRank(c2);
}

/** 여러 신뢰도 중 최고 등급 */
export function maxConfidence(list: (string | null | undefined)[]): Confidence | null {
  let best: Confidence | null = null;
  for (const c of list) {
    if (c == null || c === '') continue;
    const n = normalizeConfidence(c);
    if (!best || CONFIDENCE_RANK[n] > CONFIDENCE_RANK[best]) best = n;
  }
  return best;
}

/**
 * 필드 경로에 대한 출처 신뢰도.
 *  - sources[].fields 에 경로 자체("body.heightCm") 또는 상위 경로("body")가 포함된 출처 중 최고 등급
 *  - 없으면 fields 미지정(=전체 적용) 출처 중 최고 등급
 *  - 그래도 없으면 DEFAULT_CONFIDENCE
 */
export function fieldConfidence(sources: SourceRef[] | null | undefined, fieldPath: string): Confidence {
  if (!sources || sources.length === 0) return DEFAULT_CONFIDENCE;
  const specific = sources.filter((s) => s.fields && s.fields.some((f) => fieldCovers(f, fieldPath)));
  const fromSpecific = maxConfidence(specific.map((s) => s.confidence));
  if (fromSpecific) return fromSpecific;
  const generic = sources.filter((s) => !s.fields || s.fields.length === 0);
  return maxConfidence(generic.map((s) => s.confidence)) ?? DEFAULT_CONFIDENCE;
}

/** 필드 경로에 가장 적합한 출처 1건 (해당 필드를 뒷받침하는 출처 중 신뢰도 최고 → 없으면 전체 중 최고) */
export function bestSourceFor(sources: SourceRef[] | null | undefined, fieldPath: string): SourceRef | null {
  if (!sources || sources.length === 0) return null;
  const rank = (s: SourceRef) => confidenceRank(s.confidence);
  const specific = sources.filter((s) => s.fields && s.fields.some((f) => fieldCovers(f, fieldPath)));
  const pool = specific.length > 0 ? specific : sources.filter((s) => !s.fields || s.fields.length === 0);
  const final = pool.length > 0 ? pool : sources;
  return [...final].sort((a, b) => rank(b) - rank(a))[0] ?? null;
}

function fieldCovers(declared: string, wanted: string): boolean {
  const d = declared.trim();
  return d === wanted || wanted.startsWith(d + '.') || d === '*';
}

/**
 * body/hand 스펙 한 필드를 덮어쓸지 결정.
 *  - 신규 값이 null → 유지
 *  - 기존 값이 null → 채움
 *  - 둘 다 있고 같음 → 유지
 *  - 다름 → 신규 신뢰도 ≥ MIN_OVERWRITE_CONFIDENCE 일 때만 덮어쓰기
 */
export function shouldOverwriteSpec(
  existing: number | string | boolean | null | undefined,
  incoming: number | string | boolean | null | undefined,
  incomingConfidence: string | null | undefined,
): boolean {
  if (incoming === null || incoming === undefined) return false;
  if (existing === null || existing === undefined || existing === '') return true;
  if (valuesEqual(existing, incoming)) return false;
  return isConfidenceAtLeast(incomingConfidence, MIN_OVERWRITE_CONFIDENCE);
}

/**
 * CI 값 교체 규칙: 기존 신뢰도보다 낮으면 건너뜀(같거나 높으면 갱신).
 * 기존 값이 없으면 항상 기록.
 */
export function shouldReplaceCiValue(
  existingConfidence: string | null | undefined,
  incomingConfidence: string | null | undefined,
  existingValue?: string | null,
): boolean {
  if (existingValue === null || existingValue === undefined || existingValue === '') return true;
  return isConfidenceAtLeast(incomingConfidence, existingConfidence);
}

/** 숫자형(또는 decimal 문자열) 값 비교 — "173.00" 과 173 은 같다 */
export function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) return false;
  if (typeof a === 'boolean' || typeof b === 'boolean') return a === b;
  const na = typeof a === 'number' ? a : parseNumber(a);
  const nb = typeof b === 'number' ? b : parseNumber(b);
  if (na !== null && nb !== null && String(a).trim() !== '' && String(b).trim() !== '') {
    return Math.abs(na - nb) < 1e-6;
  }
  return String(a).trim() === String(b).trim();
}

// ============================================================
// 3. 숫자/단위 변환
// ============================================================

/** "48 Nm", "1,200", "9:1" 같은 문자열도 숫자로. 실패 시 null */
export function parseNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'boolean') return null;
  const s = String(v).trim().replace(/,/g, '');
  if (s === '') return null;
  const m = s.match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

export function parseInteger(v: unknown): number | null {
  const n = parseNumber(v);
  return n === null ? null : Math.round(n);
}

export function kmhToMps(kmh: number): number {
  return round(kmh / 3.6, 2);
}

export function gramsToKg(g: number): number {
  return round(g / 1000, 3);
}

export function minutesToHours(min: number): number {
  return round(min / 60, 2);
}

export function round(n: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

/**
 * drizzle decimal 컬럼은 문자열을 받는다. precision/scale 범위를 넘으면 null (DB 오류 방지).
 * @param scale 소수 자릿수
 * @param maxAbs 허용 최대 절대값 (precision - scale 자리)
 */
export function toDecimalString(v: unknown, scale: number, maxAbs: number): string | null {
  const n = parseNumber(v);
  if (n === null) return null;
  if (Math.abs(n) >= maxAbs) return null;
  return n.toFixed(scale);
}

/** 감속비를 "N:1" 문자열과 숫자로 정규화. "9", 9, "9:1", "1:9" → { text: "9:1", ratio: 9 } */
export function normalizeGearRatio(v: unknown): { text: string; ratio: number } | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? { text: `${trimNum(v)}:1`, ratio: v } : null;
  const s = String(v).trim();
  const m = s.match(/^(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a <= 0 || b <= 0) return null;
    const ratio = a >= b ? a / b : b / a;
    return { text: `${trimNum(round(ratio, 2))}:1`, ratio: round(ratio, 4) };
  }
  const n = parseNumber(s);
  if (n === null || n <= 0) return null;
  return { text: `${trimNum(n)}:1`, ratio: n };
}

function trimNum(n: number): string {
  return Number.isInteger(n) ? String(n) : String(round(n, 2));
}

// ============================================================
// 4. 이름 정규화 / 매칭
// ============================================================

/** 로봇/제품명 정규화: 소문자, 악센트 제거, 영숫자·한글·한자만 남김(공백 포함 제거) */
export function normalizeName(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^0-9a-zㄱ-ㆎ가-힣一-鿿぀-ヿ]+/g, '');
}

const COMPANY_LEGAL_SUFFIXES = /\b(inc|incorporated|co|company|corp|corporation|ltd|limited|llc|gmbh|ag|sa|plc|pte|kk|oy|ab|bv|nv|srl|spa|technologies|technology|tech)\b\.?/g;
/** 느슨한 비교에서 추가로 제거하는 일반 명사 */
const COMPANY_GENERIC_WORDS = /\b(robotics|robotic|robot|robots|intelligence|dynamics|electronics|motor|motors|group|holdings|international)\b/g;

/** 회사명 정규화: 괄호 내용·법인 접미사 제거 후 normalizeName */
export function normalizeCompanyName(s: string | null | undefined): string {
  if (!s) return '';
  const base = s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[,.]/g, ' ')
    .replace(COMPANY_LEGAL_SUFFIXES, ' ');
  return normalizeName(base);
}

/** 느슨한 회사명 키 (robotics/dynamics 등 일반어 제거). 결과가 3자 미만이면 엄격 키 그대로 사용 */
export function looseCompanyKey(s: string | null | undefined): string {
  if (!s) return '';
  const strict = normalizeCompanyName(s);
  const loose = normalizeName(
    s
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/\([^)]*\)/g, ' ')
      .replace(/[,.]/g, ' ')
      .replace(COMPANY_LEGAL_SUFFIXES, ' ')
      .replace(COMPANY_GENERIC_WORDS, ' '),
  );
  return loose.length >= 3 ? loose : strict;
}

/**
 * 알려진 회사 별칭 → DB 표준명 (companies.name). 키는 normalizeCompanyName 결과.
 * 실제 JSON에서 자주 등장하는 표기만 수록; 매칭 실패 시 경고로 수집되므로 여기에 추가하면 된다.
 */
export const COMPANY_ALIASES: Record<string, string> = {
  tesla: 'Tesla',
  teslaai: 'Tesla',
  unitree: 'Unitree Robotics',
  unitreerobotics: 'Unitree Robotics',
  agility: 'Agility Robotics',
  agilityrobotics: 'Agility Robotics',
  figure: 'Figure AI',
  figureai: 'Figure AI',
  '1x': '1X Technologies',
  '1xtechnologies': '1X Technologies',
  bostondynamics: 'Boston Dynamics',
  bd: 'Boston Dynamics',
  apptronik: 'Apptronik',
  agibot: 'Agibot',
  zhiyuan: 'Agibot',
  fourier: 'Fourier Intelligence',
  fourierintelligence: 'Fourier Intelligence',
  ubtech: 'UBTECH',
  ubtechrobotics: 'UBTECH',
  lg: 'LG Electronics',
  lgelectronics: 'LG Electronics',
  samsung: 'Samsung Electronics',
  samsungelectronics: 'Samsung Electronics',
  hyundai: 'Hyundai Motor Group',
  hyundaimotor: 'Hyundai Motor Group',
  hyundaimotorgroup: 'Hyundai Motor Group',
  rainbow: 'Rainbow Robotics',
  rainbowrobotics: 'Rainbow Robotics',
  rainbowroboticskaist: 'Rainbow Robotics',
  kepler: 'Kepler Robot',
  keplerrobot: 'Kepler Robot',
  keplerrobotics: 'Kepler Robot',
  mentee: 'Mentee Robotics',
  menteerobotics: 'Mentee Robotics',
  menteeroboticsmobileye: 'Mentee Robotics',
  aeolus: 'Aeolus Robotics',
  aeolusrobotics: 'Aeolus Robotics',
  savioke: 'Savioke',
  relayrobotics: 'Savioke',
  relayroboticsformerlysavioke: 'Savioke',
  neura: 'NEURA Robotics',
  neurarobotics: 'NEURA Robotics',
  limx: 'LimX Dynamics',
  limxdynamics: 'LimX Dynamics',
  sanctuary: 'Sanctuary AI',
  sanctuaryai: 'Sanctuary AI',
  pal: 'PAL Robotics',
  palrobotics: 'PAL Robotics',
  softbank: 'SoftBank Robotics',
  softbankrobotics: 'SoftBank Robotics',
  diligent: 'Diligent Robotics',
  diligentrobotics: 'Diligent Robotics',
  engineeredarts: 'Engineered Arts',
  honda: 'Honda',
  hondamotor: 'Honda',
  toyota: 'Toyota',
  toyotamotor: 'Toyota',
  toyotaresearchinstitute: 'Toyota',
  tmotor: 'T-Motor',
  cubemars: 'T-Motor',
  harmonicdrive: 'Harmonic Drive',
  harmonicdrivesystems: 'Harmonic Drive',
  maxon: 'Maxon Motor',
  maxonmotor: 'Maxon Motor',
  faulhaber: 'Faulhaber',
  nabtesco: 'Nabtesco',
  gyems: 'Gyems',
  myactuator: 'Gyems',
  robstride: 'RobStride',
  xiaomi: 'Xiaomi',
};

export interface NamedRow {
  id: string;
  name: string;
}

export type MatchStrategy = 'exact' | 'alias' | 'loose';

export interface NameMatch<T extends NamedRow> {
  row: T;
  strategy: MatchStrategy;
}

/**
 * 회사 매칭: 입력명(및 companyAliases)마다 정확 정규화 → 별칭표 → 느슨한 키(유일할 때만) 순으로 시도.
 * 더 강한 전략이 어느 후보명에서든 성립하면 그것을 우선한다.
 */
export function matchCompany<T extends NamedRow>(rows: T[], inputName: string, extraNames: (string | null | undefined)[] = []): NameMatch<T> | null {
  const names = [inputName, ...extraNames].filter((s): s is string => !!s && s.trim() !== '');
  for (const n of names) {
    const key = normalizeCompanyName(n);
    if (!key) continue;
    const exact = rows.find((r) => normalizeCompanyName(r.name) === key);
    if (exact) return { row: exact, strategy: 'exact' };
  }
  for (const n of names) {
    const canonical = COMPANY_ALIASES[normalizeCompanyName(n)];
    if (!canonical) continue;
    const ck = normalizeCompanyName(canonical);
    const viaAlias = rows.find((r) => normalizeCompanyName(r.name) === ck);
    if (viaAlias) return { row: viaAlias, strategy: 'alias' };
  }
  for (const n of names) {
    const loose = looseCompanyKey(n);
    if (!loose) continue;
    const looseHits = rows.filter((r) => looseCompanyKey(r.name) === loose);
    if (looseHits.length === 1) return { row: looseHits[0]!, strategy: 'loose' };
  }
  return null;
}

/** ISO 3166-1 alpha-2 (및 흔한 alpha-3) → companies.country 표기 */
const COUNTRY_BY_CODE: Record<string, string> = {
  US: 'USA', USA: 'USA', CN: 'China', CHN: 'China', JP: 'Japan', JPN: 'Japan', KR: 'Korea', KOR: 'Korea',
  DE: 'Germany', DEU: 'Germany', CH: 'Switzerland', CHE: 'Switzerland', TW: 'Taiwan', TWN: 'Taiwan',
  NO: 'Norway', NOR: 'Norway', IL: 'Israel', ISR: 'Israel', GB: 'UK', UK: 'UK', GBR: 'UK', FR: 'France', FRA: 'France',
  CA: 'Canada', CAN: 'Canada', ES: 'Spain', ESP: 'Spain', SG: 'Singapore', SGP: 'Singapore', IT: 'Italy', ITA: 'Italy',
  NL: 'Netherlands', NLD: 'Netherlands', SE: 'Sweden', SWE: 'Sweden', DK: 'Denmark', DNK: 'Denmark', AT: 'Austria', AUT: 'Austria',
  IN: 'India', IND: 'India', AU: 'Australia', AUS: 'Australia', HK: 'Hong Kong', HKG: 'Hong Kong',
};

export function normalizeCountry(v: string | null | undefined, fallback = 'Unknown'): string {
  const s = (v ?? '').trim();
  if (!s) return fallback;
  return COUNTRY_BY_CODE[s.toUpperCase()] ?? s;
}

/** 신규 humanoid_robots 행을 만들기 위해 반드시 있어야 하는 메타 필드 */
export const REQUIRED_NEW_ROBOT_FIELDS = ['announcementYear', 'status', 'purpose', 'locomotionType', 'commercializationStage', 'region'] as const;

export function missingNewRobotFields(robot: RobotInput): string[] {
  return REQUIRED_NEW_ROBOT_FIELDS.filter((f) => {
    const v = robot[f];
    return v === null || v === undefined || v === '';
  });
}

/** 같은 회사인지 (입력 두 문자열 기준) */
export function sameCompany(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const ka = normalizeCompanyName(a);
  const kb = normalizeCompanyName(b);
  if (ka && ka === kb) return true;
  const ca = COMPANY_ALIASES[ka] ? normalizeCompanyName(COMPANY_ALIASES[ka]) : ka;
  const cb = COMPANY_ALIASES[kb] ? normalizeCompanyName(COMPANY_ALIASES[kb]) : kb;
  if (ca && ca === cb) return true;
  const la = looseCompanyKey(a);
  const lb = looseCompanyKey(b);
  return la.length >= 3 && la === lb;
}

/** 로봇 후보명 집합: name + aliases + "회사 name" 조합 */
export function robotNameCandidates(robot: Pick<RobotInput, 'name' | 'aliases' | 'company'>): string[] {
  const out = new Set<string>();
  const add = (s: string | null | undefined) => { const k = normalizeName(s); if (k) out.add(k); };
  add(robot.name);
  for (const a of robot.aliases ?? []) add(a);
  add(`${robot.company} ${robot.name}`);
  const shortCo = looseCompanyKey(robot.company);
  if (shortCo) out.add(shortCo + normalizeName(robot.name));
  return [...out];
}

/**
 * 로봇 매칭 — 반드시 같은 회사(companyId) 안에서만 name/aliases 를 비교한다.
 * (전역 이름 매칭을 쓰면 Unitree 'G1' 이 Agibot 'Genie G1' 의 별칭 'AgiBot G1' 등과 충돌한다.)
 * 정확한 name 일치 > alias 일치. companyId 가 없으면 매칭하지 않는다.
 */
export function matchRobot<T extends NamedRow & { companyId: string }>(
  rows: T[],
  robot: Pick<RobotInput, 'name' | 'aliases' | 'company'>,
  companyId: string | null,
): NameMatch<T> | null {
  if (!companyId) return null;
  const cands = new Set(robotNameCandidates(robot));
  const inCompany = rows.filter((r) => r.companyId === companyId && cands.has(normalizeName(r.name)));
  const exactName = inCompany.find((r) => normalizeName(r.name) === normalizeName(robot.name));
  if (exactName) return { row: exactName, strategy: 'exact' };
  if (inCompany.length >= 1) return { row: inCompany[0]!, strategy: 'alias' };
  return null;
}

/** 여러 후보명 중 하나와 정규화 일치하는 행 (components / products 용) */
export function matchByNames<T extends NamedRow>(rows: T[], candidates: string[]): T | null {
  const keys = new Set(candidates.map(normalizeName).filter(Boolean));
  for (const r of rows) if (keys.has(normalizeName(r.name))) return r;
  return null;
}

// ============================================================
// 5. CI 경쟁사 매핑
// ============================================================

export interface CompetitorRow {
  id: string;
  slug: string;
  name: string;
  manufacturer: string;
}

/**
 * 회사(정규화 키) → 알려진 ci_competitors slug 후보. 운영 DB에는 시드 외 slug가 추가돼 있을 수
 * 있으므로(예: 'unitree', 'apptronik', 'agibot-a3') 동적 매칭을 보조하는 용도.
 */
export const KNOWN_COMPETITOR_SLUGS: Record<string, string[]> = {
  tesla: ['optimus'],
  agilityrobotics: ['digit'],
  figureai: ['figure'],
  '1x': ['neo'],
  bostondynamics: ['atlas'],
  lgelectronics: ['cloid'],
  unitreerobotics: ['unitree-g1', 'unitree'],
  apptronik: ['apollo', 'apptronik'],
  agibot: ['agibot', 'agibot-a3'],
};

/** 'name'(제품명 일치) > 'family'(같은 회사 + 제품군 토큰 일치) */
export type CompetitorMatchStrategy = 'name' | 'family';
export const COMPETITOR_STRATEGY_RANK: Record<CompetitorMatchStrategy, number> = { name: 2, family: 1 };

export interface CompetitorMatch {
  competitor: CompetitorRow;
  strategy: CompetitorMatchStrategy;
}

/** "Optimus Gen 2" → ["optimus","gen","2"], "G1/H1" → ["g1","h1"], "Atlas (Electric)" → ["atlas"] */
export function nameTokens(name: string): string[] {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .split(/[\s/\-_,]+/)
    .map((t) => t.replace(/[^0-9a-z가-힣]/g, ''))
    .filter(Boolean);
}

/** "Optimus Gen 2" → "optimus", "Figure 02" → "figure", "G1-D" → "g1" */
export function familyToken(name: string): string {
  return nameTokens(name)[0] ?? '';
}

/**
 * 로봇 → ci_competitors 매핑.
 *  1) 경쟁사 name(또는 "G1/H1" 처럼 '/'로 나뉜 각 부분)이 로봇 name/aliases 와 정규화 일치 → 'name'
 *  2) 아니면 manufacturer 가 같은 회사이거나 slug 가 KNOWN_COMPETITOR_SLUGS 에 있는 경쟁사 중,
 *     로봇명의 제품군 토큰(첫 토큰)이 경쟁사 name 토큰에 포함되는 것 → 'family'
 *     (예: 'Optimus V3' → 'Optimus Gen 2', 'Figure 03' → 'Figure 02', 'G1-D' → 'Unitree G1';
 *      'H2' 는 'Unitree G1' 과 토큰이 겹치지 않아 매핑되지 않는다)
 *  같은 경쟁사에 여러 로봇이 매핑되면 호출 측(스크립트)이 strategy 등급이 높은 로봇만 남기고,
 *  동급이면 발표 시점이 최신인 로봇을 마지막에 기록한다.
 */
export function matchCompetitors(
  competitors: CompetitorRow[],
  robot: Pick<RobotInput, 'name' | 'aliases' | 'company' | 'companyAliases'>,
  canonicalCompany?: string | null,
): CompetitorMatch[] {
  const cands = new Set(robotNameCandidates(robot));
  const companyNames = [canonicalCompany, robot.company, ...(robot.companyAliases ?? [])].filter((s): s is string => !!s);

  const nameMatches = competitors.filter((c) => {
    const parts = [c.name, ...c.name.split('/')];
    return parts.some((p) => cands.has(normalizeName(p)));
  });
  if (nameMatches.length > 0) return nameMatches.map((c) => ({ competitor: c, strategy: 'name' as const }));

  const knownSlugs = new Set(companyNames.flatMap((n) => KNOWN_COMPETITOR_SLUGS[normalizeCompanyName(n)] ?? []));
  const byCompany = competitors.filter(
    (c) => knownSlugs.has(c.slug) || companyNames.some((n) => sameCompany(c.manufacturer, n)),
  );
  const fam = familyToken(robot.name);
  if (!fam) return [];
  const famHits = byCompany.filter((c) => nameTokens(c.name).includes(fam));
  return famHits.map((c) => ({ competitor: c, strategy: 'family' as const }));
}

// ============================================================
// 6. 액추에이터 타입 / 라벨
// ============================================================

const ACTUATOR_TYPE_SYNONYMS: Record<string, ActuatorType> = {
  directdrive: 'direct_drive',
  dd: 'direct_drive',
  qdd: 'qdd',
  quasidirectdrive: 'qdd',
  quasidirect: 'qdd',
  harmonic: 'harmonic',
  harmonicdrive: 'harmonic',
  strainwave: 'harmonic',
  cycloidal: 'cycloidal',
  cycloid: 'cycloidal',
  rv: 'cycloidal',
  planetary: 'planetary',
  planetarygear: 'planetary',
  planetarygearbox: 'planetary',
  bldcgearbox: 'bldc_gearbox',
  bldc: 'bldc_gearbox',
  geared: 'bldc_gearbox',
  linearscrew: 'linear_screw',
  linear: 'linear_screw',
  ballscrew: 'linear_screw',
  rollerscrew: 'linear_screw',
  planetaryrollerscrew: 'linear_screw',
  tendon: 'tendon',
  cabledriven: 'tendon',
  hydraulic: 'hydraulic',
  serieselastic: 'series_elastic',
  sea: 'series_elastic',
  servo: 'servo',
  smartservo: 'servo',
  unknown: 'unknown',
};

export function normalizeActuatorType(t: string | null | undefined): ActuatorType {
  if (!t) return 'unknown';
  const key = normalizeName(t);
  if (!key) return 'unknown';
  if ((ACTUATOR_TYPES as readonly string[]).includes(t.trim().toLowerCase())) return t.trim().toLowerCase() as ActuatorType;
  return ACTUATOR_TYPE_SYNONYMS[key] ?? 'unknown';
}

export const ACTUATOR_TYPE_LABEL_KO: Record<ActuatorType, string> = {
  direct_drive: '직접구동(DD)',
  qdd: 'QDD(준직접구동)',
  harmonic: '하모닉 감속기',
  cycloidal: '사이클로이드 감속기',
  planetary: '유성 감속기',
  bldc_gearbox: 'BLDC+기어박스',
  linear_screw: '리니어(스크류)',
  tendon: '텐던(케이블) 구동',
  hydraulic: '유압',
  series_elastic: '직렬 탄성(SEA)',
  servo: '서보',
  unknown: '미공개',
};

/** 감속기를 포함하는 타입 (CI '감속기 타입' 항목용) */
export const REDUCER_TYPES: ReadonlySet<ActuatorType> = new Set<ActuatorType>([
  'harmonic', 'cycloidal', 'planetary', 'bldc_gearbox', 'qdd', 'linear_screw',
]);

export const USAGE_LOCATION_LABEL_KO: Record<string, string> = {
  head: '머리', neck: '목', torso: '몸통', waist: '허리', arm: '팔', shoulder: '어깨', elbow: '팔꿈치',
  wrist: '손목', hand: '손', finger: '손가락', leg: '다리', hip: '고관절', knee: '무릎', ankle: '발목', foot: '발',
  all: '전신', body: '전신', joints: '관절', limbs: '사지', upper_body: '상체', lower_body: '하체',
};

export function regionToCountry(region: string | null | undefined): string {
  switch ((region ?? '').toLowerCase()) {
    case 'north_america': return 'USA';
    case 'europe': return 'Europe';
    case 'china': return 'China';
    case 'japan': return 'Japan';
    case 'korea': return 'Korea';
    default: return 'Unknown';
  }
}

// ============================================================
// 7. JSON → 행 변환
// ============================================================

/** humanoid_robots 컬럼 중 입력에서 채울 수 있는 것 */
export interface RobotRowPatch {
  announcementYear?: number;
  announcementQuarter?: number;
  status?: string;
  purpose?: string;
  locomotionType?: string;
  handType?: string;
  commercializationStage?: string;
  region?: string;
  description?: string;
}

export function robotToRowPatch(robot: RobotInput): RobotRowPatch {
  const out: RobotRowPatch = {};
  const y = parseInteger(robot.announcementYear);
  if (y !== null) out.announcementYear = y;
  const q = parseInteger(robot.announcementQuarter);
  if (q !== null && q >= 1 && q <= 4) out.announcementQuarter = q;
  if (robot.status) out.status = robot.status;
  if (robot.purpose) out.purpose = robot.purpose;
  if (robot.locomotionType) out.locomotionType = robot.locomotionType;
  if (robot.handType) out.handType = robot.handType;
  else if (robot.hand?.handType) out.handType = robot.hand.handType;
  if (robot.commercializationStage) out.commercializationStage = robot.commercializationStage;
  if (robot.region) out.region = robot.region;
  if (robot.descriptionKo && robot.descriptionKo.trim()) out.description = robot.descriptionKo.trim();
  return out;
}

/**
 * 기존 행 vs 패치 → 실제 변경할 필드만. null/undefined 는 쓰지 않고, description 은 기존이 비어있을 때만.
 */
export function diffRobotRow(
  existing: Record<string, unknown>,
  patch: RobotRowPatch,
): Partial<RobotRowPatch> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined || v === '') continue;
    if (k === 'description') {
      const cur = existing.description;
      if (cur === null || cur === undefined || String(cur).trim() === '') out[k] = v;
      continue;
    }
    if (!valuesEqual(existing[k], v)) out[k] = v;
  }
  return out as Partial<RobotRowPatch>;
}

/** body_specs 행(decimal → 문자열). 범위 초과값은 null */
export interface BodySpecRow {
  heightCm: string | null;
  weightKg: string | null;
  payloadKg: string | null;
  dofCount: number | null;
  maxSpeedMps: string | null;
  operationTimeHours: string | null;
}

export function bodyToRow(body: RobotBodyInput | null | undefined): BodySpecRow {
  const b = body ?? {};
  return {
    heightCm: toDecimalString(b.heightCm, 2, 10_000),
    weightKg: toDecimalString(b.weightKg, 2, 10_000),
    payloadKg: toDecimalString(b.payloadKg, 2, 10_000),
    dofCount: parseInteger(b.dofCount),
    maxSpeedMps: toDecimalString(b.maxSpeedMps, 2, 100),
    operationTimeHours: toDecimalString(b.operationTimeHours, 2, 100),
  };
}

export interface HandSpecRow {
  handType: string | null;
  fingerCount: number | null;
  handDof: number | null;
  gripForceN: string | null;
  isInterchangeable: boolean | null;
}

export function handToRow(hand: RobotHandInput | null | undefined, fallbackHandType?: string | null): HandSpecRow {
  const h = hand ?? {};
  return {
    handType: h.handType ?? fallbackHandType ?? null,
    fingerCount: parseInteger(h.fingerCount),
    handDof: parseInteger(h.handDofPerHand),
    gripForceN: toDecimalString(h.gripForceN, 2, 10_000),
    isInterchangeable: typeof h.isInterchangeable === 'boolean' ? h.isInterchangeable : null,
  };
}

/**
 * 스펙 행 패치: 각 필드에 shouldOverwriteSpec 적용. existing 이 null 이면(행 없음) 비-null 값 전부.
 * @returns 변경할 필드만 담은 객체 (빈 객체 = 변경 없음)
 */
export function diffSpecRow<T extends object>(
  existing: Record<string, unknown> | null,
  incoming: T,
  confidenceOf: (field: string) => Confidence,
): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(incoming as Record<string, unknown>)) {
    if (v === null || v === undefined) continue;
    if (!existing) { out[k] = v; continue; }
    if (shouldOverwriteSpec(existing[k] as never, v as never, confidenceOf(k))) out[k] = v;
  }
  return out as Partial<T>;
}

/** 로봇 액추에이터 → components 행 */
export interface ComponentRow {
  type: 'actuator';
  name: string;
  vendor: string | null;
  specifications: Record<string, string | number | boolean | string[]>;
}

export function actuatorComponentName(act: RobotActuatorInput, companyName: string): string {
  const n = (act.name ?? '').trim();
  if (n) return n;
  const t = normalizeActuatorType(act.type);
  return `${companyName} ${t === 'unknown' ? '' : t.replace('_', ' ') + ' '}actuator`.replace(/\s+/g, ' ').trim();
}

export function actuatorToComponentRow(
  act: RobotActuatorInput,
  robot: RobotInput,
  canonicalCompany: string,
): ComponentRow {
  const type = normalizeActuatorType(act.type);
  const gear = normalizeGearRatio(act.gearRatio);
  const inHouse = act.inHouse === true || (act.inHouse == null && !act.vendor);
  const vendor = (act.vendor && act.vendor.trim()) || (inHouse ? canonicalCompany : null);
  const specs: ComponentRow['specifications'] = { actuatorType: type, inHouse };
  const rated = parseNumber(act.ratedTorqueNm);
  const peak = parseNumber(act.peakTorqueNm);
  const rpm = parseNumber(act.speedRpm);
  const w = parseNumber(act.weightKg);
  if (rated !== null) specs.ratedTorqueNm = rated;
  if (peak !== null) specs.maxTorqueNm = peak;
  if (rpm !== null) specs.speedRpm = rpm;
  if (w !== null) specs.weightKg = w;
  if (gear) { specs.gearRatio = gear.text; specs.gearRatioValue = gear.ratio; }
  specs.integrationLevel = inHouse ? 'fully_integrated' : 'motor_gear_driver';
  // usageLocation/quantity 는 로봇별 속성 → robot_components 에만 기록 (같은 부품을 여러 로봇이 공유할 수 있음)
  if (act.notes) specs.notes = act.notes;
  const src = bestSourceFor(robot.sources, 'actuators');
  if (src?.url) specs.sourceUrl = src.url;
  specs.confidence = fieldConfidence(robot.sources, 'actuators');
  return { type: 'actuator', name: actuatorComponentName(act, canonicalCompany), vendor, specifications: specs };
}

/** 공급사 제품 → components 행 (type 'actuator'). 이름은 "Vendor Model" (vendor 는 DB 표준 회사명 우선) */
export function supplierComponentName(p: SupplierProductInput, canonicalVendor?: string | null): string {
  const vendor = (canonicalVendor ?? p.vendor).trim();
  const model = p.model.trim();
  const keys = [looseCompanyKey(vendor), looseCompanyKey(p.vendor)].filter(Boolean);
  if (keys.some((k) => normalizeName(model).startsWith(k))) return model;
  return `${vendor} ${model}`;
}

/** 스키마에 정의된 공급사 필드 — 이 외의 스칼라 필드는 스펙 jsonb 에 그대로 전달한다 */
const SUPPLIER_KNOWN_KEYS = new Set([
  'vendor', 'vendorCountry', 'model', 'series', 'type', 'peakTorqueNm', 'continuousTorqueNm', 'ratedSpeedRpm', 'maxSpeedRpm',
  'weightKg', 'diameterMm', 'lengthMm', 'gearRatio', 'voltageV', 'ratedPowerW', 'integrationLevel', 'builtInSensors',
  'backdrivable', 'communication', 'priceUsd', 'releaseDate', 'targetMarket', 'status', 'sources', 'conflicts',
]);

export function supplierToComponentRow(p: SupplierProductInput, canonicalVendor?: string | null): ComponentRow {
  const type = normalizeActuatorType(p.type);
  const gear = normalizeGearRatio(p.gearRatio);
  const specs: ComponentRow['specifications'] = { actuatorType: type, inHouse: false };
  for (const [k, v] of Object.entries(p)) {
    if (SUPPLIER_KNOWN_KEYS.has(k)) continue;
    if (typeof v === 'number' || typeof v === 'boolean' || (typeof v === 'string' && v.trim() !== '')) specs[k] = v;
  }
  const cont = parseNumber(p.continuousTorqueNm);
  const peak = parseNumber(p.peakTorqueNm);
  const rpm = parseNumber(p.maxSpeedRpm) ?? parseNumber(p.ratedSpeedRpm);
  const ratedRpm = parseNumber(p.ratedSpeedRpm);
  const w = parseNumber(p.weightKg);
  const d = parseNumber(p.diameterMm);
  const l = parseNumber(p.lengthMm);
  const v = parseNumber(p.voltageV);
  const pw = parseNumber(p.ratedPowerW);
  const price = parseNumber(p.priceUsd);
  if (cont !== null) specs.ratedTorqueNm = cont;
  if (peak !== null) specs.maxTorqueNm = peak;
  if (rpm !== null) specs.speedRpm = rpm;
  if (ratedRpm !== null) specs.ratedSpeedRpm = ratedRpm;
  if (w !== null) specs.weightKg = w;
  if (d !== null) specs.diameterMm = d;
  if (l !== null) specs.lengthMm = l;
  if (v !== null) specs.voltageV = v;
  if (pw !== null) specs.ratedPowerW = pw;
  if (gear) { specs.gearRatio = gear.text; specs.gearRatioValue = gear.ratio; }
  if (p.integrationLevel) specs.integrationLevel = p.integrationLevel;
  if (p.builtInSensors && p.builtInSensors.length > 0) specs.builtInSensors = [...p.builtInSensors];
  if (typeof p.backdrivable === 'boolean') specs.backdrivable = p.backdrivable;
  if (p.communication) specs.communication = p.communication;
  if (price !== null) specs.priceUsd = price;
  if (p.vendorCountry) specs.vendorCountry = normalizeCountry(p.vendorCountry);
  if (p.releaseDate) specs.releaseDate = p.releaseDate;
  const src = bestSourceFor(p.sources, '*');
  if (src?.url) specs.sourceUrl = src.url;
  specs.confidence = fieldConfidence(p.sources, '*');
  return {
    type: 'actuator',
    name: supplierComponentName(p, canonicalVendor),
    vendor: (canonicalVendor ?? p.vendor).trim(),
    specifications: specs,
  };
}

/** 공급사 제품 → product_specs.dynamicSpecs (배열 불가 → 문자열 결합) */
export function supplierToDynamicSpecs(p: SupplierProductInput, canonicalVendor?: string | null): Record<string, string | number | boolean> {
  const c = supplierToComponentRow(p, canonicalVendor).specifications;
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(c)) {
    if (k === 'inHouse') continue;
    out[k] = Array.isArray(v) ? v.join(', ') : v;
  }
  // 기존 DynamicSpecs 필드명과 호환 (torqueNm / rpmMax)
  if (typeof c.maxTorqueNm === 'number') out.torqueNm = c.maxTorqueNm;
  if (typeof c.speedRpm === 'number') out.rpmMax = c.speedRpm;
  if (typeof c.ratedTorqueNm === 'number') out.continuousTorqueNm = c.ratedTorqueNm;
  if (typeof c.maxTorqueNm === 'number') out.peakTorqueNm = c.maxTorqueNm;
  return out;
}

/** 공급사 제품 → products 행 패치 (null 제외) */
export function supplierToProductPatch(p: SupplierProductInput): {
  series?: string; releaseDate?: string; targetMarket?: string; status?: string;
} {
  const out: { series?: string; releaseDate?: string; targetMarket?: string; status?: string } = {};
  if (p.series) out.series = p.series;
  const rd = normalizeReleaseDate(p.releaseDate);
  if (rd) out.releaseDate = rd;
  if (p.targetMarket) out.targetMarket = p.targetMarket;
  if (p.status) out.status = p.status;
  return out;
}

/** "2024" → 2024-01-01, "2023-08" → 2023-08-01, "2022-09 (AI Day disclosure)" → 2022-09-01, 그 외 → null */
export function normalizeReleaseDate(v: string | null | undefined): string | null {
  if (!v) return null;
  const m = v.trim().match(/^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = m[2] ? Number(m[2]) : 1;
  const d = m[3] ? Number(m[3]) : 1;
  if (y < 1900 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * jsonb 스펙 병합: 기존 키는 보존, 신규의 비-null 값만 덮어씀. 변경 여부 반환.
 */
export function mergeSpecs<T extends Record<string, unknown>>(
  existing: T | null | undefined,
  incoming: Record<string, unknown>,
): { merged: Record<string, unknown>; changed: boolean } {
  const merged: Record<string, unknown> = { ...(existing ?? {}) };
  let changed = false;
  for (const [k, v] of Object.entries(incoming)) {
    if (v === null || v === undefined) continue;
    if (!deepEqual(merged[k], v)) { merged[k] = v; changed = true; }
  }
  return { merged, changed };
}

/**
 * jsonb 스펙 보충: 기존에 없는(undefined/null) 키만 채운다. 기존 값은 절대 바꾸지 않는다.
 * 같은 부품을 여러 로봇/공급사 레코드가 가리킬 때, 신뢰도가 더 높지 않은 후속 기록이 쓰는 방식.
 */
export function fillMissingSpecs<T extends Record<string, unknown>>(
  existing: T | null | undefined,
  incoming: Record<string, unknown>,
): { merged: Record<string, unknown>; changed: boolean } {
  const merged: Record<string, unknown> = { ...(existing ?? {}) };
  let changed = false;
  for (const [k, v] of Object.entries(incoming)) {
    if (v === null || v === undefined) continue;
    if (merged[k] === null || merged[k] === undefined) { merged[k] = v; changed = true; }
  }
  return { merged, changed };
}

/**
 * 같은 부품(components 행)에 대한 쓰기 방식 결정.
 *  - 이 실행에서 처음 쓰는 경우: 신규 신뢰도 ≥ 저장된 신뢰도(없으면 최하) 이면 전체 병합(mergeSpecs), 아니면 보충(fill)
 *  - 이 실행에서 이미 쓴 경우: 신규 신뢰도가 이번 실행 최고 신뢰도보다 **엄격히** 높을 때만 전체 병합, 아니면 보충
 *  → 입력 순서가 같으면 결과가 결정적이며 재실행 시 변경이 0 이 된다.
 */
export function decideComponentWrite(
  storedConfidence: string | null | undefined,
  runBestConfidence: number | undefined,
  incomingConfidence: string | null | undefined,
): 'merge' | 'fill' {
  const incoming = confidenceRank(incomingConfidence);
  if (runBestConfidence === undefined) {
    const stored = storedConfidence ? confidenceRank(storedConfidence) : 0;
    return incoming >= stored ? 'merge' : 'fill';
  }
  return incoming > runBestConfidence ? 'merge' : 'fill';
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === 'number' || typeof b === 'number') return valuesEqual(a, b);
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a as object).sort();
    const kb = Object.keys(b as object).sort();
    if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) return false;
    return ka.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return false;
}

// ============================================================
// 8. CI 값 생성
// ============================================================

/** HW 레이어 '액추에이터' 카테고리에 보장할 항목 (기존 항목은 유지, 없는 것만 추가) */
export const CI_HW_LAYER_SLUG = 'hw';
export const CI_ACTUATOR_CATEGORY = '액추에이터';
export const CI_ACTUATOR_ITEMS = ['구동 방식', '관절 토크', '감속기 타입', '자체 생산 여부', '액추에이터 공급사', '액추에이터 수량'] as const;
/** 기존 항목이지만 입력에 손 정보가 있으면 함께 갱신 */
export const CI_HAND_DOF_ITEM = '손 자유도';
/** biz 레이어 '시장 진출' 카테고리의 가격 항목 — 존재할 때만 갱신 */
export const CI_PRICE_ITEM = '가격대';

export interface CiValueDraft {
  itemName: string;
  value: string;
  confidence: Confidence;
  source: string | null;
  sourceUrl: string | null;
  sourceDate: string | null;
}

function fmtNum(n: number): string {
  return Number.isInteger(n) ? String(n) : String(round(n, 1));
}

function sourceLabel(src: SourceRef | null): string | null {
  if (!src) return null;
  const parts = [src.publisher, src.title].filter((x): x is string => !!x && x.trim() !== '');
  if (parts.length === 0) return src.url || null;
  return parts.join(' — ');
}

function sourceDate(src: SourceRef | null): string | null {
  if (!src?.date) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(src.date) ? src.date : null;
}

export function formatPrice(price: RobotPriceInput | null | undefined): string | null {
  if (!price) return null;
  const min = parseNumber(price.min);
  const max = parseNumber(price.max);
  if (min === null && max === null) return price.note?.trim() || null;
  const cur = (price.currency ?? 'USD').toUpperCase();
  const sym = cur === 'USD' ? '$' : cur === 'KRW' ? '₩' : cur === 'CNY' || cur === 'RMB' ? '¥' : cur === 'EUR' ? '€' : `${cur} `;
  const f = (n: number) => {
    if (n >= 1_000_000) return `${sym}${trimNum(round(n / 1_000_000, 2))}M`;
    if (n >= 1_000) return `${sym}${trimNum(round(n / 1_000, 1))}K`;
    return `${sym}${trimNum(n)}`;
  };
  let core: string;
  if (min !== null && max !== null) core = min === max ? f(min) : `${f(min)}-${f(max)}`;
  else if (min !== null) core = `${f(min)}+`;
  else core = `~${f(max!)}`;
  return price.note?.trim() ? `${core} (${price.note.trim()})` : core;
}

/**
 * 로봇 1건 → CI 값 초안 목록. 입력에 근거가 없는 항목은 생성하지 않는다(기존 CI 값 보존).
 */
export function buildCiValuesForRobot(robot: RobotInput, canonicalCompany: string): CiValueDraft[] {
  const out: CiValueDraft[] = [];
  const acts = (robot.actuators ?? []).filter((a) => a && typeof a === 'object');
  const actSrc = bestSourceFor(robot.sources, 'actuators');
  const actConf = fieldConfidence(robot.sources, 'actuators');
  const base = (itemName: string, value: string, src: SourceRef | null, conf: Confidence): CiValueDraft => ({
    itemName, value, confidence: conf, source: sourceLabel(src), sourceUrl: src?.url ?? null, sourceDate: sourceDate(src),
  });

  if (acts.length > 0) {
    // 구동 방식
    const types = uniq(acts.map((a) => normalizeActuatorType(a.type)).filter((t) => t !== 'unknown'));
    if (types.length > 0) {
      const allInHouse = acts.every((a) => a.inHouse === true);
      const label = types.map((t) => ACTUATOR_TYPE_LABEL_KO[t]).join(' + ');
      out.push(base('구동 방식', allInHouse ? `${label} (자체 설계)` : label, actSrc, actConf));
    }

    // 관절 토크 — 피크 토크 최대 액추에이터 기준
    const withPeak = acts
      .map((a) => ({ a, peak: parseNumber(a.peakTorqueNm), rated: parseNumber(a.ratedTorqueNm) }))
      .filter((x) => x.peak !== null || x.rated !== null);
    if (withPeak.length > 0) {
      const top = [...withPeak].sort((x, y) => (y.peak ?? y.rated ?? 0) - (x.peak ?? x.rated ?? 0))[0]!;
      const segs: string[] = [];
      if (top.peak !== null) segs.push(`최대 ${fmtNum(top.peak)} Nm`);
      if (top.rated !== null) segs.push(`정격 ${fmtNum(top.rated)} Nm`);
      const where = top.a.usageLocation ? USAGE_LOCATION_LABEL_KO[top.a.usageLocation] ?? top.a.usageLocation : null;
      const who = top.a.name ? ` — ${top.a.name}` : '';
      out.push(base('관절 토크', `${segs.join(' / ')}${where ? ` (${where})` : ''}${who}`, actSrc, actConf));
    }

    // 감속기 타입
    const reducers = acts
      .map((a) => ({ t: normalizeActuatorType(a.type), g: normalizeGearRatio(a.gearRatio) }))
      .filter((x) => REDUCER_TYPES.has(x.t));
    if (reducers.length > 0) {
      const byType = new Map<ActuatorType, Set<string>>();
      for (const r of reducers) {
        if (!byType.has(r.t)) byType.set(r.t, new Set());
        if (r.g) byType.get(r.t)!.add(r.g.text);
      }
      const txt = [...byType.entries()]
        .map(([t, ratios]) => {
          const lbl = ACTUATOR_TYPE_LABEL_KO[t];
          return ratios.size > 0 ? `${lbl} (감속비 ${[...ratios].join(', ')})` : lbl;
        })
        .join(' + ');
      out.push(base('감속기 타입', txt, actSrc, actConf));
    } else if (acts.some((a) => normalizeActuatorType(a.type) === 'direct_drive')) {
      out.push(base('감속기 타입', '없음 (직접구동)', actSrc, actConf));
    }

    // 자체 생산 여부 / 공급사
    const declared = acts.filter((a) => a.inHouse !== null && a.inHouse !== undefined);
    const vendors = uniq(acts.map((a) => (a.vendor ?? '').trim()).filter((v) => v && !sameCompany(v, canonicalCompany)));
    if (declared.length > 0) {
      const inHouseCount = declared.filter((a) => a.inHouse === true).length;
      let txt: string;
      if (inHouseCount === declared.length) txt = '자체 개발/생산';
      else if (inHouseCount === 0) txt = vendors.length > 0 ? `외부 조달 (${vendors.join(', ')})` : '외부 조달';
      else txt = vendors.length > 0 ? `일부 자체 + 외주 (${vendors.join(', ')})` : '일부 자체 + 외주';
      out.push(base('자체 생산 여부', txt, actSrc, actConf));
    }
    if (vendors.length > 0) out.push(base('액추에이터 공급사', vendors.join(', '), actSrc, actConf));
    else if (declared.length > 0 && declared.every((a) => a.inHouse === true)) {
      out.push(base('액추에이터 공급사', `자체 (${canonicalCompany})`, actSrc, actConf));
    }

    // 수량
    const withQty = acts.map((a) => ({ a, q: parseInteger(a.quantity) })).filter((x) => x.q !== null && x.q! > 0);
    if (withQty.length > 0) {
      const total = withQty.reduce((s, x) => s + x.q!, 0);
      const byLoc = new Map<string, number>();
      for (const x of withQty) {
        const loc = x.a.usageLocation ? USAGE_LOCATION_LABEL_KO[x.a.usageLocation] ?? x.a.usageLocation : null;
        if (loc) byLoc.set(loc, (byLoc.get(loc) ?? 0) + x.q!);
      }
      const detail = byLoc.size > 0 ? ` (${[...byLoc.entries()].map(([l, n]) => `${l} ${n}`).join(', ')})` : '';
      out.push(base('액추에이터 수량', `총 ${total}개${detail}`, actSrc, actConf));
    }
  }

  // 손 자유도 (기존 항목)
  const hand = robot.hand;
  const handDof = parseInteger(hand?.handDofPerHand);
  if (handDof !== null) {
    const fingers = parseInteger(hand?.fingerCount);
    const extra: string[] = [];
    if (fingers !== null) extra.push(`${fingers}지`);
    if (hand?.tactile === true) extra.push('촉각 센서');
    const src = bestSourceFor(robot.sources, 'hand');
    out.push(base(CI_HAND_DOF_ITEM, `${handDof} DOF/손${extra.length ? ` (${extra.join(', ')})` : ''}`, src, fieldConfidence(robot.sources, 'hand')));
  }

  // 가격대 (항목이 존재할 때만 스크립트에서 반영)
  const priceTxt = formatPrice(robot.price);
  if (priceTxt) {
    const src = bestSourceFor(robot.sources, 'price');
    out.push(base(CI_PRICE_ITEM, priceTxt, src, fieldConfidence(robot.sources, 'price')));
  }

  return out;
}

function uniq<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

// ============================================================
// 9. 조달 태세 재판정 · 수요 사례 입력 (sourcing-regrade.json / demand-cases.json)
// ============================================================

export const SOURCING_KINDS = ['in_house_confirmed', 'in_house_presumed', 'external', 'mixed', 'unknown'] as const;
export type SourcingKind = (typeof SOURCING_KINDS)[number];

/** 수요 사례 세그먼트 (demand-cases.json cases[].segment) */
export const ADOPTION_SEGMENTS = [
  'humanoid_tier1',
  'humanoid_tier2',
  'research_platform',
  'service_robot',
  'quadruped',
  'exoskeleton',
  'robot_arm',
  'industrial',
] as const;
export type AdoptionSegment = (typeof ADOPTION_SEGMENTS)[number];

/** 공급사 시장 세그먼트 (vendorTargetMarkets[].segments, API MarketSegment) */
export const MARKET_SEGMENTS = ['tier1_oem', 'tier2_legged', 'research_edu', 'industrial_cobot', 'service', 'captive', 'other'] as const;
export type MarketSegment = (typeof MARKET_SEGMENTS)[number];

/** 공급 층: module = 통합 관절·모듈, component = 모터·감속기 등 부품 (없으면 module) */
export const SOURCING_LEVELS = ['module', 'component'] as const;
export type SourcingLevel = (typeof SOURCING_LEVELS)[number];

export const MAX_SOURCING_EVIDENCE = 20;

export interface SourcingEvidenceEntry {
  claim: string;
  source: string | null;
  url: string | null;
  grade: string | null;
  date: string | null;
}

export interface SourcingVendorEntry {
  vendor: string;
  role: string | null;
  grade: string | null;
  url: string | null;
  level: SourcingLevel;
}

/** 검증·정규화를 마친 sourcing-regrade.json 원소 */
export interface SourcingRobotEntry {
  name: string;
  company: string;
  aliases: string[];
  companyAliases: string[];
  sourcing: SourcingKind;
  sellsExternally: boolean | null;
  evidenceGrade: string | null;
  evidence: SourcingEvidenceEntry[];
  externalVendors: SourcingVendorEntry[];
  noteKo: string | null;
}

export interface SourcingFile {
  generatedAt?: string;
  method?: string;
  robots: SourcingRobotEntry[];
}

export interface AdoptionSourceItem {
  url: string;
  title: string | null;
  date: string | null;
}

/** 검증·정규화를 마친 demand-cases.json cases[] 원소 */
export interface AdoptionCaseEntry {
  robotName: string;
  company: string;
  country: string | null;
  segment: AdoptionSegment;
  level: SourcingLevel;
  robotClass: string | null;
  actuatorVendor: string;
  actuatorModel: string | null;
  usage: string | null;
  evidenceGrade: string | null;
  sources: AdoptionSourceItem[];
  noteKo: string | null;
  year: number | null;
}

export interface VendorMarketEntry {
  vendor: string;
  targetMarketsKo: string[];
  segments: MarketSegment[] | null;
  grade: string | null;
  url: string | null;
}

export interface AdoptionsFile {
  generatedAt?: string;
  method?: string;
  cases: AdoptionCaseEntry[];
  vendorTargetMarkets: VendorMarketEntry[];
}

/**
 * 검증 결과. errors 는 치명적(JSON 구조 자체 문제 — 호출 측이 throw), warnings 는 위반 원소를 건너뛴 기록.
 * errors 가 비어 있으면 file 은 위반 원소가 제거된 정규화 결과다.
 */
export interface FileValidation<T> {
  errors: string[];
  warnings: string[];
  file: T | null;
}

const nonEmptyStr = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.map(nonEmptyStr).filter((s): s is string => s !== null) : []);

/** evidence 정규화: 객체 원소 중 claim 문자열이 있는 것만, 필드는 문자열(아니면 null), 최대 20건 */
export function sanitizeSourcingEvidence(list: unknown): SourcingEvidenceEntry[] {
  if (!Array.isArray(list)) return [];
  const out: SourcingEvidenceEntry[] = [];
  for (const e of list) {
    if (!e || typeof e !== 'object') continue;
    const o = e as Record<string, unknown>;
    const claim = nonEmptyStr(o.claim);
    if (!claim) continue;
    out.push({ claim, source: strOrNull(o.source), url: strOrNull(o.url), grade: strOrNull(o.grade), date: strOrNull(o.date) });
    if (out.length >= MAX_SOURCING_EVIDENCE) break;
  }
  return out;
}

/** externalVendors 정규화: vendor 문자열이 있는 객체만. level 은 'component' 만 인정하고 나머지는 module */
export function sanitizeSourcingVendors(list: unknown): SourcingVendorEntry[] {
  if (!Array.isArray(list)) return [];
  const out: SourcingVendorEntry[] = [];
  for (const e of list) {
    if (!e || typeof e !== 'object') continue;
    const o = e as Record<string, unknown>;
    const vendor = nonEmptyStr(o.vendor);
    if (!vendor) continue;
    out.push({ vendor, role: strOrNull(o.role), grade: strOrNull(o.grade), url: strOrNull(o.url), level: o.level === 'component' ? 'component' : 'module' });
  }
  return out;
}

function topLevelObject(data: unknown, label: string): { obj: Record<string, unknown> | null; errors: string[] } {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { obj: null, errors: [`${label}: 최상위가 객체가 아닙니다`] };
  return { obj: data as Record<string, unknown>, errors: [] };
}

/** sourcing-regrade.json 검증·정규화 — 위반 원소는 경고 후 건너뜀, 최상위 구조 오류만 errors */
export function validateSourcingFile(data: unknown): FileValidation<SourcingFile> {
  const label = 'sourcing-regrade.json';
  const top = topLevelObject(data, label);
  if (!top.obj) return { errors: top.errors, warnings: [], file: null };
  const robots = top.obj.robots;
  if (!Array.isArray(robots)) return { errors: [`${label}: "robots" 배열이 없습니다`], warnings: [], file: null };
  const warnings: string[] = [];
  const out: SourcingRobotEntry[] = [];
  robots.forEach((r, i) => {
    if (!r || typeof r !== 'object') { warnings.push(`${label} robots[${i}]: 객체가 아니어서 건너뜀`); return; }
    const o = r as Record<string, unknown>;
    const name = nonEmptyStr(o.name);
    const company = nonEmptyStr(o.company);
    const tag = `${label} robots[${i}] (${name ?? '?'})`;
    if (!name) { warnings.push(`${tag}: name 누락 — 건너뜀`); return; }
    if (!company) { warnings.push(`${tag}: company 누락 — 건너뜀`); return; }
    if (typeof o.sourcing !== 'string' || !(SOURCING_KINDS as readonly string[]).includes(o.sourcing)) {
      warnings.push(`${tag}: sourcing 값이 올바르지 않음 (${JSON.stringify(o.sourcing)}; 허용 ${SOURCING_KINDS.join('|')}) — 건너뜀`);
      return;
    }
    if (o.sellsExternally !== undefined && o.sellsExternally !== null && typeof o.sellsExternally !== 'boolean') {
      warnings.push(`${tag}: sellsExternally 는 boolean 또는 null 이어야 함 — 건너뜀`);
      return;
    }
    if (o.evidence !== undefined && !Array.isArray(o.evidence)) { warnings.push(`${tag}: evidence 가 배열이 아님 — 건너뜀`); return; }
    if (o.externalVendors !== undefined && !Array.isArray(o.externalVendors)) { warnings.push(`${tag}: externalVendors 가 배열이 아님 — 건너뜀`); return; }
    out.push({
      name,
      company,
      aliases: strList(o.aliases),
      companyAliases: strList(o.companyAliases),
      sourcing: o.sourcing as SourcingKind,
      sellsExternally: typeof o.sellsExternally === 'boolean' ? o.sellsExternally : null,
      evidenceGrade: strOrNull(o.evidenceGrade)?.slice(0, 8) ?? null,
      evidence: sanitizeSourcingEvidence(o.evidence),
      externalVendors: sanitizeSourcingVendors(o.externalVendors),
      noteKo: strOrNull(o.noteKo),
    });
  });
  return {
    errors: [],
    warnings,
    file: { generatedAt: typeof top.obj.generatedAt === 'string' ? top.obj.generatedAt : undefined, method: typeof top.obj.method === 'string' ? top.obj.method : undefined, robots: out },
  };
}

/** sources 원소: 문자열(URL) 또는 {url, title?, source?, date?} — 기사/출처명은 title 로 매핑 */
export function sanitizeAdoptionSources(list: unknown): AdoptionSourceItem[] {
  if (!Array.isArray(list)) return [];
  const out: AdoptionSourceItem[] = [];
  for (const s of list) {
    if (typeof s === 'string') {
      const url = nonEmptyStr(s);
      if (url) out.push({ url, title: null, date: null });
    } else if (s && typeof s === 'object') {
      const o = s as Record<string, unknown>;
      const url = nonEmptyStr(o.url);
      if (url) out.push({ url, title: strOrNull(o.title) ?? strOrNull(o.source), date: strOrNull(o.date) });
    }
  }
  return out;
}

/** demand-cases.json 검증·정규화 — 위반 원소는 경고 후 건너뜀, 최상위 구조 오류만 errors */
export function validateAdoptionsFile(data: unknown): FileValidation<AdoptionsFile> {
  const label = 'demand-cases.json';
  const top = topLevelObject(data, label);
  if (!top.obj) return { errors: top.errors, warnings: [], file: null };
  const cases = top.obj.cases;
  if (!Array.isArray(cases)) return { errors: [`${label}: "cases" 배열이 없습니다`], warnings: [], file: null };
  const vtm = top.obj.vendorTargetMarkets;
  if (vtm !== undefined && !Array.isArray(vtm)) return { errors: [`${label}: "vendorTargetMarkets" 가 배열이 아닙니다`], warnings: [], file: null };

  const warnings: string[] = [];
  const outCases: AdoptionCaseEntry[] = [];
  cases.forEach((c, i) => {
    if (!c || typeof c !== 'object') { warnings.push(`${label} cases[${i}]: 객체가 아니어서 건너뜀`); return; }
    const o = c as Record<string, unknown>;
    const robotName = nonEmptyStr(o.robotName);
    const company = nonEmptyStr(o.company);
    const actuatorVendor = nonEmptyStr(o.actuatorVendor);
    const tag = `${label} cases[${i}] (${robotName ?? '?'})`;
    if (!robotName) { warnings.push(`${tag}: robotName 누락 — 건너뜀`); return; }
    if (!company) { warnings.push(`${tag}: company 누락 — 건너뜀`); return; }
    if (!actuatorVendor) { warnings.push(`${tag}: actuatorVendor 누락 — 건너뜀`); return; }
    if (typeof o.segment !== 'string' || !(ADOPTION_SEGMENTS as readonly string[]).includes(o.segment)) {
      warnings.push(`${tag}: segment 값이 올바르지 않음 (${JSON.stringify(o.segment)}; 허용 ${ADOPTION_SEGMENTS.join('|')}) — 건너뜀`);
      return;
    }
    if (o.level !== undefined && o.level !== null && (typeof o.level !== 'string' || !(SOURCING_LEVELS as readonly string[]).includes(o.level))) {
      warnings.push(`${tag}: level 값이 올바르지 않음 (${JSON.stringify(o.level)}; 허용 ${SOURCING_LEVELS.join('|')}) — 건너뜀`);
      return;
    }
    if (o.sources !== undefined && !Array.isArray(o.sources)) { warnings.push(`${tag}: sources 가 배열이 아님 — 건너뜀`); return; }
    const year = parseInteger(o.year);
    outCases.push({
      robotName,
      company,
      country: strOrNull(o.country),
      segment: o.segment as AdoptionSegment,
      level: o.level === 'component' ? 'component' : 'module',
      robotClass: strOrNull(o.robotClass),
      actuatorVendor,
      actuatorModel: strOrNull(o.actuatorModel),
      usage: strOrNull(o.usage),
      evidenceGrade: strOrNull(o.evidenceGrade)?.slice(0, 8) ?? null,
      sources: sanitizeAdoptionSources(o.sources),
      noteKo: strOrNull(o.noteKo),
      year: year !== null && year >= 1900 && year <= 2100 ? year : null,
    });
  });

  const outVendors: VendorMarketEntry[] = [];
  (Array.isArray(vtm) ? vtm : []).forEach((v, i) => {
    if (!v || typeof v !== 'object') { warnings.push(`${label} vendorTargetMarkets[${i}]: 객체가 아니어서 건너뜀`); return; }
    const o = v as Record<string, unknown>;
    const vendor = nonEmptyStr(o.vendor);
    const tag = `${label} vendorTargetMarkets[${i}] (${vendor ?? '?'})`;
    if (!vendor) { warnings.push(`${tag}: vendor 누락 — 건너뜀`); return; }
    if (!Array.isArray(o.targetMarketsKo)) { warnings.push(`${tag}: targetMarketsKo 배열 누락 — 건너뜀`); return; }
    let segments: MarketSegment[] | null = null;
    if (o.segments !== undefined && o.segments !== null) {
      if (!Array.isArray(o.segments) || o.segments.some((s) => typeof s !== 'string' || !(MARKET_SEGMENTS as readonly string[]).includes(s))) {
        warnings.push(`${tag}: segments 값이 올바르지 않음 (허용 ${MARKET_SEGMENTS.join('|')}) — 건너뜀`);
        return;
      }
      segments = o.segments as MarketSegment[];
    }
    outVendors.push({ vendor, targetMarketsKo: strList(o.targetMarketsKo), segments, grade: strOrNull(o.grade)?.slice(0, 8) ?? null, url: strOrNull(o.url) });
  });

  return {
    errors: [],
    warnings,
    file: {
      generatedAt: typeof top.obj.generatedAt === 'string' ? top.obj.generatedAt : undefined,
      method: typeof top.obj.method === 'string' ? top.obj.method : undefined,
      cases: outCases,
      vendorTargetMarkets: outVendors,
    },
  };
}

// ------------------------------------------------------------
// 공급사 정규화 / 키
// ------------------------------------------------------------

/**
 * 공급사 키: 별칭표로 표준명을 찾은 뒤 느슨한 회사 키.
 * "CubeMars (T-Motor)" = "CubeMars" = "T-Motor", "RobStride Dynamics" = "RobStride", "Unitree" = "Unitree Robotics".
 */
export function vendorKey(v: string | null | undefined): string {
  if (!v) return '';
  return looseCompanyKey(COMPANY_ALIASES[normalizeCompanyName(v)] ?? v).slice(0, 200);
}

/** 같은 공급사인가 — 키 동일, 또는 짧은 쪽 키가 5자 이상이면서 긴 쪽에 포함 ("Mobis" = "Hyundai Mobis") */
export function sameVendor(a: string | null | undefined, b: string | null | undefined): boolean {
  const ka = vendorKey(a);
  const kb = vendorKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  const [short, long] = ka.length <= kb.length ? [ka, kb] : [kb, ka];
  return short.length >= 5 && long.includes(short);
}

/** 모델명 매칭 — normalizeName 후 한쪽이 3자 이상이고 다른 쪽에 포함 ("RS-04" vs "RobStride 04 (RS-04)") */
export function modelMatches(caseModel: string | null | undefined, productModel: string | null | undefined): boolean {
  const a = normalizeName(caseModel);
  const b = normalizeName(productModel);
  if (!a || !b) return false;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= 3 && long.includes(short);
}

/** 수요 사례 고유 키 (순수): company | robotName | vendorKey(actuatorVendor) | actuatorModel */
export function adoptionCaseKey(c: { company: string; robotName: string; actuatorVendor: string; actuatorModel?: string | null }): string {
  return `${normalizeCompanyName(c.company)}|${normalizeName(c.robotName)}|${vendorKey(c.actuatorVendor)}|${normalizeName(c.actuatorModel ?? '')}`.slice(0, 400);
}

// ============================================================
// 10. CLI 인자 / 카운터
// ============================================================

export type Section = 'robots' | 'suppliers' | 'ci' | 'sourcing' | 'adoptions';
export const ALL_SECTIONS: Section[] = ['robots', 'suppliers', 'ci', 'sourcing', 'adoptions'];

export interface CliArgs {
  dryRun: boolean;
  only: Set<Section>;
  dataDir: string | null;
  /** robots.json 의 회사가 DB 에 없을 때 신규 생성 허용 (기본: 경고 후 해당 로봇 건너뜀) */
  createRobotCompanies: boolean;
  help: boolean;
}

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { dryRun: false, only: new Set(ALL_SECTIONS), dataDir: null, createRobotCompanies: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--dry-run' || a === '-n') args.dryRun = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--create-companies') args.createRobotCompanies = true;
    else if (a === '--only' || a.startsWith('--only=')) {
      const raw = a.includes('=') ? a.slice('--only='.length) : argv[++i] ?? '';
      const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
      const bad = parts.filter((p) => !(ALL_SECTIONS as string[]).includes(p));
      if (bad.length > 0 || parts.length === 0) throw new Error(`--only 값이 잘못되었습니다: "${raw}" (허용: ${ALL_SECTIONS.join('|')})`);
      args.only = new Set(parts as Section[]);
    } else if (a === '--data-dir' || a.startsWith('--data-dir=')) {
      const raw = a.includes('=') ? a.slice('--data-dir='.length) : argv[++i] ?? '';
      if (!raw) throw new Error('--data-dir 경로가 비어 있습니다');
      args.dataDir = raw;
    } else {
      throw new Error(`알 수 없는 인자: ${a}`);
    }
  }
  return args;
}

export type CounterKind = 'insert' | 'update' | 'skip';
export type Counters = Record<string, Record<CounterKind, number>>;

export function bump(counters: Counters, table: string, kind: CounterKind): void {
  if (!counters[table]) counters[table] = { insert: 0, update: 0, skip: 0 };
  counters[table]![kind] += 1;
}

export function formatCounters(counters: Counters): string {
  const tables = Object.keys(counters).sort();
  if (tables.length === 0) return '(변경 없음)';
  const w = Math.max(...tables.map((t) => t.length), 5);
  const lines = [`${'table'.padEnd(w)}  insert  update    skip`];
  for (const t of tables) {
    const c = counters[t]!;
    lines.push(`${t.padEnd(w)}  ${String(c.insert).padStart(6)}  ${String(c.update).padStart(6)}  ${String(c.skip).padStart(6)}`);
  }
  const total = tables.reduce((s, t) => s + counters[t]!.insert + counters[t]!.update, 0);
  lines.push(`${'(writes)'.padEnd(w)}  ${String(total).padStart(6)}`);
  return lines.join('\n');
}
