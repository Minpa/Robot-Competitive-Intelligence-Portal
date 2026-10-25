/**
 * 시계열 서비스의 도메인 분기 — actuator 스코프/집계/캐시 키와 hand 기본값 불변을 검증한다.
 */
import { describe, it, expect } from 'vitest';
import {
  aggregateTimeline,
  rankTopics,
  filterScopeRows,
  buildTimelineSnapshot,
  toTimelineItem,
  matchesTimelinePaper,
  timelineCacheKey,
  timelineInsightCacheKey,
  TIMELINE_CACHE_KEY,
  TIMELINE_INSIGHT_CACHE_KEY,
  TIMELINE_SUPPORTED_DOMAINS,
  PAPER_SQL_TERMS,
  DOMAIN_PAPER_SQL_TERMS,
  ACTUATOR_TIMELINE_PAPER_REGEX,
  type TimelineItem,
} from '../../services/tech-trend-timeline.service.js';
import { DOMAIN_REPORT_CONFIGS, type ArticleRow } from '../../services/tech-trend-report.service.js';
import { getTaxonomy, ACTUATOR_TOPIC_VERSION } from '../../services/domain-topics.js';
import { HAND_TOPIC_IDS_WITH_OTHER } from '../../services/hand-topics.js';
import { buildTimelineInsightPrompt, insightSubjectLabel, type InsightInput } from '../../services/tech-trend-timeline-insight.service.js';

const NOW = new Date('2026-10-14T12:00:00.000Z');
const ACT = getTaxonomy('actuator');

function item(o: Partial<TimelineItem> & { id: string }): TimelineItem {
  return {
    source: 'paper',
    month: '2026-09',
    title: `Title ${o.id}`,
    time: Date.parse('2026-09-15T00:00:00Z'),
    topics: null,
    primary: null,
    attempts: 0,
    views: null,
    focus: null,
    ...o,
  };
}
const cls = (primary: string, topics: string[] = [primary]) => ({ topics, primary });

describe('domain constants', () => {
  it('supports hand and actuator and keeps the hand cache keys', () => {
    expect(TIMELINE_SUPPORTED_DOMAINS).toEqual(['hand', 'actuator']);
    expect(timelineCacheKey('hand')).toBe('tech-trend-timeline:v1:hand');
    expect(timelineCacheKey('hand')).toBe(TIMELINE_CACHE_KEY);
    expect(timelineInsightCacheKey('hand')).toBe(TIMELINE_INSIGHT_CACHE_KEY);
    expect(timelineInsightCacheKey('hand')).toBe('tech-trend-timeline-insight:v2:hand');
    expect(timelineCacheKey('actuator')).toBe('tech-trend-timeline:v1:actuator');
    expect(timelineInsightCacheKey('actuator')).toBe('tech-trend-timeline-insight:v2:actuator');
    expect(DOMAIN_PAPER_SQL_TERMS.hand).toBe(PAPER_SQL_TERMS);
  });
});

