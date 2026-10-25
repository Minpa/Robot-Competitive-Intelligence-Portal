import { describe, expect, it } from 'vitest';
import { buildTechTrendReportHtml, safeHref } from '@/lib/tech-trend-report-html';
import type { TechTrendReport } from '@/types/tech-trend-report';
import { buildActuatorMapCardHtml, buildActuatorStrategyCardHtml } from './actuator-map-html';
import { STRATEGY_CONTENT, STRATEGY_SOURCES, safeSourceHref } from './actuator-strategy';
import { act, response, robot, seedResponse, sp } from './actuator-strategy.fixtures';

/** actuator-map-html.ts 의 INK·WHITE 값 (새 hex 금지 검증용) */
const ALLOWED_HEX = new Set(['#1f2328', '#5c636e', '#8a909a', '#9aa1ac', '#c6cad0', '#e6e7ea', '#ececef', '#f6f7f8', '#fff']);
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

const XSS = '<img src=x onerror=alert(1)>"';

describe('buildActuatorStrategyCardHtml', () => {
  const html = buildActuatorStrategyCardHtml(seedResponse());

  it('T28 data=null 이면 section 을 반환하고 정적 섹션이 있으며 동적 값은 "—"', () => {
    for (const input of [null, undefined]) {
      const h = buildActuatorStrategyCardHtml(input);
      expect(h.startsWith('<section')).toBe(true);
      expect(h.endsWith('</section>')).toBe(true);
      expect(h).toContain(STRATEGY_CONTENT.title);
      expect(h).toContain(STRATEGY_CONTENT.sections.options);
      expect(h).toContain(STRATEGY_CONTENT.collabModels[0]!.name.replace(/"/g, '&quot;'));
      expect(h).toContain('데이터 집계 — · 로봇 —기 · 공급사 제품 —개');
      expect(h).toContain('<li style="margin:3px 0">—</li>');
      expect(h).not.toMatch(/NaN|undefined|Infinity|null/);
    }
  });

  it('T29 XSS: 로봇명·vendor·회사명 등에 태그/따옴표를 넣어도 이스케이프된다', () => {
    const data = response(
      [robot(XSS, XSS, [act(XSS, true), act(XSS + 'v', false)])],
      [sp(XSS, XSS, { targetMarket: XSS, priceUsd: 10, status: 'available' })],
      { generatedAt: XSS }
    );
    const h = buildActuatorStrategyCardHtml(data);
    expect(h).not.toContain('<img');
    expect(h).not.toContain('onerror=alert(1)>');
    expect(h).toContain('&lt;img src=x onerror=alert(1)&gt;&quot;');
  });

  it('T30 외부 참조 없음: script/link/img/src=/@import/url(/http://', () => {
    for (const h of [html, buildActuatorStrategyCardHtml(null)]) {
      for (const bad of ['<script', '<link', '<img', 'src=', '@import', 'url(', 'http://']) expect(h.toLowerCase()).not.toContain(bad);
    }
  });

  it('T31 모든 href 는 https + safeSourceHref 통과(정적 출처 상수만), 동적 URL 은 링크가 되지 않는다', () => {
    const hrefs = [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]!.replace(/&amp;/g, '&'));
    expect(hrefs).toHaveLength(STRATEGY_SOURCES.length);
    for (const h of hrefs) {
      expect(h.startsWith('https://')).toBe(true);
      expect(safeSourceHref(h)).not.toBe('');
    }
    // 허용 호스트(safeHref) 밖의 출처도 링크로 나간다 — PM 결정 1. 출처 URL 은 텍스트로도 남는다.
    expect(safeHref(STRATEGY_SOURCES[0]!.url)).toBe('');
    expect(html).toContain(`href="${STRATEGY_SOURCES[0]!.url}"`);
    expect(count(html, /rel="noopener noreferrer"/g)).toBe(STRATEGY_SOURCES.length);
    // 동적 데이터의 URL 필드는 이 카드에서 쓰이지 않는다
    const evil = response([robot('r', 'c', [act('c', true)], { sources: ['https://evil.example/x'] })], []);
    expect(buildActuatorStrategyCardHtml(evil)).not.toContain('evil.example');
  });

  it('T32 hex 색은 INK·WHITE 값의 부분집합', () => {
    const hexes = html.match(/(?<!&)#[0-9a-fA-F]{3,8}\b/g) ?? [];
    expect(hexes.length).toBeGreaterThan(0);
    for (const x of hexes) expect(ALLOWED_HEX.has(x.toLowerCase())).toBe(true);
  });

  it('T33 동일 입력은 동일 출력(결정적)', () => {
    expect(buildActuatorStrategyCardHtml(seedResponse())).toBe(html);
    expect(buildActuatorStrategyCardHtml(null)).toBe(buildActuatorStrategyCardHtml(null));
  });

  it('T34 section/table/tr 열고 닫는 수 일치, th 에 scope=col, caption 존재', () => {
    for (const h of [html, buildActuatorStrategyCardHtml(null)]) {
      expect(count(h, /<section[\s>]/g)).toBe(1);
      expect(count(h, /<\/section>/g)).toBe(1);
      expect(count(h, /<table[\s>]/g)).toBe(count(h, /<\/table>/g));
      expect(count(h, /<tr[\s>]/g)).toBe(count(h, /<\/tr>/g));
      expect(count(h, /<table[\s>]/g)).toBe(4);
      expect(count(h, /<caption/g)).toBe(4);
      expect(count(h, /<th /g)).toBe(count(h, /<th scope="col"/g));
      expect(count(h, /<tr style="[^"]*break-inside:avoid/g)).toBe(count(h, /<tr[\s>]/g) - 4);
    }
  });

  it('T35 옵션명 7·협업명 5·질문 8 모두 포함', () => {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    for (const o of STRATEGY_CONTENT.options) expect(html).toContain(esc(o.name));
    for (const m of STRATEGY_CONTENT.collabModels) expect(html).toContain(esc(m.name));
    for (const q of STRATEGY_CONTENT.questions) expect(html).toContain(esc(q));
    expect(count(html, /<li style="margin:3px 0;break-inside:avoid;page-break-inside:avoid">/g)).toBe(7 + 8);
  });

  it('동적 문장·지표·푸터가 시드 값으로 채워진다', () => {
    expect(html).toContain('가격이 등록된 제품 13개의 가격은 $110~$990, 중앙값 $230입니다.');
    expect(html).toContain('외판 확인 3개사');
    expect(html).toContain('2026.10.25 12:04 KST');
    expect(html).toContain('13개 / $230');
  });

  it('T36 buildTechTrendReportHtml: 전략 카드가 지도 카드 뒤에 위치', () => {
    const report: TechTrendReport = {
      domain: 'actuator',
      domainLabel: '액추에이터',
      secondKind: 'papers',
      days: 30,
      periodStart: '2026-09-25T00:00:00Z',
      periodEnd: '2026-10-25T00:00:00Z',
      generatedAt: '2026-10-25T01:00:00Z',
      stats: { videoCount: 0, paperCount: 0, channelCount: 0, topChannels: [], topKeywords: [] },
      insight: null,
      videos: [],
      papers: [],
      truncated: { videos: false, papers: false },
      focus: { excluded: 0, pending: 0 },
    };
    const data = seedResponse();
    const full = buildTechTrendReportHtml(
      report,
      { pageUrl: 'https://x.test/share/tech-trend/actuator', titleKo: '액추에이터', titleEn: 'Actuator' },
      null,
      `${buildActuatorMapCardHtml(data)}${buildActuatorStrategyCardHtml(data)}`
    );
    const mapAt = full.indexOf('Actuator · Position &amp; Supply Chain');
    const strategyAt = full.indexOf(STRATEGY_CONTENT.kicker);
    expect(mapAt).toBeGreaterThan(-1);
    expect(strategyAt).toBeGreaterThan(mapAt);
    expect(full.indexOf('</html>')).toBeGreaterThan(strategyAt);
    // 지도 데이터가 없어도 전략 카드는 단독으로 포함된다
    const only = buildTechTrendReportHtml(report, { pageUrl: 'https://x.test/a', titleKo: '액', titleEn: 'A' }, null, buildActuatorStrategyCardHtml(undefined));
    expect(only).toContain(STRATEGY_CONTENT.title);
    expect(only).not.toContain('Actuator · Position');
  });
});
