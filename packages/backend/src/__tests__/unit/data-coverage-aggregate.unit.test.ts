/**
 * data-coverage-aggregate — 순수 함수 단위 테스트 (소스군, 접기, URL 정규화, arXiv ID, 중복, 비율, 소진, 월말 예상, 태그, 델타, 스냅샷 평탄화, 경고 경계값)
 */
import { describe, it, expect } from 'vitest';
import {
  applyBaselineDelta,
  buildSectionStatus,
  channelFromSource,
  classifySource,
  computeBacklogEta,
  computeRatio,
  createDuplicateDetector,
  detectDuplicates,
  extractArxivId,
  extractUsageTag,
  findZeroChannels90d,
  flattenForSnapshot,
  foldIngestRows,
  normalizeArticleUrl,
  projectMonthEnd,
  sanitizeErrorMessage,
  severityForAtLeastOne,
  severityForAuditAge,
  severityForProjected,
  severityForRunAge,
  severityForUsedPct,
  type DupRow,
  type Qa1Row,
} from '../../services/data-coverage-aggregate.js';
import { coverageOkSample } from '../fixtures/data-coverage.fixture.js';

describe('classifySource', () => {
  it.each([
    ['arxiv', 'arxiv'], ['github', 'github'], ['sec_edgar', 'sec_edgar'], ['patent', 'patent'],
    ['YouTube — Boston Dynamics', 'youtube'], ['YouTube - X', 'youtube'], ['YouTube – X', 'youtube'], ['YouTube', 'youtube'], ['YouTube―Z', 'youtube'],
    ['youtube — lower', 'other'], ['TechCrunch', 'other'], ['', 'other'], ['arxiv.org', 'other'],
  ])('%s -> %s', (src, g) => expect(classifySource(src)).toBe(g));

  it('channelFromSource strips the prefix regardless of the dash', () => {
    expect(channelFromSource('YouTube — Figure AI')).toBe('Figure AI');
    expect(channelFromSource('YouTube - Figure AI')).toBe('Figure AI');
  });
});

const row = (o: Partial<Qa1Row>): Qa1Row => ({ ...(coverageOkSample as never), source: 'x', productType: null, language: null, channel: null, thirdParty: null, total: 0, c7: 0, c30: 0, c90: 0, lastCollectedAt: null, companyNull: 0, publishedNull: 0, entityTitle: 0, koTitle: 0, cjkTitle: 0, arxivSummary: 0, arxivSummary30: 0, newsTotal: 0, newsKeyPoints: 0, news30Total: 0, news30KeyPoints: 0, focusHand: { judged: 0, primary: 0, secondary: 0, none: 0 }, focusActuator: { judged: 0, primary: 0, secondary: 0, none: 0 }, handTopics: 0, actuatorTopics: 0, ...o });

