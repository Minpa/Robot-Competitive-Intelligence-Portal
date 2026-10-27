import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { ActuatorAdoptionCase, ActuatorMapResponse, ActuatorMapRobot, ActuatorSupplierProduct, RobotSourcing, SourcingPosture } from '@/types/actuator-map';
import { normalizeActuatorMap } from './actuator-map-normalize';
import {
  BOARD_COLOR,
  BOARD_EMPTY_TEXT,
  COMPONENT_PART_KO,
  buildSourcingBoard,
  componentPartKo,
  type BoardGroupId,
  type SourcingBoard,
} from './actuator-sourcing-board';
import { liveSnapshotTrimmed } from './actuator-sourcing-board.fixtures';
import { adoption, posture, response, robot, sp } from './actuator-strategy.fixtures';
import { computeStrategyStats } from './actuator-strategy';

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────

const ev = (vendor: string, role: string | null, level: 'module' | 'component' = 'module'): RobotSourcing['externalVendors'][number] => ({ vendor, role, grade: null, url: null, level });

/** 로봇 하나 — posture 와 sourcing 덮어쓰기를 한 번에 */
const rb = (name: string, company: string, p: SourcingPosture, so: Partial<RobotSourcing> = {}, over: Partial<ActuatorMapRobot> = {}): ActuatorMapRobot =>
  robot(name, company, [], { ...over, ...posture(p, so) });

const data = (robots: ActuatorMapRobot[], suppliers: ActuatorSupplierProduct[] = [], adoptions: ActuatorAdoptionCase[] = []): ActuatorMapResponse =>
  response(robots, suppliers, { adoptions });

const row = (b: SourcingBoard, id: BoardGroupId) => b.rows.find((r) => r.id === id)!;
const texts = (lines: { text: string }[]) => lines.map((l) => l.text);
const names = (b: SourcingBoard, id: BoardGroupId) => row(b, id).companies.map((c) => c.name);
const countsOf = (b: SourcingBoard) => b.tiles.map((t) => t.count);

// ── 그룹 판정 ────────────────────────────────────────────────────────────────

