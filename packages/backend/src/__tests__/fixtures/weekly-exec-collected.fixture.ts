/**
 * 주간 브리프 v3(임원판) 테스트용 수집 결과(ExecCollected) 픽스처 — full / sparse / empty,
 * 그리고 플랜에서 유효한 AI 응답(A~D)을 만들어 주는 fakeExecAi.
 * 값은 모두 가상이다. 모델 식별자·비밀값 없음.
 */
import { FIXTURE_COMPANIES, REPORT_NOW, REPORT_WEEK, makeCollectedEmpty, makeCollectedFull, makeCollectedSparse } from './weekly-report-collected.fixture.js';
import type { ExecCollected } from '../../services/weekly-brief-collect.js';
import type { ExecAiInput, ExecPlan } from '../../services/weekly-brief-compose-exec.js';
import type { BenchTable, PositionSnapshot } from '../../services/weekly-brief-position.js';
import type { TrendSeriesInput } from '../../services/weekly-brief-trend.js';

export { REPORT_NOW, REPORT_WEEK };

const GEN = '2026-10-25T20:00:00.000Z';
const WEEK_ISO = '2026-10-21T03:00:00.000Z';

const robot = (o: Record<string, unknown>) =>
  ({
    id: 'r',
    name: 'R',
    company: 'Co',
    companyId: 'c',
    region: 'na',
    locomotion: 'bipedal',
    stage: null,
    year: 2026,
    forecast: false,
    isLG: false,
    height: null,
    weight: null,
    payload: null,
    dof: null,
    handDof: null,
    speed: null,
    incomplete: false,
    actuators: [],
    actuatorTypeLabel: '커스텀 전기',
    actuatorTypeNote: '',
    price: null,
    sources: [],
    sourcing: { posture: 'unknown', kind: 'unknown', sellsExternally: null, evidenceGrade: null, evidence: [], externalVendors: [], noteKo: null, basis: 'derived', componentSourcing: false },
    ...o,
  }) as never;

export function makeMapFixture(): NonNullable<PositionSnapshot['map']> {
  return {
    schemaVersion: 2,
    generatedAt: GEN,
    difficultyDefault: { L: 40, D: 25, H: 20, S: 15 },
    typeOrder: [],
    robots: [
      robot({ id: 'robot-atlas', name: 'Atlas A1', company: FIXTURE_COMPANIES.atlas.name, companyId: FIXTURE_COMPANIES.atlas.companyId, handDof: 22, dof: 40, payload: 25, price: { min: 90000, max: 110000, conf: 'C', src: 's' }, actuators: [{ name: 'J1', vendor: 'Delta Gear', inHouse: false, type: '커스텀 전기', torqueNm: 80, weightKg: 2, quantity: 1, usageLocation: null, source: 'components', confidence: 'B' }], sourcing: { posture: 'external', kind: 'module', sellsExternally: false, evidenceGrade: 'B', evidence: [], externalVendors: [{ vendor: 'Delta Gear', role: 'joint', grade: 'B', url: null, level: 'module' }], noteKo: null, basis: 'regrade', componentSourcing: false } }),
      robot({ id: 'robot-nova', name: 'Nova N2', company: FIXTURE_COMPANIES.nova.name, companyId: FIXTURE_COMPANIES.nova.companyId, handDof: 16, dof: 32, payload: 15, price: { min: 50000, max: 70000, conf: 'B', src: 's' } }),
      robot({ id: 'robot-cloid', name: 'CLOiD', company: 'LG Electronics', companyId: 'co-lg', isLG: true, handDof: 12, dof: 30, payload: 10, price: { min: 80000, max: 100000, conf: 'C', src: 's' } }),
    ],
    suppliers: [{ vendor: 'LG Electronics', model: 'AXIUM', type: 'x', peakTorqueNm: null, continuousTorqueNm: null, weightKg: null, isLG: true, priceUsd: null }],
    edges: [],
    adoptions: [{ actuatorVendor: 'Delta Gear' }, { actuatorVendor: 'Delta Gear' }],
    vendorMarkets: [{ vendor: 'Delta Gear' }],
    sourcingStats: { robots: 12, inHouse: 5, inHouseSells: 1, external: 4, externalMixed: 1, unknown: 2, unknownPresumed: 0, regraded: 8, derived: 4, componentSourcing: 1 },
    segmentOrder: [],
    stats: { robots: 3, complete: 3, incomplete: 0, suppliers: 1, edges: 0, adoptions: 2 },
  } as never;
}

