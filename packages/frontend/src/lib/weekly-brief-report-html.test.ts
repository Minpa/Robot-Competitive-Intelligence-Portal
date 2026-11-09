import { describe, expect, it } from 'vitest';
import type { WeeklyReportResponse } from '@/types/weekly-brief';
import { POSTER_COLORS, REPORT_CHART } from './weekly-brief-theme';
import { buildWeeklyBriefHtml, weeklyBriefFileName } from './weekly-brief-html';
import { buildReportHtml } from './weekly-brief-report-html';
import { estimateReadingMinutes, planReportSections, reportAnchorIds } from './weekly-brief-report';
import { makeEmptyReport, makeFullReport, makePartialReport, makeSparseReport } from './weekly-brief-test-fixtures';

const META = { pageUrl: 'https://argos.example.com/share/weekly/2026-10-19' };

/** 명세 10.2 금지 문자열 (대소문자 무시, 전체 출력 기준) */
const FORBIDDEN = [
  '<script', '<link', '@import', 'url(', 'http://', 'javascript:', 'data:', '<iframe', '<object', '<embed', '<form', 'onerror', 'onclick', 'onload',
  '<foreignobject', '<use', 'xlink:href', 'xmlns=',
];
const SVG_ALLOWED = new Set(['svg', 'title', 'polyline', 'rect', 'circle', 'line', 'text']);

function ids(html: string): Set<string> {
  return new Set([...html.matchAll(/\bid="([^"]*)"/g)].map((m) => m[1]!));
}

function expectClean(html: string) {
  const lower = html.toLowerCase();
  for (const f of FORBIDDEN) expect(lower.includes(f), `금지 문자열 "${f}"`).toBe(false);
  // src= 는 <img 안에서만
  expect(/\bsrc\s*=/i.test(html.replace(/<img\b[^>]*>/gi, '')), 'src= outside <img>').toBe(false);
  for (const img of html.match(/<img\b[^>]*>/gi) ?? []) {
    const m = /\bsrc="([^"]*)"/.exec(img);
    expect(m, img).not.toBeNull();
    expect(m![1]!.startsWith('https://i.ytimg.com/'), m![1]).toBe(true);
    expect(img).toContain('referrerpolicy="no-referrer"');
    expect(img).toContain('loading="eager"'); // v2 정적 HTML 은 eager 필수(인쇄 시 썸네일 누락 방지, PM 결정)
    expect(img).not.toContain('loading="lazy"');
  }
  // href: https:// 이거나, 문서 안에 id 가 있는 #앵커
  const known = ids(html);
  for (const a of html.match(/<a\b[^>]*>/gi) ?? []) {
    const m = /\bhref="([^"]*)"/.exec(a);
    expect(m, a).not.toBeNull();
    const href = m![1]!;
    if (href.startsWith('#')) {
      expect(href, a).toMatch(/^#[a-z0-9-]+$/);
      expect(known.has(href.slice(1)), `dead anchor ${href}`).toBe(true);
      expect(a, '내부 링크에는 target/rel 을 붙이지 않는다').not.toContain('target=');
    } else {
      expect(href.startsWith('https://'), href).toBe(true);
      expect(a).toContain('target="_blank"');
      expect(a).toContain('rel="noopener noreferrer"');
    }
  }
  for (const m of html.matchAll(/\bhref="([^"]*)"/gi)) expect(m[1]!.startsWith('https://') || m[1]!.startsWith('#'), m[1]).toBe(true);
  // SVG 화이트리스트
  for (const svg of html.match(/<svg\b[\s\S]*?<\/svg>/gi) ?? []) {
    for (const tag of svg.matchAll(/<([a-z][a-z0-9]*)/gi)) expect(SVG_ALLOWED.has(tag[1]!.toLowerCase()), `svg tag ${tag[1]}`).toBe(true);
    for (const num of svg.match(/points="([^"]*)"/)![1]!.split(/[ ,]/)) expect(/^-?\d+(\.\d)?$/.test(num), `coordinate ${num}`).toBe(true);
    expect(svg).not.toMatch(/\bhref\b|xmlns|url\(|<image|<use|foreignobject/i);
  }
}

