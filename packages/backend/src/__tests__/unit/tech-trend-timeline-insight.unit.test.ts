import { describe, it, expect } from 'vitest';
import {
  evaluateInsightGate,
  buildInsightInput,
  buildTimelineInsightPrompt,
  parseTimelineInsight,
  INSIGHT_GATE,
  INSIGHT_LIMITS,
  REP_TITLES_PER_SOURCE,
  CITED_TITLES_PER_SOURCE,
  INSIGHT_MODEL,
  INSIGHT_MAX_TOKENS,
  type InsightInput,
} from '../../services/tech-trend-timeline-insight.service.js';
import {
  buildTimelineSnapshot,
  TIMELINE_INSIGHT_CACHE_KEY,
} from '../../services/tech-trend-timeline.service.js';
import { MAX_NON_STREAMING_TOKENS } from '../../services/anthropic-models.js';
import { HAND_TOPIC_VERSION } from '../../services/hand-topics.js';
import type { ArticleRow } from '../../services/tech-trend-report.service.js';

const NOW = new Date('2026-10-14T12:00:00.000Z');
const MONTHS = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];

type Spec = Record<string, { papers?: number[]; videos?: number[] }>;

function stored(primary: string) {
  return { handTopics: { topics: [primary], primary, classifiedAt: '2026-10-01T00:00:00Z', version: HAND_TOPIC_VERSION } };
}

function rowsFor(spec: Spec, months: string[] = MONTHS) {
  const papers: ArticleRow[] = [];
  const videos: ArticleRow[] = [];
  for (const [topic, s] of Object.entries(spec)) {
    (s.papers ?? []).forEach((n, mi) => {
      for (let k = 0; k < n; k++) {
        const date = `${months[mi]}-1${k % 9}T00:00:00Z`;
        papers.push({
          id: `p-${topic}-${mi}-${k}`,
          title: `Paper ${topic} ${months[mi]} n${k} ${'z'.repeat(120)}`,
          summary: 'tactile gripper',
          source: 'arxiv',
          publishedAt: date,
          collectedAt: date,
          extractedMetadata: stored(topic),
        });
      }
    });
    (s.videos ?? []).forEach((n, mi) => {
      for (let k = 0; k < n; k++) {
        const date = `${months[mi]}-1${k % 9}T00:00:00Z`;
        videos.push({
          id: `v-${topic}-${mi}-${k}`,
          title: `Video ${topic} ${months[mi]} n${k}`,
          productType: 'video',
          source: 'youtube',
          publishedAt: date,
          collectedAt: date,
          extractedMetadata: { domain: 'hand', views: 987654 + k, ...stored(topic) },
        });
      }
    });
  }
  return { papers, videos };
}

const SPEC: Spec = {
  tactile_force: { papers: [0, 1, 1, 3, 4, 0], videos: [0, 0, 1, 2, 3, 0] },
  dexterous_hw: { papers: [0, 0, 1, 2, 3, 0], videos: [0, 0, 0, 1, 2, 0] },
  grasp_planning: { papers: [0, 0, 0, 2, 3, 0] },
  teleop_data: { papers: [0, 0, 0, 1, 3, 0], videos: [0, 0, 0, 0, 3, 0] },
  sim2real: { papers: [3, 3, 3, 1, 1, 0] },
  durability_cost: { papers: [0, 0, 1, 0, 0, 0] }, // low volume (avg 0.2)
  other: { papers: [0, 1, 0, 0, 0, 0] },
  off_topic: { papers: [2, 2, 0, 0, 0, 0] },
};

function snapshotOf(spec: Spec, months: string[] = MONTHS) {
  const { papers, videos } = rowsFor(spec, months);
  return buildTimelineSnapshot({ papers, videos, videosExcludedByFocus: 0, videosPendingJudgement: 0 }, NOW);
}