const bench = (rows: BenchTable['competitors']): BenchTable => ({ axes: [{ key: 'dexterity', label: '손재주' }], competitors: rows });

export function makePositionFixture(): PositionSnapshot {
  return {
    map: makeMapFixture(),
    ciBenchmark: bench([
      { id: 'k1', slug: 'cloid', name: 'CLOiD', manufacturer: 'LG Electronics', scores: { dexterity: { score: 6, raw: null, updatedAt: '2026-09-01T00:00:00.000Z' } } },
      { id: 'k2', slug: 'optimus', name: 'Optimus', manufacturer: 'Tesla', scores: { dexterity: { score: 8, raw: null, updatedAt: WEEK_ISO } } },
    ]),
    handBenchmark: bench([{ id: 'h1', slug: 'shadow', name: 'Shadow Hand', manufacturer: 'Shadow Robot', scores: { gripForce: { score: 7, raw: '100 N', updatedAt: WEEK_ISO } } }]),
    failures: [],
  };
}

const series = (id: string, kind: TrendSeriesInput['kind'], domain: TrendSeriesInput['domain'], label: string, counts: number[], ref: TrendSeriesInput['ref']): TrendSeriesInput => ({ id, kind, domain, label, counts, bases: Array(8).fill(50) as number[], ref });

export function makeExecCollectedFull(): ExecCollected {
  const base = makeCollectedFull();
  base.ciChanges = [
    ...base.ciChanges.map((c) => (c.item === '손 자유도' ? { ...c, before: '16 DoF', after: '22 DoF' } : c)),
    { valueId: 'ci-7', company: 'Nova Dynamics', robot: 'N2', layer: 'Biz', item: '가격대', before: '$80,000', after: '$60,000', confidence: 'B', sourceName: '공식 발표', sourceUrl: 'https://example.com/nova-price', changedAt: '2026-10-22T05:00:00.000Z', valueChanged: true },
    { valueId: 'ci-8', company: 'Delta Gear', robot: null, layer: 'HW', item: '자체 생산 여부', before: '자체 생산', after: '외부 공급', confidence: 'B', sourceName: '공시', sourceUrl: 'https://example.com/delta', changedAt: '2026-10-23T05:00:00.000Z', valueChanged: true },
  ];
  base.ciUpdates = base.ciChanges.length;
  return {
    base,
    position: makePositionFixture(),
    specUpdatedRobotIds: ['robot-atlas'],
    trend: {
      weeks: [],
      series: [
        series('subtopic:hand:tactile_force', 'subtopic', 'hand', '촉각·힘 센싱', [5, 5, 5, 5, 9, 9, 9, 9], { topicDomain: 'hand', topicId: 'tactile_force' }),
        series('theme:mass_price', 'theme', 'production', '양산·가격 하락', [10, 10, 10, 10, 6, 6, 6, 6], { themeId: 'mass_price' }),
        series('keyword:kw-vla', 'keyword', null, 'VLA', [4, 4, 4, 4, 8, 8, 9, 9], { term: 'VLA' }),
        series('subtopic:actuator:flat', 'subtopic', 'actuator', '변화 없음', [5, 5, 5, 5, 5, 5, 5, 5], {}),
      ],
      procurement: { counts: [0, 0, 0, 1, 1, 2, 2, 2], total: 8 },
      warnings: [],
    },
    signalEvidence: {
      'subtopic:hand:tactile_force': [{ id: 'ev-s1', title: 'Tactile skin for dexterous hands', url: 'https://news.example.com/tactile', source: 'IEEE Spectrum', kind: 'article' }],
      'theme:mass_price': [{ id: 'ev-s2', title: 'Humanoid mass production ramp announced 1', url: 'https://news.example.com/mass', source: 'Reuters', kind: 'article' }],
      'keyword:kw-vla': [{ id: 'ev-s3', title: 'VLA policy rollout on a tabletop 1', url: 'https://www.youtube.com/watch?v=VXXXXXXXXXX', source: 'Embodied AI 0', kind: 'video' }],
    },
    prev: { gapValues: { 'gap:atlas-robotics:hand_dof': 18 }, snapshots: [{ asOf: '2026-10-18T00:00:00.000Z', robots: 12, inHouse: 6, inHouseSells: 1, external: 3, unknown: 3 }] },
    warnings: [],
  };
}