describe('foldIngestRows', () => {
  const rows = [
    row({ source: 'arxiv', productType: 'none', total: 10, c7: 1, c30: 4, c90: 8, lastCollectedAt: '2026-11-01T00:00:00.000Z' }),
    row({ source: 'arxiv', productType: null, total: 5, c7: 0, c30: 1, c90: 2, lastCollectedAt: '2026-11-03T00:00:00.000Z' }),
    row({ source: 'YouTube — A', productType: 'video', channel: 'A', total: 7, c7: 2, c30: 5, c90: 7 }),
    row({ source: 'YouTube — A', productType: 'video', channel: 'A', thirdParty: 'true', total: 3, c7: 0, c30: 1, c90: 3 }),
    row({ source: 'YouTube — B', productType: 'video', channel: null, total: 4, c7: 0, c30: 0, c90: 0 }),
    row({ source: 'misc', productType: 'robot', total: 2, c7: 0, c30: 0, c90: 0 }),
  ];
  const f = foldIngestRows(rows);

  it('sums 7/30/90-day counts per group and keeps the latest collected time', () => {
    expect(f.total).toBe(31);
    expect(f.byGroup.arxiv).toEqual({ total: 15, c7: 1, c30: 5, c90: 10, lastCollectedAt: '2026-11-03T00:00:00.000Z' });
    expect(f.byGroup.youtube.total).toBe(14);
    expect(f.byGroup.other.total).toBe(2);
    expect(f.byGroup.github.total).toBe(0);
  });
  it('folds product types with null as "(null)"', () => {
    expect(f.byProductType.get('(null)')?.total).toBe(5);
    expect(f.byProductType.get('video')?.total).toBe(14);
  });
  it('folds channels (falls back to the source name) and tracks third-party volume', () => {
    const a = f.byChannel.find((c) => c.channel === 'A')!;
    expect(a).toMatchObject({ total: 10, official: 7, thirdParty: 3, c30: 6 });
    expect(f.byChannel.find((c) => c.channel === 'B')?.total).toBe(4);
  });
  it('finds zero-90d channels from DB + configured official channels (case-insensitive)', () => {
    const zero = findZeroChannels90d(f.byChannel, ['a', 'Ghost']);
    expect(zero.map((z) => z.name)).toEqual(['B', 'Ghost']);
    expect(findZeroChannels90d(f.byChannel, null).map((z) => z.name)).toEqual(['B']);
  });
});

describe('normalizeArticleUrl', () => {
  const k = (u: string) => normalizeArticleUrl(u).key;
  it.each([
    ['HTTPS://Example.COM/Path/', 'https://example.com/Path'],
    ['https://example.com/a?utm_source=x&utm_medium=y', 'https://example.com/a'],
    ['https://example.com/a?fbclid=abc', 'https://example.com/a'],
    ['https://example.com/a?id=1&utm_campaign=z&fbclid=q', 'https://example.com/a?id=1'],
    ['https://www.youtube.com/watch?v=abc123&utm_source=x', 'https://www.youtube.com/watch?v=abc123'],
    ['https://example.com/', 'https://example.com'],
    ['https://example.com', 'https://example.com'],
    ['https://example.com/a/b///', 'https://example.com/a/b'],
    ['https://example.com/a?x=1#frag', 'https://example.com/a?x=1#frag'],
  ])('%s -> %s', (i, o) => expect(k(i)).toBe(o));

  it('does not normalize path case, param order, www., or http vs https (v1 scope)', () => {
    expect(k('https://example.com/A')).not.toBe(k('https://example.com/a'));
    expect(k('https://e.com/?a=1&b=2')).not.toBe(k('https://e.com/?b=2&a=1'));
    expect(k('https://www.e.com/x')).not.toBe(k('https://e.com/x'));
    expect(k('http://e.com/x')).not.toBe(k('https://e.com/x'));
  });
  it('falls back to the trimmed raw text when unparsable', () => {
    expect(normalizeArticleUrl('  not a url ')).toEqual({ key: 'not a url', parsable: false });
    expect(normalizeArticleUrl('')).toEqual({ key: '', parsable: false });
    expect(normalizeArticleUrl(null).parsable).toBe(false);
    expect(normalizeArticleUrl('https://e.com/a').parsable).toBe(true);
  });
});

describe('extractArxivId', () => {
  it.each([
    ['2401.01234v2', null, '2401.01234'],
    ['arXiv:2401.01234', null, '2401.01234'],
    [null, 'https://arxiv.org/abs/2401.01234v3', '2401.01234'],
    [null, 'https://arxiv.org/pdf/2401.01234v1.pdf', '2401.01234'],
    [null, 'https://arxiv.org/pdf/2401.01234.pdf', '2401.01234'],
    [null, 'http://arxiv.org/abs/hep-th/9901001v2', 'hep-th/9901001'],
    [null, 'https://arxiv.org/abs/math.GT/0309136', 'math.GT/0309136'],
    ['2401.99999', 'https://arxiv.org/abs/2401.00001', '2401.99999'],
    [null, 'https://example.com/paper', null],
    [null, 'https://arxiv.org/list/cs.RO/recent', null],
    ['', '', null],
  ])('(%s, %s) -> %s', (meta, url, out) => expect(extractArxivId(meta, url)).toBe(out));
});

