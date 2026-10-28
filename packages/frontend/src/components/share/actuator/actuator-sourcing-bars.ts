/**
 * 조달 방식 가로 누적 막대 2개의 데이터 — 순수 함수 (React·DOM 의존 없음, 입력 불변, 결정적).
 * ActuatorSourcingBars.tsx(웹)와 actuator-map-html.ts 의 buildSourcingBarsHtml(다운로드 HTML)이 같은 결과를 그리기만 한다.
 *
 *  막대 1 "설계"       자체 설계 · 외부 설계 · 공개 근거 없음            (회사 N = 100%)
 *  막대 2 "조달 방식"  자체 생산 · 속 부품만 구매 · 제조 위탁 · 완성 모듈 구매 · 공개 근거 없음 (같은 N, 같은 스케일)
 * 막대 2 의 처음 세 구간(자체 생산 + 속 부품만 구매 + 제조 위탁)은 막대 1 의 "자체 설계" 구간과 정확히 포개진다(순서 고정).
 * 집계는 SourcingTree(actuator-sourcing-board.ts) 말단 5개를 그대로 쓴다. 색은 INK·흰색·BOARD_COLOR·BOARD_SOFT 상수뿐(새 hex 없음).
 */

import { INK, WHITE } from './actuator-sourcing';
import { BOARD_COLOR, BOARD_SOFT, type SourcingTree, type SourcingTreeNode, type TreeCompany, type TreeNodeId } from './actuator-sourcing-board';

/** 숫자를 세그먼트 안에 쓰려면 폭이 이 값(%) 이상이어야 한다 — 미만이면 세그먼트 아래 바깥에 쓴다 */
export const BAR_INSIDE_MIN_PCT = 6;

export const BAR_CAPTION = {
  bar1: '① 설계 — 관절 모듈을 누가 설계했나?',
  bar2: '② 조달 방식 — 어떻게 조달하나? (위 막대와 같은 회사 · 같은 폭)',
} as const;
export const BAR_LEGEND_TITLE = { bar1: '설계', bar2: '조달 방식' } as const;

export interface BarSegment {
  id: TreeNodeId;
  label: string;
  count: number;
  /** count / total × 100 (소수 3자리) */
  pct: number;
  fill: string;
  /** 세그먼트 안 숫자 색 */
  numColor: string;
  /** 점선 테두리 색 (속 부품만 구매) — 없으면 null */
  dashed: string | null;
  /** 폭이 좁아 숫자를 세그먼트 아래 바깥에 쓴다 */
  outside: boolean;
  /** 툴팁 — "{label} {count}개사: {회사들}" */
  title: string;
  /** 범례의 회사 나열 (괄호 안: 공급사). 빈 문자열이면 생략 */
  names: string;
  /** 범례의 설명 한 줄 (외부 설계·공개 근거 없음) */
  hint?: string;
}

export interface SourcingBars {
  total: number;
  /** 대상 로봇 수 (없으면 undefined) */
  robotCount?: number;
  bar1: BarSegment[];
  bar2: BarSegment[];
  /** 회사가 0 이라 막대에서 뺀 구간 라벨 (중복 제거) */
  omitted: string[];
  ariaLabel1: string;
  ariaLabel2: string;
}

const pctOf = (count: number, total: number) => Math.round((count / total) * 100000) / 1000;

/** 회사 나열 — detail 이 있으면 "회사 (공급사)" 를 "; " 로, 없으면 이름만 ", " 로 잇는다 */
export function companyListText(companies: TreeCompany[]): string {
  const hasDetail = companies.some((c) => c.detail);
  return companies.map((c) => (c.detail ? `${c.name} (${c.detail})` : c.name)).join(hasDetail ? '; ' : ', ');
}

interface SegSpec {
  node: SourcingTreeNode | undefined;
  id: TreeNodeId;
  label: string;
  fill: string;
  numColor: string;
  dashed?: string;
  /** 범례에 회사명을 쓰지 않는다 */
  noNames?: boolean;
}

