import { describe, it, expect } from 'vitest';
import {
  ARXIV_API_URL,
  HAND_QUERIES,
  HAND_SUBTOPICS,
  bisectWindow,
  buildArxivUrl,
  buildMonthWindows,
  buildSearchQuery,
  contentHashForArxivId,
  estimateBackfill,
  extractBaseArxivId,
  formatArxivDate,
  isRelevantHandPaper,
  parseBackfillOptions,
  type ArxivWindow,
} from '../arxiv-hand-query.js';

const Q = Object.fromEntries(HAND_QUERIES.map((q) => [q.id, q.query])) as Record<string, string>;

describe('HAND_QUERIES', () => {
  it('has exactly 4 queries', () => {
    expect(HAND_QUERIES).toHaveLength(4);
    expect(HAND_QUERIES.map((q) => q.id)).toEqual(['q1', 'q2', 'q3', 'q4']);
    expect(HAND_QUERIES.map((q) => q.key)).toEqual([
      'q1-hand-core',
      'q2-sensing-actuation',
      'q3-grasp-gripper',
      'q4-teleop-sim2real-humanoid',
    ]);
  });

  it('matches the specified Q1-Q4 text character for character', () => {
    expect(Q.q1).toBe(
      'cat:cs.RO AND (abs:"dexterous hand" OR abs:"robot hand" OR abs:"robotic hand" OR abs:"humanoid hand" OR abs:"anthropomorphic hand" OR abs:"multi-fingered" OR abs:"five-fingered" OR abs:"in-hand" OR abs:"dexterous manipulation" OR ti:dexterous)'
    );
    expect(Q.q2).toBe(
      'cat:cs.RO AND (abs:GelSight OR abs:"electronic skin" OR abs:"e-skin" OR abs:"vision-based tactile" OR (abs:tactile AND (abs:hand OR abs:finger OR abs:fingertip)) OR (abs:"tendon-driven" AND (abs:hand OR abs:finger OR abs:gripper)) OR abs:"underactuated hand" OR (abs:hand AND (abs:durability OR abs:"low-cost" OR abs:"low cost")))'
    );
    expect(Q.q3).toBe(
      'cat:cs.RO AND (ti:grasp OR ti:grasping OR abs:"grasp synthesis" OR abs:"grasp planning" OR abs:"grasp generation" OR abs:"grasp detection" OR ti:gripper OR abs:gripper OR abs:"parallel-jaw" OR abs:"soft gripper")'
    );
    expect(Q.q4).toBe(
      'cat:cs.RO AND ((abs:teleoperation AND (abs:hand OR abs:dexterous)) OR abs:"hand retargeting" OR abs:"hand pose" OR abs:"hand tracking" OR abs:"data glove" OR abs:"hand-object" OR (abs:"sim-to-real" AND (abs:hand OR abs:dexterous OR abs:grasp)) OR (abs:humanoid AND (abs:dexterous OR abs:"whole-hand")))'
    );
  });

  it('pins cat:cs.RO on every query and avoids wildcards', () => {
    for (const q of HAND_QUERIES) {
      expect(q.query.startsWith('cat:cs.RO AND (')).toBe(true);
      expect(q.query).not.toContain('*');
    }
  });

  it('has balanced parentheses and quotes in every query', () => {
    for (const q of HAND_QUERIES) {
      expect((q.query.match(/\(/g) ?? []).length).toBe((q.query.match(/\)/g) ?? []).length);
      expect((q.query.match(/"/g) ?? []).length % 2).toBe(0);
    }
  });
});

describe('HAND_SUBTOPICS mapping', () => {
  it('covers 10 subtopics', () => {
    expect(HAND_SUBTOPICS.map((s) => s.no)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('maps subtopics to the specified queries', () => {
    const byNo = Object.fromEntries(HAND_SUBTOPICS.map((s) => [s.no, s.queryIds]));
    expect(byNo[1]).toEqual(['q1']);
    expect(byNo[2]).toEqual(['q2']);
    expect(byNo[3]).toEqual(['q2']);
    expect(byNo[4]).toEqual(['q1']);
    expect(byNo[5]).toEqual(['q3']);
    expect(byNo[6]).toEqual(['q4']);
    expect(byNo[7]).toEqual(['q3']);
    expect(byNo[8]).toEqual(['q4']);
    expect(byNo[9]).toEqual(['q2']);
    expect(byNo[10]).toEqual(['q4', 'q1']);
  });

  it('has each representative term inside every mapped query', () => {
    for (const s of HAND_SUBTOPICS) {
      for (const qid of s.queryIds) {
        expect(Q[qid], `subtopic ${s.no} (${s.term}) in ${qid}`).toContain(s.term);
      }
    }
  });
});

describe('buildSearchQuery / formatArxivDate', () => {
  it('wraps the query in parentheses', () => {
    expect(buildSearchQuery('cat:cs.RO AND abs:x')).toBe('(cat:cs.RO AND abs:x)');
  });

  it('formats UTC minute resolution (12 digits)', () => {
    expect(formatArxivDate(new Date(Date.UTC(2025, 8, 1)))).toBe('202509010000');
    expect(formatArxivDate(new Date(Date.UTC(2026, 11, 31, 23, 59, 59)))).toBe('202612312359');
    expect(formatArxivDate(new Date(Date.UTC(2026, 11, 31, 23, 59)))).toHaveLength(12);
  });

  it('appends the submittedDate range', () => {
    const s = buildSearchQuery(Q.q1!, {
      start: new Date(Date.UTC(2025, 8, 1)),
      end: new Date(Date.UTC(2025, 9, 1)),
    });
    expect(s).toBe(`(${Q.q1}) AND submittedDate:[202509010000 TO 202510010000]`);
  });
});

describe('buildArxivUrl', () => {
  const range = { start: new Date(Date.UTC(2025, 8, 1)), end: new Date(Date.UTC(2025, 9, 1)) };

  it('uses https export.arxiv.org', () => {
    const url = buildArxivUrl({ query: Q.q1! });
    expect(url.startsWith('https://export.arxiv.org/api/query?')).toBe(true);
    expect(ARXIV_API_URL).toBe('https://export.arxiv.org/api/query');
    expect(new URL(url).hostname).toBe('export.arxiv.org');
  });

  it('has no raw space, quote or brackets, and is percent-encoded', () => {
    for (const q of HAND_QUERIES) {
      const url = buildArxivUrl({ query: q.query, range });
      expect(url).not.toMatch(/[ "[\]]/);
      expect(url).toContain('%22');
      expect(url).toContain('%5B');
      expect(url).toContain('%5D');
      expect(url).toContain('%20');
    }
  });

  it('round-trips through decodeURIComponent', () => {
    for (const q of HAND_QUERIES) {
      const url = buildArxivUrl({ query: q.query, range });
      const raw = url.split('search_query=')[1]!.split('&')[0]!;
      expect(decodeURIComponent(raw)).toBe(`(${q.query}) AND submittedDate:[202509010000 TO 202510010000]`);
      const noRange = buildArxivUrl({ query: q.query }).split('search_query=')[1]!.split('&')[0]!;
      expect(decodeURIComponent(noRange)).toBe(`(${q.query})`);
    }
  });

  it('carries start, max_results, sortBy and sortOrder', () => {
    const p = new URL(buildArxivUrl({ query: Q.q2!, start: 200, maxResults: 100, sortOrder: 'ascending', range })).searchParams;
    expect(p.get('start')).toBe('200');
    expect(p.get('max_results')).toBe('100');
    expect(p.get('sortBy')).toBe('submittedDate');
    expect(p.get('sortOrder')).toBe('ascending');
    expect(p.get('search_query')).toBe(`(${Q.q2}) AND submittedDate:[202509010000 TO 202510010000]`);
  });

  it('defaults to start 0, 100 results, descending', () => {
    const p = new URL(buildArxivUrl({ query: Q.q3! })).searchParams;
    expect(p.get('start')).toBe('0');
    expect(p.get('max_results')).toBe('100');
    expect(p.get('sortOrder')).toBe('descending');
  });
});

describe('buildMonthWindows', () => {
  const iso = (d: Date) => d.toISOString();

  it('months=12 on 2026-10-14 gives 13 contiguous windows from 2025-10-01', () => {
    const now = new Date(Date.UTC(2026, 9, 14, 9, 30));
    const w = buildMonthWindows(12, now);
    expect(w).toHaveLength(13);
    expect(iso(w[0]!.start)).toBe('2025-10-01T00:00:00.000Z');
    expect(w[0]!.label).toBe('2025-10');
    expect(w[12]!.label).toBe('2026-10');
    expect(iso(w[12]!.start)).toBe('2026-10-01T00:00:00.000Z');
    expect(w[12]!.end.getTime()).toBe(now.getTime());
    for (let i = 1; i < w.length; i++) expect(w[i]!.start.getTime()).toBe(w[i - 1]!.end.getTime());
    expect(new Set(w.map((x) => x.label)).size).toBe(13);
  });

  it('months=24 gives 25 windows and months=1 gives 2', () => {
    const now = new Date(Date.UTC(2026, 9, 14));
    expect(buildMonthWindows(24, now)).toHaveLength(25);
    expect(buildMonthWindows(24, now)[0]!.label).toBe('2024-10');
    const one = buildMonthWindows(1, now);
    expect(one.map((x) => x.label)).toEqual(['2026-09', '2026-10']);
  });

  it('crosses the year boundary (2026-01 start)', () => {
    const w = buildMonthWindows(3, new Date(Date.UTC(2026, 0, 15)));
    expect(w.map((x) => x.label)).toEqual(['2025-10', '2025-11', '2025-12', '2026-01']);
    expect(iso(w[2]!.end)).toBe('2026-01-01T00:00:00.000Z');
    expect(formatArxivDate(w[2]!.end)).toBe('202601010000');
  });

  it('wraps December to January', () => {
    const w = buildMonthWindows(1, new Date(Date.UTC(2026, 0, 2)));
    expect(w.map((x) => x.label)).toEqual(['2025-12', '2026-01']);
    expect(formatArxivDate(w[0]!.end)).toBe('202601010000');
  });

  it('handles February in leap (2028) and non-leap (2027) years', () => {
    const leap = buildMonthWindows(1, new Date(Date.UTC(2028, 2, 10)));
    expect(leap[0]!.label).toBe('2028-02');
    expect((leap[0]!.end.getTime() - leap[0]!.start.getTime()) / 86400000).toBe(29);
    expect(formatArxivDate(leap[0]!.end)).toBe('202803010000');
    const plain = buildMonthWindows(1, new Date(Date.UTC(2027, 2, 10)));
    expect((plain[0]!.end.getTime() - plain[0]!.start.getTime()) / 86400000).toBe(28);
  });

  it('works when now is the 1st of a month (non-midnight) and the last day', () => {
    const first = buildMonthWindows(2, new Date(Date.UTC(2026, 4, 1, 0, 5)));
    expect(first.map((x) => x.label)).toEqual(['2026-03', '2026-04', '2026-05']);
    expect(first[2]!.end.getTime() - first[2]!.start.getTime()).toBe(5 * 60 * 1000);
    const last = buildMonthWindows(2, new Date(Date.UTC(2026, 4, 31, 23, 59)));
    expect(last).toHaveLength(3);
    expect(formatArxivDate(last[2]!.end)).toBe('202605312359');
  });

  it('drops the empty in-progress window when now is exactly the start of a month', () => {
    const w = buildMonthWindows(12, new Date(Date.UTC(2026, 9, 1)));
    expect(w).toHaveLength(12);
    expect(w[11]!.label).toBe('2026-09');
  });
});

describe('bisectWindow', () => {
  const march: ArxivWindow = {
    label: '2026-03',
    start: new Date(Date.UTC(2026, 2, 1)),
    end: new Date(Date.UTC(2026, 3, 1)),
  };

  it('splits a month into half-months on UTC day boundaries without gap or overlap', () => {
    const [a, b] = bisectWindow(march)!;
    expect(a.start.getTime()).toBe(march.start.getTime());
    expect(a.end.getTime()).toBe(b.start.getTime());
    expect(b.end.getTime()).toBe(march.end.getTime());
    expect(a.end.toISOString()).toBe('2026-03-16T00:00:00.000Z');
    expect(a.end.getTime() % 86400000).toBe(0);
  });

  it('bisects down to 1-day windows and stops there', () => {
    const leaves: ArxivWindow[] = [];
    const walk = (w: ArxivWindow) => {
      const c = bisectWindow(w);
      if (!c) leaves.push(w);
      else c.forEach(walk);
    };
    walk(march);
    expect(leaves).toHaveLength(31);
    for (const l of leaves) expect(l.end.getTime() - l.start.getTime()).toBe(86400000);
    expect(bisectWindow(leaves[0]!)).toBeNull();
  });

  it('returns null for windows shorter than a day', () => {
    const w: ArxivWindow = { label: 'x', start: new Date(Date.UTC(2026, 2, 1)), end: new Date(Date.UTC(2026, 2, 1, 6)) };
    expect(bisectWindow(w)).toBeNull();
  });

  it('splits a partial 2-day window into two 1-day windows', () => {
    const w: ArxivWindow = { label: 'x', start: new Date(Date.UTC(2026, 2, 1)), end: new Date(Date.UTC(2026, 2, 2, 12)) };
    const [a, b] = bisectWindow(w)!;
    expect(a.end.toISOString()).toBe('2026-03-02T00:00:00.000Z');
    expect(b.end.getTime()).toBe(w.end.getTime());
  });
});

describe('isRelevantHandPaper - pass cases', () => {
  const ro = ['cs.RO'];
  const pass: Array<[string, string, string[]?]> = [
    ['DexGrasp: dexterous hand grasp synthesis', ''],
    ['Tactile sensing with GelSight fingertips for in-hand rotation', ''],
    ['Learning bimanual manipulation with parallel-jaw grippers', ''],
    ['A tendon-driven anthropomorphic robot hand', ''],
    ['Hands-free teleoperation of dexterous robotic hands', ''],
    ['Sim-to-real transfer for multi-fingered grasping', ''],
    ['Low-cost 3D-printed gripper design', ''],
    ['A new policy learning framework', 'We study in-hand manipulation with reinforcement learning.'],
  ];
  pass.forEach(([title, abs, cats], i) => {
    it(`passes #${i + 1}: ${title}`, () => {
      expect(isRelevantHandPaper({ title, abstract: abs, categories: cats ?? ro })).toBe(true);
    });
  });
});

describe('isRelevantHandPaper - reject cases', () => {
  const ro = ['cs.RO'];
  const reject: Array<[string, string, string[]?]> = [
    ['A new method for mapping', 'On the other hand, our method is faster.'],
    ['Fingerprint-based localization for mobile robots', ''],
    ['Hand-crafted features vs. learned features for SLAM', ''],
    ['A handheld LiDAR mapping device', ''],
    ['Trajectory planning for quadruped locomotion', ''],
    ['Hand gesture recognition', '', ['cs.CV']],
    ['Second-hand robot market analysis', ''],
    ['Hand-labeled datasets for autonomous driving perception', ''],
  ];
  reject.forEach(([title, abs, cats], i) => {
    it(`rejects #${i + 1}: ${title}`, () => {
      expect(isRelevantHandPaper({ title, abstract: abs, categories: cats ?? ro })).toBe(false);
    });
  });

  it('is case-insensitive and accepts plural hands', () => {
    expect(isRelevantHandPaper({ title: 'ROBOT HANDS', abstract: '', categories: ro })).toBe(true);
    expect(isRelevantHandPaper({ title: 'Dexterous', abstract: null, categories: ro })).toBe(true);
  });

  it('strips Hand-Crafted regardless of case and hyphen/space', () => {
    expect(isRelevantHandPaper({ title: 'Hand-Crafted features', abstract: '', categories: ro })).toBe(false);
    expect(isRelevantHandPaper({ title: 'hand tuned parameters', abstract: '', categories: ro })).toBe(false);
  });

  it('still passes when an idiom coexists with a real hand keyword', () => {
    expect(
      isRelevantHandPaper({
        title: 'Hand-crafted rewards for a robot hand',
        abstract: 'On the other hand, learned rewards fail.',
        categories: ro,
      })
    ).toBe(true);
  });

  it('accepts cs.RO as a cross-list category and rejects when absent', () => {
    expect(isRelevantHandPaper({ title: 'Robot hand', abstract: '', categories: ['cs.CV', 'cs.RO'] })).toBe(true);
    expect(isRelevantHandPaper({ title: 'Robot hand', abstract: '', categories: ['cs.CV', 'cs.LG'] })).toBe(false);
    expect(isRelevantHandPaper({ title: 'Robot hand', abstract: '', categories: [] })).toBe(false);
  });
});

describe('extractBaseArxivId / contentHashForArxivId', () => {
  it('strips versions and handles http/https', () => {
    expect(extractBaseArxivId('http://arxiv.org/abs/2501.01234v2')).toBe('2501.01234');
    expect(extractBaseArxivId('https://arxiv.org/abs/2501.01234')).toBe('2501.01234');
    expect(extractBaseArxivId('http://arxiv.org/abs/2501.01234v1')).toBe(extractBaseArxivId('https://arxiv.org/abs/2501.01234v12'));
  });

  it('handles old-style IDs with a slash', () => {
    expect(extractBaseArxivId('http://arxiv.org/abs/cs/0501001v1')).toBe('cs/0501001');
    expect(extractBaseArxivId('https://arxiv.org/abs/cs/0501001')).toBe('cs/0501001');
  });

  it('returns null for non-abs URLs', () => {
    expect(extractBaseArxivId('http://arxiv.org/api/errors#incorrect_id_format')).toBeNull();
    expect(extractBaseArxivId('https://example.com/x')).toBeNull();
  });

  it('hashes the raw <id> with md5 (same rule as the existing collector)', () => {
    expect(contentHashForArxivId('http://arxiv.org/abs/2501.12345v1')).toMatch(/^[0-9a-f]{32}$/);
    expect(contentHashForArxivId('http://arxiv.org/abs/2501.12345v1')).not.toBe(
      contentHashForArxivId('http://arxiv.org/abs/2501.12345v2')
    );
  });
});

describe('parseBackfillOptions', () => {
  it('defaults to months 12, dryRun false for missing body', () => {
    expect(parseBackfillOptions(undefined)).toEqual({ ok: true, months: 12, dryRun: false });
    expect(parseBackfillOptions(null)).toEqual({ ok: true, months: 12, dryRun: false });
    expect(parseBackfillOptions({})).toEqual({ ok: true, months: 12, dryRun: false });
  });

  it('accepts valid values', () => {
    expect(parseBackfillOptions({ months: 1, dryRun: true })).toEqual({ ok: true, months: 1, dryRun: true });
    expect(parseBackfillOptions({ months: 24 })).toEqual({ ok: true, months: 24, dryRun: false });
  });

  it('rejects bad months and dryRun', () => {
    for (const months of [0, 25, 1.5, 'a', '12', null, NaN, -1]) {
      expect(parseBackfillOptions({ months }).ok, `months=${String(months)}`).toBe(false);
    }
    for (const dryRun of ['yes', 1, null, 'true']) {
      expect(parseBackfillOptions({ dryRun }).ok, `dryRun=${String(dryRun)}`).toBe(false);
    }
    expect(parseBackfillOptions('x').ok).toBe(false);
    expect(parseBackfillOptions([]).ok).toBe(false);
  });

  it('estimates requests and minutes', () => {
    expect(estimateBackfill(13)).toEqual({ estimatedRequests: 130, estimatedMinutes: 13 });
  });
});