const dr = (id: string, url: string, o: Partial<DupRow> = {}): DupRow => ({ id, source: 'x', url, arxivId: null, videoId: null, ...o });

describe('detectDuplicates', () => {
  const rows: DupRow[] = [
    dr('1', 'https://e.com/a?utm_source=x'),
    dr('2', 'https://e.com/a/'),
    dr('3', 'https://e.com/a'),
    dr('4', 'https://e.com/b'),
    dr('5', 'https://arxiv.org/abs/2401.00001v1', { source: 'arxiv', arxivId: '2401.00001v1' }),
    dr('6', 'https://arxiv.org/abs/2401.00001v2', { source: 'arxiv', arxivId: '2401.00001v2' }),
    dr('7', 'https://www.youtube.com/watch?v=V1', { videoId: 'V1' }),
    dr('8', 'https://youtu.be/V1', { videoId: 'V1' }),
    dr('9', 'junk', { videoId: '  ' }),
  ];
  const res = detectDuplicates(rows);

  it('counts the three kinds independently', () => {
    expect(res.status).toBe('ok');
    if (res.status !== 'ok') return;
    expect(res.result.urlNorm).toEqual({ groups: 1, rowsInGroups: 3, redundantRows: 2 });
    expect(res.result.arxivId).toEqual({ groups: 1, rowsInGroups: 2, redundantRows: 1 });
    expect(res.result.videoId).toEqual({ groups: 1, rowsInGroups: 2, redundantRows: 1 });
    expect(res.result.unparsableUrl).toBe(1);
    expect(res.result.rowsScanned).toBe(9);
  });
  it('limits samples to 5 groups per kind and 3 ids per group', () => {
    const many: DupRow[] = [];
    for (let g = 0; g < 8; g++) for (let i = 0; i < 4; i++) many.push(dr(`${g}-${i}`, `https://e.com/g${g}`));
    const r = detectDuplicates(many);
    if (r.status !== 'ok') throw new Error('unexpected');
    const urlSamples = r.result.samples.filter((s) => s.kind === 'urlNorm');
    expect(urlSamples).toHaveLength(5);
    expect(urlSamples[0]?.ids).toHaveLength(3);
    expect(urlSamples[0]?.size).toBe(4);
  });
  it('reports too_large once rows exceed the cap', () => {
    const r = detectDuplicates(rows, { maxRows: 5 });
    expect(r).toEqual({ status: 'too_large', rowsScanned: 5 });
    const d = createDuplicateDetector({ maxRows: 1 });
    expect(d.add(rows[0] as DupRow)).toBe(true);
    expect(d.add(rows[1] as DupRow)).toBe(false);
    expect(d.tooLarge).toBe(true);
  });
  it('an empty input has zero duplicates', () => {
    const r = detectDuplicates([]);
    expect(r.status === 'ok' && r.result.urlNorm.groups).toBe(0);
  });
});

