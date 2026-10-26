/**
 * 공급사 제품 맵 — 순수 레이아웃 계산 (React/DOM 의존 없음).
 * ActuatorSupplierMarketMap.tsx(SVG 렌더)와 actuator-map-html.ts(다운로드 HTML의 SVG 문자열)가 같은 결과를 그린다.
 *
 *  Y(공유): 피크 토크 Nm, 로그. X(우측 플롯): 가격 USD, 로그. 가격 미공개 제품은 좌측 레인에 실제 토크 높이로만 놓는다.
 *  토크 미공개 제품은 그래프에서 제외하고 목록으로만 알린다. LG(isLG) 제품은 점이 아니라 "직경 대응 제품의 토크 범위" 추정 밴드로 표시한다(가설).
 *  가격 공개 제품 3개 이상일 때만 "공개 가격 데이터가 없는 구간" 주석을 그린다. 단정하지 않고 (가설)로 표기한다.
 *
 * 색은 actuator-sourcing.ts(chartColors 토큰)만 사용한다.
 */

import type { ActuatorAdoptionCase, ActuatorSupplierProduct, MarketSegment } from '@/types/actuator-map';
import { boxOf, fmtUSD, labelWidth, overlaps, type Box, type Cand } from './actuator-map-layout';
import { SEGMENT_COLOR, SEGMENT_HOLLOW, SEGMENT_LABEL, SEGMENT_ORDER, adoptionBySegment, levelOf, splitVendors } from './actuator-sourcing';

export const MARKET_W = 1100;
export const MARKET_H = 640;
const M = { t: 44, r: 24, b: 70, l: 64 } as const;
const LANE_W = 250;
const LANE_GAP = 22;

export const LANE = { x: M.l, w: LANE_W };
export const PLOT = { x: M.l + LANE_W + LANE_GAP, y: M.t, w: MARKET_W - M.r - (M.l + LANE_W + LANE_GAP), h: MARKET_H - M.t - M.b };

export const DEFAULT_MARKET_SEGMENTS: Record<MarketSegment, boolean> = {
  tier1_oem: true,
  tier2_legged: true,
  research_edu: true,
  industrial_cobot: true,
  service: true,
  captive: true,
  other: true,
};

export interface MarketOptions {
  segments: Record<MarketSegment, boolean>;
}

export function defaultMarketOptions(): MarketOptions {
  return { segments: { ...DEFAULT_MARKET_SEGMENTS } };
}

export interface MarketLabel {
  text: string;
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
  /** 점에서 라벨까지 꺾인 선 (없으면 null) */
  leader: [number, number][] | null;
}

export interface MarketPoint {
  supplier: ActuatorSupplierProduct;
  px: number;
  py: number;
  /** true = 가격 미공개 레인 */
  lane: boolean;
  color: string;
  /** true = 흰 채움 + 테두리 링 (자사 전용) */
  hollow: boolean;
  segment: MarketSegment;
  ariaLabel: string;
  label: MarketLabel;
}

export interface MarketBand {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  /** 라벨 줄 (48자 줄바꿈 적용) */
  labelLines: string[];
  labelInside: boolean;
  labelX: number;
  /** 첫 줄 baseline */
  labelY: number;
  peerCount: number;
  tMin: number;
  tMax: number;
  dMin: number;
  dMax: number;
}

export interface MarketGap {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  lines: string[];
  labelX: number;
  labelY: number;
  maxPriced: number;
}

export interface MarketCounts {
  total: number;
  /** 가격 공개 (우측 플롯) */
  plotted: number;
  /** 가격 미공개 (좌측 레인) */
  lane: number;
  /** 토크 미공개 (제외) */
  noTorque: number;
  lg: number;
  /** 세그먼트 필터를 통과해 실제로 그려진 점 */
  visible: number;
}