describe('buildSourcingBoard — 그룹 판정', () => {
  it('G1: in_house / in_house_sells / 부품만 외부 조달하는 in_house', () => {
    const b = buildSourcingBoard(
      data([
        rb('A1', 'Alpha', 'in_house'),
        rb('B1', 'Beta', 'in_house_sells'),
        rb('C1', 'Gamma', 'in_house', { componentSourcing: true, externalVendors: [ev('maxon', 'component supply', 'component')] }),
      ])
    );
    expect(countsOf(b)).toEqual([3, 0, 0, 0]);
    expect(names(b, 'G1')).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(texts(row(b, 'G1').bought)).toEqual(['2개사: 없음', 'Gamma: maxon 모터', '(모듈이 아닌 하위 부품)']);
  });

  it('G2: contract manufacturing 만 / mass-production supply 만 / 둘 혼합, role 은 trim·대소문자 무시', () => {
    const b = buildSourcingBoard(
      data([
        rb('T1', 'Tes', 'external', { externalVendors: [ev('Tuopu', 'contract manufacturing'), ev('Sanhua', ' Contract Manufacturing ')] }),
        rb('M1', 'Mob', 'external', { externalVendors: [ev('Hyundai Mobis', 'mass-production supply')] }),
        rb('X1', 'Mix', 'external', { externalVendors: [ev('V1', 'contract manufacturing'), ev('V2', 'MASS-PRODUCTION SUPPLY')] }),
      ])
    );
    expect(countsOf(b)).toEqual([0, 3, 0, 0]);
    expect(texts(row(b, 'G2').bought)).toEqual([
      '자사 설계 모듈의 양산품',
      'Mix: V1(위탁제조), V2(양산 공급)',
      'Mob: Hyundai Mobis(양산 공급)',
      'Tes: Tuopu, Sanhua(위탁제조)',
    ]);
    expect(texts(row(b, 'G2').sold)).toEqual(['없음']);
  });

  it('G2 와 G3 혼합(contract + component supply)은 G3', () => {
    const b = buildSourcingBoard(data([rb('R', 'Co', 'external', { externalVendors: [ev('A', 'contract manufacturing'), ev('B', 'component supply')] })]));
    expect(countsOf(b)).toEqual([0, 0, 1, 0]);
  });

  it('G3: level 은 module 인데 role 이 "component supply" — 부품 공급 라벨을 표시하지 않는다', () => {
    const b = buildSourcingBoard(
      data([rb('4NE1', 'NEURA', 'external', { externalVendors: [ev('Schaeffler', 'component supply', 'module')], noteKo: '관절 액추에이터는 Schaeffler 공급' })])
    );
    expect(countsOf(b)).toEqual([0, 0, 1, 0]);
    const lines = row(b, 'G3').bought;
    expect(texts(lines)).toEqual(['4NE1: Schaeffler', '관절 액추에이터는 Schaeffler 공급']);
    expect(lines[0]!.title).toBeUndefined();
    expect(lines[1]!.muted).toBe(true);
    expect(JSON.stringify(row(b, 'G3'))).not.toContain('부품 공급');
  });

  it('G3: role null · 자유 텍스트(한글 포함)는 G3 이며 tooltip 에 "역할 미상"', () => {
    const b = buildSourcingBoard(
      data([
        rb('R1', 'NullRole', 'external', { externalVendors: [ev('V', null)] }),
        rb('R2', 'Korean', 'external', { externalVendors: [ev('Hyundai Mobis', '양산 단계 액추에이터 공급')] }),
      ])
    );
    expect(countsOf(b)).toEqual([0, 0, 2, 0]);
    for (const l of row(b, 'G3').bought) expect(l.title).toBe('역할 미상');
  });

  it('G3: 모듈 층 공급사가 없는 external (공급사 없음 / 부품 층만)', () => {
    const b = buildSourcingBoard(
      data([
        rb('N1', 'NoVendor', 'external'),
        rb('N2', 'OnlyComp', 'external', { externalVendors: [ev('maxon', 'component supply', 'component')] }),
      ])
    );
    expect(countsOf(b)).toEqual([0, 0, 2, 0]);
    expect(texts(row(b, 'G3').bought)).toEqual(['N1: 공급사 정보 없음', 'N2: 공급사 정보 없음']);
  });

  it('G4: unknown (in_house_presumed 포함)', () => {
    const b = buildSourcingBoard(data([rb('U1', 'Unk', 'unknown'), rb('U2', 'Presumed', 'unknown', { kind: 'in_house_presumed' })]));
    expect(countsOf(b)).toEqual([0, 0, 0, 2]);
    expect(texts(row(b, 'G4').bought)).toEqual(['확인 안 됨']);
    expect(texts(row(b, 'G4').sold)).toEqual(['확인 안 됨']);
    expect(row(b, 'G4').designMfg).toBe('공개 근거 없음');
    expect(row(b, 'G4').muted).toBe(true);
  });

  it('같은 회사에서 posture 가 다르면 companyPosture 우선순위를 따른다 (in_house_sells > in_house > external > unknown)', () => {
    const b = buildSourcingBoard(
      data([
        rb('S1', 'Sells', 'in_house'),
        rb('S2', 'Sells', 'in_house_sells'),
        rb('E1', 'Ext', 'external', { externalVendors: [ev('V', 'contract manufacturing')] }),
        rb('E2', 'Ext', 'unknown'),
        rb('H1', 'Half', 'in_house'),
        rb('H2', 'Half', 'external', { externalVendors: [ev('Partner', 'component supply', 'module')] }),
      ])
    );
    expect(names(b, 'G1')).toEqual(['Half', 'Sells']);
    expect(names(b, 'G2')).toEqual(['Ext']);
    // G1 회사의 external 로봇 공급사는 "(일부 로봇)" 으로 병기 — 부품 층이 아니므로 "(모듈이 아닌 하위 부품)" 은 붙지 않는다
    expect(texts(row(b, 'G1').bought)).toEqual(['1개사: 없음', 'Half: Partner(일부 로봇)']);
  });
});

// ── 제외·정렬·표시 ────────────────────────────────────────────────────────────

