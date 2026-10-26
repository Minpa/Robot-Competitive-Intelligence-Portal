/**
 * 조달 태세·시장 세그먼트 공통 상수·라벨·색·집계 (순수 TypeScript, React·DOM 의존 없음).
 * 포지션 맵·공급망 맵·공급사 제품 맵·요약 막대·다운로드 HTML·전략 카드가 같은 정의를 쓰도록 한 곳에 둔다.
 *
 * 색은 chartColors 토큰만 사용한다 (새 hex 없음).
 *  - 조달 태세: in_house=CATEGORY_PALETTE[0], in_house_sells=[1], external=[2], unknown=속 빈 링(CHART_HUE_MUTED 테두리)
 *  - 시장 세그먼트: tier1_oem=[1], tier2_legged=[3], research_edu=[4], industrial_cobot=[5], service=[2], captive=속 빈 링(ink-600), other=CATEGORY_OTHER
 *    [1]·[2] 는 조달 태세 차트에서도 쓰이므로 두 차트의 범례를 항상 각 차트 바로 옆에 붙여 의미를 구분한다.
 */

import { CATEGORY_OTHER, CATEGORY_PALETTE, CHART_HUE_MUTED } from '@/app/events/wrc2026/components/chartColors';
import type {
  ActuatorAdoptionCase,
  ActuatorMapRobot,
  MarketSegment,
  RobotSourcing,
  SourcingExternalVendor,
  SourcingPosture,
} from '@/types/actuator-map';

/** tailwind.config ink 토큰 값 (tech-trend-report-html.ts 인라인 스타일과 동일) — 정적 HTML·SVG 문자열용 */
export const INK = {
  900: '#1F2328',
  600: '#5C636E',
  500: '#8A909A',
  400: '#9AA1AC',
  300: '#C6CAD0',
  200: '#E6E7EA',
  100: '#ECECEF',
  50: '#F6F7F8',
} as const;
export const WHITE = '#fff';

// ── 조달 태세 ────────────────────────────────────────────────────────────────

export const POSTURE_ORDER: SourcingPosture[] = ['in_house', 'in_house_sells', 'external', 'unknown'];

export const POSTURE_LABEL: Record<SourcingPosture, string> = {
  in_house: '자체 개발(확인)',
  in_house_sells: '자체 개발+외판',
  external: '외부 조달·혼합',
  unknown: '확인 불가',
};

export const POSTURE_COLOR: Record<SourcingPosture, string> = {
  in_house: CATEGORY_PALETTE[0] as string,
  in_house_sells: CATEGORY_PALETTE[1] as string,
  external: CATEGORY_PALETTE[2] as string,
  unknown: CHART_HUE_MUTED,
};

/** 속 빈 링으로 그리는 태세 (색만으로 구분하지 않기 위한 형태 병행) */
export const POSTURE_HOLLOW: Record<SourcingPosture, boolean> = {
  in_house: false,
  in_house_sells: false,
  external: false,
  unknown: true,
};

export const DEFAULT_POSTURES: Record<SourcingPosture, boolean> = { in_house: true, in_house_sells: true, external: true, unknown: true };

/** 구 응답·결측 대비 */
export function postureOf(r: Pick<ActuatorMapRobot, 'sourcing'>): SourcingPosture {
  const p = r.sourcing?.posture;
  return p === 'in_house' || p === 'in_house_sells' || p === 'external' || p === 'unknown' ? p : 'unknown';
}

const GRADE_RE = /^[ABCD]$/;
const gradeOf = (s: Pick<RobotSourcing, 'evidenceGrade'>): string | null => (s.evidenceGrade && GRADE_RE.test(s.evidenceGrade) ? s.evidenceGrade : null);

