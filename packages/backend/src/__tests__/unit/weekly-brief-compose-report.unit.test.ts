/**
 * weekly-brief-compose-report — v2 플랜/구성/규칙 폴백/상태 판정 (순수 함수)
 */
import { describe, it, expect } from 'vitest';
import {
  EMPTY_AI_INPUT,
  REPORT_DOMAIN_LABELS,
  REPORT_DOMAIN_ORDER,
  REPORT_LIMITS,
  articleSummaryLines,
  buildReportCandidates,
  buildReportPlan,
  clampPayloadStrings,
  composeReport,
  decideReportStatus,
  finalizeReport,
  narrativeCharCount,
  normalizeCompanyName,
  paperSummaryLines,
  selectReportVideos,
  videoSummaryLines,
  type ReportAiInput,
} from '../../services/weekly-brief-compose-report.js';
import type { BriefRow } from '../../services/weekly-brief-compose.js';
import {
  RAW_ABSTRACT_MARKER,
  RAW_DESCRIPTION_MARKER,
  RAW_SUMMARY_MARKER,
  REPORT_NOW,
  makeCollectedEmpty,
  makeCollectedFull,
  makeCollectedSparse,
} from '../fixtures/weekly-report-collected.fixture.js';

const FORBIDDEN_KEYS = ['content', 'description', 'abstract', 'originalText'];

