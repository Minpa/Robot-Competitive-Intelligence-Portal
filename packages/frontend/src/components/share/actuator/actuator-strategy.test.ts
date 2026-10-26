import { describe, expect, it } from 'vitest';
import {
  STRATEGY_CONTENT,
  STRATEGY_SOURCES,
  buildDiagnosisLines,
  buildHeadlineMessage,
  buildMetricRows,
  buildSubtitle,
  classifySale,
  collectSourceRefs,
  computeStrategyStats,
  formatFooter,
  median,
  safeSourceHref,
  sameCompany,
} from './actuator-strategy';
import { act, adoption, posture, readSeedJson, response, robot, seedAdoptionCases, seedResponse, seedSuppliers44, sp } from './actuator-strategy.fixtures';

const BAD = /NaN|undefined|Infinity|null/;

describe('computeStrategyStats', () => {
  it('T1 null/undefined/빈 배열에서도 예외 없이 0·null', () => {
    for (const input of [null, undefined, response([], [])]) {
      const s = computeStrategyStats(input);
      expect(s.robotCount).toBe(0);
      expect(s.supplierProductCount).toBe(0);
      expect(s.companyCount).toBe(0);
      expect(s.inHouseCompanyCount).toBe(0);
      expect(s.inHouseCompanyPct).toBeNull();
      expect(s.externalSourcing).toEqual([]);
      expect(s.setMakerSellers).toEqual([]);
      expect(s.price.pricedCount).toBe(0);
      expect(s.price.median).toBeNull();
      expect(s.price.min).toBeNull();
      expect(s.price.setMaker).toBeNull();
      expect(s.lg).toEqual({ count: 0, torque: 0, price: 0 });
      expect(s.home.nonLgCount).toBe(0);
      expect(s.sourcing.robots).toBe(0);
      expect(s.sourcing.companies).toEqual({ total: 0, judged: 0, confirmed: 0, unknown: 0 });
      expect(s.inHouseCompanyNames).toEqual([]);
      expect(s.sellsCompanyNames).toEqual([]);
      expect(s.sellsExternally).toBe(0);
      expect(s.sellsPlanned).toBe(0);
      expect(s.adoptions).toMatchObject({ total: 0, module: 0, component: 0, bySegment: [], byVendor: [], externalSegments: [] });
    }
    expect(computeStrategyStats(null).hasData).toBe(false);
    expect(computeStrategyStats(response([], [])).hasData).toBe(true);
  });

  it('T2 회사 3곳: 자체 확인 1 / 외부 1 / 확인 불가 1 → 판정 가능 2, 확인 1, 50%', () => {
    const s = computeStrategyStats(
      response(
        [
          robot('A1', 'Alpha', [], posture('in_house')),
          robot('A2', 'Alpha', [], posture('in_house_sells')),
          robot('B1', 'Beta', [act('Xcorp', false)], posture('external')),
          robot('C1', 'Gamma', [], posture('unknown')),
        ],
        []
      )
    );
    expect(s.companyCount).toBe(2);
    expect(s.inHouseCompanyCount).toBe(1);
    expect(s.inHouseCompanyPct).toBe(50);
    expect(s.inHouseCompanyNames).toEqual(['Alpha']);
    expect(s.sourcing.companies).toEqual({ total: 3, judged: 2, confirmed: 1, unknown: 1 });
    expect(s.robotsWithActuatorCount).toBe(3);
    expect(s.inHouseRobotCount).toBe(2);
    expect(s.sourcing).toMatchObject({ robots: 4, inHouse: 1, inHouseSells: 1, external: 1, unknown: 1 });
  });

  it('T2b 회사 우선순위: 자체+외판 > 자체 > 외부 > 확인 불가 (한 회사에 외부와 자체가 섞이면 자체로 집계)', () => {
    const s = computeStrategyStats(
      response([robot('a', 'Co', [], posture('external')), robot('b', 'Co', [], posture('in_house')), robot('c', 'Un', [], posture('unknown')), robot('d', 'Un', [], posture('external'))], [])
    );
    expect(s.sourcing.companies).toEqual({ total: 2, judged: 2, confirmed: 1, unknown: 0 });
  });

  it('T3 forecast 로봇은 모든 집계에서 제외', () => {
    const s = computeStrategyStats(
      response(
        [
          robot('A1', 'Alpha', [act('Alpha', true)], posture('in_house')),
          robot('F1', 'Fcast', [act('Fcast', true), act('Zed', false)], { forecast: true, ...posture('external') }),
        ],
        []
      )
    );
    expect(s.robotCount).toBe(1);
    expect(s.companyCount).toBe(1);
    expect(s.robotsWithActuatorCount).toBe(1);
    expect(s.externalSourcing).toEqual([]);
    expect(s.sourcing.robots).toBe(1);
  });

  it('T4 Atlas형(외부 조달·혼합): 회사는 외부로 집계, externalSourcing 은 모듈 층 공급사와 한글 역할', () => {
    const s = computeStrategyStats(
      response(
        [
          robot(
            'Atlas',
            'Boston Dynamics',
            [act('Boston Dynamics', true), act('Hyundai Mobis', false)],
            posture('external', {
              kind: 'mixed',
              externalVendors: [{ vendor: 'Hyundai Mobis', role: 'mass-production supply', grade: 'A', url: null, level: 'module' }],
            })
          ),
        ],
        []
      )
    );
    expect(s.inHouseCompanyCount).toBe(0);
    expect(s.companyCount).toBe(1);
    expect(s.sourcing.externalMixed).toBe(1);
    expect(s.externalSourcing).toEqual([{ robotName: 'Atlas', company: 'Boston Dynamics', vendors: ['Hyundai Mobis'], roles: ['양산 공급'] }]);
  });

  it('T4b 외부 조달 vendor 중복 제거, 부품 층 공급사는 모듈 층이 있으면 제외', () => {
    const v = (vendor: string, level: 'module' | 'component' = 'module') => ({ vendor, role: null, grade: 'B', url: null, level });
    const s = computeStrategyStats(
      response([robot('R', 'Co', [], posture('external', { externalVendors: [v('Mobis'), v('Mobis'), v('Other'), v('maxon', 'component')] }))], [])
    );
    expect(s.externalSourcing[0]!.vendors).toEqual(['Mobis', 'Other']);
  });

  it("T4c 부품 층만 외부 조달(모듈 층 자체 설계)하는 로봇은 외부 조달 목록에 없고 자체 개발 확인에 포함", () => {
    const s = computeStrategyStats(
      response(
        [
          robot(
            'HUBO 2',
            'Rainbow',
            [],
            posture('in_house', {
              kind: 'mixed',
              componentSourcing: true,
              externalVendors: [{ vendor: 'maxon', role: 'component supply', grade: 'A', url: null, level: 'component' }],
            })
          ),
        ],
        []
      )
    );
    expect(s.externalSourcing).toEqual([]);
    expect(s.sourcing.inHouse).toBe(1);
    expect(s.sourcing.componentSourcing).toBe(1);
    expect(buildDiagnosisLines(s)[1]).toBe('외부 조달이 기록된 로봇은 없습니다.');
  });

  it("T5 외부 조달 로봇이어도 vendor 가 '(공급사 미상)' 또는 빈 값이면 externalSourcing 제외", () => {
    const s = computeStrategyStats(
      response(
        [
          robot('R1', 'Co', [act('(공급사 미상)', false)], posture('external')),
          robot('R2', 'Co2', [act(null, false)], posture('external')),
          robot('R3', 'Co3', [act('  ', false)], posture('external')),
        ],
        []
      )
    );
    expect(s.externalSourcing).toEqual([]);
    expect(s.sourcing.external).toBe(3);
  });

  it('T5b 구 응답(sourcing 없음)은 확인 불가로 센다 — 자체 개발로 단정하지 않는다', () => {
    const r = robot('Old', 'OldCo', [act('OldCo', true)]);
    delete (r as Partial<typeof r>).sourcing;
    const s = computeStrategyStats(response([r], []));
    expect(s.sourcing.unknown).toBe(1);
    expect(s.inHouseCompanyCount).toBe(0);
    expect(s.companyCount).toBe(0);
  });

  it('T6 시드 형태 제품의 판매 상태', () => {
    const s = computeStrategyStats(seedResponse());
    expect([...s.sale.confirmed].sort()).toEqual(['Unitree Robotics', 'Xiaomi']);
    expect([...s.sale.unconfirmed].sort()).toEqual(['AgiBot', 'Fourier Intelligence']);
    expect(s.sale.planned).toEqual(['LG Electronics']);
    expect([...s.sale.inhouseOnly].sort()).toEqual(['Kepler Robotics', 'Tesla']);
    expect(s.setMakerSellers).toHaveLength(7);
    // 외판 확인 = 제품 기준 확인 ∪ 조달 태세 자체+외판. LG 는 제품 기준 '외판 계획'이므로 계획 쪽에만 들어간다.
    expect([...s.sellsCompanyNames].sort()).toEqual(['Unitree Robotics', 'Xiaomi']);
    expect(s.sellsExternally).toBe(2);
    expect(s.sellsPlannedNames).toEqual(['LG Electronics']);
    expect(s.sellsPlanned).toBe(1);
  });

  it('T7 Unitree: GO(가격 있음)와 M107(in-house) 공존 → 회사 상태 confirmed', () => {
    const s = computeStrategyStats(
      response(
        [robot('Go1', 'Unitree Robotics', [act('Unitree', true)])],
        [
          sp('Unitree', 'M107 Joint Motor (H1)', { targetMarket: 'Unitree H1 humanoid (in-house)' }),
          sp('Unitree', 'GO-M8010-6', { priceUsd: 369, targetMarket: 'quadruped robots (Go1), research' }),
        ]
      )
    );
    expect(s.setMakerSellers).toHaveLength(1);
    expect(s.setMakerSellers[0]!.status).toBe('confirmed');
    expect(s.setMakerSellers[0]!.products.map((p) => p.status)).toEqual(['inhouseOnly', 'confirmed']);
  });

  it('T8 sameCompany 양성', () => {
    expect(sameCompany('Unitree', 'Unitree Robotics')).toBe(true);
    expect(sameCompany('AgiBot (Zhiyuan Robotics)', 'Agibot')).toBe(true);
    expect(sameCompany('Kepler Robotics', 'Kepler Robot')).toBe(true);
    expect(sameCompany('Fourier', 'Fourier Intelligence')).toBe(true);
  });

  it('T9 sameCompany 음성', () => {
    expect(sameCompany('LG Electronics', 'LG Display')).toBe(false);
    expect(sameCompany('', 'Unitree')).toBe(false);
    expect(sameCompany(null, 'Unitree')).toBe(false);
    const companies = seedResponse().robots.map((r) => r.company);
    expect(companies.some((c) => sameCompany('Harmonic Drive', c))).toBe(false);
  });

  it('T10 시드 가격 13개: 최저/최대/중앙값/표기/중국/세트·부품', () => {
    const s = computeStrategyStats(seedResponse());
    expect(s.price.pricedCount).toBe(13);
    expect(s.price.min).toBe(110);
    expect(s.price.max).toBe(989.9);
    expect(s.price.median).toBeCloseTo(229.9, 5);
    expect(s.price.china).toBe(13);
    expect(s.price.setMaker).toEqual({ count: 1, min: 369, max: 369 });
    expect(s.price.component?.count).toBe(12);
    const lines = buildDiagnosisLines(s).join('\n');
    expect(lines).toContain('$110');
    expect(lines).toContain('$990');
    expect(lines).toContain('중앙값 $230');
  });

  it('T11 median: 짝수/1개/0개', () => {
    expect(median([100, 200])).toBe(150);
    expect(median([7])).toBe(7);
    expect(median([])).toBeNull();
    expect(median([3, 1, 2])).toBe(2);
    const input = [3, 1, 2];
    median(input);
    expect(input).toEqual([3, 1, 2]);
  });

  it('T12 priceUsd null/0/NaN/-1/문자열은 가격 통계에서 제외', () => {
    const bad = [null, 0, NaN, -1, '100' as unknown as number];
    const s = computeStrategyStats(response([], [...bad.map((v, i) => sp('V', `m${i}`, { priceUsd: v })), sp('V', 'ok', { priceUsd: 50 })]));
    expect(s.price.pricedCount).toBe(1);
    expect(s.price.median).toBe(50);
  });

  it('T13 하모닉 2개(가격 null): nonQddCount=2, nonQddPriced=0', () => {
    const s = computeStrategyStats(
      response([], [sp('Harmonic Drive', 'a', { type: '하모닉(스트레인웨이브)' }), sp('Harmonic Drive', 'b', { type: '하모닉(스트레인웨이브)' })])
    );
    expect(s.precision).toEqual({ nonQddCount: 2, nonQddPriced: 0 });
  });

  it('T14 LG 제품 1개(토크·가격 null): lg.count=1, torque=0, price=0', () => {
    const s = computeStrategyStats(
      response([robot('CLOiD', 'LG Electronics', [], { isLG: true })], [sp('LG Electronics', 'AXIUM', { status: 'announced', targetMarket: 'external partners from 2027' })])
    );
    expect(s.lg).toEqual({ count: 1, torque: 0, price: 0 });
    const withSpec = computeStrategyStats(
      response([robot('CLOiD', 'LG Electronics', [], { isLG: true })], [sp('LG Electronics', 'AXIUM', { continuousTorqueNm: 5, priceUsd: 100 })])
    );
    expect(withSpec.lg).toEqual({ count: 1, torque: 1, price: 1 });
  });

  it('T15 targetMarket 에 home: LG 제외 count 만 증가', () => {
    const s = computeStrategyStats(
      response(
        [robot('CLOiD', 'LG Electronics', [], { isLG: true })],
        [
          sp('LG Electronics', 'AXIUM', { targetMarket: 'LG CLOiD home robot' }),
          sp('Other', 'x', { targetMarket: 'home service robots' }),
          sp('Other', 'y', { targetMarket: '가정용 로봇' }),
          sp('Other', 'z', { targetMarket: 'industrial' }),
        ]
      )
    );
    expect(s.home.nonLgCount).toBe(2);
  });

  it('T16 동일 회사 로봇 3기는 companyCount 에 1회', () => {
    const s = computeStrategyStats(
      response([robot('a', 'Co', [], posture('in_house')), robot('b', 'Co', [], posture('in_house')), robot('c', 'co ', [], posture('in_house_sells'))], [])
    );
    expect(s.companyCount).toBe(1);
    expect(s.inHouseCompanyCount).toBe(1);
    expect(s.inHouseRobotCount).toBe(3);
  });

  it('classifySale 우선순위/경계', () => {
    expect(classifySale({ status: 'available', priceUsd: 10, targetMarket: 'x (in-house)' })).toBe('inhouseOnly');
    expect(classifySale({ status: 'announced', priceUsd: null, targetMarket: 'external partners' })).toBe('planned');
    expect(classifySale({ status: 'available', priceUsd: null, targetMarket: 'externally?' })).toBe('unconfirmed');
    // 타깃 시장의 'external' 문구만으로는 외판 확인이 아니다 (Fourier·AgiBot 은 외판 근거 미확인)
    expect(classifySale({ status: 'available', priceUsd: null, targetMarket: 'humanoid robots, in-house and external' })).toBe('unconfirmed');
    expect(classifySale({ status: 'available', priceUsd: null, targetMarket: 'makers, research' })).toBe('confirmed');
    expect(classifySale({ status: null, priceUsd: null, targetMarket: null })).toBe('unconfirmed');
  });
});

