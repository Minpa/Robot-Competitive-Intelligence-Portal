import { describe, expect, it } from 'vitest';
import { buildSupplyGraph, unregisteredVendorNames } from './actuator-supply-graph';
import { adoption, seedAdoptionCases, seedResponse, sp } from './actuator-strategy.fixtures';

describe('buildSupplyGraph', () => {
  const d = seedResponse();
  const g = buildSupplyGraph(d.edges, d.robots, d.adoptions, d.suppliers);

  it('좌: 외부 조달 엣지가 있는 로봇만 (자체 엣지 없음), 점 색 = 조달 태세', () => {
    expect(g.robots.map((r) => r.name).sort()).toEqual(['Atlas', 'HUBO 2', 'Optimus Gen 2']);
    expect(g.robots.find((r) => r.name === 'HUBO 2')!.posture).toBe('in_house');
    const selfEdge = { ...d.edges[0]!, vendor: 'SelfCo', basis: 'self' as const, inHouse: true };
    expect(buildSupplyGraph([...d.edges, selfEdge], d.robots, d.adoptions, d.suppliers).vendors.some((v) => v.name === 'SelfCo')).toBe(false);
  });

  it('중: 엣지 공급사와 수요 사례 공급사를 sameVendor 로 병합, "A / B" 는 분리', () => {
    const names = g.vendors.map((v) => v.name);
    expect(names.filter((n) => /mobis/i.test(n))).toHaveLength(1);
    expect(names).toContain('Tuopu Group');
    expect(names).toContain('Sanhua Intelligent Controls');
    expect(names.filter((n) => /cubemars/i.test(n))).toHaveLength(1);
    // (사례 수 + 엣지 수) 내림차순
    const w = g.vendors.map((v) => v.caseCount + v.edgeCount);
    expect([...w].sort((a, b) => b - a)).toEqual(w);
  });

  it('부품 층: 속 빈 마커 대상(level=component) 노드와 점선 대상 링크', () => {
    expect(g.vendors.find((v) => v.name === 'maxon')!.level).toBe('component');
    expect(g.vendors.find((v) => v.name === 'Hyundai Mobis')!.level).toBe('module');
    expect(g.links.some((l) => l.level === 'component')).toBe(true);
  });

  it('수요 사례 공급사는 모두 노드로 나타난다 (제품 스펙 유무와 무관)', () => {
    const cases = [adoption({ id: 'x', actuatorVendor: 'Schaeffler' }), adoption({ id: 'y', actuatorVendor: 'Kinova' })];
    const gg = buildSupplyGraph([], [], cases, [sp('Kinova', 'Jaco')]);
    expect(gg.vendors.map((v) => v.name).sort()).toEqual(['Kinova', 'Schaeffler']);
    expect(gg.vendors.find((v) => v.name === 'Kinova')!.registered).toBe(true);
    expect(unregisteredVendorNames([], [], cases, [sp('Kinova', 'Jaco')])).toEqual(['Schaeffler']);
  });

  it('비관절 부품 공급사(수요 사례에 없는 부품 층 엣지)는 노드로 만들지 않는다', () => {
    const edge = { ...d.edges[3]!, vendor: 'Robotiq' };
    const gg = buildSupplyGraph([edge], d.robots, d.adoptions, d.suppliers);
    expect(gg.vendors.some((v) => v.name === 'Robotiq')).toBe(false);
  });

  it('행 좌표: ROW_H 24, 높이 = TOP + 최대 행 수 × 24 + 16', () => {
    const rows = Math.max(g.robots.length, g.vendors.length, g.cases.length);
    expect(g.height).toBe(34 + rows * 24 + 16);
    expect(g.vendors[0]!.y).toBe(34 + 12);
  });

  it('빈 입력은 empty', () => {
    expect(buildSupplyGraph([], [], [], []).empty).toBe(true);
  });

  it('실데이터 30건: 사례 노드 30, 병합 후 공급사 노드가 사례 공급사 수 이하', () => {
    const cases = seedAdoptionCases();
    if (!cases) return;
    const gg = buildSupplyGraph([], [], cases, []);
    expect(gg.cases).toHaveLength(30);
    expect(gg.vendors.length).toBeLessThanOrEqual(new Set(cases.map((c) => c.actuatorVendor)).size + 1);
    expect(gg.links.filter((l) => l.side === 'right').length).toBeGreaterThanOrEqual(30);
  });
});