describe('actuator paper scope', () => {
  const paperRow = (id: string, title: string, summary = ''): ArticleRow => ({
    id,
    title,
    summary,
    source: 'arxiv',
    publishedAt: '2026-09-01T00:00:00Z',
    collectedAt: '2026-09-02T00:00:00Z',
    extractedMetadata: {},
  });

  it('actuator JS regex is a superset of the report paperRegex and the SQL terms cover both', () => {
    const report = DOMAIN_REPORT_CONFIGS.actuator.paperRegex!;
    const samples = [
      'A novel actuator',
      'brushless motor control',
      'gearbox design',
      'Harmonic drive wear',
      'gear transmission efficiency',
      'joint torque estimation',
      'quasi-direct drive leg',
      'Quasi-Direct-Drive',
      'proprioceptive actuation',
      'series elastic joints',
      'cycloidal reducer',
      'strain wave gear',
      'roller screw knee',
      'ball screw ankle',
      'backdrivable joint',
      'variable stiffness actuation',
      'torque density of motors',
      'integrated joint module',
      'QDD actuator',
      'direct-drive wrist',
      'artificial muscle fibers',
      'planetary gear train',
    ];
    const terms = DOMAIN_PAPER_SQL_TERMS.actuator.map((t) => t.toLowerCase());
    for (const s of samples) {
      if (report.test(s)) expect(ACTUATOR_TIMELINE_PAPER_REGEX.test(s), `superset: ${s}`).toBe(true);
      if (ACTUATOR_TIMELINE_PAPER_REGEX.test(s)) {
        expect(terms.some((t) => s.toLowerCase().includes(t)), `SQL terms must cover: ${s}`).toBe(true);
      }
    }
    expect(samples.filter((s) => report.test(s)).length).toBeGreaterThan(8);
    expect(samples.filter((s) => ACTUATOR_TIMELINE_PAPER_REGEX.test(s)).length).toBe(samples.length);
  });

  it('matchesTimelinePaper: hand unchanged, actuator strips learning/rover/communication idioms', () => {
    expect(matchesTimelinePaper('hand', paperRow('a', 'A tactile gripper'))).toBe(true);
    expect(matchesTimelinePaper('hand', paperRow('b', 'Quasi-direct-drive actuator'))).toBe(false);
    expect(matchesTimelinePaper('actuator', paperRow('c', 'Quasi-direct-drive actuator'))).toBe(true);
    expect(matchesTimelinePaper('actuator', paperRow('d', 'Learning motor skills', 'sensorimotor policies'))).toBe(false);
    expect(matchesTimelinePaper('actuator', paperRow('e', 'Planetary rover navigation'))).toBe(false);
    expect(matchesTimelinePaper('actuator', paperRow('f', 'Low-latency data transmission for teleop'))).toBe(false);
    expect(matchesTimelinePaper('actuator', paperRow('g', 'Motor skills with a high torque density motor'))).toBe(true);
    expect(matchesTimelinePaper('actuator', paperRow('h', 'A tactile gripper'))).toBe(false);
  });

  it('filterScopeRows(actuator) uses the actuator paper filter, topic/topics video match and domainFocus.actuator', () => {
    const videoRow = (id: string, meta: Record<string, unknown>): ArticleRow => ({
      id,
      title: `Video ${id}`,
      productType: 'video',
      source: 'youtube',
      publishedAt: '2026-09-01T00:00:00Z',
      collectedAt: '2026-09-02T00:00:00Z',
      extractedMetadata: meta,
    });
    const scope = filterScopeRows(
      [paperRow('act', 'Cycloidal actuator for legged robots'), paperRow('hand', 'Dexterous hand grasping')],
      [
        videoRow('topic', { domain: 'topic-search', topic: 'actuator', topics: ['actuator'] }),
        videoRow('topics', { domain: 'hand', topic: 'hand', topics: ['hand', 'actuator'] }),
        videoRow('none', { domain: 'actuator', domainFocus: { actuator: { level: 'none' } } }),
        videoRow('hand-none', { domain: 'actuator', domainFocus: { hand: { level: 'none' } } }), // 핸드 판정은 actuator 스코프에 영향 없음
        videoRow('other', { domain: 'hand' }),
      ],
      'actuator'
    );
    expect(scope.papers.map((p) => p.id)).toEqual(['act']);
    expect(scope.videos.map((v) => v.id).sort()).toEqual(['hand-none', 'topic', 'topics']);
    expect(scope.videosExcludedByFocus).toBe(1);
    expect(scope.videosPendingJudgement).toBe(3);
  });

  it('filterScopeRows default (hand) is unchanged', () => {
    const a = filterScopeRows([paperRow('x', 'A tactile gripper')], []);
    const b = filterScopeRows([paperRow('x', 'A tactile gripper')], [], 'hand');
    expect(a).toEqual(b);
    expect(a.papers).toHaveLength(1);
  });
});

describe('actuator aggregation', () => {
  const months = ['2026-08', '2026-09', '2026-10'];
  const items: TimelineItem[] = [
    item({ id: 'p1', month: '2026-08', ...cls('qdd_direct_drive', ['qdd_direct_drive', 'motor_design']) }),
    item({ id: 'p2', month: '2026-08', ...cls('off_topic') }),
    item({ id: 'p3', month: '2026-09' }),
    item({ id: 'v1', source: 'video', month: '2026-09', ...cls('integration_modular') }),
  ];

  it('uses the actuator topic ids in every bucket and the actuator version', () => {
    const { buckets, classification } = aggregateTimeline(items, months, NOW, '2026-08', 'actuator');
    expect(Object.keys(buckets[0]!.papers.byTopic).sort()).toEqual([...ACT.idsWithOther].sort());
    expect(Object.keys(buckets[0]!.papers.byTopic)).not.toContain('tactile_force');
    expect(buckets[0]!.papers.byTopic.qdd_direct_drive).toEqual({ any: 1, primary: 1 });
    expect(buckets[0]!.papers.byTopic.motor_design).toEqual({ any: 1, primary: 0 });
    expect(buckets[0]!.papers.offTopic).toBe(1);
    expect(buckets[1]!.videos.byTopic.integration_modular).toEqual({ any: 1, primary: 1 });
    expect(classification).toMatchObject({ total: 4, classified: 3, offTopic: 1, unclassified: 1, version: ACTUATOR_TOPIC_VERSION });
    for (const b of buckets) {
      for (const src of [b.papers, b.videos]) {
        const sumPrimary = Object.values(src.byTopic).reduce((s, c) => s + c.primary, 0);
        expect(sumPrimary + src.unclassified).toBe(src.total);
      }
    }
  });

  it('default domain is hand (byTopic keys unchanged)', () => {
    const { buckets } = aggregateTimeline([], months, NOW, '2026-08');
    expect(Object.keys(buckets[0]!.papers.byTopic).sort()).toEqual([...HAND_TOPIC_IDS_WITH_OTHER].sort());
  });

  it('rankTopics(actuator) orders actuator core topics with other last', () => {
    const ranked = rankTopics({ linear_screw: 5, motor_design: 5, qdd_direct_drive: 1 }, 'actuator');
    expect(ranked).toHaveLength(11);
    expect(ranked.slice(0, 3).map((r) => r.id)).toEqual(['linear_screw', 'motor_design', 'qdd_direct_drive']);
    expect(ranked[10]).toEqual({ id: 'other', order: 10, colorIndex: null });
    expect(ranked.map((r) => r.id)).not.toContain('tactile_force');
  });
});

