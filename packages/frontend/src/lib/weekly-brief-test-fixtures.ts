/**
 * 주간 브리프 테스트 픽스처 (vitest 전용 — 앱 코드에서 import 하지 않는다).
 * 2026-10-19(월) ~ 10-25(일), ISO Week 43.
 */
import type {
  BriefDomainKey,
  WeeklyArticleItem,
  WeeklyBriefResponse,
  WeeklyKeyword,
  WeeklyPaperItem,
  WeeklyVideoItem,
} from '@/types/weekly-brief';

const YT = 'https://i.ytimg.com/vi';

export function makeVideo(i: number, over: Partial<WeeklyVideoItem> = {}): WeeklyVideoItem {
  const id = `vid${String(i).padStart(8, '0')}`;
  const domains: (BriefDomainKey | null)[] = ['actuator', 'hand', 'rfm', 'production', 'expo', null, 'hand', 'actuator'];
  return {
    id,
    title: `Humanoid demo ${i}`,
    channel: `Channel ${i}`,
    publishedAt: '2026-10-22T03:00:00.000Z',
    views: 480_000 / (i + 1),
    url: `https://www.youtube.com/watch?v=${id}`,
    thumbnail: `${YT}/${id}/mqdefault.jpg`,
    analyzed: i % 2 === 0,
    domain: domains[i % domains.length],
    ...over,
  };
}

export function makeArticle(i: number, over: Partial<WeeklyArticleItem> = {}): WeeklyArticleItem {
  return {
    id: `art${i}`,
    title: `Robot headline number ${i}`,
    source: ['The Robot Report', 'IEEE Spectrum', 'TechCrunch', 'SCMP'][i % 4],
    publishedAt: '2026-10-21T01:00:00.000Z',
    url: `https://news.example.com/articles/${i}`,
    summaryLine: i % 3 === 0 ? `요약 문장 ${i}` : null,
    domain: i % 2 === 0 ? 'hand' : null,
    ...over,
  };
}

export function makePaper(i: number, over: Partial<WeeklyPaperItem> = {}): WeeklyPaperItem {
  const arxivId = `2610.${String(10000 + i)}`;
  const domains: (BriefDomainKey | null)[] = ['hand', 'actuator', 'rfm', 'production', null, 'hand'];
  return {
    id: `pap${i}`,
    title: `Dexterous manipulation with tactile feedback ${i}`,
    authors: i % 2 === 0 ? 'A. Kim, B. Lee, C. Park 외 4명' : 'D. Choi',
    publishedAt: '2026-10-21T01:00:00.000Z',
    url: `https://arxiv.org/abs/${arxivId}`,
    arxivId,
    summaryLine: i % 3 === 0 ? `We propose a method ${i}.` : null,
    domain: domains[i % domains.length],
    ...over,
  };
}

export function makeKeyword(i: number, over: Partial<WeeklyKeyword> = {}): WeeklyKeyword {
  return {
    keywordId: `kw${i}`,
    term: ['tactile', 'QDD', 'roller screw', 'VLA', 'teleoperation', 'harmonic', 'dexterous', 'sim2real'][i % 8],
    count: 40 - i * 3,
    prevCount: 28 - i * 2,
    deltaPct: i === 0 ? 41.2 : i % 2 === 0 ? -12 : 18,
    direction: i === 0 ? 'up' : i % 2 === 0 ? 'down' : 'up',
    ...over,
  };
}

