import { describe, expect, it } from 'vitest';
import type { ActuatorAdoptionCase, ActuatorMapResponse, ActuatorMapRobot, ActuatorSupplierProduct, RobotSourcing, SourcingPosture } from '@/types/actuator-map';
import {
  BOARD_GROUP_ORDER,
  TREE_NODE_LABEL,
  TREE_QUESTION_TEXT,
  buildSourcingBoard,
  checkSourcingTree,
  type BoardGroupId,
  type SourcingBoard,
  type SourcingTree,
  type SourcingTreeNode,
} from './actuator-sourcing-board';
import { liveSnapshotTrimmed } from './actuator-sourcing-board.fixtures';
import { posture, response, robot, sp } from './actuator-strategy.fixtures';

const ev = (vendor: string, role: string | null, level: 'module' | 'component' = 'module'): RobotSourcing['externalVendors'][number] => ({ vendor, role, grade: null, url: null, level });
const rb = (name: string, company: string, p: SourcingPosture, so: Partial<RobotSourcing> = {}, over: Partial<ActuatorMapRobot> = {}): ActuatorMapRobot =>
  robot(name, company, [], { ...over, ...posture(p, so) });
const data = (robots: ActuatorMapRobot[], suppliers: ActuatorSupplierProduct[] = [], adoptions: ActuatorAdoptionCase[] = []): ActuatorMapResponse => response(robots, suppliers, { adoptions });

const live = () => buildSourcingBoard(liveSnapshotTrimmed());
const leaf = (b: SourcingBoard, id: string) => b.tree!.leaves.find((l) => l.id === id)!;
const names = (n: SourcingTreeNode) => n.companies.map((c) => c.name);
const walk = (n: SourcingTreeNode, f: (n: SourcingTreeNode) => void) => {
  f(n);
  n.children.forEach((c) => walk(c, f));
};

