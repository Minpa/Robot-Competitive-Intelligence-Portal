/**
 * ARGOS_I 내보내기 빌더 테스트용 원자료 픽스처.
 *
 * 모든 값은 가상이다. 원문 전재 금지를 검증하려고 content / description / originalText / 초록(summary)에 센티넬 문자열을 넣고,
 * 악성 입력(<img onerror>, javascript:, http://, user:pass@ URL)과 개인 정보(이메일·담당자)도 섞어 둔다.
 * 센티넬과 개인 정보는 어떤 출력에도 나타나면 안 된다.
 */

import { weeklyBriefSample } from './weekly-brief.fixture.js';
import type { BuildCtx } from '../../services/argos-i-export-areas-types.js';
import type { RawArticle } from '../../services/argos-i-export-areas-content.js';

export const SENTINEL = 'SENTINEL_FULLTEXT_DO_NOT_EXPORT';
export const HOSTILE_TEXT = '<img src=x onerror=alert(1)>"bad | cell\nnext line\ttab';
export const EMAIL = 'alice.private@example.com';

export const CTX: BuildCtx = {
  bundleDate: '2026-10-29',
  asOf: '2026-10-28T22:00:05.123Z',
  generatedAt: '2026-10-28T22:00:20.456Z',
  reason: 'cron',
  commit: 'abc1234',
};

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const ids = { c1: U(1), c2: U(2), r1: U(11), r2: U(12), r3: U(13), comp1: U(21), comp2: U(22), comp3: U(23) };

const ts = (day: number, h = 1) => `2026-10-${String(day).padStart(2, '0')}T0${h}:23:45.123456`;

// ── 기사 계열 ──────────────────────────────────────────────────────────────

export function rawVideos(): RawArticle[] {
  return [
    {
      id: U(101), title: `Hand dexterity demo &amp; test ${HOSTILE_TEXT}`, url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      summary: null, source: 'youtube', productType: 'video', category: 'product', language: 'en', companyId: ids.c1, companyName: 'Acme Robotics',
      publishedAt: '2026-10-27T01:00:00.000Z', collectedAt: '2026-10-27T03:00:00.000Z',
      meta: {
        videoId: 'dQw4w9WgXcQ', channel: 'Acme Channel', thirdParty: false, thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg', views: 12000,
        domain: 'hand', topic: 'hand', topics: ['hand'], description: `${SENTINEL} dexterous hand finger grasp`,
        aiTags: { taskTypes: ['파지/조작'], techTags: ['VLA', '강화학습'], robots: ['Atlas'], method: 'haiku' },
        geminiAnalysis: {
          task: 'sorting', environment: 'warehouse', autonomy: 'autonomous', robotCount: 2, durationSec: 95, capabilities: ['grasp', 'place'],
          keyMoments: [{ timestampSec: 12, description: 'first grasp <b>bold</b>' }], summaryKo: `요약 ${HOSTILE_TEXT}`, analyzedAt: '2026-10-27T05:00:00.000Z',
        },
        domainFocus: { hand: { level: 'primary', source: 'gemini', reason: 'internal' } },
        handTopics: { topics: ['tactile'], primary: 'tactile', classifiedAt: '2026-10-27T05:00:00.000Z', version: 1 },
      },
    },
    {
      id: U(102), title: 'Actuator teardown', url: 'http://www.youtube.com/watch?v=9bZkp7q19f0', summary: null, source: 'youtube', productType: 'video',
      category: 'technology', language: 'en', companyId: null, companyName: null, publishedAt: '2026-10-20T01:00:00.000Z', collectedAt: '2026-10-20T03:00:00.000Z',
      meta: { videoId: '9bZkp7q19f0', channel: 'Motion', thumbnail: 'http://evil.example.com/x.jpg', views: 500, domain: 'actuator', description: SENTINEL, domainFocus: { actuator: { level: 'none', source: 'haiku' } } },
    },
    {
      id: U(103), title: 'Old video without metadata', url: 'javascript:alert(1)', summary: null, source: 'youtube', productType: 'video', category: 'other',
      language: 'ko', companyId: null, companyName: null, publishedAt: null, collectedAt: '2026-09-01T00:00:00.000Z', meta: {},
    },
  ];
}

