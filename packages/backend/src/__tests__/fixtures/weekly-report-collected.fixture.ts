/**
 * 주간 브리프 v2 테스트용 수집 결과(CollectedWeek) 픽스처 — full / sparse / empty.
 * 값은 모두 가상이다. 원문 유출 검사를 위해 articles.summary / description 에는 고정 표식 문자열을 넣는다.
 */
import type { BriefRow, CiChangeRow, CollectedWeek, KeywordCount } from '../../services/weekly-brief-compose.js';
import { getWeekRange } from '../../services/weekly-brief-period.js';

export const RAW_SUMMARY_MARKER = 'RAWSUMMARYMARKER';
export const RAW_DESCRIPTION_MARKER = 'RAWDESCRIPTIONMARKER';
export const RAW_ABSTRACT_MARKER = 'RAWABSTRACTMARKER';

export const REPORT_WEEK = '2026-10-19';
export const REPORT_NOW = new Date('2026-10-25T23:00:00Z');

const range = getWeekRange(REPORT_WEEK);
const prevRange = getWeekRange('2026-10-12');

class Maker {
  private seq = 0;
  private readonly prefix: string;
  constructor(prefix: string) {
    this.prefix = prefix;
  }
  id(): string {
    return `${this.prefix}-0000-4000-8000-${String(++this.seq).padStart(12, '0')}`;
  }
}

interface VideoOpts {
  title: string;
  domain?: string;
  topic?: string;
  views?: number | null;
  channel?: string;
  analyzed?: boolean;
  companyId?: string | null;
  tags?: { techTags?: string[]; taskTypes?: string[] };
  summaryKo?: string;
  ts?: string;
}

function videoRow(mk: Maker, o: VideoOpts): BriefRow {
  const id = mk.id();
  const vid = `V${id.slice(-10)}`;
  const ts = o.ts ?? '2026-10-21T03:00:00.000Z';
  return {
    id,
    title: o.title,
    url: `https://www.youtube.com/watch?v=${vid}`,
    summary: `${RAW_SUMMARY_MARKER} video summary. Second raw sentence.`,
    source: 'youtube',
    productType: 'video',
    publishedAt: ts,
    collectedAt: ts,
    companyId: o.companyId ?? null,
    ts,
    extractedMetadata: {
      views: o.views === undefined ? 12_000 : o.views,
      channel: o.channel ?? `Channel ${id.slice(-3)}`,
      ...(o.domain ? { domain: o.domain } : {}),
      ...(o.topic ? { topic: o.topic } : {}),
      videoId: vid,
      thumbnail: `https://i.ytimg.com/vi/${vid}/mqdefault.jpg`,
      description: `${RAW_DESCRIPTION_MARKER} long description text`,
      ...(o.tags ? { aiTags: o.tags } : {}),
      ...(o.analyzed
        ? {
            geminiAnalyzedAt: '2026-10-22T01:00:00.000Z',
            geminiAnalysis: {
              summaryKo: o.summaryKo ?? '로봇 관절 모듈의 구조를 설명하는 영상이다. 토크 센서와 감속기 배치를 단계별로 보여준다. 마지막에 시험 결과를 요약한다.',
              durationSec: 480,
              task: '관절 모듈 설명',
            },
          }
        : {}),
    },
  };
}

interface NewsOpts {
  title: string;
  source?: string;
  companyId?: string | null;
  keyPoints?: string[];
  ts?: string;
}

function newsRow(mk: Maker, o: NewsOpts): BriefRow {
  const id = mk.id();
  const ts = o.ts ?? '2026-10-20T05:00:00.000Z';
  return {
    id,
    title: o.title,
    url: `https://news.example.com/${o.source ?? 'a'}/${id.slice(-8)}`,
    summary: `${RAW_SUMMARY_MARKER} article first sentence. Second raw sentence that must not appear.`,
    source: o.source ?? 'news-a',
    productType: 'none',
    publishedAt: ts,
    collectedAt: ts,
    companyId: o.companyId ?? null,
    ts,
    extractedMetadata: o.keyPoints ? { keyPoints: o.keyPoints } : {},
  };
}

