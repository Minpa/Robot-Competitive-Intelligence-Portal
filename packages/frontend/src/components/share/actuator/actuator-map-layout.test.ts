import { describe, expect, it } from 'vitest';
import type { ActuatorMapRobot, ActuatorTypeLabel } from '@/types/actuator-map';
import { CATEGORY_PALETTE } from '@/app/events/wrc2026/components/chartColors';
import {
  HULL_FILL,
  HULL_FILL_OFF,
  HULL_FILL_ON,
  HULL_STROKE,
  HULL_STROKE_OFF,
  HULL_STROKE_W,
  HULL_STROKE_W_ON,
  Y_AXIS_OPTIONS,
  assignHullColors,
  badgeTextTone,
  buildLayout,
  defaultLayoutOptions,
  formatRobotNames,
  hullEmphasis,
  hullIndexRows,
  hullLabelDot,
  labelWidth,
  polygonCentroid,
  type HullBox,
  type YAxisKey,
} from './actuator-map-layout';
import { posture, robot } from './actuator-strategy.fixtures';

const TYPES: ActuatorTypeLabel[] = ['유압→전기 전환', '하모닉(스트레인웨이브)', '사이클로이드·유성', '직구동/QDD', '리니어·스크류', '소프트·텐던', '커스텀 전기(상세 미공개)', '미확인'];

function r(name: string, company: string, region: ActuatorMapRobot['region'], over: Partial<ActuatorMapRobot>): ActuatorMapRobot {
  return robot(name, company, [], { region, ...over });
}

/** 좌표·라벨 스냅샷용 고정 입력 — 회사 3곳은 2기 이상(헐 생성), 일부는 가격/무게/가반하중 없음 */
const ROBOTS: ActuatorMapRobot[] = [
  r('Atlas', 'Boston Dynamics', 'na', { dof: 28, handDof: 12, speed: 2.5, weight: 89, payload: 11, height: 150, actuatorTypeLabel: '유압→전기 전환', price: null }),
  r('Spot', 'Boston Dynamics', 'na', { locomotion: 'wheeled', dof: 12, handDof: 0, speed: 1.6, weight: 32, payload: 14, height: 84, actuatorTypeLabel: '직구동/QDD', price: { min: 74500, max: 74500, conf: 'A', src: 'x' } }),
  r('Optimus', 'Tesla', 'na', { dof: 40, handDof: 22, speed: 2.2, weight: 57, payload: 20, height: 173, actuatorTypeLabel: '커스텀 전기(상세 미공개)', price: { min: 20000, max: 30000, conf: 'C', src: 'x' } }),
  r('Figure 02', 'Figure AI', 'na', { dof: 35, handDof: 16, speed: 1.2, weight: 70, payload: 20, height: 168, actuatorTypeLabel: '미확인' }),
  r('Figure 03', 'Figure AI', 'na', { dof: 40, handDof: 16, speed: 1.4, weight: 60, payload: 20, height: 168, actuatorTypeLabel: '미확인' }),
  r('H1', 'Unitree Robotics', 'cn', { dof: 26, handDof: 0, speed: 3.3, weight: 47, payload: 5, height: 180, actuatorTypeLabel: '직구동/QDD', price: { min: 90000, max: 90000, conf: 'A', src: 'x' } }),
  r('G1', 'Unitree Robotics', 'cn', { dof: 23, handDof: 6, speed: 2, weight: 35, payload: 3, height: 127, actuatorTypeLabel: '직구동/QDD', price: { min: 16000, max: 21600, conf: 'A', src: 'x' } }),
  r('Go2', 'Unitree Robotics', 'cn', { locomotion: 'unknown', dof: 12, speed: 3.7, weight: 15, payload: 8, actuatorTypeLabel: '직구동/QDD', price: { min: 1600, max: 2800, conf: 'B', src: 'x' } }),
  r('GR-2', 'Fourier Intelligence', 'cn', { dof: 53, handDof: 12, speed: 1.8, weight: 55, payload: 3, height: 175, actuatorTypeLabel: '직구동/QDD' }),
  r('Neo', '1X Technologies', 'eu', { dof: 22, handDof: 10, speed: 1.4, weight: 30, payload: 70, height: 165, actuatorTypeLabel: '소프트·텐던', price: { min: 20000, max: 20000, conf: 'A', src: 'x' } }),
  r('Digit', 'Agility Robotics', 'na', { dof: 20, handDof: 0, speed: 1.5, weight: 65, payload: 16, height: 175, actuatorTypeLabel: '리니어·스크류' }),
  r('Apollo', 'Apptronik', 'na', { dof: 32, handDof: 10, speed: 0.7, weight: 72, payload: 25, height: 172, actuatorTypeLabel: '리니어·스크류' }),
  r('Kenshiro', 'Kawasaki', 'eu', { dof: 18, handDof: 4, speed: 0.4, weight: 80, payload: 7, actuatorTypeLabel: '사이클로이드·유성' }),
  // 같은 칸에 몰린 로봇 — 근접 후보가 막혀 원거리(리더선) 후보가 쓰이는 경우
  ...[0, 1, 2, 3, 4, 5, 6].map((i) =>
    r(`Dense Model ${i}`, i < 4 ? 'Crowd Co' : 'Other Crowd', 'cn', { dof: 30 + (i % 2), handDof: 12, speed: 2, weight: 50 + i, payload: 10 + i, actuatorTypeLabel: '직구동/QDD', price: { min: 5000 + i * 50, max: 5000 + i * 50, conf: 'B', src: 'x' } })
  ),
  r('NoSpec', 'Ghost Co', 'other', { incomplete: true, dof: null, handDof: null, speed: null }),
  r('CLOiD', 'LG Electronics', 'kr', { isLG: true, locomotion: 'wheeled', dof: 20, handDof: 14, speed: 1, weight: 60, payload: 5, actuatorTypeLabel: '미확인' }),
  r('Forecast X', 'Tesla', 'na', { forecast: true, dof: 44, handDof: 22, speed: 3, weight: 55, payload: 25, actuatorTypeLabel: '커스텀 전기(상세 미공개)' }),
];