describe('buildSourcingBoard — 제외·정렬·표시', () => {
  it('LG 는 회사 단위로 제외(같은 회사의 비-LG 로봇도 함께), forecast 는 로봇 단위로 제외', () => {
    const b = buildSourcingBoard(
      data([
        rb('CLOiD', 'LG Electronics', 'in_house_sells', {}, { isLG: true }),
        rb('LG2', 'LG Electronics', 'in_house'),
        rb('Real', 'Alpha', 'in_house'),
        rb('Fc', 'Alpha', 'in_house', {}, { forecast: true }),
        rb('OnlyFc', 'Ghost', 'in_house', {}, { forecast: true }),
        rb('NoCo', '', 'in_house'),
      ])
    );
    expect(b.companyCount).toBe(1);
    expect(b.robotCount).toBe(1);
    expect(names(b, 'G1')).toEqual(['Alpha']);
    expect(b.excluded).toEqual({ companies: 1, robots: 2 });
    const all = JSON.stringify(b);
    expect(all).not.toContain('LG Electronics');
    expect(all).not.toContain('Ghost');
  });

  it('정렬: 로봇 수 내림차순, 같으면 이름 코드 단위 오름차순 (대소문자·한글 포함, localeCompare 아님)', () => {
    const rs = [
      rb('r1', 'beta', 'in_house'),
      rb('r2', 'Zeta', 'in_house'),
      rb('r3', 'Alpha', 'in_house'),
      rb('r4', 'Alpha', 'in_house'),
      rb('r5', '가나', 'in_house'),
      rb('r6', 'Gamma', 'in_house'),
      rb('r7', 'Gamma', 'in_house'),
    ];
    const b = buildSourcingBoard(data(rs));
    // 로봇 2기: Alpha, Gamma / 1기: 코드 단위 'Zeta'(Z=90) < 'beta'(b=98) < '가나'
    expect(row(b, 'G1').companies.map((c) => c.label)).toEqual(['Alpha(2)', 'Gamma(2)', 'Zeta', 'beta', '가나']);
    // 입력 순서와 무관
    expect(row(buildSourcingBoard(data([...rs].reverse())), 'G1').companies.map((c) => c.label)).toEqual(row(b, 'G1').companies.map((c) => c.label));
  });

  it('회사 tooltip 에 로봇 목록과 로봇별 근거 등급이 있고 본문에는 등급이 없다', () => {
    const b = buildSourcingBoard(data([rb('Rob1', 'Alpha', 'in_house', { evidenceGrade: 'A' }), rb('Rob2', 'Alpha', 'in_house', { evidenceGrade: null })]));
    const c = row(b, 'G1').companies[0]!;
    expect(c.label).toBe('Alpha(2)');
    expect(c.title).toBe('Rob1(A), Rob2(—)');
    expect(c.label).not.toContain('A)');
  });

  it('회사 표시명은 데이터 원문 그대로 (첫 등장 표기)', () => {
    const b = buildSourcingBoard(data([rb('r1', 'Unitree Robotics', 'in_house'), rb('r2', ' unitree robotics ', 'in_house')]));
    expect(names(b, 'G1')).toEqual(['Unitree Robotics']);
    expect(row(b, 'G1').companies[0]!.robotCount).toBe(2);
  });

  it('비어 있는 그룹은 행을 유지하고 "해당 없음", 타일은 0', () => {
    const b = buildSourcingBoard(data([rb('A', 'Alpha', 'in_house')]));
    expect(b.rows.map((r) => r.id)).toEqual(['G1', 'G2', 'G3', 'G4']);
    for (const id of ['G2', 'G3', 'G4'] as const) {
      expect(row(b, id).empty).toBe(true);
      expect(texts(row(b, id).bought)).toEqual([BOARD_EMPTY_TEXT]);
      expect(texts(row(b, id).sold)).toEqual([BOARD_EMPTY_TEXT]);
    }
    expect(countsOf(b)).toEqual([1, 0, 0, 0]);
  });

  it('타일: 라벨·aria-label·색 (tailwind info/pos/neg/ink-400 복제)', () => {
    const b = buildSourcingBoard(data([rb('A', 'Alpha', 'in_house'), rb('U', 'Unk', 'unknown')]));
    expect(b.tiles.map((t) => t.label)).toEqual(['자체 설계 · 자체 제조', '자체 설계 · 외부 제조/양산', '외부 모듈 구매', '확인 불가']);
    expect(b.tiles.map((t) => t.ariaLabel)).toEqual(['자체 설계 · 자체 제조 1개사', '자체 설계 · 외부 제조/양산 0개사', '외부 모듈 구매 0개사', '확인 불가 1개사']);
    expect(b.tiles.map((t) => t.color)).toEqual([BOARD_COLOR.G1, BOARD_COLOR.G2, BOARD_COLOR.G3, BOARD_COLOR.G4]);
    expect(BOARD_COLOR).toEqual({ G1: '#1F4A7A', G2: '#2F7D5A', G3: '#B0452A', G4: '#9AA1AC' });
    expect(b.title).toBe('휴머노이드 세트 제조사 2개사의 액추에이터 조달 방식');
    expect(b.description).toBe('회사 기준 · LG 제외 · 로봇 2기');
  });

  it('부품 종류 매핑: sameVendorName 으로 매칭하고 없으면 vendor 명만', () => {
    expect(COMPONENT_PART_KO).toEqual({ maxon: '모터', 'Harmonic Drive': '감속기', 'TQ-Group (RoboDrive)': '모터', Nabtesco: '감속기' });
    expect(componentPartKo('Maxon Motor')).toBe('모터');
    expect(componentPartKo('Harmonic Drive Systems')).toBe('감속기');
    expect(componentPartKo('Nabtesco')).toBe('감속기');
    expect(componentPartKo('Foo Corp')).toBeNull();
    const b = buildSourcingBoard(
      data([rb('R', 'Co', 'in_house', { componentSourcing: true, externalVendors: [ev('Foo Corp', null, 'component'), ev('maxon', null, 'component')] })])
    );
    expect(texts(row(b, 'G1').bought)).toContain('Co: Foo Corp, maxon 모터');
    expect(b.footnotes.map((f) => f.id)).toContain('partKind');
    expect(buildSourcingBoard(data([rb('R', 'Co', 'in_house')])).footnotes.map((f) => f.id)).not.toContain('partKind');
  });
});

// ── 외부에 파는 것 ────────────────────────────────────────────────────────────