describe('actuator snapshot', () => {
  const stored = (primary: string, topics: string[] = [primary]) => ({
    domainTopics: { actuator: { topics, primary, classifiedAt: '2026-10-01T00:00:00Z', version: ACTUATOR_TOPIC_VERSION } },
  });
  const mkPaper = (id: string, published: string, meta: Record<string, unknown> = {}): ArticleRow => ({
    id,
    title: `Actuator paper ${id}`,
    summary: 'gearbox',
    source: 'arxiv',
    publishedAt: published,
    collectedAt: published,
    extractedMetadata: meta,
  });
  const mkVideo = (id: string, published: string, meta: Record<string, unknown> = {}): ArticleRow => ({
    id,
    title: `Video ${id}`,
    productType: 'video',
    source: 'youtube',
    publishedAt: published,
    collectedAt: published,
    extractedMetadata: { domain: 'actuator', ...meta },
  });

  it('reads domainTopics.actuator, ignores handTopics, and labels topics from the actuator taxonomy', () => {
    const scope = {
      papers: [
        mkPaper('p1', '2026-06-10T00:00:00Z', stored('harmonic_strain_wave')),
        mkPaper('p2', '2026-07-10T00:00:00Z', { handTopics: { topics: ['tactile_force'], primary: 'tactile_force', classifiedAt: 'x', version: 1 } }),
        mkPaper('p3', '2026-09-10T00:00:00Z', { ...stored('linear_screw', ['linear_screw', 'harmonic_strain_wave']), domainTopicsAttempts: { actuator: 1 } }),
      ],
      videos: [mkVideo('v1', '2026-07-01T00:00:00Z', { ...stored('integration_modular'), domainFocus: { actuator: { level: 'primary' } } })],
      videosExcludedByFocus: 0,
      videosPendingJudgement: 0,
    };
    const { body } = buildTimelineSnapshot(scope, NOW, false, 'actuator');
    expect(body.domain).toBe('actuator');
    expect(body.classification).toMatchObject({ total: 4, classified: 3, unclassified: 1, version: ACTUATOR_TOPIC_VERSION });
    expect(body.topics).toHaveLength(11);
    expect(body.topics[0]!.id).toBe('harmonic_strain_wave'); // any: p1 + p3 = 2
    expect(body.topics[0]!.label).toBe('하모닉·스트레인웨이브 감속');
    expect(body.topics[10]!.id).toBe('other');
    expect(body.topics.map((t) => t.id)).not.toContain('tactile_force');
    expect(body.heatmap.rows.map((r) => r.topicId)).toEqual(body.topics.map((t) => t.id));

    const v = toTimelineItem(scope.videos[0]!, 'video', NOW, 'actuator')!;
    expect(v.focus).toBe('primary');
    expect(v.primary).toBe('integration_modular');
    const p3 = toTimelineItem(scope.papers[2]!, 'paper', NOW, 'actuator')!;
    expect(p3.attempts).toBe(1);
    // 같은 행을 hand 로 읽으면 미분류
    expect(toTimelineItem(scope.papers[0]!, 'paper', NOW, 'hand')!.topics).toBeNull();
  });

  it('hand snapshot default still reports domain hand', () => {
    const { body } = buildTimelineSnapshot({ papers: [], videos: [], videosExcludedByFocus: 0, videosPendingJudgement: 0 }, NOW);
    expect(body.domain).toBe('hand');
  });
});

describe('insight prompt domain label', () => {
  const input: InsightInput = {
    period: { startMonth: '2026-05', endMonth: '2026-10', monthCount: 6, completeMonthCount: 5 },
    granularity: 'month',
    shortPeriod: false,
    columns: [],
    topics: [],
    risingCandidates: [],
    decliningCandidates: [],
    allowedTitles: [],
  };

  it('hand prompt is unchanged and actuator prompt names the actuator subject', () => {
    const hand = buildTimelineInsightPrompt(input);
    expect(hand).toBe(buildTimelineInsightPrompt(input, 'hand'));
    expect(hand.startsWith('다음은 로봇 핸드 분야 논문(arXiv, 연구 신호)')).toBe(true);
    const act = buildTimelineInsightPrompt(input, 'actuator');
    expect(act.startsWith(`다음은 ${insightSubjectLabel('actuator')} 분야 논문(arXiv, 연구 신호)`)).toBe(true);
    expect(insightSubjectLabel('actuator')).toContain('액추에이터');
    expect(act.replace(insightSubjectLabel('actuator'), '로봇 핸드')).toBe(hand); // 분야 표기 외에는 동일
  });
});
