/**
 * 주간 브리프 샘플 payload 픽스처 (계약 확인 · 프론트 개발용).
 *
 *  - weeklyBriefSample        : status ok, 모든 섹션이 가득 찬 1건(논문 6건 포함) (2026-10-19 ~ 10-25, ISO Week 43)
 *  - weeklyBriefEmptySample   : 데이터 전무 (모든 섹션이 빈 배열/null, partial + no_data)
 *  - weeklyBriefPartialSample : 규칙 문장이 섞인 partial (AI 미사용, ci/키워드 섹션 일부 비어 있음)
 *
 * 같은 JSON 이 scratchpad 의 weekly-brief-sample.json 에도 저장된다 (generateWeeklyBriefSampleJson()).
 * 값은 모두 가상이며 실제 영상/기사가 아니다. 링크는 계약상 허용되는 호스트만 사용한다.
 */

import type {
  WeeklyArticleItem,
  WeeklyBriefPayload,
  WeeklyBriefResponse,
  WeeklyCiChange,
  WeeklyKeyMessage,
  WeeklyKeyword,
  WeeklyPaperItem,
  WeeklyTopVideo,
  WeeklyVideoItem,
} from '../../types/weekly-brief.js';

const WEEK_START = '2026-10-19';

const ytThumb = (id: string) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
const ytUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

const keyMessages: WeeklyKeyMessage[] = [
  {
    id: 'domain_share:actuator',
    candidateType: 'domain_share',
    kind: 'stat',
    headline: '이번 주 수집된 영상·기사 중 24%가 액추에이터 주제였습니다',
    bigNumber: { value: '24', unit: '%', caption: '액추에이터 관련 100건 / 전체 412건' },
    delta: { value: '+4.2', unit: '%p', label: '지난주 대비' },
    basis: '근거: 도메인 태그 집계 (영상 29 · 기사·논문 71)',
    evidence: [
      { type: 'video', id: 'a1000000-0000-4000-8000-000000000001', title: 'Quasi-direct drive joint teardown', url: ytUrl('dQw4w9WgXcQ'), label: 'Robot Lab' },
      { type: 'video', id: 'a1000000-0000-4000-8000-000000000002', title: 'Harmonic reducer test bench', url: ytUrl('9bZkp7q19f0'), label: 'Motion Channel' },
      { type: 'article', id: 'b2000000-0000-4000-8000-000000000001', title: 'Actuator makers expand humanoid lines', url: 'https://example.com/news/actuator-expansion', label: 'Example News' },
    ],
    note: '액추에이터 관련 영상과 기사가 함께 늘었습니다.',
    generatedBy: 'ai',
  },
  {
    id: 'keyword_surge:kw-tactile',
    candidateType: 'keyword_surge',
    kind: 'stat',
    headline: '"tactile" 언급이 지난주 대비 41% 증가했습니다',
    bigNumber: { value: '+41', unit: '%', caption: '29회 → 41회' },
    delta: null,
    basis: '근거: 키워드 빈도 집계 (기사 키워드 합산, KST 주간)',
    evidence: [
      { type: 'keyword', id: 'kw-tactile', title: 'tactile', url: null, label: '41회' },
      { type: 'article', id: 'b2000000-0000-4000-8000-000000000002', title: 'Tactile skin for dexterous hands', url: 'https://example.com/news/tactile-skin', label: 'Example News' },
    ],
    note: null,
    generatedBy: 'rule',
  },
  {
    id: 'ci_change:c3000000-0000-4000-8000-000000000001',
    candidateType: 'ci_change',
    kind: 'cause_effect',
    headline: 'Atlas Robotics의 손 자유도 정보가 갱신되었습니다',
    bigNumber: { value: '22 DoF', unit: '', caption: '16 DoF → 22 DoF · 신뢰도 A' },
    delta: null,
    basis: '근거: CI 값 변경 이력 (신뢰도 A)',
    evidence: [
      { type: 'ci', id: 'c3000000-0000-4000-8000-000000000001', title: 'Atlas Robotics · 손 자유도', url: 'https://example.com/spec/atlas-hand', label: 'Atlas Robotics' },
    ],
    note: null,
    generatedBy: 'rule',
  },
];

