import { describe, expect, it } from 'vitest';
import type { ActuatorMapRobot, ActuatorTypeLabel } from '@/types/actuator-map';
import { Y_AXIS_OPTIONS, buildLayout, defaultLayoutOptions, type YAxisKey } from './actuator-map-layout';
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
  });
});