const round = (v: number) => Math.round(v * 10) / 10;

function snapshotOf(yAxis: YAxisKey) {
  const o = { ...defaultLayoutOptions({ L: 20, D: 40, H: 20, S: 20 }, TYPES), yAxis };
  const L = buildLayout(ROBOTS, o);
  return {
    plot: L.plot,
    title: L.title,
    meta: L.meta,
    xTicks: L.xTicks.map((t) => [round(t.x), t.label]),
    yTicks: L.yTicks.map((t) => [round(t.y), t.label]),
    gridY: L.gridY.map(round),
    points: L.points.map((p) => ({
      id: p.robot.id,
      px: round(p.px),
      py: round(p.py),
      label: { x: round(p.label.x), y: round(p.label.y), anchor: p.label.anchor, leader: p.label.leader ? { x2: round(p.label.leader.x2), y2: round(p.label.leader.y2) } : null },
    })),
    hulls: L.hulls.map((h) => ({ company: h.company, d: h.d, label: { x: round(h.label.x), y: round(h.label.y), anchor: h.label.anchor } })),
    priceBars: L.priceBars.map((b) => [round(b.px), round(b.y1), round(b.y2)]),
    excludedCount: L.excludedCount,
  };
}

describe('buildLayout 좌표·라벨 배치 (조달 태세 색 개편 전후 불변)', () => {
  for (const { value } of Y_AXIS_OPTIONS) {
    it(`Y축 ${value} 스냅샷`, () => {
      expect(snapshotOf(value)).toMatchSnapshot();
    });
  }

  it('조달 태세·색은 좌표에 영향을 주지 않는다 (태세만 바꿔도 px·py·라벨 동일)', () => {
    const base = snapshotOf('type');
    const swapped = ROBOTS.map((x, i) => ({ ...x, ...posture(i % 2 ? 'external' : 'in_house_sells') }));
    const o = { ...defaultLayoutOptions({ L: 20, D: 40, H: 20, S: 20 }, TYPES), yAxis: 'type' as const };
    const L = buildLayout(swapped, o);
    expect(L.points.map((p) => [p.robot.id, round(p.px), round(p.py)])).toEqual(base.points.map((p) => [p.id, p.px, p.py]));
    expect(L.hulls.map((h) => [h.company, h.d, round(h.label.x), round(h.label.y), h.label.anchor])).toEqual(
      base.hulls.map((h) => [h.company, h.d, h.label.x, h.label.y, h.label.anchor])
    );
  });
});