describe('evaluateInsightGate', () => {
  const base = { ratio: 0.9, classified: 50, completeMonths: 5, hasApiKey: true };
  it('passes when everything is met', () => {
    expect(evaluateInsightGate(base)).toBe('ok');
  });
  it('ratio boundary 0.79 vs 0.80', () => {
    expect(evaluateInsightGate({ ...base, ratio: 0.79 })).toBe('insufficient_classification');
    expect(evaluateInsightGate({ ...base, ratio: INSIGHT_GATE.minRatio })).toBe('ok');
    expect(evaluateInsightGate({ ...base, ratio: 8 / 10 })).toBe('ok');
  });
  it('classified count boundary 19 vs 20', () => {
    expect(evaluateInsightGate({ ...base, classified: 19 })).toBe('insufficient_classification');
    expect(evaluateInsightGate({ ...base, classified: 20 })).toBe('ok');
  });
  it('complete months boundary 2 vs 3', () => {
    expect(evaluateInsightGate({ ...base, completeMonths: 2 })).toBe('insufficient_period');
    expect(evaluateInsightGate({ ...base, completeMonths: 3 })).toBe('ok');
  });
  it('requires the API key', () => {
    expect(evaluateInsightGate({ ...base, hasApiKey: false })).toBe('no_api_key');
  });
});

describe('buildInsightInput', () => {
  const snap = snapshotOf(SPEC);
  const input = buildInsightInput(snap);

  it('excludes lowVolume topics, other and off_topic', () => {
    const ids = input.topics.map((t) => t.topicId);
    expect(ids).not.toContain('durability_cost');
    expect(ids).not.toContain('other');
    expect(ids).not.toContain('off_topic');
    expect(ids).toEqual(expect.arrayContaining(['tactile_force', 'dexterous_hw', 'grasp_planning', 'teleop_data', 'sim2real']));
    expect(JSON.stringify(input)).not.toContain('off_topic');
  });

  it('builds rising candidates sorted by delta desc (then rate, total), max 5', () => {
    const ids = input.risingCandidates.map((c) => c.topicId);
    expect(ids).toEqual(['tactile_force', 'dexterous_hw', 'teleop_data', 'grasp_planning']);
    const deltas = input.risingCandidates.map((c) => c.metrics.delta);
    expect([...deltas].sort((a, b) => b - a)).toEqual(deltas);
    expect(input.risingCandidates.length).toBeLessThanOrEqual(5);
  });

  it('builds declining candidates (falling, or steady with recent<=prior and avg>=1)', () => {
    expect(input.decliningCandidates.map((c) => c.topicId)).toEqual(['sim2real']);
    expect(input.decliningCandidates[0]!.metrics).toMatchObject({ recent: 2, prior: 6, delta: -4 });
  });

  it('takes up to 5 representative titles per topic and source', () => {
    expect(REP_TITLES_PER_SOURCE).toBe(5);
    // 대표 선정이 소스별 최대 5건이므로 입력에는 그 이상 실리지 않는다
    const many = buildInsightInput(
      snapshotOf({
        tactile_force: { papers: [0, 2, 2, 3, 3, 0], videos: [0, 1, 2, 2, 2, 0] },
        dexterous_hw: { papers: [0, 0, 1, 2, 3, 0] },
      })
    );
    const tactileMany = many.topics.find((t) => t.topicId === 'tactile_force')!;
    expect(tactileMany.paperTitles.length).toBeGreaterThan(3);
    expect(tactileMany.paperTitles.length).toBeLessThanOrEqual(5);
    expect(tactileMany.videoTitles.length).toBeGreaterThan(3);
    expect(tactileMany.videoTitles.length).toBeLessThanOrEqual(5);
  });

  it('caps representative titles per source and truncates each to 90 chars', () => {
    for (const t of input.topics) {
      expect(t.paperTitles.length).toBeLessThanOrEqual(REP_TITLES_PER_SOURCE);
      expect(t.videoTitles.length).toBeLessThanOrEqual(REP_TITLES_PER_SOURCE);
      for (const title of [...t.paperTitles, ...t.videoTitles]) expect(title.length).toBeLessThanOrEqual(90);
    }
    const tactile = input.topics.find((t) => t.topicId === 'tactile_force')!;
    expect(tactile.paperTitles.length).toBeGreaterThan(0);
    expect(tactile.videoTitles.length).toBeGreaterThan(0);
    expect(new Set(input.allowedTitles)).toEqual(
      new Set(input.topics.flatMap((t) => [...t.paperTitles, ...t.videoTitles]))
    );
  });

  it('never exposes view counts', () => {
    const json = JSON.stringify(input);
    expect(json).not.toMatch(/"views"/);
    expect(json).not.toContain('987654');
    expect(buildTimelineInsightPrompt(input)).not.toContain('987654');
  });

  it('flags a short period (<6 months) and uses the heatmap granularity', () => {
    expect(input.period.monthCount).toBe(6);
    expect(input.shortPeriod).toBe(false);
    const short = buildInsightInput(snapshotOf({ tactile_force: { papers: [0, 3, 4, 5] } }, ['2026-07', '2026-08', '2026-09', '2026-10']));
    // data starts 2026-08 -> 3 months
    expect(short.period.monthCount).toBeLessThan(6);
    expect(short.shortPeriod).toBe(true);
    expect(input.granularity).toBe('month');
    expect(input.columns).toHaveLength(6);
  });
});