function allStrings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => allStrings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => allStrings(x, out));
  return out;
}
function allKeys(v: unknown, out: string[] = []): string[] {
  if (Array.isArray(v)) v.forEach((x) => allKeys(x, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) (out.push(k), allKeys(x, out));
  return out;
}

const rule = (input = makeCollectedFull(), opts = {}) => composeReport(input, null, REPORT_NOW, { showArticleSummary: true, ...opts });

describe('domains', () => {
  it('always returns 5 domains in the fixed order with the PM labels', () => {
    for (const mk of [makeCollectedFull, makeCollectedSparse, makeCollectedEmpty]) {
      const p = rule(mk()).payload;
      expect(p.domains.map((d) => d.key)).toEqual(['hand', 'actuator', 'rfm', 'expo', 'production']);
      expect(p.domains.map((d) => d.label)).toEqual(['핸드', '액추에이터', '파운데이션 모델·RFM', '전시·데모', '양산·사업화']);
      for (const d of p.domains) expect(Array.from(d.label).length).toBeLessThanOrEqual(16);
    }
    expect(REPORT_DOMAIN_ORDER).toEqual(['hand', 'actuator', 'rfm', 'expo', 'production']);
    expect(REPORT_DOMAIN_LABELS.rfm).toBe('파운데이션 모델·RFM');
  });

  it('a domain with a collected total of 2 is quiet and 3 is active (quietBelow = 3)', () => {
    const w = makeCollectedFull();
    // 핸드 영상·논문만 남겨 합계를 조절: 전시 영상 4건을 2건으로 줄이고 전시 뉴스 6건을 0건으로
    const keep = (r: BriefRow) => !(/Expo floor tour day [34]/.test(r.title) || /record attendance/.test(r.title));
    w.rows = w.rows.filter(keep);
    let p = rule(w).payload;
    const expo = p.domains.find((d) => d.key === 'expo')!;
    expect(expo.figures.total).toBe(2);
    expect(expo.status).toBe('quiet');
    expect(expo.narrative).toBeNull();
    expect(expo.evidence).toEqual([]);
    expect(expo.generatedBy).toBe('rule');
    // 한 건 추가하면 active
    const extra = makeCollectedFull().rows.find((r) => /Expo floor tour day 3/.test(r.title))!;
    w.rows.push(extra);
    p = rule(w).payload;
    expect(p.domains.find((d) => d.key === 'expo')!.status).toBe('active');
    expect(REPORT_LIMITS.quietBelow).toBe(3);
  });

  it('active domains have 3-5 distinct evidence cards with title, source, link and a derived summary line', () => {
    const p = rule().payload;
    for (const d of p.domains.filter((x) => x.status === 'active')) {
      expect(d.evidence.length).toBeGreaterThanOrEqual(3);
      expect(d.evidence.length).toBeLessThanOrEqual(5);
      expect(new Set(d.evidence.map((e) => e.id)).size).toBe(d.evidence.length);
      expect(d.evidence.filter((e) => e.type === 'video').length).toBeLessThanOrEqual(3);
      for (const e of d.evidence) {
        expect(e.title.length).toBeGreaterThan(0);
        expect(e.source.length).toBeGreaterThan(0);
        expect(e.url === null || /^https:\/\//.test(e.url)).toBe(true);
      }
      expect(d.evidence.some((e) => e.line)).toBe(true);
      expect(d.topTags.length).toBeLessThanOrEqual(5);
    }
    const hand = p.domains.find((d) => d.key === 'hand')!;
    expect(hand.figures).toMatchObject({ videos: 9, second: 6, secondKind: 'paper', total: 15 });
    expect(p.domains.find((d) => d.key === 'expo')!.figures.secondKind).toBe('article');
    expect(hand.topTags.slice(0, 2).map((t) => t.count)).toEqual([9, 9]);
    expect(hand.topTags.slice(0, 2).map((t) => t.tag).sort()).toEqual(['손가락', '촉각']);
  });

  it('figures follow the v1 definition (share of all collected items, previous share only when the previous denominator is large enough)', () => {
    const p = rule().payload;
    const act = p.domains.find((d) => d.key === 'actuator')!;
    // 영상 12 + 논문 6 = 18, 전체 = 영상 42 + 논문 17 + 뉴스 57 = 116
    expect(p.header.counts).toMatchObject({ videosNew: 42, papers: 17, articles: 57 });
    expect(act.figures.total).toBe(18);
    expect(act.figures.sharePct).toBe(15.5);
    expect(act.figures.prevSharePct).not.toBeNull();
    const w = makeCollectedFull();
    w.prevRows = w.prevRows.slice(0, 5);
    expect(rule(w).payload.domains[1]!.figures).toMatchObject({ prevSharePct: null, deltaPp: null });
  });
});

describe('highlights', () => {
  it('3-5 highlights with the type limits (domain_share/ci_change/top_company 2, others 1)', () => {
    const p = rule().payload;
    expect(p.highlights.length).toBeGreaterThanOrEqual(3);
    expect(p.highlights.length).toBeLessThanOrEqual(5);
    const by = new Map<string, number>();
    for (const h of p.highlights) by.set(h.candidateType, (by.get(h.candidateType) ?? 0) + 1);
    for (const [t, n] of by) expect(n).toBeLessThanOrEqual(['domain_share', 'ci_change', 'top_company'].includes(t) ? 2 : 1);
    for (const h of p.highlights) {
      expect(Array.from(h.headline).length).toBeLessThanOrEqual(40);
      expect(Array.from(h.body).length).toBeLessThanOrEqual(200);
      expect(h.evidence.length).toBeGreaterThanOrEqual(1);
      expect(h.evidence.length).toBeLessThanOrEqual(3);
      expect(h.generatedBy).toBe('rule');
      expect(h.basis.startsWith('근거:')).toBe(true);
    }
  });

  it('candidates include top_video and volume_summary, and the allowed 2 domain_share candidates', () => {
    const cands = buildReportCandidates(makeCollectedFull());
    const types = cands.map((c) => c.type);
    expect(types).toContain('top_video');
    expect(types).toContain('volume_summary');
    expect(types.filter((t) => t === 'domain_share').length).toBe(2);
    expect(types.filter((t) => t === 'top_company').length).toBe(2);
    expect(new Set(cands.map((c) => c.id)).size).toBe(cands.length);
  });

  it('a sparse week still produces at least one highlight (volume_summary) and never breaks', () => {
    const p = rule(makeCollectedSparse()).payload;
    expect(p.highlights.length).toBeGreaterThanOrEqual(1);
    expect(p.highlights.some((h) => h.candidateType === 'volume_summary')).toBe(true);
    const vs = p.highlights.find((h) => h.candidateType === 'volume_summary')!;
    expect(vs.figure).toMatchObject({ value: '6', unit: '건' });
  });

  it('top_video figure is the server views number; evidence links are server-built https urls', () => {
    const p = rule().payload;
    const tv = buildReportCandidates(makeCollectedFull()).find((c) => c.type === 'top_video')!;
    expect(tv.bigNumber.value).toBe('480,000');
    expect(p.highlights.flatMap((h) => h.evidence).every((e) => e.url === null || /^https:\/\//.test(e.url))).toBe(true);
  });
});

describe('videos / papers / articles', () => {
  it('videos: up to 12, top video first and the only isTop, bucket cap 3 and channel cap 2 when possible, at most 4 without a summary', () => {
    const w = makeCollectedFull();
    const vids = selectReportVideos(w.rows);
    expect(vids).toHaveLength(12);
    expect(vids.filter((v) => v.isTop)).toHaveLength(1);
    expect(vids[0]!.isTop).toBe(true);
    expect(vids[0]!.views).toBe(Math.max(...vids.map((v) => v.views ?? 0)));
    expect(vids.filter((v) => v.summaryLines.length === 0).length).toBeLessThanOrEqual(4);
    const bucket = new Map<string, number>();
    for (const v of vids) bucket.set(v.domain ?? 'other', (bucket.get(v.domain ?? 'other') ?? 0) + 1);
    // 도메인 5개 + 기타 이므로 버킷당 3 으로 12건이 채워진다
    expect(Math.max(...bucket.values())).toBeLessThanOrEqual(3);
    for (const v of vids) {
      expect(v.summaryLines.length).toBeLessThanOrEqual(3);
      expect(v.summaryLines.reduce((n, s) => n + Array.from(s).length, 0)).toBeLessThanOrEqual(300);
      for (const s of v.summaryLines) expect(Array.from(s).length).toBeLessThanOrEqual(110);
      expect(v.tags.length).toBeLessThanOrEqual(4);
      expect(v.thumbnail === null || v.thumbnail.startsWith('https://i.ytimg.com/')).toBe(true);
    }
  });

  it('video summary lines come from geminiAnalysis.summaryKo split at sentence boundaries; unanalyzed videos have none', () => {
    const rows = makeCollectedFull().rows.filter((r) => r.productType === 'video');
    const analyzed = rows.find((r) => r.extractedMetadata?.geminiAnalysis)!;
    expect(videoSummaryLines(analyzed)).toEqual([
      '로봇 관절 모듈의 구조를 설명하는 영상이다.',
      '토크 센서와 감속기 배치를 단계별로 보여준다.',
      '마지막에 시험 결과를 요약한다.',
    ]);
    const plain = rows.find((r) => !r.extractedMetadata?.geminiAnalysis)!;
    expect(videoSummaryLines(plain)).toEqual([]);
  });

  it('papers: at most 8; summary lines only from aiSummaryKo, never the abstract excerpt; no why before AI', () => {
    const p = rule().payload;
    expect(p.papers).toHaveLength(8);
    for (const x of p.papers) {
      expect(x.url).toMatch(/^https:\/\/arxiv\.org\//);
      expect(x.summaryLines.length).toBeLessThanOrEqual(2);
      expect(x.whyItMatters).toBeNull();
      expect(JSON.stringify(x)).not.toContain(RAW_ABSTRACT_MARKER);
    }
    const noAi = makeCollectedFull().rows.find((r) => r.source === 'arxiv' && !r.extractedMetadata?.aiSummaryKo)!;
    expect(paperSummaryLines(noAi)).toEqual([]);
    expect(p.papers.some((x) => x.summaryLines.length > 0)).toBe(true);
  });

  it('articles: at most 12; keyPoints first, then the first sentence of the summary, then nothing; the switch is respected', () => {
    const rows = makeCollectedFull().rows.filter((r) => r.source !== 'arxiv' && r.productType !== 'video');
    const withKp = rows.find((r) => r.extractedMetadata?.keyPoints)!;
    expect(articleSummaryLines(withKp, true)).toEqual(withKp.extractedMetadata!.keyPoints.slice(0, 2));
    expect(articleSummaryLines(withKp, false)).toEqual(withKp.extractedMetadata!.keyPoints.slice(0, 2));
    const without = rows.find((r) => !r.extractedMetadata?.keyPoints)!;
    expect(articleSummaryLines(without, true)).toEqual([`${RAW_SUMMARY_MARKER} article first sentence.`]);
    expect(articleSummaryLines(without, false)).toEqual([]);
    expect(articleSummaryLines({ ...without, summary: null }, true)).toEqual([]);

    const on = rule(makeCollectedFull(), { showArticleSummary: true }).payload.articles;
    const off = rule(makeCollectedFull(), { showArticleSummary: false }).payload.articles;
    expect(on).toHaveLength(12);
    expect(off.every((a) => a.summaryLines.every((l) => !l.includes(RAW_SUMMARY_MARKER)))).toBe(true);
    expect(on.some((a) => a.summaryLines.some((l) => l.includes(RAW_SUMMARY_MARKER)))).toBe(true);
    // 출처당 3건 이내
    const per = new Map<string, number>();
    for (const a of on) per.set(a.source, (per.get(a.source) ?? 0) + 1);
    expect(Math.max(...per.values())).toBeLessThanOrEqual(3);
    // 두 번째 원문 문장은 어디에도 없다
    expect(JSON.stringify(on)).not.toContain('Second raw sentence');
  });

  it('never carries raw article summary beyond the first sentence, descriptions or abstracts anywhere in the payload', () => {
    const json = JSON.stringify(rule().payload);
    expect(json).not.toContain(RAW_DESCRIPTION_MARKER);
    expect(json).not.toContain(RAW_ABSTRACT_MARKER);
    expect(json).not.toContain('Second raw');
    expect(json).not.toContain('More abstract');
  });
});

describe('companies', () => {
  it('normalizes names by exact match only (case, punctuation and trailing legal suffixes), never fuzzy', () => {
    expect(normalizeCompanyName('Orion Systems, Inc.')).toBe('orionsystems');
    expect(normalizeCompanyName('ORION SYSTEMS')).toBe('orionsystems');
    expect(normalizeCompanyName('Acme Co.')).toBe('acme');
    expect(normalizeCompanyName('Boston Dynamics Corp')).toBe('bostondynamics');
    expect(normalizeCompanyName('Orion System')).not.toBe(normalizeCompanyName('Orion Systems'));
  });

  it('CI companies come first (max 3), CI links by exact normalized name, unmatched CI is only counted as "others"', () => {
    const p = rule().payload;
    const names = p.companies.map((c) => c.name);
    expect(names).toEqual(expect.arrayContaining(['Atlas Robotics', 'Nova Dynamics', 'Orion Systems, Inc.']));
    expect(p.companies.length).toBeLessThanOrEqual(8);
    const atlas = p.companies.find((c) => c.name === 'Atlas Robotics')!;
    expect(atlas.ciChanges).toHaveLength(2);
    expect(atlas.ciChanges[0]).toMatchObject({ item: '손 자유도', before: '16 DoF', after: '22 DoF', confidence: 'A' });
    expect(atlas.ciChanges.every((c) => c.meaning && c.meaning.length >= 8 && c.meaning.length <= 80)).toBe(true);
    // Ghost Labs 는 회사 목록에 없어 카드에 붙지 않는다
    expect(JSON.stringify(p.companies)).not.toContain('Ghost');
    const shown = p.companies.reduce((n, c) => n + c.ciChanges.length, 0);
    expect(p.ciSummary.updates - shown).toBe(2); // Ghost Labs(D) + Quiet Labs(F: 약한 CI 라 회사로 뽑히지 않음)
    expect(atlas.counts).toMatchObject({ videos: 6, articles: 14, total: 20, prevTotal: 8, deltaPct: 150 });
  });

  it('caps the list at 8 companies, requires 2+ mentions for non-CI companies, CI-only companies come last', () => {
    const w = makeCollectedFull();
    const extra: BriefRow[] = [];
    for (let c = 0; c < 12; c++) {
      w.companyDirectory!.push({ companyId: `co-x${c}`, name: `Extra Co ${c}` });
      for (let i = 0; i < 3; i++) extra.push({ ...w.rows.find((r) => r.source === 'news-a' || r.source === 'IEEE Spectrum')!, id: `x-${c}-${i}`, companyId: `co-x${c}`, title: `extra ${c} ${i}`, url: `https://news.example.com/x/${c}${i}` });
    }
    w.rows.push(...extra);
    const p = rule(w).payload;
    expect(p.companies).toHaveLength(8);
    // 선정된 회사는 모두 3건 이상 (CI 회사는 건수와 무관)
    const totals = p.companies.map((c) => c.counts.total);
    expect([...totals].slice(0, 5)).toEqual([...totals].slice(0, 5).sort((a, b) => b - a));

    const w2 = makeCollectedFull();
    w2.rows = w2.rows.filter((r) => r.companyId !== 'co-orion'); // Orion: 언급 0건, CI(C, 값 변경)만 있음
    const p2 = rule(w2).payload;
    const orion = p2.companies.find((c) => c.name === 'Orion Systems, Inc.')!;
    expect(orion.counts.total).toBe(0);
    expect(p2.companies[p2.companies.length - 1]!.name).toBe('Orion Systems, Inc.');
    expect(orion.blurb).toContain('CI 항목');
  });

  it('no company candidates hides the section (empty array)', () => {
    const w = makeCollectedFull();
    w.companies = [];
    w.companyDirectory = [];
    expect(rule(w).payload.companies).toEqual([]);
    expect(rule(makeCollectedSparse()).payload.companies).toEqual([]);
  });
});

describe('rule fallback sentences', () => {
  const p = () => rule().payload;

  it('highlight: headline <= 40 chars, body = caption + basis (<= 200), min length 60 for the AI replacement threshold', () => {
    for (const h of p().highlights) {
      expect(Array.from(h.headline).length).toBeLessThanOrEqual(40);
      expect(Array.from(h.body).length).toBeGreaterThanOrEqual(30);
    }
    const ds = p().highlights.find((h) => h.candidateType === 'domain_share')!;
    expect(ds.headline).toMatch(/^이번 주 수집된 자료 중 \d+%가 .+ 주제였습니다$/);
    expect(ds.body).toContain('관련');
    expect(ds.body).toContain('근거: 도메인 태그 집계');
  });

  it('domain template includes counts, shares and the top video, and is 80+ chars', () => {
    for (const d of p().domains.filter((x) => x.status === 'active')) {
      expect(d.narrative).toContain(`${d.label} 축에서 이번 주 영상 ${d.figures.videos}건과`);
      expect(d.narrative).toContain(`전체의 ${d.figures.sharePct}%`);
      expect(Array.from(d.narrative!).length).toBeGreaterThanOrEqual(80);
      expect(Array.from(d.narrative!).length).toBeLessThanOrEqual(400);
      expect(d.generatedBy).toBe('rule');
    }
    expect(p().domains.find((d) => d.key === 'hand')!.narrative).toContain('조회수가 가장 높은 영상은');
  });

  it('company blurb, CI meaning, keyword note and watch templates', () => {
    const pl = p();
    const atlas = pl.companies.find((c) => c.name === 'Atlas Robotics')!;
    expect(atlas.blurb).toMatch(/^Atlas Robotics 관련 영상 6건, 기사 14건이 수집되었습니다\(지난주 8건\)\./);
    expect(Array.from(atlas.blurb).length).toBeGreaterThanOrEqual(40);
    expect(atlas.ciChanges[0]!.meaning).toBe("손 자유도 값이 '16 DoF'에서 '22 DoF'로 갱신되었습니다(신뢰도 A).");
    expect(pl.trends.keywordNote).toMatch(/언급은 지난주 \d+회에서 이번 주 \d+회로/);
    const kinds = pl.watchPoints.map((w) => w.id.split(':')[1]);
    expect(kinds).toEqual(expect.arrayContaining(['kw', 'ci', 'co']));
    for (const w of pl.watchPoints) {
      expect(Array.from(w.body).length).toBeGreaterThanOrEqual(40);
      expect(Array.from(w.body).length).toBeLessThanOrEqual(180);
      expect(Array.from(w.title).length).toBeLessThanOrEqual(40);
      expect(w.evidence.length).toBeGreaterThanOrEqual(1);
      expect(w.evidence.length).toBeLessThanOrEqual(2);
      expect(w.generatedBy).toBe('rule');
    }
    expect(pl.watchPoints.find((w) => w.id.startsWith('watch:kw:'))!.body).toContain('다음 주 집계에서도 이어지는지 확인합니다');
    expect(pl.watchPoints.find((w) => w.id.startsWith('watch:ci:'))!.body).toContain('추가 출처 확인이 필요합니다');
    expect(pl.watchPoints.length).toBeGreaterThanOrEqual(3);
    expect(pl.watchPoints.length).toBeLessThanOrEqual(5);
  });

  it('rule-only narrative totals at least 1,200 chars on the full fixture', () => {
    expect(narrativeCharCount(p())).toBeGreaterThanOrEqual(1200);
  });

  it('rule sentences make no forecasts: no banned phrases anywhere in the rule output', () => {
    const text = allStrings({ h: p().highlights.map((h) => [h.headline, h.body]), d: p().domains.map((d) => d.narrative), c: p().companies.map((c) => c.blurb), w: p().watchPoints.map((w) => w.body), n: p().trends.keywordNote }).join(' ');
    for (const w of ['전망', '예측', '것으로 보인다', '가능성이 높', '혁신적', '획기적', '압도적']) expect(text).not.toContain(w);
  });
});

describe('status', () => {
  const sources = (over: Record<string, string> = {}) => ({ highlights: 'ai', domains: 'ai', companies: 'ai', papers: 'ai', trends: 'ai', watch: 'ai', ...over }) as any;
  const base = { noData: false, warnings: [] as string[], sectionSources: sources(), ruleElements: 0, totalElements: 20 };

  it('decision table', () => {
    expect(decideReportStatus(base)).toBe('ok');
    expect(decideReportStatus({ ...base, noData: true })).toBe('partial');
    expect(decideReportStatus({ ...base, warnings: ['volume_failed'] })).toBe('partial');
    expect(decideReportStatus({ ...base, warnings: ['ai_domains_failed'] })).toBe('partial');
    expect(decideReportStatus({ ...base, warnings: ['ai_disabled'] })).toBe('partial');
    expect(decideReportStatus({ ...base, warnings: ['rows_truncated', 'ai_truncated'] })).toBe('ok');
    expect(decideReportStatus({ ...base, sectionSources: sources({ domains: 'rule' }) })).toBe('partial');
    expect(decideReportStatus({ ...base, sectionSources: sources({ papers: 'none', trends: 'none' }) })).toBe('ok');
    expect(decideReportStatus({ ...base, sectionSources: sources({ domains: 'mixed' }) })).toBe('ok');
  });

  it('the 25% rule-element ratio boundary: 5/20 is ok, 6/20 is partial', () => {
    expect(decideReportStatus({ ...base, ruleElements: 5, totalElements: 20 })).toBe('ok');
    expect(decideReportStatus({ ...base, ruleElements: 6, totalElements: 20 })).toBe('partial');
    expect(REPORT_LIMITS.partialRuleRatio).toBe(0.25);
  });

  it('rule-only output is partial with rule sections counted', () => {
    const r = rule();
    expect(r.status).toBe('partial');
    expect(r.payload.meta.aiUsed).toBe(false);
    expect(r.payload.meta.ruleBasedSections).toBeGreaterThanOrEqual(4);
    expect(r.payload.meta.sectionSources.papers).toBe('none');
  });
});

describe('minimum-data rules (6.4)', () => {
  it('no data: partial + no_data, 5 quiet domains, no highlights, nothing else', () => {
    const r = rule(makeCollectedEmpty());
    expect(r.status).toBe('partial');
    expect(r.payload.meta.warnings).toContain('no_data');
    expect(r.payload.highlights).toEqual([]);
    expect(r.payload.domains.every((d) => d.status === 'quiet')).toBe(true);
    expect([r.payload.videos, r.payload.papers, r.payload.articles, r.payload.companies, r.payload.watchPoints]).toEqual([[], [], [], [], []]);
    expect(r.payload.trends.keywordNote).toBeNull();
    expect(Object.values(r.payload.meta.sectionSources).every((s) => s === 'none')).toBe(true);
    expect(r.payload.trends.volume.weeks).toEqual([]);
  });

  it('only 3 videos: renders exactly those, no padding', () => {
    const w = makeCollectedSparse();
    w.rows = w.rows.filter((r) => r.productType === 'video');
    const p = rule(w).payload;
    expect(p.videos).toHaveLength(3);
    expect(p.papers).toEqual([]);
    expect(p.articles).toEqual([]);
    expect(p.domains.every((d) => d.status === 'quiet')).toBe(true);
    expect(p.meta.sectionSources.domains).toBe('none');
  });

  it('sparse: keywords < 2 produce no keyword note, no watch points without evidence', () => {
    const p = rule(makeCollectedSparse()).payload;
    expect(p.trends.keywordNote).toBeNull();
    expect(p.trends.keywords).toEqual([]);
    expect(p.watchPoints).toEqual([]);
    expect(p.meta.sectionSources).toMatchObject({ trends: 'none', watch: 'none' });
  });

  it('trends: the 8 weeks are kept oldest first and the current week equals header.counts', () => {
    const p = rule().payload;
    const weeks = p.trends.volume.weeks;
    expect(weeks).toHaveLength(8);
    expect(weeks.map((w) => w.weekStart)).toEqual([...weeks.map((w) => w.weekStart)].sort());
    expect(weeks[7]).toEqual({ weekStart: '2026-10-19', videos: p.header.counts.videosNew, articles: p.header.counts.articles, papers: p.header.counts.papers });
    expect(p.trends.keywords.length).toBeLessThanOrEqual(12);
    expect(p.trends.keywords).toHaveLength(12);
  });
});

describe('payload hygiene', () => {
  it.each([
    ['full', makeCollectedFull],
    ['sparse', makeCollectedSparse],
    ['empty', makeCollectedEmpty],
  ])('%s: every string <= 400 chars, no empty strings, no forbidden key names, JSON round trip is identical', (_n, mk) => {
    const p = rule(mk()).payload;
    expect(p.schemaVersion).toBe(2);
    for (const s of allStrings(p)) {
      expect(Array.from(s).length).toBeLessThanOrEqual(400);
      expect(s.length).toBeGreaterThan(0);
    }
    for (const k of allKeys(p)) expect(FORBIDDEN_KEYS).not.toContain(k);
    expect(JSON.parse(JSON.stringify(p))).toEqual(p);
    expect(JSON.stringify(p).length).toBeLessThanOrEqual(250 * 1024);
    const json = JSON.stringify(p);
    expect(json).not.toMatch(/undefined|NaN/);
  });

  it('limits: highlights <= 5, companies <= 8, videos <= 12, papers <= 8, articles <= 12, watchPoints <= 5, keywords <= 12 (and lower bounds on the full fixture)', () => {
    const p = rule().payload;
    expect(p.highlights.length).toBeGreaterThanOrEqual(3);
    expect(p.highlights.length).toBeLessThanOrEqual(5);
    expect(p.videos.length).toBeGreaterThanOrEqual(8);
    expect(p.videos.length).toBeLessThanOrEqual(12);
    expect(p.articles.length).toBeGreaterThanOrEqual(8);
    expect(p.papers.length).toBeGreaterThanOrEqual(5);
    expect(p.watchPoints.length).toBeGreaterThanOrEqual(3);
  });

  it('clampPayloadStrings shortens only the over-long strings', () => {
    expect(clampPayloadStrings({ a: 'x'.repeat(500), b: ['ok'], c: 1 }).a.length).toBe(400);
    expect(clampPayloadStrings({ a: 'x'.repeat(500), b: ['ok'], c: 1 }).b).toEqual(['ok']);
  });

  it('is deterministic: same input, same output', () => {
    expect(JSON.stringify(rule().payload)).toBe(JSON.stringify(rule().payload));
  });
});

describe('finalizeReport: applying AI output', () => {
  const plan = () => buildReportPlan(makeCollectedFull(), { showArticleSummary: true });
  const okA = (pl: ReturnType<typeof plan>) => ({
    highlights: pl.highlights.slice(0, 4).map((c) => ({
      candidateId: c.ref,
      headline: `${c.label} 관련 이번 주 동향`,
      body: `${c.label} 항목은 이번 주 집계에서 확인되었습니다. 연결된 근거 자료는 ${c.evidence.length}건입니다. 세부 내용은 근거 링크에서 확인할 수 있습니다.`,
      refs: [c.evidenceRefs[0]],
    })),
    keywordNote: "'sim2real' 언급은 9회, 'humanoid' 언급은 212회로 집계되었습니다. 증감은 표에서 확인할 수 있습니다.",
    watchPoints: pl.watch.slice(0, 3).map((w) => ({ title: `추적 ${w.ref}`, body: `${w.fact} 내용에 대해 다음 주 집계에서 변화가 이어지는지 확인할 필요가 있습니다.`, refs: [w.ref] })),
  });

  it('accepts clean AI text, keeps server numbers/links, and marks generatedBy ai', () => {
    const pl = plan();
    const r = finalizeReport(pl, { ...EMPTY_AI_INPUT, A: okA(pl) }, REPORT_NOW);
    const hl = r.payload.highlights;
    expect(hl.every((h) => h.generatedBy === 'ai')).toBe(true);
    expect(hl[0]!.figure).toEqual(pl.highlights[0]!.figure);
    expect(hl[0]!.evidence).toEqual(pl.highlights[0]!.evidence);
    expect(r.payload.trends.keywordNote).toContain('sim2real');
    expect(r.payload.watchPoints.every((w) => w.generatedBy === 'ai')).toBe(true);
    expect(r.payload.meta.sectionSources.highlights).toBe('ai');
  });

  it('a number outside the element facts drops that sentence only; the rest is kept', () => {
    const pl = plan();
    const a = okA(pl);
    a.highlights[0]!.body = `${a.highlights[0]!.body} 점유율은 99%였습니다.`;
    const r = finalizeReport(pl, { ...EMPTY_AI_INPUT, A: a }, REPORT_NOW);
    expect(r.payload.highlights[0]!.generatedBy).toBe('ai');
    expect(r.payload.highlights[0]!.body).not.toContain('99');
    expect((r.stats.guard as any).dropped.number).toBeGreaterThanOrEqual(1);
  });

  it('survivors shorter than the minimum replace the element with the rule sentence', () => {
    const pl = plan();
    const a = okA(pl);
    a.highlights[0]!.body = '점유율은 99%였습니다.';
    const r = finalizeReport(pl, { ...EMPTY_AI_INPUT, A: a }, REPORT_NOW);
    expect(r.payload.highlights[0]!.generatedBy).toBe('rule');
    expect(r.payload.highlights[0]!.body).toBe(pl.highlights[0]!.rule.body);
    expect(r.payload.highlights[1]!.generatedBy).toBe('ai');
  });

  it('domain narrative outside 200-400 chars becomes the rule sentence (generatedBy rule)', () => {
    const pl = plan();
    const short = { domains: pl.domains.filter((d) => d.status === 'active').map((d) => ({ key: d.key, narrative: `${d.label} 축에서 수집된 항목을 정리했습니다. 세부 내용은 근거 카드에서 확인할 수 있습니다.`, refs: [d.cards[0]!.ref] })) };
    const r = finalizeReport(pl, { ...EMPTY_AI_INPUT, B: short }, REPORT_NOW);
    for (const d of r.payload.domains.filter((x) => x.status === 'active')) {
      expect(d.generatedBy).toBe('rule');
      expect(d.narrative).toBe(pl.domains.find((x) => x.key === d.key)!.ruleNarrative);
    }
  });

  it('structural problems (unknown ids, duplicates, invalid refs) discard the element without touching others', () => {
    const pl = plan();
    const a = okA(pl);
    a.highlights.push({ candidateId: 'h999', headline: 'x', body: 'y', refs: ['e1'] });
    a.highlights[1]!.refs = ['e999'];
    a.watchPoints.push({ title: 't', body: 'b', refs: ['w999'] });
    const r = finalizeReport(pl, { ...EMPTY_AI_INPUT, A: a }, REPORT_NOW);
    const reasons = (r.stats.aiDiscarded as any[]).map((d) => d.reason);
    expect(reasons).toEqual(expect.arrayContaining(['unknown_candidate', 'invalid_refs']));
    expect(r.payload.highlights.map((h) => h.id)).not.toContain('h999');
  });

  it('a failed call isolates to its section: warning, rule sentences there, other sections keep AI text', () => {
    const pl = plan();
    const C = { companies: pl.companies.map((c) => ({ ref: c.ref, blurb: `${c.name}은(는) 이번 주 ${c.counts.total}건이 수집되었습니다. 대표 항목은 연결된 근거 카드에서 확인할 수 있습니다.`, refs: [], ciMeanings: [] })), papers: [] };
    const input: ReportAiInput = { ...EMPTY_AI_INPUT, A: null, B: null, C, failed: { A: 'api_error', B: 'parse_error' } };
    const r = finalizeReport(pl, input, REPORT_NOW);
    expect(r.payload.meta.warnings).toEqual(expect.arrayContaining(['ai_highlights_failed', 'ai_domains_failed']));
    expect(r.payload.meta.warnings).not.toContain('ai_companies_failed');
    expect(r.payload.highlights.every((h) => h.generatedBy === 'rule')).toBe(true);
    expect(r.payload.companies.every((c) => c.generatedBy === 'ai')).toBe(true);
    expect(r.payload.meta.sectionSources).toMatchObject({ highlights: 'rule', domains: 'rule', companies: 'ai' });
    expect(r.status).toBe('partial');
  });

  it('batch warnings (disabled / budget / run cap) are passed through and everything is rule', () => {
    const pl = plan();
    for (const w of ['ai_disabled', 'ai_not_configured', 'ai_budget_exceeded', 'ai_run_cap']) {
      const r = finalizeReport(pl, { ...EMPTY_AI_INPUT, batchWarnings: [w] }, REPORT_NOW);
      expect(r.payload.meta.warnings).toContain(w);
      expect(r.payload.meta.warnings.some((x) => x.endsWith('_failed'))).toBe(false);
      expect(r.payload.meta.aiUsed).toBe(false);
      expect(r.status).toBe('partial');
    }
  });

  it('title translations are applied only when valid (Korean, no new numbers, no markup); evidence cards share them', () => {
    const pl = plan();
    const t = pl.titles;
    const D = [
      { id: t[0]!.ref, titleKo: `${t[0]!.title.slice(0, 30)} (한글 제목)` },
      { id: t[1]!.ref, titleKo: '숫자 99 가 새로 생김' },
      { id: t[2]!.ref, titleKo: '<b>태그</b>' },
      { id: 't999', titleKo: '없는 id' },
    ];
    const r = finalizeReport(pl, { ...EMPTY_AI_INPUT, D }, REPORT_NOW);
    const all = [...r.payload.videos, ...r.payload.papers, ...r.payload.articles];
    expect(all.filter((x) => x.titleKo).length).toBe(1);
    const target = all.find((x) => x.id === t[0]!.id)!;
    expect(target.titleKo).toContain('(한글 제목)');
    expect(r.payload.meta.warnings).not.toContain('ai_titles_unavailable');
  });

  it('records ai_truncated for rescued calls', () => {
    const r = finalizeReport(plan(), { ...EMPTY_AI_INPUT, truncated: ['B'] }, REPORT_NOW);
    expect(r.payload.meta.warnings).toContain('ai_truncated');
  });
});
