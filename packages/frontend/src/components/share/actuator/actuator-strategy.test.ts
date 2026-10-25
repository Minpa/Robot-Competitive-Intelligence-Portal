import { describe, expect, it } from 'vitest';
import {
  STRATEGY_CONTENT,
  STRATEGY_SOURCES,
  buildDiagnosisLines,
  buildMetricRows,
  classifySale,
  collectSourceRefs,
  computeStrategyStats,
  median,
  safeSourceHref,
  sameCompany,
} from './actuator-strategy';
import { act, response, robot, seedResponse, sp } from './actuator-strategy.fixtures';

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
    }
    expect(computeStrategyStats(null).hasData).toBe(false);
    expect(computeStrategyStats(response([], [])).hasData).toBe(true);
  });

  it('T2 회사 3곳: 자체 2기 / 외부 공급사만 / 액추에이터 없음 → C=2, S=1, 50%', () => {
    const s = computeStrategyStats(
      response(
        [
          robot('A1', 'Alpha', [act('Alpha', true)]),
          robot('A2', 'Alpha', [act('Alpha', true)]),
          robot('B1', 'Beta', [act('Xcorp', false)]),
          robot('C1', 'Gamma', []),
        ],
        []
      )
    );
    expect(s.companyCount).toBe(2);
    expect(s.inHouseCompanyCount).toBe(1);
    expect(s.inHouseCompanyPct).toBe(50);
    expect(s.robotsWithActuatorCount).toBe(3);
    expect(s.inHouseRobotCount).toBe(2);
  });

  it('T3 forecast 로봇은 모든 집계에서 제외', () => {
    const s = computeStrategyStats(
      response(
        [robot('A1', 'Alpha', [act('Alpha', true)]), robot('F1', 'Fcast', [act('Fcast', true), act('Zed', false)], { forecast: true })],
        []
      )
    );
    expect(s.robotCount).toBe(1);
    expect(s.companyCount).toBe(1);
    expect(s.robotsWithActuatorCount).toBe(1);
    expect(s.externalSourcing).toEqual([]);
  });

  it('T4 Atlas형(자체+Mobis 동시): 회사는 자체로 집계, externalSourcing vendors=[Hyundai Mobis]', () => {
    const s = computeStrategyStats(response([robot('Atlas', 'Boston Dynamics', [act('Boston Dynamics', true), act('Hyundai Mobis', false)])], []));
    expect(s.inHouseCompanyCount).toBe(1);
    expect(s.externalSourcing).toEqual([{ robotName: 'Atlas', company: 'Boston Dynamics', vendors: ['Hyundai Mobis'] }]);
  });

  it('T4b 외부 조달 vendor 중복 제거', () => {
    const s = computeStrategyStats(response([robot('R', 'Co', [act('Mobis', false), act('Mobis', false), act('Other', false)])], []));
    expect(s.externalSourcing[0]!.vendors).toEqual(['Mobis', 'Other']);
  });

  it("T5 vendor 가 '(공급사 미상)' 또는 빈 값이면 externalSourcing 제외", () => {
    const s = computeStrategyStats(
      response([robot('R1', 'Co', [act('(공급사 미상)', false)]), robot('R2', 'Co2', [act(null, false)]), robot('R3', 'Co3', [act('  ', false)])], [])
    );
    expect(s.externalSourcing).toEqual([]);
  });

  it('T6 시드 형태 제품의 판매 상태', () => {
    const s = computeStrategyStats(seedResponse());
    expect([...s.sale.confirmed].sort()).toEqual(['Fourier Intelligence', 'Unitree Robotics', 'Xiaomi']);
    expect(s.sale.unconfirmed).toEqual(['AgiBot']);
    expect(s.sale.planned).toEqual(['LG Electronics']);
    expect([...s.sale.inhouseOnly].sort()).toEqual(['Kepler Robotics', 'Tesla']);
    expect(s.setMakerSellers).toHaveLength(7);
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
    const s = computeStrategyStats(response([robot('a', 'Co', [act('Co', true)]), robot('b', 'Co', [act('Co', true)]), robot('c', 'co ', [act('Co', true)])], []));
    expect(s.companyCount).toBe(1);
    expect(s.inHouseCompanyCount).toBe(1);
    expect(s.inHouseRobotCount).toBe(3);
  });

  it('classifySale 우선순위/경계', () => {
    expect(classifySale({ status: 'available', priceUsd: 10, targetMarket: 'x (in-house)' })).toBe('inhouseOnly');
    expect(classifySale({ status: 'announced', priceUsd: null, targetMarket: 'external partners' })).toBe('planned');
    expect(classifySale({ status: 'available', priceUsd: null, targetMarket: 'externally?' })).toBe('unconfirmed');
    expect(classifySale({ status: null, priceUsd: null, targetMarket: null })).toBe('unconfirmed');
  });
});