describe('분류 트리 — 실데이터 (trimmed 스냅샷)', () => {
  const b = live();

  it('모든 노드에서 count === companies.length 이고 root.count === companyCount 이며 checkSourcingTree 는 빈 배열', () => {
    walk(b.tree!.root, (n) => expect(n.count).toBe(n.companies.length));
    expect(b.tree!.root.count).toBe(b.companyCount);
    expect(b.tree!.root.count).toBe(25);
    expect(checkSourcingTree(b.tree, b.companyCount)).toEqual([]);
  });

  it('노드 id·질문·라벨·구조가 명세와 같다', () => {
    const r = b.tree!.root;
    expect([r.id, r.label, r.question]).toEqual(['root', '로봇 제조사', undefined]);
    expect(r.children.map((c) => [c.id, c.question, c.label, c.count])).toEqual([
      ['inhouse_design', '①', '자체 설계', 17],
      ['external_module', '①', '외부 설계', 2],
      ['unknown', '①', '공개 근거 없음', 6],
    ]);
    const design = r.children[0]!;
    expect(design.children.map((c) => [c.id, c.question, c.label, c.count])).toEqual([
      ['inhouse_mfg', '②', '자체 제조', 15],
      ['inhouse_design_external_mfg', '②', '외부에 맡겨 제조', 2],
    ]);
    expect(design.children[0]!.children.map((c) => [c.id, c.question, c.label, c.count])).toEqual([
      ['inhouse_all', '③', '외부 구매 기록 없음', 13],
      ['inhouse_parts_bought', '③', '외부 구매', 2],
    ]);
    walk(r, (n) => expect(n.label).toBe(TREE_NODE_LABEL[n.id]));
    expect(TREE_QUESTION_TEXT).toEqual({ '①': '① 관절 모듈을 누가 설계했나?', '②': '② 그 모듈을 누가 만드나?', '③': '③ 모터·감속기 같은 속 부품은?' });
  });

  it('말단 5개: id·수·회사 순서·detail 이 §7 과 같다 (합계 13+2+2+2+6)', () => {
    expect(b.tree!.leaves.map((l) => [l.id, l.count])).toEqual([
      ['inhouse_all', 13],
      ['inhouse_parts_bought', 2],
      ['inhouse_design_external_mfg', 2],
      ['external_module', 2],
      ['unknown', 6],
    ]);
    expect(b.tree!.leaves.reduce((a, l) => a + l.count, 0)).toBe(25);
    const shown = (id: string) => leaf(b, id).companies.map((c) => (c.detail ? `${c.name} (${c.detail})` : c.name));
    expect(shown('inhouse_all')).toEqual([
      'Unitree Robotics',
      '1X Technologies',
      'Agibot',
      'Figure AI',
      'Fourier Intelligence',
      'UBTECH',
      'Apptronik',
      'LimX Dynamics',
      'Xiaomi',
      'Agility Robotics',
      'Kepler Robot',
      'Mentee Robotics',
      'Sanctuary AI',
    ]);
    expect(shown('inhouse_parts_bought')).toEqual(['PAL Robotics (Harmonic Drive 감속기, TQ-Group (RoboDrive) 모터)', 'Rainbow Robotics (maxon 모터)']);
    expect(shown('inhouse_design_external_mfg')).toEqual(['Tesla (Tuopu Group, Sanhua Intelligent Controls 위탁제조)', 'Boston Dynamics (Hyundai Mobis 양산 공급)']);
    expect(shown('external_module')).toEqual(['Diligent Robotics (Kinova)', 'NEURA Robotics (Schaeffler)']);
    expect(shown('unknown')).toEqual(['Aeolus Robotics', 'Engineered Arts', 'Honda', 'Savioke', 'SoftBank Robotics', 'Toyota']);
    expect(leaf(b, 'external_module').hint).toBe('남이 만든 모듈을 사서 씀');
    expect(leaf(b, 'unknown').hint).toBe('근거가 없을 뿐, 외부 조달이라는 뜻은 아님');
    for (const id of ['inhouse_all', 'inhouse_parts_bought', 'inhouse_design_external_mfg']) expect(leaf(b, id).hint).toBeUndefined();
    // 수기 주석 없음
    expect(JSON.stringify(b.tree)).not.toMatch(/로봇 암|TQ 모터|Tuopu·Sanhua/);
  });

  it('로봇 수(robots)는 회사 로봇 수이고 내부 노드에는 detail·hint 가 없다', () => {
    const c = leaf(b, 'inhouse_all').companies;
    expect(c[0]).toEqual({ name: 'Unitree Robotics', robots: 5 });
    walk(b.tree!.root, (n) => {
      if (n.children.length === 0) return;
      expect(n.hint).toBeUndefined();
      for (const x of n.companies) expect(x.detail).toBeUndefined();
    });
  });

  it('말단 회사 집합이 rows 의 G1~G4 와 정확히 일치한다 (G1 은 component 구매 유무로 분할)', () => {
    const g = (id: BoardGroupId) => b.rows.find((r) => r.id === id)!.companies.map((c) => c.name);
    expect([...names(leaf(b, 'inhouse_all')), ...names(leaf(b, 'inhouse_parts_bought'))].sort()).toEqual([...g('G1')].sort());
    expect([...names(leaf(b, 'inhouse_design_external_mfg'))].sort()).toEqual([...g('G2')].sort());
    expect([...names(leaf(b, 'external_module'))].sort()).toEqual([...g('G3')].sort());
    expect([...names(leaf(b, 'unknown'))].sort()).toEqual([...g('G4')].sort());
    expect(BOARD_GROUP_ORDER.map((id) => b.groupCounts[id])).toEqual([15, 2, 2, 6]);
    expect(names(leaf(b, 'inhouse_parts_bought'))).toEqual(['PAL Robotics', 'Rainbow Robotics']);
  });

  it('표의 회사 순서·공급사 문자열과 트리 detail 이 같은 헬퍼에서 나온다', () => {
    const row = (id: BoardGroupId) => b.rows.find((r) => r.id === id)!;
    for (const c of leaf(b, 'inhouse_parts_bought').companies) {
      const line = row('G1').bought.find((l) => l.text.startsWith(`${c.name}: `))!;
      expect(line.text).toBe(`${c.name}: ${c.detail}`);
    }
    // G3: 표는 로봇별, 트리는 회사별 — 공급사명은 표에 모두 나타난다
    for (const c of leaf(b, 'external_module').companies) {
      const lines = row('G3').bought.map((l) => l.text).join('|');
      expect(lines).toContain(c.detail!);
    }
  });

  it('입력을 변경하지 않고 결정적이다', () => {
    const d = liveSnapshotTrimmed();
    const before = JSON.stringify(d);
    const a = buildSourcingBoard(d);
    expect(JSON.stringify(d)).toBe(before);
    expect(buildSourcingBoard(liveSnapshotTrimmed()).tree).toEqual(a.tree);
    expect(JSON.stringify(buildSourcingBoard(liveSnapshotTrimmed()))).toBe(JSON.stringify(a));
  });
});

