import { describe, expect, it } from 'vitest';
import {
  MARKET_H,
  MARKET_W,
  bandPeers,
  buildLgCallout,
  buildMarketLayout,
  classifyMarket,
  defaultMarketOptions,
  shortLabel,
  wrapChars,
} from './actuator-market-layout';
import { labelWidth, overlaps } from './actuator-map-layout';
import { adoption, seedAdoptionCases, seedResponse, seedSuppliers44, sp } from './actuator-strategy.fixtures';
import type { ActuatorSupplierProduct } from '@/types/actuator-map';

const seed = seedSuppliers44();
const itSeed = seed ? it : it.skip;

const lgProduct = (over: Partial<ActuatorSupplierProduct> = {}) =>
  sp('LG Electronics', 'AXIUM actuator platform (Φ40-Φ120, 9 product lines)', {
    isLG: true,
    diameterRangeMm: { min: 40, max: 120 },
    integrationLevel: 'fully_integrated',
    segment: 'industrial_cobot',
    segments: ['industrial_cobot', 'service'],
    ...over,
  });

const peer = (model: string, d: number, over: Partial<ActuatorSupplierProduct> = {}) =>
  sp('V', model, { peakTorqueNm: 20, diameterMm: d, integrationLevel: 'fully_integrated', ...over });