export function makeFullBrief(): WeeklyBriefResponse {
  return {
    weekStart: '2026-10-19',
    status: 'ok',
    generatedAt: '2026-10-25T23:05:00.000Z', // KST 2026-10-26 08:05
    model: null,
    prevWeekStart: '2026-10-12',
    nextWeekStart: null,
    payload: {
      schemaVersion: 1,
      header: {
        weekStart: '2026-10-19',
        weekEnd: '2026-10-25',
        isoYear: 2026,
        weekNumber: 43,
        periodStartAt: '2026-10-18T15:00:00.000Z',
        periodEndAt: '2026-10-25T14:59:59.999Z',
        generatedAt: '2026-10-25T23:05:00.000Z',
        counts: { articles: 187, papers: 23, videosNew: 41, videosAnalyzed: 29, ciUpdates: 6, alerts: 3, newRobots: 2 },
        deltas: { articles: 12, papers: 15.5, videosNew: -3.5, videosAnalyzed: null, ciUpdates: 0, alerts: 50 },
      },
      keyMessages: [
        {
          id: 'domain_share:actuator',
          candidateType: 'domain_share',
          kind: 'stat',
          headline: '이번 주 수집된 영상·기사 중 38%가 액추에이터 주제였습니다',
          bigNumber: { value: '38', unit: '%', caption: '액추에이터 관련 100건 / 전체 263건' },
          delta: { value: '+4.2', unit: '%p', label: '지난주 대비' },
          basis: '근거: 도메인 태그 집계 (영상 29 · 기사·논문 71)',
          evidence: [
            { type: 'video', id: 'vid00000000', title: 'Humanoid demo 0', url: 'https://www.youtube.com/watch?v=vid00000000', label: 'Channel 0' },
            { type: 'article', id: 'art1', title: 'Robot headline number 1', url: 'https://news.example.com/articles/1', label: 'IEEE Spectrum' },
          ],
          note: null,
          generatedBy: 'ai',
        },
        {
          id: 'ci_change:v1',
          candidateType: 'ci_change',
          kind: 'cause_effect',
          headline: 'Figure AI의 양산 단계 정보가 갱신되었습니다',
          bigNumber: { value: 'mass', unit: '', caption: 'pilot → mass · 신뢰도 B' },
          delta: null,
          basis: '근거: CI 변경 이력',
          evidence: [{ type: 'ci', id: 'v1', title: 'Figure AI 양산 단계', url: 'https://example.com/figure', label: 'Figure AI' }],
          note: null,
          generatedBy: 'rule',
        },
        {
          id: 'keyword_surge:kw0',
          candidateType: 'keyword_surge',
          kind: 'stat',
          headline: '"tactile" 언급이 지난주 대비 41% 증가했습니다',
          bigNumber: { value: '+41', unit: '%', caption: '28회 → 40회' },
          delta: null,
          basis: '근거: 기사 키워드 집계',
          evidence: [{ type: 'keyword', id: 'kw0', title: 'tactile', url: null, label: null }],
          note: '핸드 서브토픽 중 언급량 1위입니다',
          generatedBy: 'ai',
        },
      ],
      topVideo: {
        ...makeVideo(0, { views: 1_200_000, title: 'Figure 03 BotQ 양산 라인', channel: 'FIGURE' }),
        durationSec: 760,
        analysisLine: '손가락 액추에이터 사내 제조 라인을 소개합니다.',
      },
      ciChanges: [
        { id: 'c1', company: 'Apptronik', robot: 'Apollo', layer: 'business', item: '가격대', before: '미공개', after: '리스 모델', confidence: 'B', sourceName: 'Press', sourceUrl: 'https://example.com/apptronik', changedAt: '2026-10-22T00:00:00.000Z' },
        { id: 'c2', company: 'Figure AI', robot: 'Figure 03', layer: 'business', item: '양산 단계', before: 'pilot', after: 'mass', confidence: 'B', sourceName: 'Press', sourceUrl: 'https://example.com/figure', changedAt: '2026-10-22T00:00:00.000Z' },
        { id: 'c3', company: 'Unitree', robot: 'H2', layer: 'actuator', item: '관절 모듈', before: null, after: '외판 4종', confidence: 'A', sourceName: null, sourceUrl: null, changedAt: '2026-10-23T00:00:00.000Z' },
        { id: 'c4', company: 'Agibot', robot: 'A2', layer: 'business', item: '출하량', before: '500', after: '1,000', confidence: 'C', sourceName: 'SCMP', sourceUrl: 'https://example.com/agibot', changedAt: '2026-10-24T00:00:00.000Z' },
      ],
      ciSummary: { updates: 6, companies: 3 },
      keywords: Array.from({ length: 8 }, (_, i) => makeKeyword(i)),
      videos: Array.from({ length: 8 }, (_, i) => makeVideo(i + 1)),
      papers: Array.from({ length: 6 }, (_, i) => makePaper(i)),
      articles: Array.from({ length: 12 }, (_, i) => makeArticle(i)),
      meta: { aiUsed: true, ruleBasedMessages: 1, warnings: [], truncated: false },
    },
  };
}

/** 빈 섹션 변형: 키 메시지·영상·기사·CI·키워드가 모두 없음 */
export function makeEmptyBrief(): WeeklyBriefResponse {
  const b = makeFullBrief();
  b.status = 'partial';
  b.payload = {
    ...b.payload,
    header: { ...b.payload.header, counts: { articles: 0, papers: 0, videosNew: 0, videosAnalyzed: 0, ciUpdates: 0, alerts: 0 }, deltas: { articles: null, papers: null, videosNew: null, videosAnalyzed: null, ciUpdates: null, alerts: null } },
    keyMessages: [],
    topVideo: null,
    ciChanges: [],
    ciSummary: { updates: 0, companies: 0 },
    keywords: [],
    videos: [],
    papers: [],
    articles: [],
    meta: { aiUsed: false, ruleBasedMessages: 0, warnings: ['no_data'], truncated: false },
  };
  return b;
}

export function makePartialBrief(): WeeklyBriefResponse {
  const b = makeFullBrief();
  b.status = 'partial';
  b.payload.meta = { aiUsed: false, ruleBasedMessages: 3, warnings: ['ai_disabled'], truncated: false };
  return b;
}