export function makeExecCollectedSparse(): ExecCollected {
  return {
    base: makeCollectedSparse(),
    position: { map: null, ciBenchmark: null, handBenchmark: null, failures: ['position', 'bench', 'hand_bench'] },
    specUpdatedRobotIds: [],
    trend: { weeks: [], series: [], procurement: null, warnings: [] },
    signalEvidence: {},
    prev: { gapValues: {}, snapshots: [] },
    warnings: ['position_failed', 'bench_failed', 'hand_bench_failed'],
  };
}

export function makeExecCollectedEmpty(): ExecCollected {
  return {
    base: makeCollectedEmpty(),
    position: { map: null, ciBenchmark: null, handBenchmark: null, failures: [] },
    specUpdatedRobotIds: [],
    trend: { weeks: [], series: [], procurement: null, warnings: [] },
    signalEvidence: {},
    prev: { gapValues: {}, snapshots: [] },
    warnings: [],
  };
}

/**
 * 플랜의 id 만 보고 유효한 AI 응답(A~D)을 만든다. 숫자는 쓰지 않으므로 숫자 가드를 통과한다.
 * 모든 문장은 합니다체이고 수집 건수 문구·방향 모순이 없다.
 */
export function fakeExecAi(plan: ExecPlan, opts: { skip?: Array<'A' | 'B' | 'C' | 'D'> } = {}): ExecAiInput {
  const skip = new Set(opts.skip ?? []);
  const A = {
    conclusions: plan.candidates.map((c) => ({
      candidateId: c.ref,
      headline: `${c.ruleHeadline}`.slice(0, 40),
      lines: [
        { role: 'change', text: '이번 주 경쟁사 쪽에서 눈에 띄는 변화가 확인되었습니다.' },
        { role: 'why', text: '우리 제품 전략과 직접 맞닿아 있어서 의미가 있습니다.' },
        { role: 'action', text: '관련 사양을 한 번 더 비교해 볼 만합니다.' },
        { role: 'detail', text: '세부 수치는 아래 차이 표에서 확인할 수 있습니다.' },
      ],
      actionKind: 'evaluate',
      refs: c.evidence.slice(0, 1).map((e) => e.ref),
    })),
    questions: plan.candidates.slice(0, 3).map((c, i) => ({
      text: `${['직접 평가를 시작해 볼까요?', '담당 부서와 접촉해 볼까요?', '다음 회의에서 결정해 볼까요?'][i]}`,
      kind: (['evaluate', 'contact', 'decide'] as const)[i],
      rationale: ['참고 자료에서 확인되는 변화가 있습니다.'],
      conclusionId: c.ref,
      refs: c.evidence.slice(0, 1).map((e) => e.ref),
    })),
  };
  const B = {
    summary: plan.gaps.rows.length > 0 ? ['경쟁사와의 차이는 일부 항목에서만 새로 확인되었습니다.'] : [],
    rows: plan.gaps.rows.map((g) => ({
      id: g.ref,
      lines:
        g.draft.status === 'compared'
          ? g.draft.position === 'competitor_ahead'
            ? ['경쟁사가 앞서 있는 축입니다.', '우리 쪽 보완 여부를 점검해 볼 만합니다.']
            : ['두 회사의 수준을 비교한 결과입니다.', '추가 변화가 있는지 지켜보겠습니다.']
          : ['경쟁사 수치는 확인되었습니다.', '우리 수치는 아직 미등록 상태입니다.'],
    })),
  };
  const C = {
    signals: plan.tech.signals.map((t) => ({ id: t.ref, lines: ['최근 4주와 이전 4주를 비교하면 방향이 보입니다.', '한 주의 변동이 아니라 여러 주에 걸친 흐름입니다.'] })),
    moves: plan.business.moves.map((b) => ({ id: b.ref, lines: ['사업 쪽 움직임이 참고 자료에서 확인됩니다.', '공급망 관점에서 지켜볼 만합니다.'] })),
  };
  const D = {
    papers: plan.papers.map((p, i) => ({ ref: p.ref, frontierScore: i < 4 ? 3 : 1, implication: '핵심 기법이 우리 설계 검토에 참고가 됩니다.' })),
    titles: plan.titles.map((t) => ({ id: t.ref, titleKo: `번역된 제목 ${t.ref}` })),
  };
  return {
    A: skip.has('A') ? null : A,
    B: skip.has('B') ? null : B,
    C: skip.has('C') ? null : C,
    D: skip.has('D') ? null : D,
    failed: Object.fromEntries([...skip].map((k) => [k, 'api_error'])),
    batchWarnings: [],
    truncated: [],
  };
}