const OPTS = { ...defaultLayoutOptions({ L: 20, D: 40, H: 20, S: 20 }, TYPES), yAxis: 'type' as const };
const pair = (company: string, type: ActuatorMapRobot['actuatorTypeLabel'], dof: number) => [
  r(`${company} A`, company, 'na', { dof, handDof: 8, speed: 1.5, actuatorTypeLabel: type }),
  r(`${company} B`, company, 'na', { dof: dof + 3, handDof: 8, speed: 1.5, actuatorTypeLabel: type }),
];
const box = (company: string, minX: number, minY: number, w = 60, h = 40): HullBox => ({ company, minX, maxX: minX + w, minY, maxY: minY + h });

describe('회사 커버리지 영역 색 배정', () => {
  it('겹치는 두 hull 은 colorIndex 가 다르다', () => {
    const L = buildLayout([...pair('Alpha Co', '직구동/QDD', 30), ...pair('Beta Co', '직구동/QDD', 31)], OPTS);
    expect(L.hulls).toHaveLength(2);
    expect(new Set(L.hulls.map((h) => h.colorIndex)).size).toBe(2);
  });

  it('떨어진 hull 은 같은 인덱스를 받을 수 있고, 같은 입력은 같은 배정이다', () => {
    const far = [box('A', 0, 0), box('B', 500, 400)];
    expect(assignHullColors(far)).toEqual([0, 1]);
    expect(assignHullColors(far)).toEqual(assignHullColors(far));
    const robots = [...pair('Alpha Co', '유압→전기 전환', 10), ...pair('Beta Co', '미확인', 45)];
    const a = buildLayout(robots, OPTS).hulls.map((h) => [h.company, h.colorIndex]);
    expect(a).toEqual(buildLayout(robots, OPTS).hulls.map((h) => [h.company, h.colorIndex]));
  });

  it('8px 이내로 인접하면 다른 색, 그보다 멀면 같은 색 가능', () => {
    expect(assignHullColors([box('A', 0, 0), box('B', 68, 0)])).not.toEqual([0, 0]);
    expect(assignHullColors([box('A', 0, 0), box('B', 69, 0)])).toEqual([0, 1]);
  });

  it('차수·회사명 순으로 처리해 결과가 입력 순서와 무관하다', () => {
    const boxes = [box('Zed', 0, 0), box('Amy', 30, 10), box('Bob', 60, 20)];
    const byName = (bs: HullBox[]) => Object.fromEntries(assignHullColors(bs).map((c, i) => [bs[i]!.company, c]));
    expect(byName([...boxes].reverse())).toEqual(byName(boxes));
  });

  it('서로 겹치지 않는 hull 은 0~5 가 고르게 분배된다 (가장 적게 쓰인 인덱스 우선)', () => {
    const six = Array.from({ length: 6 }, (_, i) => box(`Far ${i}`, i * 200, 0));
    expect([...assignHullColors(six)].sort()).toEqual([0, 1, 2, 3, 4, 5]);
    const seven = Array.from({ length: 7 }, (_, i) => box(`Far ${i}`, i * 200, 0));
    const idx = assignHullColors(seven);
    const counts = [0, 1, 2, 3, 4, 5].map((c) => idx.filter((v) => v === c).length);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(7);
    expect(assignHullColors(seven)).toEqual(idx);
  });

  it('떨어진 hull 이 둘뿐이어도 인접하지 않으면 서로 다른 색을 우선한다', () => {
    expect(assignHullColors([box('A', 0, 0), box('B', 500, 400)])).toEqual([0, 1]);
  });

  it('빈 입력은 빈 배열', () => {
    expect(assignHullColors([])).toEqual([]);
  });

  it('7개 hull 이 전부 겹쳐도 throw 없이 인덱스 0~5', () => {
    const boxes = Array.from({ length: 7 }, (_, i) => box(`Co ${i}`, i, i));
    const idx = assignHullColors(boxes);
    expect(idx).toHaveLength(7);
    for (const c of idx) {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(5);
    }
    const robots = Array.from({ length: 7 }, (_, i) => pair(`Crowd ${i}`, '직구동/QDD', 30)).flat();
    const L = buildLayout(robots, OPTS);
    expect(L.hulls).toHaveLength(7);
    for (const h of L.hulls) expect(h.colorIndex).toBeLessThanOrEqual(5);
  });

  it('hulls[].color 는 CATEGORY_PALETTE[colorIndex] (실제 픽스처 전체)', () => {
    const L = buildLayout(ROBOTS, OPTS);
    expect(L.hulls.length).toBeGreaterThan(0);
    for (const h of L.hulls) expect(h.color).toBe(CATEGORY_PALETTE[h.colorIndex]);
  });

  it('실제 픽스처에서 바운딩 박스가 겹치는 hull 은 같은 색이 아니다', () => {
    const L = buildLayout(ROBOTS, OPTS);
    expect(L.hulls.length).toBeGreaterThan(1);
    const boxes = L.hulls.map((h) => hullBoxOf(h.company, h.d));
    let overlapping = 0;
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!;
        const b = boxes[j]!;
        if (a.minX <= b.maxX && b.minX <= a.maxX && a.minY <= b.maxY && b.minY <= a.maxY) {
          overlapping += 1;
          expect(L.hulls[i]!.colorIndex).not.toBe(L.hulls[j]!.colorIndex);
        }
      }
    }
    expect(overlapping).toBeGreaterThan(0);
  });
});

