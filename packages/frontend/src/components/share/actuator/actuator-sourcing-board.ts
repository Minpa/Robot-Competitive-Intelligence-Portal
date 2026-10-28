/**
 * "조달 방식 보드" 집계 — 회사 단위로 액추에이터 조달 방식을 4그룹으로 나누고, 결론 문장·표 셀·각주를 만든다.
 * 순수 TypeScript (React·DOM 의존 없음, 입력 불변). ActuatorSourcingBoard.tsx(웹)와 actuator-map-html.ts(다운로드 HTML)가
 * 같은 문장·셀을 쓰도록 문장 생성은 buildSourcingBoard 한 곳에서만 한다.
 *
 *  G1 자체 설계·자체 제조      posture in_house / in_house_sells (부품만 외부 조달해도 G1)
 *  G2 자체 설계·외부에 맡겨 제조  posture external 이고 모듈 층 공급사 role 이 전부 위탁제조·양산 공급
 *  G3 외부 설계               posture external 이고 그 외 (role 이 다르거나 비었거나 모듈 층 공급사가 없음)
 *  G4 공개 근거 없음            posture unknown
 *
 * 같은 그룹을 "질문 순서대로 쪼개는 분류 트리"(SourcingTree)로도 내보낸다: 로봇 제조사 → ① 설계 → ② 제조 → ③ 속 부품. 말단 5개가 가로 막대 2개(actuator-sourcing-bars.ts)의 데이터다. 트리의 회사별 detail 과 표의 셀은
 * 같은 회사별 공급사 라벨 헬퍼를 쓴다(표와 차트가 어긋나지 않도록).
 *
 * module / component 구분은 반드시 externalVendors[].level 로 한다 (role 문자열이 아니다).
 * 입력은 robots·suppliers·adoptions·generatedAt 만 쓴다 (edges·vendorMarkets 는 쓰지 않음).
 */

import type { ActuatorAdoptionCase, ActuatorMapResponse, ActuatorMapRobot, ActuatorSupplierProduct, SourcingExternalVendor } from '@/types/actuator-map';
import { INK, companyPosture, levelOf, roleKo, sameVendorName, summarizeSourcing } from './actuator-sourcing';
import { classifySale, computeStrategyStats, formatGeneratedAt, sameCompany } from './actuator-strategy';

// ── 상수 ─────────────────────────────────────────────────────────────────────

export type BoardGroupId = 'G1' | 'G2' | 'G3' | 'G4';
export const BOARD_GROUP_ORDER: BoardGroupId[] = ['G1', 'G2', 'G3', 'G4'];

/** tailwind.config 의 info / pos / neg 값 (INK 가 ink 토큰을 복제하는 것과 같은 방식) — 새 색이 아니다. G4 는 ink-400 */
export const BOARD_COLOR: Record<BoardGroupId, string> = {
  G1: '#1F4A7A', // tailwind info
  G2: '#2F7D5A', // tailwind pos
  G3: '#B0452A', // tailwind neg
  G4: INK[400],
};

/** 트리 노드 채움 색 — tailwind info-soft / pos-soft / neg-soft 값 복제 (새 색이 아니다) */
export const BOARD_SOFT = { info: '#D4E0EE', pos: '#D8E9DF', neg: '#EED4CA' } as const;

/** 표 첫 열 라벨 (두 줄로 쓸 수 있음) */
export const BOARD_ROW_LABEL: Record<BoardGroupId, string[]> = {
  G1: ['자체 설계', '자체 제조'],
  G2: ['자체 설계', '외부에 맡겨 제조'],
  G3: ['외부 설계'],
  G4: ['공개 근거 없음'],
};

/** 고정 열 "관절 모듈 설계/제조" */
export const BOARD_DESIGN_MFG: Record<BoardGroupId, string> = {
  G1: '자체 / 자체',
  G2: '자체 / 외부',
  G3: '외부 / 외부',
  G4: '공개 근거 없음',
};

export const BOARD_COLUMNS = ['조달 방식', '회사(로봇 수)', '관절 모듈 설계/제조', '외부에서 사는 것', '외부에 파는 것'] as const;

/** component-level 공급사의 부품 종류 표시용 매핑 (공급사 주력 제품 기준, 일반 지식 — 각주에 명시). sameVendorName 으로 매칭한다. */
export const COMPONENT_PART_KO: Record<string, string> = {
  maxon: '모터',
  'Harmonic Drive': '감속기',
  'TQ-Group (RoboDrive)': '모터',
  Nabtesco: '감속기',
};

