/**
 * 공급망 맵 3열 그래프의 순수 구성 로직 (React/DOM 의존 없음).
 *  좌: 외부 조달 엣지(basis === 'external')가 있는 로봇 / 중: 공급사 노드(외부 엣지 공급사 + 수요 사례 공급사를 sameVendor 로 병합) /
 *  우: 수요 사례 로봇. 모듈(통합 관절) 층이 1차이고 부품(모터·감속기) 층은 작은 속 빈 마커 + 점선 엣지로 구분한다.
 *  자체 개발 엣지는 그리지 않는다. 비관절 부품(예: 그리퍼·베이스) 공급사는 수요 사례에 같은 공급사가 없으면 노드로 만들지 않는다(표에는 남음).
 */

import type { ActuatorAdoptionCase, ActuatorMapRobot, ActuatorSupplierProduct, ActuatorSupplyEdge, MarketSegment, SourcingLevel, SourcingPosture } from '@/types/actuator-map';
import { SEGMENT_ORDER, levelOf, postureOf, sameVendorName, splitVendors } from './actuator-sourcing';

export const GRAPH_W = 1100;
export const ROW_H = 24;
export const TOP = 34;
export const COL = { left: 300, mid: 620, right: 940 } as const;

export interface GraphRobot {
  id: string;
  name: string;
  company: string;
  posture: SourcingPosture;
  y: number;
}
export interface GraphVendor {
  key: string;
  name: string;
  /** 모듈 층 연결이 하나라도 있으면 module, 부품 층 연결만 있으면 component */
  level: SourcingLevel;
  edgeCount: number;
  caseCount: number;
  /** 제품 스펙(공급사 표)에 등록된 공급사인지 */
  registered: boolean;
  y: number;
}
export interface GraphCase {
  id: string;
  label: string;
  segment: MarketSegment;
  level: SourcingLevel;
  grade: string | null;
  y: number;
}
export interface GraphLink {
  /** left: 로봇→공급사, right: 공급사→수요 사례 */
  side: 'left' | 'right';
  from: string;
  to: string;
  y1: number;
  y2: number;
  width: number;
  /** 'posture' 로봇 태세 색 / 'segment' 세그먼트 색 — 실제 색은 렌더러가 고른다 */
  posture?: SourcingPosture;
  segment?: MarketSegment;
  /** 추정(C/D) */
  estimated: boolean;
  level: SourcingLevel;
  title: string;
}

export interface SupplyGraph {
  robots: GraphRobot[];
  vendors: GraphVendor[];
  cases: GraphCase[];
  links: GraphLink[];
  height: number;
  /** 어느 쪽에도 연결 가능한 노드가 없으면 true */
  empty: boolean;
}

const isEstimated = (g: string | null | undefined) => g === 'C' || g === 'D';