export interface MarketLayout {
  width: number;
  height: number;
  plot: { x: number; y: number; w: number; h: number };
  lane: { x: number; w: number };
  title: string;
  xAxisTitle: string;
  yAxisTitle: string;
  laneTitle: string;
  plotTitle: string;
  xTicks: { x: number; label: string }[];
  yTicks: { y: number; label: string }[];
  points: MarketPoint[];
  band: MarketBand | null;
  /** LG 제품은 있으나 비교 제품이 부족해 밴드를 그릴 수 없을 때의 안내 */
  bandNote: { text: string; x: number; y: number; anchor: 'end' } | null;
  gap: MarketGap | null;
  excludedNoTorque: { vendor: string; model: string; label: string }[];
  counts: MarketCounts;
  /** 세그먼트별 그려진 점 수 (필터 무관) */
  segmentCounts: Record<MarketSegment, number>;
  meta: string;
  lg: ActuatorSupplierProduct | null;
}

// ── 텍스트 도우미 ────────────────────────────────────────────────────────────

const stripParens = (s: string) => s.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();

/** 공급사명 접두어·괄호를 뗀 짧은 라벨 (18자 말줄임). 접두어를 떼면 정보가 사라지는 경우("RobStride 00" → "00")는 모델명을 유지한다. */
export function shortLabel(vendor: string, model: string): string {
  const base = stripParens(model);
  const v = stripParens(vendor);
  let out = base;
  for (const prefix of [v, v.split(' ')[0] ?? '']) {
    if (prefix && base.toLowerCase().startsWith(prefix.toLowerCase() + ' ')) {
      const rest = base.slice(prefix.length).trim();
      if (rest.length >= 4) {
        out = rest;
        break;
      }
    }
  }
  const chars = [...out];
  return chars.length > 18 ? `${chars.slice(0, 17).join('')}…` : out;
}

/** 단어 경계 우선 글자 수 줄바꿈 */
export function wrapChars(text: string, n: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const word of text.split(' ')) {
    let w = word;
    while ([...w].length > n) {
      if (cur) {
        lines.push(cur);
        cur = '';
      }
      lines.push([...w].slice(0, n).join(''));
      w = [...w].slice(n).join('');
    }
    const next = cur ? `${cur} ${w}` : w;
    if ([...next].length > n && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** 폭(px) 기준 줄바꿈 */
function wrapPx(text: string, maxPx: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const word of text.split(' ')) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && labelWidth(next) > maxPx) {
      lines.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  // 단어 하나가 maxPx 보다 길면 글자 단위로 자른다
  return lines.flatMap((l) => {
    if (labelWidth(l) <= maxPx) return [l];
    const out: string[] = [];
    let part = '';
    for (const ch of l) {
      if (labelWidth(part + ch) > maxPx && part) {
        out.push(part);
        part = ch;
      } else part += ch;
    }
    if (part) out.push(part);
    return out;
  });
}

const fmtNum = (v: number) => (v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10));
export const fmtTorque = (v: number | null | undefined) => (v == null ? '미공개' : `${fmtNum(v)} Nm`);
const tickLabel = (v: number) => (v >= 1000 ? `${v / 1000}K` : String(v));

function logTicks(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++) {
    for (const m of [1, 2, 5]) {
      const v = m * Math.pow(10, e);
      if (v >= lo && v <= hi) out.push(v);
    }
  }
  return out;
}

const validNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;

// ── 분류 ────────────────────────────────────────────────────────────────────

export interface MarketBuckets {
  plotted: ActuatorSupplierProduct[];
  lane: ActuatorSupplierProduct[];
  noTorque: ActuatorSupplierProduct[];
  lg: ActuatorSupplierProduct[];
}

/** 점(토크·가격 있음) / 레인(토크만) / 제외(토크 없음) / LG(밴드) 분류 — LG 는 토크 유무와 무관하게 밴드로만 */
export function classifyMarket(suppliers: ActuatorSupplierProduct[]): MarketBuckets {
  const b: MarketBuckets = { plotted: [], lane: [], noTorque: [], lg: [] };
  for (const s of suppliers ?? []) {
    if (!s) continue;
    if (s.isLG) b.lg.push(s);
    else if (!validNum(s.peakTorqueNm)) b.noTorque.push(s);
    else if (validNum(s.priceUsd)) b.plotted.push(s);
    else b.lane.push(s);
  }
  return b;
}