describe('buildSourcingBoard — 외부에 파는 것', () => {
  it('in_house_sells 회사의 제품이 모두 captive((in-house) 로 끝남)이면 "없음" 으로 묶이고, 매칭 제품이 0건이면 "외판 제품 정보 없음"', () => {
    const b = buildSourcingBoard(
      data(
        [rb('A', 'Capt', 'in_house_sells'), rb('B', 'Nothing', 'in_house_sells'), rb('C', 'Plain', 'in_house')],
        [sp('Capt', 'M1', { targetMarket: 'Capt robots (in-house)' })]
      )
    );
    expect(texts(row(b, 'G1').sold)).toEqual(['2개사: 없음', 'Nothing: 외판 제품 정보 없음', '휴머노이드 관절 모듈은 판매 안 함']);
  });

  it('in_house_sells 회사의 외판 제품은 "{model} ({targetMarket 40자 이내})", captive 제품은 제외', () => {
    const long = 'x'.repeat(60);
    const b = buildSourcingBoard(
      data(
        [rb('A', 'Seller Co', 'in_house_sells')],
        [
          sp('Seller Co', 'Open-1', { targetMarket: 'quadruped robots, research' }),
          sp('Seller Co', 'Open-2', { targetMarket: long }),
          sp('Seller Co', 'Own', { targetMarket: 'humanoid (in-house)' }),
          sp('Seller Co', 'NoTarget', { targetMarket: null }),
        ]
      )
    );
    const line = texts(row(b, 'G1').sold)[0]!;
    expect(line).toBe(`Seller Co: Open-1 (quadruped robots, research); Open-2 (${'x'.repeat(39)}…); NoTarget`);
    expect(line).not.toContain('Own');
  });

  it('비-sells 회사의 captive 가 아닌 제품은 파는 것에 나오지 않는다', () => {
    const b = buildSourcingBoard(
      data([rb('A', 'Quiet', 'in_house')], [sp('Quiet', 'Open', { targetMarket: 'research', status: 'available' })])
    );
    expect(texts(row(b, 'G1').sold).join('|')).not.toContain('Open');
    expect(texts(row(b, 'G1').sold)[0]).toBe('1개사: 없음');
  });

  it('LG 제품은 파는 것에 나오지 않는다 (isLG 제품 / LG 회사 매칭 제품)', () => {
    const b = buildSourcingBoard(
      data(
        [rb('CLOiD', 'LG Electronics', 'in_house_sells', {}, { isLG: true }), rb('A', 'Alpha', 'in_house_sells')],
        [sp('LG Electronics', 'AXIUM', { isLG: true, targetMarket: 'external partners from 2027', status: 'announced' }), sp('Alpha', 'A-1', { targetMarket: 'research' })]
      )
    );
    const sold = texts(row(b, 'G1').sold).join('|');
    expect(sold).not.toContain('AXIUM');
    expect(sold).toContain('Alpha: A-1 (research)');
  });
});

// ── 결론 문장 ────────────────────────────────────────────────────────────────