describe('computeRatio / computeBacklogEta / projectMonthEnd / extractUsageTag', () => {
  it('ratio with a zero or missing denominator is na (never 0%)', () => {
    expect(computeRatio(0, 0)).toMatchObject({ value: null, na: true });
    expect(computeRatio(5, null)).toMatchObject({ value: null, na: true });
    expect(computeRatio(1, 4)).toMatchObject({ value: 0.25, na: false, numerator: 1, denominator: 4 });
    expect(computeRatio(0, 10).value).toBe(0);
  });
  it('backlog eta', () => {
    expect(computeBacklogEta(1000, 300, 100)).toEqual({ kind: 'days', days: 5 });
    expect(computeBacklogEta(1001, 300, 100)).toEqual({ kind: 'days', days: 6 });
    expect(computeBacklogEta(10, 300, 300)).toEqual({ kind: 'impossible', days: null });
    expect(computeBacklogEta(10, 20, 25)).toEqual({ kind: 'impossible', days: null });
    expect(computeBacklogEta(0, 20, 25)).toEqual({ kind: 'empty', days: 0 });
  });
  it('projectMonthEnd is na on the 1st and linear afterwards', () => {
    expect(projectMonthEnd(5, new Date(2026, 10, 1, 12))).toEqual({ na: true });
    const p = projectMonthEnd(10, new Date(2026, 10, 11, 0, 0, 0));
    expect(p.na).toBe(false);
    if (!p.na) expect(p.value).toBeCloseTo(10 / 10 * 30, 6);
  });
  it('usage tag', () => {
    expect(extractUsageTag('[weekly-brief] 2026-10-19 x')).toBe('weekly-brief');
    expect(extractUsageTag('[video-tagging] tag-batch')).toBe('video-tagging');
    expect(extractUsageTag('no tag')).toBe('(untagged)');
    expect(extractUsageTag(null)).toBe('(untagged)');
    expect(extractUsageTag('  [x] late')).toBe('(untagged)');
  });
});

describe('warning rule boundaries (§6)', () => {
  it('claude used pct: 80% warn, 100% error', () => {
    expect(severityForUsedPct(0.7999)).toBe('ok');
    expect(severityForUsedPct(0.8)).toBe('warn');
    expect(severityForUsedPct(0.9999)).toBe('warn');
    expect(severityForUsedPct(1)).toBe('error');
    expect(severityForUsedPct(null)).toBe('ok');
  });
  it('projected over the limit warns; equal does not', () => {
    expect(severityForProjected(50, 50)).toBe('ok');
    expect(severityForProjected(50.01, 50)).toBe('warn');
  });
  it('run age > 36h, skipped >= 1, audit age > 14d', () => {
    expect(severityForRunAge(36)).toBe('ok');
    expect(severityForRunAge(36.1)).toBe('warn');
    expect(severityForAtLeastOne(0)).toBe('ok');
    expect(severityForAtLeastOne(1)).toBe('warn');
    expect(severityForAuditAge(14)).toBe('ok');
    expect(severityForAuditAge(14.5)).toBe('warn');
  });
});

describe('sanitizeErrorMessage', () => {
  it('masks keys, tokens, bearer headers, urls and connection strings; one line; max length', () => {
    const s = sanitizeErrorMessage(new Error('fetch https://x.test/a?key=SECRETVALUE failed\n    at foo (file.ts:1:1)'));
    expect(s).not.toMatch(/SECRETVALUE|key=|at foo/);
    expect(sanitizeErrorMessage('Authorization Bearer abc.def-123')).toBe('Authorization Bearer [masked]');
    expect(sanitizeErrorMessage('connect postgres://u:p@h:5432/db refused')).not.toMatch(/postgres:\/\/|u:p/);
    expect(sanitizeErrorMessage('token=abc123 apikey: zzz')).not.toMatch(/abc123|zzz/);
    expect(sanitizeErrorMessage('sk-abcdefghijkl AIzaSyABCDEFGHIJKL')).not.toMatch(/sk-abc|AIza/);
    expect(sanitizeErrorMessage('x'.repeat(500)).length).toBeLessThanOrEqual(120);
    expect(sanitizeErrorMessage(undefined)).toBe('');
  });
});

describe('buildSectionStatus', () => {
  it('ok / partial / failed / na', () => {
    expect(buildSectionStatus([{ status: 'ok' }], [{ status: 'ok' }])).toBe('ok');
    expect(buildSectionStatus([{ status: 'ok' }, { status: 'failed' }], [])).toBe('partial');
    expect(buildSectionStatus([{ status: 'failed' }], [{ status: 'failed' }])).toBe('failed');
    expect(buildSectionStatus([{ status: 'na' }], [{ status: 'na' }])).toBe('na');
    expect(buildSectionStatus([], [])).toBe('na');
    expect(buildSectionStatus([{ status: 'ok' }, { status: 'na' }], [])).toBe('ok');
  });
});