/** AXIUM 밴드의 비교 제품: 직경 범위 안, 피크 토크 있음, 모터 단품 제외 (경계 포함) */
export function bandPeers(suppliers: ActuatorSupplierProduct[], dMin: number, dMax: number): ActuatorSupplierProduct[] {
  return (suppliers ?? []).filter(
    (s) =>
      !s.isLG &&
      validNum(s.peakTorqueNm) &&
      typeof s.diameterMm === 'number' &&
      s.diameterMm >= dMin &&
      s.diameterMm <= dMax &&
      s.integrationLevel !== 'motor_only'
  );
}

export function ariaLabelOf(s: ActuatorSupplierProduct): string {
  return `${s.vendor} ${s.model} 피크 ${validNum(s.peakTorqueNm) ? fmtNum(s.peakTorqueNm) : '미공개'}Nm 가격 ${validNum(s.priceUsd) ? fmtUSD(s.priceUsd) : '미공개'} ${SEGMENT_LABEL[s.segment] ?? SEGMENT_LABEL.other}`;
}

// ── 레이아웃 ────────────────────────────────────────────────────────────────

export function buildMarketLayout(suppliers: ActuatorSupplierProduct[], adoptions: ActuatorAdoptionCase[], opts: MarketOptions = defaultMarketOptions()): MarketLayout {
  void adoptions; // 채택 사례는 툴팁·콜아웃(buildLgCallout)에서 쓰고 좌표에는 영향을 주지 않는다
  const { plotted, lane, noTorque, lg } = classifyMarket(suppliers);
  const total = (suppliers ?? []).filter(Boolean).length;
  const enabled = (s: ActuatorSupplierProduct) => opts.segments[s.segment] !== false;

  // 축 범위 — 필터와 무관하게 전체 제품 기준 (필터를 바꿔도 축이 움직이지 않는다)
  const torques = [...plotted, ...lane].map((s) => s.peakTorqueNm as number);
  const prices = plotted.map((s) => s.priceUsd as number);
  const yLo = Math.log10(torques.length ? Math.min(...torques) / 1.5 : 1);
  const yHi = Math.log10(torques.length ? Math.max(...torques) * 1.5 : 1000);
  const xLo = Math.log10(prices.length ? Math.min(...prices) / 1.6 : 100);
  const xHi = Math.log10(prices.length ? Math.max(Math.max(...prices) * 8, 3000) : 3000);
  const sy = (t: number) => PLOT.y + PLOT.h - ((Math.log10(t) - yLo) / (yHi - yLo || 1)) * PLOT.h;
  const sx = (p: number) => PLOT.x + ((Math.log10(p) - xLo) / (xHi - xLo || 1)) * PLOT.w;

  const yTicks = logTicks(10 ** yLo, 10 ** yHi).map((v) => ({ y: sy(v), label: tickLabel(v) }));
  const xTicks = logTicks(10 ** xLo, 10 ** xHi).map((v) => ({ x: sx(v), label: `$${tickLabel(v)}` }));

  // LG 밴드
  const lgProduct = lg[0] ?? null;
  let band: MarketBand | null = null;
  let bandNote: MarketLayout['bandNote'] = null;
  const placed: Box[] = [];
  if (lgProduct) {
    const dMin = lgProduct.diameterRangeMm?.min ?? 40;
    const dMax = lgProduct.diameterRangeMm?.max ?? 120;
    const peers = bandPeers(suppliers, dMin, dMax);
    if (peers.length >= 3) {
      const ts = peers.map((s) => s.peakTorqueNm as number);
      const tMin = Math.min(...ts);
      const tMax = Math.max(...ts);
      const nProducts = /(\d+)\s*product lines/i.exec(lgProduct.model)?.[1];
      const lines = [
        `LG AXIUM Φ${dMin}–Φ${dMax}${nProducts ? ` (${nProducts}종)` : ''}`,
        '토크·가격 미공개 → 가격 전 구간 가능',
        ...wrapChars(`밴드 = 직경 ${dMin}–${dMax}mm 통합 제품 ${peers.length}개의 피크 토크 범위(${fmtNum(tMin)}–${fmtNum(tMax)} Nm)로 환산한 추정(가설), LG 공개값 아님`, 48),
      ];
      const y1 = sy(tMax);
      const y2 = sy(tMin);
      const inside = y2 - y1 >= lines.length * 13 + 10;
      const labelX = PLOT.x + PLOT.w - 8;
      let labelY = inside ? y1 + 14 : y1 - 6 - (lines.length - 1) * 13;
      if (labelY < PLOT.y + 10) labelY = PLOT.y + 10;
      band = { x1: LANE.x, x2: PLOT.x + PLOT.w, y1, y2, labelLines: lines, labelInside: inside, labelX, labelY, peerCount: peers.length, tMin, tMax, dMin, dMax };
      const w = Math.max(...lines.map(labelWidth));
      placed.push({ x: labelX - w, y: labelY - 11, w, h: lines.length * 13 });
    } else {
      const text = 'LG AXIUM: 직경 대응 비교 제품 부족으로 위치 표시 불가';
      bandNote = { text, x: PLOT.x + PLOT.w - 8, y: PLOT.y + 16, anchor: 'end' };
      placed.push({ x: bandNote.x - labelWidth(text), y: bandNote.y - 11, w: labelWidth(text), h: 13 });
    }
  }

  // 빈 구간 주석 (가설) — 가격 공개 점 3개 이상일 때만
  let gap: MarketGap | null = null;
  if (plotted.length >= 3) {
    const maxPriced = Math.max(...prices);
    const x1 = sx(maxPriced * 1.6);
    const x2 = PLOT.x + PLOT.w;
    if (x2 - x1 > 60) {
      const w = x2 - x1;
      const lines = [
        ...wrapPx('(가설) 중가 통합 모듈+신뢰성 구간', w - 16),
        ...wrapPx(`가격 공개 제품은 모두 ${fmtUSD(maxPriced)} 이하이며 이 구간의 공개 가격 데이터는 없음`, w - 16),
      ];
      const labelX = x1 + w / 2;
      const boxW = Math.max(...lines.map(labelWidth));
      const mk = (y0: number): Box => ({ x: labelX - boxW / 2, y: y0 - 11, w: boxW, h: lines.length * 13 });
      const topY = PLOT.y + 16;
      const bottomY = PLOT.y + PLOT.h - 30 - (lines.length - 1) * 13;
      const labelY = placed.some((b) => overlaps(b, mk(topY))) ? bottomY : topY;
      gap = { x1, x2, y1: PLOT.y, y2: PLOT.y + PLOT.h, lines, labelX, labelY, maxPriced };
      placed.push(mk(labelY));
    }
  }

  // 점 좌표
  type Pt = { s: ActuatorSupplierProduct; px: number; py: number; lane: boolean };
  const platePts: Pt[] = plotted.filter(enabled).map((s) => ({ s, px: sx(s.priceUsd as number), py: sy(s.peakTorqueNm as number), lane: false }));
  const lanePts: Pt[] = lane
    .filter(enabled)
    .map((s) => ({ s, px: LANE.x + 16, py: sy(s.peakTorqueNm as number), lane: true }))
    .sort((a, b) => a.py - b.py);
  // 레인: 같은 y(±6px)에서 겹치면 x 를 +8px 씩 최대 3열로 흩는다
  lanePts.forEach((d, i) => {
    const used = new Set<number>();
    for (let k = 0; k < i; k++) {
      const o = lanePts[k]!;
      if (Math.abs(o.py - d.py) <= 6) used.add(Math.round((o.px - (LANE.x + 16)) / 8));
    }
    let col = 0;
    while (used.has(col) && col < 2) col++;
    d.px = LANE.x + 16 + col * 8;
  });

  const points: MarketPoint[] = [];
  const mkPoint = (d: Pt, label: MarketLabel): MarketPoint => ({
    supplier: d.s,
    px: d.px,
    py: d.py,
    lane: d.lane,
    color: SEGMENT_COLOR[d.s.segment] ?? SEGMENT_COLOR.other,
    hollow: SEGMENT_HOLLOW[d.s.segment] ?? false,
    segment: d.s.segment,
    ariaLabel: ariaLabelOf(d.s),
    label,
  });

  // 레인 라벨: y 오름차순 → 12.5px 간격으로 아래로 밀고, 하단을 넘으면 위로 되민다
  const LH = 12.5;
  const laneYs = lanePts.map((d) => d.py + 4);
  for (let i = 1; i < laneYs.length; i++) laneYs[i] = Math.max(laneYs[i]!, laneYs[i - 1]! + LH);
  const bottom = PLOT.y + PLOT.h - 2;
  if (laneYs.length && laneYs[laneYs.length - 1]! > bottom) {
    laneYs[laneYs.length - 1] = bottom;
    for (let i = laneYs.length - 2; i >= 0; i--) laneYs[i] = Math.min(laneYs[i]!, laneYs[i + 1]! - LH);
  }
  lanePts.forEach((d, i) => {
    const ly = laneYs[i]!;
    points.push(
      mkPoint(d, {
        text: shortLabel(d.s.vendor, d.s.model),
        x: LANE.x + 70,
        y: ly,
        anchor: 'start',
        leader: [
          [d.px + 6, d.py],
          [LANE.x + 60, ly - 4],
          [LANE.x + 67, ly - 4],
        ],
      })
    );
  });

  // 플롯 라벨: 근접 8후보 → 원거리 8후보(리더선) → 최소 충돌 (actuator-map-layout.buildLayout 과 같은 우선순위)
  const out = (b: Box) => (b.x < PLOT.x + 2 || b.x + b.w > MARKET_W - 4 || b.y < PLOT.y - 4 || b.y + b.h > PLOT.y + PLOT.h + 8 ? 10 : 0);
  for (const d of [...platePts].sort((a, b) => a.px - b.px)) {
    const text = shortLabel(d.s.vendor, d.s.model);
    const w = labelWidth(text);
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
        platePts.filter((o) => o !== d && o.px > box.x - 9 && o.px < box.x + w + 9 && o.py > box.y - 9 && o.py < box.y + h + 9).length * 3
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
    const leader: [number, number][] | null = isFar
      ? [
          [d.px, d.py],
          [chosen[2] === 'start' ? chosen[0] - 2 : chosen[2] === 'end' ? chosen[0] + 2 : chosen[0], chosen[1] - 5],
        ]
      : null;
    points.push(mkPoint(d, { text, x: chosen[0], y: chosen[1], anchor: chosen[2], leader }));
  }

  const segmentCounts = Object.fromEntries(SEGMENT_ORDER.map((s) => [s, 0])) as Record<MarketSegment, number>;
  for (const s of [...plotted, ...lane]) segmentCounts[s.segment] = (segmentCounts[s.segment] ?? 0) + 1;

  const counts: MarketCounts = {
    total,
    plotted: plotted.length,
    lane: lane.length,
    noTorque: noTorque.length,
    lg: lg.length,
    visible: points.length,
  };

  return {
    width: MARKET_W,
    height: MARKET_H,
    plot: { ...PLOT },
    lane: { ...LANE },
    title: '공급사 제품 맵 — 피크 토크 × 가격',
    xAxisTitle: '가격 (USD, 로그 스케일)',
    yAxisTitle: '피크 토크 (Nm, 로그)',
    laneTitle: `가격 미공개 (토크만 표시) · ${lane.length}개`,
    plotTitle: `가격 공개 · ${plotted.length}개`,
    xTicks,
    yTicks,
    points,
    band,
    bandNote,
    gap,
    excludedNoTorque: noTorque.map((s) => ({ vendor: s.vendor, model: s.model, label: `${s.vendor} ${stripParens(s.model)}` })),
    counts,
    segmentCounts,
    meta: `공급사 제품 ${total}개 중 가격 공개 ${plotted.length}개(우측 플롯), 가격 미공개 ${lane.length}개(좌측 레인), 토크 미공개 ${noTorque.length}개(제외), LG ${lg.length}개(밴드)`,
    lg: lgProduct,
  };
}