describe('buildSourcingBoard — 결론 문장', () => {
  const g3Robot = (company = 'Buyer') => rb('B1', company, 'external', { externalVendors: [ev('Vend', 'component supply')] });
  const manyG1 = (n: number) => Array.from({ length: n }, (_, i) => rb(`r${i}`, `Co${String(i).padStart(2, '0')}`, 'in_house'));
  const strong = (b: SourcingBoard) => b.conclusion.filter((s) => s.strong).map((s) => s.text);

  it('S1: G3 가 N 의 20% 이하면 "N개사뿐", 평문과 세그먼트가 같다', () => {
    const b = buildSourcingBoard(data([...manyG1(9), g3Robot(), rb('U', 'Unk', 'unknown')]));
    expect(b.conclusionText.startsWith('조사한 11개사 중 액추에이터 설계를 외부에 맡긴 곳은 1개사뿐입니다(자체 설계 확인 9개사, 확인 불가 1개사).')).toBe(true);
    expect(strong(b)[0]).toBe('액추에이터 설계를 외부에 맡긴 곳은 1개사뿐');
    expect(b.conclusion.map((s) => s.text).join('')).toBe(b.conclusionText);
  });

  it('S1: G3 가 20% 를 넘으면 "뿐" 을 쓰지 않는다', () => {
    const b = buildSourcingBoard(data([...manyG1(2), g3Robot('B1'), g3Robot('B2')]));
    expect(b.conclusionText.startsWith('조사한 4개사 중 액추에이터 설계를 외부에 맡긴 곳은 2개사입니다(자체 설계 확인 2개사).')).toBe(true);
    expect(b.conclusionText).not.toContain('뿐');
  });

  it('S1: 20% 경계(G3*5 == N)는 "뿐"', () => {
    const b = buildSourcingBoard(data([...manyG1(4), g3Robot()]));
    expect(b.conclusionText).toContain('1개사뿐입니다');
  });

  it('S1: G3 = 0 이면 "곳은 없습니다"', () => {
    const b = buildSourcingBoard(data(manyG1(3)));
    expect(b.conclusionText.startsWith('조사한 3개사 중 액추에이터 설계를 외부에 맡긴 곳은 없습니다(자체 설계 확인 3개사).')).toBe(true);
    expect(strong(b)[0]).toBe('액추에이터 설계를 외부에 맡긴 곳은 없습니다');
  });

  it('S1: G4 = 0 이면 ", 확인 불가" 를 생략한다', () => {
    expect(buildSourcingBoard(data(manyG1(3))).conclusionText).not.toContain('확인 불가');
    expect(buildSourcingBoard(data([...manyG1(3), rb('U', 'Unk', 'unknown')])).conclusionText).toContain('(자체 설계 확인 3개사, 확인 불가 1개사)');
  });

  it('S2: G2 와 부품 조달이 모두 있으면 두 절, G2 만 / 부품만 있으면 해당 절만, 둘 다 없으면 앞 절을 통째로 생략', () => {
    const g2 = rb('T', 'Tes', 'external', { externalVendors: [ev('Tuopu', 'contract manufacturing')] });
    const comp = rb('P', 'Pal', 'in_house', { componentSourcing: true, externalVendors: [ev('Harmonic Drive', 'component supply', 'component')] });
    const both = buildSourcingBoard(data([g2, comp])).conclusionText;
    expect(both).toContain('자체 설계 회사가 외부에서 사는 것은 자사 설계 모듈의 양산품(위탁제조·그룹 부품사)이나 모터·감속기 같은 하위 부품이며, 완성 관절 모듈을 카탈로그로 구매하는 휴머노이드 1군 제조사는 없습니다.');
    const onlyG2 = buildSourcingBoard(data([g2, rb('A', 'Alpha', 'in_house')])).conclusionText;
    expect(onlyG2).toContain('외부에서 사는 것은 자사 설계 모듈의 양산품(위탁제조·그룹 부품사)이며, ');
    expect(onlyG2).not.toContain('하위 부품');
    const onlyComp = buildSourcingBoard(data([comp])).conclusionText;
    expect(onlyComp).toContain('외부에서 사는 것은 모터·감속기 같은 하위 부품이며, ');
    expect(onlyComp).not.toContain('양산품');
    const neither = buildSourcingBoard(data([rb('A', 'Alpha', 'in_house')])).conclusionText;
    expect(neither).not.toContain('자체 설계 회사가 외부에서 사는 것은');
    expect(neither).toContain('완성 관절 모듈을 카탈로그로 구매하는 휴머노이드 1군 제조사는 없습니다.');
    expect(strong(buildSourcingBoard(data([comp])))).toContain('완성 관절 모듈을 카탈로그로 구매하는 휴머노이드 1군 제조사는 없습니다');
  });

  it('S2: G3 회사에 tier1 수요 사례(module)가 있으면 S2 전체를 생략, component 층 tier1 은 무시', () => {
    const rs = [rb('B', 'Buyer Inc', 'external', { externalVendors: [ev('Vend', 'component supply')] }), rb('A', 'Alpha', 'in_house')];
    const withTier1 = buildSourcingBoard(data(rs, [], [adoption({ company: 'Buyer Inc (US)', marketSegment: 'tier1_oem', segment: 'humanoid_tier1', level: 'module' })]));
    expect(withTier1.conclusionText).not.toContain('1군 제조사는 없습니다');
    expect(withTier1.conclusionText).not.toContain('자체 설계 회사가 외부에서 사는 것은');
    const bySegmentOnly = buildSourcingBoard(data(rs, [], [adoption({ company: 'Buyer Inc', marketSegment: 'tier2_legged', segment: 'humanoid_tier1', level: 'module' })]));
    expect(bySegmentOnly.conclusionText).not.toContain('1군 제조사는 없습니다');
    const componentLevel = buildSourcingBoard(data(rs, [], [adoption({ company: 'Buyer Inc', marketSegment: 'tier1_oem', segment: 'humanoid_tier1', level: 'component' })]));
    expect(componentLevel.conclusionText).toContain('1군 제조사는 없습니다');
    const otherCompany = buildSourcingBoard(data(rs, [], [adoption({ company: 'Somebody Else', marketSegment: 'tier1_oem', segment: 'humanoid_tier1' })]));
    expect(otherCompany.conclusionText).toContain('1군 제조사는 없습니다');
  });

  it('S3: 외판 확인·계획 제품 중 휴머노이드 타깃이 없으면 문장과 셀 줄이 나온다', () => {
    const b = buildSourcingBoard(data([rb('A', 'Alpha', 'in_house_sells')], [sp('Alpha', 'Quad', { targetMarket: 'quadruped robots, research' })]));
    expect(b.conclusionText.endsWith('휴머노이드 관절 모듈을 외부에 파는 세트 제조사도 없습니다.')).toBe(true);
    expect(texts(row(b, 'G1').sold)).toContain('휴머노이드 관절 모듈은 판매 안 함');
  });

  it('S3: 휴머노이드 타깃의 외판 확인/계획 제품이 있으면 문장과 셀 줄을 생략한다 (확인·계획 각각, 한글 키워드 포함)', () => {
    const variants: ActuatorSupplierProduct[] = [
      sp('Alpha', 'H1', { targetMarket: 'humanoid robots', priceUsd: 100, status: 'available' }),
      sp('Alpha', 'H2', { targetMarket: 'biped joints, research', status: 'available' }),
      sp('Alpha', 'H3', { targetMarket: '휴머노이드 관절, external customers', status: 'announced' }),
    ];
    for (const s of variants) {
      const b = buildSourcingBoard(data([rb('A', 'Alpha', 'in_house_sells')], [s]));
      expect(b.conclusionText).not.toContain('외부에 파는 세트 제조사도 없습니다');
      expect(texts(row(b, 'G1').sold)).not.toContain('휴머노이드 관절 모듈은 판매 안 함');
    }
  });

  it('S3: 근거 약함(unconfirmed) 휴머노이드 제품은 S3 를 막지 않고 각주 3 에만 나온다', () => {
    const b = buildSourcingBoard(
      data([rb('A', 'Alpha', 'in_house')], [sp('Alpha', 'Weak (series, 7 variants)', { targetMarket: 'humanoid robots, in-house and external', status: 'available' })])
    );
    expect(b.conclusionText).toContain('외부에 파는 세트 제조사도 없습니다');
    const counter = b.footnotes.find((f) => f.id === 'counter')!;
    expect(counter.text).toContain('외판 확인되지 않음(근거 약함): Alpha 제품 1개 (Weak)');
  });

  it('S3: 외판 확인 제품의 segments 에 tier1_oem 이 있으면 생략', () => {
    const b = buildSourcingBoard(
      data([rb('A', 'Alpha', 'in_house_sells')], [sp('Alpha', 'T1', { targetMarket: 'research', status: 'available', segments: ['tier1_oem', 'research_edu'], segment: 'tier1_oem' })])
    );
    expect(b.conclusionText).not.toContain('외부에 파는 세트 제조사도 없습니다');
  });

  it('S3: LG 제품은 판정에서 제외된다', () => {
    const b = buildSourcingBoard(
      data(
        [rb('CLOiD', 'LG Electronics', 'in_house_sells', {}, { isLG: true }), rb('A', 'Alpha', 'in_house')],
        [sp('LG Electronics', 'AXIUM', { isLG: true, targetMarket: 'humanoid, external partners', status: 'announced' })]
      )
    );
    expect(b.conclusionText).toContain('외부에 파는 세트 제조사도 없습니다');
  });
});