describe('buildTimelineInsightPrompt', () => {
  const input = buildInsightInput(snapshotOf(SPEC));
  const prompt = buildTimelineInsightPrompt(input);

  it('contains the no-speculation, no-markdown and JSON-only rules', () => {
    expect(prompt).toContain('추측');
    expect(prompt).toContain('마크다운');
    expect(prompt).toContain('<cite>');
    expect(prompt).toContain('JSON으로만');
  });
  it('forbids topics outside the candidates and instructs verbatim server relations', () => {
    expect(prompt).toMatch(/후보에 없는 토픽을 넣지 않는다/);
    expect(prompt).toContain('relation은 입력 topics[].leadLag.relation 값을 그대로');
    expect(prompt).toContain('판단 유보');
    expect(prompt).toMatch(/조회수·인기·마케팅 언급 금지/);
  });
  it('adds the four new rules and the new output format with interpolated limits', () => {
    expect(prompt).toContain('근거 문장에는 입력의 건수(prior→recent)나 피크 월 같은 구체 수치를 함께 인용한다. 수치는 새로 계산하지 않는다.');
    expect(prompt).toContain('rising의 evidence에는 논문(연구) 신호와 영상(제품화) 신호를 모두 서술한다. 한쪽 신호만 있으면 그 사실을 명시한다.');
    expect(prompt).toContain('overview는 5~6문장으로 쓴다: 전체 흐름, 가장 큰 변화, 연구와 제품화 사이의 간극, 데이터의 한계(표본·기간) 순서.');
    expect(prompt).toContain('lgImplications는 4개를 쓴다. 각 항목은 어느 토픽(이름)과 어떤 수치에서 도출했는지 문장 안에 밝힌다.');
    expect(prompt).toContain('"overview":"전체 흐름 5~6문장(700자 이내)"');
    expect(prompt).toContain('"evidence":"근거 350자 이내"');
    expect(prompt).toContain('"note":"240자 이내"');
    expect(prompt).toContain('"lgImplications":["시사점1(350자 이내)","시사점2","시사점3","시사점4"]');
    expect(prompt).toContain('(rising 최대 5개, declining 최대 4개, leadLag 최대 6개, lgImplications 4개)');
  });
  it('adds the short-period no-assertion flag only for short periods', () => {
    expect(prompt).not.toContain('shortPeriod=true');
    const shortInput: InsightInput = { ...input, shortPeriod: true };
    const shortPrompt = buildTimelineInsightPrompt(shortInput);
    expect(shortPrompt).toContain('shortPeriod=true');
    expect(shortPrompt).toContain('단정 표현');
  });
});