// ── LG 콜아웃 ───────────────────────────────────────────────────────────────

/** 차트 아래 LG 콜아웃 문단 (웹·정적 HTML 공용). 채택 사례가 있으면 확인된 세그먼트와 1군 세트사 사례를 덧붙인다. */
export function buildLgCallout(suppliers: ActuatorSupplierProduct[], adoptions: ActuatorAdoptionCase[], order: MarketSegment[] = SEGMENT_ORDER): string[] {
  const lg = (suppliers ?? []).find((s) => s?.isLG);
  if (!lg) return [];
  const counts = adoptionBySegment(adoptions ?? [], order).filter((c) => c.count > 0);
  const seen = counts.length ? counts.map((c) => `${SEGMENT_LABEL[c.segment]} ${c.count}건`).join(', ') : '아직 수집되지 않음';
  const lgSegments: MarketSegment[] = (lg.segments ?? []).filter((s) => s !== 'other');
  const overlap = counts.map((c) => c.segment).filter((s) => lgSegments.includes(s));
  const overlapText = overlap.length ? overlap.map((s) => SEGMENT_LABEL[s]).join(', ') : '아직 확인되지 않았습니다';
  const lines = [
    `AXIUM 공개 타깃: 자사 CLOiD(2026) → 외부 파트너(2027~) → 산업용 고토크(2030). 현재 외부 채택이 확인된 세그먼트: ${seen}. 겹치는 시장은 ${overlap.length ? `${overlapText}입니다. ` : `${overlapText}. `}(가설)`,
  ];
  const tier1 = (adoptions ?? []).filter((c) => c && c.marketSegment === 'tier1_oem' && levelOf(c) === 'module');
  if (tier1.length > 0) {
    // 같은 그룹 안의 부품사 공급은 Hyundai Mobis–Atlas 뿐이다. 그 외 1군 사례(위탁제조·외부 조달)는 그룹 밖 공급사다.
    const inGroup = tier1.filter((c) => /mobis/i.test(c.actuatorVendor));
    const base = `${SEGMENT_LABEL.tier1_oem} 사례 ${tier1.length}건 중`;
    const tail = '공급 계약 여부와 조건은 별도입니다.';
    if (inGroup.length > 0) {
      const names = inGroup.map((c) => `Hyundai Mobis–${c.robotName.replace(/\s*\([^)]*\)/g, '')}`).join(', ');
      lines.push(`${base} 그룹 내 부품사 공급은 ${names} ${inGroup.length}건으로, 세트와 부품이 한 그룹 안에 있는 LG 구조와 가장 직접 비교되는 사례입니다. ${tail}`);
    } else {
      lines.push(`${base} 세트와 부품이 한 그룹 안에 있는 LG 구조와 직접 비교할 수 있는 그룹 내 부품사 공급 사례는 확인되지 않았습니다. ${tail}`);
    }
  }
  return lines;
}

/** 툴팁·표용 세그먼트 근거 방식 */
export const SEGMENT_BASIS_LABEL: Record<ActuatorSupplierProduct['segmentBasis'], string> = {
  override: '예외 규칙',
  vendor_segments: '공급사 기재',
  keywords: '키워드 규칙',
  adoptions: '채택 사례 최빈 세그먼트',
  none: '근거 없음',
};
