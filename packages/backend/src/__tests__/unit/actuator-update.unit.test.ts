/**
 * actuator-update.util.ts 단위 테스트
 *
 * update-actuator-data.ts 가 쓰는 순수 변환 함수들:
 * 이름 정규화·별칭 매칭, 신뢰도 비교, 단위 변환, JSON → 행 변환, CI 값 생성, CLI 인자.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  type RobotInput,
  type SupplierProductInput,
  type CompetitorRow,
  normalizeConfidence,
  confidenceRank,
  isConfidenceAtLeast,
  maxConfidence,
  fieldConfidence,
  bestSourceFor,
  shouldOverwriteSpec,
  shouldReplaceCiValue,
  valuesEqual,
  parseNumber,
  parseInteger,
  kmhToMps,
  gramsToKg,
  minutesToHours,
  toDecimalString,
  normalizeGearRatio,
  normalizeReleaseDate,
  normalizeCountry,
  normalizeName,
  normalizeCompanyName,
  looseCompanyKey,
  matchCompany,
  sameCompany,
  robotNameCandidates,
  matchRobot,
  matchByNames,
  matchCompetitors,
  familyToken,
  nameTokens,
  normalizeActuatorType,
  regionToCountry,
  robotToRowPatch,
  diffRobotRow,
  bodyToRow,
  handToRow,
  diffSpecRow,
  actuatorComponentName,
  actuatorToComponentRow,
  supplierComponentName,
  supplierToComponentRow,
  supplierToDynamicSpecs,
  supplierToProductPatch,
  mergeSpecs,
  fillMissingSpecs,
  decideComponentWrite,
  deepEqual,
  buildCiValuesForRobot,
  formatPrice,
  missingNewRobotFields,
  validateRobotsFile,
  validateSuppliersFile,
  parseArgs,
  bump,
  formatCounters,
  validateSourcingFile,
  validateAdoptionsFile,
  sanitizeSourcingEvidence,
  sanitizeSourcingVendors,
  sanitizeAdoptionSources,
  adoptionCaseKey,
  vendorKey,
  sameVendor,
  modelMatches,
  ALL_SECTIONS,
  MIN_OVERWRITE_CONFIDENCE,
  CI_ACTUATOR_ITEMS,
  type Counters,
} from '../../db/actuator-update.util.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.resolve(__dirname, '../../db/seed-data/actuator-update');

function robot(over: Partial<RobotInput> = {}): RobotInput {
  return {
    name: 'Optimus Gen 2',
    company: 'Tesla',
    aliases: ['Optimus Gen2'],
    announcementYear: 2023,
    announcementQuarter: 4,
    status: 'development',
    purpose: 'industrial',
    locomotionType: 'bipedal',
    handType: 'multi_finger',
    commercializationStage: 'prototype',
    region: 'north_america',
    sources: [
      { url: 'https://www.tesla.com/AI', publisher: 'Tesla', date: '2023-12-13', confidence: 'B', fields: ['body', 'hand', 'actuators'] },
      { url: 'https://example.com/price', publisher: 'Blog', date: '2026-07-03', confidence: 'C', fields: ['price'] },
    ],
    ...over,
  };
}

// ============================================================
describe('신뢰도 규칙', () => {
  it('정규화: 소문자/공백/미지정/E 척도', () => {
    expect(normalizeConfidence('a')).toBe('A');
    expect(normalizeConfidence(' b ')).toBe('B');
    expect(normalizeConfidence(null)).toBe('D');
    expect(normalizeConfidence('zzz')).toBe('D');
    expect(normalizeConfidence('E')).toBe('F');
  });

  it('랭크 순서 A > B > C > D > F', () => {
    expect(confidenceRank('A')).toBeGreaterThan(confidenceRank('B'));
    expect(confidenceRank('B')).toBeGreaterThan(confidenceRank('C'));
    expect(confidenceRank('C')).toBeGreaterThan(confidenceRank('D'));
    expect(confidenceRank('D')).toBeGreaterThan(confidenceRank('F'));
    expect(isConfidenceAtLeast('B', 'B')).toBe(true);
    expect(isConfidenceAtLeast('C', 'B')).toBe(false);
    expect(maxConfidence(['C', null, 'A', 'B'])).toBe('A');
    expect(maxConfidence([null, undefined])).toBeNull();
  });

  it('fieldConfidence: 필드별 출처 → 상위 경로 → 전체 출처 → 기본값', () => {
    const r = robot();
    expect(fieldConfidence(r.sources, 'body.heightCm')).toBe('B'); // 'body' 가 body.* 를 포함
    expect(fieldConfidence(r.sources, 'price')).toBe('C');
    expect(fieldConfidence(r.sources, 'unknownField')).toBe('D'); // fields 지정 출처만 있고 generic 없음
    expect(fieldConfidence([{ url: 'u', confidence: 'A' }], 'anything')).toBe('A'); // generic 출처
    expect(fieldConfidence([], 'x')).toBe('D');
    expect(fieldConfidence(null, 'x')).toBe('D');
    expect(bestSourceFor(r.sources, 'price')?.url).toBe('https://example.com/price');
    expect(bestSourceFor(r.sources, 'body.weightKg')?.url).toBe('https://www.tesla.com/AI');
  });

  it(`shouldOverwriteSpec: 기존 값은 ${MIN_OVERWRITE_CONFIDENCE} 이상일 때만 덮어씀`, () => {
    expect(shouldOverwriteSpec(null, 173, 'D')).toBe(true); // 비어있으면 채움
    expect(shouldOverwriteSpec('173.00', 173, 'A')).toBe(false); // 같은 값
    expect(shouldOverwriteSpec('173.00', 175, 'C')).toBe(false); // 낮은 신뢰도
    expect(shouldOverwriteSpec('173.00', 175, 'B')).toBe(true);
    expect(shouldOverwriteSpec('173.00', 175, 'A')).toBe(true);
    expect(shouldOverwriteSpec(173, null, 'A')).toBe(false); // null 은 절대 쓰지 않음
    expect(shouldOverwriteSpec(false, true, 'B')).toBe(true);
    expect(shouldOverwriteSpec(true, true, 'A')).toBe(false);
  });

  it('shouldReplaceCiValue: 기존보다 낮으면 건너뜀, 같거나 높으면 갱신, 기존 없으면 항상', () => {
    expect(shouldReplaceCiValue('B', 'C', '기존')).toBe(false);
    expect(shouldReplaceCiValue('B', 'B', '기존')).toBe(true);
    expect(shouldReplaceCiValue('D', 'A', '기존')).toBe(true);
    expect(shouldReplaceCiValue('A', 'F', null)).toBe(true);
    expect(shouldReplaceCiValue('A', 'F', '')).toBe(true);
  });
});

// ============================================================
describe('숫자/단위 변환', () => {
  it('parseNumber 는 단위 문자열도 처리', () => {
    expect(parseNumber('48 Nm')).toBe(48);
    expect(parseNumber('1,200')).toBe(1200);
    expect(parseNumber(1.5)).toBe(1.5);
    expect(parseNumber(null)).toBeNull();
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('n/a')).toBeNull();
    expect(parseNumber(NaN)).toBeNull();
    expect(parseNumber(true)).toBeNull();
    expect(parseInteger('28.6')).toBe(29);
  });

  it('kmh→m/s, g→kg, min→h', () => {
    expect(kmhToMps(9)).toBe(2.5);
    expect(gramsToKg(960)).toBe(0.96);
    expect(minutesToHours(90)).toBe(1.5);
  });

  it('toDecimalString: scale 적용, 범위 초과는 null', () => {
    expect(toDecimalString(173, 2, 10_000)).toBe('173.00');
    expect(toDecimalString('2.5', 2, 100)).toBe('2.50');
    expect(toDecimalString(100, 2, 100)).toBeNull(); // precision 4 scale 2 → 100 불가
    expect(toDecimalString(null, 2, 100)).toBeNull();
  });

  it('normalizeGearRatio', () => {
    expect(normalizeGearRatio(9)).toEqual({ text: '9:1', ratio: 9 });
    expect(normalizeGearRatio('9:1')).toEqual({ text: '9:1', ratio: 9 });
    expect(normalizeGearRatio('1:9')).toEqual({ text: '9:1', ratio: 9 });
    expect(normalizeGearRatio('7.75')).toEqual({ text: '7.75:1', ratio: 7.75 });
    expect(normalizeGearRatio('100/1')).toEqual({ text: '100:1', ratio: 100 });
    expect(normalizeGearRatio(null)).toBeNull();
    expect(normalizeGearRatio(0)).toBeNull();
  });

  it('normalizeReleaseDate: 연/월/일 부분 + 부가 설명 허용', () => {
    expect(normalizeReleaseDate('2024-01-10')).toBe('2024-01-10');
    expect(normalizeReleaseDate('2023-08')).toBe('2023-08-01');
    expect(normalizeReleaseDate('2024')).toBe('2024-01-01');
    expect(normalizeReleaseDate('2022-09 (AI Day disclosure)')).toBe('2022-09-01');
    expect(normalizeReleaseDate('2026-01 (CES 2026)')).toBe('2026-01-01');
    expect(normalizeReleaseDate('CES 2024')).toBeNull();
    expect(normalizeReleaseDate(null)).toBeNull();
  });

  it('normalizeCountry: ISO 코드 → DB 표기', () => {
    expect(normalizeCountry('JP')).toBe('Japan');
    expect(normalizeCountry('cn')).toBe('China');
    expect(normalizeCountry('US')).toBe('USA');
    expect(normalizeCountry('KR')).toBe('Korea');
    expect(normalizeCountry('Switzerland')).toBe('Switzerland');
    expect(normalizeCountry(null)).toBe('Unknown');
  });

  it('valuesEqual: decimal 문자열과 숫자', () => {
    expect(valuesEqual('173.00', 173)).toBe(true);
    expect(valuesEqual('2.50', '2.5')).toBe(true);
    expect(valuesEqual('abc', 'abc')).toBe(true);
    expect(valuesEqual('abc', 'abd')).toBe(false);
    expect(valuesEqual(null, 0)).toBe(false);
    expect(valuesEqual(true, true)).toBe(true);
  });
});

// ============================================================
describe('이름 정규화·매칭', () => {
  it('normalizeName: 대소문자/공백/구두점/악센트 무시', () => {
    expect(normalizeName('Optimus Gen 2')).toBe('optimusgen2');
    expect(normalizeName('Optimus Gen2')).toBe('optimusgen2');
    expect(normalizeName('Atlas (Electric)')).toBe('atlaselectric');
    expect(normalizeName('GR-1')).toBe('gr1');
    expect(normalizeName('aeo')).toBe(normalizeName('Aeo'));
    expect(normalizeName('铁大')).toBe('铁大');
    expect(normalizeName(null)).toBe('');
  });

  it('normalizeCompanyName: 괄호·법인 접미사 제거', () => {
    expect(normalizeCompanyName('Tesla, Inc.')).toBe('tesla');
    expect(normalizeCompanyName('AgiBot (Zhiyuan Robotics)')).toBe('agibot');
    expect(normalizeCompanyName('UBTECH Robotics Corp Ltd')).toBe('ubtechrobotics');
    expect(normalizeCompanyName('1X Technologies')).toBe('1x');
    expect(normalizeCompanyName('FAULHABER')).toBe('faulhaber');
    expect(looseCompanyKey('Unitree Robotics')).toBe('unitree');
    expect(looseCompanyKey('Boston Dynamics')).toBe('boston');
    expect(looseCompanyKey('T-Motor')).toBe('tmotor'); // 'motor' 제거 시 3자 미만 → 엄격 키 유지
  });

  const companies = [
    { id: 'c1', name: 'Tesla' },
    { id: 'c2', name: 'Unitree Robotics' },
    { id: 'c3', name: 'Fourier Intelligence' },
    { id: 'c4', name: 'Agibot' },
    { id: 'c5', name: 'Kepler Robot' },
    { id: 'c6', name: 'Mentee Robotics' },
    { id: 'c7', name: 'Rainbow Robotics' },
    { id: 'c8', name: 'LG Electronics' },
    { id: 'c9', name: 'Aeolus Robotics' },
    { id: 'c10', name: 'Boston Dynamics' },
    { id: 'c11', name: '1X Technologies' },
    { id: 'c12', name: 'T-Motor' },
    { id: 'c13', name: 'Gyems' },
    { id: 'c14', name: 'Maxon Motor' },
    { id: 'c15', name: 'Savioke' },
    { id: 'c16', name: 'Hyundai Motor Group' },
    { id: 'c17', name: 'UBTECH' },
  ];

  it.each([
    ['Tesla', 'Tesla', 'exact'],
    ['Tesla, Inc.', 'Tesla', 'exact'],
    ['Unitree', 'Unitree Robotics', 'alias'],
    ['Fourier', 'Fourier Intelligence', 'alias'],
    ['AgiBot (Zhiyuan Robotics)', 'Agibot', 'exact'],
    ['AGIBOT', 'Agibot', 'exact'],
    ['Kepler Robotics', 'Kepler Robot', 'alias'],
    ['Mentee Robotics (Mobileye)', 'Mentee Robotics', 'exact'],
    ['Rainbow Robotics (KAIST)', 'Rainbow Robotics', 'exact'],
    ['LG Electronics', 'LG Electronics', 'exact'],
    ['aeolus', 'Aeolus Robotics', 'alias'],
    ['Boston Dynamics', 'Boston Dynamics', 'exact'],
    ['1X', '1X Technologies', 'exact'], // 'Technologies' 는 법인 접미사로 제거되어 정확 일치
    ['1X Technologies', '1X Technologies', 'exact'],
    ['CubeMars (T-Motor)', 'T-Motor', 'alias'],
    ['MyActuator (ex-Gyems)', 'Gyems', 'alias'],
    ['maxon', 'Maxon Motor', 'alias'],
    ['Relay Robotics (formerly Savioke)', 'Savioke', 'alias'],
    ['UBTECH Robotics', 'UBTECH', 'alias'],
  ])('matchCompany(%s) → %s (%s)', (input, expected, strategy) => {
    const m = matchCompany(companies, input);
    expect(m?.row.name).toBe(expected);
    expect(m?.strategy).toBe(strategy);
  });

  it('matchCompany: companyAliases 로도 매칭, 신규 회사는 null, Hyundai Mobis 는 HMG 와 혼동 안 함', () => {
    expect(matchCompany(companies, 'Relay Robotics', ['Savioke'])?.row.name).toBe('Savioke');
    expect(matchCompany(companies, 'RobStride Dynamics')).toBeNull();
    expect(matchCompany(companies, 'Hyundai Mobis')).toBeNull();
    expect(sameCompany('Unitree', 'Unitree Robotics')).toBe(true);
    expect(sameCompany('Agibot', 'AgiBot (Zhiyuan Robotics)')).toBe(true);
    expect(sameCompany('Tesla', 'Figure AI')).toBe(false);
  });

  it('robotNameCandidates: name, aliases, 회사+이름 조합', () => {
    const c = robotNameCandidates({ name: 'G1', company: 'Unitree Robotics', aliases: ['Unitree G1', 'G1 EDU'] });
    expect(c).toContain('g1');
    expect(c).toContain('unitreeg1');
    expect(c).toContain('g1edu');
    expect(c).toContain('unitreeroboticsg1');
  });

  const robots = [
    { id: 'r1', companyId: 'unitree', name: 'G1' },
    { id: 'r2', companyId: 'agibot', name: 'Genie G1' },
    { id: 'r3', companyId: 'tesla', name: 'Optimus Gen 3' },
    { id: 'r4', companyId: 'kepler', name: 'Kepler Forerunner K2' },
    { id: 'r5', companyId: 'toyota', name: 'Toyota HSR' },
    { id: 'r6', companyId: 'aeolus', name: 'Aeo' },
  ];

  it('matchRobot 은 회사 범위 안에서만 비교 (Unitree G1 vs Agibot Genie G1 충돌 없음)', () => {
    const unitreeG1 = { name: 'G1', company: 'Unitree Robotics', aliases: ['Unitree G1'] };
    const agibotG1 = { name: 'Genie G1', company: 'Agibot', aliases: ['AgiBot G1', 'G1'] };
    expect(matchRobot(robots, unitreeG1, 'unitree')?.row.id).toBe('r1');
    expect(matchRobot(robots, agibotG1, 'agibot')?.row.id).toBe('r2');
    // alias 'G1' 이 있어도 회사가 다르면 Unitree 행에 붙지 않는다
    expect(matchRobot(robots, agibotG1, 'agibot')?.row.id).not.toBe('r1');
    // 회사 밖 전역 매칭은 하지 않는다
    expect(matchRobot(robots, unitreeG1, 'tesla')).toBeNull();
    expect(matchRobot(robots, unitreeG1, null)).toBeNull();
  });

  it('matchRobot: 별칭으로 DB 이름 찾기 (Optimus V3 → Optimus Gen 3 등)', () => {
    expect(matchRobot(robots, { name: 'Optimus V3', company: 'Tesla', aliases: ['Optimus 3', 'Optimus Gen 3'] }, 'tesla')?.row.id).toBe('r3');
    expect(matchRobot(robots, { name: 'Forerunner K2 Bumblebee', company: 'Kepler Robot', aliases: ['Kepler Forerunner K2'] }, 'kepler')?.row.id).toBe('r4');
    expect(matchRobot(robots, { name: 'HSR', company: 'Toyota', aliases: ['Toyota HSR'] }, 'toyota')?.row.id).toBe('r5');
    expect(matchRobot(robots, { name: 'aeo', company: 'Aeolus Robotics', aliases: [] }, 'aeolus')?.row.id).toBe('r6');
    expect(matchRobot(robots, { name: 'H2', company: 'Unitree Robotics', aliases: ['Unitree H2'] }, 'unitree')).toBeNull();
    const m = matchRobot(robots, { name: 'Optimus V3', company: 'Tesla', aliases: ['Optimus Gen 3'] }, 'tesla');
    expect(m?.strategy).toBe('alias');
    expect(matchRobot(robots, { name: 'G1', company: 'Unitree', aliases: [] }, 'unitree')?.strategy).toBe('exact');
  });

  it('matchByNames: components/products 후보명', () => {
    const comps = [{ id: 'a', name: 'Tesla Rotary Actuator' }, { id: 'b', name: 'AK10-9' }];
    expect(matchByNames(comps, ['tesla rotary actuator'])?.id).toBe('a');
    expect(matchByNames(comps, ['T-Motor AK10-9', 'AK10-9'])?.id).toBe('b');
    expect(matchByNames(comps, ['AK80-64'])).toBeNull();
  });
});

// ============================================================
describe('CI 경쟁사 매핑', () => {
  const competitors: CompetitorRow[] = [
    { id: 'k1', slug: 'digit', name: 'Digit', manufacturer: 'Agility Robotics' },
    { id: 'k2', slug: 'optimus', name: 'Optimus Gen 2', manufacturer: 'Tesla' },
    { id: 'k3', slug: 'figure', name: 'Figure 02', manufacturer: 'Figure AI' },
    { id: 'k4', slug: 'neo', name: 'NEO', manufacturer: '1X Technologies' },
    { id: 'k5', slug: 'atlas', name: 'Atlas (Electric)', manufacturer: 'Boston Dynamics' },
    { id: 'k6', slug: 'cloid', name: 'CLOiD', manufacturer: 'LG Electronics' },
    { id: 'k7', slug: 'unitree-g1', name: 'Unitree G1', manufacturer: 'Unitree Robotics' },
    { id: 'k8', slug: 'unitree', name: 'G1/H1', manufacturer: 'Unitree Robotics' },
    { id: 'k9', slug: 'agibot', name: 'A3 Ultra', manufacturer: 'AGIBOT' },
    { id: 'k10', slug: 'agibot-a3', name: 'Expedition A3', manufacturer: 'AgiBot' },
  ];
  const slugs = (r: Parameters<typeof matchCompetitors>[1], co?: string) => matchCompetitors(competitors, r, co).map((m) => `${m.competitor.slug}:${m.strategy}`).sort();

  it('토큰/제품군', () => {
    expect(nameTokens('G1/H1')).toEqual(['g1', 'h1']);
    expect(familyToken('Optimus Gen 2')).toBe('optimus');
    expect(familyToken('Figure 03')).toBe('figure');
    expect(familyToken('G1-D')).toBe('g1');
    expect(familyToken('Atlas (Electric)')).toBe('atlas');
  });

  it('제품명 일치 (name)', () => {
    expect(slugs({ name: 'Digit', company: 'Agility Robotics', aliases: ['Digit v4'] })).toEqual(['digit:name']);
    expect(slugs({ name: 'Optimus Gen 2', company: 'Tesla', aliases: [] })).toEqual(['optimus:name']);
    expect(slugs({ name: 'G1', company: 'Unitree Robotics', aliases: ['Unitree G1'] })).toEqual(['unitree-g1:name', 'unitree:name']);
    expect(slugs({ name: 'H1', company: 'Unitree Robotics', aliases: ['Unitree H1'] })).toEqual(['unitree:name']);
    expect(slugs({ name: 'Atlas (Electric)', company: 'Boston Dynamics', aliases: ['Atlas'] })).toEqual(['atlas:name']);
    expect(slugs({ name: 'CLOiD', company: 'LG Electronics', aliases: [] })).toEqual(['cloid:name']);
  });

  it('같은 회사 + 제품군 토큰 (family): Optimus V3→optimus, Figure 03→figure, NEO Beta→neo, G1-D→unitree-g1/unitree', () => {
    expect(slugs({ name: 'Optimus V3', company: 'Tesla', aliases: ['Optimus Gen 3'] })).toEqual(['optimus:family']);
    expect(slugs({ name: 'Figure 03', company: 'Figure AI', aliases: ['F.03'] })).toEqual(['figure:family']);
    expect(slugs({ name: 'NEO Beta', company: '1X Technologies', aliases: [] })).toEqual(['neo:family']);
    expect(slugs({ name: 'G1-D', company: 'Unitree Robotics', aliases: ['G1D'] })).toEqual(['unitree-g1:family', 'unitree:family']);
    // companyAliases / canonicalCompany 로도 회사 동일성 판단
    expect(slugs({ name: 'Optimus V3', company: 'Tesla, Inc.', aliases: [] }, 'Tesla')).toEqual(['optimus:family']);
  });

  it('토큰이 겹치지 않으면 매핑하지 않음 (H2, Lingxi X2, 미추적 회사)', () => {
    expect(slugs({ name: 'H2', company: 'Unitree Robotics', aliases: ['Unitree H2'] })).toEqual([]);
    expect(slugs({ name: 'Lingxi X2', company: 'Agibot', aliases: ['AgiBot X2'] })).toEqual([]);
    expect(slugs({ name: 'Genie G1', company: 'Agibot', aliases: ['AgiBot G1'] })).toEqual([]); // Agibot 경쟁사는 A3 계열만
    expect(slugs({ name: 'Walker S2', company: 'UBTECH', aliases: [] })).toEqual([]);
  });
});

// ============================================================
describe('액추에이터 타입', () => {
  it('normalizeActuatorType 동의어', () => {
    expect(normalizeActuatorType('qdd')).toBe('qdd');
    expect(normalizeActuatorType('QDD')).toBe('qdd');
    expect(normalizeActuatorType('Quasi-Direct Drive')).toBe('qdd');
    expect(normalizeActuatorType('Harmonic Drive')).toBe('harmonic');
    expect(normalizeActuatorType('strain wave')).toBe('harmonic');
    expect(normalizeActuatorType('cycloid')).toBe('cycloidal');
    expect(normalizeActuatorType('planetary roller screw')).toBe('linear_screw');
    expect(normalizeActuatorType('linear_screw')).toBe('linear_screw');
    expect(normalizeActuatorType('SEA')).toBe('series_elastic');
    expect(normalizeActuatorType('BLDC + gearbox')).toBe('bldc_gearbox');
    expect(normalizeActuatorType('bldc_gearbox')).toBe('bldc_gearbox');
    expect(normalizeActuatorType('magnetic gear')).toBe('unknown'); // 미등록 조합은 unknown
    expect(normalizeActuatorType(null)).toBe('unknown');
    expect(normalizeActuatorType('mystery')).toBe('unknown');
  });

  it('regionToCountry', () => {
    expect(regionToCountry('north_america')).toBe('USA');
    expect(regionToCountry('china')).toBe('China');
    expect(regionToCountry('korea')).toBe('Korea');
    expect(regionToCountry(null)).toBe('Unknown');
  });
});

// ============================================================
describe('JSON → 행 변환', () => {
  it('robotToRowPatch / diffRobotRow: null 은 쓰지 않고 description 은 비어있을 때만', () => {
    const r = robot({ descriptionKo: '설명', announcementQuarter: null, handType: null, hand: { handType: 'multi_finger' } });
    const patch = robotToRowPatch(r);
    expect(patch.announcementQuarter).toBeUndefined();
    expect(patch.handType).toBe('multi_finger'); // hand.handType 폴백
    expect(patch.description).toBe('설명');

    const existing = { announcementYear: 2023, status: 'development', purpose: 'industrial', description: '기존 설명', region: 'europe' };
    const diff = diffRobotRow(existing, patch);
    expect(diff.description).toBeUndefined(); // 기존 설명 보존
    expect(diff.region).toBe('north_america'); // 값 다르면 갱신
    expect(diff.status).toBeUndefined(); // 같으면 제외

    expect(diffRobotRow({ description: '' }, patch).description).toBe('설명');
    expect(diffRobotRow({ description: null }, patch).description).toBe('설명');
  });

  it('bodyToRow / handToRow', () => {
    const b = bodyToRow({ heightCm: 173, weightKg: '57', payloadKg: null, dofCount: 28, maxSpeedMps: 2.5, operationTimeHours: null, batteryWh: 2300 });
    expect(b).toEqual({ heightCm: '173.00', weightKg: '57.00', payloadKg: null, dofCount: 28, maxSpeedMps: '2.50', operationTimeHours: null });
    expect(bodyToRow(null)).toEqual({ heightCm: null, weightKg: null, payloadKg: null, dofCount: null, maxSpeedMps: null, operationTimeHours: null });
    const h = handToRow({ fingerCount: 5, handDofPerHand: 11, isInterchangeable: false, tactile: true }, 'multi_finger');
    expect(h).toEqual({ handType: 'multi_finger', fingerCount: 5, handDof: 11, gripForceN: null, isInterchangeable: false });
    expect(handToRow({ handType: 'gripper', isInterchangeable: null }, 'multi_finger').handType).toBe('gripper');
  });

  it('diffSpecRow: null 로 덮어쓰기 금지, 기존 값은 B 이상만 교체', () => {
    const existing = { heightCm: '173.00', weightKg: '57.00', payloadKg: '20.00', dofCount: 28, maxSpeedMps: '2.50', operationTimeHours: '4.00' };
    const incomingNulls = bodyToRow({ heightCm: null, weightKg: null });
    expect(diffSpecRow(existing, incomingNulls, () => 'A')).toEqual({});

    const incoming = bodyToRow({ heightCm: 173, weightKg: 73, payloadKg: 25, dofCount: 28 });
    expect(diffSpecRow(existing, incoming, () => 'C')).toEqual({}); // 낮은 신뢰도 → 전부 유지
    expect(diffSpecRow(existing, incoming, () => 'B')).toEqual({ weightKg: '73.00', payloadKg: '25.00' });
    expect(diffSpecRow(existing, incoming, (f) => (f === 'weightKg' ? 'A' : 'D'))).toEqual({ weightKg: '73.00' });
    // 행이 없으면 비-null 전부
    expect(diffSpecRow(null, incoming, () => 'F')).toEqual({ heightCm: '173.00', weightKg: '73.00', payloadKg: '25.00', dofCount: 28 });
    // 비어있던 필드는 신뢰도 무관하게 채움
    expect(diffSpecRow({ ...existing, payloadKg: null }, incoming, () => 'F')).toEqual({ payloadKg: '25.00' });
  });

  it('actuatorToComponentRow: 이름/벤더/스펙 키', () => {
    const r = robot();
    const row = actuatorToComponentRow(
      { name: 'Tesla Rotary Actuator', vendor: 'Tesla', inHouse: true, type: 'harmonic', usageLocation: 'leg', quantity: 6, peakTorqueNm: 110, ratedTorqueNm: 50, speedRpm: 100, weightKg: 1.2, gearRatio: '50:1' },
      r, 'Tesla',
    );
    expect(row.type).toBe('actuator');
    expect(row.name).toBe('Tesla Rotary Actuator');
    expect(row.vendor).toBe('Tesla');
    expect(row.specifications).toMatchObject({
      actuatorType: 'harmonic', ratedTorqueNm: 50, maxTorqueNm: 110, speedRpm: 100, weightKg: 1.2, gearRatio: '50:1', gearRatioValue: 50,
      integrationLevel: 'fully_integrated', inHouse: true, sourceUrl: 'https://www.tesla.com/AI', confidence: 'B',
    });
    // 로봇별 속성은 robot_components 로 — 공유 부품 스펙에 넣지 않음
    expect(row.specifications).not.toHaveProperty('quantity');
    expect(row.specifications).not.toHaveProperty('usageLocation');
  });

  it('actuatorComponentName: 이름 없으면 "회사 타입 actuator"', () => {
    expect(actuatorComponentName({ name: null, type: 'cycloidal' }, 'Agility Robotics')).toBe('Agility Robotics cycloidal actuator');
    expect(actuatorComponentName({ name: null, type: 'unknown' }, 'Agility Robotics')).toBe('Agility Robotics actuator');
    expect(actuatorComponentName({ name: null, type: 'linear_screw' }, 'Tesla')).toBe('Tesla linear screw actuator');
    expect(actuatorComponentName({ name: '  X  ' }, 'Tesla')).toBe('X');
    // 외부 벤더 액추에이터는 vendor 유지, inHouse 미지정이면 vendor 유무로 판단
    const ext = actuatorToComponentRow({ name: 'AK10-9', vendor: 'T-Motor', inHouse: false, type: 'qdd' }, robot(), 'Unitree Robotics');
    expect(ext.vendor).toBe('T-Motor');
    expect(ext.specifications.inHouse).toBe(false);
    expect(ext.specifications.integrationLevel).toBe('motor_gear_driver');
  });

  const product: SupplierProductInput = {
    vendor: 'CubeMars (T-Motor)', vendorCountry: 'CN', model: 'AK10-9 V3.0 KV60', series: 'AK', type: 'qdd',
    peakTorqueNm: 53, continuousTorqueNm: 18, ratedSpeedRpm: 206, maxSpeedRpm: 297, weightKg: 0.94, diameterMm: 100, lengthMm: 45,
    gearRatio: 9, voltageV: 48, ratedPowerW: 450, integrationLevel: 'motor_gear_driver', builtInSensors: ['encoder', 'temperature'],
    backdrivable: true, communication: 'CAN', priceUsd: 698.9, releaseDate: '2024-01 (V3.0)', targetMarket: 'Humanoids', status: 'available',
    sources: [{ url: 'https://store.tmotor.com/', confidence: 'A' }], conflicts: [],
    priceCny: 4999, noLoadSpeedRpm: 330, ratedTorqueNm: 18, peakForceN: null,
  };

  it('supplierComponentName: 표준 벤더명 + 모델, 모델에 벤더가 이미 있으면 그대로', () => {
    expect(supplierComponentName(product, 'T-Motor')).toBe('T-Motor AK10-9 V3.0 KV60');
    expect(supplierComponentName({ vendor: 'RobStride Dynamics', model: 'RobStride 04 (RS-04)' })).toBe('RobStride 04 (RS-04)');
    expect(supplierComponentName({ vendor: 'Tesla', model: 'Optimus rotary actuator' })).toBe('Tesla Optimus rotary actuator');
  });

  it('supplierToComponentRow / DynamicSpecs / ProductPatch', () => {
    const c = supplierToComponentRow(product, 'T-Motor');
    expect(c.vendor).toBe('T-Motor');
    expect(c.specifications).toMatchObject({
      actuatorType: 'qdd', inHouse: false, ratedTorqueNm: 18, maxTorqueNm: 53, speedRpm: 297, ratedSpeedRpm: 206, weightKg: 0.94,
      diameterMm: 100, lengthMm: 45, voltageV: 48, ratedPowerW: 450, gearRatio: '9:1', gearRatioValue: 9, integrationLevel: 'motor_gear_driver',
      builtInSensors: ['encoder', 'temperature'], backdrivable: true, communication: 'CAN', priceUsd: 698.9, vendorCountry: 'China',
      sourceUrl: 'https://store.tmotor.com/', confidence: 'A', releaseDate: '2024-01 (V3.0)',
      // 스키마 외 필드 보존
      priceCny: 4999, noLoadSpeedRpm: 330,
    });
    expect(c.specifications).not.toHaveProperty('peakForceN'); // null 은 제외
    expect(c.specifications).not.toHaveProperty('sources');

    const d = supplierToDynamicSpecs(product, 'T-Motor');
    expect(d.builtInSensors).toBe('encoder, temperature'); // 배열 → 문자열
    expect(d.torqueNm).toBe(53);
    expect(d.rpmMax).toBe(297);
    expect(d.peakTorqueNm).toBe(53);
    expect(d.continuousTorqueNm).toBe(18);
    expect(d).not.toHaveProperty('inHouse');

    expect(supplierToProductPatch(product)).toEqual({ series: 'AK', releaseDate: '2024-01-01', targetMarket: 'Humanoids', status: 'available' });
    expect(supplierToProductPatch({ vendor: 'x', model: 'y', releaseDate: 'unknown' })).toEqual({});
  });

  it('mergeSpecs: 기존 키 보존, 비-null 신규만 덮어씀, 변경 여부', () => {
    const existing = { actuatorType: 'direct_drive', ratedTorqueNm: 50, maxTorqueNm: 100, custom: 'keep' };
    const r1 = mergeSpecs(existing, { actuatorType: 'direct_drive', ratedTorqueNm: 50, maxTorqueNm: 100, weightKg: null });
    expect(r1.changed).toBe(false);
    expect(r1.merged).toEqual(existing);
    const r2 = mergeSpecs(existing, { maxTorqueNm: 110, weightKg: 1.2 });
    expect(r2.changed).toBe(true);
    expect(r2.merged).toEqual({ actuatorType: 'direct_drive', ratedTorqueNm: 50, maxTorqueNm: 110, custom: 'keep', weightKg: 1.2 });
    expect(mergeSpecs(null, { a: 1 }).merged).toEqual({ a: 1 });
    expect(deepEqual({ a: [1, '2'], b: { c: 3 } }, { b: { c: '3' }, a: [1, 2] })).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it('fillMissingSpecs: 기존 값은 유지, 비어있는 키만 채움', () => {
    const r = fillMissingSpecs({ maxTorqueNm: 360, weightKg: null, confidence: 'B' }, { maxTorqueNm: 120, weightKg: 1.4, speedRpm: 50, notes: null });
    expect(r.changed).toBe(true);
    expect(r.merged).toEqual({ maxTorqueNm: 360, weightKg: 1.4, speedRpm: 50, confidence: 'B' });
    expect(fillMissingSpecs({ a: 1 }, { a: 2 }).changed).toBe(false);
  });

  it('decideComponentWrite: 공유 부품은 처음 쓰는 기록(≥ 저장 신뢰도) 또는 엄격히 높은 신뢰도만 병합, 나머지는 보충', () => {
    expect(decideComponentWrite(undefined, undefined, 'D')).toBe('merge'); // 시드 부품(신뢰도 없음) → 병합
    expect(decideComponentWrite('B', undefined, 'B')).toBe('merge'); // 재실행 첫 기록, 같은 신뢰도 → 병합(동일 값이면 변경 0)
    expect(decideComponentWrite('A', undefined, 'B')).toBe('fill'); // 저장된 값이 더 신뢰도 높음 → 보충만
    expect(decideComponentWrite('B', 4, 'B')).toBe('fill'); // 같은 실행에서 이미 B 로 기록 → 보충만 (flip-flop 방지)
    expect(decideComponentWrite('B', 4, 'A')).toBe('merge'); // 엄격히 높음 → 병합
    expect(decideComponentWrite('B', 5, 'B')).toBe('fill');

    // 시뮬레이션: 두 로봇이 같은 부품명을 다른 값으로 쓸 때, 두 번 실행해도 상태가 같다
    const run = (state: Record<string, unknown> | null) => {
      const writers = [
        { conf: 'B', specs: { maxTorqueNm: 360, confidence: 'B', notes: 'H1' } },
        { conf: 'B', specs: { maxTorqueNm: 120, weightKg: 1.1, confidence: 'B', notes: 'H1-2' } },
      ];
      let cur = state;
      let runBest: number | undefined;
      let changes = 0;
      for (const w of writers) {
        const mode = decideComponentWrite(cur?.confidence as string | undefined, runBest, w.conf);
        runBest = Math.max(runBest ?? 0, confidenceRank(w.conf));
        const r = mode === 'merge' ? mergeSpecs(cur, w.specs) : fillMissingSpecs(cur, w.specs);
        if (r.changed) changes++;
        cur = r.merged;
      }
      return { state: cur, changes };
    };
    const first = run(null);
    expect(first.changes).toBe(2);
    expect(first.state).toEqual({ maxTorqueNm: 360, weightKg: 1.1, confidence: 'B', notes: 'H1' });
    const second = run(first.state);
    expect(second.changes).toBe(0);
    expect(second.state).toEqual(first.state);
  });

  it('missingNewRobotFields: 신규 로봇 생성에 필요한 메타', () => {
    expect(missingNewRobotFields(robot())).toEqual([]);
    expect(missingNewRobotFields(robot({ announcementYear: null, region: null }))).toEqual(['announcementYear', 'region']);
  });
});

// ============================================================
describe('CI 값 생성', () => {
  it('formatPrice', () => {
    expect(formatPrice({ min: 20000, max: 30000, currency: 'USD', note: '목표' })).toBe('$20K-$30K (목표)');
    expect(formatPrice({ min: 16000, max: 16000, currency: 'USD' })).toBe('$16K');
    expect(formatPrice({ min: 150000, max: null, currency: 'USD' })).toBe('$150K+');
    expect(formatPrice({ min: null, max: 2500000, currency: 'USD' })).toBe('~$2.5M');
    expect(formatPrice({ min: 99000, max: null, currency: 'CNY' })).toBe('¥99K+');
    expect(formatPrice({ min: null, max: null, note: '비공개' })).toBe('비공개');
    expect(formatPrice({ min: null, max: null })).toBeNull();
    expect(formatPrice(null)).toBeNull();
  });

  it('buildCiValuesForRobot: 액추에이터/손/가격 항목', () => {
    const r = robot({
      hand: { fingerCount: 5, handDofPerHand: 11, tactile: true },
      price: { min: 20000, max: 30000, currency: 'USD', note: '목표' },
      actuators: [
        { name: 'Tesla Rotary Actuator', vendor: 'Tesla', inHouse: true, type: 'harmonic', usageLocation: 'leg', quantity: 6, peakTorqueNm: 110, ratedTorqueNm: 50, gearRatio: 50 },
        { name: 'Tesla Linear Actuator', vendor: 'Tesla', inHouse: true, type: 'linear_screw', usageLocation: 'leg', quantity: 8 },
        { name: 'Tesla Hand Actuator', vendor: 'Tesla', inHouse: true, type: 'tendon', usageLocation: 'hand', quantity: 12 },
      ],
    });
    const vals = buildCiValuesForRobot(r, 'Tesla');
    const byName = Object.fromEntries(vals.map((v) => [v.itemName, v]));
    expect(byName['구동 방식']!.value).toBe('하모닉 감속기 + 리니어(스크류) + 텐던(케이블) 구동 (자체 설계)');
    expect(byName['관절 토크']!.value).toBe('최대 110 Nm / 정격 50 Nm (다리) — Tesla Rotary Actuator');
    expect(byName['감속기 타입']!.value).toBe('하모닉 감속기 (감속비 50:1) + 리니어(스크류)');
    expect(byName['자체 생산 여부']!.value).toBe('자체 개발/생산');
    expect(byName['액추에이터 공급사']!.value).toBe('자체 (Tesla)');
    expect(byName['액추에이터 수량']!.value).toBe('총 26개 (다리 14, 손 12)');
    expect(byName['손 자유도']!.value).toBe('11 DOF/손 (5지, 촉각 센서)');
    expect(byName['가격대']!.value).toBe('$20K-$30K (목표)');
    // 신뢰도/출처는 필드별 출처에서
    expect(byName['구동 방식']!.confidence).toBe('B');
    expect(byName['구동 방식']!.sourceUrl).toBe('https://www.tesla.com/AI');
    expect(byName['구동 방식']!.sourceDate).toBe('2023-12-13');
    expect(byName['가격대']!.confidence).toBe('C');
    expect(byName['가격대']!.source).toBe('Blog');
    for (const item of CI_ACTUATOR_ITEMS) expect(byName[item]).toBeDefined();
  });

  it('buildCiValuesForRobot: 외부 공급사 혼합, 근거 없는 항목은 생성 안 함', () => {
    const r = robot({
      hand: null, price: null,
      actuators: [
        { name: 'A', vendor: 'T-Motor', inHouse: false, type: 'qdd', peakTorqueNm: 48 },
        { name: 'B', vendor: 'Harmonic Drive', inHouse: false, type: 'harmonic' },
        { name: 'C', vendor: null, inHouse: true, type: 'direct_drive' },
      ],
    });
    const byName = Object.fromEntries(buildCiValuesForRobot(r, 'Tesla').map((v) => [v.itemName, v.value]));
    expect(byName['자체 생산 여부']).toBe('일부 자체 + 외주 (T-Motor, Harmonic Drive)');
    expect(byName['액추에이터 공급사']).toBe('T-Motor, Harmonic Drive');
    expect(byName['구동 방식']).toBe('QDD(준직접구동) + 하모닉 감속기 + 직접구동(DD)'); // 혼합이면 '(자체 설계)' 없음
    expect(byName['관절 토크']).toBe('최대 48 Nm — A');
    expect(byName['액추에이터 수량']).toBeUndefined();
    expect(byName['손 자유도']).toBeUndefined();
    expect(byName['가격대']).toBeUndefined();

    expect(buildCiValuesForRobot(robot({ actuators: [], hand: null, price: null }), 'Tesla')).toEqual([]);
    // 타입 미공개 + 수치 없음 → 구동 방식/토크 없음, 감속기 없음, 자체 여부만
    const only = buildCiValuesForRobot(robot({ actuators: [{ inHouse: true, type: 'unknown' }], hand: null, price: null }), 'Tesla');
    expect(only.map((v) => v.itemName).sort()).toEqual(['액추에이터 공급사', '자체 생산 여부']);
    // 직접구동만 → 감속기 '없음'
    const dd = buildCiValuesForRobot(robot({ actuators: [{ inHouse: true, type: 'direct_drive' }], hand: null, price: null }), 'Tesla');
    expect(dd.find((v) => v.itemName === '감속기 타입')?.value).toBe('없음 (직접구동)');
  });
});

// ============================================================
describe('입력 검증 / CLI / 카운터', () => {
  it('validateRobotsFile / validateSuppliersFile', () => {
    expect(validateRobotsFile({ robots: [{ name: 'X', company: 'Y' }] })).toEqual([]);
    expect(validateRobotsFile({ robots: [{ name: 'X' }] })).toEqual(['robots[0] (X): company 누락']);
    expect(validateRobotsFile({})).toEqual(['robots.json: "robots" 배열이 없습니다']);
    expect(validateRobotsFile(null)).toHaveLength(1);
    expect(validateRobotsFile({ robots: [{ name: 'X', company: 'Y', actuators: 'nope' }] })).toHaveLength(1);
    expect(validateSuppliersFile({ products: [{ vendor: 'V', model: 'M' }] })).toEqual([]);
    expect(validateSuppliersFile({ products: [{ vendor: 'V' }] })).toEqual(['products[0] (V): model 누락']);
    expect(validateSuppliersFile({ nope: [] })).toHaveLength(1);
  });

  it('샘플 픽스처는 스키마 검증을 통과한다', () => {
    const robotsSample = JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, 'robots.sample.json'), 'utf-8'));
    const suppliersSample = JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, 'suppliers.sample.json'), 'utf-8'));
    expect(validateRobotsFile(robotsSample)).toEqual([]);
    expect(validateSuppliersFile(suppliersSample)).toEqual([]);
    expect(robotsSample.robots.length).toBeGreaterThanOrEqual(2);
    expect(suppliersSample.products.length).toBeGreaterThanOrEqual(2);
    // 각 샘플 로봇은 CI 값을 하나 이상 만든다
    for (const r of robotsSample.robots as RobotInput[]) {
      expect(buildCiValuesForRobot(r, r.company).length).toBeGreaterThan(0);
    }
  });

  it('실제 조사 파일이 있으면 스키마 검증을 통과한다 (없으면 생략)', () => {
    const robotsPath = path.join(FIXTURE_DIR, 'robots.json');
    const suppliersPath = path.join(FIXTURE_DIR, 'suppliers.json');
    if (fs.existsSync(robotsPath)) expect(validateRobotsFile(JSON.parse(fs.readFileSync(robotsPath, 'utf-8')))).toEqual([]);
    if (fs.existsSync(suppliersPath)) expect(validateSuppliersFile(JSON.parse(fs.readFileSync(suppliersPath, 'utf-8')))).toEqual([]);
  });

  it('parseArgs', () => {
    expect(parseArgs([])).toMatchObject({ dryRun: false, dataDir: null, createRobotCompanies: false, help: false });
    expect([...parseArgs([]).only]).toEqual(['robots', 'suppliers', 'ci', 'sourcing', 'adoptions']);
    expect(parseArgs(['--dry-run']).dryRun).toBe(true);
    expect([...parseArgs(['--only', 'robots']).only]).toEqual(['robots']);
    expect([...parseArgs(['--only=suppliers,ci']).only]).toEqual(['suppliers', 'ci']);
    expect([...parseArgs(['--only', 'sourcing,adoptions']).only]).toEqual(['sourcing', 'adoptions']);
    expect(parseArgs(['--data-dir', '/tmp/x']).dataDir).toBe('/tmp/x');
    expect(parseArgs(['--data-dir=/tmp/y']).dataDir).toBe('/tmp/y');
    expect(parseArgs(['--create-companies']).createRobotCompanies).toBe(true);
    expect(parseArgs(['-h']).help).toBe(true);
    expect(() => parseArgs(['--only', 'nope'])).toThrow(/--only/);
    expect(() => parseArgs(['--bogus'])).toThrow(/알 수 없는 인자/);
    expect(() => parseArgs(['--data-dir'])).toThrow();
  });

  it('bump / formatCounters', () => {
    const c: Counters = {};
    bump(c, 'components', 'insert');
    bump(c, 'components', 'skip');
    bump(c, 'ci_values', 'update');
    expect(c).toEqual({ components: { insert: 1, update: 0, skip: 1 }, ci_values: { insert: 0, update: 1, skip: 0 } });
    const txt = formatCounters(c);
    expect(txt).toContain('ci_values');
    expect(txt).toContain('components');
    expect(txt).toMatch(/\(writes\)\s+2/);
    expect(formatCounters({})).toBe('(변경 없음)');
  });
});


// ============================================================
describe('Section / ALL_SECTIONS', () => {
  it('has the five sections and --only accepts the new ones', () => {
    expect(ALL_SECTIONS).toEqual(['robots', 'suppliers', 'ci', 'sourcing', 'adoptions']);
    expect(() => parseArgs(['--only', 'sourcing,adoptions'])).not.toThrow();
    expect(() => parseArgs(['--only', 'market'])).toThrow(/--only/);
  });
});

// ============================================================
describe('validateSourcingFile', () => {
  const ok = (over: Record<string, unknown> = {}) => ({
    name: 'Atlas (Electric)', company: 'Boston Dynamics', sourcing: 'mixed', sellsExternally: false, evidenceGrade: 'A',
    evidence: [{ claim: 'c', source: 's', url: 'https://x.test/a', grade: 'A', date: '2026-01' }],
    externalVendors: [{ vendor: 'Hyundai Mobis', role: 'mass-production supply', grade: 'A', url: 'https://x.test/b', level: 'module' }],
    noteKo: ' note ',
    ...over,
  });

  it('accepts a valid element and normalizes it', () => {
    const v = validateSourcingFile({ generatedAt: 'g', robots: [ok()] });
    expect(v.errors).toEqual([]);
    expect(v.warnings).toEqual([]);
    expect(v.file!.generatedAt).toBe('g');
    expect(v.file!.robots[0]).toMatchObject({ name: 'Atlas (Electric)', sourcing: 'mixed', sellsExternally: false, noteKo: 'note' });
    expect(v.file!.robots[0]!.externalVendors[0]).toEqual({ vendor: 'Hyundai Mobis', role: 'mass-production supply', grade: 'A', url: 'https://x.test/b', level: 'module' });
  });

  it('level defaults to module and only component is kept as component', () => {
    const v = sanitizeSourcingVendors([{ vendor: 'a' }, { vendor: 'b', level: 'component' }, { vendor: 'c', level: 'weird' }, { role: 'x' }, 'str']);
    expect(v.map((x) => [x.vendor, x.level])).toEqual([['a', 'module'], ['b', 'component'], ['c', 'module']]);
  });

  it('sellsExternally accepts boolean/null/undefined', () => {
    for (const s of [true, false, null, undefined]) {
      const v = validateSourcingFile({ robots: [ok({ sellsExternally: s })] });
      expect(v.warnings).toEqual([]);
      expect(v.file!.robots[0]!.sellsExternally).toBe(s ?? null);
    }
  });

  it('skips violating elements with a warning (other elements survive)', () => {
    const v = validateSourcingFile({
      robots: [
        ok(),
        ok({ name: '' }),
        ok({ company: undefined }),
        ok({ sourcing: 'maybe' }),
        ok({ sellsExternally: 'yes' }),
        ok({ evidence: 'x' }),
        ok({ externalVendors: {} }),
        'nope',
      ],
    });
    expect(v.errors).toEqual([]);
    expect(v.file!.robots).toHaveLength(1);
    expect(v.warnings).toHaveLength(7);
    expect(v.warnings.some((w) => w.includes('sourcing 값'))).toBe(true);
  });

  it('only a broken structure is fatal', () => {
    expect(validateSourcingFile(null).errors).toHaveLength(1);
    expect(validateSourcingFile([]).errors).toHaveLength(1);
    expect(validateSourcingFile({}).errors[0]).toContain('"robots" 배열');
    expect(validateSourcingFile({ robots: [] }).errors).toEqual([]);
  });

  it('evidence keeps only string fields, drops claimless items and caps at 20', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ claim: `c${i}`, source: 's', url: 'u', grade: 'B', date: 'd', extra: 1 }));
    const ev = sanitizeSourcingEvidence([...many, { source: 'no claim' }, 3]);
    expect(ev).toHaveLength(20);
    expect(Object.keys(ev[0]!).sort()).toEqual(['claim', 'date', 'grade', 'source', 'url']);
    expect(sanitizeSourcingEvidence([{ claim: 'x', source: 5, url: null, grade: {}, date: undefined }])).toEqual([
      { claim: 'x', source: null, url: null, grade: null, date: null },
    ]);
  });

  it('accepts the bundled sourcing-regrade.json with no warnings', () => {
    const f = path.join(FIXTURE_DIR, 'sourcing-regrade.json');
    if (!fs.existsSync(f)) return;
    const v = validateSourcingFile(JSON.parse(fs.readFileSync(f, 'utf-8')));
    expect(v.errors).toEqual([]);
    expect(v.warnings).toEqual([]);
    expect(v.file!.robots.length).toBe(46);
  });
});

// ============================================================
describe('validateAdoptionsFile', () => {
  const c = (over: Record<string, unknown> = {}) => ({
    robotName: 'K-Bot', company: 'K-Scale Labs', country: 'US', segment: 'research_platform', robotClass: 'humanoid',
    actuatorVendor: 'RobStride Dynamics', actuatorModel: null, usage: 'legs', evidenceGrade: 'C',
    sources: [{ source: 'AI Wiki', url: 'https://aiwiki.test/x', date: null }], noteKo: 'n', year: 2025, vendorInSuppliersJson: true,
    ...over,
  });

  it('maps source objects to {url,title,date} and tolerates string sources', () => {
    const v = validateAdoptionsFile({ cases: [c({ sources: ['https://a.test', { url: 'https://b.test', title: 'T', source: 'S', date: '2026' }, { source: 'no url' }, { url: 'https://c.test', source: 'Pub' }] })] });
    expect(v.warnings).toEqual([]);
    expect(v.file!.cases[0]!.sources).toEqual([
      { url: 'https://a.test', title: null, date: null },
      { url: 'https://b.test', title: 'T', date: '2026' },
      { url: 'https://c.test', title: 'Pub', date: null },
    ]);
    expect(sanitizeAdoptionSources('x')).toEqual([]);
  });

  it('segment enum includes humanoid_tier1; level defaults to module', () => {
    const v = validateAdoptionsFile({ cases: [c({ segment: 'humanoid_tier1' }), c({ robotName: 'B', level: 'component' }), c({ robotName: 'C', level: null })] });
    expect(v.file!.cases.map((x) => [x.segment, x.level])).toEqual([['humanoid_tier1', 'module'], ['research_platform', 'component'], ['research_platform', 'module']]);
  });

  it('skips violating cases with a warning', () => {
    const v = validateAdoptionsFile({
      cases: [c(), c({ robotName: '' }), c({ company: 1 }), c({ actuatorVendor: ' ' }), c({ segment: 'toy' }), c({ level: 'sub' }), c({ sources: 'x' }), null],
    });
    expect(v.errors).toEqual([]);
    expect(v.file!.cases).toHaveLength(1);
    expect(v.warnings).toHaveLength(7);
  });

  it('validates vendorTargetMarkets elements and optional segments', () => {
    const v = validateAdoptionsFile({
      cases: [],
      vendorTargetMarkets: [
        { vendor: 'A', targetMarketsKo: ['x'], segments: ['captive'], grade: 'B', url: 'https://a.test' },
        { vendor: 'B', targetMarketsKo: [] },
        { vendor: '', targetMarketsKo: [] },
        { vendor: 'C' },
        { vendor: 'D', targetMarketsKo: ['x'], segments: ['moon'] },
      ],
    });
    expect(v.file!.vendorTargetMarkets.map((x) => [x.vendor, x.segments])).toEqual([['A', ['captive']], ['B', null]]);
    expect(v.warnings).toHaveLength(3);
  });

  it('only structure problems are fatal', () => {
    expect(validateAdoptionsFile(undefined).errors).toHaveLength(1);
    expect(validateAdoptionsFile({}).errors[0]).toContain('"cases" 배열');
    expect(validateAdoptionsFile({ cases: [], vendorTargetMarkets: 'x' }).errors).toHaveLength(1);
    expect(validateAdoptionsFile({ cases: [] }).file!.vendorTargetMarkets).toEqual([]);
  });

  it('accepts the bundled demand-cases.json with no warnings', () => {
    const f = path.join(FIXTURE_DIR, 'demand-cases.json');
    if (!fs.existsSync(f)) return;
    const v = validateAdoptionsFile(JSON.parse(fs.readFileSync(f, 'utf-8')));
    expect(v.errors).toEqual([]);
    expect(v.warnings).toEqual([]);
    expect(v.file!.cases.length).toBe(30);
    expect(v.file!.cases.filter((x) => x.level === 'component').length).toBe(8);
    expect(v.file!.cases.filter((x) => x.segment === 'humanoid_tier1').length).toBe(3);
  });
});

// ============================================================
describe('vendorKey / sameVendor / modelMatches / adoptionCaseKey', () => {
  it('normalizes vendor aliases to one key', () => {
    expect(vendorKey('CubeMars (T-Motor)')).toBe(vendorKey('CubeMars'));
    expect(vendorKey('CubeMars')).toBe(vendorKey('T-Motor'));
    expect(vendorKey('RobStride Dynamics')).toBe(vendorKey('RobStride'));
    expect(vendorKey('Unitree')).toBe(vendorKey('Unitree Robotics'));
    expect(vendorKey('MyActuator (ex-Gyems)')).toBe(vendorKey('Gyems'));
    expect(vendorKey('Maxon Motor')).toBe(vendorKey('maxon'));
    expect(vendorKey('AgiBot (PowerFlow)')).toBe(vendorKey('AgiBot (Zhiyuan Robotics)'));
    expect(vendorKey(null)).toBe('');
    expect(vendorKey('x'.repeat(500)).length).toBeLessThanOrEqual(200);
  });

  it('sameVendor: equal keys or containment of a 5+ char key', () => {
    expect(sameVendor('Mobis', 'Hyundai Mobis')).toBe(true);
    expect(sameVendor('Hyundai Mobis', 'Mobis')).toBe(true);
    expect(sameVendor('Tuopu Group', 'Tuopu Group / Sanhua Intelligent Controls')).toBe(true);
    expect(sameVendor('Unitree', 'Unitree Robotics')).toBe(true);
    expect(sameVendor('maxon', 'Mobis')).toBe(false);
    expect(sameVendor('Harmonic Drive', 'Nabtesco')).toBe(false);
    expect(sameVendor('Tesla', 'Tuopu Group')).toBe(false);
    expect(sameVendor('abc', 'abcdef')).toBe(false); // 짧은 쪽 키가 5자 미만이면 포함 비교 안 함
    expect(sameVendor('', 'Mobis')).toBe(false);
    expect(sameVendor(null, undefined)).toBe(false);
  });

  it('modelMatches: containment after normalization, min 3 chars', () => {
    expect(modelMatches('RS-04', 'RobStride 04 (RS-04)')).toBe(true);
    expect(modelMatches('AK80-9', 'AK80-9 V3.0 KV100')).toBe(true);
    expect(modelMatches('AK80-9', 'AK80-64 KV80')).toBe(false);
    expect(modelMatches('X6', 'RMD-X6-40')).toBe(false); // 3자 미만
    expect(modelMatches(null, 'RS-04')).toBe(false);
    expect(modelMatches('RS-04', null)).toBe(false);
  });

  it('adoptionCaseKey is pure and stable under formatting noise, distinct per vendor/model/robot', () => {
    const base = { company: 'Agibot (智元)', robotName: 'Genie G1', actuatorVendor: 'RobStride Dynamics', actuatorModel: 'RS-04' };
    const k = adoptionCaseKey(base);
    expect(adoptionCaseKey({ ...base })).toBe(k);
    expect(adoptionCaseKey({ ...base, company: 'AGIBOT', actuatorVendor: 'RobStride' })).toBe(k);
    expect(adoptionCaseKey({ ...base, robotName: 'genie-g1' })).toBe(k);
    expect(adoptionCaseKey({ ...base, actuatorModel: 'RS-05' })).not.toBe(k);
    expect(adoptionCaseKey({ ...base, actuatorVendor: 'Unitree' })).not.toBe(k);
    expect(adoptionCaseKey({ ...base, actuatorModel: undefined })).toMatch(/\|$/);
    expect(k.split('|')).toHaveLength(4);
    expect(adoptionCaseKey({ ...base, robotName: 'x'.repeat(600) }).length).toBeLessThanOrEqual(400);
  });

  it('bundled demand cases produce unique case keys', () => {
    const f = path.join(FIXTURE_DIR, 'demand-cases.json');
    if (!fs.existsSync(f)) return;
    const cases = validateAdoptionsFile(JSON.parse(fs.readFileSync(f, 'utf-8'))).file!.cases;
    expect(new Set(cases.map(adoptionCaseKey)).size).toBe(cases.length);
  });
});