export function buildSupplyGraph(
  edges: ActuatorSupplyEdge[],
  robots: ActuatorMapRobot[],
  adoptions: ActuatorAdoptionCase[],
  suppliers: ActuatorSupplierProduct[] = []
): SupplyGraph {
  const robotById = new Map((robots ?? []).map((r) => [r.id, r] as const));
  const cases = (adoptions ?? []).filter(Boolean);
  const caseVendorNames = cases.flatMap((c) => splitVendors(c.actuatorVendor));

  // 외부 조달 엣지만. 부품 층 엣지는 수요 사례에 같은 공급사가 있을 때만 노드로 만든다.
  const extEdges = (edges ?? []).filter((e) => e && e.basis === 'external').filter((e) => e.level !== 'component' || caseVendorNames.some((n) => sameVendorName(n, e.vendor)));

  const vendors: GraphVendor[] = [];
  const vendorFor = (name: string): GraphVendor => {
    let v = vendors.find((x) => sameVendorName(x.name, name));
    if (!v) {
      v = { key: `v${vendors.length}`, name, level: 'component', edgeCount: 0, caseCount: 0, registered: (suppliers ?? []).some((s) => sameVendorName(s.vendor, name)), y: 0 };
      vendors.push(v);
    }
    return v;
  };

  const leftMap = new Map<string, GraphRobot>();
  const links: GraphLink[] = [];
  for (const e of extEdges) {
    const r = robotById.get(e.robotId);
    if (!leftMap.has(e.robotId)) leftMap.set(e.robotId, { id: e.robotId, name: e.robotName, company: e.company, posture: r ? postureOf(r) : e.posture, y: 0 });
    const v = vendorFor(e.vendor);
    v.edgeCount++;
    if (e.level !== 'component') v.level = 'module';
    links.push({
      side: 'left',
      from: e.robotId,
      to: v.key,
      y1: 0,
      y2: 0,
      width: Math.min(8, 1 + 1.6 * Math.sqrt(Math.max(1, e.quantity))),
      posture: leftMap.get(e.robotId)!.posture,
      estimated: isEstimated(e.confidence),
      level: e.level === 'component' ? 'component' : 'module',
      title: `${e.robotName} (${e.company}) → ${e.vendor}${e.role ? ` · ${e.role}` : ''} · ${e.type} · 수량 ${e.quantity} · 신뢰도 ${e.confidence}${e.level === 'component' ? ' · 부품 단위' : ''}`,
    });
  }

  const caseNodes: GraphCase[] = [];
  const caseLinks: { c: GraphCase; v: GraphVendor; level: SourcingLevel; grade: string | null; label: string }[] = [];
  for (const c of cases) {
    const lv = levelOf(c);
    const node: GraphCase = { id: c.id, label: `${c.company} ${c.robotName}`.trim(), segment: c.marketSegment, level: lv, grade: c.evidenceGrade, y: 0 };
    caseNodes.push(node);
    for (const name of splitVendors(c.actuatorVendor)) {
      const v = vendorFor(name);
      v.caseCount++;
      if (lv === 'module') v.level = 'module';
      caseLinks.push({ c: node, v, level: lv, grade: c.evidenceGrade, label: `${v.name} → ${node.label}` });
    }
  }

  // 정렬: 공급사 = (사례 수 + 엣지 수) 내림차순
  vendors.sort((a, b) => b.caseCount + b.edgeCount - (a.caseCount + a.edgeCount) || a.name.localeCompare(b.name));
  const vIndex = new Map(vendors.map((v, i) => [v.key, i] as const));
  // 수요 사례는 첫 공급사 순서 → 세그먼트 순서 → 이름 (엣지 교차를 줄인다)
  const firstVendor = new Map<string, number>();
  for (const l of caseLinks) firstVendor.set(l.c.id, Math.min(firstVendor.get(l.c.id) ?? 1e9, vIndex.get(l.v.key) ?? 1e9));
  caseNodes.sort(
    (a, b) =>
      (firstVendor.get(a.id) ?? 1e9) - (firstVendor.get(b.id) ?? 1e9) ||
      SEGMENT_ORDER.indexOf(a.segment) - SEGMENT_ORDER.indexOf(b.segment) ||
      a.label.localeCompare(b.label)
  );
  const left = [...leftMap.values()].sort((a, b) => a.company.localeCompare(b.company) || a.name.localeCompare(b.name));

  const yOf = (i: number) => TOP + i * ROW_H + ROW_H / 2;
  left.forEach((n, i) => (n.y = yOf(i)));
  vendors.forEach((n, i) => (n.y = yOf(i)));
  caseNodes.forEach((n, i) => (n.y = yOf(i)));
  const leftY = new Map(left.map((n) => [n.id, n.y] as const));
  const vendorY = new Map(vendors.map((n) => [n.key, n.y] as const));

  for (const l of links) {
    l.y1 = leftY.get(l.from) ?? 0;
    l.y2 = vendorY.get(l.to) ?? 0;
  }
  for (const cl of caseLinks) {
    links.push({
      side: 'right',
      from: cl.v.key,
      to: cl.c.id,
      y1: cl.v.y,
      y2: cl.c.y,
      width: 2,
      segment: cl.c.segment,
      estimated: isEstimated(cl.grade),
      level: cl.level,
      title: `${cl.label}${cl.level === 'component' ? ' · 부품 단위' : ''} · 신뢰도 ${cl.grade ?? '—'}`,
    });
  }

  const rows = Math.max(left.length, vendors.length, caseNodes.length, 1);
  return { robots: left, vendors, cases: caseNodes, links, height: TOP + rows * ROW_H + 16, empty: vendors.length === 0 };
}

/** 제품 스펙(공급사 표·제품 맵)에 없는 공급사 수 — 공급망 맵에만 나타나는 공급사 */
export function unregisteredVendorNames(
  edges: ActuatorSupplyEdge[],
  robots: ActuatorMapRobot[],
  adoptions: ActuatorAdoptionCase[],
  suppliers: ActuatorSupplierProduct[]
): string[] {
  return buildSupplyGraph(edges, robots, adoptions, suppliers)
    .vendors.filter((v) => !v.registered)
    .map((v) => v.name);
}