const topVideo: WeeklyTopVideo = {
  id: 'a1000000-0000-4000-8000-000000000010',
  title: 'Full-size humanoid walks a factory shift',
  channel: 'Humanoid Daily',
  publishedAt: '2026-10-22T03:00:00.000Z',
  views: 1_240_000,
  url: ytUrl('aqz-KE-bpKQ'),
  thumbnail: ytThumb('aqz-KE-bpKQ'),
  analyzed: true,
  domain: 'production',
  durationSec: 482,
  analysisLine: '공장 라인에서 휴머노이드가 이동과 적재 작업을 수행하는 장면을 담았다.',
};

const videoSeeds: Array<[string, string, string, number | null, boolean, WeeklyVideoItem['domain']]> = [
  ['V000000001a', 'Quasi-direct drive joint teardown', 'Robot Lab', 482_000, true, 'actuator'],
  ['V000000002b', 'Five-finger hand grasp benchmark', 'Hand Tech', 310_000, true, 'hand'],
  ['V000000003c', 'VLA policy rollout on a tabletop', 'Embodied AI', 220_500, true, 'rfm'],
  ['V000000004d', 'Humanoid assembly line walkthrough', 'Factory Watch', 180_000, false, 'production'],
  ['V000000005e', 'Expo floor tour: day two', 'Expo Daily', 96_400, false, 'expo'],
  ['V000000006f', 'Harmonic reducer test bench', 'Motion Channel', 54_300, true, 'actuator'],
  ['V000000007g', 'Legged robot stairs demo', 'Robot Lab', 12_900, false, null],
  ['V000000008h', 'Teleoperation data collection setup', 'Embodied AI', 950, true, 'rfm'],
];
const videos: WeeklyVideoItem[] = videoSeeds.map(([id, title, channel, views, analyzed, domain], i) => ({
  id: `a1000000-0000-4000-8000-0000000001${String(i).padStart(2, '0')}`,
  title,
  channel,
  publishedAt: `2026-10-${String(20 + (i % 5)).padStart(2, '0')}T0${i}:00:00.000Z`,
  views,
  url: ytUrl(id),
  thumbnail: ytThumb(id),
  analyzed,
  domain,
}));

const ciChanges: WeeklyCiChange[] = [
  { id: 'c3000000-0000-4000-8000-000000000001', company: 'Atlas Robotics', robot: 'Atlas X', layer: 'HW', item: '손 자유도', before: '16 DoF', after: '22 DoF', confidence: 'A', sourceName: '공식 사양서', sourceUrl: 'https://example.com/spec/atlas-hand', changedAt: '2026-10-22T05:10:00.000Z' },
  { id: 'c3000000-0000-4000-8000-000000000002', company: 'Atlas Robotics', robot: 'Atlas X', layer: 'Biz', item: '목표 양산 규모', before: null, after: '연 1,000대', confidence: 'B', sourceName: '보도자료', sourceUrl: 'https://example.com/pr/atlas-scale', changedAt: '2026-10-23T02:00:00.000Z' },
  { id: 'c3000000-0000-4000-8000-000000000003', company: 'Nova Dynamics', robot: 'Nova N1', layer: 'SW/AI', item: '제어 방식', before: 'MPC', after: 'RL + MPC 혼합', confidence: 'B', sourceName: '기술 블로그', sourceUrl: 'https://example.com/blog/nova-control', changedAt: '2026-10-21T09:30:00.000Z' },
  { id: 'c3000000-0000-4000-8000-000000000004', company: 'Orion Systems', robot: null, layer: 'Safety', item: '인증 현황', before: '진행 중', after: 'ISO 13482 취득', confidence: 'C', sourceName: null, sourceUrl: null, changedAt: '2026-10-24T01:20:00.000Z' },
];

const keywords: WeeklyKeyword[] = [
  { keywordId: 'kw-tactile', term: 'tactile', count: 41, prevCount: 29, deltaPct: 41.4, direction: 'up' },
  { keywordId: 'kw-humanoid', term: 'humanoid', count: 212, prevCount: 190, deltaPct: 11.6, direction: 'up' },
  { keywordId: 'kw-actuator', term: 'actuator', count: 96, prevCount: 92, deltaPct: 4.3, direction: 'flat' },
  { keywordId: 'kw-vla', term: 'VLA', count: 71, prevCount: 80, deltaPct: -11.3, direction: 'down' },
  { keywordId: 'kw-dexterous', term: 'dexterous', count: 38, prevCount: 0, deltaPct: null, direction: 'new' },
  { keywordId: 'kw-gripper', term: 'gripper', count: 30, prevCount: 28, deltaPct: 7.1, direction: 'up' },
  { keywordId: 'kw-reducer', term: 'reducer', count: 18, prevCount: 21, deltaPct: -14.3, direction: 'down' },
  { keywordId: 'kw-battery', term: 'battery', count: 12, prevCount: 12, deltaPct: 0, direction: 'flat' },
];