export function rawPapers(): RawArticle[] {
  return [
    {
      id: U(201), title: 'Tactile sensing for dexterous hand manipulation', url: 'https://arxiv.org/abs/2610.01234v1',
      summary: `${SENTINEL} abstract about gripper and finger tactile`, source: 'arxiv', productType: 'none', category: 'technology', language: 'en',
      companyId: null, companyName: null, publishedAt: '2026-10-26T00:00:00.000Z', collectedAt: '2026-10-27T03:00:00.000Z',
      meta: { arxivId: '2610.01234v1', authors: ['A. One', 'B. Two', 'C. Three', 'D. Four'], aiSummaryKo: `한글 요약 ${HOSTILE_TEXT}`, domainFocus: { hand: { level: 'secondary', source: 'gemini' } } },
    },
    {
      id: U(202), title: 'Unsafe link paper', url: 'https://evil.example.com/abs/2610.99999', summary: SENTINEL, source: 'arxiv', productType: 'none', category: 'technology',
      language: 'en', companyId: null, companyName: null, publishedAt: '2026-10-10T00:00:00.000Z', collectedAt: '2026-10-11T03:00:00.000Z',
      meta: { authors: 'X. Y., Z. W.' },
    },
  ];
}

export function rawNews(): RawArticle[] {
  return [
    {
      id: U(301), title: 'Acme unveils robot at CES booth', url: 'https://news.example.com/a?x=1', summary: `Summary ${HOSTILE_TEXT} ${'가'.repeat(400)}`,
      source: 'TechNews', productType: 'robot', category: 'product', language: 'en', companyId: ids.c1, companyName: 'Acme Robotics',
      publishedAt: '2026-10-27T09:00:00.000Z', collectedAt: '2026-10-27T10:00:00.000Z',
      meta: { keyPoints: ['point one', `point <script>alert(1)</script> two`], marketInsights: ['insight'], mentionedCompanies: ['Acme'], mentionedRobots: ['Atlas'], technologies: ['actuator'] },
      robotIds: [ids.r2, ids.r1],
    },
    {
      id: U(302), title: 'Credentialed link', url: 'https://user:pass@news.example.com/b', summary: null, source: 'Blog', productType: 'none', category: 'other',
      language: 'ko', companyId: null, companyName: null, publishedAt: null, collectedAt: '2026-10-25T10:00:00.000Z', meta: {},
    },
  ];
}

export function rawExternal(): RawArticle[] {
  return [
    {
      id: U(401), title: 'Open-source actuator driver', url: 'https://github.com/example/driver', summary: SENTINEL, source: 'github', productType: 'none',
      category: 'technology', language: 'en', companyId: null, companyName: null, publishedAt: '2026-10-22T00:00:00.000Z', collectedAt: '2026-10-23T00:00:00.000Z', meta: {},
    },
  ];
}

// ── 테이블 행 ─────────────────────────────────────────────────────────────