export function componentPartKo(vendor: string): string | null {
  for (const [key, part] of Object.entries(COMPONENT_PART_KO)) if (sameVendorName(vendor, key)) return part;
  return null;
}

export const BOARD_EMPTY_TEXT = '해당 없음';
const UNKNOWN_CELL = '확인 안 됨';
const G2_ROLES = new Set(['contract manufacturing', 'mass-production supply']);
const KNOWN_ROLES = new Set(['contract manufacturing', 'mass-production supply', 'component supply']);
const HUMANOID_RE = /humanoid|biped|휴머노이드|이족/i;
const TARGET_MARKET_MAX = 40;
const NOTE_MAX = 60;

// ── 타입 ─────────────────────────────────────────────────────────────────────

export interface BoardLine {
  text: string;
  /** 회색 보조줄 */
  muted?: boolean;
  /** hover 보조 설명 (핵심 정보는 넣지 않는다) */
  title?: string;
}

export interface BoardCompany {
  name: string;
  robotCount: number;
  /** "Unitree Robotics(5)" — 로봇이 1기면 이름만 */
  label: string;
  /** 로봇 목록과 로봇별 근거 등급 (hover 전용) */
  title: string;
}

export interface BoardRow {
  id: BoardGroupId;
  rowLabel: string[];
  color: string;
  companies: BoardCompany[];
  /** 그룹에 회사가 하나도 없을 때 true — 셀에는 "해당 없음" */
  empty: boolean;
  designMfg: string;
  bought: BoardLine[];
  sold: BoardLine[];
  /** 본문 전체를 회색으로 (확인 불가) */
  muted: boolean;
}

export interface ConclusionSegment {
  text: string;
  strong: boolean;
}

export type BoardFootnoteId = 'source' | 'mismatch' | 'counter' | 'partKind' | 'reading';

export interface BoardFootnote {
  id: BoardFootnoteId;
  text: string;
}

// ── 분류 트리 ────────────────────────────────────────────────────────────────

export type TreeQuestion = '①' | '②' | '③';
export type TreeNodeId = 'root' | 'inhouse_design' | 'inhouse_mfg' | 'inhouse_all' | 'inhouse_parts_bought' | 'inhouse_design_external_mfg' | 'external_module' | 'unknown';

export interface TreeCompany {
  name: string;
  /** 로봇 수 */
  robots: number;
  detail?: string;
}

export interface SourcingTreeNode {
  id: TreeNodeId;
  question?: TreeQuestion;
  label: string;
  hint?: string;
  count: number;
  companies: TreeCompany[];
  children: SourcingTreeNode[];
}

export interface SourcingTree {
  root: SourcingTreeNode;
  /** 대상(LG·예측 모델 제외) 로봇 수 — 막대 1 캡션의 "로봇 N기" */
  robotCount?: number;
  /** 위→아래 표시 순서의 말단 5개 */
  leaves: SourcingTreeNode[];
}

export interface SalesSeller {
  company: string;
  products: string[];
}

export interface SalesAnswer {
  humanoidSellers: number;
  humanoidSellerList: SalesSeller[];
  smallMotorSellers: SalesSeller[];
  sentence: string;
}

export const TREE_QUESTION_TEXT: Record<TreeQuestion, string> = {
  '①': '① 관절 모듈을 누가 설계했나?',
  '②': '② 그 모듈을 누가 만드나?',
  '③': '③ 모터·감속기 같은 속 부품은?',
};

export const TREE_NODE_LABEL: Record<TreeNodeId, string> = {
  root: '로봇 제조사',
  inhouse_design: '자체 설계',
  inhouse_mfg: '자체 제조',
  inhouse_all: '외부 구매 기록 없음',
  inhouse_parts_bought: '외부 구매',
  inhouse_design_external_mfg: '외부에 맡겨 제조',
  external_module: '외부 설계',
  unknown: '공개 근거 없음',
};

const HINT_EXTERNAL = '남이 만든 모듈을 사서 씀';
const HINT_UNKNOWN = '근거가 없을 뿐, 외부 조달이라는 뜻은 아님';
/** ④ 카드 문장의 고정 라벨 */
const SALES_LEAD = '휴머노이드용 액추에이터(관절 모듈): ';
const SMALL_MOTOR_LABEL = '소형·사족용 모터만 판매';
const OTHER_SALES_LABEL = '그 외 판매';

