import { describe, it, expect } from 'vitest';
import {
  monthKey,
  buildMonthRange,
  addMonths,
  resolveRange,
  aggregateTimeline,
  rankTopics,
  computeTrendStat,
  computeLeadLag,
  trendWindowSize,
  monthlyAverage,
  isLowVolume,
  selectRepresentatives,
  buildHeatmap,
  chooseGranularity,
  filterScopeRows,
  buildTimelineSnapshot,
  toTimelineItem,
  PAPER_SQL_TERMS,
  type TimelineItem,
} from '../../services/tech-trend-timeline.service.js';
import { DOMAIN_REPORT_CONFIGS, type ArticleRow } from '../../services/tech-trend-report.service.js';
import { HAND_TOPIC_IDS_WITH_OTHER, HAND_CORE_TOPIC_IDS, HAND_TOPIC_VERSION } from '../../services/hand-topics.js';

const NOW = new Date('2026-10-14T12:00:00.000Z');

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

describe('monthKey', () => {
  it('uses UTC month boundaries', () => {
    expect(monthKey('2026-09-30T23:59:00Z', null, NOW)).toBe('2026-09');
    expect(monthKey('2026-10-01T00:00:00Z', null, NOW)).toBe('2026-10');
  });
  it('falls back to collected when published is null/invalid; null when both missing', () => {
    expect(monthKey(null, '2026-07-05T00:00:00Z', NOW)).toBe('2026-07');
    expect(monthKey('not-a-date', '2026-07-05T00:00:00Z', NOW)).toBe('2026-07');
    expect(monthKey(null, null, NOW)).toBeNull();
  });
  it('clamps future dates to the current month', () => {
    expect(monthKey('2027-03-01T00:00:00Z', null, NOW)).toBe('2026-10');
    expect(monthKey(new Date('2026-10-30T00:00:00Z'), null, NOW)).toBe('2026-10');
  });
});

describe('buildMonthRange / addMonths', () => {
  it('handles year boundaries inclusively', () => {
    expect(buildMonthRange('2025-11', '2026-02')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });
  it('single month and reversed range', () => {
    expect(buildMonthRange('2026-05', '2026-05')).toEqual(['2026-05']);
    expect(buildMonthRange('2026-06', '2026-05')).toEqual([]);
  });
  it('addMonths crosses years in both directions', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2025-12', 1)).toBe('2026-01');
    expect(addMonths('2026-06', -12)).toBe('2025-06');
  });
});

describe('resolveRange', () => {
  it('starts at the minimum month and ends at the current month', () => {
    const r = resolveRange([{ month: '2026-08' }, { month: '2026-06' }, { month: '2026-09' }], NOW, {
      maxBackfillMonths: 12,
      collectionStartMonth: '2026-06',
    });
    expect(r).toEqual({ range: { startMonth: '2026-06', endMonth: '2026-10' }, dropped: 0 });
  });
  it('drops items more than 12 months before the collection start and counts them', () => {
    const r = resolveRange([{ month: '2025-05' }, { month: '2025-06' }, { month: '2026-06' }], NOW, {
      maxBackfillMonths: 12,
      collectionStartMonth: '2026-06',
    });
    expect(r.dropped).toBe(1); // 2025-05 < 2025-06 cutoff
    expect(r.range?.startMonth).toBe('2025-06');
  });
  it('returns null range for empty input (and when everything is dropped)', () => {
    expect(resolveRange([], NOW, { maxBackfillMonths: 12, collectionStartMonth: null })).toEqual({ range: null, dropped: 0 });
    const all = resolveRange([{ month: '2020-01' }], NOW, { maxBackfillMonths: 12, collectionStartMonth: '2026-06' });
    expect(all).toEqual({ range: null, dropped: 1 });
  });
});