describe('buildMarketLayout — 시드 44개', () => {
  itSeed('분류 기대값 점 13 / 레인 23 / 토크 미공개 7 / LG 1, 합 = 44', () => {
    const b = classifyMarket(seed!);
    expect([b.plotted.length, b.lane.length, b.noTorque.length, b.lg.length]).toEqual([13, 23, 7, 1]);
    expect(b.plotted.length + b.lane.length + b.noTorque.length + b.lg.length).toBe(seed!.length);
    expect(seed!.length).toBe(44);
    const L = buildMarketLayout(seed!, []);
    expect(L.counts).toMatchObject({ total: 44, plotted: 13, lane: 23, noTorque: 7, lg: 1, visible: 36 });
    expect(L.excludedNoTorque).toHaveLength(7);
    expect(L.meta).toBe('공급사 제품 44개 중 가격 공개 13개(우측 플롯), 가격 미공개 23개(좌측 레인), 토크 미공개 7개(제외), LG 1개(밴드)');
  });

  itSeed('백엔드 확정 세그먼트 분포(시드 44): tier2 21 / 산업 7 / 연구 5 / 서비스 5 / 자사 전용 5 / 1군 1, LG 는 override', () => {
    const dist: Record<string, number> = {};
    for (const s of seed!) dist[s.segment] = (dist[s.segment] ?? 0) + 1;
    expect(dist).toEqual({ tier2_legged: 21, industrial_cobot: 7, research_edu: 5, service: 5, captive: 5, tier1_oem: 1 });
    const lg = seed!.find((s) => s.isLG)!;
    expect(lg.segments).toEqual(['service', 'industrial_cobot']);
    expect(lg.segmentBasis).toBe('override');
    // 제품 맵 범례 건수는 그려진 점(가격 공개 + 미공개 = 36) 기준
    const L = buildMarketLayout(seed!, []);
    expect(Object.values(L.segmentCounts).reduce((a, b) => a + b, 0)).toBe(36);
  });

  itSeed('로그 단조성: 토크가 클수록 y 가 작고(위), 가격이 클수록 x 가 크다. 레인과 플롯이 같은 Y 척도를 쓴다', () => {
    const L = buildMarketLayout(seed!, []);
    const byTorque = [...L.points].sort((a, b) => (a.supplier.peakTorqueNm as number) - (b.supplier.peakTorqueNm as number));
    for (let i = 1; i < byTorque.length; i++) expect(byTorque[i]!.py).toBeLessThanOrEqual(byTorque[i - 1]!.py + 1e-9);
    const priced = L.points.filter((p) => !p.lane).sort((a, b) => (a.supplier.priceUsd as number) - (b.supplier.priceUsd as number));
    for (let i = 1; i < priced.length; i++) expect(priced[i]!.px).toBeGreaterThanOrEqual(priced[i - 1]!.px - 1e-9);
    // 레인 점은 가격 축(플롯) 바깥
    for (const p of L.points.filter((x) => x.lane)) expect(p.px).toBeLessThan(L.plot.x);
    for (const p of priced) expect(p.px).toBeGreaterThan(L.plot.x);
    // 같은 토크는 레인·플롯 어디서나 같은 y
    const t24 = L.points.filter((p) => p.supplier.peakTorqueNm === 25);
    expect(new Set(t24.map((p) => p.py.toFixed(3))).size).toBe(1);
  });

  itSeed('레인 라벨: 12.5px 이상 간격, 플롯 영역 밖으로 나가지 않는다', () => {
    const L = buildMarketLayout(seed!, []);
    const lane = L.points.filter((p) => p.lane).sort((a, b) => a.label.y - b.label.y);
    expect(lane).toHaveLength(23);
    for (let i = 1; i < lane.length; i++) expect(lane[i]!.label.y - lane[i - 1]!.label.y).toBeGreaterThanOrEqual(12.5 - 1e-9);
    for (const p of lane) {
      expect(p.label.y).toBeGreaterThanOrEqual(L.plot.y);
      expect(p.label.y).toBeLessThanOrEqual(L.plot.y + L.plot.h);
      expect(p.label.x).toBeGreaterThan(p.px);
      expect(p.label.leader).not.toBeNull();
    }
  });

  itSeed('플롯 라벨 겹침 최소 · 캔버스 안', () => {
    const L = buildMarketLayout(seed!, []);
    const boxes = L.points
      .filter((p) => !p.lane)
      .map((p) => {
        const w = labelWidth(p.label.text);
        const x = p.label.anchor === 'start' ? p.label.x : p.label.anchor === 'end' ? p.label.x - w : p.label.x - w / 2;
        return { x, y: p.label.y - 13, w, h: 13 };
      });
    let hits = 0;
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (overlaps(boxes[i]!, boxes[j]!)) hits++;
    expect(hits).toBeLessThanOrEqual(1);
    for (const b of boxes) {
      expect(b.x).toBeGreaterThanOrEqual(L.plot.x - 2);
      expect(b.x + b.w).toBeLessThanOrEqual(MARKET_W);
    }
  });

  itSeed('AXIUM 밴드: 직경 40–120 통합 제품 피어 3개 이상, 라벨에 가설·LG 공개값 아님', () => {
    const L = buildMarketLayout(seed!, []);
    expect(L.band).not.toBeNull();
    const b = L.band!;
    expect(b.peerCount).toBeGreaterThanOrEqual(3);
    expect(b.x1).toBe(L.lane.x);
    expect(b.x2).toBe(L.plot.x + L.plot.w);
    expect(b.y1).toBeLessThan(b.y2);
    const text = b.labelLines.join(' ');
    expect(text).toContain('LG AXIUM Φ40–Φ120 (9종)');
    expect(text).toContain('토크·가격 미공개 → 가격 전 구간 가능');
    expect(text).toContain('(가설)');
    expect(text).toContain('LG 공개값 아님');
    for (const l of b.labelLines) expect([...l].length).toBeLessThanOrEqual(48);
    expect(L.bandNote).toBeNull();
  });

  itSeed('빈 구간 주석: 가설 표기, 시장이 비어 있다는 단정 없음', () => {
    const L = buildMarketLayout(seed!, []);
    expect(L.gap).not.toBeNull();
    const text = L.gap!.lines.join(' ');
    expect(text).toContain('(가설)');
    expect(text).toContain('이 구간의 공개 가격 데이터는 없음');
    expect(text).not.toMatch(/비어 있다|시장이 없|존재하지 않/);
    expect(L.gap!.x2).toBe(L.plot.x + L.plot.w);
  });

  itSeed('눈금: Y 5·10·20·50…, X $100 $200 $500 $1K…', () => {
    const L = buildMarketLayout(seed!, []);
    const yl = L.yTicks.map((t) => t.label);
    expect(yl).toContain('10');
    expect(yl).toContain('1K');
    const xl = L.xTicks.map((t) => t.label);
    expect(xl).toContain('$100');
    expect(xl).toContain('$1K');
    expect(L.height).toBe(MARKET_H);
  });

  itSeed('세그먼트 필터는 점만 숨기고 축·카운트는 그대로', () => {
    const o = defaultMarketOptions();
    const all = buildMarketLayout(seed!, []);
    o.segments.industrial_cobot = false;
    const L = buildMarketLayout(seed!, [], o);
    expect(L.counts.total).toBe(44);
    expect(L.counts.plotted).toBe(13);
    expect(L.counts.visible).toBeLessThan(all.counts.visible);
    expect(L.yTicks).toEqual(all.yTicks);
    expect(L.points.every((p) => p.segment !== 'industrial_cobot')).toBe(true);
  });

  itSeed('결정적: 같은 입력은 같은 결과', () => {
    expect(JSON.stringify(buildMarketLayout(seed!, []))).toBe(JSON.stringify(buildMarketLayout(seed!, [])));
  });
});

