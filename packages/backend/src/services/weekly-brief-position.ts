/**
 * 주간 브리프 v3 — "우리 위치" 어댑터와 경쟁사 격차 계산.
 *
 * 순수 함수(격차 계산·행 선정·위치 선택)와 의존성 주입 가능한 읽기 어댑터(fetchPositionSnapshot)로 나뉜다.
 * 모든 수치(경쟁사값, 우리값, 차이, 격차율, 방향, 변화)는 서버가 계산하고 AI 는 이 결과를 서술에만 쓴다.
 *
 * 우리 값이 없는 축은 비교 수치를 만들지 않고 `ours_missing` 으로 둔다(추정·지어내기 금지).
 */

import { asc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { ciBenchmarkAxes, ciBenchmarkScores, ciCompetitors, handBenchmarkAxes, handBenchmarkScores, handCompetitors } from '../db/schema.js';
import {
  actuatorPositionMapService,
  isLGCompany,
  parseLeadingNumber,
  parsePriceRange,
  type ActuatorMapBody,
  type ActuatorMapRobot,
  type ActuatorSupplierProduct,
} from './actuator-position-map.service.js';
import { WEEKLY_WORDING, movementLabelKo } from '../types/weekly-brief-wording.js';
import type { ExecGapRow, ExecGapValue, ExecPositionSnapshot, GapMovement, GapPosition, WeeklyReportEvidence } from '../types/weekly-brief.js';

// ─────────────────────────────────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────────────────────────────────

/** 격차율 ±5% 이내면 비슷함 */
export const GAP_PARITY_PCT = 5;
/** 직전 대비 격차율 변화 ±2%p 이내면 변화 없음 */
export const GAP_MOVE_PP = 2;
/** 격차 행 최대 개수 / 회사당 / 우리 위치 미등록 행 */
export const GAP_LIMITS = { rows: 6, perCompany: 2, oursMissing: 2 } as const;

/** "우리"의 정의 (5.1) */
export const OUR_POSITION = {
  robotNamePattern: /cloid/i,
  ciBenchmarkSlug: 'cloid',
  ourRefRobot: 'CLOiD',
  ourRefSupplier: 'LG AXIUM',
  ourRefBenchmark: 'CLOiD',
  ourRefHand: 'LG 핸드',
} as const;

export interface GapAxisDef {
  label: string;
  unit: string | null;
  higherIsBetter: boolean;
}

/** 축 규칙표 (5.3). 벤치마크 축(bench_*)은 benchAxisDef 로 만든다 */
export const GAP_AXES: Readonly<Record<string, GapAxisDef>> = {
  torque_density: { label: '토크밀도', unit: 'Nm/kg', higherIsBetter: true },
  hand_dof: { label: '핸드 자유도', unit: 'DoF', higherIsBetter: true },
  grip_force: { label: '핸드 그립력', unit: 'N', higherIsBetter: true },
  tactile: { label: '촉각 채널 수', unit: '채널', higherIsBetter: true },
  body_dof: { label: '전신 자유도', unit: 'DoF', higherIsBetter: true },
  payload: { label: '가용 하중', unit: 'kg', higherIsBetter: true },
  price: { label: '가격', unit: 'USD', higherIsBetter: false },
};

/** 로봇 벤치마크 축 라벨 폴백 (DB 라벨이 없을 때) */
export const BENCH_AXIS_LABELS: Readonly<Record<string, string>> = {
  physical: '신체 성능',
  perception: '인지',
  autonomy: '자율성',
  dexterity: '손재주',
  interaction: '상호작용',
  ecosystem: '생태계',
  safety: '안전',
  business: '사업성',
  ip: '지식재산',
  scalability: '확장성',
};

export const BENCH_PREFIX = 'bench_';

/** 모든 축의 키 — 등록/미등록 축 안내(coverage)에 쓴다 */
export function allAxisKeys(): string[] {
  return [...Object.keys(GAP_AXES), ...Object.keys(BENCH_AXIS_LABELS).map((k) => BENCH_PREFIX + k)];
}

export function axisDef(axisKey: string, benchLabels: Readonly<Record<string, string>> = BENCH_AXIS_LABELS): GapAxisDef | null {
  const fixed = GAP_AXES[axisKey];
  if (fixed) return fixed;
  if (axisKey.startsWith(BENCH_PREFIX)) {
    const k = axisKey.slice(BENCH_PREFIX.length);
    const label = benchLabels[k] ?? BENCH_AXIS_LABELS[k];
    return label ? { label: `${label}(내부 평가 점수)`, unit: '점', higherIsBetter: true } : null;
  }
  return null;
}

/** CI 항목명 → 격차 축 (이번 주 CI 변경이 있으면 그 축이 격차 후보가 된다). 개발자 정의 상수표 */
export const CI_AXIS_MAP: Readonly<Record<string, string>> = {
  '관절 토크': 'torque_density',
  '가격대': 'price',
  '핸드 자유도': 'hand_dof',
  '손 자유도': 'hand_dof',
  '전신 자유도': 'body_dof',
  '자유도': 'body_dof',
  '가반 하중': 'payload',
  '가반하중': 'payload',
  '페이로드': 'payload',
};

// ─────────────────────────────────────────────────────────────────────────────
// 작은 유틸
// ─────────────────────────────────────────────────────────────────────────────

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** 회사·제품 이름 → id 용 키 ('.' 와 ':' 없음, 소문자 영숫자·한글·하이픈) */
export function companyKeyOf(name: string): string {
  const k = name
    .toLowerCase()
    .normalize('NFKC')
    .replace(/\(주\)|주식회사/g, ' ')
    .replace(/[,.]?\s*\b(inc|ltd|llc|co|corp|corporation|gmbh|limited)\b\.?/g, ' ')
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return k || 'unknown';
}

function ymdOf(iso: string | null | undefined): string | null {
  return iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : null;
}

/** 표시 문자열(≤24자) */
export function formatAxisValue(axisKey: string, value: number): string {
  const def = axisDef(axisKey);
  const v = Number.isInteger(value) ? String(value) : String(round1(value));
  if (axisKey === 'price') return `$${Math.round(value).toLocaleString('en-US')}`;
  if (axisKey.startsWith(BENCH_PREFIX)) return `${v}점`;
  return def?.unit ? `${v} ${def.unit}` : v;
}

// ─────────────────────────────────────────────────────────────────────────────
// 격차 계산 (순수)
// ─────────────────────────────────────────────────────────────────────────────

/** 격차율(%) — (경쟁사 − 우리) ÷ 우리 × 100. higherIsBetter=false 이면 부호를 뒤집어 양수가 항상 "경쟁사에 유리" */
export function gapPct(competitor: number, ours: number, higherIsBetter: boolean): number | null {
  if (!Number.isFinite(competitor) || !Number.isFinite(ours) || ours <= 0) return null;
  const raw = ((competitor - ours) / ours) * 100;
  return higherIsBetter ? raw : -raw;
}

export function positionOf(pct: number): GapPosition {
  if (pct >= GAP_PARITY_PCT) return 'competitor_ahead';
  if (pct <= -GAP_PARITY_PCT) return 'we_ahead';
  return 'parity';
}

/** 직전 경쟁사값이 있으면 격차율 변화(Δ)로 변화 방향을 정한다. 없으면 first_seen */
export function movementOf(pct: number, prevCompetitor: number | null, ours: number, higherIsBetter: boolean): GapMovement {
  if (prevCompetitor === null) return 'first_seen';
  const before = gapPct(prevCompetitor, ours, higherIsBetter);
  if (before === null) return 'first_seen';
  const delta = pct - before;
  if (delta >= GAP_MOVE_PP) return 'competitor_closing';
  if (delta <= -GAP_MOVE_PP) return 'competitor_receding';
  return 'steady';
}

export const POSITION_LABEL_KO: Readonly<Record<GapPosition, string>> = WEEKLY_WORDING.positions;


export interface GapCalc {
  position: GapPosition;
  movement: GapMovement;
  diff: { abs: number; pct: number };
  pct: number;
}

/** 경쟁사값·우리값·직전 경쟁사값으로 방향·차이·변화를 계산한다. 비교할 수 없으면 null */
export function computeGap(args: { competitor: number; ours: number | null; prevCompetitor: number | null; higherIsBetter: boolean }): GapCalc | null {
  if (args.ours === null) return null;
  const pct = gapPct(args.competitor, args.ours, args.higherIsBetter);
  if (pct === null) return null;
  return {
    position: positionOf(pct),
    movement: movementOf(pct, args.prevCompetitor, args.ours, args.higherIsBetter),
    diff: { abs: round1(Math.abs(args.competitor - args.ours)), pct: round1(Math.abs(pct)) },
    pct,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 우리 위치 (입력 데이터와 선택 규칙)
// ─────────────────────────────────────────────────────────────────────────────

export interface BenchScoreEntry {
  score: number;
  /** 원본 수치 문자열 (핸드 벤치마크만) */
  raw: string | null;
  updatedAt: string | null;
}

export interface BenchCompetitor {
  id: string;
  slug: string;
  name: string;
  manufacturer: string;
  scores: Record<string, BenchScoreEntry>;
}

export interface BenchTable {
  axes: { key: string; label: string }[];
  competitors: BenchCompetitor[];
}

export interface PositionSnapshot {
  map: ActuatorMapBody | null;
  ciBenchmark: BenchTable | null;
  handBenchmark: BenchTable | null;
  failures: string[];
}

export interface OurPosition {
  robot: ActuatorMapRobot | null;
  suppliers: ActuatorSupplierProduct[];
  ciRow: BenchCompetitor | null;
  handRow: BenchCompetitor | null;
  generatedAt: string | null;
}

/** 우리 로봇 선택: isLG 이면서 /cloid/i → 아니면 isLG 이고 forecast 가 아닌 첫 로봇 → 없으면 null */
export function selectOurRobot(robots: readonly ActuatorMapRobot[]): ActuatorMapRobot | null {
  const lg = robots.filter((r) => r.isLG);
  return lg.find((r) => OUR_POSITION.robotNamePattern.test(r.name)) ?? lg.find((r) => !r.forecast) ?? null;
}

export function medianPrice(p: { min: number; max: number } | null | undefined): number | null {
  if (!p || !Number.isFinite(p.min) || !Number.isFinite(p.max)) return null;
  const m = (p.min + p.max) / 2;
  return m > 0 ? m : null;
}

export function torqueDensityOf(peakTorqueNm: number | null | undefined, weightKg: number | null | undefined): number | null {
  if (typeof peakTorqueNm !== 'number' || typeof weightKg !== 'number') return null;
  if (!(peakTorqueNm > 0) || !(weightKg > 0)) return null;
  return round1(peakTorqueNm / weightKg);
}

export function buildOurPosition(snapshot: PositionSnapshot): OurPosition {
  const map = snapshot.map;
  return {
    robot: map ? selectOurRobot(map.robots) : null,
    suppliers: map ? map.suppliers.filter((s) => s.isLG) : [],
    ciRow: snapshot.ciBenchmark?.competitors.find((c) => c.slug === OUR_POSITION.ciBenchmarkSlug) ?? null,
    handRow: snapshot.handBenchmark?.competitors.find((c) => isLGCompany(c.manufacturer)) ?? null,
    generatedAt: map?.generatedAt ?? null,
  };
}

export interface OurValue {
  value: number;
  ref: string;
  asOf: string | null;
}

/** 축별 우리 값. 없으면 null (미등록) */
export function ourValueFor(axisKey: string, our: OurPosition): OurValue | null {
  const asOf = ymdOf(our.generatedAt);
  const robot = our.robot;
  const pos = (v: number | null | undefined, ref: string): OurValue | null => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? { value: v, ref, asOf } : null);
  switch (axisKey) {
    case 'torque_density': {
      const dens = our.suppliers.map((s) => torqueDensityOf(s.peakTorqueNm, s.weightKg)).filter((x): x is number => x !== null);
      return dens.length > 0 ? { value: Math.max(...dens), ref: OUR_POSITION.ourRefSupplier, asOf } : null;
    }
    case 'hand_dof': {
      const fromRobot = pos(robot?.handDof, OUR_POSITION.ourRefRobot);
      if (fromRobot) return fromRobot;
      const raw = our.handRow?.scores.dof?.raw;
      return pos(parseLeadingNumber(raw), OUR_POSITION.ourRefHand);
    }
    case 'grip_force':
      return pos(parseLeadingNumber(our.handRow?.scores.gripForce?.raw), OUR_POSITION.ourRefHand);
    case 'tactile':
      return pos(parseLeadingNumber(our.handRow?.scores.tactileChannels?.raw), OUR_POSITION.ourRefHand);
    case 'body_dof':
      return pos(robot?.dof, OUR_POSITION.ourRefRobot);
    case 'payload':
      return pos(robot?.payload, OUR_POSITION.ourRefRobot);
    case 'price': {
      const fromRobot = pos(medianPrice(robot?.price), OUR_POSITION.ourRefRobot);
      if (fromRobot) return fromRobot;
      const prices = our.suppliers.map((s) => s.priceUsd).filter((x): x is number => typeof x === 'number' && x > 0);
      return prices.length > 0 ? { value: Math.min(...prices), ref: OUR_POSITION.ourRefSupplier, asOf } : null;
    }
    default: {
      if (axisKey.startsWith(BENCH_PREFIX)) {
        const e = our.ciRow?.scores[axisKey.slice(BENCH_PREFIX.length)];
        return e && e.score > 0 ? { value: e.score, ref: OUR_POSITION.ourRefBenchmark, asOf: ymdOf(e.updatedAt) } : null;
      }
      return null;
    }
  }
}

/** 등록/미등록 축 라벨 (coverage) */
export function computeCoverage(our: OurPosition | null, benchLabels: Readonly<Record<string, string>> = BENCH_AXIS_LABELS): { registered: string[]; missing: string[]; asOf: string | null } {
  const registered: string[] = [];
  const missing: string[] = [];
  for (const key of allAxisKeys()) {
    const def = axisDef(key, benchLabels);
    if (!def) continue;
    const label = def.label.replace(/\(내부 평가 점수\)$/, '');
    if (our && ourValueFor(key, our)) registered.push(label);
    else missing.push(label);
  }
  return { registered, missing, asOf: ymdOf(our?.generatedAt) };
}

// ─────────────────────────────────────────────────────────────────────────────
// 경쟁사 사실(후보) 수집 (순수)
// ─────────────────────────────────────────────────────────────────────────────

export interface CompetitorFact {
  companyKey: string;
  companyId: string | null;
  companyName: string;
  robotName: string | null;
  axisKey: string;
  value: number;
  grade: string | null;
  asOf: string | null;
  sourceUrl: string | null;
  /** 이 사실을 만든 데이터 소스 */
  source: 'map_robot' | 'map_supplier' | 'ci_benchmark' | 'hand_benchmark';
  /** 벤치마크 점수의 updated_at (ISO) */
  updatedAt: string | null;
  /** 로봇 스펙 갱신 확인용 로봇 id */
  robotId: string | null;
}

export function competitorFactsFromMap(map: ActuatorMapBody): CompetitorFact[] {
  const out: CompetitorFact[] = [];
  const asOf = ymdOf(map.generatedAt);
  for (const r of map.robots) {
    if (r.isLG || r.forecast) continue;
    const base = { companyKey: companyKeyOf(r.company), companyId: r.companyId || null, companyName: r.company, robotName: r.name, grade: null as string | null, asOf, sourceUrl: null as string | null, source: 'map_robot' as const, updatedAt: null, robotId: r.id };
    const add = (axisKey: string, value: number | null | undefined, grade: string | null = null) => {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) out.push({ ...base, axisKey, value, grade });
    };
    add('hand_dof', r.handDof);
    add('body_dof', r.dof);
    add('payload', r.payload);
    add('price', medianPrice(r.price), r.price?.conf ?? null);
    // 로봇 액추에이터의 토크밀도 (peak 토크 ÷ 무게) — 가장 큰 값
    const dens = r.actuators.map((a) => torqueDensityOf(a.torqueNm, a.weightKg)).filter((x): x is number => x !== null);
    if (dens.length > 0) add('torque_density', Math.max(...dens));
  }
  for (const s of map.suppliers) {
    if (s.isLG) continue;
    const d = torqueDensityOf(s.peakTorqueNm, s.weightKg);
    if (d === null) continue;
    out.push({ companyKey: companyKeyOf(s.vendor), companyId: null, companyName: s.vendor, robotName: s.model, axisKey: 'torque_density', value: d, grade: null, asOf, sourceUrl: null, source: 'map_supplier', updatedAt: null, robotId: null });
  }
  return out;
}

export function competitorFactsFromCiBenchmark(table: BenchTable | null): CompetitorFact[] {
  if (!table) return [];
  const out: CompetitorFact[] = [];
  for (const c of table.competitors) {
    if (c.slug === OUR_POSITION.ciBenchmarkSlug || isLGCompany(c.manufacturer)) continue;
    for (const [k, e] of Object.entries(c.scores)) {
      if (!(e.score > 0)) continue;
      out.push({ companyKey: companyKeyOf(c.manufacturer), companyId: null, companyName: c.manufacturer, robotName: c.name, axisKey: BENCH_PREFIX + k, value: e.score, grade: null, asOf: ymdOf(e.updatedAt), sourceUrl: null, source: 'ci_benchmark', updatedAt: e.updatedAt, robotId: null });
    }
  }
  return out;
}

const HAND_BENCH_AXIS: Readonly<Record<string, string>> = { dof: 'hand_dof', gripForce: 'grip_force', tactileChannels: 'tactile' };

export function competitorFactsFromHandBenchmark(table: BenchTable | null): CompetitorFact[] {
  if (!table) return [];
  const out: CompetitorFact[] = [];
  for (const c of table.competitors) {
    if (isLGCompany(c.manufacturer)) continue;
    for (const [k, axisKey] of Object.entries(HAND_BENCH_AXIS)) {
      const e = c.scores[k];
      const v = parseLeadingNumber(e?.raw);
      if (!e || v === null || !(v > 0)) continue;
      out.push({ companyKey: companyKeyOf(c.manufacturer), companyId: null, companyName: c.manufacturer, robotName: c.name, axisKey, value: v, grade: null, asOf: ymdOf(e.updatedAt), sourceUrl: null, source: 'hand_benchmark', updatedAt: e.updatedAt, robotId: null });
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 이번 주 새 데이터 판정 (5.4) 과 격차 행 선정
// ─────────────────────────────────────────────────────────────────────────────

export interface WeekSignals {
  /** 이번 주 CI 변경이 있는 (회사 키 → 축 키 집합) */
  ciAxes: Map<string, Set<string>>;
  /** 이번 주 스펙(humanoid_robots/body_specs/hand_specs)이 갱신된 로봇 id */
  specUpdatedRobotIds: Set<string>;
  /** 이번 주 기사·영상에 언급된 회사 id */
  mentionedCompanyIds: Set<string>;
  /** 이번 주 구간 [startMs, endMs) */
  rangeStartMs: number;
  rangeEndMs: number;
}

export type NewDataReason = 'ci_change' | 'benchmark_updated' | 'spec_updated_with_mention';

/** 이 경쟁사 사실이 "이번 주 새 데이터"인가. 로봇 스펙은 갱신 + 회사 언급을 동시에 만족해야 한다(재시드 오탐 방지) */
export function newDataReason(fact: CompetitorFact, w: WeekSignals): NewDataReason | null {
  if (w.ciAxes.get(fact.companyKey)?.has(fact.axisKey)) return 'ci_change';
  if ((fact.source === 'ci_benchmark' || fact.source === 'hand_benchmark') && fact.updatedAt) {
    const t = new Date(fact.updatedAt).getTime();
    if (Number.isFinite(t) && t >= w.rangeStartMs && t < w.rangeEndMs) return 'benchmark_updated';
  }
  if (fact.source === 'map_robot' && fact.robotId && w.specUpdatedRobotIds.has(fact.robotId) && fact.companyId && w.mentionedCompanyIds.has(fact.companyId)) {
    return 'spec_updated_with_mention';
  }
  return null;
}

export interface GapDraft extends Omit<ExecGapRow, 'lines' | 'evidence' | 'generatedBy'> {
  reason: NewDataReason | null;
  priority: number;
}

function toValue(axisKey: string, value: number, grade: string | null, asOf: string | null, sourceUrl: string | null): ExecGapValue {
  return { value: round1(value), display: formatAxisValue(axisKey, value), grade, asOf, sourceUrl };
}

/** 우선순위: ahead&closing > ahead&first_seen > parity&closing > 나머지 (낮을수록 먼저) */
export function gapPriority(position: GapPosition | null, movement: GapMovement | null): number {
  if (position === 'competitor_ahead' && movement === 'competitor_closing') return 0;
  if (position === 'competitor_ahead' && movement === 'first_seen') return 1;
  if (position === 'parity' && movement === 'competitor_closing') return 2;
  if (position === null) return 5;
  return 3;
}

export function buildGapDraft(fact: CompetitorFact, our: OurPosition | null, prev: number | null, reason: NewDataReason | null, benchLabels?: Readonly<Record<string, string>>): GapDraft | null {
  const def = axisDef(fact.axisKey, benchLabels);
  if (!def) return null;
  const mine = our ? ourValueFor(fact.axisKey, our) : null;
  const calc = computeGap({ competitor: fact.value, ours: mine?.value ?? null, prevCompetitor: prev, higherIsBetter: def.higherIsBetter });
  const compared = calc !== null && mine !== null;
  return {
    id: `gap:${fact.companyKey}:${fact.axisKey}`,
    competitor: { companyId: fact.companyId, name: fact.companyName, robotName: fact.robotName },
    axisKey: fact.axisKey,
    axisLabel: def.label,
    unit: def.unit,
    higherIsBetter: def.higherIsBetter,
    competitorValue: toValue(fact.axisKey, fact.value, fact.grade, fact.asOf, fact.sourceUrl),
    ourValue: compared && mine ? toValue(fact.axisKey, mine.value, null, mine.asOf, null) : null,
    ourRef: compared && mine ? mine.ref : null,
    status: compared ? 'compared' : 'ours_missing',
    position: compared ? calc.position : null,
    diff: compared ? calc.diff : null,
    movement: compared ? calc.movement : null,
    prevCompetitorValue: prev !== null ? round1(prev) : null,
    labelKo: { position: compared ? POSITION_LABEL_KO[calc.position] : null, movement: compared ? movementLabelKo(calc.position, calc.movement) : null },
    reason,
    priority: compared ? gapPriority(calc.position, calc.movement) : 5,
  };
}

/**
 * 격차 행 선정: 우선순위 순으로 최대 6행, 회사당 최대 2행. 우리 위치 미등록 행은 최대 2행까지 포함한다.
 * 같은 (회사, 축)은 한 번만.
 */
export function selectGapDrafts(drafts: readonly GapDraft[]): GapDraft[] {
  const seen = new Set<string>();
  const perCompany = new Map<string, number>();
  const sorted = [...drafts].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  const out: GapDraft[] = [];
  let missing = 0;
  for (const d of sorted) {
    if (out.length >= GAP_LIMITS.rows) break;
    if (seen.has(d.id)) continue;
    const key = d.id.split(':')[1] ?? '';
    if ((perCompany.get(key) ?? 0) >= GAP_LIMITS.perCompany) continue;
    if (d.status === 'ours_missing') {
      if (missing >= GAP_LIMITS.oursMissing) continue;
      missing++;
    }
    seen.add(d.id);
    perCompany.set(key, (perCompany.get(key) ?? 0) + 1);
    out.push(d);
  }
  return out;
}

/** 차이 값 표시 (단위 포함) */
export function formatDiff(axisKey: string, abs: number): string {
  return formatAxisValue(axisKey, abs);
}

/** 규칙 폴백 문장(합니다체, 서버 값만) */
export function gapRuleLines(d: Pick<GapDraft, 'competitor' | 'axisKey' | 'axisLabel' | 'competitorValue' | 'ourValue' | 'status' | 'position' | 'diff'> & { movement?: GapMovement | null }): string[] {
  const who = d.competitor.robotName && d.competitor.robotName !== d.competitor.name ? `${d.competitor.name} ${d.competitor.robotName}` : d.competitor.name;
  if (d.status !== 'compared' || !d.ourValue || !d.position || !d.diff) {
    return [`${who}의 ${d.axisLabel}은 ${d.competitorValue.display}입니다.`, '비교 기준이 되는 우리 수치가 아직 등록되어 있지 않습니다.'];
  }
  const side = POSITION_LABEL_KO[d.position];
  const lines = [`${d.axisLabel}에서 ${who}는 ${d.competitorValue.display}, 우리는 ${d.ourValue.display}으로 차이는 ${formatDiff(d.axisKey, d.diff.abs)}입니다(${side}).`];
  const move = d.movement && d.movement !== 'first_seen' ? movementLabelKo(d.position, d.movement) : null;
  if (move) lines.push(`직전 대비 변화는 ${move}입니다.`);
  return lines;
}

export function gapEvidence(d: Pick<GapDraft, 'competitor' | 'axisLabel' | 'competitorValue' | 'id'>): WeeklyReportEvidence[] {
  const url = d.competitorValue.sourceUrl && d.competitorValue.sourceUrl.startsWith('https://') ? d.competitorValue.sourceUrl : null;
  return [{ type: 'ci', id: d.id, title: `${d.competitor.name} ${d.axisLabel}`.slice(0, 120), url, label: d.competitorValue.grade ? `신뢰도 ${d.competitorValue.grade}` : null }];
}

/** 조달 통계 스냅샷 (T-4b) */
export function snapshotOf(map: ActuatorMapBody | null): ExecPositionSnapshot | null {
  if (!map) return null;
  const s = map.sourcingStats;
  return { asOf: map.generatedAt, robots: s.robots, inHouse: s.inHouse + s.inHouseSells, inHouseSells: s.inHouseSells, external: s.external, unknown: s.unknown };
}

// ─────────────────────────────────────────────────────────────────────────────
// 읽기 어댑터 (의존성 주입)
// ─────────────────────────────────────────────────────────────────────────────

export interface PositionDeps {
  getMap(): Promise<ActuatorMapBody>;
  getCiBenchmark(): Promise<BenchTable>;
  getHandBenchmark(): Promise<BenchTable>;
}

function isoOrNull(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const t = d instanceof Date ? d : new Date(d);
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
}

async function readCiBenchmark(): Promise<BenchTable> {
  const axes = await db.select().from(ciBenchmarkAxes).orderBy(asc(ciBenchmarkAxes.sortOrder));
  const competitors = await db.select().from(ciCompetitors).where(eq(ciCompetitors.isActive, true)).orderBy(asc(ciCompetitors.sortOrder));
  const scores = await db.select().from(ciBenchmarkScores);
  const byComp = new Map<string, Record<string, BenchScoreEntry>>();
  for (const s of scores) {
    const m = byComp.get(s.competitorId) ?? {};
    m[s.axisKey] = { score: s.currentScore, raw: null, updatedAt: isoOrNull(s.updatedAt) };
    byComp.set(s.competitorId, m);
  }
  return {
    axes: axes.map((a) => ({ key: a.key, label: a.label.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}‍️]+\s*/u, '') })),
    competitors: competitors.map((c) => ({ id: c.id, slug: c.slug, name: c.name, manufacturer: c.manufacturer, scores: byComp.get(c.id) ?? {} })),
  };
}

async function readHandBenchmark(): Promise<BenchTable> {
  const axes = await db.select().from(handBenchmarkAxes).orderBy(asc(handBenchmarkAxes.sortOrder));
  const competitors = await db.select().from(handCompetitors).where(eq(handCompetitors.isActive, true)).orderBy(asc(handCompetitors.sortOrder));
  const scores = await db.select().from(handBenchmarkScores);
  const byComp = new Map<string, Record<string, BenchScoreEntry>>();
  for (const s of scores) {
    const m = byComp.get(s.competitorId) ?? {};
    m[s.axisKey] = { score: s.currentScore, raw: s.rawValue ?? null, updatedAt: isoOrNull(s.updatedAt) };
    byComp.set(s.competitorId, m);
  }
  return {
    axes: axes.map((a) => ({ key: a.key, label: a.label })),
    competitors: competitors.map((c) => ({ id: c.id, slug: c.slug, name: c.name, manufacturer: c.manufacturer, scores: byComp.get(c.id) ?? {} })),
  };
}

export const defaultPositionDeps: PositionDeps = {
  getMap: () => actuatorPositionMapService.getMap(),
  getCiBenchmark: readCiBenchmark,
  getHandBenchmark: readHandBenchmark,
};

/** 세 소스를 읽는다. 하나가 실패하면 그것만 null 이고 `position_failed`/`bench_failed` 등이 failures 에 담긴다 */
export async function fetchPositionSnapshot(deps: PositionDeps = defaultPositionDeps): Promise<PositionSnapshot> {
  const failures: string[] = [];
  const guard = async <T>(code: string, fn: () => Promise<T>): Promise<T | null> => {
    try {
      return await fn();
    } catch {
      failures.push(code);
      return null;
    }
  };
  const [map, ciBenchmark, handBenchmark] = await Promise.all([
    guard('position', () => deps.getMap()),
    guard('bench', () => deps.getCiBenchmark()),
    guard('hand_bench', () => deps.getHandBenchmark()),
  ]);
  return { map, ciBenchmark, handBenchmark, failures };
}

/** 가격대 같은 CI 이전 값을 격차 축의 값으로 파싱한다 (같은 기준끼리만 비교: 토크는 밀도와 기준이 달라 null) */
export function parseCiPrevForAxis(axisKey: string, text: string | null | undefined): number | null {
  if (!text) return null;
  if (axisKey === 'price') return medianPrice(parsePriceRange(text));
  if (axisKey === 'hand_dof' || axisKey === 'body_dof' || axisKey === 'payload') return parseLeadingNumber(text);
  return null;
}
