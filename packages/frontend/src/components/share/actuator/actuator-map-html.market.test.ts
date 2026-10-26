import { describe, expect, it } from 'vitest';
import { CATEGORY_PALETTE, CHART_HUE_MUTED } from '@/app/events/wrc2026/components/chartColors';
import {
  buildActuatorMapCardHtml,
  buildActuatorMapSvg,
  buildAdoptionTableHtml,
  buildSourcingSummaryHtml,
  buildSupplierMarketMapSvg,
  buildSupplyChainTableHtml,
} from './actuator-map-html';
import { buildLayout, defaultLayoutOptions } from './actuator-map-layout';
import { buildMarketLayout } from './actuator-market-layout';
import { SEGMENT_LABEL, SEGMENT_ORDER } from './actuator-sourcing';
import { buildHeadlineMessage, computeStrategyStats } from './actuator-strategy';
import { adoption, posture, response, robot, seedResponse, seedSuppliers44, sp } from './actuator-strategy.fixtures';

const XSS = '<img src=x onerror=alert(1)>"';
const FORBIDDEN = ['<script', '<link', '<img', 'src=', '@import', 'url(', 'http://'];
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;
const seed44 = seedSuppliers44();

describe('buildSupplierMarketMapSvg', () => {
  const data = seed44 ? { ...seedResponse(), suppliers: seed44 } : seedResponse();
  const layout = buildMarketLayout(data.suppliers, data.adoptions);
  const svg = buildSupplierMarketMapSvg(layout);

  it('<svg 하나, 점마다 <g role="img" aria-label> 와 <title>, 클래스·스크립트 없음', () => {
    expect(count(svg, /<svg[\s>]/g)).toBe(1);
    expect(count(svg, /<\/svg>/g)).toBe(1);
    expect(count(svg, /<g role="img" aria-label="/g)).toBe(layout.points.length);
    expect(count(svg, /<title>/g)).toBeGreaterThanOrEqual(layout.points.length);
    expect(svg).not.toMatch(/\sclass=/);
    for (const bad of FORBIDDEN) expect(svg.toLowerCase()).not.toContain(bad);
  });

  it('밴드·빈 구간 주석·축 제목 문구', () => {
    if (seed44) expect(svg).toContain('LG AXIUM Φ40–Φ120 (9종)');
    else expect(svg).toContain('LG AXIUM');
    expect(svg).toContain('(가설)');
    expect(svg).toContain('가격 (USD, 로그 스케일)');
    expect(svg).toContain('피크 토크 (Nm, 로그)');
    if (seed44) expect(svg).toContain('stroke-dasharray="6 4"');
  });

  it('결정적: 같은 입력은 같은 출력', () => {
    expect(buildSupplierMarketMapSvg(buildMarketLayout(data.suppliers, data.adoptions))).toBe(svg);
  });

  it('XSS: 공급사·모델명의 태그는 이스케이프된다', () => {
    const l = buildMarketLayout([sp(XSS, XSS, { peakTorqueNm: 10, priceUsd: 100 }), sp('b', 'b', { peakTorqueNm: 20 })], []);
    const out = buildSupplierMarketMapSvg(l);
    expect(out).not.toContain('<img');
    expect(out).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('빈 레이아웃이면 <p class="empty">', () => {
    const out = buildSupplierMarketMapSvg(buildMarketLayout([], []));
    expect(out.startsWith('<p class="empty"')).toBe(true);
    expect(out).not.toContain('<svg');
  });

  (seed44 ? it : it.skip)('시드 44개: 점 36개(13+23)와 7개 제외 목록', () => {
    const l = buildMarketLayout(seed44!, []);
    const out = buildSupplierMarketMapSvg(l);
    expect(count(out, /<g role="img"/g)).toBe(36);
    expect(l.excludedNoTorque).toHaveLength(7);
  });
});

describe('buildActuatorMapSvg — 조달 태세 색', () => {
  it('확인 불가는 흰 채움 + 회색 링, 그 외는 태세 색, hull 은 무채색', () => {
    const r = (name: string, company: string, p: Parameters<typeof posture>[0], dof: number) =>
      robot(name, company, [], { dof, handDof: 4, speed: 1, actuatorTypeLabel: '직구동/QDD', ...posture(p) });
    const robots = [
      r('a', 'Co', 'in_house', 20),
      r('b', 'Co', 'in_house_sells', 30),
      r('c', 'Co', 'external', 40),
      r('d', 'Co', 'unknown', 25),
    ];
    const svg = buildActuatorMapSvg(buildLayout(robots, { ...defaultLayoutOptions({ L: 1, D: 1, H: 1, S: 1 }, []), yAxis: 'type', hull: true }));
    for (const c of CATEGORY_PALETTE.slice(0, 3)) expect(svg).toContain(`fill="${c}"`);
    expect(svg).toContain(`r="4.5" fill="#fff" stroke="${CHART_HUE_MUTED}" stroke-width="2"`);
    expect(svg).toContain(`<path d="`);
    expect(svg).toContain(`fill="${CHART_HUE_MUTED}" fill-opacity="0.1" stroke="${CHART_HUE_MUTED}"`);
  });
});

describe('buildActuatorMapCardHtml', () => {
  const data = seed44 ? { ...seedResponse(), suppliers: seed44 } : seedResponse();
  const html = buildActuatorMapCardHtml(data, 'https://argos.example.com/share/tech-trend/actuator');

  it('카드 순서: 헤드라인 → 조달 태세 요약 → 포지션 맵 → 로봇 표 → 공급망 → 공급사 제품 맵 → 공급사 표 → 각주', () => {
    const idx = [
      html.indexOf('핵심 메시지:'),
      html.indexOf('조달 태세 요약'),
      html.indexOf('<svg'),
      html.indexOf('>데이터 표<'),
      html.indexOf('공급망 (외부 조달 관계'),
      html.indexOf('공급사 제품 맵 — 피크 토크 × 가격'),
      html.indexOf('액추에이터 공급사 커버리지'),
      html.indexOf('조달 태세: 자체 개발 확인은 근거 등급 A·B만 세고'),
    ];
    for (let i = 1; i < idx.length; i++) expect(idx[i]!).toBeGreaterThan(idx[i - 1]!);
    expect(idx[0]).toBeGreaterThan(-1);
  });

  it('헤드라인은 전략 카드와 같은 함수의 문장', () => {
    const headline = buildHeadlineMessage(computeStrategyStats(data));
    expect(html).toContain(headline.replace(/&/g, '&amp;'));
  });

  it('요약 막대: 4단계 범례, 확인 불가 중 자체 개발 추정, 확인 A/B 건수', () => {
    const bar = buildSourcingSummaryHtml(data.robots);
    for (const l of ['자체 개발(확인)', '자체 개발+외판', '외부 조달·혼합', '확인 불가']) expect(bar).toContain(l);
    expect(bar).toContain('이 중 자체 개발 추정 1기');
    expect(bar).toContain('근거 등급 A 2기 / B 5기');
    expect(buildSourcingSummaryHtml([])).toBe('');
  });

  it('외부 참조 없음, 링크는 pageUrl 뿐 (데이터의 URL 은 링크가 되지 않는다)', () => {
    for (const bad of FORBIDDEN) expect(html.toLowerCase()).not.toContain(bad);
    const hrefs = [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual([]); // pageUrl 은 허용 호스트(safeHref)일 때만 링크가 된다 — 데이터의 URL 은 어떤 경우에도 링크가 되지 않는다
    const evil = seedResponse();
    evil.adoptions = [adoption({ sources: [{ url: 'https://evil.example/x', title: 'T' }, { url: 'http://plain.example/y', title: 'U' }] })];
    const out = buildActuatorMapCardHtml(evil);
    expect(out).not.toContain('href="https://evil.example');
    expect(out).toContain('https://evil.example/x');
    expect(out).not.toContain('http://plain.example');
  });

  it('범례 6칩 이상 + 가설: 세그먼트 7종 라벨, 점선 사각형 = 가설 구간', () => {
    for (const s of SEGMENT_ORDER) expect(html).toContain(SEGMENT_LABEL[s]);
    expect(html).toContain('점선 사각형 = 가설 구간');
    expect(html).toContain('LG AXIUM 추정 밴드(가설)');
    expect(html).toContain('AXIUM 공개 타깃: 자사 CLOiD(2026) → 외부 파트너(2027~) → 산업용 고토크(2030)');
  });

  it('공급망 표 2개 + 확인 불가/자체 확인 문단, 로봇 표에 조달 태세 열', () => {
    expect(html).toContain('외부 조달 관계 표');
    expect(html).toContain('수요 사례 표 (외부 액추에이터 공개 채택)');
    expect(html).toContain('확인 불가 로봇 1기: Walker S(UBTech) 자체 개발 추정');
    expect(html).toContain('자체 개발 확인 회사 ');
    expect(html).toContain('<th style="text-align:left;padding:5px 8px;border-bottom:1px solid #E6E7EA;color:#5C636E;font-weight:600;white-space:nowrap">조달 태세</th>');
    expect(html).toContain('부품(모터·감속기) 외부 조달: maxon');
    expect(html).toContain('자체 개발(확인·B)');
    expect(html).not.toContain('(Q4)');
  });

  it('외부 조달 관계 표는 자체 개발 엣지를 넣지 않는다 / 수요 사례 표 빈 경우', () => {
    const t = buildSupplyChainTableHtml([
      ...data.edges,
      { ...data.edges[0]!, vendor: 'SelfCo', basis: 'self', inHouse: true },
    ]);
    expect(t).not.toContain('SelfCo');
    expect(t).toContain('양산 단계 액추에이터 공급');
    expect(buildAdoptionTableHtml([])).toContain('class="empty"');
  });

  it('미등록 공급사 각주, 인쇄 회피 속성, 이스케이프', () => {
    expect(html).toContain('제품 스펙 미등록 공급사');
    expect(html).toContain('break-inside:avoid;page-break-inside:avoid');
    expect(count(html, /<tr[\s>]/g)).toBe(count(html, /<\/tr>/g));
    expect(count(html, /<table[\s>]/g)).toBe(count(html, /<\/table>/g));
    const evil = response([robot(XSS, XSS, [], posture('unknown', { noteKo: XSS }))], [sp(XSS, XSS, { targetMarket: XSS })], { adoptions: [adoption({ robotName: XSS, company: XSS })] });
    const out = buildActuatorMapCardHtml(evil);
    expect(out).not.toContain('<img');
    expect(out).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('인쇄 규칙: 카드 <style> 하나, 모든 표 래퍼에 tbl-wrap, 외부 참조 없음', () => {
    expect(count(html, /<style>@media print\{/g)).toBe(1);
    expect(count(html, /class="tbl-wrap"/g)).toBe(count(html, /<table[\s>]/g));
    const css = /<style>([^<]*)<\/style>/.exec(html)![1]!;
    expect(css).toContain('.tbl-wrap{overflow:visible !important}');
    expect(css).toContain('overflow-wrap:break-word');
    expect(css).toContain('white-space:normal !important');
    for (const bad of ['url(', '@import', 'http://', 'src=']) expect(css).not.toContain(bad);
  });

  it('data 가 없으면 빈 문자열, 결정적', () => {
    expect(buildActuatorMapCardHtml(null)).toBe('');
    expect(buildActuatorMapCardHtml(data, 'https://argos.example.com/share/tech-trend/actuator')).toBe(html);
  });

  it('구 스키마(정규화 전 값)도 예외 없이 생성: 조달 태세 필드가 비어도 크래시하지 않는다', () => {
    const d = seedResponse();
    d.adoptions = [];
    d.vendorMarkets = [];
    const out = buildActuatorMapCardHtml(d);
    expect(out).toContain('외부 채택 사례는 아직 수집되지 않았습니다.');
    expect(out).toContain('공개 채택 사례는 아직 수집되지 않았습니다.');
  });
});