describe('분류 트리 — 엣지', () => {
  it('P12: 일부 로봇만 외부 모듈을 쓰는 G1 회사는 inhouse_all 에 두고 detail 로 드러낸다', () => {
    const b = buildSourcingBoard(
      data([rb('H1', 'Half', 'in_house'), rb('H2', 'Half', 'external', { externalVendors: [ev('Partner', 'component supply', 'module')] }), rb('P', 'Plain', 'in_house')])
    );
    const all = leaf(b, 'inhouse_all');
    expect(all.companies).toEqual([{ name: 'Half', robots: 2, detail: '일부 로봇 외부 조달: Partner' }, { name: 'Plain', robots: 1 }]);
    expect(leaf(b, 'inhouse_parts_bought').count).toBe(0);
    expect(checkSourcingTree(b.tree, b.companyCount)).toEqual([]);
  });

  it('G1 회사가 부품도 사고 일부 로봇은 외부 모듈이면 외부 구매에 두고 두 정보를 모두 적는다', () => {
    const b = buildSourcingBoard(
      data([
        rb('H1', 'Both', 'in_house', { componentSourcing: true, externalVendors: [ev('maxon', 'component supply', 'component')] }),
        rb('H2', 'Both', 'external', { externalVendors: [ev('Partner', 'component supply', 'module')] }),
      ])
    );
    expect(leaf(b, 'inhouse_parts_bought').companies).toEqual([{ name: 'Both', robots: 2, detail: 'maxon 모터, 일부 로봇 외부 조달: Partner' }]);
  });

  it('부품 종류를 모르는 component 공급사는 vendor 만 쓴다', () => {
    const b = buildSourcingBoard(data([rb('R', 'Co', 'in_house', { externalVendors: [ev('Foo Corp', null, 'component'), ev('maxon', null, 'component')] })]));
    expect(leaf(b, 'inhouse_parts_bought').companies[0]!.detail).toBe('Foo Corp, maxon 모터');
  });

  it('G3: 모듈 층 공급사가 없고 component 만 있는 external 은 "공급사 정보 없음"', () => {
    const b = buildSourcingBoard(data([rb('N1', 'NoVendor', 'external'), rb('N2', 'OnlyComp', 'external', { externalVendors: [ev('maxon', 'component supply', 'component')] })]));
    expect(leaf(b, 'external_module').companies.map((c) => [c.name, c.detail])).toEqual([
      ['NoVendor', '공급사 정보 없음'],
      ['OnlyComp', '공급사 정보 없음'],
    ]);
  });

  it('G3: 회사의 external 로봇 전체에서 공급사를 중복 제거해 ", " 로 잇는다', () => {
    const b = buildSourcingBoard(
      data([
        rb('R1', 'Buyer', 'external', { externalVendors: [ev('Vend A', 'component supply'), ev('Vend B', null)] }),
        rb('R2', 'Buyer', 'external', { externalVendors: [ev('vend a', 'component supply')] }),
      ])
    );
    expect(leaf(b, 'external_module').companies).toEqual([{ name: 'Buyer', robots: 2, detail: 'Vend A, Vend B' }]);
  });

  it('G2: role 별로 묶고 여러 role 은 " / " 로 잇는다 (혼합 role)', () => {
    const b = buildSourcingBoard(
      data([rb('X1', 'Mix', 'external', { externalVendors: [ev('V1', 'contract manufacturing'), ev('V2', 'MASS-PRODUCTION SUPPLY'), ev('V3', 'contract manufacturing')] })])
    );
    expect(leaf(b, 'inhouse_design_external_mfg').companies[0]!.detail).toBe('V1, V3 위탁제조 / V2 양산 공급');
  });

  it('LG 는 회사 단위로 제외되고 forecast 로봇은 세지 않는다', () => {
    const b = buildSourcingBoard(
      data([
        rb('CLOiD', 'LG Electronics', 'in_house_sells', {}, { isLG: true }),
        rb('LG2', 'LG Electronics', 'in_house'),
        rb('Real', 'Alpha', 'in_house'),
        rb('Fc', 'Ghost', 'in_house', {}, { forecast: true }),
      ])
    );
    expect(b.tree!.root.count).toBe(1);
    expect(JSON.stringify(b.tree)).not.toMatch(/LG Electronics|Ghost/);
  });

  it('빈 입력·LG 만 있는 입력은 tree 가 null', () => {
    expect(buildSourcingBoard(null).tree).toBeNull();
    expect(buildSourcingBoard(data([])).tree).toBeNull();
    expect(buildSourcingBoard(data([rb('CLOiD', 'LG Electronics', 'in_house_sells', {}, { isLG: true })])).tree).toBeNull();
  });

  it('회사 수가 0 인 말단도 트리 데이터에는 count 0 으로 남는다', () => {
    const b = buildSourcingBoard(data([rb('A', 'Alpha', 'in_house')]));
    expect(b.tree!.leaves.map((l) => [l.id, l.count])).toEqual([
      ['inhouse_all', 1],
      ['inhouse_parts_bought', 0],
      ['inhouse_design_external_mfg', 0],
      ['external_module', 0],
      ['unknown', 0],
    ]);
    expect(checkSourcingTree(b.tree, b.companyCount)).toEqual([]);
  });

  it('정렬: 로봇 수 내림차순, 같으면 이름 코드 단위 오름차순', () => {
    const b = buildSourcingBoard(
      data([rb('r1', 'beta', 'unknown'), rb('r2', 'Zeta', 'unknown'), rb('r3', 'Alpha', 'unknown'), rb('r4', 'Alpha', 'unknown'), rb('r5', '가나', 'unknown')])
    );
    expect(names(leaf(b, 'unknown'))).toEqual(['Alpha', 'Zeta', 'beta', '가나']);
  });
});