function hullBoxOf(company: string, d: string): HullBox {
  const nums = [...d.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map((m) => [Number(m[1]), Number(m[2])] as const);
  const xs = nums.map((n) => n[0]);
  const ys = nums.map((n) => n[1]);
  return { company, minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

describe('hullLabelDot', () => {
  const co = 'Unitree Robotics';
  it('start 는 x-8, end 는 x+8, middle 은 폭/2+8 왼쪽, 세로는 y-4', () => {
    expect(hullLabelDot({ company: co, label: { x: 100, y: 50, anchor: 'start' } })).toEqual({ cx: 92, cy: 46 });
    expect(hullLabelDot({ company: co, label: { x: 100, y: 50, anchor: 'end' } })).toEqual({ cx: 108, cy: 46 });
    expect(hullLabelDot({ company: co, label: { x: 100, y: 50, anchor: 'middle' } })).toEqual({ cx: 100 - labelWidth(co) / 2 - 8, cy: 46 });
  });
});

describe('hullEmphasis', () => {
  const hulls = [{ company: 'Unitree Robotics' }, { company: 'Agibot' }, { company: 'Fourier' }];
  const base = { fillOpacity: HULL_FILL, strokeOpacity: HULL_STROKE, strokeWidth: HULL_STROKE_W };

  it('hover 가 null 이면 전부 기본값', () => {
    expect(hullEmphasis(null, hulls)).toEqual({ 'Unitree Robotics': base, Agibot: base, Fourier: base });
  });

  it('일치하는 회사만 강조하고 나머지는 비강조', () => {
    const e = hullEmphasis('Agibot', hulls);
    expect(e['Agibot']).toEqual({ fillOpacity: HULL_FILL_ON, strokeOpacity: HULL_STROKE, strokeWidth: HULL_STROKE_W_ON });
    for (const c of ['Unitree Robotics', 'Fourier']) expect(e[c]).toEqual({ fillOpacity: HULL_FILL_OFF, strokeOpacity: HULL_STROKE_OFF, strokeWidth: HULL_STROKE_W });
  });

  it('어떤 hull 과도 일치하지 않으면(단일 로봇 회사·LG 등) 아무것도 흐려지지 않는다', () => {
    expect(hullEmphasis('LG Electronics', hulls)).toEqual({ 'Unitree Robotics': base, Agibot: base, Fourier: base });
    expect(hullEmphasis('agibot', hulls)['Agibot']).toEqual(base);
    expect(hullEmphasis('Agibot', [])).toEqual({});
  });
});

describe('hull 불투명도 상수', () => {
  it('기본 채움은 0.08~0.15, 강조 > 기본 > 비강조', () => {
    expect(HULL_FILL).toBeGreaterThanOrEqual(0.08);
    expect(HULL_FILL).toBeLessThanOrEqual(0.15);
    expect(HULL_FILL_ON).toBeGreaterThan(HULL_FILL);
    expect(HULL_FILL_OFF).toBeLessThan(HULL_FILL);
    expect(HULL_STROKE_OFF).toBeLessThan(HULL_STROKE);
    expect(HULL_STROKE_W_ON).toBeGreaterThan(HULL_STROKE_W);
  });
});

type P2 = [number, number];

function polyOf(d: string): P2[] {
  return [...d.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map((m) => [Number(m[1]), Number(m[2])] as P2);
}

function inside(poly: P2[], x: number, y: number): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function edgeDist(poly: P2[], x: number, y: number): number {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i]!;
    const [bx, by] = poly[(i + 1) % poly.length]!;
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)));
  }
  return best;
}