function visibleText(html: string): string {
  return html.replace(/<style>[\s\S]*?<\/style>/g, '').replace(/<[^>]*>/g, ' ');
}

describe('buildReportHtml: structure of the full report', () => {
  const brief = makeFullReport();
  const html = buildWeeklyBriefHtml(brief, META);
  const p = brief.payload;

  it('is dispatched by schemaVersion and has the standard document skeleton', () => {
    expect(html).toBe(buildReportHtml(brief));
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<html lang="ko">');
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain('<meta name="viewport"');
    expect(html).toContain('<meta name="referrer" content="no-referrer">');
    expect(html).toContain('<title>ARGOS · 주간 브리프 2026-10-19 ~ 10-25 (Week 43)</title>');
    expect(html.match(/<style>/g)).toHaveLength(1);
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain('<b>주간 브리프</b>');
    expect(html).toContain('2026-10-19 ~ 10-25 · Week 43');
    expect(html).toContain('생성 2026-10-26 08:00 KST');
    expect(html).not.toContain('내재화는 계속되고');
    expect(weeklyBriefFileName(brief)).toBe('ARGOS_주간브리프_2026-10-26.html');
  });

  it('contains the cover, all 8 sections in order with the fixed ids and numbers, and the footer', () => {
    expectClean(html);
    const order = ['sec-glance', 'sec-domains', 'sec-companies', 'sec-videos', 'sec-papers', 'sec-news', 'sec-trends', 'sec-watch'].map((id) => html.indexOf(`id="${id}"`));
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    for (const t of ['이번 주 한눈에', '도메인별 동향', '회사별 움직임', '영상', '논문', '뉴스·기사', '수치와 키워드 추이', '다음 주 관찰 포인트']) expect(html).toContain(`<h2>${t}</h2>`);
    expect(html).toContain('<span class="no" aria-hidden="true">01</span>');
    expect(html).toContain('<span class="no" aria-hidden="true">08</span>');
    expect(html).toContain(`읽는 시간 약 ${estimateReadingMinutes(p)}분`);
    expect(html).toContain('원문을 복제하지 않습니다');
    expect(html).toContain('조회수는 수집 시점 값입니다');
    expect(html).toContain('ARGOS · 2026-10-26');
    expect(html).not.toContain('규칙 기반'); // ok 이므로 partial 문구 없음
    for (const id of reportAnchorIds(p)) expect(html, id).toContain(`id="${id}"`);
  });

  it('table of contents: every link resolves to an existing id and matches the visible sections exactly', () => {
    const toc = html.match(/<nav class="toc"[\s\S]*?<\/nav>/)![0];
    const hrefs = [...toc.matchAll(/href="#([^"]*)"/g)].map((m) => m[1]);
    const secs = planReportSections(p).map((s) => s.id);
    expect([...new Set(hrefs)]).toEqual(secs);
    for (const h of hrefs) expect(ids(html).has(h!)).toBe(true);
    expect(toc).toContain('목차 (8)');
    expect(html.match(/href="#report-top"/g)!.length).toBe(8); // 섹션마다 "맨 위로"
  });

  it('highlights: numbered cards with figure chips, a symbol-marked delta, basis and evidence chips', () => {
    const sec = html.slice(html.indexOf('id="sec-glance"'), html.indexOf('id="sec-domains"'));
    expect((sec.match(/<article class="card">/g) ?? []).length).toBe(p.highlights.length);
    expect(sec).toContain('class="fv"');
    expect(sec).toMatch(/지난주 대비 [▲▼±]/);
    expect(sec).toContain('근거:');
    expect(sec).toContain('class="chips"');
  });

  it('domains: 5 blocks with ids, figure line, narrative, tags and evidence cards with Korean title first', () => {
    const sec = html.slice(html.indexOf('id="sec-domains"'), html.indexOf('id="sec-companies"'));
    for (const id of ['dom-hand', 'dom-actuator', 'dom-rfm', 'dom-expo', 'dom-production']) expect(sec).toContain(`id="${id}"`);
    expect(sec).toContain('파운데이션 모델·RFM');
    expect(sec).toContain('class="figs"');
    expect(sec).toContain('class="tags"');
    expect(sec).toContain('class="orig"');
    expect(sec).not.toContain('이번 주 특이사항 없음');
  });

  it('companies: counts line, CI before -> after with meaning, confidence and source, plus the "others" line', () => {
    const sec = html.slice(html.indexOf('id="sec-companies"'), html.indexOf('id="sec-videos"'));
    expect(sec).toContain('class="ci"');
    expect(sec).toContain('→');
    expect(sec).toContain('신뢰도 A');
    expect(sec).toMatch(/그 외 CI 갱신 \d+건/);
  });

  it('videos: first card carries the top badge, thumbnails are eager ytimg images, 12 cards, views are labelled as collection-time values', () => {
    const sec = html.slice(html.indexOf('id="sec-videos"'), html.indexOf('id="sec-papers"'));
    expect((sec.match(/<article class="card vc">/g) ?? []).length).toBe(12);
    expect(sec.indexOf('가장 많이 본 영상')).toBeGreaterThan(0);
    expect((sec.match(/가장 많이 본 영상/g) ?? []).length).toBe(1);
    expect((sec.match(/<img\b/g) ?? []).length).toBe(12);
    expect(sec).toContain('(수집 시점)');
    expect(sec).toContain('유튜브 원본');
  });

  it('papers and articles: arXiv links only, why-it-matters label, 12 article rows', () => {
    const papers = html.slice(html.indexOf('id="sec-papers"'), html.indexOf('id="sec-news"'));
    const hrefs = [...papers.matchAll(/\bhref="(https:[^"]*)"/g)].map((m) => m[1]!);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const h of hrefs) expect(h.startsWith('https://arxiv.org/'), h).toBe(true);
    expect(papers).toContain('왜 중요한가 (AI 생성)');
    const news = html.slice(html.indexOf('id="sec-news"'), html.indexOf('id="sec-trends"'));
    expect((news.match(/<li class="row">/g) ?? []).length).toBe(12);
  });

  it('trends: svg sparkline without xmlns, 8 bar rows, comparison bars, keyword table with symbols', () => {
    const sec = html.slice(html.indexOf('id="sec-trends"'), html.indexOf('id="sec-watch"'));
    expect(sec).toContain('<svg ');
    expect(sec).toContain('role="img"');
    expect(sec).toContain(REPORT_CHART.stroke);
    expect((sec.match(/<li class="br/g) ?? []).length).toBe(8);
    expect(sec).toContain('이번 주 vs 지난주');
    expect(sec).toContain('<table class="kw">');
    expect(sec).toMatch(/style="width:\d+(\.\d)?%"/);
    for (const m of sec.matchAll(/style="([^"]*)"/g)) expect(m[1]).toMatch(/^width:\d+(\.\d)?%$/);
  });

  it('watch points: title, body and evidence', () => {
    const sec = html.slice(html.indexOf('id="sec-watch"'));
    expect((sec.match(/<article class="card">/g) ?? []).length).toBe(p.watchPoints.length);
  });

  it('palette comes from the theme constants; responsive and print rules are included', () => {
    for (const c of Object.values(POSTER_COLORS)) expect(html.toLowerCase()).toContain(c.toLowerCase());
    expect(html).toContain('max-width:760px');
    expect(html).toContain('@media (max-width:640px)');
    expect(html).toContain('@media print');
    expect(html).toContain('print-color-adjust:exact');
    expect(html).toContain('@page{size:A4 portrait;margin:10mm}');
    expect(html).toContain('break-inside:avoid');
  });

  it('is deterministic (byte-identical), small, and never shows the model name or NaN/null/undefined', () => {
    expect(buildWeeklyBriefHtml(makeFullReport(), META)).toBe(html);
    expect(html.length).toBeLessThan(250 * 1024);
    expect(brief.model).toBe('sample-model');
    expect(html).not.toContain('sample-model');
    expect(visibleText(html)).not.toMatch(/\b(undefined|NaN|null)\b/);
    expect(html).not.toMatch(/="(undefined|NaN|null)"/);
  });
});

describe('buildReportHtml: other shapes', () => {
  it('partial: shows the rule-based footer notice and the per-section notice; ok does not', () => {
    const html = buildWeeklyBriefHtml(makePartialReport(), META);
    expectClean(html);
    expect(html).toContain('일부 문장은 규칙 기반으로 생성되었습니다.');
    expect(html).toContain('이 섹션은 자동 집계 문장입니다');
    expect(buildWeeklyBriefHtml(makeFullReport(), META)).not.toContain('이 섹션은 자동 집계 문장입니다');
  });

  it('sparse: only the sections that have content, 3 videos with the "few videos" note, quiet domains, no dead anchors', () => {
    const b = makeSparseReport();
    const html = buildWeeklyBriefHtml(b, META);
    expectClean(html);
    expect(html).not.toContain('id="sec-companies"');
    expect(html).not.toContain('id="sec-watch"');
    expect(html).toContain('이번 주 수집 영상이 적어 3건만 표시합니다');
    expect((html.match(/<article class="card vc">/g) ?? []).length).toBe(3);
    expect(html.match(/이번 주 특이사항 없음/g)).toHaveLength(5);
    expect(html).not.toContain('<table class="kw">');
    expect(html).not.toContain('<svg ');
    expect(html).toContain('추이를 비교할 만큼의 주별 데이터가 아직 없습니다');
    const toc = html.match(/<nav class="toc"[\s\S]*?<\/nav>/)![0];
    expect(toc).not.toContain('sec-companies');
    expect(visibleText(html)).not.toMatch(/\b(undefined|NaN|null)\b/);
  });

  it('empty: cover, the shortage notice and the footer only (no toc, no sections, no reading time)', () => {
    const html = buildWeeklyBriefHtml(makeEmptyReport(), META);
    expectClean(html);
    expect(html).toContain('이번 주 수집된 데이터가 부족합니다');
    expect(html).not.toContain('<nav class="toc"');
    expect(html).not.toContain('<section');
    expect(html).not.toContain('읽는 시간');
    expect(html).not.toContain('<img');
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain('일부 문장은 규칙 기반으로 생성되었습니다.');
    expect(visibleText(html)).not.toMatch(/\b(undefined|NaN|null)\b/);
  });
});

describe('buildReportHtml: malicious input', () => {
  const XSS = '<img src=x onerror=alert(1)>"';

  function evil(): WeeklyReportResponse {
    const b = makeFullReport();
    const p = b.payload;
    for (const h of p.highlights) {
      h.headline = XSS;
      h.body = XSS;
      h.basis = XSS;
      if (h.figure) {
        h.figure.value = XSS;
        h.figure.caption = XSS;
      }
      for (const e of h.evidence) {
        e.title = XSS;
        e.label = XSS;
        e.url = 'javascript:alert(1)';
      }
    }
    p.highlights[0]!.evidence[0]!.url = 'http://news.example.com/x';
    for (const d of p.domains) {
      d.label = XSS;
      d.narrative = XSS;
      d.topTags = [{ tag: XSS, count: 3 }];
      for (const e of d.evidence) {
        e.title = XSS;
        e.titleKo = XSS;
        e.source = XSS;
        e.line = XSS;
        e.url = 'https://user:pass@evil.example.com/x';
      }
    }
    for (const c of p.companies) {
      c.name = XSS;
      c.blurb = XSS;
      for (const i of c.items) {
        i.title = XSS;
        i.url = 'javascript:alert(1)';
      }
      for (const k of c.ciChanges) {
        k.item = XSS;
        k.before = XSS;
        k.after = XSS;
        k.meaning = XSS;
        k.sourceName = XSS;
        k.sourceUrl = 'http://example.com/insecure';
      }
    }
    p.videos[0] = { ...p.videos[0]!, title: XSS, titleKo: XSS, channel: XSS, url: 'https://evil.example.com/watch?v=1', thumbnail: 'https://evil.example.com/a.jpg', summaryLines: [XSS], tags: [XSS] };
    p.videos[1] = { ...p.videos[1]!, url: 'http://www.youtube.com/watch?v=2', thumbnail: 'http://i.ytimg.com/vi/2/mqdefault.jpg' };
    p.videos[2] = { ...p.videos[2]!, url: 'javascript:alert(1)', thumbnail: 'data:image/png;base64,AAAA' };
    p.papers[0] = { ...p.papers[0]!, title: XSS, titleKo: XSS, authors: XSS, summaryLines: [XSS], whyItMatters: XSS, url: 'javascript:alert(1)' };
    p.papers[1] = { ...p.papers[1]!, url: 'http://arxiv.org/abs/2610.1' };
    p.papers[2] = { ...p.papers[2]!, url: 'https://evil.example.com/abs/2610.2' };
    p.papers[3] = { ...p.papers[3]!, url: 'https://user:pass@arxiv.org/abs/2610.3' };
    p.articles[0] = { ...p.articles[0]!, title: XSS, titleKo: XSS, source: XSS, summaryLines: [XSS], url: 'javascript:alert(1)' };
    p.articles[1] = { ...p.articles[1]!, url: 'http://news.example.com/x' };
    p.articles[2] = { ...p.articles[2]!, url: 'https://user:pass@news.example.com/x' };
    p.articles[3] = { ...p.articles[3]!, url: 'https://news.example.com/redirect?u=javascript:alert(1)' };
    p.articles[4] = { ...p.articles[4]!, title: 'Robot data: see http://example.com and url(x) onload onclick', url: 'https://news.example.com/ok' };
    p.trends.keywordNote = XSS;
    p.trends.keywords[0]!.term = XSS;
    p.watchPoints[0]!.title = XSS;
    p.watchPoints[0]!.body = XSS;
    p.watchPoints[0]!.evidence[0]!.title = XSS;
    p.watchPoints[0]!.evidence[0]!.url = 'javascript:alert(1)';
    return b;
  }

  it('every new text field is escaped and the output stays clean', () => {
    const html = buildWeeklyBriefHtml(evil(), META);
    expectClean(html);
    expect(html).toContain('&lt;img');
    expect(html).toContain('&quot;');
    expect(html).not.toMatch(/<img[^>]*src=x/i);
    expect(html).not.toContain('alert(1)>');
  });

  it('javascript:, http://, credentials and disallowed hosts never become links or images', () => {
    const html = buildWeeklyBriefHtml(evil(), META);
    for (const bad of ['evil.example.com', 'user:pass', 'news.example.com/x"', 'example.com/insecure', 'redirect?u=', 'abs/2610.1"', 'abs/2610.2', 'abs/2610.3"']) expect(html, bad).not.toContain(bad);
    expect(html).toContain('https://news.example.com/ok'); // 정상 URL 은 유지
  });

  it('forbidden tokens that merely appear inside text are broken up so the output stays clean', () => {
    const html = buildWeeklyBriefHtml(evil(), META);
    expect(html.replace(/​/g, '')).toContain('Robot data: see http://example.com and url(x) onload onclick');
    expectClean(html);
  });

  it('thumbnails that are not ytimg https become placeholders (no img)', () => {
    const b = makeFullReport();
    b.payload.videos = b.payload.videos.slice(0, 2).map((v) => ({ ...v, thumbnail: 'https://evil.example.com/a.jpg' }));
    const html = buildWeeklyBriefHtml(b, META);
    expect(html).not.toContain('<img');
    expect(html).toContain('thw ph');
    expectClean(html);
  });
});