const articleSeeds: Array<[string, string, string, WeeklyArticleItem['domain'], string | null]> = [
  ['Actuator makers expand humanoid lines', 'Example News', 'actuator', 'actuator', '주요 공급사가 휴머노이드용 액추에이터 라인 증설을 발표했다.'],
  ['Tactile skin for dexterous hands', 'Example News', 'tactile', 'hand', '촉각 피부를 적용한 손 모듈의 시험 결과가 공개되었다.'],
  ['Humanoid pilot program expands to logistics', 'Robot Report', 'pilot', 'production', null],
  ['New foundation model targets manipulation', 'Robot Report', 'fm', 'rfm', '조작 과제를 겨냥한 모델이 공개되었다.'],
  ['Robot expo opens with record attendance', 'Tech Daily', 'expo', 'expo', null],
  ['Supplier signs multi-year reducer deal', 'Tech Daily', 'deal', 'actuator', '감속기 공급 계약이 체결되었다.'],
  ['Battery pack redesign for bipedal robots', 'Industry Wire', 'battery', null, null],
  ['Safety standard draft for service robots', 'Industry Wire', 'safety', null, '서비스 로봇 안전 표준 초안이 공개되었다.'],
  ['Startup raises round for hand modules', 'Venture Post', 'raise', 'hand', null],
  ['Factory deployment update from a pilot customer', 'Venture Post', 'deploy', 'production', null],
  ['Analyst note on humanoid unit costs', 'Market Lens', 'cost', null, null],
  ['Open-source policy library release', 'Market Lens', 'oss', 'rfm', '오픈소스 정책 라이브러리가 새 버전을 냈다.'],
];
const articles: WeeklyArticleItem[] = articleSeeds.map(([title, source, slug, domain, summaryLine], i) => ({
  id: `b2000000-0000-4000-8000-0000000002${String(i).padStart(2, '0')}`,
  title,
  source,
  publishedAt: `2026-10-${String(19 + (i % 7)).padStart(2, '0')}T0${i % 10}:30:00.000Z`,
  url: `https://example.com/news/${slug}`,
  summaryLine,
  domain,
}));

const paperSeeds: Array<[string, string, string | null, WeeklyPaperItem['domain'], string | null]> = [
  ['Tactile Sensing Skin for Dexterous Multi-Finger Hands', '2610.01234', 'A. Kim, B. Lee, C. Park 외 4명', 'hand', 'We present a tactile skin that improves in-hand manipulation success.'],
  ['Compact Quasi-Direct-Drive Actuator with Integrated Torque Sensing', '2610.02345', 'D. Chen, E. Zhao, F. Wang', 'actuator', 'A compact actuator design with integrated torque sensing is evaluated on a leg joint.'],
  ['Vision-Language-Action Policies for Long-Horizon Humanoid Tasks', '2610.03456', 'G. Singh, H. Ito 외 9명', 'rfm', 'We study VLA policies on long-horizon tasks and report success rates.'],
  ['Harmonic Drive Efficiency Under Cyclic Humanoid Loads', '2610.04567', 'I. Novak', 'actuator', null],
  ['Learning Whole-Body Control from Teleoperation Data', '2610.05678', 'J. Garcia, K. Muller 외 2명', 'rfm', 'Teleoperated demonstrations are used to train a whole-body controller.'],
  ['A Survey of Gripper Designs for Warehouse Picking', '2610.06789', null, null, 'This survey groups gripper designs by payload and cycle time.'],
];
const papers: WeeklyPaperItem[] = paperSeeds.map(([title, arxivId, authors, domain, summaryLine], i) => ({
  id: `d4000000-0000-4000-8000-0000000003${String(i).padStart(2, '0')}`,
  title,
  authors,
  publishedAt: `2026-10-${String(19 + i).padStart(2, '0')}T02:00:00.000Z`,
  url: `https://arxiv.org/abs/${arxivId}`,
  arxivId,
  domain,
  summaryLine,
}));