describe('buildDiagnosisLines / buildMetricRows', () => {
  it('T17 빈 stats: 7줄이고 NaN/undefined/Infinity/null 없음', () => {
    for (const input of [null, response([], [])]) {
      const stats = computeStrategyStats(input);
      const lines = buildDiagnosisLines(stats);
      expect(lines).toHaveLength(7);
      for (const l of lines) expect(l).not.toMatch(BAD);
      for (const m of buildMetricRows(stats)) {
        for (const v of Object.values(m)) expect(v).not.toMatch(BAD);
      }
    }
    const seed = computeStrategyStats(seedResponse());
    for (const l of buildDiagnosisLines(seed)) expect(l).not.toMatch(BAD);
  });

  it('T18 pct 2/3 → 67%', () => {
    const stats = computeStrategyStats(
      response([robot('a', 'A', [act('A', true)]), robot('b', 'B', [act('B', true)]), robot('c', 'C', [act('X', false)])], [])
    );
    expect(stats.inHouseCompanyPct).toBe(67);
    expect(buildDiagnosisLines(stats)[0]).toContain('67%');
    expect(buildMetricRows(stats).find((m) => m.id === 'M1')!.currentValue).toBe('67%');
  });

  it('T19 nonQddPriced=0 이면 직접 비교 불가 문구', () => {
    const line = buildDiagnosisLines(computeStrategyStats(seedResponse()))[4]!;
    expect(line).toContain('직접 비교는 현재 데이터로 할 수 없습니다');
    const priced = computeStrategyStats(response([], [sp('V', 'm', { type: '하모닉(스트레인웨이브)', priceUsd: 900 })]));
    expect(buildDiagnosisLines(priced)[4]).not.toContain('직접 비교');
  });

  it('T20 C=0 이면 pct 자리 "—"', () => {
    const stats = computeStrategyStats(response([], []));
    expect(buildDiagnosisLines(stats)[0]).toContain('(—)');
    expect(buildDiagnosisLines(stats)[0]).not.toContain('%');
  });

  it('지표 현재값: 시드 기준 M2/M3/M8/M9', () => {
    const rows = buildMetricRows(computeStrategyStats(seedResponse()));
    const v = (id: string) => rows.find((m) => m.id === id)!.currentValue;
    expect(rows).toHaveLength(10);
    expect(v('M2')).toBe('3개사');
    expect(v('M3')).toBe('13개 / $230');
    expect(v('M8')).toBe('0/1');
    expect(v('M9')).toBe('0개');
    expect(v('M4')).toBe('—');
  });

  it('데이터가 없으면 지표 현재값은 모두 "—"', () => {
    expect(buildMetricRows(computeStrategyStats(null)).every((m) => m.currentValue === '—')).toBe(true);
  });
});

describe('STRATEGY_CONTENT 무결성', () => {
  const C = STRATEGY_CONTENT;
  const allText = JSON.stringify(C);

  it('T21 옵션 7 · 협업 5 · 질문 8 · 출처 ID 중복 없음', () => {
    expect(C.options).toHaveLength(7);
    expect(C.collabModels).toHaveLength(5);
    expect(C.questions).toHaveLength(8);
    const ids = STRATEGY_SOURCES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
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