// ── 각주 ─────────────────────────────────────────────────────────────────────

describe('buildSourcingBoard — 각주', () => {
  it('각주 1: 고정 문구 + 집계 시각, "회사 기준"·"LG 제외" (LG 데이터가 없어도)', () => {
    const b = buildSourcingBoard(data([rb('A', 'Alpha', 'in_house')]));
    const f1 = b.footnotes[0]!;
    expect(f1.id).toBe('source');
    expect(f1.text).toContain('출처: ARGOS 조달 태세 재판정 데이터(공개 자료) · 집계 2026.10.25 12:04 KST');
    expect(f1.text).toContain("모터·감속기 등 하위 부품은 '사는 것' 열에만 표기");
    expect(f1.text).toContain('확인 불가 = 공개 근거 없음(외부 조달이라는 뜻 아님)');
    expect(f1.text.endsWith('회사 기준, LG 제외')).toBe(true);
  });

  it('각주 2: 보드와 조달 태세 기준 수치가 일치하면 생략, 다르면 동적 숫자로 표시', () => {
    // G1 + G4 만, LG 없음 → 보드와 전략 카드의 판정 가능 회사 수·자체 개발 확인 수가 같다
    const same = buildSourcingBoard(data([rb('A', 'Alpha', 'in_house'), rb('U', 'Unk', 'unknown')]));
    expect(same.footnotes.map((f) => f.id)).not.toContain('mismatch');

    // G2 가 있으면 전략 카드는 외부 조달·혼합으로 본다 → 불일치
    const d = data([
      rb('A', 'Alpha', 'in_house'),
      rb('T', 'Tes', 'external', { externalVendors: [ev('Tuopu', 'contract manufacturing')] }),
      rb('CLOiD', 'LG Electronics', 'in_house_sells', {}, { isLG: true }),
    ]);
    const diff = buildSourcingBoard(d);
    const f2 = diff.footnotes.find((f) => f.id === 'mismatch')!;
    const st = computeStrategyStats(d).sourcing.companies;
    expect(f2.text).toContain(`자체 설계 확인은 자체 제조 1 + 외부 제조·양산 1입니다.`);
    expect(f2.text).toContain(`판정 가능 ${st.judged}개사 중 ${st.confirmed}개사이며 LG 포함`);
    expect(f2.text).toContain("'외부 조달·혼합'으로 분류됩니다");
    expect(f2.text).toContain('요약 막대·헤드라인의 로봇 3기는 LG 1기 포함.');
    expect(f2.text).toContain('상세 그래프의 회사 수는 LG 포함.');
  });

  it('각주 2: LG 가 없으면 "LG 포함" 문구를 쓰지 않는다', () => {
    const b = buildSourcingBoard(data([rb('T', 'Tes', 'external', { externalVendors: [ev('Tuopu', 'contract manufacturing')] })]));
    const f2 = b.footnotes.find((f) => f.id === 'mismatch')!;
    expect(f2.text).not.toContain('LG');
  });

  it('각주 3: 자체 설계 회사의 tier1 수요 사례(공급사·근거 등급) 와 근거 약한 휴머노이드 제품', () => {
    const b = buildSourcingBoard(
      data(
        [rb('G1', 'Agibot', 'in_house'), rb('T', 'Tes', 'external', { externalVendors: [ev('Tuopu', 'contract manufacturing')] })],
        [sp('Agibot', 'PowerFlow R52', { targetMarket: 'AgiBot X1 humanoid arms' })],
        [
          adoption({ id: 'a1', company: 'Agibot (智元)', actuatorVendor: 'Quanzhibo (泉智博)', marketSegment: 'tier1_oem', segment: 'humanoid_tier1', evidenceGrade: 'B' }),
          adoption({ id: 'a2', company: 'Tesla', actuatorVendor: 'Tuopu Group', marketSegment: 'tier1_oem', segment: 'humanoid_tier1', evidenceGrade: 'B' }),
        ]
      )
    );
    const f3 = b.footnotes.find((f) => f.id === 'counter')!;
    expect(f3.text).toBe('수요 사례에 외부 공급사가 기록된 자체 설계 회사: Agibot(Quanzhibo (泉智博), 근거 B). 외판 확인되지 않음(근거 약함): Agibot 제품 1개 (PowerFlow R52).');
    // G2 회사(Tes/Tesla)의 tier1 사례는 반례가 아니다
    expect(f3.text).not.toContain('Tuopu');
  });

  it('각주 3: 해당이 없으면 생략', () => {
    expect(buildSourcingBoard(data([rb('A', 'Alpha', 'in_house')])).footnotes.map((f) => f.id)).not.toContain('counter');
  });
});