describe('buildMarketLayout — 밴드·주석 경계', () => {
  it('피어 필터: motor_only 제외, 직경 경계 40·120 포함, 39·121 제외', () => {
    const list = [peer('a', 40), peer('b', 120), peer('c', 39), peer('d', 121), peer('e', 80, { integrationLevel: 'motor_only' }), peer('f', 80, { peakTorqueNm: null }), lgProduct()];
    expect(bandPeers(list, 40, 120).map((s) => s.model)).toEqual(['a', 'b']);
  });

  it('피어 3개 → 밴드, 2개 → 밴드 없음 + 표시 불가 문구', () => {
    const three = buildMarketLayout([lgProduct(), peer('a', 40, { peakTorqueNm: 10 }), peer('b', 80, { peakTorqueNm: 100 }), peer('c', 120, { peakTorqueNm: 300 })], []);
    expect(three.band).not.toBeNull();
    expect(three.band!.tMin).toBe(10);
    expect(three.band!.tMax).toBe(300);
    const two = buildMarketLayout([lgProduct(), peer('a', 40), peer('b', 80)], []);
    expect(two.band).toBeNull();
    expect(two.bandNote?.text).toBe('LG AXIUM: 직경 대응 비교 제품 부족으로 위치 표시 불가');
  });

  it('LG 제품이 없으면 밴드도 안내도 없다', () => {
    const L = buildMarketLayout([peer('a', 40), peer('b', 80), peer('c', 120)], []);
    expect(L.band).toBeNull();
    expect(L.bandNote).toBeNull();
    expect(L.counts.lg).toBe(0);
  });

  it('가격 공개 점 2개 → 빈 구간 없음, 3개 → 있음', () => {
    const priced = (n: number) => Array.from({ length: n }, (_, i) => peer(`p${i}`, 80, { peakTorqueNm: 10 + i, priceUsd: 100 + i * 50 }));
    expect(buildMarketLayout(priced(2), []).gap).toBeNull();
    const three = buildMarketLayout(priced(3), []);
    expect(three.gap).not.toBeNull();
    expect(three.gap!.lines.join(' ')).toContain('$200 이하');
  });

  it('빈 입력도 예외 없이 빈 레이아웃', () => {
    for (const input of [[], null as unknown as ActuatorSupplierProduct[]]) {
      const L = buildMarketLayout(input, []);
      expect(L.points).toEqual([]);
      expect(L.counts).toMatchObject({ total: 0, plotted: 0, lane: 0, noTorque: 0, lg: 0 });
      expect(L.band).toBeNull();
      expect(L.gap).toBeNull();
    }
  });

  it('같은 토크가 겹치는 레인 점은 x 를 8px 씩 최대 3열로 흩는다', () => {
    const L = buildMarketLayout([1, 2, 3, 4].map((i) => peer(`m${i}`, 60, { peakTorqueNm: 20 })), []);
    const xs = L.points.map((p) => p.px);
    expect(new Set(xs).size).toBeLessThanOrEqual(3);
    expect(Math.min(...xs)).toBe(L.lane.x + 16);
    expect(Math.max(...xs)).toBeLessThanOrEqual(L.lane.x + 32);
  });

  it('captive 는 속 빈 링, 점마다 aria-label', () => {
    const L = buildMarketLayout([peer('x', 60, { segment: 'captive', segments: ['captive'], priceUsd: 100 })], []);
    expect(L.points[0]!.hollow).toBe(true);
    expect(L.points[0]!.ariaLabel).toBe('V x 피크 20Nm 가격 $100 자사 전용(계열 포함)');
  });
});