describe('aggregateTimeline', () => {
  const months = ['2026-08', '2026-09', '2026-10'];
  const items: TimelineItem[] = [
    // papers
    item({ id: 'p1', month: '2026-08', ...cls('tactile_force', ['tactile_force', 'sim2real']) }),
    item({ id: 'p2', month: '2026-08', ...cls('sim2real') }),
    item({ id: 'p3', month: '2026-09' }), // unclassified
    item({ id: 'p4', month: '2026-09', ...cls('off_topic') }),
    item({ id: 'p5', month: '2026-09', attempts: 3 }), // failed
    // videos
    item({ id: 'v1', source: 'video', month: '2026-09', ...cls('humanoid_integration', ['humanoid_integration', 'dexterous_hw']) }),
    item({ id: 'v2', source: 'video', month: '2026-10', ...cls('other') }),
  ];

  const { buckets, classification } = aggregateTimeline(items, months, NOW, '2026-08');

  it('is continuous with empty months zero-filled and the current month partial', () => {
    expect(buckets.map((b) => b.month)).toEqual(months);
    expect(buckets.map((b) => b.partial)).toEqual([false, false, true]);
    expect(buckets[2]!.papers.total).toBe(0);
    expect(Object.keys(buckets[0]!.papers.byTopic).sort()).toEqual([...HAND_TOPIC_IDS_WITH_OTHER].sort());
  });

  it('counts multi-topic items in any for each topic but in primary only for the primary topic', () => {
    const aug = buckets[0]!.papers;
    expect(aug.byTopic.tactile_force).toEqual({ any: 1, primary: 1 });
    expect(aug.byTopic.sim2real).toEqual({ any: 2, primary: 1 });
    const sepV = buckets[1]!.videos;
    expect(sepV.byTopic.dexterous_hw).toEqual({ any: 1, primary: 0 });
    expect(sepV.byTopic.humanoid_integration).toEqual({ any: 1, primary: 1 });
  });

  it('puts unclassified rows only in total/unclassified and off_topic out of total', () => {
    const sep = buckets[1]!.papers;
    expect(sep.total).toBe(2); // p3 + p5 (p4 is off_topic)
    expect(sep.unclassified).toBe(2);
    expect(sep.offTopic).toBe(1);
    for (const c of Object.values(sep.byTopic)) expect(c).toEqual({ any: 0, primary: 0 });
  });

  it('keeps papers and videos separate', () => {
    expect(buckets[1]!.videos.total).toBe(1);
    expect(buckets[2]!.videos.total).toBe(1);
    expect(buckets[2]!.papers.total).toBe(0);
  });

  it('keeps the invariant sum(primary) + unclassified = total in every bucket and source', () => {
    for (const b of buckets) {
      for (const src of [b.papers, b.videos]) {
        const sumPrimary = Object.values(src.byTopic).reduce((s, c) => s + c.primary, 0);
        expect(sumPrimary + src.unclassified).toBe(src.total);
      }
    }
  });

  it('computes classification summary', () => {
    expect(classification).toMatchObject({
      total: 7,
      classified: 5, // p1 p2 p4(off) v1 v2
      offTopic: 1,
      unclassified: 2,
      failed: 1,
      version: HAND_TOPIC_VERSION,
      papers: { total: 5, classified: 3 },
      videos: { total: 2, classified: 2 },
    });
    expect(classification.ratio).toBeCloseTo(5 / 7, 6);
  });

  it('has ratio 0 (no NaN) for empty input and marks beforeCollection months', () => {
    const empty = aggregateTimeline([], months, NOW, '2026-09');
    expect(empty.classification.ratio).toBe(0);
    expect(Number.isNaN(empty.classification.ratio)).toBe(false);
    expect(empty.buckets.map((b) => b.beforeCollection)).toEqual([true, false, false]);
    expect(aggregateTimeline([], [], NOW, null).buckets).toEqual([]);
  });
});