// ── 안전성 ───────────────────────────────────────────────────────────────────

describe('buildSourcingBoard — 안전성', () => {
  it('null / undefined / 빈 배열은 안전하게 비어 있다', () => {
    for (const input of [null, undefined, data([]), { ...data([]), robots: undefined as never, suppliers: undefined as never, adoptions: undefined as never }]) {
      const b = buildSourcingBoard(input);
      expect(b.hasData).toBe(false);
      expect(b.companyCount).toBe(0);
      expect(b.rows).toEqual([]);
      expect(b.conclusion).toEqual([]);
      expect(b.conclusionText).toBe('');
      expect(b.footnotes).toEqual([]);
      expect(countsOf(b)).toEqual([0, 0, 0, 0]);
      expect(JSON.stringify(b)).not.toMatch(/NaN|undefined|Infinity/);
    }
  });

  it('LG 회사만 있으면 hasData=false 이고 제외 수만 기록한다', () => {
    const b = buildSourcingBoard(data([rb('CLOiD', 'LG Electronics', 'in_house_sells', {}, { isLG: true })]));
    expect(b.hasData).toBe(false);
    expect(b.excluded).toEqual({ companies: 1, robots: 1 });
  });

  it('입력을 변경하지 않고 결정적이다', () => {
    const d = liveSnapshotTrimmed();
    const before = JSON.stringify(d);
    const a = buildSourcingBoard(d);
    expect(JSON.stringify(d)).toBe(before);
    expect(buildSourcingBoard(liveSnapshotTrimmed())).toEqual(a);
  });
});

// ── 실데이터 (trimmed 스냅샷) ─────────────────────────────────────────────────