function toSegment(spec: SegSpec, total: number): BarSegment {
  const n = spec.node;
  const count = n?.count ?? 0;
  const pct = pctOf(count, total);
  const companies = n?.companies ?? [];
  return {
    id: spec.id,
    label: spec.label,
    count,
    pct,
    fill: spec.fill,
    numColor: spec.numColor,
    dashed: spec.dashed ?? null,
    outside: pct < BAR_INSIDE_MIN_PCT,
    title: `${spec.label} ${count}개사: ${companies.map((c) => c.name).join(', ')}`,
    names: spec.noNames ? '' : companyListText(companies),
    ...(n?.hint ? { hint: n.hint } : {}),
  };
}

const ariaOf = (title: string, segs: BarSegment[], total: number) => `${title}: ${segs.map((s) => `${s.label} ${s.count}`).join(', ')} (${total}개사)`;

/** 트리가 없거나 회사가 0 이면 null. count 0 구간은 막대에서 빠지고 omitted 에 라벨이 남는다 */
export function buildSourcingBars(tree: SourcingTree | null | undefined): SourcingBars | null {
  if (!tree || tree.root.count === 0) return null;
  const total = tree.root.count;
  const kid = (id: TreeNodeId) => tree.root.children.find((c) => c.id === id);
  const leaf = (id: TreeNodeId) => tree.leaves.find((l) => l.id === id);

  const spec1: SegSpec[] = [
    // 자체 설계는 막대 2 에서 세분되므로 범례에 회사명을 쓰지 않는다
    { node: kid('inhouse_design'), id: 'inhouse_design', label: '자체 설계', fill: BOARD_COLOR.G1, numColor: WHITE, noNames: true },
    { node: kid('external_module'), id: 'external_module', label: '외부 설계', fill: BOARD_COLOR.G3, numColor: WHITE },
    { node: kid('unknown'), id: 'unknown', label: '공개 근거 없음', fill: INK[300], numColor: INK[900] },
  ];
  const spec2: SegSpec[] = [
    { node: leaf('inhouse_all'), id: 'inhouse_all', label: '자체 생산', fill: BOARD_COLOR.G1, numColor: WHITE },
    { node: leaf('inhouse_parts_bought'), id: 'inhouse_parts_bought', label: '속 부품만 구매', fill: BOARD_SOFT.info, numColor: BOARD_COLOR.G1, dashed: BOARD_COLOR.G1 },
    { node: leaf('inhouse_design_external_mfg'), id: 'inhouse_design_external_mfg', label: '제조 위탁', fill: BOARD_COLOR.G2, numColor: WHITE },
    { node: leaf('external_module'), id: 'external_module', label: '완성 모듈 구매', fill: BOARD_COLOR.G3, numColor: WHITE },
    { node: leaf('unknown'), id: 'unknown', label: '공개 근거 없음', fill: INK[300], numColor: INK[900] },
  ];
  const all1 = spec1.map((s) => toSegment(s, total));
  const all2 = spec2.map((s) => toSegment(s, total));
  const bar1 = all1.filter((s) => s.count > 0);
  const bar2 = all2.filter((s) => s.count > 0);
  const omitted: string[] = [];
  for (const s of [...all1, ...all2]) if (s.count === 0 && !omitted.includes(s.label)) omitted.push(s.label);

  return {
    total,
    ...(typeof tree.robotCount === 'number' ? { robotCount: tree.robotCount } : {}),
    bar1,
    bar2,
    omitted,
    ariaLabel1: ariaOf(BAR_LEGEND_TITLE.bar1, bar1, total),
    ariaLabel2: ariaOf(BAR_LEGEND_TITLE.bar2, bar2, total),
  };
}

/** 범례 한 줄의 조각 — 웹과 정적 HTML 이 같은 문구를 쓴다: **{head}**{names}{hint} */
export function legendParts(s: BarSegment): { head: string; names: string; hint: string } {
  return { head: `${s.label} ${s.count}개사`, names: s.names ? `: ${s.names}` : '', hint: s.hint ? ` — ${s.hint}` : '' };
}

/** 막대 1 캡션 — 회사 수·로봇 수 기준 */
export const bar1Caption = (bars: SourcingBars) =>
  `${BAR_CAPTION.bar1} (회사 ${bars.total}개사${typeof bars.robotCount === 'number' ? ` · 로봇 ${bars.robotCount}기` : ''} 기준)`;
