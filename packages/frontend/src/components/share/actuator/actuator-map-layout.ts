/**
 * 액추에이터 포지션 맵 — 순수 레이아웃 계산 (React/DOM 의존 없음).
 * ActuatorPositionMap.tsx(SVG 렌더)와 actuator-map-html.ts(다운로드 HTML의 SVG 문자열)가 같은 결과를 그린다.
 *
 *  X: 제어 난이도 지수 0~10 = 10 × (wL·보행 + wD·clamp((DOF−10)/40) + wH·clamp(손DOF/24) + wS·clamp(속도/5)) / Σw
 *  Y: 액추에이터 타입(범주) / 본체 무게 / 가반하중 / 가격(로그, 기하평균 + 범위 막대)
 *  회사별 커버리지 = 같은 회사 2기 이상일 때 점 반경 16px 샘플의 convex hull.
 *  라벨은 근접 8후보 → 원거리 8후보(리더선) → 최소 충돌 후보 순으로 배치한다.
 *
 * 점 색 = 조달 태세 4단계(자체 개발 확인 / 자체+외판 / 외부 조달·혼합 / 확인 불가=속 빈 링). 지역은 색이 아니라 필터·툴팁·표로만 쓴다.
 * 커버리지 영역(hull)은 무채색이다.
 * 색은 chartColors 토큰만 사용한다 (새 hex 없음).
 */

import { CHART_HUE_MUTED } from '@/app/events/wrc2026/components/chartColors';
import type { ActuatorMapRegion, ActuatorMapRobot, DifficultyWeights, RobotPrice, SourcingPosture } from '@/types/actuator-map';
import { DEFAULT_POSTURES, POSTURE_COLOR, POSTURE_HOLLOW, POSTURE_LABEL, postureDetailLabel, postureOf } from './actuator-sourcing';

export type YAxisKey = 'type' | 'size' | 'payload' | 'price';
export type RegionGroup = 'na' | 'cn' | 'eu' | 'other';

export const Y_AXIS_OPTIONS: { value: YAxisKey; label: string }[] = [
  { value: 'type', label: '액추에이터 타입' },
  { value: 'size', label: '크기(무게)' },
  { value: 'payload', label: '가반하중' },
  { value: 'price', label: '가격' },
];

/** 유럽·한국·일본은 한 필터로 묶는다 (북미·중국·유럽/한국/일본·기타) */
export const REGION_GROUP_OF: Record<ActuatorMapRegion, RegionGroup> = {
  na: 'na',
  cn: 'cn',
  eu: 'eu',
  kr: 'eu',
  jp: 'eu',
  other: 'other',
};
export const REGION_GROUPS: RegionGroup[] = ['na', 'cn', 'eu', 'other'];
export const REGION_GROUP_LABEL: Record<RegionGroup, string> = {
  na: '북미',
  cn: '중국',
  eu: '유럽·한국·일본',
  other: '기타',
};
export const REGION_LABEL: Record<ActuatorMapRegion, string> = {
  na: '북미',
  cn: '중국',
  eu: '유럽',
  kr: '한국',
  jp: '일본',
  other: '기타',
};

export const CHART_W = 1100;
export const CHART_H = 640;
export const MARGIN = { t: 28, r: 40, b: 64, l: 170 } as const;

/** 커버리지 영역(hull) 무채색 — 채움 0.10 · 테두리 0.45 불투명도로 그린다 */
export const HULL_COLOR = CHART_HUE_MUTED;

export interface LayoutOptions {
  yAxis: YAxisKey;
  regions: Record<RegionGroup, boolean>;
  /** 조달 태세 필터 (기본 전부 true) */
  postures: Record<SourcingPosture, boolean>;
  hull: boolean;
  showLG: boolean;
  includeForecast: boolean;
  weights: DifficultyWeights;
  typeOrder: string[];
}

export const DEFAULT_REGIONS: Record<RegionGroup, boolean> = { na: true, cn: true, eu: true, other: true };