/** 툴팁·표용 상세 라벨: "자체 개발(확인·B)", "외부 조달·혼합(혼합·B)", "확인 불가(자체 개발 추정·C)" */
export function postureDetailLabel(s: RobotSourcing): string {
  const base = s.posture === 'in_house' ? '자체 개발' : POSTURE_LABEL[s.posture];
  const g = gradeOf(s);
  const tags: string[] = [];
  if (s.posture === 'in_house' || s.posture === 'in_house_sells') {
    tags.push('확인');
    if (g) tags.push(g);
  } else if (s.posture === 'external') {
    tags.push(s.basis === 'derived' ? '공급사 기록 기준' : s.kind === 'mixed' ? '혼합' : '외부');
    if (g) tags.push(g);
  } else {
    tags.push(s.kind === 'in_house_presumed' ? '자체 개발 추정' : s.basis === 'derived' ? '근거 없음' : '근거 부족');
    if (g) tags.push(g);
  }
  return `${base}(${tags.join('·')})`;
}

/** 부품 층 외부 조달 공급사 (모듈 층은 자체 설계) */
export function componentVendors(s: RobotSourcing): SourcingExternalVendor[] {
  return (s.externalVendors ?? []).filter((v) => v.level === 'component');
}

/** "부품(모터·감속기) 외부 조달: maxon" — 해당 없으면 null */
export function componentSourcingText(s: RobotSourcing): string | null {
  if (!s.componentSourcing) return null;
  const names = [...new Set(componentVendors(s).map((v) => v.vendor))];
  return names.length ? `부품(모터·감속기) 외부 조달: ${names.join(', ')}` : '부품(모터·감속기) 외부 조달';
}

export interface SourcingSummary {
  robots: number;
  inHouse: number;
  inHouseSells: number;
  external: number;
  externalMixed: number;
  unknown: number;
  unknownPresumed: number;
  componentSourcing: number;
  /** 자체 개발 확인(자체·자체+외판) 중 근거 등급 A / B */
  confirmedGradeA: number;
  confirmedGradeB: number;
}

/** forecast 제외 조달 태세 집계 — 서버 sourcingStats 와 같은 규칙 */
export function summarizeSourcing(robots: ActuatorMapRobot[]): SourcingSummary {
  const sum: SourcingSummary = {
    robots: 0,
    inHouse: 0,
    inHouseSells: 0,
    external: 0,
    externalMixed: 0,
    unknown: 0,
    unknownPresumed: 0,
    componentSourcing: 0,
    confirmedGradeA: 0,
    confirmedGradeB: 0,
  };
  for (const r of robots ?? []) {
    if (!r || r.forecast) continue;
    sum.robots++;
    const s = r.sourcing;
    const p = postureOf(r);
    if (p === 'in_house') sum.inHouse++;
    else if (p === 'in_house_sells') sum.inHouseSells++;
    else if (p === 'external') {
      sum.external++;
      if (s?.kind === 'mixed') sum.externalMixed++;
    } else {
      sum.unknown++;
      if (s?.kind === 'in_house_presumed') sum.unknownPresumed++;
    }
    if (p === 'in_house' || p === 'in_house_sells') {
      const g = s ? gradeOf(s) : null;
      if (g === 'A') sum.confirmedGradeA++;
      else if (g === 'B') sum.confirmedGradeB++;
    }
    if (s?.componentSourcing) sum.componentSourcing++;
  }
  return sum;
}

const POSTURE_PRIORITY: SourcingPosture[] = ['in_house_sells', 'in_house', 'external', 'unknown'];

const coKey = (c: string | null | undefined) => (c ?? '').trim().toLowerCase();

/** 회사 단위 조달 태세 — 우선순위 in_house_sells > in_house > external > unknown (forecast 제외) */
export function companyPosture(robots: ActuatorMapRobot[]): Map<string, { company: string; posture: SourcingPosture }> {
  const map = new Map<string, { company: string; posture: SourcingPosture }>();
  for (const r of robots ?? []) {
    if (!r || r.forecast || !r.company) continue;
    const key = coKey(r.company);
    const p = postureOf(r);
    const cur = map.get(key);
    if (!cur || POSTURE_PRIORITY.indexOf(p) < POSTURE_PRIORITY.indexOf(cur.posture)) map.set(key, { company: cur?.company ?? r.company, posture: p });
  }
  return map;
}