export function rawByArea(): Record<string, any> {
  const company = (id: string, name: string) => ({
    id, name, logo_url: 'https://logo.example.com/x.png', country: 'US', city: 'Austin', founding_year: 2015, category: 'humanoid', main_business: 'robots',
    homepage_url: 'https://acme.example.com', description: `Curated ${HOSTILE_TEXT}`, valuation_usd: 1500000000.5, created_at: ts(1), updated_at: ts(2),
  });
  const robots = [
    { id: ids.r1, company_id: ids.c1, company_name: 'Acme Robotics', company_country: 'US', name: 'Atlas-X', announcement_year: 2026, announcement_quarter: 2, status: 'poc', purpose: 'industrial', locomotion_type: 'bipedal', hand_type: 'multi_finger', commercialization_stage: 'poc', region: 'north_america', image_url: 'https://img.example.com/a.png', description: SENTINEL, data_type: 'confirmed', forecast_rationale: null, forecast_sources: null, forecast_confidence: null, created_at: ts(1), updated_at: ts(3) },
    { id: ids.r2, company_id: ids.c2, company_name: 'Beta Labs', company_country: 'KR', name: 'Beta-1', announcement_year: 2027, announcement_quarter: null, status: 'development', purpose: 'home', locomotion_type: 'wheeled', hand_type: 'gripper', commercialization_stage: 'concept', region: 'korea', image_url: null, description: SENTINEL, data_type: 'forecast', forecast_rationale: `Because ${HOSTILE_TEXT}`, forecast_sources: 'CES booth; supply chain signal ;', forecast_confidence: 'low', created_at: ts(1), updated_at: ts(3) },
  ];
  const links = [
    { robot_id: ids.r1, component_id: ids.comp1, usage_location: 'arm', quantity: 2, type: 'actuator', name: 'Joint-A', vendor: 'ActuCo' },
    { robot_id: ids.r1, component_id: ids.comp2, usage_location: 'torso', quantity: 1, type: 'soc', name: 'Brain-1', vendor: 'ChipCo' },
  ];
  const components = [
    { id: ids.comp1, type: 'actuator', name: 'Joint-A', vendor: 'ActuCo', specifications: { ratedTorqueNm: 80, maxTorqueNm: 120, weightKg: 1.5, speedRpm: 60, actuatorType: 'harmonic', note: HOSTILE_TEXT, description: SENTINEL }, created_at: ts(1), updated_at: ts(2) },
    { id: ids.comp2, type: 'soc', name: 'Brain-1', vendor: 'ChipCo', specifications: { topsMin: 100, topsMax: 200, tdpWatts: '15-60W', location: 'onboard', processNode: '5nm' }, created_at: ts(1), updated_at: ts(2) },
    { id: ids.comp3, type: 'sensor', name: 'Cam-1', vendor: null, specifications: null, created_at: ts(1), updated_at: ts(2) },
  ];
  const mapRobot = (id: string, name: string, forecast: boolean) => ({
    id, name, company: 'Acme Robotics', companyId: ids.c1, region: 'na', locomotion: 'bipedal', stage: 'poc', year: 2026, forecast, isLG: false,
    height: 175, weight: 70, payload: 20, dof: 40, handDof: 12, speed: 1.5, incomplete: false,
    actuators: [{ name: 'Joint-A', vendor: 'ActuCo', inHouse: false, type: '하모닉(스트레인웨이브)', torqueNm: 80, weightKg: 1.5, quantity: 2, usageLocation: 'arm', source: 'components', confidence: 'B' }],
    actuatorTypeLabel: '하모닉(스트레인웨이브)', actuatorTypeNote: `note ${HOSTILE_TEXT}`, price: { min: 90000, max: 120000, conf: 'C', src: 'CI 가격대' },
    sources: ['https://src.example.com/a', 'http://insecure.example.com/b', 'javascript:alert(1)'],
    sourcing: {
      posture: 'external', kind: 'external', sellsExternally: false, evidenceGrade: 'B',
      evidence: [{ claim: `claim ${HOSTILE_TEXT}`, source: 'Press', url: 'https://press.example.com/x', grade: 'B', date: '2026-09-01' }, { claim: 'bad link', source: null, url: 'http://bad.example.com', grade: 'D', date: null }],
      externalVendors: [{ vendor: 'ActuCo', role: 'joint', grade: 'B', url: 'https://actuco.example.com', level: 'module' }],
      noteKo: '비고', basis: 'regrade', componentSourcing: false,
    },
  });
  const actuatorMap = {
    schemaVersion: 2, difficultyDefault: { L: 40, D: 25, H: 20, S: 15 }, typeOrder: ['하모닉(스트레인웨이브)', '미확인'],
    robots: [mapRobot(ids.r1, 'Atlas-X', false), mapRobot(ids.r2, 'Beta-1', true)],
    suppliers: [{ vendor: 'ActuCo', country: 'KR', model: 'AC-100', type: '하모닉', peakTorqueNm: 100, continuousTorqueNm: 60, weightKg: 1.2, diameterMm: 90, priceUsd: 800, status: 'available', targetMarket: 'robots', source: 'products', diameterRangeMm: { min: 40, max: 120 }, integrationLevel: 'module', isLG: false, segment: 'tier1_oem', segments: ['tier1_oem'], segmentBasis: 'adoptions', adoptionIds: ['b', 'a'] }],
    edges: [{ robotId: ids.r1, robotName: 'Atlas-X', company: 'Acme Robotics', vendor: 'ActuCo', inHouse: false, type: '하모닉(스트레인웨이브)', quantity: 2, confidence: 'B', basis: 'external', posture: 'external', role: 'joint', level: 'module' }],
    adoptions: [{ id: 'a', robotName: 'Quad', company: 'Quad Inc', country: 'US', segment: 'quadruped', marketSegment: 'tier2_legged', level: 'module', robotClass: 'quadruped', actuatorVendor: 'ActuCo', vendorKey: 'actuco', actuatorModel: 'AC-100', usage: 'leg', evidenceGrade: 'B', sources: [{ url: 'https://s.example.com', title: 'src' }, { url: 'http://x.example.com', title: 'bad' }], noteKo: null, year: 2025 }],
    vendorMarkets: [{ vendor: 'ActuCo', vendorKey: 'actuco', targetMarketsKo: ['로봇'], segments: ['tier1_oem'], grade: 'B', url: 'https://actuco.example.com' }],
    sourcingStats: { robots: 1, inHouse: 0, inHouseSells: 0, external: 1, externalMixed: 0, unknown: 0, unknownPresumed: 0, regraded: 1, derived: 0, componentSourcing: 0 },
    segmentOrder: ['tier1_oem', 'other'], stats: { robots: 2, complete: 2, incomplete: 0, suppliers: 1, edges: 1, adoptions: 1 },
  };
  const benchAxes = [
    { id: U(31), key: 'physical', icon: null, label: '신체 능력', description: 'DOF', perfect_def: 'Atlas급', unit: 'DoF', sort_order: 1, created_at: ts(1) },
    { id: U(32), key: 'perception', icon: null, label: '인지', description: null, perfect_def: null, unit: null, sort_order: 2, created_at: ts(1) },
  ];
  const benchCompetitors = [
    { id: U(41), slug: 'atlas', name: 'Atlas', manufacturer: 'BD', country: 'US', stage: 'poc', category: 'dexterous', image_url: 'https://x', sort_order: 1, is_active: true },
    { id: U(42), slug: 'old', name: 'Old', manufacturer: 'X', country: 'US', stage: 'poc', category: 'dexterous', sort_order: 2, is_active: false },
  ];
  const benchScores = [
    { id: U(51), competitor_id: U(41), axis_key: 'physical', current_score: 8, target_score: 9, raw_value: '24 DoF', rationale: `why ${HOSTILE_TEXT}` },
    { id: U(52), competitor_id: U(41), axis_key: 'perception', current_score: 6, target_score: 8, raw_value: null, rationale: null },
  ];
  const evt = (n: number) => `event-trend-wrc-${n}`;
  return {
    overview: {
      articleCounts: [{ source: 'youtube', product_type: 'video', n: 3, last_collected_at: '2026-10-27T03:00:00.000Z' }, { source: 'arxiv', product_type: 'none', n: 2, last_collected_at: '2026-10-27T03:00:00.000Z' }],
      companyFreshness: [{ id: ids.c1, name: 'Acme Robotics', article_count: 2, last_collected_at: '2026-10-27T10:00:00.000Z' }],
      markers: {
        pipeline: { status: 'ok', reason: 'cron', startedAt: '2026-10-28T20:30:00.000Z', finishedAt: '2026-10-28T20:50:00.000Z', durationMs: 1200000, domains: [{ domain: 'hand', analysis: {}, classify: {}, error: HOSTILE_TEXT }] },
        weeklyBrief: { weekStart: '2026-10-19', outcome: 'created', status: 'ok', finishedAt: '2026-10-25T23:01:00.000Z', error: SENTINEL },
      },
      insightCaches: [{ viewName: 'tech-trend-report:v2:hand:30', cachedAt: '2026-10-28T20:40:00.000Z' }],
      ciLastVerifiedAt: '2026-10-28T01:00:00.000Z',
      areas: [{ id: 'videos', titleKo: '영상', priority: 'P0', status: 'ok', recordCount: 3 }, { id: 'keywords', titleKo: '키워드', priority: 'P1', status: 'failed', recordCount: 0 }],
    },
    companies: {
      companies: [company(ids.c2, 'Beta Labs'), company(ids.c1, 'Acme Robotics')],
      workforce: [{ company_id: ids.c1, total_headcount_min: 100, total_headcount_max: 300, humanoid_team_size: 40, job_distribution: { rd: 0.5, software: 0.3 }, recorded_at: '2026-06-01T00:00:00', source: 'LinkedIn' }],
      talent: [{ company_id: ids.c1, year: 2025, total_headcount: 200, humanoid_team_size: 30, job_posting_count: 12, source: 'x' }, { company_id: ids.c1, year: 2024, total_headcount: 150, humanoid_team_size: 20, job_posting_count: 8, source: 'x' }],
    },
    robots: {
      robots,
      body: [{ robot_id: ids.r1, height_cm: 175, weight_kg: 70, payload_kg: 20, dof_count: 40, max_speed_mps: 1.5, operation_time_hours: 2 }],
      hand: [{ robot_id: ids.r1, hand_type: 'multi_finger', finger_count: 5, hand_dof: 12, grip_force_n: 50, is_interchangeable: false }],
      computing: [{ robot_id: ids.r1, main_soc: 'Brain-1', tops_min: 100, tops_max: 200, architecture_type: 'onboard' }],
      sensors: [{ robot_id: ids.r1, cameras: [{ type: 'rgb', count: 2 }], depth_sensor: 'D1', lidar: null, imu: 'IMU', force_torque: null, touch_sensors: null }],
      power: [{ robot_id: ids.r1, battery_type: 'Li-ion', capacity_wh: 800, operation_time_hours: 2, charging_method: 'swappable' }],
      links,
    },
    components: { components, links: [{ robot_id: ids.r1, component_id: ids.comp1, usage_location: 'arm', quantity: 2 }, { robot_id: ids.r1, component_id: ids.comp2, usage_location: 'torso', quantity: 1 }], robots: [{ id: ids.r1, announcement_year: 2026 }] },
    'actuator-map': actuatorMap,
    'actuator-sourcing': actuatorMap,
    'robot-benchmark': { axes: benchAxes, competitors: benchCompetitors, scores: benchScores },
    'hand-benchmark': { axes: benchAxes, competitors: benchCompetitors, scores: benchScores },
    'ci-matrix': {
      competitors: [{ id: U(61), slug: 'atlas', name: 'Atlas', manufacturer: 'BD', country: 'US', stage: 'poc', sort_order: 1, is_active: true }, { id: U(62), slug: 'optimus', name: 'Optimus', manufacturer: 'Tesla', country: 'US', stage: 'prototype', sort_order: 2, is_active: true }],
      layers: [{ id: U(71), slug: 'hw', name: 'HW', icon: 'x', sort_order: 1 }],
      categories: [{ id: U(72), layer_id: U(71), name: 'Actuation', sort_order: 1 }],
      items: [{ id: U(73), category_id: U(72), name: '관절 토크', sort_order: 1 }, { id: U(74), category_id: U(72), name: '가격대', sort_order: 2 }],
      values: [
        { id: U(81), competitor_id: U(61), item_id: U(73), value: `180 Nm ${HOSTILE_TEXT}`, confidence: 'B', source: 'press', source_url: 'https://p.example.com', source_date: '2026-05-01', last_verified: '2026-10-01T00:00:00', updated_at: ts(1) },
        { id: U(82), competitor_id: U(62), item_id: U(73), value: '200 Nm', confidence: 'D', source: null, source_url: 'http://insecure.example.com', source_date: null, last_verified: null, updated_at: ts(1) },
      ],
      freshness: [{ layer_id: U(71), competitor_id: U(61), last_verified: '2026-10-01T00:00:00', next_review: '2026-11-01T00:00:00', tier: 1 }],
    },
    'ci-changes': {
      history: [
        { id: U(91), changed_at: '2026-10-20T01:00:00', competitor: 'Atlas', layer: 'HW', category: 'Actuation', item: '관절 토크', old_value: '170 Nm', new_value: '180 Nm', old_confidence: 'C', new_confidence: 'B', change_source: 'auto', change_reason: `reason ${HOSTILE_TEXT}`, changed_by: EMAIL },
        { id: U(92), changed_at: '2026-10-21T01:00:00', competitor: 'Atlas', layer: 'HW', category: 'Actuation', item: '가격대', old_value: null, new_value: '$100k', old_confidence: null, new_confidence: 'D', change_source: 'manual', change_reason: null, changed_by: EMAIL },
      ],
      alerts: [{ id: U(93), detected_at: '2026-10-22T01:00:00', competitor: 'Atlas', layer: 'HW', source_name: 'Press', source_url: 'https://p.example.com/a', headline: 'Atlas update', summary: 'sum', status: 'pending', reviewed_by: EMAIL }],
    },
    videos: { rows: rawVideos() },
    papers: { rows: rawPapers() },
    news: { rows: rawNews() },
    'tech-trends': {
      caches: [
        { viewName: 'tech-trend-report:v2:hand:30', cachedAt: '2026-10-25T20:40:00.000Z', data: { headline: `Hand ${HOSTILE_TEXT}`, points: ['p1', 'p2'], keywords: ['k1'], model: 'insight-model-x', generatedAt: '2026-10-25T20:40:00.000Z', tokens: 999, cost: 1 } },
        { viewName: 'tech-trend-report:v2:hand:7', cachedAt: '2026-10-28T20:40:00.000Z', data: { headline: 'Hand 7d', points: ['p1'], keywords: [], model: 'insight-model-x', generatedAt: '2026-10-28T20:40:00.000Z' } },
        { viewName: 'tech-trend-timeline:v1:hand', cachedAt: '2026-10-28T20:00:00.000Z', data: { domain: 'hand', generatedAt: '2026-10-28T20:00:00.000Z', period: { start: '2026-01', end: '2026-10' }, topics: [{ id: 't', label: 'Tactile' }], buckets: [{ month: '2026-10', partial: true }], heatmap: { rows: [] }, classification: { classified: 3 }, scope: { videos: 3, papers: 2 } } },
        { viewName: 'video-trend-summary:v6:hand', cachedAt: '2026-10-28T20:00:00.000Z', data: { text: 'summary text', headline: 'Headline', points: [{ title: 'T', body: 'B' }] } },
        { viewName: 'video-trend-summary:v5', cachedAt: '2026-10-28T20:00:00.000Z', data: { text: 'rule summary' } },
      ],
      videos: rawVideos(), papers: rawPapers(), news: rawNews(),
    },
    'weekly-briefs': {
      rows: [
        { week_start: '2026-10-19', generated_at: '2026-10-26T00:01:00+00:00', status: 'ok', model: 'brief-model-x', payload: weeklyBriefSample.payload, input_tokens: 1, cost_usd: 1, error: null, stats: { a: 1 } },
        { week_start: '2026-10-12', generated_at: '2026-10-19T00:01:00+00:00', status: 'failed', model: null, payload: {}, error: 'boom' },
      ],
    },
    keywords: {
      keywords: [{ id: U(111), term: 'actuator', language: 'en', category: 'tech', created_at: ts(1) }, { id: U(112), term: 'hand', language: 'en', category: null, created_at: ts(1) }],
      stats: [
        { keyword_id: U(111), period_type: 'week', period_start: '2026-10-19', period_end: '2026-10-25', count: 12, delta: 3, delta_percent: 33.33 },
        { keyword_id: U(111), period_type: 'month', period_start: '2026-10-01', period_end: '2026-10-31', count: 40, delta: -2, delta_percent: -4.76 },
      ],
    },
    'application-cases': {
      cases: [
        { id: U(121), robot_id: ids.r1, robot_name: 'Atlas-X', company_id: ids.c1, company_name: 'Acme Robotics', environment_type: 'factory', task_type: 'assembly', task_description: HOSTILE_TEXT, deployment_status: 'pilot', demo_event: 'CES', demo_date: '2026-01-07', video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', notes: 'n' },
        { id: U(122), robot_id: ids.r2, robot_name: 'Beta-1', company_id: null, company_name: null, environment_type: 'home', task_type: null, task_description: null, deployment_status: null, demo_event: null, demo_date: null, video_url: 'http://x.example.com/v', notes: null },
      ],
    },
    scores: {
      poc: [{ robot_id: ids.r1, robot_name: 'Atlas-X', payload_score: 8, operation_time_score: 6, finger_dof_score: 7, form_factor_score: 8, poc_deployment_score: 5, cost_efficiency_score: 4, metadata: { a: 1 }, evaluated_at: ts(1) }],
      rfm: [{ robot_id: ids.r1, robot_name: 'Atlas-X', rfm_model_name: 'Model-Z', generality_score: 4, real_world_data_score: 3, edge_inference_score: 4, multi_robot_collab_score: 2, open_source_score: 1, commercial_maturity_score: 3, evaluated_at: ts(1) }],
      positioning: [{ id: U(131), chart_type: 'poc_positioning', robot_id: ids.r1, robot_name: 'Atlas-X', label: 'Atlas-X', x_value: 1.5, y_value: 2.5, bubble_size: 3, color_group: 'US' }],
      history: [{ robot_id: ids.r1, robot_name: 'Atlas-X', snapshot_month: '2026-09', combined_score: 71.5 }],
    },
    'vision-cost': {
      bomParts: [{ id: U(141), part_name: 'Cam', part_type: 'camera', unit_price_min: 10, unit_price_max: 30, unit_price_mid: 20, price_unit: 'ea', source_basis: SENTINEL, source_reliability: 'C', example_robot: 'Atlas-X', notes: SENTINEL }],
      robotCosts: [{ id: U(142), robot_label: 'Optimus Gen1', company_name: 'Tesla', release_year: 2023, is_forecast: false, camera_cost_usd: 100, lidar_depth_cost_usd: 0, compute_cost_usd: 300, total_cost_usd: 400, performance_level: 3.5, reliability_grade: 'C', camera_desc: SENTINEL }],
    },
    products: {
      products: [{ id: U(151), company_id: ids.c1, company_name: 'Acme Robotics', name: 'Acme SoC', series: 'S', type: 'soc', release_date: '2025-05-01', target_market: 'robots', status: 'available' }],
      specs: [{ product_id: U(151), dof: null, payload_kg: null, speed_mps: null, battery_minutes: null, price_min: 100, price_max: 200, price_currency: 'USD', arms: null, hands: null, mobility: null, height_cm: null, dynamic_specs: { tops: 100, torqueNm: 5, note: HOSTILE_TEXT }, sensors: [{ type: 'x' }] }],
    },
    'competitive-alerts': {
      rows: [{ id: U(161), type: 'funding', severity: 'info', title: `Title ${HOSTILE_TEXT}`, summary: 'sum', robot_id: ids.r1, robot_name: 'Atlas-X', trigger_data: { amount: 10, link: 'http://x.example.com' }, is_read: true, read_by: U(999), read_at: ts(2), created_at: ts(1) }],
    },
    aggregations: {
      cases: [
        { robot_id: ids.r1, environment_type: 'factory', task_type: 'assembly', demo_date: '2026-01-07', locomotion_type: 'bipedal' },
        { robot_id: ids.r2, environment_type: 'factory', task_type: 'assembly', demo_date: null, locomotion_type: 'wheeled' },
      ],
      robots: [{ id: ids.r1, announcement_year: 2026 }, { id: ids.r2, announcement_year: 2027 }],
      components: [{ id: ids.comp1, name: 'Joint-A', type: 'actuator', specifications: { ratedTorqueNm: 80 }, adoption_count: 2 }],
      keywords: [{ id: U(111), term: 'actuator', article_count: 52 }, { id: U(112), term: 'hand', article_count: 10 }],
    },
    'strategy-warroom': {
      partners: [{ id: U(171), name: 'ActuCo', category: 'component', sub_category: 'actuator', country: 'KR', description: 'desc', logo_url: 'https://logo', website_url: 'https://actuco.example.com', tech_capability: 8, lg_compatibility: 7, market_share: 0.12 }],
      evaluations: [{ partner_id: U(171), evaluated_by: U(999), tech_score: 8, quality_score: 7, cost_score: 6, delivery_score: 7, support_score: 8, overall_score: 7.2, comments: HOSTILE_TEXT, evaluated_at: ts(1) }],
      domains: [{ id: U(172), name: 'Logistics', market_size_billion_usd: 12.5, cagr_percent: 20, som_billion_usd: 1.5, key_tasks: ['pick'], entry_barriers: ['cost'], lg_existing_business: 0.3, lg_readiness: 0.5, description: 'd' }],
      fits: [{ domain_id: U(172), robot_id: ids.r1, robot_name: 'Atlas-X', fit_score: 0.8, fit_details: { a: 'x' }, calculated_at: ts(1) }],
      goals: [{ id: U(173), title: 'Goal', description: 'd', metric_type: 'poc_rank', target_value: 3, current_value: 5, deadline: '2026-12-31', status: 'at_risk', required_actions: ['a'], created_by: U(999) }],
      briefings: [{ id: U(174), lg_robot_id: ids.r1, robot_name: 'LG-Bot', briefing_data: { summary: 'x', risks: ['r'] }, trigger_type: 'scheduled', ai_model: 'model-q', ai_cost_usd: 0.5, created_at: ts(1) }],
    },
    'lg-humanoid-models': {
      models: [{ id: 1, model_name: 'CLOiD', code_name: 'C1', form_factor: 'wheeled', is_potential: false, release_phase: 'poc', release_target_date: '2027-01-01', basic_info: { a: 1 }, physical: { heightCm: 150 }, locomotion: {}, manipulation: {}, perception: {}, ai_compute: {}, safety: {}, commercial: {}, ee_options: {}, custom_fields: {}, notes: 'n', created_by: EMAIL, created_at: ts(1), updated_at: ts(2) }],
      eeCategories: [{ code: 'dex_5f', name_ko: '5지 핸드', description: 'd', benchmark_examples: 'b', display_order: 1 }],
      cellRequirements: [{ id: 1, task_idx: 1, industry_idx: 2, lv: 3, tier1_codes: ['dex_5f'], tier2_codes: [], tier3_codes: [], rationale: 'r', benchmark_ee: 'e' }],
    },
    'coverage-field-events': {
      rows: [{ id: 1, subcell_key: 'tote-electronics-lv2', cell_id: 'tote-electronics', lv: 2, event_date: '2026-05-10', kind: 'visit', status: 'observed', site: 'Site A', source: 'visit', note: 'n', next_step: 'next', priority_rank: 1, created_by: EMAIL, created_at: ts(1), updated_at: ts(2) }],
    },
    regulations: {
      regulations: [{ id: U(181), title: 'AI Act', title_ko: null, category: 'legal', region: 'eu', jurisdiction: null, status: 'active', effective_date: '2026-08-01', last_amended_date: null, summary: 'sum', summary_ko: '요약', lg_impact: 'high', lg_impact_analysis: 'analysis', source_url: 'https://eur-lex.example.com', source_name: 'EUR-Lex', original_text: SENTINEL, tags: ['ai'], metadata: { x: 1 }, created_by: 'system' }],
      updates: [{ id: U(182), regulation_id: U(181), title: 'Update', title_ko: null, update_type: 'amendment', category: 'legal', region: 'eu', summary: 'sum', summary_ko: null, lg_impact: 'medium', lg_action_required: 'act', source_url: 'http://x.example.com', source_name: 'x', published_at: '2026-10-01T00:00:00', detected_at: '2026-10-02T00:00:00', is_read: true, detected_by: 'crawler' }],
      checklist: [{ id: U(183), regulation_id: U(181), parent_id: null, category: 'legal', region: 'eu', title: 'Item', description: 'desc', priority: 'high', status: 'in_progress', due_date: '2026-12-01', assignee: EMAIL, notes: 'n', evidence: [{ url: 'https://u', description: SENTINEL, uploadedAt: 'x' }], industrial_reg_comparison: 'c', industrial_reg_why_different: 'w', industrial_reg_approach: 'a', progress_pct: 30, sort_order: 1 }],
    },
    'event-briefs': {
      rows: [
        { viewName: evt(2), cachedAt: '2026-10-27T00:00:00.000Z', data: { title: 'WRC', items: [{ url: 'https://ok.example.com', note: HOSTILE_TEXT, description: SENTINEL }, { url: 'http://bad.example.com' }] } },
        { viewName: evt(1), cachedAt: '2026-10-20T00:00:00.000Z', data: { title: 'WRC 1' } },
        { viewName: 'other-key', cachedAt: '2026-10-20T00:00:00.000Z', data: { title: 'ignored' } },
      ],
    },
    'external-sources': { rows: rawExternal() },
    'data-quality': { latest: { id: U(191), report_data: { big: SENTINEL }, total_robots: 20, average_completeness: 78.5, critical_count: 2, warning_count: 9, created_at: '2026-10-27T05:00:00' } },
  };
}

/** 모든 영역의 직계 배열 프로퍼티(및 rows)의 순서를 뒤집는다 — 입력 순서 비의존(결정론) 검증용 */
export function reverseTopLevel<T>(raw: T): T {
  if (Array.isArray(raw)) return [...raw].reverse() as unknown as T;
  if (raw && typeof raw === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) out[k] = Array.isArray(v) && !['typeOrder', 'segmentOrder'].includes(k) ? [...v].reverse() : v;
    return out as T;
  }
  return raw;
}

/** 빈 입력(영역별 0건) */
export function emptyByArea(): Record<string, any> {
  const full = rawByArea();
  const empty: Record<string, any> = {};
  for (const [id, raw] of Object.entries(full)) {
    if (Array.isArray(raw)) empty[id] = [];
    else {
      const o: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(raw)) o[k] = Array.isArray(v) ? [] : v && typeof v === 'object' && !(k === 'difficultyDefault' || k === 'sourcingStats' || k === 'stats' || k === 'markers') ? v : v;
      empty[id] = o;
    }
  }
  empty['data-quality'] = { latest: null };
  empty.overview = { ...empty.overview, markers: { pipeline: null, weeklyBrief: null }, ciLastVerifiedAt: null };
  empty['actuator-map'] = { ...full['actuator-map'], robots: [], suppliers: [], edges: [], adoptions: [], vendorMarkets: [] };
  empty['actuator-sourcing'] = empty['actuator-map'];
  return empty;
}
