/**
 * "조달 방식 보드" 집계 — 회사 단위로 액추에이터 조달 방식을 4그룹으로 나누고, 결론 문장·표 셀·각주를 만든다.
 * 순수 TypeScript (React·DOM 의존 없음, 입력 불변). ActuatorSourcingBoard.tsx(웹)와 actuator-map-html.ts(다운로드 HTML)가
 * 같은 문장·셀을 쓰도록 문장 생성은 buildSourcingBoard 한 곳에서만 한다.
 *
 *  G1 자체 설계·자체 제조      posture in_house / in_house_sells (부품만 외부 조달해도 G1)
 *  G2 자체 설계·외부 제조/양산  posture external 이고 모듈 층 공급사 role 이 전부 위탁제조·양산 공급
 *  G3 외부 모듈 구매           posture external 이고 그 외 (role 이 다르거나 비었거나 모듈 층 공급사가 없음)
 *  G4 확인 불가               posture unknown
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

export const BOARD_TILE_LABEL: Record<BoardGroupId, string> = {
  G1: '자체 설계 · 자체 제조',
  G2: '자체 설계 · 외부 제조/양산',
  G3: '외부 모듈 구매',
  G4: '확인 불가',
};

/** 표 첫 열 라벨 (두 줄로 쓸 수 있음) */
export const BOARD_ROW_LABEL: Record<BoardGroupId, string[]> = {
  G1: ['자체 설계', '자체 제조'],
  G2: ['자체 설계', '외부 제조·양산'],
  G3: ['외부 모듈 구매'],
  G4: ['확인 불가'],
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

export interface BoardTile {
  id: BoardGroupId;
  count: number;
  label: string;
  ariaLabel: string;
  color: string;
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

export type BoardFootnoteId = 'source' | 'mismatch' | 'counter' | 'partKind';

export interface BoardFootnote {
  id: BoardFootnoteId;
  text: string;
}

export interface SourcingBoard {
  /** 대상 회사가 1개 이상 */
  hasData: boolean;
  companyCount: number;
  robotCount: number;
  /** LG 등으로 제외된 회사·로봇 수 */
  excluded: { companies: number; robots: number };
  title: string;
  description: string;
  tiles: BoardTile[];
  rows: BoardRow[];
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

// ── 메인 ─────────────────────────────────────────────────────────────────────

function emptyBoard(): SourcingBoard {
  return {
    hasData: false,
    companyCount: 0,
    robotCount: 0,
    excluded: { companies: 0, robots: 0 },
    title: '휴머노이드 세트 제조사의 액추에이터 조달 방식',
    description: '회사 기준 · LG 제외',
    tiles: BOARD_GROUP_ORDER.map((id) => ({ id, count: 0, label: BOARD_TILE_LABEL[id], ariaLabel: `${BOARD_TILE_LABEL[id]} 0개사`, color: BOARD_COLOR[id] })),
    rows: [],
    conclusion: [],
    conclusionText: '',
    footnotes: [],
  };
}

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

  // 수요 사례 (tier1 module)
  const tier1Adoptions: ActuatorAdoptionCase[] = arr(data.adoptions).filter(
    (a) => a && levelOf(a) === 'module' && (a.marketSegment === 'tier1_oem' || a.segment === 'humanoid_tier1')
  );
  const tier1Of = (c: CompanyInfo) => tier1Adoptions.filter((a) => sameCompany(a.company, c.name));

  // ── 행 ──
  let partKindUsed = false;
  const g1Buy = (): BoardLine[] => {
    const perCompany = groups.G1.map((c) => {
      const comps = uniqueBy(
        c.robots.flatMap((r) => vendorsOf(r).filter(isComponent)),
        (v) => norm(v.vendor)
      );
      const labels = comps.map((v) => {
        const part = componentPartKo(v.vendor);
        if (part) partKindUsed = true;
        return part ? `${v.vendor.trim()} ${part}` : v.vendor.trim();
      });
      // 일부 로봇만 외부 조달인 경우 (회사 posture 는 우선순위로 G1) — 모듈 층 공급사를 "(일부 로봇)"으로 병기
      const partial = uniqueBy(
        c.robots.filter((r) => r.sourcing?.posture === 'external').flatMap((r) => vendorsOf(r).filter((v) => !isComponent(v))),
        (v) => norm(v.vendor)
      )
        .filter((v) => !comps.some((x) => norm(x.vendor) === norm(v.vendor)))
        .map((v) => `${v.vendor.trim()}(일부 로봇)`);
      return { name: c.name, labels: [...labels, ...partial], hasComponent: comps.length > 0 };
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
      const mods = uniqueBy(
        c.robots.filter((r) => r.sourcing?.posture === 'external').flatMap((r) => vendorsOf(r).filter((v) => !isComponent(v))),
        (v) => norm(v.vendor)
      );
      const byRole = new Map<string, string[]>();
      for (const v of mods) {
        const role = norm(v.role);
        const list = byRole.get(role) ?? [];
        list.push(v.vendor.trim());
        byRole.set(role, list);
      }
      const parts = [...byRole.entries()].map(([role, vendors]) => `${vendors.join(', ')}(${roleKo(role) ?? role})`);
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

  const hasComponentBuy = groups.G1.some((c) => c.robots.some((r) => vendorsOf(r).some(isComponent)));

  // ── 결론 문장 ──
  const g3 = counts.G3;
  const conclusion: ConclusionSegment[] = [];
  const push = (text: string, strong = false) => {
    if (!text) return;
    const last = conclusion[conclusion.length - 1];
    if (last && last.strong === strong) last.text += text;
    else conclusion.push({ text, strong });
  };
  const confirmedDesign = counts.G1 + counts.G2;
  const g4Part = counts.G4 > 0 ? `, 확인 불가 ${counts.G4}개사` : '';
  push(`조사한 ${N}개사 중 `);
  if (g3 === 0) push('액추에이터 설계를 외부에 맡긴 곳은 없습니다', true);
  else if (g3 * 5 <= N) push(`액추에이터 설계를 외부에 맡긴 곳은 ${g3}개사뿐`, true);
  else push(`액추에이터 설계를 외부에 맡긴 곳은 ${g3}개사`, true);
  push(`${g3 === 0 ? '' : '입니다'}(자체 설계 확인 ${confirmedDesign}개사${g4Part}).`);

  if (!groups.G3.some((c) => tier1Of(c).length > 0)) {
    const lead: string[] = [];
    if (counts.G2 > 0) lead.push('자사 설계 모듈의 양산품(위탁제조·그룹 부품사)');
    if (hasComponentBuy) lead.push('모터·감속기 같은 하위 부품');
    push(' ');
    if (lead.length > 0) push(`자체 설계 회사가 외부에서 사는 것은 ${lead.length === 2 ? `${lead[0]}이나 ${lead[1]}` : lead[0]}이며, `);
    push('완성 관절 모듈을 카탈로그로 구매하는 휴머노이드 1군 제조사는 없습니다', true);
    push('.');
  }
  if (noHumanoidSale) push(' 휴머노이드 관절 모듈을 외부에 파는 세트 제조사도 없습니다.');
  const conclusionText = conclusion.map((s) => s.text).join('');

  // ── 각주 ──
  const footnotes: BoardFootnote[] = [
    {
      id: 'source',
      text: `출처: ARGOS 조달 태세 재판정 데이터(공개 자료) · 집계 ${formatGeneratedAt(data.generatedAt)} · 설계 = 통합 관절 모듈 기준, 모터·감속기 등 하위 부품은 '사는 것' 열에만 표기 · '외부에 파는 것'은 액추에이터 관련 제품의 외판 여부 · 확인 불가 = 공개 근거 없음(외부 조달이라는 뜻 아님) · 회사 기준, LG 제외`,
    },
  ];

  // 각주 2: 보드 수치와 조달 태세 기준(헤드라인·전략 카드) 수치가 다를 때만
  const stats = computeStrategyStats(data);
  const co = stats.sourcing.companies;
  if (counts.G1 + counts.G2 + counts.G3 !== co.judged || confirmedDesign !== co.confirmed) {
    const lg = excluded.companies > 0 ? ' LG 포함' : '';
    let t = `자체 설계 확인은 자체 제조 ${counts.G1} + 외부 제조·양산 ${counts.G2}입니다. 조달 태세 기준(헤드라인·전략 카드)의 자체 개발 확인은 판정 가능 ${co.judged}개사 중 ${co.confirmed}개사이며${lg}, 외부 제조·양산 회사는 '외부 조달·혼합'으로 분류됩니다.`;
    const summaryRobots = summarizeSourcing(arr(data.robots)).robots;
    if (excluded.robots > 0 && summaryRobots !== eligible.length) t += ` 요약 막대·헤드라인의 로봇 ${summaryRobots}기는 LG ${excluded.robots}기 포함.`;
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

  return {
    hasData: true,
    companyCount: N,
    robotCount: eligible.length,
    excluded,
    title: `휴머노이드 세트 제조사 ${N}개사의 액추에이터 조달 방식`,
    description: `회사 기준 · LG 제외 · 로봇 ${eligible.length}기`,
    tiles: BOARD_GROUP_ORDER.map((id) => ({ id, count: counts[id], label: BOARD_TILE_LABEL[id], ariaLabel: `${BOARD_TILE_LABEL[id]} ${counts[id]}개사`, color: BOARD_COLOR[id] })),
    rows,
    conclusion,
    conclusionText,
    footnotes,
  };
}