// ── 시장 세그먼트 ────────────────────────────────────────────────────────────

export const SEGMENT_ORDER: MarketSegment[] = ['tier1_oem', 'tier2_legged', 'research_edu', 'industrial_cobot', 'service', 'captive', 'other'];

export const SEGMENT_LABEL: Record<MarketSegment, string> = {
  tier1_oem: '1군 세트사 양산 공급·위탁제조',
  tier2_legged: '2군 휴머노이드·레그드',
  research_edu: '연구·교육',
  industrial_cobot: '산업·협동',
  service: '서비스·웨어러블(외골격·의료)',
  captive: '자사 전용(계열 포함)',
  other: '기타·미분류',
};

export const SEGMENT_COLOR: Record<MarketSegment, string> = {
  tier1_oem: CATEGORY_PALETTE[1] as string,
  tier2_legged: CATEGORY_PALETTE[3] as string,
  research_edu: CATEGORY_PALETTE[4] as string,
  industrial_cobot: CATEGORY_PALETTE[5] as string,
  service: CATEGORY_PALETTE[2] as string,
  captive: INK[600], // 속 빈 링 테두리
  other: CATEGORY_OTHER,
};

export const SEGMENT_HOLLOW: Record<MarketSegment, boolean> = {
  tier1_oem: false,
  tier2_legged: false,
  research_edu: false,
  industrial_cobot: false,
  service: false,
  captive: true,
  other: false,
};

export const isMarketSegment = (v: unknown): v is MarketSegment => typeof v === 'string' && (SEGMENT_ORDER as string[]).includes(v);

/** 서버가 segmentOrder 를 내려주면 그것을, 아니면 기본 순서를 쓴다 (알 수 없는 값은 버리고 빠진 값은 뒤에 붙인다) */
export function resolveSegmentOrder(order: unknown): MarketSegment[] {
  const given = Array.isArray(order) ? order.filter(isMarketSegment) : [];
  const out: MarketSegment[] = [];
  for (const s of [...given, ...SEGMENT_ORDER]) if (!out.includes(s)) out.push(s);
  return out;
}

// ── 공급사 이름 정규화 (클라이언트 측 병합용) ────────────────────────────────

/** "Tuopu Group / Sanhua Intelligent Controls" → 각각. 단일 이름이면 그대로. */
export function splitVendors(v: string | null | undefined): string[] {
  return (v ?? '')
    .split(/\s+\/\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

const keyOf = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/** 공급사명의 비교 키 — 본 이름과 괄호 안 별칭을 모두 키로 쓴다 ("CubeMars (T-Motor)" → cubemars, tmotor) */
export function vendorKeys(name: string | null | undefined): string[] {
  const raw = (name ?? '').trim();
  if (!raw) return [];
  const keys = new Set<string>();
  const primary = raw.replace(/\([^)]*\)/g, ' ');
  if (keyOf(primary)) keys.add(keyOf(primary));
  for (const m of raw.matchAll(/\(([^)]*)\)/g)) if (keyOf(m[1]!)) keys.add(keyOf(m[1]!));
  if (keys.size === 0 && keyOf(raw)) keys.add(keyOf(raw));
  return [...keys];
}

/** 같은 공급사인지: 키가 같거나 짧은 쪽 키가 5자 이상이면서 긴 쪽에 포함 ("Mobis" = "Hyundai Mobis", "maxon" ≠ "Mobis") */
export function sameVendorName(a: string | null | undefined, b: string | null | undefined): boolean {
  const ka = vendorKeys(a);
  const kb = vendorKeys(b);
  for (const x of ka) {
    for (const y of kb) {
      if (x === y) return true;
      const [s, l] = x.length <= y.length ? [x, y] : [y, x];
      if (s.length >= 5 && l.includes(s)) return true;
    }
  }
  return false;
}