function paperRow(mk: Maker, title: string, aiSummaryKo: string | null, ts = '2026-10-21T02:00:00.000Z'): BriefRow {
  const id = mk.id();
  const n = id.slice(-5);
  return {
    id,
    title,
    url: `https://arxiv.org/abs/2610.${n}`,
    summary: `${RAW_ABSTRACT_MARKER} abstract text of the paper. More abstract text.`,
    source: 'arxiv',
    productType: 'none',
    publishedAt: ts,
    collectedAt: ts,
    companyId: null,
    ts,
    extractedMetadata: { authors: ['A. Kim', 'B. Lee', 'C. Park', 'D. Choi'], arxivId: `2610.${n}`, ...(aiSummaryKo ? { aiSummaryKo } : {}) },
  };
}

export const FIXTURE_COMPANIES = {
  atlas: { companyId: 'co-atlas', name: 'Atlas Robotics' },
  nova: { companyId: 'co-nova', name: 'Nova Dynamics' },
  orion: { companyId: 'co-orion', name: 'Orion Systems, Inc.' },
  quiet: { companyId: 'co-quiet', name: 'Quiet Labs' },
  beta: { companyId: 'co-beta', name: 'Beta Motion' },
  gamma: { companyId: 'co-gamma', name: 'Gamma Hands' },
  delta: { companyId: 'co-delta', name: 'Delta Gear' },
} as const;

function ci(over: Partial<CiChangeRow> & { valueId: string; company: string; item: string; after: string }): CiChangeRow {
  return {
    robot: 'R1',
    layer: 'HW',
    before: null,
    confidence: 'B',
    sourceName: '공식 사양서',
    sourceUrl: 'https://example.com/spec',
    changedAt: '2026-10-22T05:00:00.000Z',
    valueChanged: true,
    ...over,
  };
}

const KEYWORDS: KeywordCount[] = [
  { keywordId: 'kw-tactile', term: 'tactile', count: 41, prevCount: 29 },
  { keywordId: 'kw-humanoid', term: 'humanoid', count: 212, prevCount: 190 },
  { keywordId: 'kw-actuator', term: 'actuator', count: 96, prevCount: 92 },
  { keywordId: 'kw-vla', term: 'VLA', count: 71, prevCount: 80 },
  { keywordId: 'kw-dexterous', term: 'dexterous', count: 38, prevCount: 0 },
  { keywordId: 'kw-gripper', term: 'gripper', count: 30, prevCount: 28 },
  { keywordId: 'kw-reducer', term: 'reducer', count: 18, prevCount: 21 },
  { keywordId: 'kw-battery', term: 'battery', count: 12, prevCount: 12 },
  { keywordId: 'kw-torque', term: 'torque', count: 11, prevCount: 9 },
  { keywordId: 'kw-sim', term: 'sim2real', count: 9, prevCount: 6 },
  { keywordId: 'kw-safety', term: 'safety', count: 8, prevCount: 10 },
  { keywordId: 'kw-leg', term: 'legged', count: 7, prevCount: 5 },
  { keywordId: 'kw-cost', term: 'cost', count: 6, prevCount: 6 },
  { keywordId: 'kw-rare', term: 'rareterm', count: 3, prevCount: 1 },
];

function baseWeek(over: Partial<CollectedWeek> = {}): CollectedWeek {
  return {
    range,
    prevRange,
    rows: [],
    prevRows: [],
    truncated: false,
    videosAnalyzed: 0,
    prevVideosAnalyzed: 0,
    alerts: 0,
    prevAlerts: 0,
    newRobots: null,
    ciChanges: [],
    ciUpdates: 0,
    prevCiUpdates: 0,
    keywords: [],
    keywordEvidence: {},
    companies: [],
    warnings: [],
    ...over,
  };
}