describe('buildDiagnosisLines / buildMetricRows / buildHeadlineMessage', () => {
  it('T17 빈 stats: 8줄이고 NaN/undefined/Infinity/null 없음', () => {
    for (const input of [null, response([], [])]) {
      const stats = computeStrategyStats(input);
      const lines = buildDiagnosisLines(stats);
      expect(lines).toHaveLength(8);
      for (const l of lines) expect(l).not.toMatch(BAD);
      expect(buildHeadlineMessage(stats)).not.toMatch(BAD);
      for (const m of buildMetricRows(stats)) {
        for (const v of Object.values(m)) expect(v).not.toMatch(BAD);
      }
    }
    const seed = computeStrategyStats(seedResponse());
    for (const l of buildDiagnosisLines(seed)) expect(l).not.toMatch(BAD);
  });

  it('T18 pct 2/3 → 67% (판정 가능 회사 기준)', () => {
    const stats = computeStrategyStats(
      response([robot('a', 'A', [], posture('in_house')), robot('b', 'B', [], posture('in_house_sells')), robot('c', 'C', [], posture('external')), robot('d', 'D', [], posture('unknown'))], [])
    );
    expect(stats.inHouseCompanyPct).toBe(67);
    expect(buildDiagnosisLines(stats)[0]).toContain('판정 가능한 3개사 중 2개사(67%)');
    expect(buildDiagnosisLines(stats)[0]).toContain('확인 불가 1개사는 비율에서 제외했습니다');
    expect(buildMetricRows(stats).find((m) => m.id === 'M1')!.currentValue).toBe('67% (2/3개사) · 확인 불가 1개사');
  });

  it('T19 nonQddPriced=0 이면 직접 비교 불가 문구', () => {
    const line = buildDiagnosisLines(computeStrategyStats(seedResponse()))[4]!;
    expect(line).toContain('직접 비교는 현재 데이터로 할 수 없습니다');
    const priced = computeStrategyStats(response([], [sp('V', 'm', { type: '하모닉(스트레인웨이브)', priceUsd: 900 })]));
    expect(buildDiagnosisLines(priced)[4]).not.toContain('직접 비교');
  });

  it('T20 판정 가능 회사 0이면 pct 자리 "—", M1 현재값 "—" (확인 불가만 있어도 동일)', () => {
    const stats = computeStrategyStats(response([], []));
    expect(buildDiagnosisLines(stats)[0]).toContain('(—)');
    expect(buildDiagnosisLines(stats)[0]).not.toContain('%');
    const unknownOnly = computeStrategyStats(response([robot('a', 'A', [], posture('unknown')), robot('b', 'B', [], posture('unknown', { kind: 'in_house_presumed' }))], []));
    expect(unknownOnly.companyCount).toBe(0);
    expect(buildMetricRows(unknownOnly).find((m) => m.id === 'M1')!.currentValue).toBe('—');
    expect(buildDiagnosisLines(unknownOnly)[0]).toContain('확인 불가 2기');
    expect(buildDiagnosisLines(unknownOnly)[0]).toContain('이 중 자체 개발로 추정되는 로봇 1기');
  });

  it('T20b M1: 자체 1 · 외부 1 · 확인 불가 1 회사 → 50% (1/2개사) · 확인 불가 1개사, 93% 문구 없음', () => {
    const stats = computeStrategyStats(
      response([robot('a', 'A', [], posture('in_house')), robot('b', 'B', [], posture('external')), robot('c', 'C', [], posture('unknown'))], [])
    );
    expect(buildMetricRows(stats).find((m) => m.id === 'M1')!.currentValue).toBe('50% (1/2개사) · 확인 불가 1개사');
    expect(JSON.stringify(buildDiagnosisLines(stats))).not.toContain('93%');
  });

  it('AC-34 동적 문장 8개: 1번에 4개 수치와 확인 불가 설명, 4~7번은 이전 문장과 같다', () => {
    const lines = buildDiagnosisLines(computeStrategyStats(seedResponse()));
    expect(lines).toHaveLength(8);
    expect(lines[0]).toContain('ARGOS에 등록된 로봇 10기의 액추에이터 조달 태세는 자체 개발 확인 4기, 자체 개발+외판 3기, 외부 조달(혼합 포함) 2기, 확인 불가 1기입니다.');
    expect(lines[0]).toContain('근거를 찾지 못한 1기는 확인 불가로 분리했습니다(이 중 자체 개발로 추정되는 로봇 1기)');
    expect(lines[3]).toBe(
      '가격이 등록된 제품 13개의 가격은 $110~$990, 중앙값 $230입니다. 이 중 중국 회사 제품은 13개이고, 세트 제조사 제품 1개(최저 $369~최고 $369), 부품 전문사 제품 12개(최저 $110~최고 $990)입니다.'
    );
    expect(lines[4]).toBe('QDD 외 타입으로 분류된 제품 8개 중 가격이 등록된 제품은 0개입니다. 일본·유럽 정밀 감속기·모터 진영과의 가격 직접 비교는 현재 데이터로 할 수 없습니다.');
    expect(lines[5]).toBe('LG전자 액추에이터 제품 1개 중 토크 공개 0개, 가격 공개 0개입니다.');
    expect(lines[6]).toBe('LG전자를 제외한 등록 제품 중 타깃 시장에 가정용을 명시한 제품은 0개입니다.');
  });

  it('동적 문장 2: 외부 조달 로봇·공급사·역할, Mobis 가 있을 때만 그룹 내 부품사 문장', () => {
    const lines = buildDiagnosisLines(computeStrategyStats(seedResponse()));
    expect(lines[1]).toContain('외부 조달이 기록된 로봇은 2기입니다.');
    expect(lines[1]).toContain('Atlas(Boston Dynamics) – Hyundai Mobis(양산 단계 액추에이터 공급)');
    expect(lines[1]).toContain('(양산 단계 액추에이터 공급). 그룹 내 부품사 공급 사례는 Hyundai Mobis–Atlas로, 설계는 세트 제조사가 하고 양산 단계 액추에이터 공급은 부품사가 맡는 구조입니다. Mobis가 같은 그룹 계열이라는 점은 (일반 지식)입니다.');
    expect(lines[1]).not.toContain('외판');
    const noMobis = computeStrategyStats(response([robot('R', 'Co', [], posture('external', { externalVendors: [{ vendor: 'Schaeffler', role: null, grade: 'A', url: null, level: 'module' }] }))], []));
    expect(buildDiagnosisLines(noMobis)[1]).not.toContain('그룹 내 부품사');
    expect(buildDiagnosisLines(noMobis)[1]).toContain('R(Co) – Schaeffler');
  });

  it('동적 문장 3: 제품 기준 분류와 외판 확인·외판 계획 분리(LG 는 계획만)', () => {
    const l3 = buildDiagnosisLines(computeStrategyStats(seedResponse()))[2]!;
    expect(l3).toContain('외판 확인 2개사(Unitree Robotics, Xiaomi)');
    expect(l3).toContain('외판 계획 1개사(LG Electronics)');
    expect(l3).toContain('외판 근거 미확인 2개사');
    expect(l3).toContain('제품 등록과 조달 태세를 합쳐 보면 외판 확인 2개사(Unitree Robotics, Xiaomi), 외판 계획 1개사(LG Electronics)입니다.');
  });

  it('동적 문장 8: 0건이면 수집 전 문구, 있으면 세그먼트·공급사·(가설), 부품 단위는 따로', () => {
    const none = buildDiagnosisLines(computeStrategyStats(response([], [])))[7]!;
    expect(none).toBe('공개 채택 사례는 아직 수집되지 않았습니다.');
    const l8 = buildDiagnosisLines(computeStrategyStats(seedResponse()))[7]!;
    expect(l8).toContain('모듈 단위 6건입니다(부품 단위 채택 2건은 따로 셉니다).');
    expect(l8).toContain('세그먼트별로 1군 세트사 양산 공급·위탁제조 2건, 2군 휴머노이드·레그드 1건, 연구·교육 2건, 서비스·웨어러블(외골격·의료) 1건');
    expect(l8).toContain('공급사별로는');
    expect(l8).toContain('Hyundai Mobis ×1');
    expect(l8).toContain('Tuopu Group ×1');
    expect(l8).toContain('LG가 판매할 수 있는 시장은 이 채택이 확인된 세그먼트 안에서 찾는 것이 합리적입니다. (가설)');
  });

  it('헤드라인 메시지: 수치, 세트 기여 3+3, 채택 시장 (가설) / 0건이면 수집 전 문구', () => {
    const h = buildHeadlineMessage(computeStrategyStats(seedResponse()));
    expect(h.startsWith('핵심 메시지: 로봇 제조사 현황을 보면 액추에이터는 자체 개발 확인 4기, 자체 개발+외판 3기, 외부 조달 2기이고 1기는 근거 부족으로 확인 불가입니다.')).toBe(true);
    expect(h).toContain('직접 기여 3(1차 고객 물량, 양산 사양·인터페이스 표준 정의, 필드 내구 데이터)과 간접 기여 3(레퍼런스 로봇 데모, 외부 로봇사 공동개발 플랫폼, ARGOS 벤치마크 공유)');
    expect(h).toContain('(가설) 외부 채택이 확인된 시장은 1군 세트사 양산 공급·위탁제조 2건');
    const none = buildHeadlineMessage(computeStrategyStats(response([robot('a', 'A', [], posture('in_house'))], [])));
    expect(none.endsWith('외부 채택 사례는 아직 수집되지 않았습니다.')).toBe(true);
    expect(none).not.toContain('(가설) 외부 채택이 확인된 시장은');
    expect(buildHeadlineMessage(computeStrategyStats(null))).toContain('—');
  });

  it('지표 현재값: 시드 기준 M1/M2/M3/M8/M9/M11', () => {
    const rows = buildMetricRows(computeStrategyStats(seedResponse()));
    const v = (id: string) => rows.find((m) => m.id === id)!.currentValue;
    expect(rows).toHaveLength(11);
    expect(v('M1')).toBe('78% (7/9개사) · 확인 불가 1개사');
    expect(v('M2')).toBe('확인 2 · 계획 1');
    expect(v('M3')).toBe('13개 / $230');
    expect(v('M8')).toBe('0/1');
    expect(v('M9')).toBe('0개');
    expect(v('M11')).toBe('8건 (제조사 로봇 2 + 공개 채택 6) · 부품 단위 2건 별도');
    expect(v('M4')).toBe('—');
  });

  it('M11: 외부 조달 로봇 수 + 공개 채택(모듈) 수', () => {
    const s = computeStrategyStats(
      response([robot('a', 'A', [], posture('external')), robot('b', 'B', [], posture('external', { kind: 'mixed' }))], [], {
        adoptions: [adoption({ id: '1' }), adoption({ id: '2' }), adoption({ id: '3', level: 'component' })],
      })
    );
    expect(buildMetricRows(s).find((m) => m.id === 'M11')!.currentValue).toBe('4건 (제조사 로봇 2 + 공개 채택 2) · 부품 단위 1건 별도');
  });

  it('데이터가 없으면 지표 현재값은 모두 "—"', () => {
    expect(buildMetricRows(computeStrategyStats(null)).every((m) => m.currentValue === '—')).toBe(true);
  });

  it('부제에 수요 사례 N건', () => {
    expect(buildSubtitle(computeStrategyStats(seedResponse()))).toContain('수요 사례 8건');
    expect(buildSubtitle(computeStrategyStats(null))).toContain('수요 사례 —건');
  });

  it('푸터는 기준일을 STRATEGY_CONTENT.asOf 에서 가져온다', () => {
    expect(formatFooter(computeStrategyStats(seedResponse()))).toContain(`정적 본문 기준일 ${STRATEGY_CONTENT.asOf}`);
    expect(formatFooter(null)).not.toContain('{');
  });
});