// ── 수요 사례 집계 ───────────────────────────────────────────────────────────

export const levelOf = (c: Pick<ActuatorAdoptionCase, 'level'>) => (c.level === 'component' ? 'component' : 'module');

export interface SegmentCount {
  segment: MarketSegment;
  /** 모듈 층 사례 수 (1차 수치) */
  count: number;
  /** 부품 층 사례 수 ("부품 단위 채택 n건") */
  componentCount: number;
}

/** 세그먼트별 수요 사례 수 — 모듈 층을 1차 수치로, 부품 층은 따로. 사례가 없는 세그먼트는 제외, 순서는 order. */
export function adoptionBySegment(adoptions: ActuatorAdoptionCase[], order: MarketSegment[] = SEGMENT_ORDER): SegmentCount[] {
  const rows = new Map<MarketSegment, SegmentCount>();
  for (const c of adoptions ?? []) {
    if (!c) continue;
    const seg = isMarketSegment(c.marketSegment) ? c.marketSegment : 'other';
    const row = rows.get(seg) ?? { segment: seg, count: 0, componentCount: 0 };
    if (levelOf(c) === 'component') row.componentCount++;
    else row.count++;
    rows.set(seg, row);
  }
  return resolveSegmentOrder(order)
    .map((s) => rows.get(s))
    .filter((r): r is SegmentCount => !!r);
}

export interface VendorCount {
  vendor: string;
  count: number;
}

/** 공급사별 수요 사례 수 (내림차순, 동수는 이름순). level 별로 따로 센다. 복수 공급사 사례는 각각 1건. */
export function adoptionByVendor(adoptions: ActuatorAdoptionCase[], level: 'module' | 'component' = 'module'): VendorCount[] {
  const rows: VendorCount[] = [];
  for (const c of adoptions ?? []) {
    if (!c || levelOf(c) !== level) continue;
    for (const v of splitVendors(c.actuatorVendor)) {
      const hit = rows.find((r) => sameVendorName(r.vendor, v));
      if (hit) hit.count++;
      else rows.push({ vendor: v, count: 1 });
    }
  }
  return rows.sort((a, b) => b.count - a.count || a.vendor.localeCompare(b.vendor));
}

export interface AdoptionTotals {
  total: number;
  module: number;
  component: number;
}

export function adoptionTotals(adoptions: ActuatorAdoptionCase[]): AdoptionTotals {
  const list = (adoptions ?? []).filter(Boolean);
  const component = list.filter((c) => levelOf(c) === 'component').length;
  return { total: list.length, module: list.length - component, component };
}

/** "2군 휴머노이드·레그드 3, 연구·교육 4" (모듈 층 기준, 사례 있는 세그먼트만) */
export function segmentLabelList(counts: SegmentCount[], withUnit = ''): string {
  return counts
    .filter((c) => c.count > 0)
    .map((c) => `${SEGMENT_LABEL[c.segment]} ${c.count}${withUnit}`)
    .join(', ');
}

/** 사례 근거가 A/B 인지 */
export const isStrongGrade = (g: string | null | undefined) => g === 'A' || g === 'B';

// ── 역할 표기 ────────────────────────────────────────────────────────────────

const ROLE_KO: Record<string, string> = {
  'contract manufacturing': '위탁제조',
  'mass-production supply': '양산 공급',
  'component supply': '부품 공급',
};

/** 리서치 데이터의 영문 역할 표기를 한글로 (알 수 없는 값은 그대로) */
export function roleKo(role: string | null | undefined): string | null {
  const r = (role ?? '').trim();
  if (!r) return null;
  return ROLE_KO[r.toLowerCase()] ?? r;
}