/** 모든 섹션이 가득 찬 주 (영상 40+, 논문 17, 뉴스 45+) */
export function makeCollectedFull(): CollectedWeek {
  const mk = new Maker('a1000000');
  const rows: BriefRow[] = [];
  const act = FIXTURE_COMPANIES.atlas.companyId;
  const nova = FIXTURE_COMPANIES.nova.companyId;
  const orion = FIXTURE_COMPANIES.orion.companyId;

  // 액추에이터 영상 12
  for (let i = 0; i < 12; i++) {
    rows.push(
      videoRow(mk, {
        title: `Quasi-direct drive joint teardown ${i + 1}`,
        domain: 'actuator',
        views: 480_000 / (i + 1),
        channel: i < 3 ? 'Robot Lab' : `Motion Channel ${i}`,
        analyzed: i % 2 === 0,
        companyId: i < 4 ? act : null,
        tags: { techTags: ['QDD', i % 2 ? '감속기' : '토크센서'], taskTypes: ['관절 구동'] },
      }),
    );
  }
  // 핸드 영상 9
  for (let i = 0; i < 9; i++) {
    rows.push(videoRow(mk, { title: `Five-finger hand grasp benchmark ${i + 1}`, domain: 'hand', views: 90_000 / (i + 1), channel: `Hand Tech ${i}`, analyzed: i % 3 === 0, companyId: i < 3 ? nova : null, tags: { techTags: ['촉각', '손가락'], taskTypes: ['파지/조작'] } }));
  }
  // RFM 영상 5
  for (let i = 0; i < 5; i++) rows.push(videoRow(mk, { title: `VLA policy rollout on a tabletop ${i + 1}`, domain: 'rfm', views: 40_000 / (i + 1), channel: `Embodied AI ${i}`, analyzed: i % 2 === 0, tags: { techTags: ['VLA'], taskTypes: ['조작'] } }));
  // 전시 영상 4, 양산 영상 4 (주제 검색 수집)
  for (let i = 0; i < 4; i++) rows.push(videoRow(mk, { title: `Expo floor tour day ${i + 1}`, topic: 'expo', domain: 'robot', views: 20_000 / (i + 1), channel: `Expo Daily ${i}`, analyzed: i < 2, tags: { techTags: ['부스 시연'], taskTypes: ['전시'] } }));
  for (let i = 0; i < 4; i++) rows.push(videoRow(mk, { title: `Humanoid assembly line walkthrough ${i + 1}`, topic: 'production', domain: 'robot', views: 150_000 / (i + 1), channel: `Factory Watch ${i}`, analyzed: i === 0, companyId: orion, tags: { techTags: ['양산 라인'], taskTypes: ['조립'] } }));
  // 기타 영상 8 (도메인 없음, 조회수 없음 포함)
  for (let i = 0; i < 8; i++) rows.push(videoRow(mk, { title: `Legged robot stairs demo ${i + 1}`, views: i === 7 ? null : 5_000 / (i + 1), channel: `Misc ${i}`, companyId: i < 2 ? act : null }));

  // 논문 17: 액추에이터 6, 핸드 6, RFM 5
  const ai = (s: string) => s;
  for (let i = 0; i < 6; i++) rows.push(paperRow(mk, `Compact Quasi-Direct-Drive Actuator with Torque Sensing ${i + 1}`, i === 5 ? null : ai('소형 액추에이터에 토크 센서를 통합한 설계를 평가했다. 다리 관절 시험에서 효율을 비교했다.')));
  for (let i = 0; i < 6; i++) rows.push(paperRow(mk, `Tactile Sensing Skin for Dexterous Hands ${i + 1}`, ai('촉각 피부를 적용해 손 안 조작 성공률을 높였다.')));
  for (let i = 0; i < 5; i++) rows.push(paperRow(mk, `Vision-Language-Action Foundation Model for Humanoid Tasks ${i + 1}`, ai('긴 호흡의 휴머노이드 과제에서 정책 성능을 보고한다.')));

  // 뉴스 45: 전시 6, 양산 6, 일반 33 (출처 다양)
  const sources = ['The Robot Report', 'IEEE Spectrum', 'TechCrunch', 'SCMP', 'Nikkei', 'Reuters', 'Wired', 'Venture Post'];
  for (let i = 0; i < 6; i++) rows.push(newsRow(mk, { title: `Robot expo opens with record attendance ${i + 1} at CES`, source: sources[i % sources.length], keyPoints: i % 2 === 0 ? ['전시회 참관객이 늘었다', '휴머노이드 부스가 가장 붐볐다'] : undefined }));
  for (let i = 0; i < 6; i++) rows.push(newsRow(mk, { title: `Humanoid mass production ramp announced ${i + 1}`, source: sources[(i + 2) % sources.length], companyId: i < 3 ? orion : null, keyPoints: i % 2 === 0 ? ['양산 라인 가동 계획이 공개되었다'] : undefined }));
  for (let i = 0; i < 33; i++) {
    rows.push(newsRow(mk, { title: `Supplier signs multi-year deal ${i + 1}`, source: sources[i % sources.length], companyId: i < 14 ? act : i < 20 ? nova : null, keyPoints: i % 3 === 0 ? ['공급 계약이 체결되었다'] : undefined }));
  }

  // 뉴스에만 나오는 회사 (CI 없음)
  for (let i = 0; i < 5; i++) rows.push(newsRow(mk, { title: `Beta Motion unveils joint module ${i + 1}`, source: sources[i % sources.length], companyId: FIXTURE_COMPANIES.beta.companyId, keyPoints: i < 2 ? ['관절 모듈 신제품이 공개되었다'] : undefined }));
  for (let i = 0; i < 4; i++) rows.push(newsRow(mk, { title: `Gamma Hands tactile fingertip update ${i + 1}`, source: sources[(i + 3) % sources.length], companyId: FIXTURE_COMPANIES.gamma.companyId }));
  for (let i = 0; i < 3; i++) rows.push(newsRow(mk, { title: `Delta Gear reducer supply news ${i + 1}`, source: sources[(i + 5) % sources.length], companyId: FIXTURE_COMPANIES.delta.companyId }));

  // 직전 주 (비율 비교용)
  const prevRows: BriefRow[] = [];
  const pmk = new Maker('b2000000');
  for (let i = 0; i < 6; i++) prevRows.push(videoRow(pmk, { title: `prev actuator ${i}`, domain: 'actuator', ts: '2026-10-14T03:00:00.000Z' }));
  for (let i = 0; i < 20; i++) prevRows.push(videoRow(pmk, { title: `prev misc ${i}`, ts: '2026-10-14T03:00:00.000Z' }));
  for (let i = 0; i < 25; i++) prevRows.push(newsRow(pmk, { title: `prev news ${i}`, source: sources[i % sources.length], companyId: i < 8 ? act : null, ts: '2026-10-14T05:00:00.000Z' }));
  for (let i = 0; i < 8; i++) prevRows.push(paperRow(pmk, `Compact actuator prev ${i}`, null, '2026-10-14T02:00:00.000Z'));

  const ciChanges: CiChangeRow[] = [
    ci({ valueId: 'ci-1', company: 'Atlas Robotics', item: '손 자유도', before: '16 DoF', after: '22 DoF', confidence: 'A' }),
    ci({ valueId: 'ci-2', company: 'Atlas Robotics', item: '목표 양산 규모', before: null, after: '연 1,000대', confidence: 'B', valueChanged: false, sourceUrl: 'https://example.com/pr' }),
    ci({ valueId: 'ci-3', company: 'Nova Dynamics', item: '제어 방식', before: 'MPC', after: 'RL + MPC 혼합', confidence: 'B' }),
    ci({ valueId: 'ci-4', company: 'Orion Systems', item: '인증 현황', before: '진행 중', after: 'ISO 13482 취득', confidence: 'C', sourceUrl: null, sourceName: null }),
    ci({ valueId: 'ci-5', company: 'Ghost Labs', item: '배터리 용량', before: '1 kWh', after: '2 kWh', confidence: 'D' }),
    ci({ valueId: 'ci-6', company: 'Quiet Labs', item: '보행 속도', before: '1 m/s', after: '1.5 m/s', confidence: 'F', changedAt: '2026-10-23T00:00:00.000Z' }),
  ];

  const volume = [
    { weekStart: '2026-08-31', videos: 30, articles: 130, papers: 40 },
    { weekStart: '2026-09-07', videos: 33, articles: 150, papers: 38 },
    { weekStart: '2026-09-14', videos: 28, articles: 140, papers: 45 },
    { weekStart: '2026-09-21', videos: 36, articles: 160, papers: 44 },
    { weekStart: '2026-09-28', videos: 35, articles: 155, papers: 47 },
    { weekStart: '2026-10-05', videos: 37, articles: 170, papers: 50 },
    { weekStart: '2026-10-12', videos: 26, articles: 25, papers: 8 },
    { weekStart: '2026-10-19', videos: 999, articles: 999, papers: 999 }, // header.counts 로 덮어쓴다
  ];

  return baseWeek({
    rows,
    prevRows,
    videosAnalyzed: 29,
    prevVideosAnalyzed: 24,
    alerts: 3,
    prevAlerts: 2,
    newRobots: 2,
    ciChanges,
    ciUpdates: ciChanges.length,
    prevCiUpdates: 4,
    keywords: KEYWORDS,
    keywordEvidence: {
      'kw-tactile': [
        { articleId: 'ev-art-1', title: 'Tactile skin for dexterous hands', url: 'https://news.example.com/tactile', source: 'IEEE Spectrum' },
        { articleId: 'ev-art-2', title: 'Tactile sensors go mainstream', url: 'https://news.example.com/tactile2', source: 'TechCrunch' },
      ],
    },
    companies: [
      { companyId: FIXTURE_COMPANIES.atlas.companyId, name: FIXTURE_COMPANIES.atlas.name, count: 18, prevCount: 8 },
      { companyId: FIXTURE_COMPANIES.nova.companyId, name: FIXTURE_COMPANIES.nova.name, count: 9, prevCount: 9 },
      { companyId: FIXTURE_COMPANIES.orion.companyId, name: FIXTURE_COMPANIES.orion.name, count: 7, prevCount: 0 },
      { companyId: FIXTURE_COMPANIES.beta.companyId, name: FIXTURE_COMPANIES.beta.name, count: 5, prevCount: 2 },
      { companyId: FIXTURE_COMPANIES.gamma.companyId, name: FIXTURE_COMPANIES.gamma.name, count: 4, prevCount: 4 },
      { companyId: FIXTURE_COMPANIES.delta.companyId, name: FIXTURE_COMPANIES.delta.name, count: 3, prevCount: 1 },
    ],
    companyDirectory: Object.values(FIXTURE_COMPANIES).map((c) => ({ ...c })),
    volume,
  });
}