/** §6 실데이터 기대값 — 보드 전체를 한 번에 단언한다 */
function expectLiveBoard(b: SourcingBoard) {
  expect(countsOf(b)).toEqual([15, 2, 2, 6]);
  expect(b.companyCount).toBe(25);
  expect(b.robotCount).toBe(45);
  expect(b.excluded).toEqual({ companies: 1, robots: 1 });

  const labels = (id: BoardGroupId) => row(b, id).companies.map((c) => c.label);
  expect([...labels('G1')].sort()).toEqual(
    [
      'Unitree Robotics(5)',
      'Figure AI(3)',
      '1X Technologies(3)',
      'Agibot(3)',
      'Fourier Intelligence(3)',
      'UBTECH(3)',
      'Apptronik(2)',
      'LimX Dynamics(2)',
      'Rainbow Robotics(2)',
      'Xiaomi(2)',
      'PAL Robotics(2)',
      'Agility Robotics',
      'Sanctuary AI',
      'Kepler Robot',
      'Mentee Robotics',
    ].sort()
  );
  expect(labels('G1')[0]).toBe('Unitree Robotics(5)');
  expect([...labels('G2')].sort()).toEqual(['Boston Dynamics', 'Tesla(2)']);
  expect([...labels('G3')].sort()).toEqual(['Diligent Robotics', 'NEURA Robotics']);
  expect([...labels('G4')].sort()).toEqual(['Aeolus Robotics', 'Engineered Arts', 'Honda', 'Savioke', 'SoftBank Robotics', 'Toyota']);
  expect(JSON.stringify(b)).not.toContain('LG Electronics');

  expect(texts(row(b, 'G1').bought)).toEqual(['13개사: 없음', 'PAL Robotics: Harmonic Drive 감속기, TQ-Group (RoboDrive) 모터', 'Rainbow Robotics: maxon 모터', '(모듈이 아닌 하위 부품)']);
  expect(texts(row(b, 'G1').sold)).toEqual([
    '13개사: 없음',
    'Unitree Robotics: GO-M8010-6 (quadruped robots (Go1), research)',
    'Xiaomi: CyberGear Micro Motor (CyberDog 2 joints, makers, research)',
    '휴머노이드 관절 모듈은 판매 안 함',
  ]);
  expect(texts(row(b, 'G1').sold).join('|')).not.toContain('M107');
  expect(texts(row(b, 'G2').bought)).toEqual([
    '자사 설계 모듈의 양산품',
    'Tesla: Tuopu Group, Sanhua Intelligent Controls(위탁제조)',
    'Boston Dynamics: Hyundai Mobis(양산 공급)',
  ]);
  expect(texts(row(b, 'G2').sold)).toEqual(['없음']);
  const g3 = texts(row(b, 'G3').bought);
  expect(g3).toContain('4NE1: Schaeffler');
  expect(g3).toContain('Moxi: Kinova');
  expect(g3.join('|')).not.toContain('부품 공급');
  expect(row(b, 'G3').bought.filter((l) => !l.muted).every((l) => l.title === undefined)).toBe(true);
  expect(texts(row(b, 'G3').sold)).toEqual(['없음']);
  expect(row(b, 'G4').designMfg).toBe('공개 근거 없음');
  expect(texts(row(b, 'G4').bought)).toEqual(['확인 안 됨']);
  expect(texts(row(b, 'G4').sold)).toEqual(['확인 안 됨']);
  expect(row(b, 'G1').designMfg).toBe('자체 / 자체');
  expect(row(b, 'G2').designMfg).toBe('자체 / 외부');
  expect(row(b, 'G3').designMfg).toBe('외부 / 외부');

  expect(b.conclusionText.startsWith('조사한 25개사 중 액추에이터 설계를 외부에 맡긴 곳은 2개사뿐입니다(자체 설계 확인 17개사, 확인 불가 6개사).')).toBe(true);
  expect(b.conclusionText).toContain('완성 관절 모듈을 카탈로그로 구매하는 휴머노이드 1군 제조사는 없습니다');
  expect(b.conclusionText.endsWith('휴머노이드 관절 모듈을 외부에 파는 세트 제조사도 없습니다.')).toBe(true);

  const fn = (id: string) => b.footnotes.find((f) => f.id === id)?.text ?? '';
  expect(fn('source')).toContain('회사 기준, LG 제외');
  expect(fn('mismatch')).toContain('판정 가능 20개사 중 16개사이며 LG 포함');
  expect(fn('mismatch')).toContain('요약 막대·헤드라인의 로봇 46기는 LG 1기 포함');
  expect(fn('counter')).toContain('Agibot(Quanzhibo (泉智博), 근거 B)');
  expect(fn('counter')).toContain('Fourier Intelligence 제품 1개 (FSA 2.0)');
  expect(fn('counter')).toContain('Agibot 제품 3개 (PowerFlow R52, PowerFlow R86-2, PowerFlow R86-3)');
  expect(fn('partKind')).toContain('일반 지식');
}

describe('buildSourcingBoard — 실데이터 (커밋된 trimmed 스냅샷)', () => {
  it('타일 15/2/2/6, 회사·로봇 수, 셀 문구, 결론, 각주가 기대값과 같다', () => {
    expectLiveBoard(buildSourcingBoard(liveSnapshotTrimmed()));
  });

  it('보드 수치는 computeStrategyStats 와 각주 2 로 정합한다 (숫자는 동적)', () => {
    const d = liveSnapshotTrimmed();
    const st = computeStrategyStats(d).sourcing.companies;
    expect(st.judged).toBe(20);
    expect(st.confirmed).toBe(16);
    const f2 = buildSourcingBoard(d).footnotes.find((f) => f.id === 'mismatch')!.text;
    expect(f2).toContain(`판정 가능 ${st.judged}개사 중 ${st.confirmed}개사`);
  });
});

// 전체 라이브 응답 파일이 있으면 같은 기대값을 한 번 더 확인한다 (없으면 skip). 예: ACTUATOR_LIVE_MAP_JSON=/path/live-map.json
const LIVE_FULL = process.env.ACTUATOR_LIVE_MAP_JSON;
describe.skipIf(!LIVE_FULL || !fs.existsSync(LIVE_FULL))('buildSourcingBoard — 전체 라이브 응답 (선택)', () => {
  it('정규화된 전체 응답에서도 15/2/2/6 과 같은 문구', () => {
    const raw = JSON.parse(fs.readFileSync(LIVE_FULL!, 'utf8')) as ActuatorMapResponse;
    expectLiveBoard(buildSourcingBoard(normalizeActuatorMap(raw)));
  });
});