const okPayload: WeeklyBriefPayload = {
  schemaVersion: 1,
  header: {
    weekStart: WEEK_START,
    weekEnd: '2026-10-25',
    isoYear: 2026,
    weekNumber: 43,
    periodStartAt: '2026-10-18T15:00:00.000Z',
    periodEndAt: '2026-10-25T14:59:59.999Z',
    generatedAt: '2026-10-25T23:00:41.000Z',
    counts: { articles: 187, videosNew: 41, videosAnalyzed: 29, papers: 52, ciUpdates: 6, alerts: 3, newRobots: 2 },
    deltas: { articles: 12.0, videosNew: -4.7, videosAnalyzed: 20.8, papers: 8.3, ciUpdates: null, alerts: 50.0 },
  },
  keyMessages,
  topVideo,
  ciChanges,
  ciSummary: { updates: 6, companies: 3 },
  keywords,
  videos,
  articles,
  papers,
  meta: { aiUsed: true, ruleBasedMessages: 2, warnings: [], truncated: false },
};

export const weeklyBriefSample: WeeklyBriefResponse = {
  weekStart: WEEK_START,
  status: 'ok',
  generatedAt: '2026-10-25T23:00:41.000Z',
  model: 'sample-model',
  prevWeekStart: '2026-10-12',
  nextWeekStart: null,
  payload: okPayload,
};

/** 데이터 전무: 모든 섹션이 빈 배열/null. 화면은 "이번 주 수집된 데이터가 부족합니다" 안내만 보여준다. */
export const weeklyBriefEmptySample: WeeklyBriefResponse = {
  weekStart: WEEK_START,
  status: 'partial',
  generatedAt: '2026-10-25T23:00:05.000Z',
  model: null,
  prevWeekStart: null,
  nextWeekStart: null,
  payload: {
    schemaVersion: 1,
    header: {
      ...okPayload.header,
      generatedAt: '2026-10-25T23:00:05.000Z',
      counts: { articles: 0, videosNew: 0, videosAnalyzed: 0, papers: 0, ciUpdates: 0, alerts: 0, newRobots: 0 },
      deltas: { articles: null, videosNew: null, videosAnalyzed: null, papers: null, ciUpdates: null, alerts: null },
    },
    keyMessages: [],
    topVideo: null,
    ciChanges: [],
    ciSummary: { updates: 0, companies: 0 },
    keywords: [],
    videos: [],
    articles: [],
    papers: [],
    meta: { aiUsed: false, ruleBasedMessages: 0, warnings: ['no_data'], truncated: false },
  },
};

/** 규칙 문장 혼합 partial: AI 미사용(키 메시지 전부 rule), CI 와 키워드 섹션이 비어 있고 영상은 3건만 있다. */
export const weeklyBriefPartialSample: WeeklyBriefResponse = {
  weekStart: WEEK_START,
  status: 'partial',
  generatedAt: '2026-10-25T23:00:30.000Z',
  model: null,
  prevWeekStart: '2026-10-12',
  nextWeekStart: '2026-10-26',
  payload: {
    ...okPayload,
    header: {
      ...okPayload.header,
      generatedAt: '2026-10-25T23:00:30.000Z',
      counts: { articles: 64, videosNew: 12, videosAnalyzed: 5, papers: 18, ciUpdates: 0, alerts: 0 },
      deltas: { articles: -8.3, videosNew: null, videosAnalyzed: null, papers: -5.3, ciUpdates: null, alerts: null },
    },
    keyMessages: [
      {
        ...keyMessages[0]!,
        headline: '이번 주 수집된 영상·기사 중 24%가 액추에이터 주제였습니다',
        note: null,
        generatedBy: 'rule',
      },
    ],
    ciChanges: [],
    ciSummary: { updates: 0, companies: 0 },
    keywords: [],
    videos: videos.slice(0, 3),
    articles: articles.slice(0, 5),
    papers: papers.slice(0, 3),
    meta: { aiUsed: false, ruleBasedMessages: 1, warnings: ['ai_disabled', 'ci_failed'], truncated: false },
  },
};

export const weeklyBriefSamples = {
  ok: weeklyBriefSample,
  empty: weeklyBriefEmptySample,
  partial: weeklyBriefPartialSample,
} as const;
