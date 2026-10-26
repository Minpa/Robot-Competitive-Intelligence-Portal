import { describe, expect, it } from 'vitest';
import { buildTechTrendReportHtml, safeHref } from '@/lib/tech-trend-report-html';
import type { TechTrendReport } from '@/types/tech-trend-report';
import { buildActuatorMapCardHtml, buildActuatorStrategyCardHtml } from './actuator-map-html';
import { STRATEGY_CONTENT, STRATEGY_SOURCES, buildHeadlineMessage, computeStrategyStats, safeSourceHref } from './actuator-strategy';
import { act, response, robot, seedResponse, sp } from './actuator-strategy.fixtures';

/** actuator-map-html.ts 의 INK·WHITE 값 (새 hex 금지 검증용) */
const ALLOWED_HEX = new Set(['#1f2328', '#5c636e', '#8a909a', '#9aa1ac', '#c6cad0', '#e6e7ea', '#ececef', '#f6f7f8', '#fff']);
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

const esc2 = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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
      expect(count(h, /<table[\s>]/g)).toBe(5);
      expect(count(h, /<caption/g)).toBe(5);
      expect(count(h, /<th /g)).toBe(count(h, /<th scope="col"/g));
      expect(count(h, /<tr style="[^"]*break-inside:avoid/g)).toBe(count(h, /<tr[\s>]/g) - 5);
    }
  });

  it('T35 옵션명 7·협업명 5·질문 8 모두 포함', () => {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    for (const o of STRATEGY_CONTENT.options) expect(html).toContain(esc(o.name));
    for (const m of STRATEGY_CONTENT.collabModels) expect(html).toContain(esc(m.name));
    for (const q of STRATEGY_CONTENT.questions) expect(html).toContain(esc(q));
    expect(count(html, /<li style="margin:3px 0;break-inside:avoid;page-break-inside:avoid">/g)).toBe(8 + 8);
  });

  it('동적 문장·지표·푸터가 시드 값으로 채워진다', () => {
    expect(html).toContain('가격이 등록된 제품 13개의 가격은 $110~$990, 중앙값 $230입니다.');
    expect(html).toContain('외판 확인 2개사(Unitree Robotics, Xiaomi)');
    expect(html).toContain('외판 확인 2개사(Unitree Robotics, Xiaomi), 외판 계획 1개사(LG Electronics)입니다.');
    expect(html).toContain('확인 2 · 계획 1');
    expect(html).toContain('2026.10.25 12:04 KST');
    expect(html).toContain('13개 / $230');
    expect(html).toContain('78% (7/9개사) · 확인 불가 1개사');
    expect(html).toContain('8건 (제조사 로봇 2 + 공개 채택 6)');
  });

  it('헤드라인이 카드 최상단에 있고 지도 카드와 같은 문장이다 (AC-42)', () => {
    const data = seedResponse();
    const headline = buildHeadlineMessage(computeStrategyStats(data));
    const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    expect(html.indexOf(esc(headline))).toBeGreaterThan(-1);
    expect(html.indexOf(esc(headline))).toBeLessThan(html.indexOf(esc(STRATEGY_CONTENT.notice)));
    expect(buildActuatorMapCardHtml(data)).toContain(esc(headline));
  });

  it('절 번호 1~6, 세트 역할 7행 표, 구 번호(3-3)·구 절 제목 없음 (AC-37·39)', () => {
    const C = STRATEGY_CONTENT;
    expect(Object.values(C.sections).slice(0, 6).map((t) => t.charAt(0))).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(html).toContain('2. 세트(LG CLOiD)의 역할: 직접 3 + 간접 3');
    expect(html).not.toContain('3-3');
    expect(html).not.toContain('5. 의사결정 질문');
    expect(html).toContain('정보 차단벽(4절 협업 모델 5번)');
    expect(C.roles).toHaveLength(7);
    // roles 표: 헤더 1 + 7행
    const rolesTable = html.slice(html.indexOf('<caption', html.indexOf(esc2(C.sections.roles)) - 200));
    expect(rolesTable).toContain('1차 고객 물량');
    expect(rolesTable).toContain('비교 사례');
  });

  it('인쇄 규칙: 전략 카드의 표 래퍼도 tbl-wrap, <style> 하나', () => {
    expect(count(html, /<style>@media print\{/g)).toBe(1);
    expect(count(html, /class="tbl-wrap"/g)).toBe(count(html, /<table[\s>]/g));
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
    expect(strategyAt).toBeGreaterThan(full.indexOf('공급사 제품 맵'));
    expect(full.indexOf('</html>')).toBeGreaterThan(strategyAt);
    // 지도 데이터가 없어도 전략 카드는 단독으로 포함된다
    const only = buildTechTrendReportHtml(report, { pageUrl: 'https://x.test/a', titleKo: '액', titleEn: 'A' }, null, buildActuatorStrategyCardHtml(undefined));
    expect(only).toContain(STRATEGY_CONTENT.title);
    expect(only).not.toContain('Actuator · Position');
  });
});