describe('checkSourcingTree — 위반 검출', () => {
  const clone = (): SourcingTree => JSON.parse(JSON.stringify(live().tree)) as SourcingTree;

  it('정상 트리는 빈 배열, null 은 회사 수가 0 일 때만 정상', () => {
    expect(checkSourcingTree(clone(), 25)).toEqual([]);
    expect(checkSourcingTree(null, 0)).toEqual([]);
    expect(checkSourcingTree(null, 3)).not.toEqual([]);
  });

  it('count 불일치·root 불일치·중복·내부 detail 을 잡는다', () => {
    const t1 = clone();
    t1.leaves[0]!.count = 99;
    expect(checkSourcingTree(t1, 25).join('|')).toContain('count');
    expect(checkSourcingTree(clone(), 24).join('|')).toContain('root.count');
    const t3 = clone();
    t3.root.companies[1] = { ...t3.root.companies[0]! };
    expect(checkSourcingTree(t3, 25).join('|')).toContain('중복');
    const t4 = clone();
    t4.root.children[0]!.companies[0]!.detail = 'x';
    expect(checkSourcingTree(t4, 25).join('|')).toContain('detail');
  });
});

describe('salesAnswer (④)', () => {
  const quad = (v: string) => sp(v, 'Quad-1', { targetMarket: 'quadruped robots, research' });

  it('실데이터: 휴머노이드 판매 0개사, 소형·사족용 모터만 판매 2개사', () => {
    const a = live().salesAnswer!;
    expect(a.humanoidSellers).toBe(0);
    expect(a.humanoidSellerList).toEqual([]);
    expect(a.smallMotorSellers).toEqual([
      { company: 'Unitree Robotics', products: ['GO-M8010-6'] },
      { company: 'Xiaomi', products: ['CyberGear Micro Motor'] },
    ]);
    expect(a.sentence).toBe('휴머노이드용 액추에이터(관절 모듈): 0개사 · 소형·사족용 모터만 판매: Unitree Robotics(GO-M8010-6), Xiaomi(CyberGear Micro Motor)');
  });

  it('휴머노이드 판매 있음: n개사 + 업체·제품, 그 외 판매는 "그 외 판매" 라벨', () => {
    const b = buildSourcingBoard(
      data(
        [rb('A', 'Alpha', 'in_house_sells'), rb('B', 'Beta', 'in_house')],
        [sp('Alpha', 'H1', { targetMarket: 'humanoid robots', priceUsd: 100, status: 'available' }), sp('Alpha', 'Q1', { targetMarket: 'quadruped robots, research' })]
      )
    );
    const a = b.salesAnswer!;
    expect(a.humanoidSellers).toBe(1);
    expect(a.humanoidSellerList).toEqual([{ company: 'Alpha', products: ['H1'] }]);
    expect(a.smallMotorSellers).toEqual([{ company: 'Alpha', products: ['Q1'] }]);
    expect(a.sentence).toBe('휴머노이드용 액추에이터(관절 모듈): 1개사 — Alpha(H1) · 그 외 판매: Alpha(Q1)');
    expect(b.conclusionText).not.toContain('파는 세트 제조사는 없음');
  });

  it('humanoidSellers > 0 ⇔ 결론의 판매 절이 없다 (noHumanoidSale 과 같은 조건)', () => {
    const variants: [string, string][] = [
      ['humanoid robots', 'available'],
      ['biped joints, research', 'available'],
      ['휴머노이드 관절, external customers', 'announced'],
    ];
    for (const [tm, status] of variants) {
      const b = buildSourcingBoard(data([rb('A', 'Alpha', 'in_house_sells')], [sp('Alpha', 'M', { targetMarket: tm, status, priceUsd: 100 })]));
      expect(b.salesAnswer!.humanoidSellers).toBe(1);
      expect(b.conclusionText).not.toContain('파는 세트 제조사는 없음');
    }
    const t1 = buildSourcingBoard(data([rb('A', 'Alpha', 'in_house_sells')], [sp('Alpha', 'T1', { targetMarket: 'research', status: 'available', segments: ['tier1_oem'], segment: 'tier1_oem' })]));
    expect(t1.salesAnswer!.humanoidSellers).toBe(1);
    const none = buildSourcingBoard(data([rb('A', 'Alpha', 'in_house_sells')], [quad('Alpha')]));
    expect(none.salesAnswer!.humanoidSellers).toBe(0);
    expect(none.conclusionText).toContain('파는 세트 제조사는 없음');
  });

  it('소형 모터만 판매: 라벨이 "소형·사족용 모터만 판매", 휴머노이드 판매 회사 목록은 비어 있다', () => {
    const a = buildSourcingBoard(data([rb('A', 'Alpha', 'in_house_sells')], [quad('Alpha')])).salesAnswer!;
    expect(a.humanoidSellerList).toEqual([]);
    expect(a.sentence).toBe('휴머노이드용 액추에이터(관절 모듈): 0개사 · 소형·사족용 모터만 판매: Alpha(Quad-1)');
  });

  it('suppliers 가 비어 있으면 null (S3 가 빈 데이터에서 "없다" 고 단정하지 않는다)', () => {
    const b = buildSourcingBoard(data([rb('A', 'Alpha', 'in_house_sells')], []));
    expect(b.salesAnswer).toBeNull();
    expect(b.tree).not.toBeNull();
  });

  it('외판 제품 정보가 없거나 captive 인 회사는 제외하고, LG 제품은 세지 않는다', () => {
    const b = buildSourcingBoard(
      data(
        [rb('A', 'Capt', 'in_house_sells'), rb('B', 'Nothing', 'in_house_sells'), rb('C', 'Plain', 'in_house'), rb('CLOiD', 'LG Electronics', 'in_house_sells', {}, { isLG: true })],
        [sp('Capt', 'M1', { targetMarket: 'Capt robots (in-house)' }), sp('Plain', 'P1', { targetMarket: 'research' }), sp('LG Electronics', 'AXIUM', { isLG: true, targetMarket: 'humanoid, external partners', status: 'announced' })]
      )
    );
    expect(b.salesAnswer!.smallMotorSellers).toEqual([]);
    expect(b.salesAnswer!.humanoidSellers).toBe(0);
    expect(b.salesAnswer!.sentence).toBe('휴머노이드용 액추에이터(관절 모듈): 0개사');
  });

  it('표의 "외부에 파는 것" 과 같은 제품을 고른다 (실데이터: 표 줄의 제품 = smallMotorSellers 의 model)', () => {
    const b = live();
    const sold = b.rows.find((r) => r.id === 'G1')!.sold.map((l) => l.text);
    for (const s of b.salesAnswer!.smallMotorSellers) {
      const line = sold.find((t) => t.startsWith(`${s.company}: `))!;
      expect(line).toBeDefined();
      for (const p of s.products) expect(line).toContain(p);
    }
    expect(b.salesAnswer!.smallMotorSellers.length).toBe(sold.filter((t) => /^[^0-9].*: /.test(t) && !t.includes('휴머노이드')).length);
  });
});