describe('shortLabel / wrapChars', () => {
  it('공급사 접두어·괄호 제거, 18자 말줄임', () => {
    expect(shortLabel('CubeMars (T-Motor)', 'AK80-64 KV80')).toBe('AK80-64 KV80');
    expect(shortLabel('Harmonic Drive', 'Harmonic Drive SHA20A-50CG (200 VAC)')).toBe('SHA20A-50CG');
    expect(shortLabel('MyActuator (ex-Gyems)', 'RMD-X8 Pro V2 (RMD-X8-P9-25-C-N)')).toBe('RMD-X8 Pro V2');
    expect(shortLabel('V', 'A very long product model name here')).toBe('A very long produ…');
    // 접두어를 떼면 정보가 없어지는 경우 모델명 유지
    expect(shortLabel('RobStride Dynamics', 'RobStride 00 (RS-00)')).toBe('RobStride 00');
  });
  it('wrapChars 는 n자를 넘기지 않는다', () => {
    for (const l of wrapChars('밴드 = 직경 40–120mm 통합 제품 9개의 피크 토크 범위(10–300 Nm)로 환산한 추정(가설), LG 공개값 아님', 48)) expect([...l].length).toBeLessThanOrEqual(48);
  });
});

describe('buildLgCallout', () => {
  it('채택 세그먼트·겹치는 시장(가설)·1군 세트사 사례를 담는다', () => {
    const d = seedResponse();
    const lines = buildLgCallout(d.suppliers, d.adoptions, d.segmentOrder);
    expect(lines[0]).toContain('AXIUM 공개 타깃: 자사 CLOiD(2026) → 외부 파트너(2027~) → 산업용 고토크(2030)');
    expect(lines[0]).toContain('현재 외부 채택이 확인된 세그먼트');
    expect(lines[0]).toContain('(가설)');
    expect(lines.join(' ')).toContain('1군 세트사 양산 공급·위탁제조');
    expect(lines[1]).toBe(
      '1군 세트사 양산 공급·위탁제조 사례 2건 중 그룹 내 부품사 공급은 Hyundai Mobis–Atlas 1건으로, 세트와 부품이 한 그룹 안에 있는 LG 구조와 가장 직접 비교되는 사례입니다. 공급 계약 여부와 조건은 별도입니다.'
    );
    expect(lines.join(' ')).not.toContain('Tuopu Group·Sanhua Intelligent Controls)는 세트와 부품이');
    // 그룹 내 공급 사례가 없으면 단정하지 않는다
    const none = buildLgCallout(d.suppliers, d.adoptions.filter((c) => !/mobis/i.test(c.actuatorVendor)), d.segmentOrder);
    expect(none[1]).toContain('사례 1건 중');
    expect(none[1]).toContain('그룹 내 부품사 공급 사례는 확인되지 않았습니다');
  });
  it('사례 0건이면 아직 수집되지 않음, LG 제품이 없으면 빈 배열', () => {
    const d = seedResponse();
    expect(buildLgCallout(d.suppliers, [], d.segmentOrder)[0]).toContain('아직 수집되지 않음');
    expect(buildLgCallout([sp('V', 'm')], [adoption()])).toEqual([]);
  });
  it('실데이터 수요 사례(30건)로도 예외 없이 생성', () => {
    const cases = seedAdoptionCases();
    if (!cases) return;
    expect(buildLgCallout(seedResponse().suppliers, cases).join(' ')).toContain('1군 세트사');
  });
});