export function defaultLayoutOptions(weights: DifficultyWeights, typeOrder: string[]): LayoutOptions {
  return { yAxis: 'type', regions: { ...DEFAULT_REGIONS }, postures: { ...DEFAULT_POSTURES }, hull: true, showLG: true, includeForecast: false, weights, typeOrder };
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** 서버 computeDifficulty 와 동일 공식 */
export function difficultyOf(r: ActuatorMapRobot, w: DifficultyWeights): number {
  const L = r.locomotion === 'bipedal' ? 1 : r.locomotion === 'hybrid' ? 0.5 : 0;
  const D = clamp01(((r.dof ?? 0) - 10) / 40);
  const H = clamp01((r.handDof ?? 0) / 24);
  const S = clamp01((r.speed ?? 0) / 5);
  const sum = w.L + w.D + w.H + w.S || 1;
  return (10 * (w.L * L + w.D * D + w.H * H + w.S * S)) / sum;
}

export function formulaText(w: DifficultyWeights): string {
  const s = w.L + w.D + w.H + w.S || 1;
  return `난이도 = 10 × ( ${w.L}·보행 + ${w.D}·clamp((DOF−10)/40) + ${w.H}·clamp(손DOF/24) + ${w.S}·clamp(속도/5) ) / ${s}`;
}

export const fmtUSD = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`;
export const priceText = (p: RobotPrice | null) => (!p ? '미공개' : p.min === p.max ? fmtUSD(p.min) : `${fmtUSD(p.min)} – ${fmtUSD(p.max)}`);
export const numText = (v: number | null | undefined, unit = '') => (v == null ? '—' : `${v}${unit}`);

export const Y_DEF: Record<
  YAxisKey,
  { title: string; axis: string; kind: 'cat' | 'lin' | 'log'; val: (r: ActuatorMapRobot) => number | string | null; fmt: (v: number | string) => string }
> = {
  type: { title: '액추에이터 타입 × 제어 난이도', axis: '액추에이터 타입 (DB 근거)', kind: 'cat', val: (r) => r.actuatorTypeLabel, fmt: (v) => String(v) },
  size: { title: '크기(본체 무게) × 제어 난이도', axis: '본체 무게 (kg)', kind: 'lin', val: (r) => r.weight, fmt: (v) => `${v} kg` },
  payload: { title: '가반하중 × 제어 난이도', axis: '가반하중 (kg)', kind: 'lin', val: (r) => r.payload, fmt: (v) => `${v} kg` },
  price: {
    title: '가격 × 제어 난이도',
    axis: '가격 (USD, 로그 스케일)',
    kind: 'log',
    val: (r) => (r.price ? Math.sqrt(r.price.min * r.price.max) : null),
    fmt: (v) => fmtUSD(Number(v)),
  },
};

/** 차트에 올릴 수 있는 로봇 (스펙 완결 + 지역/조달 태세/LG/예측 필터) */
export function visibleRobots(robots: ActuatorMapRobot[], o: LayoutOptions): ActuatorMapRobot[] {
  const postures = o.postures ?? DEFAULT_POSTURES;
  return robots.filter(
    (r) =>
      !r.incomplete &&
      o.regions[REGION_GROUP_OF[r.region]] &&
      postures[postureOf(r)] !== false &&
      (o.showLG || !r.isLG) &&
      (o.includeForecast || !r.forecast)
  );
}

export interface LabelPlacement {
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
  leader: { x2: number; y2: number } | null;
}

export interface PlottedPoint {
  robot: ActuatorMapRobot;
  /** 제어 난이도 지수 */
  x: number;
  yValue: number | string;
  px: number;
  py: number;
  /** 조달 태세 색 (확인 불가는 회색 링 테두리 색) */
  color: string;
  posture: SourcingPosture;
  /** true 면 흰 채움 + 색 테두리 링으로 그린다 (확인 불가) */
  hollow: boolean;
  ariaLabel: string;
  label: LabelPlacement;
}

export interface HullShape {
  company: string;
  d: string;
  color: string;
  label: { x: number; y: number; anchor: 'start' | 'middle' | 'end' };
}

export interface ChartLayout {
  width: number;
  height: number;
  plot: { x: number; y: number; w: number; h: number };
  title: string;
  yAxisTitle: string;
  xAxisTitle: string;
  xTicks: { x: number; label: string }[];
  yTicks: { y: number; label: string }[];
  /** 범주 축 행 구분선 y / 수치 축 격자 y */
  gridY: number[];
  points: PlottedPoint[];
  hulls: HullShape[];
  priceBars: { px: number; y1: number; y2: number; color: string }[];
  /** 필터는 통과했지만 Y값이 없어 제외된 수 */
  excludedCount: number;
  meta: string;
  formula: string;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const overlaps = (a: Box, b: Box) => !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);

/** 라벨 폭 추정 — ASCII 6.6px, 그 외(한글 등) 11px */
export function labelWidth(s: string): number {
  let w = 6;
  for (const ch of s) w += ch.charCodeAt(0) < 128 ? 6.6 : 11;
  return w;
}

function niceTicks(min: number, max: number, n = 6): number[] {
  const span = max - min || 1;
  const step0 = span / n;
  const p = Math.pow(10, Math.floor(Math.log10(step0)));
  const err = step0 / p;
  const step = (err >= 5 ? 10 : err >= 2 ? 5 : err >= 1 ? 2 : 1) * p;
  const t: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) t.push(+v.toFixed(6));
  return t;
}

type Pt = [number, number];

/** Andrew monotone chain */
export function convexHull(points: Pt[]): Pt[] {
  const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: Pt[] = [];
  for (const p of pts) {
    while (lo.length >= 2 && cross(lo[lo.length - 2]!, lo[lo.length - 1]!, p) <= 0) lo.pop();
    lo.push(p);
  }
  const up: Pt[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]!;
    while (up.length >= 2 && cross(up[up.length - 2]!, up[up.length - 1]!, p) <= 0) up.pop();
    up.push(p);
  }
  up.pop();
  lo.pop();
  return lo.concat(up);
}

export function paddedHull(points: Pt[], pad: number): Pt[] {
  const samples: Pt[] = [];
  for (const [x, y] of points) {
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      samples.push([x + pad * Math.cos(a), y + pad * Math.sin(a)]);
    }
  }
  return convexHull(samples);
}

export function hullPath(poly: Pt[]): string {
  return `M${poly.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L')}Z`;
}

export type Cand = [number, number, 'start' | 'middle' | 'end'];
export const boxOf = (c: Cand, w: number, h: number): Box => ({ x: c[2] === 'start' ? c[0] : c[2] === 'end' ? c[0] - w : c[0] - w / 2, y: c[1] - h, w, h });

export function buildLayout(robots: ActuatorMapRobot[], o: LayoutOptions): ChartLayout {
  const yd = Y_DEF[o.yAxis];
  const W = CHART_W;
  const H = CHART_H;
  const M = MARGIN;
  const pw = W - M.l - M.r;
  const ph = H - M.t - M.b;

  const rows = visibleRobots(robots, o).map((r) => ({ r, x: difficultyOf(r, o.weights), y: yd.val(r) }));
  const plottedRows = rows.filter((d): d is { r: ActuatorMapRobot; x: number; y: number | string } => d.y != null);
  const excludedCount = rows.length - plottedRows.length;

  const sx = (v: number) => M.l + (v / 10) * pw;
  let sy: (v: number | string) => number;
  let yTicks: { y: number; label: string }[] = [];
  const gridY: number[] = [];
  let catRows: string[] = [];

  if (yd.kind === 'cat') {
    const present = new Set(plottedRows.map((d) => String(d.y)));
    catRows = o.typeOrder.filter((t) => present.has(t));
    for (const t of present) if (!catRows.includes(t)) catRows.push(t);
    const rh = ph / Math.max(catRows.length, 1);
    sy = (v) => M.t + (catRows.indexOf(String(v)) + 0.5) * rh;
    yTicks = catRows.map((t) => ({ y: sy(t), label: t }));
    catRows.forEach((_, i) => {
      if (i > 0) gridY.push(M.t + i * rh);
    });
  } else if (yd.kind === 'log') {
    const vals = plottedRows.flatMap((d) => (d.r.price ? [d.r.price.min, d.r.price.max] : [Number(d.y)])).filter((v) => v > 0);
    const lo = Math.log10((vals.length ? Math.min(...vals) : 1000) / 1.4);
    const hi = Math.log10((vals.length ? Math.max(...vals) : 100000) * 1.4);
    sy = (v) => M.t + ph - ((Math.log10(Number(v)) - lo) / (hi - lo || 1)) * ph;
    for (let e = Math.floor(lo); e <= Math.ceil(hi); e++) {
      for (const m of [1, 2, 5]) {
        const v = m * Math.pow(10, e);
        if (Math.log10(v) >= lo && Math.log10(v) <= hi) {
          yTicks.push({ y: sy(v), label: v >= 1000 ? `$${v / 1000}K` : `$${v}` });
          gridY.push(sy(v));
        }
      }
    }
  } else {
    const max = Math.max(...plottedRows.map((d) => Number(d.y)), 1) * 1.12;
    sy = (v) => M.t + ph - (Number(v) / max) * ph;
    for (const t of niceTicks(0, max, 6)) {
      yTicks.push({ y: sy(t), label: String(t) });
      gridY.push(sy(t));
    }
  }

  const xTicks = [0, 2, 4, 6, 8, 10].map((t) => ({ x: sx(t), label: String(t) }));

  // 좌표 (범주 축은 같은 행에서 x가 가까우면 세로로 살짝 분산)
  const pts = plottedRows.map((d) => ({ ...d, px: sx(d.x), py: sy(d.y) }));
  if (yd.kind === 'cat') {
    for (const t of catRows) {
      const same = pts.filter((d) => d.y === t).sort((a, b) => a.px - b.px);
      same.forEach((d, i) => {
        const near = same.some((other) => other !== d && Math.abs(other.px - d.px) < 26);
        if (near) d.py += ((i % 3) - 1) * 14;
      });
    }
  }

  // 커버리지 헐
  const hullBoxes: { company: string; color: string; d: string; minX: number; maxX: number; minY: number; maxY: number }[] = [];
  if (o.hull) {
    const byCo = new Map<string, typeof pts>();
    for (const d of pts) byCo.set(d.r.company, [...(byCo.get(d.r.company) ?? []), d]);
    for (const [company, ds] of byCo) {
      if (ds.length < 2) continue;
      const poly = paddedHull(ds.map((d) => [d.px, d.py] as Pt), 16);
      const xs = poly.map((p) => p[0]);
      const ys = poly.map((p) => p[1]);
      hullBoxes.push({
        company,
        color: HULL_COLOR,
        d: hullPath(poly),
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
      });
    }
  }

  const priceBars: ChartLayout['priceBars'] = [];
  if (o.yAxis === 'price') {
    for (const d of pts) {
      const p = d.r.price;
      if (p && p.min !== p.max) priceBars.push({ px: d.px, y1: sy(p.min), y2: sy(p.max), color: POSTURE_COLOR[postureOf(d.r)] });
    }
  }

  // 점 라벨 배치 (x 오름차순)
  const placed: Box[] = [];
  const out = (b: Box) => (b.x < M.l - 120 || b.x + b.w > W - 4 || b.y < M.t - 16 || b.y + b.h > M.t + ph + 8 ? 10 : 0);
  const points: PlottedPoint[] = [];
  for (const d of [...pts].sort((a, b) => a.px - b.px)) {
    const name = d.r.name;
    const w = labelWidth(name);
    const h = 13;
    const near: Cand[] = [
      [d.px + 10, d.py + 4, 'start'],
      [d.px - 10, d.py + 4, 'end'],
      [d.px, d.py - 12, 'middle'],
      [d.px, d.py + 20, 'middle'],
      [d.px + 9, d.py - 9, 'start'],
      [d.px + 9, d.py + 17, 'start'],
      [d.px - 9, d.py - 9, 'end'],
      [d.px - 9, d.py + 17, 'end'],
    ];
    const far: Cand[] = [
      [d.px + 26, d.py - 22, 'start'],
      [d.px + 26, d.py + 30, 'start'],
      [d.px - 26, d.py - 22, 'end'],
      [d.px - 26, d.py + 30, 'end'],
      [d.px, d.py - 30, 'middle'],
      [d.px, d.py + 38, 'middle'],
      [d.px + 34, d.py + 4, 'start'],
      [d.px - 34, d.py + 4, 'end'],
    ];
    const score = (c: Cand) => {
      const box = boxOf(c, w, h);
      return (
        out(box) +
        placed.filter((b) => overlaps(b, box)).length * 2 +
        pts.filter((other) => other !== d && other.px > box.x - 9 && other.px < box.x + w + 9 && other.py > box.y - 9 && other.py < box.y + h + 9).length * 3
      );
    };
    let pick: Cand | null = null;
    let isFar = false;
    for (const c of near) if (score(c) === 0) { pick = c; break; }
    if (!pick) for (const c of far) if (score(c) === 0) { pick = c; isFar = true; break; }
    if (!pick) {
      let best = Infinity;
      for (const c of [...near, ...far]) {
        const sc = score(c);
        if (sc < best) { best = sc; pick = c; isFar = far.includes(c); }
      }
    }
    const chosen = pick ?? near[0]!;
    placed.push(boxOf(chosen, w, h));
    const leader = isFar ? { x2: chosen[2] === 'start' ? chosen[0] - 2 : chosen[2] === 'end' ? chosen[0] + 2 : chosen[0], y2: chosen[1] - 5 } : null;
    points.push({
      robot: d.r,
      x: d.x,
      yValue: d.y,
      px: d.px,
      py: d.py,
      color: POSTURE_COLOR[postureOf(d.r)],
      posture: postureOf(d.r),
      hollow: POSTURE_HOLLOW[postureOf(d.r)],
      ariaLabel: `${d.r.name} (${d.r.company}) 난이도 ${d.x.toFixed(1)} · ${o.yAxis === 'price' ? priceText(d.r.price) : yd.fmt(d.y)} · 조달 태세 ${POSTURE_LABEL[postureOf(d.r)]}`,
      label: { x: chosen[0], y: chosen[1], anchor: chosen[2], leader },
    });
  }

  // 회사명 라벨: 헐 바깥 상·하·우·좌 중 점·라벨과 겹치지 않는 첫 위치
  const hulls: HullShape[] = [];
  for (const hb of hullBoxes) {
    const w = labelWidth(hb.company) + 4;
    const hh = 13;
    const cx = (hb.minX + hb.maxX) / 2;
    const cy = (hb.minY + hb.maxY) / 2;
    const cands: Cand[] = [
      [cx, hb.minY - 6, 'middle'],
      [cx, hb.maxY + 14, 'middle'],
      [hb.maxX + 6, cy + 4, 'start'],
      [hb.minX - 6, cy + 4, 'end'],
      [hb.minX, hb.minY - 6, 'start'],
      [hb.maxX, hb.minY - 6, 'end'],
      [hb.minX, hb.maxY + 14, 'start'],
      [hb.maxX, hb.maxY + 14, 'end'],
      [cx, hb.minY - 20, 'middle'],
      [cx, hb.maxY + 28, 'middle'],
      [hb.maxX + 18, hb.minY - 10, 'start'],
      [hb.minX - 18, hb.minY - 10, 'end'],
      [hb.maxX + 18, hb.maxY + 20, 'start'],
      [hb.minX - 18, hb.maxY + 20, 'end'],
      [hb.maxX + 22, cy + 4, 'start'],
      [hb.minX - 22, cy + 4, 'end'],
    ];
    const score = (c: Cand) => {
      const box = boxOf(c, w, hh);
      return (
        out(box) +
        placed.filter((b) => overlaps(b, box)).length * 2 +
        pts.filter((p) => p.px > box.x - 14 && p.px < box.x + w + 14 && p.py > box.y - 12 && p.py < box.y + hh + 12).length * 3
      );
    };
    let pick = cands[0]!;
    let best = Infinity;
    for (const c of cands) {
      const sc = score(c);
      if (sc < best) { best = sc; pick = c; }
      if (sc === 0) break;
    }
    placed.push(boxOf(pick, w, hh));
    hulls.push({ company: hb.company, d: hb.d, color: hb.color, label: { x: pick[0], y: pick[1], anchor: pick[2] } });
  }

  const w = o.weights;
  const excludedWord = o.yAxis === 'price' ? '가격 미공개' : '값 없음';
  const meta = `로봇 ${points.length}기 표시${excludedCount ? ` · ${excludedWord} ${excludedCount}기 제외(표 참조)` : ''} · X = 제어 난이도 지수 0~10 (가중치 L${w.L}/D${w.D}/H${w.H}/S${w.S})`;

  return {
    width: W,
    height: H,
    plot: { x: M.l, y: M.t, w: pw, h: ph },
    title: yd.title,
    yAxisTitle: yd.axis,
    xAxisTitle: '제어 난이도 지수 →  (0 바퀴·저자유도 … 10 이족·고자유도·고속)',
    xTicks,
    yTicks,
    gridY,
    points,
    hulls,
    priceBars,
    excludedCount,
    meta,
    formula: formulaText(w),
  };
}

/** LG 기준점 다이아몬드 path (중심 px,py · 반지름 s) */
export function diamondPath(px: number, py: number, s: number): string {
  return `M${px},${py - s}L${px + s},${py}L${px},${py + s}L${px - s},${py}Z`;
}

export interface CoverageRow {
  company: string;
  region: RegionGroup;
  models: string[];
  xMin: number;
  xMax: number;
  yRange: string;
  types: string[];
  /** 회사 단위 조달 태세 (자체+외판 > 자체 > 외부 > 확인 불가 우선) — 상세 라벨 */
  posture: string;
}

const POSTURE_PRIORITY: SourcingPosture[] = ['in_house_sells', 'in_house', 'external', 'unknown'];

/** 회사 로봇들의 조달 태세 요약 — 가장 우선순위 높은 태세의 라벨 + 해당 로봇 수 ("자체 개발(확인·B) 2기 / 확인 불가 1기") */
export function companyPostureText(robots: ActuatorMapRobot[]): string {
  const parts: string[] = [];
  for (const p of POSTURE_PRIORITY) {
    const rs = robots.filter((r) => postureOf(r) === p);
    if (rs.length === 0) continue;
    parts.push(robots.length === 1 ? postureDetailLabel(rs[0]!.sourcing) : `${POSTURE_LABEL[p]} ${rs.length}기`);
  }
  return parts.join(' · ');
}

/** 회사별 커버리지 요약 (현재 Y축 기준) */
export function coverageRows(layout: ChartLayout, yAxis: YAxisKey): CoverageRow[] {
  const yd = Y_DEF[yAxis];
  const byCo = new Map<string, PlottedPoint[]>();
  for (const p of layout.points) byCo.set(p.robot.company, [...(byCo.get(p.robot.company) ?? []), p]);
  return [...byCo.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([company, ds]) => {
      const xs = ds.map((d) => d.x);
      let yRange: string;
      if (yd.kind === 'cat') yRange = [...new Set(ds.map((d) => String(d.yValue)))].join(', ');
      else if (yAxis === 'price') {
        const ps = ds.map((d) => d.robot.price).filter((p): p is RobotPrice => !!p);
        yRange = ps.length ? `${fmtUSD(Math.min(...ps.map((p) => p.min)))} – ${fmtUSD(Math.max(...ps.map((p) => p.max)))}` : '미공개';
      } else {
        const ys = ds.map((d) => Number(d.yValue));
        const lo = Math.min(...ys);
        const hi = Math.max(...ys);
        yRange = lo === hi ? yd.fmt(lo) : `${yd.fmt(lo)} – ${yd.fmt(hi)}`;
      }
      return {
        company,
        region: REGION_GROUP_OF[ds[0]!.robot.region],
        models: ds.map((d) => d.robot.name),
        xMin: Math.min(...xs),
        xMax: Math.max(...xs),
        yRange,
        types: [...new Set(ds.map((d) => d.robot.actuatorTypeLabel))],
        posture: companyPostureText(ds.map((d) => d.robot)),
      };
    });
}