const cmpStr = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

describe('영역 번호 배지·색인', () => {
  const overlapPair = [...pair('Alpha Co', '직구동/QDD', 30), ...pair('Beta Co', '직구동/QDD', 31)];
  const wide = (company: string, type: ActuatorMapRobot['actuatorTypeLabel'], dof: number) => [
    r(`${company} A`, company, 'na', { dof, handDof: 8, speed: 1.5, actuatorTypeLabel: type }),
    r(`${company} B`, company, 'na', { dof: dof + 20, handDof: 8, speed: 1.5, actuatorTypeLabel: type }),
  ];
  const apart = [...wide('Left Co', '유압→전기 전환', 10), ...wide('Right Co', '미확인', 25)];
  const cases: [string, ActuatorMapRobot[]][] = [
    ['픽스처 전체', ROBOTS],
    ['겹치는 2개사', overlapPair],
    ['떨어진 2개사', apart],
  ];

  it('배지 중심은 hull polygon 안쪽이고 변까지 9px 이상 (모든 Y축)', () => {
    for (const [, robots] of cases) {
      for (const { value } of Y_AXIS_OPTIONS) {
        const L = buildLayout(robots, { ...OPTS, yAxis: value });
        for (const h of L.hulls) {
          const poly = polyOf(h.d);
          expect(inside(poly, h.badge.x, h.badge.y)).toBe(true);
          expect(edgeDist(poly, h.badge.x, h.badge.y)).toBeGreaterThanOrEqual(9);
        }
      }
    }
  });

  it('번호는 정확히 1..N, 중복 없음', () => {
    for (const [, robots] of cases) {
      const L = buildLayout(robots, OPTS);
      expect(L.hulls.map((h) => h.index).sort((a, b) => a - b)).toEqual(L.hulls.map((_, i) => i + 1));
    }
  });

  it('번호 순서 = robotCount 내림차순 → centroid x 오름차순 → 회사명', () => {
    const L = buildLayout(ROBOTS, OPTS);
    const expected = [...L.hulls]
      .sort((a, b) => b.robotCount - a.robotCount || polygonCentroid(polyOf(a.d))[0] - polygonCentroid(polyOf(b.d))[0] || cmpStr(a.company, b.company))
      .map((h) => h.company);
    expect(hullIndexRows(L.hulls).map((x) => x.company)).toEqual(expected);
    expect(expected[0]).toBe('Crowd Co');
    expect(L.hulls.find((h) => h.company === 'Crowd Co')!.robotCount).toBe(4);
    expect(expected.slice(1, 3).sort()).toEqual(['Other Crowd', 'Unitree Robotics']);
    expect(expected.slice(3).sort()).toEqual(['Boston Dynamics', 'Figure AI']);
    // 같은 로봇 수(3) 안에서는 centroid x 가 작은 쪽이 앞
    const [a, b] = expected.slice(1, 3).map((c) => polygonCentroid(polyOf(L.hulls.find((h) => h.company === c)!.d))[0]);
    expect(a!).toBeLessThanOrEqual(b!);
  });

  it('회사명 동률 규칙: 로봇 수·centroid x 가 같으면 회사명 코드 단위 순', () => {
    // 같은 x·같은 로봇 수, y 만 다른 두 회사 (타입 행이 달라 겹치지 않음)
    const robots = [...pair('Zeta Co', '유압→전기 전환', 20), ...pair('Alpha Co', '미확인', 20)];
    const L = buildLayout(robots, OPTS);
    expect(hullIndexRows(L.hulls).map((x) => x.company)).toEqual(['Alpha Co', 'Zeta Co']);
  });

  it('결정적: 같은 입력은 같은 index·badge, 로봇 배열을 뒤집어도 회사별 index 동일', () => {
    const a = buildLayout(ROBOTS, OPTS);
    const b = buildLayout(ROBOTS, OPTS);
    expect(b.hulls.map((h) => [h.company, h.index, h.badge])).toEqual(a.hulls.map((h) => [h.company, h.index, h.badge]));
    const rev = buildLayout([...ROBOTS].reverse(), OPTS);
    const idx = (L: typeof a) => Object.fromEntries(L.hulls.map((h) => [h.company, h.index]));
    expect(idx(rev)).toEqual(idx(a));
  });

  it('polygonCentroid: 정사각형·삼각형·방향·퇴화', () => {
    expect(polygonCentroid([[0, 0], [4, 0], [4, 4], [0, 4]])).toEqual([2, 2]);
    expect(polygonCentroid([[0, 4], [4, 4], [4, 0], [0, 0]])).toEqual([2, 2]);
    const t = polygonCentroid([[0, 0], [6, 0], [0, 3]]);
    expect(t[0]).toBeCloseTo(2, 9);
    expect(t[1]).toBeCloseTo(1, 9);
    // 면적 0 → 꼭짓점 평균
    expect(polygonCentroid([[0, 0], [2, 2], [4, 4]])).toEqual([2, 2]);
    expect(polygonCentroid([[3, 5]])).toEqual([3, 5]);
    expect(polygonCentroid([])).toEqual([0, 0]);
    // 비대칭 오목하지 않은 사각형: 면적 가중이 꼭짓점 평균과 다르다
    const q = polygonCentroid([[0, 0], [10, 0], [10, 1], [0, 1], [0, 0.5]]);
    expect(q[0]).toBeCloseTo(5, 6);
  });

  it('떨어진 2개 hull: 배지는 모든 로봇 점과 17 이상, 서로 20 이상', () => {
    const L = buildLayout(apart, OPTS);
    expect(L.hulls).toHaveLength(2);
    for (const h of L.hulls) for (const p of L.points) expect(Math.hypot(h.badge.x - p.px, h.badge.y - p.py)).toBeGreaterThanOrEqual(17);
    expect(Math.hypot(L.hulls[0]!.badge.x - L.hulls[1]!.badge.x, L.hulls[0]!.badge.y - L.hulls[1]!.badge.y)).toBeGreaterThanOrEqual(20);
  });

  it('robotCount·robotNames(난이도 x 오름차순, 동률 이름순)·posture(우선순위)', () => {
    const mk = (name: string, p: Parameters<typeof posture>[0], dof: number, over: Partial<ActuatorMapRobot> = {}) =>
      r(name, 'Mix Co', 'na', { dof, handDof: 8, speed: 1.5, actuatorTypeLabel: '직구동/QDD', ...posture(p), ...over });
    const robots = [mk('Zed', 'external', 30), mk('Bee', 'unknown', 30), mk('Ace', 'in_house', 20), mk('Cat', 'unknown', 40)];
    const h = buildLayout(robots, OPTS).hulls[0]!;
    expect(h.robotCount).toBe(4);
    expect(h.robotNames).toEqual(['Ace', 'Bee', 'Zed', 'Cat']);
    expect(h.posture).toBe('in_house');
    const sells = buildLayout([...robots, mk('Sell', 'in_house_sells', 35)], OPTS).hulls[0]!;
    expect(sells.posture).toBe('in_house_sells');
    const ext = buildLayout([mk('A', 'external', 20), mk('B', 'unknown', 30)], OPTS).hulls[0]!;
    expect(ext.posture).toBe('external');
    const unk = buildLayout([mk('A', 'unknown', 20), mk('B', 'unknown', 30)], OPTS).hulls[0]!;
    expect(unk.posture).toBe('unknown');
  });

  it('예측 모델: includeForecast 면 robotCount 에 포함, 예측만 있는 회사의 posture 는 unknown', () => {
    const f = (name: string, dof: number) =>
      r(name, 'Future Co', 'na', { forecast: true, dof, handDof: 8, speed: 1.5, actuatorTypeLabel: '직구동/QDD', ...posture('in_house') });
    const robots = [f('F1', 20), f('F2', 30), ...pair('Real Co', '미확인', 20)];
    expect(buildLayout(robots, OPTS).hulls.map((h) => h.company)).toEqual(['Real Co']);
    const on = buildLayout(robots, { ...OPTS, includeForecast: true });
    const fut = on.hulls.find((h) => h.company === 'Future Co')!;
    expect(fut.robotCount).toBe(2);
    expect(fut.posture).toBe('unknown');
  });

  it('hullIndexRows: 행 수 = hull 수, 번호 오름차순, 원본 순서 불변, 태세 라벨', () => {
    const L = buildLayout(ROBOTS, OPTS);
    const before = L.hulls.map((h) => h.company);
    const rows = hullIndexRows(L.hulls);
    expect(rows).toHaveLength(L.hulls.length);
    expect(rows.map((x) => x.index)).toEqual(rows.map((_, i) => i + 1));
    expect(L.hulls.map((h) => h.company)).toEqual(before);
    for (const row of rows) {
      const h = L.hulls.find((x) => x.company === row.company)!;
      expect(row.color).toBe(h.color);
      expect(row.colorIndex).toBe(h.colorIndex);
      expect(row.robotsFull).toBe(h.robotNames.join(', '));
    }
    expect(rows[0]!.robots).toBe('Dense Model 0, Dense Model 2, Dense Model 1 외 1기');
  });

  it('formatRobotNames: 3개 이하 전부, 4개 이상 "외 n기"', () => {
    expect(formatRobotNames([])).toBe('');
    expect(formatRobotNames(['A'])).toBe('A');
    expect(formatRobotNames(['A', 'B', 'C'])).toBe('A, B, C');
    expect(formatRobotNames(['A', 'B', 'C', 'D'])).toBe('A, B, C 외 1기');
    expect(formatRobotNames(['A', 'B', 'C', 'D', 'E', 'F'])).toBe('A, B, C 외 3기');
  });

  it('badgeTextTone: 파랑(0)·초록(5)만 light', () => {
    expect([0, 1, 2, 3, 4, 5].map(badgeTextTone)).toEqual(['light', 'dark', 'dark', 'dark', 'dark', 'light']);
  });

  it('hull 옵션이 꺼지면 hulls 와 색인 행이 비고, 로봇 1기 회사는 hull 이 없다', () => {
    const off = buildLayout(ROBOTS, { ...OPTS, hull: false });
    expect(off.hulls).toEqual([]);
    expect(hullIndexRows(off.hulls)).toEqual([]);
    expect(buildLayout([r('Solo', 'Solo Co', 'na', { dof: 20, handDof: 4, speed: 1, actuatorTypeLabel: '미확인' })], OPTS).hulls).toEqual([]);
  });

  it('지역 필터로 hull 이 줄면 번호가 1..N 으로 재부여된다', () => {
    const all = buildLayout(ROBOTS, OPTS);
    const noCn = buildLayout(ROBOTS, { ...OPTS, regions: { ...OPTS.regions, cn: false } });
    expect(noCn.hulls.length).toBeLessThan(all.hulls.length);
    expect(noCn.hulls.map((h) => h.index).sort((a, b) => a - b)).toEqual(noCn.hulls.map((_, i) => i + 1));
  });
});