describe('STRATEGY_CONTENT 무결성', () => {
  const C = STRATEGY_CONTENT;
  const allText = JSON.stringify(C);

  it('T21 옵션 7 · 협업 5 · 질문 8 · 세트 역할 7 · 지표 11 · 출처 ID 중복 없음', () => {
    expect(C.options).toHaveLength(7);
    expect(C.collabModels).toHaveLength(5);
    expect(C.questions).toHaveLength(8);
    expect(C.roles).toHaveLength(7);
    expect(C.metricDefs).toHaveLength(11);
    expect(C.version).toBe(2);
    const ids = STRATEGY_SOURCES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('AC-40 S1~S24 불변, S25+ 는 이어서 번호 부여', () => {
    const ids = STRATEGY_SOURCES.map((s) => s.id);
    expect(ids).toEqual(Array.from({ length: ids.length }, (_, i) => `S${i + 1}`));
    expect(STRATEGY_SOURCES[0]!.url).toBe('https://shop.unitree.com/products/go1-motor');
    expect(STRATEGY_SOURCES[23]!.url).toBe('https://www.faulhaber.com/en/products/series/4221bxth/');
    expect(ids.length).toBeGreaterThan(24);
  });

  const demand = readSeedJson<unknown>('demand-cases.json');
  const regrade = readSeedJson<unknown>('sourcing-regrade.json');
  (demand ? it : it.skip)('AC-40 S25+ URL 은 리서처 JSON(수요 사례·재판정)에 실제로 존재한다', () => {
    const hay = JSON.stringify(demand) + JSON.stringify(regrade ?? {});
    for (const s of STRATEGY_SOURCES.slice(24)) {
      expect(s.url.startsWith('https://')).toBe(true);
      expect(hay).toContain(JSON.stringify(s.url).slice(1, -1));
    }
  });

  it('수요 사례 행: 최대 6건, 모두 [S25+] 와 등급·(데이터) 표기', () => {
    const rows = C.factRows.filter((r) => r.category === '수요 사례(외부 채택)');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(6);
    for (const r of rows) {
      expect(r.fact).toContain('(데이터)');
      const refs = collectSourceRefs(r.evidence);
      expect(refs.length).toBeGreaterThan(0);
      for (const id of refs) expect(Number(id.slice(1))).toBeGreaterThanOrEqual(25);
      expect(r.evidence).toMatch(/\b[AB]\b/);
    }
  });

  (demand ? it : it.skip)('수요 사례 행의 출처는 demand-cases.json 의 A/B 등급·모듈 층 사례의 URL 이다', () => {
    const cases = (demand as { cases: { level: string; evidenceGrade: string; sources: { url: string }[] }[] }).cases;
    for (const r of C.factRows.filter((x) => x.category === '수요 사례(외부 채택)')) {
      for (const id of collectSourceRefs(r.evidence)) {
        const url = STRATEGY_SOURCES.find((s) => s.id === id)!.url;
        const hit = cases.find((c) => c.sources.some((s) => s.url === url));
        expect(hit, `${r.subject} ${id}`).toBeTruthy();
        expect(['A', 'B']).toContain(hit!.evidenceGrade);
        expect(hit!.level).toBe('module');
      }
    }
  });

  it('AC-38 Atlas–Mobis 행: 역할 분담 명시, "외판" 없음 / 사실 표 라벨', () => {
    const row = C.factRows.find((r) => r.subject.includes('Mobis'))!;
    expect(row.category).toBe('외부 조달(그룹 내 부품사, 혼합)');
    expect(row.fact).toContain('설계는 세트 제조사(Boston Dynamics)가 하고 양산 단계 액추에이터의 공급은 부품사(Hyundai Mobis)가 맡는 역할 분담입니다. (데이터)');
    expect(row.category + row.fact + row.evidence).not.toContain('외판');
    expect(C.factRows.some((r) => r.category === '자체 개발')).toBe(false);
    expect(C.factsFootnote).toContain('자체 여부는 조달 태세 재판정(근거 등급 A/B 확인, C/D·근거 없음은 확인 불가)을 따릅니다.');
  });

  it('AC-37 세트 역할 7행: 직접 3·간접 3·비교 1, 모든 행에 (데이터)/(가설)/(일반 지식) 표기', () => {
    expect(C.roles.map((r) => r.kind)).toEqual(['직접 1', '직접 2', '직접 3', '간접 1', '간접 2', '간접 3', '비교 사례']);
    for (const r of C.roles) expect(`${r.content} ${r.evidence} ${r.limits}`).toMatch(/\((데이터|가설|일반 지식)/);
    expect(C.roles[3]!.evidence).toContain('동적 문장 8');
    expect(C.roles[1]!.limits).toContain('6절 질문 6');
    expect(C.roles[4]!.limits).toContain('4절 협업 모델 5번');
  });

  it('AC-39 절 번호·상호참조 갱신: 구 번호 없음, M1 재정의·M11 신설, 옵션 A·G 덧붙임', () => {
    expect(Object.values(C.sections)).toEqual([
      '1. 현황 진단',
      '2. 세트(LG CLOiD)의 역할: 직접 3 + 간접 3',
      '3. 사업화 경로 옵션',
      '4. 부품 사업부(그룹 내 부품 조직)와의 협업 모델',
      '5. ARGOS로 추적할 지표',
      '6. 의사결정 질문',
      '출처',
    ]);
    expect(allText).not.toContain('3-3');
    expect(C.options[6]!.prerequisite).toContain('정보 차단벽(4절 협업 모델 5번)');
    expect(C.metricDefs.find((m) => m.id === 'M1')!.name).toBe('M1 자체 개발 확인 회사 비율');
    expect(C.metricDefs.find((m) => m.id === 'M11')!.name).toBe('M11 외부 조달 확인 사례 수');
    expect(C.options[0]!.evidence).toContain('이 외 공개 채택 사례는 동적 문장 8을 따릅니다(공급 계약 형태는 확인되지 않음).');
    expect(C.options[6]!.evidence).toContain('이 외 공개 채택 사례는 동적 문장 8을 따릅니다(공급 계약 형태는 확인되지 않음).');
    expect(C.notice).toContain("'수요 사례'는 외부 액추에이터를 쓰는 공개 채택 사례이며 공급 계약 여부는 별도입니다. 세트 역할(직접·간접 기여)은 검토용 (가설)입니다.");
  });

  it('AC-41 동적 문장·헤드라인에 하위 부품 층 공급사(maxon·Harmonic Drive 등) 분석이 없다', () => {
    const d = seedResponse();
    const text = buildDiagnosisLines(computeStrategyStats(d)).slice(0, 3).join(' ') + buildHeadlineMessage(computeStrategyStats(d));
    expect(text).not.toContain('maxon');
  });

  it('T22 본문의 모든 [S#] 가 STRATEGY_SOURCES 에 존재', () => {
    const ids = new Set(STRATEGY_SOURCES.map((s) => s.id));
    const refs = collectSourceRefs(allText);
    expect(refs.length).toBeGreaterThan(0);
    for (const r of refs) expect(ids.has(r)).toBe(true);
  });

  it('T23 모든 출처 URL 이 https 이고 safeSourceHref 를 통과', () => {
    for (const s of STRATEGY_SOURCES) {
      expect(s.url.startsWith('https://')).toBe(true);
      expect(safeSourceHref(s.url)).not.toBe('');
    }
  });

  it('safeSourceHref 거부 케이스', () => {
    for (const u of ['http://a.com/x', 'javascript:alert(1)', 'https://user:pw@a.com/', 'https://localhost/', 'https://a_b.com/', '', null, undefined, 'not a url']) {
      expect(safeSourceHref(u as string)).toBe('');
    }
    expect(safeSourceHref('https://example.com/a?b=1')).toBe('https://example.com/a?b=1');
  });

  it('T24 옵션·협업 각 행의 근거 셀에 (데이터)/(가설)/(일반 지식) 표기', () => {
    const tag = /\((데이터|가설|일반 지식)[,)]/;
    for (const o of C.options) expect(o.evidence).toMatch(tag);
    for (const m of C.collabModels) expect(m.evidence).toMatch(tag);
  });

  it('T25 특정 조직명 없음 + 부품 사업부 정의 문구 존재', () => {
    for (const w of ['LG이노텍', 'Innotek', '부품솔루션']) expect(allText).not.toContain(w);
    expect(allText).toContain('부품 사업부(그룹 내 부품 조직)');
    expect(C.notice).toContain('부품 사업부는 그룹 내 부품 조직을 뜻하며 특정 조직을 지칭하지 않습니다');
  });

  it('T26 과장어·이모지 없음', () => {
    for (const w of ['압도적', '독보적', '혁신적', '반드시', '최고의']) expect(allText).not.toContain(w);
    // 화살표(↔ →)는 명세 원문(M5)에 있으므로 이모지 블록(U+1F000~, U+2600~27BF)만 검사
    expect(allText).not.toMatch(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/u);
  });

  it('T27 Digit-Harmonic Drive 연결·2볼트·AgiBot 외판 단정 없음', () => {
    const sentences = allText.split(/[.。]|\\n/);
    expect(sentences.some((s) => /Digit/.test(s) && /Harmonic Drive/.test(s))).toBe(false);
    expect(allText).not.toContain('2볼트');
    const agi = sentences.filter((s) => /agibot/i.test(s));
    expect(agi.length).toBeGreaterThan(0);
    for (const s of agi) {
      expect(s).not.toMatch(/외판 확인|외판 사례|외판 제품/);
      if (s.includes('외판')) expect(s).toContain('외판 근거 미확인');
    }
    const row = C.factRows.find((r) => /AgiBot/i.test(r.subject))!;
    expect(row.category).toContain('외판 근거 미확인');
  });
});