describe('parseTimelineInsight', () => {
  const input = buildInsightInput(snapshotOf(SPEC));
  const tactile = input.topics.find((t) => t.topicId === 'tactile_force')!;
  const paperTitle = tactile.paperTitles[0]!;
  const videoTitle = tactile.videoTitles[0]!;

  const good = {
    overview: '촉각 센싱 관련 건수가 최근 늘었다. 시뮬레이션 비중은 줄었다.',
    rising: [
      { topicId: 'tactile_force', evidence: '논문 2→7건으로 증가', paperTitles: [paperTitle], videoTitles: [videoTitle] },
    ],
    declining: [{ topicId: 'sim2real', note: '6건에서 2건으로 감소' }],
    leadLag: [{ topicId: 'tactile_force', relation: 'video_leads', note: '논문이 먼저 피크' }],
    lgImplications: ['시사점 하나', '시사점 둘'],
  };

  it('parses a normal response and attaches server label + metrics', () => {
    const out = parseTimelineInsight(JSON.stringify(good), input)!;
    expect(out.overview).toBe(good.overview);
    expect(out.rising).toHaveLength(1);
    expect(out.rising[0]).toMatchObject({
      topicId: 'tactile_force',
      label: tactile.label,
      paperTitles: [paperTitle],
      videoTitles: [videoTitle],
    });
    expect(out.rising[0]!.metrics).toMatchObject({ recent: 12, prior: 3, delta: 9 });
    expect(out.rising[0]!.metrics.papers).toEqual({ recent: 7, prior: 2 });
    expect(out.declining[0]!.metrics).toMatchObject({ recent: 2, prior: 6, delta: -4 });
    expect(out.lgImplications).toEqual(['시사점 하나', '시사점 둘']);
  });

  it('recovers JSON from code fences and prose', () => {
    const text = `해설입니다.\n\`\`\`json\n${JSON.stringify(good)}\n\`\`\`\n끝.`;
    expect(parseTimelineInsight(text, input)?.overview).toBe(good.overview);
  });

  it('strips <cite> tags and markdown symbols', () => {
    const dirty = {
      ...good,
      overview: '<cite index="1">**촉각** 센싱</cite> ## 증가',
      lgImplications: ['`코드` **강조** #태그'],
      rising: [{ ...good.rising[0]!, evidence: '<cite>근거</cite> **굵게**' }],
    };
    const out = parseTimelineInsight(JSON.stringify(dirty), input)!;
    const all = JSON.stringify(out);
    expect(all).not.toContain('<cite');
    expect(all).not.toMatch(/[*#`]/);
    expect(out.overview).toContain('촉각 센싱');
    expect(out.rising[0]!.evidence).toBe('근거 굵게');
  });

  it('drops topics that are not candidates', () => {
    const many = {
      ...good,
      rising: [
        { topicId: 'sim2real', evidence: 'x' }, // declining, not a rising candidate
        { topicId: 'durability_cost', evidence: 'x' }, // lowVolume
        { topicId: 'bogus', evidence: 'x' },
        ...['tactile_force', 'teleop_data', 'dexterous_hw', 'grasp_planning'].map((id) => ({ topicId: id, evidence: 'e' })),
      ],
      declining: [{ topicId: 'tactile_force', note: 'not a declining candidate' }],
      leadLag: [{ topicId: 'durability_cost', relation: 'paper_leads', note: 'n' }],
    };
    const out = parseTimelineInsight(JSON.stringify(many), input)!;
    expect(out.rising.map((r) => r.topicId)).toEqual(['tactile_force', 'teleop_data', 'dexterous_hw', 'grasp_planning']);
    expect(out.declining).toEqual([]);
    expect(out.leadLag).toEqual([]);
  });

  it('caps rising/declining/leadLag at 5/4/6 given enough candidates', () => {
    const base = input.risingCandidates[0]!;
    const cands = Array.from({ length: 8 }, (_, i) => ({ ...base, topicId: `c${i}`, label: `C${i}` }));
    const topics = cands.map((c) => ({ ...tactile, topicId: c.topicId, label: c.label }));
    const ctx: InsightInput = { ...input, risingCandidates: cands, decliningCandidates: cands, topics };
    const out = parseTimelineInsight(
      JSON.stringify({
        overview: 'o',
        rising: cands.map((c) => ({ topicId: c.topicId, evidence: 'e' })),
        declining: cands.map((c) => ({ topicId: c.topicId, note: 'n' })),
        leadLag: cands.map((c) => ({ topicId: c.topicId, note: 'n' })),
        lgImplications: ['a'],
      }),
      ctx
    )!;
    expect(out.rising).toHaveLength(INSIGHT_LIMITS.risingMax);
    expect(out.declining).toHaveLength(INSIGHT_LIMITS.decliningMax);
    expect(out.leadLag).toHaveLength(INSIGHT_LIMITS.leadLagMax);
  });

  it('keeps at most 3 cited titles per source in rising even though 5 are given as input', () => {
    expect(CITED_TITLES_PER_SOURCE).toBe(3);
    const titles = Array.from({ length: 5 }, (_, i) => `Cited paper ${i}`);
    const ctx: InsightInput = { ...input, allowedTitles: [...input.allowedTitles, ...titles] };
    const out = parseTimelineInsight(
      JSON.stringify({
        overview: 'o',
        rising: [{ topicId: 'tactile_force', evidence: 'e', paperTitles: titles, videoTitles: [] }],
        lgImplications: ['a'],
      }),
      ctx
    )!;
    expect(out.rising[0]!.paperTitles).toEqual(titles.slice(0, 3));
  });

  it('drops titles that were not in the input, keeping the valid ones', () => {
    const t = {
      ...good,
      rising: [
        { topicId: 'tactile_force', evidence: 'e', paperTitles: [paperTitle, 'Invented Paper Title'], videoTitles: ['Made up video'] },
      ],
    };
    const out = parseTimelineInsight(JSON.stringify(t), input)!;
    expect(out.rising[0]!.paperTitles).toEqual([paperTitle]);
    expect(out.rising[0]!.videoTitles).toEqual([]);
  });

  it('overwrites leadLag.relation with the server verdict', () => {
    const out = parseTimelineInsight(JSON.stringify(good), input)!;
    expect(out.leadLag).toHaveLength(1);
    expect(out.leadLag[0]!.relation).toBe(tactile.leadLag.relation);
    expect(out.leadLag[0]!.lagMonths).toBe(tactile.leadLag.lagMonths);
    const forged = parseTimelineInsight(
      JSON.stringify({ ...good, leadLag: [{ topicId: 'tactile_force', relation: 'concurrent', note: 'n' }] }),
      input
    )!;
    expect(forged.leadLag[0]!.relation).toBe(tactile.leadLag.relation);
  });

  it('keeps at most 4 lgImplications and requires at least 1', () => {
    const five = { ...good, lgImplications: ['a', 'b', 'c', 'd', 'e'] };
    expect(parseTimelineInsight(JSON.stringify(five), input)!.lgImplications).toEqual(['a', 'b', 'c', 'd']);
    expect(parseTimelineInsight(JSON.stringify({ ...good, lgImplications: ['only'] }), input)!.lgImplications).toEqual(['only']);
    expect(parseTimelineInsight(JSON.stringify({ ...good, lgImplications: [] }), input)).toBeNull();
  });

  it('returns null when overview is missing/empty or the response is not JSON', () => {
    expect(parseTimelineInsight(JSON.stringify({ ...good, overview: '' }), input)).toBeNull();
    const { overview: _o, ...noOverview } = good;
    expect(parseTimelineInsight(JSON.stringify(noOverview), input)).toBeNull();
    expect(parseTimelineInsight('nothing here', input)).toBeNull();
    expect(parseTimelineInsight('', input)).toBeNull();
  });

  it('enforces character limits', () => {
    const long = 'ㄱ'.repeat(900);
    const out = parseTimelineInsight(
      JSON.stringify({
        overview: long,
        rising: [{ topicId: 'tactile_force', evidence: long }],
        declining: [{ topicId: 'sim2real', note: long }],
        leadLag: [{ topicId: 'tactile_force', note: long }],
        lgImplications: [long, long],
      }),
      input
    )!;
    expect(out.overview).toHaveLength(INSIGHT_LIMITS.overview);
    expect(out.rising[0]!.evidence).toHaveLength(INSIGHT_LIMITS.risingEvidence);
    expect(out.declining[0]!.note).toHaveLength(INSIGHT_LIMITS.decliningNote);
    expect(out.leadLag[0]!.note).toHaveLength(INSIGHT_LIMITS.leadLagNote);
    expect(out.lgImplications.every((s) => s.length === INSIGHT_LIMITS.lgItem)).toBe(true);
  });
});

describe('INSIGHT_LIMITS', () => {
  it('uses the expanded limits', () => {
    expect(INSIGHT_LIMITS).toEqual({
      overview: 700,
      risingEvidence: 350,
      risingMax: 5,
      decliningNote: 240,
      decliningMax: 4,
      leadLagNote: 240,
      leadLagMax: 6,
      lgItem: 350,
      lgMax: 4,
    });
  });
});

describe('model settings', () => {
  it('defaults to Opus 5.5 with a non-streaming-safe max_tokens', () => {
    expect(INSIGHT_MODEL).toBe('claude-opus-5-5');
    expect(INSIGHT_MAX_TOKENS).toBe(20_000);
    expect(INSIGHT_MAX_TOKENS).toBeLessThanOrEqual(MAX_NON_STREAMING_TOKENS);
  });
  it('uses the v2 insight cache key', () => {
    expect(TIMELINE_INSIGHT_CACHE_KEY).toBe('tech-trend-timeline-insight:v2:hand');
  });
});