describe('snapshot flatten + baseline delta', () => {
  const snap = flattenForSnapshot(coverageOkSample.sections, { takenAt: '2026-11-06T00:00:00.000Z', partial: false });

  it('stores numeric metrics and cells of diffable tables only; failed -> null; non-numeric excluded', () => {
    expect(snap.metrics['ingest.total']).toBe(coverageOkSample.sections[0]!.metrics[0]!.value);
    expect('run.lastFinishedAt' in snap.metrics).toBe(false);
    expect('run.quota.exhausted' in snap.metrics).toBe(false);
    expect(Object.keys(snap.cells).some((k) => k.startsWith('ingest.byGroup:youtube:total'))).toBe(true);
    expect(Object.keys(snap.cells).some((k) => k.startsWith('ingest.byChannel:'))).toBe(false);
    expect(Object.keys(snap.cells).some((k) => k.startsWith('quality.dup.samples:'))).toBe(false);
    expect(Object.values(snap.metrics).every((v) => v === null || typeof v === 'number')).toBe(true);
    const failed = flattenForSnapshot([{ ...coverageOkSample.sections[0]!, metrics: [{ ...coverageOkSample.sections[0]!.metrics[0]!, status: 'failed', value: null, reason: 'timeout' }] }], { takenAt: 'x', partial: true });
    expect(failed.metrics['ingest.total']).toBeNull();
  });
  it('stays well under 25KB for the full fixture and enforces the cap by dropping cells', () => {
    expect(Buffer.byteLength(JSON.stringify(snap))).toBeLessThan(25_000);
    const small = flattenForSnapshot(coverageOkSample.sections, { takenAt: 'x', partial: false }, 4500);
    expect(Buffer.byteLength(JSON.stringify(small))).toBeLessThanOrEqual(4500);
    expect(Object.keys(small.metrics).length).toBe(Object.keys(snap.metrics).length);
    expect(Object.keys(small.cells).length).toBeLessThan(Object.keys(snap.cells).length);
  });
  it('delta: count difference, ratio in percentage points, null where either side is missing', () => {
    const base = { ...snap, metrics: { ...snap.metrics, 'ingest.total': 400, 'analysis.video.tagRate': 0.5, 'analysis.video.tagged': null } };
    const merged = applyBaselineDelta(coverageOkSample.sections, base);
    const find = (id: string) => merged.flatMap((s) => s.metrics).find((m) => m.id === id)!;
    const total = find('ingest.total');
    expect(total.baseline).toBe(400);
    expect(total.delta).toBe((total.value as number) - 400);
    const rate = find('analysis.video.tagRate');
    expect(rate.delta).toBeCloseTo(((rate.value as number) - 0.5) * 100, 5);
    expect(find('analysis.video.tagged').delta).toBeNull();
    expect(find('run.config.githubTokenConfigured').baseline).toBeNull();
    const cell = merged[0]!.tables.find((t) => t.id === 'ingest.byGroup')!.rows[0]!;
    expect(cell.delta).toMatchObject({ total: 0 });
    expect(merged[0]!.tables.find((t) => t.id === 'ingest.byChannel')!.rows[0]!.delta).toBeUndefined();
  });
  it('without a baseline every baseline/delta is null and the input is not mutated', () => {
    const before = JSON.stringify(coverageOkSample);
    const merged = applyBaselineDelta(coverageOkSample.sections, null);
    expect(merged.flatMap((s) => s.metrics).every((m) => m.baseline === null && m.delta === null)).toBe(true);
    expect(JSON.stringify(coverageOkSample)).toBe(before);
  });
});