/** 희소한 주: 영상 3 · 논문 1 · 뉴스 2, 회사·CI·키워드 없음 */
export function makeCollectedSparse(): CollectedWeek {
  const mk = new Maker('c3000000');
  const rows: BriefRow[] = [
    videoRow(mk, { title: 'Humanoid walks a factory shift', views: 80_000, channel: 'Humanoid Daily', analyzed: true }),
    videoRow(mk, { title: 'Gripper test bench', views: 3_000, channel: 'Hand Tech' }),
    videoRow(mk, { title: 'Teleoperation setup', views: 900, channel: 'Embodied AI' }),
    paperRow(mk, 'Tactile Sensing Skin for Hands', '촉각 피부로 조작 성공률을 높였다.'),
    newsRow(mk, { title: 'Startup raises round', source: 'Venture Post' }),
    newsRow(mk, { title: 'Safety standard draft', source: 'Industry Wire', keyPoints: ['서비스 로봇 안전 표준 초안이 공개되었다'] }),
  ];
  return baseWeek({ rows, volume: [{ weekStart: '2026-10-12', videos: 0, articles: 0, papers: 0 }, { weekStart: '2026-10-19', videos: 3, articles: 2, papers: 1 }] });
}

/** 데이터 전무 */
export function makeCollectedEmpty(): CollectedWeek {
  return baseWeek();
}