export interface SourcingBoard {
  /** 대상 회사가 1개 이상 */
  hasData: boolean;
  companyCount: number;
  robotCount: number;
  /** LG 등으로 제외된 회사·로봇 수 */
  excluded: { companies: number; robots: number };
  title: string;
  description: string;
  /** 테스트·집계용 그룹별 회사 수 */
  groupCounts: Record<BoardGroupId, number>;
  rows: BoardRow[];
  /** 분류 트리 — 빈 보드면 null */
  tree: SourcingTree | null;
  /** ④ 액추에이터를 남에게 파나? — 빈 보드이거나 suppliers 가 비어 있으면 null */
  salesAnswer: SalesAnswer | null;
  conclusion: ConclusionSegment[];
  conclusionText: string;
  footnotes: BoardFootnote[];
}

// ── 유틸 ─────────────────────────────────────────────────────────────────────

const arr = <T>(v: T[] | null | undefined): T[] => (Array.isArray(v) ? v : []);
const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();
/** 코드 단위 비교 — localeCompare 와 달리 환경(ICU)에 따라 달라지지 않는다 */
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

const isComponent = (v: SourcingExternalVendor) => v.level === 'component';

function uniqueBy<T>(items: T[], keyOf: (t: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    const k = keyOf(it);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

const vendorsOf = (r: ActuatorMapRobot): SourcingExternalVendor[] =>
  arr(r.sourcing?.externalVendors).filter((v) => v && typeof v.vendor === 'string' && v.vendor.trim());

// ── 내부 구조 ────────────────────────────────────────────────────────────────

interface CompanyInfo {
  key: string;
  name: string;
  robots: ActuatorMapRobot[];
  group: BoardGroupId;
}

function classifyCompany(posture: string, robots: ActuatorMapRobot[]): BoardGroupId {
  if (posture === 'in_house' || posture === 'in_house_sells') return 'G1';
  if (posture === 'external') {
    const mods = robots.filter((r) => r.sourcing?.posture === 'external').flatMap((r) => vendorsOf(r).filter((v) => !isComponent(v)));
    if (mods.length > 0 && mods.every((v) => G2_ROLES.has(norm(v.role)))) return 'G2';
    return 'G3';
  }
  return 'G4';
}

const companyLabel = (name: string, n: number) => (n >= 2 ? `${name}(${n})` : name);

function companyTitle(robots: ActuatorMapRobot[]): string {
  return robots.map((r) => `${r.name}(${r.sourcing?.evidenceGrade ?? '—'})`).join(', ');
}

function productText(p: ActuatorSupplierProduct): string {
  const tm = (p.targetMarket ?? '').trim();
  return tm ? `${p.model} (${truncate(tm, TARGET_MARKET_MAX)})` : p.model;
}

// ── 회사별 공급사 라벨 (표와 트리가 함께 쓴다) ─────────────────────────────────

const externalRobotsOf = (c: CompanyInfo) => c.robots.filter((r) => r.sourcing?.posture === 'external');
/** 로봇들의 모듈 층 공급사 (중복 제거) */
const moduleVendorsOf = (robots: ActuatorMapRobot[]): SourcingExternalVendor[] =>
  uniqueBy(
    robots.flatMap((r) => vendorsOf(r).filter((v) => !isComponent(v))),
    (v) => norm(v.vendor)
  );

interface G1Purchase {
  /** "maxon 모터" 형태 (부품 종류를 모르면 vendor 만) */
  labels: string[];
  hasComponent: boolean;
  /** 부품 종류 매핑을 하나라도 썼는가 (각주 4) */
  partKindUsed: boolean;
  /** 일부 로봇만 외부 조달인 경우의 모듈 층 공급사명 (회사 posture 는 우선순위로 G1) */
  partial: string[];
}

function g1Purchase(c: CompanyInfo): G1Purchase {
  const comps = uniqueBy(
    c.robots.flatMap((r) => vendorsOf(r).filter(isComponent)),
    (v) => norm(v.vendor)
  );
  let partKindUsed = false;
  const labels = comps.map((v) => {
    const part = componentPartKo(v.vendor);
    if (part) partKindUsed = true;
    return part ? `${v.vendor.trim()} ${part}` : v.vendor.trim();
  });
  const partial = moduleVendorsOf(externalRobotsOf(c))
    .filter((v) => !comps.some((x) => norm(x.vendor) === norm(v.vendor)))
    .map((v) => v.vendor.trim());
  return { labels, hasComponent: comps.length > 0, partKindUsed, partial };
}

/** G2 회사의 모듈 공급사를 role 별로 묶는다 — 표는 "{vendors}({role})", 트리는 "{vendors} {role}" */
function g2RoleGroups(c: CompanyInfo): { vendors: string[]; role: string }[] {
  const byRole = new Map<string, string[]>();
  for (const v of moduleVendorsOf(externalRobotsOf(c))) {
    const role = norm(v.role);
    const list = byRole.get(role) ?? [];
    list.push(v.vendor.trim());
    byRole.set(role, list);
  }
  return [...byRole.entries()].map(([role, vendors]) => ({ vendors, role: roleKo(role) ?? role }));
}

/** G3 회사의 external 로봇 전체에서 모듈 층 공급사 (중복 제거) */
const g3VendorNames = (c: CompanyInfo): string[] => moduleVendorsOf(externalRobotsOf(c)).map((v) => v.vendor.trim());

// ── 트리 ─────────────────────────────────────────────────────────────────────

function treeLeaf(id: TreeNodeId, question: TreeQuestion, companies: TreeCompany[], hint?: string): SourcingTreeNode {
  return { id, question, label: TREE_NODE_LABEL[id], ...(hint ? { hint } : {}), count: companies.length, companies, children: [] };
}

function treeInternal(id: TreeNodeId, question: TreeQuestion | undefined, children: SourcingTreeNode[]): SourcingTreeNode {
  // 내부 노드의 회사 목록은 자식 순서대로 이은 것이고 detail 은 말단에만 둔다
  const companies = children.flatMap((c) => c.companies.map((x): TreeCompany => ({ name: x.name, robots: x.robots })));
  return { id, ...(question ? { question } : {}), label: TREE_NODE_LABEL[id], count: companies.length, companies, children };
}

/** 트리 불변식 검사 — 위반 메시지 배열(빈 배열이면 정상) */
export function checkSourcingTree(tree: SourcingTree | null, companyCount: number): string[] {
  const out: string[] = [];
  if (!tree) return companyCount === 0 ? out : ['트리가 없습니다'];
  const walk = (n: SourcingTreeNode) => {
    if (n.count !== n.companies.length) out.push(`${n.id}: count(${n.count}) != companies(${n.companies.length})`);
    const names = n.companies.map((c) => c.name);
    if (new Set(names).size !== names.length) out.push(`${n.id}: 회사 중복`);
    if (n.children.length > 0) {
      const joined = n.children.flatMap((c) => c.companies.map((x) => x.name));
      if (joined.join('\u0000') !== names.join('\u0000')) out.push(`${n.id}: companies 가 자식의 합과 다름`);
      if (n.companies.some((c) => c.detail !== undefined)) out.push(`${n.id}: 내부 노드에 detail`);
      if (n.hint) out.push(`${n.id}: 내부 노드에 hint`);
    }
    n.children.forEach(walk);
  };
  walk(tree.root);
  if (tree.root.count !== companyCount) out.push(`root.count(${tree.root.count}) != ${companyCount}`);
  const leafIds = tree.leaves.map((l) => l.id).join(',');
  if (leafIds !== 'inhouse_all,inhouse_parts_bought,inhouse_design_external_mfg,external_module,unknown') out.push(`말단 순서가 다름: ${leafIds}`);
  const sum = tree.leaves.reduce((a, l) => a + l.count, 0);
  if (sum !== tree.root.count) out.push(`말단 합(${sum}) != root.count(${tree.root.count})`);
  return out;
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

const BOARD_TITLE_EMPTY = '로봇 제조사의 액추에이터 조달 방식';
const BOARD_DESCRIPTION = '회사 기준 · LG 제외';

function emptyBoard(): SourcingBoard {
  return {
    hasData: false,
    companyCount: 0,
    robotCount: 0,
    excluded: { companies: 0, robots: 0 },
    title: BOARD_TITLE_EMPTY,
    description: BOARD_DESCRIPTION,
    groupCounts: { G1: 0, G2: 0, G3: 0, G4: 0 },
    rows: [],
    tree: null,
    salesAnswer: null,
    conclusion: [],
    conclusionText: '',
    footnotes: [],
  };
}

const sellerText = (s: SalesSeller) => `${s.company}(${s.products.join(', ')})`;

/** 입력이 null/undefined 이거나 대상 회사가 없으면 hasData=false 인 빈 보드를 돌려준다 */
export function buildSourcingBoard(data: ActuatorMapResponse | null | undefined): SourcingBoard {
  if (!data) return emptyBoard();

  // 대상 로봇: forecast 가 아니고 company 가 있는 것. LG 가 하나라도 있는 회사는 회사째 제외한다.
  const robots = arr(data.robots).filter((r) => r && !r.forecast && typeof r.company === 'string' && r.company.trim());
  const lgKeys = new Set(robots.filter((r) => r.isLG).map((r) => norm(r.company)));
  const eligible = robots.filter((r) => !lgKeys.has(norm(r.company)));
  const excluded = { companies: lgKeys.size, robots: robots.length - eligible.length };
  if (eligible.length === 0) return { ...emptyBoard(), excluded };

  // 회사 묶음 (키 = trim+lowercase, 표시명 = 데이터 원문 첫 등장)
  const posture = companyPosture(eligible);
  const byKey = new Map<string, ActuatorMapRobot[]>();
  for (const r of eligible) {
    const k = norm(r.company);
    const list = byKey.get(k) ?? [];
    list.push(r);
    byKey.set(k, list);
  }
  const companies: CompanyInfo[] = [...byKey.entries()].map(([key, list]) => {
    const p = posture.get(key);
    return { key, name: p?.company ?? list[0]!.company, robots: list, group: classifyCompany(p?.posture ?? 'unknown', list) };
  });
  companies.sort((a, b) => b.robots.length - a.robots.length || cmp(a.name, b.name));

  const groups: Record<BoardGroupId, CompanyInfo[]> = { G1: [], G2: [], G3: [], G4: [] };
  for (const c of companies) groups[c.group].push(c);
  const counts = { G1: groups.G1.length, G2: groups.G2.length, G3: groups.G3.length, G4: groups.G4.length };
  const N = companies.length;

  // 공급사 제품 ↔ 세트 제조사 매칭 (전략 카드와 같은 sameCompany, LG 포함 전체 회사 기준으로 먼저 찾고 LG 는 버린다)
  const allCompanies: string[] = [];
  for (const r of robots) if (!allCompanies.some((c) => norm(c) === norm(r.company))) allCompanies.push(r.company);
  const productsByCompany = new Map<string, ActuatorSupplierProduct[]>();
  for (const s of arr(data.suppliers)) {
    if (!s || typeof s.vendor !== 'string' || !s.vendor.trim() || s.isLG) continue;
    const co = allCompanies.find((c) => sameCompany(s.vendor, c));
    if (!co || lgKeys.has(norm(co))) continue;
    const list = productsByCompany.get(norm(co)) ?? [];
    list.push(s);
    productsByCompany.set(norm(co), list);
  }
  const allProducts = [...productsByCompany.values()].flat();

  // S3 조건: 세트사(LG 제외) 외판 확인·계획 제품 중 휴머노이드 타깃이나 tier1_oem 이 하나도 없다
  const soldProducts = allProducts.filter((p) => {
    const st = classifySale(p);
    return st === 'confirmed' || st === 'planned';
  });
  const noHumanoidSale =
    soldProducts.every((p) => !HUMANOID_RE.test(p.targetMarket ?? '')) &&
    soldProducts.every((p) => p.segment !== 'tier1_oem' && !arr(p.segments).includes('tier1_oem'));
  /** 휴머노이드 판매로 세는 제품 (noHumanoidSale 의 부정과 같은 조건) */
  const isHumanoidSold = (p: ActuatorSupplierProduct) =>
    soldProducts.includes(p) && (HUMANOID_RE.test(p.targetMarket ?? '') || p.segment === 'tier1_oem' || arr(p.segments).includes('tier1_oem'));

  // 수요 사례 (tier1 module)
  const tier1Adoptions: ActuatorAdoptionCase[] = arr(data.adoptions).filter(
    (a) => a && levelOf(a) === 'module' && (a.marketSegment === 'tier1_oem' || a.segment === 'humanoid_tier1')
  );
  const tier1Of = (c: CompanyInfo) => tier1Adoptions.filter((a) => sameCompany(a.company, c.name));

  // ── 행 ──
  const g1Info = new Map(groups.G1.map((c) => [c.key, g1Purchase(c)] as const));
  const partKindUsed = [...g1Info.values()].some((x) => x.partKindUsed);
  const g1Buy = (): BoardLine[] => {
    const perCompany = groups.G1.map((c) => {
      const info = g1Info.get(c.key)!;
      // 일부 로봇만 외부 조달인 경우 (회사 posture 는 우선순위로 G1) — 모듈 층 공급사를 "(일부 로봇)"으로 병기
      return { name: c.name, labels: [...info.labels, ...info.partial.map((v) => `${v}(일부 로봇)`)], hasComponent: info.hasComponent };
    });
    const withBuy = perCompany.filter((x) => x.labels.length > 0);
    const lines: BoardLine[] = [];
    const none = perCompany.length - withBuy.length;
    if (none > 0) lines.push({ text: `${none}개사: 없음` });
    for (const x of withBuy) lines.push({ text: `${x.name}: ${x.labels.join(', ')}` });
    if (withBuy.some((x) => x.hasComponent)) lines.push({ text: '(모듈이 아닌 하위 부품)' });
    return lines;
  };

  const g1Sell = (): BoardLine[] => {
    const lines: BoardLine[] = [];
    const entries: BoardLine[] = [];
    let none = 0;
    for (const c of groups.G1) {
      if (posture.get(c.key)?.posture !== 'in_house_sells') {
        none++;
        continue;
      }
      const all = productsByCompany.get(c.key) ?? [];
      const open = all.filter((p) => classifySale(p) !== 'inhouseOnly');
      if (open.length > 0) entries.push({ text: `${c.name}: ${open.map(productText).join('; ')}` });
      else if (all.length === 0) entries.push({ text: `${c.name}: 외판 제품 정보 없음` });
      else none++; // 제품이 전부 자사 전용(captive)
    }
    if (none > 0) lines.push({ text: `${none}개사: 없음` });
    lines.push(...entries);
    if (noHumanoidSale) lines.push({ text: '휴머노이드 관절 모듈은 판매 안 함' });
    return lines;
  };

  const g2Buy = (): BoardLine[] => {
    const lines: BoardLine[] = [{ text: '자사 설계 모듈의 양산품' }];
    for (const c of groups.G2) {
      const parts = g2RoleGroups(c).map((g) => `${g.vendors.join(', ')}(${g.role})`);
      lines.push({ text: `${c.name}: ${parts.join(', ')}` });
    }
    return lines;
  };

  const g3Buy = (): BoardLine[] => {
    const lines: BoardLine[] = [];
    for (const c of groups.G3) {
      for (const r of c.robots.filter((x) => x.sourcing?.posture === 'external')) {
        const mods = uniqueBy(
          vendorsOf(r).filter((v) => !isComponent(v)),
          (v) => norm(v.vendor)
        );
        const names = mods.length > 0 ? mods.map((v) => v.vendor.trim()).join(', ') : '공급사 정보 없음';
        const roleUnknown = mods.some((v) => !KNOWN_ROLES.has(norm(v.role)));
        lines.push({ text: `${r.name}: ${names}`, ...(roleUnknown ? { title: '역할 미상' } : {}) });
        const note = (r.sourcing?.noteKo ?? '').trim();
        if (note) lines.push({ text: truncate(note, NOTE_MAX), muted: true });
      }
    }
    return lines;
  };

  const rows: BoardRow[] = BOARD_GROUP_ORDER.map((id) => {
    const list = groups[id];
    const empty = list.length === 0;
    let bought: BoardLine[];
    let sold: BoardLine[];
    if (empty) {
      bought = [{ text: BOARD_EMPTY_TEXT, muted: true }];
      sold = [{ text: BOARD_EMPTY_TEXT, muted: true }];
    } else if (id === 'G1') {
      bought = g1Buy();
      sold = g1Sell();
    } else if (id === 'G2') {
      bought = g2Buy();
      sold = [{ text: '없음' }];
    } else if (id === 'G3') {
      bought = g3Buy();
      sold = [{ text: '없음' }];
    } else {
      bought = [{ text: UNKNOWN_CELL }];
      sold = [{ text: UNKNOWN_CELL }];
    }
    return {
      id,
      rowLabel: BOARD_ROW_LABEL[id],
      color: BOARD_COLOR[id],
      companies: list.map((c) => ({ name: c.name, robotCount: c.robots.length, label: companyLabel(c.name, c.robots.length), title: companyTitle(c.robots) })),
      empty,
      designMfg: BOARD_DESIGN_MFG[id],
      bought,
      sold,
      muted: id === 'G4',
    };
  });

  // ── 분류 트리 ──
  const toTree = (c: CompanyInfo, detail?: string): TreeCompany => ({ name: c.name, robots: c.robots.length, ...(detail ? { detail } : {}) });
  const partialNote = (names: string[]) => (names.length > 0 ? `일부 로봇 외부 조달: ${names.join(', ')}` : '');
  const allG1: TreeCompany[] = [];
  const boughtG1: TreeCompany[] = [];
  for (const c of groups.G1) {
    const info = g1Info.get(c.key)!;
    const note = partialNote(info.partial);
    if (info.hasComponent) boughtG1.push(toTree(c, [...info.labels, ...(note ? [note] : [])].join(', ')));
    else allG1.push(toTree(c, note));
  }
  const g2Tree = groups.G2.map((c) =>
    toTree(
      c,
      g2RoleGroups(c)
        .map((g) => `${g.vendors.join(', ')} ${g.role}`)
        .join(' / ')
    )
  );
  const g3Tree = groups.G3.map((c) => {
    const names = g3VendorNames(c);
    return toTree(c, names.length > 0 ? names.join(', ') : '공급사 정보 없음');
  });
  const g4Tree = groups.G4.map((c) => toTree(c));

  const leafAll = treeLeaf('inhouse_all', '③', allG1);
  const leafBought = treeLeaf('inhouse_parts_bought', '③', boughtG1);
  const leafExtMfg = treeLeaf('inhouse_design_external_mfg', '②', g2Tree);
  const leafExtModule = treeLeaf('external_module', '①', g3Tree, HINT_EXTERNAL);
  const leafUnknown = treeLeaf('unknown', '①', g4Tree, HINT_UNKNOWN);
  const inhouseMfg = treeInternal('inhouse_mfg', '②', [leafAll, leafBought]);
  const inhouseDesign = treeInternal('inhouse_design', '①', [inhouseMfg, leafExtMfg]);
  const tree: SourcingTree = {
    root: treeInternal('root', undefined, [inhouseDesign, leafExtModule, leafUnknown]),
    leaves: [leafAll, leafBought, leafExtMfg, leafExtModule, leafUnknown],
    robotCount: eligible.length,
  };

  // ── ④ 판매 ──
  const hasSuppliers = arr(data.suppliers).length > 0;
  let salesAnswer: SalesAnswer | null = null;
  if (hasSuppliers) {
    const humanoidSellerList: SalesSeller[] = [];
    for (const c of companies) {
      const models = (productsByCompany.get(c.key) ?? []).filter(isHumanoidSold).map((p) => p.model);
      if (models.length > 0) humanoidSellerList.push({ company: c.name, products: models });
    }
    const smallMotorSellers: SalesSeller[] = [];
    for (const c of groups.G1) {
      if (posture.get(c.key)?.posture !== 'in_house_sells') continue;
      const open = (productsByCompany.get(c.key) ?? []).filter((p) => classifySale(p) !== 'inhouseOnly' && !isHumanoidSold(p));
      if (open.length > 0) smallMotorSellers.push({ company: c.name, products: open.map((p) => p.model) });
    }
    const n = humanoidSellerList.length;
    let sentence = `${SALES_LEAD}${n}개사`;
    if (n > 0) sentence += ` — ${humanoidSellerList.map(sellerText).join(', ')}`;
    if (smallMotorSellers.length > 0) sentence += ` · ${n > 0 ? OTHER_SALES_LABEL : SMALL_MOTOR_LABEL}: ${smallMotorSellers.map(sellerText).join(', ')}`;
    salesAnswer = { humanoidSellers: n, humanoidSellerList, smallMotorSellers, sentence };
  }

  // ── 결론 문장 ── (조립은 여기 한 곳에서만)
  const conclusion: ConclusionSegment[] = [];
  const push = (text: string, strong = false) => {
    if (!text) return;
    const last = conclusion[conclusion.length - 1];
    if (last && last.strong === strong) last.text += text;
    else conclusion.push({ text, strong });
  };
  const confirmedDesign = counts.G1 + counts.G2;
  const partsBought = leafBought.count;
  push(`${N}개사 중 `);
  const clauses = [counts.G3 > 0 ? `설계를 외부에 맡긴 곳 ${counts.G3}` : '설계를 외부에 맡긴 곳 없음'];
  if (counts.G2 > 0) clauses.push(`제조를 외부에 맡긴 곳 ${counts.G2}`);
  if (partsBought > 0) clauses.push(`속 부품을 사는 곳 ${partsBought}`);
  clauses.forEach((cl, i) => {
    if (i > 0) push(', ');
    push(cl, true);
  });
  push('.');
  if (noHumanoidSale && hasSuppliers) {
    push(' 휴머노이드 액추에이터를 파는 세트 제조사는 없음.', true);
  }
  const conclusionText = conclusion.map((s) => s.text).join('');

  // ── 각주 ──
  const footnotes: BoardFootnote[] = [
    {
      id: 'source',
      text: `출처: ARGOS 조달 태세 재판정 데이터(공개 자료) · 집계 ${formatGeneratedAt(data.generatedAt)} · 설계 = 통합 관절 모듈 기준, 모터·감속기 등 하위 부품은 ③ 속 부품 단계와 상세 표의 '외부에서 사는 것' 열에만 표기 · '외부에 파는 것'은 액추에이터 관련 제품의 외판 여부 · 공개 근거 없음 = 확인할 자료가 없다는 뜻(외부 조달이라는 뜻 아님) · 회사 기준, LG 제외`,
    },
  ];

  // 각주 2: 보드 수치와 조달 태세 기준(헤드라인·전략 카드) 수치가 다를 때만
  const stats = computeStrategyStats(data);
  const co = stats.sourcing.companies;
  if (counts.G1 + counts.G2 + counts.G3 !== co.judged || confirmedDesign !== co.confirmed) {
    const lg = excluded.companies > 0 ? ' LG 포함' : '';
    let t = `자체 설계 확인은 자체 제조 ${counts.G1} + 외부에 맡겨 제조 ${counts.G2}입니다. 조달 태세 기준(헤드라인·전략 카드)의 자체 개발 확인은 판정 가능 ${co.judged}개사 중 ${co.confirmed}개사이며${lg}, 외부에 맡겨 제조하는 회사는 '외부 조달·혼합'으로 분류됩니다.`;
    // 로봇 기준 조달 태세 4단계 수치 (헤드라인·전략 카드와 같은 집계 — 예측 모델 제외, LG 포함 여부 명시) + 자체 개발 확인의 근거 등급 A/B 건수
    const sum = summarizeSourcing(arr(data.robots));
    t += ` 로봇 기준(${sum.robots}기, 예측 모델 제외, ${excluded.robots > 0 ? `LG ${excluded.robots}기 포함` : 'LG 없음'}): 자체 확인 ${sum.inHouse}기 · 자체+외판 ${sum.inHouseSells}기 · 외부 조달·혼합 ${sum.external}기 · 확인 불가 ${sum.unknown}기 (자체 개발 확인 중 근거 등급 A ${sum.confirmedGradeA}기 / B ${sum.confirmedGradeB}기).`;
    if (excluded.companies > 0) t += ' 상세 그래프의 회사 수는 LG 포함.';
    footnotes.push({ id: 'mismatch', text: t });
  }

  // 각주 3: 결론과 충돌할 수 있는 반례
  const counter: string[] = [];
  const adoptionNotes = groups.G1.map((c) => ({ c, list: tier1Of(c) }))
    .filter((x) => x.list.length > 0)
    .map((x) => `${x.c.name}(${x.list.map((a) => `${a.actuatorVendor}, 근거 ${a.evidenceGrade ?? '—'}`).join('; ')})`);
  if (adoptionNotes.length > 0) counter.push(`수요 사례에 외부 공급사가 기록된 자체 설계 회사: ${adoptionNotes.join(', ')}.`);
  const weak = companies
    .map((c) => ({ c, list: (productsByCompany.get(c.key) ?? []).filter((p) => classifySale(p) === 'unconfirmed' && HUMANOID_RE.test(p.targetMarket ?? '')) }))
    .filter((x) => x.list.length > 0)
    .map((x) => `${x.c.name} 제품 ${x.list.length}개 (${x.list.map((p) => p.model.replace(/\s*\([^)]*\)/g, '').trim()).join(', ')})`);
  if (weak.length > 0) counter.push(`외판 확인되지 않음(근거 약함): ${weak.join(', ')}.`);
  if (counter.length > 0) footnotes.push({ id: 'counter', text: counter.join(' ') });

  if (partKindUsed) footnotes.push({ id: 'partKind', text: '부품 종류(모터·감속기) 표기는 공급사 주력 제품 기준(일반 지식)입니다.' });

  footnotes.push({
    id: 'reading',
    text: '회사명은 로봇 제조사, 괄호 안은 액추에이터·부품 공급사입니다. 막대 폭은 회사 수에 비례하며 두 막대는 같은 회사·같은 스케일입니다. 점선 테두리 = 속 부품만 외부에서 구매.',
  });

  return {
    hasData: true,
    companyCount: N,
    robotCount: eligible.length,
    excluded,
    title: `로봇 제조사 ${N}개사의 액추에이터 조달 방식`,
    description: BOARD_DESCRIPTION,
    groupCounts: counts,
    rows,
    tree,
    salesAnswer,
    conclusion,
    conclusionText,
    footnotes,
  };
}