describe('rankTopics', () => {
  it('orders by total desc with ties in taxonomy order, other last', () => {
    const ranked = rankTopics({ sim2real: 5, tactile_force: 5, dexterous_hw: 1, other: 99 });
    expect(ranked.slice(0, 3).map((r) => r.id)).toEqual(['tactile_force', 'sim2real', 'dexterous_hw']);
    expect(ranked).toHaveLength(11);
    expect(ranked[10]).toEqual({ id: 'other', order: 10, colorIndex: null });
    expect(ranked.map((r) => r.order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
  it('gives colorIndex 0-5 only to the top six non-empty topics', () => {
    const totals: Record<string, number> = {};
    HAND_CORE_TOPIC_IDS.forEach((id, i) => (totals[id] = 10 - i)); // all >0
    const ranked = rankTopics(totals);
    expect(ranked.filter((r) => r.colorIndex !== null).map((r) => r.colorIndex)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(ranked[6]!.colorIndex).toBeNull();
    // zero-total topics never get a color
    expect(rankTopics({ sim2real: 3 }).filter((r) => r.colorIndex !== null)).toHaveLength(1);
  });
});

describe('computeTrendStat', () => {
  const months = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9'];

  it('rising at the boundary delta>=2 && rate>=0.5', () => {
    // cm=2 -> window 1; prior 4, recent 6 -> delta 2, rate 0.5
    const s = computeTrendStat([4, 6, 0], 2, months);
    expect(s).toMatchObject({ recent: 6, prior: 4, delta: 2, label: 'rising', emerging: false });
    expect(s.rate).toBeCloseTo(0.5, 6);
    // prior 5, recent 7 -> rate 0.4 -> steady
    expect(computeTrendStat([5, 7, 0], 2).label).toBe('steady');
    // delta 1 only
    expect(computeTrendStat([1, 2, 0], 2).label).toBe('steady');
  });

  it('falling at the boundary delta<=-2 && rate<=-0.4', () => {
    expect(computeTrendStat([5, 3, 0], 2).label).toBe('falling'); // -2, -0.4
    expect(computeTrendStat([6, 4, 0], 2).label).toBe('steady'); // -2, -0.33
    expect(computeTrendStat([3, 2, 0], 2).label).toBe('steady'); // -1
  });

  it('insufficient when recent+prior<3 or completeMonths<2', () => {
    expect(computeTrendStat([1, 1, 0], 2).label).toBe('insufficient');
    expect(computeTrendStat([0, 2, 0], 2).label).toBe('insufficient');
    expect(computeTrendStat([5, 0], 1).label).toBe('insufficient');
    expect(computeTrendStat([], 0)).toMatchObject({ label: 'insufficient', recent: 0, prior: 0, rate: null, peakMonth: null });
  });

  it('flags emerging when prior=0 and recent>=3', () => {
    const s = computeTrendStat([0, 3, 0], 2);
    expect(s).toMatchObject({ emerging: true, label: 'rising', prior: 0, recent: 3 });
    expect(s.rate).toBe(3); // prior=0 protected by max(prior,1)
    expect(computeTrendStat([0, 2, 0], 2).emerging).toBe(false);
  });

  it('ignores the in-progress (last, incomplete) month', () => {
    const s = computeTrendStat([1, 3, 100], 2, months);
    expect(s.recent).toBe(3);
    expect(s.prior).toBe(1);
  });

  it('window size grows with complete months: 2->1, 4->2, 6->3, 8->3', () => {
    expect(trendWindowSize(2)).toBe(1);
    expect(trendWindowSize(3)).toBe(1);
    expect(trendWindowSize(4)).toBe(2);
    expect(trendWindowSize(6)).toBe(3);
    expect(trendWindowSize(8)).toBe(3);
    expect(trendWindowSize(1)).toBe(1);
    const s8 = computeTrendStat([1, 2, 3, 4, 5, 6, 7, 8, 0], 8);
    expect(s8.recent).toBe(6 + 7 + 8);
    expect(s8.prior).toBe(3 + 4 + 5);
    const s4 = computeTrendStat([1, 2, 3, 4, 0], 4);
    expect(s4.recent).toBe(3 + 4);
    expect(s4.prior).toBe(1 + 2);
    const s6 = computeTrendStat([1, 2, 3, 4, 5, 6, 0], 6);
    expect(s6.recent).toBe(4 + 5 + 6);
    expect(s6.prior).toBe(1 + 2 + 3);
    const s2 = computeTrendStat([2, 5, 0], 2);
    expect(s2.recent).toBe(5);
    expect(s2.prior).toBe(2);
  });

  it('picks the earliest month on peak ties and reports the first non-zero month', () => {
    const s = computeTrendStat([0, 2, 5, 5, 1], 4, months);
    expect(s.peakMonth).toBe('m3');
    expect(s.firstMonth).toBe('m2');
  });

  it('lowVolume boundary: avg 0.99 is low, 1.0 is not', () => {
    expect(isLowVolume(0.99)).toBe(true);
    expect(isLowVolume(1.0)).toBe(false);
    expect(isLowVolume(monthlyAverage(99, 100))).toBe(true);
    expect(isLowVolume(monthlyAverage(4, 4))).toBe(false);
    expect(monthlyAverage(5, 0)).toBe(5); // no complete month yet -> divide by 1
  });
});

describe('computeLeadLag', () => {
  it('paper_leads with lag 2', () => {
    expect(computeLeadLag([1, 5, 1, 0, 0], [0, 0, 1, 5, 1], 4)).toEqual({ relation: 'paper_leads', lagMonths: 2 });
  });
  it('video_leads', () => {
    expect(computeLeadLag([0, 0, 1, 5, 1], [1, 5, 1, 0, 0], 4)).toEqual({ relation: 'video_leads', lagMonths: 2 });
  });
  it('concurrent when peaks coincide', () => {
    expect(computeLeadLag([1, 5, 1, 0], [0, 6, 1, 0], 4)).toEqual({ relation: 'concurrent', lagMonths: 0 });
  });
  it('undetermined when a side has fewer than 5 items or fewer than 4 complete months', () => {
    expect(computeLeadLag([1, 3, 0, 0], [0, 0, 1, 5], 4)).toEqual({ relation: 'undetermined', lagMonths: null }); // papers sum 4
    expect(computeLeadLag([1, 5, 1, 0], [0, 0, 1, 3], 4).relation).toBe('undetermined'); // videos sum 4
    expect(computeLeadLag([1, 5, 1, 0], [0, 0, 1, 5], 3).relation).toBe('undetermined'); // cm 3
    expect(computeLeadLag([], [], 0).relation).toBe('undetermined');
  });
});

describe('selectRepresentatives', () => {
  const range = { months: ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10'], completeMonths: 4 }; // window 2: 08, 09
  const T = (id: string, month: string, extra: Partial<TimelineItem> = {}) =>
    item({ id, month, ...cls('sim2real'), time: Date.parse(`${month}-10T00:00:00Z`), ...extra });

  const papers = [
    T('p-first', '2026-06'),
    T('p-peak-a', '2026-07', { time: Date.parse('2026-07-20T00:00:00Z') }),
    T('p-peak-b', '2026-07', { time: Date.parse('2026-07-10T00:00:00Z') }),
    T('p-peak-c', '2026-07', { time: Date.parse('2026-07-01T00:00:00Z') }),
    T('p-rec-1', '2026-09', { time: Date.parse('2026-09-28T00:00:00Z') }),
    T('p-rec-2', '2026-08', { time: Date.parse('2026-08-02T00:00:00Z') }),
    T('p-rec-3', '2026-09', { time: Date.parse('2026-09-01T00:00:00Z') }),
  ];

  it('returns first + peak top2 + recent top2 without duplicates, deterministically', () => {
    const a = selectRepresentatives(papers, 'sim2real', 'paper', range);
    const b = selectRepresentatives([...papers].reverse(), 'sim2real', 'paper', range);
    expect(a.map((r) => r.id)).toEqual(['p-first', 'p-peak-a', 'p-peak-b', 'p-rec-1', 'p-rec-3']);
    expect(b).toEqual(a);
    expect(new Set(a.map((r) => r.id)).size).toBe(a.length);
    expect(a.length).toBeLessThanOrEqual(5);
  });

  it('does not repeat an item that is both first and in the peak month', () => {
    const only = [T('x1', '2026-06', { time: 3 }), T('x2', '2026-06', { time: 2 }), T('x3', '2026-06', { time: 1 })];
    const r = selectRepresentatives(only, 'sim2real', 'paper', range);
    expect(r.map((x) => x.id)).toEqual(['x1', 'x2', 'x3']);
  });

  it('prefers items whose primary topic matches', () => {
    const items = [
      T('multi-new', '2026-06', { topics: ['tactile_force', 'sim2real'], primary: 'tactile_force', time: 999 }),
      T('primary-old', '2026-06', { time: 1 }),
    ];
    expect(selectRepresentatives(items, 'sim2real', 'paper', range)[0]!.id).toBe('primary-old');
  });

  it('truncates titles to 90 chars and excludes off_topic / unclassified / other sources / other topics', () => {
    const items = [
      T('long', '2026-06', { title: 'x'.repeat(200) }),
      item({ id: 'off', month: '2026-06', ...cls('off_topic') }),
      item({ id: 'unc', month: '2026-06' }),
      T('vid', '2026-06', { source: 'video' }),
      item({ id: 'othertopic', month: '2026-06', ...cls('tactile_force') }),
    ];
    const r = selectRepresentatives(items, 'sim2real', 'paper', range);
    expect(r.map((x) => x.id)).toEqual(['long']);
    expect(r[0]!.title).toHaveLength(90);
  });

  it('orders videos by focus primary then views (views used for selection only)', () => {
    const items = [
      T('v-low', '2026-06', { source: 'video', views: 10, focus: 'primary' }),
      T('v-high-secondary', '2026-06', { source: 'video', views: 99999, focus: 'secondary' }),
      T('v-mid-primary', '2026-06', { source: 'video', views: 500, focus: 'primary' }),
      T('v-none', '2026-06', { source: 'video', views: null, focus: null }),
    ];
    const r = selectRepresentatives(items, 'sim2real', 'video', range);
    expect(r[0]!.id).toBe('v-mid-primary');
    expect(r[0]).not.toHaveProperty('views');
    // tie-break by id when everything else is equal
    const ties = [T('b', '2026-06', { source: 'video' }), T('a', '2026-06', { source: 'video' })];
    expect(selectRepresentatives(ties, 'sim2real', 'video', range).map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('returns [] when nothing matches', () => {
    expect(selectRepresentatives([], 'sim2real', 'paper', range)).toEqual([]);
  });
});

describe('buildHeatmap / chooseGranularity', () => {
  const mk = (months: string[], nowDate: Date) => {
    const items = months.map((m, i) =>
      item({ id: `i${i}`, month: m, ...cls('sim2real', ['sim2real', 'tactile_force']) })
    );
    return aggregateTimeline(items, months, nowDate, months[0]!).buckets;
  };

  it('uses months for 12 and switches to quarters at 13', () => {
    expect(chooseGranularity(12)).toBe('month');
    expect(chooseGranularity(13)).toBe('quarter');
    const twelve = buildMonthRange('2025-11', '2026-10');
    expect(twelve).toHaveLength(12);
    expect(buildHeatmap(mk(twelve, NOW), HAND_TOPIC_IDS_WITH_OTHER, chooseGranularity(12)).columns).toHaveLength(12);
    const thirteen = buildMonthRange('2025-10', '2026-10');
    const hm = buildHeatmap(mk(thirteen, NOW), HAND_TOPIC_IDS_WITH_OTHER, chooseGranularity(13));
    expect(hm.granularity).toBe('quarter');
    expect(hm.columns.map((c) => c.key)).toEqual(['2025-Q4', '2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4']);
    expect(hm.columns.map((c) => c.label)).toEqual(['2025 Q4', '2026 Q1', '2026 Q2', '2026 Q3', '2026 Q4']);
  });

  it('marks the column containing the current month as partial', () => {
    const months = buildMonthRange('2026-07', '2026-10');
    const month = buildHeatmap(mk(months, NOW), HAND_TOPIC_IDS_WITH_OTHER, 'month');
    expect(month.columns.map((c) => c.partial)).toEqual([false, false, false, true]);
    expect(month.columns[0]!.label).toBe('26.07');
    const q = buildHeatmap(mk(months, NOW), HAND_TOPIC_IDS_WITH_OTHER, 'quarter');
    expect(q.columns.map((c) => [c.key, c.partial])).toEqual([
      ['2026-Q3', false],
      ['2026-Q4', true],
    ]);
  });

  it('row sums equal the bucket sums for both granularities and rows follow the given order', () => {
    const months = buildMonthRange('2025-10', '2026-10');
    const buckets = mk(months, NOW);
    for (const g of ['month', 'quarter'] as const) {
      const hm = buildHeatmap(buckets, HAND_TOPIC_IDS_WITH_OTHER, g);
      expect(hm.rows.map((r) => r.topicId)).toEqual([...HAND_TOPIC_IDS_WITH_OTHER]);
      const sim = hm.rows.find((r) => r.topicId === 'sim2real')!;
      expect(sim.papers.any.reduce((a, b) => a + b, 0)).toBe(months.length);
      expect(sim.papers.primary.reduce((a, b) => a + b, 0)).toBe(months.length);
      const tac = hm.rows.find((r) => r.topicId === 'tactile_force')!;
      expect(tac.papers.any.reduce((a, b) => a + b, 0)).toBe(months.length);
      expect(tac.papers.primary.reduce((a, b) => a + b, 0)).toBe(0);
      expect(sim.videos.any.every((v) => v === 0)).toBe(true);
    }
  });
});

describe('scope filtering', () => {
  const paperRow = (id: string, title: string, summary = ''): ArticleRow => ({
    id,
    title,
    summary,
    source: 'arxiv',
    publishedAt: '2026-09-01T00:00:00Z',
    collectedAt: '2026-09-02T00:00:00Z',
    extractedMetadata: {},
  });
  const videoRow = (id: string, meta: Record<string, unknown>): ArticleRow => ({
    id,
    title: `Video ${id}`,
    productType: 'video',
    source: 'youtube',
    publishedAt: '2026-09-01T00:00:00Z',
    collectedAt: '2026-09-02T00:00:00Z',
    extractedMetadata: meta,
  });

  it('keeps unjudged videos, drops focus none, and counts both', () => {
    const scope = filterScopeRows(
      [],
      [
        videoRow('none', { domain: 'hand', domainFocus: { hand: { level: 'none' } } }),
        videoRow('prim', { domain: 'hand', domainFocus: { hand: { level: 'primary' } } }),
        videoRow('pend', { domain: 'hand' }),
        videoRow('other-domain', { domain: 'actuator' }),
      ]
    );
    expect(scope.videos.map((v) => v.id).sort()).toEqual(['pend', 'prim']);
    expect(scope.videosExcludedByFocus).toBe(1);
    expect(scope.videosPendingJudgement).toBe(1);
  });

  it('drops papers that fail the JS paperRegex re-check', () => {
    const scope = filterScopeRows(
      [
        paperRow('hit', 'A tactile gripper'),
        paperRow('miss', 'Handbook of locomotion', 'a study of quadruped gaits'), // SQL ILIKE '%hand%' passes, JS \bhand\b fails
      ],
      []
    );
    expect(scope.papers.map((p) => p.id)).toEqual(['hit']);
  });

  it('SQL ILIKE terms are a superset of the JS paperRegex', () => {
    const samples = [
      'Hand pose estimation',
      'in-hand reorientation with RL',
      'In-Hand manipulation',
      'Dexterous grasping',
      'DEXTEROUS',
      'a soft gripper design',
      'Gripper',
      'finger kinematics',
      'Fingertip force',
      'tactile skin',
      'Tactile',
      'grasp synthesis',
      'Grasping objects',
      'manipulation policies',
      'Manipulator control',
      'on the other hand, we',
      'a robotic hand',
    ];
    const regex = DOMAIN_REPORT_CONFIGS.hand.paperRegex!;
    const terms = PAPER_SQL_TERMS.map((t) => t.toLowerCase());
    for (const s of samples) {
      if (regex.test(s)) {
        expect(terms.some((t) => s.toLowerCase().includes(t)), `SQL terms must cover: ${s}`).toBe(true);
      }
    }
    // sanity: the sample set really exercises the regex
    expect(samples.filter((s) => regex.test(s)).length).toBeGreaterThan(10);
  });
});

describe('buildTimelineSnapshot', () => {
  const mkPaper = (id: string, published: string, meta: Record<string, unknown> = {}): ArticleRow => ({
    id,
    title: `Tactile paper ${id}`,
    summary: 'tactile',
    source: 'arxiv',
    publishedAt: published,
    collectedAt: published,
    extractedMetadata: meta,
  });
  const mkVideo = (id: string, published: string, collected: string, meta: Record<string, unknown> = {}): ArticleRow => ({
    id,
    title: `Video ${id}`,
    productType: 'video',
    source: 'youtube',
    publishedAt: published,
    collectedAt: collected,
    extractedMetadata: { domain: 'hand', ...meta },
  });
  const stored = (primary: string, topics: string[] = [primary]) => ({
    handTopics: { topics, primary, classifiedAt: '2026-10-01T00:00:00Z', version: HAND_TOPIC_VERSION },
  });

  it('returns period=null / buckets=[] and zeroed (NaN-free) output for an empty scope', () => {
    const snap = buildTimelineSnapshot({ papers: [], videos: [], videosExcludedByFocus: 0, videosPendingJudgement: 0 }, NOW);
    expect(snap.body.period).toBeNull();
    expect(snap.body.buckets).toEqual([]);
    expect(snap.body.classification.ratio).toBe(0);
    expect(snap.body.topics).toHaveLength(11);
    expect(snap.body.heatmap.columns).toEqual([]);
  });

  it('builds a continuous range ending at the current partial month and keeps invariants', () => {
    const scope = {
      papers: [
        mkPaper('p1', '2026-06-10T00:00:00Z', stored('tactile_force')),
        mkPaper('p2', '2026-06-20T00:00:00Z', stored('off_topic')),
        mkPaper('p3', '2026-09-10T00:00:00Z'),
        mkPaper('p4', '2026-09-11T00:00:00Z', { ...stored('sim2real', ['sim2real', 'tactile_force']), handTopicsAttempts: 1 }),
      ],
      videos: [mkVideo('v1', '2026-07-01T00:00:00Z', '2026-07-02T00:00:00Z', stored('humanoid_integration'))],
      videosExcludedByFocus: 2,
      videosPendingJudgement: 1,
    };
    const { body, completeMonths } = buildTimelineSnapshot(scope, NOW, false);
    expect(body.period).toMatchObject({
      startMonth: '2026-06',
      endMonth: '2026-10',
      monthCount: 5,
      completeMonthCount: 4,
      granularity: 'month',
    });
    expect(completeMonths).toBe(4);
    expect(body.period!.collectionStartedAt).toBe('2026-06-10T00:00:00.000Z');
    expect(body.buckets.map((b) => b.month)).toEqual(['2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    expect(body.buckets.at(-1)!.partial).toBe(true);
    expect(body.buckets.slice(0, -1).every((b) => !b.partial)).toBe(true);
    for (const b of body.buckets) {
      for (const src of [b.papers, b.videos]) {
        const sumPrimary = Object.values(src.byTopic).reduce((s, c) => s + c.primary, 0);
        expect(sumPrimary + src.unclassified).toBe(src.total);
      }
    }
    expect(body.classification).toMatchObject({ total: 5, classified: 4, offTopic: 1, unclassified: 1, failed: 0 });
    expect(body.scope).toEqual({
      videosExcludedByFocus: 2,
      videosPendingJudgement: 1,
      beforeRangeDropped: 0,
      truncated: false,
    });
    // topics ordered by combined total desc, other last, color indices on the top ones
    expect(body.topics).toHaveLength(11);
    expect(body.topics[10]!.id).toBe('other');
    expect(body.topics[0]!.id).toBe('tactile_force'); // any: p1 + p4 = 2 beats the 1-count topics
    expect(body.topics[0]!.colorIndex).toBe(0);
    expect(body.heatmap.rows).toHaveLength(11);
    expect(body.heatmap.rows.map((r) => r.topicId)).toEqual(body.topics.map((t) => t.id));
    // totals consistency: topic totals == sum of bucket values
    const tac = body.topics.find((t) => t.id === 'tactile_force')!;
    expect(tac.totals.papers).toEqual({ any: 2, primary: 1 });
  });

  it('drops items more than 12 months before the collection start and counts them', () => {
    const scope = {
      papers: [mkPaper('p-ok', '2026-06-10T00:00:00Z')],
      videos: [mkVideo('v-old', '2024-01-01T00:00:00Z', '2026-06-12T00:00:00Z')],
      videosExcludedByFocus: 0,
      videosPendingJudgement: 0,
    };
    const { body } = buildTimelineSnapshot(scope, NOW);
    expect(body.scope.beforeRangeDropped).toBe(1);
    expect(body.period!.startMonth).toBe('2026-06');
    expect(body.classification.total).toBe(1);
  });

  it('propagates the truncated flag', () => {
    const { body } = buildTimelineSnapshot(
      { papers: [], videos: [], videosExcludedByFocus: 0, videosPendingJudgement: 0 },
      NOW,
      true
    );
    expect(body.scope.truncated).toBe(true);
  });
});

describe('toTimelineItem', () => {
  it('treats old-version stored values as unclassified and reads attempts', () => {
    const row: ArticleRow = {
      id: 'x',
      title: 'T &amp; U',
      publishedAt: '2026-09-01T00:00:00Z',
      extractedMetadata: {
        handTopics: { topics: ['sim2real'], primary: 'sim2real', classifiedAt: 'z', version: 0 },
        handTopicsAttempts: 2,
        views: 1234,
      },
    };
    const it1 = toTimelineItem(row, 'video', NOW)!;
    expect(it1.topics).toBeNull();
    expect(it1.attempts).toBe(2);
    expect(it1.title).toBe('T & U');
    expect(it1.views).toBe(1234);
    expect(toTimelineItem({ id: 'y', title: 't' }, 'paper', NOW)).toBeNull();
  });
});
